/**
 * Geldbeträge bleiben ganze Cent.
 * Kaufmännische Rundung: 0,5 Cent und darüber wird von null weg gerundet.
 */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Betrag ist nicht endlich und kann nicht gerundet werden.");
  }
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(value));
}

const RATE_SCALE = 1_000_000_000_000n;

/**
 * Rundet `cents * satz` auf ganze Cent.
 * Der Satz wird auf 12 Nachkommastellen gerastert und danach ganzzahlig gerechnet,
 * damit Sätze wie 19 % oder 2,40 % nicht an der binären Gleitkommadarstellung hängen.
 */
export function roundRate(cents: number, rate: number): number {
  if (rate === 0 || cents === 0) return 0;
  const scaledRate = BigInt(Math.round(rate * 1e12));
  const numerator = BigInt(Math.trunc(cents)) * scaledRate;
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return Number(sign * ((absolute + RATE_SCALE / 2n) / RATE_SCALE));
}

/** Monatszins = Restschuld × Jahreszins / 12, auf ganze Cent gerundet. */
export function zinsMonatCents(restschuldCents: number, nominalzinsPa: number): number {
  if (restschuldCents === 0 || nominalzinsPa === 0) return 0;
  const scaledRate = BigInt(Math.round(nominalzinsPa * 1e12));
  const numerator = BigInt(Math.trunc(restschuldCents)) * scaledRate;
  const denominator = 12n * RATE_SCALE;
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return Number(sign * ((absolute + denominator / 2n) / denominator));
}

/**
 * Verteilt eine Summe auf gleich große Monatsraten.
 * Die ersten Monate bekommen den kaufmännisch gerundeten Monatswert, der letzte den Rest,
 * damit die Summe exakt aufgeht. Würde der Rest negativ, wird stattdessen abgerundet.
 */
export function verteilteRaten(
  summeCents: number,
  monate: number,
): { regulaer: number; letzte: number } {
  if (!Number.isInteger(summeCents)) {
    throw new Error("Die verteilte Summe muss in ganzen Cent vorliegen.");
  }
  if (!Number.isInteger(monate) || monate < 1) {
    throw new Error("Die Verteilung braucht mindestens einen Monat.");
  }
  if (monate === 1) return { regulaer: summeCents, letzte: summeCents };
  let regulaer = roundCents(summeCents / monate);
  let letzte = summeCents - regulaer * (monate - 1);
  if (letzte < 0) {
    regulaer = Math.floor(summeCents / monate);
    letzte = summeCents - regulaer * (monate - 1);
  }
  return { regulaer, letzte };
}

/**
 * Annuität auf ganze Cent, einmal gerundet.
 * Formel: Nominal × r × (1+r)^n / ((1+r)^n − 1), r = Jahreszins / 12.
 * Bei Zinssatz 0 ist die Rate die gleichmäßige Tilgung ohne den Ausgleich im letzten Monat.
 */
export function annuitaetCents(
  nominalCents: number,
  nominalzinsPa: number,
  monate: number,
): number {
  if (monate < 1) return 0;
  if (nominalzinsPa === 0) return verteilteRaten(nominalCents, monate).regulaer;
  const monthly = nominalzinsPa / 12;
  const factor = (1 + monthly) ** monate;
  return roundCents((nominalCents * monthly * factor) / (factor - 1));
}
