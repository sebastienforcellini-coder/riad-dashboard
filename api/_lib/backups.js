// Sauvegardes automatiques de la base (lecture seule pour l'application).
// backups/{id}              : métadonnées légères (date, compteurs) pour la liste
// backups/{id}/payload/data : copie complète de riad/data
import { db } from "./admin.js";

const KEEP_DAYS = 14;

export async function snapshotBase(reason = "cron") {
  const snap = await db.doc("riad/data").get();
  if (!snap.exists) return { skipped: true, reason: "base vide" };
  const data = snap.data();
  const now = new Date();
  const id = now.toISOString().replace(/[:.]/g, "-");
  const ref = db.collection("backups").doc(id);
  const counts = {
    bookings:  (data.bookings  || []).length,
    expenses:  (data.expenses  || []).length,
    recurring: (data.recurring || []).length,
  };
  const batch = db.batch();
  batch.set(ref, { createdAt: now.toISOString(), reason, counts });
  batch.set(ref.collection("payload").doc("data"), { ...data, version: 1, backedUpAt: now.toISOString() });
  await batch.commit();

  // Purge au-delà de KEEP_DAYS
  const limit = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString();
  const old = await db.collection("backups").where("createdAt", "<", limit).get();
  for (const d of old.docs) {
    await d.ref.collection("payload").doc("data").delete();
    await d.ref.delete();
  }
  return { id, counts, purged: old.size };
}
