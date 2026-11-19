import { verteileNachAnteilen } from "../calc/steuer.ts";
import type { Planberechnung, SteuerPersonJahr, VorsorgePerson } from "../calc/types.ts";
import { LEBENSHALTUNG_BLOECKE, blockMonatCents, postenMonatCents } from "../privat.ts";
import type { Finanzplan, Person, Privatblock } from "../types.ts";
import {
  bewegung,
  differenz,
  istKapitalgesellschaft,
  istPersonenunternehmen,
  leereCents,
  steuerAufMonate,
  type Bewegungszeile,
  type Planjahr,
} from "./planjahr.ts";
import type { Tragfaehigkeit, TragfaehigkeitPerson } from "./typen.ts";

const HINWEIS_KAPITAL =
  "Für GmbH und UG wird die Tragfähigkeit nicht ausgewiesen. Das Geschäftsführergehalt ist Betriebsausgabe. Ausschüttungen werden nicht gerechnet. Der private Lebensbedarf bleibt ein Vergleichswert und ist keine Entnahme.";

const HINWEIS_OHNE_FORM =
  "Ohne Rechtsform wird die Tragfähigkeit nicht ausgewiesen. Sie gilt für Einzelunternehmen, Freiberuf und Personengesellschaften.";

const HINWEIS_PERSONEN =
  "Tragfähig ist eine Person, wenn ihr verfügbares Einkommen im Planjahr 2 mindestens 0 ist. Verfügbares Einkommen ist der Gewinnanteil nach den eigenen Steuern, minus die privaten Blöcke 1 bis 5, minus Kranken-, Pflege-, Renten- und Arbeitslosenversicherung. Die Einkommensteuerrücklage steht im Block Abgaben und Steuern nur nachrichtlich: die festgesetzte Steuer ist in der Zeile Steuern schon abgezogen. Die Steuer des Kalenderjahres wird wie in der Rentabilitätsvorschau auf die Planmonate dieses Kalenderjahres verteilt. Fehlt der Lebensbedarf, sind die Blöcke 0.";

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
  const bedarf = person.lebensbedarf;
  const sozial = ergebnis.vorsorge.personen.find((eintrag) => eintrag.personId === person.id);
  const privatBloecke = (bedarf?.bloecke ?? []).map((block) => ({
    schluessel: block.schluessel,
    zeile: blockZeile(block, person.id, ergebnis.monate, start, jahre),
  }));
  const abgaben = abgabenZeile(person, sozial, laenge, jahre);
  const alleBloecke = [...privatBloecke.map((block) => block.zeile), abgaben];
  const alltag = privatBloecke
    .filter((block) => LEBENSHALTUNG_BLOECKE.includes(block.schluessel))
    .map((block) => block.zeile);
  const lebenshaltung = summeZeilen("lebenshaltung", "Lebenshaltung", alltag, laenge, jahre);
  const versicherung = privatBloecke.find((block) => block.schluessel === "versicherungen")?.zeile;
  const vorsorgeTeile = [
    ...(versicherung ? [versicherung] : []),
    ...(abgaben.unterzeilen ?? []).filter((zeile) => !zeile.id.startsWith(`est-${person.id}`)),
  ];
  const vorsorgeMonate = summiere(vorsorgeTeile, laenge);
  const nachSteuern = differenz(gewinnanteil, steuern);
  const verfuegbar = differenz(differenz(nachSteuern, lebenshaltung.monateCents), vorsorgeMonate);
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
    lebenshaltung,
    vorsorge: bewegung("vorsorge", "Vorsorge", vorsorgeMonate, jahre, {
      unterzeilen: vorsorgeTeile,
    }),
    bloecke: alleBloecke,
    herleitung: sozial?.herleitung ?? [],
    kvMindestbeitrag: sozial?.mindestbeitrag ?? false,
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

function blockZeile(
  block: Privatblock,
  personId: string,
  monate: readonly string[],
  start: string,
  jahre: readonly Planjahr[],
): Bewegungszeile {
  const posten = block.posten.map((eintrag) =>
    bewegung(
      `posten-${eintrag.id}`,
      eintrag.bezeichnung,
      monate.map((monat, index) => postenMonatCents(eintrag, block, monat, start, index)),
      jahre,
    ),
  );
  const schluessel = block.schluessel === "eigen" ? block.id : block.schluessel;
  return bewegung(
    `block-${personId}-${schluessel}`,
    block.bezeichnung,
    monate.map((monat, index) => blockMonatCents(block, monat, start, index)),
    jahre,
    { unterzeilen: posten },
  );
}

function abgabenZeile(
  person: Person,
  sozial: VorsorgePerson | undefined,
  laenge: number,
  jahre: readonly Planjahr[],
): Bewegungszeile {
  const kv = sozial?.kvCents ?? leereCents(laenge);
  const pv = sozial?.pvCents ?? leereCents(laenge);
  const zusammen = kv.map((wert, index) => wert + (pv[index] ?? 0));
  const rente = sozial?.rvCents ?? leereCents(laenge);
  const arbeit = sozial?.avCents ?? leereCents(laenge);
  const ruecklage = sozial?.estRuecklageCents ?? leereCents(laenge);
  const posten = [
    bewegung(`kv-${person.id}`, "Kranken- und Pflegeversicherung", zusammen, jahre),
    bewegung(`rv-${person.id}`, "Gesetzliche Rentenversicherung", rente, jahre),
    bewegung(`av-${person.id}`, "Arbeitslosenversicherung", arbeit, jahre),
    bewegung(`est-${person.id}`, "Einkommensteuerrücklage", ruecklage, jahre, {
      rolle: "nachricht",
    }),
  ];
  const summe = zusammen.map(
    (wert, index) => wert + (rente[index] ?? 0) + (arbeit[index] ?? 0) + (ruecklage[index] ?? 0),
  );
  return bewegung(`block-${person.id}-abgaben`, "Abgaben und Steuern", summe, jahre, {
    unterzeilen: posten,
  });
}

function summeZeilen(
  id: string,
  bezeichnung: string,
  zeilen: readonly Bewegungszeile[],
  laenge: number,
  jahre: readonly Planjahr[],
): Bewegungszeile {
  return bewegung(id, bezeichnung, summiere(zeilen, laenge), jahre, {
    unterzeilen: [...zeilen],
  });
}

function summiere(zeilen: readonly { monateCents: readonly number[] }[], laenge: number): number[] {
  const werte = leereCents(laenge);
  for (const zeile of zeilen) {
    zeile.monateCents.forEach((wert, index) => {
      werte[index] = (werte[index] ?? 0) + wert;
    });
  }
  return werte;
}
