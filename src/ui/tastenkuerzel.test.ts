// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { aktionFuerTaste, kuerzelTabelle, kuerzelText } from "./tastenkuerzel.ts";

function taste(ziel: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  ziel.dispatchEvent(event);
  return event;
}

describe("Tastenkürzel erkennen", () => {
  it("belegt die Kürzel unter Strg und lässt Strg+N frei", () => {
    const ziel = document.body;
    expect(aktionFuerTaste(taste(ziel, { key: "s", ctrlKey: true }), false)).toBe("sichern");
    expect(aktionFuerTaste(taste(ziel, { key: "o", ctrlKey: true }), false)).toBe("laden");
    expect(aktionFuerTaste(taste(ziel, { key: "z", ctrlKey: true }), false)).toBe("undo");
    expect(aktionFuerTaste(taste(ziel, { key: "y", ctrlKey: true }), false)).toBe("redo");
    expect(aktionFuerTaste(taste(ziel, { key: "Z", ctrlKey: true, shiftKey: true }), false)).toBe(
      "redo",
    );
    expect(aktionFuerTaste(taste(ziel, { key: "p", ctrlKey: true }), false)).toBe("pdf");
    expect(aktionFuerTaste(taste(ziel, { key: "e", ctrlKey: true }), false)).toBe("excel");
    expect(aktionFuerTaste(taste(ziel, { key: "b", ctrlKey: true }), false)).toBe("leiste");
    expect(aktionFuerTaste(taste(ziel, { key: "F1" }), false)).toBe("hilfe");
    expect(aktionFuerTaste(taste(ziel, { key: "1", code: "Digit1", altKey: true }), false)).toBe(
      "start",
    );
    expect(aktionFuerTaste(taste(ziel, { key: "5", code: "Digit5", altKey: true }), false)).toBe(
      "szenarien",
    );
    expect(aktionFuerTaste(taste(ziel, { key: "n", ctrlKey: true }), false)).toBeNull();
    expect(aktionFuerTaste(taste(ziel, { key: "s", metaKey: true }), false)).toBeNull();
  });

  it("nutzt auf dem Mac Cmd und lässt Strg unangetastet", () => {
    const ziel = document.body;
    expect(aktionFuerTaste(taste(ziel, { key: "s", metaKey: true }), true)).toBe("sichern");
    expect(aktionFuerTaste(taste(ziel, { key: "z", metaKey: true, shiftKey: true }), true)).toBe(
      "redo",
    );
    expect(aktionFuerTaste(taste(ziel, { key: "s", ctrlKey: true }), true)).toBeNull();
    expect(aktionFuerTaste(taste(ziel, { key: "z", ctrlKey: true }), true)).toBeNull();
    expect(kuerzelText("sichern", true)).toBe("Cmd+S");
    expect(kuerzelText("sichern", false)).toBe("Strg+S");
    expect(kuerzelTabelle(true).find((zeile) => zeile.aktion === "Wiederholen")?.kuerzel).toBe(
      "Cmd+Y, Cmd+Umschalt+Z",
    );
  });

  it("lässt im Eingabefeld Undo und Redo des Feldes durch", () => {
    const feld = document.createElement("input");
    document.body.append(feld);
    const zurueck = taste(feld, { key: "z", ctrlKey: true });
    const wieder = taste(feld, { key: "y", ctrlKey: true });
    expect(aktionFuerTaste(zurueck, false)).toBeNull();
    expect(aktionFuerTaste(wieder, false)).toBeNull();
    expect(zurueck.defaultPrevented).toBe(false);
    expect(wieder.defaultPrevented).toBe(false);
    expect(aktionFuerTaste(taste(feld, { key: "z", metaKey: true }), true)).toBeNull();
    expect(aktionFuerTaste(taste(feld, { key: "Z", ctrlKey: true, shiftKey: true }), false)).toBe(
      "redo",
    );
    expect(aktionFuerTaste(taste(feld, { key: "s", ctrlKey: true }), false)).toBe("sichern");
    feld.remove();
  });
});
