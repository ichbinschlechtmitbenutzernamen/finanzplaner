import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Sticky-Tabellenkopf", () => {
  it("lässt den Text der Kopfzellen sichtbar, damit horizontales Scrollen sie nicht leert", () => {
    const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
    const kopfRegel = css.match(/\.tabelle thead th \{[^}]*\}/)?.[0] ?? "";
    expect(kopfRegel).toContain("position: sticky");
    expect(kopfRegel).toContain("overflow: visible");
  });
});
