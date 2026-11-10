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
  if (!plan.startMonat) return;
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
  pushAll(plan.parameter.darlehensvorlagen, ["parameter", "darlehensvorlagen"]);
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
  personen.forEach((person, index) => {
    if (new Set(person.rollen).size !== person.rollen.length) {
      issue(ctx, ["stammdaten", "personen", index, "rollen"], "Jede Rolle nur einmal je Person.");
    }
  });
  if (plan.status !== "vollstaendig" || !rechtsform) return;

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
  if (plan.status !== "vollstaendig") return;
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

function validateVollstaendig(plan: Finanzplan, ctx: PlanIssueContext): void {
  if (plan.status !== "vollstaendig") return;
  if (!plan.startMonat) {
    issue(ctx, ["startMonat"], "Ein vollständiger Plan braucht einen Startmonat.");
  }
  const stamm = plan.stammdaten;
  if (!stamm.rechtsform) {
    issue(ctx, ["stammdaten", "rechtsform"], "Ein vollständiger Plan braucht eine Rechtsform.");
  }
  if (stamm.personen.length < 1) {
    issue(
      ctx,
      ["stammdaten", "personen"],
      "Ein vollständiger Plan braucht mindestens eine Person.",
    );
  }
  if (!stamm.bundesland) {
    issue(ctx, ["stammdaten", "bundesland"], "Ein vollständiger Plan braucht ein Bundesland.");
  }
  if (!stamm.gruendungsmonat) {
    issue(
      ctx,
      ["stammdaten", "gruendungsmonat"],
      "Ein vollständiger Plan braucht einen Gründungsmonat.",
    );
  }
  if (stamm.planName.trim().length === 0) {
    issue(ctx, ["stammdaten", "planName"], "Ein vollständiger Plan braucht einen Namen.");
  }
  if (stamm.firmenname.trim().length === 0) {
    issue(ctx, ["stammdaten", "firmenname"], "Ein vollständiger Plan braucht einen Firmennamen.");
  }
  if (stamm.ort.trim().length === 0) {
    issue(ctx, ["stammdaten", "ort"], "Ein vollständiger Plan braucht einen Ort.");
  }
  if (stamm.zwecke.length < 1) {
    issue(ctx, ["stammdaten", "zwecke"], "Ein vollständiger Plan braucht mindestens einen Zweck.");
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
      const path = ["kapitalbedarf", list, index];
      inHorizon(plan, item.monat, [...path, "monat"], ctx);
      if (item.buchung.art !== "anlage") return;
      if (item.buchung.afaStartMonat) {
        inHorizon(plan, item.buchung.afaStartMonat, [...path, "buchung", "afaStartMonat"], ctx);
        if (monthIndex(item.monat, item.buchung.afaStartMonat) < 0) {
          issue(
            ctx,
            [...path, "buchung", "afaStartMonat"],
            "Die AfA kann nicht vor dem Kostenmonat starten.",
          );
        }
      }
      if (
        item.buchung.afaMethode !== "sofort_gwg" &&
        item.buchung.restwertCents != null &&
        item.buchung.restwertCents > item.nettoCents
      ) {
        issue(
          ctx,
          [...path, "buchung", "restwertCents"],
          "Der Restwert kann nicht über den Anschaffungskosten liegen.",
        );
      }
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
  ctx: PlanIssueContext,
): void {
  plan.finanzierung.eigenkapital.forEach((posten, index) => {
    const path = ["finanzierung", "eigenkapital", index];
    inHorizon(plan, posten.monat, [...path, "monat"], ctx);
    checkPerson(posten, personIds, [...path, "personId"], ctx);
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
    if (darlehen.vorlageId != null) {
      const vorlage = plan.parameter.darlehensvorlagen.find(
        (item) => item.id === darlehen.vorlageId,
      );
      if (!vorlage) {
        issue(ctx, [...path, "vorlageId"], "Die Darlehensvorlage gibt es im Parametersatz nicht.");
      } else {
        if (
          darlehen.betragCents < vorlage.betragMinCents ||
          darlehen.betragCents > vorlage.betragMaxCents
        ) {
          issue(
            ctx,
            [...path, "betragCents"],
            `Der Betrag liegt außerhalb der Vorlage „${vorlage.bezeichnung}“.`,
          );
        }
        if (darlehen.laufzeitMonate > vorlage.laufzeitMaxMonate) {
          issue(
            ctx,
            [...path, "laufzeitMonate"],
            `Die Laufzeit überschreitet das Maximum der Vorlage „${vorlage.bezeichnung}“.`,
          );
        }
        if (darlehen.tilgungsfreieMonate > vorlage.tilgungsfreieMonateMax) {
          issue(
            ctx,
            [...path, "tilgungsfreieMonate"],
            `Die tilgungsfreie Zeit überschreitet das Maximum der Vorlage „${vorlage.bezeichnung}“.`,
          );
        }
      }
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
  if (
    plan.umsatzsteuer.regime === "kleinunternehmer" &&
    plan.umsatzsteuer.vorsteuerabzugsberechtigt
  ) {
    issue(
      ctx,
      ["umsatzsteuer", "vorsteuerabzugsberechtigt"],
      "Kleinunternehmer sind nicht vorsteuerabzugsberechtigt.",
    );
  }
  plan.parameter.darlehensvorlagen.forEach((vorlage, index) => {
    if (vorlage.betragMinCents > vorlage.betragMaxCents) {
      issue(
        ctx,
        ["parameter", "darlehensvorlagen", index, "betragMaxCents"],
        "Der Höchstbetrag der Vorlage liegt unter dem Mindestbetrag.",
      );
    }
  });

  validateUniqueIds(plan, ctx);
  validateVollstaendig(plan, ctx);
  validateRechtsform(plan, ctx);
  validateAnteile(plan, ctx);
  validateZwecke(plan, ctx);

  const personIds = new Set(plan.stammdaten.personen.map((person) => person.id));
  const umsatzIds = new Map(plan.umsatzplanung.map((item) => [item.id, item]));
  const kostenIds = new Set(plan.laufendeKosten.map((item) => item.id));
  const personalIds = new Set(plan.personal.map((item) => item.id));

  validateKapitalbedarf(plan, ctx);
  validateFinanzierung(plan, personIds, ctx);
  validateBetrieb(plan, personIds, ctx);
  (["best", "real", "worst"] as const).forEach((key) => {
    validateSzenario(plan, key, umsatzIds, kostenIds, personalIds, ctx);
  });
}
