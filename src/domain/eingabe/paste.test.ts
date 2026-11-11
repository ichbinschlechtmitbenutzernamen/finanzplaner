import { describe, expect, it } from "vitest";
import { parseCentBetrag, parseDeutschZahl } from "./zahlen.ts";
import { parseEinfuegen } from "./paste.ts";

describe("deutsche Zahlen", () => {
  it("liest Tausenderpunkt, Dezimalkomma und Eurozeichen", () => {
    expect(parseDeutschZahl("1.234,56")).toBe(1234.56);
    expect(parseDeutschZahl("1.234,56 €")).toBe(1234.56);
    expect(parseDeutschZahl("€ 1.234,56")).toBe(1234.56);
    expect(parseDeutschZahl("1.234,56€")).toBe(1234.56);
    expect(parseDeutschZahl("EUR 1.234,56")).toBe(1234.56);
    expect(parseCentBetrag("1.234,56 €")).toBe(123_456);
  });

  it("liest Dezimalzahlen ohne Tausender und ganze Beträge", () => {
    expect(parseDeutschZahl("1234,56")).toBe(1234.56);
    expect(parseDeutschZahl("0,00")).toBe(0);
    expect(parseDeutschZahl("1.234")).toBe(1234);
    expect(parseDeutschZahl("1.234.567")).toBe(1_234_567);
    expect(parseDeutschZahl("12.50")).toBe(12.5);
    expect(parseDeutschZahl("1500")).toBe(1500);
    expect(parseCentBetrag("10,005")).toBe(1_001);
  });

  it("erkennt negative Schreibweisen", () => {
    expect(parseDeutschZahl("-1.234,56")).toBe(-1234.56);
    expect(parseDeutschZahl("−1.234,56")).toBe(-1234.56);
    expect(parseDeutschZahl("1.234,56-")).toBe(-1234.56);
    expect(parseDeutschZahl("(1.234,56)")).toBe(-1234.56);
    expect(parseDeutschZahl("(1.234,56 €)")).toBe(-1234.56);
  });

  it("lässt leeren Text und Unlesbares aus", () => {
    expect(parseDeutschZahl("")).toBeNull();
    expect(parseDeutschZahl("   ")).toBeNull();
    expect(parseDeutschZahl("abc")).toBeNull();
    expect(parseDeutschZahl("1.234,56 Euro extra")).toBeNull();
    expect(parseDeutschZahl("-")).toBe(0);
  });
});

describe("Einfügen aus Excel", () => {
  it("liest Zeilen und Spalten und behält leere Zellen", () => {
    const tabelle = parseEinfuegen("1.234,56 €\t\t2.000\n800,5\tkein Betrag\n");
    expect(tabelle).toEqual([
      [
        { leer: false, text: "1.234,56 €", zahl: 1234.56 },
        { leer: true, text: "", zahl: null },
        { leer: false, text: "2.000", zahl: 2000 },
      ],
      [
        { leer: false, text: "800,5", zahl: 800.5 },
        { leer: false, text: "kein Betrag", zahl: null },
      ],
    ]);
  });

  it("akzeptiert Windows-Zeilenumbrüche", () => {
    const tabelle = parseEinfuegen("10\r\n20\r\n");
    expect(tabelle.map((zeile) => zeile[0]?.zahl)).toEqual([10, 20]);
  });
});
