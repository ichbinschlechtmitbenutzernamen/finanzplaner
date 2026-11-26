import { parseIsoMonth } from "../domain/months.ts";
import type { IsoMonth } from "../domain/types.ts";

const EURO = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const ZAHL = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MENGE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const PROZENT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const LANG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function formatEuro(cents: number): string {
  const betrag = cents === 0 ? 0 : cents;
  return EURO.format(betrag / 100);
}

/** Kürzere Achsenbeschriftung. Der Tooltip bleibt bei vollen Cent. */
export function formatEuroAchse(cents: number): string {
  if (!Number.isFinite(cents)) return "";
  const euro = cents / 100;
  const abs = Math.abs(euro);
  if (abs >= 1_000_000) {
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(euro / 1_000_000)} Mio. €`;
  }
  if (abs >= 10_000) {
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(euro / 1_000)} Tsd. €`;
  }
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(euro)} €`;
}

/** Zahl für das Eingabefeld, ohne Währungszeichen. */
export function formatEingabeEuro(cents: number): string {
  return ZAHL.format(cents / 100);
}

export function formatMenge(wert: number): string {
  return MENGE.format(wert);
}

export function formatProzent(anteil: number): string {
  return PROZENT.format(anteil);
}

export function formatMonatKurz(monat: IsoMonth): string {
  const { year, month } = parseIsoMonth(monat);
  return `${KURZ[month - 1] ?? monat} ${String(year).slice(2)}`;
}

export function formatMonatLang(monat: IsoMonth): string {
  const { year, month } = parseIsoMonth(monat);
  return `${LANG[month - 1] ?? monat} ${year}`;
}

const ZEITPUNKT = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

/** Datum und Uhrzeit für Hinweise, in der Zeitzone Europe/Berlin. */
export function formatZeitpunkt(iso: string): string {
  const zeit = Date.parse(iso);
  if (Number.isNaN(zeit)) return iso;
  return ZEITPUNKT.format(zeit);
}

export const KALENDER_KURZ = KURZ;
