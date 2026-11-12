import { describe, expect, it } from "vitest";
import { berechnePlan } from "../calc/berechnen.ts";
import { monatsbetragCents } from "../calc/monatswert.ts";
import { createDraftFinanzplan } from "../empty-plan.ts";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "../../fixtures/beispiel-einzelunternehmen.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import { migratePlan } from "../migrate.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import { finanzplanSchema } from "../schema.ts";
import { spieleDurchlauf } from "./durchlauf.ts";
import { durchlaufAus } from "./lesen.ts";
import { geheWeiter, naechsteStation, stationFaelltWeg } from "./stationen.ts";
import { jahreswerteVon, monateDesPlans, setzeUmsatz, setzeVorhaben } from "./schreiben.ts";

const FEST = new Date("2026-04-02T08:00:00.000Z");

describe("Assistent", () => {
  it("erzeugt aus den Blitzweg-Eingaben denselben Plan und dieselben Berichte", () => {
    const anfang = createDraftFinanzplan({ id: beispielElektro.id, now: FEST });
    const erzeugt = spieleDurchlauf(anfang, durchlaufAus(beispielElektro));
    const geprueft = finanzplanSchema.parse({
      ...erzeugt,
      geaendertAm: beispielElektro.geaendertAm,
      assistent: undefined,
    });
    expect(geprueft).toEqual(beispielElektro);
    expect(erstelleBerichte(geprueft, berechnePlan(geprueft))).toEqual(
      erstelleBerichte(beispielElektro, berechnePlan(beispielElektro)),
    );
  });

  it("verteilt Jahreswerte gleichmäßig auf die Monate des Planjahres", () => {
    const anfang = createDraftFinanzplan({ id: "plan-jahre", now: FEST });
    const mitStart = setzeVorhaben(anfang, {
      name: "Jahreswerte",
      gruendungsmonat: "2026-06",
      rechtsform: "einzelunternehmen",
      bundesland: "Thüringen",
      kleinunternehmer: false,
      gesellschafter: [{ id: "person-1", name: "Ada Grün", anteil: 1, rollen: ["inhaber"] }],
    });
    const plan = setzeUmsatz(mitStart, [
      {
        modus: "jahre",
        id: "rev-jahr",
        bezeichnung: "Projekte",
        umsatzsteuerSatz: 0.19,
        zahlungszielTage: 0,
        jahresCents: [1_000, 2_400, 3_600],
      },
    ]);
    const linie = plan.umsatzplanung[0];
    expect(linie?.art).toBe("monatsumsatz");
    if (!linie || linie.art !== "monatsumsatz") return;
    expect(jahreswerteVon(plan, linie.monatsumsatz)).toEqual([1_000, 2_400, 3_600]);
    const monate = monateDesPlans(plan);
    const start = plan.startMonat ?? "";
    expect(monatsbetragCents(linie.monatsumsatz, monate[0] ?? "", start)).toBe(83);
    expect(monatsbetragCents(linie.monatsumsatz, monate[10] ?? "", start)).toBe(83);
    expect(monatsbetragCents(linie.monatsumsatz, monate[11] ?? "", start)).toBe(87);
    expect(monatsbetragCents(linie.monatsumsatz, monate[12] ?? "", start)).toBe(200);
    expect(finanzplanSchema.parse(plan).umsatzplanung).toEqual(plan.umsatzplanung);
  });

  it("überspringt Persönliches bei GmbH und UG", () => {
    expect(naechsteStation("vorhaben", "gmbh")).toBe("umsatz");
    expect(naechsteStation("vorhaben", "ug")).toBe("umsatz");
    expect(naechsteStation("vorhaben", "einzelunternehmen")).toBe("persoenlich");
    expect(naechsteStation("vorhaben", "gbr")).toBe("persoenlich");
    expect(naechsteStation("vorhaben", "freiberufler")).toBe("persoenlich");
    expect(stationFaelltWeg("persoenlich", "gmbh")).toBe(true);
    expect(stationFaelltWeg("persoenlich", "ug")).toBe(true);
    expect(stationFaelltWeg("persoenlich", "ohg")).toBe(false);
    expect(stationFaelltWeg("umsatz", "gmbh")).toBe(false);

    const anfang = createDraftFinanzplan({ id: "plan-gmbh-assistent", now: FEST });
    const nachVorhaben = setzeVorhaben(anfang, {
      name: "Hafenlicht GmbH",
      gruendungsmonat: "2026-01",
      rechtsform: "gmbh",
      bundesland: "Nordrhein-Westfalen",
      kleinunternehmer: false,
      stammkapitalCents: 2_500_000,
      gesellschafter: [
        {
          id: "person-mira",
          name: "Mira Kolb",
          anteil: 1,
          rollen: ["gesellschafter", "geschaeftsfuehrer"],
        },
      ],
    });
    const weiter = geheWeiter(nachVorhaben);
    expect(weiter.assistent?.station).toBe("umsatz");
    expect(weiter.assistent?.erledigt).toEqual(["vorhaben"]);
    expect(weiter.stammdaten.personen[0]?.lebensbedarf).toBeUndefined();
  });

  it("hebt Version 7 an, ohne Beispiele oder Regeln zu verändern", () => {
    for (const plan of [beispielElektro, beispielCafe, beispielGmbh, beispielEinzelunternehmen]) {
      const roh = structuredClone(plan) as unknown as Record<string, unknown>;
      roh.schemaVersion = 7;
      delete roh.assistent;
      const migriert = migratePlan(roh);
      expect(migriert).toEqual(plan);
      expect(migriert.assistent).toBeUndefined();
      expect(migriert.schemaVersion).toBe(8);
    }
  });
});
