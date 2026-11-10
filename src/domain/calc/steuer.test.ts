import { describe, expect, it } from "vitest";
import { createEmptyFinanzplan } from "../empty-plan.ts";
import type { Finanzplan, Person } from "../types.ts";
import { berechnePlan } from "./berechnen.ts";
import {
  anrechnung35,
  gewerbesteuer,
  kirchensteuerSatz,
  ruecklageJeMonat,
  viertel,
  STEUERRUECKLAGE_HINWEIS,
} from "./steuer.ts";
import { PARAMETER_DE_2026 } from "../parameter.ts";

const FIXED = new Date("2026-01-15T00:00:00.000Z");

describe("Gewerbesteuer § 11 GewStG", () => {
  const parameter = PARAMETER_DE_2026.steuer;

  it("rundet auf volle 100 Euro ab, kürzt den Freibetrag und rundet den Messbetrag ab", () => {
    // 50.050,99 Euro → 50.000 Euro. Abzüglich 24.500 Euro bleiben 25.500 Euro.
    // 3,5 Prozent = 892,50 Euro, abgerundet 892 Euro. Hebesatz 460 Prozent: 892 · 4,6 = 4.103,20 → 4.103 Euro.
    const steuer = gewerbesteuer(
      5_005_099,
      parameter,
      460,
      parameter.gewerbesteuerFreibetragPersonenCents,
    );
    expect(steuer.abgerundetCents).toBe(5_000_000);
    expect(steuer.massgebendCents).toBe(2_550_000);
    expect(steuer.messbetragCents).toBe(89_200);
    expect(steuer.gewerbesteuerCents).toBe(410_300);
  });

  it("lässt einen Ertrag am Freibetrag und knapp darunter bei null", () => {
    const genau = gewerbesteuer(2_450_000, parameter, 400, 2_450_000);
    expect(genau.messbetragCents).toBe(0);
    expect(genau.gewerbesteuerCents).toBe(0);
    // 24.599,99 Euro werden 24.500 Euro. Der Freibetrag zehrt sie auf.
    const knapp = gewerbesteuer(2_459_999, parameter, 400, 2_450_000);
    expect(knapp.abgerundetCents).toBe(2_450_000);
    expect(knapp.gewerbesteuerCents).toBe(0);
    // 24.600 Euro → 100 Euro maßgebend. 3,50 Euro Messbetrag → 3 Euro. Bei 400 Prozent sind das 12 Euro.
    const darüber = gewerbesteuer(2_460_000, parameter, 400, 2_450_000);
    expect(darüber.messbetragCents).toBe(300);
    expect(darüber.gewerbesteuerCents).toBe(1_200);
  });

  it("kennt bei Kapitalgesellschaften keinen Freibetrag und keine Steuer auf einen Verlust", () => {
    const gmbh = gewerbesteuer(10_000_000, parameter, 400, 0);
    // 100.000 · 3,5 Prozent = 3.500 Euro. Hebesatz 400 Prozent → 14.000 Euro.
    expect(gmbh.freibetragCents).toBe(0);
    expect(gmbh.messbetragCents).toBe(350_000);
    expect(gmbh.gewerbesteuerCents).toBe(1_400_000);
    const verlust = gewerbesteuer(-500_000, parameter, 400, 2_450_000);
    expect(verlust.gewerbeertragCents).toBe(-500_000);
    expect(verlust.gewerbesteuerCents).toBe(0);
  });
});

describe("Anrechnung § 35 EStG", () => {
  it("nimmt das Minimum aus Vierfachem, Gewerbesteuer, Höchstbetrag und Einkommensteuer", () => {
    // 4 · 192 Euro = 768 Euro, Gewerbesteuer 883 Euro, Höchstbetrag 4.217 Euro.
    const normal = anrechnung35(421_700, 19_200, 88_300, 30_000, 30_000, 4);
    expect(normal.vierfachCents).toBe(76_800);
    expect(normal.hoechstbetragCents).toBe(421_700);
    expect(normal.anrechnungCents).toBe(76_800);

    // Einkommensteuer 7.209 Euro auf 40.000 Euro zu versteuerndes Einkommen.
    // Messbetrag 1.942 Euro, Vierfaches 7.768 Euro, also bindet der Höchstbetrag.
    // floor(7.209 · 80.000 / 80.000) = 7.209.
    const hoechst = anrechnung35(720_900, 194_200, 776_800, 80_000, 80_000, 4);
    expect(hoechst.anrechnungCents).toBe(720_900);

    // Andere positive Einkünfte halbieren den Höchstbetrag: floor(14.233 · 30.000 / 60.000) = 7.116.
    const anteilig = anrechnung35(1_423_300, 19_200, 88_300, 30_000, 60_000, 4);
    expect(anteilig.hoechstbetragCents).toBe(711_600);
    expect(anteilig.anrechnungCents).toBe(76_800);
  });
});

describe("Steuer eines Plans", () => {
  it("rechnet Einzelunternehmen mit Abrundung, Anrechnung, Kirchensteuer und ohne Gewerbesteuer als Aufwand", () => {
    const plan = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 3_000_000 }],
      hebesatz: 460,
      bundesland: "Berlin",
      kirchensteuer: true,
    });
    const ergebnis = berechnePlan(plan);
    const jahr = ergebnis.steuern.jahre[0];
    const person = jahr?.personen[0];
    // Gewinn 30.000 Euro. Tarif nach der Handrechnung oben: 4.217 Euro.
    // Gewerbeertrag 30.000, maßgebend 5.500, Messbetrag 192 Euro, Gewerbesteuer floor(192 · 4,6) = 883 Euro.
    // Anrechnung min(768, 883, 4.217) = 768. Festgesetzt 3.449 Euro.
    // Soli 0, weil 3.449 unter 20.350 liegt. Kirchensteuer 9 Prozent = 310,41 Euro.
    expect(jahr?.gewinnCents).toBe(3_000_000);
    expect(jahr?.rumpf).toBe(false);
    expect(person?.tariflicheEinkommensteuerCents).toBe(421_700);
    expect(person?.anrechnungCents).toBe(76_800);
    expect(person?.einkommensteuerCents).toBe(344_900);
    expect(person?.solidaritaetszuschlagCents).toBe(0);
    expect(person?.kirchensteuerCents).toBe(31_041);
    expect(jahr?.messbetragCents).toBe(19_200);
    expect(jahr?.gewerbesteuerCents).toBe(88_300);
    expect(jahr?.steuerLastCents).toBe(344_900 + 31_041 + 88_300);
    expect(ergebnis.uebersicht.betriebsergebnisCents[5]).toBe(3_000_000);

    const ohneHebesatz = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 3_000_000 }],
      hebesatz: 200,
    });
    expect(berechnePlan(ohneHebesatz).uebersicht.betriebsergebnisCents[5]).toBe(3_000_000);
  });

  it("lässt Freiberufler ohne Gewerbesteuer und ohne Anrechnung", () => {
    const plan = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 3_000_000 }],
      rechtsform: "freiberufler",
    });
    const jahr = berechnePlan(plan).steuern.jahre[0];
    expect(jahr?.gewerbesteuerCents).toBe(0);
    expect(jahr?.messbetragCents).toBe(0);
    expect(jahr?.personen[0]?.tariflicheEinkommensteuerCents).toBe(421_700);
    expect(jahr?.personen[0]?.anrechnungCents).toBe(0);
    expect(jahr?.personen[0]?.einkommensteuerCents).toBe(421_700);
  });

  it("begrenzt die Anrechnung auf den Höchstbetrag, wenn andere Einkünfte den Tarif drücken", () => {
    const plan = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 8_000_000 }],
      hebesatz: 400,
      weitereEinkuenfteJahrCents: -4_000_000,
    });
    const jahr = berechnePlan(plan).steuern.jahre[0];
    const person = jahr?.personen[0];
    // Gewinn 80.000, weitere Einkünfte −40.000, zu versteuerndes Einkommen 40.000, Steuer 7.209 Euro.
    // Negative weitere Einkünfte stehen nicht im Nenner. Quote 80.000/80.000, Höchstbetrag 7.209.
    // Messbetrag floor(55.500 · 0,035) = floor(1.942,50) = 1.942. Vierfaches 7.768, Gewerbesteuer bei 400 Prozent ebenfalls.
    // Anrechnung 7.209, festgesetzte Einkommensteuer 0.
    expect(person?.zvEEuro).toBe(40_000);
    expect(person?.positiveEinkuenfteEuro).toBe(80_000);
    expect(jahr?.messbetragCents).toBe(194_200);
    expect(person?.ermaessigungshoechstbetragCents).toBe(720_900);
    expect(person?.anrechnungVierfachCents).toBe(776_800);
    expect(person?.anrechnungCents).toBe(720_900);
    expect(person?.einkommensteuerCents).toBe(0);
  });

  it("verteilt Messbetrag und Steuer einer GbR nach ungleichen Anteilen", () => {
    const plan = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 10_000_000 }],
      rechtsform: "gbr",
      hebesatz: 400,
      bundesland: "Bayern",
      personen: [
        person("person-a", "Ayla Beispiel", 0.6, false),
        person("person-b", "Bela Beispiel", 0.4, true),
      ],
    });
    const jahr = berechnePlan(plan).steuern.jahre[0];
    // 100.000 − 24.500 = 75.500. Messbetrag floor(2.642,50) = 2.642 Euro. Gewerbesteuer bei 400 Prozent = 10.568 Euro.
    expect(jahr?.messbetragCents).toBe(264_200);
    expect(jahr?.gewerbesteuerCents).toBe(1_056_800);
    const ayla = jahr?.personen[0];
    const bela = jahr?.personen[1];
    // 60 Prozent von 2.642, abgerundet 1.585, Rest 1.057. Gewerbesteuer 6.340 und 4.228.
    expect(ayla?.gewinnanteilCents).toBe(6_000_000);
    expect(bela?.gewinnanteilCents).toBe(4_000_000);
    expect(ayla?.messbetragAnteilCents).toBe(158_500);
    expect(bela?.messbetragAnteilCents).toBe(105_700);
    expect(ayla?.gewerbesteuerAnteilCents).toBe(634_000);
    expect(bela?.gewerbesteuerAnteilCents).toBe(422_800);
    // Ayla: Einkommen 60.000, Steuer 14.233, Anrechnung min(6.340, 6.340, 14.233) = 6.340, festgesetzt 7.893.
    expect(ayla?.tariflicheEinkommensteuerCents).toBe(1_423_300);
    expect(ayla?.anrechnungCents).toBe(634_000);
    expect(ayla?.einkommensteuerCents).toBe(789_300);
    expect(ayla?.kirchensteuerCents).toBe(0);
    // Bela: Einkommen 40.000, Steuer 7.209, Anrechnung 4.228, festgesetzt 2.981. Kirchensteuer Bayern 8 Prozent = 238,48 Euro.
    expect(bela?.tariflicheEinkommensteuerCents).toBe(720_900);
    expect(bela?.anrechnungCents).toBe(422_800);
    expect(bela?.einkommensteuerCents).toBe(298_100);
    expect(bela?.kirchensteuerSatz).toBe(0.08);
    expect(bela?.kirchensteuerCents).toBe(23_848);
    expect(
      kirchensteuerSatz(
        bela ? { kirchensteuer: true, splitting: false } : undefined,
        "Bayern",
        PARAMETER_DE_2026.steuer,
      ),
    ).toBe(0.08);
  });

  it("besteuert GmbH und UG mit Körperschaftsteuer, Soli ohne Freigrenze und Gewerbesteuer ohne Freibetrag", () => {
    for (const rechtsform of ["gmbh", "ug"] as const) {
      const plan = planMitUmsatz({
        umsatz: [{ monat: "2026-06", cents: 1_000_000 }],
        rechtsform,
        hebesatz: 400,
        gehaltCents: 400_000,
      });
      const ergebnis = berechnePlan(plan);
      const jahr = ergebnis.steuern.jahre[0];
      // Umsatz 10.000, Gehalt 4.000, Gewinn 6.000. Körperschaftsteuer 15 Prozent = 900 Euro.
      // Soli 5,5 Prozent = 49,50 Euro, trotz der Freigrenze der Einkommensteuer.
      // Gewerbeertrag 6.000, kein Freibetrag, Messbetrag 210 Euro, Gewerbesteuer bei 400 Prozent = 840 Euro.
      expect(ergebnis.uebersicht.betriebsergebnisCents[5]).toBe(600_000);
      expect(jahr?.personen).toEqual([]);
      expect(jahr?.koerperschaftsteuerCents).toBe(90_000);
      expect(jahr?.koerperschaftsteuerSoliCents).toBe(4_950);
      expect(jahr?.freibetragCents).toBe(0);
      expect(jahr?.messbetragCents).toBe(21_000);
      expect(jahr?.gewerbesteuerCents).toBe(84_000);
      expect(jahr?.einkommensteuerCents).toBe(0);
    }
  });

  it("zahlt das erste Jahr im September des Folgejahres und die Folgejahre vierteljährlich", () => {
    const nurErstesJahr = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 3_000_000 }],
      hebesatz: 460,
    });
    const erstes = berechnePlan(nurErstesJahr);
    const jahr = erstes.steuern.jahre[0];
    // Steuer 3.449 + 883 = 4.332 Euro. 4.332 / 12 = 361 Euro, ohne Rest.
    expect(jahr?.steuerLastCents).toBe(433_200);
    expect(erstes.steuern.monate[0]?.ruecklageCents).toBe(36_100);
    expect(erstes.steuern.monate[5]?.ruecklageCents).toBe(36_100);
    expect(erstes.steuern.monate[11]?.ruecklageKumuliertCents).toBe(433_200);
    expect(erstes.uebersicht.steuerRuecklageCents[0]).toBe(36_100);
    expect(erstes.uebersicht.zahlungssaldoCents[0]).toBe(erstes.uebersicht.einlagenCents[0]);
    // Im ersten Jahr selbst keine Steuerzahlung. September 2027 trägt die ganze Steuer des Jahres 2026.
    expect(summeZahlungen(erstes, 0, 11)).toBe(0);
    const september = erstes.steuern.monate[20];
    expect(september?.monat).toBe("2027-09");
    expect(september?.einkommensteuerAbschlussCents).toBe(344_900);
    expect(september?.gewerbesteuerAbschlussCents).toBe(88_300);
    expect(september?.einkommensteuerVorauszahlungCents).toBe(0);
    expect(erstes.uebersicht.steuerEinkommenZahlungCents[20]).toBe(344_900);
    expect(erstes.uebersicht.steuerGewerbeZahlungCents[20]).toBe(88_300);
    expect(
      erstes.steuern.hinweise.some((hinweis) => hinweis.message === STEUERRUECKLAGE_HINWEIS),
    ).toBe(true);

    const zweitesJahr = planMitUmsatz({
      umsatz: [{ monat: "2027-06", cents: 3_000_000 }],
      hebesatz: 460,
    });
    const folge = berechnePlan(zweitesJahr);
    // 3.449 Euro : 862 + 862 + 862 + 863. 883 Euro : 220 + 220 + 220 + 223.
    expect(viertel(344_900)).toEqual([86_200, 86_200, 86_200, 86_300]);
    expect(viertel(88_300)).toEqual([22_000, 22_000, 22_000, 22_300]);
    // 17.660,70 Euro: die 70 Cent bleiben auf dem letzten Termin, die Summe bleibt erhalten.
    expect(viertel(1_766_070)).toEqual([441_500, 441_500, 441_500, 441_570]);
    expect(zahlung(folge, "2027-03").einkommensteuerVorauszahlungCents).toBe(86_200);
    expect(zahlung(folge, "2027-06").einkommensteuerVorauszahlungCents).toBe(86_200);
    expect(zahlung(folge, "2027-09").einkommensteuerVorauszahlungCents).toBe(86_200);
    expect(zahlung(folge, "2027-12").einkommensteuerVorauszahlungCents).toBe(86_300);
    expect(zahlung(folge, "2027-02").gewerbesteuerVorauszahlungCents).toBe(22_000);
    expect(zahlung(folge, "2027-05").gewerbesteuerVorauszahlungCents).toBe(22_000);
    expect(zahlung(folge, "2027-08").gewerbesteuerVorauszahlungCents).toBe(22_000);
    expect(zahlung(folge, "2027-11").gewerbesteuerVorauszahlungCents).toBe(22_300);
    expect(zahlung(folge, "2027-09").einkommensteuerAbschlussCents).toBe(0);
    const jahr2027 = folge.steuern.jahre[1];
    expect(jahr2027?.einkommensteuerOffenCents).toBe(0);
    expect(jahr2027?.gewerbesteuerOffenCents).toBe(0);
    expect(jahr2027?.einkommensteuerGezahltCents).toBe(344_900);
  });

  it("lässt Termine nach dem Horizont offen und rechnet ein Rumpfjahr nicht hoch", () => {
    const plan = planMitUmsatz({
      startMonat: "2026-11",
      umsatz: [{ monat: "2029-01", cents: 3_000_000 }],
      hebesatz: 460,
    });
    const ergebnis = berechnePlan(plan);
    const letztes = ergebnis.steuern.jahre.at(-1);
    expect(letztes?.jahr).toBe(2029);
    expect(letztes?.rumpf).toBe(true);
    expect(letztes?.monateImPlan).toBeLessThan(12);
    expect(letztes?.gewinnCents).toBe(3_000_000);
    // Start November 2026, letzter Monat Oktober 2029.
    // Einkommensteuer: März, Juni und September liegen drin, der Dezember mit dem Rest 863 Euro nicht.
    // Gewerbesteuer: Februar, Mai und August liegen drin, der November mit dem Rest 223 Euro nicht.
    expect(zahlung(ergebnis, "2029-02").gewerbesteuerVorauszahlungCents).toBe(22_000);
    expect(zahlung(ergebnis, "2029-08").gewerbesteuerVorauszahlungCents).toBe(22_000);
    expect(zahlung(ergebnis, "2029-03").einkommensteuerVorauszahlungCents).toBe(86_200);
    expect(zahlung(ergebnis, "2029-09").einkommensteuerVorauszahlungCents).toBe(86_200);
    expect(letztes?.einkommensteuerOffenCents).toBe(86_300);
    expect(letztes?.gewerbesteuerOffenCents).toBe(22_300);
    expect(ergebnis.steuern.hinweise.some((hinweis) => hinweis.code === "steuer_rumpfjahr")).toBe(
      true,
    );
    expect(ergebnis.steuern.hinweise.some((hinweis) => hinweis.code === "steuer_offen")).toBe(true);
  });

  it("hält den Gründungszuschuss aus dem Gewinn und im Progressionsvorbehalt", () => {
    const plan = planMitUmsatz({
      umsatz: [{ monat: "2026-06", cents: 3_000_000 }],
      hebesatz: 400,
    });
    plan.finanzierung.zuschuesse.push({
      id: "zuschuss-gz",
      bezeichnung: "Gründungszuschuss",
      steuerfrei: true,
      progressionsvorbehalt: true,
      auszahlung: {
        art: "gruendungszuschuss",
        alg1MonatlichCents: 100_000,
        phase1Monate: 1,
        pauschaleCents: 30_000,
        phase2Geplant: false,
        phase2Monate: 0,
        startMonat: "2026-06",
      },
    });
    const jahr = berechnePlan(plan).steuern.jahre[0];
    expect(jahr?.gewinnCents).toBe(3_000_000);
    expect(jahr?.progressionsvorbehaltCents).toBe(130_000);
    expect(jahr?.personen[0]?.progressionsvorbehaltEuro).toBe(1_300);
    expect(jahr?.personen[0]?.tariflicheEinkommensteuerCents).toBeGreaterThan(421_700);
  });

  it("legt den Rest der Rücklage nur in einem vollen Jahr auf den Dezember", () => {
    const voll = ruecklageJeMonat(120_000, true);
    expect(voll.get(1)).toBe(10_000);
    expect(voll.get(12)).toBe(10_000);
    // 101 Euro / 12 = 8 Euro, Rest 13 Euro im Dezember. Im Rumpfjahr bleibt es beim Zwölftel.
    const mitRest = ruecklageJeMonat(10_100, true);
    expect(mitRest.get(6)).toBe(800);
    expect(mitRest.get(12)).toBe(1_300);
    const rumpf = ruecklageJeMonat(10_100, false);
    expect(rumpf.get(12)).toBe(800);
  });
});

function planMitUmsatz(optionen: {
  umsatz: { monat: string; cents: number }[];
  startMonat?: string;
  rechtsform?: Finanzplan["stammdaten"]["rechtsform"];
  hebesatz?: number;
  bundesland?: Finanzplan["stammdaten"]["bundesland"];
  kirchensteuer?: boolean;
  weitereEinkuenfteJahrCents?: number;
  personen?: Person[];
  gehaltCents?: number;
}): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-steuer",
    now: FIXED,
    startMonat: optionen.startMonat ?? "2026-01",
  });
  plan.stammdaten.rechtsform = optionen.rechtsform ?? "einzelunternehmen";
  plan.stammdaten.bundesland = optionen.bundesland ?? "Berlin";
  plan.stammdaten.gewerbesteuerHebesatz = optionen.hebesatz;
  plan.steuerplanung.abschlusszahlungMonat = 9;
  if (optionen.personen) {
    plan.stammdaten.personen = optionen.personen;
  } else if (optionen.rechtsform === "gmbh" || optionen.rechtsform === "ug") {
    plan.stammdaten.stammkapitalCents = 2_500_000;
    plan.stammdaten.personen = [
      {
        id: "person-gf",
        name: "Gesa Führung",
        rollen: ["gesellschafter", "geschaeftsfuehrer"],
        anteil: 1,
      },
    ];
  } else if (optionen.rechtsform === "freiberufler") {
    plan.stammdaten.personen = [person("person-frei", "Finn Frei", 1, false, "freiberufler")];
    plan.stammdaten.gewerbesteuerHebesatz = undefined;
  } else {
    const inhaber = plan.stammdaten.personen[0];
    if (inhaber) {
      inhaber.steuerprofil = {
        kirchensteuer: optionen.kirchensteuer ?? false,
        splitting: false,
        kinderfreibetraege: 0,
        weitereEinkuenfteJahrCents: optionen.weitereEinkuenfteJahrCents,
      };
    }
  }
  plan.umsatzplanung = [
    {
      id: "umsatz-test",
      bezeichnung: "Umsatz",
      art: "monatsumsatz",
      monatsumsatz: {
        basisCents: 0,
        monatsOverride: optionen.umsatz.map((eintrag) => ({
          monat: eintrag.monat,
          wertCents: eintrag.cents,
        })),
      },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    },
  ];
  if (optionen.gehaltCents) {
    plan.personal = [
      {
        id: "stelle-gf",
        bezeichnung: "Geschäftsführergehalt",
        rolle: "geschaeftsfuehrer",
        brutto: { basisCents: optionen.gehaltCents },
        eintritt: optionen.umsatz[0]?.monat ?? "2026-06",
        austritt: optionen.umsatz[0]?.monat ?? "2026-06",
        agNebenkostenSatz: 0,
        sozialversicherungspflichtig: false,
      },
    ];
  }
  return plan;
}

function person(
  id: string,
  name: string,
  anteil: number,
  kirchensteuer: boolean,
  rolle: Person["rollen"][number] = "gesellschafter",
): Person {
  return {
    id,
    name,
    rollen: [rolle],
    anteil,
    steuerprofil: { kirchensteuer, splitting: false, kinderfreibetraege: 0 },
  };
}

function summeZahlungen(
  ergebnis: ReturnType<typeof berechnePlan>,
  von: number,
  bis: number,
): number {
  let total = 0;
  for (let index = von; index <= bis; index += 1) {
    total += ergebnis.steuern.monate[index]?.zahlungCents ?? 0;
  }
  return total;
}

function zahlung(ergebnis: ReturnType<typeof berechnePlan>, monat: string) {
  const zeile = ergebnis.steuern.monate.find((eintrag) => eintrag.monat === monat);
  if (!zeile) throw new Error(`Monat ${monat} fehlt`);
  return zeile;
}
