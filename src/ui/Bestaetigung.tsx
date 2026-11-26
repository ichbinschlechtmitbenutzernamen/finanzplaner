import { useEffect, useId } from "react";

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onAbbrechen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAbbrechen]);

  return (
    <div
      className="dialog-hintergrund"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onAbbrechen();
      }}
    >
      <div
        className="dialog dialog-kurz"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        aria-describedby={textId}
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
          <button type="button" onClick={onAbbrechen} autoFocus>
            {abbrechen}
          </button>
        </div>
      </div>
    </div>
  );
}
