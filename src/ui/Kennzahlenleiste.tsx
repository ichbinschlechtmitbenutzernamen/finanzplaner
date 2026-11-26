import { useMemo, useState } from "react";
import type { PruefStufe } from "../domain/checks/typen.ts";
import type { Berichte } from "../domain/reports/typen.ts";
import { leisteKennzahlen, type LeistenZiel } from "./kennzahlen-leiste.ts";

interface KennzahlenleisteProps {
  berichte: Berichte | null;
  meldungen: readonly { stufe: PruefStufe }[];
  leer: boolean;
  onReiter: (ziel: LeistenZiel) => void;
}

/** Schmale Leiste über Assistent und Tabelle. Die Werte stammen aus den Berichten. */
export function Kennzahlenleiste({ berichte, meldungen, leer, onReiter }: KennzahlenleisteProps) {
  const [mehr, setMehr] = useState(false);
  const kennzahlen = useMemo(
    () => leisteKennzahlen(berichte, meldungen, leer),
    [berichte, meldungen, leer],
  );

  return (
    <div
      className={mehr ? "live-leiste erweitert" : "live-leiste"}
      role="group"
      aria-label="Kennzahlen"
    >
      {kennzahlen.map((kennzahl) => {
        const wert = kennzahl.teile.map((teil) => teil.text).join(", ");
        return (
          <button
            key={kennzahl.id}
            type="button"
            className={kennzahl.kern ? "live-kennzahl" : "live-kennzahl live-neben"}
            title={kennzahl.title}
            aria-label={`${kennzahl.name}: ${wert}`}
            aria-disabled={leer || undefined}
            onClick={() => {
              if (!leer) onReiter(kennzahl.ziel);
            }}
          >
            <span className="live-name">{kennzahl.name}</span>
            <span className="live-wert">
              {kennzahl.teile.map((teil, index) => (
                <span key={`${kennzahl.id}-${index}`}>
                  {index > 0 ? <span className="live-trenner"> · </span> : null}
                  <span className={teil.ton ? `live-${teil.ton}` : undefined}>{teil.text}</span>
                </span>
              ))}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        className="live-mehr"
        aria-expanded={mehr}
        onClick={() => setMehr((bisher) => !bisher)}
      >
        {mehr ? "weniger" : "mehr"}
      </button>
    </div>
  );
}
