import { toIsoMonth } from "./months.ts";
import {
  PLAN_HORIZON_MONTHS,
  SCHEMA_VERSION,
  WAEHRUNG,
  type Finanzplan,
  type IsoMonth,
} from "./types.ts";

export interface EmptyPlanOptions {
  id?: string;
  now?: Date;
  startMonat?: IsoMonth;
}

/**
 * Strukturell gültiger Ausgangsplan für einen späteren Assistenten.
 * Der Hebesatz 400 ist nur ein Platzhalter, damit das Objekt gültig ist,
 * und keine Empfehlung für eine Gemeinde.
 */
export function createEmptyFinanzplan(options: EmptyPlanOptions = {}): Finanzplan {
  const now = options.now ?? new Date();
  const startMonat = options.startMonat ?? toIsoMonth(now);
  const stamp = now.toISOString();

  return {
    id: options.id ?? crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    erstelltAm: stamp,
    geaendertAm: stamp,
    waehrung: WAEHRUNG,
    startMonat,
    horizontMonate: PLAN_HORIZON_MONTHS,
    stammdaten: {
      planName: "Neuer Finanzplan",
      beispiel: false,
      firmenname: "Neues Vorhaben",
      rechtsform: "einzelunternehmen",
      branche: "",
      taetigkeitsbeschreibung: "",
      ort: "Ort folgt",
      bundesland: "Berlin",
      gewerbesteuerHebesatz: 400,
      gruendungsmonat: startMonat,
      personen: [
        {
          id: "person-inhaber",
          name: "Inhaberin oder Inhaber",
          rollen: ["inhaber"],
          anteil: 1,
        },
      ],
      zwecke: ["eigene_planung"],
    },
    kapitalbedarf: {
      investitionen: [],
      gruendungskosten: [],
      anlaufkosten: [],
      betriebsmittel: { liquiditaetsreserveCents: 0 },
    },
    finanzierung: {
      eigenkapital: [],
      darlehen: [],
      zuschuesse: [],
    },
    umsatzplanung: [],
    personal: [],
    laufendeKosten: [],
    umsatzsteuer: {
      regime: "regelbesteuerung",
      versteuerungsart: "soll",
      voranmeldungszeitraum: "vierteljaehrlich",
      dauerfristverlaengerung: false,
    },
    szenarien: {
      aktiv: "base",
      best: { bezeichnung: "Best Case", anpassungen: [] },
      real: { bezeichnung: "Real Case", anpassungen: [] },
      worst: { bezeichnung: "Worst Case", anpassungen: [] },
    },
  };
}
