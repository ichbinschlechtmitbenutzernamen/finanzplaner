import { describe, expect, it } from "vitest";
import { berechnePlan } from "../calc/index.ts";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "../../fixtures/beispiel-einzelunternehmen.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import type { Finanzplan } from "../types.ts";
import { erstelleBerichte } from "./berichte.ts";
import {
  KOSTEN_ZEILEN,
  kontostandVerlauf,
  kostenstruktur,
  kumuliertesErgebnis,
  mittelherkunftVerwendung,
  ueberblickKpis,
  umsatzGegenKosten,
} from "./diagramme.ts";
import { findeZeile, quote } from "./planjahr.ts";
import type { Berichte } from "./typen.ts";

const beispiele = [
  ["Blitzweg", beispielElektro],
  ["Café Leseecke", beispielCafe],
  ["Hafenlicht GmbH", beispielGmbh],
  ["Grafikstudio", beispielEinzelunternehmen],
] as const;

const berichte = new Map<string, Berichte>(
  beispiele.map(([name, plan]) => [name, erstelleBerichte(plan, berechnePlan(plan as Finanzplan))]),
);

function bericht(name: string): Berichte {
  const gefunden = berichte.get(name);
  if (!gefunden) throw new Error(name);
  return gefunden;
}

describe("Überblick-Kennzahlen", () => {
  it("übernimmt Break-even, Kontokorrent und Tragfähigkeit aus den Berichten", () => {
    const blitzweg = ueberblickKpis(bericht("Blitzweg"));
    const cafe = ueberblickKpis(bericht("Café Leseecke"));
    const hafenlicht = ueberblickKpis(bericht("Hafenlicht GmbH"));

    expect(blitzweg.breakEven).toMatchObject({
      erreicht: true,
      monat: "2026-06",
      planmonat: 1,
    });
    expect(cafe.breakEven).toMatchObject({ erreicht: true, monat: "2026-09", planmonat: 2 });
    expect(hafenlicht.breakEven).toMatchObject({
      erreicht: true,
      monat: "2026-01",
      planmonat: 1,
    });

    expect(blitzweg.kontokorrentbedarfCents).toBe(
      bericht("Blitzweg").kennzahlen.kontokorrentbedarfCents,
    );
    expect(blitzweg.kontokorrentbedarfCents).toBe(1_439_106);
    expect(Math.round(blitzweg.kontokorrentbedarfCents / 100)).toBe(14_391);
    expect(blitzweg.tiefsterKontostandCents).toBe(-1_439_106);

    expect(blitzweg.tragfaehigkeit.anwendbar).toBe(true);
    expect(blitzweg.tragfaehigkeit.personen[0]).toMatchObject({
      planjahr2Cents: -2_622_734,
      tragfaehig: false,
    });
    expect(Math.round((blitzweg.tragfaehigkeit.personen[0]?.planjahr2Cents ?? 0) / 100)).toBe(
      -26_227,
    );

    expect(cafe.tragfaehigkeit.anwendbar).toBe(true);
    expect(cafe.tragfaehigkeit.personen[0]).toMatchObject({
      planjahr2Cents: 2_536_131,
      tragfaehig: true,
    });
    expect(Math.round((cafe.tragfaehigkeit.personen[0]?.planjahr2Cents ?? 0) / 100)).toBe(25_361);
    expect(cafe.tragfaehigkeit.alleTragfaehig).toBe(true);

    expect(hafenlicht.tragfaehigkeit.anwendbar).toBe(false);
    expect(hafenlicht.tragfaehigkeit.personen).toEqual([]);
    expect(hafenlicht.tragfaehigkeit.alleTragfaehig).toBeNull();
    expect(hafenlicht.tragfaehigkeit.hinweis).toContain("GmbH");
  });

  it("liest Umsatz, Ergebnis und Quoten je Planjahr aus den Berichtszeilen", () => {
    for (const [name] of beispiele) {
      const quelle = bericht(name);
      const kpis = ueberblickKpis(quelle);
      const umsatz = findeZeile(quelle.rentabilitaet.zeilen, "umsatz");
      const ergebnis = findeZeile(quelle.rentabilitaet.zeilen, "ergebnis-nach-steuern");
      const personal = findeZeile(quelle.rentabilitaet.zeilen, "personal");

      expect(kpis.planjahre).toHaveLength(quelle.planjahre.length);
      kpis.planjahre.forEach((jahr, index) => {
        expect(jahr.bezeichnung).toBe(quelle.planjahre[index]?.bezeichnung);
        expect(jahr.vonMonat).toBe(quelle.planjahre[index]?.vonMonat);
        expect(jahr.umsatzCents).toBe(umsatz.planjahreCents[index]);
        expect(jahr.ergebnisNachSteuernCents).toBe(ergebnis.planjahreCents[index]);
        expect(jahr.rohertragsquote).toBe(
          quelle.kennzahlen.rohertragsquote.planjahre[index]?.quote,
        );
        expect(jahr.personalkostenquote).toBe(
          quote(personal.planjahreCents[index] ?? 0, umsatz.planjahreCents[index] ?? 0),
        );
      });
      expect(kpis.gesamt.umsatzCents).toBe(umsatz.summeCents);
      expect(kpis.gesamt.ergebnisNachSteuernCents).toBe(ergebnis.summeCents);
      expect(kpis.gesamt.rohertragsquote).toBe(quelle.kennzahlen.rohertragsquote.gesamt.quote);
      expect(kpis.gesamt.personalkostenquote).toBe(quote(personal.summeCents, umsatz.summeCents));
      expect(kpis.eigenkapitalquote).toBe(quelle.kennzahlen.eigenkapitalquote);
      expect(kpis.eigenmittelCents).toBe(quelle.kennzahlen.eigenmittelCents);
      expect(kpis.finanzierungCents).toBe(quelle.kennzahlen.finanzierungCents);
    }
  });
});

describe("Diagrammdaten", () => {
  it.each(beispiele.map(([name]) => name))(
    "hält für %s Umsatz minus Kosten und die Berichtssummen",
    (name) => {
      const quelle = bericht(name);
      const monate = umsatzGegenKosten(quelle, "monate");
      const jahre = umsatzGegenKosten(quelle, "planjahre");
      const ergebnis = findeZeile(quelle.rentabilitaet.zeilen, "ergebnis-nach-steuern");
      const umsatz = findeZeile(quelle.rentabilitaet.zeilen, "umsatz");

      expect(monate).toHaveLength(36);
      expect(jahre).toHaveLength(3);
      monate.forEach((punkt, index) => {
        expect(punkt.schluessel).toBe(quelle.monate[index]);
        expect(punkt.umsatzCents - punkt.kostenCents).toBe(ergebnis.monateCents[index]);
      });
      jahre.forEach((punkt, index) => {
        expect(punkt.umsatzCents - punkt.kostenCents).toBe(ergebnis.planjahreCents[index]);
      });
      expect(summe(monate, "umsatzCents")).toBe(umsatz.summeCents);
      expect(summe(jahre, "umsatzCents")).toBe(umsatz.summeCents);
      expect(summe(monate, "kostenCents")).toBe(summe(jahre, "kostenCents"));

      const strukturMonate = kostenstruktur(quelle, "monate");
      const strukturJahre = kostenstruktur(quelle, "planjahre");
      expect(strukturMonate[0]?.anteile.map((anteil) => anteil.id)).toEqual([...KOSTEN_ZEILEN]);
      strukturMonate.forEach((punkt, index) => {
        const summeAnteile = punkt.anteile.reduce((total, anteil) => total + anteil.betragCents, 0);
        expect(summeAnteile).toBe(monate[index]?.kostenCents);
      });
      strukturJahre.forEach((punkt, index) => {
        const summeAnteile = punkt.anteile.reduce((total, anteil) => total + anteil.betragCents, 0);
        expect(summeAnteile).toBe(jahre[index]?.kostenCents);
      });
    },
  );

  it("markiert den tiefsten Monatskontostand und zeichnet Planjahre als Bestand", () => {
    for (const [name] of beispiele) {
      const quelle = bericht(name);
      const monate = kontostandVerlauf(quelle, "monate");
      const jahre = kontostandVerlauf(quelle, "planjahre");

      expect(monate.punkte.map((punkt) => punkt.standCents)).toEqual(
        quelle.liquiditaet.endbestand.monateCents,
      );
      expect(jahre.punkte.map((punkt) => punkt.standCents)).toEqual(
        quelle.liquiditaet.endbestand.planjahreCents,
      );
      expect(jahre.punkte.map((punkt) => punkt.schluessel)).toEqual(
        quelle.planjahre.map((jahr) => jahr.bezeichnung),
      );

      const markiert = monate.punkte.filter((punkt) => punkt.istMinimumDerReihe);
      expect(markiert).toHaveLength(1);
      expect(markiert[0]?.standCents).toBe(quelle.kennzahlen.tiefsterLiquiditaetsstandCents);
      expect(markiert[0]?.schluessel).toBe(quelle.kennzahlen.tiefsterLiquiditaetsstandMonat);
      expect(monate.tiefsterKontostandCents).toBe(quelle.liquiditaet.tiefsterKontostandCents);
      expect(monate.kontokorrentbedarfCents).toBe(quelle.liquiditaet.kontokorrentbedarfCents);

      const jahresMinimum = jahre.punkte.filter((punkt) => punkt.istMinimumDerReihe);
      expect(jahresMinimum).toHaveLength(1);
      const kleinsterJahresendstand = Math.min(...jahre.punkte.map((punkt) => punkt.standCents));
      expect(jahresMinimum[0]?.standCents).toBe(kleinsterJahresendstand);
    }
  });

  it("kumuliert das Ergebnis nach Steuern bis zur Berichtssumme", () => {
    for (const [name] of beispiele) {
      const quelle = bericht(name);
      const ergebnis = findeZeile(quelle.rentabilitaet.zeilen, "ergebnis-nach-steuern");
      const monate = kumuliertesErgebnis(quelle, "monate");
      const jahre = kumuliertesErgebnis(quelle, "planjahre");
      expect(monate).toHaveLength(36);
      expect(jahre).toHaveLength(3);
      expect(monate.at(-1)?.kumuliertCents).toBe(ergebnis.summeCents);
      expect(jahre.at(-1)?.kumuliertCents).toBe(ergebnis.summeCents);
      expect(jahre[0]?.kumuliertCents).toBe(ergebnis.planjahreCents[0]);
      expect(monate[0]?.kumuliertCents).toBe(ergebnis.monateCents[0]);
    }
  });

  it("summiert Herkunft und Verwendung auf die Posten im Horizont", () => {
    for (const [name] of beispiele) {
      const quelle = bericht(name);
      const jahre = mittelherkunftVerwendung(quelle, "planjahre");
      const monate = mittelherkunftVerwendung(quelle, "monate");
      expect(jahre).toHaveLength(3);
      expect(monate).toHaveLength(36);

      const herkunftJahre = jahre.reduce(
        (total, gruppe) =>
          total + gruppe.herkunft.reduce((summe, segment) => summe + segment.betragCents, 0),
        0,
      );
      const verwendungJahre = jahre.reduce(
        (total, gruppe) =>
          total + gruppe.verwendung.reduce((summe, segment) => summe + segment.betragCents, 0),
        0,
      );
      expect(herkunftJahre).toBe(
        quelle.kapital.summeFinanzierung.betragCents -
          quelle.kapital.summeFinanzierung.ausserhalbCents,
      );
      expect(verwendungJahre).toBe(
        quelle.kapital.summeBedarf.betragCents - quelle.kapital.summeBedarf.ausserhalbCents,
      );
      expect(jahre[0]?.herkunft.map((segment) => segment.id)).toEqual(
        quelle.kapital.finanzierung.map((posten) => posten.id),
      );
      expect(jahre[0]?.verwendung.map((segment) => segment.id)).toEqual(
        quelle.kapital.bedarf.map((posten) => posten.id),
      );
    }
  });
});

function summe<T extends { umsatzCents: number; kostenCents: number }>(
  punkte: readonly T[],
  feld: "umsatzCents" | "kostenCents",
): number {
  return punkte.reduce((total, punkt) => total + punkt[feld], 0);
}
