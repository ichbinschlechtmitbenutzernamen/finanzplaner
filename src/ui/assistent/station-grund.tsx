import { useState } from "react";
import {
  leseGruendungszuschuss,
  leseLebensbedarf,
  leseUmsatz,
  leseVorhaben,
  leseWareneinsatz,
  neutraleSaison,
} from "../../domain/assistent/lesen.ts";
import { parseDeutschZahl } from "../../domain/eingabe/zahlen.ts";
import { neueId, standardRollen } from "../../domain/assistent/stationen.ts";
import {
  setzePersoenlich,
  setzeUmsatz,
  setzeVorhaben,
  monateDesPlans,
  setzeWareneinsatz,
  wendeFortschreiben,
  wendeWachstum,
  type UmsatzEingabe,
  type VorhabenEingabe,
} from "../../domain/assistent/schreiben.ts";
import { istKapitalgesellschaft, planjahreVon } from "../../domain/reports/planjahr.ts";
import { BUNDESLAENDER, PLAN_ZWECKE, RECHTSFORMEN } from "../../domain/types.ts";
import type { Finanzplan, MonatFaktoren, Rechtsform, Wachstumsbezug } from "../../domain/types.ts";
import { PLAN_ZWECK_LABEL, RECHTSFORM_LABEL } from "../../domain/labels.ts";
import { KALENDER_KURZ } from "../format.ts";
import {
  AuswahlFeld,
  EuroFeld,
  Feld,
  MonatFeld,
  ProzentFeld,
  TextFeld,
  ZahlFeld,
} from "./felder.tsx";
import { PruefBlock } from "../pruef-marke.tsx";
import type { PlanAendern } from "./typen.ts";

export function VorhabenStation({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const eingabe = leseVorhaben(plan);
  function schreibe(teil: Partial<VorhabenEingabe>) {
    onAendern((aktuell) => setzeVorhaben(aktuell, { ...leseVorhaben(aktuell), ...teil }));
  }
  const kapital = eingabe.rechtsform === "gmbh" || eingabe.rechtsform === "ug";
  const einePerson =
    eingabe.rechtsform === "einzelunternehmen" || eingabe.rechtsform === "freiberufler";
  return (
    <section className="assistent-station" aria-labelledby="station-vorhaben">
      <h2 id="station-vorhaben">Vorhaben</h2>
      <p className="hinweis">
        Name, Start und Rechtsform legen fest, woraus der Plan rechnet. Dieselben Felder stehen
        später in der Tabelle.
      </p>
      <div className="feld-raster">
        <TextFeld
          label="Name des Vorhabens"
          hilfe="So heißt das Vorhaben in der Kopfzeile."
          value={eingabe.name}
          onChange={(name) => {
            const planName = eingabe.planName?.trim() ? eingabe.planName : name;
            schreibe({ name, planName });
          }}
        />
        <TextFeld
          label="Name des Plans"
          hilfe="Unterscheidet diese Fassung, wenn das Vorhaben mehrere Pläne bekommt."
          value={eingabe.planName ?? ""}
          onChange={(planName) => schreibe({ planName })}
        />
        <MonatFeld
          label="Gründungsmonat"
          hilfe="Erster der 36 Planmonate. Der Gründungsmonat und der Planstart sind derselbe Monat."
          value={eingabe.gruendungsmonat}
          onChange={(gruendungsmonat) => schreibe({ gruendungsmonat })}
        />
        <AuswahlFeld
          label="Rechtsform"
          hilfe="Bestimmt Steuern, Entnahmen und ob die Station Persönliches vorkommt."
          value={eingabe.rechtsform ?? ""}
          onChange={(wert) => {
            const rechtsform = wert as Rechtsform;
            const gesellschafter = eingabe.gesellschafter.map((person, index) => ({
              ...person,
              rollen: standardRollen(rechtsform, Math.max(eingabe.gesellschafter.length, 1), index),
            }));
            schreibe({
              rechtsform,
              gesellschafter,
              stammkapitalCents:
                rechtsform === "gmbh" || rechtsform === "ug"
                  ? eingabe.stammkapitalCents
                  : undefined,
            });
          }}
        >
          <option value="">Bitte wählen</option>
          {RECHTSFORMEN.map((form) => (
            <option key={form} value={form}>
              {RECHTSFORM_LABEL[form]}
            </option>
          ))}
        </AuswahlFeld>
        <AuswahlFeld
          label="Bundesland"
          hilfe="Daraus folgt der Kirchensteuersatz, falls eine Person kirchensteuerpflichtig ist."
          value={eingabe.bundesland ?? ""}
          onChange={(bundesland) =>
            schreibe({ bundesland: bundesland as VorhabenEingabe["bundesland"] })
          }
        >
          <option value="">Bitte wählen</option>
          {BUNDESLAENDER.map((land) => (
            <option key={land} value={land}>
              {land}
            </option>
          ))}
        </AuswahlFeld>
        <TextFeld
          label="Ort"
          hilfe="Sitz des Vorhabens. Für einen vollständigen Plan nötig."
          value={eingabe.ort ?? ""}
          onChange={(ort) => schreibe({ ort })}
        />
        {eingabe.rechtsform !== "freiberufler" ? (
          <ZahlFeld
            label="Gewerbesteuer-Hebesatz"
            hilfe="Hebesatz der Gemeinde als volle Prozentzahl, nicht als Dezimalzahl."
            wert={eingabe.hebesatz ?? null}
            ganzzahlig
            onChange={(hebesatz) => schreibe({ hebesatz: hebesatz ?? undefined })}
          />
        ) : null}
        {kapital ? (
          <EuroFeld
            label="Stammkapital"
            hilfe="Gesellschaftsrechtliche Angabe. Das Geld auf dem Konto steht bei der Finanzierung."
            cents={eingabe.stammkapitalCents ?? null}
            onChange={(stammkapitalCents) => schreibe({ stammkapitalCents })}
          />
        ) : null}
      </div>
      <PruefBlock feld="kleinunternehmer">
        <Feld
          label="Kleinunternehmerregelung"
          hilfe="Ohne Umsatzsteuer auf den Erlös und ohne Vorsteuerabzug."
        >
          <input
            type="checkbox"
            checked={eingabe.kleinunternehmer}
            onChange={(event) => schreibe({ kleinunternehmer: event.target.checked })}
          />
        </Feld>
      </PruefBlock>
      {eingabe.kleinunternehmer ? null : (
        <AuswahlFeld
          label="Umsatzsteuer-Voranmeldung"
          hilfe="Bestimmt, in welchem Monat die Zahllast ans Finanzamt geht."
          value={eingabe.voranmeldungszeitraum ?? "vierteljaehrlich"}
          onChange={(voranmeldungszeitraum) =>
            schreibe({
              voranmeldungszeitraum:
                voranmeldungszeitraum as VorhabenEingabe["voranmeldungszeitraum"],
            })
          }
        >
          <option value="monatlich">monatlich</option>
          <option value="vierteljaehrlich">vierteljährlich</option>
        </AuswahlFeld>
      )}
      <fieldset className="feld-gruppe">
        <legend>Zwecke</legend>
        <p className="feld-hilfe">Wofür der Plan gedacht ist. Mehrere Zwecke sind möglich.</p>
        {PLAN_ZWECKE.map((zweck) => (
          <label key={zweck} className="check">
            <input
              type="checkbox"
              checked={eingabe.zwecke?.includes(zweck) ?? false}
              onChange={(event) => {
                const bisher = new Set(eingabe.zwecke ?? []);
                if (event.target.checked) bisher.add(zweck);
                else bisher.delete(zweck);
                schreibe({ zwecke: PLAN_ZWECKE.filter((eintrag) => bisher.has(eintrag)) });
              }}
            />
            {PLAN_ZWECK_LABEL[zweck]}
          </label>
        ))}
      </fieldset>
      <Personen plan={plan} einePerson={einePerson} onAendern={onAendern} />
    </section>
  );
}

function Personen({
  plan,
  einePerson,
  onAendern,
}: {
  plan: Finanzplan;
  einePerson: boolean;
  onAendern: PlanAendern;
}) {
  const eingabe = leseVorhaben(plan);
  function schreibe(teil: Partial<VorhabenEingabe>) {
    onAendern((aktuell) => setzeVorhaben(aktuell, { ...leseVorhaben(aktuell), ...teil }));
  }
  return (
    <fieldset className="feld-gruppe">
      <legend>{einePerson ? "Inhaberin oder Inhaber" : "Gesellschafter"}</legend>
      <p className="feld-hilfe">
        Personen im Plan. Der Anteil ist der Gewinn- oder Kapitalanteil. Die Rolle folgt der
        Rechtsform und lässt sich bei Gesellschaften anpassen.
      </p>
      {eingabe.gesellschafter.map((person, index) => (
        <div key={person.id} className="karte">
          <TextFeld
            label="Name"
            hilfe="Name der Person, wie er im Plan stehen soll."
            value={person.name}
            onChange={(name) => {
              const gesellschafter = eingabe.gesellschafter.map((eintrag) =>
                eintrag.id === person.id ? { ...eintrag, name } : eintrag,
              );
              schreibe({ gesellschafter });
            }}
          />
          {einePerson ? null : (
            <ProzentFeld
              label="Anteil"
              hilfe="Anteil an Gewinn oder Stammkapital."
              satz={person.anteil}
              onChange={(anteil) => {
                if (anteil == null) return;
                const gesellschafter = eingabe.gesellschafter.map((eintrag) =>
                  eintrag.id === person.id ? { ...eintrag, anteil } : eintrag,
                );
                schreibe({ gesellschafter });
              }}
            />
          )}
          {eingabe.rechtsform === "gmbh" ||
          eingabe.rechtsform === "ug" ||
          eingabe.rechtsform === "kg" ? (
            <label className="check">
              <input
                type="checkbox"
                checked={person.rollen?.includes("geschaeftsfuehrer") ?? false}
                onChange={(event) => {
                  const rollen = new Set(person.rollen ?? []);
                  if (event.target.checked) rollen.add("geschaeftsfuehrer");
                  else rollen.delete("geschaeftsfuehrer");
                  if (eingabe.rechtsform === "gmbh" || eingabe.rechtsform === "ug") {
                    rollen.add("gesellschafter");
                  }
                  const gesellschafter = eingabe.gesellschafter.map((eintrag) =>
                    eintrag.id === person.id ? { ...eintrag, rollen: [...rollen] } : eintrag,
                  );
                  schreibe({ gesellschafter });
                }}
              />
              Geschäftsführung
            </label>
          ) : null}
          {einePerson || eingabe.gesellschafter.length < 2 ? null : (
            <button
              type="button"
              onClick={() =>
                schreibe({
                  gesellschafter: eingabe.gesellschafter.filter(
                    (eintrag) => eintrag.id !== person.id,
                  ),
                })
              }
            >
              Person entfernen
            </button>
          )}
          <span className="sr-only">Person {index + 1}</span>
        </div>
      ))}
      {einePerson && eingabe.gesellschafter.length > 0 ? null : (
        <button
          type="button"
          onClick={() => {
            const rechtsform = eingabe.rechtsform ?? "einzelunternehmen";
            const index = eingabe.gesellschafter.length;
            schreibe({
              gesellschafter: [
                ...eingabe.gesellschafter,
                {
                  id: neueId("person"),
                  name: "Person",
                  anteil: einePerson ? 1 : 0,
                  rollen: standardRollen(rechtsform, index + 1, index),
                },
              ],
            });
          }}
        >
          Person hinzufügen
        </button>
      )}
    </fieldset>
  );
}

export function PersoenlichStation({
  plan,
  onAendern,
}: {
  plan: Finanzplan;
  onAendern: PlanAendern;
}) {
  if (istKapitalgesellschaft(plan.stammdaten.rechtsform)) {
    return (
      <section className="assistent-station" aria-labelledby="station-persoenlich">
        <h2 id="station-persoenlich">Persönliches</h2>
        <p className="hinweis">
          Bei GmbH und UG entfällt diese Station. Lebenshaltung und Gründungszuschuss sind keine
          Entnahme. Das Gehalt der Geschäftsführung wird beim Personal erfasst.
        </p>
      </section>
    );
  }
  const personen = leseLebensbedarf(plan);
  const zuschuss = leseGruendungszuschuss(plan);
  function schreibePersonen(naechste: typeof personen) {
    onAendern((aktuell) => setzePersoenlich(aktuell, naechste, leseGruendungszuschuss(aktuell)));
  }
  return (
    <section className="assistent-station" aria-labelledby="station-persoenlich">
      <h2 id="station-persoenlich">Persönliches</h2>
      <p className="hinweis">
        Bei Personenunternehmen ist der Lebensbedarf eine Entnahme, keine Betriebsausgabe.
      </p>
      {plan.stammdaten.personen.map((person) => {
        const leben =
          personen.find((eintrag) => eintrag.personId === person.id) ?? leerLeben(person.id);
        function setze(teil: Partial<typeof leben>) {
          const andere = personen.filter((eintrag) => eintrag.personId !== person.id);
          schreibePersonen([...andere, { ...leben, ...teil }]);
        }
        return (
          <fieldset key={person.id} className="feld-gruppe">
            <legend>{person.name || "Person"}</legend>
            <div className="feld-raster">
              <PruefBlock feld={`leben-${person.id}-lebenshaltung`}>
                <EuroFeld
                  label="Lebenshaltung"
                  hilfe="Wohnen, Essen und der übrige Alltag, ohne die Versicherungsbeiträge daneben."
                  cents={leben.lebenshaltung.basisCents}
                  onChange={(basisCents) => setze({ lebenshaltung: { basisCents } })}
                />
              </PruefBlock>
              <PruefBlock feld={`leben-${person.id}-vorsorge`}>
                <EuroFeld
                  label="Krankenversicherung"
                  hilfe="Monatlicher Beitrag zur Krankenversicherung, privat gezahlt."
                  cents={leben.krankenversicherung.basisCents}
                  onChange={(basisCents) => setze({ krankenversicherung: { basisCents } })}
                />
                <EuroFeld
                  label="Pflegeversicherung"
                  hilfe="Monatlicher Beitrag zur Pflegeversicherung."
                  cents={leben.pflegeversicherung.basisCents}
                  onChange={(basisCents) => setze({ pflegeversicherung: { basisCents } })}
                />
                <EuroFeld
                  label="Altersvorsorge"
                  hilfe="Monatlicher Beitrag zur Altersvorsorge."
                  cents={leben.altersvorsorge.basisCents}
                  onChange={(basisCents) => setze({ altersvorsorge: { basisCents } })}
                />
                <EuroFeld
                  label="Sonstige Vorsorge"
                  hilfe="Weitere private Versicherungen, etwa Haftpflicht oder Berufsunfähigkeit."
                  cents={leben.sonstigeVersicherungen.basisCents}
                  onChange={(basisCents) => setze({ sonstigeVersicherungen: { basisCents } })}
                />
              </PruefBlock>
            </div>
            <Feld
              label="Kirchensteuer"
              hilfe="Ob die Person kirchensteuerpflichtig ist. Der Satz folgt dem Bundesland."
            >
              <input
                type="checkbox"
                checked={leben.kirchensteuer}
                onChange={(event) => setze({ kirchensteuer: event.target.checked })}
              />
            </Feld>
          </fieldset>
        );
      })}
      <fieldset className="feld-gruppe">
        <legend>Gründungszuschuss</legend>
        <p className="feld-hilfe">
          Steuerfreier Zuschuss. Er steht in der Liquidität, nicht in der Gewinnrechnung.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={zuschuss != null}
            onChange={(event) => {
              onAendern((aktuell) =>
                setzePersoenlich(
                  aktuell,
                  leseLebensbedarf(aktuell),
                  event.target.checked
                    ? {
                        id: neueId("zuschuss"),
                        alg1MonatlichCents: 0,
                        phase1Monate: 6,
                        pauschaleCents: 0,
                        phase2Geplant: false,
                        phase2Monate: 0,
                        startMonat: aktuell.startMonat ?? aktuell.stammdaten.gruendungsmonat ?? "",
                      }
                    : null,
                ),
              );
            }}
          />
          Gründungszuschuss geplant
        </label>
        {zuschuss ? (
          <div className="feld-raster">
            <EuroFeld
              label="Arbeitslosengeld I je Monat"
              hilfe="Betrag, der in Phase 1 zusätzlich zur Pauschale gezahlt wird."
              cents={zuschuss.alg1MonatlichCents}
              onChange={(alg1MonatlichCents) =>
                onAendern((aktuell) =>
                  setzePersoenlich(aktuell, leseLebensbedarf(aktuell), {
                    ...zuschuss,
                    alg1MonatlichCents,
                  }),
                )
              }
            />
            <ZahlFeld
              label="Monate Phase 1"
              hilfe="Dauer der ersten Phase, in der Arbeitslosengeld und Pauschale zusammenlaufen."
              wert={zuschuss.phase1Monate}
              ganzzahlig
              onChange={(phase1Monate) => {
                if (phase1Monate == null || phase1Monate < 1) return;
                onAendern((aktuell) =>
                  setzePersoenlich(aktuell, leseLebensbedarf(aktuell), {
                    ...zuschuss,
                    phase1Monate,
                  }),
                );
              }}
            />
            <EuroFeld
              label="Monatliche Pauschale"
              hilfe="Pauschale, die in beiden Phasen gezahlt werden kann."
              cents={zuschuss.pauschaleCents}
              onChange={(pauschaleCents) =>
                onAendern((aktuell) =>
                  setzePersoenlich(aktuell, leseLebensbedarf(aktuell), {
                    ...zuschuss,
                    pauschaleCents,
                  }),
                )
              }
            />
            <MonatFeld
              label="Erster Monat"
              hilfe="Start des Zuschusses. Alle Monate müssen im Planhorizont liegen."
              value={zuschuss.startMonat}
              onChange={(startMonat) =>
                onAendern((aktuell) =>
                  setzePersoenlich(aktuell, leseLebensbedarf(aktuell), { ...zuschuss, startMonat }),
                )
              }
            />
            <Feld label="Phase 2" hilfe="Anschlussphase nur mit Pauschale, ohne Arbeitslosengeld.">
              <input
                type="checkbox"
                checked={zuschuss.phase2Geplant}
                onChange={(event) =>
                  onAendern((aktuell) =>
                    setzePersoenlich(aktuell, leseLebensbedarf(aktuell), {
                      ...zuschuss,
                      phase2Geplant: event.target.checked,
                      phase2Monate: event.target.checked ? Math.max(zuschuss.phase2Monate, 1) : 0,
                    }),
                  )
                }
              />
            </Feld>
            {zuschuss.phase2Geplant ? (
              <ZahlFeld
                label="Monate Phase 2"
                hilfe="Dauer der zweiten Phase."
                wert={zuschuss.phase2Monate}
                ganzzahlig
                onChange={(phase2Monate) => {
                  if (phase2Monate == null) return;
                  onAendern((aktuell) =>
                    setzePersoenlich(aktuell, leseLebensbedarf(aktuell), {
                      ...zuschuss,
                      phase2Monate,
                    }),
                  );
                }}
              />
            ) : null}
          </div>
        ) : null}
      </fieldset>
    </section>
  );
}

function leerLeben(personId: string) {
  const nullWert = { basisCents: 0 };
  return {
    personId,
    lebenshaltung: nullWert,
    krankenversicherung: nullWert,
    pflegeversicherung: nullWert,
    altersvorsorge: nullWert,
    sonstigeVersicherungen: nullWert,
    kirchensteuer: false,
  };
}

export function UmsatzStation({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const linien = leseUmsatz(plan);
  function schreibe(naechste: UmsatzEingabe[]) {
    onAendern((aktuell) => setzeUmsatz(aktuell, naechste));
  }
  const jahre = planjahreVon(monateDesPlans(plan));
  return (
    <section className="assistent-station" aria-labelledby="station-umsatz">
      <h2 id="station-umsatz">Umsatz</h2>
      <PruefBlock feld="umsatz" />
      <p className="hinweis">
        Jede Leistung ist entweder ein Monatsstart mit Wachstum und Saison oder ein Jahreswert je
        Planjahr. Beides schreibt dieselbe Monatsregel wie die Tabelle.
      </p>
      {linien.map((linie) => (
        <UmsatzKarte
          key={linie.id}
          plan={plan}
          linie={linie}
          jahre={jahre}
          onChange={(neu) =>
            schreibe(linien.map((eintrag) => (eintrag.id === linie.id ? neu : eintrag)))
          }
          onEntfernen={() => schreibe(linien.filter((eintrag) => eintrag.id !== linie.id))}
          onAendern={onAendern}
        />
      ))}
      <button
        type="button"
        onClick={() =>
          schreibe([
            ...linien,
            {
              modus: "monat",
              id: neueId("rev"),
              bezeichnung: "Neue Leistung",
              basisCents: 0,
              umsatzsteuerSatz: plan.parameter.steuer.umsatzsteuerRegelsatz,
              zahlungszielTage: 0,
            },
          ])
        }
      >
        Leistung hinzufügen
      </button>
    </section>
  );
}

function UmsatzKarte({
  plan,
  linie,
  jahre,
  onChange,
  onEntfernen,
  onAendern,
}: {
  plan: Finanzplan;
  linie: UmsatzEingabe;
  jahre: { nummer: number; bezeichnung: string }[];
  onChange: (linie: UmsatzEingabe) => void;
  onEntfernen: () => void;
  onAendern: PlanAendern;
}) {
  const [rateText, setRateText] = useState("");
  const [bezug, setBezug] = useState<Wachstumsbezug>("jahr");
  return (
    <fieldset className="feld-gruppe">
      <legend>{linie.bezeichnung || "Leistung"}</legend>
      <div className="feld-raster">
        <TextFeld
          label="Bezeichnung"
          hilfe="Name der Leistung, so wie er in den Berichten steht."
          value={linie.bezeichnung}
          onChange={(bezeichnung) => onChange({ ...linie, bezeichnung })}
        />
        <AuswahlFeld
          label="Eingabe"
          hilfe="Monatsstart rechnet mit Wachstum und Saison. Jahreswerte werden auf die Monate verteilt."
          value={linie.modus}
          onChange={(modus) => {
            if (modus === "jahre") {
              onChange({
                id: linie.id,
                bezeichnung: linie.bezeichnung,
                beschreibung: linie.beschreibung,
                umsatzsteuerSatz: linie.umsatzsteuerSatz,
                zahlungszielTage: linie.zahlungszielTage,
                modus: "jahre",
                jahresCents: jahre.map(() => 0),
              });
              return;
            }
            onChange({
              id: linie.id,
              bezeichnung: linie.bezeichnung,
              beschreibung: linie.beschreibung,
              umsatzsteuerSatz: linie.umsatzsteuerSatz,
              zahlungszielTage: linie.zahlungszielTage,
              modus: "monat",
              basisCents: linie.modus === "monat" ? linie.basisCents : 0,
              wachstum: linie.modus === "monat" ? linie.wachstum : undefined,
              saison: linie.modus === "monat" ? linie.saison : undefined,
            });
          }}
        >
          <option value="monat">Monatsstart</option>
          <option value="jahre">Jahreswerte</option>
        </AuswahlFeld>
        <ProzentFeld
          label="Umsatzsteuer"
          hilfe="Satz auf diese Leistung. Der Plan speichert Nettobeträge."
          satz={linie.umsatzsteuerSatz}
          onChange={(umsatzsteuerSatz) => {
            if (umsatzsteuerSatz == null) return;
            onChange({ ...linie, umsatzsteuerSatz });
          }}
        />
        <ZahlFeld
          label="Zahlungsziel in Tagen"
          hilfe="Tage, bis der Erlös auf dem Konto ist. Die Rechnung rundet auf ganze Monate."
          wert={linie.zahlungszielTage}
          ganzzahlig
          onChange={(zahlungszielTage) => {
            if (zahlungszielTage == null) return;
            onChange({ ...linie, zahlungszielTage });
          }}
        />
      </div>
      {linie.modus === "monat" ? (
        <>
          <div className="feld-raster">
            <EuroFeld
              label="Monatsstart"
              hilfe="Nettobetrag im Gründungsmonat, vor Wachstum und Saison."
              cents={linie.basisCents}
              onChange={(basisCents) => onChange({ ...linie, basisCents })}
            />
            <ProzentFeld
              label="Wachstumsrate je Jahr"
              hilfe="Jahresrate auf den Monatsstart. Leer lässt den Betrag unverändert."
              satz={linie.wachstum?.jahresrate ?? null}
              leerErlaubt
              onChange={(jahresrate) => {
                if (jahresrate == null) {
                  onChange({ ...linie, wachstum: undefined });
                  return;
                }
                onChange({
                  ...linie,
                  wachstum: {
                    jahresrate,
                    modus: linie.wachstum?.modus ?? "compound_monthly",
                  },
                });
              }}
            />
            <AuswahlFeld
              label="Wachstum"
              hilfe="Monatlich aufgezinst verteilt die Jahresrate auf die Monate. Der Jahressprung ändert den Betrag alle zwölf Monate."
              value={linie.wachstum?.modus ?? "compound_monthly"}
              onChange={(modus) => {
                if (!linie.wachstum) return;
                onChange({
                  ...linie,
                  wachstum: {
                    ...linie.wachstum,
                    modus: modus as "compound_monthly" | "yearly_step",
                  },
                });
              }}
            >
              <option value="compound_monthly">monatlich aufgezinst</option>
              <option value="yearly_step">einmal im Jahr</option>
            </AuswahlFeld>
          </div>
          <SaisonFaktoren
            faktoren={linie.saison ?? neutraleSaison()}
            onChange={(saison) => onChange({ ...linie, saison })}
          />
          <div className="hilfe-zeile">
            <button
              type="button"
              onClick={() => onAendern((aktuell) => wendeFortschreiben(aktuell, linie.id))}
            >
              Nach rechts fortschreiben
            </button>
            <label>
              Rate %
              <input
                value={rateText}
                inputMode="decimal"
                aria-label="Tabellenrate in Prozent"
                onChange={(event) => setRateText(event.target.value)}
              />
            </label>
            <label>
              je
              <select
                aria-label="Zeitraum der Tabellenrate"
                value={bezug}
                onChange={(event) => setBezug(event.target.value as Wachstumsbezug)}
              >
                <option value="monat">Monat</option>
                <option value="jahr">Jahr</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                const zahl = parseDeutschZahl(rateText);
                if (zahl == null) return;
                onAendern((aktuell) => wendeWachstum(aktuell, linie.id, zahl / 100, bezug));
              }}
            >
              Rate wie in der Tabelle
            </button>
          </div>
          <p className="feld-hilfe">
            Fortschreiben und die Rate nutzen dieselben Eingabehilfen wie die Tabelle. Die
            Wachstumsrate oben schreibt die Jahresrate direkt in die Monatsregel.
          </p>
        </>
      ) : (
        <div className="feld-raster">
          {jahre.map((jahr, index) => (
            <EuroFeld
              key={jahr.nummer}
              label={jahr.bezeichnung}
              hilfe="Netto-Jahresumsatz. Er wird gleichmäßig auf die zwölf Monate gelegt, der letzte Monat nimmt den Cent-Rest."
              cents={linie.jahresCents[index] ?? 0}
              onChange={(betrag) => {
                const jahresCents = jahre.map((_, position) => linie.jahresCents[position] ?? 0);
                jahresCents[index] = betrag;
                onChange({ ...linie, jahresCents });
              }}
            />
          ))}
        </div>
      )}
      {plan.startMonat || linie.modus === "monat" ? null : (
        <p className="hinweis">Zuerst den Gründungsmonat im Vorhaben setzen.</p>
      )}
      <button type="button" onClick={onEntfernen}>
        Leistung entfernen
      </button>
    </fieldset>
  );
}

function SaisonFaktoren({
  faktoren,
  onChange,
}: {
  faktoren: MonatFaktoren;
  onChange: (faktoren: MonatFaktoren) => void;
}) {
  return (
    <fieldset className="feld-gruppe">
      <legend>Saisonfaktoren</legend>
      <p className="feld-hilfe">
        Zwölf Faktoren für Januar bis Dezember. 1 lässt den Monat unverändert, 0 setzt ihn auf null.
      </p>
      <div className="saison-raster">
        {KALENDER_KURZ.map((monat, index) => (
          <ZahlFeld
            key={monat}
            label={monat}
            hilfe={`Faktor für ${monat}.`}
            wert={faktoren[index] ?? 1}
            onChange={(wert) => {
              if (wert == null) return;
              const naechste = [...faktoren] as MonatFaktoren;
              naechste[index] = wert;
              onChange(naechste);
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function WareneinsatzStation({
  plan,
  onAendern,
}: {
  plan: Finanzplan;
  onAendern: PlanAendern;
}) {
  const linien = leseWareneinsatz(plan);
  const namen = new Map(plan.umsatzplanung.map((linie) => [linie.id, linie.bezeichnung]));
  return (
    <section className="assistent-station" aria-labelledby="station-ware">
      <h2 id="station-ware">Wareneinsatz</h2>
      <PruefBlock feld="wareneinsatz" />
      <p className="hinweis">Der Wareneinsatz ist ein Prozentsatz vom Nettoumsatz der Leistung.</p>
      {linien.length === 0 ? (
        <p className="hinweis">Zuerst unter Umsatz eine Leistung anlegen.</p>
      ) : null}
      {linien.map((linie) => (
        <PruefBlock key={linie.id} feld={`ware-${linie.id}`}>
          <fieldset className="feld-gruppe">
            <legend>{namen.get(linie.id) || "Leistung"}</legend>
            <div className="feld-raster">
              <ProzentFeld
                label="Anteil vom Umsatz"
                hilfe="Leer bedeutet kein Wareneinsatz. Ein Anteil über 100 Prozent bleibt zulässig."
                satz={linie.quote}
                leerErlaubt
                onChange={(quote) =>
                  onAendern((aktuell) =>
                    setzeWareneinsatz(
                      aktuell,
                      leseWareneinsatz(aktuell).map((eintrag) =>
                        eintrag.id === linie.id ? { ...eintrag, quote } : eintrag,
                      ),
                    ),
                  )
                }
              />
              <ProzentFeld
                label="Vorsteuer auf den Wareneinsatz"
                hilfe="Satz der Vorsteuer auf den Einkauf dieser Leistung."
                satz={linie.umsatzsteuerSatz}
                onChange={(umsatzsteuerSatz) => {
                  if (umsatzsteuerSatz == null) return;
                  onAendern((aktuell) =>
                    setzeWareneinsatz(
                      aktuell,
                      leseWareneinsatz(aktuell).map((eintrag) =>
                        eintrag.id === linie.id ? { ...eintrag, umsatzsteuerSatz } : eintrag,
                      ),
                    ),
                  );
                }}
              />
            </div>
          </fieldset>
        </PruefBlock>
      ))}
    </section>
  );
}
