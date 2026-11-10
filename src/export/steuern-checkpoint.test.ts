import { describe, expect, it } from "vitest";
import { berechnePlan } from "../domain/calc/index.ts";
import { beispielCafe } from "../fixtures/beispiel-cafe.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../fixtures/beispiel-gmbh.ts";
import { steuerCheckpointBlaetter } from "./steuern-checkpoint.ts";

describe("Prüfstand Steuern", () => {
  const blaetter = steuerCheckpointBlaetter([
    { blatt: "Blitzweg", ergebnis: berechnePlan(beispielElektro, "real") },
    { blatt: "Café", ergebnis: berechnePlan(beispielCafe, "real") },
    { blatt: "Hafenlicht", ergebnis: berechnePlan(beispielGmbh, "real") },
  ]);

  it("legt Lesen, Kernzahlen und je Beispiel Jahr und Monat an", () => {
    expect(blaetter.map((blatt) => blatt.name)).toEqual([
      "Lesen",
      "Kernzahlen",
      "Blitzweg Jahre",
      "Blitzweg Monate",
      "Café Jahre",
      "Café Monate",
      "Hafenlicht Jahre",
      "Hafenlicht Monate",
    ]);
  });

  it("zeigt die handgerechnete Hafenlicht-Steuer und den Rechenweg", () => {
    const kern = blaetter.find((blatt) => blatt.name === "Kernzahlen");
    const zeile = kern?.zeilen.find(
      (eintrag) => eintrag[0] === "Hafenlicht" && eintrag[1] === "2026",
    );
    // 12 × 9.300 Euro = 111.600 Euro Gewinn.
    // KSt 15 Prozent = 16.740 Euro. Soli 5,5 Prozent = 920,70 Euro.
    // Messbetrag 3,5 Prozent = 3.906 Euro. Hebesatz 400 Prozent → Gewerbesteuer 15.624 Euro.
    expect(zeile?.[4]).toBe(111_600);
    expect(zeile?.[10]).toBe(16_740);
    expect(zeile?.[11]).toBe(920.7);
    expect(zeile?.[8]).toBe(15_624);
    expect(zeile?.[12]).toBe(33_284.7);

    const jahre = blaetter.find((blatt) => blatt.name === "Hafenlicht Jahre");
    expect(jahre?.zeilen.some((eintrag) => eintrag[0] === "Maßgebender Gewerbeertrag")).toBe(true);
    expect(jahre?.zeilen.some((eintrag) => eintrag[0] === "Anrechnung § 35")).toBe(false);

    const monate = blaetter.find((blatt) => blatt.name === "Hafenlicht Monate");
    const september = monate?.zeilen.find((eintrag) => eintrag[0] === "2027-09");
    // Abschluss 2026 plus die September-Vorauszahlung 2027 liegen im selben Monat.
    expect(september?.[10]).toBeGreaterThan(16_740);
    expect(monate?.zeilen.some((eintrag) => eintrag[0] === "2026-03")).toBe(true);
  });
});
