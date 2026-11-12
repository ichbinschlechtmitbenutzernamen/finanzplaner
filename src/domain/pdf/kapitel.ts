import { istPersonenunternehmen } from "../reports/planjahr.ts";
import {
  PDF_KAPITEL,
  type PdfExportEinstellungen,
  type PdfKapitelId,
  type Rechtsform,
} from "../types.ts";

/** Sichtbare Namen der Kapitel, in der Reihenfolge des Dokuments. */
export const PDF_KAPITEL_LABEL: Record<PdfKapitelId, string> = {
  deckblatt: "Deckblatt",
  kennzahlen: "Kennzahlen im Überblick",
  kapital: "Kapitalbedarf und Finanzierung",
  investitionen: "Investitionen und Abschreibungen",
  umsatz: "Umsatz und Kosten",
  rentabilitaet: "Rentabilität",
  liquiditaet: "Liquidität",
  tragfaehigkeit: "Tragfähigkeit mit Lebenshaltung",
  steuern: "Steuern",
  diagramme: "Diagramme",
  pruefung: "Prüfungsmeldungen",
  vergleich: "Szenarienvergleich",
};

/** Alle Kapitel, so wie ein neuer Plan und eine Migration sie vorbelegen. */
export function standardPdfExport(): PdfExportEinstellungen {
  return { kapitel: [...PDF_KAPITEL] };
}

/** Auswahl in der festen Kapitelfolge, jedes Kapitel höchstens einmal. */
export function normalisiereKapitel(auswahl: readonly PdfKapitelId[]): PdfKapitelId[] {
  const gesetzt = new Set(auswahl);
  return PDF_KAPITEL.filter((id) => gesetzt.has(id));
}

/**
 * Kapitel, die für diese Rechtsform ins PDF dürfen.
 * Die Tragfähigkeit gibt es nur bei Einzelunternehmen, Freiberuf und Personengesellschaften.
 * Die gespeicherte Auswahl wird dabei nicht verändert.
 */
export function kapitelFuerRechtsform(
  auswahl: readonly PdfKapitelId[],
  rechtsform: Rechtsform | undefined,
): PdfKapitelId[] {
  return normalisiereKapitel(auswahl).filter(
    (id) => id !== "tragfaehigkeit" || istPersonenunternehmen(rechtsform),
  );
}

/** Deutlicher Vermerk für das Deckblatt. Nur bei mindestens einem Fehler, nicht bei Warnungen. */
export function fehlerVermerkText(anzahl: number): string | null {
  if (anzahl <= 0) return null;
  const menge = anzahl === 1 ? "1 Fehler" : `${anzahl} Fehler`;
  return `Achtung: Dieser Stand enthält ${menge}. Der Export bleibt möglich. Alle Meldungen stehen im Kapitel Prüfung.`;
}

/** Dateiname aus Vorhaben und Kalendertag. Umlaute bleiben erhalten. */
export function pdfDateiname(vorhaben: string, datum: Date): string {
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
  return `${basis || "Finanzplan"}-${tag}.pdf`;
}

export function vorhabenName(firmenname: string, planName: string): string {
  const firma = firmenname.trim();
  if (firma) return firma;
  const plan = planName.trim();
  return plan || "Finanzplan";
}
