// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createEmptyFinanzplan } from "../domain/empty-plan.ts";
import type { Finanzplan } from "../domain/types.ts";
import { PlanArbeitsflaeche } from "./PlanArbeitsflaeche.tsx";

const START = "2026-04";

function planMitUmsatz(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-tabelle",
    now: new Date("2026-04-01T00:00:00.000Z"),
    startMonat: START,
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

describe("Tabelle", () => {
  it("ändert eine Zelle und macht die Änderung rückgängig", async () => {
    const user = userEvent.setup();
    render(
      <PlanArbeitsflaeche
        anfangsplan={planMitUmsatz()}
        beispiele={[{ id: "test", label: "Test" }]}
        beispielId="test"
        reiter="eingaben"
        onBeispiel={() => undefined}
        onReiter={() => undefined}
        onSpeichern={() => undefined}
        onZuruecksetzen={() => undefined}
      />,
    );

    const april = screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ });
    await user.click(april);
    await user.keyboard("{Enter}");
    const feld = screen.getByRole("textbox", { name: /Beratung, April 2026/ });
    await user.clear(feld);
    await user.type(feld, "1500");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.500,00/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(screen.getByRole("gridcell", { name: /Beratung, April 2026, 1\.000,00/ })).toBeTruthy();
  });
});
