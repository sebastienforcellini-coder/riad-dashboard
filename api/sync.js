// Synchro manuelle (bouton ↻ du dashboard), réservée aux utilisateurs autorisés
// POST          : synchronise et écrit dans la base
// GET ?dry=1    : aperçu de ce qui serait ajouté, sans rien écrire
import { checkCaller } from "./_lib/admin.js";
import { runSync } from "./_lib/sync-core.js";

export default async function handler(req, res) {
  const dry = req.method === "GET" && req.query?.dry === "1";
  if (req.method !== "POST" && !dry) return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!(await checkCaller(req))) return res.status(401).json({ success: false, error: "Non autorisé" });
  try {
    return res.status(200).json(await runSync({ dryRun: dry }));
  } catch (e) {
    console.error("Sync error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
