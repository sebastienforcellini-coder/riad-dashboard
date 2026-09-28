// ─────────────────────────────────────────────────────────────────────────────
// Synchro iCal Airbnb → Firestore. Logique unique, utilisée par :
//   /api/sync  (bouton ↻ du dashboard)
//   /api/cron  (cron-job.org, toutes les 6 h)
// Règles :
//   1. On lit TOUJOURS Firestore (jamais le cache d'un appareil).
//   2. On n'écrit QUE bookings, blocked, lastSync, lastModified (transaction).
//   3. On ne supprime JAMAIS une réservation existante.
//   4. Une réservation du flux est reconnue par son code OU par ses dates.
//   5. Flux illisible → aucune écriture.
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, runTransaction } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCcNPo3-u0tAQjZdvJ7ns1pIpz-Puc6p7Q",
  authDomain: "riad-dashboard.firebaseapp.com",
  projectId: "riad-dashboard",
  storageBucket: "riad-dashboard.firebasestorage.app",
  messagingSenderId: "1057977040208",
  appId: "1:1057977040208:web:48f77a326d8cbbb777c055",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const DOC = doc(db, "riad", "data");

const toISO = (s) => { const d = String(s).replace(/[^\d]/g, "").slice(0, 8); return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`; };
const nightsBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore refuse les undefined

// ── Lecture du flux ──────────────────────────────────────────────────────────
export function parseIcs(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const bookings = [], blocked = [];
  for (const raw of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const get = (key) => { const m = raw.match(new RegExp(`^${key}[^:\\r\\n]*:(.*)$`, "im")); return m ? m[1].trim() : ""; };
    const summary = get("SUMMARY"), desc = get("DESCRIPTION").replace(/\\n/g, "\n"), uid = get("UID");
    const checkIn = toISO(get("DTSTART")), checkOut = toISO(get("DTEND"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) continue;
    const codeM  = desc.match(/details\/([A-Z0-9]{6,})/) || desc.match(/\b(HM[A-Z0-9]{8})\b/);
    const phoneM = desc.match(/Last 4 Digits\):\s*(\d{4})/i);
    const isRes  = /reserved/i.test(summary) && !/not available/i.test(summary);
    if (isRes) {
      bookings.push({
        id: codeM ? codeM[1] : "ICS-" + uid.split("@")[0].slice(-10).toUpperCase(),
        checkIn, checkOut, nights: nightsBetween(checkIn, checkOut),
        platform: "Airbnb", phone: phoneM ? "…" + phoneM[1] : "", name: "", uid,
      });
    } else {
      blocked.push({ start: checkIn, end: checkOut, label: "Indisponible", type: "airbnb", uid });
    }
  }
  return { bookings, blocked };
}

// ── Fusion des réservations (ne supprime jamais rien) ────────────────────────
export function mergeBookings(existing, feed) {
  const out = existing.map((b) => ({ ...b }));
  let added = 0, known = 0;
  for (const f of feed) {
    let i = out.findIndex((b) => b.id === f.id);
    if (i < 0) i = out.findIndex((b) => b.platform === "Airbnb" && b.checkIn === f.checkIn && b.checkOut === f.checkOut);
    if (i >= 0) {
      const b = out[i];
      out[i] = {
        ...b,                                   // montant, nom, voyageurs, payé, notes : conservés
        checkIn: f.checkIn, checkOut: f.checkOut, nights: f.nights,
        phone: f.phone || b.phone || "",
        uid: f.uid || b.uid || "",
      };
      known++;
    } else {
      out.push({ ...f, amount: 0, guests: "", paid: false, nameEdited: false, notes: "" });
      added++;
    }
  }
  return { bookings: out, added, known };
}

// ── Blocages Airbnb : on retire ceux déjà couverts par une réservation ───────
export function filterBlocks(feedBlocks, bookings, ignored = []) {
  const limit = addDays(new Date().toISOString().slice(0, 10), 360);
  const covered = (day) => bookings.some((b) => b.checkIn <= day && day < b.checkOut);
  return feedBlocks.filter((bl) => {
    if (ignored.includes(bl.uid || `${bl.start}_${bl.end}`)) return false;
    if (bl.start > limit) return false;
    for (let d = bl.start; d < bl.end; d = addDays(d, 1)) if (!covered(d)) return true;
    return false;
  });
}

// ── Point d'entrée ───────────────────────────────────────────────────────────
export async function runSync() {
  const first = await getDoc(DOC);
  if (!first.exists()) throw new Error("Base Firestore introuvable");
  const icsUrl = first.data().icsUrl;
  if (!icsUrl) return { success: false, message: "Aucune URL iCal configurée" };

  const r = await fetch(icsUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; riad-sync/2.0)" } });
  if (!r.ok) throw new Error(`Flux iCal injoignable (HTTP ${r.status})`);
  const text = await r.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Flux iCal invalide");
  const feed = parseIcs(text);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(DOC);
    const data = snap.data() || {};
    const before = data.bookings || [];
    const { bookings, added, known } = mergeBookings(before, feed.bookings);
    if (bookings.length < before.length) throw new Error("Garde-fou : la synchro aurait supprimé des réservations");

    const otherBlocks  = (data.blocked || []).filter((b) => b.type !== "airbnb");
    const airbnbBlocks = filterBlocks(feed.blocked, bookings, data.ignoredBlocks || []);
    const now = new Date().toISOString();

    tx.update(DOC, clean({ bookings, blocked: [...airbnbBlocks, ...otherBlocks], lastSync: now, lastModified: now }));
    return { success: true, added, known, total: bookings.length, inFeed: feed.bookings.length, lastSync: now };
  });
}
