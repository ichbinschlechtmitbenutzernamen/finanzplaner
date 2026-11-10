import { describe, expect, it } from "vitest";
import type { MonatFaktoren } from "../types.ts";
import { mengeImMonat, monatsbetragCents } from "./monatswert.ts";

const mai: MonatFaktoren = [1, 1, 1, 1, 1.1, 1, 1, 1, 1, 1, 1, 1];
const april: MonatFaktoren = [1, 1, 1, 1.2, 1, 1, 1, 1, 1, 1, 1, 1];
const doppelt: MonatFaktoren = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

describe("Monatswert", () => {
  it("folgt dem Beispiel aus dem Datenmodell", () => {
    // Basis 1.000,00 Euro im April, 12 % jährlich, monatlich aufgezinst, Mai-Faktor 1,1.
    // Abstand ein Monat. 1,12^(1/12) ≈ 1,009488. Mal 1,1 ≈ 1,110437.
    // 100.000 × 1,11043767… = 111.043,767… Cent → 1.110,44 Euro.
    const vorgabe = {
      basisCents: 100_000,
      bezugsmonat: "2026-04",
      wachstum: { jahresrate: 0.12, modus: "compound_monthly" as const },
      saison: { faktoren: mai },
    };
    expect(monatsbetragCents(vorgabe, "2026-04", "2026-04")).toBe(100_000);
    expect(monatsbetragCents(vorgabe, "2026-05", "2026-04")).toBe(111_044);
  });

  it("lässt den Jahressprung zwölf Monate konstant", () => {
    // April 2026 bis März 2027: Faktor 1. Ab April 2027: 1,12.
    // Mit April-Saison 1,2 sind das 1.200,00 Euro und danach 1.344,00 Euro.
    // März 2026 liegt ein Monat vor dem Bezug, also im vorherigen Schritt: 1.120 / 1,12 = 1.000 Euro,
    // mal Saison 1 bleibt 1.000,00 Euro.
    const vorgabe = {
      basisCents: 112_000,
      bezugsmonat: "2026-04",
      wachstum: { jahresrate: 0.12, modus: "yearly_step" as const },
      saison: { faktoren: april },
    };
    expect(monatsbetragCents(vorgabe, "2026-03", "2026-03")).toBe(100_000);
    expect(monatsbetragCents(vorgabe, "2026-04", "2026-04")).toBe(134_400);
    expect(monatsbetragCents(vorgabe, "2027-03", "2026-04")).toBe(112_000);
    expect(monatsbetragCents(vorgabe, "2027-04", "2026-04")).toBe(150_528);
  });

  it("ersetzt Wachstum und Saison durch die Monatsausnahme", () => {
    const vorgabe = {
      basisCents: 100_000,
      wachstum: { jahresrate: 0.5, modus: "compound_monthly" as const },
      saison: { faktoren: doppelt },
      monatsOverride: [{ monat: "2026-05", wertCents: 5_000 }],
    };
    expect(monatsbetragCents(vorgabe, "2026-05", "2026-04")).toBe(5_000);
    expect(monatsbetragCents(vorgabe, "2026-04", "2026-04")).toBe(200_000);
  });

  it("rundet Menge mal Preis erst am Produkt", () => {
    const menge = mengeImMonat(
      { basis: 2.5, wachstum: { jahresrate: 0, modus: "compound_monthly" } },
      "2026-04",
      "2026-04",
    );
    expect(menge).toBe(2.5);
    expect(menge * 10_000).toBe(25_000);
  });
});
