import { describe, expect, it } from "vitest";
import { monatsbetragCents } from "../calc/monatswert.ts";
import { createEmptyFinanzplan } from "../empty-plan.ts";
import { finanzplanSchema } from "../schema.ts";
import { addMonths } from "../months.ts";
import type { MonatFaktoren, MonatswertVorgabe } from "../types.ts";
import {
  EingabeFehler,
  fortschreibenMonatswert,
  saisonMonatswert,
  setzeMonatswert,
  wachstumMonatswert,
} from "./hilfe.ts";
import { fortschreibenSerie, setzeSerieZelle } from "./plan-aendern.ts";

const start = "2026-04";
const monate = Array.from({ length: 36 }, (_, index) => addMonths(start, index));
const alle = monate.map(() => true);
const mai: MonatFaktoren = [1, 1, 1, 1, 1.1, 1, 1, 1, 1, 1, 1, 1];
const aprilDoppelt: MonatFaktoren = [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1];

function wert(vorgabe: MonatswertVorgabe, index: number): number {
  return monatsbetragCents(vorgabe, monate[index] ?? start, start);
}

describe("Eingabehilfen", () => {
  it("schreibt den sichtbaren Wert nach rechts und lässt davor liegende Monate stehen", () => {
    const vorgabe: MonatswertVorgabe = {
      basisCents: 80_000,
      monatsOverride: [{ monat: "2026-04", wertCents: 10_000 }],
    };
    const nach = fortschreibenMonatswert(vorgabe, start, monate, 1, alle);
    expect(wert(nach, 0)).toBe(10_000);
    expect(wert(nach, 1)).toBe(80_000);
    expect(wert(nach, 35)).toBe(80_000);
    expect(nach.monatsOverride).toHaveLength(36);
  });

  it("lässt Monate aus, die für die Zeile nicht eingebbar sind", () => {
    const erlaubt = monate.map((_, index) => index !== 4);
    const nach = fortschreibenMonatswert({ basisCents: 50_000 }, start, monate, 2, erlaubt);
    expect(nach.monatsOverride?.some((punkt) => punkt.monat === "2026-08")).toBe(false);
    expect(wert(nach, 3)).toBe(50_000);
    expect(wert(nach, 4)).toBe(50_000);
    expect(() =>
      fortschreibenMonatswert({ basisCents: 50_000 }, start, monate, 4, erlaubt),
    ).toThrow(EingabeFehler);
  });

  it("verzinst ab dem gewählten Monat monatlich und merkt sich die Eingabe", () => {
    const nach = wachstumMonatswert({ basisCents: 100_000 }, start, monate, 0, 0.02, "monat", alle);
    expect(wert(nach, 0)).toBe(100_000);
    expect(wert(nach, 1)).toBe(102_000);
    expect(wert(nach, 12)).toBe(Math.round(100_000 * 1.02 ** 12));
    expect(nach.wachstum).toMatchObject({
      modus: "compound_monthly",
      eingabe: { rate: 0.02, bezug: "monat" },
    });
    expect(nach.monatsOverride).toBeUndefined();
  });

  it("lässt eine Jahresrate zwölf Monate konstant und friert die Monate davor ein", () => {
    const nach = wachstumMonatswert(
      { basisCents: 100_000, saison: { faktoren: mai } },
      start,
      monate,
      1,
      0.1,
      "jahr",
      alle,
    );
    expect(wert(nach, 0)).toBe(100_000);
    expect(wert(nach, 1)).toBe(110_000);
    expect(wert(nach, 12)).toBe(110_000);
    expect(wert(nach, 13)).toBe(121_000);
    expect(nach.saison).toBeUndefined();
    expect(nach.wachstum?.eingabe).toEqual({ rate: 0.1, bezug: "jahr" });
    expect(nach.monatsOverride).toEqual([{ monat: "2026-04", wertCents: 100_000 }]);
  });

  it("setzt Saisonfaktoren und entfernt Überschreibungen", () => {
    const nach = saisonMonatswert(
      { basisCents: 100_000, monatsOverride: [{ monat: "2026-06", wertCents: 50_000 }] },
      aprilDoppelt,
    );
    expect(nach.monatsOverride).toBeUndefined();
    expect(wert(nach, 0)).toBe(200_000);
    expect(wert(nach, 2)).toBe(100_000);
  });

  it("nimmt eine Überschreibung zurück", () => {
    const mit = setzeMonatswert({ basisCents: 40_000 }, "2026-06", 12_000);
    expect(wert(mit, 2)).toBe(12_000);
    const ohne = setzeMonatswert(mit, "2026-06", null);
    expect(ohne.monatsOverride).toBeUndefined();
    expect(wert(ohne, 2)).toBe(40_000);
  });

  it("lehnt negative Werte und zu hohe Raten ab", () => {
    expect(() => setzeMonatswert({ basisCents: 1 }, "2026-04", -1)).toThrow(EingabeFehler);
    expect(() =>
      wachstumMonatswert({ basisCents: 1 }, start, monate, 0, 0.5, "monat", alle),
    ).toThrow(EingabeFehler);
  });
});

describe("Änderung im Plan", () => {
  it("schreibt eine Umsatzzeile und bleibt schemagültig", () => {
    const plan = createEmptyFinanzplan({
      id: "plan-eingabe",
      now: new Date("2026-04-01T00:00:00.000Z"),
      startMonat: start,
    });
    plan.umsatzplanung.push({
      id: "rev-beratung",
      bezeichnung: "Beratung",
      art: "monatsumsatz",
      monatsumsatz: { basisCents: 100_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    });
    const nach = setzeSerieZelle(plan, { art: "umsatz", id: "rev-beratung" }, "2026-05", 150_000);
    const fort = fortschreibenSerie(nach, { art: "umsatz", id: "rev-beratung" }, monate, 1, alle);
    expect(finanzplanSchema.parse(fort)).toBeTruthy();
    const vorgabe = fort.umsatzplanung[0];
    expect(vorgabe?.art).toBe("monatsumsatz");
    if (vorgabe?.art === "monatsumsatz") {
      expect(monatsbetragCents(vorgabe.monatsumsatz, "2026-04", start)).toBe(100_000);
      expect(monatsbetragCents(vorgabe.monatsumsatz, "2026-08", start)).toBe(150_000);
    }
  });
});
