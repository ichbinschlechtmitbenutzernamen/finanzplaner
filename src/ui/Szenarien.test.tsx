// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import { setzeAktivesSzenario, setzeHebel } from "../domain/szenarien/index.ts";
import type { Finanzplan } from "../domain/types.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { setzeFensterbreite } from "./fenster.ts";
import { PlanArbeitsflaeche } from "./PlanArbeitsflaeche.tsx";
import { Szenarien, kurzbeschreibung } from "./Szenarien.tsx";

const ORIGINAL_MATCH = window.matchMedia;

beforeEach(() => {
  setzeFensterbreite("mobil");
});

afterEach(() => {
  cleanup();
  if (ORIGINAL_MATCH) window.matchMedia = ORIGINAL_MATCH;
  else Reflect.deleteProperty(window, "matchMedia");
});

function flaeche(plan: Finanzplan) {
  function Harness() {
    const [stand, setStand] = useState(plan);
    return (
      <PlanArbeitsflaeche
        anfangsplan={stand}
        beispiele={[{ id: "elektro", label: "Blitzweg" }]}
        beispielId="elektro"
        reiter="szenarien"
        onBeispiel={() => undefined}
        onReiter={() => undefined}
        onNeu={() => undefined}
        onSpeichern={(naechster) => setStand(naechster)}
        onZuruecksetzen={() => undefined}
      />
    );
  }
  return <Harness />;
}

describe("Kurzbeschreibung aus den Stellschrauben", () => {
  it("nennt nur das, was sich gegenüber dem Basisplan ändert", () => {
    expect(
      kurzbeschreibung({
        umsatzFaktor: 0.8,
        umsatzstartMonate: 0,
        wareneinsatzPunkte: 0,
        personalFaktor: 1.1,
        kostenFaktor: 1,
      }),
    ).toBe("Umsatz −20 %, Personal +10 %");
    expect(
      kurzbeschreibung({
        umsatzFaktor: 0.8,
        umsatzstartMonate: 3,
        wareneinsatzPunkte: 0.05,
        personalFaktor: 1,
        kostenFaktor: 0.9,
      }),
    ).toBe(
      "Umsatz −20 %, Start 3 Monate später, Wareneinsatz +5 Prozentpunkte, Laufende Kosten −10 %",
    );
    expect(
      kurzbeschreibung({
        umsatzFaktor: 1,
        umsatzstartMonate: 1,
        wareneinsatzPunkte: -0.05,
        personalFaktor: 1,
        kostenFaktor: 1,
      }),
    ).toBe("Start 1 Monat später, Wareneinsatz −5 Prozentpunkte");
    expect(
      kurzbeschreibung({
        umsatzFaktor: 1,
        umsatzstartMonate: 0,
        wareneinsatzPunkte: 0,
        personalFaktor: 1,
        kostenFaktor: 1,
      }),
    ).toBe("Wie der Basisplan, ohne Änderung");
  });
});

describe("Reiter Szenarien", () => {
  it("zeigt Kurzbeschreibungen und schaltet die angezeigte Variante über den Knopf", async () => {
    const user = userEvent.setup();
    render(flaeche(beispielElektro));

    expect(screen.getByRole("group", { name: "Angezeigte Variante" })).toBeTruthy();
    expect(screen.getByText(/Bank nach einem vorsichtigen Fall/)).toBeTruthy();
    const liste = screen.getByRole("list");
    const vorsichtig = within(liste).getByText("Vorsichtig").closest("li");
    const basis = within(liste).getByText("Basisplan").closest("li");
    if (!vorsichtig || !basis) throw new Error("Die Varianten fehlen.");
    expect(vorsichtig.textContent).toContain("Umsatz −20 %, Start 3 Monate später");
    expect(vorsichtig.textContent).toContain("Was wäre, wenn …?");
    expect(basis.textContent).toContain("wird angezeigt");
    expect(within(basis).queryByRole("button", { name: "Diese Variante anzeigen" })).toBeNull();

    const umschalter = screen.getByRole("group", { name: "Angezeigte Variante" });
    expect(
      within(umschalter).getByRole("button", { name: "Basisplan" }).getAttribute("aria-pressed"),
    ).toBe("true");

    await user.click(within(vorsichtig).getByRole("button", { name: "Diese Variante anzeigen" }));
    const listeDanach = screen.getByRole("list");
    const vorsichtigDanach = within(listeDanach).getByText("Vorsichtig").closest("li");
    const basisDanach = within(listeDanach).getByText("Basisplan").closest("li");
    if (!vorsichtigDanach || !basisDanach) throw new Error("Die Varianten fehlen.");
    expect(vorsichtigDanach.textContent).toContain("wird angezeigt");
    expect(
      within(vorsichtigDanach).queryByRole("button", { name: "Diese Variante anzeigen" }),
    ).toBeNull();
    expect(
      within(basisDanach).getByRole("button", { name: "Diese Variante anzeigen" }),
    ).toBeTruthy();
    expect(
      within(umschalter).getByRole("button", { name: "Vorsichtig" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      within(umschalter).getByRole("button", { name: "Basisplan" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(screen.getByRole("status").textContent).toMatch(/Sie sehen die Variante „Vorsichtig“/);
  });

  it("erklärt die Stellschrauben im Dialog Neue Variante", async () => {
    const user = userEvent.setup();
    render(flaeche(beispielElektro));
    await user.click(screen.getByRole("button", { name: "Neue Variante" }));
    const dialog = screen.getByRole("dialog", { name: "Neue Variante" });
    expect(within(dialog).getByText(/20 % niedriger/)).toBeTruthy();
    expect(within(dialog).getByText(/drei Monate später/)).toBeTruthy();
    expect(within(dialog).getByText(/30 % statt 25 %/)).toBeTruthy();
    expect(within(dialog).getByText(/Personalkosten liegen 10 % höher/)).toBeTruthy();
    expect(within(dialog).getByText(/laufende Kosten liegen 10 % niedriger/)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Stellschrauben übernehmen" })).toBeTruthy();
  });

  it("zeigt ein Banner und kehrt zum Basisplan zurück", async () => {
    const user = userEvent.setup();
    const plan = setzeHebel(
      setzeAktivesSzenario(beispielElektro, "szenario-vorsichtig"),
      "szenario-vorsichtig",
      {
        umsatzFaktor: 0.8,
        umsatzstartMonate: 3,
        wareneinsatzPunkte: 0,
        personalFaktor: 1.1,
        kostenFaktor: 1,
      },
    );
    render(flaeche(plan));
    const hinweis = screen.getByRole("status");
    expect(hinweis.textContent).toMatch(/Sie sehen die Variante „Vorsichtig“/);
    expect(hinweis.textContent).toMatch(/nur zum Ansehen/);
    const liste = screen.getByRole("list");
    expect(within(liste).getByText("Vorsichtig").closest("li")?.textContent).toContain(
      "Umsatz −20 %, Start 3 Monate später, Personal +10 %",
    );
    await user.click(screen.getByRole("button", { name: "Zurück zum Basisplan" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(
      within(screen.getByRole("group", { name: "Angezeigte Variante" }))
        .getByRole("button", { name: "Basisplan" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

describe("Leerer Plan", () => {
  it("legt die Standardvarianten mit Kurzbeschreibung an", () => {
    const plan = createEmptyFinanzplan({
      id: "plan-varianten",
      now: new Date("2026-04-01T00:00:00.000Z"),
    });
    render(<Szenarien plan={plan} onAendern={() => undefined} />);
    const liste = screen.getByRole("list");
    expect(within(liste).getByText("Optimistisch").closest("li")?.textContent).toContain(
      "Umsatz +20 %",
    );
  });
});
