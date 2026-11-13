// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { EXCEL_BLATT_LABEL } from "../../domain/excel/blaetter.ts";
import type { Finanzplan } from "../../domain/types.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
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

describe("Excel-Dialog", () => {
  it("öffnet die Blätter und lässt sie abwählen", async () => {
    const user = userEvent.setup();
    const gespeichert: Finanzplan[] = [];
    render(flaeche(beispielElektro, (plan) => gespeichert.push(plan)));

    await user.click(screen.getByRole("button", { name: "Excel erstellen" }));
    const dialog = screen.getByRole("dialog", { name: "Excel erstellen" });
    expect(dialog).toBeTruthy();
    for (const label of Object.values(EXCEL_BLATT_LABEL)) {
      const feld = screen.getByRole("checkbox", { name: label });
      expect((feld as HTMLInputElement).checked).toBe(true);
    }

    expect((screen.getByRole("radio", { name: "Basisplan" }) as HTMLInputElement).checked).toBe(
      true,
    );
    await user.click(screen.getByRole("checkbox", { name: "Liquidität" }));
    expect(gespeichert.at(-1)?.excelExport.blaetter).not.toContain("liquiditaet");
    expect(gespeichert.at(-1)?.excelExport.blaetter).toContain("rentabilitaet");
  });

  it("blendet die Tragfähigkeit bei der GmbH aus", async () => {
    const user = userEvent.setup();
    render(flaeche(beispielGmbh));
    await user.click(screen.getByRole("button", { name: "Excel erstellen" }));
    expect(screen.queryByRole("checkbox", { name: /Tragfähigkeit/ })).toBeNull();
    expect(screen.getByText(/Bei dieser Rechtsform entfällt das Blatt/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Eingaben" })).toBeTruthy();
  });
});
