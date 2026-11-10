import { berechnePlan } from "../domain/calc/index.ts";
import { BREAK_EVEN_DEFINITION, erstelleBerichte } from "../domain/reports/index.ts";
import type {
  Berichte,
  Bewegungszeile,
  KapitalPosten,
  TragfaehigkeitPerson,
} from "../domain/reports/index.ts";
import type { Finanzplan, IsoMonth } from "../domain/types.ts";
import { beispielCafe } from "../fixtures/beispiel-cafe.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../fixtures/beispiel-gmbh.ts";

type Zelle = string | number | null;
type Rolle = "ergebnis" | "nachricht" | "summe" | "kopf";

export interface BerichtBlatt {
  name: string;
  /** 0-basiert. Die erste Kopfzeile wird eingefroren. */
  kopfzeile: number;
  /** 0-basierte Kopfzeilen, alle fett. */
  kopfZeilen: number[];
  zeilen: Zelle[][];
  ergebnisZeilen: number[];
  nachrichtZeilen: number[];
  summenZeilen: number[];
  /** 0-basierte Spalten, die ein Planjahr bündeln. */
  planjahrSpalten: number[];
}

export interface BerichtQuelle {
  kuerzel: string;
  plan: Finanzplan;
}

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

const BEISPIELE: BerichtQuelle[] = [
  { kuerzel: "Blitzweg", plan: beispielElektro },
  { kuerzel: "Café", plan: beispielCafe },
  { kuerzel: "Hafenlicht", plan: beispielGmbh },
];

/** Alle Blätter des Prüfstands für Blitzweg, Café Leseecke und Hafenlicht. */
export function berichteCheckpointBlaetter(
  quellen: readonly BerichtQuelle[] = BEISPIELE,
): BerichtBlatt[] {
  const berichte = quellen.map((quelle) => ({
    kuerzel: quelle.kuerzel,
    bericht: erstelleBerichte(quelle.plan, berechnePlan(quelle.plan, "real")),
  }));
  return [
    lesen(berichte.map((eintrag) => eintrag.bericht)),
    kernzahlen(berichte),
    ...berichte.flatMap(({ kuerzel, bericht }) => blaetterEinesPlans(kuerzel, bericht)),
  ];
}

function blaetterEinesPlans(kuerzel: string, bericht: Berichte): BerichtBlatt[] {
  return [
    guvJahre(kuerzel, bericht),
    guvMonate(kuerzel, bericht),
    liquiditaetJahre(kuerzel, bericht),
    liquiditaetMonate(kuerzel, bericht),
    kapitalBlatt(kuerzel, bericht),
    anlagenBlatt(kuerzel, bericht),
    darlehenBlatt(kuerzel, bericht),
    tragfaehigkeitBlatt(kuerzel, bericht),
    kennzahlenBlatt(kuerzel, bericht),
  ];
}

function lesen(berichte: readonly Berichte[]): BerichtBlatt {
  const blatt = new Blatt();
  blatt.zeile(["Berichte, Schritt 4"]);
  blatt.zeile([
    "Fiktive Beispielpläne, nicht für einen Antrag. Beträge in Euro. Die Regeln stehen in docs/berichte.md.",
  ]);
  blatt.leer();
  blatt.zeile([
    "Planjahre",
    "Planjahr 1 umfasst die Monate 1 bis 12 ab dem Gründungsmonat, nicht das Kalenderjahr.",
  ]);
  blatt.zeile([
    "Steuern in der Rentabilität",
    "Die festgesetzte Steuer eines Kalenderjahres wird gleichmäßig auf die Planmonate dieses Kalenderjahres verteilt. Der Rest liegt im letzten dieser Monate.",
  ]);
  blatt.zeile([
    "Steuern in der Liquidität",
    "Gezahlt wird zu den Terminen aus der Steuerrechnung. Die empfohlene Steuerrücklage mindert den Kontostand nicht.",
  ]);
  blatt.zeile([
    "Kontostand",
    "Anfangsbestand 0. Der Endbestand ist die laufende Summe der Zahlungssalden.",
  ]);
  blatt.zeile(["Kapitalbedarf", berichte[0]?.kapital.hinweis ?? ""]);
  blatt.zeile(["Break-even", BREAK_EVEN_DEFINITION]);
  blatt.zeile([
    "Kapitaldienstfähigkeit",
    "Cashflow = Ergebnis nach Steuern + Abschreibungen − Privatentnahmen, geteilt durch Zins + Tilgung. Ohne Kapitaldienst bleibt die Kennzahl leer.",
  ]);
  blatt.zeile([
    "Tragfähigkeit",
    "Bei Personenunternehmen tragfähig, wenn das verfügbare Einkommen im Planjahr 2 mindestens 0 ist. Für GmbH und UG gilt der Hinweis auf dem Blatt.",
  ]);
  blatt.zeile([
    "Eigenkapitalquote",
    "Eigenmittel geteilt durch Eigenmittel, Darlehen zum Nominal und Zuschüsse.",
  ]);
  blatt.leer();
  blatt.zeile(["Beispiel", "Firma", "Rechtsform", "Start", "Szenario"], "kopf");
  for (const bericht of berichte) {
    blatt.zeile([
      bericht.firmenname,
      bericht.firmenname,
      bericht.rechtsform ?? "",
      bericht.startMonat,
      bericht.szenarioBezeichnung,
    ]);
  }
  return blatt.fertig("Lesen");
}

function kernzahlen(eintraege: readonly { kuerzel: string; bericht: Berichte }[]): BerichtBlatt {
  const blatt = new Blatt();
  blatt.zeile(["Kernzahlen der drei Beispiele"]);
  blatt.zeile(["Beträge in Euro. Quoten als Prozent, die Kapitaldienstfähigkeit als Faktor."]);
  blatt.leer();
  blatt.zeile(
    [
      "Beispiel",
      "Planjahr",
      "Umsatz",
      "Rohertrag",
      "Rohertragsquote",
      "Ergebnis vor Steuern",
      "Steuern",
      "Ergebnis nach Steuern",
      "Umsatzrendite",
      "Kapitaldienstfähigkeit",
      "Endbestand",
    ],
    "kopf",
  );
  for (const { kuerzel, bericht } of eintraege) {
    const umsatz = zeile(bericht, "umsatz");
    const rohertrag = zeile(bericht, "rohertrag");
    const vor = zeile(bericht, "ergebnis-vor-steuern");
    const steuern = zeile(bericht, "steuern");
    const nach = zeile(bericht, "ergebnis-nach-steuern");
    bericht.planjahre.forEach((jahr, index) => {
      const dienst = bericht.kennzahlen.kapitaldienstfaehigkeit[index];
      blatt.zeile([
        kuerzel,
        jahr.bezeichnung,
        euro(umsatz.planjahreCents[index] ?? 0),
        euro(rohertrag.planjahreCents[index] ?? 0),
        prozent(bericht.kennzahlen.rohertragsquote.planjahre[index]?.quote ?? null),
        euro(vor.planjahreCents[index] ?? 0),
        euro(steuern.planjahreCents[index] ?? 0),
        euro(nach.planjahreCents[index] ?? 0),
        prozent(bericht.kennzahlen.umsatzrendite.planjahre[index]?.quote ?? null),
        faktor(dienst?.quote ?? null),
        euro(bericht.liquiditaet.endbestand.planjahreCents[index] ?? 0),
      ]);
    });
  }
  blatt.leer();
  blatt.zeile(
    [
      "Beispiel",
      "Tiefster Kontostand",
      "Monat",
      "Kontokorrentbedarf",
      "Kapitalbedarf",
      "Finanzierung",
      "Deckung",
      "Eigenkapitalquote",
      "Break-even",
      "Tragfähigkeit Planjahr 2",
      "Verfügbar Planjahr 2",
    ],
    "kopf",
  );
  for (const { kuerzel, bericht } of eintraege) {
    const person = bericht.tragfaehigkeit.personen[0];
    blatt.zeile(
      [
        kuerzel,
        euro(bericht.liquiditaet.tiefsterKontostandCents),
        bericht.liquiditaet.tiefsterKontostandMonat ?? "",
        euro(bericht.liquiditaet.kontokorrentbedarfCents),
        euro(bericht.kapital.summeBedarf.betragCents),
        euro(bericht.kapital.summeFinanzierung.betragCents),
        euro(bericht.kapital.deckung.betragCents),
        prozent(bericht.kennzahlen.eigenkapitalquote),
        bericht.kennzahlen.breakEven.erreicht
          ? `${bericht.kennzahlen.breakEven.monat} (Monat ${bericht.kennzahlen.breakEven.planmonat})`
          : "nicht erreicht",
        tragfaehigText(bericht, person),
        person?.planjahr2Cents == null ? "–" : euro(person.planjahr2Cents),
      ],
      "ergebnis",
    );
  }
  return blatt.fertig("Kernzahlen");
}

function guvJahre(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  kopf(blatt, `${kuerzel} – Rentabilitätsvorschau`, bericht);
  blatt.zeile([bericht.rentabilitaet.hinweis]);
  blatt.leer();
  blatt.planjahrSpalten = jahrSpalten(bericht);
  blatt.zeile(jahrKopf(bericht, "Summe"), "kopf");
  for (const eintrag of bericht.rentabilitaet.zeilen) {
    bewegungJahre(blatt, eintrag, eintrag.bezeichnung);
    for (const unter of eintrag.unterzeilen ?? []) {
      bewegungJahre(blatt, unter, `davon ${unter.bezeichnung}`);
    }
  }
  return blatt.fertig(blattName(kuerzel, "GuV"));
}

function guvMonate(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  kopf(blatt, `${kuerzel} – Rentabilität, Monate`, bericht);
  blatt.zeile(["Kosten stehen als positive Beträge. Ergebniszeilen sind saldiert."]);
  blatt.leer();
  monatsKopf(blatt, bericht);
  for (const eintrag of bericht.rentabilitaet.zeilen) {
    bewegungMonate(blatt, bericht, eintrag, eintrag.bezeichnung);
    for (const unter of eintrag.unterzeilen ?? []) {
      bewegungMonate(blatt, bericht, unter, `davon ${unter.bezeichnung}`);
    }
  }
  return blatt.fertig(blattName(kuerzel, "GuV Monate"));
}

function liquiditaetJahre(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  const plan = bericht.liquiditaet;
  kopf(blatt, `${kuerzel} – Liquiditätsplan`, bericht);
  blatt.zeile([plan.hinweis]);
  blatt.zeile([
    "Tiefster Kontostand",
    euro(plan.tiefsterKontostandCents),
    plan.tiefsterKontostandMonat ?? "",
    "Kontokorrentbedarf",
    euro(plan.kontokorrentbedarfCents),
  ]);
  blatt.leer();
  blatt.planjahrSpalten = jahrSpalten(bericht);
  blatt.zeile(jahrKopf(bericht, "Summe oder Stand"), "kopf");
  bestandJahre(blatt, plan.anfangsbestand.bezeichnung, plan.anfangsbestand);
  bewegungJahre(blatt, plan.einzahlungen, plan.einzahlungen.bezeichnung);
  for (const unter of plan.einzahlungen.unterzeilen ?? []) {
    bewegungJahre(blatt, unter, `davon ${unter.bezeichnung}`);
  }
  bewegungJahre(blatt, plan.auszahlungen, plan.auszahlungen.bezeichnung);
  for (const unter of plan.auszahlungen.unterzeilen ?? []) {
    bewegungJahre(blatt, unter, `davon ${unter.bezeichnung}`);
  }
  bestandJahre(blatt, plan.endbestand.bezeichnung, plan.endbestand);
  bewegungJahre(blatt, plan.steuerruecklage, `${plan.steuerruecklage.bezeichnung} (nachrichtlich)`);
  bestandJahre(
    blatt,
    `${plan.steuerruecklageKumuliert.bezeichnung} (nachrichtlich)`,
    plan.steuerruecklageKumuliert,
  );
  return blatt.fertig(blattName(kuerzel, "Liquidität"));
}

function liquiditaetMonate(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  const plan = bericht.liquiditaet;
  kopf(blatt, `${kuerzel} – Liquidität, Monate`, bericht);
  blatt.zeile([plan.hinweis]);
  blatt.leer();
  monatsKopf(blatt, bericht, "Stand");
  bestandMonate(blatt, bericht, plan.anfangsbestand.bezeichnung, plan.anfangsbestand);
  bewegungMonate(blatt, bericht, plan.einzahlungen, plan.einzahlungen.bezeichnung);
  for (const unter of plan.einzahlungen.unterzeilen ?? []) {
    bewegungMonate(blatt, bericht, unter, `davon ${unter.bezeichnung}`);
  }
  bewegungMonate(blatt, bericht, plan.auszahlungen, plan.auszahlungen.bezeichnung);
  for (const unter of plan.auszahlungen.unterzeilen ?? []) {
    bewegungMonate(blatt, bericht, unter, `davon ${unter.bezeichnung}`);
  }
  bestandMonate(blatt, bericht, plan.endbestand.bezeichnung, plan.endbestand);
  bewegungMonate(
    blatt,
    bericht,
    plan.steuerruecklage,
    `${plan.steuerruecklage.bezeichnung} (nachrichtlich)`,
  );
  bestandMonate(
    blatt,
    bericht,
    `${plan.steuerruecklageKumuliert.bezeichnung} (nachrichtlich)`,
    plan.steuerruecklageKumuliert,
  );
  return blatt.fertig(blattName(kuerzel, "Liqui Monate"));
}

function kapitalBlatt(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  const plan = bericht.kapital;
  kopf(blatt, `${kuerzel} – Kapitalbedarf und Finanzierung`, bericht);
  blatt.zeile([plan.hinweis]);
  blatt.leer();
  blatt.planjahrSpalten = jahrSpalten(bericht);
  blatt.zeile(["Posten", ...bericht.planjahre.map(jahrSpanne), "Betrag"], "kopf");
  blatt.zeile(["Bedarf"]);
  for (const posten of plan.bedarf) kapitalZeile(blatt, posten, "    ");
  kapitalZeile(blatt, plan.summeBedarf, "");
  blatt.leer();
  blatt.zeile(["Finanzierung"]);
  for (const posten of plan.finanzierung) kapitalZeile(blatt, posten, "    ");
  kapitalZeile(blatt, plan.summeFinanzierung, "");
  blatt.leer();
  kapitalZeile(blatt, plan.deckung, "");
  blatt.zeile([
    "Darlehen, nicht ausgezahlt (Disagio, Gebühren, Kurs)",
    euro(plan.darlehenAbzugCents),
  ]);
  return blatt.fertig(blattName(kuerzel, "Kapital"));
}

function anlagenBlatt(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  kopf(blatt, `${kuerzel} – Investitionen und AfA`, bericht);
  blatt.zeile([
    "Beträge bis 250 Euro netto sind Sofortaufwand. Der Buchwert ist der Stand am Ende des Planjahres.",
  ]);
  blatt.leer();
  if (bericht.anlagen.positionen.length === 0) {
    blatt.zeile(["Keine Anlagegüter im Plan."]);
    return blatt.fertig(blattName(kuerzel, "Anlagen"));
  }
  blatt.zeile(
    [
      "Anlage",
      "Kategorie",
      "Methode",
      "Behandlung",
      "Aktivierung",
      "Restwert",
      ...bericht.planjahre.map((jahr) => `AfA ${jahr.bezeichnung}`),
      "AfA Summe",
      ...bericht.planjahre.map((jahr) => `Buchwert ${jahr.bezeichnung}`),
    ],
    "kopf",
  );
  for (const position of bericht.anlagen.positionen) {
    blatt.zeile([
      position.bezeichnung,
      position.kategorie,
      position.methode,
      position.behandlung,
      euro(position.aktivierungCents),
      euro(position.restwertCents),
      ...position.abschreibung.planjahreCents.map(euro),
      euro(position.abschreibung.summeCents),
      ...position.buchwert.planjahreCents.map(euro),
    ]);
  }
  blatt.zeile(
    [
      "Summe",
      "",
      "",
      "",
      "",
      "",
      ...bericht.anlagen.summeAbschreibung.planjahreCents.map(euro),
      euro(bericht.anlagen.summeAbschreibung.summeCents),
      ...bericht.anlagen.summeBuchwert.planjahreCents.map(euro),
    ],
    "summe",
  );
  blatt.leer();
  blatt.zeile(["Abschreibung je Monat"]);
  monatsKopf(blatt, bericht);
  for (const position of bericht.anlagen.positionen) {
    bewegungMonate(blatt, bericht, position.abschreibung, position.bezeichnung);
  }
  bewegungMonate(blatt, bericht, bericht.anlagen.summeAbschreibung, "Summe Abschreibungen");
  blatt.leer();
  blatt.zeile(["Buchwert je Monatsende"]);
  monatsKopf(blatt, bericht, "Stand");
  for (const position of bericht.anlagen.positionen) {
    bestandMonate(blatt, bericht, position.bezeichnung, position.buchwert);
  }
  return blatt.fertig(blattName(kuerzel, "Anlagen"));
}

function darlehenBlatt(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  kopf(blatt, `${kuerzel} – Darlehen`, bericht);
  blatt.zeile([bericht.darlehen.hinweis]);
  blatt.leer();
  if (bericht.darlehen.darlehen.length === 0) {
    blatt.zeile(["Keine Darlehen im Plan."]);
    return blatt.fertig(blattName(kuerzel, "Darlehen"));
  }
  for (const darlehen of bericht.darlehen.darlehen) {
    blatt.zeile([
      darlehen.bezeichnung,
      darlehen.geber,
      darlehen.tilgungsart,
      `${prozentSatz(darlehen.nominalzinsPa)} nominal`,
      `Nominal ${euroText(darlehen.nominalCents)}`,
      `${darlehen.laufzeitMonate} Monate, davon ${darlehen.tilgungsfreieMonate} tilgungsfrei`,
    ]);
    blatt.planjahrSpalten = jahrSpalten(bericht);
    blatt.zeile(jahrKopf(bericht, "Summe oder Stand"), "kopf");
    bewegungJahre(blatt, darlehen.zins, "Zins");
    bewegungJahre(blatt, darlehen.tilgung, "Tilgung");
    bewegungJahre(blatt, darlehen.rate, "Rate");
    bestandJahre(blatt, "Restschuld", darlehen.restschuld);
    blatt.leer();
    blatt.zeile([`${darlehen.bezeichnung}, Monate`]);
    monatsKopf(blatt, bericht, "Stand");
    bewegungMonate(blatt, bericht, darlehen.auszahlung, "Auszahlung");
    bewegungMonate(blatt, bericht, darlehen.zins, "Zins");
    bewegungMonate(blatt, bericht, darlehen.tilgung, "Tilgung");
    bewegungMonate(blatt, bericht, darlehen.rate, "Rate");
    bestandMonate(blatt, bericht, "Restschuld", darlehen.restschuld);
    blatt.leer();
  }
  return blatt.fertig(blattName(kuerzel, "Darlehen"));
}

function tragfaehigkeitBlatt(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  kopf(blatt, `${kuerzel} – Privatbedarf und Tragfähigkeit`, bericht);
  blatt.zeile([bericht.tragfaehigkeit.hinweis]);
  blatt.leer();
  if (!bericht.tragfaehigkeit.anwendbar) {
    blatt.zeile(
      ["Nicht anwendbar", "Für diese Rechtsform gibt es kein Ja oder Nein."],
      "nachricht",
    );
    return blatt.fertig(blattName(kuerzel, "Tragfähigkeit"));
  }
  blatt.zeile(
    [
      "Personen",
      "Anteil",
      "Lebensbedarf erfasst",
      "Tragfähig im Planjahr 2",
      "Verfügbares Einkommen Planjahr 2",
    ],
    "kopf",
  );
  for (const person of bericht.tragfaehigkeit.personen) {
    blatt.zeile(
      [
        person.name,
        prozent(person.anteil),
        person.lebensbedarfErfasst ? "ja" : "nein",
        person.tragfaehig == null ? "nicht beurteilt" : person.tragfaehig ? "ja" : "nein",
        person.planjahr2Cents == null ? "–" : euro(person.planjahr2Cents),
      ],
      "ergebnis",
    );
  }
  blatt.leer();
  blatt.planjahrSpalten = jahrSpalten(bericht);
  blatt.zeile(jahrKopf(bericht, "Summe"), "kopf");
  for (const person of bericht.tragfaehigkeit.personen) personBlock(blatt, person);
  return blatt.fertig(blattName(kuerzel, "Tragfähigkeit"));
}

function kennzahlenBlatt(kuerzel: string, bericht: Berichte): BerichtBlatt {
  const blatt = new Blatt();
  const zahlen = bericht.kennzahlen;
  kopf(blatt, `${kuerzel} – Kennzahlen`, bericht);
  blatt.zeile([zahlen.breakEven.definition]);
  blatt.leer();
  blatt.zeile(
    [
      "Break-even",
      zahlen.breakEven.erreicht
        ? `${zahlen.breakEven.monat}, Planmonat ${zahlen.breakEven.planmonat}`
        : "im Horizont nicht erreicht",
    ],
    "ergebnis",
  );
  blatt.zeile([
    "Tiefster Kontostand",
    euro(zahlen.tiefsterLiquiditaetsstandCents),
    zahlen.tiefsterLiquiditaetsstandMonat ?? "",
  ]);
  blatt.zeile(["Kontokorrentbedarf", euro(zahlen.kontokorrentbedarfCents)]);
  blatt.zeile(["Eigenkapitalquote der Finanzierung", prozent(zahlen.eigenkapitalquote)]);
  blatt.zeile(["Eigenmittel", euro(zahlen.eigenmittelCents)]);
  blatt.zeile(["Finanzierung gesamt", euro(zahlen.finanzierungCents)]);
  blatt.leer();
  blatt.planjahrSpalten = jahrSpalten(bericht);
  blatt.zeile(["Kennzahl", ...bericht.planjahre.map((jahr) => jahr.bezeichnung), "Gesamt"], "kopf");
  blatt.zeile([
    "Rohertragsquote",
    ...zahlen.rohertragsquote.planjahre.map((jahr) => prozent(jahr.quote)),
    prozent(zahlen.rohertragsquote.gesamt.quote),
  ]);
  blatt.zeile([
    "Umsatzrendite",
    ...zahlen.umsatzrendite.planjahre.map((jahr) => prozent(jahr.quote)),
    prozent(zahlen.umsatzrendite.gesamt.quote),
  ]);
  blatt.zeile([
    "Cashflow für den Kapitaldienst",
    ...zahlen.kapitaldienstfaehigkeit.map((jahr) => euro(jahr.cashflowCents)),
    euro(zahlen.kapitaldienstfaehigkeit.reduce((total, jahr) => total + jahr.cashflowCents, 0)),
  ]);
  blatt.zeile([
    "Zins und Tilgung",
    ...zahlen.kapitaldienstfaehigkeit.map((jahr) => euro(jahr.kapitaldienstCents)),
    euro(
      zahlen.kapitaldienstfaehigkeit.reduce((total, jahr) => total + jahr.kapitaldienstCents, 0),
    ),
  ]);
  blatt.zeile(
    [
      "Kapitaldienstfähigkeit",
      ...zahlen.kapitaldienstfaehigkeit.map((jahr) => faktor(jahr.quote)),
      "",
    ],
    "ergebnis",
  );
  return blatt.fertig(blattName(kuerzel, "Kennzahlen"));
}

function personBlock(blatt: Blatt, person: TragfaehigkeitPerson): void {
  blatt.zeile([person.name]);
  bewegungJahre(blatt, person.gewinnNachSteuern, "Gewinn nach Steuern");
  for (const unter of person.gewinnNachSteuern.unterzeilen ?? []) {
    bewegungJahre(blatt, unter, `davon ${unter.bezeichnung}`);
  }
  bewegungJahre(blatt, person.lebenshaltung, "Lebenshaltung");
  bewegungJahre(blatt, person.vorsorge, "Vorsorge");
  for (const unter of person.vorsorge.unterzeilen ?? []) {
    bewegungJahre(blatt, unter, `davon ${unter.bezeichnung}`);
  }
  bewegungJahre(blatt, person.verfuegbaresEinkommen, "Verfügbares Einkommen");
  blatt.leer();
}

class Blatt {
  zeilen: Zelle[][] = [];
  ergebnisZeilen: number[] = [];
  nachrichtZeilen: number[] = [];
  summenZeilen: number[] = [];
  kopfZeilen: number[] = [];
  planjahrSpalten: number[] = [];
  kopfzeile = 0;

  zeile(zellen: Zelle[], rolle?: Rolle): void {
    const index = this.zeilen.length;
    this.zeilen.push(zellen);
    if (rolle === "ergebnis") this.ergebnisZeilen.push(index);
    if (rolle === "nachricht") this.nachrichtZeilen.push(index);
    if (rolle === "summe") this.summenZeilen.push(index);
    if (rolle === "kopf") {
      this.kopfZeilen.push(index);
      if (this.kopfZeilen.length === 1) this.kopfzeile = index;
    }
  }

  leer(): void {
    this.zeilen.push([]);
  }

  fertig(name: string): BerichtBlatt {
    return {
      name,
      kopfzeile: this.kopfzeile,
      kopfZeilen: this.kopfZeilen,
      zeilen: this.zeilen,
      ergebnisZeilen: this.ergebnisZeilen,
      nachrichtZeilen: this.nachrichtZeilen,
      summenZeilen: this.summenZeilen,
      planjahrSpalten: this.planjahrSpalten,
    };
  }
}

function kopf(blatt: Blatt, titel: string, bericht: Berichte): void {
  blatt.zeile([titel]);
  blatt.zeile([
    `${bericht.planName} · ${bericht.szenarioBezeichnung} · ${bericht.rechtsform ?? "ohne Rechtsform"} · Start ${bericht.startMonat}`,
  ]);
  blatt.zeile(["Fiktiver Beispielplan. Beträge in Euro."]);
}

function bewegungJahre(blatt: Blatt, zeile: Bewegungszeile, label: string): void {
  blatt.zeile([label, ...zeile.planjahreCents.map(euro), euro(zeile.summeCents)], rolle(zeile));
}

function bestandJahre(
  blatt: Blatt,
  label: string,
  zeile: { planjahreCents: number[]; horizontWertCents: number; rolle: Bewegungszeile["rolle"] },
): void {
  blatt.zeile(
    [label, ...zeile.planjahreCents.map(euro), euro(zeile.horizontWertCents)],
    rolle(zeile),
  );
}

function bewegungMonate(
  blatt: Blatt,
  bericht: Berichte,
  zeile: Bewegungszeile,
  label: string,
): void {
  blatt.zeile(
    monatsWerte(bericht, label, zeile.monateCents, zeile.planjahreCents, zeile.summeCents),
    rolle(zeile),
  );
}

function bestandMonate(
  blatt: Blatt,
  bericht: Berichte,
  label: string,
  zeile: {
    monateCents: number[];
    planjahreCents: number[];
    horizontWertCents: number;
    rolle: Bewegungszeile["rolle"];
  },
): void {
  blatt.zeile(
    monatsWerte(bericht, label, zeile.monateCents, zeile.planjahreCents, zeile.horizontWertCents),
    rolle(zeile),
  );
}

function kapitalZeile(blatt: Blatt, posten: KapitalPosten, prefix: string): void {
  const rolleDerZeile: Rolle | undefined =
    posten.id.startsWith("summe") || posten.id === "deckung" ? "summe" : undefined;
  blatt.zeile(
    [
      `${prefix}${posten.bezeichnung}`,
      ...posten.planjahreCents.map(euro),
      euro(posten.betragCents),
    ],
    rolleDerZeile,
  );
}

function monatsKopf(blatt: Blatt, bericht: Berichte, letzte = "Summe"): void {
  const zellen: Zelle[] = ["Position"];
  const spalten: number[] = [];
  for (const jahr of bericht.planjahre) {
    for (let index = jahr.vonIndex; index < jahr.bisIndex; index += 1) {
      zellen.push(monatLabel(bericht.monate[index] ?? ""));
    }
    spalten.push(zellen.length);
    zellen.push(jahr.bezeichnung);
  }
  zellen.push(letzte);
  blatt.planjahrSpalten = spalten;
  blatt.zeile(zellen, "kopf");
}

function monatsWerte(
  bericht: Berichte,
  label: string,
  monate: readonly number[],
  planjahre: readonly number[],
  letzte: number,
): Zelle[] {
  const zellen: Zelle[] = [label];
  bericht.planjahre.forEach((jahr, jahrIndex) => {
    for (let index = jahr.vonIndex; index < jahr.bisIndex; index += 1) {
      zellen.push(euro(monate[index] ?? 0));
    }
    zellen.push(euro(planjahre[jahrIndex] ?? 0));
  });
  zellen.push(euro(letzte));
  return zellen;
}

function jahrKopf(bericht: Berichte, letzte: string): Zelle[] {
  return ["Position", ...bericht.planjahre.map(jahrSpanne), letzte];
}

function jahrSpalten(bericht: Berichte): number[] {
  return bericht.planjahre.map((_, index) => index + 1);
}

function jahrSpanne(jahr: Berichte["planjahre"][number]): string {
  return `${jahr.bezeichnung}\n${monatLabel(jahr.vonMonat)} – ${monatLabel(jahr.bisMonat)}`;
}

function rolle(zeile: { rolle: Bewegungszeile["rolle"] }): Rolle | undefined {
  if (zeile.rolle === "ergebnis") return "ergebnis";
  if (zeile.rolle === "nachricht") return "nachricht";
  if (zeile.rolle === "summe") return "summe";
  return undefined;
}

function zeile(bericht: Berichte, id: string): Bewegungszeile {
  const gefunden = bericht.rentabilitaet.zeilen.find((eintrag) => eintrag.id === id);
  if (!gefunden) throw new Error(`Zeile ${id} fehlt.`);
  return gefunden;
}

function tragfaehigText(bericht: Berichte, person: TragfaehigkeitPerson | undefined): string {
  if (!bericht.tragfaehigkeit.anwendbar) return "nicht anwendbar";
  if (!person || person.tragfaehig == null) return "nicht beurteilt";
  return person.tragfaehig ? "ja" : "nein";
}

function monatLabel(monat: IsoMonth): string {
  const [jahr, nummer] = monat.split("-");
  return `${MONATSNAMEN[Number(nummer) - 1] ?? monat} ${jahr ?? ""}`;
}

function euro(cents: number): number {
  return cents / 100;
}

function euroText(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function prozent(quote: number | null): string {
  if (quote == null) return "–";
  return quote.toLocaleString("de-DE", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function prozentSatz(satz: number): string {
  return satz.toLocaleString("de-DE", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function faktor(quote: number | null): string {
  if (quote == null) return "kein Kapitaldienst";
  return quote.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function blattName(kuerzel: string, suffix: string): string {
  return `${kuerzel} ${suffix}`.slice(0, 31);
}
