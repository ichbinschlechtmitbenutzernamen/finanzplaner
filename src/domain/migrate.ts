import { finanzplanSchema } from "./schema.ts";
import { createParameterSnapshot } from "./parameter.ts";
import { SCHEMA_VERSION, type Finanzplan } from "./types.ts";

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
