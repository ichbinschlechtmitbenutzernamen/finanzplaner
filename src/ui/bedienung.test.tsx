// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import { setzeFensterbreite } from "./fenster.ts";
import { PlanArbeitsflaeche, type ReiterId } from "./PlanArbeitsflaeche.tsx";

const ORIGINAL_MATCH = window.matchMedia;

beforeEach(() => {
  setzeFensterbreite("mobil");
});
import { Szenarien } from "./Szenarien.tsx";

afterEach(() => {
  cleanup();
  if (ORIGINAL_MATCH) window.matchMedia = ORIGINAL_MATCH;
  else Reflect.deleteProperty(window, "matchMedia");
});

describe("Reiter", () => {
  it("wechselt mit Pfeiltasten, Pos1 und Ende auf beiden Ebenen", async () => {
    const user = userEvent.setup();
    const plan = createEmptyFinanzplan({
      id: "plan-reiter",
      now: new Date("2026-04-01T00:00:00.000Z"),
      startMonat: "2026-04",
    });
    function Harness() {
      const [reiter, setReiter] = useState<ReiterId>("ueberblick");
      return (
        <PlanArbeitsflaeche
          anfangsplan={plan}
          beispiele={[{ id: "test", label: "Test" }]}
          beispielId="test"
          reiter={reiter}
          onBeispiel={() => undefined}
          onReiter={setReiter}
          onNeu={() => undefined}
          onSpeichern={() => undefined}
          onZuruecksetzen={() => undefined}
        />
      );
    }
    render(<Harness />);

    const ergebnisse = screen.getByRole("tab", { name: "Ergebnisse" });
    const eingeben = screen.getByRole("tab", { name: "Eingeben" });
    expect(ergebnisse.getAttribute("aria-selected")).toBe("true");
    expect(ergebnisse.tabIndex).toBe(0);
    expect(eingeben.tabIndex).toBe(-1);
    ergebnisse.focus();

    await user.keyboard("{ArrowRight}");
    const pruefen = screen.getByRole("tab", { name: /^Prüfen/ });
    expect(pruefen.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(pruefen);
    expect(pruefen.tabIndex).toBe(0);
    expect(ergebnisse.tabIndex).toBe(-1);

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Ergebnisse" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tab", { name: "Überblick" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Szenarien" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Eingeben" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tab", { name: "Assistent" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Szenarien" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Eingeben" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    await user.keyboard("{ArrowRight}");
    const ueberblick = screen.getByRole("tab", { name: "Überblick" });
    expect(ueberblick.tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: /Gewinn und Verlust/ }).tabIndex).toBe(-1);
    ueberblick.focus();

    await user.keyboard("{ArrowRight}");
    const gewinn = screen.getByRole("tab", { name: /Gewinn und Verlust/ });
    expect(gewinn.getAttribute("aria-selected")).toBe("true");
    expect(gewinn.textContent).toContain("Rentabilitätsvorschau");
    expect(document.activeElement).toBe(gewinn);
    expect(gewinn.tabIndex).toBe(0);
    expect(ueberblick.tabIndex).toBe(-1);

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Überblick" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await user.keyboard("{End}");
    expect(
      screen.getByRole("tab", { name: /Reicht es zum Leben/ }).getAttribute("aria-selected"),
    ).toBe("true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Überblick" }).getAttribute("aria-selected")).toBe(
      "true",
    );

    await user.keyboard("{ArrowLeft}");
    expect(
      screen.getByRole("tab", { name: /Reicht es zum Leben/ }).getAttribute("aria-selected"),
    ).toBe("true");
  });
});

describe("Dialogfokus", () => {
  it("hält den Hebel-Dialog und gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [plan, setPlan] = useState(() =>
        createEmptyFinanzplan({
          id: "plan-hebel",
          now: new Date("2026-04-01T00:00:00.000Z"),
        }),
      );
      return (
        <Szenarien plan={plan} onAendern={(erzeugen) => setPlan((aktuell) => erzeugen(aktuell))} />
      );
    }
    render(<Harness />);
    const liste = screen.getByRole("list");
    const hebel = within(liste).getAllByRole("button", { name: "Stellschrauben" })[0]!;
    await user.click(hebel);
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(document.activeElement).toBe(name);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Abbrechen" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(hebel);
  });

  it("hält die Rückfrage und gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [plan, setPlan] = useState(() =>
        createEmptyFinanzplan({
          id: "plan-loeschen",
          now: new Date("2026-04-01T00:00:00.000Z"),
        }),
      );
      return (
        <Szenarien plan={plan} onAendern={(erzeugen) => setPlan((aktuell) => erzeugen(aktuell))} />
      );
    }
    render(<Harness />);
    const liste = screen.getByRole("list");
    const loeschen = within(liste).getAllByRole("button", { name: "Löschen" })[0]!;
    await user.click(loeschen);
    const dialog = screen.getByRole("dialog", { name: "Variante löschen" });
    const abbrechen = within(dialog).getByRole("button", { name: "Abbrechen" });
    const bestaetigen = within(dialog).getByRole("button", { name: "Variante löschen" });
    expect(document.activeElement).toBe(abbrechen);
    await user.tab();
    expect(document.activeElement).toBe(bestaetigen);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(abbrechen);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(loeschen);
    expect(within(liste).getByText("Vorsichtig")).toBeTruthy();
  });
});
