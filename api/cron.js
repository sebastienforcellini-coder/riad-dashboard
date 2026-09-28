// Tâche automatique (cron-job.org, toutes les 6 h), protégée par CRON_SECRET :
// 1. sauvegarde complète de la base, 2. synchro Airbnb + Booking
import { checkCaller } from "./_lib/admin.js";
import { snapshotBase } from "./_lib/backups.js";
import { runSync } from "./_lib/sync-core.js";

export default async function handler(req, res) {
  const caller = await checkCaller(req);
  if (!caller || caller.kind !== "cron") return res.status(401).json({ error: "Unauthorized" });
  let backup;
  try { backup = await snapshotBase("cron"); }
  catch (e) { console.error("Backup error:", e); backup = { error: e.message }; }
  try {
    const result = await runSync();
    console.log("Cron:", JSON.stringify({ backup, result }));
    return res.status(200).json({ ...result, backup, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("Cron sync error:", e);
    return res.status(500).json({ success: false, backup, error: e.message });
  }
}
