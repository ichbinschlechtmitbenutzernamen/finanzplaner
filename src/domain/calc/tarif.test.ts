import { describe, expect, it } from "vitest";
import { PARAMETER_DE_2026 } from "../parameter.ts";
import { einkommensteuerCents, kirchensteuerCents, solidaritaetszuschlagCents } from "./tarif.ts";

const parameter = PARAMETER_DE_2026.steuer;

describe("Einkommensteuer § 32a EStG 2026", () => {
  it("lässt den Grundfreibetrag steuerfrei und beginnt einen Euro darüber bei 0", () => {
    // 12.348 Euro: Zone 1, Steuer 0.
    expect(steuer(12_348)).toBe(0);
    // 12.355 Euro: y = 7/10.000. (914,51 · y + 1.400) · y = 0,980448…, abgerundet 0.
    expect(steuer(12_355)).toBe(0);
    // 12.356 Euro: y = 8/10.000. (914,51 · 0,0008 + 1.400) · 0,0008 = 1,120585…, abgerundet 1.
    expect(steuer(12_356)).toBe(1_00);
  });

  it("trifft die veröffentlichten Zonengrenzen und den Wert 60.000 Euro", () => {
    // Zone 2 endet bei 17.799, Zone 3 beginnt bei 17.800. Die Abrundung darf höchstens 1 Euro springen.
    expect(Math.abs(steuer(17_799) - steuer(17_800))).toBeLessThanOrEqual(100);
    // 60.000 Euro, Zone 3. z = (60.000 − 17.799) / 10.000 = 4,2201.
    // (173,10 · 4,2201 + 2.397) · 4,2201 + 1.034,87 = 14.233,2308…, abgerundet 14.233.
    // Diesen Betrag nennt auch die Haufe-Darstellung zur Freigrenze 2026.
    expect(steuer(60_000)).toBe(1_423_300);
    // 69.878 Euro, letztes Jahr der Progressionszone:
    // z = 5,2079. (173,10 · 5,2079 + 2.397) · 5,2079 + 1.034,87 = 18.213,0629… → 18.213.
    expect(steuer(69_878)).toBe(1_821_300);
    // 69.879 Euro, erster Euro der 42-Prozent-Zone:
    // 0,42 · 69.879 − 11.135,63 = 18.213,55 → 18.213.
    expect(steuer(69_879)).toBe(1_821_300);
    // 277.825 Euro, letzter Euro der 42-Prozent-Zone:
    // 0,42 · 277.825 − 11.135,63 = 105.550,87 → 105.550.
    expect(steuer(277_825)).toBe(10_555_000);
    // 277.826 Euro, Reichensteuersatz 45 Prozent:
    // 0,45 · 277.826 − 19.470,38 = 105.551,32 → 105.551.
    expect(steuer(277_826)).toBe(10_555_100);
  });

  it("verdoppelt die Steuer auf das abgerundete halbe Einkommen beim Splitting", () => {
    // Hälfte von 60.000 ist 30.000. z = 1,2201.
    // (173,10 · 1,2201 + 2.397) · 1,2201 + 1.034,87 = 4.217,142… → 4.217. Mal 2 = 8.434.
    expect(steuer(30_000)).toBe(421_700);
    expect(steuer(60_000, { splitting: true })).toBe(843_400);
    // 30.001 wird vor dem Halbieren auf 15.000 abgerundet, nicht auf 15.000,50.
    expect(steuer(30_001, { splitting: true })).toBe(steuer(15_000) * 2);
  });

  it("wendet den Progressionsvorbehalt als besonderen Satz auf das zu versteuernde Einkommen an", () => {
    // Steuer auf 40.000: z = 2,2201.
    // (173,10 · 2,2201 + 2.397) · 2,2201 + 1.034,87 = 7.209,632… → 7.209.
    expect(steuer(40_000)).toBe(720_900);
    // floor(7.209 · 30.000 / 40.000) = floor(5.406,75) = 5.406.
    expect(steuer(30_000, { progression: 10_000 })).toBe(540_600);
    expect(steuer(0, { progression: 20_000 })).toBe(0);
  });
});

describe("Solidaritätszuschlag", () => {
  it("bleibt unter der Freigrenze null und mildert direkt darüber", () => {
    expect(soli(2_035_000)).toBe(0);
    // 20.351 Euro Steuer. 11,9 Prozent von 1 Euro = 0,119 Euro, Bruchteil eines Cents weg → 0,11 Euro.
    // 5,5 Prozent wären 1.119,30 Euro. Es gilt der kleinere Betrag.
    expect(soli(2_035_100)).toBe(11);
  });

  it("rechnet das Haufe-Beispiel 25.293 Euro in der Gleitzone", () => {
    // Unterschied 4.943 Euro. 11,9 Prozent = 588,217 Euro → 588,21 Euro.
    // 5,5 Prozent von 25.293 = 1.391,115 Euro → 1.391,11 Euro. Minimum 588,21 Euro.
    expect(soli(2_529_300)).toBe(58_821);
  });

  it("wechselt bei 37.839 Euro auf den vollen Satz", () => {
    // 37.838: 11,9 Prozent des Unterschieds 2.081,07 Euro, 5,5 Prozent 2.081,09 Euro.
    expect(soli(3_783_800)).toBe(208_107);
    // 37.839: 5,5 Prozent 2.081,145 Euro → 2.081,14 Euro, die Milderung liegt darüber.
    expect(soli(3_783_900)).toBe(208_114);
    expect(soli(3_783_900)).toBe(anteil(3_783_900, 55));
  });

  it("verdoppelt die Freigrenze beim Splitting und kennt bei der Körperschaftsteuer keine Freigrenze", () => {
    expect(soli(2_035_100, { splitting: true })).toBe(0);
    expect(soli(4_070_000, { splitting: true })).toBe(0);
    // 1.500 Euro Körperschaftsteuer · 5,5 Prozent = 82,50 Euro, auch unter der Einkommensteuer-Freigrenze.
    expect(soli(150_000, { ohneFreigrenze: true })).toBe(8_250);
  });
});

describe("Kirchensteuer", () => {
  it("nimmt 8 Prozent in Bayern und Baden-Württemberg und 9 Prozent sonst", () => {
    expect(kirchensteuerCents(1_000_000, 0.09)).toBe(90_000);
    expect(kirchensteuerCents(1_000_000, 0.08)).toBe(80_000);
    // 9 Prozent von 10.001 Euro = 900,09 Euro.
    expect(kirchensteuerCents(1_000_100, 0.09)).toBe(90_009);
    expect(kirchensteuerCents(1_000_000, 0)).toBe(0);
  });
});

function steuer(
  zvEEuro: number,
  optionen: { splitting?: boolean; progression?: number } = {},
): number {
  return einkommensteuerCents({
    zvEEuro,
    splitting: optionen.splitting ?? false,
    progressionsvorbehaltEuro: optionen.progression ?? 0,
    parameter,
  }).tariflicheEinkommensteuerCents;
}

function soli(
  cents: number,
  optionen: { splitting?: boolean; ohneFreigrenze?: boolean } = {},
): number {
  return solidaritaetszuschlagCents(cents, parameter, optionen);
}

function anteil(cents: number, millis: number): number {
  return Number((BigInt(cents) * BigInt(millis)) / 1000n);
}
