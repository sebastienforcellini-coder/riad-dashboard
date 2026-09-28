// Synchro manuelle (bouton ↻ du dashboard)
// POST          : synchronise et écrit dans la base
// GET ?dry=1    : aperçu de ce qui serait ajouté, sans rien écrire
import { runSync } from "./_lib/sync-core.js";

export default async function handler(req, res) {
  const dry = req.method === "GET" && req.query?.dry === "1";
  if (req.method !== "POST" && !dry) return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const result = await runSync({ dryRun: dry });
    return res.status(200).json(result);
  } catch (e) {
    console.error("Sync error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
