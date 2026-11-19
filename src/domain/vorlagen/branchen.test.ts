import { describe, expect, it } from "vitest";
import { leseKosten, lesePersonal, leseUmsatz, leseWareneinsatz } from "../assistent/lesen.ts";
import {
  setzeKosten,
  setzeInvestitionen,
  setzePersonal,
  setzeUmsatz,
  setzeWareneinsatz,
} from "../assistent/schreiben.ts";
import { waehleWeg } from "../assistent/stationen.ts";
import { berechnePlan } from "../calc/berechnen.ts";
import { standardSchwellen } from "../checks/schwellen.ts";
import { setzeEinmal } from "../eingabe/plan-aendern.ts";
import { createDraftFinanzplan, createEmptyFinanzplan } from "../empty-plan.ts";
import { exportPlanToJson, importPlanFromJson } from "../io.ts";
import { migratePlan } from "../migrate.ts";
import { finanzplanSchema } from "../schema.ts";
import { SCHEMA_VERSION } from "../types.ts";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { eingabeZeilen } from "../../ui/zeilen-eingabe.ts";
import { starteMitVorlage, wendeBranchenvorlage } from "./branchen.ts";

const FEST = new Date("2026-04-01T00:00:00.000Z");

const ERWARTET = {
  handwerk: {
    umsatz: ["Arbeitsleistung / Stundenlohn"],
    material: ["Material"],
    personal: ["Fachkraft"],
    kosten: ["Werkstattmiete", "Handwerkskammerbeitrag", "Betriebshaftpflicht"],
    investitionen: ["Fahrzeug", "Werkzeug"],
  },
  gastronomie: {
    umsatz: ["Speisen", "Getränke"],
    material: ["Wareneinsatz Küche", "Wareneinsatz Getränke"],
    personal: ["Service", "Küche"],
    kosten: ["Pacht", "Energie", "GEMA und Rundfunk", "Reinigung"],
    investitionen: ["Küchenausstattung"],
  },
  einzelhandel: {
    umsatz: ["Warenverkauf"],
    material: ["Wareneinsatz"],
    personal: ["Verkauf"],
    kosten: ["Ladenmiete", "Kartengebühren", "Werbung"],
    investitionen: ["Ladeneinrichtung", "Kassensystem"],
  },
} as const;

function entwurf(id: string) {
  return createDraftFinanzplan({ id, now: FEST });
}

function zahlenIn(wert: unknown): number[] {
  if (typeof wert === "number") return [wert];
  if (Array.isArray(wert)) return wert.flatMap(zahlenIn);
  if (wert && typeof wert === "object") return Object.values(wert).flatMap(zahlenIn);
  return [];
}

describe("Branchenvorlagen", () => {
  it("lässt ohne Vorlage den Plan unverändert", () => {
    const plan = entwurf("plan-ohne");
    expect(wendeBranchenvorlage(plan, "keine")).toBe(plan);
    expect(starteMitVorlage(plan, "assistent", "keine")).toEqual(waehleWeg(plan, "assistent"));
    expect(starteMitVorlage(plan, "tabelle", "keine")).toEqual(waehleWeg(plan, "tabelle"));
    const gestartet = starteMitVorlage(plan, "tabelle", "keine");
    expect(gestartet.umsatzplanung).toEqual([]);
    expect(gestartet.personal).toEqual([]);
    expect(gestartet.laufendeKosten).toEqual([]);
    expect(gestartet.kapitalbedarf.investitionen).toEqual([]);
    expect(gestartet.stammdaten.angewendeteVorlage).toBeUndefined();
    expect(gestartet.assistent?.offeneUmsaetze).toBeUndefined();
    expect(gestartet.pruefung.schwellen).toEqual(standardSchwellen());
  });

  it.each(Object.keys(ERWARTET) as (keyof typeof ERWARTET)[])(
    "legt %s nur mit leeren Beträgen an",
    (id) => {
      const plan = wendeBranchenvorlage(entwurf(`plan-${id}`), id);
      const erwartet = ERWARTET[id];
      expect(finanzplanSchema.parse(plan)).toEqual(plan);
      expect(importPlanFromJson(exportPlanToJson(plan))).toEqual(plan);
      expect(plan.schemaVersion).toBe(SCHEMA_VERSION);
      expect(plan.stammdaten.angewendeteVorlage).toEqual({
        id,
        name:
          id === "handwerk" ? "Handwerk" : id === "gastronomie" ? "Gastronomie" : "Einzelhandel",
        version: "1",
      });
      expect(plan.stammdaten.branchenschluessel).toBe(id);
      expect(plan.umsatzplanung).toEqual([]);
      expect(plan.personal).toEqual([]);
      expect(plan.laufendeKosten).toEqual([]);
      expect(plan.kapitalbedarf.investitionen).toEqual([]);
      expect(plan.assistent?.offeneUmsaetze?.map((posten) => posten.bezeichnung)).toEqual([
        ...erwartet.umsatz,
      ]);
      expect(
        plan.assistent?.offeneUmsaetze?.flatMap((posten) =>
          posten.material ? [posten.material] : [],
        ),
      ).toEqual([...erwartet.material]);
      expect(plan.assistent?.offeneStellen?.map((posten) => posten.bezeichnung)).toEqual([
        ...erwartet.personal,
      ]);
      expect(plan.assistent?.offeneStellen?.every((posten) => posten.rolle === "angestellt")).toBe(
        true,
      );
      expect(plan.assistent?.offeneKosten?.map((posten) => posten.bezeichnung)).toEqual([
        ...erwartet.kosten,
      ]);
      expect(plan.assistent?.offeneInvestitionen?.map((posten) => posten.bezeichnung)).toEqual([
        ...erwartet.investitionen,
      ]);
      expect(zahlenIn(plan.assistent?.offeneUmsaetze)).toEqual([]);
      expect(zahlenIn(plan.assistent?.offeneStellen)).toEqual([]);
      expect(zahlenIn(plan.assistent?.offeneKosten)).toEqual([]);
      expect(zahlenIn(plan.assistent?.offeneInvestitionen)).toEqual([]);
      expect(plan.pruefung.schwellen).toEqual(standardSchwellen());
      expect(leseUmsatz(plan).every((linie) => linie.modus === "monat" && linie.betragOffen)).toBe(
        true,
      );
      expect(leseWareneinsatz(plan).every((linie) => linie.quote == null)).toBe(true);
      expect(lesePersonal(plan).every((stelle) => stelle.betragOffen)).toBe(true);
      expect(leseKosten(plan).every((posten) => posten.art === "fix" && posten.betragOffen)).toBe(
        true,
      );

      const namen = eingabeZeilen(plan, [], []).map((zeile) => zeile.bezeichnung);
      expect(namen).toEqual([
        "Umsatz",
        ...erwartet.umsatz,
        "Wareneinsatz",
        ...erwartet.material,
        "Personal",
        ...erwartet.personal,
        "Laufende Kosten",
        ...erwartet.kosten,
        "Investitionen, Gründung und Anlauf",
        ...erwartet.investitionen,
      ]);
      expect(
        eingabeZeilen(plan, [], [])
          .filter((zeile) => !zeile.kopf)
          .every((zeile) => zeile.werte.every((wert) => wert == null)),
      ).toBe(true);
    },
  );

  it("rechnet eine Vorlage wie den leeren Plan und lädt sie nicht erneut", () => {
    const basis = createEmptyFinanzplan({ id: "plan-rechnung", now: FEST, startMonat: "2026-04" });
    const mit = wendeBranchenvorlage(structuredClone(basis), "gastronomie");
    expect(berechnePlan(mit)).toEqual(berechnePlan(basis));
    mit.assistent = {
      ...(mit.assistent ?? { station: "vorhaben", erledigt: [] }),
      offeneUmsaetze: [],
    };
    const nochmal = wendeBranchenvorlage(mit, "einzelhandel");
    expect(nochmal.assistent?.offeneUmsaetze).toEqual([]);
    expect(nochmal.stammdaten.angewendeteVorlage?.id).toBe("gastronomie");
    expect(nochmal.stammdaten.branchenschluessel).toBe("gastronomie");
  });

  it("übernimmt einen Betrag in eine normale Zeile und löscht offene Posten", () => {
    const plan = wendeBranchenvorlage(
      createEmptyFinanzplan({ id: "plan-fuellen", now: FEST, startMonat: "2026-04" }),
      "handwerk",
    );
    const umsatz = leseUmsatz(plan).map((linie) =>
      linie.id === "hw-arbeit" && linie.modus === "monat"
        ? { ...linie, betragOffen: false, basisCents: 12_500 }
        : linie,
    );
    const mitUmsatz = setzeUmsatz(plan, umsatz);
    const erste = mitUmsatz.umsatzplanung[0];
    expect(erste?.art).toBe("monatsumsatz");
    if (erste?.art === "monatsumsatz") {
      expect(erste.monatsumsatz).toEqual({ basisCents: 12_500 });
    }
    expect(erste?.wareneinsatz).toEqual({ art: "keiner" });
    expect(mitUmsatz.assistent?.offeneUmsaetze).toEqual([
      {
        id: "hw-arbeit",
        bezeichnung: "Arbeitsleistung / Stundenlohn",
        material: "Material",
        nurMaterial: true,
      },
    ]);
    const mitQuote = setzeWareneinsatz(
      mitUmsatz,
      leseWareneinsatz(mitUmsatz).map((linie) =>
        linie.id === "hw-arbeit" ? { ...linie, quote: 0.3 } : linie,
      ),
    );
    expect(mitQuote.umsatzplanung[0]?.wareneinsatz).toEqual({
      art: "prozent_vom_umsatz",
      quote: 0.3,
      umsatzsteuerSatz: plan.parameter.steuer.umsatzsteuerRegelsatz,
    });
    expect(mitQuote.assistent?.offeneUmsaetze).toBeUndefined();

    const stellen = lesePersonal(plan).map((stelle) =>
      stelle.id === "hw-fachkraft"
        ? { ...stelle, betragOffen: false, brutto: { basisCents: 3_200_00 }, eintritt: "2026-04" }
        : stelle,
    );
    const mitStelle = setzePersonal(plan, stellen);
    expect(mitStelle.personal[0]?.brutto).toEqual({ basisCents: 320_000 });
    expect(mitStelle.assistent?.offeneStellen).toBeUndefined();

    const kosten = setzeEinmal(
      plan,
      { art: "offener-posten", bereich: "kosten", id: "hw-miete", monat: "2026-04" },
      80_000,
    );
    expect(kosten.laufendeKosten.map((posten) => posten.bezeichnung)).toEqual(["Werkstattmiete"]);
    const miete = kosten.laufendeKosten[0];
    expect(miete?.art).toBe("fix");
    if (miete?.art === "fix") expect(miete.betrag).toEqual({ basisCents: 80_000 });
    expect(kosten.assistent?.offeneKosten?.some((posten) => posten.id === "hw-miete")).toBe(false);

    const geloescht = setzeKosten(
      plan,
      leseKosten(plan).filter((posten) => posten.id !== "hw-miete"),
    );
    expect(geloescht.assistent?.offeneKosten?.map((posten) => posten.id)).toEqual([
      "hw-kammer",
      "hw-haftpflicht",
    ]);
    const invest = setzeInvestitionen(plan, {
      ...{
        posten: [],
        gruendungskosten: [],
        anlaufkosten: [],
      },
    });
    expect(invest.kapitalbedarf.investitionen).toEqual([]);
    expect(invest.assistent?.offeneInvestitionen).toBeUndefined();
  });

  it("hebt Version 13 an, ohne eine Vorlage oder Beträge zu ergänzen", () => {
    const leer = createEmptyFinanzplan({ id: "plan-alt", now: FEST, startMonat: "2026-04" });
    const roh = structuredClone(leer) as unknown as Record<string, unknown>;
    roh.schemaVersion = 13;
    const migriert = migratePlan(roh);
    expect(migriert.schemaVersion).toBe(15);
    expect(migriert.stammdaten.angewendeteVorlage).toBeUndefined();
    expect(migriert.assistent?.offeneUmsaetze).toBeUndefined();
    expect(migriert.assistent?.offeneStellen).toBeUndefined();
    expect(migriert.assistent?.offeneKosten).toBeUndefined();
    expect(migriert.assistent?.offeneInvestitionen).toBeUndefined();
    expect(migriert.umsatzplanung).toEqual([]);
    expect(migriert.personal).toEqual([]);
    expect(migriert.laufendeKosten).toEqual([]);
    expect(migriert.kapitalbedarf.investitionen).toEqual([]);
    expect(migriert.pruefung.schwellen).toEqual(leer.pruefung.schwellen);

    const cafe = structuredClone(beispielCafe) as unknown as Record<string, unknown>;
    cafe.schemaVersion = 13;
    const cafeMigriert = migratePlan(cafe);
    expect(cafeMigriert.schemaVersion).toBe(15);
    expect(cafeMigriert.umsatzplanung).toEqual(beispielCafe.umsatzplanung);
    expect(cafeMigriert.personal).toEqual(beispielCafe.personal);
    expect(cafeMigriert.laufendeKosten).toEqual(beispielCafe.laufendeKosten);
    expect(cafeMigriert.kapitalbedarf.investitionen).toEqual(
      beispielCafe.kapitalbedarf.investitionen,
    );
    expect(cafeMigriert.stammdaten.branchenschluessel).toBe("cafe");
    expect(cafeMigriert.stammdaten.angewendeteVorlage).toBeUndefined();
    expect(cafeMigriert.assistent).toBeUndefined();
    expect(cafeMigriert.pruefung.schwellen).toEqual(beispielCafe.pruefung.schwellen);
  });
});
