import { berechnePlan } from "../calc/berechnen.ts";
import { meldungenFuerExport } from "../checks/pruefen.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import { istPersonenunternehmen } from "../reports/planjahr.ts";
import { planFuerSzenario } from "../szenarien/anwenden.ts";
import { vergleichFuerExport } from "../szenarien/vergleich.ts";
import { BASIS_SZENARIO_ID, type Finanzplan } from "../types.ts";
import { dateiBlaetter, excelDateiname, fehlerVermerkExcel, vorhabenName } from "./blaetter.ts";
import { baueEingaben, hebelFuerExport } from "./eingaben.ts";
import {
  berichtSpalte,
  jahrSummenSpalte,
  spalteName,
  Blatt,
  type Reihe,
  type Zelle,
  type Zellenstil,
} from "./gitter.ts";
import { baueRechnung, type Rechenmodell } from "./rechnung.ts";
import { szenarioFaktoren } from "../calc/szenario.ts";

export interface ArbeitsmappeModell {
  dateiname: string;
  blaetter: Blatt[];
}

/**
 * Baut die Arbeitsmappe. Die Berichtsblätter rechnen per Formel,
 * der gespeicherte Wert ist das Ergebnis der App.
 */
export function erstelleArbeitsmappe(
  plan: Finanzplan,
  datum: Date,
  szenarioId: string = BASIS_SZENARIO_ID,
): ArbeitsmappeModell {
  const effektiv = planFuerSzenario(plan, szenarioId);
  if (!effektiv.startMonat) {
    throw new Error("Ohne Startmonat gibt es keinen Zeitraum für die Excel-Datei.");
  }
  const hebelInfo = hebelFuerExport(plan, szenarioId);
  const quelle =
    hebelInfo.name !== "Basisplan" &&
    plan.planSzenarien.eintraege.find((eintrag) => eintrag.id === szenarioId)?.art === "kopie"
      ? effektiv
      : plan;
  const faktoren = szenarioFaktoren(effektiv, effektiv.szenarien.aktiv);
  const ergebnis = berechnePlan(effektiv);
  const berichte = erstelleBerichte(effektiv, ergebnis);
  const meldungen = meldungenFuerExport(effektiv, berichte);
  const eingabe = baueEingaben(
    quelle,
    effektiv.startMonat,
    hebelInfo.hebel,
    faktoren,
    hebelInfo.name,
    hebelInfo.hinweis,
  );
  eingabe.blatt.name = "Eingaben";
  const rechnung = baueRechnung(quelle, eingabe, ergebnis);
  const blaetter = new Map<string, Blatt>();
  blaetter.set("Eingaben", eingabe.blatt);
  blaetter.set("Parameter", rechnung.parameter);
  blaetter.set("Rechnung", rechnung.rechnung);
  blaetter.set("Steuerberechnung", rechnung.steuer);
  const fehler = meldungen.filter((meldung) => meldung.stufe === "fehler").length;
  blaetter.set(
    "Übersicht",
    blattUebersicht(rechnung, berichte, hebelInfo.name, effektiv, datum, fehler),
  );
  blaetter.set("Kapitalbedarf und Finanzierung", blattKapital(rechnung));
  blaetter.set("Investitionen und AfA", blattInvestitionen(rechnung));
  blaetter.set("Umsatz und Kosten", blattUmsatz(rechnung));
  blaetter.set("Rentabilität", blattRentabilitaet(rechnung, berichte));
  blaetter.set("Liquidität", blattLiquiditaet(rechnung));
  if (istPersonenunternehmen(effektiv.stammdaten.rechtsform)) {
    blaetter.set("Tragfähigkeit", blattTragfaehigkeit(rechnung, berichte));
  }
  blaetter.set("Steuern", blattSteuern(rechnung, berichte));
  blaetter.set("Prüfung", blattPruefung(meldungen));
  blaetter.set("Szenarienvergleich", blattVergleich(plan));

  const auswahl = dateiBlaetter(plan.excelExport.blaetter, effektiv.stammdaten.rechtsform);
  const dateiname = excelDateiname(
    vorhabenName(effektiv.stammdaten.firmenname, effektiv.stammdaten.planName),
    datum,
  );
  return {
    dateiname,
    blaetter: auswahl.map((eintrag) => {
      const blatt = blaetter.get(eintrag.name);
      if (!blatt) throw new Error(`Blatt ${eintrag.name} fehlt.`);
      blatt.name = eintrag.name;
      return blatt;
    }),
  };
}

function blattUebersicht(
  rechnung: Rechenmodell,
  berichte: ReturnType<typeof erstelleBerichte>,
  szenario: string,
  plan: Finanzplan,
  datum: Date,
  fehler: number,
): Blatt {
  const blatt = neuerBericht("Übersicht", rechnung, `${plan.stammdaten.firmenname} · ${szenario}`);
  const vermerk = fehlerVermerkExcel(fehler);
  if (vermerk) blatt.zeile({ text: vermerk, stil: "hinweis" });
  blatt.zeile({ text: "Kennzahlen. Die Beträge sind Formeln aus der Rechnung.", stil: "hinweis" });
  euroZeile(blatt, "Umsatz", rechnung.umsatz, "bewegung", "normal");
  euroZeile(blatt, "Ergebnis vor Steuern", rechnung.betriebsergebnis, "bewegung", "ergebnis");
  euroZeile(blatt, "Steuern", rechnung.steuerAufwand, "bewegung", "normal");
  const nachCents = rechnung.betriebsergebnis.cents.map(
    (wert, index) => wert - (rechnung.steuerAufwand.cents[index] ?? 0),
  );
  const nach = differenzZeile(
    blatt,
    "Ergebnis nach Steuern",
    rechnung.betriebsergebnis,
    rechnung.steuerAufwand,
    nachCents,
  );
  quoteZeile(blatt, "Rohertragsquote", rechnung.umsatz, rechnung.wareneinsatz, true);
  quoteZeile(blatt, "Umsatzrendite", rechnung.umsatz, nach, false);
  blatt.zeile(
    {
      text: "Break-even",
    },
    {
      formel: breakEven(nach),
      ergebnis: berichte.kennzahlen.breakEven.monat ?? "nicht erreicht",
      stil: "formel",
    },
  );
  euroZeile(blatt, "Tiefster Kontostand", rechnung.ende, "ende", "ergebnis");
  blatt.zeile(
    {
      text: "Kontokorrentbedarf",
    },
    {
      formel: `MAX(-MIN(${bereich(rechnung.ende)}),0)/100`,
      ergebnis: berichte.liquiditaet.kontokorrentbedarfCents / 100,
      format: "euro",
      stil: "formel",
    },
  );
  const eigen = rechnung.kapitalEigen.cents.reduce((summe, wert) => summe + wert, 0);
  const darlehen = rechnung.kapitalDarlehen.cents.reduce((summe, wert) => summe + wert, 0);
  const zuschuss = rechnung.kapitalZuschuss.cents.reduce((summe, wert) => summe + wert, 0);
  const finanzierung = eigen + darlehen + zuschuss;
  blatt.zeile(
    {
      text: "Eigenkapitalquote",
    },
    {
      formel: `IF((${summeFormel(rechnung.kapitalEigen)}+${summeFormel(rechnung.kapitalDarlehen)}+${summeFormel(rechnung.kapitalZuschuss)})=0,"–",${summeFormel(rechnung.kapitalEigen)}/(${summeFormel(rechnung.kapitalEigen)}+${summeFormel(rechnung.kapitalDarlehen)}+${summeFormel(rechnung.kapitalZuschuss)}))`,
      ergebnis: finanzierung === 0 ? "–" : eigen / finanzierung,
      format: finanzierung === 0 ? undefined : "prozent",
      stil: "formel",
    },
  );
  blatt.zeile({
    text: `Stand der Datei ${datum.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}. Beträge in Euro.`,
    stil: "hinweis",
  });
  return blatt;
}

function blattKapital(rechnung: Rechenmodell): Blatt {
  const blatt = neuerBericht(
    "Kapitalbedarf und Finanzierung",
    rechnung,
    "Nettobeträge. Betriebsmittel und Reserve liegen im ersten Monat.",
  );
  for (const [label, reihe] of [
    ["Investitionen", rechnung.kapitalInvest],
    ["Gründungskosten", rechnung.kapitalGruendung],
    ["Anlaufkosten", rechnung.kapitalAnlauf],
    ["Waren-Erstbestand", rechnung.kapitalWaren],
    ["Betriebsmittel", rechnung.kapitalMittel],
    ["Reserve", rechnung.kapitalReserve],
  ] as const) {
    euroZeile(blatt, label, reihe, "bewegung", "normal");
  }
  const bedarf = summenZeile(blatt, "Summe Kapitalbedarf", [
    rechnung.kapitalInvest,
    rechnung.kapitalGruendung,
    rechnung.kapitalAnlauf,
    rechnung.kapitalWaren,
    rechnung.kapitalMittel,
    rechnung.kapitalReserve,
  ]);
  euroZeile(blatt, "Eigenmittel", rechnung.kapitalEigen, "bewegung", "normal");
  euroZeile(blatt, "Darlehen nominal", rechnung.kapitalDarlehen, "bewegung", "normal");
  euroZeile(blatt, "Zuschüsse", rechnung.kapitalZuschuss, "bewegung", "normal");
  const finanzierung = summenZeile(blatt, "Summe Finanzierung", [
    rechnung.kapitalEigen,
    rechnung.kapitalDarlehen,
    rechnung.kapitalZuschuss,
  ]);
  differenzAnzeige(blatt, "Deckung", finanzierung, bedarf);
  return blatt;
}

function blattInvestitionen(rechnung: Rechenmodell): Blatt {
  const blatt = neuerBericht(
    "Investitionen und AfA",
    rechnung,
    "Abschreibung, Buchwert und Auszahlung je Anlage. Darunter die Darlehen.",
  );
  for (const anlage of rechnung.anlagen) {
    blatt.zeile({ text: anlage.name, stil: "abschnitt" });
    euroZeile(blatt, "Abschreibung", anlage.afa, "bewegung", "normal");
    euroZeile(blatt, "Sofortaufwand", anlage.sofort, "bewegung", "normal");
    euroZeile(blatt, "Buchwert", anlage.buchwert, "ende", "normal");
    euroZeile(blatt, "Auszahlung", anlage.auszahlung, "bewegung", "normal");
  }
  euroZeile(blatt, "Abschreibungen gesamt", rechnung.abschreibung, "bewegung", "ergebnis");
  for (const darlehen of rechnung.darlehen) {
    blatt.zeile({ text: darlehen.name, stil: "abschnitt" });
    euroZeile(blatt, "Zinsen", darlehen.zins, "bewegung", "normal");
    euroZeile(blatt, "Tilgung", darlehen.tilgung, "bewegung", "normal");
    euroZeile(blatt, "Rate", darlehen.rate, "bewegung", "normal");
    euroZeile(blatt, "Restschuld", darlehen.rest, "ende", "ergebnis");
    euroZeile(blatt, "Auszahlung", darlehen.auszahlung, "bewegung", "normal");
  }
  return blatt;
}

function blattUmsatz(rechnung: Rechenmodell): Blatt {
  const blatt = neuerBericht(
    "Umsatz und Kosten",
    rechnung,
    "Nettoumsatz, Wareneinsatz und die Aufwandszeilen.",
  );
  for (const linie of rechnung.linien)
    euroZeile(blatt, linie.name, linie.netto, "bewegung", "normal");
  euroZeile(blatt, "Umsatz", rechnung.umsatz, "bewegung", "ergebnis");
  euroZeile(blatt, "Wareneinsatz", rechnung.wareneinsatz, "bewegung", "normal");
  euroZeile(blatt, "Personal", rechnung.personal, "bewegung", "normal");
  euroZeile(blatt, "Raumkosten", rechnung.raum, "bewegung", "normal");
  euroZeile(blatt, "Laufende Kosten ohne Raum", rechnung.laufendOhneRaum, "bewegung", "normal");
  euroZeile(blatt, "Gründung und Anlauf", rechnung.gruendung, "bewegung", "normal");
  euroZeile(blatt, "Sofortaufwand", rechnung.sofort, "bewegung", "normal");
  return blatt;
}

function blattRentabilitaet(
  rechnung: Rechenmodell,
  berichte: ReturnType<typeof erstelleBerichte>,
): Blatt {
  const blatt = neuerBericht("Rentabilität", rechnung, berichte.rentabilitaet.hinweis);
  euroZeile(blatt, "Umsatz", rechnung.umsatz, "bewegung", "normal");
  euroZeile(blatt, "Wareneinsatz", rechnung.wareneinsatz, "bewegung", "normal");
  const rohertrag = differenzZeile(
    blatt,
    "Rohertrag",
    rechnung.umsatz,
    rechnung.wareneinsatz,
    rechnung.umsatz.cents.map((wert, index) => wert - (rechnung.wareneinsatz.cents[index] ?? 0)),
  );
  euroZeile(blatt, "Personal", rechnung.personal, "bewegung", "normal");
  euroZeile(blatt, "Raumkosten", rechnung.raum, "bewegung", "normal");
  const sonstigeCents = rechnung.laufendOhneRaum.cents.map(
    (wert, index) =>
      wert +
      (rechnung.gruendung.cents[index] ?? 0) +
      (rechnung.sofort.cents[index] ?? 0) +
      (rechnung.finanzaufwand.cents[index] ?? 0) -
      (rechnung.zuschussErtrag.cents[index] ?? 0),
  );
  blatt.zeile({ text: "Sonstige Kosten", stil: "abschnitt" });
  euroZeile(
    blatt,
    "Laufende Kosten ohne Raumkosten",
    rechnung.laufendOhneRaum,
    "bewegung",
    "normal",
  );
  euroZeile(blatt, "Gründungs- und Anlaufkosten", rechnung.gruendung, "bewegung", "normal");
  euroZeile(blatt, "Sofortaufwand bis 250 Euro", rechnung.sofort, "bewegung", "normal");
  euroZeile(
    blatt,
    "Disagio, Gebühren und Auszahlungskurs",
    rechnung.finanzaufwand,
    "bewegung",
    "normal",
  );
  euroZeileNegativ(blatt, "Steuerpflichtige Zuschüsse", rechnung.zuschussErtrag);
  summenZeileMitCents(
    blatt,
    "Sonstige Kosten",
    [rechnung.laufendOhneRaum, rechnung.gruendung, rechnung.sofort, rechnung.finanzaufwand],
    sonstigeCents,
    rechnung.zuschussErtrag,
  );
  euroZeile(blatt, "Abschreibungen", rechnung.abschreibung, "bewegung", "normal");
  euroZeile(blatt, "Zinsen", rechnung.zinsen, "bewegung", "normal");
  euroZeile(blatt, "Ergebnis vor Steuern", rechnung.betriebsergebnis, "bewegung", "ergebnis");
  euroZeile(blatt, "Steuern", rechnung.steuerAufwand, "bewegung", "normal");
  differenzZeile(
    blatt,
    "Ergebnis nach Steuern",
    rechnung.betriebsergebnis,
    rechnung.steuerAufwand,
    rechnung.betriebsergebnis.cents.map(
      (wert, index) => wert - (rechnung.steuerAufwand.cents[index] ?? 0),
    ),
  );
  if (berichte.rentabilitaet.privatentnahmenAusgewiesen) {
    euroZeile(blatt, "Privatentnahmen", rechnung.entnahmen, "bewegung", "hinweis");
  }
  void rohertrag;
  void sonstigeCents;
  return blatt;
}

function blattLiquiditaet(rechnung: Rechenmodell): Blatt {
  const blatt = neuerBericht(
    "Liquidität",
    rechnung,
    "Anfangsbestand 0. Der Endbestand ist die laufende Summe. Erstattungen stehen bei den Einzahlungen.",
  );
  euroZeile(blatt, "Anfangsbestand", rechnung.anfang, "anfang", "normal");
  euroZeile(blatt, "Kundenzahlungen", rechnung.einzahlungKunden, "bewegung", "normal");
  euroZeile(blatt, "Einlagen", rechnung.einlagen, "bewegung", "normal");
  euroZeile(blatt, "Darlehensauszahlungen", rechnung.darlehenAus, "bewegung", "normal");
  euroZeile(blatt, "Zuschüsse", rechnung.zuschussZahlung, "bewegung", "normal");
  euroZeile(blatt, "Einzahlungen", rechnung.einzahlungen, "bewegung", "ergebnis");
  euroZeile(blatt, "Wareneinsatz", rechnung.auszahlungWare, "bewegung", "normal");
  euroZeile(blatt, "Personal", rechnung.auszahlungPersonal, "bewegung", "normal");
  euroZeile(
    blatt,
    "Laufende Kosten, Gründung und Anlauf",
    rechnung.auszahlungKosten,
    "bewegung",
    "normal",
  );
  euroZeile(blatt, "Investitionen", rechnung.auszahlungInvest, "bewegung", "normal");
  euroZeile(blatt, "Zinsen", rechnung.auszahlungZins, "bewegung", "normal");
  euroZeile(blatt, "Tilgung", rechnung.auszahlungTilgung, "bewegung", "normal");
  euroZeile(blatt, "Auszahlungen", rechnung.auszahlungen, "bewegung", "ergebnis");
  euroZeile(blatt, "Endbestand", rechnung.ende, "ende", "ergebnis");
  euroZeile(blatt, "Empfohlene Steuerrücklage", rechnung.ruecklage, "bewegung", "hinweis");
  euroZeile(
    blatt,
    "Steuerrücklage, kumulierter Stand",
    rechnung.ruecklageKumuliert,
    "ende",
    "hinweis",
  );
  return blatt;
}

function blattTragfaehigkeit(
  rechnung: Rechenmodell,
  berichte: ReturnType<typeof erstelleBerichte>,
): Blatt {
  const blatt = neuerBericht("Tragfähigkeit", rechnung, berichte.tragfaehigkeit.hinweis);
  berichte.tragfaehigkeit.personen.forEach((person, index) => {
    const reihe = rechnung.personen[index];
    if (!reihe) return;
    const gewinn = person.gewinnNachSteuern.unterzeilen?.find(
      (zeile) => zeile.id === "gewinnanteil",
    );
    const steuer = person.gewinnNachSteuern.unterzeilen?.find((zeile) => zeile.id === "steuern");
    if (gewinn) reihe.gewinn.cents = [...gewinn.monateCents];
    if (steuer) reihe.steuer.cents = [...steuer.monateCents];
    reihe.lebenshaltung.cents = [...person.lebenshaltung.monateCents];
    reihe.vorsorge.cents = [...person.vorsorge.monateCents];
    blatt.zeile({ text: person.name, stil: "abschnitt" });
    euroZeile(blatt, "Gewinnanteil vor Steuern", reihe.gewinn, "bewegung", "normal");
    euroZeile(blatt, "Steuern", reihe.steuer, "bewegung", "normal");
    differenzZeile(
      blatt,
      "Gewinn nach Steuern",
      reihe.gewinn,
      reihe.steuer,
      reihe.gewinn.cents.map((wert, monat) => wert - (reihe.steuer.cents[monat] ?? 0)),
    );
    euroZeile(blatt, "Lebenshaltung", reihe.lebenshaltung, "bewegung", "normal");
    euroZeile(blatt, "Vorsorge", reihe.vorsorge, "bewegung", "normal");
    const verfuegbar = reihe.gewinn.cents.map(
      (wert, monat) =>
        wert -
        (reihe.steuer.cents[monat] ?? 0) -
        (reihe.lebenshaltung.cents[monat] ?? 0) -
        (reihe.vorsorge.cents[monat] ?? 0),
    );
    const zeile = summenAnzeige(blatt, "Verfügbares Einkommen", verfuegbar, "ergebnis");
    const planjahr2 = verfuegbar.slice(12, 24).reduce((summe, wert) => summe + wert, 0);
    blatt.zeile(
      {
        text: "Verfügbares Einkommen Planjahr 2",
      },
      {
        formel: `${spalteName(jahrSummenSpalte(2))}${zeile}`,
        ergebnis: planjahr2 / 100,
        format: "euro",
        stil: "ergebnis",
      },
    );
    blatt.zeile(
      {
        text: "Tragfähig im Planjahr 2",
      },
      {
        formel: `IF(${spalteName(jahrSummenSpalte(2))}${zeile}>=0,"ja","nein")`,
        ergebnis: planjahr2 >= 0 ? "ja" : "nein",
        stil: "formel",
      },
    );
  });
  return blatt;
}

function blattSteuern(
  rechnung: Rechenmodell,
  berichte: ReturnType<typeof erstelleBerichte>,
): Blatt {
  const blatt = neuerBericht(
    "Steuern",
    rechnung,
    "Festgesetzte Steuer im Kalenderjahr, verteilt auf die Planmonate, und die Zahlungen zu ihren Terminen.",
  );
  for (const jahr of berichte.rentabilitaet.kalenderjahre) {
    blatt.zeile(
      { text: `Festgesetzte Steuer ${jahr.jahr}` },
      { zahl: jahr.steuerCents / 100, format: "euro", stil: "formel" },
      { text: `${jahr.vonMonat} bis ${jahr.bisMonat}, ${jahr.monateImPlan} Monate` },
    );
  }
  euroZeile(blatt, "Steueraufwand, verteilt", rechnung.steuerAufwand, "bewegung", "ergebnis");
  euroZeile(
    blatt,
    "Zahlung Einkommensteuer, Soli, Kirchensteuer",
    rechnung.estZahlung,
    "bewegung",
    "normal",
  );
  euroZeile(blatt, "Zahlung Gewerbesteuer", rechnung.gewstZahlung, "bewegung", "normal");
  euroZeile(
    blatt,
    "Zahlung Körperschaftsteuer und Soli",
    rechnung.kstZahlung,
    "bewegung",
    "normal",
  );
  euroZeile(blatt, "Empfohlene Steuerrücklage", rechnung.ruecklage, "bewegung", "hinweis");
  return blatt;
}

function blattPruefung(meldungen: ReturnType<typeof meldungenFuerExport>): Blatt {
  const blatt = new Blatt("Prüfung");
  blatt.zeile(
    { text: "Prüfung", stil: "kopf" },
    { text: "Stufe", stil: "kopf" },
    { text: "Kategorie", stil: "kopf" },
    { text: "Text", stil: "kopf" },
    { text: "Begründung", stil: "kopf" },
  );
  blatt.fixierenZeile = 1;
  blatt.fixierenSpalte = 1;
  if (meldungen.length === 0) blatt.zeile({ text: "Keine Meldungen.", stil: "hinweis" });
  for (const meldung of meldungen) {
    blatt.zeile(
      { text: meldung.stufeText },
      { text: meldung.kategorieText },
      { text: meldung.text },
      { text: meldung.begruendung },
    );
  }
  blatt.breite(1, 16);
  blatt.breite(2, 22);
  blatt.breite(3, 70);
  blatt.breite(4, 80);
  return blatt;
}

function blattVergleich(plan: Finanzplan): Blatt {
  const blatt = new Blatt("Szenarienvergleich");
  const spalten = vergleichFuerExport(plan);
  blatt.zeile(
    { text: "Szenarienvergleich", stil: "kopf" },
    ...spalten.map((spalte) => ({ text: spalte.name, stil: "kopf" as const })),
  );
  blatt.fixierenZeile = 1;
  blatt.fixierenSpalte = 1;
  const zeilen: [
    string,
    (spalte: (typeof spalten)[number]) => string | number,
    "euro" | "text" | "ganzzahl",
  ][] = [
    ["Art", (spalte) => spalte.art, "text"],
    ["Umsatz Planjahr 1", (spalte) => (spalte.umsatzPlanjahreCents[0] ?? 0) / 100, "euro"],
    ["Umsatz Planjahr 2", (spalte) => (spalte.umsatzPlanjahreCents[1] ?? 0) / 100, "euro"],
    ["Umsatz Planjahr 3", (spalte) => (spalte.umsatzPlanjahreCents[2] ?? 0) / 100, "euro"],
    [
      "Ergebnis nach Steuern Planjahr 1",
      (spalte) => (spalte.ergebnisNachSteuernPlanjahreCents[0] ?? 0) / 100,
      "euro",
    ],
    [
      "Ergebnis nach Steuern Planjahr 2",
      (spalte) => (spalte.ergebnisNachSteuernPlanjahreCents[1] ?? 0) / 100,
      "euro",
    ],
    [
      "Ergebnis nach Steuern Planjahr 3",
      (spalte) => (spalte.ergebnisNachSteuernPlanjahreCents[2] ?? 0) / 100,
      "euro",
    ],
    ["Tiefster Kontostand", (spalte) => (spalte.tiefsterKontostandCents ?? 0) / 100, "euro"],
    ["Monat des Tiefstands", (spalte) => spalte.tiefsterKontostandMonat ?? "–", "text"],
    ["Kapitalbedarf", (spalte) => (spalte.kapitalbedarfCents ?? 0) / 100, "euro"],
    ["Break-even", (spalte) => spalte.breakEvenMonat ?? "nicht erreicht", "text"],
    [
      "Tragfähigkeit Planjahr 2",
      (spalte) =>
        spalte.tragfaehigkeitAnwendbar ? (spalte.tragfaehigkeitPlanjahr2Cents ?? 0) / 100 : "–",
      "euro",
    ],
    ["Fehler", (spalte) => spalte.fehler, "ganzzahl"],
    ["Warnungen", (spalte) => spalte.warnungen, "ganzzahl"],
    ["Hinweise", (spalte) => spalte.hinweise, "ganzzahl"],
  ];
  for (const [label, wert, format] of zeilen) {
    blatt.zeile(
      { text: label },
      ...spalten.map((spalte) => {
        const inhalt = wert(spalte);
        if (typeof inhalt === "number" && format !== "text") {
          return { zahl: inhalt, format, stil: "formel" as const };
        }
        return { text: String(inhalt), stil: "formel" as const };
      }),
    );
  }
  blatt.zeile({
    text: "Die Vergleichsspalten sind feste Werte aller Szenarien. Nur das gewählte Szenario ist in den übrigen Blättern durchgerechnet.",
    stil: "hinweis",
  });
  blatt.breite(1, 42);
  return blatt;
}

function neuerBericht(name: string, rechnung: Rechenmodell, hinweis: string): Blatt {
  const blatt = new Blatt(name);
  blatt.quer = true;
  blatt.fixierenZeile = 3;
  blatt.fixierenSpalte = 1;
  blatt.breite(1, 46);
  for (let spalte = 2; spalte <= 40; spalte += 1) blatt.breite(spalte, spalte % 13 === 1 ? 16 : 13);
  const kopf: Zelle[] = [{ text: name, stil: "kopf" }];
  const monate: Zelle[] = [{ text: "Monat", stil: "kopf" }];
  for (let index = 0; index < 36; index += 1) {
    kopf[berichtSpalte(index) - 1] = { text: `Monat ${index + 1}`, stil: "kopf" };
    monate[berichtSpalte(index) - 1] = {
      formel: `TEXT(Parameter!${spalteName(index + 2)}$3,"YYYY-MM")`,
      ergebnis: rechnung.monate[index] ?? "",
      stil: "kopf",
    };
    if ((index + 1) % 12 === 0) {
      const jahr = (index + 1) / 12;
      kopf[jahrSummenSpalte(jahr) - 1] = { text: `Planjahr ${jahr}`, stil: "kopf" };
      monate[jahrSummenSpalte(jahr) - 1] = { text: "Summe", stil: "kopf" };
    }
  }
  blatt.zeilen.push(kopf, monate);
  blatt.zeile({ text: hinweis, stil: "hinweis" });
  blatt.fixierenZeile = 3;
  return blatt;
}

type Verlauf = "bewegung" | "ende" | "anfang";

function euroZeile(
  blatt: Blatt,
  label: string,
  reihe: Reihe,
  verlauf: Verlauf,
  stil: Zellenstil,
): number {
  return anzeige(blatt, label, reihe, verlauf, stil, reihe.cents);
}

function euroZeileNegativ(blatt: Blatt, label: string, reihe: Reihe): number {
  const cents = reihe.cents.map((wert) => -wert);
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil: "normal" };
  for (let index = 0; index < 36; index += 1) {
    zellen[berichtSpalte(index) - 1] = {
      formel: `-${reihe.blatt.ref(reihe.zeile, index + 2)}/100`,
      ergebnis: cents[index]! / 100,
      format: "euro",
      stil: "formel",
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = spalteName(berichtSpalte((jahr - 1) * 12));
    const bis = spalteName(berichtSpalte(jahr * 12 - 1));
    const summe = cents.slice((jahr - 1) * 12, jahr * 12).reduce((total, wert) => total + wert, 0);
    zellen[jahrSummenSpalte(jahr) - 1] = {
      formel: `SUM(${von}${zeile}:${bis}${zeile})`,
      ergebnis: summe / 100,
      format: "euro",
      stil: "formel",
    };
  }
  blatt.zeilen.push(zellen);
  return blatt.zeilen.length;
}

function anzeige(
  blatt: Blatt,
  label: string,
  reihe: Reihe,
  verlauf: Verlauf,
  stil: Zellenstil,
  cents: readonly number[],
): number {
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil: stil === "ergebnis" ? "ergebnis" : "normal" };
  for (let index = 0; index < 36; index += 1) {
    zellen[berichtSpalte(index) - 1] = {
      formel: `${reihe.blatt.ref(reihe.zeile, index + 2)}/100`,
      ergebnis: (cents[index] ?? 0) / 100,
      format: "euro",
      stil,
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const vonIndex = (jahr - 1) * 12;
    const bisIndex = jahr * 12 - 1;
    const von = spalteName(berichtSpalte(vonIndex));
    const bis = spalteName(berichtSpalte(bisIndex));
    const summe = cents.slice(vonIndex, bisIndex + 1).reduce((total, wert) => total + wert, 0);
    const wert =
      verlauf === "bewegung"
        ? summe
        : verlauf === "ende"
          ? (cents[bisIndex] ?? 0)
          : (cents[vonIndex] ?? 0);
    const formel =
      verlauf === "bewegung"
        ? `SUM(${von}${zeile}:${bis}${zeile})`
        : verlauf === "ende"
          ? `${bis}${zeile}`
          : `${von}${zeile}`;
    zellen[jahrSummenSpalte(jahr) - 1] = { formel, ergebnis: wert / 100, format: "euro", stil };
  }
  blatt.zeilen.push(zellen);
  return zeile;
}

function differenzZeile(
  blatt: Blatt,
  label: string,
  links: Reihe,
  rechts: Reihe,
  cents: number[],
): { blatt: Blatt; zeile: number } {
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil: "ergebnis" };
  for (let index = 0; index < 36; index += 1) {
    zellen[berichtSpalte(index) - 1] = {
      formel: `(${links.blatt.ref(links.zeile, index + 2)}-${rechts.blatt.ref(rechts.zeile, index + 2)})/100`,
      ergebnis: (cents[index] ?? 0) / 100,
      format: "euro",
      stil: "ergebnis",
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = spalteName(berichtSpalte((jahr - 1) * 12));
    const bis = spalteName(berichtSpalte(jahr * 12 - 1));
    const summe = cents.slice((jahr - 1) * 12, jahr * 12).reduce((total, wert) => total + wert, 0);
    zellen[jahrSummenSpalte(jahr) - 1] = {
      formel: `SUM(${von}${zeile}:${bis}${zeile})`,
      ergebnis: summe / 100,
      format: "euro",
      stil: "ergebnis",
    };
  }
  blatt.zeilen.push(zellen);
  return { blatt, zeile };
}

function summenZeile(blatt: Blatt, label: string, reihen: Reihe[]): number {
  const cents = Array.from({ length: 36 }, (_, index) =>
    reihen.reduce((summe, reihe) => summe + (reihe.cents[index] ?? 0), 0),
  );
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil: "ergebnis" };
  for (let index = 0; index < 36; index += 1) {
    zellen[berichtSpalte(index) - 1] = {
      formel: `(${reihen.map((reihe) => reihe.blatt.ref(reihe.zeile, index + 2)).join("+") || "0"})/100`,
      ergebnis: (cents[index] ?? 0) / 100,
      format: "euro",
      stil: "ergebnis",
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = spalteName(berichtSpalte((jahr - 1) * 12));
    const bis = spalteName(berichtSpalte(jahr * 12 - 1));
    const summe = cents.slice((jahr - 1) * 12, jahr * 12).reduce((total, wert) => total + wert, 0);
    zellen[jahrSummenSpalte(jahr) - 1] = {
      formel: `SUM(${von}${zeile}:${bis}${zeile})`,
      ergebnis: summe / 100,
      format: "euro",
      stil: "ergebnis",
    };
  }
  blatt.zeilen.push(zellen);
  return zeile;
}

function summenZeileMitCents(
  blatt: Blatt,
  label: string,
  reihen: Reihe[],
  cents: number[],
  abzug: Reihe,
): number {
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil: "normal" };
  for (let index = 0; index < 36; index += 1) {
    const plus = reihen.map((reihe) => reihe.blatt.ref(reihe.zeile, index + 2)).join("+");
    zellen[berichtSpalte(index) - 1] = {
      formel: `(${plus}-${abzug.blatt.ref(abzug.zeile, index + 2)})/100`,
      ergebnis: (cents[index] ?? 0) / 100,
      format: "euro",
      stil: "formel",
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = spalteName(berichtSpalte((jahr - 1) * 12));
    const bis = spalteName(berichtSpalte(jahr * 12 - 1));
    const summe = cents.slice((jahr - 1) * 12, jahr * 12).reduce((total, wert) => total + wert, 0);
    zellen[jahrSummenSpalte(jahr) - 1] = {
      formel: `SUM(${von}${zeile}:${bis}${zeile})`,
      ergebnis: summe / 100,
      format: "euro",
      stil: "formel",
    };
  }
  blatt.zeilen.push(zellen);
  return zeile;
}

function summenAnzeige(blatt: Blatt, label: string, cents: number[], stil: Zellenstil): number {
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil };
  for (let index = 0; index < 36; index += 1) {
    zellen[berichtSpalte(index) - 1] = {
      zahl: (cents[index] ?? 0) / 100,
      format: "euro",
      stil,
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = spalteName(berichtSpalte((jahr - 1) * 12));
    const bis = spalteName(berichtSpalte(jahr * 12 - 1));
    const summe = cents.slice((jahr - 1) * 12, jahr * 12).reduce((total, wert) => total + wert, 0);
    zellen[jahrSummenSpalte(jahr) - 1] = {
      formel: `SUM(${von}${zeile}:${bis}${zeile})`,
      ergebnis: summe / 100,
      format: "euro",
      stil,
    };
  }
  blatt.zeilen.push(zellen);
  return zeile;
}

function differenzAnzeige(blatt: Blatt, label: string, links: number, rechts: number): void {
  const linksZeile = links;
  const rechtsZeile = rechts;
  const zeile = blatt.zeilen.length + 1;
  const zellen: Zelle[] = Array.from({ length: jahrSummenSpalte(3) }, () => ({}));
  zellen[0] = { text: label, stil: "ergebnis" };
  for (let index = 0; index < 36; index += 1) {
    const spalte = spalteName(berichtSpalte(index));
    zellen[berichtSpalte(index) - 1] = {
      formel: `${spalte}${linksZeile}-${spalte}${rechtsZeile}`,
      format: "euro",
      stil: "ergebnis",
    };
  }
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = spalteName(berichtSpalte((jahr - 1) * 12));
    const bis = spalteName(berichtSpalte(jahr * 12 - 1));
    zellen[jahrSummenSpalte(jahr) - 1] = {
      formel: `SUM(${von}${zeile}:${bis}${zeile})`,
      format: "euro",
      stil: "ergebnis",
    };
  }
  blatt.zeilen.push(zellen);
}

function quoteZeile(
  blatt: Blatt,
  label: string,
  umsatz: Reihe,
  andere: Reihe | { zeile: number },
  rohertrag: boolean,
): void {
  const zellen: Zelle[] = [{ text: label }];
  for (let jahr = 1; jahr <= 3; jahr += 1) {
    const von = (jahr - 1) * 12;
    const bis = jahr * 12 - 1;
    const summe = (reihe: Reihe) =>
      `SUM(${reihe.blatt.ref(reihe.zeile, von + 2)}:${reihe.blatt.ref(reihe.zeile, bis + 2)})`;
    const nenner = summe(umsatz);
    const zaehler = rohertrag
      ? `(${summe(umsatz)}-${summe(andere as Reihe)})`
      : `SUM(${spalteName(berichtSpalte(von))}${"zeile" in andere ? andere.zeile : 0}:${spalteName(berichtSpalte(bis))}${"zeile" in andere ? andere.zeile : 0})*100`;
    zellen.push({
      formel: `IF(${nenner}=0,"–",${zaehler}/${nenner})`,
      format: "prozent",
      stil: "formel",
    });
  }
  blatt.zeile(...zellen);
}

function breakEven(nach: { zeile: number }): string {
  const teile: string[] = [];
  for (let index = 0; index < 36; index += 1) {
    const spalte = spalteName(berichtSpalte(index));
    teile.push(`IF(${spalte}${nach.zeile}>0,"${index + 1}",`);
  }
  return `${teile.join("")}"nicht erreicht"${")".repeat(36)}`;
}

function bereich(reihe: Reihe): string {
  return `${reihe.blatt.ref(reihe.zeile, 2)}:${spalteName(37)}${reihe.zeile}`;
}

function summeFormel(reihe: Reihe): string {
  return `SUM(${reihe.blatt.ref(reihe.zeile, 2)}:${reihe.blatt.ref(reihe.zeile, 37)})`;
}

export { szenarioFaktoren };
