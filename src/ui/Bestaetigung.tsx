import { useId } from "react";
import { Dialog } from "./dialog.tsx";

export function Bestaetigung({
  titel,
  text,
  bestaetigen,
  abbrechen = "Abbrechen",
  gefahr = false,
  onBestaetigen,
  onAbbrechen,
}: {
  titel: string;
  text: string;
  bestaetigen: string;
  abbrechen?: string;
  gefahr?: boolean;
  onBestaetigen: () => void;
  onAbbrechen: () => void;
}) {
  const titelId = useId();
  const textId = useId();

  return (
    <Dialog
      titelId={titelId}
      beschreibungId={textId}
      klasse="dialog-kurz"
      onSchliessen={onAbbrechen}
      hintergrundSchliesst
    >
      <h2 id={titelId}>{titel}</h2>
      <p id={textId}>{text}</p>
      <div className="szenarien-aktionen">
        <button
          type="button"
          className={gefahr ? "gefaehrlich" : "primaer"}
          onClick={onBestaetigen}
        >
          {bestaetigen}
        </button>
        <button type="button" onClick={onAbbrechen} data-anfangs-fokus="true">
          {abbrechen}
        </button>
      </div>
    </Dialog>
  );
}
