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
 * je Elternteil. Körperschaftsteuer 15 %, Solidaritätszuschlag 5,5 % mit Freigrenze
 * 20.350 Euro und Milderungssatz 11,9 %, Gewerbesteuer-Messzahl 3,5 %, Freibetrag
 * 24.500 Euro, Anrechnungsfaktor 4,0 nach § 35 EStG.
 * Kleinunternehmergrenzen 25.000 / 100.000 Euro netto. GWG-Grenzen nach Fachvorgabe.
 *
 * Tarif § 32a Abs. 1 EStG ab dem Veranlagungszeitraum 2026, Gesetz vom 23.12.2024
 * (BGBl. 2024 I Nr. 449): https://www.gesetze-im-internet.de/estg/__32a.html
 * Solidaritätszuschlag § 3 Abs. 3 und § 4 SolZG 1995, Freigrenze ab VZ 2026.
 */
export const PARAMETER_DE_2026: Planparameter = {
  version: "de-2026",
  bezeichnung: "Steuer- und Förderparameter Deutschland, Stand 2026",
  hinweis:
    "Mit der Plananlage eingefroren, damit eine bei der Bank abgegebene Fassung stabil bleibt. Enthalten ist die Tarifformel § 32a EStG 2026 einschließlich Solidaritätszuschlag mit Gleitzone.",
  steuer: {
    umsatzsteuerRegelsatz: 0.19,
    umsatzsteuerErmaessigt: 0.07,
    koerperschaftsteuerSatz: 0.15,
    solidaritaetszuschlagSatz: 0.055,
    solidaritaetszuschlagFreigrenzeCents: 2_035_000,
    solidaritaetszuschlagMilderungSatz: 0.119,
    gewerbesteuerMesszahl: 0.035,
    gewerbesteuerFreibetragPersonenCents: 2_450_000,
    gewerbesteuerFreibetragKapitalCents: 0,
    gewerbeertragAbrundungCents: 10_000,
    gewerbesteuerAnrechnungFaktor: 4,
    einkommensteuerGrundfreibetragCents: 1_234_800,
    kinderfreibetragJeElternteilCents: 341_400,
    beaFreibetragJeElternteilCents: 146_400,
    einkommensteuerSpitzensteuersatz: 0.42,
    einkommensteuerReichensteuersatz: 0.45,
    einkommensteuerTarif: {
      quelle:
        "§ 32a Abs. 1 EStG, Fassung ab Veranlagungszeitraum 2026, Steuerfortentwicklungsgesetz vom 23.12.2024 (BGBl. 2024 I Nr. 449)",
      zone2BisEuro: 17_799,
      zone3BisEuro: 69_878,
      zone4BisEuro: 277_825,
      zone3SchwelleEuro: 17_799,
      zone2FaktorHundertstel: 91_451,
      zone2Summand: 1_400,
      zone3FaktorHundertstel: 17_310,
      zone3Summand: 2_397,
      zone3KonstanteHundertstel: 103_487,
      zone4AbzugHundertstel: 1_113_563,
      zone5AbzugHundertstel: 1_947_038,
    },
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
