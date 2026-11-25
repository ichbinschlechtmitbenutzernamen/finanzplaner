import { NUTZ_HOCH, NUTZ_QUER } from "./pdf-stil.ts";

/**
 * Zeilenhöhe von Roboto: (Ascender − Descender) / UnitsPerEm,
 * gemessen an der lateinischen Schnittdatei.
 */
export const ROBOTO_ZEILE = 2400 / 2048;

/** Konservative Zeichenbreite, damit die Höhen eher zu hoch als zu niedrig ausfallen. */
const ZEICHEN = 0.5;
const LEERZEICHEN = 0.25;

/** Innenbreite einer Zelle: links 2 oder 8 bei Einzug, rechts 2, rechter Rand 0,4. */
export function zellenTextBreite(spalte: number, einzug: boolean): number {
  return Math.max(spalte - (einzug ? 8 : 2) - 2 - 0.4, 1);
}

export const MONATS_LABEL = 118;
export const JAHRES_LABEL = 188;

export interface TabellenDichte {
  schrift: number;
  polster: number;
  verkleinert: boolean;
}

export const DICHTE_MONAT: TabellenDichte = { schrift: 6.4, polster: 1.5, verkleinert: false };
export const DICHTE_JAHR: TabellenDichte = { schrift: 7.5, polster: 2, verkleinert: false };

export interface MessZelle {
  text: string;
  breite: number;
}

export interface HoehenBudget {
  seite: number;
  /** Überschrift, Legende und Abstände über der Tabelle. */
  davor: number;
  sicherheit?: number;
}

interface ZeileMitText {
  bezeichnung: string;
  einzug: boolean;
}

/** Wie viele Zeilen der Text in der gegebenen Breite braucht. Wörter werden nicht getrennt. */
export function textZeilen(text: string, breite: number, schrift: number): number {
  const nutz = Math.max(breite, schrift);
  let zeilen = 0;
  for (const absatz of text.split("\n")) {
    const woerter = absatz.split(/\s+/).filter((wort) => wort.length > 0);
    if (woerter.length === 0) {
      zeilen += 1;
      continue;
    }
    let rest = nutz;
    let anzahl = 1;
    for (const wort of woerter) {
      const wortBreite = wort.length * schrift * ZEICHEN;
      const leer = schrift * LEERZEICHEN;
      if (wortBreite >= nutz) {
        if (rest < nutz) anzahl += 1;
        rest = nutz;
        continue;
      }
      const bedarf = wortBreite + (rest < nutz ? leer : 0);
      if (bedarf > rest) {
        anzahl += 1;
        rest = nutz - wortBreite;
      } else {
        rest -= bedarf;
      }
    }
    zeilen += anzahl;
  }
  return zeilen;
}

export function reiheHoehe(zellen: readonly MessZelle[], dichte: TabellenDichte): number {
  const zeilen = Math.max(
    1,
    ...zellen.map((zelle) => textZeilen(zelle.text, zelle.breite, dichte.schrift)),
  );
  return dichte.polster * 2 + ROBOTO_ZEILE * dichte.schrift * zeilen + 0.4;
}

export function tabelleHoehe(
  reihen: readonly (readonly MessZelle[])[],
  dichte: TabellenDichte,
): number {
  return reihen.reduce((summe, reihe) => summe + reiheHoehe(reihe, dichte), 0);
}

export function stapelHoehe(
  teile: readonly {
    text: string;
    schrift: number;
    breite: number;
    oben?: number;
    unten?: number;
    /** Zeilenfaktor. Ohne Angabe gilt die Roboto-Metrik. */
    faktor?: number;
  }[],
): number {
  return teile.reduce((summe, teil) => {
    const zeilen = textZeilen(teil.text, teil.breite, teil.schrift);
    const proZeile = (teil.faktor ?? ROBOTO_ZEILE) * teil.schrift;
    return summe + (teil.oben ?? 0) + proZeile * zeilen + (teil.unten ?? 0);
  }, 0);
}

function runde(wert: number): number {
  return Math.round(wert * 10) / 10;
}

function dichteStufen(normal: TabellenDichte): TabellenDichte[] {
  const stufen: TabellenDichte[] = [normal];
  for (let stufe = 1; stufe <= 8; stufe += 1) {
    const schrift = Math.max(4.5, runde(normal.schrift - stufe * 0.25));
    const polster = Math.max(0.5, runde(normal.polster - stufe * 0.15));
    const letzte = stufen.at(-1);
    if (letzte && letzte.schrift === schrift && letzte.polster === polster) break;
    stufen.push({ schrift, polster, verkleinert: true });
  }
  return stufen;
}

function grenzeVon(budget: HoehenBudget): number {
  return budget.seite - budget.davor - (budget.sicherheit ?? 10);
}

/** Kleinere Schrift, sobald die Tabelle sonst höher als die Seite wäre. */
export function dichtePassend(
  reihen: readonly (readonly MessZelle[])[],
  normal: TabellenDichte,
  budget: HoehenBudget,
): TabellenDichte {
  const grenze = grenzeVon(budget);
  const stufen = dichteStufen(normal);
  for (const dichte of stufen) {
    if (tabelleHoehe(reihen, dichte) <= grenze) return dichte;
  }
  return stufen.at(-1) ?? normal;
}

export function monatsReihen(zeilen: readonly ZeileMitText[]): MessZelle[][] {
  return [
    [{ text: "Posten", breite: zellenTextBreite(MONATS_LABEL, false) }],
    ...zeilen.map((zeile) => [
      { text: zeile.bezeichnung, breite: zellenTextBreite(MONATS_LABEL, zeile.einzug) },
    ]),
  ];
}

export function jahresReihen(zeilen: readonly ZeileMitText[]): MessZelle[][] {
  return [
    [{ text: "Posten", breite: zellenTextBreite(JAHRES_LABEL, false) }],
    ...zeilen.map((zeile) => [
      { text: zeile.bezeichnung, breite: zellenTextBreite(JAHRES_LABEL, zeile.einzug) },
    ]),
  ];
}

export function einfacheReihen(
  kopf: readonly string[],
  zeilen: readonly (readonly string[])[],
  breiten: readonly number[],
): MessZelle[][] {
  const zeile = (texte: readonly string[]): MessZelle[] =>
    texte.map((text, index) => ({
      text,
      breite: zellenTextBreite(breiten[index] ?? 60, false),
    }));
  return [zeile(kopf), ...zeilen.map((eintrag) => zeile(eintrag))];
}

export interface TabellenGruppen<T> {
  dichte: TabellenDichte;
  gruppen: T[][];
  /** True, wenn selbst die kleinste Stufe höher als eine Seite wäre. */
  geteilt: boolean;
}

/**
 * Eine Tabelle, wenn sie auf die Seite passt. Sonst zuerst kleinere Schrift,
 * und nur wenn das nicht reicht, mehrere Blöcke mit jeweils eigenem Kopf.
 */
export function gruppenFuerSeite<T extends ZeileMitText>(
  zeilen: readonly T[],
  reihenVon: (zeilen: readonly T[]) => MessZelle[][],
  normal: TabellenDichte,
  budget: HoehenBudget,
): TabellenGruppen<T> {
  const grenze = grenzeVon(budget);
  const dichte = dichtePassend(reihenVon(zeilen), normal, budget);
  if (tabelleHoehe(reihenVon(zeilen), dichte) <= grenze) {
    return { dichte, gruppen: [[...zeilen]], geteilt: false };
  }
  const gruppen: T[][] = [];
  let aktuell: T[] = [];
  for (const zeile of zeilen) {
    const probe = [...aktuell, zeile];
    if (tabelleHoehe(reihenVon(probe), dichte) <= grenze) {
      aktuell = probe;
      continue;
    }
    if (aktuell.length > 0) gruppen.push(aktuell);
    aktuell = [zeile];
  }
  if (aktuell.length > 0) gruppen.push(aktuell);
  return { dichte, gruppen, geteilt: true };
}

export function monatsGruppen<T extends ZeileMitText>(zeilen: readonly T[], davor: number) {
  return gruppenFuerSeite(zeilen, monatsReihen, DICHTE_MONAT, { seite: NUTZ_QUER, davor });
}

export function jahresGruppen<T extends ZeileMitText>(zeilen: readonly T[], davor: number) {
  return gruppenFuerSeite(zeilen, jahresReihen, DICHTE_JAHR, { seite: NUTZ_HOCH, davor });
}
