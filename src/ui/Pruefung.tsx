import { EuroFeld, ProzentFeld, ZahlFeld } from "./assistent/felder.tsx";
import {
  KATEGORIE_TEXT,
  PRUEF_KATEGORIEN,
  PRUEF_STUFEN,
  STUFE_TEXT,
  schwellenSindStandard,
  standardSchwellen,
  type Pruefmeldung,
  type PruefStufe,
} from "../domain/checks/index.ts";
import type { Finanzplan, PruefSchwellen } from "../domain/types.ts";
import type { PlanAendern } from "./assistent/typen.ts";

interface PruefungProps {
  plan: Finanzplan;
  meldungen: readonly Pruefmeldung[];
  fehler: string | null;
  onAendern: PlanAendern;
  onSpringen: (meldung: Pruefmeldung, wohin: "tabelle" | "assistent") => void;
}

export function Pruefung({ plan, meldungen, fehler, onAendern, onSpringen }: PruefungProps) {
  const schwellen = plan.pruefung.schwellen;
  const zaehler = {
    fehler: meldungen.filter((meldung) => meldung.stufe === "fehler").length,
    warnung: meldungen.filter((meldung) => meldung.stufe === "warnung").length,
    hinweis: meldungen.filter((meldung) => meldung.stufe === "hinweis").length,
  };

  function setze<Key extends keyof PruefSchwellen>(key: Key, wert: PruefSchwellen[Key]) {
    onAendern((aktuell) => ({
      ...aktuell,
      pruefung: { schwellen: { ...aktuell.pruefung.schwellen, [key]: wert } },
    }));
  }

  return (
    <section className="pruefung" aria-labelledby="pruefung-titel">
      <div>
        <h2 id="pruefung-titel">Prüfung</h2>
        <p className="hinweis">
          Die Meldungen lesen den Plan und die berechneten Berichte. Sie werden nicht gespeichert.
          Fehler sperren den Export nicht. PDF und Excel können sie später vermerken.
        </p>
        <p className="pruef-summe">
          {zaehler.fehler} Fehler
          {" · "}
          {zaehler.warnung} {zaehler.warnung === 1 ? "Warnung" : "Warnungen"}
          {" · "}
          {zaehler.hinweis} {zaehler.hinweis === 1 ? "Hinweis" : "Hinweise"}
        </p>
      </div>

      {fehler ? (
        <p className="fehler" role="alert">
          {fehler} Ohne Rechnung gibt es keine Meldungen.
        </p>
      ) : meldungen.length === 0 ? (
        <p className="hinweis">Keine Meldungen. Die geprüften Schwellen sind eingehalten.</p>
      ) : (
        PRUEF_STUFEN.map((stufe) => {
          const gruppe = meldungen.filter((meldung) => meldung.stufe === stufe);
          if (gruppe.length === 0) return null;
          return (
            <section key={stufe} className="pruef-gruppe" aria-labelledby={`pruef-${stufe}`}>
              <h3 id={`pruef-${stufe}`}>
                {STUFE_TEXT[stufe]}
                <span className={`pruef-zaehler pruef-${stufe}`}>{gruppe.length}</span>
              </h3>
              {PRUEF_KATEGORIEN.map((kategorie) => {
                const eintraege = gruppe.filter((meldung) => meldung.kategorie === kategorie);
                if (eintraege.length === 0) return null;
                return (
                  <div key={kategorie}>
                    <h4>{KATEGORIE_TEXT[kategorie]}</h4>
                    {eintraege.map((meldung) => (
                      <MeldungKarte key={meldung.id} meldung={meldung} onSpringen={onSpringen} />
                    ))}
                  </div>
                );
              })}
            </section>
          );
        })
      )}

      <details className="schwellen">
        <summary>
          Schwellenwerte
          {schwellenSindStandard(schwellen) ? "" : " (angepasst)"}
        </summary>
        <p className="feld-hilfe">
          Die Standardwerte stehen im Plan und gelten für diese Prüfung. Zurücksetzen stellt sie
          wieder her.
        </p>
        <div className="schwellen-raster">
          <EuroFeld
            label="Mindest-Kontostand"
            hilfe="Darunter ist der Kontokorrent nicht gedeckt. Standard 0 €: jeder negative Endbestand."
            cents={schwellen.kontostandMinCents}
            onChange={(cents) => setze("kontostandMinCents", cents)}
          />
          <EuroFeld
            label="Verfügbares Einkommen im Planjahr 2"
            hilfe="Darunter ist eine Person im zweiten Planjahr nicht tragfähig. Standard 0 €."
            cents={schwellen.verfuegbarPlanjahr2MinCents}
            onChange={(cents) => setze("verfuegbarPlanjahr2MinCents", cents)}
          />
          <EuroFeld
            label="Lebenshaltung mindestens"
            hilfe="Darunter ist die monatliche Lebenshaltung auffällig niedrig. Standard 900 €, unter einem schmalen Einzelhaushalt."
            cents={schwellen.lebenshaltungMinMonatCents}
            onChange={(cents) => setze("lebenshaltungMinMonatCents", cents)}
          />
          <EuroFeld
            label="Vorsorge mindestens"
            hilfe="Kranken-, Pflege-, Altersvorsorge und sonstige Versicherungen zusammen. Standard 300 € im Monat."
            cents={schwellen.vorsorgeMinMonatCents}
            onChange={(cents) => setze("vorsorgeMinMonatCents", cents)}
          />
          <ZahlFeld
            label="Monate der Anlaufphase"
            hilfe="So viele erste Monate von Planjahr 1 werden mit dem Rest verglichen. Standard 3."
            wert={schwellen.anlaufMonate}
            ganzzahlig
            onChange={(wert) => {
              if (wert == null || wert < 1 || wert > 12) return;
              setze("anlaufMonate", wert);
            }}
          />
          <ProzentFeld
            label="Voller Start ab"
            hilfe="Ab diesem Anteil am späteren Monatsumsatz ist keine Anlaufphase erkennbar. Standard 80 %."
            satz={schwellen.anlaufAnteil}
            onChange={(satz) => {
              if (satz == null) return;
              setze("anlaufAnteil", satz);
            }}
          />
          <ProzentFeld
            label="Wachstum höchstens"
            hilfe="Planjahr 2 gegenüber Planjahr 1. Darüber ist das Wachstum sehr hoch. Standard 80 %."
            satz={schwellen.wachstumMax}
            onChange={(satz) => {
              if (satz == null) return;
              setze("wachstumMax", satz);
            }}
          />
          <ProzentFeld
            label="Wareneinsatz hoch ab"
            hilfe="Darüber ist die Quote für die meisten Gründungen ungewöhnlich. Standard 60 %."
            satz={schwellen.wareneinsatzHoch}
            onChange={(satz) => {
              if (satz == null) return;
              setze("wareneinsatzHoch", satz);
            }}
          />
          <ProzentFeld
            label="Wareneinsatz-Grenze"
            hilfe="Darüber wird stärker gewarnt, bei 100 % liegt der Verkauf unter dem Einstand. Standard 100 %."
            satz={schwellen.wareneinsatzGrenze}
            onChange={(satz) => {
              if (satz == null) return;
              setze("wareneinsatzGrenze", satz);
            }}
          />
          <ProzentFeld
            label="Personalkostenquote höchstens"
            hilfe="Darüber bindet das Personal den Umsatz, bevor Miete, Ware und Unterhalt finanziert sind. Standard 60 %."
            satz={schwellen.personalquoteMax}
            onChange={(satz) => {
              if (satz == null) return;
              setze("personalquoteMax", satz);
            }}
          />
          <EuroFeld
            label="Kleinunternehmer, Vorjahr"
            hilfe="§ 19 UStG ab 2025: Nettoumsatz im vorangegangenen Kalenderjahr. Standard 25.000 €."
            cents={schwellen.kleinunternehmerVorjahrCents}
            onChange={(cents) => setze("kleinunternehmerVorjahrCents", cents)}
          />
          <EuroFeld
            label="Kleinunternehmer, laufendes Jahr"
            hilfe="§ 19 UStG ab 2025: Nettoumsatz im laufenden Kalenderjahr. Standard 100.000 €."
            cents={schwellen.kleinunternehmerLaufendCents}
            onChange={(cents) => setze("kleinunternehmerLaufendCents", cents)}
          />
          <ProzentFeld
            label="Eigenkapitalquote mindestens"
            hilfe="Darunter ist der Eigenanteil an der Finanzierung sehr niedrig. Standard 10 %."
            satz={schwellen.eigenkapitalquoteMin}
            onChange={(satz) => {
              if (satz == null) return;
              setze("eigenkapitalquoteMin", satz);
            }}
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onAendern((aktuell) => ({ ...aktuell, pruefung: { schwellen: standardSchwellen() } }))
          }
          disabled={schwellenSindStandard(schwellen)}
        >
          Auf Standard zurücksetzen
        </button>
      </details>
    </section>
  );
}

function MeldungKarte({
  meldung,
  onSpringen,
}: {
  meldung: Pruefmeldung;
  onSpringen: (meldung: Pruefmeldung, wohin: "tabelle" | "assistent") => void;
}) {
  return (
    <article className={`pruef-karte pruef-${meldung.stufe}`}>
      <h5>{meldung.text}</h5>
      <p>{meldung.begruendung}</p>
      <div className="pruef-aktionen">
        {meldung.ziel.tabelle ? (
          <button type="button" onClick={() => onSpringen(meldung, "tabelle")}>
            In der Tabelle
          </button>
        ) : null}
        {meldung.ziel.assistent ? (
          <button type="button" onClick={() => onSpringen(meldung, "assistent")}>
            Im Assistenten
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function zaehlerStufe(meldungen: readonly Pruefmeldung[]): PruefStufe | "keine" {
  if (meldungen.some((meldung) => meldung.stufe === "fehler")) return "fehler";
  if (meldungen.some((meldung) => meldung.stufe === "warnung")) return "warnung";
  if (meldungen.some((meldung) => meldung.stufe === "hinweis")) return "hinweis";
  return "keine";
}
