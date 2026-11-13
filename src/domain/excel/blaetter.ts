import { istPersonenunternehmen } from "../reports/planjahr.ts";
import {
  EXCEL_BLAETTER,
  type ExcelBlattId,
  type ExcelExportEinstellungen,
  type Rechtsform,
} from "../types.ts";

/** Sichtbare Namen der Blätter, in der Reihenfolge der Datei. */
export const EXCEL_BLATT_LABEL: Record<ExcelBlattId, string> = {
  uebersicht: "Übersicht",
  eingaben: "Eingaben",
  kapital: "Kapitalbedarf und Finanzierung",
  investitionen: "Investitionen und Abschreibungen",
  umsatz: "Umsatz und Kosten",
  rentabilitaet: "Rentabilität",
  liquiditaet: "Liquidität",
  tragfaehigkeit: "Tragfähigkeit mit Lebenshaltung",
  steuern: "Steuern",
  pruefung: "Prüfung",
  vergleich: "Szenarienvergleich",
};

/** Namen in der Arbeitsmappe. Excel erlaubt höchstens 31 Zeichen. */
export const EXCEL_BLATT_NAME: Record<ExcelBlattId, string> = {
  uebersicht: "Übersicht",
  eingaben: "Eingaben",
  kapital: "Kapitalbedarf und Finanzierung",
  investitionen: "Investitionen und AfA",
  umsatz: "Umsatz und Kosten",
  rentabilitaet: "Rentabilität",
  liquiditaet: "Liquidität",
  tragfaehigkeit: "Tragfähigkeit",
  steuern: "Steuern",
  pruefung: "Prüfung",
  vergleich: "Szenarienvergleich",
};

export const HILFSBLATT_NAME = {
  parameter: "Parameter",
  rechnung: "Rechnung",
  steuer: "Steuerberechnung",
} as const;

/**
 * Blätter, deren Zahlen aus Formeln kommen.
 * Prüfung und Szenarienvergleich tragen feste Werte.
 */
export const EXCEL_RECHENBLAETTER: readonly ExcelBlattId[] = [
  "uebersicht",
  "kapital",
  "investitionen",
  "umsatz",
  "rentabilitaet",
  "liquiditaet",
  "tragfaehigkeit",
  "steuern",
];

/** Alle Blätter, so wie ein neuer Plan und eine Migration sie vorbelegen. */
export function standardExcelExport(): ExcelExportEinstellungen {
  return { blaetter: [...EXCEL_BLAETTER] };
}

/** Auswahl in der festen Blattfolge, jedes Blatt höchstens einmal. */
export function normalisiereBlaetter(auswahl: readonly ExcelBlattId[]): ExcelBlattId[] {
  const gesetzt = new Set(auswahl);
  return EXCEL_BLAETTER.filter((id) => gesetzt.has(id));
}

/** Blätter, die für diese Rechtsform in die Datei dürfen. Die gespeicherte Auswahl bleibt. */
export function blaetterFuerRechtsform(
  auswahl: readonly ExcelBlattId[],
  rechtsform: Rechtsform | undefined,
): ExcelBlattId[] {
  return normalisiereBlaetter(auswahl).filter(
    (id) => id !== "tragfaehigkeit" || istPersonenunternehmen(rechtsform),
  );
}

export type DateiBlatt =
  | { art: "bericht"; id: ExcelBlattId; name: string }
  | { art: "hilfe"; id: keyof typeof HILFSBLATT_NAME; name: string };

/**
 * Reihenfolge in der Datei. Das Eingabeblatt und die Hilfsblätter sind dabei,
 * sobald ein Rechenblatt gewählt ist, auch wenn die Eingaben abgewählt wurden.
 */
export function dateiBlaetter(
  auswahl: readonly ExcelBlattId[],
  rechtsform: Rechtsform | undefined,
): DateiBlatt[] {
  const gewaehlt = new Set(blaetterFuerRechtsform(auswahl, rechtsform));
  const rechnet = EXCEL_RECHENBLAETTER.some((id) => gewaehlt.has(id));
  const liste: DateiBlatt[] = [];
  for (const id of EXCEL_BLAETTER) {
    if (id === "eingaben") {
      if (gewaehlt.has("eingaben") || rechnet) {
        liste.push({ art: "bericht", id, name: EXCEL_BLATT_NAME[id] });
      }
      if (rechnet) {
        liste.push(
          { art: "hilfe", id: "parameter", name: HILFSBLATT_NAME.parameter },
          { art: "hilfe", id: "rechnung", name: HILFSBLATT_NAME.rechnung },
          { art: "hilfe", id: "steuer", name: HILFSBLATT_NAME.steuer },
        );
      }
      continue;
    }
    if (gewaehlt.has(id)) {
      liste.push({ art: "bericht", id, name: EXCEL_BLATT_NAME[id] });
    }
  }
  return liste;
}

/** Deutlicher Vermerk. Nur bei mindestens einem Fehler, nicht bei Warnungen. */
export function fehlerVermerkExcel(anzahl: number): string | null {
  if (anzahl <= 0) return null;
  const menge = anzahl === 1 ? "1 Fehler" : `${anzahl} Fehler`;
  return `Achtung: Dieser Stand enthält ${menge}. Der Export bleibt möglich. Alle Meldungen stehen im Blatt Prüfung.`;
}

/** Dateiname aus Vorhaben und Kalendertag. Umlaute bleiben erhalten. */
export function excelDateiname(vorhaben: string, datum: Date): string {
  const tag = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(datum);
  const basis = vorhaben
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${basis || "Finanzplan"}-${tag}.xlsx`;
}

export function vorhabenName(firmenname: string, planName: string): string {
  const firma = firmenname.trim();
  if (firma) return firma;
  const plan = planName.trim();
  return plan || "Finanzplan";
}
