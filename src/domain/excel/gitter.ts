export const MONATE = 36;

export const FORMAT = {
  euro: "#,##0.00 [$€-407];[Red]-#,##0.00 [$€-407]",
  cent: "#,##0;[Red]-#,##0",
  prozent: "0.00%",
  quote: "0.00%",
  zahl: "#,##0.00",
  ganzzahl: "#,##0",
  faktor: "0.00",
} as const;

export type Zahlenformat = keyof typeof FORMAT;

export type Zellenstil =
  "normal" | "eingabe" | "formel" | "kopf" | "ergebnis" | "abschnitt" | "hinweis";

export interface Zelle {
  text?: string;
  zahl?: number;
  formel?: string;
  ergebnis?: number | string;
  format?: Zahlenformat;
  stil?: Zellenstil;
}

/** 1-basiert, A = 1. */
export function spalteName(nummer: number): string {
  let rest = nummer;
  let name = "";
  while (rest > 0) {
    const ziffer = (rest - 1) % 26;
    name = String.fromCharCode(65 + ziffer) + name;
    rest = Math.floor((rest - 1) / 26);
  }
  return name;
}

/**
 * Berichtsspalte eines Planmonats. Spalte 1 ist die Beschriftung,
 * danach zwölf Monate und eine Jahressumme, dreimal.
 */
export function berichtSpalte(monatIndex: number): number {
  const jahr = Math.floor(monatIndex / 12);
  return 2 + jahr * 13 + (monatIndex % 12);
}

/** Jahressumme, Planjahr 1 bis 3. */
export function jahrSummenSpalte(planjahr: number): number {
  return 1 + planjahr * 13;
}

export class Blatt {
  readonly zeilen: Zelle[][] = [];
  readonly spaltenbreite: number[] = [];
  fixierenZeile = 1;
  fixierenSpalte = 1;
  quer = true;
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  zeile(...zellen: Zelle[]): number {
    this.zeilen.push(zellen);
    return this.zeilen.length;
  }

  /** Hängt eine Zeile an und gibt die 1-basierte Nummer zurück. */
  setze(zeile: number, spalte: number, zelle: Zelle): void {
    const row = this.zeilen[zeile - 1];
    if (!row) throw new Error(`Zeile ${zeile} fehlt auf ${this.name}.`);
    while (row.length < spalte) row.push({});
    row[spalte - 1] = zelle;
  }

  ref(zeile: number, spalte: number): string {
    return `'${this.name.replaceAll("'", "''")}'!$${spalteName(spalte)}$${zeile}`;
  }

  lokal(zeile: number, spalte: number): string {
    return `$${spalteName(spalte)}$${zeile}`;
  }

  breite(spalte: number, breite: number): void {
    this.spaltenbreite[spalte - 1] = breite;
  }
}

export interface Reihe {
  blatt: Blatt;
  zeile: number;
  cents: number[];
}

export function monatsCent(
  blatt: Blatt,
  label: string,
  formeln: readonly string[],
  cents: readonly number[],
  stil: Zellenstil = "formel",
): Reihe {
  const zellen: Zelle[] = formeln.map((formel, index) => ({
    formel,
    ergebnis: cents[index] ?? 0,
    format: "cent",
    stil,
  }));
  const zeile = blatt.zeile(
    { text: label, stil: stil === "ergebnis" ? "ergebnis" : "normal" },
    ...zellen,
  );
  return { blatt, zeile, cents: [...cents] };
}

export function wertCent(blatt: Blatt, label: string, formel: string, cent: number): string {
  const zeile = blatt.zeile(
    { text: label },
    { formel, ergebnis: cent, format: "cent", stil: "formel" },
  );
  return blatt.ref(zeile, 2);
}

/** Bereich aus zwei absoluten Bezügen derselben Zeile, zum Beispiel B10:AK10. */
export function zeilenBereich(anfang: string, ende: string): string {
  const rechts = ende.split("!").pop() ?? ende;
  return `${anfang}:${rechts}`;
}
