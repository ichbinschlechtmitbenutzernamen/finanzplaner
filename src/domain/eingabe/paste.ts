import { parseDeutschZahl } from "./zahlen.ts";

export interface PasteZelle {
  /** Leere Zelle aus Excel. Der Monat bleibt unverändert. */
  leer: boolean;
  text: string;
  /** `null`, wenn die Zelle Text enthält, der keine Zahl ist. */
  zahl: number | null;
}

/** Tab-getrennte Tabelle, wie sie Excel in die Zwischenablage legt. */
export function parseEinfuegen(text: string): PasteZelle[][] {
  const normalisiert = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const zeilen = normalisiert.split("\n");
  if (zeilen.length > 1 && zeilen[zeilen.length - 1] === "") zeilen.pop();
  return zeilen.map((zeile) => zeile.split("\t").map(parseZelle));
}

function parseZelle(roh: string): PasteZelle {
  const text = roh.trim();
  if (text === "") return { leer: true, text, zahl: null };
  return { leer: false, text, zahl: parseDeutschZahl(text) };
}
