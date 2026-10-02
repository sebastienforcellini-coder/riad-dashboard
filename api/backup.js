// Sauvegarde manuelle immédiate (bouton 🛟 Secours), réservée aux utilisateurs autorisés
import { checkCaller } from "./_lib/admin.js";
import { snapshotBase } from "./_lib/backups.js";
import { propertyFrom } from "./_lib/property-param.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const caller = await checkCaller(req);
  if (!caller) return res.status(401).json({ success: false, error: "Non autorisé" });
  const property = propertyFrom(req);
  if (!property) return res.status(400).json({ success: false, error: "Riad inconnu" });
  try {
    return res.status(200).json({ success: true, ...(await snapshotBase(caller.email ? `manuel (${caller.email})` : "manuel", property)) });
  } catch (e) {
    console.error("Backup error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
