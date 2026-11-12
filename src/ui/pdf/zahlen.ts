import type { IsoMonth, PersonRolle, PlanSzenarioArt, Rechtsform } from "../../domain/types.ts";
import { RECHTSFORM_LABEL } from "../../domain/labels.ts";
import {
  formatEingabeEuro,
  formatEuro,
  formatEuroAchse,
  formatMonatKurz,
  formatMonatLang,
  formatProzent,
} from "../format.ts";

/** Roboto-Latin enthält den Euro, aber nicht das Unicode-Minus und schmale Leerzeichen. */
function sauber(wert: string): string {
  return wert.replaceAll("−", "-").replaceAll("\u00a0", " ").replaceAll("\u202f", " ");
}

export function euro(cents: number): string {
  return sauber(formatEuro(cents));
}

/** Zahl ohne Währungszeichen, für enge Tabellenspalten. Die Überschrift sagt Euro. */
export function euroZahl(cents: number): string {
  return sauber(formatEingabeEuro(cents === 0 ? 0 : cents));
}

export function prozent(wert: number | null): string {
  if (wert == null) return "-";
  return sauber(formatProzent(wert));
}

export function faktor(wert: number | null): string {
  if (wert == null) return "-";
  return sauber(
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(wert),
  );
}

export function achse(cents: number): string {
  return sauber(formatEuroAchse(cents).replaceAll(" €", "").replaceAll("€", ""));
}

export function datumText(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function monatKurz(monat: IsoMonth): string {
  return formatMonatKurz(monat);
}

export function monatLang(monat: IsoMonth): string {
  return formatMonatLang(monat);
}

const ROLLE: Record<PersonRolle, string> = {
  inhaber: "Inhaberin oder Inhaber",
  freiberufler: "Freiberufler/in",
  gesellschafter: "Gesellschafter/in",
  komplementaer: "Komplementär/in",
  kommanditist: "Kommanditist/in",
  geschaeftsfuehrer: "Geschäftsführer/in",
};

export function rollenText(rollen: readonly PersonRolle[]): string {
  return rollen.map((rolle) => ROLLE[rolle]).join(", ");
}

export function personenUeberschrift(rechtsform: Rechtsform | undefined): string {
  if (rechtsform === "einzelunternehmen" || rechtsform === "freiberufler" || rechtsform == null) {
    return "Gründerin oder Gründer";
  }
  return "Gesellschafter";
}

export function rechtsformText(rechtsform: Rechtsform | undefined): string {
  return rechtsform ? RECHTSFORM_LABEL[rechtsform] : "Rechtsform noch offen";
}

export function artText(art: "basis" | PlanSzenarioArt): string {
  if (art === "basis") return "Basisplan";
  if (art === "abweichung") return "Abweichung";
  return "Kopie";
}

const DECKUNG = {
  ueberdeckung: "Überdeckung",
  deckungsluecke: "Deckungslücke",
  ausgeglichen: "ausgeglichen",
} as const;

export function deckungText(art: keyof typeof DECKUNG): string {
  return DECKUNG[art];
}
