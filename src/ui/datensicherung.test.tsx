// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftFinanzplan, createEmptyFinanzplan } from "../domain/empty-plan.ts";
import { exportPlanToJson, importPlanFromJson } from "../domain/io.ts";
import type { Finanzplan } from "../domain/types.ts";
import { PlanArbeitsflaeche, REITER, type ReiterId } from "./PlanArbeitsflaeche.tsx";
import { PLAN_REITER } from "./route.ts";
import { Szenarien } from "./Szenarien.tsx";

const ORIGINAL_CLICK = HTMLAnchorElement.prototype.click;
const ORIGINAL_CREATE = URL.createObjectURL;
const ORIGINAL_REVOKE = URL.revokeObjectURL;

afterEach(() => {
  cleanup();
  HTMLAnchorElement.prototype.click = ORIGINAL_CLICK;
  URL.createObjectURL = ORIGINAL_CREATE;
  URL.revokeObjectURL = ORIGINAL_REVOKE;
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

function dateiEingabe(): HTMLInputElement {
  const feld = document.querySelector('input[type="file"]');
  if (!(feld instanceof HTMLInputElement)) throw new Error("Dateiauswahl fehlt.");
  return feld;
}

function flaeche(
  plan: Finanzplan,
  extra: Partial<{
    reiter: ReiterId;
    onReiter: (reiter: ReiterId) => void;
    onZuruecksetzen: () => void;
    onPlanUebernehmen: (plan: Finanzplan) => void;
    jetzt: () => Date;
  }> = {},
) {
  return (
    <PlanArbeitsflaeche
      anfangsplan={plan}
      beispiele={[{ id: "test", label: "Test" }]}
      beispielId="test"
      reiter={extra.reiter ?? "assistent"}
      onBeispiel={() => undefined}
      onReiter={extra.onReiter ?? (() => undefined)}
      onNeu={() => undefined}
      onSpeichern={() => undefined}
      onZuruecksetzen={extra.onZuruecksetzen ?? (() => undefined)}
      onPlanUebernehmen={extra.onPlanUebernehmen}
      jetzt={extra.jetzt}
    />
  );
}

describe("Reiter vor der Wegwahl", () => {
  it("hält die Reiter mit der Route deckungsgleich", () => {
    expect(REITER.map((eintrag) => eintrag.id)).toEqual([...PLAN_REITER]);
  });

  it("markiert vor Assistent oder Tabelle keinen Reiter als geöffnet", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [reiter, setReiter] = useState<ReiterId>("assistent");
      return flaeche(
        createDraftFinanzplan({ id: "plan-neu", now: new Date("2026-04-01T00:00:00.000Z") }),
        { reiter, onReiter: setReiter },
      );
    }
    render(<Harness />);
    expect(screen.queryByRole("tab", { selected: true })).toBeNull();
    expect(screen.getByRole("heading", { name: "Wie möchten Sie beginnen?" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /Prüfen/ }));
    expect(screen.queryByRole("tab", { selected: true })).toBeNull();
    expect(screen.getByRole("heading", { name: "Wie möchten Sie beginnen?" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Assistent starten" }));
    expect(screen.getByRole("tab", { name: "Assistent", selected: true })).toBeTruthy();
  });
});

describe("Rückfragen", () => {
  it("setzt den Plan erst nach Bestätigung zurück", async () => {
    const user = userEvent.setup();
    const bestaetigt = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockImplementation(() => true);
    const plan = createEmptyFinanzplan({
      id: "plan-reset",
      now: new Date("2026-04-01T00:00:00.000Z"),
    });
    render(flaeche(plan, { reiter: "ueberblick", onZuruecksetzen: bestaetigt }));

    const menu = screen.getByText("Weitere").closest("details");
    expect(menu?.open).toBe(false);
    await user.click(screen.getByText("Weitere"));
    if (!menu) throw new Error("Menü fehlt.");
    await user.click(within(menu).getByRole("button", { name: "Plan zurücksetzen" }));
    const dialog = screen.getByRole("dialog", { name: "Plan zurücksetzen" });
    expect(dialog.textContent).toMatch(/bereits gesichert/);
    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));
    expect(bestaetigt).not.toHaveBeenCalled();

    await user.click(screen.getByText("Weitere"));
    const erneut = screen.getByText("Weitere").closest("details");
    if (!erneut) throw new Error("Menü fehlt.");
    await user.click(within(erneut).getByRole("button", { name: "Plan zurücksetzen" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Plan zurücksetzen" }),
    );
    expect(bestaetigt).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("löscht ein Szenario erst nach Bestätigung", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [plan, setPlan] = useState(() =>
        createEmptyFinanzplan({
          id: "plan-szenario",
          now: new Date("2026-04-01T00:00:00.000Z"),
        }),
      );
      return (
        <Szenarien plan={plan} onAendern={(erzeugen) => setPlan((aktuell) => erzeugen(aktuell))} />
      );
    }
    render(<Harness />);
    const liste = screen.getByRole("list");
    expect(within(liste).getByText("Vorsichtig")).toBeTruthy();
    await user.click(within(liste).getAllByRole("button", { name: "Löschen" })[0]!);
    const dialog = screen.getByRole("dialog", { name: "Szenario löschen" });
    expect(dialog.textContent).toContain("Vorsichtig");
    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));
    expect(within(liste).getByText("Vorsichtig")).toBeTruthy();
    await user.click(within(liste).getAllByRole("button", { name: "Löschen" })[0]!);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Szenario löschen" }),
    );
    expect(within(screen.getByRole("list")).queryByText("Vorsichtig")).toBeNull();
    expect(within(screen.getByRole("list")).getByText("Optimistisch")).toBeTruthy();
  });
});

describe("Sichern und Laden in der Fläche", () => {
  it("lädt den gesicherten Plan wieder ein und lehnt eine kaputte Datei ab", async () => {
    const user = userEvent.setup();
    const zeit = new Date("2026-11-26T12:00:00.000Z");
    const plan = createEmptyFinanzplan({
      id: "plan-runde",
      now: new Date("2026-04-01T00:00:00.000Z"),
    });
    plan.stammdaten.planName = "Café Größe";
    const uebernommen = vi.fn();
    const downloads: string[] = [];
    const blobs: Blob[] = [];
    URL.createObjectURL = ((blob: Blob) => {
      blobs.push(blob);
      return "blob:plan";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = () => undefined;
    HTMLAnchorElement.prototype.click = function () {
      downloads.push(this.download);
    };

    render(
      flaeche(plan, {
        reiter: "ueberblick",
        onPlanUebernehmen: uebernommen,
        jetzt: () => zeit,
      }),
    );
    expect(screen.getByText(/nur in diesem Browser/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Plan sichern" }));
    expect(downloads).toEqual(["Cafe-Groesse-2026-11-26.json"]);
    const text = await blobs[0]!.text();
    expect(importPlanFromJson(text).stammdaten.planName).toBe("Café Größe");
    expect(exportPlanToJson(importPlanFromJson(text))).toBe(text);
    expect(localStorage.getItem("finanzplaner.sicherung.test")).toBe(zeit.toISOString());

    await user.upload(dateiEingabe(), new File(["{"], "kaputt.json", { type: "application/json" }));
    expect(screen.getByRole("alert").textContent).toMatch(/kein gültiges JSON/);
    expect(uebernommen).not.toHaveBeenCalled();

    const geladen = createEmptyFinanzplan({
      id: "plan-geladen",
      now: new Date("2026-05-01T00:00:00.000Z"),
    });
    geladen.stammdaten.planName = "Aus der Datei";
    const datei = new File([exportPlanToJson(geladen)], "plan.json", { type: "application/json" });
    await user.upload(dateiEingabe(), datei);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Abbrechen" }));
    expect(uebernommen).not.toHaveBeenCalled();
    await user.upload(dateiEingabe(), datei);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Plan ersetzen" }),
    );
    expect(uebernommen).toHaveBeenCalledOnce();
    expect(uebernommen.mock.calls[0]?.[0].stammdaten.planName).toBe("Aus der Datei");
    expect(uebernommen.mock.calls[0]?.[0].schemaVersion).toBe(plan.schemaVersion);
  });

  it("zeigt den schließbaren Hinweis nach 30 Minuten", async () => {
    const user = userEvent.setup();
    const plan = createEmptyFinanzplan({
      id: "plan-hinweis",
      now: new Date("2026-04-20T08:00:00.000Z"),
    });
    plan.geaendertAm = "2026-04-20T08:20:00.000Z";
    plan.stammdaten.planName = "Werkstatt";
    localStorage.setItem("finanzplaner.sicherung.test", "2026-04-19T08:00:00.000Z");
    localStorage.setItem("finanzplaner.arbeit.test", "2026-04-20T08:10:00.000Z");

    const { rerender } = render(
      flaeche(plan, {
        reiter: "ueberblick",
        jetzt: () => new Date("2026-04-20T08:20:00.000Z"),
      }),
    );
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      flaeche(plan, {
        reiter: "ueberblick",
        jetzt: () => new Date("2026-04-20T08:40:00.000Z"),
      }),
    );
    const hinweis = screen.getByRole("status");
    expect(hinweis.textContent).toMatch(/Zuletzt gesichert: 19\. April 2026/);
    expect(hinweis.textContent).toMatch(/jetzt sichern/);
    await user.click(within(hinweis).getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("status")).toBeNull();
    rerender(
      flaeche(plan, {
        reiter: "ueberblick",
        jetzt: () => new Date("2026-04-20T09:00:00.000Z"),
      }),
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});
