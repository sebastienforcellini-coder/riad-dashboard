// Synchro automatique (cron-job.org, toutes les 6 h), protégée par CRON_SECRET
import { checkCaller } from "./_lib/admin.js";
import { runSync } from "./_lib/sync-core.js";

export default async function handler(req, res) {
  const caller = await checkCaller(req);
  if (!caller || caller.kind !== "cron") return res.status(401).json({ error: "Unauthorized" });
  try {
    const result = await runSync();
    console.log("Cron sync:", JSON.stringify(result));
    return res.status(200).json({ ...result, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("Cron sync error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
