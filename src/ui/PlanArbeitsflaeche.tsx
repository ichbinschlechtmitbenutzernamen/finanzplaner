import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import type { Finanzplan, IsoMonth, AssistentStation } from "../domain/types.ts";
import { formatEuro, formatMonatLang, formatProzent } from "./format.ts";
import { verlaufAnfang, verlaufReduzieren } from "./history.ts";
import { Hilfeleiste } from "./Hilfeleiste.tsx";
import { sichtbareSpalten } from "./spalten.ts";
import { monatDerAuswahl, Tabelle, type Auswahl } from "./Tabelle.tsx";
import { zeigeStartauswahl } from "../domain/assistent/stationen.ts";
import { Assistent, Startauswahl, waehleAssistent, waehleTabelle } from "./Assistent.tsx";
import { Pruefung, zaehlerStufe } from "./Pruefung.tsx";
import { PruefAnbieter } from "./pruef-marke.tsx";
import { Szenarien, SzenarioHinweis, SzenarioUmschalter } from "./Szenarien.tsx";
import { Ueberblick } from "./Ueberblick.tsx";
import { berichtZeilen, type BerichtReiter } from "./zeilen-bericht.ts";
import { eingabeZeilen, planMonate } from "./zeilen-eingabe.ts";
import type { TabellenZeile } from "./zeilen-modell.ts";

export const REITER = [
  { id: "assistent", label: "Assistent" },
  { id: "ueberblick", label: "Überblick" },
  { id: "szenarien", label: "Szenarien" },
  { id: "pruefung", label: "Prüfung" },
  { id: "eingaben", label: "Eingaben" },
  { id: "rentabilitaet", label: "Rentabilitätsvorschau" },
  { id: "liquiditaet", label: "Liquiditätsplan" },
  { id: "kapital", label: "Kapitalbedarf und Finanzierung" },
  { id: "anlagen", label: "Investitionen und Darlehen" },
  { id: "tragfaehigkeit", label: "Privatbedarf und Tragfähigkeit" },
] as const;

export type ReiterId = (typeof REITER)[number]["id"];

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

interface PlanArbeitsflaecheProps {
  anfangsplan: Finanzplan;
  beispiele: readonly { id: string; label: string }[];
  beispielId: string;
  reiter: ReiterId;
  onBeispiel: (id: string) => void;
  onReiter: (reiter: ReiterId) => void;
  onNeu: () => void;
  onSpeichern: (plan: Finanzplan) => void;
  onZuruecksetzen: () => void;
}

export function PlanArbeitsflaeche({
  anfangsplan,
  beispiele,
  beispielId,
  reiter,
  onBeispiel,
  onReiter,
  onNeu,
  onSpeichern,
  onZuruecksetzen,
}: PlanArbeitsflaecheProps) {
  const [verlauf, dispatch] = useReducer(verlaufReduzieren<Finanzplan>, anfangsplan, verlaufAnfang);
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const [sprung, setSprung] = useState<Sprung | null>(null);
  const sprungAngewandt = useRef("");
  const [eingeklappt, setEingeklappt] = useState<ReadonlySet<number>>(() => new Set());
  const [meldung, setMeldung] = useState<string | null>(null);
  const plan = verlauf.gegenwart;
  const ansicht = useMemo(() => planFuerRechnung(plan), [plan]);
  const modus = aktivesSzenario(plan)?.art ?? "basis";
  const monate = useMemo(() => planMonate(ansicht), [ansicht]);
  const jahre = useMemo(() => planjahreVon(monate), [monate]);
  const spalten = useMemo(
    () => sichtbareSpalten(monate, jahre, eingeklappt),
    [monate, jahre, eingeklappt],
  );
  const rechnung = useMemo(() => rechne(ansicht), [ansicht]);
  const meldungen = useMemo(
    () => (rechnung.berichte ? pruefePlan(ansicht, rechnung.berichte) : []),
    [ansicht, rechnung.berichte],
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
  }, [onSpeichern, plan, verlauf.vergangenheit.length, verlauf.zukunft.length]);

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
        `„${name}“ ist ein Abweichungs-Szenario. Die Eingaben sind nur lesend. Wählen Sie den Basisplan oder ändern Sie die Hebel auf der Seite Szenarien.`,
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
      if (jahr && eingeklappt.has(jahr.nummer)) {
        setEingeklappt((bisher) => {
          const naechste = new Set(bisher);
          naechste.delete(jahr.nummer);
          return naechste;
        });
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

  const rechtsform = ansicht.stammdaten.rechtsform;
  const letzter = monate.at(-1);

  return (
    <div className="app">
      <header className="kopfzeile">
        <div>
          <p className="eyebrow">Schritt 9 · Szenarien</p>
          <h1>{ansicht.stammdaten.firmenname || "Finanzplaner"}</h1>
          <p className="meta">
            {ansicht.stammdaten.planName}
            {rechtsform ? ` · ${RECHTSFORM_LABEL[rechtsform]}` : ""}
            {ansicht.startMonat && letzter
              ? ` · ${formatMonatLang(ansicht.startMonat)} bis ${formatMonatLang(letzter)}`
              : ""}
            {` · ${aktivesSzenario(plan)?.name ?? "Basisplan"}`}
          </p>
        </div>
        <div className="werkzeuge">
          <div className="switcher" role="group" aria-label="Plan wählen">
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
          <SzenarioUmschalter plan={plan} onAendern={aendernSzenarien} />
          <div className="werkzeuge-reihe">
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
            <button type="button" onClick={onZuruecksetzen}>
              {plan.stammdaten.beispiel ? "Beispiel zurücksetzen" : "Plan zurücksetzen"}
            </button>
          </div>
        </div>
      </header>

      {ansicht.stammdaten.beispiel ? (
        <p className="flag">
          Fiktiver Datensatz, nicht für einen echten Antrag. Änderungen bleiben in diesem Browser.
        </p>
      ) : null}

      <div className="reiter" role="tablist" aria-label="Ansichten">
        {REITER.map((eintrag) => (
          <button
            key={eintrag.id}
            type="button"
            role="tab"
            id={`reiter-${eintrag.id}`}
            aria-selected={reiter === eintrag.id}
            aria-controls="plan-ansicht"
            onClick={() => {
              if (
                zeigeStartauswahl(plan) &&
                eintrag.id !== "pruefung" &&
                eintrag.id !== "szenarien"
              ) {
                aendernEingabe((aktuell) =>
                  eintrag.id === "assistent" ? waehleAssistent(aktuell) : waehleTabelle(aktuell),
                );
              }
              onReiter(eintrag.id);
            }}
          >
            {eintrag.label}
            {eintrag.id === "pruefung" ? (
              <span
                className={`pruef-zaehler pruef-${zaehlerStufe(meldungen)}`}
                aria-label={`${meldungen.length} ${meldungen.length === 1 ? "Meldung" : "Meldungen"}`}
              >
                {meldungen.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="plan-ansicht" aria-labelledby={`reiter-${reiter}`}>
        <PruefAnbieter meldungen={meldungen}>
          <SzenarioHinweis plan={plan} />
          {zeigeStartauswahl(plan) ? (
            <Startauswahl
              onAssistent={() => {
                aendernEingabe((aktuell) => waehleAssistent(aktuell));
                onReiter("assistent");
              }}
              onTabelle={() => {
                aendernEingabe((aktuell) => waehleTabelle(aktuell));
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
          !zeigeStartauswahl(plan) &&
          rechnung.berichte ? (
            <KennzahlenZeile berichte={rechnung.berichte} reiter={reiter} />
          ) : null}
          {zeigeStartauswahl(plan) ||
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
          !zeigeStartauswahl(plan) ? (
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
          {zeigeStartauswahl(plan) ||
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
              onUmschalten={(nummer) => {
                setEingeklappt((bisher) => {
                  const naechste = new Set(bisher);
                  if (naechste.has(nummer)) naechste.delete(nummer);
                  else naechste.add(nummer);
                  return naechste;
                });
              }}
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
  if (reiter === "eingaben") return eingabeZeilen(plan, monate, jahre);
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
