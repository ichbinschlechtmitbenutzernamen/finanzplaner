import { describe, expect, it } from "vitest";
import type { Darlehen } from "../types.ts";
import { kreditplan, summeTilgung } from "./darlehen.ts";

function kredit(
  teil: Partial<Darlehen> &
    Pick<Darlehen, "betragCents" | "laufzeitMonate" | "tilgungsart" | "nominalzinsPa">,
): Darlehen {
  return {
    id: "darlehen-test",
    bezeichnung: "Testdarlehen",
    geber: "Bank",
    art: "bank",
    auszahlungen: [{ monat: "2026-01", betragCents: teil.betragCents }],
    tilgungsfreieMonate: 0,
    zinszahlungInTilgungsfreierZeit: true,
    ...teil,
  };
}

describe("Kreditplan", () => {
  it("rechnet die Annuität Monat für Monat und gleicht im letzten Monat aus", () => {
    // 12.000,00 Euro, 6 % p.a., 12 Raten, Auszahlung Januar, erste Rate Februar.
    // Annuität 103.279,715… Cent, gerundet 103.280 Cent.
    // Monat 1: Zins 1.200.000 × 0,005 = 6.000, Tilgung 103.280 − 6.000 = 97.280.
    // Die weiteren Monate stehen unten. Der letzte Zins ist 514 Cent auf 102.764 Cent Rest,
    // die Rate wird 103.278 Cent, damit die Schuld auf null fällt.
    const plan = kreditplan(
      kredit({
        betragCents: 1_200_000,
        nominalzinsPa: 0.06,
        laufzeitMonate: 12,
        tilgungsart: "annuitaet",
      }),
    );
    const raten = plan
      .slice(1)
      .map((zeile) => [zeile.zinsCents, zeile.tilgungCents, zeile.restschuldCents]);
    expect(plan[0]).toMatchObject({
      monat: "2026-01",
      auszahlungCents: 1_200_000,
      zinsCents: 0,
      tilgungCents: 0,
      restschuldCents: 1_200_000,
    });
    expect(raten).toEqual([
      [6_000, 97_280, 1_102_720],
      [5_514, 97_766, 1_004_954],
      [5_025, 98_255, 906_699],
      [4_533, 98_747, 807_952],
      [4_040, 99_240, 708_712],
      [3_544, 99_736, 608_976],
      [3_045, 100_235, 508_741],
      [2_544, 100_736, 408_005],
      [2_040, 101_240, 306_765],
      [1_534, 101_746, 205_019],
      [1_025, 102_255, 102_764],
      [514, 102_764, 0],
    ]);
    expect(plan[12]?.rateCents).toBe(103_278);
    expect(summeTilgung(plan)).toBe(1_200_000);
  });

  it("rechnet das Thüringer Mikrodarlehen als Ratentilgung mit einem Jahr ohne Tilgung", () => {
    // 25.000,00 Euro, 2,40 % p.a., 84 Monate, 12 Monate tilgungsfrei, Zins wird gezahlt.
    // Auszahlung Juni, erste Rate Juli. Zins in der Freizeit: 2.500.000 × 0,024 / 12 = 5.000 Cent.
    // Tilgungsmonate 72. 2.500.000 / 72 = 34.722,222… → 34.722 Cent, letzter Monat 34.738 Cent.
    // Erste Tilgung: Zins weiter 5.000, Rest 2.500.000 − 34.722 = 2.465.278.
    // Zweite Tilgung: 2.465.278 × 0,002 = 4.930,556 → 4.931 Cent Zins, Rest 2.430.556.
    const plan = kreditplan(
      kredit({
        betragCents: 2_500_000,
        auszahlungen: [{ monat: "2026-06", betragCents: 2_500_000 }],
        nominalzinsPa: 0.024,
        laufzeitMonate: 84,
        tilgungsfreieMonate: 12,
        tilgungsart: "ratentilgung",
        zinszahlungInTilgungsfreierZeit: true,
      }),
    );
    expect(plan[0]).toMatchObject({ monat: "2026-06", zinsCents: 0, restschuldCents: 2_500_000 });
    expect(plan[1]).toMatchObject({
      monat: "2026-07",
      zinsCents: 5_000,
      tilgungCents: 0,
      restschuldCents: 2_500_000,
    });
    expect(plan[12]).toMatchObject({ monat: "2027-06", zinsCents: 5_000, tilgungCents: 0 });
    expect(plan[13]).toMatchObject({
      monat: "2027-07",
      zinsCents: 5_000,
      tilgungCents: 34_722,
      restschuldCents: 2_465_278,
    });
    expect(plan[14]).toMatchObject({
      zinsCents: 4_931,
      tilgungCents: 34_722,
      restschuldCents: 2_430_556,
    });
    expect(plan[84]?.restschuldCents).toBe(0);
    expect(plan[84]?.tilgungCents).toBe(34_738);
    expect(summeTilgung(plan)).toBe(2_500_000);
    expect(plan.slice(1, 13).reduce((total, zeile) => total + zeile.zinsCents, 0)).toBe(60_000);
  });

  it("erlässt Zinsen in der tilgungsfreien Zeit, ohne sie auf die Schuld zu schreiben", () => {
    const plan = kreditplan(
      kredit({
        betragCents: 100_000,
        nominalzinsPa: 0.12,
        laufzeitMonate: 4,
        tilgungsfreieMonate: 2,
        zinszahlungInTilgungsfreierZeit: false,
        tilgungsart: "endfaellig",
      }),
    );
    // 12 % / 12 = 1 %. 100.000 Cent bringen 1.000 Cent Zins, sobald die Freizeit vorbei ist.
    expect(
      plan.slice(1).map((zeile) => [zeile.zinsCents, zeile.tilgungCents, zeile.restschuldCents]),
    ).toEqual([
      [0, 0, 100_000],
      [0, 0, 100_000],
      [1_000, 0, 100_000],
      [1_000, 100_000, 0],
    ]);
  });

  it("verzinst eine zweite Tranche erst ab dem Folgemonat", () => {
    // Nominal 1.500 Euro, 12 % p.a., drei gleiche Tilgungen à 500 Euro.
    // Januar 1.000 Euro, März noch 500 Euro. Erste Rate Februar.
    // Februar: Zins 10,00 Euro auf 1.000 Euro, Tilgung 500 Euro, Rest 500 Euro.
    // März: Zins 5,00 Euro auf 500 Euro, dann kommen 500 Euro dazu, Tilgung 500 Euro, Rest 500 Euro.
    // April trägt den Zins auf die 500 Euro und tilgt sie.
    const plan = kreditplan(
      kredit({
        betragCents: 150_000,
        auszahlungen: [
          { monat: "2026-01", betragCents: 100_000 },
          { monat: "2026-03", betragCents: 50_000 },
        ],
        nominalzinsPa: 0.12,
        laufzeitMonate: 3,
        tilgungsart: "ratentilgung",
      }),
    );
    expect(
      plan.map((zeile) => [
        zeile.zinsCents,
        zeile.tilgungCents,
        zeile.restschuldCents,
        zeile.schuldZugangCents,
      ]),
    ).toEqual([
      [0, 0, 100_000, 100_000],
      [1_000, 50_000, 50_000, 0],
      [500, 50_000, 50_000, 50_000],
      [500, 50_000, 0, 0],
    ]);
  });

  it("zieht Disagio und Gebühren im Auszahlungsmonat vom Zufluss ab und bucht sie als Aufwand", () => {
    // 1.000 Euro nominal, Auszahlung 95 %, Gebühr 10 Euro, Disagio 5 Euro.
    // Zufluss 950 − 10 − 5 = 935 Euro. Aufwand 50 + 10 + 5 = 65 Euro. Schuld bleibt 1.000 Euro.
    const plan = kreditplan(
      kredit({
        betragCents: 100_000,
        nominalzinsPa: 0,
        laufzeitMonate: 2,
        tilgungsart: "ratentilgung",
        auszahlungAnteil: 0.95,
        gebuehrenCents: 1_000,
        disagioCents: 500,
      }),
    );
    expect(plan[0]).toMatchObject({
      auszahlungCents: 93_500,
      schuldZugangCents: 100_000,
      finanzierungsaufwandCents: 6_500,
      restschuldCents: 100_000,
    });
    expect(plan[2]?.restschuldCents).toBe(0);
  });
});
