import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type * as ExcelJS from "exceljs";
import {
  berichteCheckpointBlaetter,
  type BerichtBlatt,
} from "../src/export/berichte-checkpoint.ts";

const require = createRequire(import.meta.url);
const { Workbook } = require("exceljs") as typeof ExcelJS;

const ziel = path.resolve("docs/checkpoints/schritt4-berichte.xlsx");
const artefakt = "/opt/cursor/artifacts/schritt4-berichte.xlsx";

export async function schreibeBerichteCheckpoint(): Promise<void> {
  const blaetter = berichteCheckpointBlaetter();
  pruefe(blaetter);
  const workbook = new Workbook();
  workbook.creator = "Finanzplaner";
  workbook.title = "Schritt 4 – Berichte";
  workbook.subject =
    "Rentabilität, Liquidität, Kapitalbedarf und Kennzahlen, fiktive Beispielpläne";
  for (const blatt of blaetter) schreibeBlatt(workbook, blatt);
  await mkdir(path.dirname(ziel), { recursive: true });
  await mkdir(path.dirname(artefakt), { recursive: true });
  const puffer = await workbook.xlsx.writeBuffer();
  await writeFile(ziel, Buffer.from(puffer));
  await copyFile(ziel, artefakt);
  console.log(`Berichte geschrieben: ${ziel}`);
}

function schreibeBlatt(workbook: ExcelJS.Workbook, blatt: BerichtBlatt): void {
  const sheet = workbook.addWorksheet(blatt.name, {
    views: [{ state: "frozen", xSplit: 1, ySplit: blatt.kopfzeile + 1, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      printTitlesRow: `${blatt.kopfzeile + 1}:${blatt.kopfzeile + 1}`,
    },
    properties: { tabColor: tabFarbe(blatt.name) },
  });
  for (const zeile of blatt.zeilen) sheet.addRow(zeile);
  const letzteSpalte = blatt.zeilen.reduce((max, zeile) => Math.max(max, zeile.length), 1);
  sheet.getColumn(1).width = 48;
  for (let spalte = 2; spalte <= letzteSpalte; spalte += 1) {
    sheet.getColumn(spalte).width = blatt.planjahrSpalten.includes(spalte - 1) ? 18 : 13;
  }
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FF1F4E79" } };
  sheet.getRow(1).height = 24;

  for (const index of blatt.kopfZeilen) {
    const kopf = sheet.getRow(index + 1);
    kopf.font = { bold: true, color: { argb: "FFFFFFFF" } };
    kopf.height = 32;
    kopf.eachCell({ includeEmpty: true }, (cell, spalte) => {
      if (spalte > letzteSpalte) return;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
      cell.alignment = { wrapText: true, vertical: "middle" };
    });
  }

  for (let index = 0; index < blatt.zeilen.length; index += 1) {
    const row = sheet.getRow(index + 1);
    const ergebnis = blatt.ergebnisZeilen.includes(index);
    const summe = blatt.summenZeilen.includes(index);
    const nachricht = blatt.nachrichtZeilen.includes(index);
    const kopf = blatt.kopfZeilen.includes(index);
    row.eachCell({ includeEmpty: false }, (cell, spalte) => {
      if (typeof cell.value === "number") {
        cell.numFmt = "#,##0.00;[Red]-#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
      if (kopf) return;
      const planjahr = blatt.planjahrSpalten.includes(spalte - 1);
      if (ergebnis) {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4EBD8" } };
      } else if (summe) {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4EDF5" } };
        cell.border = { top: { style: "thin", color: { argb: "FF8FA8BE" } } };
      } else if (nachricht) {
        cell.font = { italic: true, color: { argb: "FF5C6570" } };
      } else if (planjahr) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F8FC" } };
      }
    });
  }
  sheet.getRow(2).alignment = { wrapText: true, vertical: "top" };
  sheet.getRow(3).alignment = { wrapText: true, vertical: "top" };
  if (filterbar(blatt)) {
    sheet.autoFilter = {
      from: { row: blatt.kopfzeile + 1, column: 1 },
      to: { row: blatt.kopfzeile + 1, column: letzteSpalte },
    };
  }
}

function filterbar(blatt: BerichtBlatt): boolean {
  if (blatt.planjahrSpalten.length === 0) return false;
  return !["Monate", "Anlagen", "Darlehen", "Tragfähigkeit"].some((teil) =>
    blatt.name.includes(teil),
  );
}

function tabFarbe(name: string): { argb: string } {
  if (name.startsWith("Blitzweg")) return { argb: "FF1F4E79" };
  if (name.startsWith("Café")) return { argb: "FF548235" };
  if (name.startsWith("Hafenlicht")) return { argb: "FF833C0C" };
  return { argb: "FF5B6770" };
}

function pruefe(blaetter: readonly BerichtBlatt[]): void {
  const rohertrag = zahl(blaetter, "Blitzweg GuV", "Rohertrag", 1);
  if (rohertrag !== 61_417.18) {
    throw new Error(`Blitzweg-Rohertrag Planjahr 1 ist ${rohertrag}, erwartet 61417.18.`);
  }
  const nachSteuern = zahl(blaetter, "Hafenlicht GuV", "Ergebnis nach Steuern", 1);
  if (nachSteuern !== 78_315.3) {
    throw new Error(
      `Hafenlicht-Ergebnis nach Steuern Planjahr 1 ist ${nachSteuern}, erwartet 78315.30.`,
    );
  }
  const restschuld = zahl(blaetter, "Blitzweg Darlehen", "Restschuld", 3);
  if (restschuld !== 17_013.94) {
    throw new Error(
      `Blitzweg-Restschuld am Ende von Planjahr 3 ist ${restschuld}, erwartet 17013.94.`,
    );
  }
}

function zahl(
  blaetter: readonly BerichtBlatt[],
  name: string,
  label: string,
  spalte: number,
): number {
  const blatt = blaetter.find((eintrag) => eintrag.name === name);
  const zeile = blatt?.zeilen.find((eintrag) => eintrag[0] === label);
  const wert = zeile?.[spalte];
  if (typeof wert !== "number") {
    throw new Error(`Zahl fehlt: ${name} / ${label} / Spalte ${spalte}.`);
  }
  return wert;
}

const direkt = process.argv[1]?.includes("export-berichte");
if (direkt) {
  await schreibeBerichteCheckpoint();
}
