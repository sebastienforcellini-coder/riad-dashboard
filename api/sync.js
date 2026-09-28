// Synchro manuelle (bouton ↻ du dashboard)
import { runSync } from "./_lib/sync-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const result = await runSync();
    return res.status(200).json(result);
  } catch (e) {
    console.error("Sync error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
