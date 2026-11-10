import { anlageKlassifikationHinweise, klassifiziereAnlagen } from "../anlage.ts";
import { addMonths, monthIndex } from "../months.ts";
import type {
  Einmalkosten,
  Finanzplan,
  Investition,
  IsoMonth,
  Kostenposition,
  SzenarioId,
  Umsatzposition,
  Zuschuss,
} from "../types.ts";
import { zahlungszielMonate, ustZahllastZahlungsmonat } from "../zahlung.ts";
import { berechneAnlage } from "./afa.ts";
import { darlehenImPlan, summiereDarlehen } from "./darlehen.ts";
import { istAktiv, mengeImMonat, monatsbetragCents } from "./monatswert.ts";
import { addiere, leereReihe, setzen, summe } from "./reihe.ts";
import { roundCents, roundRate } from "./round.ts";
import { kostenFaktor, personalFaktor, szenarioFaktoren, umsatzFaktor } from "./szenario.ts";
import type {
  BerechnungHinweis,
  EinmalKostenErgebnis,
  EntnahmeBlock,
  FinanzierungsBlock,
  InvestitionsBlock,
  KostenBlock,
  KostenpositionErgebnis,
  PersonalBlock,
  PersonalErgebnis,
  Planberechnung,
  UmsatzBlock,
  UmsatzlinieErgebnis,
  UmsatzsteuerBlock,
  UebersichtBlock,
  WarenbestandErgebnis,
  ZuschussErgebnis,
} from "./types.ts";

export class BerechnungError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BerechnungError";
  }
}

interface Steuerkontext {
  kleinunternehmer: boolean;
  vorsteuerAbzug: boolean;
  laenge: number;
}

interface Betragsteile {
  aufwand: number;
  vorsteuer: number;
  rechnung: number;
}

/**
 * Rechnet einen Plan für ein Szenario über den gespeicherten Horizont.
 * Ohne Startmonat, also bei einem noch leeren Entwurf, gibt es keinen Zeitraum.
 * Ergebnisreihen sind Cent und haben eine Stelle je Planmonat.
 */
export function berechnePlan(
  plan: Finanzplan,
  szenario: SzenarioId = plan.szenarien.aktiv,
): Planberechnung {
  if (!plan.startMonat) {
    throw new BerechnungError("Ohne Startmonat gibt es keinen Zeitraum für die Rechnung.");
  }
  const startMonat = plan.startMonat;
  const monate = Array.from({ length: plan.horizontMonate }, (_, index) =>
    addMonths(startMonat, index),
  );
  const faktoren = szenarioFaktoren(plan, szenario);
  const steuer: Steuerkontext = {
    kleinunternehmer: plan.umsatzsteuer.regime === "kleinunternehmer",
    vorsteuerAbzug:
      plan.umsatzsteuer.regime !== "kleinunternehmer" &&
      plan.umsatzsteuer.vorsteuerabzugsberechtigt,
    laenge: monate.length,
  };

  const umsatz = berechneUmsatz(plan, monate, faktoren, steuer);
  const personal = berechnePersonal(plan, monate, faktoren);
  const kosten = berechneKosten(plan, monate, faktoren, steuer, umsatz.summeNettoCents);
  const investitionen = berechneInvestitionen(plan, monate, steuer);
  const finanzierung = berechneFinanzierung(plan, monate);
  const umsatzsteuer = berechneUmsatzsteuer(plan, monate, umsatz, kosten, investitionen);
  const entnahmen = berechneEntnahmen(plan, monate);
  const uebersicht = baueUebersicht(
    umsatz,
    personal,
    kosten,
    investitionen,
    finanzierung,
    umsatzsteuer,
    entnahmen,
  );

  return {
    planId: plan.id,
    planName: plan.stammdaten.planName,
    firmenname: plan.stammdaten.firmenname,
    beispiel: plan.stammdaten.beispiel,
    rechtsform: plan.stammdaten.rechtsform,
    szenario,
    szenarioBezeichnung: szenarioName(plan, szenario),
    startMonat,
    monate,
    hinweise: hinweise(plan, investitionen),
    umsatz,
    personal,
    kosten,
    investitionen,
    finanzierung,
    umsatzsteuer,
    entnahmen,
    uebersicht,
    liquiditaetsreserveCents: plan.kapitalbedarf.betriebsmittel.liquiditaetsreserveCents,
  };
}

function szenarioName(plan: Finanzplan, szenario: SzenarioId): string {
  if (szenario === "base") return "Basis";
  return plan.szenarien[szenario].bezeichnung;
}

function indexImPlan(start: IsoMonth, monat: IsoMonth, laenge: number): number | null {
  const index = monthIndex(start, monat);
  if (index < 0 || index >= laenge) return null;
  return index;
}

function teileBetrag(
  netto: number,
  satz: number,
  betriebsausgabe: boolean,
  privatanteil: number | undefined,
  vorsteuerAbzug: boolean,
): Betragsteile {
  const anteil = betriebsausgabe ? 1 - (privatanteil ?? 0) : 0;
  const betriebsnetto = roundRate(netto, anteil);
  const vorsteuer = vorsteuerAbzug ? roundRate(betriebsnetto, satz) : 0;
  const aufwand = vorsteuerAbzug ? betriebsnetto : betriebsnetto + roundRate(betriebsnetto, satz);
  return { aufwand, vorsteuer, rechnung: netto + roundRate(netto, satz) };
}

function berechneUmsatz(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  faktoren: ReturnType<typeof szenarioFaktoren>,
  steuer: Steuerkontext,
): UmsatzBlock {
  const start = monate[0] ?? plan.startMonat;
  if (!start) throw new BerechnungError("Der Plan hat keinen Monat.");
  const linien = plan.umsatzplanung.map((position) =>
    berechneUmsatzlinie(position, monate, start, faktoren, steuer, plan),
  );
  const block: UmsatzBlock = {
    linien,
    summeNettoCents: leereReihe(monate.length),
    summeWareneinsatzAufwandCents: leereReihe(monate.length),
    summeEinzahlungCents: leereReihe(monate.length),
    summeWareneinsatzZahlungCents: leereReihe(monate.length),
    umsatzsteuerCents: leereReihe(monate.length),
    umsatzsteuerNachHorizontCents: 0,
    vorsteuerCents: leereReihe(monate.length),
    rechnungBruttoCents: leereReihe(monate.length),
    wareneinsatzRechnungCents: leereReihe(monate.length),
  };
  for (const linie of linien) {
    addiere(block.summeNettoCents, linie.nettoCents);
    addiere(block.summeWareneinsatzAufwandCents, linie.wareneinsatzAufwandCents);
    addiere(block.summeEinzahlungCents, linie.einzahlungCents);
    addiere(block.summeWareneinsatzZahlungCents, linie.wareneinsatzZahlungCents);
    addiere(block.umsatzsteuerCents, linie.umsatzsteuerCents);
    block.umsatzsteuerNachHorizontCents += linie.umsatzsteuerNachHorizontCents;
    addiere(block.vorsteuerCents, linie.vorsteuerCents);
    addiere(block.rechnungBruttoCents, linie.rechnungBruttoCents);
    addiere(block.wareneinsatzRechnungCents, linie.wareneinsatzRechnungCents);
  }
  return block;
}

function berechneUmsatzlinie(
  position: Umsatzposition,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  faktoren: ReturnType<typeof szenarioFaktoren>,
  steuer: Steuerkontext,
  plan: Finanzplan,
): UmsatzlinieErgebnis {
  const laenge = monate.length;
  const faktor = umsatzFaktor(faktoren, position.id);
  const verschiebung = zahlungszielMonate(position.zahlungszielTage);
  const linie: UmsatzlinieErgebnis = {
    id: position.id,
    bezeichnung: position.bezeichnung,
    nettoCents: leereReihe(laenge),
    wareneinsatzNettoCents: leereReihe(laenge),
    wareneinsatzAufwandCents: leereReihe(laenge),
    einzahlungCents: leereReihe(laenge),
    wareneinsatzZahlungCents: leereReihe(laenge),
    umsatzsteuerCents: leereReihe(laenge),
    umsatzsteuerNachHorizontCents: 0,
    vorsteuerCents: leereReihe(laenge),
    rechnungBruttoCents: leereReihe(laenge),
    wareneinsatzRechnungCents: leereReihe(laenge),
  };

  for (let index = 0; index < laenge; index += 1) {
    const monat = monate[index];
    if (!monat || !istAktiv(monat, position.aktivVon, position.aktivBis)) continue;
    const netto = nettoDerLinie(position, monat, start, faktor);
    const ust = steuer.kleinunternehmer ? 0 : roundRate(netto, position.umsatzsteuerSatz);
    const ware = wareneinsatzDerLinie(position, netto, steuer.vorsteuerAbzug);
    linie.nettoCents[index] = netto;
    linie.wareneinsatzNettoCents[index] = ware.netto;
    linie.wareneinsatzAufwandCents[index] = ware.aufwand;
    linie.wareneinsatzZahlungCents[index] = ware.rechnung;
    linie.wareneinsatzRechnungCents[index] = ware.rechnung;
    linie.vorsteuerCents[index] = ware.vorsteuer;
    linie.rechnungBruttoCents[index] = netto + ust;

    const zahlungIndex = index + verschiebung;
    if (zahlungIndex < laenge) {
      linie.einzahlungCents[zahlungIndex] =
        (linie.einzahlungCents[zahlungIndex] ?? 0) + netto + ust;
    }
    const ustIndex = plan.umsatzsteuer.versteuerungsart === "ist" ? zahlungIndex : index;
    if (ustIndex < laenge) {
      linie.umsatzsteuerCents[ustIndex] = (linie.umsatzsteuerCents[ustIndex] ?? 0) + ust;
    } else {
      linie.umsatzsteuerNachHorizontCents += ust;
    }
  }

  return linie;
}

function nettoDerLinie(
  position: Umsatzposition,
  monat: IsoMonth,
  start: IsoMonth,
  faktor: { menge: number; preis: number },
): number {
  if (position.art === "monatsumsatz") {
    return roundCents(monatsbetragCents(position.monatsumsatz, monat, start) * faktor.menge);
  }
  const menge = mengeImMonat(position.mengeProMonat, monat, start) * faktor.menge;
  const preis = monatsbetragCents(position.preisNetto, monat, start) * faktor.preis;
  return roundCents(menge * preis);
}

function wareneinsatzDerLinie(
  position: Umsatzposition,
  netto: number,
  vorsteuerAbzug: boolean,
): { netto: number; aufwand: number; vorsteuer: number; rechnung: number } {
  if (position.wareneinsatz.art === "keiner") {
    return { netto: 0, aufwand: 0, vorsteuer: 0, rechnung: 0 };
  }
  const weNetto = roundRate(netto, position.wareneinsatz.quote);
  const vorsteuerSatz = position.wareneinsatz.umsatzsteuerSatz;
  const vorsteuerVoll = roundRate(weNetto, vorsteuerSatz);
  return {
    netto: weNetto,
    aufwand: vorsteuerAbzug ? weNetto : weNetto + vorsteuerVoll,
    vorsteuer: vorsteuerAbzug ? vorsteuerVoll : 0,
    rechnung: weNetto + vorsteuerVoll,
  };
}

function berechnePersonal(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  faktoren: ReturnType<typeof szenarioFaktoren>,
): PersonalBlock {
  const start = monate[0];
  if (!start) throw new BerechnungError("Der Plan hat keinen Monat.");
  const stellen: PersonalErgebnis[] = plan.personal.map((stelle) => {
    const faktor = personalFaktor(faktoren, stelle.id);
    const bruttoCents = leereReihe(monate.length);
    const sonderzahlungCents = leereReihe(monate.length);
    const nebenkostenCents = leereReihe(monate.length);
    const aufwandCents = leereReihe(monate.length);
    for (let index = 0; index < monate.length; index += 1) {
      const monat = monate[index];
      if (!monat || !istAktiv(monat, stelle.eintritt, stelle.austritt)) continue;
      const brutto = roundCents(monatsbetragCents(stelle.brutto, monat, start) * faktor);
      const sonderBasis =
        stelle.sonderzahlungen
          ?.filter((sonder) => sonder.monat === monat)
          .reduce((total, sonder) => total + sonder.bruttoCents, 0) ?? 0;
      const sonder = roundCents(sonderBasis * faktor);
      const nebenkosten = roundRate(brutto + sonder, stelle.agNebenkostenSatz);
      bruttoCents[index] = brutto;
      sonderzahlungCents[index] = sonder;
      nebenkostenCents[index] = nebenkosten;
      aufwandCents[index] = brutto + sonder + nebenkosten;
    }
    return {
      id: stelle.id,
      bezeichnung: stelle.bezeichnung,
      rolle: stelle.rolle,
      bruttoCents,
      sonderzahlungCents,
      nebenkostenCents,
      aufwandCents,
    };
  });

  const block: PersonalBlock = {
    stellen,
    summeBruttoCents: leereReihe(monate.length),
    summeNebenkostenCents: leereReihe(monate.length),
    summeAufwandCents: leereReihe(monate.length),
  };
  for (const stelle of stellen) {
    addiere(block.summeBruttoCents, stelle.bruttoCents);
    addiere(block.summeBruttoCents, stelle.sonderzahlungCents);
    addiere(block.summeNebenkostenCents, stelle.nebenkostenCents);
    addiere(block.summeAufwandCents, stelle.aufwandCents);
  }
  return block;
}

function berechneKosten(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  faktoren: ReturnType<typeof szenarioFaktoren>,
  steuer: Steuerkontext,
  umsatzNetto: readonly number[],
): KostenBlock {
  const start = monate[0];
  if (!start) throw new BerechnungError("Der Plan hat keinen Monat.");
  const positionen = plan.laufendeKosten.map((position) =>
    berechneKostenposition(position, monate, start, faktoren, steuer, umsatzNetto),
  );
  const einmalig = [
    ...plan.kapitalbedarf.gruendungskosten.map((posten) =>
      berechneEinmal(posten, "gruendung", monate, start, steuer),
    ),
    ...plan.kapitalbedarf.anlaufkosten.map((posten) =>
      berechneEinmal(posten, "anlauf", monate, start, steuer),
    ),
  ].filter((posten): posten is EinmalKostenErgebnis => posten !== null);

  const block: KostenBlock = {
    positionen,
    einmalig,
    summeAufwandCents: leereReihe(monate.length),
    summeEinmalAufwandCents: leereReihe(monate.length),
    summeAuszahlungCents: leereReihe(monate.length),
    summeEinmalAuszahlungCents: leereReihe(monate.length),
    vorsteuerCents: leereReihe(monate.length),
    vorsteuerEinmalCents: leereReihe(monate.length),
    rechnungBruttoCents: leereReihe(monate.length),
    rechnungEinmalCents: leereReihe(monate.length),
  };
  for (const position of positionen) {
    addiere(block.summeAufwandCents, position.aufwandCents);
    addiere(block.summeAuszahlungCents, position.auszahlungCents);
    addiere(block.vorsteuerCents, position.vorsteuerCents);
    addiere(block.rechnungBruttoCents, position.rechnungBruttoCents);
  }
  for (const posten of einmalig) {
    addiere(block.summeEinmalAufwandCents, posten.aufwandCents);
    addiere(block.summeEinmalAuszahlungCents, posten.auszahlungCents);
    addiere(block.vorsteuerEinmalCents, posten.vorsteuerCents);
    addiere(block.rechnungEinmalCents, posten.rechnungBruttoCents);
  }
  return block;
}

function berechneKostenposition(
  position: Kostenposition,
  monate: readonly IsoMonth[],
  start: IsoMonth,
  faktoren: ReturnType<typeof szenarioFaktoren>,
  steuer: Steuerkontext,
  umsatzNetto: readonly number[],
): KostenpositionErgebnis {
  const faktor = kostenFaktor(faktoren, position.id);
  const verschiebung = zahlungszielMonate(position.zahlungszielTage);
  const ergebnis: KostenpositionErgebnis = {
    id: position.id,
    bezeichnung: position.bezeichnung,
    kategorie: position.kategorie,
    aufwandCents: leereReihe(monate.length),
    auszahlungCents: leereReihe(monate.length),
    vorsteuerCents: leereReihe(monate.length),
    rechnungBruttoCents: leereReihe(monate.length),
  };
  for (let index = 0; index < monate.length; index += 1) {
    const monat = monate[index];
    if (!monat || !istAktiv(monat, position.aktivVon, position.aktivBis)) continue;
    const basis =
      position.art === "fix"
        ? monatsbetragCents(position.betrag, monat, start)
        : roundRate(umsatzNetto[index] ?? 0, position.umsatzquote);
    const netto = roundCents(basis * faktor.faktor) + faktor.zuschlagCents;
    const teile = teileBetrag(
      netto,
      position.umsatzsteuerSatz,
      position.betriebsausgabe,
      position.privatanteil,
      steuer.vorsteuerAbzug,
    );
    ergebnis.aufwandCents[index] = teile.aufwand;
    ergebnis.rechnungBruttoCents[index] = teile.rechnung;
    ergebnis.vorsteuerCents[index] = teile.vorsteuer;
    const zahlung = index + verschiebung;
    if (zahlung < monate.length) {
      ergebnis.auszahlungCents[zahlung] = (ergebnis.auszahlungCents[zahlung] ?? 0) + teile.rechnung;
    }
  }
  return ergebnis;
}

function berechneEinmal(
  posten: Einmalkosten,
  herkunft: EinmalKostenErgebnis["herkunft"],
  monate: readonly IsoMonth[],
  start: IsoMonth,
  steuer: Steuerkontext,
): EinmalKostenErgebnis | null {
  if (posten.buchung.art === "anlage") return null;
  const ergebnis: EinmalKostenErgebnis = {
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    herkunft,
    aufwandCents: leereReihe(monate.length),
    auszahlungCents: leereReihe(monate.length),
    vorsteuerCents: leereReihe(monate.length),
    rechnungBruttoCents: leereReihe(monate.length),
  };
  const index = indexImPlan(start, posten.monat, monate.length);
  if (index === null) return ergebnis;
  const teile = teileBetrag(
    posten.nettoCents,
    posten.umsatzsteuerSatz,
    true,
    0,
    steuer.vorsteuerAbzug,
  );
  ergebnis.rechnungBruttoCents[index] = teile.rechnung;
  ergebnis.vorsteuerCents[index] = teile.vorsteuer;
  ergebnis.aufwandCents[index] = teile.aufwand;
  const zahlung = indexImPlan(
    start,
    addMonths(posten.monat, zahlungszielMonate(posten.zahlungszielTage)),
    monate.length,
  );
  if (zahlung !== null) ergebnis.auszahlungCents[zahlung] = teile.rechnung;
  return ergebnis;
}

function berechneInvestitionen(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  steuer: Steuerkontext,
): InvestitionsBlock {
  const anlagen = [
    ...plan.kapitalbedarf.investitionen,
    ...plan.kapitalbedarf.gruendungskosten.flatMap(einmalkostenAlsAnlage),
    ...plan.kapitalbedarf.anlaufkosten.flatMap(einmalkostenAlsAnlage),
  ].map((investition) =>
    berechneAnlage(investition, {
      monate,
      vorsteuerAbzug: steuer.vorsteuerAbzug,
      sofortaufwandUnterCents: plan.parameter.steuer.sammelpostenMinNettoCents,
    }),
  );
  const warenbestand = berechneWarenbestand(plan, monate.length, steuer);
  const block: InvestitionsBlock = {
    anlagen,
    warenbestand,
    summeAbschreibungCents: leereReihe(monate.length),
    summeSofortaufwandCents: leereReihe(monate.length),
    summeAuszahlungCents: leereReihe(monate.length),
    summeBuchwertCents: leereReihe(monate.length),
    vorsteuerCents: leereReihe(monate.length),
    rechnungBruttoCents: leereReihe(monate.length),
  };
  for (const anlage of anlagen) {
    addiere(block.summeAbschreibungCents, anlage.abschreibungCents);
    addiere(block.summeSofortaufwandCents, anlage.sofortaufwandCents);
    addiere(block.summeAuszahlungCents, anlage.auszahlungCents);
    addiere(block.summeBuchwertCents, anlage.buchwertCents);
    addiere(block.vorsteuerCents, anlage.vorsteuerCents);
    addiere(block.rechnungBruttoCents, anlage.rechnungBruttoCents);
  }
  if (warenbestand) {
    addiere(block.summeAuszahlungCents, warenbestand.auszahlungCents);
    addiere(block.vorsteuerCents, warenbestand.vorsteuerCents);
    addiere(block.rechnungBruttoCents, warenbestand.rechnungBruttoCents);
  }
  return block;
}

function berechneWarenbestand(
  plan: Finanzplan,
  laenge: number,
  steuer: Steuerkontext,
): WarenbestandErgebnis | null {
  const bestand = plan.kapitalbedarf.betriebsmittel.warenErstbestandNettoCents;
  const satz = plan.kapitalbedarf.betriebsmittel.umsatzsteuerSatzWaren;
  if (bestand === undefined || satz === undefined || bestand === 0) return null;
  const vorsteuer = roundRate(bestand, satz);
  const brutto = bestand + vorsteuer;
  const buchwert = steuer.vorsteuerAbzug ? bestand : brutto;
  const ergebnis: WarenbestandErgebnis = {
    nettoCents: bestand,
    buchwertCents: leereReihe(laenge),
    auszahlungCents: leereReihe(laenge),
    vorsteuerCents: leereReihe(laenge),
    rechnungBruttoCents: leereReihe(laenge),
  };
  ergebnis.rechnungBruttoCents[0] = brutto;
  ergebnis.auszahlungCents[0] = brutto;
  if (steuer.vorsteuerAbzug) ergebnis.vorsteuerCents[0] = vorsteuer;
  for (let index = 0; index < laenge; index += 1) ergebnis.buchwertCents[index] = buchwert;
  return ergebnis;
}

function berechneFinanzierung(plan: Finanzplan, monate: readonly IsoMonth[]): FinanzierungsBlock {
  const start = monate[0];
  if (!start) throw new BerechnungError("Der Plan hat keinen Monat.");
  const eigenkapital = plan.finanzierung.eigenkapital.map((posten) => {
    const betragCents = leereReihe(monate.length);
    const einzahlungCents = leereReihe(monate.length);
    const index = indexImPlan(start, posten.monat, monate.length);
    if (index !== null) {
      betragCents[index] = posten.betragCents;
      einzahlungCents[index] = posten.betragCents;
    }
    return {
      id: posten.id,
      bezeichnung: posten.bezeichnung,
      art: posten.art,
      betragCents,
      einzahlungCents,
    };
  });

  const zuschuesse = plan.finanzierung.zuschuesse.map((zuschuss) =>
    berechneZuschuss(zuschuss, monate, start),
  );
  const darlehen = plan.finanzierung.darlehen.map((posten) => darlehenImPlan(posten, monate));
  const darlehenSummen = summiereDarlehen(darlehen);

  const block: FinanzierungsBlock = {
    eigenkapital,
    zuschuesse,
    darlehen,
    summeEinlagenCents: leereReihe(monate.length),
    summeZuschussCents: leereReihe(monate.length),
    summeZuschussErtragCents: leereReihe(monate.length),
    summeProgressionsvorbehaltCents: leereReihe(monate.length),
    summeDarlehenAuszahlungCents: darlehenSummen.auszahlungCents,
    summeZinsCents: darlehenSummen.zinsCents,
    summeTilgungCents: darlehenSummen.tilgungCents,
    summeRestschuldCents: darlehenSummen.restschuldCents,
    summeFinanzierungsaufwandCents: darlehenSummen.finanzierungsaufwandCents,
  };
  for (const posten of eigenkapital) addiere(block.summeEinlagenCents, posten.einzahlungCents);
  for (const posten of zuschuesse) {
    addiere(block.summeZuschussCents, posten.betragCents);
    addiere(block.summeZuschussErtragCents, posten.ertragCents);
    addiere(block.summeProgressionsvorbehaltCents, posten.progressionsvorbehaltCents);
  }
  return block;
}

function berechneZuschuss(
  zuschuss: Zuschuss,
  monate: readonly IsoMonth[],
  start: IsoMonth,
): ZuschussErgebnis {
  const betragCents = leereReihe(monate.length);
  for (const posten of zuschussZahlungen(zuschuss)) {
    setzen(betragCents, indexImPlan(start, posten.monat, monate.length), posten.betragCents);
  }
  const ertragCents = zuschuss.steuerfrei ? leereReihe(monate.length) : betragCents.slice();
  const progressionsvorbehaltCents = zuschuss.progressionsvorbehalt
    ? betragCents.slice()
    : leereReihe(monate.length);
  return {
    id: zuschuss.id,
    bezeichnung: zuschuss.bezeichnung,
    steuerfrei: zuschuss.steuerfrei,
    progressionsvorbehalt: zuschuss.progressionsvorbehalt,
    betragCents,
    ertragCents,
    progressionsvorbehaltCents,
  };
}

function zuschussZahlungen(zuschuss: Zuschuss): { monat: IsoMonth; betragCents: number }[] {
  const auszahlung = zuschuss.auszahlung;
  if (auszahlung.art === "frei") return auszahlung.positionen;
  const zahlungen: { monat: IsoMonth; betragCents: number }[] = [];
  for (let index = 0; index < auszahlung.phase1Monate; index += 1) {
    zahlungen.push({
      monat: addMonths(auszahlung.startMonat, index),
      betragCents: auszahlung.alg1MonatlichCents + auszahlung.pauschaleCents,
    });
  }
  if (auszahlung.phase2Geplant) {
    for (let index = 0; index < auszahlung.phase2Monate; index += 1) {
      zahlungen.push({
        monat: addMonths(auszahlung.startMonat, auszahlung.phase1Monate + index),
        betragCents: auszahlung.pauschaleCents,
      });
    }
  }
  return zahlungen;
}

function berechneUmsatzsteuer(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  umsatz: UmsatzBlock,
  kosten: KostenBlock,
  investitionen: InvestitionsBlock,
): UmsatzsteuerBlock {
  const laenge = monate.length;
  const umsatzsteuerCents = umsatz.umsatzsteuerCents.slice();
  const vorsteuerWareneinsatzCents = umsatz.vorsteuerCents.slice();
  const vorsteuerKostenCents = kosten.vorsteuerCents.slice();
  const vorsteuerEinmalCents = kosten.vorsteuerEinmalCents.slice();
  const vorsteuerInvestitionenCents = investitionen.vorsteuerCents.slice();
  const vorsteuerCents = leereReihe(laenge);
  addiere(vorsteuerCents, vorsteuerWareneinsatzCents);
  addiere(vorsteuerCents, vorsteuerKostenCents);
  addiere(vorsteuerCents, vorsteuerEinmalCents);
  addiere(vorsteuerCents, vorsteuerInvestitionenCents);

  const zahllastCents = leereReihe(laenge);
  const zahlungCents = leereReihe(laenge);
  for (let index = 0; index < laenge; index += 1) {
    zahllastCents[index] = (umsatzsteuerCents[index] ?? 0) - (vorsteuerCents[index] ?? 0);
  }

  const start = monate[0];
  if (start && plan.umsatzsteuer.regime !== "kleinunternehmer") {
    for (let index = 0; index < laenge; index += 1) {
      const monat = monate[index];
      if (!monat) continue;
      const ziel = ustZahllastZahlungsmonat(monat, plan.umsatzsteuer);
      if (!ziel) continue;
      setzen(zahlungCents, indexImPlan(start, ziel, laenge), zahllastCents[index] ?? 0);
    }
  }

  const offeneZahllastCents = leereReihe(laenge);
  let offen = 0;
  for (let index = 0; index < laenge; index += 1) {
    offen += (zahllastCents[index] ?? 0) - (zahlungCents[index] ?? 0);
    offeneZahllastCents[index] = offen;
  }

  return {
    umsatzsteuerCents,
    vorsteuerCents,
    vorsteuerWareneinsatzCents,
    vorsteuerKostenCents,
    vorsteuerEinmalCents,
    vorsteuerInvestitionenCents,
    zahllastCents,
    zahlungCents,
    offeneZahllastCents,
    umsatzsteuerNachHorizontCents: umsatz.umsatzsteuerNachHorizontCents,
  };
}

function berechneEntnahmen(plan: Finanzplan, monate: readonly IsoMonth[]): EntnahmeBlock {
  const start = monate[0];
  if (!start) throw new BerechnungError("Der Plan hat keinen Monat.");
  const lebensbedarfCents = leereReihe(monate.length);
  for (const person of plan.stammdaten.personen) {
    const bedarf = person.lebensbedarf;
    if (!bedarf) continue;
    const teile = [
      bedarf.lebenshaltung,
      bedarf.krankenversicherung,
      bedarf.pflegeversicherung,
      bedarf.altersvorsorge,
      bedarf.sonstigeVersicherungen,
    ];
    for (let index = 0; index < monate.length; index += 1) {
      const monat = monate[index];
      if (!monat) continue;
      const betrag = teile.reduce(
        (total, vorgabe) => total + monatsbetragCents(vorgabe, monat, start),
        0,
      );
      lebensbedarfCents[index] = (lebensbedarfCents[index] ?? 0) + betrag;
    }
  }
  const kapitalgesellschaft =
    plan.stammdaten.rechtsform === "gmbh" || plan.stammdaten.rechtsform === "ug";
  return {
    lebensbedarfCents,
    entnahmeCents: kapitalgesellschaft ? leereReihe(monate.length) : lebensbedarfCents.slice(),
  };
}

function baueUebersicht(
  umsatz: UmsatzBlock,
  personal: PersonalBlock,
  kosten: KostenBlock,
  investitionen: InvestitionsBlock,
  finanzierung: FinanzierungsBlock,
  umsatzsteuer: UmsatzsteuerBlock,
  entnahmen: EntnahmeBlock,
): UebersichtBlock {
  const laenge = umsatz.summeNettoCents.length;
  const uebersicht: UebersichtBlock = {
    umsatzerloeseCents: umsatz.summeNettoCents.slice(),
    wareneinsatzCents: umsatz.summeWareneinsatzAufwandCents.slice(),
    rohertragCents: leereReihe(laenge),
    personalCents: personal.summeAufwandCents.slice(),
    laufendeKostenCents: kosten.summeAufwandCents.slice(),
    gruendungAnlaufCents: kosten.summeEinmalAufwandCents.slice(),
    sofortaufwandCents: investitionen.summeSofortaufwandCents.slice(),
    abschreibungenCents: investitionen.summeAbschreibungCents.slice(),
    zinsaufwandCents: finanzierung.summeZinsCents.slice(),
    finanzierungsaufwandCents: finanzierung.summeFinanzierungsaufwandCents.slice(),
    zuschuesseErtragCents: finanzierung.summeZuschussErtragCents.slice(),
    betriebsergebnisCents: leereReihe(laenge),
    einzahlungenKundenCents: umsatz.summeEinzahlungCents.slice(),
    auszahlungenWareneinsatzCents: umsatz.summeWareneinsatzZahlungCents.slice(),
    auszahlungenPersonalCents: personal.summeAufwandCents.slice(),
    auszahlungenKostenCents: leereReihe(laenge),
    auszahlungenInvestitionenCents: investitionen.summeAuszahlungCents.slice(),
    auszahlungenZinsenCents: finanzierung.summeZinsCents.slice(),
    auszahlungenTilgungCents: finanzierung.summeTilgungCents.slice(),
    umsatzsteuerZahlungCents: umsatzsteuer.zahlungCents.slice(),
    einlagenCents: finanzierung.summeEinlagenCents.slice(),
    darlehensauszahlungCents: finanzierung.summeDarlehenAuszahlungCents.slice(),
    zuschuesseZahlungCents: finanzierung.summeZuschussCents.slice(),
    entnahmenCents: entnahmen.entnahmeCents.slice(),
    zahlungssaldoCents: leereReihe(laenge),
    restschuldCents: finanzierung.summeRestschuldCents.slice(),
    forderungenCents: leereReihe(laenge),
    verbindlichkeitenCents: leereReihe(laenge),
    offeneUmsatzsteuerCents: umsatzsteuer.offeneZahllastCents.slice(),
    restbuchwertCents: investitionen.summeBuchwertCents.slice(),
    warenbestandCents: investitionen.warenbestand?.buchwertCents.slice() ?? leereReihe(laenge),
  };

  addiere(uebersicht.auszahlungenKostenCents, kosten.summeAuszahlungCents);
  addiere(uebersicht.auszahlungenKostenCents, kosten.summeEinmalAuszahlungCents);

  let forderung = 0;
  let verbindlichkeit = 0;
  for (let index = 0; index < laenge; index += 1) {
    const erloes = wert(uebersicht.umsatzerloeseCents, index);
    const ware = wert(uebersicht.wareneinsatzCents, index);
    uebersicht.rohertragCents[index] = erloes - ware;
    uebersicht.betriebsergebnisCents[index] =
      erloes -
      ware -
      wert(uebersicht.personalCents, index) -
      wert(uebersicht.laufendeKostenCents, index) -
      wert(uebersicht.gruendungAnlaufCents, index) -
      wert(uebersicht.sofortaufwandCents, index) -
      wert(uebersicht.abschreibungenCents, index) -
      wert(uebersicht.zinsaufwandCents, index) -
      wert(uebersicht.finanzierungsaufwandCents, index) +
      wert(uebersicht.zuschuesseErtragCents, index);

    uebersicht.zahlungssaldoCents[index] =
      wert(uebersicht.einzahlungenKundenCents, index) +
      wert(uebersicht.einlagenCents, index) +
      wert(uebersicht.darlehensauszahlungCents, index) +
      wert(uebersicht.zuschuesseZahlungCents, index) -
      wert(uebersicht.auszahlungenWareneinsatzCents, index) -
      wert(uebersicht.auszahlungenPersonalCents, index) -
      wert(uebersicht.auszahlungenKostenCents, index) -
      wert(uebersicht.auszahlungenInvestitionenCents, index) -
      wert(uebersicht.auszahlungenZinsenCents, index) -
      wert(uebersicht.auszahlungenTilgungCents, index) -
      wert(uebersicht.umsatzsteuerZahlungCents, index) -
      wert(uebersicht.entnahmenCents, index);

    forderung += wert(umsatz.rechnungBruttoCents, index) - wert(umsatz.summeEinzahlungCents, index);
    verbindlichkeit +=
      wert(umsatz.wareneinsatzRechnungCents, index) +
      wert(kosten.rechnungBruttoCents, index) +
      wert(kosten.rechnungEinmalCents, index) +
      wert(investitionen.rechnungBruttoCents, index) -
      wert(umsatz.summeWareneinsatzZahlungCents, index) -
      wert(kosten.summeAuszahlungCents, index) -
      wert(kosten.summeEinmalAuszahlungCents, index) -
      wert(investitionen.summeAuszahlungCents, index);
    uebersicht.forderungenCents[index] = forderung;
    uebersicht.verbindlichkeitenCents[index] = verbindlichkeit;
  }

  return uebersicht;
}

function einmalkostenAlsAnlage(posten: Einmalkosten): Investition[] {
  if (posten.buchung.art !== "anlage") return [];
  const buchung = posten.buchung;
  const basis = {
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    kategorie: "sonstiges" as const,
    nettoCents: posten.nettoCents,
    umsatzsteuerSatz: posten.umsatzsteuerSatz,
    anschaffungsmonat: posten.monat,
    zahlungszielTage: posten.zahlungszielTage,
    notizen: posten.notizen,
    afaStartMonat: buchung.afaStartMonat,
  };
  if (buchung.afaMethode === "linear") {
    return [
      {
        ...basis,
        afaMethode: "linear",
        nutzungsdauerMonate: buchung.nutzungsdauerMonate,
        restwertCents: buchung.restwertCents,
      },
    ];
  }
  if (buchung.afaMethode === "sofort_gwg") {
    return [{ ...basis, afaMethode: "sofort_gwg", nutzungsdauerMonate: 0 }];
  }
  return [{ ...basis, afaMethode: "sammelposten", restwertCents: buchung.restwertCents }];
}

function hinweise(plan: Finanzplan, investitionen: InvestitionsBlock): BerechnungHinweis[] {
  const grenze = plan.parameter.steuer.sammelpostenMinNettoCents;
  const aktivierteKosten = [
    ...plan.kapitalbedarf.gruendungskosten.flatMap(einmalkostenAlsAnlage),
    ...plan.kapitalbedarf.anlaufkosten.flatMap(einmalkostenAlsAnlage),
  ];
  const klassifikation: BerechnungHinweis[] = [
    ...anlageKlassifikationHinweise(plan),
    ...klassifiziereAnlagen(aktivierteKosten, plan.parameter.steuer),
  ].map((hinweis) => ({
    code: hinweis.code,
    message: hinweis.message,
    bezugId: hinweis.investitionId,
  }));
  const sofort: BerechnungHinweis[] = [];
  for (const investition of [...plan.kapitalbedarf.investitionen, ...aktivierteKosten]) {
    if (investition.nettoCents >= grenze) continue;
    const anlage = investitionen.anlagen.find((item) => item.id === investition.id);
    if (anlage?.behandlung !== "sofortaufwand") continue;
    sofort.push({
      code: "sofortaufwand_bis_250",
      bezugId: investition.id,
      message: `„${investition.bezeichnung}" liegt bei ${investition.nettoCents} Cent netto unter ${grenze} Cent und wird als sofortiger Betriebsaufwand gebucht, nicht als Anlage.`,
    });
  }
  return [...klassifikation, ...sofort];
}

function wert(reihe: readonly number[], index: number): number {
  return reihe[index] ?? 0;
}

export function summeCents(werte: readonly number[]): number {
  return summe(werte);
}
