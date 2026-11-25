import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterAll, describe, expect, it } from "vitest";
import { berechnePlan } from "../src/domain/calc/berechnen.ts";
import { erstelleArbeitsmappe } from "../src/domain/excel/mappe.ts";
import { berichtSpalte } from "../src/domain/excel/gitter.ts";
import { erstelleBerichte } from "../src/domain/reports/berichte.ts";
import { beispielplaene } from "../src/fixtures/index.ts";
import { arbeitsmappeZuBuffer } from "../src/ui/excel/datei.ts";

const PORT = 2011;
let prozess: ChildProcess | undefined;

function werkzeugeDa(): boolean {
  try {
    execFileSync("soffice", ["--version"], { stdio: "ignore" });
    execFileSync("python3", ["-c", "import uno"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const vorhanden = werkzeugeDa();

function zeileCents(berichte: ReturnType<typeof erstelleBerichte>, id: string): number[] {
  const alle = [
    ...(berichte.liquiditaet.einzahlungen.unterzeilen ?? []),
    ...(berichte.liquiditaet.auszahlungen.unterzeilen ?? []),
  ];
  const zeile = alle.find((eintrag) => eintrag.id === id);
  if (!zeile) throw new Error(`Zeile ${id} fehlt.`);
  return [...zeile.monateCents];
}

async function rechneNeu(quelle: string, ausgabe: string): Promise<void> {
  execFileSync(
    "python3",
    [
      "-c",
      `
import uno
from com.sun.star.beans import PropertyValue
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
ctx = resolver.resolve("uno:socket,host=127.0.0.1,port=${PORT};urp;StarOffice.ComponentContext")
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
}

describe.skipIf(!vorhanden)("LibreOffice rechnet die Formeln nach", () => {
  afterAll(() => {
    prozess?.kill();
  });

  it("stimmt bei den Beispielen auf den Cent mit den Berichten überein", async () => {
    const profil = mkdtempSync(path.join(tmpdir(), "lo-profil-"));
    prozess = spawn(
      "soffice",
      [
        "--headless",
        "--norestore",
        "--nologo",
        `-env:UserInstallation=file://${profil}`,
        `--accept=socket,host=127.0.0.1,port=${PORT};urp;`,
      ],
      { stdio: "ignore" },
    );
    for (let versuch = 0; versuch < 20; versuch += 1) {
      try {
        execFileSync(
          "python3",
          [
            "-c",
            `import uno
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
resolver.resolve("uno:socket,host=127.0.0.1,port=${PORT};urp;StarOffice.ComponentContext")
`,
          ],
          { stdio: "ignore" },
        );
        break;
      } catch (fehler) {
        if (versuch === 19) throw fehler;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    const datum = new Date("2026-11-13T12:00:00.000Z");
    for (const beispiel of beispielplaene) {
      const modell = erstelleArbeitsmappe(beispiel.plan, datum);
      const puffer = await arbeitsmappeZuBuffer(modell);
      const ordner = mkdtempSync(path.join(tmpdir(), "excel-"));
      const quelle = path.join(ordner, "plan.xlsx");
      const ziel = path.join(ordner, "neu");
      mkdirSync(ziel);
      writeFileSync(quelle, puffer);
      const ausgabe = path.join(ziel, "plan.xlsx");
      rechneNeu(quelle, ausgabe);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(ausgabe);
      const berichte = erstelleBerichte(beispiel.plan, berechnePlan(beispiel.plan));
      const paare: [string, string, number[]][] = [
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
          "Steuern",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "steuern")!.monateCents,
        ],
        [
          "Rentabilität",
          "Ergebnis nach Steuern",
          berichte.rentabilitaet.zeilen.find((zeile) => zeile.id === "ergebnis-nach-steuern")!
            .monateCents,
        ],
        ["Liquidität", "Kundenzahlungen", zeileCents(berichte, "einzahlung-kunden")],
        ["Liquidität", "Darlehensauszahlungen", zeileCents(berichte, "einzahlung-darlehen")],
        ["Liquidität", "Einzahlungen", berichte.liquiditaet.einzahlungen.monateCents],
        ["Liquidität", "Investitionen", zeileCents(berichte, "auszahlung-investitionen")],
        ["Liquidität", "Zinsen", zeileCents(berichte, "auszahlung-zinsen")],
        ["Liquidität", "Tilgung", zeileCents(berichte, "auszahlung-tilgung")],
        ["Liquidität", "Auszahlungen", berichte.liquiditaet.auszahlungen.monateCents],
        ["Liquidität", "Endbestand", berichte.liquiditaet.endbestand.monateCents],
      ];
      const entnahmen = berichte.rentabilitaet.zeilen.find(
        (zeile) => zeile.id === "privatentnahmen",
      );
      if (entnahmen) paare.push(["Rentabilität", "Privatentnahmen", entnahmen.monateCents]);
      const person = berichte.tragfaehigkeit.personen[0];
      if (person) {
        for (const block of person.bloecke) {
          if (block.id.endsWith("-abgaben")) continue;
          paare.push(["Tragfähigkeit", block.bezeichnung, block.monateCents]);
          for (const posten of block.unterzeilen ?? []) {
            paare.push(["Tragfähigkeit", posten.bezeichnung, posten.monateCents]);
          }
        }
        const abgaben = person.bloecke.find((block) => block.id.endsWith("-abgaben"));
        for (const unter of abgaben?.unterzeilen ?? []) {
          paare.push(["Tragfähigkeit", unter.bezeichnung, unter.monateCents]);
        }
        paare.push([
          "Tragfähigkeit",
          "Verfügbares Einkommen",
          person.verfuegbaresEinkommen.monateCents,
        ]);
      }
      const stand = new Map<string, number>();
      for (const [blattName, label, cents] of paare) {
        const sheet = workbook.getWorksheet(blattName);
        const nach = stand.get(blattName) ?? 0;
        let nummer = 0;
        sheet?.eachRow((row, index) => {
          if (nummer === 0 && index > nach && row.getCell(1).text === label) nummer = index;
        });
        stand.set(blattName, nummer);
        expect(nummer, `${beispiel.label} ${blattName} ${label}`).toBeGreaterThan(0);
        for (let index = 0; index < 36; index += 1) {
          const zelle = sheet?.getRow(nummer).getCell(berichtSpalte(index));
          const wert = zelle?.value;
          const model = zelle?.model as { result?: unknown } | undefined;
          const ist =
            typeof wert === "number"
              ? wert
              : wert &&
                  typeof wert === "object" &&
                  "result" in wert &&
                  typeof wert.result === "number"
                ? wert.result
                : typeof model?.result === "number"
                  ? model.result
                  : Number.NaN;
          expect(Number.isNaN(ist), `${beispiel.label} ${label} Monat ${index + 1}`).toBe(false);
          expect(
            Math.abs(ist - (cents[index] ?? 0) / 100),
            `${beispiel.label} ${label} Monat ${index + 1}`,
          ).toBeLessThanOrEqual(0.005);
        }
      }
    }
  }, 120_000);
});
