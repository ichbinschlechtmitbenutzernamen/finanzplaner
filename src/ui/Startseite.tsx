import { useState } from "react";
import type { Finanzplan } from "../domain/types.ts";
import { Bestaetigung } from "./Bestaetigung.tsx";
import { formatZeitpunkt } from "./format.ts";
import { PlanDateiEingabe, usePlanDatei } from "./usePlanDatei.tsx";

export interface EigenerPlanKurz {
  name: string;
  geaendertAm: string;
}

export function Startseite({
  beispiele,
  eigenerPlan,
  onWeiter,
  onNeu,
  onBeispiel,
  onLaden,
}: {
  beispiele: readonly { id: string; label: string }[];
  eigenerPlan: EigenerPlanKurz | null;
  onWeiter: () => void;
  onNeu: () => void;
  onBeispiel: (id: string) => void;
  onLaden: (plan: Finanzplan) => void;
}) {
  const datei = usePlanDatei(eigenerPlan != null, onLaden);
  const [neuOffen, setNeuOffen] = useState(false);

  return (
    <div className="app startseite">
      <header className="kopfzeile">
        <div>
          <p className="eyebrow">Finanzplaner</p>
          <h1>Finanzplan über 36 Monate</h1>
          <p className="hinweis startseite-text">
            Der Finanzplaner rechnet einen Gründungsplan über 36 Monate: Umsatz, Kosten, Liquidität
            und Tragfähigkeit. Die Rechnung läuft in diesem Browser, ohne Konto und ohne Server.
          </p>
        </div>
      </header>

      <section className="startseite-block" aria-labelledby="eigener-plan-titel">
        <h2 id="eigener-plan-titel">Eigener Plan</h2>
        <div className="start-aktionen">
          {eigenerPlan ? (
            <button type="button" className="primaer start-haupt" onClick={onWeiter}>
              <span className="start-haupt-titel">Weiter mit meinem Plan</span>
              <span className="start-haupt-meta">
                {eigenerPlan.name} · Zuletzt geändert am {formatZeitpunkt(eigenerPlan.geaendertAm)}
              </span>
            </button>
          ) : (
            <button type="button" className="primaer" onClick={onNeu}>
              Eigenen Plan anlegen
            </button>
          )}
          {eigenerPlan ? (
            <button type="button" onClick={() => setNeuOffen(true)}>
              Neuen Plan anlegen
            </button>
          ) : null}
          <button type="button" onClick={datei.oeffnen}>
            Plan laden
          </button>
        </div>
        {datei.fehler ? (
          <p className="fehler" role="alert">
            {datei.fehler}
          </p>
        ) : null}
      </section>

      <section className="startseite-block" aria-labelledby="beispiele-titel">
        <h2 id="beispiele-titel">Beispiel ansehen</h2>
        <p className="hinweis">Vier erfundene Betriebe, zum Ansehen und Ausprobieren.</p>
        <div className="startseite-beispiele" role="group" aria-label="Beispiel ansehen">
          {beispiele.map((beispiel) => (
            <button key={beispiel.id} type="button" onClick={() => onBeispiel(beispiel.id)}>
              {beispiel.label}
            </button>
          ))}
        </div>
      </section>

      <PlanDateiEingabe eingabe={datei.eingabe} onDatei={datei.beiDatei} />

      {neuOffen && eigenerPlan ? (
        <Bestaetigung
          titel="Neuen Plan anlegen"
          text={`In diesem Browser liegt bereits „${eigenerPlan.name}“, zuletzt geändert am ${formatZeitpunkt(eigenerPlan.geaendertAm)}. Der neue Plan ersetzt ihn.`}
          bestaetigen="Neuen Plan anlegen"
          gefahr
          onBestaetigen={() => {
            setNeuOffen(false);
            onNeu();
          }}
          onAbbrechen={() => setNeuOffen(false)}
        />
      ) : null}
      {datei.bereit && eigenerPlan ? (
        <Bestaetigung
          titel="Plan laden"
          text={`Die Datei ersetzt „${eigenerPlan.name}“ in diesem Browser, zuletzt geändert am ${formatZeitpunkt(eigenerPlan.geaendertAm)}.`}
          bestaetigen="Plan ersetzen"
          gefahr
          onBestaetigen={datei.bestaetigen}
          onAbbrechen={datei.abbrechen}
        />
      ) : null}

      <footer className="fusszeile">Finanzplaner 1.0</footer>
    </div>
  );
}
