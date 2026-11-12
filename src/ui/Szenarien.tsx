import { useMemo, useState } from "react";
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
import { formatEuro, formatEuroAchse, formatMonatKurz, formatMonatLang } from "./format.ts";

const FARBEN = [
  "#1f4d45",
  "#b8612e",
  "#245f8a",
  "#6e8b74",
  "#7a3e0b",
  "#5c6b7a",
  "#9f1d1d",
  "#c4a035",
];

interface DialogState {
  id: string;
  name: string;
  umsatz: string;
  start: string;
  ware: string;
  personal: string;
  kosten: string;
  fehler: string | null;
}

export function SzenarioUmschalter({
  plan,
  onAendern,
}: {
  plan: Finanzplan;
  onAendern: PlanAendern;
}) {
  const aktiv = plan.planSzenarien.aktivId;
  return (
    <div className="switcher" role="group" aria-label="Szenario wählen">
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
  );
}

export function SzenarioHinweis({ plan }: { plan: Finanzplan }) {
  const szenario = aktivesSzenario(plan);
  if (!szenario) return null;
  if (szenario.art === "abweichung") {
    return (
      <p className="flag szenario-hinweis" role="status">
        Abweichungs-Szenario „{szenario.name}“. Die Eingaben sind nur lesend und ziehen mit dem
        Basisplan mit. Zahlen ändern Sie im Basisplan, die Hebel auf der Seite Szenarien.
      </p>
    );
  }
  return (
    <p className="flag szenario-hinweis" role="status">
      Kopie-Szenario „{szenario.name}“. Tabelle und Assistent bearbeiten diese Kopie. Der Basisplan
      bleibt unverändert, bis Sie ihn wieder auswählen.
    </p>
  );
}

export function Szenarien({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const spalten = useMemo(() => vergleichFuerExport(plan), [plan]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [benennenId, setBenennenId] = useState<string | null>(null);
  const [nameEntwurf, setNameEntwurf] = useState("");

  function abweichungAnlegen() {
    const id = neueSzenarioId();
    onAendern((aktuell) => legeAbweichungAn(aktuell, id, "Neues Szenario"));
    setDialog(dialogAusHebel(id, "Neues Szenario", neutralAnzeige()));
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
        Ein Abweichungs-Szenario speichert nur Hebel und zieht mit, wenn sich der Basisplan ändert.
        Eine Kopie ist der Plan zum Zeitpunkt des Anlegens und lässt sich frei bearbeiten. Der
        Wareneinsatzhebel zählt Prozentpunkte auf die Quote des Basisplans: 0 lässt die Quote
        stehen, −5 senkt 30 % auf 25 %. Zeilen ohne Wareneinsatz bleiben ohne.
      </p>

      <div className="szenarien-aktionen">
        <button type="button" onClick={abweichungAnlegen}>
          Abweichung anlegen
        </button>
        <button type="button" onClick={kopieAnlegen}>
          Kopie des Basisplans anlegen
        </button>
      </div>

      <ul className="szenarien-liste">
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
                  {eintrag.art === "abweichung" ? "Abweichung" : "Kopie"}
                  {aktiv ? " · aktiv" : ""}
                </p>
                {eintrag.art === "abweichung" ? (
                  <p className="hinweis">{hebelText(eintrag.hebel)}</p>
                ) : (
                  <p className="hinweis">Eigenständiger Stand, unabhängig vom Basisplan.</p>
                )}
              </div>
              <div className="szenarien-aktionen">
                <button
                  type="button"
                  onClick={() => onAendern((aktuell) => setzeAktivesSzenario(aktuell, eintrag.id))}
                >
                  Anzeigen
                </button>
                {eintrag.art === "abweichung" ? (
                  <button type="button" onClick={() => setDialog(dialogAusSzenario(eintrag))}>
                    Hebel
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
                  onClick={() => onAendern((aktuell) => loescheSzenario(aktuell, eintrag.id))}
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

      {dialog ? (
        <div className="dialog-hintergrund">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hebel-titel">
            <h2 id="hebel-titel">Hebel</h2>
            <p className="hinweis">
              100 % entspricht dem Basisplan. Der Umsatzstart schiebt alle Umsatzzeilen nach hinten.
              Die ersten Monate bleiben ohne Umsatz, was über Monat 36 hinausfällt, entfällt. Der
              Wareneinsatz folgt dem Umsatz, die Kosten bleiben liegen. Die Wareneinsatzquote ändert
              sich in Prozentpunkten, nicht als neuer fester Satz.
            </p>
            <div className="dialog-felder">
              <label>
                Name
                <input
                  value={dialog.name}
                  onChange={(event) => setDialog({ ...dialog, name: event.target.value })}
                />
              </label>
              <label>
                Umsatz in % des Basisplans
                <input
                  inputMode="decimal"
                  value={dialog.umsatz}
                  onChange={(event) => setDialog({ ...dialog, umsatz: event.target.value })}
                />
              </label>
              <label>
                Umsatzstart, Monate später
                <input
                  inputMode="numeric"
                  value={dialog.start}
                  onChange={(event) => setDialog({ ...dialog, start: event.target.value })}
                />
              </label>
              <label>
                Wareneinsatz, Prozentpunkte
                <input
                  inputMode="decimal"
                  value={dialog.ware}
                  onChange={(event) => setDialog({ ...dialog, ware: event.target.value })}
                />
              </label>
              <label>
                Personalkosten in % des Basisplans
                <input
                  inputMode="decimal"
                  value={dialog.personal}
                  onChange={(event) => setDialog({ ...dialog, personal: event.target.value })}
                />
              </label>
              <label>
                Laufende Kosten in % des Basisplans
                <input
                  inputMode="decimal"
                  value={dialog.kosten}
                  onChange={(event) => setDialog({ ...dialog, kosten: event.target.value })}
                />
              </label>
            </div>
            {dialog.fehler ? (
              <p className="fehler" role="alert">
                {dialog.fehler}
              </p>
            ) : null}
            <div className="szenarien-aktionen">
              <button type="button" className="primaer" onClick={speichereDialog}>
                Hebel übernehmen
              </button>
              <button type="button" onClick={() => setDialog(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
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
          Vergleich mit dem Basisplan. Kapitalbedarf ist die Summe des Kapitalbedarfsplans.
          Tragfähigkeit gilt für Einzelunternehmen und Personengesellschaften.
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
                    ? "Basis"
                    : spalte.art === "abweichung"
                      ? "Abweichung"
                      : "Kopie"}
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
    <section className="diagramm-karte" aria-label="Kontostand aller Szenarien">
      <h3>Kontostand</h3>
      <p className="diagramm-notiz">Endbestand je Planmonat, alle Szenarien übereinander.</p>
      <div className="diagramm-flaeche">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={daten} margin={{ top: 28, right: 28, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e4ddd2" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#5e6872", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={20}
              axisLine={{ stroke: "#e4ddd2" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#5e6872", fontSize: 12 }}
              width={78}
              tickFormatter={(wert) => formatEuroAchse(Number(wert))}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke="#8a8175" strokeDasharray="4 4" />
            {spalten.map((spalte, index) => (
              <Line
                key={spalte.id}
                dataKey={spalte.id}
                name={spalte.name}
                stroke={FARBEN[index % FARBEN.length]}
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

function hebelText(hebel: SzenarioHebel): string {
  const teile: string[] = [];
  if (hebel.umsatzFaktor !== 1) teile.push(`Umsatz ${prozent(hebel.umsatzFaktor)} des Basisplans`);
  if (hebel.umsatzstartMonate > 0) {
    teile.push(
      `Umsatzstart ${hebel.umsatzstartMonate} ${hebel.umsatzstartMonate === 1 ? "Monat" : "Monate"} später`,
    );
  }
  if (hebel.wareneinsatzPunkte !== 0)
    teile.push(`Wareneinsatz ${punkte(hebel.wareneinsatzPunkte)}`);
  if (hebel.personalFaktor !== 1) teile.push(`Personal ${prozent(hebel.personalFaktor)}`);
  if (hebel.kostenFaktor !== 1) teile.push(`Laufende Kosten ${prozent(hebel.kostenFaktor)}`);
  return teile.length > 0 ? teile.join(", ") : "Keine Abweichung vom Basisplan";
}

function prozent(faktor: number): string {
  return `${zahl(faktor * 100)} %`;
}

function punkte(wert: number): string {
  return `${zahl(wert * 100)} Prozentpunkte`;
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

function dialogAusHebel(id: string, name: string, hebel: SzenarioHebel): DialogState {
  return {
    id,
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
  return dialogAusHebel(eintrag.id, eintrag.name, eintrag.hebel);
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
  if (umsatz == null || umsatz < 0 || umsatz > 500)
    return "Umsatz als Prozent zwischen 0 und 500 angeben.";
  if (start == null || !Number.isInteger(start) || start < 0 || start > 36) {
    return "Umsatzstart als ganze Monate von 0 bis 36 angeben.";
  }
  if (ware == null || ware < -500 || ware > 500) {
    return "Wareneinsatz als Prozentpunkte zwischen −500 und 500 angeben.";
  }
  if (personal == null || personal < 0 || personal > 500) {
    return "Personalkosten als Prozent zwischen 0 und 500 angeben.";
  }
  if (kosten == null || kosten < 0 || kosten > 500) {
    return "Laufende Kosten als Prozent zwischen 0 und 500 angeben.";
  }
  return null;
}
