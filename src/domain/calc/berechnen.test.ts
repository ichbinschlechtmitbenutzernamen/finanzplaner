import { describe, expect, it } from "vitest";
import { beispielCafe } from "../../fixtures/beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "../../fixtures/beispiel-einzelunternehmen.ts";
import { beispielElektro } from "../../fixtures/beispiel-elektro.ts";
import { createDraftFinanzplan, createEmptyFinanzplan } from "../empty-plan.ts";
import type { Finanzplan, Investition } from "../types.ts";
import { berechnePlan, BerechnungError, summeCents } from "./berechnen.ts";

function plan(): Finanzplan {
  const basis = createEmptyFinanzplan({
    id: "plan-test",
    now: new Date("2026-01-15T00:00:00.000Z"),
    startMonat: "2026-01",
  });
  basis.umsatzsteuer = {
    regime: "regelbesteuerung",
    vorsteuerabzugsberechtigt: true,
    versteuerungsart: "soll",
    voranmeldungszeitraum: "monatlich",
    dauerfristverlaengerung: false,
  };
  return basis;
}

function umsatz(ziel: Finanzplan, tage = 0, basisCents = 100_000): void {
  ziel.umsatzplanung.push({
    id: "rev-test",
    bezeichnung: "Leistung",
    art: "monatsumsatz",
    monatsumsatz: { basisCents },
    umsatzsteuerSatz: 0.19,
    zahlungszielTage: tage,
    wareneinsatz: { art: "keiner" },
  });
}

describe("Umsatz, Zahlung und Szenario", () => {
  it("verschiebt den Geldeingang um ganze Monate und lässt den Ertrag im Leistungsmonat", () => {
    // 45 Tage: (45 − 14) / 30 = 1,033…, aufgerundet 2 Monate.
    // 14 Tage bleiben im Leistungsmonat. 30 Tage werden 1 Monat.
    const sofort = plan();
    umsatz(sofort, 14);
    expect(berechnePlan(sofort).umsatz.summeEinzahlungCents[0]).toBe(119_000);
    expect(berechnePlan(sofort).umsatz.summeNettoCents[0]).toBe(100_000);

    const ziel30 = plan();
    umsatz(ziel30, 30);
    const dreissig = berechnePlan(ziel30);
    expect(dreissig.umsatz.summeNettoCents[0]).toBe(100_000);
    expect(dreissig.umsatz.summeEinzahlungCents[0]).toBe(0);
    expect(dreissig.umsatz.summeEinzahlungCents[1]).toBe(119_000);
    // Jeden Monat entsteht eine neue Rechnung, während die vorige eingeht.
    // Offen bleibt deshalb durchgehend eine Brutto-Rechnung.
    expect(dreissig.uebersicht.forderungenCents[0]).toBe(119_000);
    expect(dreissig.uebersicht.forderungenCents[1]).toBe(119_000);
    expect(dreissig.uebersicht.forderungenCents[35]).toBe(119_000);

    const ziel45 = plan();
    umsatz(ziel45, 45, 10_000);
    const spaet = berechnePlan(ziel45);
    expect(spaet.umsatz.summeEinzahlungCents[2]).toBe(11_900);
    expect(spaet.umsatz.summeEinzahlungCents[35]).toBe(11_900);
    // Die Rechnungen der Monate 35 und 36 werden erst nach dem Horizont bezahlt.
    expect(spaet.uebersicht.forderungenCents[35]).toBe(23_800);
    expect(spaet.umsatzsteuer.umsatzsteuerNachHorizontCents).toBe(0);
  });

  it("legt die Umsatzsteuer bei Ist-Versteuerung auf den Zahlungseingang", () => {
    const basis = plan();
    basis.umsatzsteuer.versteuerungsart = "ist";
    umsatz(basis, 30);
    const ergebnis = berechnePlan(basis);
    expect(ergebnis.umsatzsteuer.umsatzsteuerCents[0]).toBe(0);
    expect(ergebnis.umsatzsteuer.umsatzsteuerCents[1]).toBe(19_000);
    expect(ergebnis.umsatzsteuer.zahlungCents[2]).toBe(19_000);
  });

  it("zahlt die monatliche Zahllast im Folgemonat und das Quartal nach dem Quartalsende", () => {
    const monatlich = plan();
    umsatz(monatlich, 0);
    const monat = berechnePlan(monatlich);
    expect(monat.umsatzsteuer.zahllastCents[0]).toBe(19_000);
    expect(monat.umsatzsteuer.zahlungCents[0]).toBe(0);
    expect(monat.umsatzsteuer.zahlungCents[1]).toBe(19_000);
    expect(monat.umsatzsteuer.offeneZahllastCents[0]).toBe(19_000);
    expect(monat.umsatzsteuer.offeneZahllastCents[1]).toBe(19_000);

    const mitFrist = plan();
    mitFrist.umsatzsteuer.dauerfristverlaengerung = true;
    umsatz(mitFrist, 0);
    expect(berechnePlan(mitFrist).umsatzsteuer.zahlungCents[2]).toBe(19_000);

    const quartal = plan();
    quartal.umsatzsteuer.voranmeldungszeitraum = "vierteljaehrlich";
    umsatz(quartal, 0);
    const q = berechnePlan(quartal);
    // Januar bis März, je 190,00 Euro, zusammen im April.
    expect(q.umsatzsteuer.zahlungCents[3]).toBe(57_000);
    // April bis Juni im Juli.
    expect(q.umsatzsteuer.zahlungCents[6]).toBe(57_000);
    expect(q.umsatzsteuer.zahlungCents[1]).toBe(0);
  });

  it("zieht beim Kleinunternehmer keine Umsatzsteuer und keine Vorsteuer, der Aufwand ist brutto", () => {
    const basis = plan();
    basis.umsatzsteuer = {
      regime: "kleinunternehmer",
      vorsteuerabzugsberechtigt: false,
      versteuerungsart: "soll",
      voranmeldungszeitraum: "monatlich",
      dauerfristverlaengerung: false,
    };
    umsatz(basis, 0, 10_000);
    basis.laufendeKosten.push({
      id: "kost-software",
      bezeichnung: "Software",
      kategorie: "software",
      art: "fix",
      betrag: { basisCents: 10_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    });
    const ergebnis = berechnePlan(basis);
    expect(ergebnis.umsatz.summeEinzahlungCents[0]).toBe(10_000);
    expect(ergebnis.umsatzsteuer.umsatzsteuerCents[0]).toBe(0);
    expect(ergebnis.umsatzsteuer.vorsteuerCents[0]).toBe(0);
    expect(ergebnis.umsatzsteuer.zahllastCents[0]).toBe(0);
    // 100,00 Euro netto + 19,00 Euro nicht abziehbare Steuer.
    expect(ergebnis.kosten.summeAufwandCents[0]).toBe(11_900);
    expect(ergebnis.kosten.summeAuszahlungCents[0]).toBe(11_900);
  });

  it("ersetzt den globalen Faktor durch den Faktor der Linie und legt den Cent-Zuschlag danach drauf", () => {
    const basis = plan();
    umsatz(basis, 0, 100_000);
    basis.laufendeKosten.push({
      id: "kost-miete",
      bezeichnung: "Miete",
      kategorie: "miete",
      art: "fix",
      betrag: { basisCents: 10_000 },
      umsatzsteuerSatz: 0,
      zahlungszielTage: 0,
      betriebsausgabe: true,
    });
    basis.szenarien.best.anpassungen = [
      { id: "global", ziel: "global", umsatzFaktor: 1.15, kostenFaktor: 2 },
      { id: "linie", ziel: "umsatzposition", positionId: "rev-test", mengenFaktor: 0.5 },
      { id: "miete", ziel: "kostenposition", positionId: "kost-miete", zuschlagCents: 500 },
    ];
    const best = berechnePlan(basis, "best");
    // 1.000 Euro × 0,5, nicht zusätzlich × 1,15.
    expect(best.umsatz.summeNettoCents[0]).toBe(50_000);
    // Miete bleibt 100 Euro, plus 5 Euro. Der globale Kostenfaktor 2 gilt nicht.
    expect(best.kosten.summeAufwandCents[0]).toBe(10_500);

    basis.szenarien.worst.anpassungen = [
      {
        id: "miete-faktor",
        ziel: "kostenposition",
        positionId: "kost-miete",
        faktor: 1.1,
        zuschlagCents: 500,
      },
    ];
    // round(10.000 × 1,1) + 500 = 11.500.
    expect(berechnePlan(basis, "worst").kosten.summeAufwandCents[0]).toBe(11_500);
  });

  it("rechnet Menge mal Preis und den Wareneinsatz als Prozent vom Nettoumsatz", () => {
    const basis = plan();
    basis.umsatzplanung.push({
      id: "rev-stueck",
      bezeichnung: "Stück",
      art: "menge_mal_preis",
      mengeProMonat: { basis: 2 },
      preisNetto: { basisCents: 350_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 0,
      wareneinsatz: { art: "prozent_vom_umsatz", quote: 0.22, umsatzsteuerSatz: 0.07 },
    });
    basis.szenarien.best.anpassungen = [
      {
        id: "stueck",
        ziel: "umsatzposition",
        positionId: "rev-stueck",
        mengenFaktor: 1.5,
        preisFaktor: 0.8,
      },
    ];
    const ergebnis = berechnePlan(basis, "best");
    // 2 × 1,5 × 3.500 Euro × 0,8 = 8.400,00 Euro.
    expect(ergebnis.umsatz.summeNettoCents[0]).toBe(840_000);
    // Wareneinsatz 22 % = 1.848,00 Euro. Vorsteuer 7 % = 129,36 Euro.
    expect(ergebnis.umsatz.linien[0]?.wareneinsatzNettoCents[0]).toBe(184_800);
    expect(ergebnis.umsatzsteuer.vorsteuerWareneinsatzCents[0]).toBe(12_936);
  });
});

describe("Personal, Kosten und Abschreibung", () => {
  it("setzt Gehalt, Sonderzahlung und Arbeitgeberanteil erst ab dem Eintritt an", () => {
    const basis = plan();
    basis.personal.push({
      id: "stelle",
      bezeichnung: "Geselle",
      rolle: "angestellt",
      brutto: { basisCents: 320_000 },
      eintritt: "2026-03",
      austritt: "2026-04",
      agNebenkostenSatz: 0.22,
      sozialversicherungspflichtig: true,
      sonderzahlungen: [{ monat: "2026-04", bruttoCents: 50_000 }],
    });
    basis.szenarien.best.anpassungen = [
      { id: "gehalt", ziel: "personal", positionId: "stelle", gehaltsFaktor: 1.1 },
    ];
    const ergebnis = berechnePlan(basis, "best");
    expect(ergebnis.personal.summeAufwandCents[0]).toBe(0);
    expect(ergebnis.personal.summeAufwandCents[1]).toBe(0);
    // März: round(320.000 × 1,1) = 352.000, Nebenkosten round(352.000 × 0,22) = 77.440.
    expect(ergebnis.personal.summeAufwandCents[2]).toBe(352_000 + 77_440);
    // April zusätzlich round(50.000 × 1,1) = 55.000. Brutto 407.000 × 0,22 = 89.540.
    expect(ergebnis.personal.stellen[0]?.sonderzahlungCents[3]).toBe(55_000);
    expect(ergebnis.personal.summeAufwandCents[3]).toBe(407_000 + 89_540);
    expect(ergebnis.personal.summeAufwandCents[4]).toBe(0);
  });

  it("lässt den Privatanteil aus dem Aufwand und aus der Vorsteuer draußen", () => {
    const basis = plan();
    basis.laufendeKosten.push({
      id: "pkw",
      bezeichnung: "Pkw",
      kategorie: "reise_fahrzeug",
      art: "fix",
      betrag: { basisCents: 10_000 },
      umsatzsteuerSatz: 0.19,
      zahlungszielTage: 30,
      betriebsausgabe: true,
      privatanteil: 0.2,
      aktivBis: "2026-01",
    });
    const ergebnis = berechnePlan(basis);
    // Betrieblich 80,00 Euro. Vorsteuer 15,20 Euro. Die Rechnung über 119,00 Euro geht im Folgemonat.
    expect(ergebnis.kosten.summeAufwandCents[0]).toBe(8_000);
    expect(ergebnis.umsatzsteuer.vorsteuerKostenCents[0]).toBe(1_520);
    expect(ergebnis.kosten.summeAuszahlungCents[0]).toBe(0);
    expect(ergebnis.kosten.summeAuszahlungCents[1]).toBe(11_900);
    expect(ergebnis.uebersicht.verbindlichkeitenCents[0]).toBe(11_900);
    // Nur der Januar ist aktiv, der Februar zahlt die eine Rechnung und schließt sie.
    expect(ergebnis.uebersicht.verbindlichkeitenCents[1]).toBe(0);
  });

  it("schreibt linear ab, nimmt den Rest in den letzten Monat und beginnt erst zum AfA-Start", () => {
    const basis = plan();
    basis.kapitalbedarf.investitionen.push(
      anlage({
        id: "rest",
        nettoCents: 100_000,
        nutzungsdauerMonate: 3,
        afaMethode: "linear",
      }),
      anlage({
        id: "spaeter",
        nettoCents: 100_000,
        nutzungsdauerMonate: 4,
        afaMethode: "linear",
        anschaffungsmonat: "2026-01",
        afaStartMonat: "2026-03",
      }),
    );
    const ergebnis = berechnePlan(basis);
    const erste = ergebnis.investitionen.anlagen[0];
    // 100.000 / 3 = 33.333,333… → 33.333, 33.333, 33.334.
    expect(erste?.abschreibungCents.slice(0, 3)).toEqual([33_333, 33_333, 33_334]);
    expect(erste?.buchwertCents[0]).toBe(66_667);
    expect(erste?.buchwertCents[2]).toBe(0);
    expect(summeCents(erste?.abschreibungCents ?? [])).toBe(100_000);

    const spaeter = ergebnis.investitionen.anlagen[1];
    expect(spaeter?.abschreibungCents.slice(0, 6)).toEqual([0, 0, 25_000, 25_000, 25_000, 25_000]);
    expect(spaeter?.buchwertCents[0]).toBe(100_000);
    expect(spaeter?.buchwertCents[5]).toBe(0);
  });

  it("bucht bis 250 Euro netto als Aufwand und schreibt GWG und Sammelposten daneben ab", () => {
    const basis = plan();
    basis.kapitalbedarf.investitionen.push(
      anlage({
        id: "klein",
        nettoCents: 25_000,
        nutzungsdauerMonate: 36,
        afaMethode: "linear",
      }),
      anlage({
        id: "grenze",
        nettoCents: 25_001,
        nutzungsdauerMonate: 0,
        afaMethode: "sofort_gwg",
      }),
      anlage({
        id: "gwg",
        nettoCents: 65_000,
        nutzungsdauerMonate: 0,
        afaMethode: "sofort_gwg",
      }),
      anlage({
        id: "zu-teuer",
        nettoCents: 90_000,
        nutzungsdauerMonate: 0,
        afaMethode: "sofort_gwg",
      }),
      anlage({
        id: "pool",
        nettoCents: 90_000,
        afaMethode: "sammelposten",
        anschaffungsmonat: "2026-02",
      }),
    );
    const ergebnis = berechnePlan(basis);
    const klein = ergebnis.investitionen.anlagen.find((item) => item.id === "klein");
    expect(klein?.behandlung).toBe("sofortaufwand");
    expect(klein?.sofortaufwandCents[0]).toBe(25_000);
    expect(klein?.buchwertCents[0]).toBe(0);
    expect(ergebnis.hinweise.some((hinweis) => hinweis.code === "sofortaufwand_bis_250")).toBe(
      true,
    );

    expect(
      ergebnis.investitionen.anlagen.find((item) => item.id === "grenze")?.abschreibungCents[0],
    ).toBe(25_001);
    expect(
      ergebnis.investitionen.anlagen.find((item) => item.id === "gwg")?.abschreibungCents[0],
    ).toBe(65_000);
    expect(ergebnis.hinweise.map((hinweis) => hinweis.code)).toContain("gwg_betrag_zu_hoch");

    const pool = ergebnis.investitionen.anlagen.find((item) => item.id === "pool");
    // Sammelposten fest 60 Monate, § 6 Abs. 2a EStG. 900,00 / 60 = 15,00 Euro.
    // Im Februar beginnt es, der Januar ist leer.
    expect(pool?.abschreibungCents[0]).toBe(0);
    expect(pool?.abschreibungCents[1]).toBe(1_500);
    expect(pool?.buchwertCents[1]).toBe(88_500);
  });

  it("löst 1.000 Euro Sammelposten über 60 Monate mit Rest im letzten Monat auf", () => {
    const basis = plan();
    basis.kapitalbedarf.investitionen.push(
      anlage({
        id: "pool",
        nettoCents: 100_000,
        afaMethode: "sammelposten",
        umsatzsteuerSatz: 0,
      }),
    );
    const pool = berechnePlan(basis).investitionen.anlagen[0];
    // 100.000 / 60 = 1.666,666… → 1.667 Cent. 59 × 1.667 = 98.353. Der 60. Monat hätte 1.647 Cent.
    // Im Horizont liegen 36 Monate à 1.667 = 60.012. Buchwert 39.988 Cent.
    expect(pool?.abschreibungCents[0]).toBe(1_667);
    expect(pool?.abschreibungCents[35]).toBe(1_667);
    expect(pool?.buchwertCents[35]).toBe(39_988);
    expect(summeCents(pool?.abschreibungCents ?? []) + (pool?.buchwertCents[35] ?? 0)).toBe(
      100_000,
    );
  });

  it("bucht Gründungs- und Anlaufkosten als Aufwand, eine Anlage darüber als AfA", () => {
    const basis = plan();
    basis.kapitalbedarf.gruendungskosten.push({
      id: "gk",
      bezeichnung: "Gewerbeanmeldung",
      nettoCents: 40_000,
      umsatzsteuerSatz: 0.19,
      monat: "2026-01",
      zahlungszielTage: 0,
      buchung: { art: "aufwand" },
    });
    basis.kapitalbedarf.anlaufkosten.push({
      id: "ak-maschine",
      bezeichnung: "Startmaschine",
      nettoCents: 120_000,
      umsatzsteuerSatz: 0.19,
      monat: "2026-01",
      zahlungszielTage: 0,
      buchung: { art: "anlage", afaMethode: "linear", nutzungsdauerMonate: 12 },
    });
    const ergebnis = berechnePlan(basis);
    // 400,00 Euro Aufwand, Vorsteuer 76,00 Euro, Zahlung 476,00 Euro.
    expect(ergebnis.kosten.summeEinmalAufwandCents[0]).toBe(40_000);
    expect(ergebnis.umsatzsteuer.vorsteuerEinmalCents[0]).toBe(7_600);
    expect(ergebnis.kosten.summeEinmalAuszahlungCents[0]).toBe(47_600);
    // 1.200,00 Euro / 12 Monate = 100,00 Euro AfA. Vorsteuer 228,00 Euro bei der Anlage.
    const maschine = ergebnis.investitionen.anlagen.find((item) => item.id === "ak-maschine");
    expect(maschine?.abschreibungCents[0]).toBe(10_000);
    expect(maschine?.buchwertCents[0]).toBe(110_000);
    expect(maschine?.vorsteuerCents[0]).toBe(22_800);
    expect(maschine?.auszahlungCents[0]).toBe(142_800);
    expect(ergebnis.kosten.einmalig.some((posten) => posten.id === "ak-maschine")).toBe(false);
  });

  it("aktiviert beim Kleinunternehmer den Bruttobetrag und schreibt davon ab", () => {
    const basis = plan();
    basis.umsatzsteuer.regime = "kleinunternehmer";
    basis.umsatzsteuer.vorsteuerabzugsberechtigt = false;
    basis.kapitalbedarf.investitionen.push(
      anlage({
        id: "geraet",
        nettoCents: 100_000,
        nutzungsdauerMonate: 10,
        afaMethode: "linear",
      }),
    );
    const geraet = berechnePlan(basis).investitionen.anlagen[0];
    // 1.000 Euro + 190 Euro Steuer = 1.190 Euro, je Monat 119,00 Euro.
    expect(geraet?.aktivierungCents).toBe(119_000);
    expect(geraet?.abschreibungCents[0]).toBe(11_900);
    expect(geraet?.vorsteuerCents[0]).toBe(0);
    expect(geraet?.auszahlungCents[0]).toBe(119_000);
  });
});

describe("Finanzierung, Zuschuss und Lebensbedarf", () => {
  it("nimmt einen steuerfreien Zuschuss in die Kasse und nicht in das Betriebsergebnis", () => {
    const basis = plan();
    basis.finanzierung.zuschuesse.push({
      id: "gz",
      bezeichnung: "Gründungszuschuss",
      steuerfrei: true,
      auszahlung: {
        art: "gruendungszuschuss",
        alg1MonatlichCents: 100_000,
        phase1Monate: 2,
        pauschaleCents: 30_000,
        phase2Geplant: true,
        phase2Monate: 1,
        startMonat: "2026-01",
      },
    });
    const ergebnis = berechnePlan(basis);
    expect(ergebnis.finanzierung.summeZuschussCents.slice(0, 3)).toEqual([
      130_000, 130_000, 30_000,
    ]);
    expect(ergebnis.finanzierung.summeZuschussErtragCents[0]).toBe(0);
    expect(ergebnis.uebersicht.betriebsergebnisCents[0]).toBe(0);
    expect(ergebnis.uebersicht.zahlungssaldoCents[0]).toBe(130_000);
  });

  it("behandelt den Lebensbedarf bei der GmbH nicht als Entnahme", () => {
    const basis = plan();
    const person = basis.stammdaten.personen[0];
    if (!person) throw new Error("Person fehlt");
    person.lebensbedarf = {
      lebenshaltung: { basisCents: 100_000 },
      krankenversicherung: { basisCents: 0 },
      pflegeversicherung: { basisCents: 0 },
      altersvorsorge: { basisCents: 0 },
      sonstigeVersicherungen: { basisCents: 0 },
    };
    expect(berechnePlan(basis).entnahmen.entnahmeCents[0]).toBe(100_000);
    basis.stammdaten.rechtsform = "gmbh";
    const gmbh = berechnePlan(basis);
    expect(gmbh.entnahmen.lebensbedarfCents[0]).toBe(100_000);
    expect(gmbh.entnahmen.entnahmeCents[0]).toBe(0);
  });

  it("verweigert die Rechnung ohne Startmonat", () => {
    const entwurf = createDraftFinanzplan({
      id: "entwurf",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(() => berechnePlan(entwurf)).toThrow(BerechnungError);
  });
});

describe("Blitzweg Elektrotechnik", () => {
  const real = berechnePlan(beispielElektro, "real");
  const basis = berechnePlan(beispielElektro, "base");

  it("trifft den Juni handgerechnet: Saison, Wareneinsatz, Steuer und Abschreibung", () => {
    // Start Juni 2026, Bezug fehlt, also Abstand 0. Juni-Faktor 1,15.
    // 6.500,00 × 1,15 = 7.475,00 Euro.
    expect(real.umsatz.summeNettoCents[0]).toBe(747_500);
    // Wareneinsatz 22 % = 1.644,50 Euro. Umsatzsteuer 19 % = 1.420,25 Euro.
    // Vorsteuer auf den Wareneinsatz: 1.644,50 × 0,19 = 312,455 → 312,46 Euro.
    expect(real.umsatz.linien[0]?.wareneinsatzNettoCents[0]).toBe(164_450);
    expect(real.umsatzsteuer.umsatzsteuerCents[0]).toBe(142_025);
    expect(real.umsatzsteuer.vorsteuerWareneinsatzCents[0]).toBe(31_246);
    // Transporter 18.000 / 72 = 250,00. Werkzeug 4.500 / 60 = 75,00. GWG 650,00 sofort.
    expect(real.investitionen.summeAbschreibungCents[0]).toBe(25_000 + 7_500 + 65_000);
    expect(
      real.investitionen.anlagen.find((item) => item.id === "inv-transporter")?.buchwertCents[35],
    ).toBe(900_000);
    // Personal beginnt erst Juni 2027, das ist Index 12. 3.200,00 + 22 % = 3.904,00 Euro.
    expect(real.personal.summeAufwandCents[11]).toBe(0);
    expect(real.personal.summeAufwandCents[12]).toBe(390_400);
    // Juli: 6.500,00 × 1,04^(1/12) × 1,10 = 7.173,407… → 7.173,41 Euro.
    expect(real.umsatz.summeNettoCents[1]).toBe(717_341);
    // Dezember, Abstand 6 Monate, Faktor 0,75: 4.971,544… → 4.971,54 Euro.
    expect(real.umsatz.summeNettoCents[6]).toBe(497_154);
  });

  it("zahlt die negative Junizahllast im Juli und hält die Restschuld nach 36 Monaten", () => {
    // Vorsteuer Juni: Wareneinsatz 312,46 + Anlagen 4.398,50 + Anlauf 76,00 + Kosten 102,60
    // = 4.889,56 Euro. Umsatzsteuer 1.420,25. Zahllast −3.469,31 Euro, Zahlung im Juli.
    expect(real.umsatzsteuer.vorsteuerCents[0]).toBe(488_956);
    expect(real.umsatzsteuer.zahllastCents[0]).toBe(-346_931);
    expect(real.umsatzsteuer.zahlungCents[0]).toBe(0);
    expect(real.umsatzsteuer.zahlungCents[1]).toBe(-346_931);

    // Auszahlung Juni, 12 Monate nur Zins, dann 23 Tilgungen bis Mai 2029.
    // Gezahlt: 22 × 347,22 Euro = 7.638,84 Euro. Rest vor der 23. Rate: 17.361,16 Euro.
    // Zins 17.361,16 × 0,002 = 34,72232 → 34,72 Euro. Rest danach 17.013,94 Euro.
    expect(real.finanzierung.summeZinsCents[0]).toBe(0);
    expect(real.finanzierung.summeRestschuldCents[0]).toBe(2_500_000);
    expect(real.finanzierung.summeZinsCents[1]).toBe(5_000);
    expect(real.finanzierung.summeTilgungCents[12]).toBe(0);
    expect(real.finanzierung.summeTilgungCents[13]).toBe(34_722);
    expect(real.finanzierung.darlehen[0]?.restschuldCents[35]).toBe(1_701_394);
    expect(real.finanzierung.summeZinsCents[35]).toBe(3_472);
    expect(real.finanzierung.summeTilgungCents[35]).toBe(34_722);
  });

  it("rechnet Betriebsergebnis und Zahlungsaldo des Junis aus den Einzelposten", () => {
    // Erlöse 7.475,00 − Wareneinsatz 1.644,50 − Kosten 740,00 − Gründung 65,00
    // − Anlauf 400,00 − AfA 975,00 = 3.650,50 Euro.
    expect(real.uebersicht.betriebsergebnisCents[0]).toBe(365_050);
    // Kunde zahlt 8.895,25. Einlage 15.000, Darlehen 25.000.
    // Auszahlungen: Ware 1.956,96, Kosten 842,60, Gründung 65, Anlauf 476, Anlagen 27.548,50,
    // Lebensbedarf 2.390,00. Saldo 15.616,19 Euro.
    expect(real.uebersicht.einzahlungenKundenCents[0]).toBe(889_525);
    expect(real.uebersicht.auszahlungenInvestitionenCents[0]).toBe(2_754_850);
    expect(real.entnahmen.entnahmeCents[0]).toBe(239_000);
    expect(real.uebersicht.zahlungssaldoCents[0]).toBe(1_561_619);
    // Juli: Erstattung 3.469,31 plus Kundengeld 8.536,36, abzüglich Ware, Kosten, Zins, Entnahme.
    expect(real.uebersicht.zahlungssaldoCents[1]).toBe(684_507);
  });

  it("legt Best und Worst nur auf den Umsatz und lässt den Real Case auf der Basis", () => {
    expect(real.umsatz.summeNettoCents).toEqual(basis.umsatz.summeNettoCents);
    // 7.475,00 × 1,15 = 8.596,25. × 0,7 = 5.232,50.
    expect(berechnePlan(beispielElektro, "best").umsatz.summeNettoCents[0]).toBe(859_625);
    expect(berechnePlan(beispielElektro, "worst").umsatz.summeNettoCents[0]).toBe(523_250);
    expect(berechnePlan(beispielElektro, "best").kosten.summeAufwandCents[0]).toBe(
      real.kosten.summeAufwandCents[0],
    );
  });

  it("hält bei allen Beispielplänen Aufwand und Bestand zusammen", () => {
    for (const beispiel of [beispielElektro, beispielEinzelunternehmen, beispielCafe]) {
      const ergebnis = berechnePlan(beispiel);
      expect(ergebnis.monate).toHaveLength(36);
      for (const anlageErgebnis of ergebnis.investitionen.anlagen) {
        if (anlageErgebnis.behandlung !== "abschreibung") continue;
        expect(
          summeCents(anlageErgebnis.abschreibungCents) + (anlageErgebnis.buchwertCents[35] ?? 0),
        ).toBe(anlageErgebnis.aktivierungCents);
      }
      for (let index = 0; index < 36; index += 1) {
        expect(ergebnis.uebersicht.betriebsergebnisCents[index]).toBe(
          (ergebnis.uebersicht.umsatzerloeseCents[index] ?? 0) -
            (ergebnis.uebersicht.wareneinsatzCents[index] ?? 0) -
            (ergebnis.uebersicht.personalCents[index] ?? 0) -
            (ergebnis.uebersicht.laufendeKostenCents[index] ?? 0) -
            (ergebnis.uebersicht.gruendungAnlaufCents[index] ?? 0) -
            (ergebnis.uebersicht.sofortaufwandCents[index] ?? 0) -
            (ergebnis.uebersicht.abschreibungenCents[index] ?? 0) -
            (ergebnis.uebersicht.zinsaufwandCents[index] ?? 0) -
            (ergebnis.uebersicht.finanzierungsaufwandCents[index] ?? 0) +
            (ergebnis.uebersicht.zuschuesseErtragCents[index] ?? 0),
        );
      }
    }
  });
});

function anlage(teil: {
  id: string;
  nettoCents: number;
  afaMethode: Investition["afaMethode"];
  nutzungsdauerMonate?: number;
  anschaffungsmonat?: string;
  afaStartMonat?: string;
  umsatzsteuerSatz?: number;
}): Investition {
  const basis = {
    id: teil.id,
    bezeichnung: teil.id,
    kategorie: "maschine_ausstattung" as const,
    nettoCents: teil.nettoCents,
    umsatzsteuerSatz: teil.umsatzsteuerSatz ?? 0.19,
    anschaffungsmonat: teil.anschaffungsmonat ?? "2026-01",
    zahlungszielTage: 0,
    afaStartMonat: teil.afaStartMonat,
  };
  if (teil.afaMethode === "linear") {
    return { ...basis, afaMethode: "linear", nutzungsdauerMonate: teil.nutzungsdauerMonate ?? 1 };
  }
  if (teil.afaMethode === "sofort_gwg") {
    return { ...basis, afaMethode: "sofort_gwg", nutzungsdauerMonate: 0 };
  }
  return { ...basis, afaMethode: "sammelposten" };
}
