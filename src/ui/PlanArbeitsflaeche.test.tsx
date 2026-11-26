// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { PlanArbeitsflaeche } from "./PlanArbeitsflaeche.tsx";

const START = "2026-04";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function flaeche(plan: Finanzplan = planMitUmsatz()) {
  return (
    <PlanArbeitsflaeche
      anfangsplan={plan}
      beispiele={[{ id: "test", label: "Test" }]}
      beispielId="test"
      reiter="eingaben"
      onBeispiel={() => undefined}
      onReiter={() => undefined}
      onNeu={() => undefined}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

function planMitUmsatz(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-tabelle",
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

describe("Tabelle", () => {
  it("startet mit eingeklappten Planjahren und merkt das Aufklappen", async () => {
    const user = userEvent.setup();
    const { unmount } = render(flaeche());

    expect(screen.queryByRole("columnheader", { name: "Apr 26" })).toBeNull();
    expect(screen.getByRole("button", { name: "Planjahr 1 aufklappen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Planjahr 2 aufklappen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Planjahr 3 aufklappen" })).toBeTruthy();
    expect(
      screen.getByText("Jahressummen je Planjahr. Zum Bearbeiten Jahr aufklappen."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nach rechts fortschreiben" })).toBeNull();
    expect(screen.queryByText(/Strg\+Z macht rückgängig/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Mehr Werkzeuge" }));
    expect(screen.getByRole("button", { name: "Nach rechts fortschreiben" })).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Monatsfaktor Jan" }).getAttribute("placeholder"),
    ).toBe("z. B. 1.234,56");
    await user.click(screen.getByRole("button", { name: "Mehr Werkzeuge" }));
    expect(screen.queryByRole("button", { name: "Nach rechts fortschreiben" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Hilfe" }));
    expect(screen.getByText(/Strg\+Z macht rückgängig/)).toBeTruthy();
    expect(screen.getByText(/Überschreibungen dieser Zeile entfallen/)).toBeTruthy();

    const jahr = screen.getByRole("gridcell", { name: /Beratung, Planjahr 2/ });
    expect(jahr.getAttribute("title")).toBe("Zum Bearbeiten Jahr aufklappen");

    await user.click(screen.getByRole("button", { name: "Planjahr 1 aufklappen" }));
    expect(screen.getByRole("columnheader", { name: "Apr 26" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Planjahr 1 zuklappen" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Apr 27" })).toBeNull();
    expect(sessionStorage.getItem("finanzplaner.jahre.plan-tabelle")).toBe("[1]");

    const april = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ });
    await user.click(april);
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("textbox", { name: /Beratung, April 2026/ }).getAttribute("placeholder"),
    ).toBe("z. B. 1.234,56");
    expect(screen.getByRole("button", { name: "Nach rechts fortschreiben" })).toBeTruthy();

    unmount();
    render(flaeche());
    expect(screen.getByRole("button", { name: "Planjahr 1 zuklappen" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Apr 26" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Planjahr 2 aufklappen" })).toBeTruthy();

    cleanup();
    const anderer = planMitUmsatz();
    anderer.id = "plan-anderer";
    render(flaeche(anderer));
    expect(screen.getByRole("button", { name: "Planjahr 1 aufklappen" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Apr 26" })).toBeNull();
  });

  it("ändert eine Zelle und macht die Änderung rückgängig", async () => {
    const user = userEvent.setup();
    render(flaeche());

    await user.click(screen.getByRole("button", { name: "Planjahr 1 aufklappen" }));
    const april = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ });
    await user.click(april);
    await user.keyboard("{Enter}");
    const feld = screen.getByRole("textbox", { name: /Beratung, April 2026/ });
    await user.clear(feld);
    await user.type(feld, "1500");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ })).toBeTruthy();
  });
});
