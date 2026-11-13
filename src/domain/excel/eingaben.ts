import { monthIndex } from "../months.ts";
import { neutralerHebel } from "../szenarien/standard.ts";
import type { SzenarioFaktoren } from "../calc/szenario.ts";
import type {
  Einmalkosten,
  Finanzplan,
  Investition,
  IsoMonth,
  Kostenposition,
  MengenVorgabe,
  MonatswertVorgabe,
  Personalstelle,
  SzenarioHebel,
  Umsatzposition,
} from "../types.ts";
import { Blatt, type Zelle } from "./gitter.ts";
import { fZahlungsziel } from "./formeln.ts";
import { zahlungszielMonate } from "../zahlung.ts";

export interface GeldZellen {
  basis: string;
  modus: string;
  rate: string;
  bezug: string;
  saisonVon: string;
  saisonBis: string;
  overrides: string[];
  einheit: "euro" | "menge";
}

export interface UmsatzZellen {
  bezeichnung: string;
  art: Umsatzposition["art"];
  geld?: GeldZellen;
  menge?: GeldZellen;
  preis?: GeldZellen;
  ust: string;
  tage: string;
  ziel: string;
  weArt: string;
  weQuote: string;
  weUst: string;
  aktivVon: string;
  aktivBis: string;
  faktorMenge: string;
  faktorPreis: string;
}

export interface PersonalZellen {
  bezeichnung: string;
  geld: GeldZellen;
  neben: string;
  eintritt: string;
  austritt: string;
  faktor: string;
  sonder: { index: string; betrag: string }[];
}

export interface KostenZellen {
  bezeichnung: string;
  kategorie: string;
  raum: string;
  art: Kostenposition["art"];
  geld?: GeldZellen;
  quote?: string;
  ust: string;
  tage: string;
  ziel: string;
  betriebsausgabe: string;
  privatanteil: string;
  aktivVon: string;
  aktivBis: string;
  faktor: string;
  zuschlag: string;
}

export interface AnlageZellen {
  herkunft: "investition" | "gruendung" | "anlauf";
  bezeichnung: string;
  methode: string;
  netto: string;
  ust: string;
  dauer: string;
  rest: string;
  kauf: string;
  afaStart: string;
  tage: string;
  ziel: string;
}

export interface EinmalZellen {
  herkunft: "gruendung" | "anlauf";
  bezeichnung: string;
  netto: string;
  ust: string;
  monat: string;
  ziel: string;
}

export interface DarlehenZellen {
  bezeichnung: string;
  nominal: string;
  zins: string;
  art: string;
  laufzeit: string;
  frei: string;
  zinsInFrei: string;
  anteil: string;
  gebuehren: string;
  disagio: string;
  tranchen: { index: string; betrag: string }[];
}

export interface PostenZellen {
  bezeichnung: string;
  betrag: string;
  index: string;
}

export interface ZuschussZellen {
  bezeichnung: string;
  steuerfrei: string;
  art: "gruendungszuschuss" | "frei";
  alg?: string;
  pauschale?: string;
  phase1?: string;
  phase2?: string;
  phase2An?: string;
  start?: string;
  positionen: { index: string; betrag: string }[];
}

export interface PersonZellen {
  name: string;
  anteil: string;
  weitere: string;
  kinder: string;
  splitting: string;
  kirchensteuer: string;
  lebenshaltung?: GeldZellen;
  kranken?: GeldZellen;
  pflege?: GeldZellen;
  alter?: GeldZellen;
  sonstige?: GeldZellen;
}

export interface Skalare {
  vorhaben: string;
  rechtsform: string;
  bundesland: string;
  startJahr: string;
  startMonat: string;
  hebesatz: string;
  klein: string;
  vorsteuer: string;
  ist: string;
  viertel: string;
  dauerfrist: string;
  abschluss: string;
  betriebsmittel: string;
  reserve: string;
  waren: string;
  warenSatz: string;
  umsatzHebel: string;
  shift: string;
  warePunkte: string;
  personalHebel: string;
  kostenHebel: string;
  umsatzGlobal: string;
  kostenGlobal: string;
  personalGlobal: string;
  sofortGrenze: string;
  kstSatz: string;
  soliSatz: string;
  soliFrei: string;
  soliMild: string;
  messzahl: string;
  freiPersonen: string;
  freiKapital: string;
  abrundung: string;
  anrechnungFaktor: string;
  grundfreibetrag: string;
  kinderFreibetrag: string;
  bea: string;
  spitzen: string;
  reichen: string;
  zone2Bis: string;
  zone3Bis: string;
  zone4Bis: string;
  zone3Schwelle: string;
  zone2Faktor: string;
  zone2Summand: string;
  zone3Faktor: string;
  zone3Summand: string;
  zone3Konstante: string;
  zone4Abzug: string;
  zone5Abzug: string;
  kistBayern: string;
  kistUebrige: string;
}

export interface EingabeModell {
  blatt: Blatt;
  skalare: Skalare;
  umsatz: UmsatzZellen[];
  personal: PersonalZellen[];
  kosten: KostenZellen[];
  anlagen: AnlageZellen[];
  einmal: EinmalZellen[];
  darlehen: DarlehenZellen[];
  eigenkapital: PostenZellen[];
  zuschuesse: ZuschussZellen[];
  personen: PersonZellen[];
}

export function baueEingaben(
  plan: Finanzplan,
  start: IsoMonth,
  hebel: SzenarioHebel,
  faktoren: SzenarioFaktoren,
  szenarioName: string,
  hebelHinweis: string,
): EingabeModell {
  const blatt = new Blatt("Eingaben");
  blatt.fixierenZeile = 4;
  blatt.fixierenSpalte = 1;
  blatt.breite(1, 46);
  for (let spalte = 2; spalte <= 40; spalte += 1) blatt.breite(spalte, 14);

  blatt.zeile({ text: "Eingaben", stil: "kopf" });
  blatt.zeile({
    text: `Szenario: ${szenarioName}. Gelbe Zellen sind Eingaben. Änderungen rechnen in den Berichtsblättern weiter.`,
    stil: "hinweis",
  });
  blatt.zeile({ text: hebelHinweis, stil: "hinweis" });
  blatt.zeile({ text: "Stammdaten", stil: "abschnitt" });

  const feld = (label: string, zelle: Zelle) => {
    const zeile = blatt.zeile({ text: label }, zelle);
    return blatt.ref(zeile, 2);
  };
  const zahl = (label: string, wert: number, format: Zelle["format"] = "zahl") =>
    feld(label, { zahl: wert, format, stil: "eingabe" });
  const text = (label: string, wert: string) => feld(label, { text: wert, stil: "eingabe" });
  const euro = (label: string, cent: number) =>
    feld(label, { zahl: cent / 100, format: "euro", stil: "eingabe" });
  const leerOderZahl = (label: string, wert: number | undefined, format: Zelle["format"]) => {
    if (wert == null) return feld(label, { stil: "eingabe", format });
    return feld(label, { zahl: wert, format, stil: "eingabe" });
  };

  const steuer = plan.parameter.steuer;
  const tarif = steuer.einkommensteuerTarif;
  const skalare: Skalare = {
    vorhaben: text("Vorhaben", plan.stammdaten.firmenname || plan.stammdaten.planName),
    rechtsform: text("Rechtsform", plan.stammdaten.rechtsform ?? ""),
    bundesland: text("Bundesland", plan.stammdaten.bundesland ?? ""),
    startJahr: zahl("Startjahr", Number(start.slice(0, 4)), "ganzzahl"),
    startMonat: zahl("Startmonat", Number(start.slice(5, 7)), "ganzzahl"),
    hebesatz: leerOderZahl(
      "Gewerbesteuer-Hebesatz in Prozent",
      plan.stammdaten.gewerbesteuerHebesatz,
      "ganzzahl",
    ),
    klein: zahl(
      "Kleinunternehmer (1 = ja)",
      plan.umsatzsteuer.regime === "kleinunternehmer" ? 1 : 0,
      "ganzzahl",
    ),
    vorsteuer: zahl(
      "Vorsteuerabzug (1 = ja)",
      plan.umsatzsteuer.regime !== "kleinunternehmer" && plan.umsatzsteuer.vorsteuerabzugsberechtigt
        ? 1
        : 0,
      "ganzzahl",
    ),
    ist: zahl(
      "Ist-Versteuerung (1 = ja)",
      plan.umsatzsteuer.versteuerungsart === "ist" ? 1 : 0,
      "ganzzahl",
    ),
    viertel: zahl(
      "Voranmeldung vierteljährlich (1 = ja, 0 = monatlich)",
      plan.umsatzsteuer.voranmeldungszeitraum === "vierteljaehrlich" ? 1 : 0,
      "ganzzahl",
    ),
    dauerfrist: zahl(
      "Dauerfristverlängerung (1 = ja)",
      plan.umsatzsteuer.dauerfristverlaengerung ? 1 : 0,
      "ganzzahl",
    ),
    abschluss: zahl(
      "Abschlusszahlung, Kalendermonat",
      plan.steuerplanung.abschlusszahlungMonat,
      "ganzzahl",
    ),
    betriebsmittel: euro(
      "Betriebsmittelbedarf",
      plan.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents,
    ),
    reserve: euro("Liquiditätsreserve", plan.kapitalbedarf.betriebsmittel.liquiditaetsreserveCents),
    waren: euro(
      "Waren-Erstbestand netto",
      plan.kapitalbedarf.betriebsmittel.warenErstbestandNettoCents ?? 0,
    ),
    warenSatz: zahl(
      "Umsatzsteuersatz Waren-Erstbestand",
      plan.kapitalbedarf.betriebsmittel.umsatzsteuerSatzWaren ?? 0,
      "prozent",
    ),
    umsatzHebel: zahl("Hebel Umsatzfaktor", hebel.umsatzFaktor, "faktor"),
    shift: zahl("Hebel Umsatzstart, Monate später", hebel.umsatzstartMonate, "ganzzahl"),
    warePunkte: zahl("Hebel Wareneinsatz, Prozentpunkte", hebel.wareneinsatzPunkte, "prozent"),
    personalHebel: zahl("Hebel Personalfaktor", hebel.personalFaktor, "faktor"),
    kostenHebel: zahl("Hebel Kostenfaktor", hebel.kostenFaktor, "faktor"),
    umsatzGlobal: zahl("Faktor Umsatz (Ansicht Best/Real/Worst)", faktoren.umsatzGlobal, "faktor"),
    kostenGlobal: zahl("Faktor laufende Kosten (Ansicht)", faktoren.kostenGlobal, "faktor"),
    personalGlobal: zahl("Faktor Personal (Ansicht)", faktoren.personalGlobal, "faktor"),
    sofortGrenze: euro("Grenze Sofortaufwand", steuer.sammelpostenMinNettoCents),
    kstSatz: zahl("Körperschaftsteuersatz", steuer.koerperschaftsteuerSatz, "prozent"),
    soliSatz: zahl("Solidaritätszuschlag", steuer.solidaritaetszuschlagSatz, "prozent"),
    soliFrei: euro(
      "Soli-Freigrenze, Einzelveranlagung",
      steuer.solidaritaetszuschlagFreigrenzeCents,
    ),
    soliMild: zahl("Soli-Milderungssatz", steuer.solidaritaetszuschlagMilderungSatz, "prozent"),
    messzahl: zahl("Gewerbesteuer-Messzahl", steuer.gewerbesteuerMesszahl, "prozent"),
    freiPersonen: euro(
      "Gewerbesteuer-Freibetrag Personenunternehmen",
      steuer.gewerbesteuerFreibetragPersonenCents,
    ),
    freiKapital: euro(
      "Gewerbesteuer-Freibetrag Kapitalgesellschaft",
      steuer.gewerbesteuerFreibetragKapitalCents,
    ),
    abrundung: euro("Gewerbeertrag, Abrundung", steuer.gewerbeertragAbrundungCents),
    anrechnungFaktor: zahl(
      "Anrechnungsfaktor § 35 EStG",
      steuer.gewerbesteuerAnrechnungFaktor,
      "faktor",
    ),
    grundfreibetrag: euro("Grundfreibetrag", steuer.einkommensteuerGrundfreibetragCents),
    kinderFreibetrag: euro(
      "Kinderfreibetrag je Elternteil",
      steuer.kinderfreibetragJeElternteilCents,
    ),
    bea: euro("BEA-Freibetrag je Elternteil", steuer.beaFreibetragJeElternteilCents),
    spitzen: zahl("Spitzensteuersatz", steuer.einkommensteuerSpitzensteuersatz, "prozent"),
    reichen: zahl("Reichensteuersatz", steuer.einkommensteuerReichensteuersatz, "prozent"),
    zone2Bis: zahl("Tarif Zone 2 bis Euro", tarif.zone2BisEuro, "ganzzahl"),
    zone3Bis: zahl("Tarif Zone 3 bis Euro", tarif.zone3BisEuro, "ganzzahl"),
    zone4Bis: zahl("Tarif Zone 4 bis Euro", tarif.zone4BisEuro, "ganzzahl"),
    zone3Schwelle: zahl("Tarif Schwelle Zone 3, Euro", tarif.zone3SchwelleEuro, "ganzzahl"),
    zone2Faktor: zahl("Tarif Zone 2 Faktor, Hundertstel", tarif.zone2FaktorHundertstel, "ganzzahl"),
    zone2Summand: zahl("Tarif Zone 2 Summand", tarif.zone2Summand, "ganzzahl"),
    zone3Faktor: zahl("Tarif Zone 3 Faktor, Hundertstel", tarif.zone3FaktorHundertstel, "ganzzahl"),
    zone3Summand: zahl("Tarif Zone 3 Summand", tarif.zone3Summand, "ganzzahl"),
    zone3Konstante: zahl(
      "Tarif Zone 3 Konstante, Hundertstel",
      tarif.zone3KonstanteHundertstel,
      "ganzzahl",
    ),
    zone4Abzug: zahl("Tarif Zone 4 Abzug, Hundertstel", tarif.zone4AbzugHundertstel, "ganzzahl"),
    zone5Abzug: zahl("Tarif Zone 5 Abzug, Hundertstel", tarif.zone5AbzugHundertstel, "ganzzahl"),
    kistBayern: zahl(
      "Kirchensteuer Bayern und Baden-Württemberg",
      steuer.kirchensteuerSatzBayernBadenWuerttemberg,
      "prozent",
    ),
    kistUebrige: zahl(
      "Kirchensteuer übrige Länder",
      steuer.kirchensteuerSatzUebrigeLaender,
      "prozent",
    ),
  };

  blatt.zeile({ text: "Personen", stil: "abschnitt" });
  const personen = plan.stammdaten.personen.map((person) => personZellen(blatt, person, start));

  blatt.zeile({ text: "Umsatz", stil: "abschnitt" });
  blatt.zeile({
    text: "Je Linie: Betrag oder Menge, Wachstum (0 keines, 1 monatlich, 2 Jahressprung), Rate, Bezug in Monaten ab Start, dann zwölf Saisonfaktoren Januar bis Dezember. Die nächste Zeile trägt Monatsausnahmen.",
    stil: "hinweis",
  });
  const umsatz = plan.umsatzplanung.map((linie) => umsatzZellen(blatt, linie, start, faktoren));

  blatt.zeile({ text: "Personal", stil: "abschnitt" });
  const personal = plan.personal.map((stelle) => personalZellen(blatt, stelle, start, faktoren));

  blatt.zeile({ text: "Laufende Kosten", stil: "abschnitt" });
  const kosten = plan.laufendeKosten.map((position) =>
    kostenZellen(blatt, position, start, faktoren),
  );

  blatt.zeile({ text: "Investitionen und aktivierte Einmalkosten", stil: "abschnitt" });
  blatt.zeile({
    text: "Methode: 1 linear, 2 geringwertiges Wirtschaftsgut, 3 Sammelposten über 60 Monate. Unter der Sofortgrenze wird der Nettobetrag Aufwand.",
    stil: "hinweis",
  });
  const anlagen = [
    ...plan.kapitalbedarf.investitionen.map((anlage) =>
      anlageZellen(blatt, anlage, start, "investition"),
    ),
    ...plan.kapitalbedarf.gruendungskosten.flatMap((posten) =>
      alsAnlage(posten).map((anlage) => anlageZellen(blatt, anlage, start, "gruendung")),
    ),
    ...plan.kapitalbedarf.anlaufkosten.flatMap((posten) =>
      alsAnlage(posten).map((anlage) => anlageZellen(blatt, anlage, start, "anlauf")),
    ),
  ];

  blatt.zeile({ text: "Gründung und Anlauf, sofort Aufwand", stil: "abschnitt" });
  const einmal = [
    ...plan.kapitalbedarf.gruendungskosten
      .filter((posten) => posten.buchung.art === "aufwand")
      .map((posten) => einmalZellen(blatt, posten, start, "gruendung")),
    ...plan.kapitalbedarf.anlaufkosten
      .filter((posten) => posten.buchung.art === "aufwand")
      .map((posten) => einmalZellen(blatt, posten, start, "anlauf")),
  ];

  blatt.zeile({ text: "Eigenmittel", stil: "abschnitt" });
  const eigenkapital = plan.finanzierung.eigenkapital.map((posten) =>
    postenBetrag(blatt, posten.bezeichnung, posten.betragCents, planIndex(start, posten.monat)),
  );

  blatt.zeile({ text: "Darlehen", stil: "abschnitt" });
  blatt.zeile({
    text: "Tilgung: 1 Annuität, 2 Ratentilgung, 3 endfällig. Die erste Rate liegt im Monat nach der ersten Auszahlung.",
    stil: "hinweis",
  });
  const darlehen = plan.finanzierung.darlehen.map((posten) => darlehenZellen(blatt, posten, start));

  blatt.zeile({ text: "Zuschüsse", stil: "abschnitt" });
  const zuschuesse = plan.finanzierung.zuschuesse.map((zuschuss) =>
    zuschussZellen(blatt, zuschuss, start),
  );

  return {
    blatt,
    skalare,
    umsatz,
    personal,
    kosten,
    anlagen,
    einmal,
    darlehen,
    eigenkapital,
    zuschuesse,
    personen,
  };
}

export function hebelFuerExport(
  plan: Finanzplan,
  szenarioId: string,
): {
  hebel: SzenarioHebel;
  hinweis: string;
  name: string;
} {
  if (szenarioId === "basis") {
    return {
      hebel: neutralerHebel(),
      name: "Basisplan",
      hinweis:
        "Hebel stehen auf neutral. Wer sie ändert, rechnet das Blatt neu: Umsatzfaktor, späterer Umsatzstart, Wareneinsatzpunkte, Personal- und Kostenfaktor.",
    };
  }
  const eintrag = plan.planSzenarien.eintraege.find((item) => item.id === szenarioId);
  if (!eintrag) {
    return {
      hebel: neutralerHebel(),
      name: "Basisplan",
      hinweis: "Das Szenario fehlt. Ausgegeben ist der Basisplan.",
    };
  }
  if (eintrag.art === "abweichung") {
    return {
      hebel: eintrag.hebel,
      name: eintrag.name,
      hinweis: `Abweichung „${eintrag.name}“. Die Hebel-Zellen sind angewendet und können geändert werden. Investitionen, Finanzierung und Lebenshaltung bleiben unskaliert.`,
    };
  }
  return {
    hebel: neutralerHebel(),
    name: eintrag.name,
    hinweis: `Kopie „${eintrag.name}“. Die Eingaben sind der gespeicherte Stand. Die Hebel-Zellen stehen auf neutral und wirken zusätzlich, wenn sie geändert werden.`,
  };
}

function personZellen(
  blatt: Blatt,
  person: Finanzplan["stammdaten"]["personen"][number],
  start: IsoMonth,
): PersonZellen {
  const profil = person.steuerprofil;
  const zeile = blatt.zeile(
    { text: person.name },
    { zahl: person.anteil, format: "prozent", stil: "eingabe" },
    { zahl: (profil?.weitereEinkuenfteJahrCents ?? 0) / 100, format: "euro", stil: "eingabe" },
    { zahl: profil?.kinderfreibetraege ?? 0, format: "zahl", stil: "eingabe" },
    { zahl: profil?.splitting ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
    { zahl: profil?.kirchensteuer ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
  );
  const basis = (spalte: number) => blatt.ref(zeile, spalte);
  const bedarf = person.lebensbedarf;
  return {
    name: person.name,
    anteil: basis(2),
    weitere: basis(3),
    kinder: basis(4),
    splitting: basis(5),
    kirchensteuer: basis(6),
    lebenshaltung: bedarf
      ? legeGeld(blatt, `${person.name} Lebenshaltung`, bedarf.lebenshaltung, start, "euro")
      : undefined,
    kranken: bedarf
      ? legeGeld(
          blatt,
          `${person.name} Krankenversicherung`,
          bedarf.krankenversicherung,
          start,
          "euro",
        )
      : undefined,
    pflege: bedarf
      ? legeGeld(
          blatt,
          `${person.name} Pflegeversicherung`,
          bedarf.pflegeversicherung,
          start,
          "euro",
        )
      : undefined,
    alter: bedarf
      ? legeGeld(blatt, `${person.name} Altersvorsorge`, bedarf.altersvorsorge, start, "euro")
      : undefined,
    sonstige: bedarf
      ? legeGeld(
          blatt,
          `${person.name} sonstige Vorsorge`,
          bedarf.sonstigeVersicherungen,
          start,
          "euro",
        )
      : undefined,
  };
}

function umsatzZellen(
  blatt: Blatt,
  linie: Umsatzposition,
  start: IsoMonth,
  faktoren: SzenarioFaktoren,
): UmsatzZellen {
  const faktor = faktoren.umsatz.get(linie.id);
  const mengeZelle = blatt.zeile(
    { text: `${linie.bezeichnung}: Faktor Menge, leer = global` },
    faktor
      ? { zahl: faktor.menge, format: "faktor", stil: "eingabe" }
      : { stil: "eingabe", format: "faktor" },
  );
  const preisZelle = blatt.zeile(
    { text: `${linie.bezeichnung}: Faktor Preis, leer = 1` },
    faktor
      ? { zahl: faktor.preis, format: "faktor", stil: "eingabe" }
      : { stil: "eingabe", format: "faktor" },
  );
  const ustZeile = blatt.zeile(
    { text: `${linie.bezeichnung}: Umsatzsteuersatz` },
    { zahl: linie.umsatzsteuerSatz, format: "prozent", stil: "eingabe" },
  );
  const tageZeile = blatt.zeile(
    { text: `${linie.bezeichnung}: Zahlungsziel Tage` },
    { zahl: linie.zahlungszielTage, format: "ganzzahl", stil: "eingabe" },
  );
  const tageRef = blatt.ref(tageZeile, 2);
  const zielZeile = blatt.zeile(
    { text: `${linie.bezeichnung}: Zahlungsziel Monate` },
    {
      formel: fZahlungsziel(tageRef),
      ergebnis: zahlungszielMonate(linie.zahlungszielTage),
      format: "ganzzahl",
      stil: "formel",
    },
  );
  const we = linie.wareneinsatz;
  const weZeile = blatt.zeile(
    { text: `${linie.bezeichnung}: Wareneinsatz (1 = Quote)` },
    { zahl: we.art === "prozent_vom_umsatz" ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
    { zahl: we.art === "prozent_vom_umsatz" ? we.quote : 0, format: "prozent", stil: "eingabe" },
    {
      zahl: we.art === "prozent_vom_umsatz" ? we.umsatzsteuerSatz : 0,
      format: "prozent",
      stil: "eingabe",
    },
  );
  const fenster = blatt.zeile(
    { text: `${linie.bezeichnung}: aktiv von / bis, Planmonat ab 0, leer = offen` },
    indexZelle(planIndex(start, linie.aktivVon)),
    indexZelle(planIndex(start, linie.aktivBis)),
  );
  return {
    bezeichnung: linie.bezeichnung,
    art: linie.art,
    geld:
      linie.art === "monatsumsatz"
        ? legeGeld(blatt, linie.bezeichnung, linie.monatsumsatz, start, "euro")
        : undefined,
    menge:
      linie.art === "menge_mal_preis"
        ? legeGeld(blatt, `${linie.bezeichnung} Menge`, linie.mengeProMonat, start, "menge")
        : undefined,
    preis:
      linie.art === "menge_mal_preis"
        ? legeGeld(blatt, `${linie.bezeichnung} Preis`, linie.preisNetto, start, "euro")
        : undefined,
    ust: blatt.ref(ustZeile, 2),
    tage: tageRef,
    ziel: blatt.ref(zielZeile, 2),
    weArt: blatt.ref(weZeile, 2),
    weQuote: blatt.ref(weZeile, 3),
    weUst: blatt.ref(weZeile, 4),
    aktivVon: blatt.ref(fenster, 2),
    aktivBis: blatt.ref(fenster, 3),
    faktorMenge: blatt.ref(mengeZelle, 2),
    faktorPreis: blatt.ref(preisZelle, 2),
  };
}

function personalZellen(
  blatt: Blatt,
  stelle: Personalstelle,
  start: IsoMonth,
  faktoren: SzenarioFaktoren,
): PersonalZellen {
  const faktor = faktoren.personal.get(stelle.id);
  const faktorZeile = blatt.zeile(
    { text: `${stelle.bezeichnung}: Gehaltsfaktor, leer = global` },
    faktor == null
      ? { stil: "eingabe", format: "faktor" }
      : { zahl: faktor, format: "faktor", stil: "eingabe" },
  );
  const nebenZeile = blatt.zeile(
    { text: `${stelle.bezeichnung}: Arbeitgeberanteil` },
    { zahl: stelle.agNebenkostenSatz, format: "prozent", stil: "eingabe" },
  );
  const fenster = blatt.zeile(
    { text: `${stelle.bezeichnung}: Eintritt / Austritt, Planmonat ab 0` },
    indexZelle(planIndex(start, stelle.eintritt)),
    indexZelle(planIndex(start, stelle.austritt)),
  );
  const sonder = (stelle.sonderzahlungen ?? []).map((eintrag) => {
    const zeile = blatt.zeile(
      { text: `${stelle.bezeichnung}: Sonderzahlung` },
      indexZelle(planIndex(start, eintrag.monat)),
      { zahl: eintrag.bruttoCents / 100, format: "euro", stil: "eingabe" },
    );
    return { index: blatt.ref(zeile, 2), betrag: blatt.ref(zeile, 3) };
  });
  return {
    bezeichnung: stelle.bezeichnung,
    geld: legeGeld(blatt, `${stelle.bezeichnung} Brutto`, stelle.brutto, start, "euro"),
    neben: blatt.ref(nebenZeile, 2),
    eintritt: blatt.ref(fenster, 2),
    austritt: blatt.ref(fenster, 3),
    faktor: blatt.ref(faktorZeile, 2),
    sonder,
  };
}

function kostenZellen(
  blatt: Blatt,
  position: Kostenposition,
  start: IsoMonth,
  faktoren: SzenarioFaktoren,
): KostenZellen {
  const faktor = faktoren.kosten.get(position.id);
  const faktorZeile = blatt.zeile(
    { text: `${position.bezeichnung}: Kostenfaktor, leer = global` },
    faktor
      ? { zahl: faktor.faktor, format: "faktor", stil: "eingabe" }
      : { stil: "eingabe", format: "faktor" },
  );
  const zuschlagZeile = blatt.zeile(
    { text: `${position.bezeichnung}: Cent-Zuschlag nach dem Faktor` },
    faktor && faktor.zuschlagCents !== 0
      ? { zahl: faktor.zuschlagCents / 100, format: "euro", stil: "eingabe" }
      : { stil: "eingabe", format: "euro" },
  );
  const satzZeile = blatt.zeile(
    { text: `${position.bezeichnung}: Umsatzsteuersatz` },
    { zahl: position.umsatzsteuerSatz, format: "prozent", stil: "eingabe" },
  );
  const tageZeile = blatt.zeile(
    { text: `${position.bezeichnung}: Zahlungsziel Tage` },
    { zahl: position.zahlungszielTage, format: "ganzzahl", stil: "eingabe" },
  );
  const tageRef = blatt.ref(tageZeile, 2);
  const zielZeile = blatt.zeile(
    { text: `${position.bezeichnung}: Zahlungsziel Monate` },
    {
      formel: fZahlungsziel(tageRef),
      ergebnis: zahlungszielMonate(position.zahlungszielTage),
      format: "ganzzahl",
      stil: "formel",
    },
  );
  const artZeile = blatt.zeile(
    {
      text: `${position.bezeichnung}: Betriebsausgabe, Privatanteil, Raum (1 = Miete oder Nebenkosten)`,
    },
    { zahl: position.betriebsausgabe ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
    { zahl: position.privatanteil ?? 0, format: "prozent", stil: "eingabe" },
    {
      zahl: position.kategorie === "miete" || position.kategorie === "nebenkosten" ? 1 : 0,
      format: "ganzzahl",
      stil: "eingabe",
    },
  );
  const fenster = blatt.zeile(
    { text: `${position.bezeichnung}: aktiv von / bis, Planmonat ab 0, leer = offen` },
    indexZelle(planIndex(start, position.aktivVon)),
    indexZelle(planIndex(start, position.aktivBis)),
  );
  let quote: string | undefined;
  if (position.art === "umsatzabhaengig") {
    const quoteZeile = blatt.zeile(
      { text: `${position.bezeichnung}: Umsatzquote` },
      { zahl: position.umsatzquote, format: "prozent", stil: "eingabe" },
    );
    quote = blatt.ref(quoteZeile, 2);
  }
  return {
    bezeichnung: position.bezeichnung,
    kategorie: position.kategorie,
    raum: blatt.ref(artZeile, 4),
    art: position.art,
    geld:
      position.art === "fix"
        ? legeGeld(blatt, position.bezeichnung, position.betrag, start, "euro")
        : undefined,
    quote,
    ust: blatt.ref(satzZeile, 2),
    tage: tageRef,
    ziel: blatt.ref(zielZeile, 2),
    betriebsausgabe: blatt.ref(artZeile, 2),
    privatanteil: blatt.ref(artZeile, 3),
    aktivVon: blatt.ref(fenster, 2),
    aktivBis: blatt.ref(fenster, 3),
    faktor: blatt.ref(faktorZeile, 2),
    zuschlag: blatt.ref(zuschlagZeile, 2),
  };
}

function anlageZellen(
  blatt: Blatt,
  anlage: Investition,
  start: IsoMonth,
  herkunft: AnlageZellen["herkunft"],
): AnlageZellen {
  const methode = anlage.afaMethode === "linear" ? 1 : anlage.afaMethode === "sofort_gwg" ? 2 : 3;
  const dauer = anlage.afaMethode === "linear" ? anlage.nutzungsdauerMonate : 0;
  const zeile = blatt.zeile(
    { text: anlage.bezeichnung },
    { zahl: methode, format: "ganzzahl", stil: "eingabe" },
    { zahl: anlage.nettoCents / 100, format: "euro", stil: "eingabe" },
    { zahl: anlage.umsatzsteuerSatz, format: "prozent", stil: "eingabe" },
    { zahl: dauer, format: "ganzzahl", stil: "eingabe" },
    {
      zahl: (anlage.afaMethode === "sofort_gwg" ? 0 : (anlage.restwertCents ?? 0)) / 100,
      format: "euro",
      stil: "eingabe",
    },
    indexZelle(planIndex(start, anlage.anschaffungsmonat)),
    indexZelle(planIndex(start, anlage.afaStartMonat ?? anlage.anschaffungsmonat)),
    { zahl: anlage.zahlungszielTage, format: "ganzzahl", stil: "eingabe" },
  );
  const tage = blatt.ref(zeile, 9);
  const zielZeile = blatt.zeile(
    { text: `${anlage.bezeichnung}: Zahlungsziel Monate` },
    {
      formel: fZahlungsziel(tage),
      ergebnis: zahlungszielMonate(anlage.zahlungszielTage),
      format: "ganzzahl",
      stil: "formel",
    },
  );
  return {
    herkunft,
    bezeichnung: anlage.bezeichnung,
    methode: blatt.ref(zeile, 2),
    netto: blatt.ref(zeile, 3),
    ust: blatt.ref(zeile, 4),
    dauer: blatt.ref(zeile, 5),
    rest: blatt.ref(zeile, 6),
    kauf: blatt.ref(zeile, 7),
    afaStart: blatt.ref(zeile, 8),
    tage,
    ziel: blatt.ref(zielZeile, 2),
  };
}

function einmalZellen(
  blatt: Blatt,
  posten: Einmalkosten,
  start: IsoMonth,
  herkunft: EinmalZellen["herkunft"],
): EinmalZellen {
  const zeile = blatt.zeile(
    { text: posten.bezeichnung },
    { zahl: posten.nettoCents / 100, format: "euro", stil: "eingabe" },
    { zahl: posten.umsatzsteuerSatz, format: "prozent", stil: "eingabe" },
    indexZelle(planIndex(start, posten.monat)),
    { zahl: posten.zahlungszielTage, format: "ganzzahl", stil: "eingabe" },
  );
  const tage = blatt.ref(zeile, 5);
  const zielZeile = blatt.zeile(
    { text: `${posten.bezeichnung}: Zahlungsziel Monate` },
    {
      formel: fZahlungsziel(tage),
      ergebnis: zahlungszielMonate(posten.zahlungszielTage),
      format: "ganzzahl",
      stil: "formel",
    },
  );
  return {
    herkunft,
    bezeichnung: posten.bezeichnung,
    netto: blatt.ref(zeile, 2),
    ust: blatt.ref(zeile, 3),
    monat: blatt.ref(zeile, 4),
    ziel: blatt.ref(zielZeile, 2),
  };
}

function darlehenZellen(
  blatt: Blatt,
  darlehen: Finanzplan["finanzierung"]["darlehen"][number],
  start: IsoMonth,
): DarlehenZellen {
  const art =
    darlehen.tilgungsart === "annuitaet" ? 1 : darlehen.tilgungsart === "ratentilgung" ? 2 : 3;
  const zeile = blatt.zeile(
    { text: darlehen.bezeichnung },
    { zahl: darlehen.betragCents / 100, format: "euro", stil: "eingabe" },
    { zahl: darlehen.nominalzinsPa, format: "prozent", stil: "eingabe" },
    { zahl: art, format: "ganzzahl", stil: "eingabe" },
    { zahl: darlehen.laufzeitMonate, format: "ganzzahl", stil: "eingabe" },
    { zahl: darlehen.tilgungsfreieMonate, format: "ganzzahl", stil: "eingabe" },
    { zahl: darlehen.zinszahlungInTilgungsfreierZeit ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
    { zahl: darlehen.auszahlungAnteil ?? 1, format: "prozent", stil: "eingabe" },
    { zahl: (darlehen.gebuehrenCents ?? 0) / 100, format: "euro", stil: "eingabe" },
    { zahl: (darlehen.disagioCents ?? 0) / 100, format: "euro", stil: "eingabe" },
  );
  const tranchen = darlehen.auszahlungen.map((tranche, index) => {
    const zeileTranche = blatt.zeile(
      { text: `${darlehen.bezeichnung}: Tranche ${index + 1}` },
      indexZelle(planIndex(start, tranche.monat)),
      { zahl: tranche.betragCents / 100, format: "euro", stil: "eingabe" },
    );
    return { index: blatt.ref(zeileTranche, 2), betrag: blatt.ref(zeileTranche, 3) };
  });
  return {
    bezeichnung: darlehen.bezeichnung,
    nominal: blatt.ref(zeile, 2),
    zins: blatt.ref(zeile, 3),
    art: blatt.ref(zeile, 4),
    laufzeit: blatt.ref(zeile, 5),
    frei: blatt.ref(zeile, 6),
    zinsInFrei: blatt.ref(zeile, 7),
    anteil: blatt.ref(zeile, 8),
    gebuehren: blatt.ref(zeile, 9),
    disagio: blatt.ref(zeile, 10),
    tranchen,
  };
}

function zuschussZellen(
  blatt: Blatt,
  zuschuss: Finanzplan["finanzierung"]["zuschuesse"][number],
  start: IsoMonth,
): ZuschussZellen {
  const zeile = blatt.zeile(
    { text: zuschuss.bezeichnung },
    { zahl: zuschuss.steuerfrei ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
  );
  const auszahlung = zuschuss.auszahlung;
  if (auszahlung.art === "frei") {
    return {
      bezeichnung: zuschuss.bezeichnung,
      steuerfrei: blatt.ref(zeile, 2),
      art: "frei",
      positionen: auszahlung.positionen.map((posten) => {
        const postenZeile = blatt.zeile(
          { text: `${zuschuss.bezeichnung}: Zahlung` },
          indexZelle(planIndex(start, posten.monat)),
          { zahl: posten.betragCents / 100, format: "euro", stil: "eingabe" },
        );
        return { index: blatt.ref(postenZeile, 2), betrag: blatt.ref(postenZeile, 3) };
      }),
    };
  }
  const details = blatt.zeile(
    {
      text: `${zuschuss.bezeichnung}: ALG I, Pauschale, Phase 1, Phase 2 Monate, Phase 2 geplant, Startmonat`,
    },
    { zahl: auszahlung.alg1MonatlichCents / 100, format: "euro", stil: "eingabe" },
    { zahl: auszahlung.pauschaleCents / 100, format: "euro", stil: "eingabe" },
    { zahl: auszahlung.phase1Monate, format: "ganzzahl", stil: "eingabe" },
    { zahl: auszahlung.phase2Monate, format: "ganzzahl", stil: "eingabe" },
    { zahl: auszahlung.phase2Geplant ? 1 : 0, format: "ganzzahl", stil: "eingabe" },
    indexZelle(planIndex(start, auszahlung.startMonat)),
  );
  return {
    bezeichnung: zuschuss.bezeichnung,
    steuerfrei: blatt.ref(zeile, 2),
    art: "gruendungszuschuss",
    alg: blatt.ref(details, 2),
    pauschale: blatt.ref(details, 3),
    phase1: blatt.ref(details, 4),
    phase2: blatt.ref(details, 5),
    phase2An: blatt.ref(details, 6),
    start: blatt.ref(details, 7),
    positionen: [],
  };
}

function postenBetrag(
  blatt: Blatt,
  bezeichnung: string,
  cent: number,
  index: number | "",
): PostenZellen {
  const zeile = blatt.zeile(
    { text: bezeichnung },
    { zahl: cent / 100, format: "euro", stil: "eingabe" },
    indexZelle(index),
  );
  return { bezeichnung, betrag: blatt.ref(zeile, 2), index: blatt.ref(zeile, 3) };
}

function legeGeld(
  blatt: Blatt,
  label: string,
  vorgabe: MonatswertVorgabe | MengenVorgabe,
  start: IsoMonth,
  einheit: "euro" | "menge",
): GeldZellen {
  const wachstum = "wachstum" in vorgabe ? vorgabe.wachstum : undefined;
  const modus = !wachstum ? 0 : wachstum.modus === "yearly_step" ? 2 : 1;
  const rate = wachstum?.jahresrate ?? 0;
  const bezug = vorgabe.bezugsmonat ? monthIndex(start, vorgabe.bezugsmonat) : 0;
  const saison = vorgabe.saison?.faktoren ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const basisWert =
    einheit === "euro"
      ? (vorgabe as MonatswertVorgabe).basisCents / 100
      : (vorgabe as MengenVorgabe).basis;
  const param = blatt.zeile(
    { text: label },
    { zahl: basisWert, format: einheit === "euro" ? "euro" : "zahl", stil: "eingabe" },
    { zahl: modus, format: "ganzzahl", stil: "eingabe" },
    { zahl: rate, format: "prozent", stil: "eingabe" },
    { zahl: bezug, format: "ganzzahl", stil: "eingabe" },
    ...saison.map((faktor) => ({
      zahl: faktor,
      format: "zahl" as const,
      stil: "eingabe" as const,
    })),
  );
  const overrides: Zelle[] = Array.from({ length: 36 }, () => ({
    stil: "eingabe" as const,
    format: einheit === "euro" ? ("euro" as const) : ("zahl" as const),
  }));
  for (const eintrag of vorgabe.monatsOverride ?? []) {
    const index = monthIndex(start, eintrag.monat);
    if (index < 0 || index >= 36) continue;
    const wert = "wertCents" in eintrag ? eintrag.wertCents / 100 : eintrag.wert;
    overrides[index] = {
      stil: "eingabe",
      format: einheit === "euro" ? "euro" : "zahl",
      zahl: wert,
    };
  }
  const ausnahme = blatt.zeile({ text: `${label}, Monatsausnahme`, stil: "hinweis" }, ...overrides);
  return {
    basis: blatt.ref(param, 2),
    modus: blatt.ref(param, 3),
    rate: blatt.ref(param, 4),
    bezug: blatt.ref(param, 5),
    saisonVon: blatt.ref(param, 6),
    saisonBis: blatt.ref(param, 17),
    overrides: overrides.map((_, index) => blatt.ref(ausnahme, index + 2)),
    einheit,
  };
}

function indexZelle(wert: number | ""): Zelle {
  if (wert === "") return { stil: "eingabe", format: "ganzzahl" };
  return { zahl: wert, stil: "eingabe", format: "ganzzahl" };
}

function planIndex(start: IsoMonth, monat: IsoMonth | undefined): number | "" {
  if (!monat) return "";
  return monthIndex(start, monat);
}

function alsAnlage(posten: Einmalkosten): Investition[] {
  if (posten.buchung.art !== "anlage") return [];
  const buchung = posten.buchung;
  const basis = {
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    kategorie: "sonstiges" as const,
    nettoCents: posten.nettoCents,
    umsatzsteuerSatz: posten.umsatzsteuerSatz,
    anschaffungsmonat: posten.monat,
    zahlungszielTage: posten.zahlungszielTage,
    notizen: posten.notizen,
    afaStartMonat: buchung.afaStartMonat,
  };
  if (buchung.afaMethode === "linear") {
    return [
      {
        ...basis,
        afaMethode: "linear",
        nutzungsdauerMonate: buchung.nutzungsdauerMonate,
        restwertCents: buchung.restwertCents,
      },
    ];
  }
  if (buchung.afaMethode === "sofort_gwg") {
    return [{ ...basis, afaMethode: "sofort_gwg", nutzungsdauerMonate: 0 }];
  }
  return [{ ...basis, afaMethode: "sammelposten", restwertCents: buchung.restwertCents }];
}
