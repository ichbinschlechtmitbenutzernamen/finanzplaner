// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { setzeFensterbreite } from "./fenster.ts";
import { PlanArbeitsflaeche, type ReiterId } from "./PlanArbeitsflaeche.tsx";

const ORIGINAL_MATCH = window.matchMedia;

afterEach(() => {
  cleanup();
  if (ORIGINAL_MATCH) window.matchMedia = ORIGINAL_MATCH;
  else Reflect.deleteProperty(window, "matchMedia");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = "";
  setzeFensterbreite("mobil");
});

function planMitUmsatz(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-navigation",
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

function Harness({ anfang = "ueberblick" }: { anfang?: ReiterId }) {
  const [reiter, setReiter] = useState<ReiterId>(anfang);
  return (
    <PlanArbeitsflaeche
      anfangsplan={planMitUmsatz()}
      beispiele={[{ id: "elektro", label: "Blitzweg" }]}
      beispielId="eigen"
      reiter={reiter}
      onBeispiel={() => undefined}
      onReiter={setReiter}
      onNeu={() => undefined}
      onSpeichern={() => undefined}
      onZuruecksetzen={() => undefined}
    />
  );
}

function setzeKompakt(aktiv: boolean) {
  setzeFensterbreite(aktiv ? "mobil" : "desktop");
}

describe("Zweistufige Navigation", () => {
  it("bündelt Eingaben und Berichte und behält die Fachbegriffe", async () => {
    const user = userEvent.setup();
    render(<Harness anfang="rentabilitaet" />);

    expect(screen.getByRole("tab", { name: "Ergebnisse", selected: true })).toBeTruthy();
    const gewinn = screen.getByRole("tab", { name: /Gewinn und Verlust/, selected: true });
    expect(gewinn.textContent).toContain("Rentabilitätsvorschau");
    expect(screen.getByRole("tab", { name: /Kontostand je Monat/ }).textContent).toContain(
      "Liquiditätsplan",
    );
    expect(screen.getByRole("tab", { name: /Was Sie brauchen/ }).textContent).toContain(
      "Kapitalbedarf und Finanzierung",
    );
    expect(screen.getByRole("tab", { name: /Anschaffungen und Kredite/ }).textContent).toContain(
      "Investitionen und Darlehen",
    );
    expect(screen.getByRole("tab", { name: /Reicht es zum Leben/ }).textContent).toContain(
      "Privatbedarf und Tragfähigkeit",
    );

    await user.click(screen.getByRole("tab", { name: "Eingeben" }));
    expect(screen.getByRole("tab", { name: "Assistent" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Alle Eingaben" }));
    expect(screen.getByRole("tab", { name: "Alle Eingaben", selected: true })).toBeTruthy();
    expect(screen.getByRole("grid", { name: "Finanzplan" })).toBeTruthy();
  });

  it("öffnet die bisherigen Hash-Routen", () => {
    window.location.hash = "#elektro/liquiditaet";
    const { unmount } = render(<App />);
    expect(screen.getByRole("tab", { name: "Ergebnisse", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Kontostand je Monat/, selected: true })).toBeTruthy();
    unmount();

    window.location.hash = "#cafe/anlagen";
    render(<App />);
    expect(
      screen.getByRole("tab", { name: /Anschaffungen und Kredite/, selected: true }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Anschaffungen und Kredite/ }).textContent).toContain(
      "Investitionen und Darlehen",
    );
  });

  it("springt aus der Kennzahlenleiste und der Prüfung in den Unterreiter", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness anfang="eingaben" />);
    await user.click(screen.getByRole("button", { name: /Tiefster Kontostand/ }));
    expect(screen.getByRole("tab", { name: "Ergebnisse", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Kontostand je Monat/, selected: true })).toBeTruthy();
    unmount();

    render(<Harness anfang="pruefung" />);
    const versicherung = screen.getByText("Es ist keine Versicherung erfasst.").closest("article");
    if (!versicherung) throw new Error("Meldung fehlt");
    await user.click(within(versicherung).getByRole("button", { name: "In der Tabelle" }));
    expect(screen.getByRole("tab", { name: "Eingeben", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Alle Eingaben", selected: true })).toBeTruthy();
  });

  it("fasst auf schmalen Bildschirmen Sichern, Export und Beispiele im Menü", async () => {
    const user = userEvent.setup();
    setzeKompakt(true);
    render(<Harness />);

    expect(screen.queryByText("Weitere")).toBeNull();
    const menue = screen.getByText("Menü").closest("details");
    if (!(menue instanceof HTMLDetailsElement)) throw new Error("Menü fehlt.");
    expect(menue.open).toBe(false);
    const innen = within(menue);
    expect(innen.getByRole("button", { name: "Plan sichern" })).toBeTruthy();
    expect(innen.getByRole("button", { name: "Plan laden" })).toBeTruthy();
    expect(innen.getByRole("button", { name: "PDF erstellen" })).toBeTruthy();
    expect(innen.getByRole("button", { name: "Excel erstellen" })).toBeTruthy();
    expect(innen.getByRole("button", { name: "Plan zurücksetzen" })).toBeTruthy();
    expect(innen.getByRole("button", { name: "Blitzweg" })).toBeTruthy();
    expect(innen.getByRole("button", { name: "Basisplan" })).toBeTruthy();
    await user.click(screen.getByText("Menü"));
    expect(menue.open).toBe(true);
  });
});
