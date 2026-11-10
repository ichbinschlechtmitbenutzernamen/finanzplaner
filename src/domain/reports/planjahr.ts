import { parseIsoMonth } from "../months.ts";
import { summeCents, verteilteRaten } from "../calc/index.ts";
import type { IsoMonth, Rechtsform } from "../types.ts";

/** Miete und Nebenkosten. Alles andere an laufenden Kosten ist sonstiger Aufwand. */
export const RAUMKOSTEN_KATEGORIEN = ["miete", "nebenkosten"] as const;

/**
 * Erster Planmonat, ab dem das Ergebnis nach Steuern positiv bleibt.
 * Ein früherer positiver Monat zählt nicht, sobald danach wieder ein Monat
 * ohne positives Ergebnis kommt. Null gilt nicht als positiv.
 */
export const BREAK_EVEN_DEFINITION =
  "Break-even-Monat ist der erste Planmonat, in dem das Ergebnis nach Steuern positiv ist und jeder folgende Planmonat ebenfalls positiv bleibt. Null oder ein negativer Monat beendet die Reihe. Ein früherer positiver Monat zählt nicht, wenn danach wieder ein Monat ohne positives Ergebnis kommt. Ist der letzte Planmonat nicht positiv, ist der Break-even im Horizont nicht erreicht.";

export interface Planjahr {
  /** 1 = Monate 1–12 ab Gründungsmonat, nicht das Kalenderjahr. */
  nummer: number;
  bezeichnung: string;
  /** Einschließlich. */
  vonIndex: number;
  /** Ausschließlich. */
  bisIndex: number;
  vonMonat: IsoMonth;
  bisMonat: IsoMonth;
}

export type Zeilenrolle = "normal" | "ergebnis" | "summe" | "nachricht";

export interface Bewegungszeile {
  art: "bewegung";
  id: string;
  bezeichnung: string;
  /** Cent je Planmonat. Positive Kostenzeilen sind Aufwand, keine negativen Beträge. */
  monateCents: number[];
  /** Summe der Monate des Planjahres. */
  planjahreCents: number[];
  summeCents: number;
  rolle: Zeilenrolle;
  /**
   * Erläutert die Zeile. Die Unterzeilen sind in den Monaten schon enthalten
   * und werden nicht noch einmal addiert.
   */
  unterzeilen?: Bewegungszeile[];
}

export interface Bestandszeile {
  art: "bestand";
  id: string;
  bezeichnung: string;
  monateCents: number[];
  /**
   * Bei `monatsende` der Bestand am Ende des Planjahres,
   * bei `monatsanfang` der Bestand am ersten Tag des Planjahres.
   */
  planjahreCents: number[];
  /** Erster Bestand bei Monatsanfang, letzter Bestand bei Monatsende. */
  horizontWertCents: number;
  stichtag: "monatsanfang" | "monatsende";
  rolle: Zeilenrolle;
}

const PERSONENUNTERNEHMEN = new Set<Rechtsform>([
  "einzelunternehmen",
  "freiberufler",
  "gbr",
  "ohg",
  "kg",
]);

export function istPersonenunternehmen(rechtsform: Rechtsform | undefined): boolean {
  return rechtsform != null && PERSONENUNTERNEHMEN.has(rechtsform);
}

export function istKapitalgesellschaft(rechtsform: Rechtsform | undefined): boolean {
  return rechtsform === "gmbh" || rechtsform === "ug";
}

/** Planjahre zu je 12 Monaten ab dem ersten Planmonat. Ein Rumpf am Ende bleibt ein eigenes Planjahr. */
export function planjahreVon(monate: readonly IsoMonth[]): Planjahr[] {
  const jahre: Planjahr[] = [];
  for (let vonIndex = 0; vonIndex < monate.length; vonIndex += 12) {
    const bisIndex = Math.min(vonIndex + 12, monate.length);
    const nummer = jahre.length + 1;
    jahre.push({
      nummer,
      bezeichnung: `Planjahr ${nummer}`,
      vonIndex,
      bisIndex,
      vonMonat: monate[vonIndex] ?? "",
      bisMonat: monate[bisIndex - 1] ?? "",
    });
  }
  return jahre;
}

export function bewegung(
  id: string,
  bezeichnung: string,
  monateCents: readonly number[],
  jahre: readonly Planjahr[],
  options?: {
    rolle?: Zeilenrolle;
    unterzeilen?: Bewegungszeile[];
  },
): Bewegungszeile {
  return {
    art: "bewegung",
    id,
    bezeichnung,
    monateCents: [...monateCents],
    planjahreCents: jahre.map((jahr) => summeBereich(monateCents, jahr.vonIndex, jahr.bisIndex)),
    summeCents: summeCents(monateCents),
    rolle: options?.rolle ?? "normal",
    unterzeilen: options?.unterzeilen,
  };
}

export function bestand(
  id: string,
  bezeichnung: string,
  monateCents: readonly number[],
  jahre: readonly Planjahr[],
  stichtag: "monatsanfang" | "monatsende",
  options?: { rolle?: Zeilenrolle },
): Bestandszeile {
  const planjahreCents = jahre.map((jahr) => {
    const index = stichtag === "monatsanfang" ? jahr.vonIndex : jahr.bisIndex - 1;
    return monateCents[index] ?? 0;
  });
  const horizontWertCents =
    stichtag === "monatsanfang"
      ? (monateCents[0] ?? 0)
      : (monateCents[monateCents.length - 1] ?? 0);
  return {
    art: "bestand",
    id,
    bezeichnung,
    monateCents: [...monateCents],
    planjahreCents,
    horizontWertCents,
    stichtag,
    rolle: options?.rolle ?? "normal",
  };
}

export function summeReihen(reihen: readonly (readonly number[])[]): number[] {
  const laenge = reihen.reduce((max, reihe) => Math.max(max, reihe.length), 0);
  const ziel = Array.from({ length: laenge }, () => 0);
  for (const reihe of reihen) {
    for (let index = 0; index < laenge; index += 1) {
      ziel[index] = (ziel[index] ?? 0) + (reihe[index] ?? 0);
    }
  }
  return ziel;
}

export function differenz(links: readonly number[], rechts: readonly number[]): number[] {
  const laenge = Math.max(links.length, rechts.length);
  return Array.from({ length: laenge }, (_, index) => (links[index] ?? 0) - (rechts[index] ?? 0));
}

export function leereCents(laenge: number): number[] {
  return Array.from({ length: laenge }, () => 0);
}

/**
 * Gleichmäßige Verteilung auf Cent. Jeder Monat außer dem letzten erhält den
 * gerundeten Anteil, der letzte den Rest. Würde der Rest negativ, wird abgerundet.
 */
export function verteileGleichmaessig(summe: number, monate: number): number[] {
  if (monate < 1) return [];
  const { regulaer, letzte } = verteilteRaten(summe, monate);
  const werte = Array.from({ length: monate }, () => regulaer);
  werte[monate - 1] = letzte;
  return werte;
}

/**
 * Legt die Steuer eines Kalenderjahres auf die Planmonate dieses Kalenderjahres.
 * Monate außerhalb des Plans bleiben ohne Anteil. Die Summe je Kalenderjahr bleibt erhalten.
 */
export function steuerAufMonate(
  monate: readonly IsoMonth[],
  jahre: readonly { jahr: number; steuerCents: number }[],
): number[] {
  const ziel = leereCents(monate.length);
  for (const jahr of jahre) {
    const indizes: number[] = [];
    monate.forEach((monat, index) => {
      if (parseIsoMonth(monat).year === jahr.jahr) indizes.push(index);
    });
    const teile = verteileGleichmaessig(jahr.steuerCents, indizes.length);
    indizes.forEach((index, teilIndex) => {
      ziel[index] = teile[teilIndex] ?? 0;
    });
  }
  return ziel;
}

export function breakEvenMonat(
  ergebnisNachSteuern: readonly number[],
  monate: readonly IsoMonth[],
): { erreicht: boolean; planmonat: number | null; monat: IsoMonth | null } {
  let letzterOhnePositivesErgebnis = -1;
  for (let index = 0; index < ergebnisNachSteuern.length; index += 1) {
    if ((ergebnisNachSteuern[index] ?? 0) <= 0) letzterOhnePositivesErgebnis = index;
  }
  const start = letzterOhnePositivesErgebnis + 1;
  if (start >= ergebnisNachSteuern.length) {
    return { erreicht: false, planmonat: null, monat: null };
  }
  return { erreicht: true, planmonat: start + 1, monat: monate[start] ?? null };
}

export function quote(zaehler: number, nenner: number): number | null {
  if (nenner === 0) return null;
  return zaehler / nenner;
}

export function findeZeile(zeilen: readonly Bewegungszeile[], id: string): Bewegungszeile {
  const gefunden = zeilen.find((zeile) => zeile.id === id);
  if (!gefunden) throw new Error(`Berichtszeile „${id}“ fehlt.`);
  return gefunden;
}

export function kumuliert(werte: readonly number[]): number[] {
  let stand = 0;
  return werte.map((wert) => {
    stand += wert;
    return stand;
  });
}

/** Negativer Betrag wird zum Zufluss, ein positiver bleibt 0. */
export function zufluss(werte: readonly number[]): number[] {
  return werte.map((wert) => (wert < 0 ? -wert : 0));
}

/** Positiver Betrag bleibt Auszahlung, ein negativer wird 0. */
export function abfluss(werte: readonly number[]): number[] {
  return werte.map((wert) => (wert > 0 ? wert : 0));
}

function summeBereich(werte: readonly number[], von: number, bis: number): number {
  let summe = 0;
  for (let index = von; index < bis; index += 1) summe += werte[index] ?? 0;
  return summe;
}
