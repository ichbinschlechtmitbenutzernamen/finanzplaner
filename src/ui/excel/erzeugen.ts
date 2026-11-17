import type { ArbeitsmappeModell } from "../../domain/excel/mappe.ts";

/** Lädt ExcelJS erst hier, damit die Seite ohne die Bibliothek startet. */
export async function erzeugeExcel(modell: ArbeitsmappeModell): Promise<Blob> {
  const { arbeitsmappeZuBlob } = await import("./datei.ts");
  return arbeitsmappeZuBlob(modell);
}
