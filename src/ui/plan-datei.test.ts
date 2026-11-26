import { describe, expect, it } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import { SchemaMigrationError } from "../domain/migrate.ts";
import { SCHEMA_VERSION } from "../domain/types.ts";
import {
  dateinameFuerPlan,
  lesePlanJson,
  meldungZuDateiFehler,
  planJsonDateiname,
  sicherePlanJson,
} from "./plan-datei.ts";

const TAG = new Date("2026-11-26T12:00:00.000Z");

function plan(name: string) {
  const entwurf = createEmptyFinanzplan({
    id: "plan-datei",
    now: new Date("2026-04-01T00:00:00.000Z"),
  });
  entwurf.stammdaten.planName = name;
  return entwurf;
}

describe("Plan sichern und laden", () => {
  it("schreibt Umlaute im Dateinamen um und behält sie in der Datei", () => {
    expect(planJsonDateiname("Café Größe", TAG)).toBe("Cafe-Groesse-2026-11-26.json");
    expect(planJsonDateiname("Müller & Söhne", new Date("2026-11-26T23:30:00.000Z"))).toBe(
      "Mueller-Soehne-2026-11-27.json",
    );
    expect(planJsonDateiname("???", TAG)).toBe("Finanzplan-2026-11-26.json");
    expect(planJsonDateiname("   ", TAG)).toBe("Finanzplan-2026-11-26.json");

    const ausgang = plan("Café Größe");
    expect(dateinameFuerPlan(ausgang, TAG)).toBe("Cafe-Groesse-2026-11-26.json");
    const json = sicherePlanJson(ausgang);
    expect(json).toContain("Café Größe");
    const zurueck = lesePlanJson(json);
    expect(zurueck.stammdaten.planName).toBe("Café Größe");
    expect(sicherePlanJson(zurueck)).toBe(json);
  });

  it("migriert eine ältere Schema-Version beim Laden", () => {
    const ausgang = plan("Werkstatt");
    const roh = JSON.parse(sicherePlanJson(ausgang)) as { schemaVersion: number };
    roh.schemaVersion = SCHEMA_VERSION - 1;
    const geladen = lesePlanJson(JSON.stringify(roh));
    expect(geladen.schemaVersion).toBe(SCHEMA_VERSION);
    expect(geladen.stammdaten.planName).toBe("Werkstatt");
    expect(geladen.id).toBe(ausgang.id);
  });

  it("meldet eine ungültige Datei verständlich", () => {
    expect(() => lesePlanJson("{")).toThrow(SchemaMigrationError);
    try {
      lesePlanJson("{");
    } catch (fehler) {
      expect(meldungZuDateiFehler(fehler)).toBe("Die Datei ist kein gültiges JSON.");
    }
    try {
      lesePlanJson('{"schemaVersion": 1}');
    } catch (fehler) {
      expect(meldungZuDateiFehler(fehler)).toMatch(/kein gültiger Finanzplan/);
    }
    expect(meldungZuDateiFehler(new Error("kaputt"))).toBe(
      "Die Datei konnte nicht gelesen werden.",
    );
  });
});
