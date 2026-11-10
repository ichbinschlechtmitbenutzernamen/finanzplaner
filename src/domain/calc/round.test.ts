import { describe, expect, it } from "vitest";
import { annuitaetCents, roundCents, roundRate, verteilteRaten, zinsMonatCents } from "./round.ts";

describe("Rundung auf Cent", () => {
  it("rundet kaufmännisch und bei 0,5 von null weg", () => {
    expect(roundCents(1.4)).toBe(1);
    expect(roundCents(1.5)).toBe(2);
    expect(roundCents(-1.5)).toBe(-2);
    expect(roundCents(10)).toBe(10);
  });

  it("rechnet Prozente ganzzahlig, auch bei einem halben Cent", () => {
    // 164.450 Cent × 19 % = 31.245,5 Cent → 31.246 Cent.
    expect(roundRate(164_450, 0.19)).toBe(31_246);
    expect(roundRate(100_000, 0.19)).toBe(19_000);
    expect(roundRate(0, 0.19)).toBe(0);
  });

  it("verteilt so, dass die Summe exakt bleibt", () => {
    // 100.000 / 3 = 33.333,333… → 33.333, Rest im letzten Monat 33.334.
    expect(verteilteRaten(100_000, 3)).toEqual({ regulaer: 33_333, letzte: 33_334 });
    expect(33_333 * 2 + 33_334).toBe(100_000);

    // 2.500.000 / 72 = 34.722,222… → 34.722, letzter Monat 34.738.
    const mikro = verteilteRaten(2_500_000, 72);
    expect(mikro).toEqual({ regulaer: 34_722, letzte: 34_738 });
    expect(mikro.regulaer * 71 + mikro.letzte).toBe(2_500_000);

    // 150 / 100 = 1,5. Gerundet 2 Cent mal 99 Monate wäre mehr als die Summe,
    // deshalb wird abgerundet: 1 Cent, letzter Monat 51 Cent.
    expect(verteilteRaten(150, 100)).toEqual({ regulaer: 1, letzte: 51 });
  });

  it("rechnet den Monatszins als Jahreszins durch 12", () => {
    // 25.000,00 Euro × 2,40 % / 12 = 50,00 Euro exakt.
    expect(zinsMonatCents(2_500_000, 0.024)).toBe(5_000);
    // 17.361,16 Euro × 0,002 = 34,72232 Euro → 34,72 Euro.
    expect(zinsMonatCents(1_736_116, 0.024)).toBe(3_472);
    expect(zinsMonatCents(1_200_000, 0)).toBe(0);
  });

  it("rundet die Annuität einmal", () => {
    // 12.000 Euro, 6 % p.a., 12 Monate.
    // r = 0,005. Rate = 1.200.000 × 0,005 × 1,005^12 / (1,005^12 − 1)
    // = 103.279,715… Cent → 103.280 Cent.
    expect(annuitaetCents(1_200_000, 0.06, 12)).toBe(103_280);
    expect(annuitaetCents(10_000, 0, 3)).toBe(3_333);
  });
});
