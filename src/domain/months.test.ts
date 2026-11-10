import { describe, expect, it } from "vitest";
import { addMonths, horizonEnd, isWithinHorizon, monthIndex, toIsoMonth } from "./months.ts";

describe("Monate", () => {
  it("rechnet über die Jahresgrenze", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthIndex("2026-04", "2026-05")).toBe(1);
    expect(monthIndex("2026-04", "2026-04")).toBe(0);
  });

  it("begrenzt den Horizont auf 36 Monate einschließlich des Starts", () => {
    expect(horizonEnd("2026-04")).toBe("2029-03");
    expect(isWithinHorizon("2026-04", "2026-04")).toBe(true);
    expect(isWithinHorizon("2026-04", "2029-03")).toBe(true);
    expect(isWithinHorizon("2026-04", "2029-04")).toBe(false);
    expect(isWithinHorizon("2026-04", "2026-03")).toBe(false);
  });

  it("bildet einen UTC-Monat", () => {
    expect(toIsoMonth(new Date("2026-01-15T23:30:00.000Z"))).toBe("2026-01");
  });
});
