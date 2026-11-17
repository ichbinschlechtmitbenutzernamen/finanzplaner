import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { berechnePlan } from "../src/domain/calc/berechnen.ts";
import { erstelleArbeitsmappe } from "../src/domain/excel/mappe.ts";
import { berichtSpalte, jahrSummenSpalte } from "../src/domain/excel/gitter.ts";
import { erstelleBerichte } from "../src/domain/reports/berichte.ts";
import { beispielplaene } from "../src/fixtures/index.ts";
import { arbeitsmappeZuBuffer } from "../src/ui/excel/datei.ts";

const datum = new Date("2026-11-13T12:00:00.000Z");
const zeilen: [string, string, "summe" | "bestand"][] = [
  ["Rentabilität", "Umsatz", "summe"],
  ["Rentabilität", "Steuern", "summe"],
  ["Liquidität", "Kundenzahlungen", "summe"],
  ["Liquidität", "Darlehensauszahlungen", "summe"],
  ["Liquidität", "Zinsen", "summe"],
  ["Liquidität", "Tilgung", "summe"],
  ["Liquidität", "Investitionen", "summe"],
  ["Liquidität", "Einzahlungen", "summe"],
  ["Liquidität", "Auszahlungen", "summe"],
  ["Liquidität", "Endbestand", "bestand"],
];

function zahl(zelle: ExcelJS.Cell): number | null {
  const wert = zelle.value;
  if (typeof wert === "number") return wert;
  if (wert && typeof wert === "object" && "result" in wert && typeof wert.result === "number") {
    return wert.result;
  }
  const model = zelle.model as { result?: unknown };
  return typeof model.result === "number" ? model.result : null;
}

for (const beispiel of beispielplaene) {
  const modell = erstelleArbeitsmappe(beispiel.plan, datum);
  const puffer = await arbeitsmappeZuBuffer(modell);
  const ordner = mkdtempSync(path.join(tmpdir(), "excel-"));
  const quelle = path.join(ordner, "plan.xlsx");
  const ziel = path.join(ordner, "neu");
  mkdirSync(ziel);
  writeFileSync(quelle, puffer);
  const ausgabe = path.join(ziel, "plan.xlsx");
  execFileSync(
    "python3",
    [
      "-c",
      `
import uno
from com.sun.star.beans import PropertyValue
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
ctx = resolver.resolve("uno:socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext")
desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
hidden = PropertyValue(); hidden.Name = "Hidden"; hidden.Value = True
doc = desktop.loadComponentFromURL("file://${quelle}", "_blank", 0, (hidden,))
doc.calculateAll()
filt = PropertyValue(); filt.Name = "FilterName"; filt.Value = "Calc MS Excel 2007 XML"
doc.storeToURL("file://${ausgabe}", (filt,))
doc.close(True)
`,
    ],
    { stdio: "pipe" },
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(ausgabe);
  const berichte = erstelleBerichte(beispiel.plan, berechnePlan(beispiel.plan));
  const erwartet = new Map<string, number[]>([
    ["Umsatz", berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz")!.monateCents],
    [
      "Wareneinsatz",
      berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "wareneinsatz")!.monateCents,
    ],
    [
      "Personal",
      berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "personal")!.monateCents,
    ],
    [
      "Ergebnis vor Steuern",
      berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "ergebnis-vor-steuern")!
        .monateCents,
    ],
    ["Steuern", berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "steuern")!.monateCents],
    [
      "Ergebnis nach Steuern",
      berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "ergebnis-nach-steuern")!
        .monateCents,
    ],
    ["Endbestand", berichte.liquiditaet.endbestand.monateCents],
    [
      "Kundenzahlungen",
      berichte.liquiditaet.einzahlungen.unterzeilen!.find(
        (zeile) => zeile.id === "einzahlung-kunden",
      )!.monateCents,
    ],
    [
      "Darlehensauszahlungen",
      berichte.liquiditaet.einzahlungen.unterzeilen!.find(
        (zeile) => zeile.id === "einzahlung-darlehen",
      )!.monateCents,
    ],
    [
      "Zinsen",
      berichte.liquiditaet.auszahlungen.unterzeilen!.find(
        (zeile) => zeile.id === "auszahlung-zinsen",
      )!.monateCents,
    ],
    [
      "Tilgung",
      berichte.liquiditaet.auszahlungen.unterzeilen!.find(
        (zeile) => zeile.id === "auszahlung-tilgung",
      )!.monateCents,
    ],
    [
      "Investitionen",
      berichte.liquiditaet.auszahlungen.unterzeilen!.find(
        (zeile) => zeile.id === "auszahlung-investitionen",
      )!.monateCents,
    ],
    ["Einzahlungen", berichte.liquiditaet.einzahlungen.monateCents],
    ["Auszahlungen", berichte.liquiditaet.auszahlungen.monateCents],
  ]);
  let groesste = 0;
  let stelle = "";
  const jeZeile: string[] = [];
  for (const [blattName, label] of zeilen) {
    const sheet = workbook.getWorksheet(blattName);
    let nummer = 0;
    sheet?.eachRow((row, index) => {
      if (row.getCell(1).text === label && nummer === 0) nummer = index;
    });
    const cents = erwartet.get(label) ?? [];
    let zeilenMax = 0;
    for (let index = 0; index < 36; index += 1) {
      const ist = zahl(sheet!.getRow(nummer).getCell(berichtSpalte(index)));
      const soll = (cents[index] ?? 0) / 100;
      const diff = ist == null ? 1_000_000 : Math.abs(ist - soll);
      if (diff > zeilenMax) zeilenMax = diff;
      if (diff > groesste) {
        groesste = diff;
        stelle = `${blattName} ${label} Monat ${index + 1}: ${ist} statt ${soll}`;
      }
    }
    jeZeile.push(`${label} ${zeilenMax.toFixed(2)}`);
  }
  console.log("  " + jeZeile.join(", "));
  console.log(
    `${beispiel.label}: größte Abweichung ${groesste.toFixed(2)} Euro (${stelle || "keine"})`,
  );
  void jahrSummenSpalte;
}
