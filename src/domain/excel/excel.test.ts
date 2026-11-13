import { Workbook, type CellValue } from "exceljs";
import { describe, expect, it } from "vitest";
import { berechnePlan } from "../calc/berechnen.ts";
import { meldungenFuerExport } from "../checks/pruefen.ts";
import { migratePlan } from "../migrate.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import { vergleichFuerExport } from "../szenarien/vergleich.ts";
import { beispielplaene } from "../../fixtures/index.ts";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import { arbeitsmappeZuBuffer } from "../../ui/excel/datei.ts";
import { EXCEL_BLAETTER } from "../types.ts";
import { dateiBlaetter, fehlerVermerkExcel, standardExcelExport } from "./blaetter.ts";
import { erstelleArbeitsmappe } from "./mappe.ts";
import { berichtSpalte, jahrSummenSpalte } from "./gitter.ts";

const DATUM = new Date("2026-11-13T12:00:00.000Z");

function zellwert(wert: CellValue): number | string | null {
  if (wert == null) return null;
  if (typeof wert === "number" || typeof wert === "string") return wert;
  if (typeof wert === "object" && "result" in wert) {
    const ergebnis = wert.result;
    if (typeof ergebnis === "number" || typeof ergebnis === "string") return ergebnis;
  }
  return null;
}

async function mappeVon(plan: (typeof beispielplaene)[number]["plan"], szenario = "basis") {
  const modell = erstelleArbeitsmappe(plan, DATUM, szenario);
  const puffer = await arbeitsmappeZuBuffer(modell);
  const workbook = new Workbook();
  await workbook.xlsx.load(puffer as never);
  return { modell, workbook };
}

function zeileMit(workbook: Workbook, blatt: string, label: string): number {
  const sheet = workbook.getWorksheet(blatt);
  if (!sheet) throw new Error(`Blatt ${blatt} fehlt.`);
  let nummer = 0;
  sheet.eachRow((row, index) => {
    if (row.getCell(1).text === label && nummer === 0) nummer = index;
  });
  if (!nummer) throw new Error(`Zeile „${label}“ fehlt auf ${blatt}.`);
  return nummer;
}

describe("Excel-Export", () => {
  it.each(beispielplaene)(
    "schreibt $label mit zwischengespeicherten Berichtswerten",
    async ({ plan }) => {
      const { workbook } = await mappeVon(plan);
      const berichte = erstelleBerichte(plan, berechnePlan(plan));
      const vergleiche: [string, string, number[]][] = [
        [
          "Rentabilität",
          "Umsatz",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz")!.monateCents,
        ],
        [
          "Rentabilität",
          "Wareneinsatz",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "wareneinsatz")!.monateCents,
        ],
        [
          "Rentabilität",
          "Personal",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "personal")!.monateCents,
        ],
        [
          "Rentabilität",
          "Ergebnis vor Steuern",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "ergebnis-vor-steuern")!
            .monateCents,
        ],
        [
          "Rentabilität",
          "Steuern",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "steuern")!.monateCents,
        ],
        [
          "Rentabilität",
          "Ergebnis nach Steuern",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "ergebnis-nach-steuern")!
            .monateCents,
        ],
        ["Liquidität", "Endbestand", berichte.liquiditaet.endbestand.monateCents],
      ];
      for (const [blatt, label, cents] of vergleiche) {
        const nummer = zeileMit(workbook, blatt, label);
        const sheet = workbook.getWorksheet(blatt)!;
        for (let index = 0; index < 36; index += 1) {
          const wert = zellwert(sheet.getRow(nummer).getCell(berichtSpalte(index)).value);
          expect(wert, `${blatt} ${label} Monat ${index + 1}`).toBeCloseTo(
            (cents[index] ?? 0) / 100,
            2,
          );
        }
        for (let jahr = 1; jahr <= 3; jahr += 1) {
          const summe = cents
            .slice((jahr - 1) * 12, jahr * 12)
            .reduce((total, wert) => total + wert, 0);
          const bestand = label === "Endbestand" ? (cents[jahr * 12 - 1] ?? 0) : summe;
          const wert = zellwert(sheet.getRow(nummer).getCell(jahrSummenSpalte(jahr)).value);
          expect(wert, `${blatt} ${label} Planjahr ${jahr}`).toBeCloseTo(bestand / 100, 2);
        }
      }
    },
  );

  it("verweist mit jeder Formel auf eine vorhandene Zelle", async () => {
    const { modell } = await mappeVon(beispielElektro);
    const flaechen = new Map(modell.blaetter.map((blatt) => [blatt.name, blatt]));
    const muster = /(?:'((?:[^']|'')+)'!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g;
    for (const blatt of modell.blaetter) {
      blatt.zeilen.forEach((zeile, zeilenIndex) => {
        zeile.forEach((zelle) => {
          if (!zelle.formel) return;
          const text = zelle.formel.replace(/"[^"]*"/g, "");
          for (const treffer of text.matchAll(muster)) {
            const name = (treffer[1] ?? blatt.name).replaceAll("''", "'");
            const ziel = flaechen.get(name);
            expect(ziel, `${blatt.name} verweist auf ${name}`).toBeTruthy();
            const zeilenNr = Number(treffer[5] ?? treffer[3]);
            expect(zeilenNr, zelle.formel).toBeGreaterThan(0);
            expect(zeilenNr, `${name} Zeile ${zeilenNr}`).toBeLessThanOrEqual(ziel!.zeilen.length);
          }
        });
        void zeilenIndex;
      });
    }
  });

  it("lässt Blätter weg und behält Eingaben bei einem Rechenblatt", async () => {
    const nurPruefung = structuredClone(beispielElektro);
    nurPruefung.excelExport = { blaetter: ["pruefung", "vergleich"] };
    const pruefung = erstelleArbeitsmappe(nurPruefung, DATUM);
    expect(pruefung.blaetter.map((blatt) => blatt.name)).toEqual(["Prüfung", "Szenarienvergleich"]);

    const nurRente = structuredClone(beispielElektro);
    nurRente.excelExport = { blaetter: ["rentabilitaet"] };
    const namen = dateiBlaetter(nurRente.excelExport.blaetter, nurRente.stammdaten.rechtsform).map(
      (blatt) => blatt.name,
    );
    expect(namen).toContain("Eingaben");
    expect(namen).toContain("Rechnung");
    expect(namen).toContain("Steuerberechnung");
    expect(namen).toContain("Rentabilität");
    expect(namen).not.toContain("Liquidität");
  });

  it("blendet die Tragfähigkeit bei der GmbH aus und vermerkt Fehler nur bei Fehlern", async () => {
    const gmbh = await mappeVon(beispielGmbh);
    expect(gmbh.workbook.getWorksheet("Tragfähigkeit")).toBeUndefined();
    const uebersicht = gmbh.workbook.getWorksheet("Übersicht")!;
    const texte = uebersicht
      .getColumn(1)
      .values.map((wert) => (typeof wert === "string" ? wert : ""));
    expect(texte.some((text) => text.includes("Fehler"))).toBe(false);

    const elektro = await mappeVon(beispielElektro);
    expect(elektro.workbook.getWorksheet("Tragfähigkeit")).toBeTruthy();
    const fehler = meldungenFuerExport(
      beispielElektro,
      erstelleBerichte(beispielElektro, berechnePlan(beispielElektro)),
    ).filter((meldung) => meldung.stufe === "fehler").length;
    const vermerk = fehlerVermerkExcel(fehler);
    const elektroTexte = elektro.workbook
      .getWorksheet("Übersicht")!
      .getColumn(1)
      .values.map((wert) => (typeof wert === "string" ? wert : ""));
    expect(vermerk).toBeTruthy();
    expect(elektroTexte.some((text) => text === vermerk)).toBe(true);
    expect(elektro.workbook.getWorksheet("Szenarienvergleich")?.getRow(1).getCell(2).text).toBe(
      "Basisplan",
    );
    expect(vergleichFuerExport(beispielElektro).length).toBeGreaterThan(1);
  });

  it("migriert Blattauswahl von Version 12 auf 13", () => {
    const roh = structuredClone(beispielElektro) as unknown as Record<string, unknown>;
    roh.schemaVersion = 12;
    delete roh.excelExport;
    const migriert = migratePlan(roh);
    expect(migriert.schemaVersion).toBe(13);
    expect(migriert.excelExport).toEqual(standardExcelExport());
    expect(migriert.excelExport.blaetter).toEqual([...EXCEL_BLAETTER]);

    const behalten = structuredClone(beispielCafe) as unknown as Record<string, unknown>;
    behalten.schemaVersion = 12;
    (behalten.excelExport as { blaetter: string[] }).blaetter = ["pruefung"];
    const mitAuswahl = migratePlan(behalten);
    expect(mitAuswahl.schemaVersion).toBe(13);
    expect(mitAuswahl.excelExport.blaetter).toEqual(["pruefung"]);
  });
});
