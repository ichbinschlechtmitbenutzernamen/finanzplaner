import { addMonths, monthIndex } from "../months.ts";
import type { Darlehen, IsoMonth } from "../types.ts";
import { addiere, leereReihe, summe } from "./reihe.ts";
import { annuitaetCents, roundRate, verteilteRaten, zinsMonatCents } from "./round.ts";

export interface KreditMonat {
  monat: IsoMonth;
  /** Geld, das auf dem Konto ankommt. Disagio, Gebühren und ein Auszahlungskurs unter 100 % sind abgezogen. */
  auszahlungCents: number;
  /** Nominal, um das die Schuld in diesem Monat steigt. */
  schuldZugangCents: number;
  zinsCents: number;
  tilgungCents: number;
  /** Zins plus Tilgung, also die tatsächliche Rate. */
  rateCents: number;
  restschuldCents: number;
  /** Disagio, Gebühren und die Differenz aus einem Auszahlungskurs unter 100 %. Aufwand im selben Monat. */
  finanzierungsaufwandCents: number;
}

export interface DarlehenImPlan {
  id: string;
  bezeichnung: string;
  geber: string;
  tilgungsart: Darlehen["tilgungsart"];
  nominalzinsPa: number;
  nominalCents: number;
  laufzeitMonate: number;
  tilgungsfreieMonate: number;
  auszahlungCents: number[];
  zinsCents: number[];
  tilgungCents: number[];
  rateCents: number[];
  restschuldCents: number[];
  finanzierungsaufwandCents: number[];
}

export interface DarlehenSummen {
  auszahlungCents: number[];
  zinsCents: number[];
  tilgungCents: number[];
  rateCents: number[];
  restschuldCents: number[];
  finanzierungsaufwandCents: number[];
}

/**
 * Vollständiger Kreditplan, auch über die 36 Planmonate hinaus.
 *
 * Der erste Monat ist der Monat der ersten Auszahlung und hat noch keine Rate.
 * Die erste Rate liegt im Folgemonat. Laufzeit und tilgungsfreie Zeit zählen ab dieser Rate.
 * Zinsen eines Monats rechnen auf die Restschuld zu Monatsbeginn, vor einer neuen Tranche
 * und vor der Tilgung. Eine Tranche trägt deshalb erst ab dem Folgemonat Zinsen.
 * Dieselbe Tranche kann im Monat ihres Zuflusses aber schon getilgt werden.
 * Im letzten Monat der Laufzeit wird die dann vorhandene Schuld vollständig getilgt.
 * „Keine Zinsen in der tilgungsfreien Zeit“ ist ein Erlass, keine Stundung und keine Zuschreibung.
 */
export function kreditplan(darlehen: Darlehen): KreditMonat[] {
  const auszahlungen = [...darlehen.auszahlungen].sort((left, right) =>
    left.monat < right.monat ? -1 : left.monat > right.monat ? 1 : 0,
  );
  const erste = auszahlungen[0];
  if (!erste) return [];

  const anteil = darlehen.auszahlungAnteil ?? 1;
  const gebuehren = darlehen.gebuehrenCents ?? 0;
  const disagio = darlehen.disagioCents ?? 0;
  const tilgungsMonate = Math.max(darlehen.laufzeitMonate - darlehen.tilgungsfreieMonate, 0);
  const raten =
    darlehen.tilgungsart === "ratentilgung" && tilgungsMonate > 0
      ? verteilteRaten(darlehen.betragCents, tilgungsMonate)
      : null;
  const annuitaet =
    darlehen.tilgungsart === "annuitaet" && tilgungsMonate > 0
      ? annuitaetCents(darlehen.betragCents, darlehen.nominalzinsPa, tilgungsMonate)
      : 0;
  const letzterOffset = auszahlungen.reduce(
    (max, tranche) => Math.max(max, monthIndex(erste.monat, tranche.monat)),
    darlehen.laufzeitMonate,
  );

  let rest = 0;
  const zeilen: KreditMonat[] = [];

  for (let offset = 0; offset <= letzterOffset; offset += 1) {
    const monat = addMonths(erste.monat, offset);
    const zugang = auszahlungen
      .filter((tranche) => tranche.monat === monat)
      .reduce((total, tranche) => total + tranche.betragCents, 0);
    const istRate = offset >= 1 && offset <= darlehen.laufzeitMonate;
    const inGrace = istRate && offset <= darlehen.tilgungsfreieMonate;
    const istLetzter = offset === darlehen.laufzeitMonate;
    const zinsErlassen = inGrace && !darlehen.zinszahlungInTilgungsfreierZeit;
    const zins = istRate && !zinsErlassen ? zinsMonatCents(rest, darlehen.nominalzinsPa) : 0;

    const bar = roundRate(zugang, anteil);
    let finanzierungsaufwand = zugang - bar;
    let auszahlung = bar;
    if (offset === 0) {
      auszahlung -= gebuehren + disagio;
      finanzierungsaufwand += gebuehren + disagio;
    }

    rest += zugang;
    let tilgung = 0;
    if (istRate) {
      tilgung = tilgungDesMonats({
        darlehen,
        rest,
        zins,
        inGrace,
        istLetzter,
        offset,
        tilgungsMonate,
        raten,
        annuitaet,
      });
    }
    rest -= tilgung;

    zeilen.push({
      monat,
      auszahlungCents: auszahlung,
      schuldZugangCents: zugang,
      zinsCents: zins,
      tilgungCents: tilgung,
      rateCents: zins + tilgung,
      restschuldCents: rest,
      finanzierungsaufwandCents: finanzierungsaufwand,
    });
  }

  return zeilen;
}

function tilgungDesMonats(input: {
  darlehen: Darlehen;
  rest: number;
  zins: number;
  inGrace: boolean;
  istLetzter: boolean;
  offset: number;
  tilgungsMonate: number;
  raten: { regulaer: number; letzte: number } | null;
  annuitaet: number;
}): number {
  const { darlehen, rest, zins, inGrace, istLetzter, offset, tilgungsMonate, raten, annuitaet } =
    input;
  if (istLetzter) return rest;
  if (inGrace || tilgungsMonate === 0 || darlehen.tilgungsart === "endfaellig") return 0;
  if (darlehen.tilgungsart === "ratentilgung" && raten) {
    const index = offset - darlehen.tilgungsfreieMonate;
    const geplant = index === tilgungsMonate ? raten.letzte : raten.regulaer;
    return Math.min(Math.max(geplant, 0), rest);
  }
  if (darlehen.tilgungsart === "annuitaet") {
    return Math.min(Math.max(annuitaet - zins, 0), rest);
  }
  return 0;
}

/** Legt den vollständigen Kreditplan auf die Planmonate. Davor ist die Schuld 0, danach bleibt sie stehen. */
export function darlehenImPlan(darlehen: Darlehen, monate: readonly IsoMonth[]): DarlehenImPlan {
  const plan = kreditplan(darlehen);
  const nachMonat = new Map(plan.map((zeile) => [zeile.monat, zeile]));
  const laenge = monate.length;
  const auszahlungCents = leereReihe(laenge);
  const zinsCents = leereReihe(laenge);
  const tilgungCents = leereReihe(laenge);
  const rateCents = leereReihe(laenge);
  const restschuldCents = leereReihe(laenge);
  const finanzierungsaufwandCents = leereReihe(laenge);

  let rest = 0;
  let begonnen = false;
  for (let index = 0; index < laenge; index += 1) {
    const zeile = nachMonat.get(monate[index] ?? "");
    if (zeile) {
      begonnen = true;
      auszahlungCents[index] = zeile.auszahlungCents;
      zinsCents[index] = zeile.zinsCents;
      tilgungCents[index] = zeile.tilgungCents;
      rateCents[index] = zeile.rateCents;
      finanzierungsaufwandCents[index] = zeile.finanzierungsaufwandCents;
      rest = zeile.restschuldCents;
    }
    restschuldCents[index] = begonnen ? rest : 0;
  }

  return {
    id: darlehen.id,
    bezeichnung: darlehen.bezeichnung,
    geber: darlehen.geber,
    tilgungsart: darlehen.tilgungsart,
    nominalzinsPa: darlehen.nominalzinsPa,
    nominalCents: darlehen.betragCents,
    laufzeitMonate: darlehen.laufzeitMonate,
    tilgungsfreieMonate: darlehen.tilgungsfreieMonate,
    auszahlungCents,
    zinsCents,
    tilgungCents,
    rateCents,
    restschuldCents,
    finanzierungsaufwandCents,
  };
}

export function summiereDarlehen(darlehen: readonly DarlehenImPlan[]): DarlehenSummen {
  const laenge = darlehen[0]?.auszahlungCents.length ?? 0;
  const summen: DarlehenSummen = {
    auszahlungCents: leereReihe(laenge),
    zinsCents: leereReihe(laenge),
    tilgungCents: leereReihe(laenge),
    rateCents: leereReihe(laenge),
    restschuldCents: leereReihe(laenge),
    finanzierungsaufwandCents: leereReihe(laenge),
  };
  for (const posten of darlehen) {
    addiere(summen.auszahlungCents, posten.auszahlungCents);
    addiere(summen.zinsCents, posten.zinsCents);
    addiere(summen.tilgungCents, posten.tilgungCents);
    addiere(summen.rateCents, posten.rateCents);
    addiere(summen.restschuldCents, posten.restschuldCents);
    addiere(summen.finanzierungsaufwandCents, posten.finanzierungsaufwandCents);
  }
  return summen;
}

export function summeTilgung(plan: readonly KreditMonat[]): number {
  return summe(plan.map((zeile) => zeile.tilgungCents));
}
