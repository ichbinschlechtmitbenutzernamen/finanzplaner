// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { PlanArbeitsflaeche, type ReiterId } from "./PlanArbeitsflaeche.tsx";

const BEISPIELE = [
  { id: "elektro", label: "Blitzweg" },
  { id: "cafe", label: "Café Leseecke" },
] as const;

const BERICHTE = [
  "Alle Eingaben",
  "Gewinn und Verlust",
  "Kontostand je Monat",
  "Was Sie brauchen",
  "Anschaffungen und Kredite",
  "Reicht es zum Leben?",
] as const;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function Harness({
  anfang = "eingaben",
  plan = beispielElektro,
  onNeu = () => undefined,
  onStart,
}: {
  anfang?: ReiterId;
  plan?: Finanzplan;
  onNeu?: () => void;
  onStart?: () => void;
}) {
  const [reiter, setReiter] = useState<ReiterId>(anfang);
  return (
    <PlanArbeitsflaeche
      anfangsplan={plan}
      beispiele={BEISPIELE}
      beispielId="elektro"
      reiter={reiter}
      onBeispiel={() => undefined}
      onReiter={setReiter}
      onNeu={onNeu}
      onStart={onStart}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

function alsEingabe(element: HTMLElement): HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) throw new Error("Kein Eingabefeld.");
  return element;
}

function taste(ziel: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  act(() => {
    ziel.dispatchEvent(event);
  });
  return event;
}

function merkeDownloads(): string[] {
  const downloads: string[] = [];
  URL.createObjectURL = () => "blob:plan";
  URL.revokeObjectURL = () => undefined;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
  return downloads;
}

function planMitUmsatz(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-kuerzel",
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
  return plan;
}

function setzePlattform(mac: boolean) {
  const agent = mac
    ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    : "Mozilla/5.0 (X11; Linux x86_64)";
  const plattform = mac ? "MacIntel" : "Linux x86_64";
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, get: () => agent });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    get: () => plattform,
  });
}

describe("Tastenkürzel in der Oberfläche", () => {
  it("zeigt die Kürzel im Menü und im Tooltip, Neu bleibt ohne Kürzel", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Neu" }).getAttribute("title")).toBe("Neu");
    expect(screen.getByRole("button", { name: "Plan sichern" }).getAttribute("title")).toBe(
      "Plan sichern (Strg+S)",
    );
    expect(screen.getByRole("button", { name: "Wiederholen" }).getAttribute("title")).toBe(
      "Wiederholen (Strg+Y, Strg+Umschalt+Z)",
    );

    await user.click(screen.getByRole("menuitem", { name: "Datei" }));
    const datei = screen.getByRole("menu", { name: "Datei" });
    expect(
      within(datei).getByRole("menuitem", { name: "Neu" }).querySelector(".menue-kuerzel")
        ?.textContent,
    ).toBe("");
    expect(
      within(datei).getByRole("menuitem", { name: "Plan sichern" }).querySelector(".menue-kuerzel")
        ?.textContent,
    ).toBe("Strg+S");
    expect(
      within(datei).getByRole("menuitem", { name: "PDF erstellen" }).querySelector(".menue-kuerzel")
        ?.textContent,
    ).toBe("Strg+P");
  });

  it("sichert, lädt, öffnet PDF und Excel und klappt die Seitenleiste", () => {
    const downloads = merkeDownloads();
    const dateien: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      if (this.type === "file") dateien.push(this);
    });
    render(<Harness />);

    const sichern = taste(window, { key: "s", ctrlKey: true });
    expect(sichern.defaultPrevented).toBe(true);
    expect(downloads.some((name) => name.endsWith(".json"))).toBe(true);

    const laden = taste(window, { key: "o", ctrlKey: true });
    expect(laden.defaultPrevented).toBe(true);
    expect(dateien).toHaveLength(1);

    const neu = taste(window, { key: "n", ctrlKey: true });
    expect(neu.defaultPrevented).toBe(false);

    taste(window, { key: "p", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "PDF erstellen" })).toBeTruthy();
    taste(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "PDF erstellen" })).toBeNull();

    taste(window, { key: "e", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Excel erstellen" })).toBeTruthy();
    taste(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Excel erstellen" })).toBeNull();

    expect(screen.getByRole("tree", { name: "Bereiche" })).toBeTruthy();
    taste(window, { key: "b", ctrlKey: true });
    expect(screen.queryByRole("tree")).toBeNull();
    expect(localStorage.getItem("finanzplaner.leiste")).toBe("zu");
    taste(window, { key: "b", ctrlKey: true });
    expect(screen.getByRole("tree", { name: "Bereiche" })).toBeTruthy();

    taste(window, { key: "F1" });
    expect(screen.getByRole("dialog", { name: "Kurzanleitung" })).toBeTruthy();
  });

  it("macht außerhalb eines Feldes rückgängig und wiederholt, im Feld nicht", async () => {
    const user = userEvent.setup();
    merkeDownloads();
    render(<Harness plan={planMitUmsatz()} />);

    await user.click(screen.getByRole("button", { name: "Planjahr 1 aufklappen" }));
    const april = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ });
    await user.click(april);
    await user.keyboard("{Enter}");
    const feld = screen.getByRole("textbox", { name: /Beratung, April 2026/ });
    await user.clear(feld);
    await user.type(feld, "1500");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ })).toBeTruthy();

    taste(window, { key: "z", ctrlKey: true });
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ })).toBeTruthy();
    taste(window, { key: "y", ctrlKey: true });
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ })).toBeTruthy();
    taste(window, { key: "z", ctrlKey: true });
    taste(window, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ })).toBeTruthy();

    const zelle = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ });
    await user.click(zelle);
    await user.keyboard("{Enter}");
    await user.clear(screen.getByRole("textbox", { name: /Beratung, April 2026/ }));
    await user.type(screen.getByRole("textbox", { name: /Beratung, April 2026/ }), "9999");
    const editor = alsEingabe(screen.getByRole("textbox", { name: /Beratung, April 2026/ }));
    const rueckgaengig = screen.getByRole("button", { name: "Rückgängig" });
    expect(rueckgaengig.hasAttribute("disabled")).toBe(false);
    const imFeld = taste(editor, { key: "z", ctrlKey: true });
    expect(imFeld.defaultPrevented).toBe(false);
    expect(editor.value).toBe("9999");
    const redoImFeld = taste(editor, { key: "y", ctrlKey: true });
    expect(redoImFeld.defaultPrevented).toBe(false);
    expect(editor.value).toBe("9999");
    expect(rueckgaengig.hasAttribute("disabled")).toBe(false);
    const sichern = taste(editor, { key: "s", ctrlKey: true });
    expect(sichern.defaultPrevented).toBe(true);
  });

  it("springt mit Alt+1 bis Alt+5 und öffnet die Kurzanleitung nicht daneben", () => {
    const onStart = vi.fn();
    render(<Harness anfang="ueberblick" onStart={onStart} />);

    taste(window, { key: "1", code: "Digit1", altKey: true });
    expect(onStart).toHaveBeenCalledOnce();

    taste(window, { key: "2", code: "Digit2", altKey: true });
    expect(screen.getByRole("heading", { name: "Vorhaben" })).toBeTruthy();

    taste(window, { key: "3", code: "Digit3", altKey: true });
    expect(screen.getByText(/Kennzahlen und Diagramme stammen aus den Berichten/)).toBeTruthy();

    taste(window, { key: "4", code: "Digit4", altKey: true });
    expect(screen.getByRole("heading", { name: "Prüfung" })).toBeTruthy();

    taste(window, { key: "5", code: "Digit5", altKey: true });
    expect(screen.getByRole("treeitem", { name: "Szenarien" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("öffnet den Dialog Tastenkürzel und schließt ihn mit Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("menuitem", { name: "Hilfe" }));
    await user.click(screen.getByRole("menuitem", { name: "Tastenkürzel" }));
    const dialog = screen.getByRole("dialog", { name: "Tastenkürzel" });
    expect(within(dialog).getByRole("columnheader", { name: "Aktion" })).toBeTruthy();
    expect(within(dialog).getByRole("columnheader", { name: "Kürzel" })).toBeTruthy();
    for (const kuerzel of ["Strg+S", "Strg+O", "Strg+Z", "Strg+P", "Strg+E", "Strg+B", "F1"]) {
      expect(within(dialog).getByRole("cell", { name: kuerzel })).toBeTruthy();
    }
    expect(within(dialog).getByRole("cell", { name: "Strg+Y, Strg+Umschalt+Z" })).toBeTruthy();
    expect(within(dialog).getByRole("rowheader", { name: "Startseite" })).toBeTruthy();
    expect(within(dialog).getByRole("cell", { name: "Alt+5" })).toBeTruthy();
    expect(within(dialog).getByRole("cell", { name: "Esc" })).toBeTruthy();
    expect(within(dialog).queryByRole("rowheader", { name: "Neu" })).toBeNull();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Tastenkürzel" })).toBeNull();
  });
});

describe("Tastenkürzel auf dem Mac", () => {
  afterEach(() => {
    setzePlattform(false);
  });

  it("sichert mit Cmd+S und lässt Cmd+Z im Feld dem Browser", async () => {
    setzePlattform(true);
    const user = userEvent.setup();
    const downloads = merkeDownloads();
    render(<Harness plan={planMitUmsatz()} />);

    expect(screen.getByRole("button", { name: "Plan sichern" }).getAttribute("title")).toBe(
      "Plan sichern (Cmd+S)",
    );
    const mitCmd = taste(window, { key: "s", metaKey: true });
    expect(mitCmd.defaultPrevented).toBe(true);
    expect(downloads).toHaveLength(1);
    const mitStrg = taste(window, { key: "s", ctrlKey: true });
    expect(mitStrg.defaultPrevented).toBe(false);
    expect(downloads).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Planjahr 1 aufklappen" }));
    await user.click(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ }));
    await user.keyboard("{Enter}");
    const feld = screen.getByRole("textbox", { name: /Beratung, April 2026/ });
    await user.clear(feld);
    await user.type(feld, "1500");
    await user.keyboard("{Enter}");

    taste(window, { key: "z", metaKey: true });
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ })).toBeTruthy();
    const strg = taste(window, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(strg.defaultPrevented).toBe(false);
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ })).toBeTruthy();
    taste(window, { key: "Z", metaKey: true, shiftKey: true });
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ })).toBeTruthy();

    await user.click(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ }));
    await user.keyboard("{Enter}");
    await user.clear(screen.getByRole("textbox", { name: /Beratung, April 2026/ }));
    await user.type(screen.getByRole("textbox", { name: /Beratung, April 2026/ }), "9999");
    const editor = alsEingabe(screen.getByRole("textbox", { name: /Beratung, April 2026/ }));
    const rueckgaengig = screen.getByRole("button", { name: "Rückgängig" });
    expect(rueckgaengig.hasAttribute("disabled")).toBe(false);
    const feldUndo = taste(editor, { key: "z", metaKey: true });
    expect(feldUndo.defaultPrevented).toBe(false);
    expect(editor.value).toBe("9999");
    expect(rueckgaengig.hasAttribute("disabled")).toBe(false);
  });
});

describe("Kompakte Tabellen", () => {
  it("hält Position und die Zahlenspalten fest, auch mit aufgeklapptem Planjahr", async () => {
    const user = userEvent.setup();
    render(<Harness anfang="eingaben" />);

    await user.click(screen.getByRole("treeitem", { name: "Alle Eingaben" }));
    await user.click(screen.getByRole("button", { name: "Planjahr 1 aufklappen" }));
    expect(screen.getByRole("columnheader", { name: "Jun 26" })).toBeTruthy();

    for (const name of BERICHTE) {
      await user.click(screen.getByRole("treeitem", { name }));
      const position = screen.getByRole("columnheader", { name: "Position" });
      expect(position.classList.contains("klebt")).toBe(true);
      expect(position.classList.contains("spalte-name")).toBe(true);
      const zeilen = screen.getAllByRole("rowheader");
      expect(zeilen.length).toBeGreaterThan(0);
      for (const zeile of zeilen) expect(zeile.classList.contains("klebt")).toBe(true);
      const zahlen = document.querySelectorAll(".tabelle td.zahl");
      expect(zahlen.length).toBeGreaterThan(0);
      const erste = zeilen[0]?.closest("tr");
      expect(erste?.style.height).toBe("28px");
    }
  });

  it("beschreibt die Monatsfaktoren einmal für die ganze Gruppe", async () => {
    const user = userEvent.setup();
    render(<Harness anfang="assistent" />);

    await user.click(screen.getByRole("treeitem", { name: "Umsatz" }));
    const hilfen = screen.getAllByText(/Zwölf Werte für Januar bis Dezember/);
    expect(hilfen).toHaveLength(1);
    const hilfeId = hilfen[0]?.id;
    expect(hilfeId).toBeTruthy();
    for (const monat of ["Jan", "Jun", "Dez"]) {
      const feld = screen.getByRole("textbox", { name: monat });
      expect(feld.getAttribute("aria-describedby")).toBe(hilfeId);
    }
    expect(screen.queryByText(/Faktor oder Menge für Jan/)).toBeNull();
  });
});
