// ─────────────────────────────────────────────────────────────────────────────
// Liste des riads gérés par le dashboard (partagée entre l'app et le serveur).
// key   : identifiant stable (URL, sauvegardes, stockage local)
// docId : document Firestore riad/{docId}. Kasbah Blanca garde "data"
//         (historique) pour ne rien migrer.
// Ajouter un riad = ajouter une ligne ici (+ son logo dans public/).
// ─────────────────────────────────────────────────────────────────────────────
export const PROPERTIES = [
  { key: "kasbah-blanca", docId: "data",       name: "Kasbah Blanca", logo: "/logo-kasbah-blanca.png" },
  { key: "dar-yallah",    docId: "dar-yallah", name: "Dar Yallah",    logo: "/logo-dar-yallah.png", logoRound: true },
];

export const DEFAULT_PROPERTY = PROPERTIES[0];

export const findProperty = (key) => PROPERTIES.find((p) => p.key === key) || null;
