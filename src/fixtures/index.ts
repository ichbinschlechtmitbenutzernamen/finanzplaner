import { beispielCafe } from "./beispiel-cafe.ts";
import { beispielEinzelunternehmen } from "./beispiel-einzelunternehmen.ts";
import { beispielElektro } from "./beispiel-elektro.ts";
import type { Finanzplan } from "../domain/types.ts";

export interface Beispielplan {
  id: string;
  label: string;
  plan: Finanzplan;
}

export const beispielplaene: readonly Beispielplan[] = [
  { id: "nordlicht", label: "Grafikstudio", plan: beispielEinzelunternehmen },
  { id: "elektro", label: "Elektromeister", plan: beispielElektro },
  { id: "cafe", label: "Café", plan: beispielCafe },
];

export function beispielplanById(id: string): Beispielplan {
  return beispielplaene.find((item) => item.id === id) ?? beispielplaene[0];
}
