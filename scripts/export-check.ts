import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type * as ExcelJS from "exceljs";
import { berechnePlan, summeCents } from "../src/domain/calc/index.ts";
import { checkpointBlaetter } from "../src/export/checkpoint.ts";
import { beispielElektro } from "../src/fixtures/beispiel-elektro.ts";

const require = createRequire(import.meta.url);
const { Workbook } = require("exceljs") as typeof ExcelJS;

const ziel = path.resolve("docs/checkpoints/schritt2-blitzweg.xlsx");
const artefakt = "/opt/cursor/artifacts/schritt2-blitzweg.xlsx";

const real = berechnePlan(beispielElektro, "real");
const blaetter = checkpointBlaetter(real, {
  basisUmsatzCents: summeCents(berechnePlan(beispielElektro, "base").umsatz.summeNettoCents),
  bestUmsatzCents: summeCents(berechnePlan(beispielElektro, "best").umsatz.summeNettoCents),
  realUmsatzCents: summeCents(real.umsatz.summeNettoCents),
  worstUmsatzCents: summeCents(berechnePlan(beispielElektro, "worst").umsatz.summeNettoCents),
});

if (real.umsatz.summeNettoCents[0] !== 747_500) {
  throw new Error("Juni-Umsatz weicht von der Handrechnung 7.475,00 Euro ab.");
}
if (real.finanzierung.summeRestschuldCents[35] !== 1_701_394) {
  throw new Error("Restschuld im Monat 36 weicht von der Handrechnung 17.013,94 Euro ab.");
}

const workbook = new Workbook();
workbook.creator = "Finanzplaner";
workbook.title = "Schritt 2 – Blitzweg Elektrotechnik";
workbook.subject = "Prüfstand des Rechenkerns, fiktiver Beispielplan";

for (const blatt of blaetter) {
  const sheet = workbook.addWorksheet(blatt.name, {
    views: [{ state: "frozen", xSplit: 1, ySplit: blatt.kopfzeile + 1, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9,
    },
  });
  for (const zeile of blatt.zeilen) {
    const row = sheet.addRow(zeile);
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (typeof cell.value === "number") {
        cell.numFmt = "#,##0.00;[Red]-#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
    });
  }
  const kopf = sheet.getRow(blatt.kopfzeile + 1);
  kopf.font = { bold: true };
  kopf.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4EDF5" } };
  });
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getColumn(1).width = 68;
  for (let spalte = 2; spalte <= 38; spalte += 1) sheet.getColumn(spalte).width = 13;
  for (const row of [sheet.getRow(1), sheet.getRow(2), sheet.getRow(3)]) {
    row.getCell(1).alignment = { wrapText: true, vertical: "top" };
  }
  sheet.getRow(3).height = 32;
}

await mkdir(path.dirname(ziel), { recursive: true });
await mkdir(path.dirname(artefakt), { recursive: true });
const puffer = await workbook.xlsx.writeBuffer();
await writeFile(ziel, Buffer.from(puffer));
await copyFile(ziel, artefakt);

console.log(`Prüfstand geschrieben: ${ziel}`);
console.log(`Juni-Umsatz ${euro(real.umsatz.summeNettoCents[0] ?? 0)} Euro`);
console.log(`Restschuld Monat 36 ${euro(real.finanzierung.summeRestschuldCents[35] ?? 0)} Euro`);
console.log(`Betriebsergebnis Juni ${euro(real.uebersicht.betriebsergebnisCents[0] ?? 0)} Euro`);

function euro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
