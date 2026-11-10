import { PLAN_HORIZON_MONTHS, type IsoMonth } from "./types.ts";

export const ISO_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isIsoMonth(value: string): value is IsoMonth {
  return ISO_MONTH_PATTERN.test(value);
}

export function parseIsoMonth(value: IsoMonth): { year: number; month: number } {
  const match = ISO_MONTH_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Kein Monat im Format JJJJ-MM: ${value}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** Abstand in Monaten. Positiv, wenn `month` nach `start` liegt. */
export function monthIndex(start: IsoMonth, month: IsoMonth): number {
  const from = parseIsoMonth(start);
  const to = parseIsoMonth(month);
  return (to.year - from.year) * 12 + (to.month - from.month);
}

export function addMonths(start: IsoMonth, offset: number): IsoMonth {
  const { year, month } = parseIsoMonth(start);
  const total = year * 12 + (month - 1) + offset;
  const nextYear = Math.floor(total / 12);
  const nextMonth = total - nextYear * 12 + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

export function isWithinHorizon(
  start: IsoMonth,
  month: IsoMonth,
  horizon: number = PLAN_HORIZON_MONTHS,
): boolean {
  const index = monthIndex(start, month);
  return index >= 0 && index < horizon;
}

/** Letzter Monat des Horizonts, einschließlich. */
export function horizonEnd(start: IsoMonth, horizon: number = PLAN_HORIZON_MONTHS): IsoMonth {
  return addMonths(start, horizon - 1);
}

/** Kalendermonat als `JJJJ-MM` in UTC, unabhängig von der Zeitzone des Rechners. */
export function toIsoMonth(date: Date): IsoMonth {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
