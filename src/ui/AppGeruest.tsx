import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { AssistentStation, Rechtsform } from "../domain/types.ts";
import { BASIS_SZENARIO_ID } from "../domain/types.ts";
import type { PruefStufe } from "../domain/checks/typen.ts";
import { Dialog } from "./dialog.tsx";
import type { MenueEintrag, MenueSpalte } from "./geruest/Menueleiste.tsx";
import { Menueleiste } from "./geruest/Menueleiste.tsx";
import { leseLeisteOffen, merkeLeisteOffen, Seitenleiste } from "./geruest/Seitenleiste.tsx";
import { Statusleiste } from "./geruest/Statusleiste.tsx";
import { Symbol } from "./geruest/symbole.tsx";
import type { LeistenKennzahl, LeistenZiel } from "./kennzahlen-leiste.ts";
import type { HauptId, ReiterId } from "./navigation.ts";
import {
  aktionFuerTaste,
  istMac,
  kuerzelTabelle,
  kuerzelText,
  werkzeugTitel,
  type KuerzelAktion,
} from "./tastenkuerzel.ts";

export const APP_VERSION = "1.1.0";

export interface GeruestWahl {
  id: string;
  name: string;
}

interface AppGeruestProps {
  planTitel: string;
  szenarioName: string;
  varianten: readonly GeruestWahl[];
  aktivId: string;
  onVariante: (id: string) => void;
  beispiele: readonly { id: string; label: string }[];
  onBeispiel: (id: string) => void;
  onNeu: () => void;
  onStart?: () => void;
  onSichern: () => void;
  onLaden: () => void;
  onPdf: () => void;
  onExcel: () => void;
  onZuruecksetzen: () => void;
  zuruecksetzenLabel: string;
  onUndo: () => void;
  onRedo: () => void;
  kannUndo: boolean;
  kannRedo: boolean;
  reiter: ReiterId;
  onReiter: (id: ReiterId) => void;
  onHaupt: (id: HauptId) => void;
  onStation: (station: AssistentStation) => void;
  station: AssistentStation | null;
  startwahl: boolean;
  stationenGesperrt: boolean;
  rechtsform: Rechtsform | undefined;
  meldungen: number;
  zaehler: PruefStufe | "keine";
  kennzahlen: readonly LeistenKennzahl[];
  kennzahlenLeer: boolean;
  onKennzahl: (ziel: LeistenZiel) => void;
  speicherStatus: "Gesichert" | "Nicht gesichert";
  children: ReactNode;
}

interface Werkzeug {
  id: string;
  text: string;
  name: string;
  symbol: "neu" | "sichern" | "laden" | "undo" | "redo" | "pdf" | "excel";
  disabled?: boolean;
  onWaehlen: () => void;
}

/** Fensterfüllung ab 1024px: Titelleiste, Menü, Werkzeugleiste, Seitenleiste, Arbeitsbereich, Statusleiste. */
export function AppGeruest(props: AppGeruestProps) {
  const [leisteOffen, setLeisteOffen] = useState(leseLeisteOffen);
  const [kurz, setKurz] = useState(false);
  const [kuerzelOffen, setKuerzelOffen] = useState(false);
  const [ueber, setUeber] = useState(false);
  const mac = istMac();

  function setzeLeiste(offen: boolean) {
    setLeisteOffen(offen);
    merkeLeisteOffen(offen);
  }

  function wechsleLeiste() {
    setLeisteOffen((bisher) => {
      const naechste = !bisher;
      merkeLeisteOffen(naechste);
      return naechste;
    });
  }

  const ausfuehren = useRef<(aktion: KuerzelAktion) => void>(() => undefined);
  useEffect(() => {
    ausfuehren.current = (aktion) => {
      switch (aktion) {
        case "sichern":
          props.onSichern();
          return;
        case "laden":
          props.onLaden();
          return;
        case "undo":
          props.onUndo();
          return;
        case "redo":
          props.onRedo();
          return;
        case "pdf":
          props.onPdf();
          return;
        case "excel":
          props.onExcel();
          return;
        case "leiste":
          wechsleLeiste();
          return;
        case "hilfe":
          setKurz(true);
          return;
        case "start":
          props.onStart?.();
          return;
        case "eingeben":
          props.onHaupt("eingeben");
          return;
        case "ergebnisse":
          props.onHaupt("ergebnisse");
          return;
        case "pruefen":
          props.onHaupt("pruefen");
          return;
        case "szenarien":
          props.onHaupt("szenarien");
          return;
      }
    };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const aktion = aktionFuerTaste(event);
      if (!aktion || event.defaultPrevented) return;
      event.preventDefault();
      ausfuehren.current(aktion);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const beispiele: MenueEintrag[] = props.beispiele.map((beispiel) => ({
    id: beispiel.id,
    label: beispiel.label,
    onWaehlen: () => props.onBeispiel(beispiel.id),
  }));
  const varianten: MenueEintrag[] = props.varianten.map((variante) => ({
    id: variante.id,
    label: variante.name,
    onWaehlen: () => props.onVariante(variante.id),
  }));
  const spalten: MenueSpalte[] = [
    {
      id: "datei",
      label: "Datei",
      eintraege: [
        { id: "neu", label: "Neu", onWaehlen: props.onNeu },
        { id: "beispiele", label: "Beispiel laden", unter: "beispiele" },
        {
          id: "sichern",
          label: "Plan sichern",
          kuerzel: kuerzelText("sichern", mac),
          onWaehlen: props.onSichern,
        },
        {
          id: "laden",
          label: "Plan laden",
          kuerzel: kuerzelText("laden", mac),
          onWaehlen: props.onLaden,
        },
        {
          id: "pdf",
          label: "PDF erstellen",
          kuerzel: kuerzelText("pdf", mac),
          onWaehlen: props.onPdf,
        },
        {
          id: "excel",
          label: "Excel erstellen",
          kuerzel: kuerzelText("excel", mac),
          onWaehlen: props.onExcel,
        },
        {
          id: "reset",
          label: props.zuruecksetzenLabel,
          trennung: true,
          onWaehlen: props.onZuruecksetzen,
        },
      ],
    },
    {
      id: "bearbeiten",
      label: "Bearbeiten",
      eintraege: [
        {
          id: "undo",
          label: "Rückgängig",
          kuerzel: kuerzelText("undo", mac),
          disabled: !props.kannUndo,
          onWaehlen: props.onUndo,
        },
        {
          id: "redo",
          label: "Wiederholen",
          kuerzel: kuerzelText("redo", mac),
          disabled: !props.kannRedo,
          onWaehlen: props.onRedo,
        },
      ],
    },
    {
      id: "ansicht",
      label: "Ansicht",
      eintraege: [
        {
          id: "leiste",
          label: "Seitenleiste ein/aus",
          kuerzel: kuerzelText("leiste", mac),
          onWaehlen: () => setzeLeiste(!leisteOffen),
        },
        { id: "variante", label: "Variante wählen", unter: "variante" },
      ],
    },
    {
      id: "hilfe",
      label: "Hilfe",
      eintraege: [
        {
          id: "kurz",
          label: "Kurzanleitung",
          kuerzel: kuerzelText("kurz", mac),
          onWaehlen: () => setKurz(true),
        },
        { id: "kuerzel", label: "Tastenkürzel", onWaehlen: () => setKuerzelOffen(true) },
        { id: "ueber", label: "Über", onWaehlen: () => setUeber(true) },
      ],
    },
  ];

  const werkzeuge: Werkzeug[] = [
    { id: "neu", text: "Neu", name: "Neu", symbol: "neu", onWaehlen: props.onNeu },
    {
      id: "sichern",
      text: "Sichern",
      name: "Plan sichern",
      symbol: "sichern",
      onWaehlen: props.onSichern,
    },
    { id: "laden", text: "Laden", name: "Plan laden", symbol: "laden", onWaehlen: props.onLaden },
    {
      id: "undo",
      text: "Rückgängig",
      name: "Rückgängig",
      symbol: "undo",
      disabled: !props.kannUndo,
      onWaehlen: props.onUndo,
    },
    {
      id: "redo",
      text: "Wiederholen",
      name: "Wiederholen",
      symbol: "redo",
      disabled: !props.kannRedo,
      onWaehlen: props.onRedo,
    },
    {
      id: "pdf",
      text: "PDF",
      name: "PDF erstellen",
      symbol: "pdf",
      onWaehlen: props.onPdf,
    },
    {
      id: "excel",
      text: "Excel",
      name: "Excel erstellen",
      symbol: "excel",
      onWaehlen: props.onExcel,
    },
  ];

  return (
    <div className="app geruest">
      <header className="titelleiste">
        <div className="titelzeile">
          <p className="wortmarke">FINANZPLANER</p>
          <p className="vorhaben" title={props.planTitel}>
            {props.planTitel}
          </p>
        </div>
        <Menueleiste spalten={spalten} beispiele={beispiele} varianten={varianten} />
      </header>
      <div className="werkzeugleiste">
        <div className="werkzeug-knopfe">
          {werkzeuge.map((werkzeug) => (
            <button
              key={werkzeug.id}
              type="button"
              className="werkzeug"
              aria-label={werkzeug.name}
              title={werkzeugTitel(werkzeug.name, werkzeug.id, mac)}
              disabled={werkzeug.disabled}
              onClick={werkzeug.onWaehlen}
            >
              <Symbol name={werkzeug.symbol} />
              <span>{werkzeug.text}</span>
            </button>
          ))}
        </div>
        <label className="variante-feld">
          Angezeigte Variante
          <select
            value={props.aktivId || BASIS_SZENARIO_ID}
            onChange={(event) => props.onVariante(event.target.value)}
          >
            {props.varianten.map((variante) => (
              <option key={variante.id} value={variante.id}>
                {variante.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="geruest-rumpf">
        <Seitenleiste
          offen={leisteOffen}
          onOffen={setzeLeiste}
          reiter={props.reiter}
          onReiter={props.onReiter}
          onHaupt={props.onHaupt}
          onStation={props.onStation}
          onStart={props.onStart}
          station={props.station}
          startwahl={props.startwahl}
          stationenGesperrt={props.stationenGesperrt}
          rechtsform={props.rechtsform}
          meldungen={props.meldungen}
          zaehler={props.zaehler}
        />
        <main className="arbeitsbereich">{props.children}</main>
      </div>
      <Statusleiste
        kennzahlen={props.kennzahlen}
        leer={props.kennzahlenLeer}
        onKennzahl={props.onKennzahl}
        variante={props.szenarioName}
        speicher={props.speicherStatus}
      />
      {kurz ? <KurzDialog onSchliessen={() => setKurz(false)} /> : null}
      {kuerzelOffen ? (
        <KuerzelDialog mac={mac} onSchliessen={() => setKuerzelOffen(false)} />
      ) : null}
      {ueber ? <UeberDialog onSchliessen={() => setUeber(false)} /> : null}
    </div>
  );
}

function KurzDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const titelId = useId();
  return (
    <Dialog titelId={titelId} onSchliessen={onSchliessen} klasse="dialog-kurz">
      <h2 id={titelId}>Kurzanleitung</h2>
      <p>
        Der Assistent führt durch dieselben Eingaben wie die Tabelle. Zurück und Weiter stehen am
        Ende eines Schritts. Die Schritte stehen links in der Seitenleiste.
      </p>
      <p>
        Pfeile bewegen, Enter bearbeitet, Tab springt weiter, Strg+Z macht rückgängig. Aus Excel
        einfügen: Zellen kopieren und hier mit Strg+V ablegen.
      </p>
      <p>
        Dieser Plan liegt nur in diesem Browser. Mit „Plan sichern“ schreiben Sie eine Datei, die
        Sie später wieder laden können.
      </p>
      <p>Unter „Angezeigte Variante“ wählen Sie, was alle Bereiche und der Export zeigen.</p>
      <div className="szenarien-aktionen">
        <button type="button" className="primaer" onClick={onSchliessen}>
          Schließen
        </button>
      </div>
    </Dialog>
  );
}

function KuerzelDialog({ mac, onSchliessen }: { mac: boolean; onSchliessen: () => void }) {
  const titelId = useId();
  const zeilen = kuerzelTabelle(mac);
  return (
    <Dialog titelId={titelId} onSchliessen={onSchliessen}>
      <h2 id={titelId}>Tastenkürzel</h2>
      <p>Neu hat kein Kürzel, der Browser belegt es.</p>
      <table className="kuerzel-tabelle">
        <thead>
          <tr>
            <th scope="col">Aktion</th>
            <th scope="col">Kürzel</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((zeile) => (
            <tr key={zeile.aktion}>
              <th scope="row">{zeile.aktion}</th>
              <td>{zeile.kuerzel}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="szenarien-aktionen">
        <button type="button" className="primaer" onClick={onSchliessen}>
          Schließen
        </button>
      </div>
    </Dialog>
  );
}

function UeberDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const titelId = useId();
  return (
    <Dialog titelId={titelId} onSchliessen={onSchliessen} klasse="dialog-kurz">
      <h2 id={titelId}>Über Finanzplaner</h2>
      <p>Version {APP_VERSION}</p>
      <p>Die Rechnung läuft in diesem Browser, ohne Konto und ohne Server.</p>
      <div className="szenarien-aktionen">
        <button type="button" className="primaer" onClick={onSchliessen}>
          Schließen
        </button>
      </div>
    </Dialog>
  );
}
