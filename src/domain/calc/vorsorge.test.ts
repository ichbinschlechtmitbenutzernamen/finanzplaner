import { describe, expect, it } from "vitest";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { lebensbedarfMit, postenMonatCents, standardLebensbedarf } from "../privat.ts";
import { migratePlan } from "../migrate.ts";
import { berechnePlan } from "./berechnen.ts";
import { roundRate } from "./round.ts";
import type { Finanzplan } from "../types.ts";

const MIN = 131_833;
const MAX = 581_250;
const BEZUG = 395_500;

function planMit(bedarf: Finanzplan["stammdaten"]["personen"][number]["lebensbedarf"]): Finanzplan {
  const plan = structuredClone(beispielElektro) as Finanzplan;
  const person = plan.stammdaten.personen[0];
  if (!person) throw new Error("Person fehlt");
  person.lebensbedarf = bedarf;
  plan.umsatzplanung = [];
  plan.laufendeKosten = [];
  plan.personal = [];
  return plan;
}

describe("private Kostenblöcke", () => {
  it("wendet die Faktoren von Planjahr 2 und 3 auf die Monatsbeträge an", () => {
    const bedarf = lebensbedarfMit(
      "person-test",
      { miete: 100_000 },
      {},
      { wohnen: { jahr2: 1.1, jahr3: 1.25 } },
    );
    const block = bedarf.bloecke[0];
    const posten = block?.posten[0];
    if (!block || !posten) throw new Error("Block fehlt");
    expect(postenMonatCents(posten, block, "2026-06", "2026-06", 0)).toBe(100_000);
    expect(postenMonatCents(posten, block, "2027-06", "2026-06", 12)).toBe(110_000);
    expect(postenMonatCents(posten, block, "2028-06", "2026-06", 24)).toBe(125_000);
  });

  it("erlaubt eigene Posten und eigene Blöcke", () => {
    const bedarf = standardLebensbedarf("person-test");
    bedarf.bloecke[0]?.posten.push({
      id: "person-test-garten",
      bezeichnung: "Garten",
      schluessel: "eigen",
      betrag: { basisCents: 4_000 },
    });
    bedarf.bloecke.push({
      id: "person-test-hobby",
      bezeichnung: "Musik",
      schluessel: "eigen",
      faktorJahr2: 1,
      faktorJahr3: 2,
      posten: [
        {
          id: "person-test-unterricht",
          bezeichnung: "Unterricht",
          schluessel: "eigen",
          betrag: { basisCents: 5_000 },
        },
      ],
    });
    const plan = planMit(bedarf);
    const ergebnis = berechnePlan(plan);
    expect(ergebnis.entnahmen.entnahmeCents[0]).toBeGreaterThan(0);
    expect(ergebnis.entnahmen.entnahmeCents[24]).toBe(
      (ergebnis.entnahmen.entnahmeCents[0] ?? 0) + 5_000,
    );
  });
});

describe("Block 6 Sozialversicherung", () => {
  it("setzt die Mindestbemessung an, wenn der Gewinn darunter liegt", () => {
    const plan = planMit(
      lebensbedarfMit(
        "person-jonas-heller",
        {},
        {
          krankenversicherung: "gesetzlich",
          krankengeldanspruch: true,
          kinder: false,
          rentenversicherung: "nein",
          arbeitslosenversicherung: false,
        },
      ),
    );
    const ergebnis = berechnePlan(plan);
    const person = ergebnis.vorsorge.personen[0];
    expect(person?.mindestbeitrag).toBe(true);
    expect(person?.kvCents[0]).toBe(roundRate(MIN, 0.175));
    expect(person?.pvCents[0]).toBe(roundRate(MIN, 0.042));
    expect(person?.herleitung.some((zeile) => zeile.includes("Mindestbeitrag"))).toBe(true);
  });

  it("begrenzt die Bemessung auf die Beitragsbemessungsgrenze", () => {
    const plan = planMit(
      lebensbedarfMit(
        "person-jonas-heller",
        {},
        {
          krankenversicherung: "gesetzlich",
          krankengeldanspruch: false,
          kinder: true,
          rentenversicherung: "pflicht",
          arbeitslosenversicherung: false,
        },
      ),
    );
    plan.umsatzplanung = [
      {
        id: "umsatz-hoch",
        bezeichnung: "Hoch",
        art: "monatsumsatz",
        monatsumsatz: { basisCents: 2_000_000 },
        umsatzsteuerSatz: 0.19,
        zahlungszielTage: 0,
        wareneinsatz: { art: "keiner" },
      },
    ];
    const ergebnis = berechnePlan(plan);
    const person = ergebnis.vorsorge.personen[0];
    expect(person?.mindestbeitrag).toBe(false);
    expect(person?.kvCents[0]).toBe(roundRate(MAX, 0.169));
    expect(person?.pvCents[0]).toBe(roundRate(MAX, 0.036));
    expect(person?.rvCents[0]).toBe(roundRate(845_000, 0.186));
  });

  it("übernimmt den privaten Monatsbeitrag und den Regelbeitrag", () => {
    const plan = planMit(
      lebensbedarfMit(
        "person-jonas-heller",
        {},
        {
          krankenversicherung: "privat",
          privatbeitragCents: 48_000,
          krankengeldanspruch: true,
          kinder: false,
          rentenversicherung: "freiwillig",
          arbeitslosenversicherung: true,
        },
      ),
    );
    const ergebnis = berechnePlan(plan);
    const person = ergebnis.vorsorge.personen[0];
    expect(person?.kvCents[0]).toBe(48_000);
    expect(person?.pvCents[0]).toBe(0);
    expect(person?.mindestbeitrag).toBe(false);
    expect(person?.rvCents[0]).toBe(roundRate(BEZUG, 0.186));
    expect(person?.avCents[0]).toBe(roundRate(Math.round(BEZUG / 2), 0.026));
    const spaet = person?.avCents.find((_, index) => ergebnis.monate[index]?.startsWith("2028-"));
    expect(spaet).toBe(roundRate(BEZUG, 0.026));
  });

  it("zieht die Vorsorge im bestehenden Steuerkern ab", () => {
    const ohne = planMit(
      lebensbedarfMit(
        "person-jonas-heller",
        { alltag: 10_000 },
        {
          krankenversicherung: "privat",
          privatbeitragCents: 0,
          rentenversicherung: "nein",
          arbeitslosenversicherung: false,
        },
      ),
    );
    ohne.umsatzplanung = [
      {
        id: "umsatz-mittel",
        bezeichnung: "Mittel",
        art: "monatsumsatz",
        monatsumsatz: { basisCents: 500_000 },
        umsatzsteuerSatz: 0.19,
        zahlungszielTage: 0,
        wareneinsatz: { art: "keiner" },
      },
    ];
    const mit = structuredClone(ohne);
    const person = mit.stammdaten.personen[0];
    if (!person?.lebensbedarf) throw new Error("Bedarf fehlt");
    person.lebensbedarf.sozialversicherung = {
      ...person.lebensbedarf.sozialversicherung,
      krankenversicherung: "privat",
      privatbeitragCents: 80_000,
      rentenversicherung: "freiwillig",
    };
    const steuerOhne = berechnePlan(ohne).steuern.jahre[0]?.einkommensteuerCents ?? 0;
    const steuerMit = berechnePlan(mit).steuern.jahre[0]?.einkommensteuerCents ?? 0;
    expect(steuerMit).toBeLessThan(steuerOhne);
    expect(berechnePlan(mit).steuern.jahre[0]?.personen[0]?.vorsorgeAbzugCents).toBeGreaterThan(0);
  });
});

describe("Migration der Lebenshaltung", () => {
  it("übernimmt die alte Pauschale in den Alltagsposten und verwirft die alten Krankenbeiträge", () => {
    const alt = structuredClone(beispielElektro) as Record<string, unknown>;
    alt.schemaVersion = 13;
    const person = ((alt.stammdaten as { personen: Record<string, unknown>[] }).personen[0] ??
      {}) as Record<string, unknown>;
    person.lebensbedarf = {
      lebenshaltung: { basisCents: 160_000, wachstum: { jahresrate: 0.02, modus: "yearly_step" } },
      krankenversicherung: { basisCents: 45_000 },
      pflegeversicherung: { basisCents: 9_000 },
      altersvorsorge: { basisCents: 20_000 },
      sonstigeVersicherungen: { basisCents: 5_000 },
      notizen: "alt",
    };
    delete (alt.parameter as { sozialversicherung?: unknown }).sozialversicherung;
    const plan = migratePlan(alt);
    expect(plan.schemaVersion).toBe(15);
    const bedarf = plan.stammdaten.personen[0]?.lebensbedarf;
    const alltag = bedarf?.bloecke
      .flatMap((block) => block.posten)
      .find((posten) => posten.schluessel === "alltag");
    const alter = bedarf?.bloecke
      .flatMap((block) => block.posten)
      .find((posten) => posten.schluessel === "altersvorsorge");
    const weitere = bedarf?.bloecke
      .flatMap((block) => block.posten)
      .find((posten) => posten.schluessel === "weitere_versicherungen");
    expect(alltag?.betrag.basisCents).toBe(160_000);
    expect(alltag?.betrag.wachstum?.jahresrate).toBe(0.02);
    expect(alter?.betrag.basisCents).toBe(20_000);
    expect(weitere?.betrag.basisCents).toBe(5_000);
    expect(bedarf?.notizen).toBe("alt");
    expect(bedarf?.sozialversicherung.rentenversicherung).toBe("nein");
    expect(
      bedarf?.bloecke.every((block) => block.faktorJahr2 === 1 && block.faktorJahr3 === 1),
    ).toBe(true);
    expect(JSON.stringify(bedarf)).not.toContain("45000");
  });
});

describe("Monatsfaktor ohne Obergrenze", () => {
  it("rechnet 60 Euro mal 80 und 120 Stunden", () => {
    const plan = structuredClone(beispielElektro) as Finanzplan;
    plan.umsatzplanung = [
      {
        id: "stunden",
        bezeichnung: "Stunden",
        art: "monatsumsatz",
        monatsumsatz: {
          basisCents: 6_000,
          saison: { faktoren: [80, 120, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        },
        umsatzsteuerSatz: 0.19,
        zahlungszielTage: 0,
        wareneinsatz: { art: "keiner" },
      },
    ];
    const ergebnis = berechnePlan(plan);
    const januar = ergebnis.monate.findIndex((monat) => monat.endsWith("-01"));
    const februar = ergebnis.monate.findIndex((monat) => monat.endsWith("-02"));
    expect(ergebnis.umsatz.summeNettoCents[januar]).toBe(480_000);
    expect(ergebnis.umsatz.summeNettoCents[februar]).toBe(720_000);
  });
});
