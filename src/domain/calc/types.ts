import type {
  Id,
  InvestitionsKategorie,
  IsoMonth,
  Kostenkategorie,
  PersonalRolle,
  Rechtsform,
  SzenarioId,
  Tilgungsart,
} from "../types.ts";
import type { Anlagenbehandlung } from "./afa.ts";

export interface BerechnungHinweis {
  code: string;
  message: string;
  bezugId?: Id;
}

export interface UmsatzlinieErgebnis {
  id: Id;
  bezeichnung: string;
  nettoCents: number[];
  wareneinsatzNettoCents: number[];
  wareneinsatzAufwandCents: number[];
  einzahlungCents: number[];
  wareneinsatzZahlungCents: number[];
  umsatzsteuerCents: number[];
  /** Ist-Versteuerung, deren Geldeingang nach dem letzten Planmonat liegt. */
  umsatzsteuerNachHorizontCents: number;
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
  wareneinsatzRechnungCents: number[];
}

export interface UmsatzBlock {
  linien: UmsatzlinieErgebnis[];
  summeNettoCents: number[];
  summeWareneinsatzAufwandCents: number[];
  summeEinzahlungCents: number[];
  summeWareneinsatzZahlungCents: number[];
  umsatzsteuerCents: number[];
  umsatzsteuerNachHorizontCents: number;
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
  wareneinsatzRechnungCents: number[];
}

export interface PersonalErgebnis {
  id: Id;
  bezeichnung: string;
  rolle: PersonalRolle;
  bruttoCents: number[];
  sonderzahlungCents: number[];
  nebenkostenCents: number[];
  aufwandCents: number[];
}

export interface PersonalBlock {
  stellen: PersonalErgebnis[];
  summeBruttoCents: number[];
  summeNebenkostenCents: number[];
  summeAufwandCents: number[];
}

export interface KostenpositionErgebnis {
  id: Id;
  bezeichnung: string;
  kategorie: Kostenkategorie;
  aufwandCents: number[];
  auszahlungCents: number[];
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
}

export interface EinmalKostenErgebnis {
  id: Id;
  bezeichnung: string;
  herkunft: "gruendung" | "anlauf";
  sofortAbzugsfaehig: boolean;
  aufwandCents: number[];
  auszahlungCents: number[];
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
}

export interface KostenBlock {
  positionen: KostenpositionErgebnis[];
  einmalig: EinmalKostenErgebnis[];
  summeAufwandCents: number[];
  summeEinmalAufwandCents: number[];
  summeAuszahlungCents: number[];
  summeEinmalAuszahlungCents: number[];
  vorsteuerCents: number[];
  vorsteuerEinmalCents: number[];
  rechnungBruttoCents: number[];
  rechnungEinmalCents: number[];
}

export interface AnlageImPlan {
  id: Id;
  bezeichnung: string;
  kategorie: InvestitionsKategorie;
  behandlung: Anlagenbehandlung;
  afaMethode: "linear" | "sofort_gwg" | "sammelposten";
  aktivierungCents: number;
  restwertCents: number;
  abschreibungCents: number[];
  sofortaufwandCents: number[];
  buchwertCents: number[];
  auszahlungCents: number[];
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
}

export interface WarenbestandErgebnis {
  nettoCents: number;
  buchwertCents: number[];
  auszahlungCents: number[];
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
}

export interface InvestitionsBlock {
  anlagen: AnlageImPlan[];
  warenbestand: WarenbestandErgebnis | null;
  summeAbschreibungCents: number[];
  summeSofortaufwandCents: number[];
  summeAuszahlungCents: number[];
  summeBuchwertCents: number[];
  vorsteuerCents: number[];
  rechnungBruttoCents: number[];
}

export interface EigenkapitalErgebnis {
  id: Id;
  bezeichnung: string;
  art: "bareinlage" | "sacheinlage" | "kapitalruecklage";
  betragCents: number[];
  /** Nur Bar- und Kapitalrücklage. Eine Sacheinlage bringt kein Geld. */
  einzahlungCents: number[];
}

export interface ZuschussErgebnis {
  id: Id;
  bezeichnung: string;
  steuerfrei: boolean;
  progressionsvorbehalt: boolean;
  betragCents: number[];
  ertragCents: number[];
  progressionsvorbehaltCents: number[];
}

export interface DarlehenErgebnis {
  id: Id;
  bezeichnung: string;
  geber: string;
  tilgungsart: Tilgungsart;
  nominalzinsPa: number;
  nominalCents: number;
  laufzeitMonate: number;
  tilgungsfreieMonate: number;
  auszahlungCents: number[];
  zinsCents: number[];
  tilgungCents: number[];
  rateCents: number[];
  restschuldCents: number[];
  finanzierungsaufwandCents: number[];
}

export interface FinanzierungsBlock {
  eigenkapital: EigenkapitalErgebnis[];
  zuschuesse: ZuschussErgebnis[];
  darlehen: DarlehenErgebnis[];
  summeEinlagenCents: number[];
  summeZuschussCents: number[];
  summeZuschussErtragCents: number[];
  summeProgressionsvorbehaltCents: number[];
  summeDarlehenAuszahlungCents: number[];
  summeZinsCents: number[];
  summeTilgungCents: number[];
  summeRestschuldCents: number[];
  summeFinanzierungsaufwandCents: number[];
}

export interface UmsatzsteuerBlock {
  umsatzsteuerCents: number[];
  vorsteuerCents: number[];
  vorsteuerWareneinsatzCents: number[];
  vorsteuerKostenCents: number[];
  vorsteuerEinmalCents: number[];
  vorsteuerInvestitionenCents: number[];
  zahllastCents: number[];
  /** Positiv = Zahlung ans Finanzamt, negativ = Erstattung. */
  zahlungCents: number[];
  offeneZahllastCents: number[];
  /** Ist-Versteuerung, deren Zahlungseingang nach dem Horizont liegt. Noch keine Zahllast. */
  umsatzsteuerNachHorizontCents: number;
}

export interface EntnahmeBlock {
  lebensbedarfCents: number[];
  /** Bei GmbH und UG 0. Der Lebensbedarf bleibt zum Vergleich in `lebensbedarfCents`. */
  entnahmeCents: number[];
}

export interface UebersichtBlock {
  umsatzerloeseCents: number[];
  wareneinsatzCents: number[];
  rohertragCents: number[];
  personalCents: number[];
  laufendeKostenCents: number[];
  gruendungAnlaufCents: number[];
  sofortaufwandCents: number[];
  abschreibungenCents: number[];
  zinsaufwandCents: number[];
  finanzierungsaufwandCents: number[];
  zuschuesseErtragCents: number[];
  betriebsergebnisCents: number[];
  einzahlungenKundenCents: number[];
  auszahlungenWareneinsatzCents: number[];
  auszahlungenPersonalCents: number[];
  auszahlungenKostenCents: number[];
  auszahlungenInvestitionenCents: number[];
  auszahlungenZinsenCents: number[];
  auszahlungenTilgungCents: number[];
  umsatzsteuerZahlungCents: number[];
  einlagenCents: number[];
  darlehensauszahlungCents: number[];
  zuschuesseZahlungCents: number[];
  entnahmenCents: number[];
  zahlungssaldoCents: number[];
  restschuldCents: number[];
  forderungenCents: number[];
  verbindlichkeitenCents: number[];
  offeneUmsatzsteuerCents: number[];
  restbuchwertCents: number[];
  warenbestandCents: number[];
}

export interface Planberechnung {
  planId: Id;
  planName: string;
  firmenname: string;
  beispiel: boolean;
  rechtsform?: Rechtsform;
  szenario: SzenarioId;
  szenarioBezeichnung: string;
  startMonat: IsoMonth;
  monate: IsoMonth[];
  hinweise: BerechnungHinweis[];
  umsatz: UmsatzBlock;
  personal: PersonalBlock;
  kosten: KostenBlock;
  investitionen: InvestitionsBlock;
  finanzierung: FinanzierungsBlock;
  umsatzsteuer: UmsatzsteuerBlock;
  entnahmen: EntnahmeBlock;
  uebersicht: UebersichtBlock;
  liquiditaetsreserveCents: number;
}
