// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { berechnePlan } from "../domain/calc/berechnen.ts";
import { pruefePlan } from "../domain/checks/index.ts";
import { createDraftFinanzplan, createEmptyFinanzplan } from "../domain/empty-plan.ts";
import { findeZeile } from "../domain/reports/planjahr.ts";
import { erstelleBerichte } from "../domain/reports/berichte.ts";
import { planFuerRechnung } from "../domain/szenarien/index.ts";
import type { Finanzplan } from "../domain/types.ts";
import { beispielElektro } from "../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../fixtures/beispiel-gmbh.ts";
import { formatEuro, formatMonatLang } from "./format.ts";
import { leisteKennzahlen, planHatKennzahlen, type LeistenZiel } from "./kennzahlen-leiste.ts";
import { PlanArbeitsflaeche } from "./PlanArbeitsflaeche.tsx";

afterEach(() => {
  cleanup();
});

function norm(text: string | null | undefined): string {
  return (text ?? "").replace(/[\u00a0\u202f]/g, " ");
}

function berichteFuer(plan: Finanzplan) {
  const ansicht = planFuerRechnung(plan);
  const berichte = erstelleBerichte(ansicht, berechnePlan(ansicht));
  return { ansicht, berichte, meldungen: pruefePlan(ansicht, berichte) };
}

function flaeche(
  plan: Finanzplan,
  reiter: "eingaben" | "assistent" | "ueberblick" | "rentabilitaet",
  onReiter: (ziel: string) => void = () => undefined,
  onSpeichern: (plan: Finanzplan) => void = () => undefined,
) {
  return (
    <PlanArbeitsflaeche
      anfangsplan={plan}
      beispiele={[{ id: "elektro", label: "Blitzweg" }]}
      beispielId="elektro"
      reiter={reiter}
      onBeispiel={() => undefined}
      onReiter={onReiter}
      onNeu={() => undefined}
      onSpeichern={onSpeichern}
      onZuruecksetzen={() => undefined}
    />
  );
}

describe("Kennzahlenleiste", () => {
  it("zeigt die Werte von Blitzweg aus den bestehenden Berichten", () => {
    const { berichte, meldungen } = berichteFuer(beispielElektro);
    render(flaeche(beispielElektro, "eingaben"));

    const kontostand = berichte.kennzahlen.tiefsterLiquiditaetsstandCents;
    const konto = screen.getByRole("button", { name: /Tiefster Kontostand/ });
    expect(norm(konto.textContent)).toContain(norm(formatEuro(kontostand)));
    if (berichte.kennzahlen.tiefsterLiquiditaetsstandMonat) {
      expect(norm(konto.textContent)).toContain(
        formatMonatLang(berichte.kennzahlen.tiefsterLiquiditaetsstandMonat),
      );
    }
    if (kontostand < 0) expect(konto.querySelector(".live-negativ")).toBeTruthy();
    else expect(konto.querySelector(".live-negativ")).toBeNull();

    const ergebnis = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
    const ergebnisText = norm(
      screen.getByRole("button", { name: /Ergebnis nach Steuern/ }).textContent,
    );
    berichte.planjahre.slice(0, 3).forEach((jahr, index) => {
      expect(ergebnisText).toContain(
        norm(`Jahr ${jahr.nummer} ${formatEuro(ergebnis.planjahreCents[index] ?? 0)}`),
      );
    });

    const bruch = berichte.kennzahlen.breakEven;
    const breakText = norm(screen.getByRole("button", { name: /Break-even/ }).textContent);
    expect(breakText).toContain(
      bruch.erreicht && bruch.monat ? formatMonatLang(bruch.monat) : "nicht erreicht",
    );

    const tragText = norm(screen.getByRole("button", { name: /Tragfähigkeit/ }).textContent);
    const person = berichte.tragfaehigkeit.personen[0];
    if (person?.planjahr2Cents != null) {
      expect(tragText).toContain(norm(formatEuro(person.planjahr2Cents)));
    }
    expect(tragText).toContain("nicht tragfähig");

    const fehler = meldungen.filter((meldung) => meldung.stufe === "fehler").length;
    const warnungen = meldungen.filter((meldung) => meldung.stufe === "warnung").length;
    const pruef = screen.getByRole("button", { name: /^Prüfung/ });
    expect(norm(pruef.textContent)).toContain(`${fehler} Fehler`);
    expect(norm(pruef.textContent)).toContain(
      `${warnungen} ${warnungen === 1 ? "Warnung" : "Warnungen"}`,
    );
    if (fehler > 0) expect(pruef.querySelector(".live-fehler")).toBeTruthy();
    if (warnungen > 0) expect(pruef.querySelector(".live-warnung")).toBeTruthy();

    expect(norm(screen.getByRole("button", { name: /Kapitalbedarf/ }).textContent)).toContain(
      norm(formatEuro(berichte.kapital.summeBedarf.betragCents)),
    );
    expect(screen.getByRole("button", { name: /Break-even/ }).getAttribute("title")).toMatch(
      /erste Monat/,
    );
  });

  it("zeigt dieselbe Leiste im Assistenten und lässt die Ergebnisreiter unverändert", () => {
    const { berichte } = berichteFuer(beispielElektro);
    const { unmount } = render(flaeche(beispielElektro, "assistent"));
    expect(screen.getByRole("group", { name: "Kennzahlen" })).toBeTruthy();
    expect(norm(screen.getByRole("button", { name: /Kapitalbedarf/ }).textContent)).toContain(
      norm(formatEuro(berichte.kapital.summeBedarf.betragCents)),
    );
    unmount();

    render(flaeche(beispielElektro, "rentabilitaet"));
    expect(screen.queryByRole("group", { name: "Kennzahlen" })).toBeNull();
    expect(screen.getByText(/Rohertragsquote/)).toBeTruthy();
  });

  it("folgt dem aktiven Szenario und einer Tabelleneingabe", async () => {
    const user = userEvent.setup();
    let gespeichert: Finanzplan | null = null;
    render(
      flaeche(beispielElektro, "eingaben", undefined, (plan) => {
        gespeichert = plan;
      }),
    );
    const vorher = norm(screen.getByRole("button", { name: /Tiefster Kontostand/ }).textContent);

    await user.click(screen.getByRole("button", { name: "Vorsichtig" }));
    expect(gespeichert).toBeTruthy();
    if (!gespeichert) throw new Error("Der Plan wurde nicht gespeichert.");
    const vorsichtig = berichteFuer(gespeichert);
    const konto = norm(screen.getByRole("button", { name: /Tiefster Kontostand/ }).textContent);
    expect(konto).toContain(
      norm(formatEuro(vorsichtig.berichte.kennzahlen.tiefsterLiquiditaetsstandCents)),
    );
    expect(konto).not.toBe(vorher);
  });

  it("aktualisiert das Ergebnis nach einer Zelleingabe", async () => {
    const user = userEvent.setup();
    let gespeichert: Finanzplan | null = null;
    render(
      flaeche(planMitUmsatz(), "eingaben", undefined, (plan) => {
        gespeichert = plan;
      }),
    );
    const vorher = norm(screen.getByRole("button", { name: /Ergebnis nach Steuern/ }).textContent);

    await user.click(screen.getByRole("button", { name: "Planjahr 1 aufklappen" }));
    const april = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ });
    await user.click(april);
    await user.keyboard("{Enter}");
    const feld = screen.getByRole("textbox", { name: /Beratung, April 2026/ });
    await user.clear(feld);
    await user.type(feld, "1500");
    await user.keyboard("{Enter}");

    expect(gespeichert).toBeTruthy();
    if (!gespeichert) throw new Error("Der Plan wurde nicht gespeichert.");
    const { berichte } = berichteFuer(gespeichert);
    const ergebnis = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
    const text = norm(screen.getByRole("button", { name: /Ergebnis nach Steuern/ }).textContent);
    expect(text).toContain(norm(`Jahr 1 ${formatEuro(ergebnis.planjahreCents[0] ?? 0)}`));
    expect(text).not.toBe(vorher);
  });

  it("öffnet den passenden Reiter", async () => {
    const user = userEvent.setup();
    const onReiter = vi.fn();
    render(flaeche(beispielElektro, "eingaben", onReiter));
    const ziele: [RegExp, LeistenZiel][] = [
      [/Tiefster Kontostand/, "liquiditaet"],
      [/Ergebnis nach Steuern/, "rentabilitaet"],
      [/Break-even/, "ueberblick"],
      [/Tragfähigkeit/, "tragfaehigkeit"],
      [/^Prüfung/, "pruefung"],
      [/Kapitalbedarf/, "kapital"],
    ];
    for (const [name, ziel] of ziele) {
      await user.click(screen.getByRole("button", { name }));
      expect(onReiter).toHaveBeenLastCalledWith(ziel);
    }
  });

  it("zeigt vor der Wegwahl und bei einem leeren Plan nur Striche", async () => {
    const user = userEvent.setup();
    const onReiter = vi.fn();
    const { unmount } = render(
      flaeche(
        createDraftFinanzplan({ id: "plan-neu", now: new Date("2026-04-01T00:00:00.000Z") }),
        "assistent",
        onReiter,
      ),
    );
    const leiste = screen.getByRole("group", { name: "Kennzahlen" });
    expect(norm(leiste.textContent)).not.toMatch(/Fehler|Warnung|tragfähig/);
    for (const name of [
      /Tiefster Kontostand/,
      /Ergebnis nach Steuern/,
      /Break-even/,
      /Kapitalbedarf/,
    ]) {
      expect(norm(screen.getByRole("button", { name }).textContent)).toContain("–");
    }
    await user.click(screen.getByRole("button", { name: /Tiefster Kontostand/ }));
    expect(onReiter).not.toHaveBeenCalled();
    unmount();

    render(
      flaeche(
        createEmptyFinanzplan({
          id: "plan-leer",
          now: new Date("2026-04-01T00:00:00.000Z"),
          startMonat: "2026-04",
        }),
        "eingaben",
        onReiter,
      ),
    );
    const leer = screen.getByRole("group", { name: "Kennzahlen" });
    expect(norm(leer.textContent)).not.toMatch(/Fehler|Warnung/);
    expect(norm(screen.getByRole("button", { name: /^Prüfung/ }).textContent)).toContain("–");
    expect(planHatKennzahlen(createEmptyFinanzplan())).toBe(false);
  });

  it("nennt die Tragfähigkeit einer Kapitalgesellschaft nicht anwendbar", () => {
    const { berichte } = berichteFuer(beispielGmbh);
    const trag = leisteKennzahlen(berichte, [], false).find(
      (kennzahl) => kennzahl.id === "tragfaehigkeit",
    );
    expect(trag?.teile.map((teil) => teil.text).join(" ")).toBe("nicht anwendbar");
    expect(trag?.ziel).toBe("tragfaehigkeit");
    expect(berichte.tragfaehigkeit.anwendbar).toBe(false);
  });
});

function planMitUmsatz(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-leiste",
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
