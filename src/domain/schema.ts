import { z } from "zod";
import { ISO_MONTH_PATTERN } from "./months.ts";
import { refineFinanzplan } from "./schema-refine.ts";
import {
  BUNDESLAENDER,
  DARLEHENSARTEN,
  EIGENKAPITAL_ARTEN,
  INVESTITIONSKATEGORIEN,
  KOSTENKATEGORIEN,
  PERSON_ROLLEN,
  PERSONAL_ROLLEN,
  PLAN_HORIZON_MONTHS,
  PLAN_STATUS,
  PLAN_ZWECKE,
  RECHTSFORMEN,
  SCHEMA_VERSION,
  SZENARIO_IDS,
  TILGUNGSARTEN,
  UST_REGIME,
  UST_VERSTEUERUNG,
  UST_VORANMELDUNG,
  WACHSTUMSBEZUEGE,
  WACHSTUMSMODI,
  WAEHRUNG,
  ZUSCHUSS_PROGRAMME,
  type Finanzplan,
} from "./types.ts";

z.config(z.locales.de());

const idSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/,
    "Id: Buchstaben, Ziffern, Bindestrich oder Unterstrich, höchstens 80 Zeichen.",
  );

const isoMonthSchema = z.string().regex(ISO_MONTH_PATTERN, "Monat im Format JJJJ-MM angeben.");

const centsSchema = z
  .number()
  .int("Beträge in ganzen Cent angeben.")
  .nonnegative("Beträge dürfen nicht negativ sein.")
  .max(100_000_000_000, "Betrag ist unplausibel hoch.");

const positiveCentsSchema = centsSchema.positive("Betrag muss größer als 0 sein.");

const signedCentsSchema = z
  .number()
  .int("Beträge in ganzen Cent angeben.")
  .min(-100_000_000_000)
  .max(100_000_000_000);

const satzSchema = z
  .number()
  .min(0, "Satz darf nicht negativ sein.")
  .max(1, "Satz als Dezimalzahl angeben, z. B. 0.19 für 19 %.");

const anteilSchema = satzSchema;

const textSchema = (max: number) => z.string().min(1, "Pflichtfeld.").max(max);

const optionalTextSchema = (max: number) => z.string().max(max);

const tageSchema = z.number().int().min(0).max(365);

const faktorSchema = z.number().min(0).max(10);

const szenarioFaktorSchema = z.number().min(0).max(5);

const monatFaktorenSchema = z.tuple([
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
  faktorSchema,
]);

const wachstumEingabeSchema = z.strictObject({
  rate: z.number().gt(-1, "Die Rate muss größer als -100 % sein.").max(10),
  bezug: z.enum(WACHSTUMSBEZUEGE),
});

const wachstumSchema = z.strictObject({
  jahresrate: z.number().gt(-1, "Die Jahresrate muss größer als -100 % sein.").max(10),
  modus: z.enum(WACHSTUMSMODI),
  eingabe: wachstumEingabeSchema.optional(),
});

const saisonSchema = z.strictObject({
  faktoren: monatFaktorenSchema,
});

const monatsOverrideSchema = z.strictObject({
  monat: isoMonthSchema,
  wertCents: centsSchema,
});

export const monatswertSchema = z.strictObject({
  basisCents: centsSchema,
  bezugsmonat: isoMonthSchema.optional(),
  wachstum: wachstumSchema.optional(),
  saison: saisonSchema.optional(),
  monatsOverride: z.array(monatsOverrideSchema).max(36).optional(),
});

const mengenOverrideSchema = z.strictObject({
  monat: isoMonthSchema,
  wert: z.number().nonnegative().max(1_000_000_000),
});

export const mengenSchema = z.strictObject({
  basis: z.number().nonnegative().max(1_000_000_000),
  bezugsmonat: isoMonthSchema.optional(),
  wachstum: wachstumSchema.optional(),
  saison: saisonSchema.optional(),
  monatsOverride: z.array(mengenOverrideSchema).max(36).optional(),
});

const steuerprofilSchema = z.strictObject({
  kirchensteuer: z.boolean(),
  splitting: z.boolean(),
  kinderfreibetraege: z
    .number()
    .min(0)
    .max(20)
    .refine(
      (value) => Math.abs(value * 2 - Math.round(value * 2)) < 1e-9,
      "Kinderfreibeträge in halben Schritten angeben.",
    )
    .optional(),
  weitereEinkuenfteJahrCents: centsSchema.optional(),
});

const lebensbedarfSchema = z.strictObject({
  lebenshaltung: monatswertSchema,
  krankenversicherung: monatswertSchema,
  pflegeversicherung: monatswertSchema,
  altersvorsorge: monatswertSchema,
  sonstigeVersicherungen: monatswertSchema,
  notizen: optionalTextSchema(2000).optional(),
});

const personSchema = z.strictObject({
  id: idSchema,
  name: textSchema(200),
  rollen: z.array(z.enum(PERSON_ROLLEN)).min(1).max(PERSON_ROLLEN.length),
  anteil: anteilSchema,
  steuerprofil: steuerprofilSchema.optional(),
  lebensbedarf: lebensbedarfSchema.optional(),
});

const vorlageSchema = z.strictObject({
  id: idSchema,
  name: textSchema(200),
  version: textSchema(40),
});

const stammdatenSchema = z.strictObject({
  planName: optionalTextSchema(200),
  beispiel: z.boolean(),
  firmenname: optionalTextSchema(200),
  rechtsform: z.enum(RECHTSFORMEN).optional(),
  branche: optionalTextSchema(200),
  branchenschluessel: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Branchenschlüssel in Kleinbuchstaben und Bindestrichen.")
    .max(80)
    .optional(),
  wzCode: z.string().min(2).max(20).optional(),
  taetigkeitsbeschreibung: optionalTextSchema(5000),
  strasse: optionalTextSchema(200).optional(),
  plz: z
    .string()
    .regex(/^\d{5}$/, "Postleitzahl mit 5 Ziffern.")
    .optional(),
  ort: optionalTextSchema(120),
  bundesland: z.enum(BUNDESLAENDER).optional(),
  gewerbesteuerHebesatz: z.number().min(0).max(2000).optional(),
  gruendungsmonat: isoMonthSchema.optional(),
  handelsregisterGeplant: z.boolean().optional(),
  stammkapitalCents: positiveCentsSchema.optional(),
  personen: z.array(personSchema).max(50),
  zwecke: z.array(z.enum(PLAN_ZWECKE)).max(PLAN_ZWECKE.length),
  angewendeteVorlage: vorlageSchema.optional(),
});

const investitionFelder = {
  id: idSchema,
  bezeichnung: textSchema(200),
  kategorie: z.enum(INVESTITIONSKATEGORIEN),
  nettoCents: positiveCentsSchema,
  umsatzsteuerSatz: satzSchema,
  anschaffungsmonat: isoMonthSchema,
  afaStartMonat: isoMonthSchema.optional(),
  restwertCents: centsSchema.optional(),
  zahlungszielTage: tageSchema,
  notizen: optionalTextSchema(2000).optional(),
};

const investitionSchema = z.discriminatedUnion("afaMethode", [
  z.strictObject({
    ...investitionFelder,
    afaMethode: z.literal("linear"),
    nutzungsdauerMonate: z.number().int().min(1).max(600),
  }),
  z.strictObject({
    ...investitionFelder,
    afaMethode: z.literal("sofort_gwg"),
    nutzungsdauerMonate: z.literal(0, {
      error: "Bei Sofortabschreibung als GWG ist die Nutzungsdauer 0.",
    }),
  }),
  z.strictObject({
    ...investitionFelder,
    afaMethode: z.literal("sammelposten"),
  }),
]);

const einmalkostenFelder = {
  id: idSchema,
  bezeichnung: textSchema(200),
  nettoCents: positiveCentsSchema,
  umsatzsteuerSatz: satzSchema,
  monat: isoMonthSchema,
  zahlungszielTage: tageSchema,
  notizen: optionalTextSchema(2000).optional(),
};

const einmalkostenSchema = z.union([
  z.strictObject({
    ...einmalkostenFelder,
    buchung: z.strictObject({ art: z.literal("aufwand") }),
  }),
  z.strictObject({
    ...einmalkostenFelder,
    buchung: z.strictObject({
      art: z.literal("anlage"),
      afaMethode: z.literal("linear"),
      nutzungsdauerMonate: z.number().int().min(1).max(600),
      afaStartMonat: isoMonthSchema.optional(),
      restwertCents: centsSchema.optional(),
    }),
  }),
  z.strictObject({
    ...einmalkostenFelder,
    buchung: z.strictObject({
      art: z.literal("anlage"),
      afaMethode: z.literal("sofort_gwg"),
      afaStartMonat: isoMonthSchema.optional(),
    }),
  }),
  z.strictObject({
    ...einmalkostenFelder,
    buchung: z.strictObject({
      art: z.literal("anlage"),
      afaMethode: z.literal("sammelposten"),
      afaStartMonat: isoMonthSchema.optional(),
      restwertCents: centsSchema.optional(),
    }),
  }),
]);

const betriebsmittelSchema = z.strictObject({
  betriebsmittelbedarfCents: centsSchema,
  liquiditaetsreserveCents: centsSchema,
  warenErstbestandNettoCents: centsSchema.optional(),
  umsatzsteuerSatzWaren: satzSchema.optional(),
  notizen: optionalTextSchema(2000).optional(),
});

const kapitalbedarfSchema = z.strictObject({
  investitionen: z.array(investitionSchema).max(200),
  gruendungskosten: z.array(einmalkostenSchema).max(100),
  anlaufkosten: z.array(einmalkostenSchema).max(100),
  betriebsmittel: betriebsmittelSchema,
});

const eigenkapitalSchema = z.strictObject({
  id: idSchema,
  bezeichnung: textSchema(200),
  personId: idSchema.optional(),
  betragCents: positiveCentsSchema,
  monat: isoMonthSchema,
  art: z.enum(EIGENKAPITAL_ARTEN),
  notizen: optionalTextSchema(2000).optional(),
});

const darlehenSchema = z.strictObject({
  id: idSchema,
  bezeichnung: textSchema(200),
  geber: textSchema(200),
  art: z.enum(DARLEHENSARTEN),
  betragCents: positiveCentsSchema,
  auszahlungen: z
    .array(
      z.strictObject({
        monat: isoMonthSchema,
        betragCents: positiveCentsSchema,
      }),
    )
    .min(1)
    .max(36),
  nominalzinsPa: satzSchema,
  vorlageId: idSchema.optional(),
  auszahlungAnteil: z.number().min(0).max(1).optional(),
  gebuehrenCents: centsSchema.optional(),
  laufzeitMonate: z.number().int().min(1).max(600),
  tilgungsfreieMonate: z.number().int().min(0).max(600),
  zinszahlungInTilgungsfreierZeit: z.boolean(),
  tilgungsart: z.enum(TILGUNGSARTEN),
  personId: idSchema.optional(),
  sicherheitenNotiz: optionalTextSchema(2000).optional(),
  disagioCents: centsSchema.optional(),
  notizen: optionalTextSchema(2000).optional(),
});

const gruendungszuschussSchema = z.strictObject({
  art: z.literal("gruendungszuschuss"),
  alg1MonatlichCents: centsSchema,
  phase1Monate: z.number().int().min(1).max(36),
  pauschaleCents: centsSchema,
  phase2Geplant: z.boolean(),
  phase2Monate: z.number().int().min(0).max(36),
  startMonat: isoMonthSchema,
});

const freieZuschussSchema = z.strictObject({
  art: z.literal("frei"),
  programm: z.enum(ZUSCHUSS_PROGRAMME),
  positionen: z
    .array(
      z.strictObject({
        monat: isoMonthSchema,
        betragCents: positiveCentsSchema,
      }),
    )
    .min(1)
    .max(36),
});

const zuschussSchema = z.strictObject({
  id: idSchema,
  bezeichnung: textSchema(200),
  steuerfrei: z.boolean(),
  auszahlung: z.discriminatedUnion("art", [gruendungszuschussSchema, freieZuschussSchema]),
  notizen: optionalTextSchema(2000).optional(),
});

const finanzierungSchema = z.strictObject({
  eigenkapital: z.array(eigenkapitalSchema).max(50),
  darlehen: z.array(darlehenSchema).max(50),
  zuschuesse: z.array(zuschussSchema).max(50),
});

const wareneinsatzSchema = z.discriminatedUnion("art", [
  z.strictObject({ art: z.literal("keiner") }),
  z.strictObject({
    art: z.literal("prozent_vom_umsatz"),
    quote: z.number().min(0).max(5),
    umsatzsteuerSatz: satzSchema,
  }),
]);

const umsatzBase = {
  id: idSchema,
  bezeichnung: textSchema(200),
  beschreibung: optionalTextSchema(2000).optional(),
  umsatzsteuerSatz: satzSchema,
  zahlungszielTage: tageSchema,
  wareneinsatz: wareneinsatzSchema,
  aktivVon: isoMonthSchema.optional(),
  aktivBis: isoMonthSchema.optional(),
};

const umsatzpositionSchema = z.discriminatedUnion("art", [
  z.strictObject({
    art: z.literal("monatsumsatz"),
    monatsumsatz: monatswertSchema,
    ...umsatzBase,
  }),
  z.strictObject({
    art: z.literal("menge_mal_preis"),
    mengeProMonat: mengenSchema,
    preisNetto: monatswertSchema,
    einheit: textSchema(40).optional(),
    ...umsatzBase,
  }),
]);

const lohnnebenkostenSchema = z.strictObject({
  rentenversicherung: satzSchema,
  arbeitslosenversicherung: satzSchema,
  krankenversicherung: satzSchema,
  pflegeversicherung: satzSchema,
  umlageU1: satzSchema,
  umlageU2: satzSchema,
  insolvenzgeldumlage: satzSchema,
  unfallversicherung: satzSchema,
});

const personalSchema = z.strictObject({
  id: idSchema,
  bezeichnung: textSchema(200),
  name: textSchema(200).optional(),
  personId: idSchema.optional(),
  rolle: z.enum(PERSONAL_ROLLEN),
  brutto: monatswertSchema,
  eintritt: isoMonthSchema,
  austritt: isoMonthSchema.optional(),
  agNebenkostenSatz: satzSchema,
  nebenkostenDetail: lohnnebenkostenSchema.optional(),
  sozialversicherungspflichtig: z.boolean(),
  wochenstunden: z.number().positive().max(80).optional(),
  sonderzahlungen: z
    .array(
      z.strictObject({
        monat: isoMonthSchema,
        bruttoCents: positiveCentsSchema,
        notizen: optionalTextSchema(500).optional(),
      }),
    )
    .max(36)
    .optional(),
  notizen: optionalTextSchema(2000).optional(),
});

const kostenBase = {
  id: idSchema,
  bezeichnung: textSchema(200),
  kategorie: z.enum(KOSTENKATEGORIEN),
  umsatzsteuerSatz: satzSchema,
  zahlungszielTage: tageSchema,
  betriebsausgabe: z.boolean(),
  privatanteil: anteilSchema.optional(),
  aktivVon: isoMonthSchema.optional(),
  aktivBis: isoMonthSchema.optional(),
  notizen: optionalTextSchema(2000).optional(),
};

const kostenpositionSchema = z.discriminatedUnion("art", [
  z.strictObject({
    art: z.literal("fix"),
    betrag: monatswertSchema,
    ...kostenBase,
  }),
  z.strictObject({
    art: z.literal("umsatzabhaengig"),
    umsatzquote: z.number().min(0).max(5),
    ...kostenBase,
  }),
]);

const umsatzsteuerSchema = z.strictObject({
  regime: z.enum(UST_REGIME),
  vorsteuerabzugsberechtigt: z.boolean(),
  versteuerungsart: z.enum(UST_VERSTEUERUNG),
  voranmeldungszeitraum: z.enum(UST_VORANMELDUNG),
  dauerfristverlaengerung: z.boolean(),
});

const euroBetragSchema = z.number().int().nonnegative().max(100_000_000);

const einkommensteuerTarifSchema = z.strictObject({
  quelle: textSchema(500),
  zone2BisEuro: euroBetragSchema,
  zone3BisEuro: euroBetragSchema,
  zone4BisEuro: euroBetragSchema,
  zone3SchwelleEuro: euroBetragSchema,
  zone2FaktorHundertstel: euroBetragSchema,
  zone2Summand: euroBetragSchema,
  zone3FaktorHundertstel: euroBetragSchema,
  zone3Summand: euroBetragSchema,
  zone3KonstanteHundertstel: euroBetragSchema,
  zone4AbzugHundertstel: euroBetragSchema,
  zone5AbzugHundertstel: euroBetragSchema,
});

const steuerparameterSchema = z.strictObject({
  umsatzsteuerRegelsatz: satzSchema,
  umsatzsteuerErmaessigt: satzSchema,
  koerperschaftsteuerSatz: satzSchema,
  solidaritaetszuschlagSatz: satzSchema,
  solidaritaetszuschlagFreigrenzeCents: centsSchema,
  solidaritaetszuschlagMilderungSatz: satzSchema,
  gewerbesteuerMesszahl: satzSchema,
  gewerbesteuerFreibetragPersonenCents: centsSchema,
  gewerbesteuerFreibetragKapitalCents: centsSchema,
  gewerbeertragAbrundungCents: centsSchema.positive("Die Abrundung muss größer als 0 sein."),
  gewerbesteuerAnrechnungFaktor: z.number().positive().max(20),
  einkommensteuerGrundfreibetragCents: centsSchema,
  kinderfreibetragJeElternteilCents: centsSchema,
  beaFreibetragJeElternteilCents: centsSchema,
  einkommensteuerSpitzensteuersatz: satzSchema,
  einkommensteuerReichensteuersatz: satzSchema,
  einkommensteuerTarif: einkommensteuerTarifSchema,
  kirchensteuerSatzBayernBadenWuerttemberg: satzSchema,
  kirchensteuerSatzUebrigeLaender: satzSchema,
  kleinunternehmerVorjahrCents: centsSchema,
  kleinunternehmerLaufendesJahrCents: centsSchema,
  gwgSofortMaxNettoCents: centsSchema,
  sammelpostenMinNettoCents: centsSchema,
  sammelpostenMaxNettoCents: centsSchema,
});

const steuerplanungSchema = z.strictObject({
  abschlusszahlungMonat: z.number().int().min(1).max(12),
});

const darlehensvorlageSchema = z.strictObject({
  id: idSchema,
  bezeichnung: textSchema(200),
  anbieter: textSchema(200),
  betragMinCents: positiveCentsSchema,
  betragMaxCents: positiveCentsSchema,
  laufzeitMaxMonate: z.number().int().min(1).max(600),
  tilgungsfreieMonateMax: z.number().int().min(0).max(600),
  nominalzinsPa: satzSchema,
  tilgungsart: z.enum(TILGUNGSARTEN),
  zinszahlungInTilgungsfreierZeit: z.boolean(),
  auszahlungAnteil: z.number().min(0).max(1),
  gebuehrenCents: centsSchema,
  quelle: textSchema(300),
  notizen: optionalTextSchema(2000).optional(),
});

const planparameterSchema = z.strictObject({
  version: textSchema(40),
  bezeichnung: textSchema(200),
  hinweis: optionalTextSchema(2000).optional(),
  steuer: steuerparameterSchema,
  darlehensvorlagen: z.array(darlehensvorlageSchema).max(30),
});

const umsatzAnpassungSchema = z.strictObject({
  id: idSchema,
  ziel: z.literal("umsatzposition"),
  positionId: idSchema,
  mengenFaktor: szenarioFaktorSchema.optional(),
  preisFaktor: szenarioFaktorSchema.optional(),
});

const kostenAnpassungSchema = z.strictObject({
  id: idSchema,
  ziel: z.literal("kostenposition"),
  positionId: idSchema,
  faktor: szenarioFaktorSchema.optional(),
  zuschlagCents: signedCentsSchema.optional(),
});

const personalAnpassungSchema = z.strictObject({
  id: idSchema,
  ziel: z.literal("personal"),
  positionId: idSchema,
  gehaltsFaktor: szenarioFaktorSchema,
});

const globaleAnpassungSchema = z.strictObject({
  id: idSchema,
  ziel: z.literal("global"),
  umsatzFaktor: szenarioFaktorSchema.optional(),
  kostenFaktor: szenarioFaktorSchema.optional(),
  personalFaktor: szenarioFaktorSchema.optional(),
});

const szenarioAnpassungSchema = z.discriminatedUnion("ziel", [
  umsatzAnpassungSchema,
  kostenAnpassungSchema,
  personalAnpassungSchema,
  globaleAnpassungSchema,
]);

const szenarioSchema = z.strictObject({
  bezeichnung: textSchema(120),
  beschreibung: optionalTextSchema(2000).optional(),
  anpassungen: z.array(szenarioAnpassungSchema).max(100),
});

const szenarienSchema = z.strictObject({
  aktiv: z.enum(SZENARIO_IDS),
  best: szenarioSchema,
  real: szenarioSchema,
  worst: szenarioSchema,
});

export const finanzplanSchema = z
  .strictObject({
    id: idSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
    status: z.enum(PLAN_STATUS),
    erstelltAm: z.iso.datetime(),
    geaendertAm: z.iso.datetime(),
    waehrung: z.literal(WAEHRUNG),
    startMonat: isoMonthSchema.optional(),
    horizontMonate: z.literal(PLAN_HORIZON_MONTHS),
    parameter: planparameterSchema,
    stammdaten: stammdatenSchema,
    kapitalbedarf: kapitalbedarfSchema,
    finanzierung: finanzierungSchema,
    umsatzplanung: z.array(umsatzpositionSchema).max(100),
    personal: z.array(personalSchema).max(200),
    laufendeKosten: z.array(kostenpositionSchema).max(200),
    umsatzsteuer: umsatzsteuerSchema,
    steuerplanung: steuerplanungSchema,
    szenarien: szenarienSchema,
    notizen: optionalTextSchema(5000).optional(),
  })
  .superRefine((plan, ctx) => {
    refineFinanzplan(plan, ctx);
  });

type Assert<T extends true> = T;
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Bricht die Typprüfung, wenn Schema und Interface auseinanderlaufen. */
export type FinanzplanSchemaMatches = Assert<
  MutuallyAssignable<z.infer<typeof finanzplanSchema>, Finanzplan>
>;
