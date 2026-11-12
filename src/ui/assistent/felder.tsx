import { useId, useState, type ReactNode } from "react";
import { parseCentBetrag, parseDeutschZahl } from "../../domain/eingabe/zahlen.ts";
import { formatEingabeEuro } from "../format.ts";

export function Feld({
  label,
  hilfe,
  children,
}: {
  label: string;
  hilfe: string;
  children: ReactNode;
}) {
  return (
    <label className="feld">
      <span className="feld-label">{label}</span>
      {children}
      <span className="feld-hilfe">{hilfe}</span>
    </label>
  );
}

export function TextFeld({
  label,
  hilfe,
  value,
  onChange,
}: {
  label: string;
  hilfe: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      <p className="feld-hilfe">{hilfe}</p>
    </div>
  );
}

export function EuroFeld({
  label,
  hilfe,
  cents,
  onChange,
  pflicht = false,
  positiv = false,
}: {
  label: string;
  hilfe: string;
  cents: number | null;
  onChange: (cents: number) => void;
  /** Leeres Feld ist ein Pflichtfeld-Fehler, bis ein Betrag erfasst ist. */
  pflicht?: boolean;
  /** 0 bleibt ein Fehler. Der Plan übernimmt den Betrag erst darüber. */
  positiv?: boolean;
}) {
  return (
    <EuroFeldInnen
      key={cents ?? "leer"}
      label={label}
      hilfe={hilfe}
      cents={cents}
      onChange={onChange}
      pflicht={pflicht}
      positiv={positiv}
    />
  );
}

function EuroFeldInnen({
  label,
  hilfe,
  cents,
  onChange,
  pflicht,
  positiv,
}: {
  label: string;
  hilfe: string;
  cents: number | null;
  onChange: (cents: number) => void;
  pflicht: boolean;
  positiv: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(() => (cents == null ? "" : formatEingabeEuro(cents)));
  const [fehler, setFehler] = useState<string | null>(
    pflicht && cents == null ? "Der Betrag fehlt." : null,
  );
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        aria-invalid={fehler != null}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() === "") {
            setFehler(pflicht ? "Der Betrag fehlt." : null);
            return;
          }
          const wert = parseCentBetrag(text);
          if (wert == null) {
            setFehler("Das ist kein Betrag.");
            return;
          }
          if (wert < 0) {
            setFehler("Beträge dürfen nicht negativ sein.");
            return;
          }
          if (positiv && wert === 0) {
            setFehler("Der Betrag muss größer als 0 sein.");
            return;
          }
          setFehler(null);
          onChange(wert);
        }}
      />
      <p className="feld-hilfe">{hilfe}</p>
      {fehler ? <p className="fehler">{fehler}</p> : null}
    </div>
  );
}

export function MonatFeld({
  label,
  hilfe,
  value,
  onChange,
}: {
  label: string;
  hilfe: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="feld-hilfe">{hilfe}</p>
    </div>
  );
}

/** Prozentzahl im Feld, Dezimalsatz im Plan. 19 steht für 0,19. */
export function ProzentFeld({
  label,
  hilfe,
  satz,
  onChange,
  leerErlaubt = false,
}: {
  label: string;
  hilfe: string;
  satz: number | null;
  onChange: (satz: number | null) => void;
  leerErlaubt?: boolean;
}) {
  return (
    <ProzentFeldInnen
      key={satz ?? "leer"}
      label={label}
      hilfe={hilfe}
      satz={satz}
      onChange={onChange}
      leerErlaubt={leerErlaubt}
    />
  );
}

function ProzentFeldInnen({
  label,
  hilfe,
  satz,
  onChange,
  leerErlaubt = false,
}: {
  label: string;
  hilfe: string;
  satz: number | null;
  onChange: (satz: number | null) => void;
  leerErlaubt?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(() => (satz == null ? "" : formatZahl(satz * 100)));
  const [fehler, setFehler] = useState<string | null>(null);
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() === "") {
            if (leerErlaubt) {
              setFehler(null);
              onChange(null);
              return;
            }
            setFehler("Die Angabe fehlt.");
            return;
          }
          const zahl = parseDeutschZahl(text);
          if (zahl == null) {
            setFehler("Das ist keine Zahl.");
            return;
          }
          if (zahl < 0) {
            setFehler("Der Wert darf nicht negativ sein.");
            return;
          }
          setFehler(null);
          onChange(zahl / 100);
        }}
      />
      <p className="feld-hilfe">{hilfe}</p>
      {fehler ? <p className="fehler">{fehler}</p> : null}
    </div>
  );
}

export function ZahlFeld({
  label,
  hilfe,
  wert,
  onChange,
  ganzzahlig = false,
}: {
  label: string;
  hilfe: string;
  wert: number | null;
  onChange: (wert: number | null) => void;
  ganzzahlig?: boolean;
}) {
  return (
    <ZahlFeldInnen
      key={wert ?? "leer"}
      label={label}
      hilfe={hilfe}
      wert={wert}
      onChange={onChange}
      ganzzahlig={ganzzahlig}
    />
  );
}

function ZahlFeldInnen({
  label,
  hilfe,
  wert,
  onChange,
  ganzzahlig = false,
}: {
  label: string;
  hilfe: string;
  wert: number | null;
  onChange: (wert: number | null) => void;
  ganzzahlig?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(() => (wert == null ? "" : formatZahl(wert)));
  const [fehler, setFehler] = useState<string | null>(null);
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() === "") {
            setFehler(null);
            onChange(null);
            return;
          }
          const zahl = parseDeutschZahl(text);
          if (zahl == null) {
            setFehler("Das ist keine Zahl.");
            return;
          }
          if (zahl < 0) {
            setFehler("Der Wert darf nicht negativ sein.");
            return;
          }
          setFehler(null);
          onChange(ganzzahlig ? Math.round(zahl) : zahl);
        }}
      />
      <p className="feld-hilfe">{hilfe}</p>
      {fehler ? <p className="fehler">{fehler}</p> : null}
    </div>
  );
}

export function AuswahlFeld({
  label,
  hilfe,
  value,
  onChange,
  children,
}: {
  label: string;
  hilfe: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="feld">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <p className="feld-hilfe">{hilfe}</p>
    </div>
  );
}

function formatZahl(wert: number): string {
  return String(wert).replace(".", ",");
}
