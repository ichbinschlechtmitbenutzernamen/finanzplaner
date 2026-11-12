import { roundCents } from "../calc/round.ts";
import { istAktiv, mengeImMonat, monatsbetragCents } from "../calc/monatswert.ts";
import { addMonths } from "../months.ts";
import {
  BASIS_SZENARIO_ID,
  type Finanzplan,
  type IsoMonth,
  type Kostenposition,
  type MengenVorgabe,
  type MonatswertVorgabe,
  type Personalstelle,
  type PlanStand,
  type PlanSzenario,
  type SzenarioHebel,
  type Umsatzposition,
} from "../types.ts";

/**
 * Basisplan plus Hebel ergibt einen effektiven Plan.
 * Der übergebene Plan wird nicht verändert. Finanzierung, Investitionen,
 * Gründungs- und Anlaufkosten sowie der Lebensbedarf bleiben bei jedem Hebel gleich.
 *
 * Der Wareneinsatzhebel addiert Prozentpunkte auf die vorhandene Quote.
 * So zieht die Quote mit, wenn sich der Basisplan ändert. Eine feste neue Quote
 * würde diese Änderung verdecken. Zeilen ohne Wareneinsatz bleiben ohne.
 */

const QUOTE_MIN = 0;
const QUOTE_MAX = 5;

export function hebelSindNeutral(hebel: SzenarioHebel): boolean {
  return (
    hebel.umsatzFaktor === 1 &&
    hebel.umsatzstartMonate === 0 &&
    hebel.wareneinsatzPunkte === 0 &&
    hebel.personalFaktor === 1 &&
    hebel.kostenFaktor === 1
  );
}

export function aktivesSzenario(plan: Finanzplan): PlanSzenario | null {
  if (plan.planSzenarien.aktivId === BASIS_SZENARIO_ID) return null;
  return (
    plan.planSzenarien.eintraege.find((eintrag) => eintrag.id === plan.planSzenarien.aktivId) ??
    null
  );
}

/** Effektiver Plan des genannten Szenarios. `basis` liefert denselben Plan zurück. */
export function planFuerSzenario(plan: Finanzplan, id: string): Finanzplan {
  if (id === BASIS_SZENARIO_ID) return plan;
  const szenario = plan.planSzenarien.eintraege.find((eintrag) => eintrag.id === id);
  if (!szenario) return plan;
  if (szenario.art === "abweichung") return wendeHebelAn(plan, szenario.hebel);
  return legeStandAuf(plan, szenario.stand);
}

/** Effektiver Plan der gerade gewählten Ansicht. */
export function planFuerRechnung(plan: Finanzplan): Finanzplan {
  return planFuerSzenario(plan, plan.planSzenarien.aktivId);
}

export function wendeHebelAn(plan: Finanzplan, hebel: SzenarioHebel): Finanzplan {
  const ziel = structuredClone(plan);
  if (hebelSindNeutral(hebel)) return ziel;
  wendeUmsatzAn(ziel, hebel);
  if (hebel.personalFaktor !== 1) {
    ziel.personal = ziel.personal.map((stelle) => skaliereStelle(stelle, hebel.personalFaktor));
  }
  if (hebel.kostenFaktor !== 1) {
    ziel.laufendeKosten = ziel.laufendeKosten.map((position) =>
      skaliereKosten(position, hebel.kostenFaktor),
    );
  }
  return ziel;
}

export function standAus(plan: Finanzplan): PlanStand {
  const stand: PlanStand = {
    status: plan.status,
    parameter: structuredClone(plan.parameter),
    stammdaten: structuredClone(plan.stammdaten),
    kapitalbedarf: structuredClone(plan.kapitalbedarf),
    finanzierung: structuredClone(plan.finanzierung),
    umsatzplanung: structuredClone(plan.umsatzplanung),
    personal: structuredClone(plan.personal),
    laufendeKosten: structuredClone(plan.laufendeKosten),
    umsatzsteuer: structuredClone(plan.umsatzsteuer),
    steuerplanung: structuredClone(plan.steuerplanung),
    szenarien: structuredClone(plan.szenarien),
    pruefung: structuredClone(plan.pruefung),
  };
  if (plan.startMonat !== undefined) stand.startMonat = plan.startMonat;
  if (plan.assistent !== undefined) stand.assistent = structuredClone(plan.assistent);
  if (plan.notizen !== undefined) stand.notizen = plan.notizen;
  return stand;
}

/** Legt den eingefrorenen Stand über den umgebenden Plan. Die Szenario-Liste bleibt die äußere. */
export function legeStandAuf(plan: Finanzplan, stand: PlanStand): Finanzplan {
  const naechster: Finanzplan = {
    ...plan,
    status: stand.status,
    parameter: structuredClone(stand.parameter),
    stammdaten: structuredClone(stand.stammdaten),
    kapitalbedarf: structuredClone(stand.kapitalbedarf),
    finanzierung: structuredClone(stand.finanzierung),
    umsatzplanung: structuredClone(stand.umsatzplanung),
    personal: structuredClone(stand.personal),
    laufendeKosten: structuredClone(stand.laufendeKosten),
    umsatzsteuer: structuredClone(stand.umsatzsteuer),
    steuerplanung: structuredClone(stand.steuerplanung),
    szenarien: structuredClone(stand.szenarien),
    pruefung: structuredClone(stand.pruefung),
  };
  if (stand.startMonat !== undefined) naechster.startMonat = stand.startMonat;
  else delete naechster.startMonat;
  if (stand.assistent !== undefined) naechster.assistent = structuredClone(stand.assistent);
  else delete naechster.assistent;
  if (stand.notizen !== undefined) naechster.notizen = stand.notizen;
  else delete naechster.notizen;
  return naechster;
}

function wendeUmsatzAn(plan: Finanzplan, hebel: SzenarioHebel): void {
  const start = plan.startMonat;
  const schieben = hebel.umsatzstartMonate > 0 && start !== undefined;
  const skalieren = hebel.umsatzFaktor !== 1;
  const quote = hebel.wareneinsatzPunkte !== 0;
  if (!schieben && !skalieren && !quote) return;
  const monate = start === undefined ? [] : horizontMonate(start, plan.horizontMonate);
  plan.umsatzplanung = plan.umsatzplanung.map((position) => {
    let linie = quote ? mitWareneinsatz(position, hebel.wareneinsatzPunkte) : position;
    if (schieben && start !== undefined) {
      const werte = nettoReihe(linie, start, monate, hebel.umsatzFaktor);
      return alsMonatsumsatz(linie, monate, verschiebe(werte, hebel.umsatzstartMonate));
    }
    if (skalieren) linie = skaliereUmsatz(linie, hebel.umsatzFaktor);
    return linie;
  });
}

function horizontMonate(start: IsoMonth, laenge: number): IsoMonth[] {
  return Array.from({ length: laenge }, (_, index) => addMonths(start, index));
}

/**
 * Nettoumsatz je Planmonat, nach dem Umsatzfaktor, vor dem älteren Faktorblock des Rechenkerns.
 * Inaktive Monate sind 0 und wandern beim Verschieben mit.
 */
function nettoReihe(
  position: Umsatzposition,
  start: IsoMonth,
  monate: readonly IsoMonth[],
  faktor: number,
): number[] {
  return monate.map((monat) => {
    if (!istAktiv(monat, position.aktivVon, position.aktivBis)) return 0;
    if (position.art === "monatsumsatz") {
      return roundCents(monatsbetragCents(position.monatsumsatz, monat, start) * faktor);
    }
    const menge = mengeImMonat(position.mengeProMonat, monat, start) * faktor;
    const preis = monatsbetragCents(position.preisNetto, monat, start);
    return roundCents(menge * preis);
  });
}

/** Index 0 bis n−1 werden 0. Was hinter dem letzten Monat läge, wird nicht übernommen. */
function verschiebe(werte: readonly number[], monate: number): number[] {
  return werte.map((_, index) => {
    const quelle = index - monate;
    if (quelle < 0) return 0;
    return werte[quelle] ?? 0;
  });
}

/**
 * Die verschobene Reihe steht als Monatsausnahme, damit Wachstum, Saison und das alte
 * Aktiv-Fenster sie nicht noch einmal verschieben oder abschneiden. Der Wareneinsatz
 * bleibt Quote vom Umsatz dieses Monats und folgt der Reihe deshalb von selbst.
 */
function alsMonatsumsatz(
  position: Umsatzposition,
  monate: readonly IsoMonth[],
  werte: readonly number[],
): Umsatzposition {
  const linie: Umsatzposition = {
    id: position.id,
    bezeichnung: position.bezeichnung,
    art: "monatsumsatz",
    monatsumsatz: {
      basisCents: werte[0] ?? 0,
      monatsOverride: monate.map((monat, index) => ({
        monat,
        wertCents: werte[index] ?? 0,
      })),
    },
    umsatzsteuerSatz: position.umsatzsteuerSatz,
    zahlungszielTage: position.zahlungszielTage,
    wareneinsatz: position.wareneinsatz,
  };
  if (position.beschreibung !== undefined) linie.beschreibung = position.beschreibung;
  return linie;
}

function mitWareneinsatz(position: Umsatzposition, punkte: number): Umsatzposition {
  if (position.wareneinsatz.art !== "prozent_vom_umsatz" || punkte === 0) return position;
  return {
    ...position,
    wareneinsatz: {
      ...position.wareneinsatz,
      quote: klemme(rundeSatz(position.wareneinsatz.quote + punkte), QUOTE_MIN, QUOTE_MAX),
    },
  };
}

function skaliereUmsatz(position: Umsatzposition, faktor: number): Umsatzposition {
  if (position.art === "monatsumsatz") {
    return { ...position, monatsumsatz: skaliereGeld(position.monatsumsatz, faktor) };
  }
  return { ...position, mengeProMonat: skaliereMenge(position.mengeProMonat, faktor) };
}

function skaliereStelle(stelle: Personalstelle, faktor: number): Personalstelle {
  const naechste: Personalstelle = { ...stelle, brutto: skaliereGeld(stelle.brutto, faktor) };
  if (stelle.sonderzahlungen) {
    naechste.sonderzahlungen = stelle.sonderzahlungen.map((sonder) => ({
      ...sonder,
      bruttoCents: roundCents(sonder.bruttoCents * faktor),
    }));
  }
  return naechste;
}

function skaliereKosten(position: Kostenposition, faktor: number): Kostenposition {
  if (position.art === "fix") {
    return { ...position, betrag: skaliereGeld(position.betrag, faktor) };
  }
  return {
    ...position,
    umsatzquote: klemme(rundeSatz(position.umsatzquote * faktor), QUOTE_MIN, QUOTE_MAX),
  };
}

function skaliereGeld(vorgabe: MonatswertVorgabe, faktor: number): MonatswertVorgabe {
  return {
    ...vorgabe,
    basisCents: roundCents(vorgabe.basisCents * faktor),
    monatsOverride: vorgabe.monatsOverride?.map((eintrag) => ({
      ...eintrag,
      wertCents: roundCents(eintrag.wertCents * faktor),
    })),
  };
}

function skaliereMenge(vorgabe: MengenVorgabe, faktor: number): MengenVorgabe {
  return {
    ...vorgabe,
    basis: vorgabe.basis * faktor,
    monatsOverride: vorgabe.monatsOverride?.map((eintrag) => ({
      ...eintrag,
      wert: eintrag.wert * faktor,
    })),
  };
}

function klemme(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

/** Satz auf 12 Nachkommastellen, wie die Rundung im Rechenkern. */
function rundeSatz(wert: number): number {
  return Math.round(wert * 1e12) / 1e12;
}
