import { useEffect, useMemo, useReducer, useState } from "react";
import { berechnePlan } from "../domain/calc/berechnen.ts";
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
import type { Finanzplan, IsoMonth } from "../domain/types.ts";
import { formatEuro, formatMonatLang, formatProzent } from "./format.ts";
import { verlaufAnfang, verlaufReduzieren } from "./history.ts";
import { Hilfeleiste } from "./Hilfeleiste.tsx";
import { sichtbareSpalten } from "./spalten.ts";
import { monatDerAuswahl, Tabelle, type Auswahl } from "./Tabelle.tsx";
import { berichtZeilen, type BerichtReiter } from "./zeilen-bericht.ts";
import { eingabeZeilen, planMonate } from "./zeilen-eingabe.ts";
import type { TabellenZeile } from "./zeilen-modell.ts";

export const REITER = [
  { id: "eingaben", label: "Eingaben" },
  { id: "rentabilitaet", label: "Rentabilitätsvorschau" },
  { id: "liquiditaet", label: "Liquiditätsplan" },
  { id: "kapital", label: "Kapitalbedarf und Finanzierung" },
  { id: "anlagen", label: "Investitionen und Darlehen" },
  { id: "tragfaehigkeit", label: "Privatbedarf und Tragfähigkeit" },
] as const;

export type ReiterId = (typeof REITER)[number]["id"];

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
  onSpeichern,
  onZuruecksetzen,
}: PlanArbeitsflaecheProps) {
  const [verlauf, dispatch] = useReducer(verlaufReduzieren<Finanzplan>, anfangsplan, verlaufAnfang);
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const [eingeklappt, setEingeklappt] = useState<ReadonlySet<number>>(() => new Set());
  const [meldung, setMeldung] = useState<string | null>(null);
  const plan = verlauf.gegenwart;
  const monate = useMemo(() => planMonate(plan), [plan]);
  const jahre = useMemo(() => planjahreVon(monate), [monate]);
  const spalten = useMemo(
    () => sichtbareSpalten(monate, jahre, eingeklappt),
    [monate, jahre, eingeklappt],
  );
  const rechnung = useMemo(() => rechne(plan), [plan]);
  const zeilen = useMemo(
    () => zeilenFuer(plan, monate, jahre, reiter, rechnung.berichte),
    [plan, monate, jahre, reiter, rechnung.berichte],
  );
  const gewaehlt = zeilen[auswahl?.zeile ?? -1] ?? null;
  const monat = monatDerAuswahl(spalten, auswahl);

  useEffect(() => {
    if (verlauf.vergangenheit.length === 0 && verlauf.zukunft.length === 0) return;
    onSpeichern(plan);
  }, [onSpeichern, plan, verlauf.vergangenheit.length, verlauf.zukunft.length]);

  function aendern(erzeugen: (aktuell: Finanzplan) => Finanzplan) {
    try {
      const roh = erzeugen(plan);
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
        aendern((aktuell) => setzeSerieZelle(aktuell, zeile.serie!, zielMonat, zahl));
        return;
      }
      const cents = leer ? null : parseCentBetrag(text);
      if (!leer && cents == null) {
        setMeldung("Das ist kein Betrag.");
        return;
      }
      aendern((aktuell) => setzeSerieZelle(aktuell, zeile.serie!, zielMonat, cents));
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
    aendern((aktuell) => setzeEinmal(aktuell, einmal, cents));
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
        aendern((aktuell) => setzeEinmal(aktuell, einmal, roundCents(zahl * 100)));
        return;
      }
      setMeldung("Diese Zeile lässt sich nicht aus Excel füllen.");
      return;
    }
    aendern((aktuell) => {
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

  const rechtsform = plan.stammdaten.rechtsform;
  const letzter = monate.at(-1);

  return (
    <div className="app">
      <header className="kopfzeile">
        <div>
          <p className="eyebrow">Schritt 5 · Tabellenansicht</p>
          <h1>{plan.stammdaten.firmenname || "Finanzplaner"}</h1>
          <p className="meta">
            {plan.stammdaten.planName}
            {rechtsform ? ` · ${RECHTSFORM_LABEL[rechtsform]}` : ""}
            {plan.startMonat && letzter
              ? ` · ${formatMonatLang(plan.startMonat)} bis ${formatMonatLang(letzter)}`
              : ""}
            {` · ${szenarioName(plan)}`}
          </p>
        </div>
        <div className="werkzeuge">
          <div className="switcher" role="group" aria-label="Beispielplan wählen">
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
              Beispiel zurücksetzen
            </button>
          </div>
        </div>
      </header>

      {plan.stammdaten.beispiel ? (
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
            aria-controls="plan-tabelle"
            onClick={() => onReiter(eintrag.id)}
          >
            {eintrag.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="plan-tabelle" aria-labelledby={`reiter-${reiter}`}>
        {rechnung.berichte ? (
          <KennzahlenZeile berichte={rechnung.berichte} reiter={reiter} />
        ) : null}
        {reiter === "eingaben" ? (
          <Hilfeleiste
            plan={plan}
            zeile={gewaehlt}
            monat={monat?.monat ?? null}
            monate={monate}
            monatIndex={monat?.monatIndex ?? null}
            onAendern={aendern}
          />
        ) : (
          <p className="hinweis">{hinweis(rechnung.berichte, reiter)}</p>
        )}
        {meldung ? (
          <p className="fehler" role="alert">
            {meldung}
          </p>
        ) : null}
        {rechnung.fehler && reiter !== "eingaben" ? (
          <p className="fehler">{rechnung.fehler}</p>
        ) : null}
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
          bearbeiten={reiter === "eingaben"}
        />
      </div>
    </div>
  );
}

function szenarioName(plan: Finanzplan): string {
  const aktiv = plan.szenarien.aktiv;
  if (aktiv === "base") return "Basis";
  return plan.szenarien[aktiv].bezeichnung;
}

function zeilenFuer(
  plan: Finanzplan,
  monate: readonly IsoMonth[],
  jahre: ReturnType<typeof planjahreVon>,
  reiter: ReiterId,
  berichte: Berichte | null,
): TabellenZeile[] {
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
  if (reiter === "eingaben") return null;
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
