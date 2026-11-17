import { useEffect, useState } from "react";
import { EXCEL_BLATT_LABEL, normalisiereBlaetter } from "../../domain/excel/blaetter.ts";
import { erstelleArbeitsmappe } from "../../domain/excel/mappe.ts";
import { istPersonenunternehmen } from "../../domain/reports/planjahr.ts";
import { planFuerSzenario } from "../../domain/szenarien/anwenden.ts";
import {
  BASIS_SZENARIO_ID,
  EXCEL_BLAETTER,
  type ExcelBlattId,
  type Finanzplan,
} from "../../domain/types.ts";

interface ExcelDialogProps {
  plan: Finanzplan;
  onSchliessen: () => void;
  onBlaetter: (blaetter: ExcelBlattId[]) => void;
}

export function ExcelDialog({ plan, onSchliessen, onBlaetter }: ExcelDialogProps) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [szenarioId, setSzenarioId] = useState<string>(BASIS_SZENARIO_ID);
  const faelle = [
    { id: BASIS_SZENARIO_ID, name: "Basisplan" },
    ...plan.planSzenarien.eintraege.map((eintrag) => ({ id: eintrag.id, name: eintrag.name })),
  ];
  const gewaehlt = faelle.some((fall) => fall.id === szenarioId) ? szenarioId : BASIS_SZENARIO_ID;
  const rechtsform = planFuerSzenario(plan, gewaehlt).stammdaten.rechtsform;
  const sichtbar = EXCEL_BLAETTER.filter(
    (id) => id !== "tragfaehigkeit" || istPersonenunternehmen(rechtsform),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !laeuft) onSchliessen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [laeuft, onSchliessen]);

  function schalte(id: ExcelBlattId, an: boolean) {
    const gesetzt = new Set(plan.excelExport.blaetter);
    if (an) gesetzt.add(id);
    else gesetzt.delete(id);
    onBlaetter(normalisiereBlaetter([...gesetzt]));
  }

  async function erstellen() {
    setLaeuft(true);
    setFehler(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const modell = erstelleArbeitsmappe(plan, new Date(), gewaehlt);
      const { erzeugeExcel } = await import("./erzeugen.ts");
      const blob = await erzeugeExcel(modell);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = modell.dateiname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onSchliessen();
    } catch (ursache) {
      setFehler(
        ursache instanceof Error
          ? ursache.message
          : "Die Excel-Datei konnte nicht erstellt werden.",
      );
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="dialog-hintergrund">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="excel-titel">
        <h2 id="excel-titel">Excel erstellen</h2>
        <p className="meta">
          Das gewählte Szenario wird mit Formeln durchgerechnet. Die übrigen Szenarien stehen im
          Szenarienvergleich. Die Datei entsteht in diesem Browser, die Daten bleiben auf dem Gerät.
        </p>
        <fieldset className="pdf-szenario">
          <legend>Szenario</legend>
          {faelle.map((fall) => (
            <label key={fall.id}>
              <input
                type="radio"
                name="excel-szenario"
                checked={gewaehlt === fall.id}
                disabled={laeuft}
                onChange={() => setSzenarioId(fall.id)}
              />
              {fall.name}
            </label>
          ))}
        </fieldset>
        <div className="kapitel-liste">
          {sichtbar.map((id) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={plan.excelExport.blaetter.includes(id)}
                disabled={laeuft}
                onChange={(event) => schalte(id, event.target.checked)}
              />
              {EXCEL_BLATT_LABEL[id]}
            </label>
          ))}
        </div>
        <p className="hinweis">
          Eingaben und die Hilfsblätter sind immer in der Datei, sobald ein Rechenblatt gewählt ist.
        </p>
        {istPersonenunternehmen(rechtsform) ? null : (
          <p className="hinweis">
            Die Tragfähigkeit mit Lebenshaltung gibt es nur bei Einzelunternehmen, Freiberuf und
            Personengesellschaften. Bei dieser Rechtsform entfällt das Blatt.
          </p>
        )}
        {fehler ? (
          <p className="fehler" role="alert">
            {fehler}
          </p>
        ) : null}
        <div className="szenarien-aktionen">
          <button type="button" className="primaer" onClick={erstellen} disabled={laeuft}>
            {laeuft ? "Excel wird erstellt …" : "Excel herunterladen"}
          </button>
          <button type="button" onClick={onSchliessen} disabled={laeuft}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
