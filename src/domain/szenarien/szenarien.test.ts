import { describe, expect, it } from "vitest";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "../../fixtures/beispiel-einzelunternehmen.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import { berechnePlan } from "../calc/berechnen.ts";
import { createEmptyFinanzplan } from "../empty-plan.ts";
import { exportPlanToJson, importPlanFromJson } from "../io.ts";
import { migratePlan } from "../migrate.ts";
import { addMonths } from "../months.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import type { Finanzplan, SzenarioHebel } from "../types.ts";
import {
  legeAbweichungAn,
  legeKopieAn,
  neutralerHebel,
  planFuerRechnung,
  planFuerSzenario,
  schreibeKopie,
  setzeAktivesSzenario,
  setzeHebel,
  standardPlanSzenarien,
  vergleichFuerExport,
  wendeHebelAn,
} from "./index.ts";

const START = "2026-01";

function grundplan(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-szenario",
    now: new Date("2026-01-15T00:00:00.000Z"),
    startMonat: START,
  });
  plan.umsatzsteuer = {
    regime: "regelbesteuerung",
    vorsteuerabzugsberechtigt: true,
    versteuerungsart: "soll",
    voranmeldungszeitraum: "monatlich",
    dauerfristverlaengerung: false,
  };
  return plan;
}

function mitUmsatz(plan: Finanzplan, basisCents = 100_000, quote?: number): void {
  plan.umsatzplanung.push({
    id: "rev-test",
    bezeichnung: "Leistung",
    art: "monatsumsatz",
    monatsumsatz: { basisCents },
    umsatzsteuerSatz: 0,
    zahlungszielTage: 0,
    wareneinsatz:
      quote === undefined
        ? { art: "keiner" }
        : { art: "prozent_vom_umsatz", quote, umsatzsteuerSatz: 0 },
  });
}

function hebel(teil: Partial<SzenarioHebel>): SzenarioHebel {
  return { ...neutralerHebel(), ...teil };
}

function berichteVon(plan: Finanzplan) {
  return erstelleBerichte(plan, berechnePlan(plan));
}

describe("Abweichungs-Szenario", () => {
  it("ergibt ohne Abweichung exakt die Berichte des Basisplans", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000, 0.22);
    basis.personal.push({
      id: "stelle",
      bezeichnung: "Geselle",
      rolle: "angestellt",
      brutto: { basisCents: 320_000 },
      eintritt: START,
      agNebenkostenSatz: 0.22,
      sozialversicherungspflichtig: true,
      sonderzahlungen: [{ monat: START, bruttoCents: 50_000 }],
    });
    basis.laufendeKosten.push({
      id: "miete",
      bezeichnung: "Miete",
      kategorie: "miete",
      art: "fix",
      betrag: { basisCents: 10_000 },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    });
    const mit = setzeAktivesSzenario(
      legeAbweichungAn(basis, "sz-neutral", "Unverändert", neutralerHebel()),
      "sz-neutral",
    );
    const effektiv = planFuerRechnung(mit);
    expect(effektiv).not.toBe(mit);
    expect(mit.umsatzplanung).toEqual(basis.umsatzplanung);
    expect(berichteVon(effektiv)).toEqual(berichteVon(basis));
  });

  it("lässt den Basisplan beim Anwenden der Hebel unverändert", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000, 0.2);
    const vorher = structuredClone(basis);
    wendeHebelAn(
      basis,
      hebel({
        umsatzFaktor: 0.8,
        umsatzstartMonate: 3,
        wareneinsatzPunkte: -0.05,
        personalFaktor: 1.1,
        kostenFaktor: 1.25,
      }),
    );
    expect(basis).toEqual(vorher);
  });

  it("skaliert den Umsatz aller Zeilen und lässt Kosten und Personal stehen", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000);
    basis.umsatzplanung.push({
      id: "rev-stueck",
      bezeichnung: "Stück",
      art: "menge_mal_preis",
      mengeProMonat: { basis: 2 },
      preisNetto: { basisCents: 100_000 },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    });
    basis.laufendeKosten.push({
      id: "miete",
      bezeichnung: "Miete",
      kategorie: "miete",
      art: "fix",
      betrag: { basisCents: 10_000 },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    });
    const effekt = wendeHebelAn(basis, hebel({ umsatzFaktor: 1.2 }));
    const ergebnis = berechnePlan(effekt);
    // 1.000 Euro × 1,2 und 2 Stück × 1,2 × 1.000 Euro.
    expect(ergebnis.umsatz.linien[0]?.nettoCents[0]).toBe(120_000);
    expect(ergebnis.umsatz.linien[1]?.nettoCents[0]).toBe(240_000);
    expect(ergebnis.kosten.summeAufwandCents[0]).toBe(10_000);
    expect(ergebnis.personal.summeAufwandCents[0]).toBe(0);
  });

  it("verschiebt den Umsatzstart und schneidet nach Monat 36 ab", () => {
    const basis = grundplan();
    const monate = Array.from({ length: 36 }, (_, index) => addMonths(START, index));
    basis.umsatzplanung.push({
      id: "rev-reihe",
      bezeichnung: "Reihe",
      art: "monatsumsatz",
      monatsumsatz: {
        basisCents: 0,
        monatsOverride: monate.map((monat, index) => ({
          monat,
          wertCents: (index + 1) * 1_000,
        })),
      },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      wareneinsatz: { art: "prozent_vom_umsatz", quote: 0.2, umsatzsteuerSatz: 0 },
    });
    basis.laufendeKosten.push({
      id: "miete",
      bezeichnung: "Miete",
      kategorie: "miete",
      art: "fix",
      betrag: { basisCents: 50_000 },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    });
    basis.finanzierung.eigenkapital.push({
      id: "ek-bar",
      bezeichnung: "Einlage",
      betragCents: 100_000,
      monat: START,
      art: "bareinlage",
    });
    const effekt = wendeHebelAn(basis, hebel({ umsatzstartMonate: 3 }));
    const ergebnis = berechnePlan(effekt);
    const basisErgebnis = berechnePlan(basis);
    const netto = ergebnis.umsatz.summeNettoCents;
    const ware = ergebnis.umsatz.linien[0]?.wareneinsatzNettoCents ?? [];
    expect(netto[0]).toBe(0);
    expect(netto[1]).toBe(0);
    expect(netto[2]).toBe(0);
    // Alter Monat 1 (1.000) liegt jetzt im Monat 4. Die letzten drei Ursprungswerte entfallen.
    expect(netto[3]).toBe(1_000);
    expect(netto[35]).toBe(33_000);
    expect(ware[3]).toBe(200);
    expect(ware[0]).toBe(0);
    expect(ergebnis.kosten.summeAufwandCents[0]).toBe(50_000);
    expect(ergebnis.kosten.summeAufwandCents[3]).toBe(50_000);
    expect(ergebnis.finanzierung).toEqual(basisErgebnis.finanzierung);
    expect(basisErgebnis.umsatz.summeNettoCents[35]).toBe(36_000);
  });

  it("addiert Prozentpunkte auf die Wareneinsatzquote und lässt Zeilen ohne Quote stehen", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000, 0.22);
    basis.umsatzplanung.push({
      id: "rev-ohne",
      bezeichnung: "Ohne Ware",
      art: "monatsumsatz",
      monatsumsatz: { basisCents: 50_000 },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    });
    const effekt = wendeHebelAn(basis, hebel({ wareneinsatzPunkte: -0.02 }));
    const ergebnis = berechnePlan(effekt);
    // 22 % − 2 Prozentpunkte = 20 % von 1.000 Euro.
    expect(ergebnis.umsatz.linien[0]?.wareneinsatzNettoCents[0]).toBe(20_000);
    expect(ergebnis.umsatz.linien[1]?.wareneinsatzNettoCents[0]).toBe(0);
    expect(ergebnis.umsatz.summeNettoCents[0]).toBe(150_000);
  });

  it("skaliert Brutto, Sonderzahlung und den Arbeitgeberanteil", () => {
    const basis = grundplan();
    basis.personal.push({
      id: "stelle",
      bezeichnung: "Geselle",
      rolle: "angestellt",
      brutto: { basisCents: 320_000 },
      eintritt: START,
      agNebenkostenSatz: 0.22,
      sozialversicherungspflichtig: true,
      sonderzahlungen: [{ monat: START, bruttoCents: 50_000 }],
    });
    const ergebnis = berechnePlan(wendeHebelAn(basis, hebel({ personalFaktor: 1.1 })));
    expect(ergebnis.personal.stellen[0]?.bruttoCents[0]).toBe(352_000);
    expect(ergebnis.personal.stellen[0]?.sonderzahlungCents[0]).toBe(55_000);
    expect(ergebnis.personal.stellen[0]?.nebenkostenCents[0]).toBe(89_540);
    expect(ergebnis.personal.summeAufwandCents[0]).toBe(352_000 + 55_000 + 89_540);
  });

  it("skaliert fixe und umsatzabhängige laufende Kosten", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000);
    basis.laufendeKosten.push(
      {
        id: "miete",
        bezeichnung: "Miete",
        kategorie: "miete",
        art: "fix",
        betrag: { basisCents: 10_000 },
        umsatzsteuerSatz: 0,
        zahlungszielTage: 0,
        betriebsausgabe: true,
      },
      {
        id: "gebuehr",
        bezeichnung: "Gebühr",
        kategorie: "sonstiges",
        art: "umsatzabhaengig",
        umsatzquote: 0.1,
        umsatzsteuerSatz: 0,
        zahlungszielTage: 0,
        betriebsausgabe: true,
      },
    );
    const ergebnis = berechnePlan(wendeHebelAn(basis, hebel({ kostenFaktor: 1.1 })));
    expect(ergebnis.kosten.positionen[0]?.aufwandCents[0]).toBe(11_000);
    // 10 % × 1,1 = 11 % von 1.000 Euro.
    expect(ergebnis.kosten.positionen[1]?.aufwandCents[0]).toBe(11_000);
    expect(ergebnis.umsatz.summeNettoCents[0]).toBe(100_000);
  });

  it("verbindet Umsatzminus und späteren Start wie im Szenario Vorsichtig", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000);
    const vorsichtig = standardPlanSzenarien().eintraege[0];
    if (vorsichtig?.art !== "abweichung") throw new Error("Vorsichtig fehlt");
    const netto = berechnePlan(wendeHebelAn(basis, vorsichtig.hebel)).umsatz.summeNettoCents;
    expect(netto[0]).toBe(0);
    expect(netto[2]).toBe(0);
    expect(netto[3]).toBe(80_000);
    expect(netto[35]).toBe(80_000);
  });
});

describe("Kopie-Szenario", () => {
  it("bleibt stehen, wenn der Basisplan sich danach ändert", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000);
    const mitKopie = setzeAktivesSzenario(legeKopieAn(basis, "sz-kopie", "Alternativ"), "sz-kopie");
    const geaendert: Finanzplan = {
      ...mitKopie,
      umsatzplanung: mitKopie.umsatzplanung.map((linie) =>
        linie.art === "monatsumsatz"
          ? { ...linie, monatsumsatz: { ...linie.monatsumsatz, basisCents: 40_000 } }
          : linie,
      ),
    };
    expect(berechnePlan(planFuerSzenario(geaendert, "basis")).umsatz.summeNettoCents[0]).toBe(
      40_000,
    );
    expect(berechnePlan(planFuerSzenario(geaendert, "sz-kopie")).umsatz.summeNettoCents[0]).toBe(
      100_000,
    );
  });

  it("schreibt Änderungen an der Kopie nicht in den Basisplan", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000);
    const mitKopie = setzeAktivesSzenario(legeKopieAn(basis, "sz-kopie", "Alternativ"), "sz-kopie");
    const ansicht = planFuerRechnung(mitKopie);
    const bearbeitet: Finanzplan = {
      ...ansicht,
      umsatzplanung: ansicht.umsatzplanung.map((linie) =>
        linie.art === "monatsumsatz"
          ? { ...linie, monatsumsatz: { ...linie.monatsumsatz, basisCents: 70_000 } }
          : linie,
      ),
    };
    const gespeichert = schreibeKopie(mitKopie, bearbeitet);
    expect(gespeichert.umsatzplanung[0]).toMatchObject({
      art: "monatsumsatz",
      monatsumsatz: { basisCents: 100_000 },
    });
    expect(berechnePlan(planFuerSzenario(gespeichert, "basis")).umsatz.summeNettoCents[0]).toBe(
      100_000,
    );
    expect(berechnePlan(planFuerRechnung(gespeichert)).umsatz.summeNettoCents[0]).toBe(70_000);
  });
});

describe("Migration und Vergleich", () => {
  it("legt beim Schritt von Version 10 die Standard-Szenarien an", () => {
    const roh = structuredClone(beispielElektro) as unknown as Record<string, unknown>;
    roh.schemaVersion = 10;
    delete roh.planSzenarien;
    const migriert = migratePlan(roh);
    expect(migriert.schemaVersion).toBe(12);
    expect(migriert).toEqual(beispielElektro);
    expect(migriert.planSzenarien.aktivId).toBe("basis");
    expect(migriert.planSzenarien.eintraege.map((eintrag) => eintrag.name)).toEqual([
      "Vorsichtig",
      "Optimistisch",
    ]);
  });

  it("holt eine gelöschte Liste nicht zurück, wenn das Feld schon da ist", () => {
    const roh = structuredClone(beispielCafe) as unknown as Record<string, unknown>;
    roh.schemaVersion = 10;
    (roh.planSzenarien as { eintraege: unknown[] }).eintraege = [];
    const migriert = migratePlan(roh);
    expect(migriert.schemaVersion).toBe(12);
    expect(migriert.planSzenarien.eintraege).toEqual([]);
  });

  it("führt Szenarien durch Export und Import", () => {
    let plan = grundplan();
    mitUmsatz(plan, 80_000, 0.3);
    plan = setzeHebel(
      plan,
      "szenario-optimistisch",
      hebel({ umsatzFaktor: 1.5, personalFaktor: 0.9 }),
    );
    plan = setzeAktivesSzenario(legeKopieAn(plan, "sz-kopie", "Nebenplan"), "sz-kopie");
    const geladen = importPlanFromJson(exportPlanToJson(plan));
    expect(geladen).toEqual(plan);
    expect(geladen.planSzenarien.aktivId).toBe("sz-kopie");
  });

  it("liefert den Vergleich für den späteren Export", () => {
    const basis = grundplan();
    mitUmsatz(basis, 100_000);
    const spalten = vergleichFuerExport(basis);
    expect(spalten.map((spalte) => spalte.name)).toEqual([
      "Basisplan",
      "Vorsichtig",
      "Optimistisch",
    ]);
    const basisSpalte = spalten[0];
    const vorsichtig = spalten[1];
    const optimistisch = spalten[2];
    expect(basisSpalte?.umsatzPlanjahreCents[0]).toBe(1_200_000);
    expect(vorsichtig?.umsatzPlanjahreCents[0]).toBeLessThan(
      basisSpalte?.umsatzPlanjahreCents[0] ?? 0,
    );
    expect(optimistisch?.umsatzPlanjahreCents[0]).toBe(1_440_000);
    expect(optimistisch?.kontostandCents).toHaveLength(36);
    expect(vorsichtig?.fehlerText).toBeNull();
    expect(basisSpalte?.tragfaehigkeitAnwendbar).toBe(true);
  });

  it("legt die Standard-Szenarien in neuen Plänen und Beispielen an", () => {
    const neu = createEmptyFinanzplan({ startMonat: START });
    expect(neu.planSzenarien.eintraege.map((eintrag) => eintrag.name)).toEqual([
      "Vorsichtig",
      "Optimistisch",
    ]);
    for (const plan of [beispielElektro, beispielCafe, beispielGmbh, beispielEinzelunternehmen]) {
      expect(plan.planSzenarien.eintraege.map((eintrag) => eintrag.art)).toEqual([
        "abweichung",
        "abweichung",
      ]);
      expect(plan.schemaVersion).toBe(12);
    }
  });
});
