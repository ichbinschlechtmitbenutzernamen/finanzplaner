import { beispielEinzelunternehmen } from "./fixtures/beispiel-einzelunternehmen.ts";
import { horizonEnd } from "./domain/months.ts";
import { PLAN_ZWECK_LABEL, RECHTSFORM_LABEL } from "./domain/labels.ts";
import { SCHEMA_VERSION } from "./domain/types.ts";

const plan = beispielEinzelunternehmen;
const lastMonth = horizonEnd(plan.startMonat, plan.horizontMonate);

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

export default function App() {
  return (
    <main>
      <p className="eyebrow">Schritt 1 · Grundlage</p>
      <h1>Finanzplaner</h1>
      <p className="lead">
        Ein Finanzplan über drei Jahre für Gründerinnen und Gründer, ohne Vorkenntnisse in der
        Finanzplanung. Der Name ist ein Arbeitsname.
      </p>
      <p>
        Dieser Schritt enthält das Datenmodell und einen fiktiven Beispieldatensatz. Assistent,
        Berechnung und Auswertungen folgen später. Die Daten bleiben dafür serialisierbar, mit
        stabilen Ids und einer Schema-Version.
      </p>

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
            <dd>{RECHTSFORM_LABEL[plan.stammdaten.rechtsform]}</dd>
          </div>
          <div>
            <dt>Horizont</dt>
            <dd>
              {plan.startMonat} bis {lastMonth} ({plan.horizontMonate} Monate)
            </dd>
          </div>
          <div>
            <dt>Zwecke</dt>
            <dd>{plan.stammdaten.zwecke.map((zweck) => PLAN_ZWECK_LABEL[zweck]).join(", ")}</dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>Version {SCHEMA_VERSION}</dd>
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
