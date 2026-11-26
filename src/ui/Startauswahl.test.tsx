// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDraftFinanzplan } from "../domain/empty-plan.ts";
import { setzeFensterbreite } from "./fenster.ts";
import { PlanArbeitsflaeche } from "./PlanArbeitsflaeche.tsx";

const ORIGINAL_MATCH = window.matchMedia;

beforeEach(() => {
  setzeFensterbreite("mobil");
});

afterEach(() => {
  cleanup();
  if (ORIGINAL_MATCH) window.matchMedia = ORIGINAL_MATCH;
  else Reflect.deleteProperty(window, "matchMedia");
});

function eingabe(element: HTMLElement): HTMLInputElement {
  expect(element).toBeInstanceOf(HTMLInputElement);
  if (!(element instanceof HTMLInputElement)) throw new Error("Kein Eingabefeld.");
  return element;
}

function flaeche() {
  return (
    <PlanArbeitsflaeche
      anfangsplan={createDraftFinanzplan({
        id: "plan-neu",
        now: new Date("2026-04-01T00:00:00.000Z"),
      })}
      beispiele={[]}
      beispielId="neu"
      reiter="assistent"
      onBeispiel={() => undefined}
      onReiter={() => undefined}
      onNeu={() => undefined}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

describe("Branchenvorlage beim neuen Plan", () => {
  it("zeigt die Auswahl und legt Handwerk mit leerem Betrag an", async () => {
    const user = userEvent.setup();
    render(flaeche());
    expect(eingabe(screen.getByRole("radio", { name: "Ohne Vorlage" })).checked).toBe(true);
    const handwerk = eingabe(screen.getByRole("radio", { name: "Handwerk" }));
    expect(handwerk.checked).toBe(false);
    await user.click(handwerk);
    await user.click(screen.getByRole("button", { name: "Assistent starten" }));
    await user.click(screen.getByRole("button", { name: /Umsatz/ }));
    expect(screen.getByDisplayValue("Arbeitsleistung / Stundenlohn")).toBeTruthy();
    expect(eingabe(screen.getByLabelText("Monatsstart")).value).toBe("");
    expect(screen.getByText("Der Betrag fehlt.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Laufende Kosten/ }));
    expect(screen.getByDisplayValue("Werkstattmiete")).toBeTruthy();
    expect(screen.getByDisplayValue("Handwerkskammerbeitrag")).toBeTruthy();
    expect(screen.getByDisplayValue("Betriebshaftpflicht")).toBeTruthy();
    const betraege = screen.getAllByLabelText("Monatlicher Nettobetrag").map(eingabe);
    expect(betraege.every((feld) => feld.value === "")).toBe(true);
  });
});
