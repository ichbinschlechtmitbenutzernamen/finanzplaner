import { berechnePlan } from "../calc/berechnen.ts";
import { pruefePlan } from "../checks/pruefen.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import { findeZeile } from "../reports/planjahr.ts";
import type { Berichte } from "../reports/typen.ts";
import {
  BASIS_SZENARIO_ID,
  type Finanzplan,
  type IsoMonth,
  type PlanSzenarioArt,
} from "../types.ts";
import { planFuerSzenario } from "./anwenden.ts";

/**
 * Vergleich aller Szenarien mit dem Basisplan, für die Seite und für spätere Exporte.
 * PDF und Excel lesen diese Struktur, analog zu `meldungenFuerExport`.
 * Gerechnet wird jedes Szenario mit demselben Kern. Der Basisplan wird dabei nicht geschrieben.
 */

export interface ExportSzenarioVergleich {
  id: string;
  name: string;
  art: "basis" | PlanSzenarioArt;
  umsatzPlanjahreCents: number[];
  ergebnisNachSteuernPlanjahreCents: number[];
  tiefsterKontostandCents: number | null;
  tiefsterKontostandMonat: IsoMonth | null;
  /** Summe des Kapitalbedarfsplans. Der Kontokorrent steht beim tiefsten Kontostand. */
  kapitalbedarfCents: number | null;
  breakEvenMonat: IsoMonth | null;
  /** 1-basiert. Null, wenn der Break-even im Horizont nicht erreicht wird. */
  breakEvenPlanmonat: number | null;
  /** Falsch bei GmbH und UG. */
  tragfaehigkeitAnwendbar: boolean;
  /**
   * Verfügbares Einkommen im Planjahr 2, Summe der Personen.
   * Null, wenn die Tragfähigkeit nicht gilt oder ein Planjahr 2 fehlt.
   */
  tragfaehigkeitPlanjahr2Cents: number | null;
  fehler: number;
  warnungen: number;
  hinweise: number;
  /** Endbestand je Planmonat, für das übereinandergelegte Diagramm. */
  kontostandCents: number[];
  monate: IsoMonth[];
  fehlerText: string | null;
}

export function vergleichFuerExport(plan: Finanzplan): ExportSzenarioVergleich[] {
  const spalten: ExportSzenarioVergleich[] = [
    spalteFuer(plan, BASIS_SZENARIO_ID, "Basisplan", "basis"),
  ];
  for (const eintrag of plan.planSzenarien.eintraege) {
    spalten.push(spalteFuer(plan, eintrag.id, eintrag.name, eintrag.art));
  }
  return spalten;
}

function spalteFuer(
  plan: Finanzplan,
  id: string,
  name: string,
  art: ExportSzenarioVergleich["art"],
): ExportSzenarioVergleich {
  try {
    const effektiv = planFuerSzenario(plan, id);
    const berichte = erstelleBerichte(effektiv, berechnePlan(effektiv));
    return spalteAusBerichten(id, name, art, berichte, effektiv);
  } catch (fehler) {
    return leereSpalte(
      id,
      name,
      art,
      fehler instanceof Error ? fehler.message : "Die Rechnung ist fehlgeschlagen.",
    );
  }
}

function spalteAusBerichten(
  id: string,
  name: string,
  art: ExportSzenarioVergleich["art"],
  berichte: Berichte,
  plan: Finanzplan,
): ExportSzenarioVergleich {
  const umsatz = findeZeile(berichte.rentabilitaet.zeilen, "umsatz");
  const nachSteuern = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
  const meldungen = pruefePlan(planFuerSzenario(plan, id), berichte);
  const tragfaehigkeit = tragfaehigkeitPlanjahr2(berichte);
  return {
    id,
    name,
    art,
    umsatzPlanjahreCents: [...umsatz.planjahreCents],
    ergebnisNachSteuernPlanjahreCents: [...nachSteuern.planjahreCents],
    tiefsterKontostandCents: berichte.liquiditaet.tiefsterKontostandCents,
    tiefsterKontostandMonat: berichte.liquiditaet.tiefsterKontostandMonat,
    kapitalbedarfCents: berichte.kapital.summeBedarf.betragCents,
    breakEvenMonat: berichte.kennzahlen.breakEven.monat,
    breakEvenPlanmonat: berichte.kennzahlen.breakEven.planmonat,
    tragfaehigkeitAnwendbar: tragfaehigkeit.anwendbar,
    tragfaehigkeitPlanjahr2Cents: tragfaehigkeit.cents,
    fehler: meldungen.filter((meldung) => meldung.stufe === "fehler").length,
    warnungen: meldungen.filter((meldung) => meldung.stufe === "warnung").length,
    hinweise: meldungen.filter((meldung) => meldung.stufe === "hinweis").length,
    kontostandCents: [...berichte.liquiditaet.endbestand.monateCents],
    monate: [...berichte.monate],
    fehlerText: null,
  };
}

function tragfaehigkeitPlanjahr2(berichte: Berichte): { anwendbar: boolean; cents: number | null } {
  if (!berichte.tragfaehigkeit.anwendbar) return { anwendbar: false, cents: null };
  let summe = 0;
  for (const person of berichte.tragfaehigkeit.personen) {
    if (person.planjahr2Cents == null) return { anwendbar: true, cents: null };
    summe += person.planjahr2Cents;
  }
  return { anwendbar: true, cents: summe };
}

function leereSpalte(
  id: string,
  name: string,
  art: ExportSzenarioVergleich["art"],
  fehlerText: string,
): ExportSzenarioVergleich {
  return {
    id,
    name,
    art,
    umsatzPlanjahreCents: [],
    ergebnisNachSteuernPlanjahreCents: [],
    tiefsterKontostandCents: null,
    tiefsterKontostandMonat: null,
    kapitalbedarfCents: null,
    breakEvenMonat: null,
    breakEvenPlanmonat: null,
    tragfaehigkeitAnwendbar: false,
    tragfaehigkeitPlanjahr2Cents: null,
    fehler: 0,
    warnungen: 0,
    hinweise: 0,
    kontostandCents: [],
    monate: [],
    fehlerText,
  };
}
