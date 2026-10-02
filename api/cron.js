// Tâche automatique (cron-job.org, toutes les 6 h), protégée par CRON_SECRET.
// Pour chaque riad : 1. sauvegarde complète, 2. synchro Airbnb + Booking.
// Une erreur sur un riad n'empêche pas de traiter les autres.
import { checkCaller } from "./_lib/admin.js";
import { snapshotBase } from "./_lib/backups.js";
import { runSync } from "./_lib/sync-core.js";
import { PROPERTIES } from "../src/properties.js";

export default async function handler(req, res) {
  const caller = await checkCaller(req);
  if (!caller || caller.kind !== "cron") return res.status(401).json({ error: "Unauthorized" });
  const results = {};
  let failed = false;
  for (const property of PROPERTIES) {
    const r = {};
    try { r.backup = await snapshotBase("cron", property); }
    catch (e) { console.error(`Backup error (${property.key}):`, e); r.backup = { error: e.message }; }
    try { r.sync = await runSync({ property }); }
    catch (e) { console.error(`Sync error (${property.key}):`, e); r.sync = { success: false, error: e.message }; failed = true; }
    results[property.key] = r;
  }
  console.log("Cron:", JSON.stringify(results));
  return res.status(failed ? 500 : 200).json({ results, timestamp: new Date().toISOString() });
}
