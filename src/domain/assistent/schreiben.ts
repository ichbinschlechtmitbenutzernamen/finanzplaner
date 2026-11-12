import { monatsbetragCents } from "../calc/monatswert.ts";
import {
  einfuegenMonatswert,
  fortschreibenSerie,
  saisonMonatswert,
  saisonSerie,
  wachstumSerie,
} from "../eingabe/index.ts";
import { addMonths, isIsoMonth } from "../months.ts";
import { TAB_MIKRODARLEHEN_ID } from "../parameter.ts";
import {
  istKapitalgesellschaft,
  planjahreVon,
  verteileGleichmaessig,
} from "../reports/planjahr.ts";
import type {
  AfaMethode,
  Bundesland,
  Darlehen,
  Darlehensart,
  EigenkapitalArt,
  Einmalkosten,
  Finanzplan,
  Investition,
  InvestitionsKategorie,
  IsoMonth,
  Kostenkategorie,
  Kostenposition,
  MonatFaktoren,
  MonatswertVorgabe,
  OffeneEinlage,
  OffenesDarlehen,
  Person,
  PersonalRolle,
  Personalstelle,
  PersonRolle,
  PlanStatus,
  PlanZweck,
  Rechtsform,
  Steuerparameter,
  Szenarien,
  Tilgungsart,
  Umsatzposition,
  UstVersteuerung,
  UstVoranmeldung,
  Wachstumsbezug,
  Wachstum,
} from "../types.ts";
import { bereinigeFortschritt, standardRollen } from "./stationen.ts";

export class AssistentFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistentFehler";
  }
}

export interface GesellschafterEingabe {
  id: string;
  name: string;
  anteil: number;
  rollen?: PersonRolle[];
}

export interface VorhabenEingabe {
  name: string;
  planName?: string;
  gruendungsmonat: string;
  rechtsform?: Rechtsform;
  bundesland?: Bundesland;
  kleinunternehmer: boolean;
  gesellschafter: GesellschafterEingabe[];
  ort?: string;
  hebesatz?: number;
  branche?: string;
  branchenschluessel?: string;
  wzCode?: string;
  taetigkeitsbeschreibung?: string;
  strasse?: string;
  plz?: string;
  handelsregisterGeplant?: boolean;
  stammkapitalCents?: number;
  zwecke?: PlanZweck[];
  beispiel?: boolean;
  vorsteuerabzug?: boolean;
  voranmeldungszeitraum?: UstVoranmeldung;
  versteuerungsart?: UstVersteuerung;
  dauerfristverlaengerung?: boolean;
}

export interface LebensbedarfEingabe {
  personId: string;
  lebenshaltung: MonatswertVorgabe;
  krankenversicherung: MonatswertVorgabe;
  pflegeversicherung: MonatswertVorgabe;
  altersvorsorge: MonatswertVorgabe;
  sonstigeVersicherungen: MonatswertVorgabe;
  kirchensteuer: boolean;
  splitting?: boolean;
  kinderfreibetraege?: number;
  weitereEinkuenfteJahrCents?: number;
}

export interface GruendungszuschussEingabe {
  id: string;
  bezeichnung?: string;
  alg1MonatlichCents: number;
  phase1Monate: number;
  pauschaleCents: number;
  phase2Geplant: boolean;
  phase2Monate: number;
  startMonat: IsoMonth;
  notizen?: string;
}

interface UmsatzBasis {
  id: string;
  bezeichnung: string;
  beschreibung?: string;
  umsatzsteuerSatz: number;
  zahlungszielTage: number;
  aktivVon?: IsoMonth;
  aktivBis?: IsoMonth;
}

export type UmsatzEingabe =
  | (UmsatzBasis & {
      modus: "monat";
      basisCents: number;
      wachstum?: Wachstum;
      saison?: MonatFaktoren;
    })
  | (UmsatzBasis & { modus: "jahre"; jahresCents: number[] });

export interface WareneinsatzEingabe {
  id: string;
  /** null = kein Wareneinsatz. */
  quote: number | null;
  umsatzsteuerSatz: number;
}

export interface StelleEingabe {
  id: string;
  bezeichnung: string;
  name?: string;
  rolle: PersonalRolle;
  brutto: MonatswertVorgabe;
  eintritt: IsoMonth;
  austritt?: IsoMonth;
  agNebenkostenSatz: number;
  sozialversicherungspflichtig: boolean;
  wochenstunden?: number;
  personId?: string;
  notizen?: string;
  sonderzahlungen?: Personalstelle["sonderzahlungen"];
  nebenkostenDetail?: Personalstelle["nebenkostenDetail"];
}

export type KostenEingabe = {
  id: string;
  bezeichnung: string;
  kategorie: Kostenkategorie;
  umsatzsteuerSatz: number;
  zahlungszielTage: number;
  betriebsausgabe: boolean;
  privatanteil?: number;
  aktivVon?: IsoMonth;
  aktivBis?: IsoMonth;
  notizen?: string;
} & ({ art: "fix"; betrag: MonatswertVorgabe } | { art: "umsatzabhaengig"; umsatzquote: number });

export interface InvestitionEingabe {
  id: string;
  bezeichnung: string;
  kategorie: InvestitionsKategorie;
  nettoCents: number;
  umsatzsteuerSatz: number;
  anschaffungsmonat: IsoMonth;
  zahlungszielTage: number;
  /** Fehlt die Methode, ordnet der Assistent nach den Grenzen im Parametersatz ein. */
  methode?: AfaMethode;
  nutzungsdauerMonate?: number;
  afaStartMonat?: IsoMonth;
  restwertCents?: number;
  notizen?: string;
}

export interface EinmalEingabe {
  id: string;
  bezeichnung: string;
  nettoCents: number;
  umsatzsteuerSatz: number;
  monat: IsoMonth;
  zahlungszielTage: number;
  notizen?: string;
}

export interface EigenkapitalEingabe {
  id: string;
  bezeichnung: string;
  /** null: der Betrag ist noch nicht erfasst und bleibt ein Entwurf. */
  betragCents: number | null;
  monat: IsoMonth;
  art: EigenkapitalArt;
  personId?: string;
  notizen?: string;
}

export interface TabDarlehenEingabe {
  id: string;
  betragCents: number;
  monat: IsoMonth;
  laufzeitMonate: number;
  tilgungsfreieMonate: number;
  bezeichnung?: string;
  geber?: string;
  notizen?: string;
  sicherheitenNotiz?: string;
}

export interface WeiteresDarlehenEingabe {
  id: string;
  bezeichnung: string;
  geber: string;
  art: Darlehensart;
  /** null: der Betrag ist noch nicht erfasst und bleibt ein Entwurf. */
  betragCents: number | null;
  monat: IsoMonth;
  nominalzinsPa: number;
  laufzeitMonate: number;
  tilgungsfreieMonate: number;
  tilgungsart: Tilgungsart;
  zinszahlungInTilgungsfreierZeit: boolean;
  auszahlungAnteil?: number;
  gebuehrenCents?: number;
  personId?: string;
  vorlageId?: string;
  sicherheitenNotiz?: string;
  disagioCents?: number;
  notizen?: string;
}

export interface FinanzierungEingabe {
  eigenkapital: EigenkapitalEingabe[];
  tab: TabDarlehenEingabe | null;
  weitere: WeiteresDarlehenEingabe[];
  liquiditaetsreserveCents?: number;
  betriebsmittelbedarfCents?: number;
  betriebsmittelNotizen?: string;
}

export interface AbschlussEingabe {
  notizen?: string;
  szenarien?: Szenarien;
  beispiel?: boolean;
  status?: PlanStatus;
}

export interface KostenVorschlag {
  id: string;
  bezeichnung: string;
  kategorie: Kostenkategorie;
}

export const KOSTEN_VORSCHLAEGE: readonly KostenVorschlag[] = [
  { id: "miete", bezeichnung: "Miete", kategorie: "miete" },
  { id: "nebenkosten", bezeichnung: "Nebenkosten", kategorie: "nebenkosten" },
  { id: "versicherungen", bezeichnung: "Versicherungen", kategorie: "versicherung" },
  { id: "kfz", bezeichnung: "Kfz", kategorie: "reise_fahrzeug" },
  { id: "telefon-internet", bezeichnung: "Telefon und Internet", kategorie: "telefon_internet" },
  { id: "steuerberatung", bezeichnung: "Steuerberatung", kategorie: "beratung_buchhaltung" },
  { id: "marketing", bezeichnung: "Marketing", kategorie: "marketing" },
  { id: "software", bezeichnung: "Software", kategorie: "software" },
  { id: "buero", bezeichnung: "Bürobedarf", kategorie: "buero" },
  { id: "beitraege", bezeichnung: "Beiträge", kategorie: "beitraege" },
  { id: "leasing", bezeichnung: "Leasing", kategorie: "leasing" },
  { id: "sonstiges", bezeichnung: "Sonstiges", kategorie: "sonstiges" },
];

export type AnlageArt = "sofortaufwand" | "sofort_gwg" | "sammelposten" | "linear";

export interface AnlageEinordnung {
  art: AnlageArt;
  label: string;
}

type Grenzen = Pick<
  Steuerparameter,
  "gwgSofortMaxNettoCents" | "sammelpostenMinNettoCents" | "sammelpostenMaxNettoCents"
>;

/** GWG, Sammelposten oder lineare Abschreibung nach den Grenzen im Parametersatz. */
export function ordneInvestition(nettoCents: number, steuer: Grenzen): AnlageEinordnung {
  if (nettoCents < steuer.sammelpostenMinNettoCents) {
    return { art: "sofortaufwand", label: "Sofortaufwand, unter der Aktivierungsgrenze" };
  }
  if (nettoCents <= steuer.gwgSofortMaxNettoCents) {
    return { art: "sofort_gwg", label: "Geringwertiges Wirtschaftsgut, Sofortabschreibung" };
  }
  if (nettoCents <= steuer.sammelpostenMaxNettoCents) {
    return { art: "sammelposten", label: "Sammelposten, Auflösung über 60 Monate" };
  }
  return { art: "linear", label: "Lineare Abschreibung" };
}

export function monateDesPlans(plan: Finanzplan): IsoMonth[] {
  if (!plan.startMonat) return [];
  return Array.from({ length: plan.horizontMonate }, (_, index) =>
    addMonths(plan.startMonat as IsoMonth, index),
  );
}

/** Jahreswerte liegen als Überschreibung auf den Monaten, damit die Summe je Planjahr exakt bleibt. */
export function monatsumsatzAusJahren(
  start: IsoMonth,
  horizont: number,
  jahresCents: readonly number[],
): MonatswertVorgabe {
  for (const wert of jahresCents) verlangeCents(wert, "Jahreswert");
  const monate = Array.from({ length: horizont }, (_, index) => addMonths(start, index));
  const jahre = planjahreVon(monate);
  const werte = monate.map(() => 0);
  jahre.forEach((jahr, index) => {
    const summe = jahresCents[index] ?? 0;
    const teile = verteileGleichmaessig(summe, jahr.bisIndex - jahr.vonIndex);
    teile.forEach((teil, versatz) => {
      werte[jahr.vonIndex + versatz] = teil;
    });
  });
  return einfuegenMonatswert(
    { basisCents: 0 },
    monate,
    0,
    werte,
    werte.map(() => true),
  );
}

export function istJahresmodus(vorgabe: MonatswertVorgabe, monate: readonly IsoMonth[]): boolean {
  if (vorgabe.wachstum || vorgabe.saison || vorgabe.basisCents !== 0) return false;
  const overrides = new Set((vorgabe.monatsOverride ?? []).map((punkt) => punkt.monat));
  return monate.length > 0 && monate.every((monat) => overrides.has(monat));
}

export function jahreswerteVon(plan: Finanzplan, vorgabe: MonatswertVorgabe): number[] {
  const monate = monateDesPlans(plan);
  const start = plan.startMonat;
  if (!start) return [];
  return planjahreVon(monate).map((jahr) => {
    let summe = 0;
    for (let index = jahr.vonIndex; index < jahr.bisIndex; index += 1) {
      const monat = monate[index];
      if (monat) summe += monatsbetragCents(vorgabe, monat, start);
    }
    return summe;
  });
}

export function setzeVorhaben(plan: Finanzplan, eingabe: VorhabenEingabe): Finanzplan {
  if (eingabe.stammkapitalCents != null) verlangeCents(eingabe.stammkapitalCents, "Stammkapital");
  if (eingabe.hebesatz != null && eingabe.hebesatz < 0) {
    throw new AssistentFehler("Der Hebesatz darf nicht negativ sein.");
  }
  for (const person of eingabe.gesellschafter) {
    if (person.anteil < 0) throw new AssistentFehler("Ein Anteil darf nicht negativ sein.");
  }

  const rechtsform = eingabe.rechtsform ?? plan.stammdaten.rechtsform;
  const personen = eingabe.gesellschafter.map((person, index) =>
    personAus(plan, person, rechtsform, index, eingabe.gesellschafter.length),
  );
  const klein = eingabe.kleinunternehmer;
  const stammdaten: Finanzplan["stammdaten"] = {
    ...plan.stammdaten,
    firmenname: eingabe.name,
    planName:
      eingabe.planName ??
      (plan.stammdaten.planName.trim() === "" ? eingabe.name : plan.stammdaten.planName),
    personen,
  };
  setzeWenn(stammdaten, "rechtsform", rechtsform);
  setzeWenn(stammdaten, "bundesland", eingabe.bundesland ?? plan.stammdaten.bundesland);
  setzeWenn(stammdaten, "ort", eingabe.ort ?? plan.stammdaten.ort);
  setzeWenn(stammdaten, "branche", eingabe.branche ?? plan.stammdaten.branche);
  setzeWenn(
    stammdaten,
    "taetigkeitsbeschreibung",
    eingabe.taetigkeitsbeschreibung ?? plan.stammdaten.taetigkeitsbeschreibung,
  );
  setzeWahl(
    stammdaten,
    "branchenschluessel",
    eingabe.branchenschluessel,
    plan.stammdaten.branchenschluessel,
  );
  setzeWahl(stammdaten, "wzCode", eingabe.wzCode, plan.stammdaten.wzCode);
  setzeWahl(stammdaten, "strasse", eingabe.strasse, plan.stammdaten.strasse);
  setzeWahl(stammdaten, "plz", eingabe.plz, plan.stammdaten.plz);
  setzeWahl(
    stammdaten,
    "gewerbesteuerHebesatz",
    eingabe.hebesatz,
    plan.stammdaten.gewerbesteuerHebesatz,
  );
  setzeWahl(
    stammdaten,
    "handelsregisterGeplant",
    eingabe.handelsregisterGeplant,
    plan.stammdaten.handelsregisterGeplant,
  );
  if (eingabe.zwecke) stammdaten.zwecke = eingabe.zwecke;
  if (eingabe.beispiel != null) stammdaten.beispiel = eingabe.beispiel;
  if (istKapitalgesellschaft(rechtsform)) {
    setzeWahl(
      stammdaten,
      "stammkapitalCents",
      eingabe.stammkapitalCents,
      plan.stammdaten.stammkapitalCents,
    );
  } else {
    delete stammdaten.stammkapitalCents;
  }

  const naechster: Finanzplan = {
    ...plan,
    stammdaten,
    umsatzsteuer: {
      ...plan.umsatzsteuer,
      regime: klein ? "kleinunternehmer" : "regelbesteuerung",
      vorsteuerabzugsberechtigt: klein
        ? false
        : (eingabe.vorsteuerabzug ?? plan.umsatzsteuer.vorsteuerabzugsberechtigt),
      versteuerungsart: eingabe.versteuerungsart ?? plan.umsatzsteuer.versteuerungsart,
      voranmeldungszeitraum:
        eingabe.voranmeldungszeitraum ?? plan.umsatzsteuer.voranmeldungszeitraum,
      dauerfristverlaengerung:
        eingabe.dauerfristverlaengerung ?? plan.umsatzsteuer.dauerfristverlaengerung,
    },
  };
  if (isIsoMonth(eingabe.gruendungsmonat)) {
    naechster.startMonat = eingabe.gruendungsmonat;
    naechster.stammdaten = { ...naechster.stammdaten, gruendungsmonat: eingabe.gruendungsmonat };
  }
  return bereinigeFortschritt(naechster);
}

export function setzePersoenlich(
  plan: Finanzplan,
  personen: readonly LebensbedarfEingabe[],
  zuschuss: GruendungszuschussEingabe | null,
): Finanzplan {
  if (istKapitalgesellschaft(plan.stammdaten.rechtsform)) return plan;
  for (const person of personen) {
    for (const [feld, vorgabe] of lebensFelder(person)) verlangeCents(vorgabe.basisCents, feld);
  }
  const nachId = new Map(personen.map((person) => [person.personId, person]));
  const naechstePersonen = plan.stammdaten.personen.map((person) => {
    const eingabe = nachId.get(person.id);
    if (!eingabe) return person;
    return {
      ...person,
      steuerprofil: steuerprofilAus(person, eingabe),
      lebensbedarf: {
        lebenshaltung: eingabe.lebenshaltung,
        krankenversicherung: eingabe.krankenversicherung,
        pflegeversicherung: eingabe.pflegeversicherung,
        altersvorsorge: eingabe.altersvorsorge,
        sonstigeVersicherungen: eingabe.sonstigeVersicherungen,
        ...(person.lebensbedarf?.notizen ? { notizen: person.lebensbedarf.notizen } : {}),
      },
    };
  });
  return {
    ...plan,
    stammdaten: { ...plan.stammdaten, personen: naechstePersonen },
    finanzierung: {
      ...plan.finanzierung,
      zuschuesse: zuschuesseMit(plan, zuschuss),
    },
  };
}

export function setzeUmsatz(plan: Finanzplan, linien: readonly UmsatzEingabe[]): Finanzplan {
  const behalten = plan.umsatzplanung.filter(
    (linie) =>
      linie.art === "menge_mal_preis" && !linien.some((eingabe) => eingabe.id === linie.id),
  );
  return {
    ...plan,
    umsatzplanung: [...linien.map((eingabe) => umsatzAus(plan, eingabe)), ...behalten],
  };
}

export function setzeWareneinsatz(
  plan: Finanzplan,
  eintraege: readonly WareneinsatzEingabe[],
): Finanzplan {
  const nachId = new Map(eintraege.map((eintrag) => [eintrag.id, eintrag]));
  return {
    ...plan,
    umsatzplanung: plan.umsatzplanung.map((linie) => {
      const eingabe = nachId.get(linie.id);
      if (!eingabe) return linie;
      if (eingabe.quote == null) return { ...linie, wareneinsatz: { art: "keiner" } };
      if (eingabe.quote < 0) throw new AssistentFehler("Der Wareneinsatz darf nicht negativ sein.");
      if (eingabe.umsatzsteuerSatz < 0) {
        throw new AssistentFehler("Der Vorsteuersatz darf nicht negativ sein.");
      }
      return {
        ...linie,
        wareneinsatz: {
          art: "prozent_vom_umsatz",
          quote: eingabe.quote,
          umsatzsteuerSatz: eingabe.umsatzsteuerSatz,
        },
      };
    }),
  };
}

export function setzePersonal(plan: Finanzplan, stellen: readonly StelleEingabe[]): Finanzplan {
  return { ...plan, personal: stellen.map((stelle) => stelleAus(stelle)) };
}

export function setzeKosten(plan: Finanzplan, posten: readonly KostenEingabe[]): Finanzplan {
  return { ...plan, laufendeKosten: posten.map((eintrag) => kostenAus(eintrag)) };
}

export function setzeInvestitionen(
  plan: Finanzplan,
  eingabe: {
    posten: readonly InvestitionEingabe[];
    gruendungskosten: readonly EinmalEingabe[];
    anlaufkosten: readonly EinmalEingabe[];
  },
): Finanzplan {
  return {
    ...plan,
    kapitalbedarf: {
      ...plan.kapitalbedarf,
      investitionen: eingabe.posten.map((posten) => baueInvestition(posten, plan.parameter.steuer)),
      gruendungskosten: eingabe.gruendungskosten.map((posten) => einmalAus(posten)),
      anlaufkosten: eingabe.anlaufkosten.map((posten) => einmalAus(posten)),
    },
  };
}

export function setzeFinanzierung(plan: Finanzplan, eingabe: FinanzierungEingabe): Finanzplan {
  if (eingabe.liquiditaetsreserveCents != null) {
    verlangeCents(eingabe.liquiditaetsreserveCents, "Liquiditätsreserve");
  }
  if (eingabe.betriebsmittelbedarfCents != null) {
    verlangeCents(eingabe.betriebsmittelbedarfCents, "Betriebsmittelbedarf");
  }
  const betriebsmittel = { ...plan.kapitalbedarf.betriebsmittel };
  if (eingabe.liquiditaetsreserveCents != null) {
    betriebsmittel.liquiditaetsreserveCents = eingabe.liquiditaetsreserveCents;
  }
  if (eingabe.betriebsmittelbedarfCents != null) {
    betriebsmittel.betriebsmittelbedarfCents = eingabe.betriebsmittelbedarfCents;
  }
  if (eingabe.betriebsmittelNotizen !== undefined) {
    if (eingabe.betriebsmittelNotizen === "") delete betriebsmittel.notizen;
    else betriebsmittel.notizen = eingabe.betriebsmittelNotizen;
  }
  const eigenkapital: Finanzplan["finanzierung"]["eigenkapital"] = [];
  const offeneEinlagen: OffeneEinlage[] = [];
  for (const posten of eingabe.eigenkapital) {
    const betrag = posten.betragCents;
    if (betrag == null || betrag === 0) offeneEinlagen.push(offeneEinlageAus(posten));
    else eigenkapital.push(eigenkapitalAus({ ...posten, betragCents: betrag }));
  }
  const darlehen = [...(eingabe.tab ? [darlehenAusVorlage(plan, eingabe.tab)] : [])];
  const offeneDarlehen: OffenesDarlehen[] = [];
  for (const posten of eingabe.weitere) {
    const betrag = posten.betragCents;
    if (betrag == null || betrag === 0) offeneDarlehen.push(offenesDarlehenAus(posten));
    else darlehen.push(weiteresDarlehen({ ...posten, betragCents: betrag }));
  }
  return {
    ...plan,
    kapitalbedarf: { ...plan.kapitalbedarf, betriebsmittel },
    finanzierung: {
      ...plan.finanzierung,
      eigenkapital,
      darlehen,
    },
    assistent: entwuerfeSetzen(plan, offeneEinlagen, offeneDarlehen),
  };
}

export function pruefeFinanzierung(eingabe: FinanzierungEingabe): string[] {
  const meldungen: string[] = [];
  for (const posten of eingabe.eigenkapital) {
    if (betragOffen(posten.betragCents)) {
      meldungen.push(`Der Betrag der Einlage „${posten.bezeichnung || "Einlage"}“ fehlt.`);
    }
  }
  for (const darlehen of eingabe.weitere) {
    if (betragOffen(darlehen.betragCents)) {
      meldungen.push(`Der Betrag des Darlehens „${darlehen.bezeichnung || "Darlehen"}“ fehlt.`);
    }
  }
  return meldungen;
}

export function setzeAbschluss(plan: Finanzplan, eingabe: AbschlussEingabe = {}): Finanzplan {
  const naechster: Finanzplan = { ...plan };
  if (eingabe.status) naechster.status = eingabe.status;
  if (eingabe.notizen !== undefined) {
    if (eingabe.notizen === "") delete naechster.notizen;
    else naechster.notizen = eingabe.notizen;
  }
  if (eingabe.szenarien) naechster.szenarien = eingabe.szenarien;
  if (eingabe.beispiel != null) {
    naechster.stammdaten = { ...naechster.stammdaten, beispiel: eingabe.beispiel };
  }
  return naechster;
}

/** Dieselben Helfer wie die Tabelle: Fortschreiben, Wachstumsrate, Saisonfaktoren. */
export function wendeFortschreiben(plan: Finanzplan, id: string): Finanzplan {
  const monate = monateDesPlans(plan);
  if (monate.length === 0) throw new AssistentFehler("Der Gründungsmonat fehlt.");
  return fortschreibenSerie(
    plan,
    { art: "umsatz", id },
    monate,
    0,
    monate.map(() => true),
  );
}

export function wendeWachstum(
  plan: Finanzplan,
  id: string,
  rate: number,
  bezug: Wachstumsbezug,
): Finanzplan {
  const monate = monateDesPlans(plan);
  if (monate.length === 0) throw new AssistentFehler("Der Gründungsmonat fehlt.");
  return wachstumSerie(
    plan,
    { art: "umsatz", id },
    monate,
    0,
    rate,
    bezug,
    monate.map(() => true),
  );
}

export function wendeSaison(plan: Finanzplan, id: string, faktoren: MonatFaktoren): Finanzplan {
  return saisonSerie(plan, { art: "umsatz", id }, faktoren);
}

export function baueInvestition(eingabe: InvestitionEingabe, steuer: Grenzen): Investition {
  verlangeCents(eingabe.nettoCents, eingabe.bezeichnung || "Investition");
  if (eingabe.nettoCents === 0) {
    throw new AssistentFehler("Eine Investition braucht einen Betrag über 0.");
  }
  const auto = ordneInvestition(eingabe.nettoCents, steuer);
  const methode: AfaMethode =
    eingabe.methode ?? (auto.art === "sofortaufwand" ? "sofort_gwg" : auto.art);
  const basis = {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    kategorie: eingabe.kategorie,
    nettoCents: eingabe.nettoCents,
    umsatzsteuerSatz: eingabe.umsatzsteuerSatz,
    anschaffungsmonat: eingabe.anschaffungsmonat,
    zahlungszielTage: eingabe.zahlungszielTage,
    ...(eingabe.afaStartMonat ? { afaStartMonat: eingabe.afaStartMonat } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
  if (methode === "linear") {
    if (eingabe.nutzungsdauerMonate == null || eingabe.nutzungsdauerMonate < 1) {
      throw new AssistentFehler("Die lineare Abschreibung braucht eine Nutzungsdauer in Monaten.");
    }
    return {
      ...basis,
      afaMethode: "linear",
      nutzungsdauerMonate: eingabe.nutzungsdauerMonate,
      ...(eingabe.restwertCents != null ? { restwertCents: eingabe.restwertCents } : {}),
    };
  }
  if (methode === "sammelposten") {
    return {
      ...basis,
      afaMethode: "sammelposten",
      ...(eingabe.restwertCents != null ? { restwertCents: eingabe.restwertCents } : {}),
    };
  }
  return { ...basis, afaMethode: "sofort_gwg", nutzungsdauerMonate: 0 };
}

export function pruefeVorhaben(eingabe: VorhabenEingabe): string[] {
  const meldungen: string[] = [];
  if (eingabe.name.trim() === "") meldungen.push("Der Name des Vorhabens fehlt.");
  if (!isIsoMonth(eingabe.gruendungsmonat)) meldungen.push("Der Gründungsmonat fehlt.");
  if (!eingabe.rechtsform) meldungen.push("Die Rechtsform fehlt.");
  if (!eingabe.bundesland) meldungen.push("Das Bundesland fehlt.");
  if (eingabe.gesellschafter.length === 0) meldungen.push("Mindestens eine Person fehlt.");
  for (const person of eingabe.gesellschafter) {
    if (person.name.trim() === "") meldungen.push("Der Name einer Person fehlt.");
    if (person.anteil < 0 || person.anteil > 1) {
      meldungen.push("Ein Anteil muss zwischen 0 % und 100 % liegen.");
    }
  }
  if (eingabe.stammkapitalCents != null && eingabe.stammkapitalCents < 0) {
    meldungen.push("Das Stammkapital darf nicht negativ sein.");
  }
  if (eingabe.hebesatz != null && eingabe.hebesatz < 0) {
    meldungen.push("Der Hebesatz darf nicht negativ sein.");
  }
  return meldungen;
}

export function pruefeUmsatz(linien: readonly UmsatzEingabe[]): string[] {
  const meldungen: string[] = [];
  for (const linie of linien) {
    if (linie.bezeichnung.trim() === "") meldungen.push("Eine Leistung braucht eine Bezeichnung.");
    if (linie.umsatzsteuerSatz < 0 || linie.umsatzsteuerSatz > 1) {
      meldungen.push("Der Umsatzsteuersatz muss zwischen 0 % und 100 % liegen.");
    }
    if (linie.modus === "monat") {
      if (linie.basisCents < 0) meldungen.push("Der Umsatz darf nicht negativ sein.");
      if (linie.wachstum && !(linie.wachstum.jahresrate > -1)) {
        meldungen.push("Die Wachstumsrate muss über −100 % liegen.");
      }
      if (linie.saison?.some((faktor) => faktor < 0 || faktor > 10)) {
        meldungen.push("Saisonfaktoren müssen zwischen 0 und 10 liegen.");
      }
    } else if (linie.jahresCents.some((wert) => wert < 0)) {
      meldungen.push("Jahreswerte dürfen nicht negativ sein.");
    }
  }
  return meldungen;
}

function personAus(
  plan: Finanzplan,
  eingabe: GesellschafterEingabe,
  rechtsform: Rechtsform | undefined,
  index: number,
  anzahl: number,
): Person {
  const bisher = plan.stammdaten.personen.find((person) => person.id === eingabe.id);
  const rollen =
    eingabe.rollen ??
    bisher?.rollen ??
    (rechtsform ? standardRollen(rechtsform, anzahl, index) : ["inhaber"]);
  const person: Person = {
    id: eingabe.id,
    name: eingabe.name,
    rollen,
    anteil: eingabe.anteil,
  };
  if (bisher?.steuerprofil) person.steuerprofil = bisher.steuerprofil;
  if (bisher?.lebensbedarf) person.lebensbedarf = bisher.lebensbedarf;
  return person;
}

function steuerprofilAus(person: Person, eingabe: LebensbedarfEingabe): Person["steuerprofil"] {
  const profil: NonNullable<Person["steuerprofil"]> = {
    kirchensteuer: eingabe.kirchensteuer,
    splitting: eingabe.splitting ?? person.steuerprofil?.splitting ?? false,
  };
  const kinder = eingabe.kinderfreibetraege ?? person.steuerprofil?.kinderfreibetraege;
  const weitere =
    eingabe.weitereEinkuenfteJahrCents ?? person.steuerprofil?.weitereEinkuenfteJahrCents;
  if (kinder != null) profil.kinderfreibetraege = kinder;
  if (weitere != null) profil.weitereEinkuenfteJahrCents = weitere;
  return profil;
}

function lebensFelder(person: LebensbedarfEingabe): [string, MonatswertVorgabe][] {
  return [
    ["Lebenshaltung", person.lebenshaltung],
    ["Krankenversicherung", person.krankenversicherung],
    ["Pflegeversicherung", person.pflegeversicherung],
    ["Altersvorsorge", person.altersvorsorge],
    ["Sonstige Versicherungen", person.sonstigeVersicherungen],
  ];
}

function zuschuesseMit(plan: Finanzplan, zuschuss: GruendungszuschussEingabe | null) {
  const frei = plan.finanzierung.zuschuesse.filter(
    (eintrag) => eintrag.auszahlung.art !== "gruendungszuschuss",
  );
  if (!zuschuss) return frei;
  verlangeCents(zuschuss.alg1MonatlichCents, "Arbeitslosengeld");
  verlangeCents(zuschuss.pauschaleCents, "Pauschale");
  if (zuschuss.phase2Monate < 0) {
    throw new AssistentFehler("Die Dauer der Phase 2 darf nicht negativ sein.");
  }
  return [
    ...frei,
    {
      id: zuschuss.id,
      bezeichnung: zuschuss.bezeichnung ?? "Gründungszuschuss",
      steuerfrei: true,
      ...(zuschuss.notizen ? { notizen: zuschuss.notizen } : {}),
      auszahlung: {
        art: "gruendungszuschuss" as const,
        alg1MonatlichCents: zuschuss.alg1MonatlichCents,
        phase1Monate: zuschuss.phase1Monate,
        pauschaleCents: zuschuss.pauschaleCents,
        phase2Geplant: zuschuss.phase2Geplant,
        phase2Monate: zuschuss.phase2Geplant ? zuschuss.phase2Monate : 0,
        startMonat: zuschuss.startMonat,
      },
    },
  ];
}

function umsatzAus(plan: Finanzplan, eingabe: UmsatzEingabe): Umsatzposition {
  if (eingabe.umsatzsteuerSatz < 0) {
    throw new AssistentFehler("Der Umsatzsteuersatz darf nicht negativ sein.");
  }
  const bisher = plan.umsatzplanung.find((linie) => linie.id === eingabe.id);
  const wareneinsatz = bisher?.wareneinsatz ?? { art: "keiner" as const };
  const monatsumsatz =
    eingabe.modus === "jahre"
      ? jahreswert(plan, eingabe.jahresCents)
      : monatswert(eingabe.basisCents, eingabe.wachstum, eingabe.saison);
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    ...(eingabe.beschreibung ? { beschreibung: eingabe.beschreibung } : {}),
    art: "monatsumsatz",
    monatsumsatz,
    umsatzsteuerSatz: eingabe.umsatzsteuerSatz,
    zahlungszielTage: eingabe.zahlungszielTage,
    wareneinsatz,
    ...(eingabe.aktivVon ? { aktivVon: eingabe.aktivVon } : {}),
    ...(eingabe.aktivBis ? { aktivBis: eingabe.aktivBis } : {}),
  };
}

function jahreswert(plan: Finanzplan, jahresCents: readonly number[]): MonatswertVorgabe {
  if (!plan.startMonat) throw new AssistentFehler("Der Gründungsmonat fehlt.");
  return monatsumsatzAusJahren(plan.startMonat, plan.horizontMonate, jahresCents);
}

function monatswert(
  basisCents: number,
  wachstum: Wachstum | undefined,
  saison: MonatFaktoren | undefined,
): MonatswertVorgabe {
  verlangeCents(basisCents, "Umsatz");
  if (wachstum && !(wachstum.jahresrate > -1)) {
    throw new AssistentFehler("Die Wachstumsrate muss über −100 % liegen.");
  }
  let vorgabe: MonatswertVorgabe = { basisCents };
  if (wachstum) vorgabe = { ...vorgabe, wachstum: wachstumKopie(wachstum) };
  if (saison) vorgabe = saisonMonatswert(vorgabe, saison);
  return vorgabe;
}

function wachstumKopie(wachstum: Wachstum): Wachstum {
  const kopie: Wachstum = { jahresrate: wachstum.jahresrate, modus: wachstum.modus };
  if (wachstum.eingabe) kopie.eingabe = { ...wachstum.eingabe };
  return kopie;
}

function stelleAus(eingabe: StelleEingabe): Personalstelle {
  verlangeCents(eingabe.brutto.basisCents, eingabe.bezeichnung || "Gehalt");
  if (eingabe.agNebenkostenSatz < 0) {
    throw new AssistentFehler("Der Nebenkostensatz darf nicht negativ sein.");
  }
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    ...(eingabe.name ? { name: eingabe.name } : {}),
    ...(eingabe.personId ? { personId: eingabe.personId } : {}),
    rolle: eingabe.rolle,
    brutto: eingabe.brutto,
    eintritt: eingabe.eintritt,
    ...(eingabe.austritt ? { austritt: eingabe.austritt } : {}),
    agNebenkostenSatz: eingabe.agNebenkostenSatz,
    ...(eingabe.nebenkostenDetail ? { nebenkostenDetail: eingabe.nebenkostenDetail } : {}),
    sozialversicherungspflichtig: eingabe.sozialversicherungspflichtig,
    ...(eingabe.wochenstunden != null ? { wochenstunden: eingabe.wochenstunden } : {}),
    ...(eingabe.sonderzahlungen ? { sonderzahlungen: eingabe.sonderzahlungen } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
}

function kostenAus(eingabe: KostenEingabe): Kostenposition {
  if (eingabe.umsatzsteuerSatz < 0) {
    throw new AssistentFehler("Der Umsatzsteuersatz darf nicht negativ sein.");
  }
  const basis = {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    kategorie: eingabe.kategorie,
    umsatzsteuerSatz: eingabe.umsatzsteuerSatz,
    zahlungszielTage: eingabe.zahlungszielTage,
    betriebsausgabe: eingabe.betriebsausgabe,
    ...(eingabe.privatanteil != null ? { privatanteil: eingabe.privatanteil } : {}),
    ...(eingabe.aktivVon ? { aktivVon: eingabe.aktivVon } : {}),
    ...(eingabe.aktivBis ? { aktivBis: eingabe.aktivBis } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
  if (eingabe.art === "umsatzabhaengig") {
    if (eingabe.umsatzquote < 0) throw new AssistentFehler("Die Quote darf nicht negativ sein.");
    return { ...basis, art: "umsatzabhaengig", umsatzquote: eingabe.umsatzquote };
  }
  verlangeCents(eingabe.betrag.basisCents, eingabe.bezeichnung || "Kosten");
  return { ...basis, art: "fix", betrag: eingabe.betrag };
}

function einmalAus(eingabe: EinmalEingabe): Einmalkosten {
  verlangeCents(eingabe.nettoCents, eingabe.bezeichnung || "Einmalkosten");
  if (eingabe.nettoCents === 0)
    throw new AssistentFehler("Der Posten braucht einen Betrag über 0.");
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    nettoCents: eingabe.nettoCents,
    umsatzsteuerSatz: eingabe.umsatzsteuerSatz,
    monat: eingabe.monat,
    zahlungszielTage: eingabe.zahlungszielTage,
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
    buchung: { art: "aufwand" },
  };
}

function betragOffen(betragCents: number | null): boolean {
  return betragCents == null || betragCents === 0;
}

function eigenkapitalAus(eingabe: EigenkapitalEingabe & { betragCents: number }) {
  verlangeCents(eingabe.betragCents, eingabe.bezeichnung || "Eigenkapital");
  if (eingabe.betragCents === 0)
    throw new AssistentFehler("Die Einlage braucht einen Betrag über 0.");
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    ...(eingabe.personId ? { personId: eingabe.personId } : {}),
    betragCents: eingabe.betragCents,
    monat: eingabe.monat,
    art: eingabe.art,
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
}

function darlehenAusVorlage(plan: Finanzplan, eingabe: TabDarlehenEingabe): Darlehen {
  verlangeCents(eingabe.betragCents, "Darlehen");
  if (eingabe.betragCents === 0)
    throw new AssistentFehler("Das Darlehen braucht einen Betrag über 0.");
  const vorlage = plan.parameter.darlehensvorlagen.find(
    (eintrag) => eintrag.id === TAB_MIKRODARLEHEN_ID,
  );
  if (!vorlage) {
    throw new AssistentFehler("Die Vorlage für das Thüringer Mikrodarlehen fehlt im Plan.");
  }
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung ?? vorlage.bezeichnung,
    geber: eingabe.geber ?? vorlage.anbieter,
    art: "foerderdarlehen",
    vorlageId: vorlage.id,
    betragCents: eingabe.betragCents,
    auszahlungen: [{ monat: eingabe.monat, betragCents: eingabe.betragCents }],
    nominalzinsPa: vorlage.nominalzinsPa,
    auszahlungAnteil: vorlage.auszahlungAnteil,
    gebuehrenCents: vorlage.gebuehrenCents,
    laufzeitMonate: eingabe.laufzeitMonate,
    tilgungsfreieMonate: eingabe.tilgungsfreieMonate,
    zinszahlungInTilgungsfreierZeit: vorlage.zinszahlungInTilgungsfreierZeit,
    tilgungsart: vorlage.tilgungsart,
    ...(eingabe.sicherheitenNotiz ? { sicherheitenNotiz: eingabe.sicherheitenNotiz } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
}

function weiteresDarlehen(eingabe: WeiteresDarlehenEingabe & { betragCents: number }): Darlehen {
  verlangeCents(eingabe.betragCents, eingabe.bezeichnung || "Darlehen");
  if (eingabe.nominalzinsPa < 0) throw new AssistentFehler("Der Zinssatz darf nicht negativ sein.");
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    geber: eingabe.geber,
    art: eingabe.art,
    ...(eingabe.vorlageId ? { vorlageId: eingabe.vorlageId } : {}),
    betragCents: eingabe.betragCents,
    auszahlungen: [{ monat: eingabe.monat, betragCents: eingabe.betragCents }],
    nominalzinsPa: eingabe.nominalzinsPa,
    ...(eingabe.auszahlungAnteil != null ? { auszahlungAnteil: eingabe.auszahlungAnteil } : {}),
    ...(eingabe.gebuehrenCents != null ? { gebuehrenCents: eingabe.gebuehrenCents } : {}),
    laufzeitMonate: eingabe.laufzeitMonate,
    tilgungsfreieMonate: eingabe.tilgungsfreieMonate,
    zinszahlungInTilgungsfreierZeit: eingabe.zinszahlungInTilgungsfreierZeit,
    tilgungsart: eingabe.tilgungsart,
    ...(eingabe.personId ? { personId: eingabe.personId } : {}),
    ...(eingabe.sicherheitenNotiz ? { sicherheitenNotiz: eingabe.sicherheitenNotiz } : {}),
    ...(eingabe.disagioCents != null ? { disagioCents: eingabe.disagioCents } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
}

function offeneEinlageAus(eingabe: EigenkapitalEingabe): OffeneEinlage {
  if (!isIsoMonth(eingabe.monat)) throw new AssistentFehler("Der Monat der Einlage fehlt.");
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    monat: eingabe.monat,
    art: eingabe.art,
    ...(eingabe.personId ? { personId: eingabe.personId } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
}

function offenesDarlehenAus(eingabe: WeiteresDarlehenEingabe): OffenesDarlehen {
  if (!isIsoMonth(eingabe.monat)) throw new AssistentFehler("Der Monat des Darlehens fehlt.");
  if (eingabe.nominalzinsPa < 0) throw new AssistentFehler("Der Zinssatz darf nicht negativ sein.");
  return {
    id: eingabe.id,
    bezeichnung: eingabe.bezeichnung,
    geber: eingabe.geber,
    art: eingabe.art,
    monat: eingabe.monat,
    nominalzinsPa: eingabe.nominalzinsPa,
    laufzeitMonate: eingabe.laufzeitMonate,
    tilgungsfreieMonate: eingabe.tilgungsfreieMonate,
    zinszahlungInTilgungsfreierZeit: eingabe.zinszahlungInTilgungsfreierZeit,
    tilgungsart: eingabe.tilgungsart,
    ...(eingabe.auszahlungAnteil != null ? { auszahlungAnteil: eingabe.auszahlungAnteil } : {}),
    ...(eingabe.gebuehrenCents != null ? { gebuehrenCents: eingabe.gebuehrenCents } : {}),
    ...(eingabe.personId ? { personId: eingabe.personId } : {}),
    ...(eingabe.vorlageId ? { vorlageId: eingabe.vorlageId } : {}),
    ...(eingabe.sicherheitenNotiz ? { sicherheitenNotiz: eingabe.sicherheitenNotiz } : {}),
    ...(eingabe.disagioCents != null ? { disagioCents: eingabe.disagioCents } : {}),
    ...(eingabe.notizen ? { notizen: eingabe.notizen } : {}),
  };
}

function entwuerfeSetzen(
  plan: Finanzplan,
  offeneEinlagen: OffeneEinlage[],
  offeneDarlehen: OffenesDarlehen[],
): Finanzplan["assistent"] {
  if (!plan.assistent && offeneEinlagen.length === 0 && offeneDarlehen.length === 0) {
    return undefined;
  }
  const naechster: NonNullable<Finanzplan["assistent"]> = {
    ...(plan.assistent ?? { station: "finanzierung", erledigt: [] }),
  };
  if (offeneEinlagen.length > 0) naechster.offeneEinlagen = offeneEinlagen;
  else delete naechster.offeneEinlagen;
  if (offeneDarlehen.length > 0) naechster.offeneDarlehen = offeneDarlehen;
  else delete naechster.offeneDarlehen;
  return naechster;
}

function verlangeCents(wert: number, feld: string): void {
  if (!Number.isInteger(wert) || wert < 0) {
    throw new AssistentFehler(`${feld}: Beträge müssen ganze, nicht negative Cent sein.`);
  }
}

function setzeWenn<T extends object, K extends keyof T>(
  ziel: T,
  schluessel: K,
  wert: T[K] | undefined,
): void {
  if (wert !== undefined) ziel[schluessel] = wert;
}

function setzeWahl<T extends object, K extends keyof T>(
  ziel: T,
  schluessel: K,
  wert: T[K] | undefined,
  bisher: T[K] | undefined,
): void {
  const gewählt = wert !== undefined ? wert : bisher;
  if (gewählt !== undefined) ziel[schluessel] = gewählt;
  else delete ziel[schluessel];
}
