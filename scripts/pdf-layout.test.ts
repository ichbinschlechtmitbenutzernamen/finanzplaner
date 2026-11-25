import { describe, expect, it } from "vitest";
import { beispielElektro } from "../src/fixtures/beispiel-elektro.ts";
import { erstellePdfDokument } from "../src/domain/pdf/modell.ts";
import { pdfDokumentZuBuffer } from "../src/ui/pdf/pdf-dokument.tsx";
import { registriereNodeSchriften } from "./pdf-schriften.ts";

const DATUM = new Date("2026-11-12T12:00:00.000Z");

function seitenZahl(puffer: Uint8Array): number {
  const text = Buffer.from(puffer).toString("latin1");
  return text.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

describe("PDF von Blitzweg", () => {
  it("bleibt ohne zerschnittene Tabellen und kürzer als die seitenweise Fassung", async () => {
    const warnungen: string[] = [];
    const fehler: string[] = [];
    const warn = console.warn;
    const error = console.error;
    console.warn = (...args: unknown[]) => {
      warnungen.push(args.map(String).join(" "));
    };
    console.error = (...args: unknown[]) => {
      fehler.push(args.map(String).join(" "));
    };
    try {
      registriereNodeSchriften();
      const puffer = await pdfDokumentZuBuffer(erstellePdfDokument(beispielElektro, DATUM));
      const seiten = seitenZahl(puffer);
      expect(seiten).toBeGreaterThan(15);
      expect(seiten).toBeLessThan(32);
      expect(puffer.byteLength).toBeGreaterThan(50_000);
    } finally {
      console.warn = warn;
      console.error = error;
    }
    expect(warnungen.filter((zeile) => /can't wrap|bigger than available/i.test(zeile))).toEqual(
      [],
    );
    expect(fehler.filter((zeile) => /unique "key"|can't wrap/i.test(zeile))).toEqual([]);
  }, 60_000);
});
