import * as ExcelImport from "exceljs";
import type { Workbook, Worksheet } from "exceljs";
import type { Blatt, Zelle } from "../../domain/excel/gitter.ts";
import { FORMAT } from "../../domain/excel/gitter.ts";
import type { ArbeitsmappeModell } from "../../domain/excel/mappe.ts";

function neueArbeitsmappe(): Workbook {
  const raum = ExcelImport as unknown as {
    Workbook?: new () => Workbook;
    default?: { Workbook: new () => Workbook };
  };
  const Klasse = raum.Workbook ?? raum.default?.Workbook;
  if (!Klasse) throw new Error("ExcelJS stellt keine Arbeitsmappe bereit.");
  return new Klasse();
}

const FARBE = {
  eingabe: "FFFFF2CC",
  kopf: "FF1F4E79",
  ergebnis: "FFE2EFDA",
  abschnitt: "FFD6DCE4",
  schriftEingabe: "FF1F4E79",
  schriftKopf: "FFFFFFFF",
  hinweis: "FF666666",
};

/** Schreibt die Arbeitsmappe. ExcelJS wird nur von diesem Modul geladen. */
export async function arbeitsmappeZuBuffer(modell: ArbeitsmappeModell): Promise<Uint8Array> {
  const workbook = neueArbeitsmappe();
  workbook.creator = "Finanzplaner";
  workbook.calcProperties.fullCalcOnLoad = true;
  for (const blatt of modell.blaetter) schreibeBlatt(workbook.addWorksheet(blatt.name), blatt);
  const roh = await workbook.xlsx.writeBuffer();
  return new Uint8Array(roh);
}

export async function arbeitsmappeZuBlob(modell: ArbeitsmappeModell): Promise<Blob> {
  const puffer = await arbeitsmappeZuBuffer(modell);
  return new Blob([puffer.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function schreibeBlatt(worksheet: Worksheet, blatt: Blatt): void {
  blatt.zeilen.forEach((zeile, zeilenIndex) => {
    zeile.forEach((zelle, spaltenIndex) => {
      if (!hatInhalt(zelle)) return;
      const cell = worksheet.getCell(zeilenIndex + 1, spaltenIndex + 1);
      if (zelle.formel) {
        cell.value = { formula: zelle.formel, result: zelle.ergebnis ?? 0 };
      } else if (zelle.text !== undefined) {
        cell.value = zelle.text;
      } else if (zelle.zahl !== undefined) {
        cell.value = zelle.zahl;
      }
      if (zelle.format) cell.numFmt = FORMAT[zelle.format];
      const stil = zelle.stil ?? "normal";
      if (stil === "eingabe") {
        cell.fill = fuellung(FARBE.eingabe);
        cell.font = { color: { argb: FARBE.schriftEingabe } };
      } else if (stil === "kopf") {
        cell.fill = fuellung(FARBE.kopf);
        cell.font = { color: { argb: FARBE.schriftKopf }, bold: true };
      } else if (stil === "ergebnis") {
        cell.fill = fuellung(FARBE.ergebnis);
        cell.font = { bold: true };
      } else if (stil === "abschnitt") {
        cell.fill = fuellung(FARBE.abschnitt);
        cell.font = { bold: true };
      } else if (stil === "hinweis") {
        cell.font = { italic: true, color: { argb: FARBE.hinweis } };
      }
    });
  });
  blatt.spaltenbreite.forEach((breite, index) => {
    if (breite) worksheet.getColumn(index + 1).width = breite;
  });
  worksheet.views = [
    {
      state: "frozen",
      xSplit: blatt.fixierenSpalte,
      ySplit: blatt.fixierenZeile,
      activeCell: "B4",
    },
  ];
  worksheet.pageSetup = {
    orientation: blatt.quer ? "landscape" : "portrait",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
  };
  worksheet.pageSetup.printTitlesRow = `1:${Math.max(blatt.fixierenZeile, 1)}`;
  worksheet.pageSetup.fitToWidth = 1;
  worksheet.pageSetup.fitToHeight = 0;
}

function hatInhalt(zelle: Zelle | undefined): zelle is Zelle {
  if (!zelle) return false;
  return zelle.formel !== undefined || zelle.text !== undefined || zelle.zahl !== undefined;
}

function fuellung(argb: string): {
  type: "pattern";
  pattern: "solid";
  fgColor: { argb: string };
} {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
