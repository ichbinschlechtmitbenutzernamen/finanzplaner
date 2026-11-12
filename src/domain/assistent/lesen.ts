import { TAB_MIKRODARLEHEN_ID } from "../parameter.ts";
import type {
  Finanzplan,
  GruendungszuschussAuszahlung,
  Kostenposition,
  MonatFaktoren,
  Umsatzposition,
} from "../types.ts";
import type { AssistentDurchlauf } from "./durchlauf.ts";
import { istJahresmodus, jahreswerteVon, monateDesPlans } from "./schreiben.ts";
import type {
  EinmalEingabe,
  FinanzierungEingabe,
  GruendungszuschussEingabe,
  InvestitionEingabe,
  KostenEingabe,
  LebensbedarfEingabe,
  StelleEingabe,
  UmsatzEingabe,
  VorhabenEingabe,
  WareneinsatzEingabe,
} from "./schreiben.ts";

export function leseVorhaben(plan: Finanzplan): VorhabenEingabe {
  const stamm = plan.stammdaten;
  const ust = plan.umsatzsteuer;
  return {
    name: stamm.firmenname,
    planName: stamm.planName,
    gruendungsmonat: stamm.gruendungsmonat ?? plan.startMonat ?? "",
    rechtsform: stamm.rechtsform,
    bundesland: stamm.bundesland,
    kleinunternehmer: ust.regime === "kleinunternehmer",
    vorsteuerabzug: ust.vorsteuerabzugsberechtigt,
    versteuerungsart: ust.versteuerungsart,
    voranmeldungszeitraum: ust.voranmeldungszeitraum,
    dauerfristverlaengerung: ust.dauerfristverlaengerung,
    gesellschafter: stamm.personen.map((person) => ({
      id: person.id,
      name: person.name,
      anteil: person.anteil,
      rollen: person.rollen,
    })),
    ort: stamm.ort,
    hebesatz: stamm.gewerbesteuerHebesatz,
    branche: stamm.branche,
    branchenschluessel: stamm.branchenschluessel,
    wzCode: stamm.wzCode,
    taetigkeitsbeschreibung: stamm.taetigkeitsbeschreibung,
    strasse: stamm.strasse,
    plz: stamm.plz,
    handelsregisterGeplant: stamm.handelsregisterGeplant,
    stammkapitalCents: stamm.stammkapitalCents,
    zwecke: [...stamm.zwecke],
    beispiel: stamm.beispiel,
  };
}

export function leseLebensbedarf(plan: Finanzplan): LebensbedarfEingabe[] {
  return plan.stammdaten.personen.flatMap((person) => {
    if (!person.lebensbedarf) return [];
    return [
      {
        personId: person.id,
        lebenshaltung: person.lebensbedarf.lebenshaltung,
        krankenversicherung: person.lebensbedarf.krankenversicherung,
        pflegeversicherung: person.lebensbedarf.pflegeversicherung,
        altersvorsorge: person.lebensbedarf.altersvorsorge,
        sonstigeVersicherungen: person.lebensbedarf.sonstigeVersicherungen,
        kirchensteuer: person.steuerprofil?.kirchensteuer ?? false,
        splitting: person.steuerprofil?.splitting,
        kinderfreibetraege: person.steuerprofil?.kinderfreibetraege,
        weitereEinkuenfteJahrCents: person.steuerprofil?.weitereEinkuenfteJahrCents,
      },
    ];
  });
}

export function leseGruendungszuschuss(plan: Finanzplan): GruendungszuschussEingabe | null {
  const zuschuss = plan.finanzierung.zuschuesse.find(
    (eintrag) => eintrag.auszahlung.art === "gruendungszuschuss",
  );
  if (!zuschuss || zuschuss.auszahlung.art !== "gruendungszuschuss") return null;
  const auszahlung: GruendungszuschussAuszahlung = zuschuss.auszahlung;
  return {
    id: zuschuss.id,
    bezeichnung: zuschuss.bezeichnung,
    alg1MonatlichCents: auszahlung.alg1MonatlichCents,
    phase1Monate: auszahlung.phase1Monate,
    pauschaleCents: auszahlung.pauschaleCents,
    phase2Geplant: auszahlung.phase2Geplant,
    phase2Monate: auszahlung.phase2Monate,
    startMonat: auszahlung.startMonat,
    notizen: zuschuss.notizen,
  };
}

export function leseUmsatz(plan: Finanzplan): UmsatzEingabe[] {
  const monate = monateDesPlans(plan);
  return plan.umsatzplanung.flatMap((linie) => umsatzEingabe(plan, linie, monate));
}

export function leseWareneinsatz(plan: Finanzplan): WareneinsatzEingabe[] {
  return plan.umsatzplanung.map((linie) => ({
    id: linie.id,
    quote: linie.wareneinsatz.art === "keiner" ? null : linie.wareneinsatz.quote,
    umsatzsteuerSatz:
      linie.wareneinsatz.art === "prozent_vom_umsatz"
        ? linie.wareneinsatz.umsatzsteuerSatz
        : linie.umsatzsteuerSatz,
  }));
}

export function lesePersonal(plan: Finanzplan): StelleEingabe[] {
  return plan.personal.map((stelle) => ({
    id: stelle.id,
    bezeichnung: stelle.bezeichnung,
    name: stelle.name,
    rolle: stelle.rolle,
    brutto: stelle.brutto,
    eintritt: stelle.eintritt,
    austritt: stelle.austritt,
    agNebenkostenSatz: stelle.agNebenkostenSatz,
    sozialversicherungspflichtig: stelle.sozialversicherungspflichtig,
    wochenstunden: stelle.wochenstunden,
    personId: stelle.personId,
    notizen: stelle.notizen,
    sonderzahlungen: stelle.sonderzahlungen,
    nebenkostenDetail: stelle.nebenkostenDetail,
  }));
}

export function leseKosten(plan: Finanzplan): KostenEingabe[] {
  return plan.laufendeKosten.map((posten) => kostenEingabe(posten));
}

export function leseInvestitionen(plan: Finanzplan): {
  posten: InvestitionEingabe[];
  gruendungskosten: EinmalEingabe[];
  anlaufkosten: EinmalEingabe[];
} {
  return {
    posten: plan.kapitalbedarf.investitionen.map((posten) => ({
      id: posten.id,
      bezeichnung: posten.bezeichnung,
      kategorie: posten.kategorie,
      nettoCents: posten.nettoCents,
      umsatzsteuerSatz: posten.umsatzsteuerSatz,
      anschaffungsmonat: posten.anschaffungsmonat,
      zahlungszielTage: posten.zahlungszielTage,
      methode: posten.afaMethode,
      nutzungsdauerMonate: posten.afaMethode === "linear" ? posten.nutzungsdauerMonate : undefined,
      afaStartMonat: posten.afaStartMonat,
      restwertCents: posten.afaMethode === "sofort_gwg" ? undefined : posten.restwertCents,
      notizen: posten.notizen,
    })),
    gruendungskosten: plan.kapitalbedarf.gruendungskosten.map(einmalEingabe),
    anlaufkosten: plan.kapitalbedarf.anlaufkosten.map(einmalEingabe),
  };
}

export function leseFinanzierung(plan: Finanzplan): FinanzierungEingabe {
  const tab = plan.finanzierung.darlehen.find(
    (darlehen) => darlehen.vorlageId === TAB_MIKRODARLEHEN_ID,
  );
  const weitere = plan.finanzierung.darlehen.filter((darlehen) => darlehen !== tab);
  return {
    eigenkapital: [
      ...plan.finanzierung.eigenkapital.map((posten) => ({
        id: posten.id,
        bezeichnung: posten.bezeichnung,
        betragCents: posten.betragCents,
        monat: posten.monat,
        art: posten.art,
        personId: posten.personId,
        notizen: posten.notizen,
      })),
      ...(plan.assistent?.offeneEinlagen ?? []).map((posten) => ({
        id: posten.id,
        bezeichnung: posten.bezeichnung,
        betragCents: null,
        monat: posten.monat,
        art: posten.art,
        personId: posten.personId,
        notizen: posten.notizen,
      })),
    ],
    tab: tab
      ? {
          id: tab.id,
          betragCents: tab.betragCents,
          monat: tab.auszahlungen[0]?.monat ?? plan.startMonat ?? "",
          laufzeitMonate: tab.laufzeitMonate,
          tilgungsfreieMonate: tab.tilgungsfreieMonate,
          bezeichnung: tab.bezeichnung,
          geber: tab.geber,
          notizen: tab.notizen,
          sicherheitenNotiz: tab.sicherheitenNotiz,
        }
      : null,
    weitere: [
      ...weitere.map((darlehen) => ({
        id: darlehen.id,
        bezeichnung: darlehen.bezeichnung,
        geber: darlehen.geber,
        art: darlehen.art,
        betragCents: darlehen.betragCents,
        monat: darlehen.auszahlungen[0]?.monat ?? plan.startMonat ?? "",
        nominalzinsPa: darlehen.nominalzinsPa,
        laufzeitMonate: darlehen.laufzeitMonate,
        tilgungsfreieMonate: darlehen.tilgungsfreieMonate,
        tilgungsart: darlehen.tilgungsart,
        zinszahlungInTilgungsfreierZeit: darlehen.zinszahlungInTilgungsfreierZeit,
        auszahlungAnteil: darlehen.auszahlungAnteil,
        gebuehrenCents: darlehen.gebuehrenCents,
        personId: darlehen.personId,
        vorlageId: darlehen.vorlageId,
        sicherheitenNotiz: darlehen.sicherheitenNotiz,
        disagioCents: darlehen.disagioCents,
        notizen: darlehen.notizen,
      })),
      ...(plan.assistent?.offeneDarlehen ?? []).map((darlehen) => ({
        ...darlehen,
        betragCents: null,
      })),
    ],
    liquiditaetsreserveCents: plan.kapitalbedarf.betriebsmittel.liquiditaetsreserveCents,
    betriebsmittelbedarfCents: plan.kapitalbedarf.betriebsmittel.betriebsmittelbedarfCents,
    betriebsmittelNotizen: plan.kapitalbedarf.betriebsmittel.notizen,
  };
}

export function durchlaufAus(plan: Finanzplan): AssistentDurchlauf {
  return {
    vorhaben: leseVorhaben(plan),
    persoenlich: { personen: leseLebensbedarf(plan), zuschuss: leseGruendungszuschuss(plan) },
    umsatz: leseUmsatz(plan),
    wareneinsatz: leseWareneinsatz(plan),
    personal: lesePersonal(plan),
    kosten: leseKosten(plan),
    investitionen: leseInvestitionen(plan),
    finanzierung: leseFinanzierung(plan),
    abschluss: {
      notizen: plan.notizen,
      szenarien: plan.szenarien,
      beispiel: plan.stammdaten.beispiel,
      status: plan.status,
    },
  };
}

export function neutraleSaison(): MonatFaktoren {
  return [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
}

function umsatzEingabe(
  plan: Finanzplan,
  linie: Umsatzposition,
  monate: ReturnType<typeof monateDesPlans>,
): UmsatzEingabe[] {
  if (linie.art !== "monatsumsatz") return [];
  const gemeinsam = {
    id: linie.id,
    bezeichnung: linie.bezeichnung,
    beschreibung: linie.beschreibung,
    umsatzsteuerSatz: linie.umsatzsteuerSatz,
    zahlungszielTage: linie.zahlungszielTage,
    aktivVon: linie.aktivVon,
    aktivBis: linie.aktivBis,
  };
  if (istJahresmodus(linie.monatsumsatz, monate)) {
    return [
      { ...gemeinsam, modus: "jahre", jahresCents: jahreswerteVon(plan, linie.monatsumsatz) },
    ];
  }
  return [
    {
      ...gemeinsam,
      modus: "monat",
      basisCents: linie.monatsumsatz.basisCents,
      wachstum: linie.monatsumsatz.wachstum,
      saison: linie.monatsumsatz.saison?.faktoren,
    },
  ];
}

function kostenEingabe(posten: Kostenposition): KostenEingabe {
  const basis = {
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    kategorie: posten.kategorie,
    umsatzsteuerSatz: posten.umsatzsteuerSatz,
    zahlungszielTage: posten.zahlungszielTage,
    betriebsausgabe: posten.betriebsausgabe,
    privatanteil: posten.privatanteil,
    aktivVon: posten.aktivVon,
    aktivBis: posten.aktivBis,
    notizen: posten.notizen,
  };
  if (posten.art === "umsatzabhaengig") {
    return { ...basis, art: "umsatzabhaengig", umsatzquote: posten.umsatzquote };
  }
  return { ...basis, art: "fix", betrag: posten.betrag };
}

function einmalEingabe(
  posten: Finanzplan["kapitalbedarf"]["gruendungskosten"][number],
): EinmalEingabe {
  return {
    id: posten.id,
    bezeichnung: posten.bezeichnung,
    nettoCents: posten.nettoCents,
    umsatzsteuerSatz: posten.umsatzsteuerSatz,
    monat: posten.monat,
    zahlungszielTage: posten.zahlungszielTage,
    notizen: posten.notizen,
  };
}
