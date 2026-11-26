// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  ERINNERUNG_NACH_MS,
  bewerteErinnerung,
  erinnerungGeschlossen,
  ladeArbeitSeit,
  ladeLetzteSicherung,
  loescheSicherungsstand,
  merkeArbeit,
  merkeSicherung,
  schliesseErinnerung,
} from "./sicherung.ts";

const STUNDE = 60 * 60 * 1000;
const ERSTELLT = "2026-04-20T08:00:00.000Z";

function bewerten(args: {
  geaendertAm?: string;
  letzteSicherung?: string | null;
  arbeitSeit?: string | null;
  jetzt: string;
}) {
  return bewerteErinnerung({
    erstelltAm: ERSTELLT,
    geaendertAm: args.geaendertAm ?? ERSTELLT,
    letzteSicherung: args.letzteSicherung ?? null,
    arbeitSeit: args.arbeitSeit ?? null,
    jetzt: Date.parse(args.jetzt),
  });
}

describe("Erinnerung an die Sicherung", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("wartet 30 Minuten ungesicherte Arbeit ab", () => {
    const beginn = "2026-04-20T09:00:00.000Z";
    const kurz = new Date(Date.parse(beginn) + ERINNERUNG_NACH_MS - 1).toISOString();
    const genau = new Date(Date.parse(beginn) + ERINNERUNG_NACH_MS).toISOString();
    expect(
      bewerten({
        geaendertAm: kurz,
        arbeitSeit: beginn,
        jetzt: kurz,
      }).faellig,
    ).toBe(false);
    const faellig = bewerten({
      geaendertAm: genau,
      arbeitSeit: beginn,
      letzteSicherung: "2026-04-19T09:00:00.000Z",
      jetzt: genau,
    });
    expect(faellig.faellig).toBe(true);
    expect(faellig.letzteSicherung).toBe("2026-04-19T09:00:00.000Z");
    expect(faellig.schluessel).toBe(`2026-04-19T09:00:00.000Z|${beginn}`);
  });

  it("erinnert ohne bisherige Datei erst nach der ersten Änderung", () => {
    expect(bewerten({ jetzt: new Date(Date.parse(ERSTELLT) + STUNDE).toISOString() }).faellig).toBe(
      false,
    );
    const geaendert = new Date(Date.parse(ERSTELLT) + 2 * STUNDE).toISOString();
    const jetzt = new Date(Date.parse(geaendert) + ERINNERUNG_NACH_MS).toISOString();
    expect(bewerten({ geaendertAm: geaendert, jetzt }).faellig).toBe(true);
    expect(bewerten({ geaendertAm: geaendert, jetzt }).schluessel).toBe("keine|offen");
  });

  it("ist sofort fällig, wenn nach einer Sicherung geändert wurde und der Beginn fehlt", () => {
    const sicherung = "2026-04-20T09:00:00.000Z";
    const geaendert = "2026-04-20T09:05:00.000Z";
    expect(
      bewerten({
        geaendertAm: geaendert,
        letzteSicherung: sicherung,
        jetzt: geaendert,
      }).faellig,
    ).toBe(true);
  });

  it("merkt Sicherung und Arbeitsbeginn und lässt sich für die Phase schließen", () => {
    const plan = { erstelltAm: ERSTELLT, geaendertAm: "2026-04-20T10:00:00.000Z" };
    merkeArbeit("neu", plan, "2026-04-20T10:00:00.000Z");
    merkeArbeit("neu", plan, "2026-04-20T11:00:00.000Z");
    expect(ladeArbeitSeit("neu")).toBe("2026-04-20T10:00:00.000Z");

    const bewertung = bewerten({
      geaendertAm: plan.geaendertAm,
      arbeitSeit: ladeArbeitSeit("neu"),
      jetzt: "2026-04-20T10:30:00.000Z",
    });
    expect(bewertung.faellig).toBe(true);
    schliesseErinnerung("neu", bewertung.schluessel);
    expect(erinnerungGeschlossen("neu", bewertung.schluessel)).toBe(true);

    merkeSicherung("neu", "2026-04-20T12:00:00.000Z");
    expect(ladeLetzteSicherung("neu")).toBe("2026-04-20T12:00:00.000Z");
    expect(ladeArbeitSeit("neu")).toBeNull();
    expect(erinnerungGeschlossen("neu", bewertung.schluessel)).toBe(false);
    expect(
      bewerten({
        geaendertAm: plan.geaendertAm,
        letzteSicherung: ladeLetzteSicherung("neu"),
        jetzt: "2026-04-20T12:00:00.000Z",
      }).ungesichert,
    ).toBe(false);

    loescheSicherungsstand("neu");
    expect(ladeLetzteSicherung("neu")).toBeNull();
  });
});
