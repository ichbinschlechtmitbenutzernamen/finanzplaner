import { EingabeFehler } from "../eingabe/hilfe.ts";
import { isIsoMonth } from "../months.ts";
import type {
  Finanzplan,
  IsoMonth,
  Kostenposition,
  OffenerUmsatz,
  Personalstelle,
  Umsatzposition,
} from "../types.ts";

export type OffenerBereich = "umsatz" | "personal" | "kosten";

/** Übernimmt einen Vorlagenposten in die Rechnung, sobald ein Betrag erfasst ist. */
export function fuelleOffenenPosten(
  plan: Finanzplan,
  bereich: OffenerBereich,
  id: string,
  wertCents: number,
  monat: IsoMonth,
): Finanzplan {
  if (!Number.isInteger(wertCents) || wertCents < 0) {
    throw new EingabeFehler("Der Betrag muss eine ganze, nicht negative Cent-Zahl sein.");
  }
  if (!isIsoMonth(monat)) throw new EingabeFehler("Der Monat fehlt.");
  if (bereich === "umsatz") return fuelleUmsatz(plan, id, wertCents);
  if (bereich === "personal") return fuelleStelle(plan, id, wertCents, monat);
  return fuelleKosten(plan, id, wertCents);
}

function steuersatz(plan: Finanzplan): number {
  return plan.parameter.steuer.umsatzsteuerRegelsatz;
}

function listeOhne<T extends { id: string }>(liste: readonly T[] | undefined, id: string): T[] {
  return (liste ?? []).filter((eintrag) => eintrag.id !== id);
}

function setzeUmsaetze(plan: Finanzplan, offeneUmsaetze: OffenerUmsatz[]): Finanzplan["assistent"] {
  const basis = { ...(plan.assistent ?? { station: "vorhaben" as const, erledigt: [] }) };
  if (offeneUmsaetze.length === 0) delete basis.offeneUmsaetze;
  else basis.offeneUmsaetze = offeneUmsaetze;
  return basis;
}

function fuelleUmsatz(plan: Finanzplan, id: string, wertCents: number): Finanzplan {
  const offen = plan.assistent?.offeneUmsaetze?.find(
    (eintrag) => eintrag.id === id && !eintrag.nurMaterial,
  );
  if (!offen) throw new EingabeFehler("Die Umsatzzeile wurde nicht gefunden.");
  const satz = steuersatz(plan);
  const position: Umsatzposition = {
    id: offen.id,
    bezeichnung: offen.bezeichnung,
    art: "monatsumsatz",
    monatsumsatz: { basisCents: wertCents },
    umsatzsteuerSatz: satz,
    zahlungszielTage: 0,
    wareneinsatz:
      offen.materialQuote == null
        ? { art: "keiner" }
        : {
            art: "prozent_vom_umsatz",
            quote: offen.materialQuote,
            umsatzsteuerSatz: offen.materialUmsatzsteuerSatz ?? satz,
          },
  };
  const rest = listeOhne(plan.assistent?.offeneUmsaetze, id);
  const offeneUmsaetze =
    offen.material && offen.materialQuote == null
      ? [
          ...rest,
          {
            id: offen.id,
            bezeichnung: offen.bezeichnung,
            material: offen.material,
            nurMaterial: true,
          },
        ]
      : rest;
  return {
    ...plan,
    umsatzplanung: [...plan.umsatzplanung, position],
    assistent: setzeUmsaetze(plan, offeneUmsaetze),
  };
}

function fuelleStelle(
  plan: Finanzplan,
  id: string,
  wertCents: number,
  monat: IsoMonth,
): Finanzplan {
  const offen = plan.assistent?.offeneStellen?.find((eintrag) => eintrag.id === id);
  if (!offen) throw new EingabeFehler("Die Stelle wurde nicht gefunden.");
  const stelle: Personalstelle = {
    id: offen.id,
    bezeichnung: offen.bezeichnung,
    ...(offen.name ? { name: offen.name } : {}),
    rolle: offen.rolle,
    brutto: { basisCents: wertCents },
    eintritt: monat,
    agNebenkostenSatz: offen.agNebenkostenSatz ?? 0,
    sozialversicherungspflichtig: true,
    ...(offen.wochenstunden != null ? { wochenstunden: offen.wochenstunden } : {}),
  };
  const rest = listeOhne(plan.assistent?.offeneStellen, id);
  const assistent = { ...(plan.assistent ?? { station: "vorhaben" as const, erledigt: [] }) };
  if (rest.length === 0) delete assistent.offeneStellen;
  else assistent.offeneStellen = rest;
  return { ...plan, personal: [...plan.personal, stelle], assistent };
}

function fuelleKosten(plan: Finanzplan, id: string, wertCents: number): Finanzplan {
  const offen = plan.assistent?.offeneKosten?.find((eintrag) => eintrag.id === id);
  if (!offen) throw new EingabeFehler("Der Kostenposten wurde nicht gefunden.");
  const position: Kostenposition = {
    id: offen.id,
    bezeichnung: offen.bezeichnung,
    kategorie: offen.kategorie,
    art: "fix",
    betrag: { basisCents: wertCents },
    umsatzsteuerSatz: offen.umsatzsteuerSatz ?? steuersatz(plan),
    zahlungszielTage: offen.zahlungszielTage ?? 0,
    betriebsausgabe: true,
  };
  const rest = listeOhne(plan.assistent?.offeneKosten, id);
  const assistent = { ...(plan.assistent ?? { station: "vorhaben" as const, erledigt: [] }) };
  if (rest.length === 0) delete assistent.offeneKosten;
  else assistent.offeneKosten = rest;
  return { ...plan, laufendeKosten: [...plan.laufendeKosten, position], assistent };
}
