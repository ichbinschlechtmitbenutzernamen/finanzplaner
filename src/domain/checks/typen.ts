import type { AssistentStation, IsoMonth } from "../types.ts";

export const PRUEF_STUFEN = ["fehler", "warnung", "hinweis"] as const;

export type PruefStufe = (typeof PRUEF_STUFEN)[number];

export const PRUEF_KATEGORIEN = [
  "liquiditaet",
  "tragfaehigkeit",
  "umsatz",
  "kosten",
  "steuern",
  "finanzierung",
] as const;

export type PruefKategorie = (typeof PRUEF_KATEGORIEN)[number];

export const TABELLEN_ANSICHTEN = [
  "eingaben",
  "rentabilitaet",
  "liquiditaet",
  "kapital",
  "anlagen",
  "tragfaehigkeit",
] as const;

/** Reiter der Monatstabelle, zu dem eine Meldung springen kann. */
export type TabellenAnsicht = (typeof TABELLEN_ANSICHTEN)[number];

export interface TabellenZiel {
  ansicht: TabellenAnsicht;
  zeileId: string;
  /** Monat, dessen Zelle zusätzlich markiert wird. */
  monat?: IsoMonth;
}

export interface AssistentZiel {
  station: AssistentStation;
  /** Schlüssel des Feldes, `data-pruef` im Assistenten. */
  feld: string;
}

/** Wohin ein Klick auf die Meldung springt. Tabelle und Assistent können beide gesetzt sein. */
export interface PruefZiel {
  tabelle?: TabellenZiel;
  assistent?: AssistentZiel;
}

export interface Pruefmeldung {
  id: string;
  stufe: PruefStufe;
  kategorie: PruefKategorie;
  text: string;
  /** Begründung mit den konkreten Zahlen, die die Meldung ausgelöst haben. */
  begruendung: string;
  ziel: PruefZiel;
}

/** Form für einen späteren PDF- oder Excel-Export. Die Meldung wird nicht in den Plan geschrieben. */
export interface ExportPruefmeldung {
  id: string;
  stufe: PruefStufe;
  stufeText: string;
  kategorie: PruefKategorie;
  kategorieText: string;
  text: string;
  begruendung: string;
  tabelle: string | null;
  assistentFeld: string | null;
}

export const STUFE_TEXT: Record<PruefStufe, string> = {
  fehler: "Fehler",
  warnung: "Warnung",
  hinweis: "Hinweis",
};

export const KATEGORIE_TEXT: Record<PruefKategorie, string> = {
  liquiditaet: "Liquidität",
  tragfaehigkeit: "Tragfähigkeit",
  umsatz: "Umsatz",
  kosten: "Kosten",
  steuern: "Steuern",
  finanzierung: "Finanzierung",
};

const STUFE_RANG: Record<PruefStufe, number> = { fehler: 0, warnung: 1, hinweis: 2 };

const KATEGORIE_RANG: Record<PruefKategorie, number> = {
  liquiditaet: 0,
  tragfaehigkeit: 1,
  umsatz: 2,
  kosten: 3,
  steuern: 4,
  finanzierung: 5,
};

export function hoechsteStufe(meldungen: readonly { stufe: PruefStufe }[]): PruefStufe | null {
  if (meldungen.some((meldung) => meldung.stufe === "fehler")) return "fehler";
  if (meldungen.some((meldung) => meldung.stufe === "warnung")) return "warnung";
  if (meldungen.some((meldung) => meldung.stufe === "hinweis")) return "hinweis";
  return null;
}

export function sortiereMeldungen(meldungen: readonly Pruefmeldung[]): Pruefmeldung[] {
  return [...meldungen].sort((links, rechts) => {
    const stufe = STUFE_RANG[links.stufe] - STUFE_RANG[rechts.stufe];
    if (stufe !== 0) return stufe;
    const kategorie = KATEGORIE_RANG[links.kategorie] - KATEGORIE_RANG[rechts.kategorie];
    if (kategorie !== 0) return kategorie;
    return links.id.localeCompare(rechts.id, "de");
  });
}
