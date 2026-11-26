// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import type { Finanzplan } from "../../domain/types.ts";
import { PDF_KAPITEL_LABEL } from "../../domain/pdf/kapitel.ts";
import { setzeAktivesSzenario } from "../../domain/szenarien/index.ts";
import { PlanArbeitsflaeche } from "../PlanArbeitsflaeche.tsx";

afterEach(() => cleanup());

function flaeche(plan: Finanzplan, onSpeichern: (plan: Finanzplan) => void = () => undefined) {
  return (
    <PlanArbeitsflaeche
      anfangsplan={plan}
      beispiele={[{ id: plan.id, label: plan.stammdaten.firmenname }]}
      beispielId={plan.id}
      reiter="ueberblick"
      onBeispiel={() => undefined}
      onReiter={() => undefined}
      onNeu={() => undefined}
      onSpeichern={onSpeichern}
      onZuruecksetzen={() => undefined}
    />
  );
}

describe("PDF-Dialog", () => {
  it("öffnet die Kapitel und lässt sie abwählen", async () => {
    const user = userEvent.setup();
    const gespeichert: Finanzplan[] = [];
    render(flaeche(beispielElektro, (plan) => gespeichert.push(plan)));

    await user.click(screen.getByRole("button", { name: "PDF erstellen" }));
    const dialog = screen.getByRole("dialog", { name: "PDF erstellen" });
    expect(dialog).toBeTruthy();
    for (const label of Object.values(PDF_KAPITEL_LABEL)) {
      const feld = screen.getByRole("checkbox", { name: label });
      expect((feld as HTMLInputElement).checked).toBe(true);
    }

    expect((screen.getByRole("radio", { name: "Basisplan" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByRole("radio", { name: "Vorsichtig" })).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Optimistisch" }));
    expect((screen.getByRole("radio", { name: "Optimistisch" }) as HTMLInputElement).checked).toBe(
      true,
    );

    await user.click(screen.getByRole("checkbox", { name: "Deckblatt" }));
    expect(gespeichert.at(-1)?.pdfExport.kapitel).not.toContain("deckblatt");
    expect(gespeichert.at(-1)?.pdfExport.kapitel).toContain("liquiditaet");
  });

  it("übernimmt das aktive Szenario und lässt es wechseln", async () => {
    const user = userEvent.setup();
    render(flaeche(setzeAktivesSzenario(beispielElektro, "szenario-vorsichtig")));
    await user.click(screen.getByRole("button", { name: "PDF erstellen" }));
    const vorsichtig = screen.getByRole("radio", { name: "Vorsichtig" });
    expect((vorsichtig as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Basisplan" }) as HTMLInputElement).checked).toBe(
      false,
    );
    expect(document.activeElement).toBe(vorsichtig);
    await user.click(screen.getByRole("radio", { name: "Basisplan" }));
    expect((screen.getByRole("radio", { name: "Basisplan" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("hält den Fokus im Dialog und gibt ihn an die Schaltfläche zurück", async () => {
    const user = userEvent.setup();
    render(flaeche(beispielElektro));
    const oeffnen = screen.getByRole("button", { name: "PDF erstellen" });
    await user.click(oeffnen);
    const dialog = screen.getByRole("dialog", { name: "PDF erstellen" });
    const erste = within(dialog).getByRole("radio", { name: "Basisplan" });
    const letzte = within(dialog).getByRole("button", { name: "Abbrechen" });
    expect(document.activeElement).toBe(erste);
    letzte.focus();
    await user.tab();
    expect(document.activeElement).toBe(erste);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(letzte);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(oeffnen);
  });

  it("blendet die Tragfähigkeit bei der GmbH aus", async () => {
    const user = userEvent.setup();
    render(flaeche(beispielGmbh));
    await user.click(screen.getByRole("button", { name: "PDF erstellen" }));
    expect(screen.queryByRole("checkbox", { name: /Tragfähigkeit/ })).toBeNull();
    expect(screen.getByText(/Bei dieser Rechtsform entfällt das Kapitel/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Deckblatt" })).toBeTruthy();
  });
});
