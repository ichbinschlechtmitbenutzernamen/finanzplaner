import type { Finanzplan, Id, Investition, Steuerparameter } from "./types.ts";

export const ANLAGE_HINWEIS_CODES = ["gwg_betrag_zu_hoch", "sammelposten_ausserhalb"] as const;

export type AnlageHinweisCode = (typeof ANLAGE_HINWEIS_CODES)[number];

/** Hinweis, keine Sperre. Der Plan bleibt speicherbar. */
export interface AnlageHinweis {
  investitionId: Id;
  code: AnlageHinweisCode;
  message: string;
}

/**
 * Gleicht AfA-Methode und Nettobetrag mit den GWG-Grenzen im Parametersatz ab.
 * Sofort-GWG bis zur Obergrenze ist zulässig, auch im Bereich, in dem ein Sammelposten
 * ebenfalls möglich wäre. Linear ist immer zulässig und erzeugt keinen Hinweis.
 */
export function anlageKlassifikationHinweise(plan: Finanzplan): AnlageHinweis[] {
  return klassifiziereAnlagen(plan.kapitalbedarf.investitionen, plan.parameter.steuer);
}

/** Dieselbe Grenzprüfung für Anlagen und für Gründungs- oder Anlaufkosten, die als Anlage markiert sind. */
export function klassifiziereAnlagen(
  investitionen: readonly Investition[],
  steuer: Pick<
    Steuerparameter,
    "gwgSofortMaxNettoCents" | "sammelpostenMinNettoCents" | "sammelpostenMaxNettoCents"
  >,
): AnlageHinweis[] {
  const { gwgSofortMaxNettoCents, sammelpostenMinNettoCents, sammelpostenMaxNettoCents } = steuer;
  const hinweise: AnlageHinweis[] = [];

  for (const investition of investitionen) {
    if (
      investition.afaMethode === "sofort_gwg" &&
      investition.nettoCents > gwgSofortMaxNettoCents
    ) {
      hinweise.push({
        investitionId: investition.id,
        code: "gwg_betrag_zu_hoch",
        message: `„${investition.bezeichnung}" ist als geringwertiges Wirtschaftsgut markiert, liegt aber über der Grenze von ${gwgSofortMaxNettoCents} Cent netto.`,
      });
    }
    if (
      investition.afaMethode === "sammelposten" &&
      (investition.nettoCents < sammelpostenMinNettoCents ||
        investition.nettoCents > sammelpostenMaxNettoCents)
    ) {
      hinweise.push({
        investitionId: investition.id,
        code: "sammelposten_ausserhalb",
        message: `„${investition.bezeichnung}" ist als Sammelposten markiert, liegt aber außerhalb von ${sammelpostenMinNettoCents} bis ${sammelpostenMaxNettoCents} Cent netto.`,
      });
    }
  }

  return hinweise;
}
