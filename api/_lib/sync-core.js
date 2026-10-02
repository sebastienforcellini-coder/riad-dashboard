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
import { db } from "./admin.js";
import { DEFAULT_PROPERTY } from "../../src/properties.js";

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

// ── Lecture du flux Booking.com ──────────────────────────────────────────────
// Booking n'indique ni nom ni code : chaque événement est une réservation
// (« CLOSED - Not available »). Les fermetures longues (> 30 nuits) sont
// considérées comme des fermetures manuelles et ignorées.
export function parseBookingIcs(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const bookings = [], skipped = [];
  for (const raw of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const get = (key) => { const m = raw.match(new RegExp(`^${key}[^:\\r\\n]*:(.*)$`, "im")); return m ? m[1].trim() : ""; };
    const uid = get("UID");
    const checkIn = toISO(get("DTSTART")), checkOut = toISO(get("DTEND"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) continue;
    const nights = nightsBetween(checkIn, checkOut);
    if (nights > 30) { skipped.push({ checkIn, checkOut, reason: "fermeture longue" }); continue; }
    const key = (uid.split("@")[0] || checkIn + checkOut).replace(/[^A-Za-z0-9]/g, "").slice(-10).toUpperCase();
    bookings.push({ id: "BK-" + key, checkIn, checkOut, nights, platform: "Booking.com", phone: "", name: "", uid });
  }
  return { bookings, skipped };
}

// ── Fusion des réservations (ne supprime jamais rien) ────────────────────────
// platform : plateforme du flux. skipOverlap : ignorer un nouvel événement qui
// chevauche une réservation d'une autre plateforme (cas Booking : dates déjà
// prises par Airbnb ou une réservation directe, importées d'un autre calendrier).
export function mergeBookings(existing, feed, { platform = "Airbnb", skipOverlap = false } = {}) {
  const out = existing.map((b) => ({ ...b }));
  let added = 0, known = 0, ignored = 0;
  for (const f of feed) {
    let i = out.findIndex((b) => b.id === f.id);
    if (i < 0) i = out.findIndex((b) => b.platform === platform && b.checkIn === f.checkIn && b.checkOut === f.checkOut);
    if (i >= 0) {
      const b = out[i];
      out[i] = {
        ...b,                                   // montant, nom, voyageurs, payé, notes : conservés
        checkIn: f.checkIn, checkOut: f.checkOut, nights: f.nights,
        phone: f.phone || b.phone || "",
        uid: f.uid || b.uid || "",
      };
      known++;
    } else if (skipOverlap && out.some((b) => b.platform !== platform && b.checkIn < f.checkOut && f.checkIn < b.checkOut)) {
      ignored++;
    } else {
      out.push({ ...f, amount: 0, guests: "", paid: false, nameEdited: false, notes: "" });
      added++;
    }
  }
  return { bookings: out, added, known, ignored };
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
async function fetchIcs(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; riad-sync/2.0)", "Accept": "text/calendar,*/*" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("flux invalide");
  return text;
}

function applyFeeds(data, feeds) {
  const before = data.bookings || [];
  let bookings = before, stats = {};
  if (feeds.airbnb) {
    const m = mergeBookings(bookings, feeds.airbnb.bookings, { platform: "Airbnb" });
    bookings = m.bookings; stats.airbnb = { added: m.added, known: m.known };
  }
  if (feeds.booking) {
    const m = mergeBookings(bookings, feeds.booking.bookings, { platform: "Booking.com", skipOverlap: true });
    bookings = m.bookings; stats.booking = { added: m.added, known: m.known, ignored: m.ignored, skipped: feeds.booking.skipped.length };
  }
  if (bookings.length < before.length) throw new Error("Garde-fou : la synchro aurait supprimé des réservations");
  // Blocages Airbnb : remplacés seulement si le flux Airbnb a été lu
  const oldAirbnb   = (data.blocked || []).filter((b) => b.type === "airbnb");
  const otherBlocks = (data.blocked || []).filter((b) => b.type !== "airbnb");
  const airbnbBlocks = filterBlocks(feeds.airbnb ? feeds.airbnb.blocked : oldAirbnb, bookings, data.ignoredBlocks || []);
  const newIds = new Set(before.map((b) => b.id));
  return { bookings, blocked: [...airbnbBlocks, ...otherBlocks], stats, newOnes: bookings.filter((b) => !newIds.has(b.id)) };
}

// property : un riad de src/properties.js (Kasbah Blanca par défaut)
export async function runSync({ dryRun = false, property = DEFAULT_PROPERTY } = {}) {
  const DOC = db.doc(`riad/${property.docId}`);
  const first = await DOC.get();
  if (!first.exists) return { success: false, property: property.key, message: "Riad pas encore configuré" };
  const cfg = first.data();
  const sources = { airbnb: cfg.icsUrl, booking: cfg.icsUrlBooking };
  if (!sources.airbnb && !sources.booking) return { success: false, property: property.key, message: "Aucune URL iCal configurée" };

  const feeds = {}, errors = {};
  if (sources.airbnb)  try { feeds.airbnb  = parseIcs(await fetchIcs(sources.airbnb)); } catch (e) { errors.airbnb = e.message; }
  if (sources.booking) try { feeds.booking = parseBookingIcs(await fetchIcs(sources.booking)); } catch (e) { errors.booking = e.message; }
  if (!feeds.airbnb && !feeds.booking) throw new Error("Aucun flux lisible : " + JSON.stringify(errors));

  const summary = (r) => {
    const a = r.stats.airbnb || { added: 0, known: 0 }, b = r.stats.booking || { added: 0, known: 0 };
    return { added: a.added + b.added, known: a.known + b.known };
  };

  if (dryRun) {
    const r = applyFeeds(cfg, feeds);
    return { success: true, property: property.key, dryRun: true, ...summary(r), stats: r.stats, errors,
      wouldAdd: r.newOnes.map(({ id, platform, checkIn, checkOut, nights }) => ({ id, platform, checkIn, checkOut, nights })) };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(DOC);
    const r = applyFeeds(snap.data() || {}, feeds);
    const now = new Date().toISOString();
    tx.update(DOC, clean({ bookings: r.bookings, blocked: r.blocked, lastSync: now, lastModified: now }));
    return { success: true, property: property.key, ...summary(r), stats: r.stats, errors, total: r.bookings.length, lastSync: now };
  });
}
