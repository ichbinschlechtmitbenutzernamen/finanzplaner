import { waehleWeg } from "../assistent/stationen.ts";
import type {
  AssistentWeg,
  Finanzplan,
  InvestitionsKategorie,
  Kostenkategorie,
  OffeneInvestition,
  OffeneKosten,
  OffeneStelle,
  OffenerUmsatz,
  PersonalRolle,
} from "../types.ts";

/** „keine“ ist der bisherige leere Plan. Die anderen Schlüssel sind die Vorlagen. */
export const BRANCHENVORLAGE_IDS = ["keine", "handwerk", "gastronomie", "einzelhandel"] as const;

export type BranchenvorlageId = (typeof BRANCHENVORLAGE_IDS)[number];

export type BranchenvorlageSchluessel = Exclude<BranchenvorlageId, "keine">;

/** Auswahl auf dem Startbildschirm, in dieser Reihenfolge. */
export const BRANCHENVORLAGE_AUSWAHL: readonly { id: BranchenvorlageId; name: string }[] = [
  { id: "keine", name: "Ohne Vorlage" },
  { id: "handwerk", name: "Handwerk" },
  { id: "gastronomie", name: "Gastronomie" },
  { id: "einzelhandel", name: "Einzelhandel" },
];

const VORLAGEN_VERSION = "1";

interface UmsatzVorlage {
  id: string;
  bezeichnung: string;
  /** Material- oder Wareneinsatzposten zu dieser Umsatzart. Die Quote bleibt leer. */
  material?: string;
}

interface StellenVorlage {
  id: string;
  bezeichnung: string;
  rolle: PersonalRolle;
}

interface KostenVorlage {
  id: string;
  bezeichnung: string;
  kategorie: Kostenkategorie;
}

interface InvestitionsVorlage {
  id: string;
  bezeichnung: string;
  kategorie: InvestitionsKategorie;
}

/**
 * Eine Vorlage nennt nur Posten. Beträge, Quoten und Schwellen stehen hier nicht.
 * Eine weitere Branche ist ein weiterer Eintrag in `BRANCHENVORLAGEN`.
 */
export interface Branchenvorlage {
  id: BranchenvorlageSchluessel;
  name: string;
  version: string;
  umsatz: readonly UmsatzVorlage[];
  personal: readonly StellenVorlage[];
  kosten: readonly KostenVorlage[];
  investitionen: readonly InvestitionsVorlage[];
}

export const BRANCHENVORLAGEN: readonly Branchenvorlage[] = [
  {
    id: "handwerk",
    name: "Handwerk",
    version: VORLAGEN_VERSION,
    umsatz: [
      {
        id: "hw-arbeit",
        bezeichnung: "Arbeitsleistung / Stundenlohn",
        material: "Material",
      },
    ],
    personal: [{ id: "hw-fachkraft", bezeichnung: "Fachkraft", rolle: "angestellt" }],
    kosten: [
      { id: "hw-miete", bezeichnung: "Werkstattmiete", kategorie: "miete" },
      { id: "hw-kammer", bezeichnung: "Handwerkskammerbeitrag", kategorie: "beitraege" },
      { id: "hw-haftpflicht", bezeichnung: "Betriebshaftpflicht", kategorie: "versicherung" },
    ],
    investitionen: [
      { id: "hw-fahrzeug", bezeichnung: "Fahrzeug", kategorie: "fahrzeug" },
      { id: "hw-werkzeug", bezeichnung: "Werkzeug", kategorie: "maschine_ausstattung" },
    ],
  },
  {
    id: "gastronomie",
    name: "Gastronomie",
    version: VORLAGEN_VERSION,
    umsatz: [
      { id: "ga-speisen", bezeichnung: "Speisen", material: "Wareneinsatz Küche" },
      { id: "ga-getraenke", bezeichnung: "Getränke", material: "Wareneinsatz Getränke" },
    ],
    personal: [
      { id: "ga-service", bezeichnung: "Service", rolle: "angestellt" },
      { id: "ga-kueche", bezeichnung: "Küche", rolle: "angestellt" },
    ],
    kosten: [
      { id: "ga-pacht", bezeichnung: "Pacht", kategorie: "miete" },
      { id: "ga-energie", bezeichnung: "Energie", kategorie: "nebenkosten" },
      { id: "ga-gema", bezeichnung: "GEMA und Rundfunk", kategorie: "beitraege" },
      { id: "ga-reinigung", bezeichnung: "Reinigung", kategorie: "sonstiges" },
    ],
    investitionen: [
      { id: "ga-kueche", bezeichnung: "Küchenausstattung", kategorie: "maschine_ausstattung" },
    ],
  },
  {
    id: "einzelhandel",
    name: "Einzelhandel",
    version: VORLAGEN_VERSION,
    umsatz: [{ id: "eh-waren", bezeichnung: "Warenverkauf", material: "Wareneinsatz" }],
    personal: [{ id: "eh-verkauf", bezeichnung: "Verkauf", rolle: "angestellt" }],
    kosten: [
      { id: "eh-miete", bezeichnung: "Ladenmiete", kategorie: "miete" },
      { id: "eh-karten", bezeichnung: "Kartengebühren", kategorie: "sonstiges" },
      { id: "eh-werbung", bezeichnung: "Werbung", kategorie: "marketing" },
    ],
    investitionen: [
      { id: "eh-laden", bezeichnung: "Ladeneinrichtung", kategorie: "buero_einrichtung" },
      { id: "eh-kasse", bezeichnung: "Kassensystem", kategorie: "it" },
    ],
  },
];

export function vorlageNachId(id: BranchenvorlageSchluessel): Branchenvorlage {
  const vorlage = BRANCHENVORLAGEN.find((eintrag) => eintrag.id === id);
  if (!vorlage) throw new Error(`Unbekannte Branchenvorlage „${id}“.`);
  return vorlage;
}

/**
 * Legt die Posten der Vorlage an, ohne Beträge. „keine“ lässt den Plan unverändert.
 * Eine schon gespeicherte Vorlage wird nicht erneut geladen.
 */
export function wendeBranchenvorlage(plan: Finanzplan, id: BranchenvorlageId): Finanzplan {
  if (id === "keine" || plan.stammdaten.angewendeteVorlage) return plan;
  const vorlage = vorlageNachId(id);
  const umsatz: OffenerUmsatz[] = vorlage.umsatz.map((posten) => ({
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    ...(posten.material ? { material: posten.material } : {}),
  }));
  const stellen: OffeneStelle[] = vorlage.personal.map((posten) => ({
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    rolle: posten.rolle,
  }));
  const kosten: OffeneKosten[] = vorlage.kosten.map((posten) => ({
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    kategorie: posten.kategorie,
  }));
  const investitionen: OffeneInvestition[] = vorlage.investitionen.map((posten) => ({
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    kategorie: posten.kategorie,
  }));
  return {
    ...plan,
    stammdaten: {
      ...plan.stammdaten,
      branchenschluessel: vorlage.id,
      angewendeteVorlage: { id: vorlage.id, name: vorlage.name, version: vorlage.version },
    },
    assistent: {
      ...(plan.assistent ?? { station: "vorhaben", erledigt: [] }),
      offeneUmsaetze: umsatz,
      offeneStellen: stellen,
      offeneKosten: kosten,
      offeneInvestitionen: investitionen,
    },
  };
}

/** Startauswahl: Vorlage einmal anlegen und den Weg Assistent oder Tabelle merken. */
export function starteMitVorlage(
  plan: Finanzplan,
  weg: AssistentWeg,
  vorlage: BranchenvorlageId,
): Finanzplan {
  return waehleWeg(wendeBranchenvorlage(plan, vorlage), weg);
}
