import { describe, expect, it } from "vitest";
import { beispielplaene } from "../../fixtures/index.ts";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import { berechnePlan } from "../calc/berechnen.ts";
import { meldungenFuerExport } from "../checks/index.ts";
import { createDraftFinanzplan } from "../empty-plan.ts";
import { migratePlan } from "../migrate.ts";
import { findeZeile } from "../reports/planjahr.ts";
import { erstelleBerichte } from "../reports/berichte.ts";
import {
  kontostandVerlauf,
  kostenstruktur,
  kumuliertesErgebnis,
  mittelherkunftVerwendung,
  ueberblickKpis,
  umsatzGegenKosten,
} from "../reports/diagramme.ts";
import { planFuerSzenario } from "../szenarien/anwenden.ts";
import { vergleichFuerExport } from "../szenarien/vergleich.ts";
import { PDF_KAPITEL, type Finanzplan } from "../types.ts";
import { pdfDateiname, standardPdfExport } from "./kapitel.ts";
import { erstellePdfDokument } from "./modell.ts";

const DATUM = new Date("2026-11-12T12:00:00.000Z");

describe("PDF-Datenmodell", () => {
  it("übernimmt Summen, Kennzahlen und Diagramme aus den Berichten", () => {
    for (const { plan } of beispielplaene) {
      const dokument = erstellePdfDokument(plan, DATUM);
      expect(dokument.vergleich).toEqual(vergleichFuerExport(plan));
      expect(dokument.vergleich?.map((spalte) => spalte.name)).toEqual([
        "Basisplan",
        "Vorsichtig",
        "Optimistisch",
      ]);
      expect(dokument.szenarien.map((abschnitt) => abschnitt.name)).toEqual(["Basisplan"]);
      for (const abschnitt of dokument.szenarien) {
        const effektiv = planFuerSzenario(plan, abschnitt.id);
        const berichte = erstelleBerichte(effektiv, berechnePlan(effektiv));
        const umsatz = findeZeile(berichte.rentabilitaet.zeilen, "umsatz");
        const ergebnis = findeZeile(berichte.rentabilitaet.zeilen, "ergebnis-nach-steuern");
        expect(abschnitt.berichte).toEqual(berichte);
        expect(abschnitt.kpis).toEqual(ueberblickKpis(berichte));
        expect(abschnitt.kpis?.gesamt.umsatzCents).toBe(umsatz.summeCents);
        expect(abschnitt.kpis?.gesamt.ergebnisNachSteuernCents).toBe(ergebnis.summeCents);
        expect(abschnitt.kpis?.breakEven).toEqual(berichte.kennzahlen.breakEven);
        expect(abschnitt.kpis?.tiefsterKontostandCents).toBe(
          berichte.kennzahlen.tiefsterLiquiditaetsstandCents,
        );
        expect(abschnitt.berichte?.kapital.summeBedarf.betragCents).toBe(
          berichte.kapital.summeBedarf.betragCents,
        );
        expect(abschnitt.berichte?.liquiditaet.endbestand.monateCents).toEqual(
          berichte.liquiditaet.endbestand.monateCents,
        );
        expect(abschnitt.diagramme).toEqual({
          umsatzGegenKosten: umsatzGegenKosten(berichte, "monate"),
          umsatzGegenKostenPlanjahre: umsatzGegenKosten(berichte, "planjahre"),
          kontostand: kontostandVerlauf(berichte, "monate"),
          kumuliertesErgebnis: kumuliertesErgebnis(berichte, "monate"),
          kostenstruktur: kostenstruktur(berichte, "planjahre"),
          mittelherkunft: mittelherkunftVerwendung(berichte, "planjahre"),
        });
        expect(abschnitt.meldungen).toEqual(meldungenFuerExport(effektiv, berichte));
        expect(abschnitt.kapitel).toEqual(
          PDF_KAPITEL.filter(
            (id) =>
              id !== "vergleich" && (id !== "tragfaehigkeit" || berichte.tragfaehigkeit.anwendbar),
          ),
        );
      }
    }
  });

  it("lässt abgewählte Kapitel weg", () => {
    const plan: Finanzplan = structuredClone(beispielCafe);
    plan.pdfExport = { kapitel: ["deckblatt", "liquiditaet"] };
    const dokument = erstellePdfDokument(plan, DATUM);
    expect(dokument.vergleich).toBeNull();
    expect(dokument.kapitelGespeichert).toEqual(["deckblatt", "liquiditaet"]);
    for (const abschnitt of dokument.szenarien) {
      expect(abschnitt.kapitel).toEqual(["deckblatt", "liquiditaet"]);
      expect(abschnitt.berichte?.liquiditaet.endbestand.monateCents).toHaveLength(36);
    }
  });

  it("blendet die Tragfähigkeit bei der GmbH aus und zeigt sie beim Einzelunternehmen", () => {
    const gmbh = erstellePdfDokument(beispielGmbh, DATUM);
    expect(gmbh.kapitelGespeichert).toContain("tragfaehigkeit");
    for (const abschnitt of gmbh.szenarien) {
      expect(abschnitt.kapitel).not.toContain("tragfaehigkeit");
      expect(abschnitt.berichte?.tragfaehigkeit.anwendbar).toBe(false);
    }
    const elektro = erstellePdfDokument(beispielElektro, DATUM);
    expect(elektro.szenarien[0]?.kapitel).toContain("tragfaehigkeit");
    expect(elektro.szenarien[0]?.berichte?.tragfaehigkeit.anwendbar).toBe(true);
  });

  it("führt nur das gewählte Szenario vollständig und die übrigen im Vergleich", () => {
    const basis = erstellePdfDokument(beispielElektro, DATUM);
    expect(basis.szenarien).toHaveLength(1);
    expect(basis.szenarien[0]?.id).toBe("basis");
    expect(basis.vergleich?.map((spalte) => spalte.name)).toEqual([
      "Basisplan",
      "Vorsichtig",
      "Optimistisch",
    ]);

    const vorsichtig = erstellePdfDokument(beispielElektro, DATUM, "szenario-vorsichtig");
    expect(vorsichtig.szenarien.map((abschnitt) => abschnitt.name)).toEqual(["Vorsichtig"]);
    const effektiv = planFuerSzenario(beispielElektro, "szenario-vorsichtig");
    const berichte = erstelleBerichte(effektiv, berechnePlan(effektiv));
    const abschnitt = vorsichtig.szenarien[0];
    expect(abschnitt?.berichte).toEqual(berichte);
    expect(abschnitt?.meldungen).toEqual(meldungenFuerExport(effektiv, berichte));
    const fehler = abschnitt?.meldungen.filter((meldung) => meldung.stufe === "fehler").length ?? 0;
    if (fehler > 0) expect(abschnitt?.fehlerVermerk).toContain(String(fehler));
    else expect(abschnitt?.fehlerVermerk).toBeNull();
    expect(vorsichtig.vergleich).toEqual(vergleichFuerExport(beispielElektro));
    expect(vorsichtig.vergleich?.every((spalte) => spalte.umsatzPlanjahreCents.length > 0)).toBe(
      true,
    );

    const unbekannt = erstellePdfDokument(beispielElektro, DATUM, "gibt-es-nicht");
    expect(unbekannt.szenarien.map((eintrag) => eintrag.name)).toEqual(["Basisplan"]);
  });

  it("setzt den Fehlervermerk nur bei Fehlern", () => {
    for (const { id, plan } of beispielplaene) {
      const dokument = erstellePdfDokument(plan, DATUM);
      for (const abschnitt of dokument.szenarien) {
        const fehler = abschnitt.meldungen.filter((meldung) => meldung.stufe === "fehler").length;
        expect(abschnitt.fehlerAnzahl).toBe(fehler);
        if (fehler > 0) {
          expect(abschnitt.fehlerVermerk).toContain(`${fehler}`);
          expect(abschnitt.fehlerVermerk).toMatch(/Fehler/);
        } else {
          expect(abschnitt.fehlerVermerk).toBeNull();
        }
      }
      if (id === "elektro") expect(dokument.szenarien[0]?.fehlerVermerk).toBeTruthy();
      if (id === "cafe" || id === "gmbh" || id === "nordlicht") {
        expect(dokument.szenarien[0]?.fehlerVermerk).toBeNull();
      }
    }
  });

  it("nennt Vorhaben und Datum im Dateinamen", () => {
    expect(pdfDateiname("Café Leseecke", DATUM)).toBe("Café-Leseecke-2026-11-12.pdf");
    expect(erstellePdfDokument(beispielElektro, DATUM).dateiname).toBe(
      "Blitzweg-Elektrotechnik-2026-11-12.pdf",
    );
    expect(erstellePdfDokument(beispielGmbh, DATUM).dateiname).toBe(
      "Hafenlicht-GmbH-2026-11-12.pdf",
    );
  });

  it("bleibt bei einem Entwurf ohne Startmonat ausführbar", () => {
    const entwurf = createDraftFinanzplan({ id: "entwurf-pdf", now: DATUM });
    const dokument = erstellePdfDokument(entwurf, DATUM);
    expect(dokument.szenarien).toHaveLength(1);
    expect(dokument.vergleich).toHaveLength(1 + entwurf.planSzenarien.eintraege.length);
    expect(dokument.szenarien[0]?.berichte).toBeNull();
    expect(dokument.szenarien[0]?.fehlerText).toBeTruthy();
    expect(dokument.szenarien[0]?.fehlerVermerk).toBeNull();
    expect(dokument.szenarien[0]?.kapitel).toEqual(["deckblatt", "pruefung"]);
  });
});

describe("Migration auf Schema 12", () => {
  it("legt bei Version 11 alle Kapitel an und behält eine vorhandene Auswahl", () => {
    const roh = structuredClone(beispielElektro) as unknown as Record<string, unknown>;
    roh.schemaVersion = 11;
    delete roh.pdfExport;
    const migriert = migratePlan(roh);
    expect(migriert.schemaVersion).toBe(12);
    expect(migriert.pdfExport).toEqual(standardPdfExport());
    expect(migriert.finanzierung).toEqual(beispielElektro.finanzierung);
    expect(migriert.planSzenarien).toEqual(beispielElektro.planSzenarien);

    const behalten = structuredClone(beispielCafe) as unknown as Record<string, unknown>;
    behalten.schemaVersion = 11;
    (behalten.pdfExport as { kapitel: string[] }).kapitel = ["deckblatt", "pruefung"];
    const mitAuswahl = migratePlan(behalten);
    expect(mitAuswahl.schemaVersion).toBe(12);
    expect(mitAuswahl.pdfExport.kapitel).toEqual(["deckblatt", "pruefung"]);
  });
});
