import { describe, expect, it } from "vitest";
import { berichteCheckpointBlaetter } from "./berichte-checkpoint.ts";

describe("Prüfstand Berichte", () => {
  const blaetter = berichteCheckpointBlaetter();

  it("legt je Beispiel die Berichtsblätter an", () => {
    const namen = blaetter.map((blatt) => blatt.name);
    expect(namen).toContain("Lesen");
    expect(namen).toContain("Kernzahlen");
    for (const kuerzel of ["Blitzweg", "Café", "Hafenlicht"]) {
      expect(namen).toContain(`${kuerzel} GuV`);
      expect(namen).toContain(`${kuerzel} GuV Monate`);
      expect(namen).toContain(`${kuerzel} Liquidität`);
      expect(namen).toContain(`${kuerzel} Liqui Monate`);
      expect(namen).toContain(`${kuerzel} Kapital`);
      expect(namen).toContain(`${kuerzel} Anlagen`);
      expect(namen).toContain(`${kuerzel} Darlehen`);
      expect(namen).toContain(`${kuerzel} Tragfähigkeit`);
      expect(namen).toContain(`${kuerzel} Kennzahlen`);
    }
    for (const name of namen) expect(name.length).toBeLessThanOrEqual(31);
  });

  it("zeigt Planjahre und die nachgerechneten Eurobeträge", () => {
    const guv = blaetter.find((blatt) => blatt.name === "Blitzweg GuV");
    expect(guv?.zeilen[guv.kopfzeile]?.[1]).toContain("Planjahr 1");
    expect(guv?.zeilen[guv.kopfzeile]?.[1]).toContain("Jun 2026");
    expect(zelle(blaetter, "Blitzweg GuV", "Rohertrag")?.[1]).toBe(61_417.18);
    expect(zelle(blaetter, "Hafenlicht GuV", "Ergebnis nach Steuern")?.[1]).toBe(78_315.3);
    expect(zelle(blaetter, "Blitzweg Darlehen", "Restschuld")?.[3]).toBe(17_013.94);
    expect(zelle(blaetter, "Café Kapital", "Summe Kapitalbedarf")?.at(-1)).toBe(102_610);
    const tragfaehigkeit = blaetter.find((blatt) => blatt.name === "Hafenlicht Tragfähigkeit");
    expect(tragfaehigkeit?.zeilen.some((zeile) => zeile[0] === "Nicht anwendbar")).toBe(true);
    const monate = blaetter.find((blatt) => blatt.name === "Blitzweg GuV Monate");
    expect(monate?.zeilen[monate.kopfzeile]?.[1]).toBe("Jun 2026");
    expect(monate?.planjahrSpalten).toEqual([13, 26, 39]);
  });
});

function zelle(
  blaetter: ReturnType<typeof berichteCheckpointBlaetter>,
  name: string,
  label: string,
): (string | number | null)[] | undefined {
  return blaetter.find((blatt) => blatt.name === name)?.zeilen.find((zeile) => zeile[0] === label);
}
