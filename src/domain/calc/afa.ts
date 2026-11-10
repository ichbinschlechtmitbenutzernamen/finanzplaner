import { addMonths, monthIndex } from "../months.ts";
import type { Investition, IsoMonth } from "../types.ts";
import { zahlungszielMonate } from "../zahlung.ts";
import { leereReihe } from "./reihe.ts";
import { roundRate, verteilteRaten } from "./round.ts";

export type Anlagenbehandlung = "sofortaufwand" | "abschreibung";

/** § 6 Abs. 2a EStG: ein Sammelposten wird immer über fünf Jahre, also 60 Monate, aufgelöst. */
export const SAMMELPOSTEN_MONATE = 60;

export interface AnlageKontext {
  monate: readonly IsoMonth[];
  /** false bei Kleinunternehmern und wenn der Vorsteuerabzug ausgeschlossen ist. */
  vorsteuerAbzug: boolean;
  /**
   * Nettobeträge darunter werden nicht aktiviert.
   * Das ist die Sammelposten-Untergrenze des Parametersatzes, im Stand 2026 also 250,01 Euro.
   * Bis einschließlich 250,00 Euro entsteht sofortiger Betriebsaufwand.
   */
  sofortaufwandUnterCents: number;
}

export interface AnlageErgebnis {
  id: string;
  bezeichnung: string;
  kategorie: Investition["kategorie"];
  behandlung: Anlagenbehandlung;
  afaMethode: Investition["afaMethode"];
  aktivierungCents: number;
  restwertCents: number;
  abschreibungCents: number[];
  sofortaufwandCents: number[];
  buchwertCents: number[];
  auszahlungCents: number[];
  vorsteuerCents: number[];
  /** Bruttorechnung im Anschaffungsmonat. Bei einer Sacheinlage 0. */
  rechnungBruttoCents: number[];
}

/**
 * Lineare AfA: jeden Monat ein gleicher Anteil über die Nutzungsdauer ab dem AfA-Beginn.
 * Sammelposten: dieselbe Verteilung, immer über 60 Monate, unabhängig von einer früheren Eingabe.
 * Der letzte Monat nimmt den Cent-Rest. Ein angefangener Monat zählt voll, es gibt keine Tagesanteile.
 * GWG: die ganze Bemessungsgrundlage im AfA-Monat.
 * Bis 250 Euro netto: kein Vermögensgegenstand, sondern Betriebsaufwand im Anschaffungsmonat.
 */
export function berechneAnlage(investition: Investition, kontext: AnlageKontext): AnlageErgebnis {
  const laenge = kontext.monate.length;
  const start = kontext.monate[0];
  if (!start) {
    throw new Error("Die AfA braucht mindestens einen Planmonat.");
  }
  const vorsteuer = roundRate(investition.nettoCents, investition.umsatzsteuerSatz);
  const sofort = investition.nettoCents < kontext.sofortaufwandUnterCents;
  const aktivierung = kontext.vorsteuerAbzug
    ? investition.nettoCents
    : investition.nettoCents + vorsteuer;
  const restwert = sofort ? 0 : (investition.restwertCents ?? 0);
  const bemessung = Math.max(aktivierung - restwert, 0);

  const abschreibungCents = leereReihe(laenge);
  const sofortaufwandCents = leereReihe(laenge);
  const buchwertCents = leereReihe(laenge);
  const auszahlungCents = leereReihe(laenge);
  const vorsteuerCents = leereReihe(laenge);
  const rechnungBruttoCents = leereReihe(laenge);

  const kaufIndex = indexImPlan(start, investition.anschaffungsmonat, laenge);
  if (kaufIndex !== null) {
    rechnungBruttoCents[kaufIndex] = investition.nettoCents + vorsteuer;
    if (kontext.vorsteuerAbzug) vorsteuerCents[kaufIndex] = vorsteuer;
    const zahlungIndex = indexImPlan(
      start,
      addMonths(investition.anschaffungsmonat, zahlungszielMonate(investition.zahlungszielTage)),
      laenge,
    );
    if (zahlungIndex !== null) {
      auszahlungCents[zahlungIndex] = investition.nettoCents + vorsteuer;
    }
  }

  if (sofort) {
    if (kaufIndex !== null) sofortaufwandCents[kaufIndex] = aktivierung;
    return ergebnis(
      investition,
      "sofortaufwand",
      aktivierung,
      restwert,
      abschreibungCents,
      sofortaufwandCents,
      buchwertCents,
      auszahlungCents,
      vorsteuerCents,
      rechnungBruttoCents,
    );
  }

  const afaStart = investition.afaStartMonat ?? investition.anschaffungsmonat;
  const monateDerAfA =
    investition.afaMethode === "sofort_gwg"
      ? 1
      : investition.afaMethode === "sammelposten"
        ? SAMMELPOSTEN_MONATE
        : investition.nutzungsdauerMonate;
  const reihe = afaReihe(bemessung, monateDerAfA);
  for (let schritt = 0; schritt < reihe.length; schritt += 1) {
    const index = indexImPlan(start, addMonths(afaStart, schritt), laenge);
    const betrag = reihe[schritt];
    if (index !== null && betrag !== undefined) abschreibungCents[index] = betrag;
  }

  let buchwert = 0;
  let aktiv = false;
  for (let index = 0; index < laenge; index += 1) {
    if (kontext.monate[index] === investition.anschaffungsmonat) {
      aktiv = true;
      buchwert = aktivierung;
    }
    if (aktiv) {
      buchwert -= abschreibungCents[index] ?? 0;
      buchwertCents[index] = buchwert;
    }
  }

  return ergebnis(
    investition,
    "abschreibung",
    aktivierung,
    restwert,
    abschreibungCents,
    sofortaufwandCents,
    buchwertCents,
    auszahlungCents,
    vorsteuerCents,
    rechnungBruttoCents,
  );
}

function afaReihe(bemessungCents: number, monate: number): number[] {
  if (monate < 1 || bemessungCents === 0) return [];
  const { regulaer, letzte } = verteilteRaten(bemessungCents, monate);
  const reihe = Array.from({ length: monate }, () => regulaer);
  reihe[monate - 1] = letzte;
  return reihe;
}

function indexImPlan(start: IsoMonth, monat: IsoMonth, laenge: number): number | null {
  const index = monthIndex(start, monat);
  if (index < 0 || index >= laenge) return null;
  return index;
}

function ergebnis(
  investition: Investition,
  behandlung: Anlagenbehandlung,
  aktivierungCents: number,
  restwertCents: number,
  abschreibungCents: number[],
  sofortaufwandCents: number[],
  buchwertCents: number[],
  auszahlungCents: number[],
  vorsteuerCents: number[],
  rechnungBruttoCents: number[],
): AnlageErgebnis {
  return {
    id: investition.id,
    bezeichnung: investition.bezeichnung,
    kategorie: investition.kategorie,
    behandlung,
    afaMethode: investition.afaMethode,
    aktivierungCents,
    restwertCents,
    abschreibungCents,
    sofortaufwandCents,
    buchwertCents,
    auszahlungCents,
    vorsteuerCents,
    rechnungBruttoCents,
  };
}
