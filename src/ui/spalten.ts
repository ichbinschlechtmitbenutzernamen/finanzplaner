import type { Planjahr } from "../domain/reports/planjahr.ts";
import type { IsoMonth } from "../domain/types.ts";

export type DatenSpalte =
  | { art: "monat"; key: string; monatIndex: number; monat: IsoMonth; planjahr: number }
  | { art: "jahr"; key: string; planjahr: Planjahr };

/** Monatsspalten je Planjahr, dahinter die Summenspalte. Eingeklappte Jahre zeigen nur die Summe. */
export function sichtbareSpalten(
  monate: readonly IsoMonth[],
  planjahre: readonly Planjahr[],
  eingeklappt: ReadonlySet<number>,
): DatenSpalte[] {
  const spalten: DatenSpalte[] = [];
  for (const jahr of planjahre) {
    if (!eingeklappt.has(jahr.nummer)) {
      for (let index = jahr.vonIndex; index < jahr.bisIndex; index += 1) {
        const monat = monate[index];
        if (!monat) continue;
        spalten.push({
          art: "monat",
          key: monat,
          monatIndex: index,
          monat,
          planjahr: jahr.nummer,
        });
      }
    }
    spalten.push({ art: "jahr", key: `jahr-${jahr.nummer}`, planjahr: jahr });
  }
  return spalten;
}
