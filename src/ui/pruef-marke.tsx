import { createContext, useContext, type ReactNode } from "react";
import {
  hoechsteStufe,
  type Pruefmeldung,
  type PruefStufe,
  type TabellenAnsicht,
} from "../domain/checks/index.ts";

const PruefKontext = createContext<readonly Pruefmeldung[]>([]);

export function PruefAnbieter({
  meldungen,
  children,
}: {
  meldungen: readonly Pruefmeldung[];
  children: ReactNode;
}) {
  return <PruefKontext.Provider value={meldungen}>{children}</PruefKontext.Provider>;
}

export function usePruefKontext(): readonly Pruefmeldung[] {
  return useContext(PruefKontext);
}

export const PRUEF_ICON: Record<PruefStufe, string> = {
  fehler: "!",
  warnung: "!",
  hinweis: "i",
};

export interface SichtbareMarke {
  stufe: PruefStufe;
  text: string;
  begruendung: string;
  monat?: string;
}

export function markeFuerFeld(
  meldungen: readonly Pruefmeldung[],
  feld: string | undefined,
): SichtbareMarke | null {
  if (!feld) return null;
  const treffer = meldungen.filter((meldung) => meldung.ziel.assistent?.feld === feld);
  return fasse(treffer);
}

export function markeFuerZeile(
  meldungen: readonly Pruefmeldung[],
  ansicht: TabellenAnsicht,
  zeileId: string,
): SichtbareMarke | null {
  const treffer = meldungen.filter(
    (meldung) =>
      meldung.ziel.tabelle?.ansicht === ansicht && meldung.ziel.tabelle.zeileId === zeileId,
  );
  const marke = fasse(treffer);
  if (!marke) return null;
  const monat = treffer.find((meldung) => meldung.ziel.tabelle?.monat)?.ziel.tabelle?.monat;
  return { ...marke, monat };
}

export function usePruefMarke(feld: string | undefined): SichtbareMarke | null {
  return markeFuerFeld(usePruefKontext(), feld);
}

/** Hebt ein Assistentenfeld hervor. Ohne Meldung bleibt der Inhalt unverändert. */
export function PruefBlock({ feld, children }: { feld: string; children?: ReactNode }) {
  const marke = usePruefMarke(feld);
  if (!marke) return children ?? null;
  return (
    <div className={`pruef-feld pruef-${marke.stufe}`} data-pruef={feld} title={marke.begruendung}>
      <p className="pruef-zeile">
        <span className={`pruef-icon pruef-${marke.stufe}`} aria-hidden="true">
          {PRUEF_ICON[marke.stufe]}
        </span>
        <span>{marke.text}</span>
      </p>
      <span className="pruef-tooltip" role="tooltip">
        {marke.begruendung}
      </span>
      {children}
    </div>
  );
}

function fasse(treffer: readonly Pruefmeldung[]): SichtbareMarke | null {
  const stufe = hoechsteStufe(treffer);
  const erste = treffer[0];
  if (!stufe || !erste) return null;
  return {
    stufe,
    text: treffer.map((meldung) => meldung.text).join(" "),
    begruendung: treffer.map((meldung) => meldung.begruendung).join(" "),
  };
}
