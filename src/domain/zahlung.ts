import { addMonths, parseIsoMonth } from "./months.ts";
import type { IsoMonth, UmsatzsteuerEinstellungen } from "./types.ts";

/**
 * Zahlungsziel in Tagen auf das Monatsraster.
 * 0 bis 14 Tage bleiben im Leistungsmonat, danach verschiebt jeder weitere angefangene
 * 30-Tage-Block um einen Monat.
 */
export function zahlungszielMonate(tage: number): number {
  if (tage <= 14) return 0;
  return Math.ceil((tage - 14) / 30);
}

/**
 * Monat, in dem die USt-Zahllast eines Entstehungsmonats das Konto verlässt.
 * Der Entstehungsmonat ist bei Soll-Versteuerung der Leistungsmonat und bei
 * Ist-Versteuerung der Monat des Zahlungseingangs.
 * Die Zahllast selbst ist Umsatzsteuer auf die Leistungen minus abziehbare Vorsteuer.
 * Bei Kleinunternehmern gibt es keine Zahllast.
 * Der Fälligkeitstag (üblicherweise der 10.) fällt im Monatsraster in denselben Monat.
 */
export function ustZahllastZahlungsmonat(
  entstehungsmonat: IsoMonth,
  umsatzsteuer: UmsatzsteuerEinstellungen,
): IsoMonth | null {
  if (umsatzsteuer.regime === "kleinunternehmer") return null;
  const extra = umsatzsteuer.dauerfristverlaengerung ? 1 : 0;
  if (umsatzsteuer.voranmeldungszeitraum === "monatlich") {
    return addMonths(entstehungsmonat, 1 + extra);
  }
  const { year, month } = parseIsoMonth(entstehungsmonat);
  const quartalsende = `${year}-${String(Math.ceil(month / 3) * 3).padStart(2, "0")}`;
  return addMonths(quartalsende, 1 + extra);
}
