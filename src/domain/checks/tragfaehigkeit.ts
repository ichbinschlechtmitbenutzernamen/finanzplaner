import type { Berichte, TragfaehigkeitPerson } from "../reports/typen.ts";
import type { Finanzplan, PruefSchwellen } from "../types.ts";
import { formatEuro } from "./format.ts";
import type { Pruefmeldung } from "./typen.ts";

/**
 * Tragfähigkeit nur für Einzelunternehmen, Freiberuf und Personengesellschaften.
 * GmbH und UG lässt der Bericht aus. Lebenshaltung und Vorsorge kommen aus dem Bericht,
 * fehlende Erfassung aus dem Kennzeichen der Person.
 */
export function pruefeTragfaehigkeit(
  _plan: Finanzplan,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  if (!berichte.tragfaehigkeit.anwendbar) return [];
  return berichte.tragfaehigkeit.personen.flatMap((person) =>
    personMeldungen(person, berichte, schwellen),
  );
}

function personMeldungen(
  person: TragfaehigkeitPerson,
  berichte: Berichte,
  schwellen: PruefSchwellen,
): Pruefmeldung[] {
  const meldungen: Pruefmeldung[] = [];
  const planjahr2 = person.planjahr2Cents;
  if (planjahr2 != null && planjahr2 < schwellen.verfuegbarPlanjahr2MinCents) {
    const index = 1;
    meldungen.push({
      id: `tragfaehigkeit-planjahr2-${person.personId}`,
      stufe: "fehler",
      kategorie: "tragfaehigkeit",
      text: `Verfügbares Einkommen von ${person.name} im Planjahr 2 liegt unter ${formatEuro(schwellen.verfuegbarPlanjahr2MinCents)}.`,
      begruendung: `${person.name}: verfügbares Einkommen im Planjahr 2 ${formatEuro(planjahr2)}, Grenze ${formatEuro(schwellen.verfuegbarPlanjahr2MinCents)}. Gewinn nach Steuern ${formatEuro(person.gewinnNachSteuern.planjahreCents[index] ?? 0)}, Lebenshaltung ${formatEuro(person.lebenshaltung.planjahreCents[index] ?? 0)}, Vorsorge ${formatEuro(person.vorsorge.planjahreCents[index] ?? 0)}.`,
      ziel: {
        tabelle: { ansicht: "tragfaehigkeit", zeileId: `kopf-${person.personId}` },
        assistent: { station: "persoenlich", feld: `leben-${person.personId}-lebenshaltung` },
      },
    });
  }

  const jahr = berichte.planjahre[0];
  const monate = jahr ? jahr.bisIndex - jahr.vonIndex : 0;
  const lebenshaltungMonat =
    monate > 0 ? (person.lebenshaltung.planjahreCents[0] ?? 0) / monate : 0;
  const vorsorgeMonat = monate > 0 ? (person.vorsorge.planjahreCents[0] ?? 0) / monate : 0;
  meldungen.push(
    ...betragMeldung({
      name: person.name,
      personId: person.personId,
      art: "lebenshaltung",
      label: "Lebenshaltung",
      monatCents: lebenshaltungMonat,
      schwelleCents: schwellen.lebenshaltungMinMonatCents,
      erfasst: person.lebensbedarfErfasst,
      feld: `leben-${person.personId}-lebenshaltung`,
      zeileId: `leben-${person.personId}-lebenshaltung`,
    }),
  );
  meldungen.push(
    ...betragMeldung({
      name: person.name,
      personId: person.personId,
      art: "vorsorge",
      label: "Vorsorge",
      monatCents: vorsorgeMonat,
      schwelleCents: schwellen.vorsorgeMinMonatCents,
      erfasst: person.lebensbedarfErfasst,
      feld: `leben-${person.personId}-vorsorge`,
      zeileId: `leben-${person.personId}-krankenversicherung`,
    }),
  );
  return meldungen;
}

function betragMeldung(angabe: {
  name: string;
  personId: string;
  art: "lebenshaltung" | "vorsorge";
  label: string;
  monatCents: number;
  schwelleCents: number;
  erfasst: boolean;
  feld: string;
  zeileId: string;
}): Pruefmeldung[] {
  const fehlt = !angabe.erfasst || angabe.monatCents <= 0;
  if (!fehlt && angabe.monatCents >= angabe.schwelleCents) return [];
  const stufe = fehlt ? "warnung" : "hinweis";
  const text = fehlt
    ? `${angabe.label} von ${angabe.name} fehlt.`
    : `${angabe.label} von ${angabe.name} ist auffällig niedrig.`;
  const begruendung = fehlt
    ? angabe.erfasst
      ? `${angabe.label} von ${angabe.name} ist ${formatEuro(angabe.monatCents)} im Monat. Die Schwelle für einen auffällig niedrigen Betrag liegt bei ${formatEuro(angabe.schwelleCents)}.`
      : `Für ${angabe.name} ist kein Lebensbedarf erfasst. ${angabe.label} steht damit bei ${formatEuro(0)} im Monat. Die Schwelle liegt bei ${formatEuro(angabe.schwelleCents)}.`
    : `${angabe.label} von ${angabe.name} liegt im Planjahr 1 bei ${formatEuro(angabe.monatCents)} im Monat. Die Schwelle liegt bei ${formatEuro(angabe.schwelleCents)}.`;
  return [
    {
      id: `tragfaehigkeit-${angabe.art}-${fehlt ? "fehlt" : "niedrig"}-${angabe.personId}`,
      stufe,
      kategorie: "tragfaehigkeit",
      text,
      begruendung,
      ziel: {
        tabelle: angabe.erfasst
          ? { ansicht: "eingaben", zeileId: angabe.zeileId }
          : { ansicht: "tragfaehigkeit", zeileId: `kopf-${angabe.personId}` },
        assistent: { station: "persoenlich", feld: angabe.feld },
      },
    },
  ];
}
