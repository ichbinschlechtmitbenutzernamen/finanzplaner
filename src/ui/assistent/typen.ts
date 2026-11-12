import type { Finanzplan } from "../../domain/types.ts";

export type PlanAendern = (erzeugen: (plan: Finanzplan) => Finanzplan) => void;
