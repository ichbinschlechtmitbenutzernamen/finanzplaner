import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { erstelleArbeitsmappe } from "../src/domain/excel/mappe.ts";
import { beispielplaene } from "../src/fixtures/index.ts";
import { arbeitsmappeZuBuffer } from "../src/ui/excel/datei.ts";

const datum = new Date("2026-11-13T12:00:00.000Z");
const ziel = "/opt/cursor/artifacts";

function dateiname(vorlage: string): string {
  return vorlage
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

await mkdir(ziel, { recursive: true });

for (const beispiel of beispielplaene) {
  const modell = erstelleArbeitsmappe(beispiel.plan, datum);
  const puffer = await arbeitsmappeZuBuffer(modell);
  const name = `${dateiname(modell.dateiname.replace(/\.xlsx$/, ""))}.xlsx`;
  const datei = path.join(ziel, name);
  await writeFile(datei, puffer);
  console.log(`${beispiel.label}: ${datei} (${puffer.length} Bytes)`);
}
