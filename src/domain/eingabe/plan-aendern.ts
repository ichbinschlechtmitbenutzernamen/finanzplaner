import type {
  Finanzplan,
  IsoMonth,
  MengenVorgabe,
  MonatFaktoren,
  MonatswertVorgabe,
  Wachstumsbezug,
} from "../types.ts";
import {
  EingabeFehler,
  einfuegenMenge,
  einfuegenMonatswert,
  fortschreibenMenge,
  fortschreibenMonatswert,
  saisonMenge,
  saisonMonatswert,
  setzeMenge,
  setzeMonatswert,
  wachstumMenge,
  wachstumMonatswert,
} from "./hilfe.ts";

export type LebensbedarfFeld =
  | "lebenshaltung"
  | "krankenversicherung"
  | "pflegeversicherung"
  | "altersvorsorge"
  | "sonstigeVersicherungen";

export type MonatswertZiel =
  | { art: "umsatz"; id: string }
  | { art: "preis"; id: string }
  | { art: "personal"; id: string }
  | { art: "kosten"; id: string }
  | { art: "leben"; personId: string; feld: LebensbedarfFeld };

export type MengenZiel = { art: "menge"; id: string };

export type EinmalZiel =
  | { art: "investition"; id: string }
  | { art: "gruendung"; id: string }
  | { art: "anlauf"; id: string }
  | { art: "eigenkapital"; id: string }
  | { art: "darlehen"; id: string; monat: IsoMonth }
  | { art: "zuschuss"; id: string; monat: IsoMonth }
  | {
      art: "betriebsmittel";
      feld: "betriebsmittelbedarfCents" | "liquiditaetsreserveCents" | "warenErstbestandNettoCents";
    };

export type SerieZiel = MonatswertZiel | MengenZiel;

export function leseMonatswert(plan: Finanzplan, ziel: MonatswertZiel): MonatswertVorgabe | null {
  return findeMonatswert(plan, ziel);
}

export function leseMenge(plan: Finanzplan, ziel: MengenZiel): MengenVorgabe | null {
  const position = plan.umsatzplanung.find((eintrag) => eintrag.id === ziel.id);
  return position?.art === "menge_mal_preis" ? position.mengeProMonat : null;
}

export function setzeSerieZelle(
  plan: Finanzplan,
  ziel: SerieZiel,
  monat: IsoMonth,
  wert: number | null,
): Finanzplan {
  if (ziel.art === "menge") {
    const aktuell = leseMenge(plan, ziel);
    if (!aktuell) throw new EingabeFehler("Die Mengen-Zeile wurde nicht gefunden.");
    return ersetzeMenge(plan, ziel.id, setzeMenge(aktuell, monat, wert));
  }
  const aktuell = findeMonatswert(plan, ziel);
  if (!aktuell) throw new EingabeFehler("Die Zeile wurde nicht gefunden.");
  return ersetzeMonatswert(plan, ziel, setzeMonatswert(aktuell, monat, wert));
}

export function fortschreibenSerie(
  plan: Finanzplan,
  ziel: SerieZiel,
  monate: readonly IsoMonth[],
  vonIndex: number,
  erlaubt: readonly boolean[],
): Finanzplan {
  const start = planStart(plan);
  if (ziel.art === "menge") {
    const aktuell = leseMenge(plan, ziel);
    if (!aktuell) throw new EingabeFehler("Die Mengen-Zeile wurde nicht gefunden.");
    return ersetzeMenge(
      plan,
      ziel.id,
      fortschreibenMenge(aktuell, start, monate, vonIndex, erlaubt),
    );
  }
  const aktuell = findeMonatswert(plan, ziel);
  if (!aktuell) throw new EingabeFehler("Die Zeile wurde nicht gefunden.");
  return ersetzeMonatswert(
    plan,
    ziel,
    fortschreibenMonatswert(aktuell, start, monate, vonIndex, erlaubt),
  );
}

export function wachstumSerie(
  plan: Finanzplan,
  ziel: SerieZiel,
  monate: readonly IsoMonth[],
  vonIndex: number,
  rate: number,
  bezug: Wachstumsbezug,
  erlaubt: readonly boolean[],
): Finanzplan {
  const start = planStart(plan);
  if (ziel.art === "menge") {
    const aktuell = leseMenge(plan, ziel);
    if (!aktuell) throw new EingabeFehler("Die Mengen-Zeile wurde nicht gefunden.");
    return ersetzeMenge(
      plan,
      ziel.id,
      wachstumMenge(aktuell, start, monate, vonIndex, rate, bezug, erlaubt),
    );
  }
  const aktuell = findeMonatswert(plan, ziel);
  if (!aktuell) throw new EingabeFehler("Die Zeile wurde nicht gefunden.");
  return ersetzeMonatswert(
    plan,
    ziel,
    wachstumMonatswert(aktuell, start, monate, vonIndex, rate, bezug, erlaubt),
  );
}

export function saisonSerie(
  plan: Finanzplan,
  ziel: SerieZiel,
  faktoren: MonatFaktoren,
): Finanzplan {
  if (ziel.art === "menge") {
    const aktuell = leseMenge(plan, ziel);
    if (!aktuell) throw new EingabeFehler("Die Mengen-Zeile wurde nicht gefunden.");
    return ersetzeMenge(plan, ziel.id, saisonMenge(aktuell, faktoren));
  }
  const aktuell = findeMonatswert(plan, ziel);
  if (!aktuell) throw new EingabeFehler("Die Zeile wurde nicht gefunden.");
  return ersetzeMonatswert(plan, ziel, saisonMonatswert(aktuell, faktoren));
}

export function einfuegenSerie(
  plan: Finanzplan,
  ziel: SerieZiel,
  monate: readonly IsoMonth[],
  vonIndex: number,
  werte: readonly (number | null)[],
  erlaubt: readonly boolean[],
): Finanzplan {
  if (ziel.art === "menge") {
    const aktuell = leseMenge(plan, ziel);
    if (!aktuell) throw new EingabeFehler("Die Mengen-Zeile wurde nicht gefunden.");
    return ersetzeMenge(plan, ziel.id, einfuegenMenge(aktuell, monate, vonIndex, werte, erlaubt));
  }
  const aktuell = findeMonatswert(plan, ziel);
  if (!aktuell) throw new EingabeFehler("Die Zeile wurde nicht gefunden.");
  return ersetzeMonatswert(
    plan,
    ziel,
    einfuegenMonatswert(aktuell, monate, vonIndex, werte, erlaubt),
  );
}

export function setzeEinmal(plan: Finanzplan, ziel: EinmalZiel, wertCents: number): Finanzplan {
  if (!Number.isInteger(wertCents) || wertCents < 0) {
    throw new EingabeFehler("Der Betrag muss eine ganze, nicht negative Cent-Zahl sein.");
  }
  const naechster = structuredClone(plan);
  switch (ziel.art) {
    case "investition": {
      const posten = naechster.kapitalbedarf.investitionen.find(
        (eintrag) => eintrag.id === ziel.id,
      );
      if (!posten) throw new EingabeFehler("Die Investition wurde nicht gefunden.");
      posten.nettoCents = wertCents;
      return naechster;
    }
    case "gruendung":
    case "anlauf": {
      const liste =
        ziel.art === "gruendung"
          ? naechster.kapitalbedarf.gruendungskosten
          : naechster.kapitalbedarf.anlaufkosten;
      const posten = liste.find((eintrag) => eintrag.id === ziel.id);
      if (!posten) throw new EingabeFehler("Der Kostenposten wurde nicht gefunden.");
      posten.nettoCents = wertCents;
      return naechster;
    }
    case "eigenkapital": {
      const posten = naechster.finanzierung.eigenkapital.find((eintrag) => eintrag.id === ziel.id);
      if (!posten) throw new EingabeFehler("Der Eigenkapitalposten wurde nicht gefunden.");
      posten.betragCents = wertCents;
      return naechster;
    }
    case "darlehen": {
      const darlehen = naechster.finanzierung.darlehen.find((eintrag) => eintrag.id === ziel.id);
      if (!darlehen) throw new EingabeFehler("Das Darlehen wurde nicht gefunden.");
      const auszahlung = darlehen.auszahlungen.find((eintrag) => eintrag.monat === ziel.monat);
      if (!auszahlung) throw new EingabeFehler("In diesem Monat gibt es keine Auszahlung.");
      auszahlung.betragCents = wertCents;
      darlehen.betragCents = darlehen.auszahlungen.reduce(
        (summe, eintrag) => summe + eintrag.betragCents,
        0,
      );
      return naechster;
    }
    case "zuschuss": {
      const zuschuss = naechster.finanzierung.zuschuesse.find((eintrag) => eintrag.id === ziel.id);
      if (!zuschuss || zuschuss.auszahlung.art !== "frei") {
        throw new EingabeFehler("Der Zuschuss hat keine frei erfassbaren Monate.");
      }
      const position = zuschuss.auszahlung.positionen.find(
        (eintrag) => eintrag.monat === ziel.monat,
      );
      if (!position) throw new EingabeFehler("In diesem Monat gibt es keine Zuschusszahlung.");
      position.betragCents = wertCents;
      return naechster;
    }
    case "betriebsmittel":
      naechster.kapitalbedarf.betriebsmittel[ziel.feld] = wertCents;
      return naechster;
    default: {
      const unerreichbar: never = ziel;
      return unerreichbar;
    }
  }
}

function planStart(plan: Finanzplan): IsoMonth {
  if (!plan.startMonat)
    throw new EingabeFehler("Ohne Startmonat lässt sich die Zeile nicht rechnen.");
  return plan.startMonat;
}

function findeMonatswert(plan: Finanzplan, ziel: MonatswertZiel): MonatswertVorgabe | null {
  switch (ziel.art) {
    case "umsatz": {
      const position = plan.umsatzplanung.find((eintrag) => eintrag.id === ziel.id);
      return position?.art === "monatsumsatz" ? position.monatsumsatz : null;
    }
    case "preis": {
      const position = plan.umsatzplanung.find((eintrag) => eintrag.id === ziel.id);
      return position?.art === "menge_mal_preis" ? position.preisNetto : null;
    }
    case "personal":
      return plan.personal.find((stelle) => stelle.id === ziel.id)?.brutto ?? null;
    case "kosten": {
      const position = plan.laufendeKosten.find((eintrag) => eintrag.id === ziel.id);
      return position?.art === "fix" ? position.betrag : null;
    }
    case "leben": {
      const person = plan.stammdaten.personen.find((eintrag) => eintrag.id === ziel.personId);
      return person?.lebensbedarf?.[ziel.feld] ?? null;
    }
    default: {
      const unerreichbar: never = ziel;
      return unerreichbar;
    }
  }
}

function ersetzeMonatswert(
  plan: Finanzplan,
  ziel: MonatswertZiel,
  vorgabe: MonatswertVorgabe,
): Finanzplan {
  const naechster = structuredClone(plan);
  const zielVorgabe = findeMonatswert(naechster, ziel);
  if (!zielVorgabe) throw new EingabeFehler("Die Zeile wurde nicht gefunden.");
  Object.assign(zielVorgabe, vorgabe);
  for (const schluessel of ["bezugsmonat", "wachstum", "saison", "monatsOverride"] as const) {
    if (vorgabe[schluessel] === undefined) delete zielVorgabe[schluessel];
  }
  return naechster;
}

function ersetzeMenge(plan: Finanzplan, id: string, vorgabe: MengenVorgabe): Finanzplan {
  const naechster = structuredClone(plan);
  const position = naechster.umsatzplanung.find((eintrag) => eintrag.id === id);
  if (!position || position.art !== "menge_mal_preis") {
    throw new EingabeFehler("Die Mengen-Zeile wurde nicht gefunden.");
  }
  position.mengeProMonat = vorgabe;
  return naechster;
}
