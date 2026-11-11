import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { beispielCafe } from "../fixtures/beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "../fixtures/beispiel-einzelunternehmen.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../fixtures/beispiel-gmbh.ts";
import { createDraftFinanzplan, createEmptyFinanzplan } from "./empty-plan.ts";
import { exportPlanToJson, importPlanFromJson } from "./io.ts";
import { SchemaMigrationError, applyMigrations, migratePlan, migrations } from "./migrate.ts";
import { TAB_MIKRODARLEHEN_ID } from "./parameter.ts";
import { finanzplanSchema } from "./schema.ts";
import { SCHEMA_VERSION, type Finanzplan, type Personalstelle } from "./types.ts";

const FIXED_NOW = new Date("2026-04-01T00:00:00.000Z");

function emptyPlan(): Finanzplan {
  return createEmptyFinanzplan({
    id: "plan-leer",
    now: FIXED_NOW,
    startMonat: "2026-04",
  });
}

function issuesOf(data: unknown): string {
  const result = finanzplanSchema.safeParse(data);
  if (result.success) return "";
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
}

describe("Beispielpläne", () => {
  const plaene = [beispielEinzelunternehmen, beispielElektro, beispielCafe, beispielGmbh];

  it("sind als Fiktion gekennzeichnet und erfüllen das Schema", () => {
    for (const plan of plaene) {
      expect(plan.stammdaten.beispiel).toBe(true);
      expect(plan.stammdaten.planName.toLowerCase()).toContain("fiktiv");
      expect(plan.schemaVersion).toBe(SCHEMA_VERSION);
      expect(plan.status).toBe("vollstaendig");
      expect(finanzplanSchema.parse(plan)).toEqual(plan);
    }
  });

  it("übersteht Export und Import unverändert", () => {
    for (const plan of plaene) {
      const json = exportPlanToJson(plan);
      const imported = importPlanFromJson(json);
      expect(imported).toEqual(plan);
      expect(importPlanFromJson(exportPlanToJson(imported))).toEqual(imported);
      expect(json).toContain('"schemaVersion": 6');
      expect(json.endsWith("\n")).toBe(true);
    }
  });

  it("bildet Annuität und Ratentilgung ab, das Mikrodarlehen als Vorlage", () => {
    expect(beispielEinzelunternehmen.finanzierung.darlehen[0]?.tilgungsart).toBe("annuitaet");
    expect(beispielCafe.finanzierung.darlehen[0]?.tilgungsart).toBe("annuitaet");
    const mikro = beispielElektro.finanzierung.darlehen[0];
    expect(mikro?.tilgungsart).toBe("ratentilgung");
    expect(mikro?.vorlageId).toBe(TAB_MIKRODARLEHEN_ID);
    expect(mikro?.nominalzinsPa).toBe(0.024);
    expect(mikro?.zinszahlungInTilgungsfreierZeit).toBe(true);
    expect(beispielElektro.personal[0]?.eintritt).toBe("2027-06");
    expect(beispielCafe.umsatzplanung[0]?.wareneinsatz).toEqual({
      art: "prozent_vom_umsatz",
      quote: 0.32,
      umsatzsteuerSatz: 0.07,
    });
  });
});

describe("Leerer Plan und weitere Rechtsformen", () => {
  it("speichert einen Entwurf ohne Rechtsform, Person und Startmonat", () => {
    const plan = createDraftFinanzplan({ id: "plan-entwurf", now: FIXED_NOW });
    expect(plan.status).toBe("entwurf");
    expect(plan.startMonat).toBeUndefined();
    expect(plan.stammdaten.rechtsform).toBeUndefined();
    expect(plan.stammdaten.personen).toEqual([]);
    expect(finanzplanSchema.parse(plan)).toEqual(plan);
    expect(importPlanFromJson(exportPlanToJson(plan))).toEqual(plan);
  });

  it("legt einen gültigen Einzelunternehmen-Start an und rundet ihn über JSON", () => {
    const plan = emptyPlan();
    expect(finanzplanSchema.parse(plan)).toEqual(plan);
    expect(importPlanFromJson(exportPlanToJson(plan))).toEqual(plan);
  });

  it("akzeptiert eine GmbH mit Geschäftsführergehalt", () => {
    const plan = emptyPlan();
    plan.stammdaten.rechtsform = "gmbh";
    plan.stammdaten.firmenname = "Beispiel GmbH (fiktiv)";
    plan.stammdaten.stammkapitalCents = 2_500_000;
    plan.stammdaten.personen = [
      {
        id: "person-anna",
        name: "Anna Beispiel",
        rollen: ["gesellschafter", "geschaeftsfuehrer"],
        anteil: 0.6,
      },
      {
        id: "person-ben",
        name: "Ben Beispiel",
        rollen: ["gesellschafter"],
        anteil: 0.4,
      },
    ];
    plan.personal = [
      {
        id: "personal-gf",
        bezeichnung: "Geschäftsführergehalt",
        personId: "person-anna",
        rolle: "geschaeftsfuehrer",
        brutto: { basisCents: 350_000 },
        eintritt: "2026-04",
        agNebenkostenSatz: 0,
        sozialversicherungspflichtig: false,
      } satisfies Personalstelle,
    ];
    expect(finanzplanSchema.parse(plan)).toEqual(plan);
  });

  it("akzeptiert eine KG mit beiden Haftungsrollen", () => {
    const plan = emptyPlan();
    plan.stammdaten.rechtsform = "kg";
    plan.stammdaten.firmenname = "Beispiel KG (fiktiv)";
    plan.stammdaten.personen = [
      { id: "person-kim", name: "Kim Beispiel", rollen: ["komplementaer"], anteil: 0.4 },
      { id: "person-noah", name: "Noah Beispiel", rollen: ["kommanditist"], anteil: 0.6 },
    ];
    expect(issuesOf(plan)).toBe("");
  });
});

describe("Schemaregeln", () => {
  it("lehnt ein Einzelunternehmen mit zwei Personen ab", () => {
    const plan = emptyPlan();
    plan.stammdaten.personen.push({
      id: "person-zweite",
      name: "Zweite Person",
      rollen: ["inhaber"],
      anteil: 0,
    });
    expect(issuesOf(plan)).toContain("genau eine Person");
  });

  it("lehnt Anteile ab, die nicht 100 % ergeben", () => {
    const plan = emptyPlan();
    const person = plan.stammdaten.personen[0];
    expect(person).toBeDefined();
    if (person) person.anteil = 0.5;
    expect(issuesOf(plan)).toContain("100 %");
  });

  it("lehnt Cent-Bruchteile, unbekannte Felder und eine GWG-Nutzungsdauer ab", () => {
    const plan = emptyPlan();
    plan.kapitalbedarf.betriebsmittel.liquiditaetsreserveCents = 10.5;
    expect(issuesOf(plan)).toContain("ganzen Cent");

    const extra = { ...emptyPlan(), unbekannt: true };
    expect(finanzplanSchema.safeParse(extra).success).toBe(false);

    const gwg = emptyPlan();
    gwg.kapitalbedarf.investitionen.push({
      id: "inv-stuhl",
      bezeichnung: "Stuhl",
      kategorie: "buero_einrichtung",
      nettoCents: 40_000,
      umsatzsteuerSatz: 0.19,
      anschaffungsmonat: "2026-04",
      nutzungsdauerMonate: 12,
      afaMethode: "sofort_gwg",
      zahlungszielTage: 0,
    } as Finanzplan["kapitalbedarf"]["investitionen"][number]);
    expect(issuesOf(gwg)).toContain("Nutzungsdauer 0");
  });

  it("verlangt, dass die Darlehenssumme zu den Auszahlungen passt", () => {
    const plan = emptyPlan();
    plan.finanzierung.darlehen.push({
      id: "darlehen-test",
      bezeichnung: "Test",
      geber: "Bank",
      art: "bank",
      betragCents: 100_000,
      auszahlungen: [{ monat: "2026-04", betragCents: 80_000 }],
      nominalzinsPa: 0.04,
      laufzeitMonate: 36,
      tilgungsfreieMonate: 0,
      zinszahlungInTilgungsfreierZeit: true,
      tilgungsart: "ratentilgung",
    });
    expect(issuesOf(plan)).toContain("Summe der Auszahlungen");
  });

  it("hält Überschreibungen im Horizont", () => {
    const plan = emptyPlan();
    plan.umsatzplanung.push({
      id: "rev-test",
      bezeichnung: "Testumsatz",
      art: "monatsumsatz",
      monatsumsatz: {
        basisCents: 10_000,
        monatsOverride: [{ monat: "2030-01", wertCents: 1 }],
      },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    });
    expect(issuesOf(plan)).toContain("Planungszeitraum");
  });
});

describe("Migration und Datei-Import", () => {
  it("hebt Version 1 auf den Parametersatz und lehnt Monats-Wareneinsatz ab", () => {
    expect(SCHEMA_VERSION).toBe(6);
    expect(typeof migrations[1]).toBe("function");
    expect(typeof migrations[2]).toBe("function");
    expect(typeof migrations[3]).toBe("function");
    expect(typeof migrations[4]).toBe("function");
    expect(typeof migrations[5]).toBe("function");

    const current = emptyPlan();
    const v1 = structuredClone(current) as unknown as Record<string, unknown>;
    v1.schemaVersion = 1;
    delete v1.status;
    delete v1.parameter;
    const ust = v1.umsatzsteuer as Record<string, unknown>;
    delete ust.vorsteuerabzugsberechtigt;
    const betriebsmittel = (v1.kapitalbedarf as { betriebsmittel: Record<string, unknown> })
      .betriebsmittel;
    delete betriebsmittel.betriebsmittelbedarfCents;

    const migrated = migratePlan(v1);
    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents).toBe(0);
    expect(migrated.steuerplanung.abschlusszahlungMonat).toBe(9);
    expect(migrated.parameter.steuer.einkommensteuerTarif.zone2BisEuro).toBe(17_799);
    expect(migrated.status).toBe("vollstaendig");
    expect(migrated.parameter.version).toBe("de-2026");
    expect(migrated.umsatzsteuer.vorsteuerabzugsberechtigt).toBe(true);
    expect(migrated.parameter.darlehensvorlagen[0]?.id).toBe(TAB_MIKRODARLEHEN_ID);

    const withMonthlyGoods = structuredClone(v1);
    withMonthlyGoods.umsatzplanung = [
      {
        wareneinsatz: { art: "monatsbetrag", betrag: { basisCents: 100 }, umsatzsteuerSatz: 0.19 },
      },
    ];
    expect(() => migratePlan(withMonthlyGoods)).toThrow(SchemaMigrationError);
  });

  it("streicht Sacheinlagen und die Sammelposten-Nutzungsdauer aus Version 2", () => {
    const roh = structuredClone(emptyPlan()) as unknown as Record<string, unknown>;
    roh.schemaVersion = 2;
    const finanzierung = roh.finanzierung as { eigenkapital: Record<string, unknown>[] };
    finanzierung.eigenkapital.push(
      {
        id: "ek-sache",
        bezeichnung: "Laptop aus dem Privatvermögen",
        betragCents: 200_000,
        monat: "2026-04",
        art: "sacheinlage",
        investitionId: "inv-laptop",
      },
      {
        id: "ek-bar",
        bezeichnung: "Bareinlage",
        betragCents: 100_000,
        monat: "2026-04",
        art: "bareinlage",
        investitionId: "inv-laptop",
      },
    );
    const kapital = roh.kapitalbedarf as {
      investitionen: Record<string, unknown>[];
      gruendungskosten: Record<string, unknown>[];
    };
    kapital.investitionen.push({
      id: "inv-pool",
      bezeichnung: "Sammelposten",
      kategorie: "buero_einrichtung",
      nettoCents: 90_000,
      umsatzsteuerSatz: 0.19,
      anschaffungsmonat: "2026-04",
      nutzungsdauerMonate: 12,
      afaMethode: "sammelposten",
      zahlungszielTage: 0,
    });
    kapital.gruendungskosten.push({
      id: "gk-alt",
      bezeichnung: "Beratung",
      nettoCents: 20_000,
      umsatzsteuerSatz: 0.19,
      monat: "2026-04",
      zahlungszielTage: 0,
      steuerlichSofortAbzugsfaehig: false,
    });

    const migrated = migratePlan(roh);
    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.finanzierung.eigenkapital.map((posten) => posten.id)).toEqual(["ek-bar"]);
    expect(migrated.finanzierung.eigenkapital[0]).not.toHaveProperty("investitionId");
    expect(migrated.kapitalbedarf.investitionen[0]).not.toHaveProperty("nutzungsdauerMonate");
    expect(migrated.kapitalbedarf.gruendungskosten[0]?.buchung).toEqual({ art: "aufwand" });
    expect(migrated.kapitalbedarf.gruendungskosten[0]).not.toHaveProperty(
      "steuerlichSofortAbzugsfaehig",
    );
  });

  it("ergänzt Tarif, Soli-Gleitzone und den Zahlungsmonat aus Version 3", () => {
    const roh = structuredClone(emptyPlan()) as unknown as Record<string, unknown>;
    roh.schemaVersion = 3;
    delete roh.steuerplanung;
    const steuer = (roh.parameter as { steuer: Record<string, unknown> }).steuer;
    delete steuer.einkommensteuerTarif;
    delete steuer.solidaritaetszuschlagMilderungSatz;
    delete steuer.gewerbeertragAbrundungCents;
    delete steuer.gewerbesteuerAnrechnungFaktor;
    steuer.einkommensteuerGrundfreibetragCents = 1_200_000;

    const migrated = migratePlan(roh);
    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.steuerplanung.abschlusszahlungMonat).toBe(9);
    expect(migrated.parameter.steuer.einkommensteuerGrundfreibetragCents).toBe(1_200_000);
    expect(migrated.parameter.steuer.einkommensteuerTarif.zone2FaktorHundertstel).toBe(91_451);
    expect(migrated.parameter.steuer.solidaritaetszuschlagMilderungSatz).toBe(0.119);
    expect(migrated.parameter.steuer.gewerbeertragAbrundungCents).toBe(10_000);
    expect(migrated.parameter.steuer.gewerbesteuerAnrechnungFaktor).toBe(4);
  });

  it("setzt den Betriebsmittelbedarf aus Version 5 auf 0 und lässt einen vorhandenen Betrag stehen", () => {
    const ohne = structuredClone(emptyPlan()) as unknown as Record<string, unknown>;
    ohne.schemaVersion = 5;
    delete (ohne.kapitalbedarf as { betriebsmittel: Record<string, unknown> }).betriebsmittel
      .betriebsmittelbedarfCents;
    const migriert = migratePlan(ohne);
    expect(migriert.schemaVersion).toBe(6);
    expect(migriert.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents).toBe(0);

    const mit = structuredClone(emptyPlan()) as unknown as Record<string, unknown>;
    mit.schemaVersion = 5;
    (
      mit.kapitalbedarf as { betriebsmittel: { betriebsmittelbedarfCents: number } }
    ).betriebsmittel.betriebsmittelbedarfCents = 250_000;
    const behalten = migratePlan(mit);
    expect(behalten.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents).toBe(250_000);
  });

  it("streicht den Progressionsvorbehalt aus Version 4", () => {
    const roh = structuredClone(emptyPlan()) as unknown as Record<string, unknown>;
    roh.schemaVersion = 4;
    const finanzierung = roh.finanzierung as { zuschuesse: Record<string, unknown>[] };
    finanzierung.zuschuesse.push({
      id: "zuschuss-alt",
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
        startMonat: "2026-04",
      },
    });
    const migrated = migratePlan(roh);
    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.finanzierung.zuschuesse[0]).not.toHaveProperty("progressionsvorbehalt");
    expect(migrated.finanzierung.zuschuesse[0]?.steuerfrei).toBe(true);
  });

  it("führt eine Versionskette aus und lehnt neuere Dateien ab", () => {
    const once = applyMigrations({ schemaVersion: 1, name: "alt" }, 2, {
      1: (data) => ({ ...data, schemaVersion: 2, migrated: true }),
    });
    expect(once).toEqual({ schemaVersion: 2, name: "alt", migrated: true });

    expect(() => migratePlan({ schemaVersion: 99 })).toThrow(SchemaMigrationError);
    expect(() => migratePlan({ name: "ohne Version" })).toThrow(SchemaMigrationError);
    expect(() => migratePlan({ schemaVersion: 0 })).toThrow(SchemaMigrationError);
    expect(() => importPlanFromJson("{")).toThrow(SchemaMigrationError);
  });

  it("wirft bei fachlich ungültigem Inhalt einen Zod-Fehler", () => {
    expect(() => importPlanFromJson('{"schemaVersion":1}')).toThrow(ZodError);
    expect(() => exportPlanToJson({ ...emptyPlan(), horizontMonate: 12 as 36 })).toThrow(ZodError);
  });
});
