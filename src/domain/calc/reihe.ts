export function leereReihe(laenge: number): number[] {
  return Array.from({ length: laenge }, () => 0);
}

export function addiere(ziel: number[], quelle: readonly number[]): void {
  for (let index = 0; index < ziel.length; index += 1) {
    ziel[index] = (ziel[index] ?? 0) + (quelle[index] ?? 0);
  }
}

export function summe(werte: readonly number[]): number {
  let total = 0;
  for (const wert of werte) total += wert;
  return total;
}

export function setzen(reihe: number[], index: number | null, betrag: number): void {
  if (index === null) return;
  const bisher = reihe[index];
  if (bisher === undefined) return;
  reihe[index] = bisher + betrag;
}
