import type { Darlehensvorlage, Planparameter } from "./types.ts";

/** Stabile Id der gespeicherten TAB-Vorlage. */
export const TAB_MIKRODARLEHEN_ID = "tab-thueringer-mikrodarlehen";

/**
 * Thüringer Mikrodarlehen der Thüringer Aufbaubank.
 * Sollzins 2,40 % p.a. laut Konditionentableau, Auszahlung 100 %, keine Gebühren,
 * Ratentilgung, Zinsen auch in der tilgungsfreien Zeit.
 * Betragsspanne, Höchstlaufzeit und tilgungsfreie Zeit sind Grenzen der Vorlage.
 * Sollzins und Tilgungsart werden in das Darlehen kopiert und dürfen dort geändert werden.
 */
export const TAB_MIKRODARLEHEN_VORLAGE: Darlehensvorlage = {
  id: TAB_MIKRODARLEHEN_ID,
  bezeichnung: "Thüringer Mikrodarlehen",
  anbieter: "Thüringer Aufbaubank (TAB)",
  betragMinCents: 500_000,
  betragMaxCents: 3_500_000,
  laufzeitMaxMonate: 84,
  tilgungsfreieMonateMax: 12,
  nominalzinsPa: 0.024,
  tilgungsart: "ratentilgung",
  zinszahlungInTilgungsfreierZeit: true,
  auszahlungAnteil: 1,
  gebuehrenCents: 0,
  quelle: "Konditionentableau Mikrodarlehen der Thüringer Aufbaubank, Sollzins 2,40 % p.a.",
  notizen:
    "Monatliche Ratentilgung zuzüglich Zinsen auf die Restschuld. Zinsen werden auch in der tilgungsfreien Zeit gezahlt. Sondertilgung ist im Programm möglich und hier nicht als eigener Zahlungsplan abgebildet.",
};

/**
 * Eingefrorener Parametersatz für neue Pläne.
 * Grundfreibetrag 12.348 Euro, Kinderfreibetrag 3.414 Euro und BEA-Freibetrag 1.464 Euro
 * je Elternteil nach den für 2026 veröffentlichten Werten. Körperschaftsteuer 15 %,
 * Solidaritätszuschlag 5,5 %, Gewerbesteuer-Messzahl 3,5 %, Freibetrag 24.500 Euro.
 * Kleinunternehmergrenzen 25.000 / 100.000 Euro netto. GWG-Grenzen nach Fachvorgabe.
 */
export const PARAMETER_DE_2026: Planparameter = {
  version: "de-2026",
  bezeichnung: "Steuer- und Förderparameter Deutschland, Stand 2026",
  hinweis:
    "Mit der Plananlage eingefroren, damit eine bei der Bank abgegebene Fassung stabil bleibt. Die progressive Einkommensteuer-Tarifformel nach § 32a EStG ist nicht enthalten.",
  steuer: {
    umsatzsteuerRegelsatz: 0.19,
    umsatzsteuerErmaessigt: 0.07,
    koerperschaftsteuerSatz: 0.15,
    solidaritaetszuschlagSatz: 0.055,
    solidaritaetszuschlagFreigrenzeCents: 2_035_000,
    gewerbesteuerMesszahl: 0.035,
    gewerbesteuerFreibetragPersonenCents: 2_450_000,
    gewerbesteuerFreibetragKapitalCents: 0,
    einkommensteuerGrundfreibetragCents: 1_234_800,
    kinderfreibetragJeElternteilCents: 341_400,
    beaFreibetragJeElternteilCents: 146_400,
    einkommensteuerSpitzensteuersatz: 0.42,
    einkommensteuerReichensteuersatz: 0.45,
    kirchensteuerSatzBayernBadenWuerttemberg: 0.08,
    kirchensteuerSatzUebrigeLaender: 0.09,
    kleinunternehmerVorjahrCents: 2_500_000,
    kleinunternehmerLaufendesJahrCents: 10_000_000,
    gwgSofortMaxNettoCents: 80_000,
    sammelpostenMinNettoCents: 25_001,
    sammelpostenMaxNettoCents: 100_000,
  },
  darlehensvorlagen: [TAB_MIKRODARLEHEN_VORLAGE],
};

/** Eigene Kopie, damit ein Plan den eingefrorenen Satz ändern kann, ohne die Vorlage zu verbiegen. */
export function createParameterSnapshot(): Planparameter {
  return structuredClone(PARAMETER_DE_2026);
}
