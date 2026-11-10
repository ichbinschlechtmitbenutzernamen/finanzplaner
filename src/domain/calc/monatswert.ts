import { monthIndex, parseIsoMonth } from "../months.ts";
import type { IsoMonth, MengenVorgabe, MonatswertVorgabe, Wachstumsmodus } from "../types.ts";
import { roundCents } from "./round.ts";

/**
 * Monatlich aufgezinst: (1 + Jahresrate) hoch (Abstand / 12).
 * Jahressprung: (1 + Jahresrate) hoch (ganze Jahre, abgerundet).
 * Negative Abstände bleiben gültig: vor dem Bezugsmonat wirkt der vorherige Schritt.
 */
export function wachstumsfaktor(
  jahresrate: number,
  modus: Wachstumsmodus,
  abstandMonate: number,
): number {
  if (modus === "yearly_step") {
    return (1 + jahresrate) ** Math.floor(abstandMonate / 12);
  }
  return (1 + jahresrate) ** (abstandMonate / 12);
}

function saisonfaktor(faktoren: readonly number[] | undefined, monat: IsoMonth): number {
  if (!faktoren) return 1;
  const { month } = parseIsoMonth(monat);
  return faktoren[month - 1] ?? 1;
}

/** Basis × Wachstum × Saisonfaktor des Kalendermonats, am Ende auf Cent. Eine Ausnahme ersetzt das. */
export function monatsbetragCents(
  vorgabe: MonatswertVorgabe,
  monat: IsoMonth,
  planStart: IsoMonth,
): number {
  const override = vorgabe.monatsOverride?.find((item) => item.monat === monat);
  if (override) return override.wertCents;
  const bezug = vorgabe.bezugsmonat ?? planStart;
  const wachstum = vorgabe.wachstum
    ? wachstumsfaktor(vorgabe.wachstum.jahresrate, vorgabe.wachstum.modus, monthIndex(bezug, monat))
    : 1;
  return roundCents(vorgabe.basisCents * wachstum * saisonfaktor(vorgabe.saison?.faktoren, monat));
}

/** Wie der Geldbetrag, aber ohne Rundung: Mengen bleiben Stück, Stunden oder Projekte. */
export function mengeImMonat(vorgabe: MengenVorgabe, monat: IsoMonth, planStart: IsoMonth): number {
  const override = vorgabe.monatsOverride?.find((item) => item.monat === monat);
  if (override) return override.wert;
  const bezug = vorgabe.bezugsmonat ?? planStart;
  const wachstum = vorgabe.wachstum
    ? wachstumsfaktor(vorgabe.wachstum.jahresrate, vorgabe.wachstum.modus, monthIndex(bezug, monat))
    : 1;
  return vorgabe.basis * wachstum * saisonfaktor(vorgabe.saison?.faktoren, monat);
}

/** Einschließlich von und bis. Fehlende Grenzen lassen das Fenster offen. */
export function istAktiv(monat: IsoMonth, von?: IsoMonth, bis?: IsoMonth): boolean {
  if (von !== undefined && monthIndex(von, monat) < 0) return false;
  if (bis !== undefined && monthIndex(monat, bis) < 0) return false;
  return true;
}
