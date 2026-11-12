// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { PlanArbeitsflaeche } from "./PlanArbeitsflaeche.tsx";

function planMitLuecke(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-pruefung",
    now: new Date("2026-04-01T00:00:00.000Z"),
    startMonat: "2026-04",
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
  plan.assistent = { station: "kosten", erledigt: [], weg: "assistent" };
  return plan;
}

function flaeche(reiter: "pruefung" | "eingaben" | "assistent", onReiter = () => undefined) {
  return (
    <PlanArbeitsflaeche
      anfangsplan={planMitLuecke()}
      beispiele={[{ id: "test", label: "Test" }]}
      beispielId="test"
      reiter={reiter}
      onBeispiel={() => undefined}
      onReiter={onReiter}
      onNeu={() => undefined}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

describe("Prüfung", () => {
  it("zeigt Meldungen, den Zähler und die Schwellen", async () => {
    const user = userEvent.setup();
    const onReiter = vi.fn();
    render(flaeche("pruefung", onReiter));

    expect(screen.getByRole("tab", { name: /Prüfung/ })).toBeTruthy();
    expect(screen.getByText("Es ist keine Steuerberatung oder Buchhaltung erfasst.")).toBeTruthy();
    expect(screen.getByText("Es ist keine Versicherung erfasst.")).toBeTruthy();
    const versicherung = screen.getByText("Es ist keine Versicherung erfasst.").closest("article");
    if (!versicherung) throw new Error("Meldung fehlt");
    await user.click(within(versicherung).getByRole("button", { name: "In der Tabelle" }));
    expect(onReiter).toHaveBeenCalledWith("eingaben");
    await user.click(within(versicherung).getByRole("button", { name: "Im Assistenten" }));
    expect(onReiter).toHaveBeenCalledWith("assistent");

    await user.click(screen.getByText(/Schwellenwerte/));
    expect(screen.getByLabelText("Mindest-Kontostand")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Auf Standard zurücksetzen" })).toBeTruthy();
  });

  it("markiert die betroffene Zeile in der Tabelle", () => {
    render(flaeche("eingaben"));
    const zeile = screen.getByRole("rowheader", { name: /Laufende Kosten/ });
    expect(zeile.querySelector(".pruef-icon")).toBeTruthy();
    expect(zeile.getAttribute("title")).toMatch(/Versicherung|Steuerberatung/);
  });

  it("markiert das Feld im Assistenten", () => {
    render(flaeche("assistent"));
    const knopf = screen.getByRole("button", { name: /Versicherungen/ });
    expect(knopf.getAttribute("data-pruef")).toBe("kosten-versicherung");
    expect(knopf.querySelector(".pruef-icon")).toBeTruthy();
    expect(knopf.getAttribute("title")).toMatch(/Versicherung/);
  });
});
