import { useState } from "react";
import {
  EingabeFehler,
  fortschreibenSerie,
  leseMenge,
  leseMonatswert,
  saisonSerie,
  wachstumSerie,
} from "../domain/eingabe/index.ts";
import type { Finanzplan, IsoMonth, MonatFaktoren, Wachstumsbezug } from "../domain/types.ts";
import { parseDeutschZahl } from "../domain/eingabe/zahlen.ts";
import { KALENDER_KURZ } from "./format.ts";
import type { TabellenZeile } from "./zeilen-modell.ts";

const NEUTRAL = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

interface HilfeleisteProps {
  plan: Finanzplan;
  zeile: TabellenZeile | null;
  monat: IsoMonth | null;
  monate: readonly IsoMonth[];
  monatIndex: number | null;
  onAendern: (erzeugen: (plan: Finanzplan) => Finanzplan) => void;
}

export function Hilfeleiste({
  plan,
  zeile,
  monat,
  monate,
  monatIndex,
  onAendern,
}: HilfeleisteProps) {
  const serie = zeile?.serie;
  const faktoren = faktorenVon(plan, zeile);
  return (
    <div className="hilfe">
      <div className="hilfe-zeile">
        <button
          type="button"
          disabled={!serie || monatIndex == null}
          onClick={() => {
            if (!serie || monatIndex == null || !zeile) return;
            onAendern((aktuell) =>
              fortschreibenSerie(aktuell, serie, monate, monatIndex, zeile.bearbeitbar),
            );
          }}
        >
          Nach rechts fortschreiben
        </button>
        <WachstumForm
          key={serie ? zielSchluessel(serie) : "keins"}
          disabled={!serie || monatIndex == null}
          onAnwenden={(rate, bezug) => {
            if (!serie || monatIndex == null || !zeile) return;
            onAendern((aktuell) =>
              wachstumSerie(aktuell, serie, monate, monatIndex, rate, bezug, zeile.bearbeitbar),
            );
          }}
        />
      </div>
      <SaisonForm
        key={`${serie ? zielSchluessel(serie) : "keins"}:${faktoren.join(",")}`}
        faktoren={faktoren}
        disabled={!serie}
        onAnwenden={(neu) => {
          if (!serie) return;
          onAendern((aktuell) => saisonSerie(aktuell, serie, neu));
        }}
      />
      <p className="hilfe-text">
        {monat
          ? `Auswahl ${monat}. Pfeile bewegen, Enter bearbeitet, Tab springt weiter, Strg+Z macht rückgängig.`
          : "Pfeile bewegen, Enter bearbeitet, Tab springt weiter, Strg+Z macht rückgängig."}{" "}
        Aus Excel einfügen: Zellen kopieren und hier mit Strg+V ablegen. Deutsche Zahlen wie
        1.234,56 € werden erkannt. Fortschreiben und Wachstum schreiben monatliche Überschreibungen.
        Die Saison setzt die zwölf Kalenderfaktoren und entfernt Überschreibungen dieser Zeile.
      </p>
    </div>
  );
}

function WachstumForm({
  disabled,
  onAnwenden,
}: {
  disabled: boolean;
  onAnwenden: (rate: number, bezug: Wachstumsbezug) => void;
}) {
  const [text, setText] = useState("2");
  const [bezug, setBezug] = useState<Wachstumsbezug>("monat");
  const [fehler, setFehler] = useState<string | null>(null);
  return (
    <form
      className="wachstum-form"
      onSubmit={(event) => {
        event.preventDefault();
        const zahl = parseDeutschZahl(text);
        if (zahl == null) {
          setFehler("Die Rate ist keine Zahl.");
          return;
        }
        setFehler(null);
        try {
          onAnwenden(zahl / 100, bezug);
        } catch (gefangen) {
          setFehler(gefangen instanceof EingabeFehler ? gefangen.message : "Die Rate passt nicht.");
        }
      }}
    >
      <label>
        Wachstum %
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          inputMode="decimal"
          aria-label="Wachstumsrate in Prozent"
        />
      </label>
      <label>
        je
        <select
          value={bezug}
          aria-label="Zeitraum der Wachstumsrate"
          onChange={(event) => setBezug(event.target.value as Wachstumsbezug)}
        >
          <option value="monat">Monat</option>
          <option value="jahr">Jahr</option>
        </select>
      </label>
      <button type="submit" disabled={disabled}>
        Wachstum anwenden
      </button>
      {fehler ? <span className="fehler">{fehler}</span> : null}
    </form>
  );
}

function SaisonForm({
  faktoren,
  disabled,
  onAnwenden,
}: {
  faktoren: number[];
  disabled: boolean;
  onAnwenden: (faktoren: MonatFaktoren) => void;
}) {
  const [texte, setTexte] = useState(faktoren.map((faktor) => String(faktor).replace(".", ",")));
  const [fehler, setFehler] = useState<string | null>(null);
  return (
    <form
      className="saison-form"
      onSubmit={(event) => {
        event.preventDefault();
        const werte = texte.map((text) => parseDeutschZahl(text));
        if (werte.some((wert) => wert == null)) {
          setFehler("Jeder Monat braucht eine Zahl.");
          return;
        }
        setFehler(null);
        try {
          onAnwenden(werte as MonatFaktoren);
        } catch (gefangen) {
          setFehler(
            gefangen instanceof EingabeFehler ? gefangen.message : "Die Saison passt nicht.",
          );
        }
      }}
    >
      <span className="saison-titel">Saison</span>
      {KALENDER_KURZ.map((name, index) => (
        <label key={name}>
          {name}
          <input
            aria-label={`Saisonfaktor ${name}`}
            value={texte[index] ?? ""}
            inputMode="decimal"
            onChange={(event) => {
              const naechste = [...texte];
              naechste[index] = event.target.value;
              setTexte(naechste);
            }}
          />
        </label>
      ))}
      <button type="submit" disabled={disabled}>
        Saison anwenden
      </button>
      {fehler ? <span className="fehler">{fehler}</span> : null}
    </form>
  );
}

function faktorenVon(plan: Finanzplan, zeile: TabellenZeile | null): number[] {
  const serie = zeile?.serie;
  if (!serie) return [...NEUTRAL];
  if (serie.art === "menge") {
    return [...(leseMenge(plan, serie)?.saison?.faktoren ?? NEUTRAL)];
  }
  return [...(leseMonatswert(plan, serie)?.saison?.faktoren ?? NEUTRAL)];
}

function zielSchluessel(ziel: NonNullable<TabellenZeile["serie"]>): string {
  if (ziel.art === "leben") return `${ziel.art}:${ziel.personId}:${ziel.feld}`;
  return `${ziel.art}:${ziel.id}`;
}
