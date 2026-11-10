import type { PlanZweck, Rechtsform } from "./types.ts";

export const RECHTSFORM_LABEL: Record<Rechtsform, string> = {
  einzelunternehmen: "Einzelunternehmen",
  freiberufler: "Freiberufler/in",
  gbr: "GbR",
  ohg: "OHG",
  kg: "KG",
  gmbh: "GmbH",
  ug: "UG (haftungsbeschränkt)",
};

export const PLAN_ZWECK_LABEL: Record<PlanZweck, string> = {
  gruendungszuschuss: "Gründungszuschuss / Tragfähigkeit",
  bank_kfw: "Bank und KfW",
  investoren_exist: "Investoren und EXIST",
  eigene_planung: "Eigene Planung",
};
