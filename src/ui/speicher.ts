import { importPlanFromJson } from "../domain/io.ts";
import { exportPlanToJson } from "../domain/io.ts";
import type { Finanzplan } from "../domain/types.ts";

const SCHLUESSEL = "finanzplaner.plan.";

export function ladePlan(beispielId: string): Finanzplan | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL + beispielId);
    if (!roh) return null;
    return importPlanFromJson(roh);
  } catch {
    return null;
  }
}

export function speicherePlan(beispielId: string, plan: Finanzplan): void {
  localStorage.setItem(SCHLUESSEL + beispielId, exportPlanToJson(plan));
}

export function loeschePlan(beispielId: string): void {
  localStorage.removeItem(SCHLUESSEL + beispielId);
}
