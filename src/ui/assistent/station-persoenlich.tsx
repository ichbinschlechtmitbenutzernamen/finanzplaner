import { leseGruendungszuschuss, leseLebensbedarf } from "../../domain/assistent/lesen.ts";
import { neueId } from "../../domain/assistent/stationen.ts";
import { setzePersoenlich, type LebensbedarfEingabe } from "../../domain/assistent/schreiben.ts";
import { standardLebensbedarf } from "../../domain/privat.ts";
import { istKapitalgesellschaft } from "../../domain/reports/planjahr.ts";
import type { Berichte } from "../../domain/reports/typen.ts";
import type { Finanzplan, Privatblock, SozialversicherungEingabe } from "../../domain/types.ts";
import { PruefBlock } from "../pruef-marke.tsx";
import { AuswahlFeld, EuroFeld, Feld, MonatFeld, TextFeld, ZahlFeld } from "./felder.tsx";
import type { PlanAendern } from "./typen.ts";

export function PersoenlichStation({
  plan,
  berichte,
  onAendern,
}: {
  plan: Finanzplan;
  berichte: Berichte | null;
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
  function schreibePersonen(naechste: LebensbedarfEingabe[]) {
    onAendern((aktuell) => setzePersoenlich(aktuell, naechste, leseGruendungszuschuss(aktuell)));
  }
  return (
    <section className="assistent-station" aria-labelledby="station-persoenlich">
      <h2 id="station-persoenlich">Persönliches</h2>
      <p className="hinweis">
        Bei Einzelunternehmen, Freiberuf und Personengesellschaften sind die privaten Blöcke eine
        Entnahme, keine Betriebsausgabe. Die Beträge sind Monatsbeträge. Ein Faktor hebt oder senkt
        den ganzen Block im Planjahr 2 und im Planjahr 3. Planjahre zählen ab dem Gründungsmonat.
        Abgaben und Steuern werden gerechnet und lassen sich nicht überschreiben.
      </p>
      {plan.stammdaten.personen.map((person) => {
        const leben =
          personen.find((eintrag) => eintrag.personId === person.id) ?? leerLeben(person.id);
        const bericht = berichte?.tragfaehigkeit.personen.find(
          (eintrag) => eintrag.personId === person.id,
        );
        function setze(naechste: LebensbedarfEingabe) {
          const andere = personen.filter((eintrag) => eintrag.personId !== person.id);
          schreibePersonen([...andere, naechste]);
        }
        return (
          <div key={person.id}>
            <h3>{person.name || "Person"}</h3>
            {leben.bloecke.map((block) => (
              <PruefBlock
                key={block.id}
                feld={
                  block.schluessel === "lebenshaltung"
                    ? `leben-${person.id}-lebenshaltung`
                    : block.schluessel === "versicherungen"
                      ? `leben-${person.id}-vorsorge`
                      : `leben-${person.id}-${block.id}`
                }
              >
                <fieldset className="feld-gruppe privat-block">
                  <legend>{block.bezeichnung}</legend>
                  {block.posten.map((posten) => (
                    <div key={posten.id} className="privat-posten">
                      <TextFeld
                        label="Bezeichnung"
                        hilfe="Name des Postens. Eigene Posten dürfen frei benannt werden."
                        value={posten.bezeichnung}
                        onChange={(bezeichnung) =>
                          setze(benennePosten(leben, block.id, posten.id, bezeichnung))
                        }
                      />
                      <EuroFeld
                        label="Monatsbetrag"
                        hilfe="Monatsbetrag. Der Faktor des Blocks gilt darauf in Planjahr 2 und 3."
                        cents={posten.betrag.basisCents}
                        onChange={(basisCents) =>
                          setze(aenderePosten(leben, block.id, posten.id, basisCents))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setze(entfernePosten(leben, block.id, posten.id))}
                      >
                        Posten entfernen
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setze(neuerPosten(leben, block.id))}>
                    Posten hinzufügen
                  </button>
                  <div className="feld-raster">
                    <ZahlFeld
                      label="Faktor Planjahr 2"
                      hilfe="1,00 lässt die Monatsbeträge im zweiten Planjahr unverändert."
                      wert={block.faktorJahr2}
                      onChange={(faktorJahr2) => {
                        if (faktorJahr2 == null || faktorJahr2 < 0) return;
                        setze(aendereFaktor(leben, block.id, { faktorJahr2 }));
                      }}
                    />
                    <ZahlFeld
                      label="Faktor Planjahr 3"
                      hilfe="1,00 lässt die Monatsbeträge im dritten Planjahr unverändert."
                      wert={block.faktorJahr3}
                      onChange={(faktorJahr3) => {
                        if (faktorJahr3 == null || faktorJahr3 < 0) return;
                        setze(aendereFaktor(leben, block.id, { faktorJahr3 }));
                      }}
                    />
                  </div>
                  {block.schluessel === "eigen" ? (
                    <div className="feld-raster">
                      <TextFeld
                        label="Name des Blocks"
                        hilfe="Eigener Block, zum Beispiel eine besondere Ausgabe."
                        value={block.bezeichnung}
                        onChange={(bezeichnung) =>
                          setze(benenneBlock(leben, block.id, bezeichnung))
                        }
                      />
                      <button type="button" onClick={() => setze(entferneBlock(leben, block.id))}>
                        Block entfernen
                      </button>
                    </div>
                  ) : null}
                </fieldset>
              </PruefBlock>
            ))}
            <button type="button" onClick={() => setze(neuerBlock(leben))}>
              Eigenen Block hinzufügen
            </button>
            <PruefBlock feld={`leben-${person.id}-abgaben`}>
              <Abgaben
                eingabe={leben}
                herleitung={bericht?.herleitung ?? []}
                onChange={(sozialversicherung) => setze({ ...leben, sozialversicherung })}
              />
            </PruefBlock>
            <Feld
              label="Kirchensteuer"
              hilfe="Ob die Person kirchensteuerpflichtig ist. Der Satz folgt dem Bundesland."
            >
              <input
                type="checkbox"
                checked={leben.kirchensteuer}
                onChange={(event) => setze({ ...leben, kirchensteuer: event.target.checked })}
              />
            </Feld>
          </div>
        );
      })}
      <Gruendungszuschuss zuschuss={zuschuss} onAendern={onAendern} />
    </section>
  );
}

function Abgaben({
  eingabe,
  herleitung,
  onChange,
}: {
  eingabe: LebensbedarfEingabe;
  herleitung: readonly string[];
  onChange: (sozial: SozialversicherungEingabe) => void;
}) {
  const sozial = eingabe.sozialversicherung;
  const gesetzlich = sozial.krankenversicherung === "gesetzlich";
  return (
    <fieldset className="feld-gruppe privat-block">
      <legend>Abgaben und Steuern</legend>
      <p className="feld-hilfe">
        Kranken- und Pflegeversicherung, gesetzliche Rentenversicherung, Arbeitslosenversicherung
        und die Einkommensteuerrücklage werden aus dem Plan gerechnet. Die Felder hier sind die
        Annahmen, nicht die Beträge.
      </p>
      <AuswahlFeld
        label="Krankenversicherung"
        hilfe="Freiwillig gesetzlich mit den Sätzen 2026, oder ein eingegebener privater Monatsbeitrag."
        value={sozial.krankenversicherung}
        onChange={(krankenversicherung) =>
          onChange({
            ...sozial,
            krankenversicherung:
              krankenversicherung as SozialversicherungEingabe["krankenversicherung"],
          })
        }
      >
        <option value="gesetzlich">freiwillig gesetzlich</option>
        <option value="privat">privat versichert</option>
      </AuswahlFeld>
      {gesetzlich ? (
        <>
          <Feld
            label="Krankengeldanspruch"
            hilfe="Ja nutzt den allgemeinen Beitragssatz 14,6 %, nein den ermäßigten Satz 14,0 %. Der Zusatzbeitrag kommt dazu."
          >
            <input
              type="checkbox"
              checked={sozial.krankengeldanspruch}
              onChange={(event) =>
                onChange({ ...sozial, krankengeldanspruch: event.target.checked })
              }
            />
          </Feld>
          <Feld
            label="Kinder"
            hilfe="Ohne Kinder wird der Kinderlosenzuschlag von 0,6 Prozentpunkten auf die Pflegeversicherung gerechnet."
          >
            <input
              type="checkbox"
              checked={sozial.kinder}
              onChange={(event) => onChange({ ...sozial, kinder: event.target.checked })}
            />
          </Feld>
        </>
      ) : (
        <EuroFeld
          label="Monatsbeitrag private Kranken- und Pflegeversicherung"
          hilfe="Ein Betrag für beide. Er wird nicht auf Mindest- oder Höchstbemessung begrenzt."
          cents={sozial.privatbeitragCents}
          onChange={(privatbeitragCents) => onChange({ ...sozial, privatbeitragCents })}
        />
      )}
      <AuswahlFeld
        label="Rentenversicherung"
        hilfe="Pflichtig rechnet einkommensgerecht. Freiwillig nimmt den Regelbeitrag auf die Bezugsgröße. Nein lässt den Beitrag aus."
        value={sozial.rentenversicherung}
        onChange={(rentenversicherung) =>
          onChange({
            ...sozial,
            rentenversicherung:
              rentenversicherung as SozialversicherungEingabe["rentenversicherung"],
          })
        }
      >
        <option value="nein">nein</option>
        <option value="pflicht">pflichtversichert, einkommensgerecht</option>
        <option value="freiwillig">freiwillig, Regelbeitrag</option>
      </AuswahlFeld>
      <Feld
        label="Antragspflichtversicherung Arbeitslosenversicherung"
        hilfe="Beitrag auf die Bezugsgröße. Im Gründungsjahr und im folgenden Kalenderjahr gilt die Hälfte."
      >
        <input
          type="checkbox"
          checked={sozial.arbeitslosenversicherung}
          onChange={(event) =>
            onChange({ ...sozial, arbeitslosenversicherung: event.target.checked })
          }
        />
      </Feld>
      {herleitung.length > 0 ? (
        <div className="herleitung">
          <p className="feld-hilfe">Herleitung</p>
          {herleitung.map((zeile) => (
            <p key={zeile}>{zeile}</p>
          ))}
        </div>
      ) : (
        <p className="feld-hilfe">
          Die Beträge erscheinen, sobald Gründungsmonat und Rechtsform eine Rechnung erlauben.
        </p>
      )}
    </fieldset>
  );
}

function Gruendungszuschuss({
  zuschuss,
  onAendern,
}: {
  zuschuss: ReturnType<typeof leseGruendungszuschuss>;
  onAendern: PlanAendern;
}) {
  return (
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
                setzePersoenlich(aktuell, leseLebensbedarf(aktuell), { ...zuschuss, phase1Monate }),
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
  );
}

function leerLeben(personId: string): LebensbedarfEingabe {
  const basis = standardLebensbedarf(personId);
  return {
    personId,
    bloecke: basis.bloecke,
    sozialversicherung: basis.sozialversicherung,
    kirchensteuer: false,
  };
}

function benennePosten(
  leben: LebensbedarfEingabe,
  blockId: string,
  postenId: string,
  bezeichnung: string,
): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: leben.bloecke.map((block) =>
      block.id !== blockId
        ? block
        : {
            ...block,
            posten: block.posten.map((posten) =>
              posten.id === postenId ? { ...posten, bezeichnung } : posten,
            ),
          },
    ),
  };
}

function aenderePosten(
  leben: LebensbedarfEingabe,
  blockId: string,
  postenId: string,
  basisCents: number,
): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: leben.bloecke.map((block) =>
      block.id !== blockId
        ? block
        : {
            ...block,
            posten: block.posten.map((posten) =>
              posten.id === postenId ? { ...posten, betrag: { basisCents } } : posten,
            ),
          },
    ),
  };
}

function entfernePosten(
  leben: LebensbedarfEingabe,
  blockId: string,
  postenId: string,
): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: leben.bloecke.map((block) =>
      block.id !== blockId
        ? block
        : { ...block, posten: block.posten.filter((posten) => posten.id !== postenId) },
    ),
  };
}

function neuerPosten(leben: LebensbedarfEingabe, blockId: string): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: leben.bloecke.map((block) =>
      block.id !== blockId
        ? block
        : {
            ...block,
            posten: [
              ...block.posten,
              {
                id: neueId("posten"),
                bezeichnung: "Neuer Posten",
                schluessel: "eigen",
                betrag: { basisCents: 0 },
              },
            ],
          },
    ),
  };
}

function aendereFaktor(
  leben: LebensbedarfEingabe,
  blockId: string,
  faktor: Partial<Pick<Privatblock, "faktorJahr2" | "faktorJahr3">>,
): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: leben.bloecke.map((block) => (block.id === blockId ? { ...block, ...faktor } : block)),
  };
}

function benenneBlock(
  leben: LebensbedarfEingabe,
  blockId: string,
  bezeichnung: string,
): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: leben.bloecke.map((block) =>
      block.id === blockId ? { ...block, bezeichnung } : block,
    ),
  };
}

function entferneBlock(leben: LebensbedarfEingabe, blockId: string): LebensbedarfEingabe {
  return { ...leben, bloecke: leben.bloecke.filter((block) => block.id !== blockId) };
}

function neuerBlock(leben: LebensbedarfEingabe): LebensbedarfEingabe {
  return {
    ...leben,
    bloecke: [
      ...leben.bloecke,
      {
        id: neueId("block"),
        bezeichnung: "Eigener Block",
        schluessel: "eigen",
        faktorJahr2: 1,
        faktorJahr3: 1,
        posten: [
          {
            id: neueId("posten"),
            bezeichnung: "Neuer Posten",
            schluessel: "eigen",
            betrag: { basisCents: 0 },
          },
        ],
      },
    ],
  };
}
