import { describe, expect, it } from "vitest";
import { berechnePlan, summeCents } from "../calc/index.ts";
import { createEmptyFinanzplan } from "../empty-plan.ts";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "../../fixtures/beispiel-einzelunternehmen.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { beispielGmbh } from "../../fixtures/beispiel-gmbh.ts";
import type { Finanzplan, MonatswertVorgabe } from "../types.ts";
import { erstelleBerichte } from "./berichte.ts";
import {
  BREAK_EVEN_DEFINITION,
  breakEvenMonat,
  findeZeile,
  steuerAufMonate,
  verteileGleichmaessig,
  type Bewegungszeile,
} from "./planjahr.ts";
import type { Berichte } from "./typen.ts";

const beispiele = [
  ["Blitzweg", beispielElektro],
  ["Café Leseecke", beispielCafe],
  ["Hafenlicht GmbH", beispielGmbh],
  ["Studio Nordlicht", beispielEinzelunternehmen],
] as const;

describe("Steuerverteilung und Break-even", () => {
  it("legt den Cent-Rest in den letzten Monat", () => {
    expect(verteileGleichmaessig(100, 3)).toEqual([33, 33, 34]);
    expect(verteileGleichmaessig(10, 1)).toEqual([10]);
    expect(summeCents(verteileGleichmaessig(123_456, 7))).toBe(123_456);
  });

  it("verteilt die Jahressteuer nur auf die Monate dieses Kalenderjahres", () => {
    const monate = ["2026-11", "2026-12", "2027-01", "2027-02"];
    const verteilt = steuerAufMonate(monate, [
      { jahr: 2026, steuerCents: 100 },
      { jahr: 2027, steuerCents: 10 },
    ]);
    expect(verteilt).toEqual([50, 50, 5, 5]);
  });

  it("nennt den ersten Monat mit positivem Ergebnis nach Steuern", () => {
    const monate = ["2026-01", "2026-02", "2026-03", "2026-04"];
    expect(breakEvenMonat([100, -1, 50, 20], monate)).toEqual({
      erreicht: true,
      planmonat: 1,
      monat: "2026-01",
    });
    expect(breakEvenMonat([-5, 0, 20, -1], monate)).toEqual({
      erreicht: true,
      planmonat: 3,
      monat: "2026-03",
    });
    expect(breakEvenMonat([100, 100, 100, 100], monate).planmonat).toBe(1);
    expect(breakEvenMonat([0, 0, 0, 0], monate).erreicht).toBe(false);
    expect(breakEvenMonat([-1, -1, -1, -1], monate).erreicht).toBe(false);
  });
});

describe("Berichte der Beispielpläne", () => {
  const berichte = new Map<string, Berichte>(
    beispiele.map(([name, plan]) => [name, erstelleBerichte(plan, berechnePlan(plan, "real"))]),
  );

  it.each(beispiele.map(([name]) => name))(
    "%s stimmt in den Summen mit dem Rechenkern überein",
    (name) => {
      const plan = beispiele.find(([eintrag]) => eintrag === name)?.[1];
      const bericht = berichte.get(name);
      if (!plan || !bericht) throw new Error(name);
      const ergebnis = berechnePlan(plan, "real");
      const guv = bericht.rentabilitaet;

      const vorSteuern = findeZeile(guv.zeilen, "ergebnis-vor-steuern");
      const nachSteuern = findeZeile(guv.zeilen, "ergebnis-nach-steuern");
      const steuern = findeZeile(guv.zeilen, "steuern");
      const umsatz = findeZeile(guv.zeilen, "umsatz");
      const ware = findeZeile(guv.zeilen, "wareneinsatz");
      const rohertrag = findeZeile(guv.zeilen, "rohertrag");
      const personal = findeZeile(guv.zeilen, "personal");
      const raum = findeZeile(guv.zeilen, "raumkosten");
      const sonstige = findeZeile(guv.zeilen, "sonstige-kosten");
      const afa = findeZeile(guv.zeilen, "abschreibungen");
      const zinsen = findeZeile(guv.zeilen, "zinsen");

      expect(vorSteuern.monateCents).toEqual([...ergebnis.uebersicht.betriebsergebnisCents]);
      expect(vorSteuern.summeCents).toBe(summeCents(ergebnis.uebersicht.betriebsergebnisCents));
      expect(nachSteuern.summeCents).toBe(
        vorSteuern.summeCents -
          summeCents(ergebnis.steuern.jahre.map((jahr) => jahr.steuerLastCents)),
      );
      expect(umsatz.summeCents - ware.summeCents).toBe(rohertrag.summeCents);
      expect(rohertrag.monateCents).toEqual([...ergebnis.uebersicht.rohertragCents]);
      expect(personal.monateCents).toEqual([...ergebnis.uebersicht.personalCents]);
      expect(afa.monateCents).toEqual([...ergebnis.uebersicht.abschreibungenCents]);
      expect(zinsen.monateCents).toEqual([...ergebnis.uebersicht.zinsaufwandCents]);
      expect(summeCents(raum.monateCents) + summeUnter(sonstige, "sonstige-laufend")).toBe(
        summeCents(ergebnis.kosten.summeAufwandCents),
      );
      expect(summeUnterzeilen(sonstige)).toEqual(sonstige.monateCents);
      bericht.planjahre.forEach((jahr, index) => {
        expect(vorSteuern.planjahreCents[index]).toBe(
          summeCents(ergebnis.uebersicht.betriebsergebnisCents.slice(jahr.vonIndex, jahr.bisIndex)),
        );
        expect(vorSteuern.planjahreCents[index]).toBe(
          (umsatz.planjahreCents[index] ?? 0) -
            (ware.planjahreCents[index] ?? 0) -
            (personal.planjahreCents[index] ?? 0) -
            (raum.planjahreCents[index] ?? 0) -
            (sonstige.planjahreCents[index] ?? 0) -
            (afa.planjahreCents[index] ?? 0) -
            (zinsen.planjahreCents[index] ?? 0),
        );
      });

      for (const kalenderjahr of guv.kalenderjahre) {
        const summe = steuern.monateCents.reduce((total, wert, index) => {
          const monat = bericht.monate[index];
          return monat?.startsWith(`${kalenderjahr.jahr}-`) ? total + wert : total;
        }, 0);
        expect(summe).toBe(kalenderjahr.steuerCents);
      }

      const ende = bericht.liquiditaet.endbestand.monateCents;
      let saldo = 0;
      ergebnis.uebersicht.zahlungssaldoCents.forEach((wert, index) => {
        saldo += wert;
        expect(ende[index]).toBe(saldo);
      });
      expect(bericht.liquiditaet.endbestand.horizontWertCents).toBe(
        summeCents(ergebnis.uebersicht.zahlungssaldoCents),
      );
      expect(summeUnterzeilen(bericht.liquiditaet.einzahlungen)).toEqual(
        bericht.liquiditaet.einzahlungen.monateCents,
      );
      expect(summeUnterzeilen(bericht.liquiditaet.auszahlungen)).toEqual(
        bericht.liquiditaet.auszahlungen.monateCents,
      );
      bericht.liquiditaet.endbestand.monateCents.forEach((wert, index) => {
        const anfang = bericht.liquiditaet.anfangsbestand.monateCents[index] ?? 0;
        const ein = bericht.liquiditaet.einzahlungen.monateCents[index] ?? 0;
        const aus = bericht.liquiditaet.auszahlungen.monateCents[index] ?? 0;
        expect(anfang + ein - aus).toBe(wert);
        if (index > 0) {
          expect(anfang).toBe(bericht.liquiditaet.endbestand.monateCents[index - 1]);
        }
      });
      expect(bericht.liquiditaet.anfangsbestand.monateCents[0]).toBe(0);
      expect(bericht.liquiditaet.kontokorrentbedarfCents).toBe(
        bericht.liquiditaet.tiefsterKontostandCents < 0
          ? -bericht.liquiditaet.tiefsterKontostandCents
          : 0,
      );
      expect(bericht.kennzahlen.tiefsterLiquiditaetsstandCents).toBe(
        bericht.liquiditaet.tiefsterKontostandCents,
      );

      const bedarf = bericht.kapital.bedarf.reduce(
        (total, posten) => total + posten.betragCents,
        0,
      );
      const finanzierung = bericht.kapital.finanzierung.reduce(
        (total, posten) => total + posten.betragCents,
        0,
      );
      expect(bericht.kapital.summeBedarf.betragCents).toBe(bedarf);
      expect(bericht.kapital.summeFinanzierung.betragCents).toBe(finanzierung);
      expect(bericht.kapital.deckung.betragCents).toBe(finanzierung - bedarf);
      expect(summeCents(bericht.kapital.summeBedarf.monateCents)).toBe(
        bedarf - bericht.kapital.summeBedarf.ausserhalbCents,
      );
      expect(bericht.kapital.darlehenAbzugCents).toBe(
        (bericht.kapital.finanzierung.find((posten) => posten.id === "darlehen")?.betragCents ??
          0) - summeCents(ergebnis.finanzierung.summeDarlehenAuszahlungCents),
      );

      expect(bericht.anlagen.summeAbschreibung.monateCents).toEqual([
        ...ergebnis.investitionen.summeAbschreibungCents,
      ]);
      expect(bericht.anlagen.summeBuchwert.monateCents).toEqual([
        ...ergebnis.investitionen.summeBuchwertCents,
      ]);
      bericht.monate.forEach((_, index) => {
        expect(bericht.darlehen.summeZins.monateCents[index]).toBe(
          ergebnis.finanzierung.summeZinsCents[index] ?? 0,
        );
        expect(bericht.darlehen.summeTilgung.monateCents[index]).toBe(
          ergebnis.finanzierung.summeTilgungCents[index] ?? 0,
        );
        expect(bericht.darlehen.summeRestschuld.monateCents[index]).toBe(
          ergebnis.finanzierung.summeRestschuldCents[index] ?? 0,
        );
      });
      expect(bericht.darlehen.summeRestschuld.horizontWertCents).toBe(
        ergebnis.finanzierung.summeRestschuldCents.at(-1) ?? 0,
      );

      expect(bericht.planjahre.map((jahr) => jahr.bezeichnung)).toEqual([
        "Planjahr 1",
        "Planjahr 2",
        "Planjahr 3",
      ]);
      expect(bericht.planjahre[0]?.vonMonat).toBe(plan.startMonat);
      expect(bericht.kennzahlen.breakEven.definition).toBe(BREAK_EVEN_DEFINITION);
    },
  );

  it("rechnet Blitzweg in Planjahren ab Juni und nicht in Kalenderjahren", () => {
    const bericht = berichte.get("Blitzweg");
    if (!bericht) throw new Error("Blitzweg fehlt");
    expect(bericht.planjahre[0]).toMatchObject({ vonMonat: "2026-06", bisMonat: "2027-05" });
    expect(bericht.kennzahlen.breakEven).toMatchObject({
      erreicht: true,
      planmonat: 1,
      monat: "2026-06",
    });
    expect(bericht.planjahre[1]).toMatchObject({ vonMonat: "2027-06", bisMonat: "2028-05" });
    expect(bericht.rentabilitaet.privatentnahmenAusgewiesen).toBe(true);
    expect(findeZeile(bericht.rentabilitaet.zeilen, "privatentnahmen").summeCents).toBe(
      36 * 239_000,
    );
    const person = bericht.tragfaehigkeit.personen[0];
    expect(bericht.tragfaehigkeit.anwendbar).toBe(true);
    expect(person?.planjahr2Cents).toBe(person?.verfuegbaresEinkommen.planjahreCents[1]);
    expect(person?.tragfaehig).toBe((person?.planjahr2Cents ?? -1) >= 0);
    expect(person?.gewinnNachSteuern.monateCents).toEqual(
      findeZeile(bericht.rentabilitaet.zeilen, "ergebnis-nach-steuern").monateCents,
    );
  });

  it("zeigt bei der Hafenlicht GmbH kein Darlehen und nicht die Restschuld von Blitzweg", () => {
    const bericht = berichte.get("Hafenlicht GmbH");
    const blitzweg = berichte.get("Blitzweg");
    if (!bericht || !blitzweg) throw new Error("Beispiel fehlt");
    expect(beispielGmbh.finanzierung.darlehen).toEqual([]);
    expect(bericht.darlehen.darlehen).toEqual([]);
    expect(bericht.darlehen.summeRestschuld.monateCents.every((wert) => wert === 0)).toBe(true);
    expect(bericht.darlehen.summeRestschuld.horizontWertCents).toBe(0);
    expect(bericht.darlehen.summeZins.summeCents).toBe(0);
    expect(bericht.darlehen.summeTilgung.summeCents).toBe(0);
    expect(
      bericht.kapital.finanzierung.find((posten) => posten.id === "darlehen")?.betragCents,
    ).toBe(0);
    expect(
      bericht.kennzahlen.kapitaldienstfaehigkeit.every(
        (jahr) => jahr.kapitaldienstCents === 0 && jahr.quote == null,
      ),
    ).toBe(true);
    expect(JSON.stringify(bericht.darlehen)).not.toContain("Mikrodarlehen");
    expect(bericht.darlehen.summeRestschuld.horizontWertCents).not.toBe(1_701_394);
    expect(blitzweg.darlehen.darlehen[0]?.bezeichnung).toBe("Thüringer Mikrodarlehen");
    expect(blitzweg.darlehen.summeRestschuld.horizontWertCents).toBe(1_701_394);
  });

  it("lässt die Tragfähigkeit bei der GmbH aus", () => {
    const bericht = berichte.get("Hafenlicht GmbH");
    if (!bericht) throw new Error("Hafenlicht fehlt");
    expect(bericht.tragfaehigkeit.anwendbar).toBe(false);
    expect(bericht.tragfaehigkeit.personen).toEqual([]);
    expect(bericht.tragfaehigkeit.alleTragfaehig).toBeNull();
    expect(bericht.tragfaehigkeit.hinweis).toContain("GmbH");
    expect(bericht.rentabilitaet.zeilen.some((zeile) => zeile.id === "privatentnahmen")).toBe(
      false,
    );
    expect(bericht.kennzahlen.kapitaldienstfaehigkeit.every((jahr) => jahr.quote == null)).toBe(
      true,
    );
    expect(bericht.planjahre[0]).toMatchObject({ vonMonat: "2026-01", bisMonat: "2026-12" });
    expect(bericht.kennzahlen.breakEven).toMatchObject({
      erreicht: true,
      planmonat: 1,
      monat: "2026-01",
    });
  });

  it("führt den Waren-Erstbestand des Cafés im Kapitalbedarf", () => {
    const bericht = berichte.get("Café Leseecke");
    if (!bericht) throw new Error("Café fehlt");
    expect(bericht.planjahre[0]).toMatchObject({ vonMonat: "2026-08", bisMonat: "2027-07" });
    expect(bericht.kennzahlen.breakEven).toMatchObject({
      erreicht: true,
      planmonat: 2,
      monat: "2026-09",
    });
    expect(
      bericht.kapital.bedarf.find((posten) => posten.id === "waren-erstbestand")?.betragCents,
    ).toBe(250_000);
    expect(
      bericht.kapital.bedarf.find((posten) => posten.id === "betriebsmittel")?.betragCents,
    ).toBe(0);
    expect(bericht.kapital.bedarf.find((posten) => posten.id === "reserve")?.betragCents).toBe(
      1_500_000,
    );
  });

  it.each(["Blitzweg", "Café Leseecke", "Hafenlicht GmbH"])(
    "schreibt einen Snapshot für %s",
    (name) => {
      const bericht = berichte.get(name);
      if (!bericht) throw new Error(name);
      expect(snapshot(bericht)).toMatchSnapshot();
    },
  );
});

describe("Tragfähigkeit einer GbR", () => {
  it("teilt Gewinn und Steuer auf die Gesellschafter und prüft das Planjahr 2", () => {
    const plan = gbr();
    const ergebnis = berechnePlan(plan, "base");
    const bericht = erstelleBerichte(plan, ergebnis);
    expect(bericht.tragfaehigkeit.anwendbar).toBe(true);
    expect(bericht.tragfaehigkeit.personen).toHaveLength(2);
    const nachSteuern = findeZeile(bericht.rentabilitaet.zeilen, "ergebnis-nach-steuern");
    const summePersonen = bericht.tragfaehigkeit.personen.reduce(
      (total, person) => total + person.gewinnNachSteuern.summeCents,
      0,
    );
    expect(summePersonen).toBe(nachSteuern.summeCents);
    for (const person of bericht.tragfaehigkeit.personen) {
      expect(person.planjahr2Cents).toBe(person.verfuegbaresEinkommen.planjahreCents[1]);
      expect(person.tragfaehig).toBe((person.planjahr2Cents ?? -1) >= 0);
      const vorsorge = person.vorsorge.unterzeilen ?? [];
      expect(vorsorge.reduce((total, zeile) => total + zeile.summeCents, 0)).toBe(
        person.vorsorge.summeCents,
      );
    }
    expect(bericht.tragfaehigkeit.alleTragfaehig).toBe(
      bericht.tragfaehigkeit.personen.every((person) => person.tragfaehig === true),
    );
  });
});

function summeUnter(zeile: Bewegungszeile, id: string): number {
  return zeile.unterzeilen?.find((unter) => unter.id === id)?.summeCents ?? 0;
}

function summeUnterzeilen(zeile: Bewegungszeile): number[] {
  const unter = zeile.unterzeilen ?? [];
  return zeile.monateCents.map((_, index) =>
    unter.reduce((total, eintrag) => total + (eintrag.monateCents[index] ?? 0), 0),
  );
}

function snapshot(bericht: Berichte) {
  return {
    firma: bericht.firmenname,
    planjahre: bericht.planjahre.map((jahr) => `${jahr.vonMonat}/${jahr.bisMonat}`),
    guv: bericht.rentabilitaet.zeilen.map((zeile) => ({
      zeile: zeile.bezeichnung,
      planjahre: zeile.planjahreCents,
      summe: zeile.summeCents,
    })),
    endbestand: bericht.liquiditaet.endbestand.planjahreCents,
    tiefster: {
      betrag: bericht.liquiditaet.tiefsterKontostandCents,
      monat: bericht.liquiditaet.tiefsterKontostandMonat,
      kontokorrent: bericht.liquiditaet.kontokorrentbedarfCents,
    },
    kapital: {
      bedarf: bericht.kapital.bedarf.map((posten) => [posten.bezeichnung, posten.betragCents]),
      summeBedarf: bericht.kapital.summeBedarf.betragCents,
      finanzierung: bericht.kapital.finanzierung.map((posten) => [
        posten.bezeichnung,
        posten.betragCents,
      ]),
      summeFinanzierung: bericht.kapital.summeFinanzierung.betragCents,
      deckung: bericht.kapital.deckung.betragCents,
      art: bericht.kapital.deckungArt,
    },
    kennzahlen: {
      breakEven: bericht.kennzahlen.breakEven.monat,
      planmonat: bericht.kennzahlen.breakEven.planmonat,
      rohertragsquote: bericht.kennzahlen.rohertragsquote.planjahre.map((jahr) => jahr.quote),
      umsatzrendite: bericht.kennzahlen.umsatzrendite.planjahre.map((jahr) => jahr.quote),
      kapitaldienst: bericht.kennzahlen.kapitaldienstfaehigkeit.map((jahr) => ({
        cashflow: jahr.cashflowCents,
        dienst: jahr.kapitaldienstCents,
        quote: jahr.quote,
      })),
      eigenkapitalquote: bericht.kennzahlen.eigenkapitalquote,
    },
    tragfaehigkeit: {
      anwendbar: bericht.tragfaehigkeit.anwendbar,
      personen: bericht.tragfaehigkeit.personen.map((person) => ({
        name: person.name,
        planjahr2: person.planjahr2Cents,
        tragfaehig: person.tragfaehig,
        verfuegbar: person.verfuegbaresEinkommen.planjahreCents,
      })),
    },
    restschuld: bericht.darlehen.darlehen.map((darlehen) => ({
      name: darlehen.bezeichnung,
      planjahre: darlehen.restschuld.planjahreCents,
    })),
  };
}

function gbr(): Finanzplan {
  const plan = createEmptyFinanzplan({
    id: "plan-gbr",
    now: new Date("2026-01-01T00:00:00.000Z"),
    startMonat: "2026-01",
  });
  plan.stammdaten.rechtsform = "gbr";
  plan.stammdaten.firmenname = "Werkstatt GbR (fiktiv)";
  plan.stammdaten.personen = [
    {
      id: "person-a",
      name: "Ada",
      rollen: ["gesellschafter"],
      anteil: 0.6,
      lebensbedarf: lebensbedarf(120_000, 40_000),
    },
    {
      id: "person-b",
      name: "Ben",
      rollen: ["gesellschafter"],
      anteil: 0.4,
      lebensbedarf: lebensbedarf(90_000, 30_000),
    },
  ];
  plan.umsatzplanung = [
    {
      id: "umsatz-gbr",
      bezeichnung: "Leistung",
      art: "monatsumsatz",
      monatsumsatz: { basisCents: 800_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      wareneinsatz: { art: "keiner" },
    },
  ];
  return plan;
}

function lebensbedarf(lebenshaltungCents: number, vorsorgeCents: number) {
  const monat = (basisCents: number): MonatswertVorgabe => ({ basisCents });
  return {
    lebenshaltung: monat(lebenshaltungCents),
    krankenversicherung: monat(vorsorgeCents),
    pflegeversicherung: monat(0),
    altersvorsorge: monat(0),
    sonstigeVersicherungen: monat(0),
  };
}
