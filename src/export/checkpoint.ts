import { summeCents, type Planberechnung } from "../domain/calc/index.ts";
import type { IsoMonth } from "../domain/types.ts";

const MONATSNAMEN = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

const KATEGORIE: Record<string, string> = {
  miete: "Miete",
  nebenkosten: "Nebenkosten",
  versicherung: "Versicherung",
  marketing: "Marketing",
  telefon_internet: "Telefon und Internet",
  software: "Software",
  beratung_buchhaltung: "Beratung und Buchhaltung",
  reise_fahrzeug: "Reise und Fahrzeug",
  buero: "Büro",
  beitraege: "Beiträge",
  leasing: "Leasing",
  sonstiges: "Sonstiges",
};

const ANLAGE: Record<string, string> = {
  immateriell: "Immateriell",
  maschine_ausstattung: "Maschine und Ausstattung",
  fahrzeug: "Fahrzeug",
  buero_einrichtung: "Büro und Einrichtung",
  it: "IT",
  sonstiges: "Sonstiges",
};

const TILGUNG: Record<string, string> = {
  annuitaet: "Annuität",
  ratentilgung: "Ratentilgung",
  endfaellig: "endfällig",
};

export interface CheckpointBlatt {
  name: string;
  /** Erste Zeile ist 0. Die Kopfzeile trägt die Monatsnamen. */
  kopfzeile: number;
  zeilen: (string | number | null)[][];
}

export interface SzenarioVergleich {
  basisUmsatzCents: number;
  bestUmsatzCents: number;
  realUmsatzCents: number;
  worstUmsatzCents: number;
}

type Zelle = string | number | null;

/** Baut die sieben Blätter des Prüfstands. Beträge sind Euro mit Cent als Bruchteil. */
export function checkpointBlaetter(
  ergebnis: Planberechnung,
  vergleich?: SzenarioVergleich,
): CheckpointBlatt[] {
  return [
    uebersicht(ergebnis, vergleich),
    umsatz(ergebnis),
    personal(ergebnis),
    kosten(ergebnis),
    investitionen(ergebnis),
    finanzierung(ergebnis),
    umsatzsteuer(ergebnis),
  ];
}

function uebersicht(ergebnis: Planberechnung, vergleich?: SzenarioVergleich): CheckpointBlatt {
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Übersicht",
    "Betriebsergebnis vor Ertragsteuern und erfasste Zahlungen. Kein Liquiditätsplan, keine Einkommen-, Gewerbe- oder Körperschaftsteuer.",
  );
  const u = ergebnis.uebersicht;
  zeilen.push(
    fluss("Umsatzerlöse (netto)", u.umsatzerloeseCents),
    fluss("Wareneinsatz", u.wareneinsatzCents),
    fluss("Rohertrag", u.rohertragCents),
    fluss("Personalaufwand", u.personalCents),
    fluss("Laufende Kosten", u.laufendeKostenCents),
    fluss("Gründungs- und Anlaufkosten", u.gruendungAnlaufCents),
    fluss("Sofortaufwand bis 250 Euro", u.sofortaufwandCents),
    fluss("Abschreibungen", u.abschreibungenCents),
    fluss("Zinsaufwand", u.zinsaufwandCents),
    fluss("Finanzierungsaufwand (Disagio, Gebühren)", u.finanzierungsaufwandCents),
    fluss("Steuerpflichtige Zuschüsse", u.zuschuesseErtragCents),
    fluss("Betriebsergebnis vor Steuern", u.betriebsergebnisCents),
    leer(),
    fluss("Einzahlungen von Kunden", u.einzahlungenKundenCents),
    fluss("Auszahlungen Wareneinsatz", u.auszahlungenWareneinsatzCents),
    fluss("Auszahlungen Personal", u.auszahlungenPersonalCents),
    fluss("Auszahlungen Kosten, Gründung und Anlauf", u.auszahlungenKostenCents),
    fluss("Auszahlungen Investitionen", u.auszahlungenInvestitionenCents),
    fluss("Auszahlungen Zinsen", u.auszahlungenZinsenCents),
    fluss("Auszahlungen Tilgung", u.auszahlungenTilgungCents),
    fluss("Umsatzsteuerzahlung (negativ = Erstattung)", u.umsatzsteuerZahlungCents),
    fluss("Einlagen (bar)", u.einlagenCents),
    fluss("Darlehensauszahlung", u.darlehensauszahlungCents),
    fluss("Zuschüsse", u.zuschuesseZahlungCents),
    fluss("Privatentnahmen", u.entnahmenCents),
    fluss("Saldo der erfassten Zahlungen", u.zahlungssaldoCents),
    leer(),
    stand("Restschuld Darlehen am Monatsende", u.restschuldCents),
    stand("Restbuchwert Anlagen am Monatsende", u.restbuchwertCents),
    stand("Warenbestand am Monatsende", u.warenbestandCents),
    stand("Offene Kundenforderungen am Monatsende", u.forderungenCents),
    stand("Offene Lieferantenverbindlichkeiten am Monatsende", u.verbindlichkeitenCents),
    stand("Offene Umsatzsteuer-Zahllast am Monatsende", u.offeneUmsatzsteuerCents),
    leer(),
    [
      `Liquiditätsreserve im Kapitalbedarf: ${euroText(ergebnis.liquiditaetsreserveCents)} Euro. Das ist ein Puffer, kein Zahlungsstrom.`,
    ],
  );
  if (vergleich) {
    zeilen.push(
      leer(),
      ["Summe der Umsatzerlöse über 36 Monate, zum Vergleich der Szenarien"],
      vergleichZeile("Basis", vergleich.basisUmsatzCents),
      vergleichZeile("Best Case", vergleich.bestUmsatzCents),
      vergleichZeile("Real Case", vergleich.realUmsatzCents),
      vergleichZeile("Worst Case", vergleich.worstUmsatzCents),
    );
  }
  if (ergebnis.hinweise.length > 0) {
    zeilen.push(leer(), ["Hinweise"]);
    for (const hinweis of ergebnis.hinweise) zeilen.push([hinweis.message]);
  }
  return { name: "Übersicht", kopfzeile, zeilen };
}

function umsatz(ergebnis: Planberechnung): CheckpointBlatt {
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Umsatz und Wareneinsatz",
    "Nettoumsatz im Leistungsmonat. Der Zahlungseingang folgt dem Zahlungsziel. Wareneinsatz ist der Aufwand, Zahlung im Leistungsmonat.",
  );
  for (const linie of ergebnis.umsatz.linien) {
    zeilen.push(
      fluss(`${linie.bezeichnung} – Nettoumsatz`, linie.nettoCents),
      fluss(`${linie.bezeichnung} – Wareneinsatz`, linie.wareneinsatzAufwandCents),
      fluss(`${linie.bezeichnung} – Zahlungseingang`, linie.einzahlungCents),
    );
  }
  zeilen.push(
    leer(),
    fluss("Summe Nettoumsatz", ergebnis.umsatz.summeNettoCents),
    fluss("Summe Wareneinsatz", ergebnis.umsatz.summeWareneinsatzAufwandCents),
    fluss("Summe Zahlungseingang", ergebnis.umsatz.summeEinzahlungCents),
  );
  return { name: "Umsatz & Wareneinsatz", kopfzeile, zeilen };
}

function personal(ergebnis: Planberechnung): CheckpointBlatt {
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Personal",
    "Brutto plus Arbeitgeberanteil. Die Zahlung liegt im selben Monat. Sonderzahlungen sind im Brutto der Summe enthalten und extra ausgewiesen.",
  );
  for (const stelle of ergebnis.personal.stellen) {
    zeilen.push(fluss(`${stelle.bezeichnung} – Brutto`, stelle.bruttoCents));
    if (summeCents(stelle.sonderzahlungCents) !== 0) {
      zeilen.push(
        fluss(`${stelle.bezeichnung} – davon Sonderzahlungen`, stelle.sonderzahlungCents),
      );
    }
    zeilen.push(
      fluss(`${stelle.bezeichnung} – Arbeitgeberanteil`, stelle.nebenkostenCents),
      fluss(`${stelle.bezeichnung} – Personalaufwand`, stelle.aufwandCents),
    );
  }
  zeilen.push(
    leer(),
    fluss("Summe Brutto inklusive Sonderzahlungen", ergebnis.personal.summeBruttoCents),
    fluss("Summe Arbeitgeberanteil", ergebnis.personal.summeNebenkostenCents),
    fluss("Summe Personalaufwand", ergebnis.personal.summeAufwandCents),
  );
  return { name: "Personal", kopfzeile, zeilen };
}

function kosten(ergebnis: Planberechnung): CheckpointBlatt {
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Kosten",
    "Betrieblicher Aufwand im Leistungsmonat, Auszahlung nach Zahlungsziel. Ein Privatanteil ist schon aus dem Aufwand herausgerechnet.",
  );
  for (const position of ergebnis.kosten.positionen) {
    const kategorie = KATEGORIE[position.kategorie] ?? position.kategorie;
    zeilen.push(
      fluss(`${position.bezeichnung} (${kategorie}) – Aufwand`, position.aufwandCents),
      fluss(`${position.bezeichnung} – Auszahlung`, position.auszahlungCents),
    );
  }
  for (const posten of ergebnis.kosten.einmalig) {
    const herkunft = posten.herkunft === "gruendung" ? "Gründung" : "Anlauf";
    zeilen.push(
      fluss(`${posten.bezeichnung} (${herkunft}) – Aufwand`, posten.aufwandCents),
      fluss(`${posten.bezeichnung} – Auszahlung`, posten.auszahlungCents),
    );
  }
  zeilen.push(
    leer(),
    fluss("Summe laufende Kosten", ergebnis.kosten.summeAufwandCents),
    fluss("Summe Gründung und Anlauf", ergebnis.kosten.summeEinmalAufwandCents),
  );
  return { name: "Kosten", kopfzeile, zeilen };
}

function investitionen(ergebnis: Planberechnung): CheckpointBlatt {
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Investitionen und Abschreibungen",
    "Lineare AfA über die Nutzungsdauer, Sammelposten fest über 60 Monate, jeweils ab AfA-Beginn. GWG im AfA-Monat. Bis 250 Euro netto sofort Aufwand, kein Buchwert.",
  );
  for (const anlage of ergebnis.investitionen.anlagen) {
    const art = ANLAGE[anlage.kategorie] ?? anlage.kategorie;
    zeilen.push(fluss(`${anlage.bezeichnung} (${art}) – Abschreibung`, anlage.abschreibungCents));
    if (summeCents(anlage.sofortaufwandCents) !== 0 || anlage.behandlung === "sofortaufwand") {
      zeilen.push(fluss(`${anlage.bezeichnung} – Sofortaufwand`, anlage.sofortaufwandCents));
    }
    zeilen.push(
      fluss(`${anlage.bezeichnung} – Auszahlung`, anlage.auszahlungCents),
      stand(`${anlage.bezeichnung} – Buchwert am Monatsende`, anlage.buchwertCents),
    );
  }
  const bestand = ergebnis.investitionen.warenbestand;
  if (bestand) {
    zeilen.push(
      fluss("Waren-Erstbestand – Auszahlung", bestand.auszahlungCents),
      stand("Waren-Erstbestand – Bestand am Monatsende", bestand.buchwertCents),
    );
  }
  zeilen.push(
    leer(),
    fluss("Summe Abschreibungen", ergebnis.investitionen.summeAbschreibungCents),
    fluss("Summe Sofortaufwand bis 250 Euro", ergebnis.investitionen.summeSofortaufwandCents),
    stand("Summe Buchwert Anlagen am Monatsende", ergebnis.investitionen.summeBuchwertCents),
  );
  const hinweise = ergebnis.hinweise.filter((hinweis) =>
    ["gwg_betrag_zu_hoch", "sammelposten_ausserhalb", "sofortaufwand_bis_250"].includes(
      hinweis.code,
    ),
  );
  zeilen.push(leer(), [
    hinweise.length === 0 ? "Keine Hinweise zur Anlagenklassifikation." : "Hinweise",
  ]);
  for (const hinweis of hinweise) zeilen.push([hinweis.message]);
  return { name: "Investitionen & Abschreibungen", kopfzeile, zeilen };
}

function finanzierung(ergebnis: Planberechnung): CheckpointBlatt {
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Finanzierung und Kreditplan",
    "Raten auch nach Monat 36 werden gerechnet, hier aber nicht gezeigt. Die Restschuld am letzten Planmonat bleibt stehen.",
  );
  for (const posten of ergebnis.finanzierung.eigenkapital) {
    zeilen.push(
      fluss(`${posten.bezeichnung} – Einlage`, posten.betragCents),
      fluss(`${posten.bezeichnung} – Geldeingang`, posten.einzahlungCents),
    );
  }
  for (const zuschuss of ergebnis.finanzierung.zuschuesse) {
    const merkmal = zuschuss.steuerfrei ? "steuerfrei" : "steuerpflichtig";
    zeilen.push(
      fluss(`${zuschuss.bezeichnung} (${merkmal}) – Zufluss`, zuschuss.betragCents),
      fluss(`${zuschuss.bezeichnung} – davon Ertrag`, zuschuss.ertragCents),
    );
  }
  for (const darlehen of ergebnis.finanzierung.darlehen) {
    const zins = prozent(darlehen.nominalzinsPa);
    zeilen.push(
      leer(),
      [
        `${darlehen.bezeichnung}, ${darlehen.geber}: ${euroText(darlehen.nominalCents)} Euro, ${zins} % p.a., ${TILGUNG[darlehen.tilgungsart]}, ${darlehen.laufzeitMonate} Monate, davon ${darlehen.tilgungsfreieMonate} ohne Tilgung.`,
      ],
      fluss(`${darlehen.bezeichnung} – Auszahlung`, darlehen.auszahlungCents),
      fluss(`${darlehen.bezeichnung} – Zins`, darlehen.zinsCents),
      fluss(`${darlehen.bezeichnung} – Tilgung`, darlehen.tilgungCents),
      fluss(`${darlehen.bezeichnung} – Rate`, darlehen.rateCents),
      stand(`${darlehen.bezeichnung} – Restschuld am Monatsende`, darlehen.restschuldCents),
    );
    if (summeCents(darlehen.finanzierungsaufwandCents) !== 0) {
      zeilen.push(
        fluss(`${darlehen.bezeichnung} – Disagio und Gebühren`, darlehen.finanzierungsaufwandCents),
      );
    }
  }
  zeilen.push(
    leer(),
    fluss("Summe Geldeinlagen", ergebnis.finanzierung.summeEinlagenCents),
    fluss("Summe Darlehensauszahlung", ergebnis.finanzierung.summeDarlehenAuszahlungCents),
    fluss("Summe Zinsen", ergebnis.finanzierung.summeZinsCents),
    fluss("Summe Tilgung", ergebnis.finanzierung.summeTilgungCents),
    stand("Summe Restschuld am Monatsende", ergebnis.finanzierung.summeRestschuldCents),
  );
  return { name: "Finanzierung", kopfzeile, zeilen };
}

function umsatzsteuer(ergebnis: Planberechnung): CheckpointBlatt {
  const steuer = ergebnis.umsatzsteuer;
  const { zeilen, kopfzeile } = kopf(
    ergebnis,
    "Umsatzsteuer",
    "Zahllast ist Umsatzsteuer minus Vorsteuer. Gezahlt wird im Folgemonat, sofern monatlich und ohne Dauerfrist angemeldet. Negativ heißt Erstattung.",
  );
  zeilen.push(
    fluss("Umsatzsteuer", steuer.umsatzsteuerCents),
    fluss("Vorsteuer Wareneinsatz", steuer.vorsteuerWareneinsatzCents),
    fluss("Vorsteuer laufende Kosten", steuer.vorsteuerKostenCents),
    fluss("Vorsteuer Gründung und Anlauf", steuer.vorsteuerEinmalCents),
    fluss("Vorsteuer Investitionen und Warenbestand", steuer.vorsteuerInvestitionenCents),
    fluss("Vorsteuer gesamt", steuer.vorsteuerCents),
    fluss("Zahllast im Entstehungsmonat", steuer.zahllastCents),
    fluss("Zahlung (negativ = Erstattung)", steuer.zahlungCents),
    stand("Offene Zahllast am Monatsende", steuer.offeneZahllastCents),
  );
  if (steuer.umsatzsteuerNachHorizontCents !== 0) {
    zeilen.push(leer(), [
      `Umsatzsteuer aus Ist-Versteuerung, deren Zahlungseingang nach dem Horizont liegt: ${euroText(steuer.umsatzsteuerNachHorizontCents)} Euro. Sie ist noch keine Zahllast.`,
    ]);
  }
  return { name: "Umsatzsteuer", kopfzeile, zeilen };
}

function kopf(
  ergebnis: Planberechnung,
  titel: string,
  hinweis: string,
): { zeilen: Zelle[][]; kopfzeile: number } {
  const beispiel = ergebnis.beispiel
    ? "Fiktiver Beispielplan, nicht für einen Antrag."
    : "Planrechnung.";
  return {
    kopfzeile: 4,
    zeilen: [
      [titel],
      [
        `${ergebnis.planName} · ${ergebnis.szenarioBezeichnung} · ${ergebnis.startMonat} bis ${ergebnis.monate.at(-1) ?? ""}`,
      ],
      [`${beispiel} ${hinweis} Beträge in Euro.`],
      [],
      ["Position", ...ergebnis.monate.map(monatLabel), "Summe"],
    ],
  };
}

function fluss(label: string, cents: readonly number[]): Zelle[] {
  return [label, ...cents.map(euro), euro(summeCents(cents))];
}

function stand(label: string, cents: readonly number[]): Zelle[] {
  return [label, ...cents.map(euro), null];
}

function leer(): Zelle[] {
  return [];
}

function vergleichZeile(label: string, cents: number): Zelle[] {
  const zeile: Zelle[] = [label];
  zeile[37] = euro(cents);
  return zeile;
}

function euro(cents: number): number {
  return cents / 100;
}

function euroText(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(cents));
  const ganz = Math.floor(absolute / 100);
  const rest = String(absolute % 100).padStart(2, "0");
  const gruppiert = String(ganz).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${gruppiert},${rest}`;
}

function prozent(satz: number): string {
  const hundertstel = Math.round(satz * 10_000);
  const ganz = Math.trunc(hundertstel / 100);
  const rest = String(Math.abs(hundertstel % 100)).padStart(2, "0");
  return `${ganz},${rest}`;
}

function monatLabel(monat: IsoMonth): string {
  const jahr = monat.slice(0, 4);
  const nummer = Number(monat.slice(5, 7));
  return `${MONATSNAMEN[nummer - 1] ?? monat} ${jahr}`;
}
