import { standardSchwellen } from "../domain/checks/schwellen.ts";
import { standardExcelExport } from "../domain/excel/blaetter.ts";
import { standardPdfExport } from "../domain/pdf/kapitel.ts";
import { PARAMETER_DE_2026 } from "../domain/parameter.ts";
import { standardPlanSzenarien } from "../domain/szenarien/standard.ts";
import type { Finanzplan } from "../domain/types.ts";

/**
 * Erfundene GmbH mit gleichbleibendem Monatsgewinn, damit die Körperschaftsteuer
 * Jahr für Jahr nachrechenbar bleibt. Mira Kolb und Hafenlicht GmbH gibt es nicht.
 * Der Hebesatz 400 ist ein Beispiel, keine Auskunft über eine Gemeinde.
 */
export const beispielGmbh = {
  id: "plan-beispiel-hafenlicht-gmbh",
  schemaVersion: 13,
  status: "vollstaendig",
  erstelltAm: "2026-01-08T09:00:00.000Z",
  geaendertAm: "2026-01-20T09:00:00.000Z",
  waehrung: "EUR",
  startMonat: "2026-01",
  horizontMonate: 36,
  parameter: PARAMETER_DE_2026,
  steuerplanung: { abschlusszahlungMonat: 9 },
  stammdaten: {
    planName: "BEISPIEL (fiktiv) – Hafenlicht GmbH",
    beispiel: true,
    firmenname: "Hafenlicht GmbH",
    rechtsform: "gmbh",
    branche: "Software für kleine Betriebe",
    branchenschluessel: "software",
    wzCode: "62.01",
    taetigkeitsbeschreibung:
      "Fiktive GmbH mit Lizenzerlösen, Geschäftsführergehalt und zwei laufenden Kosten. Alle Personen und Beträge sind erfunden. Ausschüttungen sind nicht Teil des Plans.",
    strasse: "Beispielkai 8",
    plz: "50667",
    ort: "Köln",
    bundesland: "Nordrhein-Westfalen",
    gewerbesteuerHebesatz: 400,
    gruendungsmonat: "2026-01",
    handelsregisterGeplant: true,
    stammkapitalCents: 2_500_000,
    personen: [
      {
        id: "person-mira-kolb",
        name: "Mira Kolb (fiktiv)",
        rollen: ["gesellschafter", "geschaeftsfuehrer"],
        anteil: 1,
        steuerprofil: { kirchensteuer: false, splitting: false, kinderfreibetraege: 0 },
        lebensbedarf: {
          lebenshaltung: { basisCents: 180_000 },
          krankenversicherung: { basisCents: 42_000 },
          pflegeversicherung: { basisCents: 8_000 },
          altersvorsorge: { basisCents: 15_000 },
          sonstigeVersicherungen: { basisCents: 5_000 },
        },
      },
    ],
    zwecke: ["eigene_planung", "bank_kfw"],
  },
  kapitalbedarf: {
    investitionen: [],
    gruendungskosten: [],
    anlaufkosten: [],
    betriebsmittel: { betriebsmittelbedarfCents: 0, liquiditaetsreserveCents: 1_000_000 },
  },
  finanzierung: {
    eigenkapital: [
      {
        id: "ek-stamm",
        bezeichnung: "Einzahlung Stammkapital",
        personId: "person-mira-kolb",
        betragCents: 2_500_000,
        monat: "2026-01",
        art: "bareinlage",
      },
    ],
    darlehen: [],
    zuschuesse: [],
  },
  umsatzplanung: [
    {
      id: "umsatz-lizenzen",
      bezeichnung: "Lizenzen und kleine Projekte",
      art: "monatsumsatz",
      monatsumsatz: { basisCents: 1_500_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    },
  ],
  personal: [
    {
      id: "stelle-gf",
      bezeichnung: "Geschäftsführergehalt",
      name: "Mira Kolb (fiktiv)",
      personId: "person-mira-kolb",
      rolle: "geschaeftsfuehrer",
      brutto: { basisCents: 400_000 },
      eintritt: "2026-01",
      agNebenkostenSatz: 0,
      sozialversicherungspflichtig: false,
      wochenstunden: 40,
      notizen:
        "Gehalt der Gesellschafter-Geschäftsführerin, Betriebsausgabe. Kein Arbeitgeberanteil in diesem Beispiel.",
    },
  ],
  laufendeKosten: [
    {
      id: "kost-miete",
      bezeichnung: "Büro Miete",
      kategorie: "miete",
      art: "fix",
      betrag: { basisCents: 150_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    },
    {
      id: "kost-software",
      bezeichnung: "Software und Hosting",
      kategorie: "software",
      art: "fix",
      betrag: { basisCents: 20_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    },
  ],
  umsatzsteuer: {
    regime: "regelbesteuerung",
    vorsteuerabzugsberechtigt: true,
    versteuerungsart: "soll",
    voranmeldungszeitraum: "monatlich",
    dauerfristverlaengerung: false,
  },
  szenarien: {
    aktiv: "real",
    best: { bezeichnung: "Best Case", anpassungen: [] },
    real: { bezeichnung: "Real Case", beschreibung: "Entspricht der Basis.", anpassungen: [] },
    worst: { bezeichnung: "Worst Case", anpassungen: [] },
  },
  planSzenarien: standardPlanSzenarien(),
  pruefung: { schwellen: standardSchwellen() },
  pdfExport: standardPdfExport(),
  excelExport: standardExcelExport(),
  notizen:
    "Dieser Plan ist vollständig erfunden. Mira Kolb und die Hafenlicht GmbH gibt es nicht. Der Hebesatz 400 ist ein Beispielwert, keine Auskunft über Köln. Das Geschäftsführergehalt ist Personalaufwand. Ausschüttungen werden nicht besteuert. Keine Verwendung für einen echten Antrag.",
} satisfies Finanzplan;
