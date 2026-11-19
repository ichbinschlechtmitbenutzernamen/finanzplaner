import { monatsbetragCents } from "./calc/monatswert.ts";
import { roundRate } from "./calc/round.ts";
import type { IsoMonth } from "./months.ts";
import type {
  Privatblock,
  PrivatblockSchluessel,
  PrivaterLebensbedarf,
  Privatposten,
  SozialversicherungEingabe,
} from "./types.ts";

export const STANDARD_PRIVAT: readonly {
  schluessel: Exclude<PrivatblockSchluessel, "eigen">;
  bezeichnung: string;
  posten: readonly { schluessel: string; bezeichnung: string }[];
}[] = [
  {
    schluessel: "wohnen",
    bezeichnung: "Wohnen",
    posten: [
      { schluessel: "miete", bezeichnung: "Miete/Kreditrate inkl. Nebenkosten" },
      { schluessel: "energie", bezeichnung: "Strom/Heizung" },
    ],
  },
  {
    schluessel: "lebenshaltung",
    bezeichnung: "Lebenshaltung",
    posten: [
      { schluessel: "alltag", bezeichnung: "Lebensmittel/Kleidung/Drogerie/Apotheke" },
      { schluessel: "telefon", bezeichnung: "Telefon/Internet" },
      { schluessel: "medien", bezeichnung: "Rundfunkgebühren/Streamingabos" },
      { schluessel: "freizeit", bezeichnung: "Freizeit" },
      { schluessel: "kinderbetreuung", bezeichnung: "Kinderbetreuungskosten" },
    ],
  },
  {
    schluessel: "versicherungen",
    bezeichnung: "Sonstige Versicherungen",
    posten: [
      { schluessel: "haftpflicht", bezeichnung: "Privathaftpflicht/Hausrat" },
      { schluessel: "altersvorsorge", bezeichnung: "Altersvorsorge privat" },
      { schluessel: "weitere_versicherungen", bezeichnung: "Andere Versicherungen" },
    ],
  },
  {
    schluessel: "mobilitaet",
    bezeichnung: "KFZ/Mobilität",
    posten: [
      { schluessel: "kfz_steuer", bezeichnung: "Steuern und Versicherungen" },
      { schluessel: "tanken", bezeichnung: "Tanken" },
      { schluessel: "reparatur", bezeichnung: "Reparaturrücklage" },
      { schluessel: "mobilitaet_sonstiges", bezeichnung: "Sonstiges" },
      { schluessel: "bahn", bezeichnung: "Deutsche Bahn" },
    ],
  },
  {
    schluessel: "sonstiges",
    bezeichnung: "Sonstiges",
    posten: [
      { schluessel: "unterhalt", bezeichnung: "Unterhaltsverpflichtungen" },
      { schluessel: "kredite", bezeichnung: "Kredit-/Leasingraten" },
      { schluessel: "urlaub", bezeichnung: "Urlaub" },
      { schluessel: "anschaffungen", bezeichnung: "Anschaffungen" },
    ],
  },
];

/** Alltag ohne Versicherungen. Dient der Plausibilitätsgrenze für die Lebenshaltung. */
export const LEBENSHALTUNG_BLOECKE: readonly PrivatblockSchluessel[] = [
  "wohnen",
  "lebenshaltung",
  "mobilitaet",
  "sonstiges",
  "eigen",
];

export function standardSozialversicherung(kinder = false): SozialversicherungEingabe {
  return {
    krankenversicherung: "gesetzlich",
    krankengeldanspruch: true,
    kinder,
    privatbeitragCents: 0,
    rentenversicherung: "nein",
    arbeitslosenversicherung: false,
  };
}

export function standardLebensbedarf(personId: string, kinder = false): PrivaterLebensbedarf {
  return {
    bloecke: STANDARD_PRIVAT.map((block) => ({
      id: `${personId}-${block.schluessel}`,
      bezeichnung: block.bezeichnung,
      schluessel: block.schluessel,
      faktorJahr2: 1,
      faktorJahr3: 1,
      posten: block.posten.map((posten) => ({
        id: `${personId}-${posten.schluessel}`,
        bezeichnung: posten.bezeichnung,
        schluessel: posten.schluessel,
        betrag: { basisCents: 0 },
      })),
    })),
    sozialversicherung: standardSozialversicherung(kinder),
  };
}

/** Beispiel- oder Testdaten: Standardblöcke mit einzelnen Monatsbeträgen. */
export function lebensbedarfMit(
  personId: string,
  postenCents: Readonly<Record<string, number>>,
  sozial: Partial<SozialversicherungEingabe> = {},
  faktoren: Readonly<Record<string, { jahr2?: number; jahr3?: number }>> = {},
  notizen?: string,
): PrivaterLebensbedarf {
  const bedarf = standardLebensbedarf(personId, sozial.kinder ?? false);
  for (const [schluessel, cents] of Object.entries(postenCents)) {
    setzeStandardPosten(bedarf, schluessel, cents);
  }
  for (const block of bedarf.bloecke) {
    const faktor = faktoren[block.schluessel];
    if (!faktor) continue;
    if (faktor.jahr2 != null) block.faktorJahr2 = faktor.jahr2;
    if (faktor.jahr3 != null) block.faktorJahr3 = faktor.jahr3;
  }
  bedarf.sozialversicherung = { ...bedarf.sozialversicherung, ...sozial };
  if (notizen) bedarf.notizen = notizen;
  return bedarf;
}

/** Setzt den Basisbetrag eines Standardpostens. Der Posten muss schon existieren. */
export function setzeStandardPosten(
  bedarf: PrivaterLebensbedarf,
  schluessel: string,
  basisCents: number,
): void {
  for (const block of bedarf.bloecke) {
    const posten = block.posten.find((eintrag) => eintrag.schluessel === schluessel);
    if (posten) {
      posten.betrag = { ...posten.betrag, basisCents };
      return;
    }
  }
  throw new Error(`Privatposten „${schluessel}“ fehlt.`);
}

export function planjahrFaktor(
  block: Pick<Privatblock, "faktorJahr2" | "faktorJahr3">,
  index: number,
): number {
  if (index < 12) return 1;
  if (index < 24) return block.faktorJahr2;
  return block.faktorJahr3;
}

/** Monatsbetrag eines Postens nach dem Blockfaktor des Planjahres, in Cent. */
export function postenMonatCents(
  posten: Privatposten,
  block: Pick<Privatblock, "faktorJahr2" | "faktorJahr3">,
  monat: IsoMonth,
  start: IsoMonth,
  index: number,
): number {
  return roundRate(monatsbetragCents(posten.betrag, monat, start), planjahrFaktor(block, index));
}

export function blockMonatCents(
  block: Privatblock,
  monat: IsoMonth,
  start: IsoMonth,
  index: number,
): number {
  return block.posten.reduce(
    (summe, posten) => summe + postenMonatCents(posten, block, monat, start, index),
    0,
  );
}
