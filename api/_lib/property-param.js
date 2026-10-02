// Lit le riad demandé (?property=dar-yallah). Absent = Kasbah Blanca.
// Renvoie null si l'identifiant est inconnu.
import { DEFAULT_PROPERTY, findProperty } from "../../src/properties.js";

export function propertyFrom(req) {
  const key = req.query?.property;
  if (!key) return DEFAULT_PROPERTY;
  return findProperty(String(key));
}
