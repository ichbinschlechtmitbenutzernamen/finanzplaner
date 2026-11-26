import { ZodError } from "zod";
import { exportPlanToJson, importPlanFromJson } from "../domain/io.ts";
import { SchemaMigrationError } from "../domain/migrate.ts";
import type { Finanzplan } from "../domain/types.ts";

const UMLAUTE: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

/** Name in der Oberfläche. Leer bleibt „Eigener Plan“, nicht der Dateiname. */
export function anzeigename(plan: Finanzplan): string {
  return plan.stammdaten.planName.trim() || plan.stammdaten.firmenname.trim() || "Eigener Plan";
}

/**
 * Dateiname aus Planname und Kalendertag in Europe/Berlin.
 * Umlaute werden umschrieben, Akzente entfernt, damit der Name auf jedem System ankommt.
 */
export function planJsonDateiname(planName: string, datum: Date): string {
  const tag = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(datum);
  const ersetzt = planName.trim().replace(/[äöüÄÖÜß]/g, (zeichen) => UMLAUTE[zeichen] ?? zeichen);
  const ohneAkzent = ersetzt.normalize("NFD").replace(/\p{M}+/gu, "");
  const basis = ohneAkzent
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${basis || "Finanzplan"}-${tag}.json`;
}

export function dateinameFuerPlan(plan: Finanzplan, datum: Date): string {
  const name = plan.stammdaten.planName.trim() || plan.stammdaten.firmenname.trim();
  return planJsonDateiname(name, datum);
}

/** Lesbare Meldung für eine Datei, die sich nicht als Finanzplan lesen lässt. */
export function meldungZuDateiFehler(fehler: unknown): string {
  if (fehler instanceof SchemaMigrationError) return fehler.message;
  if (fehler instanceof ZodError) {
    const hinweis = fehler.issues[0]?.message;
    return hinweis
      ? `Die Datei ist kein gültiger Finanzplan. ${hinweis}`
      : "Die Datei ist kein gültiger Finanzplan.";
  }
  return "Die Datei konnte nicht gelesen werden.";
}

export function sicherePlanJson(plan: Finanzplan): string {
  return exportPlanToJson(plan);
}

export function lesePlanJson(text: string): Finanzplan {
  return importPlanFromJson(text);
}

/** Startet den Download im Browser. Der Inhalt ist das Ergebnis von `exportPlanToJson`. */
export function ladeDateiHerunter(dateiname: string, inhalt: string): void {
  const blob = new Blob([inhalt], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
