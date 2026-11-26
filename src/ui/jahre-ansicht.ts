const SCHLUESSEL = "finanzplaner.jahre.";

/**
 * Aufgeklappte Planjahre je Plan, nur für diese Sitzung.
 *
 * Fehlender Eintrag heißt: alle Jahre eingeklappt. Die Jahressummen sind die
 * Übersicht, die Monate die Ausnahme. Ein neuer Aufruf startet deshalb wieder
 * eingeklappt. localStorage bleibt den Plandaten vorbehalten.
 */
export function leseOffeneJahre(planId: string): Set<number> {
  try {
    const roh = sessionStorage.getItem(SCHLUESSEL + planId);
    if (!roh) return new Set();
    const liste: unknown = JSON.parse(roh);
    if (!Array.isArray(liste)) return new Set();
    return new Set(
      liste.filter((eintrag): eintrag is number => Number.isInteger(eintrag) && eintrag > 0),
    );
  } catch {
    return new Set();
  }
}

export function merkeOffeneJahre(planId: string, offen: ReadonlySet<number>): void {
  try {
    sessionStorage.setItem(SCHLUESSEL + planId, JSON.stringify([...offen].sort((a, b) => a - b)));
  } catch {
    // Die Ansicht bleibt in der Sitzung, auch wenn der Speicher voll ist.
  }
}
