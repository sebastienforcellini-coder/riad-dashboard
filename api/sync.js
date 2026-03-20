import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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

function parseIcs(text) {
  const bookings = [], blocked = [];
  for (const raw of text.split("BEGIN:VEVENT").slice(1)) {
    const get = (key) => {
      const m = raw.match(new RegExp(`${key}[^:]*:([^\\r\\n]+(?:\\r?\\n[ \\t][^\\r\\n]+)*)`, "i"));
      return m ? m[1].replace(/\r?\n[ \t]/g, "").trim() : "";
    };
    const parseDate = (s) => { const d = s.replace(/[^\d]/g,"").slice(0,8); return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`; };
    const summary = get("SUMMARY"), desc = get("DESCRIPTION");
    const checkIn = parseDate(get("DTSTART")), checkOut = parseDate(get("DTEND"));
    const nights  = Math.round((new Date(checkOut)-new Date(checkIn))/86400000);
    const codeM   = desc.match(/details\/([A-Z0-9]+)/);
    const phoneM  = desc.match(/Last 4 Digits\):\s*(\d{4})/);
    const uid     = get("UID");
    const code    = codeM ? codeM[1] : uid.split("@")[0].slice(-8).toUpperCase();
    const phone   = phoneM ? "…"+phoneM[1] : "";
    const isRes   = /reserved/i.test(summary) && !/not available/i.test(summary);
    let name = "";
    const nameFromSummary = summary.replace(/airbnb/i,"").replace(/reserved/i,"").replace(/\(.*?\)/g,"").trim();
    if (nameFromSummary.length > 1 && nameFromSummary.length < 50) name = nameFromSummary;
    // Ajouter uid aux blocs pour la liste noire
    if (isRes) bookings.push({ id:code, checkIn, checkOut, nights, platform:"Airbnb", phone, name, amount:0, uid });
    else       blocked.push({ start:checkIn, end:checkOut, label:"Indisponible", type:"airbnb", uid });
  }
  return { bookings, blocked };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const docRef = doc(db, "riad", "data");
    const snap   = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "No data in Firebase" });

    const data   = snap.data();
    const icsUrl = data.icsUrl;
    if (!icsUrl) return res.status(200).json({ success: false, message: "No ICS URL configured" });

    const icsRes = await fetch(icsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; riad-sync/1.0)" }
    });
    if (!icsRes.ok) throw new Error("ICS fetch failed: " + icsRes.status);
    const text = await icsRes.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Invalid ICS content");

    const { bookings: newB, blocked: newBl } = parseIcs(text);

    // Préserver TOUTES les données existantes — ne jamais écraser les montants ni les noms édités
    const existing = Object.fromEntries(
      (data.bookings || []).map(b => [b.id, {
        amount:     b.amount     || 0,
        name:       b.name       || "",
        guests:     b.guests     || "",
        paid:       b.paid       || false,
        nameEdited: b.nameEdited || false,  // ← flag nom édité manuellement
      }])
    );

    const manuals = (data.bookings || []).filter(b => b.id.startsWith("MAN-"));
    // Garder les réservations Airbnb passées même si absentes du iCal
    const todayStr = new Date().toISOString().slice(0,10);
    const pastAirbnb = (data.bookings || []).filter(b =>
      !b.id.startsWith("MAN-") && b.checkOut <= todayStr && !newB.some(nb => nb.id === b.id)
    );
    const airbnb  = newB.map(b => ({
      ...b,
      amount:     existing[b.id]?.amount ?? 0,
      name:       existing[b.id]?.nameEdited
                    ? existing[b.id].name
                    : (existing[b.id]?.name || b.name || ""),
      guests:     existing[b.id]?.guests ?? "",
      paid:       existing[b.id]?.paid   ?? false,
      nameEdited: existing[b.id]?.nameEdited ?? false,
      notes:      existing[b.id]?.notes ?? "",
    }));

    // Blocages : filtrer selon liste noire + 360 jours + réservations existantes
    const ignoredBlocks = data.ignoredBlocks || [];
    const in360Days = new Date();
    in360Days.setDate(in360Days.getDate() + 360);

    const personal       = (data.blocked || []).filter(b => b.type === "personal");
    const allBookings    = [...airbnb, ...manuals];
    const filteredAirbnb = newBl.filter(bl => {
      const uid = bl.uid || (bl.start + "_" + bl.end);
      if (ignoredBlocks.includes(uid)) return false;
      if (new Date(bl.start) > in360Days) return false;
      // Vérifier que toute la période est couverte (départ matin = arrivée après-midi OK)
      let cursor = bl.start;
      let fullyCovered = true;
      while (cursor < bl.end) {
        const covering = allBookings.find(bk => bk.checkIn <= cursor && bk.checkOut > cursor);
        if (!covering) {
          // Tolérance 1 jour : départ matin / arrivée lendemain
          const nextDay = new Date(cursor); nextDay.setDate(nextDay.getDate()+1);
          const nd = nextDay.toISOString().slice(0,10);
          const next = allBookings.find(bk => bk.checkIn === nd);
          if (!next) { fullyCovered = false; break; }
          cursor = next.checkOut;
        } else {
          cursor = covering.checkOut;
        }
      }
      if (fullyCovered) return false;
      return true;
    });

    await setDoc(docRef, {
      ...data,
      bookings: [...airbnb, ...pastAirbnb, ...manuals],
      blocked:  [...filteredAirbnb, ...personal],
      lastSync: new Date().toISOString(),
    });

    const added = newB.filter(b => !existing[b.id]).length;
    return res.status(200).json({
      success: true,
      message: `Calendrier synchronisé · ${newB.length} réservations${added > 0 ? ` · ${added} nouvelles` : ""}`,
    });

  } catch (e) {
    console.error("Sync error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
