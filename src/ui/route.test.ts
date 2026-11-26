import { describe, expect, it } from "vitest";
import { gleicheRoute, hashFuer, parseRoute } from "./route.ts";

describe("Startseite und Links", () => {
  it("öffnet ohne Hash und bei #start die Startseite", () => {
    expect(parseRoute("")).toEqual({ art: "start" });
    expect(parseRoute("#")).toEqual({ art: "start" });
    expect(parseRoute("#start")).toEqual({ art: "start" });
    expect(parseRoute("#start/ueberblick")).toEqual({ art: "start" });
    expect(gleicheRoute(parseRoute(""), parseRoute("#start"))).toBe(true);
    expect(hashFuer({ art: "start" })).toBe("start");
  });

  it("lässt die vier Beispiel-Links und den eigenen Plan stehen", () => {
    expect(parseRoute("#elektro/ueberblick")).toEqual({
      art: "plan",
      id: "elektro",
      reiter: "ueberblick",
    });
    expect(parseRoute("#cafe/pruefung")).toEqual({
      art: "plan",
      id: "cafe",
      reiter: "pruefung",
    });
    expect(parseRoute("#gmbh")).toEqual({ art: "plan", id: "gmbh", reiter: "ueberblick" });
    expect(parseRoute("#nordlicht/szenarien")).toEqual({
      art: "plan",
      id: "nordlicht",
      reiter: "szenarien",
    });
    expect(parseRoute("#neu")).toEqual({ art: "plan", id: "neu", reiter: "assistent" });
    expect(parseRoute("#neu/eingaben")).toEqual({
      art: "plan",
      id: "neu",
      reiter: "eingaben",
    });
    expect(hashFuer({ art: "plan", id: "elektro", reiter: "ueberblick" })).toBe(
      "elektro/ueberblick",
    );
  });

  it("schickt unbekannte Links auf die Startseite", () => {
    expect(parseRoute("#unbekannt")).toEqual({ art: "start" });
    expect(parseRoute("#elektro/fehlt")).toEqual({
      art: "plan",
      id: "elektro",
      reiter: "ueberblick",
    });
  });
});
