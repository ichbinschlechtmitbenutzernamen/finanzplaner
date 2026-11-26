/**
 * Erinnerung an eine Sicherungsdatei.
 *
 * Der Hinweis erscheint, wenn der eigene Plan seit der letzten Sicherung geändert
 * wurde und diese ungesicherte Arbeit mindestens 30 Minuten andauert. 30 Minuten
 * sind die kürzere der beiden naheliegenden Spannen: Der Plan liegt nur im Browser,
 * ein Tag wäre dafür lang.
 *
 * Beginn der ungesicherten Arbeit ist die erste Änderung nach der letzten Sicherung.
 * Liegt dieser Beginn nicht vor und es gibt auch keine Sicherung, zählt `geaendertAm`.
 * Wurde schon gesichert, der Plan danach geändert und der Beginn fehlt, ist der
 * Hinweis sofort fällig. Schließen gilt für diese Phase und nur in der Sitzung.
 */

export const ERINNERUNG_NACH_MS = 30 * 60 * 1000;

export const SCHLUESSEL_SICHERUNG = "finanzplaner.sicherung.";
export const SCHLUESSEL_ARBEIT = "finanzplaner.arbeit.";
export const SCHLUESSEL_ERINNERUNG = "finanzplaner.erinnerung.";

export interface ErinnerungEingabe {
  erstelltAm: string;
  geaendertAm: string;
  letzteSicherung: string | null;
  /** Zeitpunkt der ersten Änderung nach der letzten Sicherung. */
  arbeitSeit: string | null;
  jetzt: number;
}

export interface ErinnerungBewertung {
  ungesichert: boolean;
  faellig: boolean;
  /** Bleibt gleich, solange dieselbe ungesicherte Phase andauert. */
  schluessel: string;
  letzteSicherung: string | null;
}

function zeit(wert: string | null): number | null {
  if (!wert) return null;
  const zahl = Date.parse(wert);
  return Number.isNaN(zahl) ? null : zahl;
}

export function bewerteErinnerung(eingabe: ErinnerungEingabe): ErinnerungBewertung {
  const sicherung = zeit(eingabe.letzteSicherung);
  const geaendert = zeit(eingabe.geaendertAm) ?? eingabe.jetzt;
  const erstellt = zeit(eingabe.erstelltAm) ?? geaendert;
  const ungesichert = sicherung == null ? geaendert > erstellt : geaendert > sicherung;
  const arbeit = zeit(eingabe.arbeitSeit);
  const arbeitGueltig = arbeit != null && (sicherung == null || arbeit > sicherung);

  let beginn = geaendert;
  if (!ungesichert) beginn = eingabe.jetzt;
  else if (arbeitGueltig && arbeit != null) beginn = arbeit;
  else if (sicherung != null) beginn = eingabe.jetzt - ERINNERUNG_NACH_MS;

  const schluessel = ungesichert
    ? `${eingabe.letzteSicherung ?? "keine"}|${arbeitGueltig ? eingabe.arbeitSeit : "offen"}`
    : "gesichert";

  return {
    ungesichert,
    faellig: ungesichert && eingabe.jetzt - beginn >= ERINNERUNG_NACH_MS,
    schluessel,
    letzteSicherung: eingabe.letzteSicherung,
  };
}

export function ladeLetzteSicherung(id: string): string | null {
  return localStorage.getItem(SCHLUESSEL_SICHERUNG + id);
}

export function ladeArbeitSeit(id: string): string | null {
  return localStorage.getItem(SCHLUESSEL_ARBEIT + id);
}

/** Merkt die Datei und beendet die ungesicherte Phase. */
export function merkeSicherung(id: string, zeitpunkt: string): void {
  localStorage.setItem(SCHLUESSEL_SICHERUNG + id, zeitpunkt);
  localStorage.removeItem(SCHLUESSEL_ARBEIT + id);
  sessionStorage.removeItem(SCHLUESSEL_ERINNERUNG + id);
}

/**
 * Setzt den Beginn der ungesicherten Arbeit, sobald der Plan nach der letzten
 * Sicherung (oder nach dem Anlegen) geändert wurde. Ein späteres Speichern im
 * Browser verschiebt den Beginn nicht.
 */
export function merkeArbeit(
  id: string,
  plan: { erstelltAm: string; geaendertAm: string },
  jetztIso: string,
): void {
  const letzteSicherung = ladeLetzteSicherung(id);
  const arbeitSeit = ladeArbeitSeit(id);
  const bewertung = bewerteErinnerung({
    erstelltAm: plan.erstelltAm,
    geaendertAm: plan.geaendertAm,
    letzteSicherung,
    arbeitSeit,
    jetzt: Date.parse(jetztIso),
  });
  if (!bewertung.ungesichert) {
    if (arbeitSeit) localStorage.removeItem(SCHLUESSEL_ARBEIT + id);
    return;
  }
  const beginn = zeit(arbeitSeit);
  const sicherung = zeit(letzteSicherung);
  if (beginn == null || (sicherung != null && beginn <= sicherung)) {
    localStorage.setItem(SCHLUESSEL_ARBEIT + id, jetztIso);
  }
}

export function loescheSicherungsstand(id: string): void {
  localStorage.removeItem(SCHLUESSEL_SICHERUNG + id);
  localStorage.removeItem(SCHLUESSEL_ARBEIT + id);
  sessionStorage.removeItem(SCHLUESSEL_ERINNERUNG + id);
}

export function schliesseErinnerung(id: string, schluessel: string): void {
  sessionStorage.setItem(SCHLUESSEL_ERINNERUNG + id, schluessel);
}

export function erinnerungGeschlossen(id: string, schluessel: string): boolean {
  return sessionStorage.getItem(SCHLUESSEL_ERINNERUNG + id) === schluessel;
}
