import { useEffect, useState } from "react";
import { horizonEnd } from "./domain/months.ts";
import { PLAN_ZWECK_LABEL, RECHTSFORM_LABEL } from "./domain/labels.ts";
import { SCHEMA_VERSION } from "./domain/types.ts";
import { beispielplaene, beispielplanById } from "./fixtures/index.ts";

function readHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return beispielplanById(hash).id;
}

export default function App() {
  const [activeId, setActiveId] = useState(readHash);

  useEffect(() => {
    const onHash = () => setActiveId(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const current = window.location.hash.replace(/^#/, "");
    if (current !== activeId) {
      window.location.hash = activeId;
    }
  }, [activeId]);

  const selected = beispielplanById(activeId);
  const plan = selected.plan;
  const lastMonth = plan.startMonat ? horizonEnd(plan.startMonat, plan.horizontMonate) : null;
  const rechtsform = plan.stammdaten.rechtsform;

  const blocks = [
    ["Investitionen", plan.kapitalbedarf.investitionen.length],
    ["Gründungskosten", plan.kapitalbedarf.gruendungskosten.length],
    ["Anlaufkosten", plan.kapitalbedarf.anlaufkosten.length],
    ["Eigenkapitalposten", plan.finanzierung.eigenkapital.length],
    ["Darlehen", plan.finanzierung.darlehen.length],
    ["Zuschüsse", plan.finanzierung.zuschuesse.length],
    ["Umsatzlinien", plan.umsatzplanung.length],
    ["Personalstellen", plan.personal.length],
    ["Laufende Kosten", plan.laufendeKosten.length],
  ] as const;

  function selectPlan(id: string) {
    setActiveId(id);
  }

  return (
    <main>
      <p className="eyebrow">Schritt 3 · Steuern im Rechenkern</p>
      <h1>Finanzplaner</h1>
      <p className="lead">
        Ein Finanzplan über drei Jahre für Gründerinnen und Gründer, ohne Vorkenntnisse in der
        Finanzplanung. Der Name ist ein Arbeitsname.
      </p>
      <p>
        Diese Seite zeigt weiterhin nur die Beispieldaten. Der Rechenkern bildet die Monate und die
        Ertragsteuer, Auswertungen und der Assistent folgen später.
      </p>

      <div className="switcher" role="group" aria-label="Beispielplan wählen">
        {beispielplaene.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === selected.id}
            onClick={() => selectPlan(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="panel" aria-labelledby="beispiel-title">
        <p className="flag">Fiktiver Datensatz, nicht für einen echten Antrag</p>
        <h2 id="beispiel-title">Geladener Beispielplan</h2>
        <dl>
          <div>
            <dt>Plan</dt>
            <dd>{plan.stammdaten.planName}</dd>
          </div>
          <div>
            <dt>Firma</dt>
            <dd>
              {plan.stammdaten.firmenname}, {plan.stammdaten.ort}
            </dd>
          </div>
          <div>
            <dt>Rechtsform</dt>
            <dd>{rechtsform ? RECHTSFORM_LABEL[rechtsform] : "noch offen"}</dd>
          </div>
          <div>
            <dt>Horizont</dt>
            <dd>
              {plan.startMonat && lastMonth
                ? `${plan.startMonat} bis ${lastMonth} (${plan.horizontMonate} Monate)`
                : "Startmonat noch offen"}
            </dd>
          </div>
          <div>
            <dt>Zwecke</dt>
            <dd>{plan.stammdaten.zwecke.map((zweck) => PLAN_ZWECK_LABEL[zweck]).join(", ")}</dd>
          </div>
          <div>
            <dt>Darlehen</dt>
            <dd>
              {plan.finanzierung.darlehen.map((darlehen) => darlehen.bezeichnung).join(", ") ||
                "keine"}
            </dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>
              Version {SCHEMA_VERSION}, Parameter {plan.parameter.version}
            </dd>
          </div>
        </dl>
        <ul className="counts">
          {blocks.map(([label, count]) => (
            <li key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
