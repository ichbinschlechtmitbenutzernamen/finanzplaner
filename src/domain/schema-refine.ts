import { addMonths, horizonEnd, isWithinHorizon, monthIndex } from "./months.ts";
import type {
  EigenkapitalPosten,
  Finanzplan,
  IsoMonth,
  MengenVorgabe,
  MonatswertVorgabe,
  Person,
  PersonRolle,
  Szenario,
  SzenarioAnpassung,
} from "./types.ts";

export interface PlanIssue {
  code: "custom";
  message: string;
  path: PropertyKey[];
  [key: string]: unknown;
}

export interface PlanIssueContext {
  addIssue(issue: PlanIssue): void;
}

interface Bounds {
  from?: IsoMonth;
  to?: IsoMonth;
}

function issue(ctx: PlanIssueContext, path: PropertyKey[], message: string): void {
  ctx.addIssue({ code: "custom", message, path });
}

function inHorizon(
  plan: Finanzplan,
  month: IsoMonth,
  path: PropertyKey[],
  ctx: PlanIssueContext,
): void {
  if (!isWithinHorizon(plan.startMonat, month, plan.horizontMonate)) {
    const last = horizonEnd(plan.startMonat, plan.horizontMonate);
    issue(
      ctx,
      path,
      `Monat ${month} liegt nicht im Planungszeitraum ${plan.startMonat} bis ${last}.`,
    );
  }
}

function sameRollen(person: Person, expected: readonly PersonRolle[]): boolean {
  return (
    person.rollen.length === expected.length &&
    expected.every((rolle) => person.rollen.includes(rolle))
  );
}

function collectIds(plan: Finanzplan): { id: string; path: PropertyKey[] }[] {
  const rows: { id: string; path: PropertyKey[] }[] = [];
  const pushAll = (items: { id: string }[], path: PropertyKey[]) => {
    items.forEach((item, index) => {
      rows.push({ id: item.id, path: [...path, index, "id"] });
    });
  };

  pushAll(plan.stammdaten.personen, ["stammdaten", "personen"]);
  pushAll(plan.kapitalbedarf.investitionen, ["kapitalbedarf", "investitionen"]);
  pushAll(plan.kapitalbedarf.gruendungskosten, ["kapitalbedarf", "gruendungskosten"]);
  pushAll(plan.kapitalbedarf.anlaufkosten, ["kapitalbedarf", "anlaufkosten"]);
  pushAll(plan.finanzierung.eigenkapital, ["finanzierung", "eigenkapital"]);
  pushAll(plan.finanzierung.darlehen, ["finanzierung", "darlehen"]);
  pushAll(plan.finanzierung.zuschuesse, ["finanzierung", "zuschuesse"]);
  pushAll(plan.umsatzplanung, ["umsatzplanung"]);
  pushAll(plan.personal, ["personal"]);
  pushAll(plan.laufendeKosten, ["laufendeKosten"]);

  (["best", "real", "worst"] as const).forEach((key) => {
    pushAll(plan.szenarien[key].anpassungen, ["szenarien", key, "anpassungen"]);
  });

  return rows;
}

function validateUniqueIds(plan: Finanzplan, ctx: PlanIssueContext): void {
  const seen = new Map<string, PropertyKey[]>();
  for (const row of collectIds(plan)) {
    if (seen.has(row.id)) {
      issue(ctx, row.path, `Die Id „${row.id}" ist mehrfach vergeben.`);
    } else {
      seen.set(row.id, row.path);
    }
  }
}

function validateRechtsform(plan: Finanzplan, ctx: PlanIssueContext): void {
  const { rechtsform, personen, stammkapitalCents, gewerbesteuerHebesatz } = plan.stammdaten;
  const isCorporation = rechtsform === "gmbh" || rechtsform === "ug";

  if (isCorporation && stammkapitalCents == null) {
    issue(ctx, ["stammdaten", "stammkapitalCents"], "GmbH und UG brauchen ein Stammkapital.");
  }
  if (!isCorporation && stammkapitalCents != null) {
    issue(
      ctx,
      ["stammdaten", "stammkapitalCents"],
      "Stammkapital ist nur bei GmbH und UG vorgesehen.",
    );
  }
  if (rechtsform !== "freiberufler" && gewerbesteuerHebesatz == null) {
    issue(
      ctx,
      ["stammdaten", "gewerbesteuerHebesatz"],
      "Für diese Rechtsform ist der Gewerbesteuer-Hebesatz der Gemeinde nötig.",
    );
  }

  personen.forEach((person, index) => {
    if (new Set(person.rollen).size !== person.rollen.length) {
      issue(ctx, ["stammdaten", "personen", index, "rollen"], "Jede Rolle nur einmal je Person.");
    }
  });

  if (rechtsform === "einzelunternehmen") {
    const person = personen[0];
    if (personen.length !== 1 || person == null || !sameRollen(person, ["inhaber"])) {
      issue(
        ctx,
        ["stammdaten", "personen"],
        "Ein Einzelunternehmen hat genau eine Person mit der Rolle Inhaberin oder Inhaber.",
      );
    }
  }

  if (rechtsform === "freiberufler") {
    const person = personen[0];
    if (personen.length !== 1 || person == null || !sameRollen(person, ["freiberufler"])) {
      issue(
        ctx,
        ["stammdaten", "personen"],
        "Ein Freiberuf hat genau eine Person mit der Rolle Freiberufler.",
      );
    }
  }

  if (rechtsform === "gbr" || rechtsform === "ohg") {
    if (personen.length < 2 || personen.some((person) => !sameRollen(person, ["gesellschafter"]))) {
      issue(
        ctx,
        ["stammdaten", "personen"],
        "GbR und OHG brauchen mindestens zwei Personen, jeweils nur in der Rolle Gesellschafter.",
      );
    }
  }

  if (rechtsform === "kg") {
    const valid = personen.every((person) => {
      const komplementaer = person.rollen.includes("komplementaer");
      const kommanditist = person.rollen.includes("kommanditist");
      const onlyKnown = person.rollen.every(
        (rolle) =>
          rolle === "komplementaer" || rolle === "kommanditist" || rolle === "geschaeftsfuehrer",
      );
      return komplementaer !== kommanditist && onlyKnown;
    });
    const hasKomplementaer = personen.some((person) => person.rollen.includes("komplementaer"));
    const hasKommanditist = personen.some((person) => person.rollen.includes("kommanditist"));
    if (personen.length < 2 || !valid || !hasKomplementaer || !hasKommanditist) {
      issue(
        ctx,
        ["stammdaten", "personen"],
        "Eine KG braucht mindestens eine komplementäre und eine kommanditistische Person. Dieselbe Person kann nicht beides sein.",
      );
    }
  }

  if (isCorporation) {
    const valid = personen.every((person) => {
      const relevant = person.rollen.some(
        (rolle) => rolle === "gesellschafter" || rolle === "geschaeftsfuehrer",
      );
      const onlyKnown = person.rollen.every(
        (rolle) => rolle === "gesellschafter" || rolle === "geschaeftsfuehrer",
      );
      return relevant && onlyKnown;
    });
    const hasGesellschafter = personen.some((person) => person.rollen.includes("gesellschafter"));
    const hasGeschaeftsfuehrer = personen.some((person) =>
      person.rollen.includes("geschaeftsfuehrer"),
    );
    if (!valid || !hasGesellschafter || !hasGeschaeftsfuehrer) {
      issue(
        ctx,
        ["stammdaten", "personen"],
        "GmbH und UG brauchen mindestens eine gesellschafterische und eine geschäftsführende Rolle.",
      );
    }
  }
}

function validateAnteile(plan: Finanzplan, ctx: PlanIssueContext): void {
  const sum = plan.stammdaten.personen.reduce((total, person) => total + person.anteil, 0);
  if (Math.abs(sum - 1) > 0.0001) {
    issue(
      ctx,
      ["stammdaten", "personen"],
      "Die Anteile aller Personen müssen zusammen 1 (100 %) ergeben.",
    );
  }
}

function validateZwecke(plan: Finanzplan, ctx: PlanIssueContext): void {
  const zwecke = plan.stammdaten.zwecke;
  if (new Set(zwecke).size !== zwecke.length) {
    issue(ctx, ["stammdaten", "zwecke"], "Jeder Zweck darf nur einmal gewählt werden.");
  }
}

function checkOverrides(
  plan: Finanzplan,
  overrides: { monat: IsoMonth }[] | undefined,
  path: PropertyKey[],
  bounds: Bounds,
  ctx: PlanIssueContext,
): void {
  if (!overrides) return;
  const seen = new Set<string>();
  overrides.forEach((override, index) => {
    const overridePath = [...path, index, "monat"];
    if (seen.has(override.monat)) {
      issue(ctx, overridePath, `Der Monat ${override.monat} ist doppelt überschrieben.`);
    }
    seen.add(override.monat);
    inHorizon(plan, override.monat, overridePath, ctx);
    if (bounds.from && monthIndex(bounds.from, override.monat) < 0) {
      issue(ctx, overridePath, `Die Überschreibung ${override.monat} liegt vor dem Start.`);
    }
    if (bounds.to && monthIndex(override.monat, bounds.to) < 0) {
      issue(ctx, overridePath, `Die Überschreibung ${override.monat} liegt nach dem Ende.`);
    }
  });
}

function checkMonatswert(
  plan: Finanzplan,
  value: MonatswertVorgabe,
  path: PropertyKey[],
  bounds: Bounds,
  ctx: PlanIssueContext,
): void {
  if (value.bezugsmonat) {
    inHorizon(plan, value.bezugsmonat, [...path, "bezugsmonat"], ctx);
  }
  checkOverrides(plan, value.monatsOverride, [...path, "monatsOverride"], bounds, ctx);
}

function checkMenge(
  plan: Finanzplan,
  value: MengenVorgabe,
  path: PropertyKey[],
  bounds: Bounds,
  ctx: PlanIssueContext,
): void {
  if (value.bezugsmonat) {
    inHorizon(plan, value.bezugsmonat, [...path, "bezugsmonat"], ctx);
  }
  checkOverrides(plan, value.monatsOverride, [...path, "monatsOverride"], bounds, ctx);
}

function checkWindow(
  plan: Finanzplan,
  from: IsoMonth | undefined,
  to: IsoMonth | undefined,
  fromPath: PropertyKey[],
  toPath: PropertyKey[],
  ctx: PlanIssueContext,
): void {
  if (from) inHorizon(plan, from, fromPath, ctx);
  if (to) inHorizon(plan, to, toPath, ctx);
  if (from && to && monthIndex(from, to) < 0) {
    issue(ctx, toPath, "Das Ende liegt vor dem Start.");
  }
}

function sumDetail(
  detail: NonNullable<Finanzplan["personal"][number]["nebenkostenDetail"]>,
): number {
  return (
    detail.rentenversicherung +
    detail.arbeitslosenversicherung +
    detail.krankenversicherung +
    detail.pflegeversicherung +
    detail.umlageU1 +
    detail.umlageU2 +
    detail.insolvenzgeldumlage +
    detail.unfallversicherung
  );
}

function validateKapitalbedarf(plan: Finanzplan, ctx: PlanIssueContext): void {
  const { investitionen, gruendungskosten, anlaufkosten, betriebsmittel } = plan.kapitalbedarf;

  investitionen.forEach((investition, index) => {
    const path = ["kapitalbedarf", "investitionen", index];
    inHorizon(plan, investition.anschaffungsmonat, [...path, "anschaffungsmonat"], ctx);
    if (investition.afaStartMonat) {
      inHorizon(plan, investition.afaStartMonat, [...path, "afaStartMonat"], ctx);
      if (monthIndex(investition.anschaffungsmonat, investition.afaStartMonat) < 0) {
        issue(ctx, [...path, "afaStartMonat"], "Die AfA kann nicht vor der Anschaffung starten.");
      }
    }
    if (investition.afaMethode === "linear" && investition.nutzungsdauerMonate < 1) {
      issue(
        ctx,
        [...path, "nutzungsdauerMonate"],
        "Lineare AfA braucht eine Nutzungsdauer von mindestens einem Monat.",
      );
    }
    if (investition.afaMethode === "sammelposten" && investition.nutzungsdauerMonate < 1) {
      issue(
        ctx,
        [...path, "nutzungsdauerMonate"],
        "Ein Sammelposten braucht eine Nutzungsdauer von mindestens einem Monat.",
      );
    }
    if (investition.afaMethode === "sofort_gwg" && investition.nutzungsdauerMonate !== 0) {
      issue(
        ctx,
        [...path, "nutzungsdauerMonate"],
        "Bei Sofortabschreibung als GWG ist die Nutzungsdauer 0.",
      );
    }
    if (investition.restwertCents != null && investition.restwertCents > investition.nettoCents) {
      issue(
        ctx,
        [...path, "restwertCents"],
        "Der Restwert kann nicht über den Anschaffungskosten liegen.",
      );
    }
    if (
      investition.afaMethode === "sofort_gwg" &&
      investition.restwertCents != null &&
      investition.restwertCents !== 0
    ) {
      issue(
        ctx,
        [...path, "restwertCents"],
        "Bei Sofortabschreibung ist kein Restwert vorgesehen.",
      );
    }
  });

  (
    [
      ["gruendungskosten", gruendungskosten],
      ["anlaufkosten", anlaufkosten],
    ] as const
  ).forEach(([list, posten]) => {
    posten.forEach((item, index) => {
      inHorizon(plan, item.monat, ["kapitalbedarf", list, index, "monat"], ctx);
    });
  });

  const hasBestand = betriebsmittel.warenErstbestandNettoCents != null;
  const hasSatz = betriebsmittel.umsatzsteuerSatzWaren != null;
  if (hasBestand !== hasSatz) {
    issue(
      ctx,
      ["kapitalbedarf", "betriebsmittel"],
      "Waren-Erstbestand und der zugehörige Umsatzsteuersatz gehören zusammen.",
    );
  }
}

function validateFinanzierung(
  plan: Finanzplan,
  personIds: Set<string>,
  investIds: Set<string>,
  ctx: PlanIssueContext,
): void {
  plan.finanzierung.eigenkapital.forEach((posten, index) => {
    const path = ["finanzierung", "eigenkapital", index];
    inHorizon(plan, posten.monat, [...path, "monat"], ctx);
    checkPerson(posten, personIds, [...path, "personId"], ctx);
    if (posten.investitionId != null && posten.art !== "sacheinlage") {
      issue(
        ctx,
        [...path, "investitionId"],
        "Eine Investition lässt sich nur einer Sacheinlage zuordnen.",
      );
    }
    if (posten.investitionId != null && !investIds.has(posten.investitionId)) {
      issue(
        ctx,
        [...path, "investitionId"],
        "Die verknüpfte Investition gibt es im Kapitalbedarf nicht.",
      );
    }
  });

  plan.finanzierung.darlehen.forEach((darlehen, index) => {
    const path = ["finanzierung", "darlehen", index];
    const summe = darlehen.auszahlungen.reduce((total, tranche) => total + tranche.betragCents, 0);
    if (summe !== darlehen.betragCents) {
      issue(
        ctx,
        [...path, "betragCents"],
        "Der Darlehensbetrag muss der Summe der Auszahlungen entsprechen.",
      );
    }
    if (darlehen.tilgungsfreieMonate > darlehen.laufzeitMonate) {
      issue(
        ctx,
        [...path, "tilgungsfreieMonate"],
        "Die tilgungsfreie Zeit kann nicht länger sein als die Laufzeit.",
      );
    }
    if (darlehen.personId != null && !personIds.has(darlehen.personId)) {
      issue(ctx, [...path, "personId"], "Die verknüpfte Person gibt es in den Stammdaten nicht.");
    }
    const monate = new Set<string>();
    darlehen.auszahlungen.forEach((tranche, trancheIndex) => {
      const tranchePath = [...path, "auszahlungen", trancheIndex, "monat"];
      inHorizon(plan, tranche.monat, tranchePath, ctx);
      if (monate.has(tranche.monat)) {
        issue(ctx, tranchePath, "Jede Auszahlung eines Darlehens braucht einen eigenen Monat.");
      }
      monate.add(tranche.monat);
    });
  });

  plan.finanzierung.zuschuesse.forEach((zuschuss, index) => {
    const path = ["finanzierung", "zuschuesse", index, "auszahlung"];
    const auszahlung = zuschuss.auszahlung;
    if (auszahlung.art === "gruendungszuschuss") {
      if (!auszahlung.phase2Geplant && auszahlung.phase2Monate !== 0) {
        issue(ctx, [...path, "phase2Monate"], "Ohne Phase 2 ist die Dauer der Phase 2 gleich 0.");
      }
      if (auszahlung.phase2Geplant && auszahlung.phase2Monate < 1) {
        issue(
          ctx,
          [...path, "phase2Monate"],
          "Eine geplante Phase 2 braucht mindestens einen Monat.",
        );
      }
      if (auszahlung.alg1MonatlichCents + auszahlung.pauschaleCents <= 0) {
        issue(ctx, path, "Der Gründungszuschuss braucht ALG I, eine Pauschale oder beides.");
      }
      const monate =
        auszahlung.phase1Monate + (auszahlung.phase2Geplant ? auszahlung.phase2Monate : 0);
      inHorizon(plan, auszahlung.startMonat, [...path, "startMonat"], ctx);
      inHorizon(plan, addMonths(auszahlung.startMonat, monate - 1), [...path, "startMonat"], ctx);
      return;
    }

    const monate = new Set<string>();
    auszahlung.positionen.forEach((position, positionIndex) => {
      const positionPath = [...path, "positionen", positionIndex, "monat"];
      inHorizon(plan, position.monat, positionPath, ctx);
      if (monate.has(position.monat)) {
        issue(ctx, positionPath, "Jeder Zuschussmonat darf nur einmal vorkommen.");
      }
      monate.add(position.monat);
    });
  });
}

function checkPerson(
  posten: EigenkapitalPosten,
  personIds: Set<string>,
  path: PropertyKey[],
  ctx: PlanIssueContext,
): void {
  if (posten.personId != null && !personIds.has(posten.personId)) {
    issue(ctx, path, "Die verknüpfte Person gibt es in den Stammdaten nicht.");
  }
}

function validateBetrieb(plan: Finanzplan, personIds: Set<string>, ctx: PlanIssueContext): void {
  plan.umsatzplanung.forEach((position, index) => {
    const path = ["umsatzplanung", index];
    checkWindow(
      plan,
      position.aktivVon,
      position.aktivBis,
      [...path, "aktivVon"],
      [...path, "aktivBis"],
      ctx,
    );
    const bounds = { from: position.aktivVon, to: position.aktivBis };
    if (position.art === "monatsumsatz") {
      checkMonatswert(plan, position.monatsumsatz, [...path, "monatsumsatz"], bounds, ctx);
    } else {
      checkMenge(plan, position.mengeProMonat, [...path, "mengeProMonat"], bounds, ctx);
      checkMonatswert(plan, position.preisNetto, [...path, "preisNetto"], bounds, ctx);
    }
    if (position.wareneinsatz.art === "monatsbetrag") {
      checkMonatswert(
        plan,
        position.wareneinsatz.betrag,
        [...path, "wareneinsatz", "betrag"],
        bounds,
        ctx,
      );
    }
  });

  plan.personal.forEach((stelle, index) => {
    const path = ["personal", index];
    checkWindow(
      plan,
      stelle.eintritt,
      stelle.austritt,
      [...path, "eintritt"],
      [...path, "austritt"],
      ctx,
    );
    const bounds = { from: stelle.eintritt, to: stelle.austritt };
    checkMonatswert(plan, stelle.brutto, [...path, "brutto"], bounds, ctx);
    if (stelle.personId != null && !personIds.has(stelle.personId)) {
      issue(ctx, [...path, "personId"], "Die verknüpfte Person gibt es in den Stammdaten nicht.");
    }
    if (stelle.nebenkostenDetail) {
      const summe = sumDetail(stelle.nebenkostenDetail);
      if (Math.abs(summe - stelle.agNebenkostenSatz) > 0.0001) {
        issue(
          ctx,
          [...path, "agNebenkostenSatz"],
          "Die Summe der Lohnnebenkosten im Detail muss dem eingegebenen Satz entsprechen.",
        );
      }
    }
    const sonderMonate = new Set<string>();
    stelle.sonderzahlungen?.forEach((sonder, sonderIndex) => {
      const sonderPath = [...path, "sonderzahlungen", sonderIndex, "monat"];
      inHorizon(plan, sonder.monat, sonderPath, ctx);
      if (monthIndex(stelle.eintritt, sonder.monat) < 0) {
        issue(ctx, sonderPath, "Die Sonderzahlung liegt vor dem Eintritt.");
      }
      if (stelle.austritt && monthIndex(sonder.monat, stelle.austritt) < 0) {
        issue(ctx, sonderPath, "Die Sonderzahlung liegt nach dem Austritt.");
      }
      if (sonderMonate.has(sonder.monat)) {
        issue(ctx, sonderPath, "Je Monat nur eine Sonderzahlung je Stelle.");
      }
      sonderMonate.add(sonder.monat);
    });
  });

  plan.laufendeKosten.forEach((kosten, index) => {
    const path = ["laufendeKosten", index];
    checkWindow(
      plan,
      kosten.aktivVon,
      kosten.aktivBis,
      [...path, "aktivVon"],
      [...path, "aktivBis"],
      ctx,
    );
    if (kosten.art === "fix") {
      checkMonatswert(
        plan,
        kosten.betrag,
        [...path, "betrag"],
        { from: kosten.aktivVon, to: kosten.aktivBis },
        ctx,
      );
    }
  });
}

function validateSzenario(
  plan: Finanzplan,
  key: "best" | "real" | "worst",
  umsatzIds: Map<string, Finanzplan["umsatzplanung"][number]>,
  kostenIds: Set<string>,
  personalIds: Set<string>,
  ctx: PlanIssueContext,
): void {
  const szenario: Szenario = plan.szenarien[key];
  const seen = new Set<string>();
  let globalCount = 0;

  szenario.anpassungen.forEach((anpassung, index) => {
    const path = ["szenarien", key, "anpassungen", index];
    if (anpassung.ziel === "global") {
      globalCount += 1;
      if (globalCount > 1) {
        issue(ctx, path, "Je Szenario nur eine globale Anpassung.");
      }
      if (
        anpassung.umsatzFaktor == null &&
        anpassung.kostenFaktor == null &&
        anpassung.personalFaktor == null
      ) {
        issue(ctx, path, "Die globale Anpassung braucht mindestens einen Faktor.");
      }
      return;
    }

    const targetKey = `${anpassung.ziel}:${anpassung.positionId}`;
    if (seen.has(targetKey)) {
      issue(ctx, path, "Diese Position ist im Szenario schon angepasst.");
    }
    seen.add(targetKey);
    validateAnpassungZiel(anpassung, path, umsatzIds, kostenIds, personalIds, ctx);
  });
}

function validateAnpassungZiel(
  anpassung: Exclude<SzenarioAnpassung, { ziel: "global" }>,
  path: PropertyKey[],
  umsatzIds: Map<string, Finanzplan["umsatzplanung"][number]>,
  kostenIds: Set<string>,
  personalIds: Set<string>,
  ctx: PlanIssueContext,
): void {
  if (anpassung.ziel === "umsatzposition") {
    const position = umsatzIds.get(anpassung.positionId);
    if (!position) {
      issue(ctx, [...path, "positionId"], "Die Umsatzposition gibt es nicht.");
      return;
    }
    if (anpassung.mengenFaktor == null && anpassung.preisFaktor == null) {
      issue(ctx, path, "Die Umsatzanpassung braucht einen Mengen- oder Preisfaktor.");
    }
    if (position.art === "monatsumsatz" && anpassung.preisFaktor != null) {
      issue(ctx, [...path, "preisFaktor"], "Der Preisfaktor gilt nur bei Menge mal Preis.");
    }
    return;
  }

  if (anpassung.ziel === "kostenposition") {
    if (!kostenIds.has(anpassung.positionId)) {
      issue(ctx, [...path, "positionId"], "Die Kostenposition gibt es nicht.");
    }
    if (anpassung.faktor == null && anpassung.zuschlagCents == null) {
      issue(ctx, path, "Die Kostenanpassung braucht einen Faktor oder einen Zuschlag.");
    }
    return;
  }

  if (!personalIds.has(anpassung.positionId)) {
    issue(ctx, [...path, "positionId"], "Die Personalstelle gibt es nicht.");
  }
}

export function refineFinanzplan(plan: Finanzplan, ctx: PlanIssueContext): void {
  if (Date.parse(plan.geaendertAm) < Date.parse(plan.erstelltAm)) {
    issue(ctx, ["geaendertAm"], "Der Änderungszeitpunkt liegt vor der Erstellung.");
  }

  validateUniqueIds(plan, ctx);
  validateRechtsform(plan, ctx);
  validateAnteile(plan, ctx);
  validateZwecke(plan, ctx);

  const personIds = new Set(plan.stammdaten.personen.map((person) => person.id));
  const investIds = new Set(plan.kapitalbedarf.investitionen.map((item) => item.id));
  const umsatzIds = new Map(plan.umsatzplanung.map((item) => [item.id, item]));
  const kostenIds = new Set(plan.laufendeKosten.map((item) => item.id));
  const personalIds = new Set(plan.personal.map((item) => item.id));

  validateKapitalbedarf(plan, ctx);
  validateFinanzierung(plan, personIds, investIds, ctx);
  validateBetrieb(plan, personIds, ctx);
  (["best", "real", "worst"] as const).forEach((key) => {
    validateSzenario(plan, key, umsatzIds, kostenIds, personalIds, ctx);
  });
}
