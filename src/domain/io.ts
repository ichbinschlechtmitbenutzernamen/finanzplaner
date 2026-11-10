import { SchemaMigrationError, migratePlan } from "./migrate.ts";
import { finanzplanSchema } from "./schema.ts";
import type { Finanzplan } from "./types.ts";

/** Prüft den Plan und schreibt ihn als lesbares JSON. Das ist das Dateiformat für Export und Import. */
export function exportPlanToJson(plan: Finanzplan): string {
  const checked = finanzplanSchema.parse(plan);
  return `${JSON.stringify(checked, null, 2)}\n`;
}

/** Liest eine Exportdatei, migriert sie auf die aktuelle Schema-Version und prüft sie. */
export function importPlanFromJson(json: string): Finanzplan {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new SchemaMigrationError("Die Datei ist kein gültiges JSON.");
  }
  return migratePlan(raw);
}
