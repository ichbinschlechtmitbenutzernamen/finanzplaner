import { createParameterSnapshot } from "./parameter.ts";
import { toIsoMonth } from "./months.ts";
import {
  PLAN_HORIZON_MONTHS,
  SCHEMA_VERSION,
  WAEHRUNG,
  type Finanzplan,
  type IsoMonth,
  type UmsatzsteuerEinstellungen,
} from "./types.ts";

export interface EmptyPlanOptions {
  id?: string;
  now?: Date;
  startMonat?: IsoMonth;
}

const standardUmsatzsteuer: UmsatzsteuerEinstellungen = {
  regime: "regelbesteuerung",
  vorsteuerabzugsberechtigt: true,
  versteuerungsart: "soll",
  voranmeldungszeitraum: "vierteljaehrlich",
  dauerfristverlaengerung: false,
};

function shell(
  options: EmptyPlanOptions,
  stamp: string,
): Pick<
  Finanzplan,
  | "id"
  | "schemaVersion"
  | "erstelltAm"
  | "geaendertAm"
  | "waehrung"
  | "horizontMonate"
  | "parameter"
  | "kapitalbedarf"
  | "finanzierung"
  | "umsatzplanung"
  | "personal"
  | "laufendeKosten"
  | "umsatzsteuer"
  | "szenarien"
> {
  return {
    id: options.id ?? crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    erstelltAm: stamp,
    geaendertAm: stamp,
    waehrung: WAEHRUNG,
    horizontMonate: PLAN_HORIZON_MONTHS,
    parameter: createParameterSnapshot(),
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
    umsatzsteuer: { ...standardUmsatzsteuer },
    szenarien: {
      aktiv: "base",
      best: { bezeichnung: "Best Case", anpassungen: [] },
      real: { bezeichnung: "Real Case", anpassungen: [] },
      worst: { bezeichnung: "Worst Case", anpassungen: [] },
    },
  };
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
    ...shell(options, stamp),
    status: "vollstaendig",
    startMonat,
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
  };
}

/** Speicherbarer Assistentenstand, bevor Rechtsform, Person und Startmonat feststehen. */
export function createDraftFinanzplan(options: EmptyPlanOptions = {}): Finanzplan {
  const now = options.now ?? new Date();
  const stamp = now.toISOString();
  return {
    ...shell(options, stamp),
    status: "entwurf",
    stammdaten: {
      planName: "",
      beispiel: false,
      firmenname: "",
      branche: "",
      taetigkeitsbeschreibung: "",
      ort: "",
      personen: [],
      zwecke: [],
    },
  };
}
