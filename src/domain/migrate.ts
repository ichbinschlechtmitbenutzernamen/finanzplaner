import { finanzplanSchema } from "./schema.ts";
import { createParameterSnapshot, PARAMETER_DE_2026 } from "./parameter.ts";
import { ABSCHLUSSZAHLUNG_MONAT_STANDARD, SCHEMA_VERSION, type Finanzplan } from "./types.ts";

/** Version oder JSON-Hülle lässt sich nicht in das aktuelle Schema überführen. */
export class SchemaMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaMigrationError";
  }
}

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrationen von einer gespeicherten Version auf die nächste.
 * Der Schlüssel ist die Ausgangsversion. Die Funktion setzt `schemaVersion` um eins hoch.
 */
export const migrations: Record<number, Migration> = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
  4: migrateV4ToV5,
  5: migrateV5ToV6,
  6: migrateV6ToV7,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Version 1 hatte weder Status noch Parametersatz und kannte Wareneinsatz als Monatsbetrag. */
export function migrateV1ToV2(data: Record<string, unknown>): Record<string, unknown> {
  const plan = structuredClone(data);
  const lines = plan.umsatzplanung;
  if (Array.isArray(lines)) {
    for (const line of lines) {
      if (!isRecord(line) || !isRecord(line.wareneinsatz)) continue;
      if (line.wareneinsatz.art === "monatsbetrag") {
        throw new SchemaMigrationError(
          "Wareneinsatz als Monatsbetrag wird nicht mehr unterstützt. Bitte den Posten als Prozent vom Nettoumsatz neu erfassen.",
        );
      }
    }
  }
  if (isRecord(plan.umsatzsteuer) && plan.umsatzsteuer.vorsteuerabzugsberechtigt == null) {
    plan.umsatzsteuer.vorsteuerabzugsberechtigt = plan.umsatzsteuer.regime !== "kleinunternehmer";
  }
  if (plan.status == null) plan.status = "vollstaendig";
  if (plan.parameter == null) plan.parameter = createParameterSnapshot();
  plan.schemaVersion = 2;
  return plan;
}

/**
 * Version 3 streicht Sacheinlagen, bucht Gründungs- und Anlaufkosten als Aufwand
 * und entfernt die Nutzungsdauer beim Sammelposten. Sie wird fest über 60 Monate aufgelöst.
 * Ein alter Vermerk „nicht sofort abzugsfähig“ wird zu Aufwand, weil dazu keine Anlagenangaben vorliegen.
 */
export function migrateV2ToV3(data: Record<string, unknown>): Record<string, unknown> {
  const plan = structuredClone(data);
  const kapitalbedarf = plan.kapitalbedarf;
  if (isRecord(kapitalbedarf)) {
    for (const liste of ["gruendungskosten", "anlaufkosten"] as const) {
      const posten = kapitalbedarf[liste];
      if (!Array.isArray(posten)) continue;
      for (const eintrag of posten) {
        if (!isRecord(eintrag)) continue;
        delete eintrag.steuerlichSofortAbzugsfaehig;
        if (eintrag.buchung == null) eintrag.buchung = { art: "aufwand" };
      }
    }
    if (Array.isArray(kapitalbedarf.investitionen)) {
      for (const eintrag of kapitalbedarf.investitionen) {
        if (!isRecord(eintrag) || eintrag.afaMethode !== "sammelposten") continue;
        delete eintrag.nutzungsdauerMonate;
      }
    }
  }

  const finanzierung = plan.finanzierung;
  if (isRecord(finanzierung) && Array.isArray(finanzierung.eigenkapital)) {
    finanzierung.eigenkapital = finanzierung.eigenkapital.flatMap((eintrag) => {
      if (!isRecord(eintrag)) return [eintrag];
      if (eintrag.art === "sacheinlage") return [];
      delete eintrag.investitionId;
      return [eintrag];
    });
  }

  plan.schemaVersion = 3;
  return plan;
}

/**
 * Version 4 ergänzt die Tarifformel, die Soli-Milderung und den Zahlungsmonat
 * der Steuer des ersten Jahres. Vorhandene Sätze und Freibeträge bleiben.
 * Fehlende Tarifwerte kommen aus dem Parametersatz de-2026.
 */
export function migrateV3ToV4(data: Record<string, unknown>): Record<string, unknown> {
  const plan = structuredClone(data);
  if (!isRecord(plan.steuerplanung)) {
    plan.steuerplanung = { abschlusszahlungMonat: ABSCHLUSSZAHLUNG_MONAT_STANDARD };
  }
  const parameter = plan.parameter;
  if (isRecord(parameter) && isRecord(parameter.steuer)) {
    const steuer = parameter.steuer;
    const vorlage = PARAMETER_DE_2026.steuer;
    if (steuer.einkommensteuerTarif == null) {
      steuer.einkommensteuerTarif = structuredClone(vorlage.einkommensteuerTarif);
    }
    if (steuer.solidaritaetszuschlagMilderungSatz == null) {
      steuer.solidaritaetszuschlagMilderungSatz = vorlage.solidaritaetszuschlagMilderungSatz;
    }
    if (steuer.gewerbeertragAbrundungCents == null) {
      steuer.gewerbeertragAbrundungCents = vorlage.gewerbeertragAbrundungCents;
    }
    if (steuer.gewerbesteuerAnrechnungFaktor == null) {
      steuer.gewerbesteuerAnrechnungFaktor = vorlage.gewerbesteuerAnrechnungFaktor;
    }
  }
  plan.schemaVersion = 4;
  return plan;
}

/**
 * Version 5 streicht den Progressionsvorbehalt. Der Gründungszuschuss ist steuerfrei
 * und steht nicht im Katalog des § 32b EStG. Ein Schalter dafür gibt es nicht mehr.
 */
export function migrateV4ToV5(data: Record<string, unknown>): Record<string, unknown> {
  const plan = structuredClone(data);
  const finanzierung = plan.finanzierung;
  if (isRecord(finanzierung) && Array.isArray(finanzierung.zuschuesse)) {
    for (const eintrag of finanzierung.zuschuesse) {
      if (!isRecord(eintrag)) continue;
      delete eintrag.progressionsvorbehalt;
    }
  }
  plan.schemaVersion = 5;
  return plan;
}

/**
 * Version 6 ergänzt den manuellen Betriebsmittelbedarf. Ältere Pläne haben ihn nicht,
 * der Bedarf wird dann 0 und nicht aus Umsatz oder Kosten abgeleitet.
 */
export function migrateV5ToV6(data: Record<string, unknown>): Record<string, unknown> {
  const plan = structuredClone(data);
  const kapitalbedarf = plan.kapitalbedarf;
  if (isRecord(kapitalbedarf) && isRecord(kapitalbedarf.betriebsmittel)) {
    if (kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents == null) {
      kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents = 0;
    }
  }
  plan.schemaVersion = 6;
  return plan;
}

/**
 * Version 7 merkt sich an einem Wachstum optional, ob die Rate je Monat oder je Jahr
 * eingegeben wurde. Ältere Pläne haben das Feld nicht. Die Rechnung bleibt dieselbe.
 */
export function migrateV6ToV7(data: Record<string, unknown>): Record<string, unknown> {
  const plan = structuredClone(data);
  plan.schemaVersion = 7;
  return plan;
}

export function readSchemaVersion(data: unknown): number {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new SchemaMigrationError("Der Finanzplan muss ein JSON-Objekt sein.");
  }
  const version = (data as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new SchemaMigrationError("schemaVersion fehlt oder ist keine ganze Zahl.");
  }
  if (version < 1) {
    throw new SchemaMigrationError(`Schema-Version ${version} wird nicht unterstützt.`);
  }
  return version;
}

/**
 * Führt die Versionskette aus, ohne den Inhalt fachlich zu prüfen.
 * `steps` ist austauschbar, damit die Kette unabhängig von den echten Migrationen geprüft werden kann.
 */
export function applyMigrations(
  data: unknown,
  targetVersion: number,
  steps: Record<number, Migration>,
): unknown {
  if (!Number.isInteger(targetVersion) || targetVersion < 1) {
    throw new SchemaMigrationError("Die Zielversion der Migration ist ungültig.");
  }
  const version = readSchemaVersion(data);
  if (version > targetVersion) {
    throw new SchemaMigrationError(
      `Schema-Version ${version} ist neuer als diese Anwendung (${targetVersion}). Bitte die Anwendung aktualisieren.`,
    );
  }

  let current = data;
  let cursor = version;
  while (cursor < targetVersion) {
    const step = steps[cursor];
    if (!step) {
      throw new SchemaMigrationError(
        `Keine Migration von Schema-Version ${cursor} auf ${cursor + 1}.`,
      );
    }
    const next = step(current as Record<string, unknown>);
    const nextVersion = readSchemaVersion(next);
    if (nextVersion !== cursor + 1) {
      throw new SchemaMigrationError(
        `Migration von Version ${cursor} hat Version ${String(nextVersion)} erzeugt, erwartet war ${cursor + 1}.`,
      );
    }
    current = next;
    cursor = nextVersion;
  }
  return current;
}

/** Hebt ältere Pläne auf die aktuelle Version. Der Inhalt wird hier noch nicht geprüft. */
export function migrateRawPlan(data: unknown): unknown {
  return applyMigrations(data, SCHEMA_VERSION, migrations);
}

/**
 * Einstieg für gespeicherte Pläne: erst migrieren, dann gegen das aktuelle Schema prüfen.
 * Wirft `SchemaMigrationError` bei Versionsproblemen und `ZodError` bei ungültigem Inhalt.
 */
export function migratePlan(data: unknown): Finanzplan {
  return finanzplanSchema.parse(migrateRawPlan(data));
}
