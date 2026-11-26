import { useId, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { parseDeutschZahl } from "../domain/eingabe/zahlen.ts";
import {
  aktivesSzenario,
  benenneSzenario,
  dupliziereSzenario,
  legeAbweichungAn,
  legeKopieAn,
  loescheSzenario,
  neueSzenarioId,
  setzeAktivesSzenario,
  setzeHebel,
  vergleichFuerExport,
  type ExportSzenarioVergleich,
} from "../domain/szenarien/index.ts";
import {
  BASIS_SZENARIO_ID,
  type AbweichungsSzenario,
  type Finanzplan,
  type SzenarioHebel,
} from "../domain/types.ts";
import type { PlanAendern } from "./assistent/typen.ts";
import { Bestaetigung } from "./Bestaetigung.tsx";
import { Dialog } from "./dialog.tsx";
import { DIAGRAMM_PALETTE, farben } from "./design-tokens.ts";
import { formatEuro, formatEuroAchse, formatMonatKurz, formatMonatLang } from "./format.ts";

interface DialogState {
  id: string;
  neu: boolean;
  name: string;
  umsatz: string;
  start: string;
  ware: string;
  personal: string;
  kosten: string;
  fehler: string | null;
}

/** Kurzbeschreibung einer Variante, aus den Stellschrauben gegenüber dem Basisplan. */
export function kurzbeschreibung(hebel: SzenarioHebel): string {
  const teile: string[] = [];
  if (hebel.umsatzFaktor !== 1)
    teile.push(`Umsatz ${mitVorzeichen((hebel.umsatzFaktor - 1) * 100, "%")}`);
  if (hebel.umsatzstartMonate > 0) {
    const monate = hebel.umsatzstartMonate;
    teile.push(`Start ${monate} ${monate === 1 ? "Monat" : "Monate"} später`);
  }
  if (hebel.wareneinsatzPunkte !== 0) {
    teile.push(`Wareneinsatz ${mitVorzeichen(hebel.wareneinsatzPunkte * 100, "Prozentpunkte")}`);
  }
  if (hebel.personalFaktor !== 1) {
    teile.push(`Personal ${mitVorzeichen((hebel.personalFaktor - 1) * 100, "%")}`);
  }
  if (hebel.kostenFaktor !== 1) {
    teile.push(`Laufende Kosten ${mitVorzeichen((hebel.kostenFaktor - 1) * 100, "%")}`);
  }
  return teile.length > 0 ? teile.join(", ") : "Wie der Basisplan, ohne Änderung";
}

export function SzenarioUmschalter({
  plan,
  onAendern,
}: {
  plan: Finanzplan;
  onAendern: PlanAendern;
}) {
  const labelId = useId();
  const aktiv = plan.planSzenarien.aktivId;
  return (
    <div className="variante-umschalter">
      <span className="variante-label" id={labelId}>
        Angezeigte Variante
      </span>
      <div className="switcher" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          aria-pressed={aktiv === BASIS_SZENARIO_ID}
          onClick={() => onAendern((aktuell) => setzeAktivesSzenario(aktuell, BASIS_SZENARIO_ID))}
        >
          Basisplan
        </button>
        {plan.planSzenarien.eintraege.map((eintrag) => (
          <button
            key={eintrag.id}
            type="button"
            aria-pressed={aktiv === eintrag.id}
            onClick={() => onAendern((aktuell) => setzeAktivesSzenario(aktuell, eintrag.id))}
          >
            {eintrag.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SzenarioHinweis({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const szenario = aktivesSzenario(plan);
  if (!szenario) return null;
  const text =
    szenario.art === "abweichung"
      ? `Sie sehen die Variante „${szenario.name}“. Die anderen Reiter zeigen diese Variante, die Eingaben sind nur zum Ansehen.`
      : `Sie sehen die Variante „${szenario.name}“. Tabelle und Assistent bearbeiten diese Kopie, der Basisplan bleibt unverändert.`;
  return (
    <p className="flag szenario-hinweis" role="status">
      <span>{text}</span>
      <button
        type="button"
        onClick={() => onAendern((aktuell) => setzeAktivesSzenario(aktuell, BASIS_SZENARIO_ID))}
      >
        Zurück zum Basisplan
      </button>
    </p>
  );
}

export function Szenarien({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const spalten = useMemo(() => vergleichFuerExport(plan), [plan]);
  const basisAktiv = plan.planSzenarien.aktivId === BASIS_SZENARIO_ID;
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [benennenId, setBenennenId] = useState<string | null>(null);
  const [nameEntwurf, setNameEntwurf] = useState("");
  const [loeschen, setLoeschen] = useState<{ id: string; name: string } | null>(null);

  function abweichungAnlegen() {
    const id = neueSzenarioId();
    onAendern((aktuell) => legeAbweichungAn(aktuell, id, "Neue Variante"));
    setDialog(dialogAusHebel(id, "Neue Variante", neutralAnzeige(), true));
  }

  function kopieAnlegen() {
    const id = neueSzenarioId();
    onAendern((aktuell) =>
      setzeAktivesSzenario(legeKopieAn(aktuell, id, "Kopie des Basisplans"), id),
    );
  }

  function speichereNamen(id: string) {
    const name = nameEntwurf.trim();
    if (name.length > 0 && name.length <= 120) {
      onAendern((aktuell) => benenneSzenario(aktuell, id, name));
    }
    setBenennenId(null);
  }

  function speichereDialog() {
    if (!dialog) return;
    const name = dialog.name.trim();
    const umsatz = parseDeutschZahl(dialog.umsatz);
    const start = parseDeutschZahl(dialog.start);
    const ware = parseDeutschZahl(dialog.ware);
    const personal = parseDeutschZahl(dialog.personal);
    const kosten = parseDeutschZahl(dialog.kosten);
    const fehler = pruefeDialog(name, umsatz, start, ware, personal, kosten);
    if (fehler) {
      setDialog({ ...dialog, fehler });
      return;
    }
    if (umsatz == null || start == null || ware == null || personal == null || kosten == null)
      return;
    const hebel: SzenarioHebel = {
      umsatzFaktor: umsatz / 100,
      umsatzstartMonate: start,
      wareneinsatzPunkte: ware / 100,
      personalFaktor: personal / 100,
      kostenFaktor: kosten / 100,
    };
    onAendern((aktuell) => setzeHebel(benenneSzenario(aktuell, dialog.id, name), dialog.id, hebel));
    setDialog(null);
  }

  return (
    <div className="szenarien">
      <p className="hinweis">
        Varianten beantworten die Frage „Was wäre, wenn …?“, zum Beispiel wenn eine Bank nach einem
        vorsichtigen Fall mit weniger Umsatz fragt. Hier legen Sie Varianten an, stellen die
        Stellschrauben ein und vergleichen die Ergebnisse. Welche Variante alle Reiter, die
        Kennzahlenleiste und der Export zeigen, stellen Sie oben unter „Angezeigte Variante“ ein.
      </p>
      <p className="hinweis">
        „Neue Variante“ ändert nur Stellschrauben und folgt späteren Änderungen am Basisplan. „Kopie
        des Basisplans“ ist ein eigener Stand, den Sie in Tabelle und Assistent bearbeiten.
      </p>

      <div className="szenarien-aktionen">
        <button type="button" onClick={abweichungAnlegen}>
          Neue Variante
        </button>
        <button type="button" onClick={kopieAnlegen}>
          Kopie des Basisplans anlegen
        </button>
      </div>

      <ul className="szenarien-liste">
        <li className={basisAktiv ? "aktiv" : undefined}>
          <div>
            <strong>Basisplan</strong>
            <p className="szenario-art">
              Ausgangsplan
              {basisAktiv ? <span className="wird-angezeigt"> · wird angezeigt</span> : null}
            </p>
            <p className="hinweis">
              Der Plan, den Sie eingeben. Andere Varianten rechnen von hier aus.
            </p>
          </div>
          <div className="szenarien-aktionen">
            <AnzeigenKnopf
              aktiv={basisAktiv}
              onAnzeigen={() =>
                onAendern((aktuell) => setzeAktivesSzenario(aktuell, BASIS_SZENARIO_ID))
              }
            />
          </div>
        </li>
        {plan.planSzenarien.eintraege.map((eintrag) => {
          const aktiv = plan.planSzenarien.aktivId === eintrag.id;
          return (
            <li key={eintrag.id} className={aktiv ? "aktiv" : undefined}>
              <div>
                {benennenId === eintrag.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      speichereNamen(eintrag.id);
                    }}
                  >
                    <label>
                      Name
                      <input
                        value={nameEntwurf}
                        onChange={(event) => setNameEntwurf(event.target.value)}
                        autoFocus
                      />
                    </label>
                    <button type="submit">Speichern</button>
                  </form>
                ) : (
                  <strong>{eintrag.name}</strong>
                )}
                <p className="szenario-art">
                  {eintrag.art === "abweichung" ? "Was wäre, wenn …?" : "Eigener Stand"}
                  {aktiv ? <span className="wird-angezeigt"> · wird angezeigt</span> : null}
                </p>
                {eintrag.art === "abweichung" ? (
                  <p className="hinweis">{kurzbeschreibung(eintrag.hebel)}</p>
                ) : (
                  <p className="hinweis">
                    Eigenständiger Stand zum Zeitpunkt des Anlegens, unabhängig vom Basisplan.
                  </p>
                )}
              </div>
              <div className="szenarien-aktionen">
                <AnzeigenKnopf
                  aktiv={aktiv}
                  onAnzeigen={() =>
                    onAendern((aktuell) => setzeAktivesSzenario(aktuell, eintrag.id))
                  }
                />
                {eintrag.art === "abweichung" ? (
                  <button type="button" onClick={() => setDialog(dialogAusSzenario(eintrag))}>
                    Stellschrauben
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setBenennenId(eintrag.id);
                    setNameEntwurf(eintrag.name);
                  }}
                >
                  Umbenennen
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAendern((aktuell) =>
                      dupliziereSzenario(aktuell, eintrag.id, neueSzenarioId()),
                    )
                  }
                >
                  Duplizieren
                </button>
                <button
                  type="button"
                  onClick={() => setLoeschen({ id: eintrag.id, name: eintrag.name })}
                >
                  Löschen
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Vergleich plan={plan} spalten={spalten} />
      <KontostandVergleich spalten={spalten} />

      {loeschen ? (
        <Bestaetigung
          titel="Variante löschen"
          text={`Die Variante „${loeschen.name}“ wird gelöscht.`}
          bestaetigen="Variante löschen"
          gefahr
          onBestaetigen={() => {
            const ziel = loeschen;
            setLoeschen(null);
            onAendern((aktuell) => loescheSzenario(aktuell, ziel.id));
          }}
          onAbbrechen={() => setLoeschen(null)}
        />
      ) : null}

      {dialog ? (
        <Dialog titelId="hebel-titel" onSchliessen={() => setDialog(null)}>
          <h2 id="hebel-titel">{dialog.neu ? "Neue Variante" : "Stellschrauben"}</h2>
          <p className="hinweis">
            Jede Stellschraube ist eine Annahme gegenüber dem Basisplan. 100 Prozent und 0 lassen
            die Zahlen stehen. Die Variante zieht mit, wenn Sie den Basisplan später ändern.
          </p>
          <div className="dialog-felder">
            <label>
              Name
              <input
                value={dialog.name}
                data-anfangs-fokus="true"
                onChange={(event) => setDialog({ ...dialog, name: event.target.value })}
              />
            </label>
            <label>
              Umsatz gegenüber dem Basisplan, in Prozent
              <input
                inputMode="decimal"
                value={dialog.umsatz}
                onChange={(event) => setDialog({ ...dialog, umsatz: event.target.value })}
              />
              <span className="feld-beispiel">
                80 bedeutet: der Umsatz liegt 20 % niedriger als im Basisplan.
              </span>
            </label>
            <label>
              Umsatz beginnt Monate später
              <input
                inputMode="numeric"
                value={dialog.start}
                onChange={(event) => setDialog({ ...dialog, start: event.target.value })}
              />
              <span className="feld-beispiel">
                3 bedeutet: der Umsatz beginnt drei Monate später, die ersten Monate bleiben ohne
                Einnahmen.
              </span>
            </label>
            <label>
              Wareneinsatz, Änderung in Prozentpunkten
              <input
                inputMode="decimal"
                value={dialog.ware}
                onChange={(event) => setDialog({ ...dialog, ware: event.target.value })}
              />
              <span className="feld-beispiel">
                5 bedeutet: der Wareneinsatz liegt 5 Prozentpunkte höher (z. B. 30 % statt 25 %).
              </span>
            </label>
            <label>
              Personalkosten gegenüber dem Basisplan, in Prozent
              <input
                inputMode="decimal"
                value={dialog.personal}
                onChange={(event) => setDialog({ ...dialog, personal: event.target.value })}
              />
              <span className="feld-beispiel">
                110 bedeutet: die Personalkosten liegen 10 % höher als im Basisplan.
              </span>
            </label>
            <label>
              Laufende Kosten gegenüber dem Basisplan, in Prozent
              <input
                inputMode="decimal"
                value={dialog.kosten}
                onChange={(event) => setDialog({ ...dialog, kosten: event.target.value })}
              />
              <span className="feld-beispiel">
                90 bedeutet: Miete, Versicherung und ähnliche laufende Kosten liegen 10 % niedriger.
              </span>
            </label>
          </div>
          {dialog.fehler ? (
            <p className="fehler" role="alert">
              {dialog.fehler}
            </p>
          ) : null}
          <div className="szenarien-aktionen">
            <button type="button" className="primaer" onClick={speichereDialog}>
              Stellschrauben übernehmen
            </button>
            <button type="button" onClick={() => setDialog(null)}>
              Abbrechen
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function Vergleich({ plan, spalten }: { plan: Finanzplan; spalten: ExportSzenarioVergleich[] }) {
  const jahre = Math.max(...spalten.map((spalte) => spalte.umsatzPlanjahreCents.length), 0);
  const zeilen: { label: string; werte: string[]; zahlen: (number | null)[] }[] = [];
  for (let index = 0; index < jahre; index += 1) {
    zeilen.push(
      zahlenZeile(
        `Umsatz Planjahr ${index + 1}`,
        spalten,
        (spalte) => spalte.umsatzPlanjahreCents[index],
      ),
    );
    zeilen.push(
      zahlenZeile(
        `Ergebnis nach Steuern Planjahr ${index + 1}`,
        spalten,
        (spalte) => spalte.ergebnisNachSteuernPlanjahreCents[index],
      ),
    );
  }
  zeilen.push({
    label: "Tiefster Kontostand",
    werte: spalten.map(tiefText),
    zahlen: spalten.map((spalte) => spalte.tiefsterKontostandCents),
  });
  zeilen.push(zahlenZeile("Kapitalbedarf", spalten, (spalte) => spalte.kapitalbedarfCents));
  zeilen.push({
    label: "Break-even-Monat",
    werte: spalten.map(breakEvenText),
    zahlen: spalten.map(() => null),
  });
  zeilen.push({
    label: "Tragfähigkeit, verfügbares Einkommen Planjahr 2",
    werte: spalten.map(tragText),
    zahlen: spalten.map((spalte) => spalte.tragfaehigkeitPlanjahr2Cents),
  });
  zeilen.push(zahlenZeile("Fehler", spalten, (spalte) => spalte.fehler, false));
  zeilen.push(zahlenZeile("Warnungen", spalten, (spalte) => spalte.warnungen, false));
  zeilen.push(zahlenZeile("Hinweise", spalten, (spalte) => spalte.hinweise, false));

  return (
    <div className="vergleich-scroll">
      <table className="vergleich">
        <caption>
          Vergleich der Varianten mit dem Basisplan. Kapitalbedarf ist die Summe des
          Kapitalbedarfsplans. Tragfähigkeit gilt für Einzelunternehmen und Personengesellschaften.
        </caption>
        <thead>
          <tr>
            <th scope="col">Kennzahl</th>
            {spalten.map((spalte) => (
              <th
                key={spalte.id}
                scope="col"
                className={
                  plan.planSzenarien.aktivId === spalte.id ||
                  (spalte.art === "basis" && plan.planSzenarien.aktivId === BASIS_SZENARIO_ID)
                    ? "aktiv"
                    : undefined
                }
              >
                {spalte.name}
                <span>
                  {spalte.art === "basis"
                    ? "Ausgangsplan"
                    : spalte.art === "abweichung"
                      ? "Variante"
                      : "Kopie"}
                  {plan.planSzenarien.aktivId === spalte.id ||
                  (spalte.art === "basis" && plan.planSzenarien.aktivId === BASIS_SZENARIO_ID)
                    ? " · wird angezeigt"
                    : ""}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((zeile) => (
            <tr key={zeile.label}>
              <th scope="row">{zeile.label}</th>
              {zeile.werte.map((wert, index) => (
                <td
                  key={spalten[index]?.id ?? index}
                  className={wertKlasse(zeile.zahlen[index] ?? null)}
                >
                  {wert}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KontostandVergleich({ spalten }: { spalten: ExportSzenarioVergleich[] }) {
  const monate = spalten.find((spalte) => spalte.monate.length > 0)?.monate ?? [];
  if (monate.length === 0)
    return <p className="fehler">Der Kontostand lässt sich nicht zeichnen.</p>;
  const daten = monate.map((monat, index) => {
    const zeile: Record<string, string | number> = { name: formatMonatKurz(monat) };
    for (const spalte of spalten) zeile[spalte.id] = spalte.kontostandCents[index] ?? 0;
    return zeile;
  });
  return (
    <section className="diagramm-karte" aria-label="Kontostand aller Varianten">
      <h3>Kontostand</h3>
      <p className="diagramm-notiz">Endbestand je Planmonat, alle Varianten übereinander.</p>
      <div className="diagramm-flaeche">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={daten} margin={{ top: 28, right: 28, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={farben.linie} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: farben.textGedaempft, fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={20}
              axisLine={{ stroke: farben.linie }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: farben.textGedaempft, fontSize: 12 }}
              width={78}
              tickFormatter={(wert) => formatEuroAchse(Number(wert))}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke={farben.nullinie} strokeDasharray="4 4" />
            {spalten.map((spalte, index) => (
              <Line
                key={spalte.id}
                dataKey={spalte.id}
                name={spalte.name}
                stroke={DIAGRAMM_PALETTE[index % DIAGRAMM_PALETTE.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Tooltip content={EuroTooltip} />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function EuroTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  return (
    <div className="diagramm-tooltip">
      <p>{label}</p>
      <ul>
        {payload.map((eintrag, index) => {
          const cents = typeof eintrag.value === "number" ? eintrag.value : null;
          if (cents == null) return null;
          return (
            <li key={`${String(eintrag.dataKey)}-${index}`} style={{ color: eintrag.color }}>
              <span>{eintrag.name}</span>
              <strong>{formatEuro(cents)}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function zahlenZeile(
  label: string,
  spalten: readonly ExportSzenarioVergleich[],
  wert: (spalte: ExportSzenarioVergleich) => number | null | undefined,
  alsEuro = true,
): { label: string; werte: string[]; zahlen: (number | null)[] } {
  const zahlen = spalten.map((spalte) => {
    if (spalte.fehlerText) return null;
    const zahl = wert(spalte);
    return zahl == null ? null : zahl;
  });
  return {
    label,
    zahlen,
    werte: zahlen.map((zahl) => (zahl == null ? "—" : alsEuro ? formatEuro(zahl) : String(zahl))),
  };
}

function tiefText(spalte: ExportSzenarioVergleich): string {
  if (spalte.tiefsterKontostandCents == null) return "—";
  const betrag = formatEuro(spalte.tiefsterKontostandCents);
  return spalte.tiefsterKontostandMonat
    ? `${betrag}, ${formatMonatLang(spalte.tiefsterKontostandMonat)}`
    : betrag;
}

function breakEvenText(spalte: ExportSzenarioVergleich): string {
  if (spalte.fehlerText) return "—";
  if (!spalte.breakEvenMonat || spalte.breakEvenPlanmonat == null) return "nicht erreicht";
  return `${formatMonatLang(spalte.breakEvenMonat)}, Planmonat ${spalte.breakEvenPlanmonat}`;
}

function tragText(spalte: ExportSzenarioVergleich): string {
  if (spalte.fehlerText) return "—";
  if (!spalte.tragfaehigkeitAnwendbar) return "nicht anwendbar";
  if (spalte.tragfaehigkeitPlanjahr2Cents == null) return "kein Planjahr 2";
  return formatEuro(spalte.tragfaehigkeitPlanjahr2Cents);
}

function wertKlasse(wert: number | null): string | undefined {
  if (wert != null && wert < 0) return "zahl-negativ";
  return undefined;
}

function AnzeigenKnopf({ aktiv, onAnzeigen }: { aktiv: boolean; onAnzeigen: () => void }) {
  if (aktiv) return null;
  return (
    <button type="button" onClick={onAnzeigen}>
      Diese Variante anzeigen
    </button>
  );
}

function mitVorzeichen(delta: number, einheit: string): string {
  const gerundet = Math.round(delta * 100) / 100;
  const betrag = zahl(Math.abs(gerundet));
  const zeichen = gerundet > 0 ? "+" : gerundet < 0 ? "−" : "";
  return `${zeichen}${betrag} ${einheit}`;
}

function zahl(wert: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(wert);
}

function neutralAnzeige(): SzenarioHebel {
  return {
    umsatzFaktor: 1,
    umsatzstartMonate: 0,
    wareneinsatzPunkte: 0,
    personalFaktor: 1,
    kostenFaktor: 1,
  };
}

function dialogAusHebel(id: string, name: string, hebel: SzenarioHebel, neu: boolean): DialogState {
  return {
    id,
    neu,
    name,
    umsatz: zahl(hebel.umsatzFaktor * 100),
    start: String(hebel.umsatzstartMonate),
    ware: zahl(hebel.wareneinsatzPunkte * 100),
    personal: zahl(hebel.personalFaktor * 100),
    kosten: zahl(hebel.kostenFaktor * 100),
    fehler: null,
  };
}

function dialogAusSzenario(eintrag: AbweichungsSzenario): DialogState {
  return dialogAusHebel(eintrag.id, eintrag.name, eintrag.hebel, false);
}

function pruefeDialog(
  name: string,
  umsatz: number | null,
  start: number | null,
  ware: number | null,
  personal: number | null,
  kosten: number | null,
): string | null {
  if (name.length === 0) return "Bitte einen Namen angeben.";
  if (name.length > 120) return "Der Name darf höchstens 120 Zeichen haben.";
  if (umsatz == null || umsatz < 0 || umsatz > 500) {
    return "Bitte den Umsatz als Prozent zwischen 0 und 500 angeben. 100 entspricht dem Basisplan.";
  }
  if (start == null || !Number.isInteger(start) || start < 0 || start > 36) {
    return "Bitte den späteren Umsatzstart als ganze Monate von 0 bis 36 angeben.";
  }
  if (ware == null || ware < -500 || ware > 500) {
    return "Bitte die Änderung des Wareneinsatzes in Prozentpunkten zwischen −500 und 500 angeben. 0 lässt den Anteil stehen.";
  }
  if (personal == null || personal < 0 || personal > 500) {
    return "Bitte die Personalkosten als Prozent zwischen 0 und 500 angeben. 100 entspricht dem Basisplan.";
  }
  if (kosten == null || kosten < 0 || kosten > 500) {
    return "Bitte die laufenden Kosten als Prozent zwischen 0 und 500 angeben. 100 entspricht dem Basisplan.";
  }
  return null;
}
