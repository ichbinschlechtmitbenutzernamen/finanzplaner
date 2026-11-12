import type { Berichte } from "../reports/typen.ts";
import type { Finanzplan, PruefSchwellen } from "../types.ts";
import { formatEuro, formatProzent } from "./format.ts";
import type { Pruefmeldung } from "./typen.ts";

/** Investitionen gegen die Finanzierung und eine sehr niedrige Eigenkapitalquote. */
export function pruefeFinanzierung(
  _plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  return [...pruefeDeckung(berichte), ...pruefeEigenkapital(berichte, schwellen)];
}

function pruefeDeckung(berichte: Berichte): Pruefmeldung[] {
  const investitionen =
    berichte.kapital.bedarf.find((posten) => posten.id === "investitionen")?.betragCents ?? 0;
  const mittel = berichte.kapital.summeFinanzierung.betragCents;
  if (investitionen <= mittel) return [];
  const luecke = investitionen - mittel;
  return [
    {
      id: "finanzierung-investitionen",
      stufe: "fehler",
      kategorie: "finanzierung",
      text: "Die Investitionen sind nicht durch die Mittel gedeckt.",
      begruendung: `Investitionen ${formatEuro(investitionen)}, Finanzierung ${formatEuro(mittel)}, ungedeckt ${formatEuro(luecke)}. Eigenkapital, Darlehen und Zuschüsse reichen für die Anschaffungen nicht.`,
      ziel: {
        tabelle: { ansicht: "kapital", zeileId: "investitionen" },
        assistent: { station: "investitionen", feld: "investitionen" },
      },
    },
  ];
}

function pruefeEigenkapital(berichte: Berichte, schwellen: PruefSchwellen): Pruefmeldung[] {
  const quote = berichte.kennzahlen.eigenkapitalquote;
  if (quote == null || quote >= schwellen.eigenkapitalquoteMin) return [];
  return [
    {
      id: "finanzierung-eigenkapitalquote",
      stufe: "warnung",
      kategorie: "finanzierung",
      text: "Die Eigenkapitalquote ist sehr niedrig.",
      begruendung: `Eigenmittel ${formatEuro(berichte.kennzahlen.eigenmittelCents)} von Finanzierung ${formatEuro(berichte.kennzahlen.finanzierungCents)}, Quote ${formatProzent(quote)}. Die Schwelle liegt bei ${formatProzent(schwellen.eigenkapitalquoteMin)}.`,
      ziel: {
        tabelle: { ansicht: "kapital", zeileId: "eigenmittel" },
        assistent: { station: "finanzierung", feld: "eigenkapital" },
      },
    },
  ];
}
