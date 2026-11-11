import type { IsoMonth } from "../types.ts";
import { findeZeile, kumuliert, quote, type Bewegungszeile } from "./planjahr.ts";
import type { Berichte, KapitalPosten } from "./typen.ts";

/**
 * Daten für Kennzahlen und Diagramme. Alles stammt aus den Berichten.
 * Die Funktionen kennen kein React, damit Tabelle, Seite und später das PDF
 * dieselbe Vorbereitung nutzen.
 */

/** Zeilen, die in der Rentabilität vom Umsatz zum Ergebnis nach Steuern abgehen. */
export const KOSTEN_ZEILEN = [
  "wareneinsatz",
  "personal",
  "raumkosten",
  "sonstige-kosten",
  "abschreibungen",
  "zinsen",
  "steuern",
] as const;

export type Zeitmodus = "monate" | "planjahre";

export interface PlanjahrKpi {
  nummer: number;
  bezeichnung: string;
  vonMonat: IsoMonth;
  bisMonat: IsoMonth;
  umsatzCents: number;
  ergebnisNachSteuernCents: number;
  rohertragsquote: number | null;
  personalkostenquote: number | null;
}

export interface UeberblickKpis {
  planjahre: PlanjahrKpi[];
  gesamt: {
    umsatzCents: number;
    ergebnisNachSteuernCents: number;
    rohertragsquote: number | null;
    personalkostenquote: number | null;
  };
  breakEven: Berichte["kennzahlen"]["breakEven"];
  tiefsterKontostandCents: number;
  tiefsterKontostandMonat: IsoMonth | null;
  kontokorrentbedarfCents: number;
  eigenkapitalquote: number | null;
  eigenmittelCents: number;
  finanzierungCents: number;
  tragfaehigkeit: {
    anwendbar: boolean;
    alleTragfaehig: boolean | null;
    hinweis: string;
    personen: {
      personId: string;
      name: string;
      planjahr2Cents: number | null;
      tragfaehig: boolean | null;
    }[];
  };
}

export interface Vergleichspunkt {
  schluessel: string;
  umsatzCents: number;
  kostenCents: number;
}

export interface KontostandPunkt {
  schluessel: string;
  standCents: number;
  /** Tiefster Punkt der angezeigten Reihe. Bei Monaten ist das der Berichtswert. */
  istMinimumDerReihe: boolean;
}

export interface KontostandVerlauf {
  punkte: KontostandPunkt[];
  tiefsterKontostandCents: number;
  tiefsterKontostandMonat: IsoMonth | null;
  kontokorrentbedarfCents: number;
}

export interface ErgebnisPunkt {
  schluessel: string;
  kumuliertCents: number;
}

export interface Kostenanteil {
  id: string;
  bezeichnung: string;
  betragCents: number;
}

export interface KostenstrukturPunkt {
  schluessel: string;
  anteile: Kostenanteil[];
}

export interface MittelSegment {
  id: string;
  bezeichnung: string;
  betragCents: number;
}

export interface MittelGruppe {
  schluessel: string;
  herkunft: MittelSegment[];
  verwendung: MittelSegment[];
}

/** Kacheln des Überblicks, je Planjahr und für den Horizont. */
export function ueberblickKpis(berichte: Berichte): UeberblickKpis {
  const umsatz = findeZeile(berichte.rentabilitaet.zeilen, "umsatz");
  const ergebnis = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
  const personal = findeZeile(berichte.rentabilitaet.zeilen, "personal");
  const roh = berichte.kennzahlen.rohertragsquote;

  return {
    planjahre: berichte.planjahre.map((jahr, index) => ({
      nummer: jahr.nummer,
      bezeichnung: jahr.bezeichnung,
      vonMonat: jahr.vonMonat,
      bisMonat: jahr.bisMonat,
      umsatzCents: umsatz.planjahreCents[index] ?? 0,
      ergebnisNachSteuernCents: ergebnis.planjahreCents[index] ?? 0,
      rohertragsquote: roh.planjahre[index]?.quote ?? null,
      personalkostenquote: quote(
        personal.planjahreCents[index] ?? 0,
        umsatz.planjahreCents[index] ?? 0,
      ),
    })),
    gesamt: {
      umsatzCents: umsatz.summeCents,
      ergebnisNachSteuernCents: ergebnis.summeCents,
      rohertragsquote: roh.gesamt.quote,
      personalkostenquote: quote(personal.summeCents, umsatz.summeCents),
    },
    breakEven: berichte.kennzahlen.breakEven,
    tiefsterKontostandCents: berichte.kennzahlen.tiefsterLiquiditaetsstandCents,
    tiefsterKontostandMonat: berichte.kennzahlen.tiefsterLiquiditaetsstandMonat,
    kontokorrentbedarfCents: berichte.kennzahlen.kontokorrentbedarfCents,
    eigenkapitalquote: berichte.kennzahlen.eigenkapitalquote,
    eigenmittelCents: berichte.kennzahlen.eigenmittelCents,
    finanzierungCents: berichte.kennzahlen.finanzierungCents,
    tragfaehigkeit: {
      anwendbar: berichte.tragfaehigkeit.anwendbar,
      alleTragfaehig: berichte.tragfaehigkeit.alleTragfaehig,
      hinweis: berichte.tragfaehigkeit.hinweis,
      personen: berichte.tragfaehigkeit.personen.map((person) => ({
        personId: person.personId,
        name: person.name,
        planjahr2Cents: person.planjahr2Cents,
        tragfaehig: person.tragfaehig,
      })),
    },
  };
}

/** Umsatz und die Kosten der Rentabilitätsvorschau, je Monat oder je Planjahr. */
export function umsatzGegenKosten(berichte: Berichte, modus: Zeitmodus): Vergleichspunkt[] {
  const umsatz = findeZeile(berichte.rentabilitaet.zeilen, "umsatz");
  const kosten = kostenZeilen(berichte);
  if (modus === "monate") {
    return berichte.monate.map((monat, index) => ({
      schluessel: monat,
      umsatzCents: umsatz.monateCents[index] ?? 0,
      kostenCents: summeFeld(kosten, "monateCents", index),
    }));
  }
  return berichte.planjahre.map((jahr, index) => ({
    schluessel: jahr.bezeichnung,
    umsatzCents: umsatz.planjahreCents[index] ?? 0,
    kostenCents: summeFeld(kosten, "planjahreCents", index),
  }));
}

/** Kontostand am Monatsende, oder am Ende des Planjahres. Die Null bleibt die Bezugsgröße. */
export function kontostandVerlauf(berichte: Berichte, modus: Zeitmodus): KontostandVerlauf {
  const endbestand = berichte.liquiditaet.endbestand;
  const roh =
    modus === "monate"
      ? berichte.monate.map((monat, index) => ({
          schluessel: monat,
          standCents: endbestand.monateCents[index] ?? 0,
        }))
      : berichte.planjahre.map((jahr, index) => ({
          schluessel: jahr.bezeichnung,
          standCents: endbestand.planjahreCents[index] ?? 0,
        }));
  const minimum = indexDesMinimums(roh.map((punkt) => punkt.standCents));
  return {
    punkte: roh.map((punkt, index) => ({ ...punkt, istMinimumDerReihe: index === minimum })),
    tiefsterKontostandCents: berichte.kennzahlen.tiefsterLiquiditaetsstandCents,
    tiefsterKontostandMonat: berichte.kennzahlen.tiefsterLiquiditaetsstandMonat,
    kontokorrentbedarfCents: berichte.kennzahlen.kontokorrentbedarfCents,
  };
}

/** Laufende Summe des Ergebnisses nach Steuern. */
export function kumuliertesErgebnis(berichte: Berichte, modus: Zeitmodus): ErgebnisPunkt[] {
  const ergebnis = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
  if (modus === "monate") {
    return kumuliert(ergebnis.monateCents).map((wert, index) => ({
      schluessel: berichte.monate[index] ?? String(index),
      kumuliertCents: wert,
    }));
  }
  return kumuliert(ergebnis.planjahreCents).map((wert, index) => ({
    schluessel: berichte.planjahre[index]?.bezeichnung ?? `Planjahr ${index + 1}`,
    kumuliertCents: wert,
  }));
}

/** Gestapelte Kosten aus den Zeilen der Rentabilitätsvorschau. */
export function kostenstruktur(berichte: Berichte, modus: Zeitmodus): KostenstrukturPunkt[] {
  const zeilen = kostenZeilen(berichte);
  if (modus === "monate") {
    return berichte.monate.map((monat, index) => ({
      schluessel: monat,
      anteile: anteile(zeilen, "monateCents", index),
    }));
  }
  return berichte.planjahre.map((jahr, index) => ({
    schluessel: jahr.bezeichnung,
    anteile: anteile(zeilen, "planjahreCents", index),
  }));
}

/**
 * Mittelherkunft ist die Finanzierung, Mittelverwendung der Kapitalbedarf.
 * Beträge außerhalb der 36 Monate stehen nur in der Summe des Berichts, nicht in den Balken.
 */
export function mittelherkunftVerwendung(berichte: Berichte, modus: Zeitmodus): MittelGruppe[] {
  const herkunft = berichte.kapital.finanzierung;
  const verwendung = berichte.kapital.bedarf;
  if (modus === "monate") {
    return berichte.monate.map((monat, index) => ({
      schluessel: monat,
      herkunft: segmente(herkunft, "monateCents", index),
      verwendung: segmente(verwendung, "monateCents", index),
    }));
  }
  return berichte.planjahre.map((jahr, index) => ({
    schluessel: jahr.bezeichnung,
    herkunft: segmente(herkunft, "planjahreCents", index),
    verwendung: segmente(verwendung, "planjahreCents", index),
  }));
}

function kostenZeilen(berichte: Berichte): Bewegungszeile[] {
  return KOSTEN_ZEILEN.map((id) => findeZeile(berichte.rentabilitaet.zeilen, id));
}

function anteile(
  zeilen: readonly Bewegungszeile[],
  feld: "monateCents" | "planjahreCents",
  index: number,
): Kostenanteil[] {
  return zeilen.map((zeile) => ({
    id: zeile.id,
    bezeichnung: zeile.bezeichnung,
    betragCents: zeile[feld][index] ?? 0,
  }));
}

function summeFeld(
  zeilen: readonly Bewegungszeile[],
  feld: "monateCents" | "planjahreCents",
  index: number,
): number {
  return zeilen.reduce((summe, zeile) => summe + (zeile[feld][index] ?? 0), 0);
}

function segmente(
  posten: readonly KapitalPosten[],
  feld: "monateCents" | "planjahreCents",
  index: number,
): MittelSegment[] {
  return posten.map((item) => ({
    id: item.id,
    bezeichnung: item.bezeichnung,
    betragCents: item[feld][index] ?? 0,
  }));
}

function indexDesMinimums(werte: readonly number[]): number {
  let index = werte.length > 0 ? 0 : -1;
  werte.forEach((wert, kandidat) => {
    const bisher = werte[index];
    if (bisher == null || wert < bisher) index = kandidat;
  });
  return index;
}
