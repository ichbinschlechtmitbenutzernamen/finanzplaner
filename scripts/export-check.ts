import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type * as ExcelJS from "exceljs";
import { berechnePlan, summeCents } from "../src/domain/calc/index.ts";
import { checkpointBlaetter, type CheckpointBlatt } from "../src/export/checkpoint.ts";
import { steuerCheckpointBlaetter } from "../src/export/steuern-checkpoint.ts";
import { schreibeBerichteCheckpoint } from "./export-berichte.ts";
import { beispielCafe } from "../src/fixtures/beispiel-cafe.ts";
import { beispielElektro } from "../src/fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../src/fixtures/beispiel-gmbh.ts";

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

await schreibeWorkbook(blaetter, ziel, artefakt, {
  title: "Schritt 2 – Blitzweg Elektrotechnik",
  subject: "Prüfstand des Rechenkerns, fiktiver Beispielplan",
  ersteSpalte: 68,
});

const steuern = [
  { blatt: "Blitzweg", ergebnis: real },
  { blatt: "Café", ergebnis: berechnePlan(beispielCafe, "real") },
  { blatt: "Hafenlicht", ergebnis: berechnePlan(beispielGmbh, "real") },
];
const hafenlichtJahr = steuern[2]?.ergebnis.steuern.jahre[0];
if (!hafenlichtJahr || hafenlichtJahr.gewinnCents !== 11_160_000) {
  throw new Error("Hafenlicht-Gewinn weicht von 111.600,00 Euro ab.");
}
if (hafenlichtJahr.koerperschaftsteuerCents !== 1_674_000) {
  throw new Error("Hafenlicht-Körperschaftsteuer weicht von 16.740,00 Euro ab.");
}
if (hafenlichtJahr.gewerbesteuerCents !== 1_562_400) {
  throw new Error("Hafenlicht-Gewerbesteuer weicht von 15.624,00 Euro ab.");
}

const steuerZiel = path.resolve("docs/checkpoints/schritt3-steuern.xlsx");
const steuerArtefakt = "/opt/cursor/artifacts/schritt3-steuern.xlsx";
await schreibeWorkbook(steuerCheckpointBlaetter(steuern), steuerZiel, steuerArtefakt, {
  title: "Schritt 3 – Steuern und Rechtsformen",
  subject: "Prüfstand der Ertragsteuern, fiktive Beispielpläne",
  ersteSpalte: 42,
});

await schreibeBerichteCheckpoint();

console.log(`Juni-Umsatz ${euro(real.umsatz.summeNettoCents[0] ?? 0)} Euro`);
console.log(`Restschuld Monat 36 ${euro(real.finanzierung.summeRestschuldCents[35] ?? 0)} Euro`);
console.log(`Betriebsergebnis Juni ${euro(real.uebersicht.betriebsergebnisCents[0] ?? 0)} Euro`);
for (const plan of steuern) {
  for (const jahr of plan.ergebnis.steuern.jahre) {
    console.log(
      `${plan.blatt} ${jahr.jahr}: Gewinn ${euro(jahr.gewinnCents)}, ESt ${euro(jahr.einkommensteuerCents)}, Soli ${euro(jahr.solidaritaetszuschlagCents)}, KiSt ${euro(jahr.kirchensteuerCents)}, GewSt ${euro(jahr.gewerbesteuerCents)}, KSt ${euro(jahr.koerperschaftsteuerCents)}, KSt-Soli ${euro(jahr.koerperschaftsteuerSoliCents)}, Last ${euro(jahr.steuerLastCents)}, offen ${euro(jahr.einkommensteuerOffenCents + jahr.gewerbesteuerOffenCents + jahr.koerperschaftsteuerOffenCents)}`,
    );
  }
}

async function schreibeWorkbook(
  blaetter: CheckpointBlatt[],
  datei: string,
  artefakt: string,
  meta: { title: string; subject: string; ersteSpalte: number },
): Promise<void> {
  const workbook = new Workbook();
  workbook.creator = "Finanzplaner";
  workbook.title = meta.title;
  workbook.subject = meta.subject;
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
    sheet.getColumn(1).width = meta.ersteSpalte;
    const letzteSpalte = Math.max(
      ...blaetter.map((eintrag) =>
        eintrag.zeilen.reduce((max, zeile) => Math.max(max, zeile.length), 0),
      ),
    );
    for (let spalte = 2; spalte <= letzteSpalte; spalte += 1) sheet.getColumn(spalte).width = 16;
    for (const row of [sheet.getRow(1), sheet.getRow(2), sheet.getRow(3)]) {
      row.getCell(1).alignment = { wrapText: true, vertical: "top" };
    }
    sheet.getRow(3).height = 32;
  }
  await mkdir(path.dirname(datei), { recursive: true });
  await mkdir(path.dirname(artefakt), { recursive: true });
  const puffer = await workbook.xlsx.writeBuffer();
  await writeFile(datei, Buffer.from(puffer));
  await copyFile(datei, artefakt);
  console.log(`Prüfstand geschrieben: ${datei}`);
}

function euro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
