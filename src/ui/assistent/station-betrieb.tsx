import { useState } from "react";
import { anlageKlassifikationHinweise } from "../../domain/anlage.ts";
import {
  leseFinanzierung,
  leseInvestitionen,
  leseKosten,
  lesePersonal,
} from "../../domain/assistent/lesen.ts";
import { neueId } from "../../domain/assistent/stationen.ts";
import {
  KOSTEN_VORSCHLAEGE,
  ordneInvestition,
  setzeFinanzierung,
  setzeInvestitionen,
  setzeKosten,
  setzePersonal,
  type EinmalEingabe,
  type InvestitionEingabe,
  type KostenEingabe,
  type StelleEingabe,
} from "../../domain/assistent/schreiben.ts";
import { TAB_MIKRODARLEHEN_ID } from "../../domain/parameter.ts";
import type { Berichte } from "../../domain/reports/typen.ts";
import { INVESTITIONSKATEGORIEN, KOSTENKATEGORIEN, PERSONAL_ROLLEN } from "../../domain/types.ts";
import type {
  AfaMethode,
  Darlehensart,
  Finanzplan,
  InvestitionsKategorie,
  Kostenkategorie,
  PersonalRolle,
  Tilgungsart,
} from "../../domain/types.ts";
import { formatEuro, formatMonatLang, formatProzent } from "../format.ts";
import { AuswahlFeld, EuroFeld, MonatFeld, ProzentFeld, TextFeld, ZahlFeld } from "./felder.tsx";
import type { PlanAendern } from "./typen.ts";

const ROLLE: Record<PersonalRolle, string> = {
  angestellt: "angestellt",
  minijob: "Minijob",
  geschaeftsfuehrer: "Geschäftsführung",
  aushilfe: "Aushilfe",
};

const KOSTEN_LABEL: Record<Kostenkategorie, string> = {
  miete: "Miete",
  nebenkosten: "Nebenkosten",
  versicherung: "Versicherung",
  marketing: "Marketing",
  telefon_internet: "Telefon und Internet",
  software: "Software",
  beratung_buchhaltung: "Beratung und Buchhaltung",
  reise_fahrzeug: "Reise und Fahrzeug",
  buero: "Büro",
  beitraege: "Beiträge",
  leasing: "Leasing",
  sonstiges: "Sonstiges",
};

const ANLAGE_LABEL: Record<InvestitionsKategorie, string> = {
  immateriell: "Immateriell",
  maschine_ausstattung: "Maschine und Ausstattung",
  fahrzeug: "Fahrzeug",
  buero_einrichtung: "Büroeinrichtung",
  it: "IT",
  sonstiges: "Sonstiges",
};

const DARLEHEN_ART: Record<Darlehensart, string> = {
  bank: "Bank",
  kfw: "KfW",
  foerderdarlehen: "Förderdarlehen",
  privat: "privat",
  gesellschafterdarlehen: "Gesellschafterdarlehen",
};

const TILGUNG: Record<Tilgungsart, string> = {
  annuitaet: "Annuität",
  ratentilgung: "Ratentilgung",
  endfaellig: "endfällig",
};

export function PersonalStation({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const stellen = lesePersonal(plan);
  function schreibe(naechste: StelleEingabe[]) {
    onAendern((aktuell) => setzePersonal(aktuell, naechste));
  }
  return (
    <section className="assistent-station" aria-labelledby="station-personal">
      <h2 id="station-personal">Personal</h2>
      <p className="hinweis">
        Jede Stelle hat ein Bruttogehalt und einen Eintritt. Der Arbeitgeberanteil ist eine eigene
        Eingabe, kein hinterlegter Beitragssatz.
      </p>
      {stellen.map((stelle) => (
        <fieldset key={stelle.id} className="feld-gruppe">
          <legend>{stelle.bezeichnung || "Stelle"}</legend>
          <div className="feld-raster">
            <TextFeld
              label="Bezeichnung"
              hilfe="Name der Stelle, zum Beispiel die Tätigkeit."
              value={stelle.bezeichnung}
              onChange={(bezeichnung) =>
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id ? { ...eintrag, bezeichnung } : eintrag,
                  ),
                )
              }
            />
            <TextFeld
              label="Name"
              hilfe="Name der beschäftigten Person, falls schon bekannt. Kann leer bleiben."
              value={stelle.name ?? ""}
              onChange={(name) =>
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id ? { ...eintrag, name: name || undefined } : eintrag,
                  ),
                )
              }
            />
            <EuroFeld
              label="Bruttomonatsgehalt"
              hilfe="Brutto je Monat ab dem Eintritt."
              cents={stelle.brutto.basisCents}
              onChange={(basisCents) =>
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id
                      ? { ...eintrag, brutto: { ...eintrag.brutto, basisCents } }
                      : eintrag,
                  ),
                )
              }
            />
            <MonatFeld
              label="Eintritt"
              hilfe="Erster Monat, in dem die Stelle Gehalt kostet."
              value={stelle.eintritt}
              onChange={(eintritt) =>
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id ? { ...eintrag, eintritt } : eintrag,
                  ),
                )
              }
            />
            <AuswahlFeld
              label="Rolle"
              hilfe="Angestellt, Minijob, Geschäftsführung oder Aushilfe."
              value={stelle.rolle}
              onChange={(rolle) =>
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id
                      ? { ...eintrag, rolle: rolle as PersonalRolle }
                      : eintrag,
                  ),
                )
              }
            >
              {PERSONAL_ROLLEN.map((rolle) => (
                <option key={rolle} value={rolle}>
                  {ROLLE[rolle]}
                </option>
              ))}
            </AuswahlFeld>
            <ProzentFeld
              label="Arbeitgeber-Nebenkosten"
              hilfe="Satz auf das Brutto. Die App enthält keine gesetzlichen Beitragssätze."
              satz={stelle.agNebenkostenSatz}
              onChange={(agNebenkostenSatz) => {
                if (agNebenkostenSatz == null) return;
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id ? { ...eintrag, agNebenkostenSatz } : eintrag,
                  ),
                );
              }}
            />
            <ZahlFeld
              label="Wochenstunden"
              hilfe="Vereinbarte Wochenstunden. Kann leer bleiben."
              wert={stelle.wochenstunden ?? null}
              onChange={(wochenstunden) =>
                schreibe(
                  stellen.map((eintrag) =>
                    eintrag.id === stelle.id
                      ? { ...eintrag, wochenstunden: wochenstunden ?? undefined }
                      : eintrag,
                  ),
                )
              }
            />
          </div>
          <button
            type="button"
            onClick={() => schreibe(stellen.filter((eintrag) => eintrag.id !== stelle.id))}
          >
            Stelle entfernen
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() =>
          schreibe([
            ...stellen,
            {
              id: neueId("personal"),
              bezeichnung: "Neue Stelle",
              rolle: "angestellt",
              brutto: { basisCents: 0 },
              eintritt: plan.startMonat ?? plan.stammdaten.gruendungsmonat ?? "",
              agNebenkostenSatz: 0,
              sozialversicherungspflichtig: true,
            },
          ])
        }
      >
        Stelle hinzufügen
      </button>
    </section>
  );
}

export function KostenStation({ plan, onAendern }: { plan: Finanzplan; onAendern: PlanAendern }) {
  const posten = leseKosten(plan);
  function schreibe(naechste: KostenEingabe[]) {
    onAendern((aktuell) => setzeKosten(aktuell, naechste));
  }
  return (
    <section className="assistent-station" aria-labelledby="station-kosten">
      <h2 id="station-kosten">Laufende Kosten</h2>
      <p className="hinweis">
        Feste monatliche Nettobeträge. Die Vorschläge legen nur die Bezeichnung an.
      </p>
      <div className="vorschlag-liste">
        {KOSTEN_VORSCHLAEGE.map((vorschlag) => (
          <button
            key={vorschlag.id}
            type="button"
            onClick={() => {
              if (posten.some((eintrag) => eintrag.bezeichnung === vorschlag.bezeichnung)) return;
              schreibe([
                ...posten,
                {
                  id: neueId("kost"),
                  bezeichnung: vorschlag.bezeichnung,
                  kategorie: vorschlag.kategorie,
                  art: "fix",
                  betrag: { basisCents: 0 },
                  umsatzsteuerSatz: plan.parameter.steuer.umsatzsteuerRegelsatz,
                  zahlungszielTage: 0,
                  betriebsausgabe: true,
                },
              ]);
            }}
          >
            {vorschlag.bezeichnung}
          </button>
        ))}
      </div>
      <p className="feld-hilfe">
        Typische Posten. Ein Klick legt die Zeile an, der Betrag bleibt leer.
      </p>
      {posten.map((eintrag) =>
        eintrag.art === "umsatzabhaengig" ? null : (
          <fieldset key={eintrag.id} className="feld-gruppe">
            <legend>{eintrag.bezeichnung || "Posten"}</legend>
            <div className="feld-raster">
              <TextFeld
                label="Bezeichnung"
                hilfe="Name des Kostenpostens in den Berichten."
                value={eintrag.bezeichnung}
                onChange={(bezeichnung) =>
                  schreibe(
                    posten.map((zeile) =>
                      zeile.id === eintrag.id ? { ...zeile, bezeichnung } : zeile,
                    ),
                  )
                }
              />
              <AuswahlFeld
                label="Kategorie"
                hilfe="Ordnet den Posten in der Kostenstruktur."
                value={eintrag.kategorie}
                onChange={(kategorie) =>
                  schreibe(
                    posten.map((zeile) =>
                      zeile.id === eintrag.id
                        ? { ...zeile, kategorie: kategorie as Kostenkategorie }
                        : zeile,
                    ),
                  )
                }
              >
                {KOSTENKATEGORIEN.map((kategorie) => (
                  <option key={kategorie} value={kategorie}>
                    {KOSTEN_LABEL[kategorie]}
                  </option>
                ))}
              </AuswahlFeld>
              <EuroFeld
                label="Monatlicher Nettobetrag"
                hilfe="Fester Betrag je Monat, ohne Umsatzsteuer."
                cents={eintrag.betrag.basisCents}
                onChange={(basisCents) =>
                  schreibe(
                    posten.map((zeile) =>
                      zeile.id === eintrag.id && zeile.art === "fix"
                        ? { ...zeile, betrag: { ...zeile.betrag, basisCents } }
                        : zeile,
                    ),
                  )
                }
              />
              <ProzentFeld
                label="Umsatzsteuer"
                hilfe="Vorsteuersatz dieses Postens. Versicherungen bleiben oft bei null."
                satz={eintrag.umsatzsteuerSatz}
                onChange={(umsatzsteuerSatz) => {
                  if (umsatzsteuerSatz == null) return;
                  schreibe(
                    posten.map((zeile) =>
                      zeile.id === eintrag.id ? { ...zeile, umsatzsteuerSatz } : zeile,
                    ),
                  );
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => schreibe(posten.filter((zeile) => zeile.id !== eintrag.id))}
            >
              Posten entfernen
            </button>
          </fieldset>
        ),
      )}
    </section>
  );
}

export function InvestitionStation({
  plan,
  onAendern,
}: {
  plan: Finanzplan;
  onAendern: PlanAendern;
}) {
  const bestand = leseInvestitionen(plan);
  const hinweise = anlageKlassifikationHinweise(plan);
  function schreibe(naechste: typeof bestand) {
    onAendern((aktuell) => setzeInvestitionen(aktuell, naechste));
  }
  return (
    <section className="assistent-station" aria-labelledby="station-invest">
      <h2 id="station-invest">Investitionen</h2>
      <p className="hinweis">
        Der Nettobetrag wird anhand der Grenzen im Plan eingeordnet: Sofortaufwand, geringwertiges
        Wirtschaftsgut, Sammelposten oder lineare Abschreibung. Die Einordnung lässt sich ändern.
      </p>
      {bestand.posten.map((posten) => {
        const auto = ordneInvestition(posten.nettoCents, plan.parameter.steuer);
        const hinweis = hinweise.find((eintrag) => eintrag.investitionId === posten.id);
        return (
          <fieldset key={posten.id} className="feld-gruppe">
            <legend>{posten.bezeichnung}</legend>
            <p className="einordnung">
              Einordnung: {auto.label}
              {posten.methode &&
              posten.methode !== (auto.art === "sofortaufwand" ? "sofort_gwg" : auto.art)
                ? `, gewählt: ${methodeLabel(posten.methode)}`
                : ""}
            </p>
            {hinweis ? <p className="hinweis">{hinweis.message}</p> : null}
            <div className="feld-raster">
              <TextFeld
                label="Bezeichnung"
                hilfe="Was angeschafft wird."
                value={posten.bezeichnung}
                onChange={(bezeichnung) =>
                  schreibe({
                    ...bestand,
                    posten: bestand.posten.map((eintrag) =>
                      eintrag.id === posten.id ? { ...eintrag, bezeichnung } : eintrag,
                    ),
                  })
                }
              />
              <EuroFeld
                label="Nettopreis"
                hilfe="Anschaffungskosten ohne Umsatzsteuer. Daraus folgt die Einordnung."
                cents={posten.nettoCents}
                onChange={(nettoCents) =>
                  schreibe({
                    ...bestand,
                    posten: bestand.posten.map((eintrag) =>
                      eintrag.id === posten.id ? { ...eintrag, nettoCents } : eintrag,
                    ),
                  })
                }
              />
              <AuswahlFeld
                label="Kategorie"
                hilfe="Art des Wirtschaftsguts."
                value={posten.kategorie}
                onChange={(kategorie) =>
                  schreibe({
                    ...bestand,
                    posten: bestand.posten.map((eintrag) =>
                      eintrag.id === posten.id
                        ? { ...eintrag, kategorie: kategorie as InvestitionsKategorie }
                        : eintrag,
                    ),
                  })
                }
              >
                {INVESTITIONSKATEGORIEN.map((kategorie) => (
                  <option key={kategorie} value={kategorie}>
                    {ANLAGE_LABEL[kategorie]}
                  </option>
                ))}
              </AuswahlFeld>
              <AuswahlFeld
                label="Abschreibung"
                hilfe="Automatisch folgt den Grenzen. Linear braucht eine Nutzungsdauer in Monaten."
                value={posten.methode ?? ""}
                onChange={(wert) =>
                  schreibe({
                    ...bestand,
                    posten: bestand.posten.map((eintrag) =>
                      eintrag.id === posten.id
                        ? {
                            ...eintrag,
                            methode: wert === "" ? undefined : (wert as AfaMethode),
                          }
                        : eintrag,
                    ),
                  })
                }
              >
                <option value="">automatisch</option>
                <option value="sofort_gwg">Sofortabschreibung GWG</option>
                <option value="sammelposten">Sammelposten</option>
                <option value="linear">lineare Abschreibung</option>
              </AuswahlFeld>
              {posten.methode === "linear" || (posten.methode == null && auto.art === "linear") ? (
                <ZahlFeld
                  label="Nutzungsdauer in Monaten"
                  hilfe="Monate der linearen Abschreibung, mindestens ein Monat."
                  wert={posten.nutzungsdauerMonate ?? null}
                  ganzzahlig
                  onChange={(nutzungsdauerMonate) => {
                    if (nutzungsdauerMonate == null) return;
                    schreibe({
                      ...bestand,
                      posten: bestand.posten.map((eintrag) =>
                        eintrag.id === posten.id
                          ? { ...eintrag, nutzungsdauerMonate, methode: "linear" }
                          : eintrag,
                      ),
                    });
                  }}
                />
              ) : null}
              <MonatFeld
                label="Kaufmonat"
                hilfe="Monat der Anschaffung. Die Abschreibung beginnt dort, wenn kein späterer Beginn gesetzt ist."
                value={posten.anschaffungsmonat}
                onChange={(anschaffungsmonat) =>
                  schreibe({
                    ...bestand,
                    posten: bestand.posten.map((eintrag) =>
                      eintrag.id === posten.id ? { ...eintrag, anschaffungsmonat } : eintrag,
                    ),
                  })
                }
              />
              <ProzentFeld
                label="Umsatzsteuer"
                hilfe="Satz auf den Nettopreis. Die Vorsteuer rechnet die Liquidität."
                satz={posten.umsatzsteuerSatz}
                onChange={(umsatzsteuerSatz) => {
                  if (umsatzsteuerSatz == null) return;
                  schreibe({
                    ...bestand,
                    posten: bestand.posten.map((eintrag) =>
                      eintrag.id === posten.id ? { ...eintrag, umsatzsteuerSatz } : eintrag,
                    ),
                  });
                }}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                schreibe({
                  ...bestand,
                  posten: bestand.posten.filter((eintrag) => eintrag.id !== posten.id),
                })
              }
            >
              Investition entfernen
            </button>
          </fieldset>
        );
      })}
      <NeueInvestition
        start={plan.startMonat ?? ""}
        satz={plan.parameter.steuer.umsatzsteuerRegelsatz}
        onAnlegen={(posten) => schreibe({ ...bestand, posten: [...bestand.posten, posten] })}
      />
      <EinmalListe
        titel="Gründungskosten"
        hilfe="Einmalige Kosten der Gründung. Sie werden im Leistungsmonat als Aufwand gebucht."
        posten={bestand.gruendungskosten}
        onChange={(gruendungskosten) => schreibe({ ...bestand, gruendungskosten })}
      />
      <EinmalListe
        titel="Anlaufkosten"
        hilfe="Einmalige Kosten des Starts, die keine Anlage sind."
        posten={bestand.anlaufkosten}
        onChange={(anlaufkosten) => schreibe({ ...bestand, anlaufkosten })}
      />
    </section>
  );
}

function NeueInvestition({
  start,
  satz,
  onAnlegen,
}: {
  start: string;
  satz: number;
  onAnlegen: (posten: InvestitionEingabe) => void;
}) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [netto, setNetto] = useState<number | null>(null);
  const [kategorie, setKategorie] = useState<InvestitionsKategorie>("maschine_ausstattung");
  const [monat, setMonat] = useState(start);
  const [dauer, setDauer] = useState<number | null>(null);
  return (
    <fieldset className="feld-gruppe">
      <legend>Investition hinzufügen</legend>
      <div className="feld-raster">
        <TextFeld
          label="Bezeichnung"
          hilfe="Was angeschafft wird."
          value={bezeichnung}
          onChange={setBezeichnung}
        />
        <EuroFeld
          label="Nettopreis"
          hilfe="Betrag ohne Umsatzsteuer. Die Einordnung entsteht daraus."
          cents={netto}
          onChange={setNetto}
        />
        <AuswahlFeld
          label="Kategorie"
          hilfe="Art des Wirtschaftsguts."
          value={kategorie}
          onChange={(wert) => setKategorie(wert as InvestitionsKategorie)}
        >
          {INVESTITIONSKATEGORIEN.map((eintrag) => (
            <option key={eintrag} value={eintrag}>
              {ANLAGE_LABEL[eintrag]}
            </option>
          ))}
        </AuswahlFeld>
        <MonatFeld
          label="Kaufmonat"
          hilfe="Monat der Anschaffung."
          value={monat}
          onChange={setMonat}
        />
        <ZahlFeld
          label="Nutzungsdauer in Monaten"
          hilfe="Nur für die lineare Abschreibung nötig. Bei automatischer Sofortabschreibung oder einem Sammelposten bleibt das Feld ungenutzt."
          wert={dauer}
          ganzzahlig
          onChange={setDauer}
        />
      </div>
      <button
        type="button"
        disabled={!bezeichnung.trim() || netto == null || netto <= 0 || monat === ""}
        onClick={() => {
          if (netto == null) return;
          onAnlegen({
            id: neueId("inv"),
            bezeichnung: bezeichnung.trim(),
            kategorie,
            nettoCents: netto,
            umsatzsteuerSatz: satz,
            anschaffungsmonat: monat,
            zahlungszielTage: 0,
            nutzungsdauerMonate: dauer ?? undefined,
          });
          setBezeichnung("");
          setNetto(null);
        }}
      >
        Investition übernehmen
      </button>
    </fieldset>
  );
}

function EinmalListe({
  titel,
  hilfe,
  posten,
  onChange,
}: {
  titel: string;
  hilfe: string;
  posten: EinmalEingabe[];
  onChange: (posten: EinmalEingabe[]) => void;
}) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [netto, setNetto] = useState<number | null>(null);
  const [monat, setMonat] = useState("");
  return (
    <fieldset className="feld-gruppe">
      <legend>{titel}</legend>
      <p className="feld-hilfe">{hilfe}</p>
      {posten.map((eintrag) => (
        <div key={eintrag.id} className="karte">
          <strong>{eintrag.bezeichnung}</strong>
          <span>{formatEuro(eintrag.nettoCents)}</span>
          <span>{eintrag.monat}</span>
          <button
            type="button"
            onClick={() => onChange(posten.filter((zeile) => zeile.id !== eintrag.id))}
          >
            Entfernen
          </button>
        </div>
      ))}
      <div className="feld-raster">
        <TextFeld
          label="Bezeichnung"
          hilfe="Wofür der einmalige Betrag anfällt."
          value={bezeichnung}
          onChange={setBezeichnung}
        />
        <EuroFeld
          label="Nettobetrag"
          hilfe="Betrag ohne Umsatzsteuer."
          cents={netto}
          onChange={setNetto}
        />
        <MonatFeld
          label="Monat"
          hilfe="Monat, in dem der Aufwand entsteht."
          value={monat}
          onChange={setMonat}
        />
      </div>
      <button
        type="button"
        disabled={!bezeichnung.trim() || netto == null || netto <= 0 || monat === ""}
        onClick={() => {
          if (netto == null) return;
          onChange([
            ...posten,
            {
              id: neueId("einmal"),
              bezeichnung: bezeichnung.trim(),
              nettoCents: netto,
              umsatzsteuerSatz: 0.19,
              monat,
              zahlungszielTage: 0,
            },
          ]);
          setBezeichnung("");
          setNetto(null);
        }}
      >
        Posten übernehmen
      </button>
    </fieldset>
  );
}

export function FinanzierungStation({
  plan,
  onAendern,
}: {
  plan: Finanzplan;
  onAendern: PlanAendern;
}) {
  const eingabe = leseFinanzierung(plan);
  const vorlage = plan.parameter.darlehensvorlagen.find(
    (eintrag) => eintrag.id === TAB_MIKRODARLEHEN_ID,
  );
  function schreibe(teil: Partial<typeof eingabe>) {
    onAendern((aktuell) => setzeFinanzierung(aktuell, { ...leseFinanzierung(aktuell), ...teil }));
  }
  return (
    <section className="assistent-station" aria-labelledby="station-finanz">
      <h2 id="station-finanz">Finanzierung</h2>
      <p className="hinweis">Eigenkapital, das Thüringer Mikrodarlehen und weitere Darlehen.</p>
      <div className="feld-raster">
        <EuroFeld
          label="Liquiditätsreserve"
          hilfe="Puffer zu Beginn. Kein Aufwand, nur Kapitalbedarf."
          cents={eingabe.liquiditaetsreserveCents ?? 0}
          onChange={(liquiditaetsreserveCents) => schreibe({ liquiditaetsreserveCents })}
        />
        <EuroFeld
          label="Betriebsmittelbedarf"
          hilfe="Manuell erfasster Bedarf zu Beginn. Die Rechnung leitet ihn nicht ab."
          cents={eingabe.betriebsmittelbedarfCents ?? 0}
          onChange={(betriebsmittelbedarfCents) => schreibe({ betriebsmittelbedarfCents })}
        />
      </div>
      {eingabe.eigenkapital.map((posten) => (
        <fieldset key={posten.id} className="feld-gruppe">
          <legend>{posten.bezeichnung}</legend>
          <div className="feld-raster">
            <TextFeld
              label="Bezeichnung"
              hilfe="Woher die Einlage stammt."
              value={posten.bezeichnung}
              onChange={(bezeichnung) =>
                schreibe({
                  eigenkapital: eingabe.eigenkapital.map((eintrag) =>
                    eintrag.id === posten.id ? { ...eintrag, bezeichnung } : eintrag,
                  ),
                })
              }
            />
            <EuroFeld
              label="Betrag"
              hilfe="Bareinlage, die in diesem Monat auf dem Konto ankommt. Pflicht, sobald die Einlage angelegt ist."
              cents={posten.betragCents}
              pflicht
              positiv
              onChange={(betragCents) =>
                schreibe({
                  eigenkapital: eingabe.eigenkapital.map((eintrag) =>
                    eintrag.id === posten.id ? { ...eintrag, betragCents } : eintrag,
                  ),
                })
              }
            />
            <MonatFeld
              label="Monat"
              hilfe="Monat der Einlage."
              value={posten.monat}
              onChange={(monat) =>
                schreibe({
                  eigenkapital: eingabe.eigenkapital.map((eintrag) =>
                    eintrag.id === posten.id ? { ...eintrag, monat } : eintrag,
                  ),
                })
              }
            />
          </div>
          <button
            type="button"
            onClick={() =>
              schreibe({
                eigenkapital: eingabe.eigenkapital.filter((eintrag) => eintrag.id !== posten.id),
              })
            }
          >
            Einlage entfernen
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() =>
          schreibe({
            eigenkapital: [
              ...eingabe.eigenkapital,
              {
                id: neueId("ek"),
                bezeichnung: "Bareinlage",
                betragCents: null,
                monat: plan.startMonat ?? "",
                art: "bareinlage",
                personId: plan.stammdaten.personen[0]?.id,
              },
            ],
          })
        }
      >
        Einlage hinzufügen
      </button>
      <fieldset className="feld-gruppe">
        <legend>Thüringer Mikrodarlehen</legend>
        <p className="feld-hilfe">
          Vorlage der Thüringer Aufbaubank aus dem Plan
          {vorlage
            ? `: Sollzins ${formatProzent(vorlage.nominalzinsPa)}, ${TILGUNG[vorlage.tilgungsart]}, Auszahlung ${formatProzent(vorlage.auszahlungAnteil)}.`
            : "."}{" "}
          Betrag, Laufzeit und tilgungsfreie Zeit bleiben innerhalb der Vorlage änderbar.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={eingabe.tab != null}
            onChange={(event) => {
              if (!event.target.checked) {
                schreibe({ tab: null });
                return;
              }
              schreibe({
                tab: {
                  id: neueId("darlehen"),
                  betragCents: vorlage?.betragMinCents ?? 500_000,
                  monat: plan.startMonat ?? "",
                  laufzeitMonate: vorlage?.laufzeitMaxMonate ?? 84,
                  tilgungsfreieMonate: 0,
                  bezeichnung: vorlage?.bezeichnung,
                  geber: vorlage?.anbieter,
                },
              });
            }}
          />
          Mikrodarlehen aufnehmen
        </label>
        {eingabe.tab ? (
          <div className="feld-raster">
            <EuroFeld
              label="Betrag"
              hilfe="Auszahlungsbetrag. Er muss in der Spanne der Vorlage liegen."
              cents={eingabe.tab.betragCents}
              onChange={(betragCents) =>
                schreibe({ tab: eingabe.tab ? { ...eingabe.tab, betragCents } : null })
              }
            />
            <MonatFeld
              label="Auszahlung"
              hilfe="Monat, in dem das Darlehen auf dem Konto ankommt. Die erste Rate folgt im nächsten Monat."
              value={eingabe.tab.monat}
              onChange={(monat) =>
                schreibe({ tab: eingabe.tab ? { ...eingabe.tab, monat } : null })
              }
            />
            <ZahlFeld
              label="Laufzeit in Monaten"
              hilfe="Gesamte Laufzeit ab der ersten Rate, einschließlich tilgungsfreier Monate."
              wert={eingabe.tab.laufzeitMonate}
              ganzzahlig
              onChange={(laufzeitMonate) => {
                if (laufzeitMonate == null || !eingabe.tab) return;
                schreibe({ tab: { ...eingabe.tab, laufzeitMonate } });
              }}
            />
            <ZahlFeld
              label="Tilgungsfreie Monate"
              hilfe="Monate am Anfang ohne Tilgung. Zinsen werden laut Vorlage weiter gezahlt."
              wert={eingabe.tab.tilgungsfreieMonate}
              ganzzahlig
              onChange={(tilgungsfreieMonate) => {
                if (tilgungsfreieMonate == null || !eingabe.tab) return;
                schreibe({ tab: { ...eingabe.tab, tilgungsfreieMonate } });
              }}
            />
          </div>
        ) : null}
      </fieldset>
      {eingabe.weitere.map((darlehen) => (
        <fieldset key={darlehen.id} className="feld-gruppe">
          <legend>{darlehen.bezeichnung}</legend>
          <div className="feld-raster">
            <TextFeld
              label="Bezeichnung"
              hilfe="Name des Darlehens im Plan."
              value={darlehen.bezeichnung}
              onChange={(bezeichnung) =>
                schreibe({
                  weitere: eingabe.weitere.map((eintrag) =>
                    eintrag.id === darlehen.id ? { ...eintrag, bezeichnung } : eintrag,
                  ),
                })
              }
            />
            <TextFeld
              label="Geber"
              hilfe="Bank oder andere Stelle, die auszahlt."
              value={darlehen.geber}
              onChange={(geber) =>
                schreibe({
                  weitere: eingabe.weitere.map((eintrag) =>
                    eintrag.id === darlehen.id ? { ...eintrag, geber } : eintrag,
                  ),
                })
              }
            />
            <EuroFeld
              label="Betrag"
              hilfe="Summe, die in einem Monat ausgezahlt wird. Pflicht, sobald das Darlehen angelegt ist."
              cents={darlehen.betragCents}
              pflicht
              positiv
              onChange={(betragCents) =>
                schreibe({
                  weitere: eingabe.weitere.map((eintrag) =>
                    eintrag.id === darlehen.id ? { ...eintrag, betragCents } : eintrag,
                  ),
                })
              }
            />
            <ProzentFeld
              label="Nominalzins pro Jahr"
              hilfe="Sollzins, mit dem die Zinsen auf die Restschuld gerechnet werden."
              satz={darlehen.nominalzinsPa}
              onChange={(nominalzinsPa) => {
                if (nominalzinsPa == null) return;
                schreibe({
                  weitere: eingabe.weitere.map((eintrag) =>
                    eintrag.id === darlehen.id ? { ...eintrag, nominalzinsPa } : eintrag,
                  ),
                });
              }}
            />
            <AuswahlFeld
              label="Tilgung"
              hilfe="Annuität, gleichbleibende Rate oder endfällige Tilgung."
              value={darlehen.tilgungsart}
              onChange={(tilgungsart) =>
                schreibe({
                  weitere: eingabe.weitere.map((eintrag) =>
                    eintrag.id === darlehen.id
                      ? { ...eintrag, tilgungsart: tilgungsart as Tilgungsart }
                      : eintrag,
                  ),
                })
              }
            >
              {(Object.keys(TILGUNG) as Tilgungsart[]).map((art) => (
                <option key={art} value={art}>
                  {TILGUNG[art]}
                </option>
              ))}
            </AuswahlFeld>
            <AuswahlFeld
              label="Art"
              hilfe="Herkunft des Darlehens."
              value={darlehen.art}
              onChange={(art) =>
                schreibe({
                  weitere: eingabe.weitere.map((eintrag) =>
                    eintrag.id === darlehen.id ? { ...eintrag, art: art as Darlehensart } : eintrag,
                  ),
                })
              }
            >
              {(Object.keys(DARLEHEN_ART) as Darlehensart[]).map((art) => (
                <option key={art} value={art}>
                  {DARLEHEN_ART[art]}
                </option>
              ))}
            </AuswahlFeld>
          </div>
          <button
            type="button"
            onClick={() =>
              schreibe({ weitere: eingabe.weitere.filter((eintrag) => eintrag.id !== darlehen.id) })
            }
          >
            Darlehen entfernen
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() =>
          schreibe({
            weitere: [
              ...eingabe.weitere,
              {
                id: neueId("darlehen"),
                bezeichnung: "Weiteres Darlehen",
                geber: "Bank",
                art: "bank",
                betragCents: null,
                monat: plan.startMonat ?? "",
                nominalzinsPa: 0,
                laufzeitMonate: 36,
                tilgungsfreieMonate: 0,
                tilgungsart: "ratentilgung",
                zinszahlungInTilgungsfreierZeit: true,
              },
            ],
          })
        }
      >
        Weiteres Darlehen
      </button>
    </section>
  );
}

export function ZusammenfassungStation({
  plan,
  berichte,
  onUeberblick,
}: {
  plan: Finanzplan;
  berichte: Berichte | null;
  onUeberblick: () => void;
}) {
  const kennzahlen = berichte?.kennzahlen;
  const umsatz = berichte?.rentabilitaet.zeilen.find((zeile) => zeile.id === "umsatz");
  const ergebnis = berichte?.rentabilitaet.zeilen.find(
    (zeile) => zeile.id === "ergebnis-nach-steuern",
  );
  return (
    <section className="assistent-station" aria-labelledby="station-zusammen">
      <h2 id="station-zusammen">Zusammenfassung</h2>
      <p className="hinweis">
        Die Kennzahlen stammen aus denselben Berichten wie der Überblick. Die Eingaben liegen im
        Plan, nicht in einer zweiten Liste.
      </p>
      {kennzahlen && umsatz && ergebnis ? (
        <div className="kpi-raster">
          <Kennzahl titel="Umsatz, 36 Monate" wert={formatEuro(umsatz.summeCents)} />
          <Kennzahl titel="Ergebnis nach Steuern" wert={formatEuro(ergebnis.summeCents)} />
          <Kennzahl
            titel="Break-even"
            wert={
              kennzahlen.breakEven.erreicht && kennzahlen.breakEven.monat
                ? formatMonatLang(kennzahlen.breakEven.monat)
                : "im Horizont nicht erreicht"
            }
          />
          <Kennzahl
            titel="Tiefster Kontostand"
            wert={formatEuro(kennzahlen.tiefsterLiquiditaetsstandCents)}
          />
          <Kennzahl
            titel="Eigenkapitalquote"
            wert={
              kennzahlen.eigenkapitalquote == null
                ? "–"
                : formatProzent(kennzahlen.eigenkapitalquote)
            }
          />
        </div>
      ) : (
        <p className="fehler">
          Die Kennzahlen brauchen einen Gründungsmonat.{" "}
          {plan.stammdaten.gruendungsmonat ? "" : "Er fehlt noch."}
        </p>
      )}
      <button type="button" className="primaer" onClick={onUeberblick}>
        Zum Überblick
      </button>
    </section>
  );
}

function Kennzahl({ titel, wert }: { titel: string; wert: string }) {
  return (
    <section className="kpi" aria-label={titel}>
      <h3>{titel}</h3>
      <p className="kpi-wert">{wert}</p>
    </section>
  );
}

function methodeLabel(methode: AfaMethode): string {
  if (methode === "sofort_gwg") return "Sofortabschreibung GWG";
  if (methode === "sammelposten") return "Sammelposten";
  return "lineare Abschreibung";
}
