import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IsoMonth } from "../domain/types.ts";
import type { TabellenAnsicht } from "../domain/checks/index.ts";
import type { Pruefmeldung } from "../domain/checks/index.ts";
import { PRUEF_ICON, markeFuerZeile } from "./pruef-marke.tsx";
import {
  formatEingabeEuro,
  formatEuro,
  formatMenge,
  formatMonatKurz,
  formatMonatLang,
} from "./format.ts";
import type { DatenSpalte } from "./spalten.ts";
import type { TabellenZeile } from "./zeilen-modell.ts";

export interface Auswahl {
  zeile: number;
  spalte: number;
}

interface TabelleProps {
  zeilen: readonly TabellenZeile[];
  spalten: readonly DatenSpalte[];
  auswahl: Auswahl | null;
  onAuswahl: (auswahl: Auswahl) => void;
  onUmschalten: (planjahr: number) => void;
  onCommit: (zeile: number, monatIndex: number, text: string) => void;
  onPaste: (zeile: number, monatIndex: number, text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  bearbeiten: boolean;
  eingeklappt: ReadonlySet<number>;
  pruefungen?: readonly Pruefmeldung[];
  ansicht?: TabellenAnsicht;
}

interface Edit {
  zeile: number;
  spalte: number;
  text: string;
  /** Enter übernimmt den bisherigen Text und markiert ihn, damit Tippen ihn ersetzt. */
  ersetzen: boolean;
}

export function Tabelle({
  zeilen,
  spalten,
  auswahl,
  onAuswahl,
  onUmschalten,
  onCommit,
  onPaste,
  onUndo,
  onRedo,
  bearbeiten,
  eingeklappt,
  pruefungen = [],
  ansicht = "eingaben",
}: TabelleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const editRef = useRef<Edit | null>(null);
  editRef.current = edit;
  const virtualizer = useVirtualizer({
    count: zeilen.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 12,
    initialRect: { width: 1280, height: 720 },
  });

  const zeileIndex = zeilen.length === 0 ? 0 : Math.min(auswahl?.zeile ?? 0, zeilen.length - 1);
  const spalteIndex = spalten.length === 0 ? 0 : Math.min(auswahl?.spalte ?? 0, spalten.length - 1);
  const virtuell = virtualizer.getVirtualItems();
  const fenster =
    virtuell.length > 0
      ? virtuell
      : zeilen.map((_, index) => ({
          index,
          start: index * 36,
          end: (index + 1) * 36,
          key: index,
          size: 36,
        }));
  const paddingOben = fenster[0]?.start ?? 0;
  const paddingUnten = Math.max(0, virtualizer.getTotalSize() - (fenster.at(-1)?.end ?? 0));

  function waehle(zeile: number, spalte: number) {
    onAuswahl({ zeile, spalte });
    virtualizer.scrollToIndex(zeile, { align: "auto" });
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector<HTMLElement>("[data-aktiv='true']")?.focus();
    });
  }

  function bewege(deltaZeile: number, deltaSpalte: number, umbruch: boolean) {
    if (zeilen.length === 0 || spalten.length === 0) return;
    let zeile = (auswahl?.zeile ?? 0) + deltaZeile;
    let spalte = (auswahl?.spalte ?? 0) + deltaSpalte;
    if (umbruch) {
      if (spalte >= spalten.length) {
        spalte = 0;
        zeile += 1;
      } else if (spalte < 0) {
        spalte = spalten.length - 1;
        zeile -= 1;
      }
    }
    waehle(
      Math.max(0, Math.min(zeilen.length - 1, zeile)),
      Math.max(0, Math.min(spalten.length - 1, spalte)),
    );
  }

  function beginne(zeile: number, spalte: number, text: string | null) {
    if (!bearbeiten) return;
    const daten = spalten[spalte];
    const ziel = zeilen[zeile];
    if (!daten || daten.art !== "monat" || !ziel || ziel.bearbeitbar[daten.monatIndex] !== true)
      return;
    const vorhanden = ziel.werte[daten.monatIndex];
    const start =
      text ??
      (vorhanden == null
        ? ""
        : ziel.einheit === "menge"
          ? formatMenge(vorhanden)
          : formatEingabeEuro(vorhanden));
    setEdit({ zeile, spalte, text: start, ersetzen: text == null });
  }

  function commit(bewegung: "unten" | "rechts" | "links" | "bleiben") {
    const aktuell = editRef.current;
    if (!aktuell) return;
    editRef.current = null;
    setEdit(null);
    const daten = spalten[aktuell.spalte];
    if (daten?.art === "monat") onCommit(aktuell.zeile, daten.monatIndex, aktuell.text);
    if (bewegung === "unten") {
      waehle(Math.min(zeilen.length - 1, aktuell.zeile + 1), aktuell.spalte);
    } else if (bewegung === "rechts") {
      waehle(aktuell.zeile, Math.min(spalten.length - 1, aktuell.spalte + 1));
    } else if (bewegung === "links") {
      waehle(aktuell.zeile, Math.max(0, aktuell.spalte - 1));
    }
  }

  function onTaste(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) onRedo();
      else onUndo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      onRedo();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      bewege(0, 1, false);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      bewege(0, -1, false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      bewege(1, 0, false);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      bewege(-1, 0, false);
    } else if (event.key === "Tab") {
      event.preventDefault();
      bewege(0, event.shiftKey ? -1 : 1, true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const spalte = spalten[spalteIndex];
      if (spalte?.art === "jahr") onUmschalten(spalte.planjahr.nummer);
      else beginne(zeileIndex, spalteIndex, null);
    } else if (event.key === "F2") {
      event.preventDefault();
      beginne(zeileIndex, spalteIndex, null);
    } else if (
      bearbeiten &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key.length === 1
    ) {
      event.preventDefault();
      beginne(zeileIndex, spalteIndex, event.key);
    }
  }

  function onEinfuegen(event: ClipboardEvent) {
    if (!bearbeiten || event.target instanceof HTMLInputElement) return;
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const spalte = spalten[spalteIndex];
    if (spalte?.art !== "monat") return;
    event.preventDefault();
    onPaste(zeileIndex, spalte.monatIndex, text);
  }

  return (
    <div
      className="tabelle-scroll"
      ref={scrollRef}
      role="grid"
      aria-label="Finanzplan"
      aria-rowcount={zeilen.length + 1}
      aria-colcount={spalten.length + 1}
      tabIndex={0}
      onKeyDown={onTaste}
      onPaste={onEinfuegen}
    >
      <table className="tabelle" role="presentation">
        <thead>
          <tr role="row">
            <th className="spalte-name klebt" role="columnheader" scope="col">
              Position
            </th>
            {spalten.map((spalte) =>
              spalte.art === "monat" ? (
                <th
                  key={spalte.key}
                  role="columnheader"
                  scope="col"
                  title={formatMonatLang(spalte.monat)}
                >
                  {formatMonatKurz(spalte.monat)}
                </th>
              ) : (
                <th key={spalte.key} className="spalte-jahr" role="columnheader" scope="col">
                  <button
                    type="button"
                    className="jahr-schalter"
                    aria-expanded={!eingeklappt.has(spalte.planjahr.nummer)}
                    aria-label={
                      eingeklappt.has(spalte.planjahr.nummer)
                        ? `${spalte.planjahr.bezeichnung} aufklappen`
                        : `${spalte.planjahr.bezeichnung} zuklappen`
                    }
                    onClick={() => onUmschalten(spalte.planjahr.nummer)}
                  >
                    {eingeklappt.has(spalte.planjahr.nummer) ? "▸" : "▾"} Jahr{" "}
                    {spalte.planjahr.nummer}
                  </button>
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {paddingOben > 0 ? (
            <tr aria-hidden="true" className="platzhalter">
              <td colSpan={spalten.length + 1} style={{ height: paddingOben }} />
            </tr>
          ) : null}
          {fenster.map((eintrag) => {
            const zeile = zeilen[eintrag.index];
            if (!zeile) return null;
            const marke = markeFuerZeile(pruefungen, ansicht, zeile.id);
            return (
              <tr
                key={zeile.id}
                role="row"
                className={zeilenKlasse(zeile, marke?.stufe)}
                style={{ height: 36 }}
              >
                <th
                  className="spalte-name klebt"
                  scope="row"
                  role="rowheader"
                  title={marke ? `${zeile.bezeichnung}. ${marke.text}` : zeile.bezeichnung}
                >
                  <span style={{ paddingLeft: `${zeile.ebene * 0.9}rem` }}>
                    {marke ? (
                      <span
                        className={`pruef-icon pruef-${marke.stufe}`}
                        title={marke.begruendung}
                        aria-label={marke.text}
                      >
                        {PRUEF_ICON[marke.stufe]}
                      </span>
                    ) : null}
                    {zeile.bezeichnung}
                  </span>
                </th>
                {spalten.map((spalte, index) => {
                  const wert = zellenWert(zeile, spalte);
                  const monatIndex = spalte.art === "monat" ? spalte.monatIndex : -1;
                  const kann =
                    bearbeiten && spalte.art === "monat" && zeile.bearbeitbar[monatIndex] === true;
                  const aktiv = auswahl?.zeile === eintrag.index && auswahl.spalte === index;
                  const imEdit = edit?.zeile === eintrag.index && edit.spalte === index;
                  const label = zellenLabel(zeile, spalte, wert);
                  const monatMarke =
                    marke?.monat != null && spalte.art === "monat" && spalte.monat === marke.monat
                      ? marke.stufe
                      : null;
                  return (
                    <td
                      key={spalte.key}
                      role="gridcell"
                      data-aktiv={aktiv ? "true" : undefined}
                      aria-selected={aktiv}
                      aria-readonly={!kann}
                      aria-label={label}
                      tabIndex={aktiv ? -1 : undefined}
                      title={monatMarke ? marke?.text : undefined}
                      className={zellenKlasse(zeile, spalte, wert, aktiv, kann, monatMarke)}
                      onClick={(event) => {
                        event.currentTarget.focus();
                        onAuswahl({ zeile: eintrag.index, spalte: index });
                      }}
                      onDoubleClick={() => {
                        if (kann) beginne(eintrag.index, index, null);
                      }}
                    >
                      {imEdit ? (
                        <input
                          className="zellen-eingabe"
                          aria-label={label}
                          value={edit.text}
                          autoFocus
                          inputMode="decimal"
                          onFocus={(event) => {
                            if (edit.ersetzen) event.currentTarget.select();
                          }}
                          onChange={(event) =>
                            setEdit({ ...edit, text: event.target.value, ersetzen: false })
                          }
                          onBlur={() => commit("bleiben")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.stopPropagation();
                              commit("unten");
                            } else if (event.key === "Tab") {
                              event.preventDefault();
                              event.stopPropagation();
                              commit(event.shiftKey ? "links" : "rechts");
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              event.stopPropagation();
                              setEdit(null);
                            }
                          }}
                        />
                      ) : (
                        anzeige(zeile, wert)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingUnten > 0 ? (
            <tr aria-hidden="true" className="platzhalter">
              <td colSpan={spalten.length + 1} style={{ height: paddingUnten }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function zellenWert(zeile: TabellenZeile, spalte: DatenSpalte): number | null {
  if (zeile.kopf || zeile.einheit === "leer") return null;
  if (spalte.art === "monat") return zeile.werte[spalte.monatIndex] ?? null;
  return zeile.planjahre[spalte.planjahr.nummer - 1] ?? null;
}

function anzeige(zeile: TabellenZeile, wert: number | null): string {
  if (zeile.kopf || zeile.einheit === "leer") return "";
  if (wert == null) return "–";
  if (zeile.einheit === "menge") return formatMenge(wert);
  return formatEuro(wert);
}

function zellenLabel(zeile: TabellenZeile, spalte: DatenSpalte, wert: number | null): string {
  const wann = spalte.art === "monat" ? formatMonatLang(spalte.monat) : spalte.planjahr.bezeichnung;
  return `${zeile.bezeichnung}, ${wann}, ${anzeige(zeile, wert) || "leer"}`;
}

function zeilenKlasse(zeile: TabellenZeile, stufe?: Pruefmeldung["stufe"]): string {
  const teile = ["zeile"];
  if (zeile.kopf) teile.push("kopf");
  if (zeile.rolle === "summe" || zeile.rolle === "ergebnis") teile.push("fett");
  if (zeile.rolle === "nachricht") teile.push("nachricht");
  if (zeile.rolle === "ergebnis") teile.push("ergebnis");
  if (stufe) teile.push(`pruef-${stufe}`);
  return teile.join(" ");
}

function zellenKlasse(
  zeile: TabellenZeile,
  spalte: DatenSpalte,
  wert: number | null,
  aktiv: boolean,
  kann: boolean,
  monatStufe?: Pruefmeldung["stufe"] | null,
): string {
  const teile = ["zahl"];
  if (spalte.art === "jahr") teile.push("spalte-jahr");
  if (wert != null && wert < 0) teile.push("neg");
  if (aktiv) teile.push("aktiv");
  if (kann) teile.push("kann");
  if (zeile.rolle === "summe" || zeile.rolle === "ergebnis") teile.push("fett");
  if (monatStufe) teile.push(`pruef-monat-${monatStufe}`);
  return teile.join(" ");
}

export function monatDerAuswahl(
  spalten: readonly DatenSpalte[],
  auswahl: Auswahl | null,
): { monat: IsoMonth; monatIndex: number } | null {
  if (!auswahl) return null;
  const spalte = spalten[auswahl.spalte];
  if (!spalte || spalte.art !== "monat") return null;
  return { monat: spalte.monat, monatIndex: spalte.monatIndex };
}
