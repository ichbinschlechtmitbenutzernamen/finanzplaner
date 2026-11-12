const EURO = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const PROZENT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const ZAHL = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function formatEuro(cents: number): string {
  return EURO.format(cents / 100);
}

export function formatProzent(satz: number): string {
  return PROZENT.format(satz);
}

export function formatMonat(iso: string): string {
  const [jahr, monat] = iso.split("-");
  const name = MONATE[Number(monat) - 1] ?? iso;
  return `${name} ${jahr ?? ""}`.trim();
}

export function formatAnzahl(wert: number, einzahl: string, mehrzahl: string): string {
  return `${ZAHL.format(wert)} ${wert === 1 ? einzahl : mehrzahl}`;
}

export function summeBereich(werte: readonly number[], von: number, bis: number): number {
  let summe = 0;
  for (let index = von; index < bis; index += 1) summe += werte[index] ?? 0;
  return summe;
}
