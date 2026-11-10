import { describe, expect, it } from "vitest";
import { berechnePlan, summeCents } from "../domain/calc/index.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { checkpointBlaetter } from "./checkpoint.ts";

describe("Prüfstand Blitzweg", () => {
  const ergebnis = berechnePlan(beispielElektro, "real");
  const blaetter = checkpointBlaetter(ergebnis, {
    basisUmsatzCents: summeCents(ergebnis.umsatz.summeNettoCents),
    bestUmsatzCents: summeCents(berechnePlan(beispielElektro, "best").umsatz.summeNettoCents),
    realUmsatzCents: summeCents(ergebnis.umsatz.summeNettoCents),
    worstUmsatzCents: summeCents(berechnePlan(beispielElektro, "worst").umsatz.summeNettoCents),
  });

  it("legt je Bereich ein Blatt mit 36 Monatsspalten an", () => {
    expect(blaetter.map((blatt) => blatt.name)).toEqual([
      "Übersicht",
      "Umsatz & Wareneinsatz",
      "Personal",
      "Kosten",
      "Investitionen & Abschreibungen",
      "Finanzierung",
      "Umsatzsteuer",
    ]);
    for (const blatt of blaetter) {
      const kopf = blatt.zeilen[blatt.kopfzeile];
      expect(kopf?.[1]).toBe("Jun 2026");
      expect(kopf?.[36]).toBe("Mai 2029");
      expect(kopf?.[37]).toBe("Summe");
      expect(blatt.name.length).toBeLessThanOrEqual(31);
    }
  });

  it("zeigt die handgerechneten Junizahlen in Euro", () => {
    const umsatz = zeile(blaetter, "Umsatz & Wareneinsatz", "Summe Nettoumsatz");
    expect(cents(umsatz?.[1])).toBe(747_500);
    const zahllast = zeile(blaetter, "Umsatzsteuer", "Zahlung (negativ = Erstattung)");
    expect(cents(zahllast?.[2])).toBe(-346_931);
    const schuld = zeile(
      blaetter,
      "Finanzierung",
      "Thüringer Mikrodarlehen – Restschuld am Monatsende",
    );
    expect(cents(schuld?.[36])).toBe(1_701_394);
    const ergebnisZeile = zeile(blaetter, "Übersicht", "Betriebsergebnis vor Steuern");
    expect(cents(ergebnisZeile?.[1])).toBe(365_050);
  });
});

function zeile(
  blaetter: ReturnType<typeof checkpointBlaetter>,
  blattName: string,
  label: string,
): (string | number | null)[] | undefined {
  return blaetter
    .find((blatt) => blatt.name === blattName)
    ?.zeilen.find((zeile) => zeile[0] === label);
}

function cents(value: string | number | null | undefined): number {
  if (typeof value !== "number") throw new Error("Eurobetrag fehlt");
  return Math.round(value * 100);
}
