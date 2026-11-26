import { useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ExcelDialog } from "./excel/ExcelDialog.tsx";
import { PdfDialog } from "./pdf/PdfDialog.tsx";
import { springeZu } from "../domain/assistent/stationen.ts";
import { berechnePlan } from "../domain/calc/berechnen.ts";
import { pruefePlan, type Pruefmeldung, type TabellenAnsicht } from "../domain/checks/index.ts";
import { aktivesSzenario, planFuerRechnung, schreibeKopie } from "../domain/szenarien/index.ts";
import { roundCents } from "../domain/calc/round.ts";
import {
  einfuegenSerie,
  parseEinfuegen,
  setzeEinmal,
  setzeSerieZelle,
} from "../domain/eingabe/index.ts";
import { parseCentBetrag, parseDeutschZahl } from "../domain/eingabe/zahlen.ts";
import { planjahreVon } from "../domain/reports/planjahr.ts";
import { erstelleBerichte } from "../domain/reports/berichte.ts";
import type { Berichte } from "../domain/reports/typen.ts";
import { finanzplanSchema } from "../domain/schema.ts";
import { RECHTSFORM_LABEL } from "../domain/labels.ts";
import type {
  AssistentStation,
  ExcelBlattId,
  Finanzplan,
  IsoMonth,
  PdfKapitelId,
} from "../domain/types.ts";
import { Bestaetigung } from "./Bestaetigung.tsx";
import { formatEuro, formatMonatLang, formatProzent } from "./format.ts";
import { verlaufAnfang, verlaufReduzieren } from "./history.ts";
import { leseOffeneJahre, merkeOffeneJahre } from "./jahre-ansicht.ts";
import { Hilfeleiste } from "./Hilfeleiste.tsx";
import { Kennzahlenleiste } from "./Kennzahlenleiste.tsx";
import { planHatKennzahlen } from "./kennzahlen-leiste.ts";
import { useSpeicher } from "./Speicher.tsx";
import { merkeArbeit } from "./sicherung.ts";
import { sichtbareSpalten } from "./spalten.ts";
import { monatDerAuswahl, Tabelle, type Auswahl } from "./Tabelle.tsx";
import { zeigeStartauswahl } from "../domain/assistent/stationen.ts";
import { Assistent, Startauswahl } from "./Assistent.tsx";
import { starteMitVorlage, type BranchenvorlageId } from "../domain/vorlagen/branchen.ts";
import {
  HAUPTREITER,
  hatUnterreiter,
  hauptVon,
  reiterVon,
  type HauptId,
  type ReiterId,
} from "./navigation.ts";
import { Pruefung, zaehlerStufe } from "./Pruefung.tsx";
import { PruefAnbieter } from "./pruef-marke.tsx";
import { Reiterleiste } from "./Reiterleiste.tsx";
import { Szenarien, SzenarioHinweis, SzenarioUmschalter } from "./Szenarien.tsx";
import { Ueberblick } from "./Ueberblick.tsx";
import { berichtZeilen, type BerichtReiter } from "./zeilen-bericht.ts";
import { eingabeZeilen, planMonate } from "./zeilen-eingabe.ts";
import type { TabellenZeile } from "./zeilen-modell.ts";

export { REITER, type ReiterId } from "./navigation.ts";

type Sprung =
  | { art: "tabelle"; ansicht: TabellenAnsicht; zeileId: string; monat?: string }
  | { art: "assistent"; station: AssistentStation; feld: string };

function istTabelle(reiter: ReiterId): reiter is TabellenAnsicht {
  return (
    reiter !== "assistent" &&
    reiter !== "ueberblick" &&
    reiter !== "pruefung" &&
    reiter !== "szenarien"
  );
}

const DECKUNG: Record<Berichte["kapital"]["deckungArt"], string> = {
  ueberdeckung: "Überdeckung",
  deckungsluecke: "Deckungslücke",
  ausgeglichen: "ausgeglichen",
};

function standardUhr(): Date {
  return new Date();
}

interface PlanArbeitsflaecheProps {
  anfangsplan: Finanzplan;
  beispiele: readonly { id: string; label: string }[];
  beispielId: string;
  reiter: ReiterId;
  onBeispiel: (id: string) => void;
  onReiter: (reiter: ReiterId) => void;
  onNeu: () => void;
  onStart?: () => void;
  onSpeichern: (plan: Finanzplan) => void;
  onZuruecksetzen: () => void;
  onPlanUebernehmen?: (plan: Finanzplan) => void;
  /** Feste Uhr für Tests. Sonst die aktuelle Zeit. */
  jetzt?: () => Date;
}

export function PlanArbeitsflaeche({
  anfangsplan,
  beispiele,
  beispielId,
  reiter,
  onBeispiel,
  onReiter,
  onNeu,
  onStart,
  onSpeichern,
  onZuruecksetzen,
  onPlanUebernehmen,
  jetzt = standardUhr,
}: PlanArbeitsflaecheProps) {
  const [verlauf, dispatch] = useReducer(verlaufReduzieren<Finanzplan>, anfangsplan, verlaufAnfang);
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const [sprung, setSprung] = useState<Sprung | null>(null);
  const sprungAngewandt = useRef("");
  const weitere = useRef<HTMLDetailsElement>(null);
  const menue = useRef<HTMLDetailsElement>(null);
  const letzterUnter = useRef<Partial<Record<HauptId, ReiterId>>>({});
  const kompakt = useKompakt();
  const [jahreOffen, setJahreOffen] = useState<{ id: string; nummern: ReadonlySet<number> }>(
    () => ({
      id: anfangsplan.id,
      nummern: leseOffeneJahre(anfangsplan.id),
    }),
  );
  const [meldung, setMeldung] = useState<string | null>(null);
  const [pdfOffen, setPdfOffen] = useState(false);
  const [excelOffen, setExcelOffen] = useState(false);
  const [zuruecksetzenOffen, setZuruecksetzenOffen] = useState(false);
  const [vorlage, setVorlage] = useState<BranchenvorlageId>("keine");
  const plan = verlauf.gegenwart;
  const ansicht = useMemo(() => planFuerRechnung(plan), [plan]);
  // Auf den Eingabeseiten erst die Zelle zeichnen, die Rechnung für die Leiste danach.
  const ansichtSpaeter = useDeferredValue(ansicht);
  const verzoegern = reiter === "eingaben" || reiter === "assistent";
  const rechenPlan = verzoegern ? ansichtSpaeter : ansicht;
  const modus = aktivesSzenario(plan)?.art ?? "basis";
  const monate = useMemo(() => planMonate(ansicht), [ansicht]);
  const jahre = useMemo(() => planjahreVon(monate), [monate]);
  if (jahreOffen.id !== plan.id) {
    setJahreOffen({ id: plan.id, nummern: leseOffeneJahre(plan.id) });
  }
  const offeneJahre = jahreOffen.id === plan.id ? jahreOffen.nummern : leseOffeneJahre(plan.id);
  const eingeklappt = useMemo(
    () => new Set(jahre.map((jahr) => jahr.nummer).filter((nummer) => !offeneJahre.has(nummer))),
    [jahre, offeneJahre],
  );
  const spalten = useMemo(
    () => sichtbareSpalten(monate, jahre, eingeklappt),
    [monate, jahre, eingeklappt],
  );
  const rechnung = useMemo(() => rechne(rechenPlan), [rechenPlan]);
  const meldungen = useMemo(
    () => (rechnung.berichte ? pruefePlan(rechenPlan, rechnung.berichte) : []),
    [rechenPlan, rechnung.berichte],
  );
  const zeilen = useMemo(
    () => zeilenFuer(ansicht, monate, jahre, reiter, rechnung.berichte),
    [ansicht, monate, jahre, reiter, rechnung.berichte],
  );
  const gewaehlt = zeilen[auswahl?.zeile ?? -1] ?? null;
  const monat = monatDerAuswahl(spalten, auswahl);

  useEffect(() => {
    if (!sprung || sprung.art !== "tabelle" || reiter !== sprung.ansicht) return;
    const index = zeilen.findIndex((zeile) => zeile.id === sprung.zeileId);
    if (index < 0) return;
    const schluessel = `${sprung.ansicht}:${sprung.zeileId}:${sprung.monat ?? ""}:${index}`;
    if (sprungAngewandt.current === schluessel) return;
    let spalte = 0;
    if (sprung.monat) {
      const gefunden = spalten.findIndex(
        (eintrag) => eintrag.art === "monat" && eintrag.monat === sprung.monat,
      );
      if (gefunden >= 0) spalte = gefunden;
    }
    sprungAngewandt.current = schluessel;
    setAuswahl({ zeile: index, spalte });
  }, [sprung, reiter, zeilen, spalten]);

  useEffect(() => {
    if (verlauf.vergangenheit.length === 0 && verlauf.zukunft.length === 0) return;
    onSpeichern(plan);
    if (!plan.stammdaten.beispiel) merkeArbeit(beispielId, plan, jetzt().toISOString());
  }, [onSpeichern, plan, verlauf.vergangenheit.length, verlauf.zukunft.length, beispielId, jetzt]);

  function uebernehmen(roh: Finanzplan) {
    const geprueft = finanzplanSchema.safeParse({
      ...roh,
      geaendertAm: new Date().toISOString(),
    });
    if (!geprueft.success) {
      setMeldung(geprueft.error.issues[0]?.message ?? "Die Eingabe passt nicht zum Plan.");
      return;
    }
    setMeldung(null);
    dispatch({ typ: "setzen", wert: geprueft.data });
  }

  function aendernSzenarien(erzeugen: (aktuell: Finanzplan) => Finanzplan) {
    try {
      uebernehmen(erzeugen(plan));
    } catch (fehler) {
      setMeldung(fehler instanceof Error ? fehler.message : "Die Eingabe wurde nicht übernommen.");
    }
  }

  function aendernEingabe(erzeugen: (aktuell: Finanzplan) => Finanzplan) {
    if (modus === "abweichung") {
      const name = aktivesSzenario(plan)?.name ?? "Diesem Szenario";
      setMeldung(
        `„${name}“ ist eine Variante mit Stellschrauben. Die Eingaben sind nur zum Ansehen. Wählen Sie oben den Basisplan oder ändern Sie die Stellschrauben unter Szenarien.`,
      );
      return;
    }
    try {
      const ausgang = modus === "kopie" ? ansicht : plan;
      const roh = erzeugen(ausgang);
      uebernehmen(modus === "kopie" ? schreibeKopie(plan, roh) : roh);
    } catch (fehler) {
      setMeldung(fehler instanceof Error ? fehler.message : "Die Eingabe wurde nicht übernommen.");
    }
  }

  function commitZelle(zeilenIndex: number, monatIndex: number, text: string) {
    const zeile = zeilen[zeilenIndex];
    const zielMonat = monate[monatIndex];
    if (!zeile || !zielMonat) return;
    const leer = text.trim() === "";
    if (zeile.serie) {
      if (zeile.einheit === "menge") {
        const zahl = leer ? null : parseDeutschZahl(text);
        if (!leer && zahl == null) {
          setMeldung("Das ist keine Zahl.");
          return;
        }
        aendernEingabe((aktuell) => setzeSerieZelle(aktuell, zeile.serie!, zielMonat, zahl));
        return;
      }
      const cents = leer ? null : parseCentBetrag(text);
      if (!leer && cents == null) {
        setMeldung("Das ist kein Betrag.");
        return;
      }
      aendernEingabe((aktuell) => setzeSerieZelle(aktuell, zeile.serie!, zielMonat, cents));
      return;
    }
    const einmal = zeile.einmalImMonat?.(zielMonat) ?? zeile.einmal;
    if (!einmal) return;
    if (leer) {
      setMeldung("Der Posten braucht einen Betrag.");
      return;
    }
    const cents = parseCentBetrag(text);
    if (cents == null) {
      setMeldung("Das ist kein Betrag.");
      return;
    }
    aendernEingabe((aktuell) => setzeEinmal(aktuell, einmal, cents));
  }

  function einfuegen(zeilenIndex: number, monatIndex: number, text: string) {
    const tabelle = parseEinfuegen(text);
    if (tabelle.length === 0 || tabelle.every((zeile) => zeile.every((zelle) => zelle.leer)))
      return;
    if (tabelle.some((zeile) => zeile.some((zelle) => !zelle.leer && zelle.zahl == null))) {
      setMeldung("Eine Zelle ist keine Zahl. Nichts eingefügt.");
      return;
    }
    if (tabelle.some((zeile) => zeile.some((zelle) => zelle.zahl != null && zelle.zahl < 0))) {
      setMeldung("Negative Werte lassen sich in die Eingaben nicht einfügen.");
      return;
    }
    const serien: TabellenZeile[] = [];
    for (
      let index = zeilenIndex;
      index < zeilen.length && serien.length < tabelle.length;
      index += 1
    ) {
      const zeile = zeilen[index];
      if (zeile?.serie) serien.push(zeile);
    }
    if (serien.length === 0) {
      const zeile = zeilen[zeilenIndex];
      const zielMonat = monate[monatIndex];
      const zahl = tabelle[0]?.[0]?.zahl;
      const einmal = zeile && zielMonat ? (zeile.einmalImMonat?.(zielMonat) ?? zeile.einmal) : null;
      if (einmal && zahl != null && tabelle.length === 1 && (tabelle[0]?.length ?? 0) === 1) {
        aendernEingabe((aktuell) => setzeEinmal(aktuell, einmal, roundCents(zahl * 100)));
        return;
      }
      setMeldung("Diese Zeile lässt sich nicht aus Excel füllen.");
      return;
    }
    aendernEingabe((aktuell) => {
      let naechster = aktuell;
      tabelle.forEach((zellen, index) => {
        const ziel = serien[index];
        if (!ziel?.serie) return;
        const werte = zellen.map((zelle) => {
          if (zelle.leer || zelle.zahl == null) return null;
          return ziel.einheit === "menge" ? zelle.zahl : roundCents(zelle.zahl * 100);
        });
        naechster = einfuegenSerie(
          naechster,
          ziel.serie,
          monate,
          monatIndex,
          werte,
          ziel.bearbeitbar,
        );
      });
      return naechster;
    });
  }

  function setzeOffeneJahre(nummern: ReadonlySet<number>) {
    merkeOffeneJahre(plan.id, nummern);
    setJahreOffen({ id: plan.id, nummern });
  }

  function schalteJahr(nummer: number) {
    const naechste = new Set(offeneJahre);
    if (naechste.has(nummer)) naechste.delete(nummer);
    else naechste.add(nummer);
    setzeOffeneJahre(naechste);
  }

  function springe(meldung: Pruefmeldung, wohin: "tabelle" | "assistent") {
    if (wohin === "assistent" && meldung.ziel.assistent) {
      const ziel = meldung.ziel.assistent;
      aendernEingabe((aktuell) => springeZu(aktuell, ziel.station));
      setSprung({ art: "assistent", station: ziel.station, feld: ziel.feld });
      onReiter("assistent");
      return;
    }
    const tabelle = meldung.ziel.tabelle;
    if (!tabelle) return;
    if (tabelle.monat) {
      const monat = tabelle.monat;
      const jahr = jahre.find((eintrag) => monat >= eintrag.vonMonat && monat <= eintrag.bisMonat);
      if (jahr && !offeneJahre.has(jahr.nummer)) {
        const naechste = new Set(offeneJahre);
        naechste.add(jahr.nummer);
        setzeOffeneJahre(naechste);
      }
    }
    setSprung({
      art: "tabelle",
      ansicht: tabelle.ansicht,
      zeileId: tabelle.zeileId,
      monat: tabelle.monat,
    });
    onReiter(tabelle.ansicht);
  }

  const speicher = useSpeicher({
    plan,
    planId: beispielId,
    aktiv: !plan.stammdaten.beispiel,
    jetzt,
    onUebernehmen: (geladen) => {
      if (onPlanUebernehmen) onPlanUebernehmen(geladen);
      else uebernehmen(geladen);
    },
  });
  const rechtsform = ansicht.stammdaten.rechtsform;
  const letzter = monate.at(-1);
  const startwahl = zeigeStartauswahl(plan);
  const leisteLeer = startwahl || rechnung.berichte == null || !planHatKennzahlen(rechenPlan);
  const zeigeLeiste = startwahl || reiter === "assistent" || reiter === "eingaben";
  const zuruecksetzenLabel = plan.stammdaten.beispiel
    ? "Beispiel zurücksetzen"
    : "Plan zurücksetzen";

  function waehleReiter(id: ReiterId) {
    if (startwahl) {
      if (id === "pruefung" || id === "szenarien") return;
      aendernEingabe((aktuell) =>
        starteMitVorlage(aktuell, id === "assistent" ? "assistent" : "tabelle", vorlage),
      );
    }
    onReiter(id);
  }

  function waehleHaupt(id: HauptId) {
    const haupt = HAUPTREITER.find((eintrag) => eintrag.id === id);
    if (!haupt) return;
    const kind = haupt.kinder[0];
    if (!kind) return;
    const ziel = hatUnterreiter(haupt) ? (letzterUnter.current[id] ?? kind) : kind;
    waehleReiter(ziel);
  }

  const aktiverHaupt = hauptVon(reiter);
  useEffect(() => {
    if (!startwahl) letzterUnter.current[aktiverHaupt.id] = reiter;
  }, [startwahl, aktiverHaupt.id, reiter]);
  const unterSichtbar = !startwahl && hatUnterreiter(aktiverHaupt);
  const szenarioName = aktivesSzenario(plan)?.name ?? "Basisplan";
  const planTitel = ansicht.stammdaten.planName || ansicht.stammdaten.firmenname || "Finanzplaner";

  const planWahl = (
    <div className="switcher" role="group" aria-label="Plan wählen">
      {onStart ? (
        <button type="button" onClick={onStart}>
          Startseite
        </button>
      ) : null}
      <button type="button" aria-pressed={beispielId === "neu"} onClick={onNeu}>
        Neuer Plan
      </button>
      {beispiele.map((beispiel) => (
        <button
          key={beispiel.id}
          type="button"
          aria-pressed={beispiel.id === beispielId}
          onClick={() => onBeispiel(beispiel.id)}
        >
          {beispiel.label}
        </button>
      ))}
    </div>
  );

  const dateiAktionen = (
    <>
      <button
        type="button"
        onClick={() => dispatch({ typ: "zurueck" })}
        disabled={verlauf.vergangenheit.length === 0}
      >
        Rückgängig
      </button>
      <button
        type="button"
        onClick={() => dispatch({ typ: "vor" })}
        disabled={verlauf.zukunft.length === 0}
      >
        Wiederholen
      </button>
      {plan.stammdaten.beispiel ? null : (
        <>
          <button type="button" onClick={speicher.sichern}>
            Plan sichern
          </button>
          <button type="button" onClick={speicher.laden}>
            Plan laden
          </button>
        </>
      )}
      <button type="button" onClick={() => setPdfOffen(true)}>
        PDF erstellen
      </button>
      <button type="button" onClick={() => setExcelOffen(true)}>
        Excel erstellen
      </button>
    </>
  );

  const hauptKnopfe = HAUPTREITER.map((eintrag) => {
    const allein = !hatUnterreiter(eintrag);
    const kind = eintrag.kinder[0];
    return {
      id: eintrag.id,
      buttonId: allein && kind ? `reiter-${kind}` : `haupt-${eintrag.id}`,
      ausgewaehlt: !startwahl && aktiverHaupt.id === eintrag.id,
      tabStop: startwahl ? aktiverHaupt.id === eintrag.id : aktiverHaupt.id === eintrag.id,
      onWaehlen: () => waehleHaupt(eintrag.id),
      children:
        eintrag.id === "pruefen" ? (
          <>
            {eintrag.label}
            <span
              className={`pruef-zaehler pruef-${zaehlerStufe(meldungen)}`}
              aria-label={`${meldungen.length} ${meldungen.length === 1 ? "Meldung" : "Meldungen"}`}
            >
              {meldungen.length}
            </span>
          </>
        ) : (
          eintrag.label
        ),
    };
  });

  const unterKnopfe = unterSichtbar
    ? aktiverHaupt.kinder.map((id) => {
        const eintrag = reiterVon(id);
        return {
          id,
          buttonId: `reiter-${id}`,
          ausgewaehlt: reiter === id,
          tabStop: reiter === id,
          className: eintrag.fach ? "reiter-doppel" : undefined,
          onWaehlen: () => waehleReiter(id),
          children: eintrag.fach ? (
            <>
              <span className="reiter-alltag">{eintrag.label}</span>
              <span className="reiter-fach">{eintrag.fach}</span>
            </>
          ) : (
            eintrag.label
          ),
        };
      })
    : [];

  return (
    <div className="app">
      <header className={kompakt ? "kopfzeile kopfzeile-kompakt" : "kopfzeile"}>
        {kompakt ? (
          <>
            <div className="kopf-kurz">
              <h1>{planTitel}</h1>
              <p className="meta">Angezeigte Variante: {szenarioName}</p>
            </div>
            <details className="app-menue" ref={menue}>
              <summary>Menü</summary>
              <div
                className="app-menue-liste"
                onClick={() => menue.current?.removeAttribute("open")}
              >
                {planWahl}
                <SzenarioUmschalter plan={plan} onAendern={aendernSzenarien} />
                <div className="app-menue-aktionen">
                  {dateiAktionen}
                  <button type="button" onClick={() => setZuruecksetzenOffen(true)}>
                    {zuruecksetzenLabel}
                  </button>
                </div>
              </div>
            </details>
          </>
        ) : (
          <>
            <div>
              <p className="eyebrow">Finanzplaner</p>
              <h1>{ansicht.stammdaten.firmenname || "Finanzplaner"}</h1>
              <p className="meta">
                {ansicht.stammdaten.planName}
                {rechtsform ? ` · ${RECHTSFORM_LABEL[rechtsform]}` : ""}
                {ansicht.startMonat && letzter
                  ? ` · ${formatMonatLang(ansicht.startMonat)} bis ${formatMonatLang(letzter)}`
                  : ""}
                {` · ${szenarioName}`}
              </p>
            </div>
            <div className="werkzeuge">
              {planWahl}
              <SzenarioUmschalter plan={plan} onAendern={aendernSzenarien} />
              <div className="werkzeuge-zeile">
                <div className="werkzeuge-reihe">{dateiAktionen}</div>
                <details className="weitere" ref={weitere}>
                  <summary>Weitere</summary>
                  <div className="weitere-menue">
                    <button
                      type="button"
                      onClick={() => {
                        weitere.current?.removeAttribute("open");
                        setZuruecksetzenOffen(true);
                      }}
                    >
                      {zuruecksetzenLabel}
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </>
        )}
      </header>

      {ansicht.stammdaten.beispiel ? (
        <p className="flag">
          Fiktiver Datensatz, nicht für einen echten Antrag. Änderungen bleiben in diesem Browser.
        </p>
      ) : (
        speicher.knoten
      )}

      <div className="reiter-ebenen">
        <Reiterleiste label="Bereiche" className="reiter hauptreiter" eintraege={hauptKnopfe} />
        {unterKnopfe.length > 0 ? (
          <Reiterleiste
            label={aktiverHaupt.label}
            className="reiter unterreiter"
            eintraege={unterKnopfe}
          />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="plan-ansicht"
        aria-labelledby={startwahl ? undefined : `reiter-${reiter}`}
      >
        {zeigeLeiste ? (
          <Kennzahlenleiste
            berichte={leisteLeer ? null : rechnung.berichte}
            meldungen={leisteLeer ? [] : meldungen}
            leer={leisteLeer}
            onReiter={onReiter}
          />
        ) : null}
        <PruefAnbieter meldungen={meldungen}>
          <SzenarioHinweis plan={plan} onAendern={aendernSzenarien} />
          {startwahl ? (
            <Startauswahl
              vorlage={vorlage}
              onVorlage={setVorlage}
              onAssistent={() => {
                aendernEingabe((aktuell) => starteMitVorlage(aktuell, "assistent", vorlage));
                onReiter("assistent");
              }}
              onTabelle={() => {
                aendernEingabe((aktuell) => starteMitVorlage(aktuell, "tabelle", vorlage));
                onReiter("eingaben");
              }}
            />
          ) : reiter === "assistent" ? (
            <Assistent
              plan={ansicht}
              berichte={rechnung.berichte}
              onAendern={aendernEingabe}
              onUeberblick={() => onReiter("ueberblick")}
              hervorhebung={sprung?.art === "assistent" ? sprung : null}
              nurLesen={modus === "abweichung"}
            />
          ) : reiter === "szenarien" ? (
            <Szenarien plan={plan} onAendern={aendernSzenarien} />
          ) : reiter === "pruefung" ? (
            <Pruefung
              plan={ansicht}
              meldungen={meldungen}
              fehler={rechnung.fehler}
              onAendern={aendernEingabe}
              onSpringen={springe}
            />
          ) : reiter === "ueberblick" ? (
            rechnung.berichte ? (
              <Ueberblick berichte={rechnung.berichte} />
            ) : (
              <p className="fehler">{rechnung.fehler ?? "Die Rechnung ist fehlgeschlagen."}</p>
            )
          ) : null}
          {reiter !== "ueberblick" &&
          reiter !== "assistent" &&
          reiter !== "pruefung" &&
          reiter !== "szenarien" &&
          !startwahl &&
          rechnung.berichte ? (
            <KennzahlenZeile berichte={rechnung.berichte} reiter={reiter} />
          ) : null}
          {startwahl ||
          reiter === "assistent" ||
          reiter === "ueberblick" ||
          reiter === "pruefung" ||
          reiter === "szenarien" ? null : reiter === "eingaben" && modus !== "abweichung" ? (
            <Hilfeleiste
              plan={ansicht}
              zeile={gewaehlt}
              monat={monat?.monat ?? null}
              monate={monate}
              monatIndex={monat?.monatIndex ?? null}
              onAendern={aendernEingabe}
            />
          ) : reiter === "eingaben" ? null : (
            <p className="hinweis">{hinweis(rechnung.berichte, reiter)}</p>
          )}
          {meldung &&
          reiter !== "ueberblick" &&
          reiter !== "assistent" &&
          reiter !== "pruefung" &&
          !startwahl ? (
            <p className="fehler" role="alert">
              {meldung}
            </p>
          ) : null}
          {rechnung.fehler &&
          reiter !== "eingaben" &&
          reiter !== "ueberblick" &&
          reiter !== "assistent" &&
          reiter !== "pruefung" ? (
            <p className="fehler">{rechnung.fehler}</p>
          ) : null}
          {startwahl ||
          reiter === "ueberblick" ||
          reiter === "assistent" ||
          reiter === "pruefung" ||
          reiter === "szenarien" ? null : (
            <Tabelle
              zeilen={zeilen}
              spalten={spalten}
              auswahl={auswahl}
              onAuswahl={setAuswahl}
              eingeklappt={eingeklappt}
              onUmschalten={schalteJahr}
              onCommit={commitZelle}
              onPaste={einfuegen}
              onUndo={() => dispatch({ typ: "zurueck" })}
              onRedo={() => dispatch({ typ: "vor" })}
              bearbeiten={reiter === "eingaben" && modus !== "abweichung"}
              pruefungen={meldungen}
              ansicht={istTabelle(reiter) ? reiter : "eingaben"}
            />
          )}
        </PruefAnbieter>
      </div>
      {pdfOffen ? (
        <PdfDialog
          plan={plan}
          onSchliessen={() => setPdfOffen(false)}
          onKapitel={(kapitel: PdfKapitelId[]) => uebernehmen({ ...plan, pdfExport: { kapitel } })}
        />
      ) : null}
      {excelOffen ? (
        <ExcelDialog
          plan={plan}
          onSchliessen={() => setExcelOffen(false)}
          onBlaetter={(blaetter: ExcelBlattId[]) =>
            uebernehmen({ ...plan, excelExport: { blaetter } })
          }
        />
      ) : null}
      {zuruecksetzenOffen ? (
        <Bestaetigung
          titel={zuruecksetzenLabel}
          text={
            plan.stammdaten.beispiel
              ? "Die Änderungen an diesem Beispiel in diesem Browser werden verworfen. Das Beispiel selbst bleibt erhalten."
              : "Der Plan in diesem Browser wird verworfen. Eine Datei, die Sie bereits gesichert haben, bleibt davon unberührt."
          }
          bestaetigen={zuruecksetzenLabel}
          gefahr
          onBestaetigen={() => {
            setZuruecksetzenOffen(false);
            onZuruecksetzen();
          }}
          onAbbrechen={() => setZuruecksetzenOffen(false)}
        />
      ) : null}
      <footer className="fusszeile">Finanzplaner 1.0</footer>
    </div>
  );
}

function zeilenFuer(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  jahre: ReturnType<typeof planjahreVon>,
  reiter: ReiterId,
  berichte: Berichte | null,
): TabellenZeile[] {
  if (
    reiter === "ueberblick" ||
    reiter === "assistent" ||
    reiter === "pruefung" ||
    reiter === "szenarien"
  )
    return [];
  if (reiter === "eingaben") {
    return eingabeZeilen(plan, monate, jahre, berichte?.tragfaehigkeit ?? null);
  }
  if (!berichte) return [];
  return berichtZeilen(berichte, reiter);
}

function rechne(plan: Finanzplan): { berichte: Berichte | null; fehler: string | null } {
  try {
    return { berichte: erstelleBerichte(plan, berechnePlan(plan)), fehler: null };
  } catch (fehler) {
    return {
      berichte: null,
      fehler: fehler instanceof Error ? fehler.message : "Die Rechnung ist fehlgeschlagen.",
    };
  }
}

function hinweis(berichte: Berichte | null, reiter: BerichtReiter): string {
  if (!berichte) return "";
  if (reiter === "rentabilitaet") return berichte.rentabilitaet.hinweis;
  if (reiter === "liquiditaet") return berichte.liquiditaet.hinweis;
  if (reiter === "kapital") return berichte.kapital.hinweis;
  if (reiter === "anlagen") return berichte.darlehen.hinweis;
  return berichte.tragfaehigkeit.hinweis;
}

function KennzahlenZeile({ berichte, reiter }: { berichte: Berichte; reiter: ReiterId }) {
  const kennzahlen = berichte.kennzahlen;
  if (
    reiter === "eingaben" ||
    reiter === "ueberblick" ||
    reiter === "assistent" ||
    reiter === "pruefung" ||
    reiter === "szenarien"
  )
    return null;
  if (reiter === "rentabilitaet") {
    const bruch = kennzahlen.breakEven;
    return (
      <p className="kennzahlen">
        Break-even:{" "}
        {bruch.erreicht && bruch.monat
          ? `${formatMonatLang(bruch.monat)} (Planmonat ${bruch.planmonat})`
          : "im Horizont nicht erreicht"}
        {" · "}Rohertragsquote {quote(kennzahlen.rohertragsquote.gesamt.quote)}
        {" · "}Umsatzrendite {quote(kennzahlen.umsatzrendite.gesamt.quote)}
      </p>
    );
  }
  if (reiter === "liquiditaet") {
    return (
      <p className="kennzahlen">
        Tiefster Kontostand {formatEuro(kennzahlen.tiefsterLiquiditaetsstandCents)}
        {kennzahlen.tiefsterLiquiditaetsstandMonat
          ? ` im ${formatMonatLang(kennzahlen.tiefsterLiquiditaetsstandMonat)}`
          : ""}
        {" · "}Kontokorrentbedarf {formatEuro(kennzahlen.kontokorrentbedarfCents)}
      </p>
    );
  }
  if (reiter === "kapital") {
    return (
      <p className="kennzahlen">
        Deckung {formatEuro(berichte.kapital.deckung.betragCents)} (
        {DECKUNG[berichte.kapital.deckungArt]}){" · "}Eigenkapitalquote{" "}
        {quote(kennzahlen.eigenkapitalquote)}
        {berichte.kapital.darlehenAbzugCents > 0
          ? ` · Darlehen unter Nominal ${formatEuro(berichte.kapital.darlehenAbzugCents)}`
          : ""}
      </p>
    );
  }
  if (reiter === "tragfaehigkeit") {
    if (!berichte.tragfaehigkeit.anwendbar) return null;
    const alle = berichte.tragfaehigkeit.alleTragfaehig;
    return (
      <p className="kennzahlen">
        {alle == null
          ? "Tragfähigkeit ohne Bewertung"
          : alle
            ? "Alle Personen tragfähig"
            : "Nicht alle Personen tragfähig"}
      </p>
    );
  }
  return null;
}

function quote(wert: number | null): string {
  if (wert == null) return "–";
  return formatProzent(wert);
}

const KOMPAKT_BIS = "(max-width: 1024px)";

function useKompakt(): boolean {
  const [kompakt, setKompakt] = useState(() => leseKompakt());
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(KOMPAKT_BIS);
    const sync = () => setKompakt(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return kompakt;
}

function leseKompakt(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(KOMPAKT_BIS).matches;
}
