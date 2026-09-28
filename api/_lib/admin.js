// Accès serveur à Firebase via le compte de service (Admin SDK).
// La clé vit uniquement dans la variable Vercel FIREBASE_SERVICE_ACCOUNT.
import admin from "firebase-admin";

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquante");
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

export const db = admin.firestore();
export const auth = admin.auth();

// Liste des e-mails autorisés : document Firestore config/access, champ emails
export async function allowedEmails() {
  const snap = await db.doc("config/access").get();
  return (snap.exists ? snap.data().emails || [] : []).map((e) => String(e).toLowerCase().trim());
}

// Vérifie l'en-tête Authorization : jeton Firebase d'un utilisateur autorisé,
// ou CRON_SECRET. Renvoie l'identité, ou null si refusé.
export async function checkCaller(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return { kind: "cron" };
  try {
    const decoded = await auth.verifyIdToken(token);
    const email = (decoded.email || "").toLowerCase();
    if (!decoded.email_verified || !(await allowedEmails()).includes(email)) return null;
    return { kind: "user", email };
  } catch { return null; }
}
