/**
 * Datenmodell eines 36-Monats-Finanzplans.
 *
 * Geldbeträge sind ganzzahlige Euro-Cent (1 Euro = 100).
 * Sätze sind Dezimalzahlen (0.19 = 19 %). Anteile ebenso (0.25 = 25 %).
 * Monate sind Zeichenketten `JJJJ-MM`. Zeitstempel sind ISO-8601 mit Zeitzone.
 *
 * Gespeichert werden Eingaben, keine fertig gerechneten Monatsspalten.
 * Die spätere Rechnung erzeugt GuV, Liquidität und Kennzahlen daraus.
 */

export const SCHEMA_VERSION = 1 as const;

export const PLAN_HORIZON_MONTHS = 36 as const;

export const WAEHRUNG = "EUR" as const;

/** Stabile Id innerhalb eines Plans. */
export type Id = string;

/** Kalendermonat, Format `JJJJ-MM`. */
export type IsoMonth = string;

/** Ganzzahlige Euro-Cent. */
export type EuroCents = number;

/** Dezimalsatz, z. B. 0.19 für 19 %. */
export type Satz = number;

export const PLAN_ZWECKE = [
  "gruendungszuschuss",
  "bank_kfw",
  "investoren_exist",
  "eigene_planung",
] as const;

/** Wofür der Plan gedacht ist. Mehrere Zwecke dürfen gleichzeitig gesetzt sein. */
export type PlanZweck = (typeof PLAN_ZWECKE)[number];

export const RECHTSFORMEN = [
  "einzelunternehmen",
  "freiberufler",
  "gbr",
  "ohg",
  "kg",
  "gmbh",
  "ug",
] as const;

export type Rechtsform = (typeof RECHTSFORMEN)[number];

export const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

export type Bundesland = (typeof BUNDESLAENDER)[number];

export const PERSON_ROLLEN = [
  "inhaber",
  "freiberufler",
  "gesellschafter",
  "komplementaer",
  "kommanditist",
  "geschaeftsfuehrer",
] as const;

export type PersonRolle = (typeof PERSON_ROLLEN)[number];

export const WACHSTUMSMODI = ["compound_monthly", "yearly_step"] as const;

/**
 * `compound_monthly`: Faktor (1 + jahresrate) hoch (Abstand in Monaten / 12).
 * `yearly_step`: der Satz springt alle 12 Monate, dazwischen bleibt er konstant.
 */
export type Wachstumsmodus = (typeof WACHSTUMSMODI)[number];

export interface Wachstum {
  /** 0.05 = 5 % pro Jahr. Negativ = Rückgang. Muss größer als -1 sein. */
  jahresrate: number;
  modus: Wachstumsmodus;
}

/** Index 0 = Januar … Index 11 = Dezember. 1 = neutral, 0 = kein Umsatz in dem Kalendermonat. */
export type MonatFaktoren = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Saisonmuster {
  faktoren: MonatFaktoren;
}

export interface MonatsOverride {
  monat: IsoMonth;
  /** Ersetzt den berechneten Cent-Betrag dieses Monats vollständig. */
  wertCents: EuroCents;
}

/**
 * Eingabe eines monatlichen Geldbetrags über den Horizont.
 * Nicht gespeichert wird die ausgerechnete 36-Monats-Reihe.
 */
export interface MonatswertVorgabe {
  /** Betrag im Bezugsmonat, vor Wachstum und Saison. */
  basisCents: EuroCents;
  /** Monat, auf den `basisCents` sich bezieht. Fehlt er, gilt der Planstart. */
  bezugsmonat?: IsoMonth;
  wachstum?: Wachstum;
  saison?: Saisonmuster;
  monatsOverride?: MonatsOverride[];
}

export interface MengenOverride {
  monat: IsoMonth;
  /** Ersetzt die berechnete Menge dieses Monats vollständig. */
  wert: number;
}

/** Wie MonatswertVorgabe, aber für Stück, Stunden oder Projekte. */
export interface MengenVorgabe {
  basis: number;
  bezugsmonat?: IsoMonth;
  wachstum?: Wachstum;
  saison?: Saisonmuster;
  monatsOverride?: MengenOverride[];
}

export interface Steuerprofil {
  /** Kirchensteuerpflicht, für eine spätere grobe Einkommensteuer. */
  kirchensteuer: boolean;
  /** Ehegattensplitting. */
  splitting: boolean;
  /** Anzahl Kinderfreibeträge, in 0,5-Schritten. */
  kinderfreibetraege?: number;
  /** Weitere jährliche Einkünfte außerhalb dieses Vorhabens, in Cent. */
  weitereEinkuenfteJahrCents?: EuroCents;
}

/**
 * Privater Lebensbedarf einer Person.
 * Bei Einzelunternehmen und Personengesellschaften ist das Liquidität
 * (Entnahme), keine Betriebsausgabe. Bei GmbH/UG dient er nur dem späteren
 * Abgleich, ob das Geschäftsführergehalt den Lebensunterhalt trägt.
 */
export interface PrivaterLebensbedarf {
  lebenshaltung: MonatswertVorgabe;
  krankenversicherung: MonatswertVorgabe;
  pflegeversicherung: MonatswertVorgabe;
  altersvorsorge: MonatswertVorgabe;
  sonstigeVersicherungen: MonatswertVorgabe;
  notizen?: string;
}

export interface Person {
  id: Id;
  name: string;
  /** Eine Person kann mehrere Rollen haben, z. B. Gesellschafter und Geschäftsführer. */
  rollen: PersonRolle[];
  /** Anteil an Gewinn bzw. Stammkapital, 0 bis 1. Reine Geschäftsführung darf 0 sein. */
  anteil: number;
  steuerprofil?: Steuerprofil;
  lebensbedarf?: PrivaterLebensbedarf;
}

export interface AngewendeteVorlage {
  id: Id;
  name: string;
  version: string;
}

export interface Stammdaten {
  planName: string;
  /** true = erfundener Datensatz, nicht für einen echten Antrag. */
  beispiel: boolean;
  firmenname: string;
  rechtsform: Rechtsform;
  /** Freitext, z. B. „Grafikdesign und Webgestaltung“. Darf leer sein. */
  branche: string;
  /** Stabiler Schlüssel für spätere Branchenvorlagen, z. B. `grafik-web`. */
  branchenschluessel?: string;
  /** Klassifikation der Wirtschaftszweige, optional, z. B. `74.10`. */
  wzCode?: string;
  taetigkeitsbeschreibung: string;
  strasse?: string;
  plz?: string;
  ort: string;
  bundesland: Bundesland;
  /**
   * Gewerbesteuer-Hebesatz der Gemeinde in Prozent.
   * 460 bedeutet 460 %, nicht 4,60. Bei Freiberuflern nicht nötig.
   */
  gewerbesteuerHebesatz?: number;
  /** Wirtschaftlicher bzw. rechtlicher Start. Darf außerhalb des Horizonts liegen. */
  gruendungsmonat: IsoMonth;
  handelsregisterGeplant?: boolean;
  /** Nur GmbH und UG. Gesellschaftsrechtliche Angabe, nicht die Zahlungsliste. */
  stammkapitalCents?: EuroCents;
  personen: Person[];
  zwecke: PlanZweck[];
  angewendeteVorlage?: AngewendeteVorlage;
}

export const INVESTITIONSKATEGORIEN = [
  "immateriell",
  "maschine_ausstattung",
  "fahrzeug",
  "buero_einrichtung",
  "it",
  "sonstiges",
] as const;

export type InvestitionsKategorie = (typeof INVESTITIONSKATEGORIEN)[number];

export const AFA_METHODEN = ["linear", "sofort_gwg", "sammelposten"] as const;

export type AfaMethode = (typeof AFA_METHODEN)[number];

export interface Investition {
  id: Id;
  bezeichnung: string;
  kategorie: InvestitionsKategorie;
  /** Anschaffungskosten ohne Umsatzsteuer. */
  nettoCents: EuroCents;
  umsatzsteuerSatz: Satz;
  anschaffungsmonat: IsoMonth;
  /** Fehlt der Wert, beginnt die AfA im Anschaffungsmonat. */
  afaStartMonat?: IsoMonth;
  /**
   * Bei `linear` und `sammelposten` mindestens 1.
   * Bei `sofort_gwg` genau 0, weil der Betrag sofort Aufwand wird.
   */
  nutzungsdauerMonate: number;
  afaMethode: AfaMethode;
  /** Fehlt der Wert, rechnet die AfA später auf 0 Cent Restwert. */
  restwertCents?: EuroCents;
  zahlungszielTage: number;
  notizen?: string;
}

export interface Einmalkosten {
  id: Id;
  bezeichnung: string;
  nettoCents: EuroCents;
  umsatzsteuerSatz: Satz;
  monat: IsoMonth;
  zahlungszielTage: number;
  /** false lässt später Raum für Kosten, die nicht sofort Aufwand sind. */
  steuerlichSofortAbzugsfaehig: boolean;
  notizen?: string;
}

export interface Betriebsmittel {
  /** Liquiditätspuffer zu Beginn. Kein Aufwand, nur Kapitalbedarf und Kasse. */
  liquiditaetsreserveCents: EuroCents;
  warenErstbestandNettoCents?: EuroCents;
  umsatzsteuerSatzWaren?: Satz;
  notizen?: string;
}

export interface Kapitalbedarf {
  investitionen: Investition[];
  gruendungskosten: Einmalkosten[];
  anlaufkosten: Einmalkosten[];
  betriebsmittel: Betriebsmittel;
}

export const EIGENKAPITAL_ARTEN = ["bareinlage", "sacheinlage", "kapitalruecklage"] as const;

export type EigenkapitalArt = (typeof EIGENKAPITAL_ARTEN)[number];

export interface EigenkapitalPosten {
  id: Id;
  bezeichnung: string;
  /** Optional, z. B. wenn eine bestimmte Person die Einlage leistet. */
  personId?: Id;
  betragCents: EuroCents;
  monat: IsoMonth;
  art: EigenkapitalArt;
  /** Bei Sacheinlage optional die Investition, die eingebracht wird. */
  investitionId?: Id;
  notizen?: string;
}

export const DARLEHENSARTEN = [
  "bank",
  "kfw",
  "foerderdarlehen",
  "privat",
  "gesellschafterdarlehen",
] as const;

export type Darlehensart = (typeof DARLEHENSARTEN)[number];

export const TILGUNGSARTEN = ["annuitaet", "ratentilgung", "endfaellig"] as const;

/**
 * `annuitaet`: gleichbleibende Rate, Zinsanteil sinkt.
 * `ratentilgung`: gleichbleibende Tilgung, Zinsen auf die Restschuld extra.
 * `endfaellig`: Zins laufend, die ganze Tilgung im letzten Monat der Laufzeit.
 */
export type Tilgungsart = (typeof TILGUNGSARTEN)[number];

export interface Darlehensauszahlung {
  monat: IsoMonth;
  betragCents: EuroCents;
}

export interface Darlehen {
  id: Id;
  bezeichnung: string;
  geber: string;
  art: Darlehensart;
  /** Summe der Auszahlungen, in Cent. */
  betragCents: EuroCents;
  auszahlungen: Darlehensauszahlung[];
  /** Nominalzins pro Jahr, 0.045 = 4,5 %. */
  nominalzinsPa: number;
  /** Gesamte Laufzeit in Monaten, gezählt ab der ersten Rate. */
  laufzeitMonate: number;
  /** Monate ohne Tilgung am Anfang der Laufzeit. */
  tilgungsfreieMonate: number;
  /**
   * true: in der tilgungsfreien Zeit werden Zinsen gezahlt.
   * false: in dieser Zeit werden keine Zinsen erhoben (Erlass, keine Kapitalisierung).
   */
  zinszahlungInTilgungsfreierZeit: boolean;
  tilgungsart: Tilgungsart;
  personId?: Id;
  sicherheitenNotiz?: string;
  disagioCents?: EuroCents;
  notizen?: string;
}

export const ZUSCHUSS_PROGRAMME = ["exist", "sonstiger_zuschuss"] as const;

export type ZuschussProgramm = (typeof ZUSCHUSS_PROGRAMME)[number];

export interface GruendungszuschussAuszahlung {
  art: "gruendungszuschuss";
  /** Monatliches Arbeitslosengeld I, das in Phase 1 weitergezahlt wird. */
  alg1MonatlichCents: EuroCents;
  phase1Monate: number;
  /** Monatliche Pauschale, üblicherweise 300 Euro, in beiden Phasen. */
  pauschaleCents: EuroCents;
  phase2Geplant: boolean;
  /** 0, wenn Phase 2 nicht geplant ist. */
  phase2Monate: number;
  startMonat: IsoMonth;
}

export interface FreieZuschussZahlung {
  monat: IsoMonth;
  betragCents: EuroCents;
}

export interface FreieZuschussAuszahlung {
  art: "frei";
  programm: ZuschussProgramm;
  positionen: FreieZuschussZahlung[];
}

export interface Zuschuss {
  id: Id;
  bezeichnung: string;
  /** true = nicht in der steuerlichen GuV. Liquidität bleibt trotzdem. */
  steuerfrei: boolean;
  /** true = trotz Steuerfreiheit später im Progressionsvorbehalt berücksichtigen. */
  progressionsvorbehalt: boolean;
  auszahlung: GruendungszuschussAuszahlung | FreieZuschussAuszahlung;
  notizen?: string;
}

export interface Finanzierung {
  eigenkapital: EigenkapitalPosten[];
  darlehen: Darlehen[];
  zuschuesse: Zuschuss[];
}

export type Wareneinsatz =
  | { art: "keiner" }
  | { art: "prozent_vom_umsatz"; quote: number; umsatzsteuerSatz: Satz }
  | { art: "monatsbetrag"; betrag: MonatswertVorgabe; umsatzsteuerSatz: Satz };

interface UmsatzpositionBase {
  id: Id;
  bezeichnung: string;
  beschreibung?: string;
  umsatzsteuerSatz: Satz;
  /** Tage ab dem Leistungsmonat, bis das Geld eingeht. */
  zahlungszielTage: number;
  wareneinsatz: Wareneinsatz;
  aktivVon?: IsoMonth;
  aktivBis?: IsoMonth;
}

export type Umsatzposition =
  | (UmsatzpositionBase & {
      art: "monatsumsatz";
      monatsumsatz: MonatswertVorgabe;
    })
  | (UmsatzpositionBase & {
      art: "menge_mal_preis";
      mengeProMonat: MengenVorgabe;
      preisNetto: MonatswertVorgabe;
      einheit?: string;
    });

export const PERSONAL_ROLLEN = ["angestellt", "minijob", "geschaeftsfuehrer", "aushilfe"] as const;

export type PersonalRolle = (typeof PERSONAL_ROLLEN)[number];

export interface LohnnebenkostenDetail {
  rentenversicherung: Satz;
  arbeitslosenversicherung: Satz;
  krankenversicherung: Satz;
  pflegeversicherung: Satz;
  umlageU1: Satz;
  umlageU2: Satz;
  insolvenzgeldumlage: Satz;
  unfallversicherung: Satz;
}

export interface Sonderzahlung {
  monat: IsoMonth;
  bruttoCents: EuroCents;
  notizen?: string;
}

export interface Personalstelle {
  id: Id;
  bezeichnung: string;
  /** Name der beschäftigten Person, falls bekannt. Nicht dasselbe wie eine Gründungsperson. */
  name?: string;
  /** Verknüpfung, wenn die Stelle einer Person aus den Stammdaten gehört (typisch: GF-Gehalt). */
  personId?: Id;
  rolle: PersonalRolle;
  brutto: MonatswertVorgabe;
  eintritt: IsoMonth;
  austritt?: IsoMonth;
  /**
   * Arbeitgeber-Nebenkosten als Satz auf das Brutto, z. B. 0.21.
   * Eingabe, kein hinterlegter Gesetzessatz. Ist ein Detail gesetzt,
   * muss dessen Summe diesem Satz entsprechen.
   */
  agNebenkostenSatz: Satz;
  nebenkostenDetail?: LohnnebenkostenDetail;
  sozialversicherungspflichtig: boolean;
  wochenstunden?: number;
  sonderzahlungen?: Sonderzahlung[];
  notizen?: string;
}

export const KOSTENKATEGORIEN = [
  "miete",
  "nebenkosten",
  "versicherung",
  "marketing",
  "telefon_internet",
  "software",
  "beratung_buchhaltung",
  "reise_fahrzeug",
  "buero",
  "beitraege",
  "leasing",
  "sonstiges",
] as const;

export type Kostenkategorie = (typeof KOSTENKATEGORIEN)[number];

interface KostenpositionBase {
  id: Id;
  bezeichnung: string;
  kategorie: Kostenkategorie;
  umsatzsteuerSatz: Satz;
  zahlungszielTage: number;
  /** false = der Posten ist privat und später kein Betriebsaufwand. */
  betriebsausgabe: boolean;
  /** Nicht abziehbarer Anteil, 0 bis 1. Fehlt er, gilt später 0. */
  privatanteil?: number;
  aktivVon?: IsoMonth;
  aktivBis?: IsoMonth;
  notizen?: string;
}

export type Kostenposition =
  | (KostenpositionBase & { art: "fix"; betrag: MonatswertVorgabe })
  | (KostenpositionBase & { art: "umsatzabhaengig"; umsatzquote: number });

export const UST_REGIME = ["regelbesteuerung", "kleinunternehmer"] as const;

export type UstRegime = (typeof UST_REGIME)[number];

export const UST_VERSTEUERUNG = ["soll", "ist"] as const;

export type UstVersteuerung = (typeof UST_VERSTEUERUNG)[number];

export const UST_VORANMELDUNG = ["monatlich", "vierteljaehrlich"] as const;

export type UstVoranmeldung = (typeof UST_VORANMELDUNG)[number];

export interface UmsatzsteuerEinstellungen {
  regime: UstRegime;
  /**
   * Soll = mit der Leistung, Ist = mit dem Zahlungseingang.
   * Bei Kleinunternehmern bleibt das Feld erhalten, wirkt aber nicht.
   */
  versteuerungsart: UstVersteuerung;
  voranmeldungszeitraum: UstVoranmeldung;
  dauerfristverlaengerung: boolean;
}

export const SZENARIO_IDS = ["base", "best", "real", "worst"] as const;

/** `base` ist der erfasste Plan ohne Szenario-Faktoren. */
export type SzenarioId = (typeof SZENARIO_IDS)[number];

export type SzenarioAnpassung =
  | {
      id: Id;
      ziel: "umsatzposition";
      positionId: Id;
      /** Wirkt auf Menge oder, bei festem Monatsumsatz, auf den Monatsbetrag. */
      mengenFaktor?: number;
      /** Nur bei Menge × Preis. */
      preisFaktor?: number;
    }
  | {
      id: Id;
      ziel: "kostenposition";
      positionId: Id;
      faktor?: number;
      /** Cent pro Monat, nach dem Faktor. Darf negativ sein. */
      zuschlagCents?: EuroCents;
    }
  | {
      id: Id;
      ziel: "personal";
      positionId: Id;
      gehaltsFaktor: number;
    }
  | {
      id: Id;
      ziel: "global";
      umsatzFaktor?: number;
      kostenFaktor?: number;
      personalFaktor?: number;
    };

export interface Szenario {
  bezeichnung: string;
  beschreibung?: string;
  anpassungen: SzenarioAnpassung[];
}

export interface Szenarien {
  aktiv: SzenarioId;
  best: Szenario;
  real: Szenario;
  worst: Szenario;
}

export interface Finanzplan {
  id: Id;
  schemaVersion: typeof SCHEMA_VERSION;
  erstelltAm: string;
  geaendertAm: string;
  waehrung: typeof WAEHRUNG;
  /** Erster der 36 Monate. */
  startMonat: IsoMonth;
  horizontMonate: typeof PLAN_HORIZON_MONTHS;
  stammdaten: Stammdaten;
  kapitalbedarf: Kapitalbedarf;
  finanzierung: Finanzierung;
  umsatzplanung: Umsatzposition[];
  personal: Personalstelle[];
  laufendeKosten: Kostenposition[];
  umsatzsteuer: UmsatzsteuerEinstellungen;
  szenarien: Szenarien;
  notizen?: string;
}
