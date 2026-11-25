import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIAGRAMM_FARBE, cssVariablen, farben, reihen } from "../src/ui/design-tokens.ts";

function kanal(wert: number): number {
  const anteil = wert / 255;
  return anteil <= 0.04045 ? anteil / 12.92 : ((anteil + 0.055) / 1.055) ** 2.4;
}

function leuchtdichte(hex: string): number {
  const rot = Number.parseInt(hex.slice(1, 3), 16);
  const gruen = Number.parseInt(hex.slice(3, 5), 16);
  const blau = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * kanal(rot) + 0.7152 * kanal(gruen) + 0.0722 * kanal(blau);
}

function kontrast(vorn: string, hinten: string): number {
  const hell = Math.max(leuchtdichte(vorn), leuchtdichte(hinten));
  const dunkel = Math.min(leuchtdichte(vorn), leuchtdichte(hinten));
  return (hell + 0.05) / (dunkel + 0.05);
}

describe("Design-Tokens", () => {
  it("stehen als dieselben CSS-Variablen in der Oberfläche", () => {
    const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
    const block = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    for (const [name, wert] of Object.entries(cssVariablen)) {
      expect(block, name).toContain(`${name}: ${wert};`);
    }
    const ohneRoot = css.replace(/:root\s*\{[\s\S]*?\n\}/, "");
    expect(ohneRoot).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("hält WCAG AA für Text und Statusfarben", () => {
    const text = [
      [farben.text, farben.flaeche],
      [farben.text, farben.hintergrund],
      [farben.text, farben.summe],
      [farben.textGedaempft, farben.flaeche],
      [farben.textGedaempft, farben.hintergrund],
      [farben.textGedaempft, farben.zebra],
      [farben.textGedaempft, farben.hover],
      [farben.textGedaempft, farben.tabellenkopf],
      [farben.textAufAkzent, farben.akzent],
      [farben.textAufAkzent, farben.akzentDunkel],
      [farben.textAufAkzent, farben.fehler],
      [farben.textAufAkzent, farben.warnung],
      [farben.textAufAkzent, farben.hinweis],
      [farben.akzent, farben.flaeche],
      [farben.akzent, farben.akzentSanft],
      [farben.fehler, farben.flaeche],
      [farben.fehler, farben.fehlerHintergrund],
      [farben.warnung, farben.flaeche],
      [farben.warnung, farben.warnungHintergrund],
      [farben.hinweis, farben.flaeche],
      [farben.hinweis, farben.hinweisHintergrund],
    ] as const;
    for (const [vorn, hinten] of text) {
      expect(kontrast(vorn, hinten)).toBeGreaterThanOrEqual(4.5);
    }
    expect(kontrast(farben.linieStark, farben.flaeche)).toBeGreaterThanOrEqual(3);
    for (const farbe of Object.values(reihen)) {
      expect(kontrast(farbe, farben.flaeche)).toBeGreaterThanOrEqual(3);
    }
    for (const farbe of Object.values(DIAGRAMM_FARBE)) {
      expect(kontrast(farbe, farben.flaeche)).toBeGreaterThanOrEqual(3);
    }
  });

  it("nutzt im Favicon nur Akzent und Fläche", () => {
    const favicon = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
    expect(favicon).toContain(farben.akzent);
    expect(favicon).toContain(farben.textAufAkzent);
    expect(favicon).not.toMatch(/<(image|use)\b/);
  });
});
