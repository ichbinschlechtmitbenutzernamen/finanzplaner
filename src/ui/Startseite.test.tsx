// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.tsx";
import { createDraftFinanzplan, createEmptyFinanzplan } from "../domain/empty-plan.ts";
import { exportPlanToJson } from "../domain/io.ts";
import { beispielplaene } from "../fixtures/index.ts";
import { speicherePlan } from "./speicher.ts";
import { Startseite } from "./Startseite.tsx";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = "";
});

function dateiEingabe(): HTMLInputElement {
  const feld = document.querySelector('input[type="file"]');
  if (!(feld instanceof HTMLInputElement)) throw new Error("Dateiauswahl fehlt.");
  return feld;
}

describe("Startseite", () => {
  it("zeigt ohne eigenen Plan die drei Wege", async () => {
    const user = userEvent.setup();
    const onNeu = vi.fn();
    const onBeispiel = vi.fn();
    const onLaden = vi.fn();
    render(
      <Startseite
        beispiele={beispielplaene.map((eintrag) => ({ id: eintrag.id, label: eintrag.label }))}
        eigenerPlan={null}
        onWeiter={() => undefined}
        onNeu={onNeu}
        onBeispiel={onBeispiel}
        onLaden={onLaden}
      />,
    );

    expect(screen.getByRole("heading", { name: "Finanzplan über 36 Monate" })).toBeTruthy();
    expect(screen.getByText(/ohne Konto und ohne Server/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Eigenen Plan anlegen" }));
    expect(onNeu).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Café Leseecke" }));
    expect(onBeispiel).toHaveBeenCalledWith("cafe");
    expect(screen.queryByRole("button", { name: "Weiter mit meinem Plan" })).toBeNull();

    const plan = createEmptyFinanzplan({
      id: "plan-geladen",
      now: new Date("2026-05-01T00:00:00.000Z"),
    });
    plan.stammdaten.planName = "Aus der Datei";
    await user.upload(
      dateiEingabe(),
      new File([exportPlanToJson(plan)], "plan.json", { type: "application/json" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onLaden).toHaveBeenCalledOnce();
    expect(onLaden.mock.calls[0]?.[0].stammdaten.planName).toBe("Aus der Datei");
  });

  it("fragt, bevor ein vorhandener Plan ersetzt wird", async () => {
    const user = userEvent.setup();
    const onNeu = vi.fn();
    const onLaden = vi.fn();
    const onWeiter = vi.fn();
    render(
      <Startseite
        beispiele={[{ id: "elektro", label: "Blitzweg" }]}
        eigenerPlan={{ name: "Werkstatt Nord", geaendertAm: "2026-04-20T08:00:00.000Z" }}
        onWeiter={onWeiter}
        onNeu={onNeu}
        onBeispiel={() => undefined}
        onLaden={onLaden}
      />,
    );

    const weiter = screen.getByRole("button", { name: /Weiter mit meinem Plan/ });
    expect(weiter.textContent).toContain("Werkstatt Nord");
    expect(weiter.textContent).toMatch(/Zuletzt geändert am 20\. April 2026/);
    await user.click(weiter);
    expect(onWeiter).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Neuen Plan anlegen" }));
    const dialog = screen.getByRole("dialog", { name: "Neuen Plan anlegen" });
    expect(dialog.textContent).toContain("Werkstatt Nord");
    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));
    expect(onNeu).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Neuen Plan anlegen" }));
    await user.keyboard("{Escape}");
    expect(onNeu).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Neuen Plan anlegen" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Neuen Plan anlegen" }),
    );
    expect(onNeu).toHaveBeenCalledOnce();

    const datei = createEmptyFinanzplan({
      id: "plan-datei",
      now: new Date("2026-05-02T00:00:00.000Z"),
    });
    await user.upload(
      dateiEingabe(),
      new File([exportPlanToJson(datei)], "plan.json", { type: "application/json" }),
    );
    const laden = screen.getByRole("dialog", { name: "Plan laden" });
    await user.click(within(laden).getByRole("button", { name: "Abbrechen" }));
    expect(onLaden).not.toHaveBeenCalled();
    await user.upload(dateiEingabe(), new File(["{"], "kaputt.json", { type: "application/json" }));
    expect(screen.getByRole("alert").textContent).toMatch(/kein gültiges JSON/);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onLaden).not.toHaveBeenCalled();
  });

  it("startet ohne Hash auf der Startseite und legt einen Plan an", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Finanzplan über 36 Monate" })).toBeTruthy();
    expect(screen.queryByRole("tab", { selected: true })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Eigenen Plan anlegen" }));
    expect(screen.getByRole("heading", { name: "Wie möchten Sie beginnen?" })).toBeTruthy();
    expect(screen.queryByRole("tab", { selected: true })).toBeNull();
    expect(screen.getByText(/nur in diesem Browser/)).toBeTruthy();
    expect(window.location.hash).toBe("#neu/assistent");
  });

  it("setzt einen gespeicherten Plan fort", async () => {
    const user = userEvent.setup();
    speicherePlan("neu", entwurf());
    window.location.hash = "#start";
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Weiter mit meinem Plan/ }));
    expect(screen.getByRole("heading", { name: "Wie möchten Sie beginnen?" })).toBeTruthy();
    expect(screen.getByText(/Werkstatt Nord/)).toBeTruthy();
  });

  it("ersetzt einen gespeicherten Plan nur nach Rückfrage", async () => {
    const user = userEvent.setup();
    speicherePlan("neu", entwurf());
    window.location.hash = "#start";
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Neuen Plan anlegen" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Abbrechen" }));
    expect(localStorage.getItem("finanzplaner.plan.neu")).toContain("Werkstatt Nord");
    await user.click(screen.getByRole("button", { name: "Neuen Plan anlegen" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Neuen Plan anlegen" }),
    );
    expect(localStorage.getItem("finanzplaner.plan.neu")).toBeNull();
    expect(screen.getByRole("heading", { name: "Wie möchten Sie beginnen?" })).toBeTruthy();
  });
});

function entwurf() {
  const plan = createDraftFinanzplan({
    id: "plan-neu",
    now: new Date("2026-04-20T08:00:00.000Z"),
  });
  plan.stammdaten.planName = "Werkstatt Nord";
  return plan;
}
