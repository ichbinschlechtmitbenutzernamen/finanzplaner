import type { IsoMonth, Rechtsform, SzenarioId } from "../types.ts";
import type { Bestandszeile, Bewegungszeile, Planjahr } from "./planjahr.ts";

export interface KalenderjahrSteuer {
  jahr: number;
  vonMonat: IsoMonth;
  bisMonat: IsoMonth;
  monateImPlan: number;
  /** Festgesetzte Steuer des Kalenderjahres, vor der Verteilung auf die Monate. */
  steuerCents: number;
}

export interface Rentabilitaetsvorschau {
  zeilen: Bewegungszeile[];
  /** Nachrichtliche Zeile unter dem Ergebnis, nur bei Personenunternehmen. */
  privatentnahmenAusgewiesen: boolean;
  kalenderjahre: KalenderjahrSteuer[];
  hinweis: string;
}

export interface Liquiditaetsplan {
  anfangsbestand: Bestandszeile;
  einzahlungen: Bewegungszeile;
  auszahlungen: Bewegungszeile;
  endbestand: Bestandszeile;
  /** Monatliche Empfehlung. Kein Zahlungsstrom. */
  steuerruecklage: Bewegungszeile;
  /** Kumulierter Stand der Empfehlung. Wird nicht um Zahlungen vermindert. */
  steuerruecklageKumuliert: Bestandszeile;
  tiefsterKontostandCents: number;
  tiefsterKontostandMonat: IsoMonth | null;
  /** Positiver Betrag, wenn der tiefste Endbestand negativ ist, sonst 0. */
  kontokorrentbedarfCents: number;
  hinweis: string;
}

export interface KapitalPosten {
  id: string;
  bezeichnung: string;
  /** Erfasster Betrag, auch wenn ein Monat außerhalb des Horizonts liegt. */
  betragCents: number;
  monateCents: number[];
  planjahreCents: number[];
  /** Teil des Betrags, der nicht in den 36 Monaten liegt. */
  ausserhalbCents: number;
  hinweis?: string;
}

export type Deckungsart = "ueberdeckung" | "deckungsluecke" | "ausgeglichen";

export interface Kapitalbedarfsplan {
  bedarf: KapitalPosten[];
  summeBedarf: KapitalPosten;
  finanzierung: KapitalPosten[];
  summeFinanzierung: KapitalPosten;
  /** Finanzierung minus Bedarf. Positiv ist eine Überdeckung. */
  deckung: KapitalPosten;
  deckungArt: Deckungsart;
  /**
   * Nominal der Darlehen minus die Auszahlung, die im Plan ankommt.
   * Disagio, Gebühren und ein Auszahlungskurs unter 100 Prozent.
   */
  darlehenAbzugCents: number;
  hinweis: string;
}

export interface Anlagenposition {
  id: string;
  bezeichnung: string;
  kategorie: string;
  methode: string;
  behandlung: string;
  aktivierungCents: number;
  restwertCents: number;
  abschreibung: Bewegungszeile;
  buchwert: Bestandszeile;
  sofortaufwand: Bewegungszeile;
  auszahlung: Bewegungszeile;
}

export interface Anlagenplan {
  positionen: Anlagenposition[];
  summeAbschreibung: Bewegungszeile;
  summeBuchwert: Bestandszeile;
  summeSofortaufwand: Bewegungszeile;
}

export interface Darlehensposition {
  id: string;
  bezeichnung: string;
  geber: string;
  tilgungsart: string;
  /** Dezimalsatz, 0,024 = 2,4 Prozent. */
  nominalzinsPa: number;
  nominalCents: number;
  laufzeitMonate: number;
  tilgungsfreieMonate: number;
  auszahlung: Bewegungszeile;
  zins: Bewegungszeile;
  tilgung: Bewegungszeile;
  rate: Bewegungszeile;
  restschuld: Bestandszeile;
}

export interface Darlehensplaene {
  darlehen: Darlehensposition[];
  summeZins: Bewegungszeile;
  summeTilgung: Bewegungszeile;
  summeRestschuld: Bestandszeile;
  hinweis: string;
}

export interface TragfaehigkeitPerson {
  personId: string;
  name: string;
  anteil: number;
  lebensbedarfErfasst: boolean;
  gewinnNachSteuern: Bewegungszeile;
  lebenshaltung: Bewegungszeile;
  vorsorge: Bewegungszeile;
  verfuegbaresEinkommen: Bewegungszeile;
  /** Verfügbares Einkommen im Planjahr 2. Null, wenn es kein Planjahr 2 gibt. */
  planjahr2Cents: number | null;
  /** Wahr, wenn das verfügbare Einkommen im Planjahr 2 mindestens 0 ist. */
  tragfaehig: boolean | null;
}

export interface Tragfaehigkeit {
  anwendbar: boolean;
  hinweis: string;
  personen: TragfaehigkeitPerson[];
  /** Wahr, wenn jede ausgewiesene Person im Planjahr 2 tragfähig ist. */
  alleTragfaehig: boolean | null;
}

export interface Jahresquote {
  /** 0 steht für den ganzen Horizont. */
  planjahr: number;
  zaehlerCents: number;
  nennerCents: number;
  quote: number | null;
}

export interface KapitaldienstJahr {
  planjahr: number;
  cashflowCents: number;
  /** Zins plus Tilgung des Planjahres. */
  kapitaldienstCents: number;
  /** Cashflow geteilt durch den Kapitaldienst. Null, wenn kein Kapitaldienst anfällt. */
  quote: number | null;
}

export interface Kennzahlen {
  breakEven: {
    erreicht: boolean;
    /** 1-basiert. */
    planmonat: number | null;
    monat: IsoMonth | null;
    definition: string;
  };
  rohertragsquote: { planjahre: Jahresquote[]; gesamt: Jahresquote };
  umsatzrendite: { planjahre: Jahresquote[]; gesamt: Jahresquote };
  kapitaldienstfaehigkeit: KapitaldienstJahr[];
  tiefsterLiquiditaetsstandCents: number;
  tiefsterLiquiditaetsstandMonat: IsoMonth | null;
  kontokorrentbedarfCents: number;
  eigenkapitalquote: number | null;
  eigenmittelCents: number;
  finanzierungCents: number;
}

export interface Berichte {
  planId: string;
  planName: string;
  firmenname: string;
  rechtsform?: Rechtsform;
  szenario: SzenarioId;
  szenarioBezeichnung: string;
  startMonat: IsoMonth;
  monate: IsoMonth[];
  planjahre: Planjahr[];
  rentabilitaet: Rentabilitaetsvorschau;
  liquiditaet: Liquiditaetsplan;
  kapital: Kapitalbedarfsplan;
  anlagen: Anlagenplan;
  darlehen: Darlehensplaene;
  tragfaehigkeit: Tragfaehigkeit;
  kennzahlen: Kennzahlen;
}
