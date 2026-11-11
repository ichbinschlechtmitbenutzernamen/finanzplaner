// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { PlanArbeitsflaeche, type ReiterId } from "./PlanArbeitsflaeche.tsx";

const START = "2026-04";

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }
});

function text(name: string): string {
  return (screen.getByRole("region", { name }).textContent ?? "").replace(/[\u00a0\u202f]/g, " ");
}

describe("Überblick", () => {
  it("startet mit den Beispielkennzahlen und folgt dem Beispielwechsel", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    render(<App />);

    expect(screen.getByRole("tab", { name: "Überblick", selected: true })).toBeTruthy();
    expect(text("Break-even-Monat")).toContain("Juni 2026");
    expect(text("Niedrigster Kontostand")).toMatch(/14\.391,06/);
    expect(text("Tragfähigkeit")).toContain("nicht tragfähig");
    expect(text("Tragfähigkeit")).toMatch(/26\.227,34/);

    await user.click(screen.getByRole("button", { name: "Café Leseecke" }));
    expect(text("Break-even-Monat")).toContain("September 2026");
    expect(screen.getByText("tragfähig", { exact: true })).toBeTruthy();
    expect(text("Tragfähigkeit")).toMatch(/25\.361,31/);

    await user.click(screen.getByRole("button", { name: "Hafenlicht GmbH" }));
    expect(text("Break-even-Monat")).toContain("Januar 2026");
    expect(screen.getByText("nicht anwendbar")).toBeTruthy();
    expect(text("Tragfähigkeit")).toContain("GmbH");

    await user.click(screen.getByRole("button", { name: "Grafikstudio" }));
    expect(screen.getByRole("region", { name: "Umsatz" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Personalkostenquote" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Planjahre" }));
    expect(screen.getByText("Jeder Punkt fasst ein Planjahr zusammen.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Planjahre" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("rechnet eine Tabellenänderung in den Überblick", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const april = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ });
    await user.click(april);
    await user.keyboard("{Enter}");
    const feld = screen.getByRole("textbox", { name: /Beratung, April 2026/ });
    await user.clear(feld);
    await user.type(feld, "1500");
    await user.keyboard("{Enter}");

    await user.click(screen.getByRole("tab", { name: "Überblick" }));
    const umsatz = screen.getByRole("region", { name: "Umsatz" });
    const planjahr1 = within(umsatz).getByText("Planjahr 1").closest("li");
    expect(planjahr1?.textContent?.replace(/[\u00a0\u202f]/g, " ")).toMatch(/12\.500,00/);
  });
});

function Harness() {
  const [reiter, setReiter] = useState<ReiterId>("eingaben");
  return (
    <PlanArbeitsflaeche
      anfangsplan={planMitUmsatz()}
      beispiele={[{ id: "test", label: "Test" }]}
      beispielId="test"
      reiter={reiter}
      onBeispiel={() => undefined}
      onReiter={setReiter}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

function planMitUmsatz(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-ueberblick",
    now: new Date("2026-04-01T00:00:00.000Z"),
    startMonat: START,
  });
  plan.umsatzplanung.push({
    id: "rev-beratung",
    bezeichnung: "Beratung",
    art: "monatsumsatz",
    monatsumsatz: { basisCents: 100_000 },
    umsatzsteuerSatz: 0.19,
    zahlungszielTage: 0,
    wareneinsatz: { art: "keiner" },
  });
  return plan;
}
