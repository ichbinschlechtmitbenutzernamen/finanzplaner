import type { Planberechnung } from "../calc/types.ts";
import type { Kostenkategorie } from "../types.ts";
import {
  RAUMKOSTEN_KATEGORIEN,
  bewegung,
  differenz,
  istPersonenunternehmen,
  leereCents,
  steuerAufMonate,
  summeReihen,
  type Planjahr,
} from "./planjahr.ts";
import type { Rentabilitaetsvorschau } from "./typen.ts";

const RAUM = new Set<Kostenkategorie>(RAUMKOSTEN_KATEGORIEN);

const HINWEIS =
  "Planjahre zählen ab dem Gründungsmonat, zwölf Monate je Planjahr. Die Steuer eines Kalenderjahres wird gleichmäßig auf die Planmonate dieses Kalenderjahres verteilt, der Rest liegt im letzten dieser Monate. Gezahlt wird weiterhin zu den Terminen aus der Steuerrechnung. Privatentnahmen stehen nur nachrichtlich und mindern das Ergebnis nicht.";

/** Rentabilitätsvorschau in der Bankgliederung, Monat für Monat und je Planjahr. */
export function rentabilitaetsvorschau(
  ergebnis: Planberechnung,
  jahre: readonly Planjahr[],
): Rentabilitaetsvorschau {
  const laenge = ergebnis.monate.length;
  const { uebersicht, kosten } = ergebnis;
  const raum = leereCents(laenge);
  const laufendOhneRaum = leereCents(laenge);
  for (const position of kosten.positionen) {
    const ziel = RAUM.has(position.kategorie) ? raum : laufendOhneRaum;
    for (let index = 0; index < laenge; index += 1) {
      ziel[index] = (ziel[index] ?? 0) + (position.aufwandCents[index] ?? 0);
    }
  }

  const zuschuesse = uebersicht.zuschuesseErtragCents.map((wert) => -wert);
  const sonstigeMonate = summeReihen([
    laufendOhneRaum,
    uebersicht.gruendungAnlaufCents,
    uebersicht.sofortaufwandCents,
    uebersicht.finanzierungsaufwandCents,
    zuschuesse,
  ]);
  const steuernMonate = steuerAufMonate(
    ergebnis.monate,
    ergebnis.steuern.jahre.map((jahr) => ({ jahr: jahr.jahr, steuerCents: jahr.steuerLastCents })),
  );
  const ergebnisVor = differenz(
    differenz(
      differenz(
        differenz(
          differenz(
            differenz(uebersicht.umsatzerloeseCents, uebersicht.wareneinsatzCents),
            uebersicht.personalCents,
          ),
          raum,
        ),
        sonstigeMonate,
      ),
      uebersicht.abschreibungenCents,
    ),
    uebersicht.zinsaufwandCents,
  );
  const ergebnisNach = differenz(ergebnisVor, steuernMonate);
  const personenunternehmen = istPersonenunternehmen(ergebnis.rechtsform);

  const zeilen = [
    bewegung("umsatz", "Umsatz", uebersicht.umsatzerloeseCents, jahre),
    bewegung("wareneinsatz", "Wareneinsatz", uebersicht.wareneinsatzCents, jahre),
    bewegung("rohertrag", "Rohertrag", uebersicht.rohertragCents, jahre, { rolle: "ergebnis" }),
    bewegung("personal", "Personal", uebersicht.personalCents, jahre),
    bewegung("raumkosten", "Raumkosten", raum, jahre),
    bewegung("sonstige-kosten", "Sonstige Kosten", sonstigeMonate, jahre, {
      unterzeilen: [
        bewegung("sonstige-laufend", "Laufende Kosten ohne Raumkosten", laufendOhneRaum, jahre),
        bewegung(
          "sonstige-gruendung",
          "Gründungs- und Anlaufkosten",
          uebersicht.gruendungAnlaufCents,
          jahre,
        ),
        bewegung(
          "sonstige-sofort",
          "Sofortaufwand bis 250 Euro",
          uebersicht.sofortaufwandCents,
          jahre,
        ),
        bewegung(
          "sonstige-finanzierung",
          "Disagio, Gebühren und Auszahlungskurs",
          uebersicht.finanzierungsaufwandCents,
          jahre,
        ),
        bewegung("sonstige-zuschuesse", "Steuerpflichtige Zuschüsse", zuschuesse, jahre),
      ],
    }),
    bewegung("abschreibungen", "Abschreibungen", uebersicht.abschreibungenCents, jahre),
    bewegung("zinsen", "Zinsen", uebersicht.zinsaufwandCents, jahre),
    bewegung("ergebnis-vor-steuern", "Ergebnis vor Steuern", ergebnisVor, jahre, {
      rolle: "ergebnis",
    }),
    bewegung("steuern", "Steuern", steuernMonate, jahre),
    bewegung("ergebnis-nach-steuern", "Ergebnis nach Steuern", ergebnisNach, jahre, {
      rolle: "ergebnis",
    }),
  ];

  if (personenunternehmen) {
    zeilen.push(
      bewegung("privatentnahmen", "Privatentnahmen", uebersicht.entnahmenCents, jahre, {
        rolle: "nachricht",
      }),
    );
  }

  return {
    zeilen,
    privatentnahmenAusgewiesen: personenunternehmen,
    kalenderjahre: ergebnis.steuern.jahre.map((jahr) => ({
      jahr: jahr.jahr,
      vonMonat: jahr.vonMonat,
      bisMonat: jahr.bisMonat,
      monateImPlan: jahr.monateImPlan,
      steuerCents: jahr.steuerLastCents,
    })),
    hinweis: HINWEIS,
  };
}
