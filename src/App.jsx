import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";

const translations = {
  fr: {
    title:"Kasbah Blanca Marrakech",subtitle:"Tableau de bord locatif",
    saving:"Sauvegarde…",synced:"Synchronisé",offline:"Hors ligne",
    syncOk:"Calendriers à jour à",syncFail:"Synchro échouée",configSync:"Configurer sync",
    autoSyncOn:"Auto-sync ON",sync:"Sync",backup:"💾 Backup",restore:"📂 Restore",
    syncPanelTitle:"🔄 Synchronisation automatique Airbnb",
    syncPanelDesc:"Airbnb → Calendrier → Lien iCal → copiez l'URL ici. Le calendrier se rafraîchit automatiquement tous les jours à 6h.",
    syncNow:"↻ Synchroniser maintenant",syncDelete:"✕ Supprimer",lastSync:"Dernière sync",
    syncDelay:"⚠️ Le flux iCal Airbnb est mis à jour avec 15–30 min de délai. Pour une résa toute récente, importez le .ics manuellement via la zone de dépôt.",
    rateLabel:"Taux de change :",commissionLabel:"Commission conciergerie (Airbnb, Booking) :",
    alertsTitle:"Arrivées et départs, 7 prochains jours",
    enableNotif:"🔔 Activer notifications",notifOn:"🔔 Notifs ON · Désactiver",
    arrivalToday:"Arrivée aujourd'hui !",arrivalTomorrow:"Arrivée demain",arrivalIn:"Arrivée dans",
    departureToday:"Départ aujourd'hui !",departureTomorrow:"Départ demain",departureIn:"Départ dans",days:"j",
    netRevenue:"Revenus nets",expenses:"Dépenses",netProfit:"Bénéfice net",
    occupation:"Occupation",avgNight:"Moy. / nuit",payingNights:"n payantes",
    persoNights:"n perso",onAmounts:"sur montants saisis",gross:"Brut",margin:"Marge",
    pastBookings:"Réservations échues",futureBookings:"Réservations à venir",caTotal:"CA total",
    staysDone:"séjour terminé",staysDonePlural:"séjours terminés",
    staysAhead:"séjour à venir",staysAheadPlural:"séjours à venir",
    encaisse:"encaissé",aVenir:"à venir",noBookings:"Aucune réservation.",
    tabCalendar:"Calendrier",tabBookings:"Réservations",tabChart:"Graphique",tabExpenses:"Dépenses",
    calendarTitle:"Calendrier",allMonths:"Tous les mois",upcoming:"À venir",
    available:"Disponible",reserved:"Réservé",perso:"Perso",today:"Aujourd'hui",
    personalPeriods:"🔵 Périodes bloquées (vacances perso)",
    noPersonalPeriods:"Aucune période personnelle bloquée.",
    blockDates:"+ Bloquer dates ↗",
    airbnbUnavail:"Indisponibilités Airbnb, cliquez \"→ Réservation\" si c'est une résa directe",
    toBooking:"→ Réservation",
    addBooking:"+ Ajouter ↗",bookingsSummary:"réservations",noAmountSet:"sans montant",
    colArrival:"Arrivée",colDeparture:"Départ",colCode:"Code",colName:"Nom",
    colNights:"Nuits",colGuests:"Occupants",colRate:"Tarif/nuit",colTotal:"Total séjour",
    editBookingTitle:"Modifier la réservation",save:"Enregistrer",cancel:"Annuler",
    chartTitle:"Revenus et dépenses",nightsTitle:"Nuits réservées par mois",paying:"Payantes",
    forecastTitle:"📈 Prévisionnel",collected:"Encaissé",confirmed:"Confirmé à venir",
    projected:"Projection annuelle",fillRate:"Taux de remplissage",
    seriesRevenue:"Revenus",seriesExpenses:"Dépenses",seriesProfit:"Bénéfice",
    expenseTitle:"Dépenses récurrentes",addExpense:"+ Ajouter ↗",
    generate:"Générer",colDate:"Date",colCategory:"Catégorie",colDesc:"Description",
    colAmount:"Montant",total:"Total",byCategory:"Répartition par catégorie",
    months:["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"],
    dropIcsLabel:"📅 Calendrier Airbnb (.ics)",
    dropIcsSub:"Glissez-déposez ou cliquez · réservations & blocages",
    dropCsvLabel:"💶 Historique finances (.csv)",
    dropCsvSub:"Export Airbnb → Finances → Transactions · montants auto",
    hPayment:"Paiement",hClient:"Client",hNetTotal:"Total net",hPlatform:"Plateforme",
    frmFrom:"Du",frmTo:"Au",frmReason:"Motif",frmName:"Nom du client",
    frmPhone:"Tél. (4 derniers)",frmPlatform:"Plateforme",frmGuests:"Nb. occupants",
    frmAmount:"Montant (MAD)",frmCategory:"Catégorie",frmDesc:"Description",frmDate:"Date",
    frmDesc2:"Ex : Abonnement Internet",frmDescExp:"Ex : Nettoyage fin de séjour",
    frmPlaceholderName:"Jean Dupont",frmPlaceholderPhone:"…1234",frmPlaceholderAmount:"1500",
    frmPlaceholderGuests:"2",frmPlaceholderAmountExp:"600",frmPlaceholderAmountRec:"500",
    newBlocked:"Nouvelle période bloquée",newRecurring:"Nouvelle dépense récurrente",
    newDirectBooking:"Réservation directe (hors Airbnb)",newExpenseTitle:"Nouvelle dépense",
    generateYear:"Générer",totalStays:"Total séjours",enterRate:"Saisir tarif/nuit ↗",
    toEnter:"À saisir",paidStatus:"✅ Payé",unpaidStatus:"⏳ En attente",
    markPaid:"Marquer payé",markUnpaid:"Marquer non payé",
    nightSingle:"nuit",nightPlural:"nuits",daySingle:"jour",dayPlural:"jours",
    personSingle:"personne",personPlural:"personnes",
    noExpYear:"Aucune dépense pour",noBookYear:"Aucune réservation pour",
    importIcsMsg:"Importez votre fichier .ics pour afficher le calendrier.",
    totalPayingLabel:"Total payantes",totalPersoLabel:"Total perso",
    basedOn:"Basé sur",perMonth:"/mois",
    annualProgress:"Progression CA annuel",ofTarget:"de l'objectif projeté",
    notYetBooked:"Non encore réservé",closeBtn:"✕ Fermer",
    expensesCount:"dépenses",
    toastAmountSaved:"✅ Montant enregistré",toastBookingUpdated:"✅ Réservation mise à jour",
    toastExpenseUpdated:"✅ Dépense mise à jour",toastPaymentUpdated:"✅ Statut paiement mis à jour",
    toastBookingAdded:"✅ Réservation ajoutée",toastExpenseAdded:"✅ Dépense ajoutée",
    toastBlockedAdded:"✅ Période bloquée ajoutée",toastRecurringAdded:"✅ Dépense récurrente ajoutée",
    toastExcelDL:"✅ Export Excel téléchargé",toastJsonDL:"✅ Sauvegarde JSON téléchargée",
    toastBookingDel:"Réservation supprimée",toastExpenseDel:"Dépense supprimée",
    toastBlockedDel:"Période supprimée",toastAirbnbDel:"Blocage supprimé",
    toastRecurringDel:"Récurrente supprimée",
    toastConverted:"✅ Converti en réservation, saisissez le montant",
    toastConvertedFull:"✅ Converti en réservation, saisissez le nom et le montant",
    toastAlreadyGenerated:"⚠️ Ces mois sont déjà générés",
    toastNotifOn:"✅ Notifications activées !",toastNotifOff:"🔕 Notifications désactivées",
    toastNotifFail:"❌ Notifications non supportées sur ce navigateur",toastNotifDenied:"❌ Permission refusée",
    toastIcsEmpty:"❌ Aucun événement trouvé dans ce fichier.",toastIcsError:"❌ Erreur de lecture du fichier .ics",
    toastCsvEmpty:"❌ Aucun montant trouvé, vérifiez que c'est bien l'export Finances Airbnb.",
    toastCsvError:"❌ Erreur de lecture du fichier CSV",
    toastJsonInvalid:"❌ Fichier JSON invalide",toastSyncFail:"❌ Sync échouée, vérifiez l'URL Airbnb",
    toastSyncCalError:"❌ Erreur de lecture du calendrier",
    recapTitle:"Récapitulatif de réservation",recapClient:"Client",recapCode:"Code",
    recapPlatform:"Plateforme",recapArrival:"Arrivée",recapDeparture:"Départ",
    recapDuration:"Durée",recapGuests:"Occupants",recapRateGross:"Tarif / nuit (brut)",
    recapCommission:"Commission",recapTotal:"Total séjour",recapPayment:"Paiement",
    recapNight:"nuit",recapNights:"nuits",recapPerson:"personne",recapPersons:"personnes",
    xlsBookings:"Réservations",xlsExpenses:"Dépenses",xlsCatBreakdown:"Dépenses par catégorie",
    xlsByPlatform:"Par plateforme",xlsMonthly:"Bilan mensuel",
    editBookingModalTitle:"✏️ Modifier la réservation",editExpenseModalTitle:"✏️ Modifier la dépense",
    cats:{"Ménage":"Ménage","Gouvernante":"Gouvernante","Pisciniste":"Pisciniste","Frais Airbnb":"Frais Airbnb","Maintenance":"Maintenance","Fournitures":"Fournitures","Taxes/CFE":"Taxes/CFE","Internet":"Internet","Eau/Électricité":"Eau/Électricité","Assurance":"Assurance","Autre":"Autre"},
  },
  en: {
    title:"Kasbah Blanca Marrakech",subtitle:"Rental dashboard",
    saving:"Saving…",synced:"Synced",offline:"Offline",
    syncOk:"Calendars synced at",syncFail:"Sync failed",configSync:"Setup sync",
    autoSyncOn:"Auto-sync ON",sync:"Sync",backup:"💾 Backup",restore:"📂 Restore",
    syncPanelTitle:"🔄 Automatic Airbnb sync",
    syncPanelDesc:"Airbnb → Calendar → iCal link → paste the URL here. Calendar refreshes automatically every day at 6am.",
    syncNow:"↻ Sync now",syncDelete:"✕ Remove",lastSync:"Last sync",
    syncDelay:"⚠️ Airbnb's iCal feed updates with a 15–30 min delay. For a brand-new booking, import the .ics file manually via the drop zone.",
    rateLabel:"Exchange rate:",commissionLabel:"Concierge commission (Airbnb, Booking):",
    alertsTitle:"Arrivals and departures, next 7 days",
    enableNotif:"🔔 Enable notifications",notifOn:"🔔 Notifs ON · Disable",
    arrivalToday:"Arrival today!",arrivalTomorrow:"Arrival tomorrow",arrivalIn:"Arrival in",
    departureToday:"Departure today!",departureTomorrow:"Departure tomorrow",departureIn:"Departure in",days:"d",
    netRevenue:"Net revenue",expenses:"Expenses",netProfit:"Net profit",
    occupation:"Occupancy",avgNight:"Avg. / night",payingNights:"paying nights",
    persoNights:"personal nights",onAmounts:"based on entered amounts",gross:"Gross",margin:"Margin",
    pastBookings:"Past bookings",futureBookings:"Upcoming bookings",caTotal:"Total revenue",
    staysDone:"stay completed",staysDonePlural:"stays completed",
    staysAhead:"stay ahead",staysAheadPlural:"stays ahead",
    encaisse:"collected",aVenir:"upcoming",noBookings:"No bookings.",
    tabCalendar:"Calendar",tabBookings:"Bookings",tabChart:"Chart",tabExpenses:"Expenses",
    calendarTitle:"Calendar",allMonths:"All months",upcoming:"Upcoming",
    available:"Available",reserved:"Reserved",perso:"Personal",today:"Today",
    personalPeriods:"🔵 Blocked periods (personal)",
    noPersonalPeriods:"No personal periods blocked.",
    blockDates:"+ Block dates ↗",
    airbnbUnavail:"Airbnb unavailabilities, click \"→ Booking\" if it's a direct booking",
    toBooking:"→ Booking",
    addBooking:"+ Add ↗",bookingsSummary:"bookings",noAmountSet:"no amount",
    colArrival:"Arrival",colDeparture:"Departure",colCode:"Code",colName:"Name",
    colNights:"Nights",colGuests:"Guests",colRate:"Rate/night",colTotal:"Total stay",
    editBookingTitle:"Edit booking",save:"Save",cancel:"Cancel",
    chartTitle:"Revenue and expenses",nightsTitle:"Booked nights per month",paying:"Paying",
    forecastTitle:"📈 Forecast",collected:"Collected",confirmed:"Confirmed upcoming",
    projected:"Annual projection",fillRate:"Fill rate",
    seriesRevenue:"Revenue",seriesExpenses:"Expenses",seriesProfit:"Profit",
    expenseTitle:"Recurring expenses",addExpense:"+ Add ↗",
    generate:"Generate",colDate:"Date",colCategory:"Category",colDesc:"Description",
    colAmount:"Amount",total:"Total",byCategory:"Breakdown by category",
    months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    dropIcsLabel:"📅 Airbnb Calendar (.ics)",
    dropIcsSub:"Drag & drop or click · bookings & blocks",
    dropCsvLabel:"💶 Finance history (.csv)",
    dropCsvSub:"Airbnb export → Finances → Transactions · auto amounts",
    hPayment:"Payment",hClient:"Guest",hNetTotal:"Net total",hPlatform:"Platform",
    frmFrom:"From",frmTo:"To",frmReason:"Reason",frmName:"Guest name",
    frmPhone:"Phone (last 4)",frmPlatform:"Platform",frmGuests:"No. of guests",
    frmAmount:"Amount (MAD)",frmCategory:"Category",frmDesc:"Description",frmDate:"Date",
    frmDesc2:"E.g. Internet subscription",frmDescExp:"E.g. End-of-stay cleaning",
    frmPlaceholderName:"John Smith",frmPlaceholderPhone:"…1234",frmPlaceholderAmount:"1500",
    frmPlaceholderGuests:"2",frmPlaceholderAmountExp:"600",frmPlaceholderAmountRec:"500",
    newBlocked:"New blocked period",newRecurring:"New recurring expense",
    newDirectBooking:"Direct booking (non-Airbnb)",newExpenseTitle:"New expense",
    generateYear:"Generate",totalStays:"Total stays",enterRate:"Enter rate/night ↗",
    toEnter:"To enter",paidStatus:"✅ Paid",unpaidStatus:"⏳ Pending",
    markPaid:"Mark as paid",markUnpaid:"Mark as unpaid",
    nightSingle:"night",nightPlural:"nights",daySingle:"day",dayPlural:"days",
    personSingle:"person",personPlural:"people",
    noExpYear:"No expenses for",noBookYear:"No bookings for",
    importIcsMsg:"Import your .ics file to display the calendar.",
    totalPayingLabel:"Total paying",totalPersoLabel:"Total personal",
    basedOn:"Based on",perMonth:"/mo",
    annualProgress:"Annual revenue progress",ofTarget:"of projected target",
    notYetBooked:"Not yet booked",closeBtn:"✕ Close",
    expensesCount:"expenses",
    toastAmountSaved:"✅ Amount saved",toastBookingUpdated:"✅ Booking updated",
    toastExpenseUpdated:"✅ Expense updated",toastPaymentUpdated:"✅ Payment status updated",
    toastBookingAdded:"✅ Booking added",toastExpenseAdded:"✅ Expense added",
    toastBlockedAdded:"✅ Period blocked",toastRecurringAdded:"✅ Recurring expense added",
    toastExcelDL:"✅ Excel export downloaded",toastJsonDL:"✅ JSON backup downloaded",
    toastBookingDel:"Booking deleted",toastExpenseDel:"Expense deleted",
    toastBlockedDel:"Period deleted",toastAirbnbDel:"Block deleted",
    toastRecurringDel:"Recurring deleted",
    toastConverted:"✅ Converted to booking, enter the amount",
    toastConvertedFull:"✅ Converted to booking, enter name and amount",
    toastAlreadyGenerated:"⚠️ These months are already generated",
    toastNotifOn:"✅ Notifications enabled!",toastNotifOff:"🔕 Notifications disabled",
    toastNotifFail:"❌ Notifications not supported on this browser",toastNotifDenied:"❌ Permission denied",
    toastIcsEmpty:"❌ No events found in this file.",toastIcsError:"❌ Error reading the .ics file",
    toastCsvEmpty:"❌ No amounts found, make sure this is the Airbnb Finance export.",
    toastCsvError:"❌ Error reading the CSV file",
    toastJsonInvalid:"❌ Invalid JSON file",toastSyncFail:"❌ Sync failed, check the Airbnb URL",
    toastSyncCalError:"❌ Error reading the calendar",
    recapTitle:"Booking summary",recapClient:"Guest",recapCode:"Code",
    recapPlatform:"Platform",recapArrival:"Arrival",recapDeparture:"Departure",
    recapDuration:"Duration",recapGuests:"Guests",recapRateGross:"Rate / night (gross)",
    recapCommission:"Commission",recapTotal:"Total stay",recapPayment:"Payment",
    recapNight:"night",recapNights:"nights",recapPerson:"person",recapPersons:"people",
    xlsBookings:"Bookings",xlsExpenses:"Expenses",xlsCatBreakdown:"Expenses by category",
    xlsByPlatform:"By platform",xlsMonthly:"Monthly summary",
    editBookingModalTitle:"✏️ Edit booking",editExpenseModalTitle:"✏️ Edit expense",
    cats:{"Ménage":"Cleaning","Gouvernante":"Housekeeper","Pisciniste":"Pool technician","Frais Airbnb":"Airbnb fees","Maintenance":"Maintenance","Fournitures":"Supplies","Taxes/CFE":"Taxes/CFE","Internet":"Internet","Eau/Électricité":"Water/Electricity","Assurance":"Insurance","Autre":"Other"},
  }
};

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCcNPo3-u0tAQjZdvJ7ns1pIpz-Puc6p7Q",
  // En production, l'authentification passe par le domaine du site (proxy /__/auth
  // dans vercel.json) : indispensable pour Safari / iPhone qui bloquent les
  // cookies tiers. En local, on garde le domaine Firebase par défaut.
  authDomain: typeof window !== "undefined" && window.location.hostname === "riad-dashboard.vercel.app"
    ? "riad-dashboard.vercel.app" : "riad-dashboard.firebaseapp.com",
  projectId: "riad-dashboard",
  storageBucket: "riad-dashboard.firebasestorage.app",
  messagingSenderId: "1057977040208",
  appId: "1:1057977040208:web:48f77a326d8cbbb777c055",
};
const app    = initializeApp(firebaseConfig);
const db     = getFirestore(app);
const DOC_REF = doc(db, "riad", "data");
const authApi = getAuth(app);

// ── Parsers ───────────────────────────────────────────────────────────────────
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
    if (!name) {
      const nameM = desc.match(/(?:Name|Guest|Nom)[:\s]+([A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)+)/);
      if (nameM) name = nameM[1];
    }
    if (isRes) bookings.push({ id:code, checkIn, checkOut, nights, platform:"Airbnb", phone, name, amount:0, uid });
    else       blocked.push({ start:checkIn, end:checkOut, label:"Indisponible", type:"airbnb" });
  }
  return { bookings, blocked };
}

function parseCsvAirbnb(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return {};
  const headers = lines[0].split(",").map(h => h.replace(/"/g,"").trim().toLowerCase());
  const amounts = {};
  for (const line of lines.slice(1)) {
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || line.split(",");
    const clean = cols.map(c => c.replace(/^"|"$/g,"").trim());
    const row   = Object.fromEntries(headers.map((h,i) => [h, clean[i]||""]));
    const code  = row["confirmation code"] || row["code de confirmation"] || row["reservation code"] || "";
    const gross = row["gross earnings"] || row["amount"] || row["montant"] || row["total"] || row["payout"] || "";
    const val   = parseFloat(gross.replace(/[^0-9.-]/g,""));
    if (code && !isNaN(val) && val > 0) amounts[code.toUpperCase()] = val;
  }
  return amounts;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EXPENSE_CATS = ["Ménage","Gouvernante","Pisciniste","Frais Airbnb","Maintenance","Fournitures","Taxes/CFE","Internet","Eau/Électricité","Assurance","Autre"];
const PLATFORMS    = ["Direct","Airbnb","Booking.com","Gens de confiance","Perso","Autre"];
// Plateformes gérées par la conciergerie : commission appliquée sur le montant
const COMM_PLATFORMS = ["Airbnb","Booking.com"];
const hasComm = (b) => COMM_PLATFORMS.includes(b?.platform);
const MONTHS_FR    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MONTHS_EN    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STORAGE_KEY  = "riad_dashboard_v1";
const DEFAULT_RATE = 10.83;
// Couleurs : définies dans src/theme.css (clair + sombre)
const C_RESERVED   = "var(--kb-booked)";
const C_BLOCKED    = "var(--kb-perso)";
const C_AVAIL      = "var(--kb-avail-bg)";
const C_TODAY_BG   = "var(--kb-today-bg)";
const C_TODAY_FG   = "var(--kb-today-fg)";
// Bouton « Activer notifications » masqué : ne fonctionne qu'app ouverte et pas sur iPhone (à remplacer par des notifications serveur)
const SHOW_NOTIF_BTN = false;

const fmtMAD  = (n) => new Intl.NumberFormat("fr-MA",{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n)) + " MAD";
const fmtEUR  = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n));
const fmt     = (n, rate, cur) => cur === "EUR" ? fmtEUR(n / rate) : fmtMAD(n);
const fmtBoth = (n, rate)      => fmtMAD(n) + "  ·  " + fmtEUR(n / rate);
const fmtDate = (d, locale)    => new Date(d).toLocaleDateString(locale,{day:"2-digit",month:"short",year:"numeric"});
const today   = ()             => new Date().toISOString().slice(0,10);

function loadStorage() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
// ── Garde-fou anti-écrasement ───────────────────────────────────────────────
// Nombre de réservations connu dans Firestore (mis à jour à chaque lecture).
// Toute écriture qui en ferait disparaître plus de GUARD_MAX_DROP est bloquée,
// sauf force explicite (Restore confirmé par l'utilisateur).
let remoteBookingCount = null;
const GUARD_MAX_DROP = 3;
const noteRemote = (data) => { if (data && Array.isArray(data.bookings)) remoteBookingCount = data.bookings.length; };

async function saveCloud(data, { force = false } = {}) {
  const n = Array.isArray(data.bookings) ? data.bookings.length : null;
  if (!force && n !== null && remoteBookingCount !== null && n < remoteBookingCount - GUARD_MAX_DROP) {
    console.warn(`Garde-fou : écriture bloquée (${n} réservations locales, ${remoteBookingCount} dans la base)`);
    window.dispatchEvent(new CustomEvent("riad-guard", { detail: { local: n, remote: remoteBookingCount } }));
    return false;
  }
  try { await setDoc(DOC_REF, data); if (n !== null) remoteBookingCount = n; return true; }
  catch(e) { console.warn("Cloud save failed", e); return false; }
}

// ── MonthCalendar ─────────────────────────────────────────────────────────────
function MonthCalendar({ year, month, bookings, blocked, monthName }) {
  const offset  = (new Date(year,month,1).getDay()+6)%7;
  const days    = new Date(year,month+1,0).getDate();
  const pad     = (n) => String(n).padStart(2,"0");
  const inRange = (d, s, e) => { const ds=`${year}-${pad(month+1)}-${pad(d)}`; return ds>=s && ds<e; };
  const cells   = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  const [tooltip, setTooltip] = useState(null);

  const getBookingForDay = (d) => {
    if (!d) return null;
    const b = bookings.find(b => inRange(d, b.checkIn, b.checkOut) && b.platform !== "Perso");
    if (b) return { name: b.name || b.id, platform: b.platform, checkIn: b.checkIn, checkOut: b.checkOut, nights: b.nights, type: "reserved" };
    const p = bookings.find(b => inRange(d, b.checkIn, b.checkOut) && b.platform === "Perso");
    if (p) return { name: p.name || "Perso", platform: "Perso", checkIn: p.checkIn, checkOut: p.checkOut, nights: p.nights, type: "perso" };
    const bl = blocked.find(b => inRange(d, b.start, b.end));
    if (bl) return { name: bl.label || "Bloqué", platform: "", checkIn: bl.start, checkOut: bl.end, nights: Math.round((new Date(bl.end)-new Date(bl.start))/86400000), type: "blocked" };
    return null;
  };

  return (
    <div style={{flex:"1 1 210px",minWidth:190,position:"relative"}}>
      <p className="kb-month-title">{monthName} {year}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {["L","M","M","J","V","S","D"].map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:10,color:"var(--color-text-tertiary)",padding:"2px 0"}}>{d}</div>
        ))}
        {cells.map((d,i)=>{
          const isReserved = d && bookings.some(b=>inRange(d,b.checkIn,b.checkOut) && b.platform!=="Perso");
          const isPerso    = d && !isReserved && bookings.some(b=>inRange(d,b.checkIn,b.checkOut) && b.platform==="Perso");
          const isBlocked  = d && !isReserved && !isPerso && blocked.some(b=>inRange(d,b.start,b.end));
          const isToday    = d && (() => { const t=new Date(); return t.getFullYear()===year&&t.getMonth()===month&&t.getDate()===d; })();
          const isInteractive = d && (isReserved || isPerso || isBlocked);
          let bg, color, fw=400, border="none";
          if      (isReserved) { bg=C_RESERVED; color="#fff"; fw=500; }
          else if (isPerso)    { bg=C_BLOCKED;  color="#fff"; fw=500; }
          else if (isBlocked)  { bg=C_BLOCKED;  color="#fff"; fw=500; }
          else if (isToday)    { bg=C_TODAY_BG; color=C_TODAY_FG; fw=600; }
          else if (d)          { bg=C_AVAIL;    color="var(--kb-avail-fg)"; }
          else                 { bg="transparent"; color="var(--color-text-primary)"; }
          if (isToday) { border="2px solid var(--kb-saffron)"; fw=700; }
          return (
            <div key={i} className={d?"kb-day":undefined}
              style={{textAlign:"center",fontSize:12,padding:"6px 2px",background:bg,color,borderRadius:"var(--border-radius-md)",fontWeight:fw,border,boxSizing:"border-box",cursor:isInteractive?"pointer":"default",position:"relative"}}
              onMouseEnter={isInteractive ? (e) => {
                const info = getBookingForDay(d);
                if (info) { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ x: rect.left + rect.width/2, y: rect.top - 8, info }); }
              } : undefined}
              onMouseLeave={isInteractive ? () => setTooltip(null) : undefined}
              onClick={isInteractive ? (e) => {
                const info = getBookingForDay(d);
                if (!info) return;
                if (tooltip) { setTooltip(null); return; }
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ x: rect.left + rect.width/2, y: rect.top - 8, info });
              } : undefined}
            >{d||""}</div>
          );
        })}
      </div>
      {tooltip && (
        <div
          onClick={() => setTooltip(null)}
          className="kb-tooltip"
          style={{
            position:"fixed",top:tooltip.y,left:tooltip.x,
            transform:"translate(-50%, -100%)",
            background:"var(--color-background-primary)",border:"1px solid var(--color-border-secondary)",borderRadius:8,
            padding:"8px 12px",fontSize:12,
            boxShadow:"0 4px 16px rgba(0,0,0,0.15)",
            zIndex:9999,minWidth:150,maxWidth:220,pointerEvents:"auto",
          }}
        >
          <p style={{margin:"0 0 4px",fontWeight:700,fontSize:13,color:tooltip.info.type==="reserved"?C_RESERVED:C_BLOCKED}}>{tooltip.info.name}</p>
          {tooltip.info.platform && <p style={{margin:"0 0 2px",fontSize:11,color:"var(--color-text-tertiary)",fontWeight:500}}>{tooltip.info.platform}</p>}
          <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{tooltip.info.checkIn} → {tooltip.info.checkOut}</p>
          <p style={{margin:"2px 0 0",fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}>{tooltip.info.nights}n</p>
          <div style={{position:"absolute",bottom:-5,left:"50%",width:10,height:10,background:"var(--color-background-primary)",border:"1px solid var(--color-border-secondary)",borderTop:"none",borderLeft:"none",transform:"translateX(-50%) rotate(45deg)"}} />
        </div>
      )}
    </div>
  );
}

// ── DropZone ──────────────────────────────────────────────────────────────────
function DropZone({ label, sub, accept, onFile, color }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const process = (f) => { if (!f) return; onFile(f); };
  return (
    <div
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);process(e.dataTransfer.files[0]);}}
      onClick={()=>ref.current.click()}
      style={{flex:1,border:`1.5px dashed ${drag?color:"var(--color-border-primary)"}`,borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",cursor:"pointer",background:drag?"var(--color-background-secondary)":"var(--color-background-primary)",transition:"all 0.15s",minWidth:200}}
    >
      <input ref={ref} type="file" accept={accept} style={{display:"none"}} onChange={e=>process(e.target.files[0])} />
      <p style={{margin:"0 0 3px",fontWeight:500,fontSize:14,color}}>{label}</p>
      <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{sub}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
function RiadDashboard() {
  const [bookings,     setBookings]     = useState([]);
  const [blocked,      setBlocked]      = useState([]);
  const [expenses,     setExpenses]     = useState([]);
  const [tab,          setTab]          = useState("calendar");
  const [year,         setYear]         = useState(new Date().getFullYear());
  const [toast,        setToast]        = useState("");
  const [confirmDelete,setConfirmDelete]= useState(null);
  const [showAddB,     setShowAddB]     = useState(false);
  const [showAddE,     setShowAddE]     = useState(false);
  const [editExpense,  setEditExpense]  = useState(null);
  const [showAddBl,    setShowAddBl]    = useState(false);
  const [statsPanel,   setStatsPanel]   = useState(null);
  const [calView,      setCalView]      = useState("upcoming");
  const [selectedMonth,setSelectedMonth]= useState(null);
  const [ignoredBlocks,setIgnoredBlocks]= useState(() => {
    try { const s = localStorage.getItem("riad_ignored_blocks"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [lang,         setLang]         = useState("fr");
  const [darkMode,     setDarkMode]     = useState(() => {
    try { return localStorage.getItem("riad_dark") === "1"; } catch { return false; }
  });

  const t    = (key) => translations[lang]?.[key] ?? translations.fr[key] ?? key;
  const tCat = (cat) => translations[lang]?.cats?.[cat] ?? cat;
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const months = useMemo(() => lang === "fr" ? MONTHS_FR : MONTHS_EN, [lang]);

  const [editId,       setEditId]       = useState(null);
  const [editAmt,      setEditAmt]      = useState("");
  const [editBooking,  setEditBooking]  = useState(null);
  const [nextId,       setNextId]       = useState(300);
  const [bForm,        setBForm]        = useState({checkIn:"",checkOut:"",name:"",phone:"",platform:"Direct",amount:"",guests:"",paid:false,notes:""});
  const [eForm,        setEForm]        = useState({date:today(),category:"Ménage",description:"",amount:""});
  const [blForm,       setBlForm]       = useState({start:"",end:"",label:""});
  const [currency,     setCurrency]     = useState("MAD");
  const [rate,         setRate]         = useState(DEFAULT_RATE);
  const [showRate,     setShowRate]     = useState(false);
  const [showTools,    setShowTools]    = useState(false);
  const [upcomingAll,  setUpcomingAll]  = useState(false); // onglet Réservations : à venir, toutes années
  const [commission,   setCommission]   = useState(0.20);
  const [recurring,    setRecurring]    = useState([]);
  const [showAddR,     setShowAddR]     = useState(false);
  const [rForm,        setRForm]        = useState({category:"Ménage",description:"",amount:"",months:[]});
  const [icsUrl,       setIcsUrl]       = useState("");
  const [icsUrlBooking, setIcsUrlBooking] = useState("");
  const [showIcsUrl,   setShowIcsUrl]   = useState(false);
  const [syncStatus,   setSyncStatus]   = useState("");
  const [lastSync,     setLastSync]     = useState(null);
  const [bookingSearch,setBookingSearch]= useState("");
  const [platformFilter,setPlatformFilter]= useState("all");
  const [monthFilter,  setMonthFilter]  = useState("all");
  const [rescue, setRescue] = useState(null); // null = fermé, sinon { loading, list, error, busy }

  // ── Auto exchange rate ────────────────────────────────────────────────────
  useEffect(() => {
    if (rate !== DEFAULT_RATE) return;
    fetch("https://api.frankfurter.app/latest?from=EUR&to=MAD")
      .then(r => r.json())
      .then(d => {
        const newRate = d?.rates?.MAD;
        if (newRate && Math.abs(newRate - rate) > 0.01) setRate(Math.round(newRate * 100) / 100);
      })
      .catch(() => {});
  }, []);

  // ── Dark mode ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.setAttribute("data-theme","dark"); localStorage.setItem("riad_dark","1"); }
    else          { root.removeAttribute("data-theme");     localStorage.setItem("riad_dark","0"); }
  }, [darkMode]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const [isMobile, setIsMobile] = useState(typeof window!=="undefined" && window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── localStorage ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadStorage();
    if (saved) {
      if (saved.bookings)                setBookings(saved.bookings);
      if (saved.blocked)                 setBlocked(saved.blocked);
      if (saved.expenses)                setExpenses(saved.expenses);
      if (saved.year)                    setYear(saved.year);
      if (saved.nextId)                  setNextId(saved.nextId);
      if (saved.currency)                setCurrency(saved.currency);
      if (saved.rate)                    setRate(saved.rate);
      if (saved.commission !== undefined) setCommission(saved.commission);
      if (saved.recurring)               setRecurring(saved.recurring);
      if (saved.icsUrl)                  setIcsUrl(saved.icsUrl);
      if (saved.icsUrlBooking)           setIcsUrlBooking(saved.icsUrlBooking);
      if (saved.lastSync)                setLastSync(saved.lastSync);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("riad_ignored_blocks", JSON.stringify(ignoredBlocks)); } catch {}
  }, [ignoredBlocks]);

  useEffect(() => {
    saveStorage({ bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, icsUrlBooking, lastSync, ignoredBlocks });
  }, [bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, icsUrlBooking, lastSync, ignoredBlocks]);

  // ── Firestore — onSnapshot temps réel ────────────────────────────────────
  // ARCHITECTURE CLÉ :
  // hasHydrated = false au démarrage → bloque toute écriture Firestore
  // tant que onSnapshot n'a pas répondu au moins une fois.
  // Cela empêche les mobiles d'écraser Firestore avec leur vieux localStorage.
  const [cloudStatus,     setCloudStatus]    = useState("");
  const saveTimer         = useRef(null);
  const isFromFirebase    = useRef(false);
  const lastSavedModified = useRef("");
  const hasHydrated       = useRef(false);  // ← CLÉ : false jusqu'au 1er onSnapshot

  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      // Annuler tout timer de save en attente issu du chargement localStorage
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }

      if (!snap.exists()) {
        // Firestore vide → on devient la source de vérité, on peut écrire
        hasHydrated.current = true;
        setCloudStatus("saved");
        return;
      }
      const data = snap.data();
      noteRemote(data);

      // Notre propre write qui revient → juste confirmer, ne rien appliquer
      if (data.lastModified && data.lastModified === lastSavedModified.current) {
        hasHydrated.current = true;
        setCloudStatus("saved");
        return;
      }

      // Comparer timestamps : qui a les données les plus récentes ?
      const localModified  = localStorage.getItem("riad_last_modified") || "";
      const remoteModified = data.lastModified || "";

      if (localModified && remoteModified && localModified > remoteModified) {
        // Local plus récent (ex: Restore vient d'être fait sur ce device)
        // → on garde le local, on devient source de vérité
        hasHydrated.current = true;
        return;
      }

      // Firestore est plus récent (ou pas de date locale) → on applique
      isFromFirebase.current = true;
      if (data.bookings)               setBookings(data.bookings);
      if (data.blocked)                setBlocked(data.blocked);
      if (data.expenses)               setExpenses(data.expenses);
      if (data.recurring)              setRecurring(data.recurring);
      if (data.rate)                   setRate(data.rate);
      if (data.currency)               setCurrency(data.currency);
      if (data.commission !== undefined) setCommission(data.commission);
      if (data.icsUrl)                 setIcsUrl(data.icsUrl);
      if (data.icsUrlBooking !== undefined) setIcsUrlBooking(data.icsUrlBooking);
      if (data.lastSync)               setLastSync(data.lastSync);
      if (data.ignoredBlocks)          setIgnoredBlocks(data.ignoredBlocks);
      saveStorage(data);
      setCloudStatus("saved");
      hasHydrated.current = true;
    }, () => { hasHydrated.current = true; setCloudStatus("error"); });

    return () => unsub();
  }, []);

  // ── Alerte garde-fou ──────────────────────────────────────────────────────
  useEffect(() => {
    const onGuard = (e) => showToast(lang === "fr"
      ? `🛡️ Sauvegarde bloquée : cet appareil a ${e.detail.local} réservations, la base en a ${e.detail.remote}. Rechargez la page.`
      : `🛡️ Save blocked: ${e.detail.local} bookings here, ${e.detail.remote} in the database. Reload the page.`);
    window.addEventListener("riad-guard", onGuard);
    return () => window.removeEventListener("riad-guard", onGuard);
  }, [lang]);

  // ── Save Firestore avec debounce ──────────────────────────────────────────
  // N'écrit JAMAIS dans Firestore avant que onSnapshot ait répondu (hasHydrated)
  // Cela empêche le localStorage mobile de démarrage d'écraser Firestore
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    if (isFromFirebase.current) {
      isFromFirebase.current = false;
      return;
    }

    // Bloquer toute écriture tant que onSnapshot n'a pas répondu
    if (!hasHydrated.current) return;

    setCloudStatus("saving");
    saveTimer.current = setTimeout(() => {
      const now = new Date().toISOString();
      lastSavedModified.current = now;
      localStorage.setItem("riad_last_modified", now);
      saveCloud({ bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, icsUrlBooking, lastSync, ignoredBlocks, lastModified: now })
        .then((ok) => setCloudStatus(ok ? "saved" : "error"))
        .catch(() => {
          setCloudStatus("error");
          showToast("❌ Sauvegarde cloud échouée, vérifiez votre connexion");
        });
    }, 1500);
  }, [bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, icsUrlBooking, lastSync, ignoredBlocks]);

  // ── Fonction partagée : appliquer les données Firestore si plus récentes ──
  // Utilisée par visibilitychange ET le polling iOS
  const applyIfNewer = useRef(null);
  applyIfNewer.current = (data) => {
    if (!data) return;
    noteRemote(data);
    if (data.lastModified && data.lastModified === lastSavedModified.current) return;
    const localModified  = localStorage.getItem("riad_last_modified") || "";
    const remoteModified = data.lastModified || "";
    if (localModified && remoteModified && localModified >= remoteModified) return;
    isFromFirebase.current = true;
    if (data.bookings)               setBookings(data.bookings);
    if (data.blocked)                setBlocked(data.blocked);
    if (data.expenses)               setExpenses(data.expenses);
    if (data.recurring)              setRecurring(data.recurring);
    if (data.rate)                   setRate(data.rate);
    if (data.currency)               setCurrency(data.currency);
    if (data.commission !== undefined) setCommission(data.commission);
    if (data.icsUrl)                 setIcsUrl(data.icsUrl);
    if (data.icsUrlBooking !== undefined) setIcsUrlBooking(data.icsUrlBooking);
    if (data.lastSync)               setLastSync(data.lastSync);
    if (data.ignoredBlocks)          setIgnoredBlocks(data.ignoredBlocks);
    saveStorage(data);
    setCloudStatus("saved");
  };

  const pollFirestore = () => {
    import("firebase/firestore").then(({ getDoc }) => {
      getDoc(DOC_REF).then((snap) => {
        if (snap.exists()) applyIfNewer.current(snap.data());
      }).catch(() => {});
    });
  };

  // ── Re-sync au retour au premier plan (visibilitychange) ──────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") pollFirestore();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ── Polling de secours toutes les 30s (iOS tue onSnapshot en arrière-plan) ─
  // onSnapshot reste la source principale — le polling ne fait rien si Firestore
  // n'est pas plus récent que le localStorage local.
  useEffect(() => {
    const id = setInterval(pollFirestore, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Refs courants ─────────────────────────────────────────────────────────
  const icsUrlRef        = useRef(icsUrl);       useEffect(() => { icsUrlRef.current = icsUrl; }, [icsUrl]);
  const bookingsRef      = useRef(bookings);     useEffect(() => { bookingsRef.current = bookings; }, [bookings]);
  const ignoredBlocksRef = useRef(ignoredBlocks);useEffect(() => { ignoredBlocksRef.current = ignoredBlocks; }, [ignoredBlocks]);

  // ── Couverture de bloc ────────────────────────────────────────────────────
  const isBlockFullyCovered = (bl, allBookings, allBlocked) => {
    const in360Days = new Date(); in360Days.setDate(in360Days.getDate() + 360);
    if (new Date(bl.start) > in360Days) return true;
    const uid = bl.uid || (bl.start + "_" + bl.end);
    if (ignoredBlocks.includes(uid)) return true;
    const allRes = [...allBookings, ...allBlocked.filter(x => x.type === "personal")];
    let cursor = bl.start;
    while (cursor < bl.end) {
      const covering = allRes.find(r => {
        const s = r.checkIn || r.start; const e = r.checkOut || r.end;
        return s <= cursor && e > cursor;
      });
      if (!covering) {
        const nextDay = new Date(cursor); nextDay.setDate(nextDay.getDate()+1);
        const nd = nextDay.toISOString().slice(0,10);
        const next = allRes.find(r => (r.checkIn||r.start) === nd);
        if (!next) return false;
        cursor = next.checkOut || next.end;
      } else {
        cursor = covering.checkOut || covering.end;
      }
    }
    return true;
  };

  // ── Sync iCal (côté serveur) ──────────────────────────────────────────────
  // Le serveur lit Firestore, fusionne le flux Airbnb et n'écrit que les
  // réservations et blocages. L'appareil ne fait que déclencher puis recevoir
  // le résultat via onSnapshot : il ne peut plus écraser la base.
  const syncIcs = async (url = icsUrl, silent = false) => {
    if (!url) return;
    setSyncStatus("syncing");
    try {
      const token = await authApi.currentUser?.getIdToken();
      const res = await fetch("/api/sync", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.error || j.message || `HTTP ${res.status}`);
      setSyncStatus("ok");
      const errs = Object.keys(j.errors || {});
      if (!silent) showToast((lang === "fr"
        ? `✅ Synchronisé · ${j.added} nouvelle${j.added > 1 ? "s" : ""} · ${j.known} déjà connue${j.known > 1 ? "s" : ""}`
        : `✅ Synced · ${j.added} new · ${j.known} already known`)
        + (errs.length ? ` · ⚠️ ${errs.join(", ")} injoignable` : ""));
      pollFirestore();
    } catch (e) {
      console.warn("Sync error", e);
      setSyncStatus("error");
      if (!silent) showToast(`${t("toastSyncFail")} (${e.message})`);
    }
  };

  // ── Secours : sauvegardes automatiques du serveur ─────────────────────────
  const authHeaders = async () => {
    const token = await authApi.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const openRescue = async () => {
    setRescue({ loading: true, list: [] });
    try {
      const snap = await getDocs(query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(60)));
      setRescue({ loading: false, list: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (e) { setRescue({ loading: false, list: [], error: e.message }); }
  };
  const backupNow = async () => {
    setRescue(r => ({ ...r, busy: true }));
    try {
      const res = await fetch("/api/backup", { method: "POST", headers: await authHeaders() });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.error || `HTTP ${res.status}`);
      showToast("🛟 Sauvegarde créée");
      await openRescue();
    } catch (e) { showToast(`❌ Sauvegarde impossible (${e.message})`); setRescue(r => ({ ...r, busy: false })); }
  };
  const loadBackup = async (id) => {
    const snap = await getDoc(doc(db, "backups", id, "payload", "data"));
    if (!snap.exists()) throw new Error("copie introuvable");
    return snap.data();
  };
  const downloadBackup = async (b) => {
    try {
      const data = await loadBackup(b.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href; a.download = `riad_secours_${b.createdAt.slice(0,16).replace(/[:T]/g,"-")}.json`;
      a.click(); URL.revokeObjectURL(href);
    } catch (e) { showToast(`❌ Téléchargement impossible (${e.message})`); }
  };
  const restoreBackup = async (b) => {
    const when = new Date(b.createdAt).toLocaleString(locale);
    if (!window.confirm(`Restaurer l'état du ${when} (${b.counts?.bookings ?? "?"} réservations, ${b.counts?.expenses ?? "?"} dépenses) ?\n\nTout ce qui a été saisi depuis sera perdu.`)) return;
    try {
      const data = await loadBackup(b.id);
      if (applyBackup(data, { confirmed: true })) setRescue(null);
    } catch (e) { showToast(`❌ Restauration impossible (${e.message})`); }
  };

  // ── Import iCal ───────────────────────────────────────────────────────────
  const handleIcs = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { bookings: newB, blocked: newBl } = parseIcs(e.target.result);
        if (!newB.length && !newBl.length) { showToast(t("toastIcsEmpty")); return; }
        setBookings(prev => {
          const manuals  = prev.filter(b => b.id.startsWith("MAN-"));
          const existing = Object.fromEntries(prev.map(b=>[b.id,{amount:b.amount,name:b.name||"",guests:b.guests||"",nameEdited:b.nameEdited||false}]));
          const airbnb   = newB.map(b=>({...b,
            amount:     existing[b.id]?.amount ?? 0,
            name:       existing[b.id]?.nameEdited ? existing[b.id].name : (existing[b.id]?.name || b.name || ""),
            guests:     existing[b.id]?.guests ?? "",
            nameEdited: existing[b.id]?.nameEdited ?? false,
          }));
          return [...airbnb, ...manuals];
        });
        setBlocked(prev => {
          const personal = prev.filter(b => b.type === "personal");
          return [...newBl, ...personal];
        });
        if (newB.length) {
          const years = newB.map(b=>new Date(b.checkIn).getFullYear());
          setYear(years.sort((a,b)=>years.filter(v=>v===b).length-years.filter(v=>v===a).length)[0]);
        }
        showToast(`✅ ${newB.length} ${lang==="fr"?`réservation${newB.length>1?"s":""} Airbnb importée${newB.length>1?"s":""}`:`Airbnb booking${newB.length>1?"s":""} imported`}`);
      } catch { showToast(t("toastIcsError")); }
    };
    reader.readAsText(file);
  };

  // ── Import CSV ────────────────────────────────────────────────────────────
  const handleCsv = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const amounts = parseCsvAirbnb(e.target.result);
        const keys = Object.keys(amounts);
        if (!keys.length) { showToast(t("toastCsvEmpty")); return; }
        let matched = 0;
        setBookings(prev => prev.map(b => {
          if (amounts[b.id]) { matched++; return {...b, amount: amounts[b.id]}; }
          return b;
        }));
        showToast(`✅ ${matched} ${lang==="fr"?`montant${matched>1?"s":""} mis à jour`:`amount${matched>1?"s":""} updated`} / ${keys.length} CSV`);
      } catch { showToast(t("toastCsvError")); }
    };
    reader.readAsText(file, "utf-8");
  };

  // ── Export / Import JSON ──────────────────────────────────────────────────
  const exportJSON = () => {
    const data = { bookings, blocked, expenses, rate, currency, commission, icsUrl, icsUrlBooking, recurring, ignoredBlocks, lastSync, lastModified: new Date().toISOString(), exportedAt: new Date().toISOString(), version: 1, nextId };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `riad_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast(t("toastJsonDL"));
  };

  // Applique une sauvegarde (fichier Restore ou copie Secours). Renvoie true si appliquée.
  const applyBackup = (data, { confirmed = false } = {}) => {
        if (!data || !data.version) throw new Error("Invalid format");
        const incoming = (data.bookings || []).length;
        const shrinks = remoteBookingCount !== null && incoming < remoteBookingCount - GUARD_MAX_DROP;
        if (shrinks && !confirmed && !window.confirm(`Ce fichier contient ${incoming} réservations, la base en contient ${remoteBookingCount}. Restaurer quand même ?`)) return false;
        const manuals = (data.bookings||[]).filter(b => b.id.startsWith("MAN-"));
        const filteredBlocked = (data.blocked||[]).filter(bl =>
          bl.type === "personal" ||
          !manuals.some(mb => mb.checkIn < bl.end && mb.checkOut > bl.start)
        );
        const now = new Date().toISOString();
        lastSavedModified.current = now;
        localStorage.setItem("riad_last_modified", now);
        const cloudData = {
          bookings:      data.bookings     || [],
          blocked:       filteredBlocked,
          expenses:      data.expenses     || [],
          recurring:     data.recurring    || [],
          rate:          data.rate         || DEFAULT_RATE,
          currency:      data.currency     || "MAD",
          commission:    data.commission   ?? 0.20,
          icsUrl:        data.icsUrl       || "",
          icsUrlBooking: data.icsUrlBooking || icsUrlBooking || "",
          ignoredBlocks: data.ignoredBlocks || [],
          lastSync:      data.lastSync     || null,
          version:       1,
          lastModified:  now,
        };
        saveStorage(cloudData);
        if (data.bookings)      setBookings(data.bookings);
        if (filteredBlocked)    setBlocked(filteredBlocked);
        if (data.expenses)      setExpenses(data.expenses);
        if (data.recurring)     setRecurring(data.recurring);
        if (data.rate)          setRate(data.rate);
        if (data.currency)      setCurrency(data.currency);
        if (data.ignoredBlocks) setIgnoredBlocks(data.ignoredBlocks);
        if (data.nextId)        setNextId(data.nextId);
        saveCloud(cloudData, { force: shrinks });
        showToast(`✅ ${lang==="fr"?"Sauvegarde restaurée":"Backup restored"} · ${data.bookings?.length||0} ${lang==="fr"?"réservations":"bookings"} · ${data.expenses?.length||0} ${lang==="fr"?"dépenses":"expenses"}`);
        return true;
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try { applyBackup(JSON.parse(e.target.result)); }
      catch { showToast(t("toastJsonInvalid")); }
    };
    reader.readAsText(file);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const yearBookings   = useMemo(()=>bookings.filter(b=>new Date(b.checkIn).getFullYear()===year),[bookings,year]);
  const payingBookings = useMemo(()=>yearBookings.filter(b=>b.platform!=="Perso"),[yearBookings]);
  const persoBookings  = useMemo(()=>yearBookings.filter(b=>b.platform==="Perso"),[yearBookings]);
  const yearExpenses   = useMemo(()=>expenses.filter(e=>new Date(e.date).getFullYear()===year),[expenses,year]);
  const totalStay  = (b) => b.amount * b.nights;
  const netAmount  = (b) => hasComm(b) ? totalStay(b)*(1-commission) : totalStay(b);
  const totalRevenue = useMemo(()=>payingBookings.reduce((s,b)=>s+netAmount(b),0),[payingBookings,commission]);
  const totalGross   = useMemo(()=>payingBookings.reduce((s,b)=>s+totalStay(b),0),[payingBookings]);
  const totalExp     = useMemo(()=>yearExpenses.reduce((s,e)=>s+e.amount,0),[yearExpenses]);
  const pastExp      = useMemo(()=>{ const t2=today(); return yearExpenses.filter(e=>e.date<=t2).reduce((s,e)=>s+e.amount,0);},[yearExpenses]);
  const futureExp    = useMemo(()=>{ const t2=today(); return yearExpenses.filter(e=>e.date>t2).reduce((s,e)=>s+e.amount,0);},[yearExpenses]);
  const totalNights  = useMemo(()=>payingBookings.reduce((s,b)=>s+b.nights,0),[payingBookings]);
  const persoNights  = useMemo(()=>persoBookings.reduce((s,b)=>s+b.nights,0),[persoBookings]);
  const occupancy    = Math.round(((totalNights+persoNights)/365)*100);
  const avgNight     = totalNights ? Math.round(totalRevenue/totalNights) : 0;
  const pendingCount = payingBookings.filter(b=>b.amount===0).length;
  const todayStr     = today();
  // Années proposées dans le sélecteur : de la plus ancienne donnée à la plus lointaine,
  // au minimum année précédente → année suivante (plus de liste codée en dur)
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    let min = now - 1, max = now + 1;
    const take = (d) => { const y = parseInt(String(d||"").slice(0,4),10); if (y>=2000 && y<=now+10) { if (y<min) min=y; if (y>max) max=y; } };
    bookings.forEach(b => { take(b.checkIn); take(b.checkOut); });
    expenses.forEach(e => take(e.date));
    if (year < min) min = year;
    if (year > max) max = year;
    return Array.from({length:max-min+1}, (_,i)=>min+i);
  }, [bookings, expenses, year]);
  // Source de l'onglet Réservations : année choisie, ou toutes les réservations à venir (toutes années)
  // Séjour qui a au moins une nuit dans la période [start, end[ (dates ISO "YYYY-MM-DD", départ exclu)
  const pad2 = (n) => String(n).padStart(2,"0");
  const overlapsPeriod = (b, start, end) => b.checkIn < end && b.checkOut > start;
  const overlapsYear   = (b, y)    => overlapsPeriod(b, `${y}-01-01`, `${y+1}-01-01`);
  const overlapsMonth  = (b, y, m) => overlapsPeriod(b, `${y}-${pad2(m+1)}-01`, m===11 ? `${y+1}-01-01` : `${y}-${pad2(m+2)}-01`);
  // Liste : tout séjour ayant au moins une nuit dans l'année (y compris à cheval sur le 31/12).
  // Les totaux (CA, nuits, taux) restent calculés sur yearBookings pour ne rien compter deux fois.
  const listBookings = upcomingAll ? bookings.filter(b=>b.checkOut>todayStr) : bookings.filter(b=>overlapsYear(b,year));
  const listRevenue  = upcomingAll ? listBookings.filter(b=>b.platform!=="Perso").reduce((s,b)=>s+netAmount(b),0) : totalRevenue;
  const pastBookings_   = payingBookings.filter(b=>b.checkOut <= todayStr);
  const futureBookings_ = payingBookings.filter(b=>b.checkIn > todayStr);
  const pastRevenue   = pastBookings_.reduce((s,b)=>s+netAmount(b),0);
  const futureRevenue = futureBookings_.reduce((s,b)=>s+netAmount(b),0);
  const confirmedRevenue = totalRevenue;

  const nightsInMonth = (b, monthIdx) => {
    const y = year;
    const monthStart = new Date(y, monthIdx, 1);
    const monthEnd   = new Date(y, monthIdx+1, 1);
    const start = new Date(Math.max(new Date(b.checkIn), monthStart));
    const end   = new Date(Math.min(new Date(b.checkOut), monthEnd));
    return Math.max(0, Math.round((end-start)/86400000));
  };

  const monthlyData = useMemo(()=>months.map((m,i)=>({
    name: m,
    Revenus:        payingBookings.filter(b=>new Date(b.checkIn).getMonth()===i).reduce((s,b)=>s+netAmount(b),0),
    Dépenses:       yearExpenses.filter(e=>new Date(e.date).getMonth()===i).reduce((s,e)=>s+e.amount,0),
    NuitsPayantes:  payingBookings.reduce((s,b)=>s+nightsInMonth(b,i),0),
    NuitsPerso:     persoBookings.reduce((s,b)=>s+nightsInMonth(b,i),0),
  })).map(d=>({...d,Bénéfice:d.Revenus-d.Dépenses})),[payingBookings,persoBookings,yearExpenses,commission,months]);

  const expByCat = useMemo(()=>{
    const map={};
    yearExpenses.forEach(e=>{map[e.category]=(map[e.category]||0)+e.amount;});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[yearExpenses]);

  const calMonths = useMemo(()=>{
    const r=[];
    for(let i=0;i<12;i++) r.push({year,month:i});
    return r;
  },[year]);

  const forecast = useMemo(() => {
    const monthsLeft  = 12 - new Date().getMonth();
    const avgMonthly  = totalRevenue > 0 ? totalRevenue / Math.max(new Date().getMonth()+1, 1) : 0;
    const projectedTotal = pastRevenue + futureRevenue + (avgMonthly * Math.max(0, monthsLeft - futureBookings_.length));
    return { projectedTotal, avgMonthly };
  }, [totalRevenue, pastRevenue, futureRevenue, totalNights]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveAmount = (id) => {
    setBookings(prev=>prev.map(b=>b.id===id?{...b,amount:parseFloat(editAmt)||0}:b));
    setEditId(null); setEditAmt(""); showToast(t("toastAmountSaved"));
  };
  const saveEditBooking = () => {
    if (!editBooking) return;
    const nights = Math.round((new Date(editBooking.checkOut)-new Date(editBooking.checkIn))/86400000);
    setBookings(prev=>prev.map(b=>b.id===editBooking.id?{...editBooking,nights,nameEdited:true}:b));
    setEditBooking(null);
    showToast(t("toastBookingUpdated"));
  };
  const genId = () => "MAN-" + Date.now().toString(36).toUpperCase().slice(-6);
  const addBooking = () => {
    if (!bForm.checkIn||!bForm.checkOut) return;
    const nights=Math.round((new Date(bForm.checkOut)-new Date(bForm.checkIn))/86400000);
    setBookings(prev=>[...prev,{...bForm,id:genId(),nights,amount:parseFloat(bForm.amount)||0}]);
    setBForm({checkIn:"",checkOut:"",name:"",phone:"",platform:"Direct",amount:"",guests:"",paid:false,notes:""});
    setShowAddB(false);
    showToast(t("toastBookingAdded"));
  };
  const addExpense = () => {
    if (!eForm.date||!eForm.description||!eForm.amount) return;
    setExpenses(prev=>[...prev,{...eForm,id:nextId,amount:parseFloat(eForm.amount)}]);
    setNextId(n=>n+1); setEForm({date:today(),category:"Ménage",description:"",amount:""});
    setShowAddE(false);
    showToast(t("toastExpenseAdded"));
  };
  const saveEditExpense = () => {
    if (!editExpense) return;
    setExpenses(prev=>prev.map(e=>e.id===editExpense.id?{...editExpense,amount:parseFloat(editExpense.amount)||0}:e));
    setEditExpense(null);
    showToast(t("toastExpenseUpdated"));
  };
  const addBlocked = () => {
    if (!blForm.start||!blForm.end) return;
    setBlocked(prev=>[...prev,{...blForm,type:"personal",uid:genId()}]);
    setBlForm({start:"",end:"",label:""}); setShowAddBl(false);
    showToast(t("toastBlockedAdded"));
  };
  const addRecurring = () => {
    if (!rForm.description||!rForm.amount) return;
    setRecurring(prev=>[...prev,{...rForm,id:"REC-"+Date.now().toString(36).toUpperCase().slice(-6),amount:parseFloat(rForm.amount)}]);
    setRForm({category:"Ménage",description:"",amount:"",months:[]}); setShowAddR(false);
    showToast(t("toastRecurringAdded"));
  };
  const generateRecurring = (rec) => {
    const newExp = rec.months.map(m => {
      const date = `${year}-${String(m+1).padStart(2,"0")}-01`;
      return { id: nextId+m, category:rec.category, description:rec.description+" 🔄", amount:rec.amount, date, recurringId:rec.id };
    });
    const toAdd = newExp.filter(ne => !expenses.some(e=>e.recurringId===rec.id && new Date(e.date).getMonth()===new Date(ne.date).getMonth() && new Date(e.date).getFullYear()===year));
    setExpenses(prev=>[...prev,...toAdd]);
    setNextId(n=>n+toAdd.length);
    if (toAdd.length===0) showToast(t("toastAlreadyGenerated"));
    else showToast(`✅ ${toAdd.length} ${lang==="fr"?`dépense${toAdd.length>1?"s":""} générée${toAdd.length>1?"s":""}`:`expense${toAdd.length>1?"s":""} generated`} ${year}`);
  };
  // Un séjour est considéré encaissé si marqué payé OU si le checkout est passé
  const isEffectivelyPaid = (b) => b.paid || b.checkOut <= todayStr;

  const togglePaid = (id) => {
    const b = bookings.find(x=>x.id===id);
    if (b && b.checkOut <= todayStr) {
      showToast(lang==="fr"?"✅ Séjour terminé, automatiquement encaissé":"✅ Completed stay, automatically paid");
      return;
    }
    setBookings(prev=>prev.map(b=>b.id===id?{...b,paid:!b.paid}:b));
    showToast(t("toastPaymentUpdated"));
  };
  const toggleMonth = (m) => setRForm(f=>({...f,months:f.months.includes(m)?f.months.filter(x=>x!==m):[...f.months,m].sort((a,b)=>a-b)}));

  // ── Alertes arrivées ──────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const arrivals = bookings.filter(b=>b.platform!=="Perso").map(b => {
      const ci = new Date(b.checkIn); ci.setHours(0,0,0,0);
      return {...b, type:"arrival", daysUntil: Math.round((ci-now)/86400000)};
    }).filter(b => b.daysUntil >= 0 && b.daysUntil <= 7);
    const departures = bookings.filter(b=>b.platform!=="Perso").map(b => {
      const co = new Date(b.checkOut); co.setHours(0,0,0,0);
      return {...b, type:"departure", daysUntil: Math.round((co-now)/86400000)};
    }).filter(b => b.daysUntil >= 0 && b.daysUntil <= 7);
    return [...arrivals, ...departures].sort((a,b) => a.daysUntil - b.daysUntil || a.type.localeCompare(b.type));
  }, [bookings]);

  // ── Notifications push ────────────────────────────────────────────────────
  const [notifEnabled, setNotifEnabled] = useState(false);
  const requestNotifPermission = async () => {
    if (!("Notification" in window)) { showToast(t("toastNotifFail")); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") { setNotifEnabled(true); showToast(t("toastNotifOn")); }
    else showToast(t("toastNotifDenied"));
  };
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    setNotifEnabled(true);
    const lastNotifDate = localStorage.getItem("lastNotifDate");
    const todayKey = new Date().toISOString().slice(0,10);
    if (lastNotifDate === todayKey) return;
    const now = new Date(); now.setHours(0,0,0,0);
    bookings.filter(b=>b.platform!=="Perso").forEach(b => {
      const ci = new Date(b.checkIn); ci.setHours(0,0,0,0);
      const co = new Date(b.checkOut); co.setHours(0,0,0,0);
      const daysIn  = Math.round((ci-now)/86400000);
      const daysOut = Math.round((co-now)/86400000);
      const name = b.name || b.id;
      if (daysIn  === 0) new Notification("🏡 "+t("arrivalToday"),    {body: name+" · "+b.nights+"n · "+b.platform});
      if (daysIn  === 1) new Notification("🟢 "+t("arrivalTomorrow"), {body: name+" · "+b.nights+"n · "+b.platform});
      if (daysOut === 0) new Notification("🔴 "+t("departureToday"),  {body: name+" · "+b.platform});
      if (daysOut === 1) new Notification("🟠 "+t("departureTomorrow"),{body: name+" · "+b.platform});
    });
    localStorage.setItem("lastNotifDate", todayKey);
  }, [bookings.length]);

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const bRows = [["Code","Nom","Plateforme","Arrivée","Départ","Nuits","Occupants","Tarif/nuit brut (MAD)","Tarif/nuit net (MAD)","Tarif/nuit net (€)","Total brut (MAD)","Commission (MAD)","Total net (MAD)","Total net (€)"]];
    [...yearBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).forEach(b => {
      const gross      = b.amount;
      const netNight   = hasComm(b) ? gross*(1-commission) : gross;
      const totalGrossB= gross * b.nights;
      const commAmt    = hasComm(b) ? totalGrossB * commission : 0;
      const totalNetB  = totalGrossB - commAmt;
      bRows.push([b.id,b.name||"",b.platform,b.checkIn,b.checkOut,b.nights,b.guests||"",gross,+netNight.toFixed(2),+(netNight/rate).toFixed(2),totalGrossB,+commAmt.toFixed(2),+totalNetB.toFixed(2),+(totalNetB/rate).toFixed(2)]);
    });
    bRows.push([]);
    bRows.push(["TOTAL","","","","",totalNights+"n","","","","",+totalGross.toFixed(2),+(totalGross-totalRevenue).toFixed(2),+totalRevenue.toFixed(2),+(totalRevenue/rate).toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bRows), t("xlsBookings"));

    const eRows = [["Date","Catégorie","Description","Montant (MAD)","Montant (€)"]];
    [...yearExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(e => eRows.push([e.date,e.category,e.description,e.amount,+(e.amount/rate).toFixed(2)]));
    eRows.push([]); eRows.push(["TOTAL","","",+totalExp.toFixed(2),+(totalExp/rate).toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eRows), t("xlsExpenses"));

    const catRows = [["Catégorie","Nb entrées","Total (MAD)","Total (€)","% du total"]];
    expByCat.forEach(([cat,amt]) => {
      const count = yearExpenses.filter(e=>e.category===cat).length;
      const pct   = totalExp ? Math.round((amt/totalExp)*100) : 0;
      catRows.push([cat, count, +amt.toFixed(2), +(amt/rate).toFixed(2), pct+"%"]);
    });
    catRows.push([]); catRows.push(["TOTAL",yearExpenses.length,+totalExp.toFixed(2),+(totalExp/rate).toFixed(2),"100%"]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), t("xlsCatBreakdown"));

    const platforms = [...new Set(yearBookings.map(b=>b.platform))];
    const pRows = [["Plateforme","Nb réservations","Nuits","Total brut (MAD)","Commission (MAD)","Total net (MAD)","Total net (€)","Moy./nuit net (MAD)"]];
    platforms.forEach(p => {
      const bs    = yearBookings.filter(b=>b.platform===p);
      const n     = bs.reduce((s,b)=>s+b.nights,0);
      const gross = bs.reduce((s,b)=>s+b.amount*b.nights,0);
      const comm  = hasComm({platform:p}) ? gross*commission : 0;
      const net   = gross - comm;
      pRows.push([p,bs.length,n,+gross.toFixed(2),+comm.toFixed(2),+net.toFixed(2),+(net/rate).toFixed(2),n?Math.round(net/n):0]);
    });
    pRows.push([]); pRows.push(["TOTAL",yearBookings.filter(b=>b.platform!=="Perso").length,totalNights,+totalGross.toFixed(2),+(totalGross-totalRevenue).toFixed(2),+totalRevenue.toFixed(2),+(totalRevenue/rate).toFixed(2),avgNight]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pRows), t("xlsByPlatform"));

    const mRows = [["Mois","Revenus bruts (MAD)","Commission (MAD)","Revenus nets (MAD)","Revenus nets (€)","Dépenses (MAD)","Dépenses (€)","Bénéfice (MAD)","Bénéfice (€)"]];
    monthlyData.forEach((d,i) => {
      const mB    = payingBookings.filter(b=>new Date(b.checkIn).getMonth()===i);
      const mGross= mB.reduce((s,b)=>s+b.amount*b.nights,0);
      const mComm = mB.filter(hasComm).reduce((s,b)=>s+b.amount*b.nights*commission,0);
      const mNet  = mGross - mComm;
      const mBenef= mNet - d.Dépenses;
      mRows.push([d.name,+mGross.toFixed(2),+mComm.toFixed(2),+mNet.toFixed(2),+(mNet/rate).toFixed(2),d.Dépenses,+(d.Dépenses/rate).toFixed(2),+mBenef.toFixed(2),+(mBenef/rate).toFixed(2)]);
    });
    mRows.push([]); mRows.push(["TOTAL",+totalGross.toFixed(2),+(totalGross-totalRevenue).toFixed(2),+totalRevenue.toFixed(2),+(totalRevenue/rate).toFixed(2),+totalExp.toFixed(2),+(totalExp/rate).toFixed(2),+(totalRevenue-totalExp).toFixed(2),+((totalRevenue-totalExp)/rate).toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mRows), t("xlsMonthly"));

    XLSX.writeFile(wb, `Riad_${year}.xlsx`);
    showToast(t("toastExcelDL"));
  };

  // ── Export PDF mensuel ────────────────────────────────────────────────────
  const exportMonthlyPDF = (monthIdx) => {
    const mName     = months[monthIdx];
    const mBookings = payingBookings.filter(b => {
      const mStart = new Date(year, monthIdx, 1); const mEnd = new Date(year, monthIdx+1, 1);
      return new Date(b.checkIn) < mEnd && new Date(b.checkOut) > mStart;
    });
    const mExpenses = yearExpenses.filter(e => new Date(e.date).getMonth() === monthIdx);
    const mRevenue  = mBookings.reduce((s,b) => s+netAmount(b), 0);
    const mExp      = mExpenses.reduce((s,e) => s+e.amount, 0);
    const mProfit   = mRevenue - mExp;
    const mPastRev  = mBookings.filter(b=>b.checkOut<=todayStr).reduce((s,b)=>s+netAmount(b),0);
    const mFutRev   = mBookings.filter(b=>b.checkIn>todayStr).reduce((s,b)=>s+netAmount(b),0);
    const bookingRows = mBookings.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#888;padding:12px">${lang==="fr"?"Aucune réservation":"No bookings"}</td></tr>`
      : [...mBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b => `
        <tr>
          <td>${b.name||b.id}</td><td>${b.platform}</td>
          <td>${b.checkIn} → ${b.checkOut}</td><td>${b.nights}n</td>
          <td style="text-align:right;font-weight:500">${fmtBoth(netAmount(b),rate)}</td>
        </tr>
        ${b.notes?`<tr><td colspan="5" style="font-size:11px;color:#888;padding:2px 8px 8px">📝 ${b.notes}</td></tr>`:""}`).join("");
    const expenseRows = mExpenses.length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:#888;padding:12px">${lang==="fr"?"Aucune dépense":"No expenses"}</td></tr>`
      : [...mExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e => `
        <tr>
          <td>${e.date}</td><td>${e.category} — ${e.description}</td>
          <td style="text-align:right;color:#c0392b;font-weight:500">${fmtBoth(e.amount,rate)}</td>
        </tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kasbah Blanca — ${mName} ${year}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a1a}
    h1{font-size:22px;margin:0 0 4px}.sub{color:#888;font-size:13px;margin:0 0 24px}
    h2{font-size:15px;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #eee}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{padding:8px 6px;text-align:left;font-size:12px;color:#888;font-weight:400;border-bottom:1px solid #eee}
    td{padding:8px 6px;font-size:13px;border-bottom:0.5px solid #f0f0f0}
    .kpis{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap}
    .kpi{flex:1;min-width:120px;background:#f9f9f9;border-radius:8px;padding:12px}
    .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin:0 0 4px}
    .kpi-value{font-size:18px;font-weight:600;margin:0}.kpi-sub{font-size:11px;color:#888;margin:2px 0 0}
    .profit{color:${mProfit>=0?"#2e7d32":"#c0392b"}}
    .footer{margin-top:40px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:16px}
    @media print{body{margin:20px}}</style></head><body>
    <div style="font-size:28px">🏡</div>
    <h1>Kasbah Blanca Marrakech</h1>
    <p class="sub">${lang==="fr"?"Récapitulatif mensuel":"Monthly summary"} — ${mName} ${year}</p>
    <div class="kpis">
      <div class="kpi"><p class="kpi-label">${lang==="fr"?"Revenus nets":"Net revenue"}</p><p class="kpi-value" style="color:#2e7d32">${fmtMAD(mRevenue)}</p><p class="kpi-sub">${fmtEUR(mRevenue/rate)}</p></div>
      <div class="kpi"><p class="kpi-label">${lang==="fr"?"Dépenses":"Expenses"}</p><p class="kpi-value" style="color:#c0392b">${fmtMAD(mExp)}</p><p class="kpi-sub">${fmtEUR(mExp/rate)}</p></div>
      <div class="kpi"><p class="kpi-label">${lang==="fr"?"Bénéfice net":"Net profit"}</p><p class="kpi-value profit">${fmtMAD(mProfit)}</p><p class="kpi-sub">${fmtEUR(mProfit/rate)}</p></div>
      <div class="kpi"><p class="kpi-label">${lang==="fr"?"Encaissé":"Collected"}</p><p class="kpi-value" style="color:#c0392b">${fmtMAD(mPastRev)}</p><p class="kpi-sub">${lang==="fr"?"À venir":"Upcoming"}: ${fmtMAD(mFutRev)}</p></div>
    </div>
    <h2>${lang==="fr"?"Réservations":"Bookings"} (${mBookings.length})</h2>
    <table><thead><tr><th>${lang==="fr"?"Client":"Guest"}</th><th>${lang==="fr"?"Plateforme":"Platform"}</th><th>${lang==="fr"?"Dates":"Dates"}</th><th>${lang==="fr"?"Nuits":"Nights"}</th><th style="text-align:right">${lang==="fr"?"Montant net":"Net amount"}</th></tr></thead>
    <tbody>${bookingRows}</tbody>
    <tfoot><tr><td colspan="4" style="font-weight:600;padding:10px 6px">${lang==="fr"?"Total":"Total"}</td><td style="text-align:right;font-weight:600">${fmtBoth(mRevenue,rate)}</td></tr></tfoot></table>
    <h2>${lang==="fr"?"Dépenses":"Expenses"} (${mExpenses.length})</h2>
    <table><thead><tr><th>${lang==="fr"?"Date":"Date"}</th><th>${lang==="fr"?"Description":"Description"}</th><th style="text-align:right">${lang==="fr"?"Montant":"Amount"}</th></tr></thead>
    <tbody>${expenseRows}</tbody>
    <tfoot><tr><td colspan="2" style="font-weight:600;padding:10px 6px">${lang==="fr"?"Total":"Total"}</td><td style="text-align:right;font-weight:600;color:#c0392b">${fmtBoth(mExp,rate)}</td></tr></tfoot></table>
    <div class="footer">Kasbah Blanca · ${mName} ${year} · ${lang==="fr"?"Généré le":"Generated on"} ${new Date().toLocaleDateString(locale)}</div>
    <scr`+"ipt>window.onload=function(){window.print()}</scr"+"ipt></body></html>";
    const w = window.open("","_blank","width=750,height=900");
    w.document.write(html); w.document.close();
  };

  // ── Recap PDF ─────────────────────────────────────────────────────────────
  const printRecap = (b) => {
    const total   = totalStay(b);
    const netTot  = hasComm(b) ? total*(1-commission) : total;
    const commAmt = hasComm(b) ? total*commission : 0;
    const loc     = locale;
    const rows = [
      [t("recapClient"),   b.name||"—"],
      [t("recapCode"),     b.id],
      [t("recapPlatform"), b.platform],
      [t("recapArrival"),  new Date(b.checkIn).toLocaleDateString(loc,{weekday:"long",day:"numeric",month:"long",year:"numeric"})],
      [t("recapDeparture"),new Date(b.checkOut).toLocaleDateString(loc,{weekday:"long",day:"numeric",month:"long",year:"numeric"})],
      [t("recapDuration"), `${b.nights} ${b.nights>1?t("recapNights"):t("recapNight")}`],
      ...(b.guests?[[t("recapGuests"),`${b.guests} ${b.guests>1?t("recapPersons"):t("recapPerson")}`]]:[]),
      [t("recapRateGross"), b.amount.toLocaleString("fr-MA")+" MAD"],
      ...(hasComm(b)?[[`${t("recapCommission")} (-${Math.round(commission*100)}%)`,"−"+Math.round(commAmt).toLocaleString("fr-MA")+" MAD"]]:[]),
    ].map(([l,v])=>"<tr><td>"+l+"</td><td>"+v+"</td></tr>").join("");
    const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Recap</title>"
      +"<style>body{font-family:Georgia,serif;max-width:520px;margin:40px auto;padding:0 20px}"
      +"h1{font-size:22px;margin:0 0 4px}.sub{color:#888;font-size:13px;margin:0 0 28px}"
      +"table{width:100%;border-collapse:collapse;margin:20px 0}"
      +"td{padding:10px 0;border-bottom:1px solid #eee;font-size:14px}td:last-child{text-align:right;font-weight:500}"
      +".total td{border-top:2px solid #1a1a1a;font-weight:700;border-bottom:none}"
      +".badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}"
      +".paid{background:#e8f5e9;color:#2e7d32}.unpaid{background:#fff3cd;color:#856404}"
      +".footer{margin-top:40px;font-size:11px;color:#aaa;text-align:center}"
      +"@media print{body{margin:20px}}</style></head><body>"
      +"<div style='font-size:28px'>🏡</div>"
      +"<h1>Kasbah Blanca Marrakech</h1>"
      +"<p class='sub'>"+t("recapTitle")+"</p>"
      +"<table>"+rows
      +"<tr class='total'><td>"+t("recapTotal")+"</td><td>"+Math.round(netTot).toLocaleString("fr-MA")+" MAD · "+Math.round(netTot/rate).toLocaleString("fr-FR")+" €</td></tr>"
      +"</table>"
      +"<p>"+t("recapPayment")+" : <span class='badge "+(b.paid?"paid":"unpaid")+"'>"+(isEffectivelyPaid(b)?t("paidStatus"):t("unpaidStatus"))+"</span></p>"
      +"<div class='footer'>Kasbah Blanca · "+new Date().toLocaleDateString(loc)+"</div>"
      +"<scr"+"ipt>window.onload=function(){window.print()}</scr"+"ipt>"
      +"</body></html>";
    const w = window.open("","_blank","width=600,height=700");
    w.document.write(html); w.document.close();
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const rc  = {background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:isMobile?"1rem 0.75rem":"1.25rem 1.35rem",marginBottom:"1.25rem"};
  const mc  = {background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.9rem 1rem",flex:"1 1 130px",minWidth:0};
  const inp = {width:"100%",boxSizing:"border-box",marginTop:4,marginBottom:12};

  const tabBtn = (id, lbl) => (
    <button onClick={()=>setTab(id)} className={"kb-tab"+(tab===id?" on":"")} aria-current={tab===id?"page":undefined}>{lbl}</button>
  );

  const TT = ({active,payload,label}) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{...rc,padding:"10px 14px",fontSize:13,minWidth:180}}>
        <p style={{margin:"0 0 8px",fontWeight:600}}>{label}</p>
        {payload.map(p=>(
          <div key={p.name} style={{margin:"4px 0"}}>
            <span style={{color:p.color,fontWeight:500}}>{p.name}</span>
            <div style={{fontSize:13,fontWeight:500}}>{fmtMAD(p.value)}</div>
            <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{fmtEUR(p.value/rate)}</div>
          </div>
        ))}
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <>

    <div className="kb-app">

      {/* ── En-tête : marque, réglages, occupation en arches ─────────────── */}
      <header className="kb-hero">
        <div className="kb-hero-in">
          <div className="kb-bar">
            <div className="kb-brand">
              <img src="/apple-touch-icon.png" alt="" />
              <div style={{minWidth:0}}>
                <h1>{t("title")}</h1>
                <p className="kb-status">
                  {cloudStatus && (
                    <span><i className={"kb-dot"+(cloudStatus==="saving"?" saving":cloudStatus==="error"?" error":"")} />
                      {cloudStatus==="saving" ? t("saving") : cloudStatus==="saved" ? t("synced") : cloudStatus==="error" ? t("offline") : ""}
                    </span>
                  )}
                  {icsUrl && (
                    <span>
                      {syncStatus==="syncing" ? "↻ Sync…"
                        : syncStatus==="ok" ? `${t("syncOk")} ${lastSync ? new Date(lastSync).toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"}) : ""}`
                        : syncStatus==="error" && !lastSync ? t("syncFail")
                        : lastSync ? `${t("syncOk")} ${new Date(lastSync).toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"})}`
                        : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="kb-ctrls">
              <div className="kb-seg" role="group" aria-label={lang==="fr"?"Devise":"Currency"}>
                {["MAD","EUR"].map(c=>(
                  <button key={c} onClick={()=>setCurrency(c)} className={currency===c?"on":""} aria-pressed={currency===c}>{c}</button>
                ))}
              </div>
              <select value={year} onChange={e=>setYear(+e.target.value)} aria-label={lang==="fr"?"Année":"Year"}>
                {yearOptions.map(y=><option key={y}>{y}</option>)}
              </select>
              {icsUrl && <button className="kb-pill" onClick={()=>syncIcs()} disabled={syncStatus==="syncing"}>{syncStatus==="syncing"?"⏳":"↻"} {t("sync")}</button>}
              <button className={"kb-pill kb-grow"+(showTools?" on":"")} onClick={()=>setShowTools(v=>!v)} aria-expanded={showTools} aria-label={lang==="fr"?"Réglages":"Settings"}>⚙︎<span className="kb-hide-m"> {lang==="fr"?"Réglages":"Settings"}</span></button>
            </div>
          </div>

          {showTools && (
            <div className="kb-tools">
              <button className="kb-pill" onClick={exportExcel}>⬇ Excel {year}</button>
              <div className="kb-seg" role="group" aria-label="Langue">
                {["fr","en"].map(l=>(
                  <button key={l} onClick={()=>setLang(l)} className={lang===l?"on":""} aria-pressed={lang===l}>{l==="fr"?"FR":"EN"}</button>
                ))}
              </div>
              <button className="kb-pill" onClick={()=>setDarkMode(d=>!d)}>{darkMode?"☀️ "+(lang==="fr"?"Mode clair":"Light mode"):"🌙 "+(lang==="fr"?"Mode sombre":"Dark mode")}</button>
              <button className={"kb-pill"+(icsUrl?" ok":"")} onClick={()=>setShowIcsUrl(r=>!r)}>🔄 {icsUrl?t("autoSyncOn"):t("configSync")}</button>
              <button className="kb-pill" onClick={()=>setShowRate(r=>!r)}>1€ = {rate} MAD · {Math.round(commission*100)} %</button>
              <button className="kb-pill" onClick={exportJSON}>{t("backup")}</button>
              <label className="kb-pill">
                {t("restore")}
                <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){importJSON(e.target.files[0]);e.target.value="";}}} />
              </label>
              <button className="kb-pill warn" onClick={openRescue} title={lang==="fr"?"Sauvegardes automatiques du serveur":"Server backups"}>🛟 {lang==="fr"?"Secours":"Rescue"}</button>
            </div>
          )}

          {/* Occupation mois par mois */}
          <div className="kb-arches" aria-label={`${t("occupation")} ${year}`}>
            {months.map((m,mi)=>{
              const now   = new Date();
              const dim   = new Date(year, mi+1, 0).getDate();
              const n     = payingBookings.reduce((s,b)=>s+nightsInMonth(b,mi),0);
              const p     = persoBookings.reduce((s,b)=>s+nightsInMonth(b,mi),0);
              const pctN  = Math.min(100, Math.round((n/dim)*100));
              const pctP  = Math.min(100-pctN, Math.round((p/dim)*100));
              const state = year<now.getFullYear() || (year===now.getFullYear() && mi<now.getMonth()) ? ""
                          : year===now.getFullYear() && mi===now.getMonth() ? "now" : "fut";
              return (
                <div key={m} className={"kb-arch "+state} title={`${m} : ${pctN} % de nuits payantes (${n} n)${p?` + ${p} n perso`:""}`}>
                  <div className="kb-arch-shape">
                    <div className="kb-arch-fill" style={{height:`${pctN}%`}} />
                    {pctP>0 && <div className="kb-arch-perso" style={{bottom:`${pctN}%`,height:`${pctP}%`}} />}
                  </div>
                  <b>{pctN}%</b>
                  <span>{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="kb-main">

      {/* ── Panel taux + commission ──────────────────────────────────────── */}
      {showRate && (
        <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 14px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:13}}>
          <span style={{color:"var(--color-text-secondary)"}}>{t("rateLabel")}</span>
          <span style={{fontWeight:500}}>1 EUR =</span>
          <input type="number" value={rate} onChange={e=>setRate(parseFloat(e.target.value)||DEFAULT_RATE)} step="0.01" min="1" style={{width:90,padding:"4px 8px",fontSize:13}} />
          <span style={{fontWeight:500}}>MAD</span>
          <span style={{marginLeft:16,color:"var(--color-text-secondary)",fontWeight:500}}>|</span>
          <span style={{color:"var(--color-text-secondary)"}}>{t("commissionLabel")}</span>
          <input type="number" value={Math.round(commission*100)} onChange={e=>setCommission((parseFloat(e.target.value)||0)/100)} step="1" min="0" max="100" style={{width:60,padding:"4px 8px",fontSize:13}} />
          <span style={{fontWeight:500}}>%</span>
        </div>
      )}

      {/* ── Panel sync iCal ─────────────────────────────────────────────── */}
      {showIcsUrl && (
        <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"12px 14px",marginBottom:"1rem",fontSize:13}}>
          <p style={{margin:"0 0 8px",fontWeight:500,fontSize:13}}>{t("syncPanelTitle")}</p>
          <p style={{margin:"0 0 10px",fontSize:12,color:"var(--color-text-tertiary)"}}>{t("syncPanelDesc")}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input type="url" placeholder="https://www.airbnb.fr/calendar/ical/..." value={icsUrl} onChange={e=>setIcsUrl(e.target.value)} style={{flex:1,minWidth:200,padding:"6px 10px",fontSize:12,borderRadius:6,border:"1px solid var(--color-border-secondary)"}} />
            <button onClick={()=>syncIcs()} style={{padding:"6px 14px",fontSize:12,background:C_RESERVED,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}} disabled={!icsUrl}>{t("syncNow")}</button>
            {icsUrl && <button onClick={()=>{setIcsUrl("");setSyncStatus("");setLastSync(null);}} style={{padding:"6px 10px",fontSize:12,background:"none",border:"1px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-danger)"}}>{t("syncDelete")}</button>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:8}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:120}}>🅱️ Booking (iCal)</span>
            <input type="url" placeholder="https://ical.booking.com/v1/export?t=..." value={icsUrlBooking} onChange={e=>setIcsUrlBooking(e.target.value.trim())} style={{flex:1,minWidth:200,padding:"6px 10px",fontSize:12,borderRadius:6,border:"1px solid var(--color-border-secondary)"}} />
            {icsUrlBooking && <button onClick={()=>setIcsUrlBooking("")} style={{padding:"6px 10px",fontSize:12,background:"none",border:"1px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-danger)"}}>{t("syncDelete")}</button>}
          </div>
          {lastSync && <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-tertiary)"}}>{t("lastSync")} : {new Date(lastSync).toLocaleString(locale)}</p>}
          <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-warning)",background:"var(--color-background-warning)",borderRadius:6,padding:"6px 10px"}}>{t("syncDelay")}</p>
        </div>
      )}

      {/* ── Alertes arrivées / départs ───────────────────────────────────── */}
      {alerts.length > 0 && (
        <section style={{marginBottom:"1.5rem",display:"flex",flexDirection:"column",gap:8}}>
          <div className="kb-alerts-head">
            <h2>{t("alertsTitle")}</h2>
            {SHOW_NOTIF_BTN && !notifEnabled && "Notification" in window && (
              <button className="kb-mini-btn" onClick={requestNotifPermission}>{t("enableNotif")}</button>
            )}
            {SHOW_NOTIF_BTN && notifEnabled && (
              <button className="kb-mini-btn" onClick={()=>{setNotifEnabled(false);showToast(t("toastNotifOff"));}} style={{color:"var(--color-text-success)",borderColor:"var(--color-text-success)"}}>{t("notifOn")}</button>
            )}
          </div>
          {alerts.map((b,i) => {
            const isArr = b.type === "arrival";
            const bg  = b.daysUntil===0 ? "var(--kb-danger-bg)" : b.daysUntil<=2 ? "var(--color-background-warning)" : isArr ? "var(--kb-accent-bg)" : "var(--kb-perso-bg)";
            const col = b.daysUntil===0 ? "var(--color-text-danger)" : b.daysUntil<=2 ? "var(--color-text-warning)" : isArr ? "var(--kb-accent)" : "var(--kb-perso)";
            const icon= isArr ? "🧳" : "🚪";
            const msg = isArr
              ? (b.daysUntil===0?t("arrivalToday"):b.daysUntil===1?t("arrivalTomorrow"):`${t("arrivalIn")} ${b.daysUntil}${t("days")}`)
              : (b.daysUntil===0?t("departureToday"):b.daysUntil===1?t("departureTomorrow"):`${t("departureIn")} ${b.daysUntil}${t("days")}`);
            return (
              <div key={b.id+b.type} className="kb-alert" style={{"--c":col,"--bg":bg}}>
                <span aria-hidden="true">{icon}</span>
                <span className="kb-alert-msg">{msg}</span>
                <span className="kb-alert-who">{b.name||b.id}</span>
                <span className="kb-alert-meta">{fmtDate(isArr?b.checkIn:b.checkOut,locale)} · {b.nights} n{b.guests?` · 👥 ${b.guests}`:""}</span>
                <span className="kb-alert-pf">{b.platform}</span>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Chiffres clés ────────────────────────────────────────────────── */}
      {(() => {
        const netProfit = pastRevenue - pastExp;
        const num = (v) => new Intl.NumberFormat("fr-MA",{maximumFractionDigits:0}).format(Math.round(v));
        return (
          <section className="kb-figs">
            <div className="kb-fig">
              <p className="kb-fig-l">{t("occupation")} {year}</p>
              <p className="kb-fig-v">{occupancy} %</p>
              <p className="kb-fig-s">{totalNights} {t("payingNights")} + {persoNights} {t("persoNights")}</p>
            </div>
            <div className="kb-fig">
              <p className="kb-fig-l">{t("avgNight")}</p>
              <p className="kb-fig-v">{avgNight ? <>{num(avgNight)}<small>MAD</small></> : "—"}</p>
              <p className="kb-fig-s">{avgNight > 0 ? fmtEUR(avgNight/rate)+" · " : ""}{t("onAmounts")}</p>
            </div>
            <div className="kb-fig neg">
              <p className="kb-fig-l">{lang==="fr"?"Dépenses à date":"Expenses to date"}</p>
              <p className="kb-fig-v">{num(pastExp)}<small>MAD</small></p>
              <p className="kb-fig-s">{fmtEUR(pastExp/rate)}{futureExp>0 ? ` · + ${fmtMAD(futureExp)} ${lang==="fr"?"à venir":"upcoming"}` : ""}</p>
            </div>
            <div className={"kb-fig "+(netProfit>=0?"pos":"neg")}>
              <p className="kb-fig-l">{lang==="fr"?"Bénéfice net à date":"Net profit to date"}</p>
              <p className="kb-fig-v">{netProfit>=0?"+":""}{num(netProfit)}<small>MAD</small></p>
              <p className="kb-fig-s">{netProfit>=0?"+":""}{fmtEUR(netProfit/rate)} · {lang==="fr"?"encaissé moins dépenses":"collected minus expenses"}</p>
            </div>
          </section>
        );
      })()}

      {/* ── Encarts cliquables : échues / à venir / CA total ─────────────── */}
      <section className="kb-stats">
        {[
          {key:"past",   label:t("pastBookings"),       value:fmtBoth(pastRevenue,rate),    sub:pastBookings_.length+" "+(pastBookings_.length>1?t("staysDonePlural"):t("staysDone")),     color:"var(--color-text-success)"},
          {key:"future", label:t("futureBookings"),      value:fmtBoth(futureRevenue,rate),  sub:futureBookings_.length+" "+(futureBookings_.length>1?t("staysAheadPlural"):t("staysAhead")), color:C_BLOCKED},
          {key:"all",    label:`${t("caTotal")} ${year}`,value:fmtBoth(totalRevenue,rate),   sub:(Math.round((pastRevenue/totalRevenue)*100)||0)+"% "+t("encaisse")+" · "+(Math.round((futureRevenue/totalRevenue)*100)||0)+"% "+t("aVenir"), color:"var(--kb-ca)"},
        ].map(card => (
          <button key={card.key} type="button"
            onClick={()=>setStatsPanel(statsPanel===card.key?null:card.key)}
            className={"kb-stat"+(statsPanel===card.key?" on":"")}
            aria-expanded={statsPanel===card.key}
            style={{"--c":card.color}}
          >
            <span className="kb-stat-l">{card.label}<i>{statsPanel===card.key?"▲":"▼"}</i></span>
            <span className="kb-stat-v" style={{display:"block"}}>{card.value}</span>
            <span className="kb-stat-s">{card.sub}</span>
          </button>
        ))}
      </section>
      {/* ── Panel détail réservations (stats) ───────────────────────────── */}
      {statsPanel && (() => {
        const list  = statsPanel==="past" ? pastBookings_ : statsPanel==="future" ? futureBookings_ : payingBookings;
        const title = statsPanel==="past" ? t("pastBookings") : statsPanel==="future" ? t("futureBookings") : `${t("caTotal")} ${year}`;
        const color = statsPanel==="past" ? "var(--color-text-success)" : statsPanel==="future" ? C_BLOCKED : "var(--kb-ca)";
        return (
          <div style={{...rc,marginBottom:"1.25rem",borderLeft:`3px solid ${color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <p style={{margin:0,fontSize:14,fontWeight:500,color}}>{title}</p>
              <button onClick={()=>setStatsPanel(null)} style={{fontSize:12,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)"}}>{t("closeBtn")}</button>
            </div>
            {list.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,margin:0}}>{t("noBookings")}</p>
              : (
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
                      {[t("hPayment"),t("hClient"),t("colArrival"),t("colDeparture"),t("colNights"),t("colGuests"),t("hPlatform"),t("hNetTotal")].map(h=>(
                        <th key={h} style={{padding:"6px 8px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...list].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b=>(
                      <tr key={b.id} style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"8px"}}><button onClick={()=>togglePaid(b.id)} title={b.paid?t("markUnpaid"):t("markPaid")} style={{border:"none",background:"none",cursor:"pointer",fontSize:14}}>{isEffectivelyPaid(b)?"✅":"⏳"}</button></td>
                        <td style={{padding:"8px",fontWeight:500}}>{b.name||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</td>
                        <td style={{padding:"8px",whiteSpace:"nowrap"}}>{fmtDate(b.checkIn,locale)}</td>
                        <td style={{padding:"8px",whiteSpace:"nowrap"}}>{fmtDate(b.checkOut,locale)}</td>
                        <td style={{padding:"8px",color:"var(--color-text-secondary)"}}>{b.nights}n</td>
                        <td style={{padding:"8px",color:"var(--color-text-secondary)",textAlign:"center"}}>{b.guests?<span style={{fontWeight:500}}>👥 {b.guests}</span>:"—"}</td>
                        <td style={{padding:"8px"}}><span style={{fontSize:11,padding:"2px 6px",borderRadius:99,background:"var(--color-background-secondary)"}}>{b.platform}</span></td>
                        <td style={{padding:"8px",fontWeight:500,color:isEffectivelyPaid(b)?"var(--color-text-success)":"var(--color-text-warning)"}}>{b.amount>0?fmtBoth(netAmount(b),rate):<span style={{fontSize:12}}>{t("toEnter")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{padding:"8px",fontWeight:500,fontSize:13}}>{t("total")} · {list.filter(b=>isEffectivelyPaid(b)).length}/{list.length} {lang==="fr"?`payé${list.filter(b=>isEffectivelyPaid(b)).length>1?"s":""}`:  "paid"}</td>
                      <td style={{padding:"8px",fontWeight:600,color:"var(--color-text-info)",textAlign:"center"}}>👥 {list.reduce((s,b)=>s+(parseInt(b.guests)||0),0)}</td>
                      <td></td>
                      <td style={{padding:"8px",fontWeight:600,color}}>{fmtBoth(list.reduce((s,b)=>s+netAmount(b),0),rate)}</td>
                    </tr>
                  </tfoot>
                </table>
              )
            }
          </div>
        );
      })()}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <nav className="kb-tabs" aria-label="Sections">
        {tabBtn("calendar", t("tabCalendar"))}
        {tabBtn("bookings", `${t("tabBookings")}${pendingCount>0?` (${pendingCount} ⚠)`:""}`)}
        {tabBtn("chart",    t("tabChart"))}
        {tabBtn("expenses", t("tabExpenses"))}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB : CALENDRIER                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab==="calendar" && (
        <div>
          <div style={{display:"flex",gap:12,marginBottom:"1.25rem",flexWrap:"wrap"}}>
            <DropZone label={t("dropIcsLabel")} sub={t("dropIcsSub")} accept=".ics" onFile={handleIcs} color={C_RESERVED} />
            <DropZone label={t("dropCsvLabel")} sub={t("dropCsvSub")} accept=".csv" onFile={handleCsv} color="var(--color-text-info)" />
          </div>
          {/* Légende */}
          <div style={{display:"flex",gap:12,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
            {[
              {bg:C_AVAIL,    label:t("available")},
              {bg:C_RESERVED, label:t("reserved")},
              {bg:C_BLOCKED,  label:t("perso")},
              {bg:C_TODAY_BG, border:"2px solid "+C_TODAY_FG, label:t("today")},
            ].map(l=>(
              <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--color-text-secondary)"}}>
                <div style={{width:16,height:16,borderRadius:4,background:l.bg,flexShrink:0,border:l.border||"none"}} />
                {l.label}
              </div>
            ))}
          </div>
          {/* Grille calendrier */}
          <div style={{...rc,marginBottom:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8}}>
              <p className="kb-h" style={{margin:0,fontSize:14,fontWeight:500}}>{t("calendarTitle")} {year}</p>
              <div style={{display:"flex",gap:4,background:"var(--color-background-secondary)",borderRadius:8,padding:3}}>
                {[{key:"all",label:t("allMonths")},{key:"upcoming",label:t("upcoming")}].map(v=>(
                  <button key={v.key} onClick={()=>setCalView(v.key)} style={{border:"none",borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:calView===v.key?600:400,background:calView===v.key?"var(--color-background-primary)":"transparent",cursor:"pointer",color:calView===v.key?"var(--color-text-primary)":"var(--color-text-secondary)",boxShadow:calView===v.key?"0 1px 4px rgba(0,0,0,0.12)":"none",transition:"all .15s"}}>{v.label}</button>
                ))}
              </div>
            </div>
            {bookings.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,textAlign:"center",padding:"1.5rem 0"}}>{t("importIcsMsg")}</p>
              : (
                <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                  {(calView==="upcoming"
                    ? calMonths.filter(({month})=>month>=new Date().getMonth())
                    : calMonths
                  ).map(({year:y,month:m})=>(
                    <MonthCalendar key={`${y}-${m}`} year={y} month={m} bookings={bookings} blocked={blocked} monthName={months[m]} />
                  ))}
                </div>
              )
            }
          </div>
          {/* Périodes bloquées perso */}
          <div style={rc}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
              <p className="kb-h" style={{margin:0,fontSize:14,fontWeight:500}}>{t("personalPeriods")}</p>
              <button className="kb-primary" onClick={()=>setShowAddBl(!showAddBl)}>{t("blockDates")}</button>
            </div>
            {showAddBl && (
              <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"1rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500}}>{t("newBlocked")}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmFrom")}</label><input type="date" style={inp} value={blForm.start} onChange={e=>setBlForm(f=>({...f,start:e.target.value}))} /></div>
                  <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmTo")}</label><input type="date" style={inp} value={blForm.end} onChange={e=>setBlForm(f=>({...f,end:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmReason")}</label><input type="text" placeholder={lang==="fr"?"Vacances perso":"Personal vacation"} style={inp} value={blForm.label} onChange={e=>setBlForm(f=>({...f,label:e.target.value}))} /></div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="kb-primary" onClick={addBlocked}>{t("save")}</button>
                  <button onClick={()=>setShowAddBl(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                </div>
              </div>
            )}
            {blocked.filter(b=>b.type==="personal").length===0 && !showAddBl
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,margin:0}}>{t("noPersonalPeriods")}</p>
              : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {blocked.filter(b=>b.type==="personal").map((b,i)=>{
                    const n = Math.round((new Date(b.end)-new Date(b.start))/86400000);
                    const convertToBooking = () => {
                      setBlocked(prev=>prev.filter(x=>x!==b));
                      setBookings(prev=>[...prev,{id:genId(),checkIn:b.start,checkOut:b.end,nights:n,platform:"Direct",phone:"",name:b.label||"",amount:0,uid:""}]);
                      setTab("bookings");
                      showToast(t("toastConverted"));
                    };
                    return (
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"var(--kb-perso-bg)",borderRadius:"var(--border-radius-md)",flexWrap:"wrap",gap:8}}>
                        <span style={{fontSize:13,color:C_BLOCKED,fontWeight:500}}>{b.label||(lang==="fr"?"Bloqué":"Blocked")}</span>
                        <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{fmtDate(b.start,locale)} → {fmtDate(b.end,locale)}</span>
                        <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{n} {n>1?t("dayPlural"):t("daySingle")}</span>
                        <button onClick={convertToBooking} style={{fontSize:12,padding:"4px 12px",background:C_RESERVED,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>{t("toBooking")}</button>
                        <button onClick={()=>{setBlocked(prev=>prev.filter(x=>x!==b));showToast(t("toastBlockedDel"));}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer"}}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )
            }
            {/* Indispo Airbnb */}
            {(() => {
              const airbnbBlocked = blocked.filter(b => {
                if (b.type !== "airbnb" && b.type) return false;
                return !isBlockFullyCovered(b, bookings, blocked);
              });
              if (!airbnbBlocked.length) return null;
              return (
                <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid var(--color-border-tertiary)"}}>
                  <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-tertiary)"}}>{t("airbnbUnavail")}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {airbnbBlocked.map((b,i)=>{
                      const n = Math.round((new Date(b.end)-new Date(b.start))/86400000);
                      const convertToBooking = () => {
                        setBlocked(prev=>prev.filter(x=>x!==b));
                        setBookings(prev=>[...prev,{id:genId(),checkIn:b.start,checkOut:b.end,nights:n,platform:"Direct",phone:"",name:"",amount:0,uid:""}]);
                        setNextId(nid=>nid+1);
                        setTab("bookings");
                        showToast(t("toastConvertedFull"));
                      };
                      return (
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"var(--color-text-secondary)",padding:"8px 10px",background:"var(--color-background-secondary)",borderRadius:6,flexWrap:"wrap",gap:6}}>
                          <span>{fmtDate(b.start,locale)} → {fmtDate(b.end,locale)}</span>
                          <span style={{color:"var(--color-text-tertiary)"}}>{n} {n>1?t("dayPlural"):t("daySingle")}</span>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={convertToBooking} style={{fontSize:11,padding:"3px 10px",background:C_RESERVED,color:"#fff",border:"none",borderRadius:5,cursor:"pointer"}}>{t("toBooking")}</button>
                            <button onClick={()=>{
                              const uid = b.uid || (b.start+"_"+b.end);
                              setIgnoredBlocks(prev=>[...new Set([...prev,uid])]);
                              setBlocked(prev=>prev.filter(x=>x!==b));
                              showToast(t("toastAirbnbDel"));
                            }} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB : RÉSERVATIONS                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab==="bookings" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:8}}>
            <p style={{margin:0,fontSize:14,color:"var(--color-text-secondary)"}}>
              {listBookings.length} {upcomingAll?(lang==="fr"?"réservations à venir, toutes années":"upcoming bookings, all years"):t("bookingsSummary")} · {fmtBoth(listRevenue,rate)}
              {pendingCount>0 && <span style={{marginLeft:8,fontSize:12,color:"var(--color-text-warning)"}}>({pendingCount} {t("noAmountSet")})</span>}
            </p>
            <button className="kb-primary" onClick={()=>setShowAddB(!showAddB)}>{t("addBooking")}</button>
          </div>
          {/* Recherche + filtre */}
          <div style={{display:"flex",gap:8,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
            <input type="text" placeholder={lang==="fr"?"🔍 Rechercher (nom, code)...":"🔍 Search (name, code)..."} value={bookingSearch} onChange={e=>setBookingSearch(e.target.value)}
              style={{flex:1,minWidth:180,padding:"6px 10px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)"}} />
            <button type="button" onClick={()=>{setUpcomingAll(v=>!v);setMonthFilter("all");}} aria-pressed={upcomingAll}
              style={{padding:"6px 12px",fontSize:13,borderRadius:99,whiteSpace:"nowrap",border:`1px solid ${upcomingAll?"var(--kb-teal)":"var(--color-border-secondary)"}`,background:upcomingAll?"var(--kb-teal)":"var(--color-background-primary)",color:upcomingAll?"#fff":"var(--color-text-secondary)"}}>
              {upcomingAll?"✓ ":""}{lang==="fr"?"À venir, toutes années":"Upcoming, all years"}
            </button>
            {!upcomingAll && (() => {
              const monthsPresent = [...Array(12).keys()].filter(mi=>listBookings.some(b=>overlapsMonth(b,year,mi))).sort((a,b)=>b-a);
              return (
                <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
                  style={{width:"auto",minWidth:130,padding:"6px 10px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)",background:"var(--color-background-secondary)"}}>
                  <option value="all">{lang==="fr"?"Tous les mois":"All months"}</option>
                  {monthsPresent.map(mi=>(
                    <option key={mi} value={mi}>{months[mi]} {year}</option>
                  ))}
                </select>
              );
            })()}
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {["all",...new Set(listBookings.map(b=>b.platform))].map(p=>(
                <button key={p} onClick={()=>setPlatformFilter(p)}
                  style={{padding:"4px 10px",fontSize:12,borderRadius:99,border:"1px solid var(--color-border-secondary)",background:platformFilter===p?"var(--color-text-primary)":"var(--color-background-secondary)",color:platformFilter===p?"var(--color-background-primary)":"var(--color-text-secondary)",cursor:"pointer",fontWeight:platformFilter===p?600:400}}>
                  {p==="all"?(lang==="fr"?"Tous":"All"):p}
                </button>
              ))}
            </div>
          </div>
          {/* Formulaire ajout */}
          {showAddB && (
            <div style={{...rc,marginBottom:"1.25rem",background:"var(--color-background-secondary)",border:"none"}}>
              <p className="kb-h" style={{margin:"0 0 12px",fontSize:14,fontWeight:500}}>{t("newDirectBooking")}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("colArrival")}</label><input type="date" style={inp} value={bForm.checkIn} onChange={e=>setBForm(f=>({...f,checkIn:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("colDeparture")}</label><input type="date" style={inp} value={bForm.checkOut} onChange={e=>setBForm(f=>({...f,checkOut:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmName")}</label><input type="text" placeholder={t("frmPlaceholderName")} style={inp} value={bForm.name} onChange={e=>setBForm(f=>({...f,name:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmPhone")}</label><input type="text" placeholder={t("frmPlaceholderPhone")} style={inp} value={bForm.phone} onChange={e=>setBForm(f=>({...f,phone:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmPlatform")}</label><select style={inp} value={bForm.platform} onChange={e=>setBForm(f=>({...f,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmGuests")}</label><input type="number" placeholder={t("frmPlaceholderGuests")} min="1" style={inp} value={bForm.guests} onChange={e=>setBForm(f=>({...f,guests:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" placeholder={t("frmPlaceholderAmount")} style={inp} value={bForm.amount} onChange={e=>setBForm(f=>({...f,amount:e.target.value}))} /></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Notes</label><textarea placeholder={lang==="fr"?"Informations complémentaires...":"Additional info..."} style={{...inp,height:60,resize:"vertical",fontFamily:"inherit",fontSize:13,padding:"6px 8px"}} value={bForm.notes||""} onChange={e=>setBForm(f=>({...f,notes:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="kb-primary" onClick={addBooking}>{t("save")}</button>
                <button onClick={()=>setShowAddB(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
              </div>
            </div>
          )}
          {/* Modal édition réservation */}
          {editBooking && (
            <div className="kb-overlay" style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
              <div className="kb-modal" style={{background:"var(--color-background-primary)",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:440,maxHeight:"calc(100vh - 2rem)",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
                <p className="kb-h" style={{margin:"0 0 16px",fontSize:15,fontWeight:500}}>{t("editBookingModalTitle")}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("colArrival")}</label><input type="date" style={inp} value={editBooking.checkIn} onChange={e=>setEditBooking(b=>({...b,checkIn:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("colDeparture")}</label><input type="date" style={inp} value={editBooking.checkOut} onChange={e=>setEditBooking(b=>({...b,checkOut:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmName")}</label><input type="text" style={inp} value={editBooking.name||""} onChange={e=>setEditBooking(b=>({...b,name:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmPlatform")}</label><select style={inp} value={editBooking.platform} onChange={e=>setEditBooking(b=>({...b,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmGuests")}</label><input type="number" min="1" style={inp} value={editBooking.guests||""} onChange={e=>setEditBooking(b=>({...b,guests:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" style={inp} value={editBooking.amount||""} onChange={e=>setEditBooking(b=>({...b,amount:parseFloat(e.target.value)||0}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Notes</label><textarea style={{...inp,height:60,resize:"vertical",fontFamily:"inherit",fontSize:13,padding:"6px 8px"}} value={editBooking.notes||""} onChange={e=>setEditBooking(b=>({...b,notes:e.target.value}))} /></div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button className="kb-primary" onClick={saveEditBooking} style={{flex:1}}>{t("save")}</button>
                  <button onClick={()=>setEditBooking(null)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                </div>
              </div>
            </div>
          )}
          {/* Table / cartes */}
          {(() => {
            const filteredBookings = listBookings.filter(b => {
              const matchSearch   = !bookingSearch || (b.name||"").toLowerCase().includes(bookingSearch.toLowerCase()) || (b.id||"").toLowerCase().includes(bookingSearch.toLowerCase());
              const matchPlatform = platformFilter==="all" || b.platform===platformFilter;
              const matchMonth    = upcomingAll || monthFilter==="all" || overlapsMonth(b,year,+monthFilter);
              return matchSearch && matchPlatform && matchMonth;
            });
            const groupByMonth = (list) => {
              const sorted = [...list].sort((a,b)=>upcomingAll ? new Date(a.checkIn)-new Date(b.checkIn) : new Date(b.checkIn)-new Date(a.checkIn));
              const groups = [];
              let cur = null;
              sorted.forEach(b => {
                const d = new Date(b.checkIn);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (!cur || cur.key !== key) {
                  cur = { key, label:`${months[d.getMonth()]} ${d.getFullYear()}`, items:[] };
                  groups.push(cur);
                }
                cur.items.push(b);
              });
              return groups;
            };
            return (
              <div style={rc}>
                {filteredBookings.length===0
                  ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,textAlign:"center",padding:"1.5rem 0"}}>{bookingSearch||platformFilter!=="all"||monthFilter!=="all" ? (lang==="fr"?"Aucun résultat":"No results") : `${t("noBookYear")} ${year}.`}</p>
                  : isMobile
                    /* ── MOBILE : cartes ── */
                    ? (
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {groupByMonth(filteredBookings).map(g=>(
                          <div key={g.key} style={{display:"flex",flexDirection:"column",gap:10}}>
                            <p style={{margin:"6px 0 0",fontSize:12,fontWeight:600,textTransform:"capitalize",color:"var(--color-text-tertiary)",borderBottom:"1px solid var(--color-border-tertiary)",paddingBottom:4}}>{g.label} · {g.items.length}</p>
                            {g.items.map(b=>(
                          <div key={b.id} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${C_RESERVED}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                              <div>
                                {b.name && <p style={{margin:"0 0 2px",fontSize:14,fontWeight:500}}>{b.name}</p>}
                                <span style={{fontSize:10,fontFamily:"var(--font-mono)",color:"var(--color-text-info)",background:"var(--color-background-info)",padding:"2px 6px",borderRadius:4}}>{b.id}</span>
                                <span style={{marginLeft:6,fontSize:11,color:"var(--color-text-tertiary)"}}>{b.platform}</span>
                                <span style={{marginLeft:6,fontSize:11,fontWeight:600,color:b.paid?"var(--color-text-success)":"var(--color-text-warning)"}}>{b.paid?t("paidStatus"):t("unpaidStatus")}</span>
                              </div>
                              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                <button onClick={()=>togglePaid(b.id)} style={{fontSize:13,border:"none",background:"none",cursor:"pointer",padding:"0 2px"}}>{isEffectivelyPaid(b)?"✅":"⏳"}</button>
                                <button onClick={()=>printRecap(b)} style={{fontSize:13,border:"none",background:"none",cursor:"pointer",padding:"0 2px"}}>📄</button>
                                <button onClick={()=>setEditBooking({...b})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"0 4px"}}>✏️</button>
                                <button
  onClick={()=>setConfirmDelete({label:`${b.name||b.id} · ${b.nights}n · ${b.platform}`,onConfirm:()=>{setBookings(prev=>prev.filter(x=>x.id!==b.id));showToast(t("toastBookingDel"));}})}
  style={{fontSize:12,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"8px",minWidth:36,minHeight:36}}>✕</button>
                              </div>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px",fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>
                              <span>📅 {fmtDate(b.checkIn,locale)}</span>
                              <span>🏠 {fmtDate(b.checkOut,locale)}</span>
                              <span>🌙 {b.nights} {b.nights>1?t("nightPlural"):t("nightSingle")}</span>
                              {b.guests && <span>👥 {b.guests} {b.guests>1?t("personPlural"):t("personSingle")}</span>}
                              {b.phone  && <span>📱 {b.phone}</span>}
                            </div>
                            {b.notes && <p style={{margin:"4px 0 6px",fontSize:12,color:"var(--color-text-secondary)",fontStyle:"italic",padding:"4px 8px",background:"var(--color-background-primary)",borderRadius:4}}>📝 {b.notes}</p>}
                            {editId===b.id
                              ? <span style={{display:"flex",gap:6}}><input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAmount(b.id)} style={{flex:1,padding:"5px 8px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)"}} autoFocus /><button onClick={()=>saveAmount(b.id)} style={{padding:"5px 14px",fontSize:13}}>OK</button></span>
                              : (
                                <div onClick={()=>{setEditId(b.id);setEditAmt(b.amount||"");}} style={{cursor:"pointer"}}>
                                  {b.amount>0
                                    ? (
                                      <div>
                                        <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>
                                          {hasComm(b)
                                            ? <><span style={{textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount)}</span>{fmtBoth(b.amount*(1-commission),rate)}</>
                                            : fmtBoth(b.amount,rate)
                                          } <span style={{fontSize:10}}>/{t("nightSingle")}</span>
                                        </p>
                                        {hasComm(b)
                                          ? <><p style={{margin:0,fontSize:13,color:"var(--color-text-tertiary)",textDecoration:"line-through"}}>{fmtMAD(totalStay(b))}</p><p style={{margin:0,fontSize:14,fontWeight:600,color:C_RESERVED}}>{fmtBoth(netAmount(b),rate)} <span style={{fontSize:11,fontWeight:400}}>(-{Math.round(commission*100)}%)</span></p></>
                                          : <p style={{margin:0,fontSize:14,fontWeight:600,color:C_RESERVED}}>{fmtBoth(totalStay(b),rate)}</p>
                                        }
                                      </div>
                                    )
                                    : <span style={{fontSize:13,textDecoration:"underline dotted",color:"var(--color-text-warning)"}}>{t("enterRate")}</span>
                                  }
                                </div>
                              )
                            }
                          </div>
                            ))}
                          </div>
                        ))}
                        <div style={{padding:"10px 0",fontWeight:500,fontSize:13,borderTop:"1px solid var(--color-border-tertiary)",color:"var(--color-text-success)"}}>
                          {t("total")} : {fmtBoth(listRevenue,rate)}
                        </div>
                      </div>
                    )
                    /* ── DESKTOP : tableau ── */
                    : (
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                        <thead>
                          <tr style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
                            {[t("colArrival"),t("colDeparture"),t("colCode"),t("colName"),t("colNights"),t("colGuests"),t("colRate"),t("colTotal"),""].map((h,hi)=>(
                              <th key={h} style={{padding:"8px 6px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12,whiteSpace:"nowrap",width:["11%","11%","8%","auto","6%","8%","15%","15%","104px"][hi]}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupByMonth(filteredBookings).map(g=>(
                            <Fragment key={g.key}>
                              <tr><td colSpan={9} style={{padding:"14px 6px 6px",fontSize:12,fontWeight:600,textTransform:"capitalize",color:"var(--color-text-tertiary)"}}>{g.label} · {g.items.length}</td></tr>
                              {g.items.map(b=>(
                            <tr key={b.id} style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
                              <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(b.checkIn,locale)}</td>
                              <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(b.checkOut,locale)}</td>
                              <td style={{padding:"6px"}}><span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--color-text-info)",background:"var(--color-background-info)",padding:"2px 6px",borderRadius:4}}>{b.id}</span></td>
                              <td style={{padding:"10px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</td>
                              <td style={{padding:"10px 6px",color:"var(--color-text-secondary)"}}>{b.nights}n</td>
                              <td style={{padding:"10px 6px",color:"var(--color-text-secondary)"}}>{b.guests?`👥 ${b.guests}`:"—"}</td>
                              <td style={{padding:"10px 6px"}}>
                                {editId===b.id
                                  ? <span style={{display:"flex",gap:4}}><input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAmount(b.id)} style={{width:80,padding:"2px 6px",fontSize:12}} autoFocus /><button onClick={()=>saveAmount(b.id)} style={{fontSize:11,padding:"2px 8px"}}>OK</button></span>
                                  : (
                                    <span onClick={()=>{setEditId(b.id);setEditAmt(b.amount||"");}} style={{cursor:"pointer",color:"var(--color-text-secondary)"}}>
                                      {b.amount>0
                                        ? hasComm(b)
                                          ? <span><span style={{fontSize:11,textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount)}</span><span style={{fontWeight:500}}>{fmtBoth(b.amount*(1-commission),rate)}</span><span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>/{t("nightSingle")}</span></span>
                                          : <span>{fmtBoth(b.amount,rate)}<span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>/{t("nightSingle")}</span></span>
                                        : <span style={{fontSize:12,textDecoration:"underline dotted",color:"var(--color-text-warning)"}}>{t("enterRate")}</span>
                                      }
                                    </span>
                                  )
                                }
                              </td>
                              <td style={{padding:"10px 6px"}}>
                                {b.amount>0
                                  ? hasComm(b)
                                    ? <span><span style={{fontSize:11,color:"var(--color-text-tertiary)",textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount*b.nights)}</span><span style={{fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(netAmount(b),rate)}</span></span>
                                    : <span style={{fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(b.amount*b.nights,rate)}</span>
                                  : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>
                                }
                              </td>
                              <td style={{padding:"10px 6px",textAlign:"right",whiteSpace:"nowrap"}}>
                                <button onClick={()=>togglePaid(b.id)} title={isEffectivelyPaid(b)?t("markUnpaid"):t("markPaid")} style={{fontSize:11,border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>{isEffectivelyPaid(b)?"✅":"⏳"}</button>
                                <button onClick={()=>printRecap(b)} title={lang==="fr"?"Fiche récap PDF":"PDF summary"} style={{fontSize:11,border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>📄</button>
                                <button onClick={()=>setEditBooking({...b})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>✏️</button>
                                <button
  onClick={()=>setConfirmDelete({label:`${b.name||b.id} · ${b.nights}n · ${b.platform}`,onConfirm:()=>{setBookings(prev=>prev.filter(x=>x.id!==b.id));showToast(t("toastBookingDel"));}})}
  style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"8px",minWidth:36,minHeight:36}}>✕</button>
                              </td>
                            </tr>
                              ))}
                            </Fragment>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={7} style={{padding:"10px 6px",fontWeight:500}}>{t("totalStays")}</td>
                            <td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(listRevenue,rate)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    )
                }
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB : GRAPHIQUE                                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab==="chart" && (
        <div>
          {/* ── Tableau bilan mensuel ──────────────────────────────────── */}
          <div style={rc}>
            <p className="kb-h" style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>{t("chartTitle")} {year}</p>

            {/* En-tête desktop */}
            {!isMobile && (
              <div style={{display:"grid",gridTemplateColumns:"38px 34px 38px 1fr 1fr 1fr 1fr 100px",gap:6,padding:"0 8px 8px",borderBottom:"1px solid var(--color-border-tertiary)",fontSize:11,color:"var(--color-text-tertiary)"}}>
                <span></span>
                <span style={{textAlign:"center"}}>{lang==="fr"?"Nuits":"Nights"}</span>
                <span style={{textAlign:"center"}}>%</span>
                <span style={{textAlign:"right"}}>{lang==="fr"?"Brut":"Gross"}</span>
                <span style={{textAlign:"right"}}>{lang==="fr"?"Net":"Net"}</span>
                <span style={{textAlign:"right"}}>{lang==="fr"?"Dépenses":"Expenses"}</span>
                <span style={{textAlign:"right"}}>{lang==="fr"?"Bénéfice":"Profit"}</span>
                <span></span>
              </div>
            )}

            {/* Lignes mensuelles */}
            {months.map((m, mi) => {
              const daysInMonth  = new Date(year, mi+1, 0).getDate();
              const mBookings    = payingBookings.filter(b => {
                const mStart = new Date(year,mi,1); const mEnd = new Date(year,mi+1,1);
                return new Date(b.checkIn) < mEnd && new Date(b.checkOut) > mStart;
              });
              const mNights  = mBookings.reduce((s,b)=>s+nightsInMonth(b,mi),0);
              const mGross   = mBookings.reduce((s,b)=>s+b.amount*nightsInMonth(b,mi),0);
              const mNet     = mBookings.reduce((s,b)=>s+(hasComm(b)?b.amount*(1-commission):b.amount)*nightsInMonth(b,mi),0);
              const mExp     = yearExpenses.filter(e=>new Date(e.date).getMonth()===mi).reduce((s,e)=>s+e.amount,0);
              const mProfit  = mNet - mExp;
              const fillPct  = Math.round((mNights/daysInMonth)*100);
              const isCurr   = mi===new Date().getMonth() && year===new Date().getFullYear();
              const profitCol= mProfit>0?"var(--color-text-success)":mProfit<0?"var(--color-text-danger)":"var(--color-text-tertiary)";
              // Libellé occupation
              const occLabel = fillPct>=70?(lang==="fr"?"Excellent":"Excellent"):fillPct>=40?(lang==="fr"?"Bon":"Good"):fillPct>0?(lang==="fr"?"Faible":"Low"):(lang==="fr"?"Libre":"Free");
              const occCol   = fillPct>=70?"var(--color-text-success)":fillPct>=40?"var(--color-text-warning)":fillPct>0?"var(--color-text-danger)":"var(--color-text-tertiary)";
              const occBg    = fillPct>=70?"var(--color-background-success)":fillPct>=40?"var(--color-background-warning)":fillPct>0?"var(--kb-danger-bg)":"var(--color-background-secondary)";
              // Libellé bénéfice
              const profLabel= mProfit>0?(lang==="fr"?"Bén.":"Profit"):mProfit<0?(lang==="fr"?"Déf.":"Loss"):"—";
              const profBg   = mProfit>0?"var(--color-background-success)":mProfit<0?"var(--kb-danger-bg)":"var(--color-background-secondary)";
              const profLbl  = mProfit>0?"var(--color-text-success)":mProfit<0?"var(--color-text-danger)":"var(--color-text-tertiary)";

              return isMobile ? (
                /* ── MOBILE : carte compacte ── */
                <div key={m} style={{padding:"10px 8px",borderBottom:"1px solid var(--color-border-tertiary)",background:isCurr?"var(--color-background-secondary)":"transparent",borderLeft:isCurr?"3px solid var(--kb-accent)":"3px solid transparent"}}>
                  {/* Ligne unique : mois | badge | nuits | net | dép | bénéfice */}
                  <div style={{display:"grid",gridTemplateColumns:"32px 90px 30px 1fr 1fr 1fr",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,fontWeight:isCurr?500:400}}>{m}</span>
                    <span style={{fontSize:10,padding:"2px 6px",borderRadius:99,background:occBg,color:occCol,fontWeight:500,textAlign:"center",whiteSpace:"nowrap"}}>{fillPct}% · {occLabel}</span>
                    <span style={{fontSize:12,color:"var(--color-text-secondary)",textAlign:"center"}}>{mNights>0?`${mNights}n`:"—"}</span>
                    <div style={{textAlign:"right"}}>
                      {mNights>0 && <><div style={{fontSize:9,color:"var(--color-text-tertiary)"}}>Net</div><div style={{fontSize:11,fontWeight:500,color:"var(--color-text-success)"}}>{fmtMAD(mNet)}</div></>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:9,color:"var(--color-text-tertiary)"}}>{lang==="fr"?"Dép.":"Exp."}</div>
                      <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-danger)"}}>{fmtMAD(mExp)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:9,color:"var(--color-text-tertiary)"}}>{lang==="fr"?"Bén.":"Profit"}</div>
                      <div style={{fontSize:11,fontWeight:500,color:profitCol}}>{mProfit>0?"+":""}{fmtMAD(mProfit)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── DESKTOP : ligne tableau ── */
                <div key={m} style={{display:"grid",gridTemplateColumns:"38px 34px 38px 1fr 1fr 1fr 1fr 100px",gap:6,padding:"9px 8px",borderBottom:"1px solid var(--color-border-tertiary)",alignItems:"center",background:isCurr?"var(--color-background-secondary)":"transparent",borderLeft:isCurr?"3px solid var(--kb-accent)":"3px solid transparent"}}>
                  <span style={{fontSize:13,fontWeight:isCurr?500:400,color:isCurr?"var(--color-text-primary)":"var(--color-text-secondary)"}}>{m}</span>
                  <span style={{fontSize:12,textAlign:"center",color:"var(--color-text-secondary)",fontWeight:mNights>0?500:400}}>{mNights>0?`${mNights}n`:"—"}</span>
                  <span style={{fontSize:11,textAlign:"center",fontWeight:500,color:occCol}}>{fillPct>0?`${fillPct}%`:"—"}</span>
                  <span style={{fontSize:12,textAlign:"right",color:"var(--color-text-secondary)"}}>{mGross>0?fmtMAD(mGross):"—"}</span>
                  <span style={{fontSize:12,textAlign:"right",color:mNet>0?"var(--color-text-success)":"var(--color-text-tertiary)",fontWeight:mNet>0?500:400}}>{mNet>0?fmtMAD(mNet):"—"}</span>
                  <span style={{fontSize:12,textAlign:"right",color:"var(--color-text-danger)"}}>{fmtMAD(mExp)}</span>
                  <span style={{fontSize:12,textAlign:"right",fontWeight:500,color:profitCol}}>{mProfit>0?"+":""}{fmtMAD(mProfit)}</span>
                  <span style={{textAlign:"right"}}>
                    <span style={{fontSize:11,padding:"2px 7px",borderRadius:99,fontWeight:500,background:occBg,color:occCol,whiteSpace:"nowrap"}}>
                      {occLabel} · {profLabel}
                    </span>
                  </span>
                </div>
              );
            })}

            {/* Total annuel */}
            {(() => {
              const totalGrossYear = payingBookings.reduce((s,b)=>s+b.amount*b.nights,0);
              const netProfit = totalRevenue - totalExp;
              return isMobile ? (
                <div style={{padding:"12px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--color-border-secondary)"}}>
                  <span style={{fontSize:13,fontWeight:500}}>{lang==="fr"?"Total":"Total"} · {totalNights}n</span>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:500,color:"var(--color-text-success)"}}>{fmtMAD(totalRevenue)}</div>
                    <div style={{fontSize:11,color:netProfit>=0?"var(--kb-profit)":"var(--color-text-danger)"}}>
                      {netProfit>=0?"+":""}{fmtMAD(netProfit)} {lang==="fr"?"bénéfice":"profit"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"38px 34px 38px 1fr 1fr 1fr 1fr 100px",gap:6,padding:"11px 8px",borderTop:"1px solid var(--color-border-secondary)",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:500}}>{lang==="fr"?"Total":"Total"}</span>
                  <span style={{fontSize:12,textAlign:"center",fontWeight:500,color:"var(--color-text-secondary)"}}>{totalNights}n</span>
                  <span style={{fontSize:11,textAlign:"center",fontWeight:500,color:"var(--color-text-secondary)"}}>{Math.round((totalNights/365)*100)}%</span>
                  <span style={{fontSize:12,textAlign:"right",fontWeight:500}}>{fmtMAD(totalGrossYear)}</span>
                  <span style={{fontSize:12,textAlign:"right",fontWeight:500,color:"var(--color-text-success)"}}>{fmtMAD(totalRevenue)}</span>
                  <span style={{fontSize:12,textAlign:"right",fontWeight:500,color:"var(--color-text-danger)"}}>{fmtMAD(totalExp)}</span>
                  <span style={{fontSize:13,textAlign:"right",fontWeight:500,color:netProfit>=0?"var(--kb-profit)":"var(--color-text-danger)"}}>{netProfit>=0?"+":""}{fmtMAD(netProfit)}</span>
                  <span></span>
                </div>
              );
            })()}
          </div>

          {/* Nuits réservées par mois */}
          <div style={rc}>
            <p className="kb-h" style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>{t("nightsTitle")}</p>
            <div style={{display:"flex",gap:12,marginBottom:"1rem",fontSize:12}}>
              <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,background:C_RESERVED}}/> {t("paying")}</span>
              <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:2,background:C_BLOCKED}}/> {t("perso")}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {months.map((m,i)=>{
                const n = payingBookings.reduce((s,b)=>s+nightsInMonth(b,i),0);
                const p = persoBookings.reduce((s,b)=>s+nightsInMonth(b,i),0);
                return (
                  <div key={m}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <span style={{cursor:"pointer",display:"flex",alignItems:"center",gap:6}} onClick={()=>exportMonthlyPDF(i)} title={lang==="fr"?"Exporter PDF":"Export PDF"}>{m} <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>📄</span></span>
                      <span style={{color:"var(--color-text-secondary)"}}>
                        {n>0 && <span style={{color:C_RESERVED,fontWeight:500}}>{n}n {t("paying").toLowerCase()}</span>}
                        {n>0 && p>0 && " · "}
                        {p>0 && <span style={{color:C_BLOCKED}}>{p}n {t("perso").toLowerCase()}</span>}
                        {n===0 && p===0 && <span style={{color:"var(--color-text-tertiary)"}}>—</span>}
                      </span>
                    </div>
                    <div style={{background:"var(--color-background-secondary)",borderRadius:99,height:8,overflow:"hidden",display:"flex"}}>
                      <div style={{width:`${Math.round((n/31)*100)}%`,height:"100%",background:C_RESERVED,borderRadius:99,transition:"width 0.3s"}} />
                      <div style={{width:`${Math.round((p/31)*100)}%`,height:"100%",background:C_BLOCKED,borderRadius:99,marginLeft:2,transition:"width 0.3s"}} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid var(--color-border-tertiary)",display:"flex",gap:24,fontSize:13}}>
              <span>{t("totalPayingLabel")} : <strong style={{color:C_RESERVED}}>{totalNights} {t("nightPlural")}</strong></span>
              {persoNights>0 && <span>{t("totalPersoLabel")} : <strong style={{color:C_BLOCKED}}>{persoNights} {t("nightPlural")}</strong></span>}
            </div>
          </div>

          {/* Prévisionnel */}
          <div style={{...rc,borderLeft:"3px solid var(--kb-profit)"}}>
            <p className="kb-h" style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>{t("forecastTitle")} {year}</p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{t("collected")}</p>
                <p style={{margin:"6px 0 2px",fontSize:20,fontWeight:600,letterSpacing:"-0.3px",fontVariantNumeric:"tabular-nums",color:C_RESERVED}}>{fmtBoth(pastRevenue,rate)}</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{pastBookings_.length} {pastBookings_.length>1?t("staysDonePlural"):t("staysDone")}</p>
              </div>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{t("confirmed")}</p>
                <p style={{margin:"6px 0 2px",fontSize:20,fontWeight:600,letterSpacing:"-0.3px",fontVariantNumeric:"tabular-nums",color:C_BLOCKED}}>{fmtBoth(futureRevenue,rate)}</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{futureBookings_.length} {futureBookings_.length>1?t("staysAheadPlural"):t("staysAhead")}</p>
              </div>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{t("projected")}</p>
                <p style={{margin:"6px 0 2px",fontSize:20,fontWeight:600,letterSpacing:"-0.3px",fontVariantNumeric:"tabular-nums",color:"var(--kb-profit)"}}>{fmtBoth(forecast.projectedTotal,rate)}</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{t("basedOn")} {fmtMAD(Math.round(forecast.avgMonthly))}{t("perMonth")}</p>
              </div>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{t("fillRate")}</p>
                <p style={{margin:"6px 0 2px",fontSize:20,fontWeight:600,letterSpacing:"-0.3px",fontVariantNumeric:"tabular-nums",color:"var(--color-text-info)"}}>{occupancy}%</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{totalNights} {t("nightPlural")} · {lang==="fr"?"objectif 70% =":"target 70% ="} {Math.round(365*0.7)} {t("nightPlural")}</p>
              </div>
            </div>
            <div style={{marginTop:"1rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>
                <span>{t("annualProgress")}</span>
                <span>{Math.round((totalRevenue/(forecast.projectedTotal||1))*100)}% {t("ofTarget")}</span>
              </div>
              <div style={{background:"var(--color-background-secondary)",borderRadius:99,height:10,overflow:"hidden"}}>
                <div style={{display:"flex",height:"100%",borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:`${Math.round((pastRevenue/(forecast.projectedTotal||1))*100)}%`,background:C_RESERVED,transition:"width 0.5s"}} />
                  <div style={{width:`${Math.round((futureRevenue/(forecast.projectedTotal||1))*100)}%`,background:C_BLOCKED,opacity:0.6,transition:"width 0.5s"}} />
                </div>
              </div>
              <div style={{display:"flex",gap:16,marginTop:6,fontSize:11,color:"var(--color-text-tertiary)"}}>
                <span style={{color:C_RESERVED}}>■ {t("collected")}</span>
                <span style={{color:C_BLOCKED}}>■ {t("confirmed")}</span>
                <span>□ {t("notYetBooked")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB : OCCUPATION                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab==="occupation" && (
        <div>
          <div style={rc}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:8}}>
              <p className="kb-h" style={{margin:0,fontSize:14,fontWeight:500}}>{lang==="fr"?"Taux de remplissage":"Fill rate"} {year}</p>
              <div style={{display:"flex",gap:16,fontSize:12}}>
                <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:"var(--color-text-success)",flexShrink:0}}/>{lang==="fr"?"≥70% Excellent":"≥70% Excellent"}</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:"var(--color-text-warning)",flexShrink:0}}/>{lang==="fr"?"40–70% Bon":"40–70% Good"}</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:C_RESERVED,flexShrink:0}}/>{lang==="fr"?"<40% Faible":"<40% Low"}</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {months.map((m,mi) => {
                const daysInMonth = new Date(year,mi+1,0).getDate();
                const n           = payingBookings.reduce((s,b)=>s+nightsInMonth(b,mi),0);
                const p           = persoBookings.reduce((s,b)=>s+nightsInMonth(b,mi),0);
                const pct         = Math.round(((n+p)/daysInMonth)*100);
                const mRevenue    = payingBookings.filter(b=>{
                  const mStart=new Date(year,mi,1); const mEnd=new Date(year,mi+1,1);
                  return new Date(b.checkIn)<mEnd && new Date(b.checkOut)>mStart;
                }).reduce((s,b)=>s+netAmount(b),0);
                const col   = pct>=70?"var(--color-text-success)":pct>=40?"var(--color-text-warning)":pct===0?"var(--color-text-tertiary)":C_RESERVED;
                const isCurr= mi===new Date().getMonth() && year===new Date().getFullYear();
                const badge = pct>=70
                  ? {bg:"var(--color-background-success)",color:"var(--color-text-success)",label:lang==="fr"?"Excellent":"Excellent",dot:"●"}
                  : pct>=40
                    ? {bg:"var(--color-background-warning)",color:"var(--color-text-warning)",label:lang==="fr"?"Bon":"Good",dot:"●"}
                    : pct===0
                      ? {bg:"var(--color-background-secondary)",color:"var(--color-text-tertiary)",label:lang==="fr"?"Libre":"Free",dot:"—"}
                      : {bg:"var(--kb-danger-bg)",color:C_RESERVED,label:lang==="fr"?"Faible":"Low",dot:"●"};
                return (
                  <div key={m} style={{display:"grid",gridTemplateColumns:"48px 1fr 52px 120px 140px 90px",alignItems:"center",gap:16,padding:"14px 16px",borderBottom:"1px solid var(--color-border-tertiary)",background:isCurr?"var(--color-background-secondary)":"transparent",borderRadius:isCurr?8:0,borderLeft:isCurr?`3px solid ${col}`:"3px solid transparent"}}>
                    <span style={{fontSize:14,fontWeight:isCurr?700:400,color:isCurr?"var(--color-text-primary)":"var(--color-text-secondary)"}}>{m}</span>
                    <div style={{background:"var(--color-border-tertiary)",borderRadius:99,height:10,overflow:"hidden",display:"flex"}}>
                      <div style={{width:`${Math.round((n/daysInMonth)*100)}%`,height:"100%",background:C_RESERVED,transition:"width 0.4s"}} />
                      <div style={{width:`${Math.round((p/daysInMonth)*100)}%`,height:"100%",background:C_BLOCKED,marginLeft:p>0?2:0,transition:"width 0.4s"}} />
                    </div>
                    <span style={{fontSize:15,fontWeight:700,color:col,textAlign:"right"}}>{pct}%</span>
                    <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                      {n>0?<span style={{color:C_RESERVED,fontWeight:500}}>{n}n {lang==="fr"?"pay.":"pay."}</span>:<span style={{color:"var(--color-text-tertiary)"}}>0n</span>}
                      {p>0 && <span style={{color:C_BLOCKED,marginLeft:4}}>+ {p}n perso</span>}
                    </span>
                    <span style={{fontSize:12,fontWeight:500,color:mRevenue>0?"var(--color-text-success)":"var(--color-text-tertiary)",textAlign:"right"}}>
                      {mRevenue>0?<>{fmtMAD(mRevenue)}<br/><span style={{fontSize:11,fontWeight:400}}>{fmtEUR(mRevenue/rate)}</span></>:"—"}
                    </span>
                    <span style={{fontSize:11,padding:"3px 10px",borderRadius:99,background:badge.bg,color:badge.color,fontWeight:600,textAlign:"center",display:"inline-block"}}>
                      <span style={{marginRight:4}}>{badge.dot}</span>{badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {(() => {
              const totalGuests = payingBookings.reduce((s,b)=>s+(parseInt(b.guests)||0),0);
              const pastGuests  = payingBookings.filter(b=>b.checkOut<=todayStr).reduce((s,b)=>s+(parseInt(b.guests)||0),0);
              return (
                <div style={{display:"flex",gap:24,fontSize:13,flexWrap:"wrap",padding:"16px 16px 4px",borderTop:"1px solid var(--color-border-tertiary)",marginTop:4}}>
                  <span>{lang==="fr"?"Taux annuel":"Annual rate"} : <strong style={{color:occupancy>=70?"var(--color-text-success)":occupancy>=40?"var(--color-text-warning)":C_RESERVED}}>{occupancy}%</strong></span>
                  <span>{lang==="fr"?"Total payantes":"Total paying"} : <strong style={{color:C_RESERVED}}>{totalNights}n</strong></span>
                  {persoNights>0 && <span>{lang==="fr"?"Total perso":"Personal"} : <strong style={{color:C_BLOCKED}}>{persoNights}n</strong></span>}
                  <span>{lang==="fr"?"Objectif 70%":"Target 70%"} : <strong>{Math.round(365*0.7)}n</strong></span>
                  <span style={{borderLeft:"1px solid var(--color-border-secondary)",paddingLeft:24}}>
                    👥 {lang==="fr"?"Voyageurs accueillis":"Guests welcomed"} : <strong style={{color:"var(--color-text-info)"}}>{pastGuests}</strong>
                    {totalGuests>pastGuests && <span style={{color:"var(--color-text-tertiary)",fontSize:12}}> · + {totalGuests-pastGuests} {lang==="fr"?"à venir":"upcoming"}</span>}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB : DÉPENSES                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab==="expenses" && (
        <div>
          {/* Récurrentes */}
          <div style={{...rc,marginBottom:"1.25rem",borderLeft:"3px solid var(--kb-accent)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:recurring.length>0?"1rem":0,flexWrap:"wrap",gap:8}}>
              <p className="kb-h" style={{margin:0,fontSize:14,fontWeight:500}}>{t("expenseTitle")}</p>
              <button className="kb-primary" onClick={()=>setShowAddR(!showAddR)}>{t("addExpense")}</button>
            </div>
            {showAddR && (
              <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"1rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500}}>{t("newRecurring")}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmCategory")}</label><select style={inp} value={rForm.category} onChange={e=>setRForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{tCat(c)}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" placeholder={t("frmPlaceholderAmountRec")} style={inp} value={rForm.amount} onChange={e=>setRForm(f=>({...f,amount:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmDesc")}</label><input type="text" placeholder={t("frmDesc2")} style={inp} value={rForm.description} onChange={e=>setRForm(f=>({...f,description:e.target.value}))} /></div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  {months.map((m,i)=>(
                    <button key={m} onClick={()=>toggleMonth(i)} style={{padding:"4px 10px",fontSize:12,borderRadius:99,border:"1px solid var(--color-border-secondary)",background:rForm.months.includes(i)?"var(--kb-accent)":"var(--color-background-secondary)",color:rForm.months.includes(i)?"var(--color-background-primary)":"var(--color-text-secondary)",cursor:"pointer"}}>{m}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="kb-primary" onClick={addRecurring}>{t("save")}</button>
                  <button onClick={()=>setShowAddR(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                </div>
              </div>
            )}
            {recurring.length>0 && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {recurring.map(rec=>(
                  <div key={rec.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--color-background-secondary)",borderRadius:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"var(--color-background-warning)",color:"var(--color-text-warning)",fontWeight:500,flexShrink:0}}>{tCat(rec.category)}</span>
                    <span style={{fontSize:13,flex:1,minWidth:120}}>{rec.description}</span>
                    <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-danger)",flexShrink:0}}>{fmtBoth(rec.amount,rate)}</span>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {months.map((m,i)=>(
                        <span key={m} style={{fontSize:11,padding:"2px 6px",borderRadius:99,background:rec.months.includes(i)?"var(--kb-accent-bg)":"transparent",color:rec.months.includes(i)?"var(--kb-accent)":"var(--color-text-tertiary)",fontWeight:rec.months.includes(i)?600:400}}>{m}</span>
                      ))}
                    </div>
                    <button onClick={()=>generateRecurring(rec)} style={{fontSize:12,padding:"4px 12px",background:"var(--kb-accent)",color:"var(--color-background-primary)",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>{t("generateYear")} {year} ↗</button>
                    <button onClick={()=>{setRecurring(prev=>prev.filter(r=>r.id!==rec.id));showToast(t("toastRecurringDel"));}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Dépenses ponctuelles */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
            <p style={{margin:0,fontSize:14,color:"var(--color-text-secondary)"}}>{yearExpenses.length} {t("expensesCount")} · {fmtBoth(totalExp,rate)}</p>
            <button className="kb-primary" onClick={()=>setShowAddE(!showAddE)}>{t("addExpense")}</button>
          </div>
          {showAddE && (
            <div style={{...rc,marginBottom:"1.25rem",background:"var(--color-background-secondary)",border:"none"}}>
              <p className="kb-h" style={{margin:"0 0 12px",fontSize:14,fontWeight:500}}>{t("newExpenseTitle")}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmDate")}</label><input type="date" style={inp} value={eForm.date} onChange={e=>setEForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmCategory")}</label><select style={inp} value={eForm.category} onChange={e=>setEForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{tCat(c)}</option>)}</select></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmDesc")}</label><input type="text" placeholder={t("frmDescExp")} style={inp} value={eForm.description} onChange={e=>setEForm(f=>({...f,description:e.target.value}))} /></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" placeholder={t("frmPlaceholderAmountExp")} style={inp} value={eForm.amount} onChange={e=>setEForm(f=>({...f,amount:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="kb-primary" onClick={addExpense}>{t("save")}</button>
                <button onClick={()=>setShowAddE(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
              </div>
            </div>
          )}
          {yearExpenses.length===0
            ? <div style={{...rc,textAlign:"center",padding:"2.5rem"}}><p style={{color:"var(--color-text-tertiary)",fontSize:14,margin:0}}>{t("noExpYear")} {year}.</p></div>
            : (
              <div style={rc}>
                {/* Modal édition dépense */}
                {editExpense && (
                  <div className="kb-overlay" style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
                    <div className="kb-modal" style={{background:"var(--color-background-primary)",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:440,maxHeight:"calc(100vh - 2rem)",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
                      <p className="kb-h" style={{margin:"0 0 16px",fontSize:15,fontWeight:500}}>{t("editExpenseModalTitle")}</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                        <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmDate")}</label><input type="date" style={inp} value={editExpense.date} onChange={e=>setEditExpense(x=>({...x,date:e.target.value}))} /></div>
                        <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmCategory")}</label><select style={inp} value={editExpense.category} onChange={e=>setEditExpense(x=>({...x,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{tCat(c)}</option>)}</select></div>
                        <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmDesc")}</label><input type="text" style={inp} value={editExpense.description} onChange={e=>setEditExpense(x=>({...x,description:e.target.value}))} /></div>
                        <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" style={inp} value={editExpense.amount} onChange={e=>setEditExpense(x=>({...x,amount:e.target.value}))} /></div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <button className="kb-primary" onClick={saveEditExpense} style={{flex:1}}>{t("save")}</button>
                        <button onClick={()=>setEditExpense(null)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                      </div>
                    </div>
                  </div>
                )}
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
                      {[t("colDate"),t("colCategory"),t("colDesc"),t("colAmount"),""].map(h=>(
                        <th key={h} style={{padding:"8px 6px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...yearExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>(
                      <tr key={e.id} style={{borderBottom:"1px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(e.date,locale)}</td>
                        <td style={{padding:"10px 6px"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"var(--color-background-warning)",color:"var(--color-text-warning)",fontWeight:500}}>{tCat(e.category)}</span></td>
                        <td style={{padding:"10px 6px",overflow:"hidden",textOverflow:"ellipsis",color:"var(--color-text-secondary)"}}>{e.description}</td>
                        <td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-danger)"}}>{fmtBoth(e.amount,rate)}</td>
                        <td style={{padding:"10px 6px",textAlign:"right"}}>
                          <button onClick={()=>setEditExpense({...e})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✏️</button>
                          <button onClick={()=>{setExpenses(prev=>prev.filter(x=>x.id!==e.id));showToast(t("toastExpenseDel"));}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{padding:"10px 6px",fontWeight:500}}>{t("total")}</td>
                      <td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-danger)"}}>{fmtBoth(totalExp,rate)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                {expByCat.length>0 && (
                  <div style={{marginTop:"1.25rem",paddingTop:"1.25rem",borderTop:"1px solid var(--color-border-tertiary)"}}>
                    <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>{t("byCategory")}</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {expByCat.map(([cat,amt])=>{
                        const pct=totalExp?Math.round((amt/totalExp)*100):0;
                        return (
                          <div key={cat}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                              <span>{tCat(cat)}</span>
                              <span style={{color:"var(--color-text-secondary)"}}>{fmtBoth(amt,rate)} · {pct}%</span>
                            </div>
                            <div style={{background:"var(--color-background-secondary)",borderRadius:99,height:6,overflow:"hidden"}}>
                              <div style={{width:`${pct}%`,height:"100%",background:"var(--kb-profit)",borderRadius:99}} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }
        </div>
      )}

      </main>
    </div>

    {/* ── Toast — hors container pour position:fixed fiable sur iOS PWA ── */}
    {rescue && (
      <div onClick={()=>setRescue(null)} className="kb-overlay" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div onClick={e=>e.stopPropagation()} role="dialog" aria-label="Sauvegardes de secours" className="kb-modal" style={{background:"var(--color-background-primary)",borderRadius:12,padding:"20px 20px 16px",width:"100%",maxWidth:520,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <p className="kb-h" style={{margin:0,fontSize:16}}>🛟 Sauvegardes de secours</p>
            <button onClick={()=>setRescue(null)} aria-label="Fermer" style={{background:"none",border:"none",fontSize:18,cursor:"pointer"}}>✕</button>
          </div>
          <p style={{margin:"0 0 12px",fontSize:12,color:"var(--color-text-tertiary)"}}>Copie complète de la base toutes les 6 h, conservée 14 jours.</p>
          <button onClick={backupNow} disabled={rescue.busy} style={{alignSelf:"flex-start",padding:"6px 12px",fontSize:13,borderRadius:6,border:"1px solid var(--color-text-warning)",background:"var(--color-background-warning)",color:"var(--color-text-warning)",cursor:"pointer",marginBottom:12}}>{rescue.busy?"⏳ Sauvegarde…":"+ Sauvegarder maintenant"}</button>
          <div style={{overflowY:"auto",flex:1}}>
            {rescue.loading && <p style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Chargement…</p>}
            {rescue.error && <p style={{fontSize:13,color:"var(--color-text-danger)"}}>Impossible de lire les sauvegardes ({rescue.error})</p>}
            {!rescue.loading && !rescue.error && rescue.list.length===0 && <p style={{fontSize:13,color:"var(--color-text-tertiary)"}}>Aucune sauvegarde pour l'instant. La première sera créée au prochain passage automatique, ou tout de suite avec le bouton ci-dessus.</p>}
            {rescue.list.map(b => (
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderTop:"1px solid var(--color-border-tertiary)",flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:180}}>
                  <p style={{margin:0,fontSize:13}}>{new Date(b.createdAt).toLocaleString(locale,{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
                  <p style={{margin:0,fontSize:11,color:"var(--color-text-tertiary)"}}>{b.counts?.bookings ?? "?"} réas · {b.counts?.expenses ?? "?"} dépenses{b.reason && b.reason!=="cron" ? ` · ${b.reason.startsWith("manuel")?"manuelle":b.reason}` : ""}</p>
                </div>
                <button onClick={()=>downloadBackup(b)} style={{padding:"4px 10px",fontSize:12,borderRadius:6,border:"1px solid var(--color-border-secondary)",background:"none",cursor:"pointer"}}>Télécharger</button>
                <button onClick={()=>restoreBackup(b)} style={{padding:"4px 10px",fontSize:12,borderRadius:6,border:"none",background:"var(--color-text-warning)",color:"var(--color-background-primary)",cursor:"pointer"}}>Restaurer</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    {toast && (
      <div className="safe-bottom kb-toast" role="status" style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--color-background-primary)",border:"1px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"10px 20px",fontSize:13,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:9999,whiteSpace:"nowrap"}}>
        {toast}
      </div>
    )}

    {/* ── Modal confirmation suppression ── */}
    {confirmDelete && (
      <div className="kb-overlay" style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.55)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem",boxSizing:"border-box"}}>
        <div className="modal-card kb-modal" style={{background:"var(--color-background-primary)",borderRadius:16,padding:"1.5rem",paddingBottom:"max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))",width:"100%",maxWidth:320,boxShadow:"0 12px 40px rgba(0,0,0,0.3)",boxSizing:"border-box"}}>
          <p style={{margin:"0 0 6px",fontSize:17,fontWeight:600}}>🗑️ {lang==="fr"?"Supprimer ?":"Delete?"}</p>
          <p style={{margin:"0 0 20px",fontSize:14,color:"var(--color-text-secondary)",lineHeight:1.4}}>{confirmDelete.label}</p>
          <div style={{display:"flex",gap:12}}>
            <button
              onClick={()=>{confirmDelete.onConfirm();setConfirmDelete(null);}}
              style={{flex:1,padding:"14px",background:"var(--color-text-danger)",color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",WebkitAppearance:"none",minHeight:48}}>
              {lang==="fr"?"Supprimer":"Delete"}
            </button>
            <button
              onClick={()=>setConfirmDelete(null)}
              style={{flex:1,padding:"14px",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",border:"1px solid var(--color-border-secondary)",borderRadius:10,fontSize:16,cursor:"pointer",WebkitAppearance:"none",minHeight:48}}>
              {lang==="fr"?"Annuler":"Cancel"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ── Connexion (Google) ────────────────────────────────────────────────────────
// Le tableau de bord n'est monté qu'une fois l'utilisateur connecté ET autorisé
// (liste d'e-mails dans Firestore config/access, appliquée par les règles).
// Styles : classes kb-gate / kb-gate-card dans src/theme.css

export default function App() {
  const [user, setUser]     = useState(undefined); // undefined = en cours, null = déconnecté
  const [access, setAccess] = useState("pending"); // pending | ok | denied | error
  const [err, setErr]       = useState("");

  useEffect(() => {
    getRedirectResult(authApi).catch((e) => setErr(e.code || e.message));
    return onAuthStateChanged(authApi, (u) => { setUser(u); setAccess("pending"); });
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(DOC_REF)
      .then(() => setAccess("ok"))
      .catch((e) => setAccess(e.code === "permission-denied" ? "denied" : "error"));
  }, [user]);

  const login = async () => {
    setErr("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(authApi, provider); }
    catch (e) {
      if (["auth/popup-blocked","auth/operation-not-supported-in-this-environment","auth/cancelled-popup-request"].includes(e.code))
        await signInWithRedirect(authApi, provider);
      else if (e.code !== "auth/popup-closed-by-user") setErr(e.code || e.message);
    }
  };
  const logout = async () => {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem("riad_last_modified"); } catch {}
    await signOut(authApi);
  };

  if (user === undefined || (user && access === "pending"))
    return <div className="kb-gate"><p className="kb-gate-loading">Chargement…</p></div>;

  if (!user) return (
    <div className="kb-gate"><div className="kb-gate-card">
      <img src="/apple-touch-icon.png" alt="" />
      <h1>Kasbah Blanca Marrakech</h1>
      <p>Tableau de bord locatif</p>
      <button className="kb-primary" onClick={login} style={{padding:"12px 20px",fontSize:15}}>Se connecter avec Google</button>
      {err && <p style={{fontSize:12,color:"var(--color-text-danger)",margin:"16px 0 0"}}>Connexion impossible ({err})</p>}
    </div></div>
  );

  if (access !== "ok") return (
    <div className="kb-gate"><div className="kb-gate-card">
      <p style={{fontSize:17,margin:"0 0 8px",color:"var(--color-text-primary)",fontFamily:"var(--font-serif)"}}>{access === "denied" ? "Accès non autorisé" : "Base injoignable"}</p>
      <p style={{fontSize:13,margin:"0 0 20px"}}>{access === "denied" ? `Le compte ${user.email} n'a pas accès à ce tableau de bord.` : "Vérifiez votre connexion puis réessayez."}</p>
      <button className="kb-primary" onClick={logout}>Changer de compte</button>
    </div></div>
  );

  return (
    <>
      <RiadDashboard />
      <div className="kb-foot">
        {user.email} · <button onClick={logout}>Se déconnecter</button>
      </div>
    </>
  );
}
