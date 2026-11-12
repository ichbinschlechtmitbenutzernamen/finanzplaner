import { describe, expect, it } from "vitest";
import { beispielplaene } from "../../fixtures/index.ts";
import { berechnePlan } from "../calc/berechnen.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import { formatEuro } from "./format.ts";
import { meldungenFuerExport, pruefePlan } from "./index.ts";

const NULL_EURO = formatEuro(0);

/** Erwartete Meldungen der vier Beispiele, in der Anzeigereihenfolge. */
const ERWARTET: Record<string, { id: string; stufe: string; kategorie: string; text: string }[]> = {
  elektro: [
    {
      id: "liquiditaet-kontostand",
      stufe: "fehler",
      kategorie: "liquiditaet",
      text: `Kontostand unter ${NULL_EURO}, der Kontokorrentbedarf ist nicht gedeckt.`,
    },
    {
      id: "tragfaehigkeit-planjahr2-person-jonas-heller",
      stufe: "fehler",
      kategorie: "tragfaehigkeit",
      text: `Verfügbares Einkommen von Jonas Heller (fiktiv) im Planjahr 2 liegt unter ${NULL_EURO}.`,
    },
    {
      id: "umsatz-anlauf",
      stufe: "hinweis",
      kategorie: "umsatz",
      text: "Der Umsatz startet ohne Anlaufphase auf vollem Niveau.",
    },
  ],
  cafe: [
    {
      id: "kosten-steuerberatung-fehlt",
      stufe: "hinweis",
      kategorie: "kosten",
      text: "Es ist keine Steuerberatung oder Buchhaltung erfasst.",
    },
  ],
  gmbh: [
    {
      id: "umsatz-anlauf",
      stufe: "hinweis",
      kategorie: "umsatz",
      text: "Der Umsatz startet ohne Anlaufphase auf vollem Niveau.",
    },
    {
      id: "kosten-steuerberatung-fehlt",
      stufe: "hinweis",
      kategorie: "kosten",
      text: "Es ist keine Steuerberatung oder Buchhaltung erfasst.",
    },
    {
      id: "kosten-versicherung-fehlt",
      stufe: "hinweis",
      kategorie: "kosten",
      text: "Es ist keine Versicherung erfasst.",
    },
  ],
  nordlicht: [
    {
      id: "umsatz-anlauf",
      stufe: "hinweis",
      kategorie: "umsatz",
      text: "Der Umsatz startet ohne Anlaufphase auf vollem Niveau.",
    },
  ],
};

describe("Meldungen der Beispiele", () => {
  it.each(beispielplaene)("$label", ({ id, plan }) => {
    const berichte = erstelleBerichte(plan, berechnePlan(plan));
    const liste = pruefePlan(plan, berichte);
    expect(
      liste.map(({ id: meldungId, stufe, kategorie, text }) => ({
        id: meldungId,
        stufe,
        kategorie,
        text,
      })),
    ).toEqual(ERWARTET[id]);
    for (const meldung of liste) {
      expect(meldung.begruendung).toMatch(/\d/);
      expect(meldung.ziel.tabelle ?? meldung.ziel.assistent).toBeTruthy();
    }
    const exportiert = meldungenFuerExport(plan, berichte);
    expect(exportiert.map((meldung) => meldung.id)).toEqual(liste.map((meldung) => meldung.id));
    expect(exportiert.every((meldung) => meldung.stufeText.length > 0)).toBe(true);
  });
});
