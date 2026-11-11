import { roundCents } from "../calc/round.ts";

/**
 * Liest eine deutsche oder einfache Zahl.
 * `1.234,56`, `1.234,56 €`, Klammern und ein nachgestelltes Minus gelten als Betrag.
 * Ein Punkt mit genau drei folgenden Ziffern ist ein Tausendertrennzeichen, sonst ein Dezimalpunkt.
 * Liefert `null`, wenn der Text keine Zahl ist.
 */
export function parseDeutschZahl(roh: string): number | null {
  const vorzeichen = vorzeichenVon(roh);
  if (!vorzeichen) return null;
  const normalisiert = normalisiereZahl(vorzeichen.text);
  if (normalisiert == null) return null;
  const wert = Number(normalisiert);
  if (!Number.isFinite(wert)) return null;
  return vorzeichen.negativ ? -wert : wert;
}

/** Euro-Betrag in ganzen Cent. `null`, wenn der Text keine Zahl ist. */
export function parseCentBetrag(roh: string): number | null {
  const zahl = parseDeutschZahl(roh);
  if (zahl == null) return null;
  return roundCents(zahl * 100);
}

function normalisiereZahl(text: string): string | null {
  const komma = text.lastIndexOf(",");
  const punkt = text.lastIndexOf(".");
  let zahl = text;
  if (komma >= 0 && punkt >= 0) {
    zahl = komma > punkt ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (komma >= 0) {
    const teile = text.split(",");
    if (teile.length !== 2) return null;
    zahl = `${teile[0]}.${teile[1]}`;
  } else if (punkt >= 0 && /^\d{1,3}(\.\d{3})+$/.test(text)) {
    zahl = text.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(zahl)) return null;
  return zahl;
}

function vorzeichenVon(roh: string): { text: string; negativ: boolean } | null {
  let text = roh.normalize("NFKC").replace(/[\s\u00a0]/g, "");
  text = text.replace(/€/g, "").replace(/eur/gi, "");
  if (text === "") return null;
  if (text === "-" || text === "–" || text === "—") return { text: "0", negativ: false };

  let negativ = false;
  const klammer = /^\((.*)\)$/.exec(text);
  if (klammer?.[1]) {
    negativ = true;
    text = klammer[1];
  }
  if (text.startsWith("-") || text.startsWith("−")) {
    negativ = true;
    text = text.slice(1);
  } else if (text.endsWith("-") || text.endsWith("−")) {
    negativ = true;
    text = text.slice(0, -1);
  }
  if (text === "") return null;
  return { text, negativ };
}
