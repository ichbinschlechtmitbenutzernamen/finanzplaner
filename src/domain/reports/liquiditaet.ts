import type { Planberechnung } from "../calc/types.ts";
import {
  abfluss,
  bestand,
  bewegung,
  kumuliert,
  summeReihen,
  zufluss,
  type Planjahr,
} from "./planjahr.ts";
import type { Liquiditaetsplan } from "./typen.ts";

const HINWEIS =
  "Der Anfangsbestand ist 0. Der Endbestand ist die laufende Summe der Zahlungssalden aus dem Rechenkern, einschließlich der Ertragsteuer zu ihren Zahlungszeitpunkten. Die Liquiditätsreserve ist kein Kassenbestand. Die empfohlene Steuerrücklage ist ein Merkposten und mindert den Bestand nicht. Der tiefste Kontostand ist der niedrigste Endbestand der Planmonate.";

/** Liquiditätsplan mit gegliederten Ein- und Auszahlungen und dem Kontostand je Monatsende. */
export function liquiditaetsplan(
  ergebnis: Planberechnung,
  jahre: readonly Planjahr[],
): Liquiditaetsplan {
  const zahlung = ergebnis.uebersicht;
  const einzahlungUnter = [
    bewegung("einzahlung-kunden", "Kundenzahlungen", zahlung.einzahlungenKundenCents, jahre),
    bewegung("einzahlung-einlagen", "Einlagen", zahlung.einlagenCents, jahre),
    bewegung(
      "einzahlung-darlehen",
      "Darlehensauszahlungen",
      zahlung.darlehensauszahlungCents,
      jahre,
    ),
    bewegung("einzahlung-zuschuesse", "Zuschüsse", zahlung.zuschuesseZahlungCents, jahre),
    bewegung(
      "einzahlung-ust",
      "Umsatzsteuer-Erstattungen",
      zufluss(zahlung.umsatzsteuerZahlungCents),
      jahre,
    ),
    bewegung(
      "einzahlung-est",
      "Erstattungen Einkommensteuer",
      zufluss(zahlung.steuerEinkommenZahlungCents),
      jahre,
    ),
    bewegung(
      "einzahlung-gewst",
      "Erstattungen Gewerbesteuer",
      zufluss(zahlung.steuerGewerbeZahlungCents),
      jahre,
    ),
    bewegung(
      "einzahlung-kst",
      "Erstattungen Körperschaftsteuer",
      zufluss(zahlung.steuerKoerperschaftZahlungCents),
      jahre,
    ),
  ];
  const auszahlungUnter = [
    bewegung("auszahlung-ware", "Wareneinsatz", zahlung.auszahlungenWareneinsatzCents, jahre),
    bewegung("auszahlung-personal", "Personal", zahlung.auszahlungenPersonalCents, jahre),
    bewegung(
      "auszahlung-kosten",
      "Laufende Kosten, Gründung und Anlauf",
      zahlung.auszahlungenKostenCents,
      jahre,
    ),
    bewegung(
      "auszahlung-investitionen",
      "Investitionen",
      zahlung.auszahlungenInvestitionenCents,
      jahre,
    ),
    bewegung("auszahlung-zinsen", "Zinsen", zahlung.auszahlungenZinsenCents, jahre),
    bewegung("auszahlung-tilgung", "Tilgung", zahlung.auszahlungenTilgungCents, jahre),
    bewegung("auszahlung-ust", "Umsatzsteuer", abfluss(zahlung.umsatzsteuerZahlungCents), jahre),
    bewegung(
      "auszahlung-est",
      "Einkommensteuer, Solidaritätszuschlag und Kirchensteuer",
      abfluss(zahlung.steuerEinkommenZahlungCents),
      jahre,
    ),
    bewegung(
      "auszahlung-gewst",
      "Gewerbesteuer",
      abfluss(zahlung.steuerGewerbeZahlungCents),
      jahre,
    ),
    bewegung(
      "auszahlung-kst",
      "Körperschaftsteuer und Solidaritätszuschlag",
      abfluss(zahlung.steuerKoerperschaftZahlungCents),
      jahre,
    ),
    bewegung("auszahlung-entnahmen", "Privatentnahmen", zahlung.entnahmenCents, jahre),
  ];

  const einMonate = summeReihen(einzahlungUnter.map((zeile) => zeile.monateCents));
  const ausMonate = summeReihen(auszahlungUnter.map((zeile) => zeile.monateCents));
  const anfangMonate = zahlung.zahlungssaldoCents.map(() => 0);
  const endeMonate = zahlung.zahlungssaldoCents.map(() => 0);
  for (let index = 0; index < endeMonate.length; index += 1) {
    const anfang = index === 0 ? 0 : (endeMonate[index - 1] ?? 0);
    anfangMonate[index] = anfang;
    endeMonate[index] = anfang + (einMonate[index] ?? 0) - (ausMonate[index] ?? 0);
  }

  let tiefster = endeMonate[0] ?? 0;
  let tiefsterIndex = endeMonate.length > 0 ? 0 : -1;
  endeMonate.forEach((wert, index) => {
    if (wert < tiefster) {
      tiefster = wert;
      tiefsterIndex = index;
    }
  });

  const ruecklageKumuliert = ergebnis.steuern.monate.map((monat) => monat.ruecklageKumuliertCents);

  return {
    anfangsbestand: bestand(
      "anfangsbestand",
      "Anfangsbestand",
      anfangMonate,
      jahre,
      "monatsanfang",
    ),
    einzahlungen: bewegung("einzahlungen", "Einzahlungen", einMonate, jahre, {
      rolle: "summe",
      unterzeilen: einzahlungUnter,
    }),
    auszahlungen: bewegung("auszahlungen", "Auszahlungen", ausMonate, jahre, {
      rolle: "summe",
      unterzeilen: auszahlungUnter,
    }),
    endbestand: bestand("endbestand", "Endbestand", endeMonate, jahre, "monatsende", {
      rolle: "ergebnis",
    }),
    steuerruecklage: bewegung(
      "steuerruecklage",
      "Empfohlene Steuerrücklage",
      zahlung.steuerRuecklageCents,
      jahre,
      { rolle: "nachricht" },
    ),
    steuerruecklageKumuliert: bestand(
      "steuerruecklage-kumuliert",
      "Steuerrücklage, kumulierter Stand",
      ruecklageKumuliert.length > 0 ? ruecklageKumuliert : kumuliert(zahlung.steuerRuecklageCents),
      jahre,
      "monatsende",
      { rolle: "nachricht" },
    ),
    tiefsterKontostandCents: tiefster,
    tiefsterKontostandMonat: tiefsterIndex >= 0 ? (ergebnis.monate[tiefsterIndex] ?? null) : null,
    kontokorrentbedarfCents: tiefster < 0 ? -tiefster : 0,
    hinweis: HINWEIS,
  };
}
