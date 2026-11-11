import type { Planberechnung } from "../calc/types.ts";
import type { AfaMethode, InvestitionsKategorie, Tilgungsart } from "../types.ts";
import { bestand, bewegung, type Planjahr } from "./planjahr.ts";
import type { Anlagenplan, Darlehensplaene } from "./typen.ts";

const KATEGORIE: Record<InvestitionsKategorie, string> = {
  immateriell: "Immateriell",
  maschine_ausstattung: "Maschine und Ausstattung",
  fahrzeug: "Fahrzeug",
  buero_einrichtung: "Büro und Einrichtung",
  it: "IT",
  sonstiges: "Sonstiges",
};

const METHODE: Record<AfaMethode, string> = {
  linear: "linear",
  sofort_gwg: "geringwertiges Wirtschaftsgut",
  sammelposten: "Sammelposten, 60 Monate",
};

const TILGUNG: Record<Tilgungsart, string> = {
  annuitaet: "Annuität",
  ratentilgung: "Ratentilgung",
  endfaellig: "endfällig",
};

const DARLEHEN_HINWEIS =
  "Gezeigt werden Zins, Tilgung und Restschuld in den Planmonaten. Die Restschuld am letzten Planmonat bleibt stehen, auch wenn die Laufzeit darüber hinausgeht. Der erste Monat einer Auszahlung hat noch keine Rate.";

/** AfA-Plan je Anlagegut, einschließlich Sofortaufwand unter 250 Euro. */
export function anlagenplan(ergebnis: Planberechnung, jahre: readonly Planjahr[]): Anlagenplan {
  const positionen = ergebnis.investitionen.anlagen.map((anlage) => ({
    id: anlage.id,
    bezeichnung: anlage.bezeichnung,
    kategorie: KATEGORIE[anlage.kategorie],
    methode: METHODE[anlage.afaMethode],
    behandlung: anlage.behandlung === "sofortaufwand" ? "Sofortaufwand" : "Abschreibung",
    aktivierungCents: anlage.aktivierungCents,
    restwertCents: anlage.restwertCents,
    abschreibung: bewegung(`afa-${anlage.id}`, "Abschreibung", anlage.abschreibungCents, jahre),
    buchwert: bestand(
      `buchwert-${anlage.id}`,
      "Buchwert",
      anlage.buchwertCents,
      jahre,
      "monatsende",
    ),
    sofortaufwand: bewegung(
      `sofort-${anlage.id}`,
      "Sofortaufwand",
      anlage.sofortaufwandCents,
      jahre,
    ),
    auszahlung: bewegung(`auszahlung-${anlage.id}`, "Auszahlung", anlage.auszahlungCents, jahre),
  }));

  return {
    positionen,
    summeAbschreibung: bewegung(
      "summe-abschreibung",
      "Summe Abschreibungen",
      ergebnis.investitionen.summeAbschreibungCents,
      jahre,
      { rolle: "summe" },
    ),
    summeBuchwert: bestand(
      "summe-buchwert",
      "Summe Buchwerte",
      ergebnis.investitionen.summeBuchwertCents,
      jahre,
      "monatsende",
      { rolle: "summe" },
    ),
    summeSofortaufwand: bewegung(
      "summe-sofortaufwand",
      "Summe Sofortaufwand",
      ergebnis.investitionen.summeSofortaufwandCents,
      jahre,
      { rolle: "summe" },
    ),
  };
}

/** Darlehensplan je Darlehen für die Monate im Horizont. */
export function darlehensplaene(
  ergebnis: Planberechnung,
  jahre: readonly Planjahr[],
): Darlehensplaene {
  const darlehen = ergebnis.finanzierung.darlehen.map((darlehen) => ({
    id: darlehen.id,
    bezeichnung: darlehen.bezeichnung,
    geber: darlehen.geber,
    tilgungsart: TILGUNG[darlehen.tilgungsart],
    nominalzinsPa: darlehen.nominalzinsPa,
    nominalCents: darlehen.nominalCents,
    laufzeitMonate: darlehen.laufzeitMonate,
    tilgungsfreieMonate: darlehen.tilgungsfreieMonate,
    auszahlung: bewegung(
      `auszahlung-${darlehen.id}`,
      "Auszahlung",
      darlehen.auszahlungCents,
      jahre,
    ),
    zins: bewegung(`zins-${darlehen.id}`, "Zins", darlehen.zinsCents, jahre),
    tilgung: bewegung(`tilgung-${darlehen.id}`, "Tilgung", darlehen.tilgungCents, jahre),
    rate: bewegung(`rate-${darlehen.id}`, "Rate", darlehen.rateCents, jahre),
    restschuld: bestand(
      `restschuld-${darlehen.id}`,
      "Restschuld",
      darlehen.restschuldCents,
      jahre,
      "monatsende",
    ),
  }));

  const laenge = ergebnis.monate.length;
  return {
    darlehen,
    summeZins: bewegung(
      "summe-zins",
      "Summe Zinsen",
      reihe(ergebnis.finanzierung.summeZinsCents, laenge),
      jahre,
      { rolle: "summe" },
    ),
    summeTilgung: bewegung(
      "summe-tilgung",
      "Summe Tilgung",
      reihe(ergebnis.finanzierung.summeTilgungCents, laenge),
      jahre,
      { rolle: "summe" },
    ),
    summeRestschuld: bestand(
      "summe-restschuld",
      "Summe Restschuld",
      reihe(ergebnis.finanzierung.summeRestschuldCents, laenge),
      jahre,
      "monatsende",
      { rolle: "summe" },
    ),
    hinweis: DARLEHEN_HINWEIS,
  };
}

/** Ohne Darlehen liefert der Rechenkern leere Reihen. Der Plan bleibt trotzdem 36 Monate lang. */
function reihe(werte: readonly number[], laenge: number): number[] {
  if (werte.length === laenge) return [...werte];
  const ziel = Array.from({ length: laenge }, () => 0);
  werte.forEach((wert, index) => {
    if (index < laenge) ziel[index] = wert;
  });
  return ziel;
}
