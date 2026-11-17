import { describe, expect, it } from "vitest";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { berechnePlan } from "../calc/berechnen.ts";
import { createEmptyFinanzplan } from "../empty-plan.ts";
import { exportPlanToJson, importPlanFromJson } from "../io.ts";
import { migratePlan } from "../migrate.ts";
import { TAB_MIKRODARLEHEN_ID } from "../parameter.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import type { Darlehen, Finanzplan, Kostenkategorie, PersonalRolle } from "../types.ts";
import { meldungenFuerExport, pruefePlan, standardSchwellen } from "./index.ts";
import type { Pruefmeldung } from "./typen.ts";

const NOW = new Date("2026-01-15T00:00:00.000Z");

function basis(): Finanzplan {
  return createEmptyFinanzplan({
    id: "plan-check",
    now: NOW,
    startMonat: "2026-01",
  });
}

function meldungen(plan: Finanzplan): Pruefmeldung[] {
  return pruefePlan(plan, erstelleBerichte(plan, berechnePlan(plan)));
}

function finde(plan: Finanzplan, id: string): Pruefmeldung | undefined {
  return meldungen(plan).find((meldung) => meldung.id === id);
}

function umsatz(
  plan: Finanzplan,
  basisCents: number,
  optionen?: {
    quote?: number;
    wachstum?: number;
    overrides?: { monat: string; wertCents: number }[];
    id?: string;
    bezeichnung?: string;
  },
): void {
  plan.umsatzplanung.push({
    id: optionen?.id ?? "rev-test",
    bezeichnung: optionen?.bezeichnung ?? "Leistung",
    art: "monatsumsatz",
    monatsumsatz: {
      basisCents,
      wachstum:
        optionen?.wachstum == null
          ? undefined
          : { jahresrate: optionen.wachstum, modus: "compound_monthly" },
      monatsOverride: optionen?.overrides,
    },
    umsatzsteuerSatz: 0.19,
    zahlungszielTage: 0,
    wareneinsatz:
      optionen?.quote == null
        ? { art: "keiner" }
        : { art: "prozent_vom_umsatz", quote: optionen.quote, umsatzsteuerSatz: 0.19 },
  });
}

function kosten(plan: Finanzplan, basisCents: number, kategorie: Kostenkategorie = "miete"): void {
  plan.laufendeKosten.push({
    id: `kost-${kategorie}`,
    bezeichnung: kategorie,
    kategorie,
    art: "fix",
    betrag: { basisCents },
    umsatzsteuerSatz: 0.19,
    zahlungszielTage: 0,
    betriebsausgabe: true,
  });
}

function leben(plan: Finanzplan, lebenshaltung: number, vorsorge: number): void {
  const person = plan.stammdaten.personen[0];
  if (!person) throw new Error("Person fehlt");
  person.lebensbedarf = {
    lebenshaltung: { basisCents: lebenshaltung },
    krankenversicherung: { basisCents: vorsorge },
    pflegeversicherung: { basisCents: 0 },
    altersvorsorge: { basisCents: 0 },
    sonstigeVersicherungen: { basisCents: 0 },
  };
}

function stelle(plan: Finanzplan, basisCents: number, rolle: PersonalRolle = "angestellt"): void {
  plan.personal.push({
    id: `stelle-${rolle}`,
    bezeichnung: "Stelle",
    rolle,
    brutto: { basisCents },
    eintritt: "2026-01",
    agNebenkostenSatz: 0,
    sozialversicherungspflichtig: rolle !== "geschaeftsfuehrer",
  });
}

function investition(plan: Finanzplan, nettoCents: number): void {
  plan.kapitalbedarf.investitionen.push({
    id: "inv-test",
    bezeichnung: "Maschine",
    kategorie: "maschine_ausstattung",
    nettoCents,
    umsatzsteuerSatz: 0.19,
    anschaffungsmonat: "2026-01",
    zahlungszielTage: 0,
    afaMethode: "linear",
    nutzungsdauerMonate: 60,
  });
}

function einlage(plan: Finanzplan, betragCents: number): void {
  plan.finanzierung.eigenkapital.push({
    id: "ek-test",
    bezeichnung: "Einlage",
    betragCents,
    monat: "2026-01",
    art: "bareinlage",
  });
}

function darlehen(betragCents: number, teil: Partial<Darlehen> = {}): Darlehen {
  const betrag = teil.betragCents ?? betragCents;
  return {
    id: "dl-test",
    bezeichnung: "Darlehen",
    geber: "Bank",
    art: "bank",
    nominalzinsPa: 0.04,
    laufzeitMonate: 36,
    tilgungsfreieMonate: 0,
    zinszahlungInTilgungsfreierZeit: true,
    tilgungsart: "annuitaet",
    ...teil,
    betragCents: betrag,
    auszahlungen: teil.auszahlungen ?? [{ monat: "2026-01", betragCents: betrag }],
  };
}

function mikro(teil: Partial<Darlehen> = {}): Darlehen {
  return darlehen(2_500_000, {
    id: "dl-tab",
    bezeichnung: "Thüringer Mikrodarlehen",
    geber: "Thüringer Aufbaubank",
    art: "foerderdarlehen",
    vorlageId: TAB_MIKRODARLEHEN_ID,
    nominalzinsPa: 0.024,
    laufzeitMonate: 84,
    tilgungsfreieMonate: 12,
    tilgungsart: "ratentilgung",
    ...teil,
  });
}

describe("Liquidität", () => {
  it("meldet einen negativen Kontostand als ungedeckten Kontokorrent", () => {
    const plan = basis();
    kosten(plan, 100_000);
    const meldung = finde(plan, "liquiditaet-kontostand");
    expect(meldung?.stufe).toBe("fehler");
    expect(meldung?.kategorie).toBe("liquiditaet");
    expect(meldung?.begruendung).toContain("Kontokorrentbedarf");
    expect(meldung?.begruendung).toMatch(/€/);
    expect(meldung?.ziel.tabelle).toMatchObject({ ansicht: "liquiditaet", zeileId: "endbestand" });
  });

  it("meldet keinen Kontostand, wenn der Endbestand nicht unter die Schwelle fällt", () => {
    const plan = basis();
    expect(finde(plan, "liquiditaet-kontostand")).toBeUndefined();
  });

  it("liest den Mindest-Kontostand aus dem Plan", () => {
    const plan = basis();
    plan.pruefung.schwellen.kontostandMinCents = 1;
    expect(finde(plan, "liquiditaet-kontostand")?.stufe).toBe("fehler");
  });

  it("meldet ein Mikrodarlehen unter 5.000 €, über 35.000 €, über 84 und über 12 Monate", () => {
    const zuKlein = basis();
    zuKlein.finanzierung.darlehen = [mikro({ betragCents: 400_000 })];
    expect(finde(zuKlein, "liquiditaet-vorlage-dl-tab")?.begruendung).toContain("4.000,00");

    const zuGross = basis();
    zuGross.finanzierung.darlehen = [mikro({ betragCents: 4_000_000 })];
    expect(finde(zuGross, "liquiditaet-vorlage-dl-tab")?.begruendung).toContain("40.000,00");

    const zuLang = basis();
    zuLang.finanzierung.darlehen = [mikro({ laufzeitMonate: 96 })];
    expect(finde(zuLang, "liquiditaet-vorlage-dl-tab")?.begruendung).toContain("96 Monate");

    const zuFrei = basis();
    zuFrei.finanzierung.darlehen = [mikro({ tilgungsfreieMonate: 18 })];
    const frei = finde(zuFrei, "liquiditaet-vorlage-dl-tab");
    expect(frei?.stufe).toBe("warnung");
    expect(frei?.begruendung).toContain("18 Monate");
    expect(frei?.ziel.assistent?.feld).toBe("darlehen-dl-tab");
  });

  it("meldet ein Darlehen innerhalb der Vorlage nicht", () => {
    const plan = basis();
    plan.finanzierung.darlehen = [mikro()];
    expect(finde(plan, "liquiditaet-vorlage-dl-tab")).toBeUndefined();
    const ohneVorlage = basis();
    ohneVorlage.finanzierung.darlehen = [darlehen(100_000)];
    expect(
      meldungen(ohneVorlage).some((meldung) => meldung.id.startsWith("liquiditaet-vorlage")),
    ).toBe(false);
  });
});

describe("Tragfähigkeit", () => {
  it("meldet negatives verfügbares Einkommen im Planjahr 2", () => {
    const plan = basis();
    leben(plan, 150_000, 40_000);
    const meldung = finde(plan, "tragfaehigkeit-planjahr2-person-inhaber");
    expect(meldung?.stufe).toBe("fehler");
    expect(meldung?.begruendung).toMatch(/Planjahr 2/);
    expect(meldung?.begruendung).toMatch(/€/);
  });

  it("meldet kein negatives Einkommen, wenn Planjahr 2 getragen wird", () => {
    const plan = basis();
    umsatz(plan, 800_000);
    leben(plan, 150_000, 40_000);
    expect(finde(plan, "tragfaehigkeit-planjahr2-person-inhaber")).toBeUndefined();
  });

  it("meldet fehlende und auffällig niedrige Lebenshaltung und Vorsorge", () => {
    const fehlt = basis();
    expect(finde(fehlt, "tragfaehigkeit-lebenshaltung-fehlt-person-inhaber")?.stufe).toBe(
      "warnung",
    );
    expect(finde(fehlt, "tragfaehigkeit-vorsorge-fehlt-person-inhaber")?.stufe).toBe("warnung");

    const niedrig = basis();
    leben(niedrig, 50_000, 10_000);
    expect(finde(niedrig, "tragfaehigkeit-lebenshaltung-niedrig-person-inhaber")?.stufe).toBe(
      "hinweis",
    );
    expect(finde(niedrig, "tragfaehigkeit-vorsorge-niedrig-person-inhaber")?.begruendung).toMatch(
      /300,00/,
    );
    expect(finde(niedrig, "tragfaehigkeit-lebenshaltung-fehlt-person-inhaber")).toBeUndefined();
  });

  it("meldet Lebenshaltung und Vorsorge nicht, wenn sie über der Schwelle liegen", () => {
    const plan = basis();
    umsatz(plan, 800_000);
    leben(plan, 150_000, 40_000);
    const liste = meldungen(plan);
    expect(liste.some((meldung) => meldung.id.includes("lebenshaltung"))).toBe(false);
    expect(liste.some((meldung) => meldung.id.includes("vorsorge"))).toBe(false);
  });

  it("prüft die Tragfähigkeit bei einer GmbH nicht", () => {
    const plan = basis();
    plan.stammdaten.rechtsform = "gmbh";
    plan.stammdaten.stammkapitalCents = 2_500_000;
    expect(meldungen(plan).some((meldung) => meldung.kategorie === "tragfaehigkeit")).toBe(false);
  });
});

describe("Umsatz", () => {
  it("meldet fehlenden Umsatz", () => {
    const plan = basis();
    const meldung = finde(plan, "umsatz-fehlt");
    expect(meldung?.stufe).toBe("fehler");
    expect(meldung?.begruendung).toContain("0,00");
  });

  it("meldet Umsatz nicht als fehlend, wenn Erlöse erfasst sind", () => {
    const plan = basis();
    umsatz(plan, 500_000);
    expect(finde(plan, "umsatz-fehlt")).toBeUndefined();
  });

  it("meldet einen Start ohne Anlaufphase und einen gedämpften Start nicht", () => {
    const voll = basis();
    umsatz(voll, 500_000);
    const anlauf = finde(voll, "umsatz-anlauf");
    expect(anlauf?.stufe).toBe("hinweis");
    expect(anlauf?.begruendung).toMatch(/80,0/);

    const gedimmt = basis();
    umsatz(gedimmt, 500_000, {
      overrides: [
        { monat: "2026-01", wertCents: 20_000 },
        { monat: "2026-02", wertCents: 40_000 },
        { monat: "2026-03", wertCents: 80_000 },
      ],
    });
    expect(finde(gedimmt, "umsatz-anlauf")).toBeUndefined();
  });

  it("meldet sehr hohes Wachstum und ein flaches Wachstum nicht", () => {
    const stark = basis();
    umsatz(stark, 100_000, { wachstum: 3 });
    const wachstum = finde(stark, "umsatz-wachstum");
    expect(wachstum?.stufe).toBe("warnung");
    expect(wachstum?.begruendung).toMatch(/Planjahr 1/);
    expect(wachstum?.begruendung).toMatch(/€/);

    const flach = basis();
    umsatz(flach, 100_000);
    expect(finde(flach, "umsatz-wachstum")).toBeUndefined();
  });
});

describe("Kosten", () => {
  it("meldet Wareneinsatz über 100 % als Warnung und eine hohe Quote als Hinweis", () => {
    const ueber = basis();
    umsatz(ueber, 200_000, { quote: 1.2 });
    const warnung = finde(ueber, "kosten-wareneinsatz");
    expect(warnung?.stufe).toBe("warnung");
    expect(warnung?.begruendung).toMatch(/120,0/);

    const hoch = basis();
    umsatz(hoch, 200_000, { quote: 0.75 });
    expect(finde(hoch, "kosten-wareneinsatz")?.stufe).toBe("hinweis");
  });

  it("meldet einen üblichen Wareneinsatz nicht", () => {
    const plan = basis();
    umsatz(plan, 200_000, { quote: 0.22 });
    expect(finde(plan, "kosten-wareneinsatz")).toBeUndefined();
  });

  it("meldet eine sehr hohe Personalkostenquote und eine niedrige nicht", () => {
    const hoch = basis();
    umsatz(hoch, 200_000);
    stelle(hoch, 300_000);
    const meldung = finde(hoch, "kosten-personalquote");
    expect(meldung?.stufe).toBe("warnung");
    expect(meldung?.begruendung).toMatch(/Quote/);

    const niedrig = basis();
    umsatz(niedrig, 500_000);
    stelle(niedrig, 50_000);
    expect(finde(niedrig, "kosten-personalquote")).toBeUndefined();
  });

  it("meldet fehlende Versicherung und Steuerberatung, vorhandene Posten nicht", () => {
    const leer = basis();
    expect(finde(leer, "kosten-versicherung-fehlt")?.stufe).toBe("hinweis");
    expect(finde(leer, "kosten-steuerberatung-fehlt")?.stufe).toBe("hinweis");

    const voll = basis();
    kosten(voll, 5_000, "versicherung");
    kosten(voll, 8_000, "beratung_buchhaltung");
    expect(finde(voll, "kosten-versicherung-fehlt")).toBeUndefined();
    expect(finde(voll, "kosten-steuerberatung-fehlt")).toBeUndefined();
  });

  it("meldet eine GmbH ohne Geschäftsführergehalt und ein erfasstes Gehalt nicht", () => {
    const ohne = basis();
    ohne.stammdaten.rechtsform = "gmbh";
    ohne.stammdaten.stammkapitalCents = 2_500_000;
    const meldung = finde(ohne, "kosten-gf-gehalt-fehlt");
    expect(meldung?.stufe).toBe("warnung");
    expect(meldung?.text).toContain("GmbH");

    const mit = basis();
    mit.stammdaten.rechtsform = "ug";
    mit.stammdaten.stammkapitalCents = 100_000;
    stelle(mit, 300_000, "geschaeftsfuehrer");
    expect(finde(mit, "kosten-gf-gehalt-fehlt")).toBeUndefined();

    const einzel = basis();
    expect(finde(einzel, "kosten-gf-gehalt-fehlt")).toBeUndefined();
  });
});

describe("Steuern", () => {
  it("meldet Kleinunternehmer über 25.000 € im Vorjahr und über 100.000 € im laufenden Jahr", () => {
    const plan = basis();
    plan.umsatzsteuer = {
      ...plan.umsatzsteuer,
      regime: "kleinunternehmer",
      vorsteuerabzugsberechtigt: false,
    };
    umsatz(plan, 1_000_000);
    const liste = meldungen(plan);
    expect(liste.find((meldung) => meldung.id === "steuern-ku-vorjahr-2026")?.stufe).toBe("fehler");
    expect(liste.find((meldung) => meldung.id === "steuern-ku-vorjahr-2026")?.begruendung).toMatch(
      /25\.000,00/,
    );
    expect(liste.find((meldung) => meldung.id === "steuern-ku-laufend-2026")?.begruendung).toMatch(
      /100\.000,00/,
    );
    expect(liste.find((meldung) => meldung.id === "steuern-ku-vorjahr-offen")?.stufe).toBe(
      "hinweis",
    );
  });

  it("meldet die Grenzen nicht, wenn der Umsatz darunter bleibt oder Regelbesteuerung gilt", () => {
    const klein = basis();
    klein.umsatzsteuer = {
      ...klein.umsatzsteuer,
      regime: "kleinunternehmer",
      vorsteuerabzugsberechtigt: false,
    };
    umsatz(klein, 100_000);
    const liste = meldungen(klein);
    expect(liste.some((meldung) => meldung.id.startsWith("steuern-ku-vorjahr-20"))).toBe(false);
    expect(liste.some((meldung) => meldung.id.startsWith("steuern-ku-laufend"))).toBe(false);

    const regel = basis();
    umsatz(regel, 1_000_000);
    expect(meldungen(regel).some((meldung) => meldung.id.startsWith("steuern-ku"))).toBe(false);
  });
});

describe("Finanzierung", () => {
  it("meldet Investitionen, die nicht durch Mittel gedeckt sind", () => {
    const plan = basis();
    investition(plan, 1_000_000);
    einlage(plan, 100_000);
    const meldung = finde(plan, "finanzierung-investitionen");
    expect(meldung?.stufe).toBe("fehler");
    expect(meldung?.begruendung).toContain("10.000,00");
    expect(meldung?.begruendung).toContain("1.000,00");
  });

  it("meldet gedeckte Investitionen nicht", () => {
    const plan = basis();
    investition(plan, 100_000);
    einlage(plan, 500_000);
    expect(finde(plan, "finanzierung-investitionen")).toBeUndefined();
  });

  it("meldet eine sehr niedrige Eigenkapitalquote und eine hohe nicht", () => {
    const niedrig = basis();
    einlage(niedrig, 100_000);
    niedrig.finanzierung.darlehen = [darlehen(2_000_000)];
    const meldung = finde(niedrig, "finanzierung-eigenkapitalquote");
    expect(meldung?.stufe).toBe("warnung");
    expect(meldung?.begruendung).toMatch(/10,0/);

    const hoch = basis();
    einlage(hoch, 2_000_000);
    hoch.finanzierung.darlehen = [darlehen(500_000)];
    expect(finde(hoch, "finanzierung-eigenkapitalquote")).toBeUndefined();
  });
});

describe("Export und Migration", () => {
  it("liefert Meldungen für einen späteren Export, auch wenn Fehler dabei sind", () => {
    const plan = basis();
    kosten(plan, 100_000);
    const exportiert = meldungenFuerExport(plan, erstelleBerichte(plan, berechnePlan(plan)));
    const fehler = exportiert.find((meldung) => meldung.id === "liquiditaet-kontostand");
    expect(fehler?.stufe).toBe("fehler");
    expect(fehler?.stufeText).toBe("Fehler");
    expect(fehler?.kategorieText).toBe("Liquidität");
    expect(fehler?.tabelle).toBe("liquiditaet:endbestand");
    expect(exportiert.length).toBeGreaterThan(0);
  });

  it("gibt einem Plan aus Version 9 die Standard-Schwellen", () => {
    const roh = structuredClone(beispielElektro) as unknown as Record<string, unknown>;
    roh.schemaVersion = 9;
    delete roh.pruefung;
    const migriert = migratePlan(roh);
    expect(migriert.schemaVersion).toBe(13);
    expect(migriert.pruefung.schwellen).toEqual(standardSchwellen());
    expect(migriert).toEqual(beispielElektro);
  });

  it("behält angepasste Schwellen beim Export", () => {
    const plan = structuredClone(beispielElektro);
    plan.pruefung.schwellen.wachstumMax = 0.5;
    const geladen = importPlanFromJson(exportPlanToJson(plan));
    expect(geladen.pruefung.schwellen.wachstumMax).toBe(0.5);
    expect(geladen.pruefung.schwellen.kontostandMinCents).toBe(0);
  });
});
