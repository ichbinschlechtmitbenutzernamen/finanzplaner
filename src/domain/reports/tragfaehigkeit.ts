import { monatsbetragCents } from "../calc/monatswert.ts";
import { verteileNachAnteilen } from "../calc/steuer.ts";
import type { Planberechnung, SteuerPersonJahr } from "../calc/types.ts";
import type { Finanzplan, MonatswertVorgabe, Person } from "../types.ts";
import {
  bewegung,
  differenz,
  istKapitalgesellschaft,
  istPersonenunternehmen,
  leereCents,
  steuerAufMonate,
  type Planjahr,
} from "./planjahr.ts";
import type { Tragfaehigkeit, TragfaehigkeitPerson } from "./typen.ts";

const HINWEIS_KAPITAL =
  "Für GmbH und UG wird die Tragfähigkeit nicht ausgewiesen. Das Geschäftsführergehalt ist Betriebsausgabe. Ausschüttungen werden nicht gerechnet. Der private Lebensbedarf bleibt ein Vergleichswert und ist keine Entnahme.";

const HINWEIS_OHNE_FORM =
  "Ohne Rechtsform wird die Tragfähigkeit nicht ausgewiesen. Sie gilt für Einzelunternehmen, Freiberuf und Personengesellschaften.";

const HINWEIS_PERSONEN =
  "Tragfähig ist eine Person, wenn ihr verfügbares Einkommen im Planjahr 2 mindestens 0 ist. Verfügbares Einkommen ist der Gewinnanteil nach den eigenen Steuern, minus Lebenshaltung und minus Vorsorge. Die Steuer des Kalenderjahres wird wie in der Rentabilitätsvorschau auf die Planmonate dieses Kalenderjahres verteilt. Fehlt der Lebensbedarf, sind Lebenshaltung und Vorsorge 0.";

/** Privatbedarf und Tragfähigkeit je beteiligter Person. Für GmbH und UG nur der Hinweis. */
export function tragfaehigkeit(
  plan: Finanzplan,
  ergebnis: Planberechnung,
  jahre: readonly Planjahr[],
): Tragfaehigkeit {
  if (istKapitalgesellschaft(ergebnis.rechtsform)) {
    return { anwendbar: false, hinweis: HINWEIS_KAPITAL, personen: [], alleTragfaehig: null };
  }
  if (!istPersonenunternehmen(ergebnis.rechtsform)) {
    return { anwendbar: false, hinweis: HINWEIS_OHNE_FORM, personen: [], alleTragfaehig: null };
  }

  const personen = plan.stammdaten.personen.filter((person) => person.anteil > 0);
  const anteile = personen.map((person) => person.anteil);
  const gewinnJePerson = ergebnis.uebersicht.betriebsergebnisCents.map(() =>
    leereCents(personen.length),
  );
  ergebnis.uebersicht.betriebsergebnisCents.forEach((gewinn, monat) => {
    const teile = verteileNachAnteilen(gewinn, anteile);
    teile.forEach((teil, personIndex) => {
      const reihe = gewinnJePerson[monat];
      if (reihe) reihe[personIndex] = teil;
    });
  });

  const berichtPersonen = personen.map((person, personIndex) =>
    personBericht(
      person,
      personIndex,
      gewinnJePerson,
      ergebnis,
      jahre,
      plan.startMonat ?? ergebnis.startMonat,
    ),
  );
  const bewertet = berichtPersonen.filter((person) => person.tragfaehig != null);

  return {
    anwendbar: true,
    hinweis: HINWEIS_PERSONEN,
    personen: berichtPersonen,
    alleTragfaehig:
      bewertet.length === 0 ? null : bewertet.every((person) => person.tragfaehig === true),
  };
}

function personBericht(
  person: Person,
  personIndex: number,
  gewinnJePerson: readonly (readonly number[])[],
  ergebnis: Planberechnung,
  jahre: readonly Planjahr[],
  start: string,
): TragfaehigkeitPerson {
  const laenge = ergebnis.monate.length;
  const gewinnanteil = ergebnis.monate.map((_, monat) => gewinnJePerson[monat]?.[personIndex] ?? 0);
  const steuerJahre = ergebnis.steuern.jahre.map((jahr) => ({
    jahr: jahr.jahr,
    steuerCents: steuerDerPerson(jahr.personen.find((eintrag) => eintrag.personId === person.id)),
  }));
  const steuern = steuerAufMonate(ergebnis.monate, steuerJahre);
  const lebenshaltung = leereCents(laenge);
  const kranken = leereCents(laenge);
  const pflege = leereCents(laenge);
  const alter = leereCents(laenge);
  const sonstige = leereCents(laenge);
  const bedarf = person.lebensbedarf;
  ergebnis.monate.forEach((monat, index) => {
    lebenshaltung[index] = betrag(bedarf?.lebenshaltung, monat, start);
    kranken[index] = betrag(bedarf?.krankenversicherung, monat, start);
    pflege[index] = betrag(bedarf?.pflegeversicherung, monat, start);
    alter[index] = betrag(bedarf?.altersvorsorge, monat, start);
    sonstige[index] = betrag(bedarf?.sonstigeVersicherungen, monat, start);
  });
  const vorsorgeMonate = kranken.map(
    (wert, index) => wert + (pflege[index] ?? 0) + (alter[index] ?? 0) + (sonstige[index] ?? 0),
  );
  const nachSteuern = differenz(gewinnanteil, steuern);
  const verfuegbar = differenz(differenz(nachSteuern, lebenshaltung), vorsorgeMonate);
  const planjahr2 = jahre.find((jahr) => jahr.nummer === 2);
  const planjahr2Cents = planjahr2
    ? verfuegbar
        .slice(planjahr2.vonIndex, planjahr2.bisIndex)
        .reduce((total, wert) => total + wert, 0)
    : null;

  return {
    personId: person.id,
    name: person.name,
    anteil: person.anteil,
    lebensbedarfErfasst: bedarf != null,
    gewinnNachSteuern: bewegung("gewinn-nach-steuern", "Gewinn nach Steuern", nachSteuern, jahre, {
      rolle: "ergebnis",
      unterzeilen: [
        bewegung("gewinnanteil", "Gewinnanteil vor Steuern", gewinnanteil, jahre),
        bewegung("steuern", "Steuern", steuern, jahre),
      ],
    }),
    lebenshaltung: bewegung("lebenshaltung", "Lebenshaltung", lebenshaltung, jahre),
    vorsorge: bewegung("vorsorge", "Vorsorge", vorsorgeMonate, jahre, {
      unterzeilen: [
        bewegung("krankenversicherung", "Krankenversicherung", kranken, jahre),
        bewegung("pflegeversicherung", "Pflegeversicherung", pflege, jahre),
        bewegung("altersvorsorge", "Altersvorsorge", alter, jahre),
        bewegung("sonstige-versicherungen", "Sonstige Versicherungen", sonstige, jahre),
      ],
    }),
    verfuegbaresEinkommen: bewegung(
      "verfuegbares-einkommen",
      "Verfügbares Einkommen",
      verfuegbar,
      jahre,
      { rolle: "ergebnis" },
    ),
    planjahr2Cents,
    tragfaehig: planjahr2Cents == null ? null : planjahr2Cents >= 0,
  };
}

function steuerDerPerson(person: SteuerPersonJahr | undefined): number {
  if (!person) return 0;
  return (
    person.einkommensteuerCents +
    person.solidaritaetszuschlagCents +
    person.kirchensteuerCents +
    person.gewerbesteuerAnteilCents
  );
}

function betrag(vorgabe: MonatswertVorgabe | undefined, monat: string, start: string): number {
  if (!vorgabe) return 0;
  return monatsbetragCents(vorgabe, monat, start);
}
