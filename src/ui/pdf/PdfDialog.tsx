import { useEffect, useState } from "react";
import { PDF_KAPITEL_LABEL, normalisiereKapitel } from "../../domain/pdf/kapitel.ts";
import { erstellePdfDokument } from "../../domain/pdf/modell.ts";
import { istPersonenunternehmen } from "../../domain/reports/planjahr.ts";
import { planFuerSzenario } from "../../domain/szenarien/anwenden.ts";
import {
  BASIS_SZENARIO_ID,
  PDF_KAPITEL,
  type Finanzplan,
  type PdfKapitelId,
} from "../../domain/types.ts";

interface PdfDialogProps {
  plan: Finanzplan;
  onSchliessen: () => void;
  onKapitel: (kapitel: PdfKapitelId[]) => void;
}

export function PdfDialog({ plan, onSchliessen, onKapitel }: PdfDialogProps) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [szenarioId, setSzenarioId] = useState<string>(BASIS_SZENARIO_ID);
  const faelle = [
    { id: BASIS_SZENARIO_ID, name: "Basisplan" },
    ...plan.planSzenarien.eintraege.map((eintrag) => ({ id: eintrag.id, name: eintrag.name })),
  ];
  const gewaehlt = faelle.some((fall) => fall.id === szenarioId) ? szenarioId : BASIS_SZENARIO_ID;
  const rechtsform = planFuerSzenario(plan, gewaehlt).stammdaten.rechtsform;
  const sichtbar = PDF_KAPITEL.filter(
    (id) => id !== "tragfaehigkeit" || istPersonenunternehmen(rechtsform),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !laeuft) onSchliessen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [laeuft, onSchliessen]);

  function schalte(id: PdfKapitelId, an: boolean) {
    const gesetzt = new Set(plan.pdfExport.kapitel);
    if (an) gesetzt.add(id);
    else gesetzt.delete(id);
    onKapitel(normalisiereKapitel([...gesetzt]));
  }

  async function erstellen() {
    setLaeuft(true);
    setFehler(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const dokument = erstellePdfDokument(plan, new Date(), gewaehlt);
      const { erzeugePdf } = await import("./erzeugen.ts");
      const blob = await erzeugePdf(dokument);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = dokument.dateiname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onSchliessen();
    } catch (ursache) {
      setFehler(
        ursache instanceof Error ? ursache.message : "Das PDF konnte nicht erstellt werden.",
      );
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="dialog-hintergrund">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-titel">
        <h2 id="pdf-titel">PDF erstellen</h2>
        <p className="meta">
          Das gewählte Szenario bekommt die angehakten Kapitel. Die übrigen Szenarien stehen nur im
          Szenarienvergleich. Das PDF entsteht in diesem Browser, die Daten bleiben auf dem Gerät.
        </p>
        <fieldset className="pdf-szenario">
          <legend>Szenario</legend>
          {faelle.map((fall) => (
            <label key={fall.id}>
              <input
                type="radio"
                name="pdf-szenario"
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
                checked={plan.pdfExport.kapitel.includes(id)}
                disabled={laeuft}
                onChange={(event) => schalte(id, event.target.checked)}
              />
              {PDF_KAPITEL_LABEL[id]}
            </label>
          ))}
        </div>
        {istPersonenunternehmen(rechtsform) ? null : (
          <p className="hinweis">
            Die Tragfähigkeit mit Lebenshaltung gibt es nur bei Einzelunternehmen, Freiberuf und
            Personengesellschaften. Bei dieser Rechtsform entfällt das Kapitel.
          </p>
        )}
        {fehler ? (
          <p className="fehler" role="alert">
            {fehler}
          </p>
        ) : null}
        <div className="szenarien-aktionen">
          <button type="button" className="primaer" onClick={erstellen} disabled={laeuft}>
            {laeuft ? "PDF wird erstellt …" : "PDF herunterladen"}
          </button>
          <button type="button" onClick={onSchliessen} disabled={laeuft}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
