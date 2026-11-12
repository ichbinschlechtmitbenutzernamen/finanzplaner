import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { erstellePdfDokument } from "../src/domain/pdf/modell.ts";
import { beispielplaene } from "../src/fixtures/index.ts";
import { pdfDokumentZuBuffer } from "../src/ui/pdf/pdf-dokument.tsx";
import { registriereNodeSchriften } from "./pdf-schriften.ts";

const datum = new Date("2026-11-12T12:00:00.000Z");
const ziel = "/opt/cursor/artifacts";

registriereNodeSchriften();
await mkdir(ziel, { recursive: true });

for (const beispiel of beispielplaene) {
  const dokument = erstellePdfDokument(beispiel.plan, datum);
  const puffer = await pdfDokumentZuBuffer(dokument);
  const datei = path.join(ziel, dokument.dateiname);
  await writeFile(datei, puffer);
  console.log(`${beispiel.label}: ${datei} (${puffer.length} Bytes)`);
}
