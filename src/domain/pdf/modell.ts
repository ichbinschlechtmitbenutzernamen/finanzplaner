import { berechnePlan } from "../calc/berechnen.ts";
import { meldungenFuerExport, type ExportPruefmeldung } from "../checks/index.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import {
  kontostandVerlauf,
  kostenstruktur,
  kumuliertesErgebnis,
  mittelherkunftVerwendung,
  ueberblickKpis,
  umsatzGegenKosten,
  type ErgebnisPunkt,
  type KontostandVerlauf,
  type KostenstrukturPunkt,
  type MittelGruppe,
  type UeberblickKpis,
  type Vergleichspunkt,
} from "../reports/diagramme.ts";
import type { Berichte } from "../reports/typen.ts";
import { planFuerSzenario } from "../szenarien/anwenden.ts";
import { vergleichFuerExport, type ExportSzenarioVergleich } from "../szenarien/vergleich.ts";
import {
  BASIS_SZENARIO_ID,
  type Bundesland,
  type Finanzplan,
  type IsoMonth,
  type PdfKapitelId,
  type PersonRolle,
  type PlanSzenarioArt,
  type Rechtsform,
} from "../types.ts";
import {
  fehlerVermerkText,
  kapitelFuerRechtsform,
  normalisiereKapitel,
  pdfDateiname,
  vorhabenName,
} from "./kapitel.ts";

/**
 * Daten für den PDF-Export. Gerechnet wird hier nichts neu:
 * Berichte, Kennzahlen, Diagrammreihen, Meldungen und der Szenarienvergleich
 * kommen aus denselben Funktionen wie die Oberfläche.
 */

export interface PdfDeckblatt {
  firmenname: string;
  planName: string;
  rechtsform?: Rechtsform;
  personen: { name: string; rollen: PersonRolle[]; anteil: number }[];
  geaendertAm: string;
  beispiel: boolean;
  branche: string;
  taetigkeit: string;
  strasse?: string;
  plz?: string;
  ort: string;
  bundesland?: Bundesland;
  startMonat?: IsoMonth;
  letzterMonat?: IsoMonth;
}

/** Dieselben fünf Diagramme wie im Überblick, als Zahlenreihen. */
export interface PdfDiagramme {
  /** Umsatz gegen Kosten, je Planmonat. */
  umsatzGegenKosten: Vergleichspunkt[];
  /** Dieselbe Reihe je Planjahr, für die Jahresübersicht im Kapitel Umsatz. */
  umsatzGegenKostenPlanjahre: Vergleichspunkt[];
  kontostand: KontostandVerlauf;
  kumuliertesErgebnis: ErgebnisPunkt[];
  /** Kostenstruktur je Planjahr. */
  kostenstruktur: KostenstrukturPunkt[];
  /** Mittelherkunft und Mittelverwendung je Planjahr. */
  mittelherkunft: MittelGruppe[];
}

export interface PdfSzenarioAbschnitt {
  id: string;
  name: string;
  art: "basis" | PlanSzenarioArt;
  /** Kapitel dieses Szenarios, ohne den einmaligen Szenarienvergleich. */
  kapitel: PdfKapitelId[];
  fehlerAnzahl: number;
  /** Nur gesetzt, wenn dieses Szenario mindestens einen Fehler hat. */
  fehlerVermerk: string | null;
  /** Gesetzt, wenn die Rechnung selbst fehlschlägt. Dann gibt es keine Berichte. */
  fehlerText: string | null;
  deckblatt: PdfDeckblatt;
  berichte: Berichte | null;
  kpis: UeberblickKpis | null;
  diagramme: PdfDiagramme | null;
  meldungen: ExportPruefmeldung[];
}

export interface PdfDokument {
  vorhaben: string;
  dateiname: string;
  /** Zeitpunkt der PDF-Erstellung. Der Stand auf dem Deckblatt bleibt `geaendertAm` des Plans. */
  erstelltAm: string;
  /** Gespeicherte Auswahl, bevor die Rechtsform Kapitel ausblendet. */
  kapitelGespeichert: PdfKapitelId[];
  szenarien: PdfSzenarioAbschnitt[];
  /** Null, wenn der Szenarienvergleich abgewählt ist. */
  vergleich: ExportSzenarioVergleich[] | null;
}

const BASIS_NAME = "Basisplan";

/**
 * Baut das PDF für ein Szenario. Ohne Angabe oder bei unbekannter Id ist das der Basisplan.
 * Nur dieses Szenario bekommt die Kapitel. Die übrigen Fälle stehen im Szenarienvergleich.
 */
export function erstellePdfDokument(
  plan: Finanzplan,
  datum: Date,
  szenarioId: string = BASIS_SZENARIO_ID,
): PdfDokument {
  const vorhaben = vorhabenName(plan.stammdaten.firmenname, plan.stammdaten.planName);
  const gespeichert = normalisiereKapitel(plan.pdfExport.kapitel);
  const fall = fallFuer(plan, szenarioId);
  return {
    vorhaben,
    dateiname: pdfDateiname(vorhaben, datum),
    erstelltAm: datum.toISOString(),
    kapitelGespeichert: gespeichert,
    szenarien: [abschnitt(plan, fall)],
    vergleich: gespeichert.includes("vergleich") ? vergleichFuerExport(plan) : null,
  };
}

function fallFuer(
  plan: Finanzplan,
  szenarioId: string,
): { id: string; name: string; art: PdfSzenarioAbschnitt["art"] } {
  if (szenarioId === BASIS_SZENARIO_ID) {
    return { id: BASIS_SZENARIO_ID, name: BASIS_NAME, art: "basis" };
  }
  const eintrag = plan.planSzenarien.eintraege.find((kandidat) => kandidat.id === szenarioId);
  if (!eintrag) return { id: BASIS_SZENARIO_ID, name: BASIS_NAME, art: "basis" };
  return { id: eintrag.id, name: eintrag.name, art: eintrag.art };
}

function abschnitt(
  plan: Finanzplan,
  fall: { id: string; name: string; art: PdfSzenarioAbschnitt["art"] },
): PdfSzenarioAbschnitt {
  try {
    const effektiv = planFuerSzenario(plan, fall.id);
    const kapitel = kapitelFuerRechtsform(
      plan.pdfExport.kapitel,
      effektiv.stammdaten.rechtsform,
    ).filter((id) => id !== "vergleich");
    const ergebnis = berechnePlan(effektiv);
    const berichte = erstelleBerichte(effektiv, ergebnis);
    const meldungen = meldungenFuerExport(effektiv, berichte);
    const fehlerAnzahl = meldungen.filter((meldung) => meldung.stufe === "fehler").length;
    return {
      id: fall.id,
      name: fall.name,
      art: fall.art,
      kapitel,
      fehlerAnzahl,
      fehlerVermerk: fehlerVermerkText(fehlerAnzahl),
      fehlerText: null,
      deckblatt: deckblattAus(plan, effektiv, berichte.monate.at(-1)),
      berichte,
      kpis: ueberblickKpis(berichte),
      diagramme: diagrammeAus(berichte),
      meldungen,
    };
  } catch (fehler) {
    const effektiv = planSicher(plan, fall.id);
    const kapitel = kapitelFuerRechtsform(
      plan.pdfExport.kapitel,
      effektiv.stammdaten.rechtsform,
    ).filter((id) => id !== "vergleich" && (id === "deckblatt" || id === "pruefung"));
    return {
      id: fall.id,
      name: fall.name,
      art: fall.art,
      kapitel,
      fehlerAnzahl: 0,
      fehlerVermerk: null,
      fehlerText: fehler instanceof Error ? fehler.message : "Die Rechnung ist fehlgeschlagen.",
      deckblatt: deckblattAus(plan, effektiv, undefined),
      berichte: null,
      kpis: null,
      diagramme: null,
      meldungen: [],
    };
  }
}

function planSicher(plan: Finanzplan, id: string): Finanzplan {
  try {
    return planFuerSzenario(plan, id);
  } catch {
    return plan;
  }
}

function deckblattAus(
  plan: Finanzplan,
  effektiv: Finanzplan,
  letzterMonat: IsoMonth | undefined,
): PdfDeckblatt {
  const stamm = effektiv.stammdaten;
  return {
    firmenname: stamm.firmenname,
    planName: stamm.planName,
    rechtsform: stamm.rechtsform,
    personen: stamm.personen.map((person) => ({
      name: person.name,
      rollen: [...person.rollen],
      anteil: person.anteil,
    })),
    geaendertAm: plan.geaendertAm,
    beispiel: stamm.beispiel,
    branche: stamm.branche,
    taetigkeit: stamm.taetigkeitsbeschreibung,
    strasse: stamm.strasse,
    plz: stamm.plz,
    ort: stamm.ort,
    bundesland: stamm.bundesland,
    startMonat: effektiv.startMonat,
    letzterMonat,
  };
}

function diagrammeAus(berichte: Berichte): PdfDiagramme {
  return {
    umsatzGegenKosten: umsatzGegenKosten(berichte, "monate"),
    umsatzGegenKostenPlanjahre: umsatzGegenKosten(berichte, "planjahre"),
    kontostand: kontostandVerlauf(berichte, "monate"),
    kumuliertesErgebnis: kumuliertesErgebnis(berichte, "monate"),
    kostenstruktur: kostenstruktur(berichte, "planjahre"),
    mittelherkunft: mittelherkunftVerwendung(berichte, "planjahre"),
  };
}
