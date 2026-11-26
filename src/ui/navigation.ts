/** Dieselben Ansichten wie `PLAN_REITER`, in derselben Reihenfolge. Die Route bleibt flach. */
export const REITER = [
  { id: "assistent", label: "Assistent", fach: null },
  { id: "ueberblick", label: "Überblick", fach: null },
  { id: "szenarien", label: "Szenarien", fach: null },
  { id: "pruefung", label: "Prüfen", fach: null },
  { id: "eingaben", label: "Alle Eingaben", fach: null },
  { id: "rentabilitaet", label: "Gewinn und Verlust", fach: "Rentabilitätsvorschau" },
  { id: "liquiditaet", label: "Kontostand je Monat", fach: "Liquiditätsplan" },
  { id: "kapital", label: "Was Sie brauchen", fach: "Kapitalbedarf und Finanzierung" },
  { id: "anlagen", label: "Anschaffungen und Kredite", fach: "Investitionen und Darlehen" },
  { id: "tragfaehigkeit", label: "Reicht es zum Leben?", fach: "Privatbedarf und Tragfähigkeit" },
] as const;

export type ReiterId = (typeof REITER)[number]["id"];

export const HAUPTREITER = [
  { id: "eingeben", label: "Eingeben", kinder: ["assistent", "eingaben"] },
  {
    id: "ergebnisse",
    label: "Ergebnisse",
    kinder: ["ueberblick", "rentabilitaet", "liquiditaet", "kapital", "anlagen", "tragfaehigkeit"],
  },
  { id: "pruefen", label: "Prüfen", kinder: ["pruefung"] },
  { id: "szenarien", label: "Szenarien", kinder: ["szenarien"] },
] as const;

export type HauptId = (typeof HAUPTREITER)[number]["id"];
export type HauptReiter = (typeof HAUPTREITER)[number];

export function reiterVon(id: ReiterId): (typeof REITER)[number] {
  const eintrag = REITER.find((kandidat) => kandidat.id === id);
  if (!eintrag) throw new Error(`Unbekannter Reiter ${id}.`);
  return eintrag;
}

export function hauptVon(reiter: ReiterId): HauptReiter {
  for (const haupt of HAUPTREITER) {
    if ((haupt.kinder as readonly ReiterId[]).includes(reiter)) return haupt;
  }
  throw new Error(`Kein Hauptbereich für ${reiter}.`);
}

export function hatUnterreiter(haupt: HauptReiter): boolean {
  return haupt.kinder.length > 1;
}
