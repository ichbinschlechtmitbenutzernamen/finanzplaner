import type { PdfDokument } from "../../domain/pdf/modell.ts";
import { registriereBrowserSchriften } from "./schriften.browser.ts";

/** Lädt die PDF-Bibliothek erst hier, damit der Überblick ohne sie startet. */
export async function erzeugePdf(dokument: PdfDokument): Promise<Blob> {
  registriereBrowserSchriften();
  const { pdfDokumentZuBlob } = await import("./pdf-dokument.tsx");
  return pdfDokumentZuBlob(dokument);
}
