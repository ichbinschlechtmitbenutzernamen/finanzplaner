// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { PlanArbeitsflaeche, type ReiterId } from "./PlanArbeitsflaeche.tsx";

const ORIGINAL_MATCH = window.matchMedia;

const BEISPIELE = [
  { id: "elektro", label: "Blitzweg" },
  { id: "cafe", label: "Café Leseecke" },
  { id: "gmbh", label: "Hafenlicht GmbH" },
  { id: "nordlicht", label: "Grafikstudio" },
] as const;

afterEach(() => {
  cleanup();
  if (ORIGINAL_MATCH) window.matchMedia = ORIGINAL_MATCH;
  else Reflect.deleteProperty(window, "matchMedia");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function Harness({
  anfang = "ueberblick",
  plan = beispielElektro,
  onNeu = () => undefined,
  onBeispiel = () => undefined,
}: {
  anfang?: ReiterId;
  plan?: Finanzplan;
  onNeu?: () => void;
  onBeispiel?: (id: string) => void;
}) {
  const [reiter, setReiter] = useState<ReiterId>(anfang);
  return (
    <PlanArbeitsflaeche
      anfangsplan={plan}
      beispiele={BEISPIELE}
      beispielId="elektro"
      reiter={reiter}
      onBeispiel={onBeispiel}
      onReiter={setReiter}
      onNeu={onNeu}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

describe("Desktop-Menü", () => {
  it("öffnet, bewegt und schließt per Tastatur und zeigt die Beispiele", async () => {
    const user = userEvent.setup();
    const onNeu = vi.fn();
    render(<Harness onNeu={onNeu} />);

    expect(screen.queryByRole("button", { name: "Menü" })).toBeNull();
    const datei = screen.getByRole("menuitem", { name: "Datei" });
    datei.focus();
    await user.keyboard("{ArrowDown}");
    const menu = screen.getByRole("menu", { name: "Datei" });
    expect(menu).toBeTruthy();
    expect(document.activeElement?.textContent).toContain("Neu");

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toContain("Beispiel laden");
    await user.keyboard("{ArrowRight}");
    const unter = screen.getByRole("menu", { name: "Beispiel laden" });
    for (const name of ["Blitzweg", "Café Leseecke", "Hafenlicht GmbH", "Grafikstudio"]) {
      expect(within(unter).getByRole("menuitem", { name })).toBeTruthy();
    }
    expect(document.activeElement?.textContent).toContain("Blitzweg");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Beispiel laden" })).toBeNull();
    expect(document.activeElement?.textContent).toContain("Beispiel laden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Datei" })).toBeNull();
    expect(document.activeElement).toBe(datei);

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Bearbeiten" }));
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu", { name: "Datei" })).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(onNeu).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(datei);

    await user.click(screen.getByRole("menuitem", { name: "Hilfe" }));
    await user.click(screen.getByRole("menuitem", { name: "Über" }));
    expect(screen.getByRole("dialog", { name: "Über Finanzplaner" }).textContent).toContain(
      "Version 1.1.0",
    );
  });
});

describe("Desktop-Seitenleiste", () => {
  it("navigiert im Baum, nennt den Fachbegriff nur als Tooltip und merkt das Einklappen", async () => {
    const user = userEvent.setup();
    render(<Harness anfang="assistent" />);

    expect(screen.queryByRole("navigation", { name: "Stationen" })).toBeNull();
    const kontostand = screen.getByRole("treeitem", { name: "Kontostand je Monat" });
    expect(kontostand.getAttribute("title")).toBe("Liquiditätsplan");
    const beschreibung = kontostand.getAttribute("aria-describedby");
    expect(beschreibung).toBeTruthy();
    expect(document.getElementById(beschreibung ?? "")?.textContent).toBe("Liquiditätsplan");
    expect(kontostand.textContent).not.toContain("Liquiditätsplan");

    screen.getByRole("treeitem", { name: "Startseite" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("treeitem", { name: "Eingeben" }));

    await user.click(screen.getByRole("treeitem", { name: "Umsatz" }));
    expect(screen.getByRole("heading", { name: "Umsatz" })).toBeTruthy();
    expect(screen.getByRole("treeitem", { name: "Umsatz" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("button", { name: /Weiter/ })).toBeTruthy();

    await user.click(screen.getByRole("treeitem", { name: "Kontostand je Monat" }));
    expect(screen.getByRole("grid", { name: "Finanzplan" })).toBeTruthy();
    expect(
      screen.getByRole("treeitem", { name: "Kontostand je Monat" }).getAttribute("aria-current"),
    ).toBe("page");

    await user.click(screen.getByRole("button", { name: "Seitenleiste einklappen" }));
    expect(localStorage.getItem("finanzplaner.leiste")).toBe("zu");
    expect(screen.queryByRole("tree")).toBeNull();
    expect(screen.getByRole("button", { name: "Eingeben" }).getAttribute("title")).toBe("Eingeben");
    expect(screen.getByRole("button", { name: "Ergebnisse" }).getAttribute("title")).toBe(
      "Ergebnisse",
    );

    cleanup();
    render(<Harness anfang="liquiditaet" />);
    expect(screen.getByRole("button", { name: "Seitenleiste aufklappen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Prüfen/ }).getAttribute("aria-label")).toMatch(
      /Prüfen/,
    );
    await user.click(screen.getByRole("button", { name: "Seitenleiste aufklappen" }));
    expect(localStorage.getItem("finanzplaner.leiste")).toBe("auf");
    expect(screen.getByRole("tree", { name: "Bereiche" })).toBeTruthy();
  });
});

describe("Desktop-Statusleiste", () => {
  it("legt überzählige Kennzahlen hinter „mehr“ und öffnet sie per Klick", async () => {
    const user = userEvent.setup();
    render(<Harness anfang="szenarien" />);

    expect(screen.getByText("Gesichert")).toBeTruthy();
    expect(screen.getByText(/Angezeigte Variante: Basisplan/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Break-even/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "mehr" }));
    const popover = screen.getByRole("group", { name: "Weitere Kennzahlen" });
    const bruch = within(popover).getByRole("button", { name: /Break-even/ });
    await user.click(bruch);
    expect(screen.getByRole("treeitem", { name: "Überblick" }).getAttribute("aria-current")).toBe(
      "page",
    );

    await user.click(screen.getByRole("button", { name: /Tiefster Kontostand/ }));
    expect(
      screen.getByRole("treeitem", { name: "Kontostand je Monat" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("nennt einen geänderten eigenen Plan nicht gesichert", () => {
    const plan = createEmptyFinanzplan({
      id: "plan-status",
      now: new Date("2026-04-01T00:00:00.000Z"),
      startMonat: "2026-04",
    });
    plan.geaendertAm = "2026-04-01T01:00:00.000Z";
    render(<Harness plan={plan} />);
    expect(screen.getByText("Nicht gesichert")).toBeTruthy();
  });
});
