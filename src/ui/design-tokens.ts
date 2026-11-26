/**
 * Farbwerte der Oberfläche und des PDF.
 * Die App-Farben stehen als CSS-Variablen in src/index.css.
 * Recharts liest `farben` und `reihen`, weil SVG-Attribute keine CSS-Variablen auflösen.
 * `pdfFarben` und `pdfReihen` bleiben hell und hängen nicht am App-Theme.
 */

export const farben = {
  hintergrund: "#0b1426",
  flaeche: "#111d33",
  text: "#e8eef6",
  textGedaempft: "#9aa8bc",
  textAufAkzent: "#0b1426",
  linie: "#5a6a84",
  linieStark: "#6d7d97",
  akzent: "#c9a54c",
  akzentDunkel: "#b08e3a",
  akzentSanft: "#1c2618",
  fehler: "#f07a7a",
  fehlerHintergrund: "#3a1c22",
  warnung: "#e0893a",
  warnungHintergrund: "#3a2614",
  hinweis: "#7ec9d2",
  hinweisHintergrund: "#163038",
  zebra: "#151e36",
  hover: "#1a2744",
  jahr: "#1a2438",
  summe: "#18233a",
  tabellenkopf: "#0f1a30",
  nullinie: "#9aa8bc",
} as const;

/** Unterscheidbare Reihen für Diagramme in der App. */
export const reihen = {
  umsatz: "#c9a54c",
  kosten: "#e08a5a",
  ergebnis: "#7eb0d0",
  raum: "#6fbf9a",
  sonstige: "#d4b56a",
  neutral: "#9aa8bc",
  zinsen: "#e0893a",
  steuern: "#f07a7a",
  waren: "#c4a07a",
  reserve: "#6aa3b8",
} as const;

/** Helle Berichtsfarben. Dieselben Werte wie vor dem dunklen App-Theme. */
export const pdfFarben = {
  hintergrund: "#f3f4f6",
  flaeche: "#ffffff",
  text: "#1a1d21",
  textGedaempft: "#4b5563",
  textAufAkzent: "#ffffff",
  linie: "#d5dbe2",
  linieStark: "#7d8b99",
  akzent: "#1e4a73",
  akzentDunkel: "#17395a",
  akzentSanft: "#e6eef5",
  fehler: "#9b1c1c",
  fehlerHintergrund: "#fdecec",
  warnung: "#8a4b08",
  warnungHintergrund: "#fbf1e4",
  hinweis: "#0f5c66",
  hinweisHintergrund: "#e6f3f4",
  zebra: "#f6f7f9",
  hover: "#eef1f5",
  jahr: "#e7eef5",
  summe: "#eef1f4",
  tabellenkopf: "#f3f5f7",
  nullinie: "#6b7380",
} as const;

/** Diagrammreihen im PDF, hell und unabhängig von der App. */
export const pdfReihen = {
  umsatz: "#1e4a73",
  kosten: "#8a4f2b",
  ergebnis: "#3d6f8f",
  raum: "#3f6b5e",
  sonstige: "#8a7040",
  neutral: "#5c6570",
  zinsen: "#8a4b08",
  steuern: "#9b1c1c",
  waren: "#6e5144",
  reserve: "#2f5f73",
} as const;

export const DIAGRAMM_FARBE: Record<string, string> = {
  umsatz: reihen.umsatz,
  kosten: reihen.kosten,
  kontostand: reihen.umsatz,
  ergebnis: reihen.ergebnis,
  wareneinsatz: reihen.kosten,
  personal: reihen.umsatz,
  raumkosten: reihen.raum,
  "sonstige-kosten": reihen.sonstige,
  abschreibungen: reihen.neutral,
  zinsen: reihen.zinsen,
  steuern: reihen.steuern,
  eigenmittel: reihen.umsatz,
  darlehen: reihen.ergebnis,
  zuschuesse: reihen.raum,
  investitionen: reihen.kosten,
  gruendungskosten: reihen.zinsen,
  anlaufkosten: reihen.sonstige,
  "waren-erstbestand": reihen.waren,
  betriebsmittel: reihen.neutral,
  reserve: reihen.reserve,
};

const PDF_DIAGRAMM_FARBE: Record<string, string> = {
  umsatz: pdfReihen.umsatz,
  kosten: pdfReihen.kosten,
  kontostand: pdfReihen.umsatz,
  ergebnis: pdfReihen.ergebnis,
  wareneinsatz: pdfReihen.kosten,
  personal: pdfReihen.umsatz,
  raumkosten: pdfReihen.raum,
  "sonstige-kosten": pdfReihen.sonstige,
  abschreibungen: pdfReihen.neutral,
  zinsen: pdfReihen.zinsen,
  steuern: pdfReihen.steuern,
  eigenmittel: pdfReihen.umsatz,
  darlehen: pdfReihen.ergebnis,
  zuschuesse: pdfReihen.raum,
  investitionen: pdfReihen.kosten,
  gruendungskosten: pdfReihen.zinsen,
  anlaufkosten: pdfReihen.sonstige,
  "waren-erstbestand": pdfReihen.waren,
  betriebsmittel: pdfReihen.neutral,
  reserve: pdfReihen.reserve,
};

export const DIAGRAMM_PALETTE = [
  reihen.umsatz,
  reihen.kosten,
  reihen.ergebnis,
  reihen.raum,
  reihen.zinsen,
  reihen.neutral,
  reihen.steuern,
  reihen.sonstige,
] as const;

export function diagrammFarbe(id: string): string {
  return DIAGRAMM_FARBE[id] ?? farben.textGedaempft;
}

export function pdfDiagrammFarbe(id: string): string {
  return PDF_DIAGRAMM_FARBE[id] ?? pdfFarben.textGedaempft;
}

/** Muss deckungsgleich mit dem :root-Block in src/index.css sein. */
export const cssVariablen = {
  "--hintergrund": farben.hintergrund,
  "--flaeche": farben.flaeche,
  "--text": farben.text,
  "--text-gedaempft": farben.textGedaempft,
  "--text-auf-akzent": farben.textAufAkzent,
  "--linie": farben.linie,
  "--linie-stark": farben.linieStark,
  "--akzent": farben.akzent,
  "--akzent-dunkel": farben.akzentDunkel,
  "--akzent-sanft": farben.akzentSanft,
  "--fehler": farben.fehler,
  "--fehler-hintergrund": farben.fehlerHintergrund,
  "--warnung": farben.warnung,
  "--warnung-hintergrund": farben.warnungHintergrund,
  "--hinweis": farben.hinweis,
  "--hinweis-hintergrund": farben.hinweisHintergrund,
  "--zebra": farben.zebra,
  "--hover": farben.hover,
  "--jahr": farben.jahr,
  "--summe": farben.summe,
  "--tabellenkopf": farben.tabellenkopf,
  "--nullinie": farben.nullinie,
  "--reihe-umsatz": reihen.umsatz,
  "--reihe-kosten": reihen.kosten,
  "--reihe-ergebnis": reihen.ergebnis,
  "--reihe-raum": reihen.raum,
  "--reihe-sonstige": reihen.sonstige,
  "--reihe-neutral": reihen.neutral,
  "--reihe-zinsen": reihen.zinsen,
  "--reihe-steuern": reihen.steuern,
  "--reihe-waren": reihen.waren,
  "--reihe-reserve": reihen.reserve,
} as const;
