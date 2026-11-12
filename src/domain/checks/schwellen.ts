import type { PruefSchwellen } from "../types.ts";

/**
 * Standard-Schwellen der Plausibilitätsprüfung.
 *
 * Kontostand 0 €: ein negativer Endbestand ist ungedeckter Kontokorrentbedarf,
 * weil der Plan keine Kreditlinie kennt.
 * Verfügbares Einkommen 0 € im Planjahr 2: die übliche Lesart von Bank und
 * Gründungszuschuss, unter null trägt sich die Person im zweiten Jahr nicht.
 * Lebenshaltung 900 € im Monat: unter einem schmalen Einzelhaushalt aus Regelsatz
 * und einem kleinen Wohnanteil, deshalb auffällig niedrig und kein Verbot.
 * Vorsorge 300 € im Monat: Kranken-, Pflege- und Altersvorsorge zusammen.
 * Der Mindestbeitrag zur Krankenversicherung Selbstständiger liegt schon in
 * dieser Größenordnung. Darunter fehlt meist ein Posten.
 * Anlauf 3 Monate und 80 %: liegen die ersten Monate schon bei vier Fünfteln
 * des späteren Niveaus in Planjahr 1, ist keine Anlaufphase erkennbar.
 * Wachstum 80 %: Planjahr 2 gegenüber Planjahr 1. Gründungen wachsen, ein
 * Zuwachs um mehr als vier Fünftel in einem Jahr soll begründet werden.
 * Wareneinsatz 60 % und 100 %: Handwerk und Gastronomie liegen oft bei 20 bis
 * 35 %, der Handel bei 40 bis 60 %. Darüber ist die Quote ungewöhnlich,
 * über 100 % wird unter dem Einstand verkauft.
 * Personalkosten 60 %: ab hier bindet das Personal den Umsatz, bevor Miete,
 * Ware und der Unterhalt der Inhaberin finanziert sind.
 * Kleinunternehmer 25.000 € und 100.000 €: die Grenzen des § 19 UStG ab 2025,
 * Nettoumsatz im Vorjahr und im laufenden Kalenderjahr.
 * Eigenkapitalquote 10 %: darunter ist der Eigenanteil an der Finanzierung
 * für eine Gründung sehr niedrig. Viele Förderprogramme erwarten mehr.
 */
export const STANDARD_SCHWELLEN: PruefSchwellen = {
  kontostandMinCents: 0,
  verfuegbarPlanjahr2MinCents: 0,
  lebenshaltungMinMonatCents: 90_000,
  vorsorgeMinMonatCents: 30_000,
  anlaufMonate: 3,
  anlaufAnteil: 0.8,
  wachstumMax: 0.8,
  wareneinsatzHoch: 0.6,
  wareneinsatzGrenze: 1,
  personalquoteMax: 0.6,
  kleinunternehmerVorjahrCents: 2_500_000,
  kleinunternehmerLaufendCents: 10_000_000,
  eigenkapitalquoteMin: 0.1,
};

/** Eigene Kopie, damit eine Anpassung im Plan die Vorlage nicht verändert. */
export function standardSchwellen(): PruefSchwellen {
  return { ...STANDARD_SCHWELLEN };
}

export function schwellenSindStandard(schwellen: PruefSchwellen): boolean {
  const standard = STANDARD_SCHWELLEN;
  return (Object.keys(standard) as (keyof PruefSchwellen)[]).every(
    (key) => schwellen[key] === standard[key],
  );
}
