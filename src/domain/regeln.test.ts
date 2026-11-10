import { describe, expect, it } from "vitest";
import { anlageKlassifikationHinweise } from "./anlage.ts";
import { createEmptyFinanzplan } from "./empty-plan.ts";
import { finanzplanSchema } from "./schema.ts";
import { TAB_MIKRODARLEHEN_ID } from "./parameter.ts";
import type { Finanzplan } from "./types.ts";
import { ustZahllastZahlungsmonat, zahlungszielMonate } from "./zahlung.ts";

const FIXED_NOW = new Date("2026-04-01T00:00:00.000Z");

function plan(): Finanzplan {
  return createEmptyFinanzplan({ id: "plan-regeln", now: FIXED_NOW, startMonat: "2026-04" });
}

describe("Zahlungsziel und Umsatzsteuer-Zahllast", () => {
  it("rundet Zahlungsziele auf ganze Monate", () => {
    expect(zahlungszielMonate(0)).toBe(0);
    expect(zahlungszielMonate(14)).toBe(0);
    expect(zahlungszielMonate(15)).toBe(1);
    expect(zahlungszielMonate(44)).toBe(1);
    expect(zahlungszielMonate(45)).toBe(2);
  });

  it("legt den Zahlungsmonat der Zahllast fest", () => {
    const soll = { ...plan().umsatzsteuer, voranmeldungszeitraum: "monatlich" as const };
    expect(ustZahllastZahlungsmonat("2026-04", soll)).toBe("2026-05");
    expect(ustZahllastZahlungsmonat("2026-04", { ...soll, dauerfristverlaengerung: true })).toBe(
      "2026-06",
    );
    const quartal = { ...soll, voranmeldungszeitraum: "vierteljaehrlich" as const };
    expect(ustZahllastZahlungsmonat("2026-02", quartal)).toBe("2026-04");
    expect(ustZahllastZahlungsmonat("2026-10", quartal)).toBe("2027-01");
    expect(ustZahllastZahlungsmonat("2026-02", { ...quartal, dauerfristverlaengerung: true })).toBe(
      "2026-05",
    );
    expect(ustZahllastZahlungsmonat("2026-04", { ...soll, regime: "kleinunternehmer" })).toBeNull();
  });
});

describe("GWG-Grenzen und Mikrodarlehen", () => {
  it("warnt, wenn Methode und Betrag nicht zusammenpassen", () => {
    const basis = plan();
    basis.kapitalbedarf.investitionen.push(
      {
        id: "inv-ok",
        bezeichnung: "Kleines Werkzeug",
        kategorie: "maschine_ausstattung",
        nettoCents: 65_000,
        umsatzsteuerSatz: 0.19,
        anschaffungsmonat: "2026-04",
        nutzungsdauerMonate: 0,
        afaMethode: "sofort_gwg",
        zahlungszielTage: 0,
      },
      {
        id: "inv-zu-teuer",
        bezeichnung: "Zu teures GWG",
        kategorie: "it",
        nettoCents: 90_000,
        umsatzsteuerSatz: 0.19,
        anschaffungsmonat: "2026-04",
        nutzungsdauerMonate: 0,
        afaMethode: "sofort_gwg",
        zahlungszielTage: 0,
      },
      {
        id: "inv-pool",
        bezeichnung: "Sammelposten passend",
        kategorie: "buero_einrichtung",
        nettoCents: 25_001,
        umsatzsteuerSatz: 0.19,
        anschaffungsmonat: "2026-04",
        nutzungsdauerMonate: 60,
        afaMethode: "sammelposten",
        zahlungszielTage: 0,
      },
      {
        id: "inv-pool-klein",
        bezeichnung: "Sammelposten zu klein",
        kategorie: "buero_einrichtung",
        nettoCents: 25_000,
        umsatzsteuerSatz: 0.19,
        anschaffungsmonat: "2026-04",
        nutzungsdauerMonate: 60,
        afaMethode: "sammelposten",
        zahlungszielTage: 0,
      },
    );
    const codes = anlageKlassifikationHinweise(basis).map((hinweis) => hinweis.code);
    expect(codes).toEqual(["gwg_betrag_zu_hoch", "sammelposten_ausserhalb"]);
    expect(finanzplanSchema.safeParse(basis).success).toBe(true);
  });

  it("prüft die Spanne des Thüringer Mikrodarlehens", () => {
    const basis = plan();
    basis.finanzierung.darlehen.push({
      id: "darlehen-tab",
      bezeichnung: "Mikrodarlehen",
      geber: "TAB",
      art: "foerderdarlehen",
      vorlageId: TAB_MIKRODARLEHEN_ID,
      betragCents: 400_000,
      auszahlungen: [{ monat: "2026-04", betragCents: 400_000 }],
      nominalzinsPa: 0.024,
      laufzeitMonate: 84,
      tilgungsfreieMonate: 12,
      zinszahlungInTilgungsfreierZeit: true,
      tilgungsart: "ratentilgung",
      auszahlungAnteil: 1,
      gebuehrenCents: 0,
    });
    const zuKlein = finanzplanSchema.safeParse(basis);
    expect(zuKlein.success).toBe(false);

    const passend = structuredClone(basis);
    const darlehen = passend.finanzierung.darlehen[0];
    if (!darlehen) throw new Error("Darlehen fehlt");
    darlehen.betragCents = 2_000_000;
    darlehen.auszahlungen = [{ monat: "2026-04", betragCents: 2_000_000 }];
    expect(finanzplanSchema.safeParse(passend).success).toBe(true);

    const zuLang = structuredClone(passend);
    const langesDarlehen = zuLang.finanzierung.darlehen[0];
    if (!langesDarlehen) throw new Error("Darlehen fehlt");
    langesDarlehen.laufzeitMonate = 85;
    expect(finanzplanSchema.safeParse(zuLang).success).toBe(false);
  });
});
