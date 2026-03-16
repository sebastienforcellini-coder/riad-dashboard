import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

const translations = {
  fr: {
    // ── App ──
    title:"Kasbah Blanca Marrakech",subtitle:"Tableau de bord locatif",
    saving:"⏳ Sauvegarde...",synced:"☁️ Synchronisé",offline:"⚠️ Hors ligne",
    syncOk:"✅ Airbnb",syncFail:"⚠️ Sync échouée",configSync:"Configurer sync",
    autoSyncOn:"Auto-sync ON",sync:"Sync",backup:"💾 Backup",restore:"📂 Restore",
    // ── Sync panel ──
    syncPanelTitle:"🔄 Synchronisation automatique Airbnb",
    syncPanelDesc:"Airbnb → Calendrier → Lien iCal → copiez l'URL ici. Le calendrier se rafraîchit automatiquement tous les jours à 6h.",
    syncNow:"↻ Synchroniser maintenant",syncDelete:"✕ Supprimer",lastSync:"Dernière sync",syncDelay:"⚠️ Le flux iCal Airbnb est mis à jour avec 15–30 min de délai. Pour une résa toute récente, importez le .ics manuellement via la zone de dépôt.",
    rateLabel:"Taux de change :",commissionLabel:"Commission conciergerie Airbnb :",
    // ── Alertes ──
    alertsTitle:"ARRIVÉES & DÉPARTS — 7 PROCHAINS JOURS",
    enableNotif:"🔔 Activer notifications",notifOn:"🔔 Notifs ON · Désactiver",
    arrivalToday:"Arrivée aujourd'hui !",arrivalTomorrow:"Arrivée demain",arrivalIn:"Arrivée dans",
    departureToday:"Départ aujourd'hui !",departureTomorrow:"Départ demain",departureIn:"Départ dans",days:"j",
    // ── KPIs ──
    netRevenue:"Revenus nets",expenses:"Dépenses",netProfit:"Bénéfice net",
    occupation:"Occupation",avgNight:"Moy. / nuit",payingNights:"n payantes",
    persoNights:"n perso",onAmounts:"sur montants saisis",gross:"Brut",margin:"Marge",
    // ── Stats panels ──
    pastBookings:"Réservations échues",futureBookings:"Réservations à venir",caTotal:"CA total",
    staysDone:"séjour terminé",staysDonePlural:"séjours terminés",
    staysAhead:"séjour à venir",staysAheadPlural:"séjours à venir",
    encaisse:"encaissé",aVenir:"à venir",noBookings:"Aucune réservation.",
    // ── Tabs ──
    tabCalendar:"Calendrier",tabBookings:"Réservations",tabChart:"Graphique",tabExpenses:"Dépenses",
    // ── Calendar ──
    calendarTitle:"Calendrier",allMonths:"Tous les mois",upcoming:"À venir",
    available:"Disponible",reserved:"Réservé",perso:"Perso",today:"Aujourd'hui",
    personalPeriods:"🔵 Périodes bloquées (vacances perso)",
    noPersonalPeriods:"Aucune période personnelle bloquée.",
    blockDates:"+ Bloquer dates ↗",
    airbnbUnavail:"Indisponibilités Airbnb — cliquez \"→ Réservation\" si c'est une résa directe",
    toBooking:"→ Réservation",
    // ── Bookings ──
    addBooking:"+ Ajouter ↗",bookingsSummary:"réservations",noAmountSet:"sans montant",
    colArrival:"Arrivée",colDeparture:"Départ",colCode:"Code",colName:"Nom",
    colNights:"Nuits",colGuests:"Occupants",colRate:"Tarif/nuit",colTotal:"Total séjour",
    editBookingTitle:"Modifier la réservation",save:"Enregistrer",cancel:"Annuler",
    // ── Chart ──
    chartTitle:"Revenus et dépenses",nightsTitle:"Nuits réservées par mois",paying:"Payantes",
    forecastTitle:"📈 Prévisionnel",collected:"Encaissé",confirmed:"Confirmé à venir",
    projected:"Projection annuelle",fillRate:"Taux de remplissage",
    seriesRevenue:"Revenus",seriesExpenses:"Dépenses",seriesProfit:"Bénéfice",
    // ── Expenses ──
    expenseTitle:"Dépenses récurrentes",addExpense:"+ Ajouter ↗",
    generate:"Générer",colDate:"Date",colCategory:"Catégorie",colDesc:"Description",
    colAmount:"Montant",total:"Total",byCategory:"Répartition par catégorie",
    // ── Months ──
    months:["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"],
    // ── Drop zones ──
    dropIcsLabel:"📅 Calendrier Airbnb (.ics)",
    dropIcsSub:"Glissez-déposez ou cliquez · réservations & blocages",
    dropCsvLabel:"💶 Historique finances (.csv)",
    dropCsvSub:"Export Airbnb → Finances → Transactions · montants auto",
    // ── Table headers ──
    hPayment:"Paiement",hClient:"Client",hNetTotal:"Total net",hPlatform:"Plateforme",
    // ── Form labels ──
    frmFrom:"Du",frmTo:"Au",frmReason:"Motif",frmName:"Nom du client",
    frmPhone:"Tél. (4 derniers)",frmPlatform:"Plateforme",frmGuests:"Nb. occupants",
    frmAmount:"Montant (MAD)",frmCategory:"Catégorie",frmDesc:"Description",frmDate:"Date",
    frmDesc2:"Ex : Abonnement Internet",frmDescExp:"Ex : Nettoyage fin de séjour",
    frmPlaceholderName:"Jean Dupont",frmPlaceholderPhone:"…1234",frmPlaceholderAmount:"1500",
    frmPlaceholderGuests:"2",frmPlaceholderAmountExp:"600",frmPlaceholderAmountRec:"500",
    // ── Form titles ──
    newBlocked:"Nouvelle période bloquée",newRecurring:"Nouvelle dépense récurrente",
    newDirectBooking:"Réservation directe (hors Airbnb)",newExpenseTitle:"Nouvelle dépense",
    // ── Buttons / misc labels ──
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
    // ── Toasts ──
    toastAmountSaved:"✅ Montant enregistré",toastBookingUpdated:"✅ Réservation mise à jour",
    toastExpenseUpdated:"✅ Dépense mise à jour",toastPaymentUpdated:"✅ Statut paiement mis à jour",
    toastBookingAdded:"✅ Réservation ajoutée",toastExpenseAdded:"✅ Dépense ajoutée",
    toastBlockedAdded:"✅ Période bloquée ajoutée",toastRecurringAdded:"✅ Dépense récurrente ajoutée",
    toastExcelDL:"✅ Export Excel téléchargé",toastJsonDL:"✅ Sauvegarde JSON téléchargée",
    toastBookingDel:"Réservation supprimée",toastExpenseDel:"Dépense supprimée",
    toastBlockedDel:"Période supprimée",toastAirbnbDel:"Blocage supprimé",
    toastRecurringDel:"Récurrente supprimée",
    toastConverted:"✅ Converti en réservation — saisissez le montant",
    toastConvertedFull:"✅ Converti en réservation — saisissez le nom et le montant",
    toastAlreadyGenerated:"⚠️ Ces mois sont déjà générés",
    toastNotifOn:"✅ Notifications activées !",toastNotifOff:"🔕 Notifications désactivées",
    toastNotifFail:"❌ Notifications non supportées sur ce navigateur",toastNotifDenied:"❌ Permission refusée",
    toastIcsEmpty:"❌ Aucun événement trouvé dans ce fichier.",toastIcsError:"❌ Erreur de lecture du fichier .ics",
    toastCsvEmpty:"❌ Aucun montant trouvé — vérifiez que c'est bien l'export Finances Airbnb.",
    toastCsvError:"❌ Erreur de lecture du fichier CSV",
    toastJsonInvalid:"❌ Fichier JSON invalide",toastSyncFail:"❌ Sync échouée — vérifiez l'URL Airbnb",
    toastSyncCalError:"❌ Erreur de lecture du calendrier",
    // ── Recap PDF ──
    recapTitle:"Récapitulatif de réservation",recapClient:"Client",recapCode:"Code",
    recapPlatform:"Plateforme",recapArrival:"Arrivée",recapDeparture:"Départ",
    recapDuration:"Durée",recapGuests:"Occupants",recapRateGross:"Tarif / nuit (brut)",
    recapCommission:"Commission",recapTotal:"Total séjour",recapPayment:"Paiement",
    recapNight:"nuit",recapNights:"nuits",recapPerson:"personne",recapPersons:"personnes",
    // ── Export Excel sheet names ──
    xlsBookings:"Réservations",xlsExpenses:"Dépenses",xlsCatBreakdown:"Dépenses par catégorie",
    xlsByPlatform:"Par plateforme",xlsMonthly:"Bilan mensuel",
    // ── Edit modals ──
    editBookingModalTitle:"✏️ Modifier la réservation",editExpenseModalTitle:"✏️ Modifier la dépense",
    cats:{"Ménage":"Ménage","Gouvernante":"Gouvernante","Pisciniste":"Pisciniste","Frais Airbnb":"Frais Airbnb","Maintenance":"Maintenance","Fournitures":"Fournitures","Taxes/CFE":"Taxes/CFE","Internet":"Internet","Eau/Électricité":"Eau/Électricité","Assurance":"Assurance","Autre":"Autre"},
  },
  en: {
    // ── App ──
    title:"Kasbah Blanca Marrakech",subtitle:"Rental dashboard",
    saving:"⏳ Saving...",synced:"☁️ Synced",offline:"⚠️ Offline",
    syncOk:"✅ Airbnb",syncFail:"⚠️ Sync failed",configSync:"Setup sync",
    autoSyncOn:"Auto-sync ON",sync:"Sync",backup:"💾 Backup",restore:"📂 Restore",
    // ── Sync panel ──
    syncPanelTitle:"🔄 Automatic Airbnb sync",
    syncPanelDesc:"Airbnb → Calendar → iCal link → paste the URL here. Calendar refreshes automatically every day at 6am.",
    syncNow:"↻ Sync now",syncDelete:"✕ Remove",lastSync:"Last sync",syncDelay:"⚠️ Airbnb's iCal feed updates with a 15–30 min delay. For a brand-new booking, import the .ics file manually via the drop zone.",
    rateLabel:"Exchange rate:",commissionLabel:"Airbnb concierge commission:",
    // ── Alertes ──
    alertsTitle:"ARRIVALS & DEPARTURES — NEXT 7 DAYS",
    enableNotif:"🔔 Enable notifications",notifOn:"🔔 Notifs ON · Disable",
    arrivalToday:"Arrival today!",arrivalTomorrow:"Arrival tomorrow",arrivalIn:"Arrival in",
    departureToday:"Departure today!",departureTomorrow:"Departure tomorrow",departureIn:"Departure in",days:"d",
    // ── KPIs ──
    netRevenue:"Net revenue",expenses:"Expenses",netProfit:"Net profit",
    occupation:"Occupancy",avgNight:"Avg. / night",payingNights:"paying nights",
    persoNights:"personal nights",onAmounts:"based on entered amounts",gross:"Gross",margin:"Margin",
    // ── Stats panels ──
    pastBookings:"Past bookings",futureBookings:"Upcoming bookings",caTotal:"Total revenue",
    staysDone:"stay completed",staysDonePlural:"stays completed",
    staysAhead:"stay ahead",staysAheadPlural:"stays ahead",
    encaisse:"collected",aVenir:"upcoming",noBookings:"No bookings.",
    // ── Tabs ──
    tabCalendar:"Calendar",tabBookings:"Bookings",tabChart:"Chart",tabExpenses:"Expenses",
    // ── Calendar ──
    calendarTitle:"Calendar",allMonths:"All months",upcoming:"Upcoming",
    available:"Available",reserved:"Reserved",perso:"Personal",today:"Today",
    personalPeriods:"🔵 Blocked periods (personal)",
    noPersonalPeriods:"No personal periods blocked.",
    blockDates:"+ Block dates ↗",
    airbnbUnavail:"Airbnb unavailabilities — click \"→ Booking\" if it's a direct booking",
    toBooking:"→ Booking",
    // ── Bookings ──
    addBooking:"+ Add ↗",bookingsSummary:"bookings",noAmountSet:"no amount",
    colArrival:"Arrival",colDeparture:"Departure",colCode:"Code",colName:"Name",
    colNights:"Nights",colGuests:"Guests",colRate:"Rate/night",colTotal:"Total stay",
    editBookingTitle:"Edit booking",save:"Save",cancel:"Cancel",
    // ── Chart ──
    chartTitle:"Revenue and expenses",nightsTitle:"Booked nights per month",paying:"Paying",
    forecastTitle:"📈 Forecast",collected:"Collected",confirmed:"Confirmed upcoming",
    projected:"Annual projection",fillRate:"Fill rate",
    seriesRevenue:"Revenue",seriesExpenses:"Expenses",seriesProfit:"Profit",
    // ── Expenses ──
    expenseTitle:"Recurring expenses",addExpense:"+ Add ↗",
    generate:"Generate",colDate:"Date",colCategory:"Category",colDesc:"Description",
    colAmount:"Amount",total:"Total",byCategory:"Breakdown by category",
    // ── Months ──
    months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    // ── Drop zones ──
    dropIcsLabel:"📅 Airbnb Calendar (.ics)",
    dropIcsSub:"Drag & drop or click · bookings & blocks",
    dropCsvLabel:"💶 Finance history (.csv)",
    dropCsvSub:"Airbnb export → Finances → Transactions · auto amounts",
    // ── Table headers ──
    hPayment:"Payment",hClient:"Guest",hNetTotal:"Net total",hPlatform:"Platform",
    // ── Form labels ──
    frmFrom:"From",frmTo:"To",frmReason:"Reason",frmName:"Guest name",
    frmPhone:"Phone (last 4)",frmPlatform:"Platform",frmGuests:"No. of guests",
    frmAmount:"Amount (MAD)",frmCategory:"Category",frmDesc:"Description",frmDate:"Date",
    frmDesc2:"E.g. Internet subscription",frmDescExp:"E.g. End-of-stay cleaning",
    frmPlaceholderName:"John Smith",frmPlaceholderPhone:"…1234",frmPlaceholderAmount:"1500",
    frmPlaceholderGuests:"2",frmPlaceholderAmountExp:"600",frmPlaceholderAmountRec:"500",
    // ── Form titles ──
    newBlocked:"New blocked period",newRecurring:"New recurring expense",
    newDirectBooking:"Direct booking (non-Airbnb)",newExpenseTitle:"New expense",
    // ── Buttons / misc labels ──
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
    // ── Toasts ──
    toastAmountSaved:"✅ Amount saved",toastBookingUpdated:"✅ Booking updated",
    toastExpenseUpdated:"✅ Expense updated",toastPaymentUpdated:"✅ Payment status updated",
    toastBookingAdded:"✅ Booking added",toastExpenseAdded:"✅ Expense added",
    toastBlockedAdded:"✅ Period blocked",toastRecurringAdded:"✅ Recurring expense added",
    toastExcelDL:"✅ Excel export downloaded",toastJsonDL:"✅ JSON backup downloaded",
    toastBookingDel:"Booking deleted",toastExpenseDel:"Expense deleted",
    toastBlockedDel:"Period deleted",toastAirbnbDel:"Block deleted",
    toastRecurringDel:"Recurring deleted",
    toastConverted:"✅ Converted to booking — enter the amount",
    toastConvertedFull:"✅ Converted to booking — enter name and amount",
    toastAlreadyGenerated:"⚠️ These months are already generated",
    toastNotifOn:"✅ Notifications enabled!",toastNotifOff:"🔕 Notifications disabled",
    toastNotifFail:"❌ Notifications not supported on this browser",toastNotifDenied:"❌ Permission denied",
    toastIcsEmpty:"❌ No events found in this file.",toastIcsError:"❌ Error reading the .ics file",
    toastCsvEmpty:"❌ No amounts found — make sure this is the Airbnb Finance export.",
    toastCsvError:"❌ Error reading the CSV file",
    toastJsonInvalid:"❌ Invalid JSON file",toastSyncFail:"❌ Sync failed — check the Airbnb URL",
    toastSyncCalError:"❌ Error reading the calendar",
    // ── Recap PDF ──
    recapTitle:"Booking summary",recapClient:"Guest",recapCode:"Code",
    recapPlatform:"Platform",recapArrival:"Arrival",recapDeparture:"Departure",
    recapDuration:"Duration",recapGuests:"Guests",recapRateGross:"Rate / night (gross)",
    recapCommission:"Commission",recapTotal:"Total stay",recapPayment:"Payment",
    recapNight:"night",recapNights:"nights",recapPerson:"person",recapPersons:"people",
    // ── Export Excel sheet names ──
    xlsBookings:"Bookings",xlsExpenses:"Expenses",xlsCatBreakdown:"Expenses by category",
    xlsByPlatform:"By platform",xlsMonthly:"Monthly summary",
    // ── Edit modals ──
    editBookingModalTitle:"✏️ Edit booking",editExpenseModalTitle:"✏️ Edit expense",
    cats:{"Ménage":"Cleaning","Gouvernante":"Housekeeper","Pisciniste":"Pool technician","Frais Airbnb":"Airbnb fees","Maintenance":"Maintenance","Fournitures":"Supplies","Taxes/CFE":"Taxes/CFE","Internet":"Internet","Eau/Électricité":"Water/Electricity","Assurance":"Insurance","Autre":"Other"},
  }
};

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCcNPo3-u0tAQjZdvJ7ns1pIpz-Puc6p7Q",
  authDomain: "riad-dashboard.firebaseapp.com",
  projectId: "riad-dashboard",
  storageBucket: "riad-dashboard.firebasestorage.app",
  messagingSenderId: "1057977040208",
  appId: "1:1057977040208:web:48f77a326d8cbbb777c055",
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const DOC_REF = doc(db, "riad", "data");

// ═══════════════════════════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & UTILS
// ═══════════════════════════════════════════════════════════════════════════════

const EXPENSE_CATS = ["Ménage","Gouvernante","Pisciniste","Frais Airbnb","Maintenance","Fournitures","Taxes/CFE","Internet","Eau/Électricité","Assurance","Autre"];
const PLATFORMS    = ["Direct","Airbnb","Booking.com","Gens de confiance","Perso","Autre"];
// Month names are now language-dependent — computed inside the component
const MONTHS_FR    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MONTHS_EN    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STORAGE_KEY  = "riad_dashboard_v1";
const DEFAULT_RATE = 10.83;

// Calendar colours
const C_RESERVED = "#c0392b";
const C_BLOCKED  = "#2980b9";
const C_AVAIL    = "#e8f5e9";
const C_TODAY_BG = "#fff3cd";
const C_TODAY_FG = "#856404";

const fmtMAD  = (n) => new Intl.NumberFormat("fr-MA",{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n)) + " MAD";
const fmtEUR  = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n));
const fmt     = (n, rate, cur) => cur === "EUR" ? fmtEUR(n / rate) : fmtMAD(n);
const fmtBoth = (n, rate)       => fmtMAD(n) + "  ·  " + fmtEUR(n / rate);
const fmtDate = (d, locale) => new Date(d).toLocaleDateString(locale,{day:"2-digit",month:"short",year:"numeric"});
const today   = () => new Date().toISOString().slice(0,10);

function loadStorage() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
async function saveCloud(data) {
  try { await setDoc(DOC_REF, data); } catch(e) { console.warn("Cloud save failed", e); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function MonthCalendar({ year, month, bookings, blocked, monthName }) {
  const offset  = (new Date(year,month,1).getDay()+6)%7;
  const days    = new Date(year,month+1,0).getDate();
  const pad     = (n) => String(n).padStart(2,"0");
  const inRange = (d, s, e) => { const ds=`${year}-${pad(month+1)}-${pad(d)}`; return ds>=s && ds<e; };
  const cells   = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  const [tooltip, setTooltip] = useState(null); // {x, y, content}

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
      <p style={{margin:"0 0 8px",fontWeight:500,fontSize:13,textAlign:"center"}}>{monthName} {year}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:"var(--color-text-tertiary)",padding:"2px 0"}}>{d}</div>)}
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
          else if (d)          { bg=C_AVAIL;    color="#2e7d32"; }
          else                 { bg="transparent"; color="var(--color-text-primary)"; }
          if (isToday) { border="3px solid #FFD700"; fw=700; }
          return (
            <div key={i}
              style={{textAlign:"center",fontSize:12,padding:"5px 2px",background:bg,color,borderRadius:"var(--border-radius-md)",fontWeight:fw,border,boxSizing:"border-box",cursor:isInteractive?"pointer":"default",position:"relative"}}
              onMouseEnter={isInteractive ? (e) => {
                const info = getBookingForDay(d);
                if (info) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({ x: rect.left + rect.width/2, y: rect.top - 8, info });
                }
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
      {/* Tooltip */}
      {tooltip && (
        <div
          onClick={() => setTooltip(null)}
          style={{
            position:"fixed",
            top: tooltip.y,
            left: tooltip.x,
            transform:"translate(-50%, -100%)",
            background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-secondary)",
            borderRadius:8,
            padding:"8px 12px",
            fontSize:12,
            boxShadow:"0 4px 16px rgba(0,0,0,0.15)",
            zIndex:9999,
            minWidth:150,
            maxWidth:220,
            pointerEvents:"auto",
          }}
        >
          <p style={{margin:"0 0 4px",fontWeight:700,fontSize:13,color:tooltip.info.type==="reserved"?C_RESERVED:C_BLOCKED}}>{tooltip.info.name}</p>
          {tooltip.info.platform && <p style={{margin:"0 0 2px",fontSize:11,color:"var(--color-text-secondary)",fontWeight:500}}>{tooltip.info.platform}</p>}
          <p style={{margin:0,fontSize:11,color:"var(--color-text-primary)"}}>
            {tooltip.info.checkIn} → {tooltip.info.checkOut}
          </p>
          <p style={{margin:"2px 0 0",fontSize:12,fontWeight:600,color:"var(--color-text-primary)"}}>{tooltip.info.nights}n</p>
          <div style={{position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",width:10,height:10,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderTop:"none",borderLeft:"none",transform:"translateX(-50%) rotate(45deg)"}} />
        </div>
      )}
    </div>
  );
}

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
      style={{flex:1,border:`1.5px dashed ${drag?color:"var(--color-border-secondary)"}`,borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",cursor:"pointer",background:drag?"var(--color-background-secondary)":"transparent",transition:"all 0.15s",minWidth:200}}
    >
      <input ref={ref} type="file" accept={accept} style={{display:"none"}} onChange={e=>process(e.target.files[0])} />
      <p style={{margin:"0 0 3px",fontWeight:500,fontSize:14,color}}>{label}</p>
      <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{sub}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function RiadDashboard() {
  const [bookings,  setBookings]  = useState([]);
  const [blocked,   setBlocked]   = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [tab,       setTab]       = useState("calendar");
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [toast,     setToast]     = useState("");
  const [showAddB,  setShowAddB]  = useState(false);
  const [showAddE,  setShowAddE]  = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [showAddBl, setShowAddBl] = useState(false);
  const [statsPanel, setStatsPanel] = useState(null);
  // calView now uses internal keys: "all" | "upcoming"
  const [calView,    setCalView]    = useState("upcoming");
  const [selectedMonth, setSelectedMonth] = useState(null); // 0-11 or null
  const [ignoredBlocks, setIgnoredBlocks] = useState(() => {
    try { const s = localStorage.getItem("riad_ignored_blocks"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [lang,       setLang]       = useState("fr");
  const [darkMode,   setDarkMode]   = useState(() => {
    try { return localStorage.getItem("riad_dark") === "1"; } catch { return false; }
  });
  const t = (key) => translations[lang]?.[key] ?? translations.fr[key] ?? key;
  const tCat = (cat) => translations[lang]?.cats?.[cat] ?? cat;
  // Locale string derived from lang
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  // Language-aware month names
  const months = useMemo(() => lang === "fr" ? MONTHS_FR : MONTHS_EN, [lang]);

  const [editId,    setEditId]    = useState(null);
  const [editAmt,   setEditAmt]   = useState("");
  const [editBooking, setEditBooking] = useState(null);
  const [nextId,    setNextId]    = useState(300);
  const [bForm, setBForm]   = useState({checkIn:"",checkOut:"",name:"",phone:"",platform:"Direct",amount:"",guests:"",paid:false});
  const [eForm, setEForm]   = useState({date:today(),category:"Ménage",description:"",amount:""});
  const [blForm, setBlForm] = useState({start:"",end:"",label:""});
  const [currency,  setCurrency]  = useState("MAD");
  const [rate,      setRate]      = useState(DEFAULT_RATE);
  const [showRate,  setShowRate]  = useState(false);
  const [commission, setCommission] = useState(0.20);
  const [recurring, setRecurring] = useState([]);
  const [showAddR,  setShowAddR]  = useState(false);
  const [rForm,     setRForm]     = useState({category:"Ménage",description:"",amount:"",months:[]});
  const [icsUrl,    setIcsUrl]    = useState(import.meta.env.VITE_ICS_URL || "");
  const [showIcsUrl,setShowIcsUrl]= useState(false);
  const [syncStatus,setSyncStatus]= useState("");
  const [lastSync,  setLastSync]  = useState(null);

  // ── Dark mode ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("riad_dark", "1");
    } else {
      root.removeAttribute("data-theme");
      localStorage.setItem("riad_dark", "0");
    }
  }, [darkMode]);

  // Toast helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Mobile detection
  const [isMobile, setIsMobile] = useState(typeof window!=="undefined" && window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Persistance localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadStorage();
    if (saved) {
      if (saved.bookings)  setBookings(saved.bookings);
      if (saved.blocked)   setBlocked(saved.blocked);
      if (saved.expenses)  setExpenses(saved.expenses);
      if (saved.year)      setYear(saved.year);
      if (saved.nextId)    setNextId(saved.nextId);
      if (saved.currency)    setCurrency(saved.currency);
      if (saved.rate)        setRate(saved.rate);
      if (saved.commission !== undefined) setCommission(saved.commission);
      if (saved.recurring)   setRecurring(saved.recurring);
      if (saved.icsUrl)      setIcsUrl(saved.icsUrl);
      if (saved.lastSync)    setLastSync(saved.lastSync);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("riad_ignored_blocks", JSON.stringify(ignoredBlocks)); } catch {}
  }, [ignoredBlocks]);

  useEffect(() => {
    saveStorage({ bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, lastSync, ignoredBlocks });
  }, [bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, lastSync, ignoredBlocks]);

  // ── Cloud sync (Firestore) ───────────────────────────────────────────────────
  const [cloudStatus, setCloudStatus] = useState("");
  const saveTimer = useRef(null);
  const isFromFirebase = useRef(false);
  const firebaseLoaded = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        isFromFirebase.current = true;
        firebaseLoaded.current = true;
        if (data.bookings)  setBookings(data.bookings);
        if (data.blocked)   setBlocked(data.blocked);
        if (data.expenses)  setExpenses(data.expenses);
        if (data.recurring) setRecurring(data.recurring);
        if (data.rate)      setRate(data.rate);
        if (data.currency)  setCurrency(data.currency);
        if (data.commission !== undefined) setCommission(data.commission);
        if (data.icsUrl)       setIcsUrl(data.icsUrl);
        if (data.lastSync)     setLastSync(data.lastSync);
        if (data.ignoredBlocks) setIgnoredBlocks(data.ignoredBlocks);
        saveStorage(data);
        setCloudStatus("saved");
        setTimeout(() => { isFromFirebase.current = false; }, 200);
      }
    }, () => setCloudStatus("error"));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isFromFirebase.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setCloudStatus("saving");
    saveTimer.current = setTimeout(() => {
      saveCloud({ bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, lastSync, ignoredBlocks })
        .then(() => setCloudStatus("saved"))
        .catch(() => setCloudStatus("error"));
    }, 1500);
  }, [bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring, icsUrl, lastSync, ignoredBlocks]);

  // ── Sync automatique .ics ────────────────────────────────────────────────────
  const syncIcs = async (url = icsUrl, silent = false) => {
    if (!url) return;
    setSyncStatus("syncing");

    // Toujours sync côté client — le cron Vercel gère l'auto à 6h
    let text = null;
    try {
      const res = await fetch(`/api/ical?url=${encodeURIComponent(url)}`);
      if (res.ok) { const tx = await res.text(); if (tx.includes("BEGIN:VCALENDAR")) text = tx; }
    } catch {}
    if (!text) try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (res.ok) { const j = await res.json(); if (j?.contents?.includes("BEGIN:VCALENDAR")) text = j.contents; }
    } catch {}

    if (!text) {
      setSyncStatus("error");
      if (!silent) showToast(t("toastSyncFail"));
      return;
    }
    try {
      const { bookings: newB, blocked: newBl } = parseIcs(text);
      if (!newB.length && !newBl.length) throw new Error("Empty");
      setBookings(prev => {
        const manuals  = prev.filter(b => b.id.startsWith("MAN-"));
        const existing = Object.fromEntries(prev.map(b=>[b.id,{amount:b.amount,name:b.name||"",guests:b.guests||"",paid:b.paid||false,nameEdited:b.nameEdited||false}]));
        const airbnb   = newB.map(b=>({...b,
          amount: existing[b.id]?.amount ?? 0,
          // Preserve manually-edited name — never overwrite with ICS name
          name:   existing[b.id]?.nameEdited ? existing[b.id].name : (existing[b.id]?.name || b.name || ""),
          guests: existing[b.id]?.guests ?? "",
          paid:   existing[b.id]?.paid   ?? false,
          nameEdited: existing[b.id]?.nameEdited ?? false,
        }));
        return [...airbnb, ...manuals];
      });
      setBlocked(prev => {
        const personal = prev.filter(b => b.type === "personal");
        const currentIgnored = ignoredBlocks;
        const filtered = newBl.filter(bl => !currentIgnored.includes(bl.uid || (bl.start+"_"+bl.end)));
        return [...filtered, ...personal];
      });
      const now = new Date().toISOString();
      setLastSync(now);
      setSyncStatus("ok");
      if (!silent) showToast(`✅ ${lang==="fr"?"Calendrier synchronisé":"Calendar synced"} · ${newB.length} ${lang==="fr"?"réservations":"bookings"}`);
    } catch(e) {
      setSyncStatus("error");
      if (!silent) showToast(t("toastSyncCalError"));
    }
  };

  const icsUrlRef = useRef(icsUrl);
  useEffect(() => { icsUrlRef.current = icsUrl; }, [icsUrl]);

  // ── Import iCal ───────────────────────────────────────────────────────────────
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
            amount: existing[b.id]?.amount ?? 0,
            name:   existing[b.id]?.nameEdited ? existing[b.id].name : (existing[b.id]?.name || b.name || ""),
            guests: existing[b.id]?.guests ?? "",
            nameEdited: existing[b.id]?.nameEdited ?? false,
          }));
          return [...airbnb, ...manuals];
        });
        setBlocked(prev => {
          const personal = prev.filter(b => b.type === "personal");
          const filteredAirbnb = newBl;
          return [...filteredAirbnb, ...personal];
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

  // ── Import CSV ───────────────────────────────────────────────────────────────
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

  // ── Export Excel ──────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const bRows = [[
      "Code","Nom","Plateforme","Arrivée","Départ","Nuits","Occupants",
      "Tarif/nuit brut (MAD)","Tarif/nuit net (MAD)","Tarif/nuit net (€)",
      "Total brut (MAD)","Commission (MAD)","Total net (MAD)","Total net (€)"
    ]];
    [...yearBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).forEach(b => {
      const gross     = b.amount;
      const netNight  = b.platform==="Airbnb" ? gross*(1-commission) : gross;
      const totalGrossB = gross * b.nights;
      const commAmt   = b.platform==="Airbnb" ? totalGrossB * commission : 0;
      const totalNetB = totalGrossB - commAmt;
      bRows.push([
        b.id, b.name||"", b.platform, b.checkIn, b.checkOut, b.nights, b.guests||"",
        gross, +netNight.toFixed(2), +(netNight/rate).toFixed(2),
        totalGrossB, +commAmt.toFixed(2), +totalNetB.toFixed(2), +(totalNetB/rate).toFixed(2)
      ]);
    });
    bRows.push([]);
    bRows.push(["TOTAL","","","","",totalNights+" nuits","",
      "","","",
      +totalGross.toFixed(2),
      +(totalGross-totalRevenue).toFixed(2),
      +totalRevenue.toFixed(2),
      +(totalRevenue/rate).toFixed(2)
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bRows), t("xlsBookings"));

    const eRows = [["Date","Catégorie","Description","Montant (MAD)","Montant (€)"]];
    [...yearExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(e =>
      eRows.push([e.date, e.category, e.description, e.amount, +(e.amount/rate).toFixed(2)])
    );
    eRows.push([]);
    eRows.push(["TOTAL","","",+totalExp.toFixed(2),+(totalExp/rate).toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eRows), t("xlsExpenses"));

    const catRows = [["Catégorie","Nb entrées","Total (MAD)","Total (€)","% du total"]];
    expByCat.forEach(([cat,amt]) => {
      const count = yearExpenses.filter(e=>e.category===cat).length;
      const pct   = totalExp ? Math.round((amt/totalExp)*100) : 0;
      catRows.push([cat, count, +amt.toFixed(2), +(amt/rate).toFixed(2), pct+"%"]);
    });
    catRows.push([]);
    catRows.push(["TOTAL", yearExpenses.length, +totalExp.toFixed(2), +(totalExp/rate).toFixed(2), "100%"]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), t("xlsCatBreakdown"));

    const platforms = [...new Set(yearBookings.map(b=>b.platform))];
    const pRows = [["Plateforme","Nb réservations","Nuits","Total brut (MAD)","Commission (MAD)","Total net (MAD)","Total net (€)","Moy./nuit net (MAD)"]];
    platforms.forEach(p => {
      const bs       = yearBookings.filter(b=>b.platform===p);
      const nights   = bs.reduce((s,b)=>s+b.nights,0);
      const gross    = bs.reduce((s,b)=>s+b.amount*b.nights,0);
      const comm     = p==="Airbnb" ? gross*commission : 0;
      const net      = gross - comm;
      const avgNightP = nights ? Math.round(net/nights) : 0;
      pRows.push([p, bs.length, nights, +gross.toFixed(2), +comm.toFixed(2), +net.toFixed(2), +(net/rate).toFixed(2), avgNightP]);
    });
    pRows.push([]);
    pRows.push(["TOTAL", yearBookings.filter(b=>b.platform!=="Perso").length, totalNights,
      +totalGross.toFixed(2),
      +(totalGross-totalRevenue).toFixed(2),
      +totalRevenue.toFixed(2),
      +(totalRevenue/rate).toFixed(2),
      avgNight
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pRows), t("xlsByPlatform"));

    const mRows = [["Mois","Revenus bruts (MAD)","Commission (MAD)","Revenus nets (MAD)","Revenus nets (€)","Dépenses (MAD)","Dépenses (€)","Bénéfice (MAD)","Bénéfice (€)"]];
    monthlyData.forEach((d,i) => {
      const mBookings = payingBookings.filter(b=>new Date(b.checkIn).getMonth()===i);
      const mGross    = mBookings.reduce((s,b)=>s+b.amount*b.nights,0);
      const mComm     = mBookings.filter(b=>b.platform==="Airbnb").reduce((s,b)=>s+b.amount*b.nights*commission,0);
      const mNet      = mGross - mComm;
      const mBenef    = mNet - d.Dépenses;
      mRows.push([d.name,
        +mGross.toFixed(2), +mComm.toFixed(2), +mNet.toFixed(2), +(mNet/rate).toFixed(2),
        d.Dépenses, +(d.Dépenses/rate).toFixed(2),
        +mBenef.toFixed(2), +(mBenef/rate).toFixed(2)
      ]);
    });
    mRows.push([]);
    mRows.push(["TOTAL",
      +totalGross.toFixed(2),
      +(totalGross-totalRevenue).toFixed(2),
      +totalRevenue.toFixed(2), +(totalRevenue/rate).toFixed(2),
      +totalExp.toFixed(2), +(totalExp/rate).toFixed(2),
      +netProfit.toFixed(2), +(netProfit/rate).toFixed(2)
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mRows), t("xlsMonthly"));

    XLSX.writeFile(wb, `Riad_${year}.xlsx`);
    showToast(t("toastExcelDL"));
  };

  // ── Export / Import JSON ──────────────────────────────────────────────────────
  const exportJSON = () => {
    const data = { bookings, blocked, expenses, rate, currency, recurring, exportedAt: new Date().toISOString(), version: 1 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `riad_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast(t("toastJsonDL"));
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version) throw new Error("Invalid format");
        const manuals = (data.bookings||[]).filter(b => b.id.startsWith("MAN-"));
        const filteredBlocked = (data.blocked||[]).filter(bl =>
          bl.type === "personal" ||
          !manuals.some(mb => mb.checkIn < bl.end && mb.checkOut > bl.start)
        );
        // Sauvegarde immédiate dans Firestore pour écraser les mauvaises données
        const cloudData = {
          bookings:      data.bookings     || [],
          blocked:       filteredBlocked,
          expenses:      data.expenses     || [],
          recurring:     data.recurring    || [],
          rate:          data.rate         || DEFAULT_RATE,
          currency:      data.currency     || "MAD",
          commission:    data.commission   ?? 0.20,
          icsUrl:        data.icsUrl       || "",
          ignoredBlocks: data.ignoredBlocks || [],
          lastSync:      data.lastSync     || null,
          version:       1,
        };
        await saveCloud(cloudData);
        // Puis mettre à jour le state local
        if (data.bookings)       setBookings(data.bookings);
        if (filteredBlocked)     setBlocked(filteredBlocked);
        if (data.expenses)       setExpenses(data.expenses);
        if (data.recurring)      setRecurring(data.recurring);
        if (data.rate)           setRate(data.rate);
        if (data.currency)       setCurrency(data.currency);
        if (data.ignoredBlocks)  setIgnoredBlocks(data.ignoredBlocks);
        saveStorage(cloudData);
        showToast(`✅ ${lang==="fr"?"Sauvegarde restaurée":"Backup restored"} · ${data.bookings?.length||0} ${lang==="fr"?"réservations":"bookings"} · ${data.expenses?.length||0} ${lang==="fr"?"dépenses":"expenses"}`);
      } catch { showToast(t("toastJsonInvalid")); }
    };
    reader.readAsText(file);
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const yearBookings    = useMemo(()=>bookings.filter(b=>new Date(b.checkIn).getFullYear()===year),[bookings,year]);
  const payingBookings  = useMemo(()=>yearBookings.filter(b=>b.platform!=="Perso"),[yearBookings]);
  const persoBookings   = useMemo(()=>yearBookings.filter(b=>b.platform==="Perso"),[yearBookings]);
  const yearExpenses    = useMemo(()=>expenses.filter(e=>new Date(e.date).getFullYear()===year),[expenses,year]);
  const totalStay   = (b) => b.amount * b.nights;
  const netAmount   = (b) => b.platform==="Airbnb" ? totalStay(b)*(1-commission) : totalStay(b);
  const totalRevenue = useMemo(()=>payingBookings.reduce((s,b)=>s+netAmount(b),0),[payingBookings,commission]);
  const totalGross   = useMemo(()=>payingBookings.reduce((s,b)=>s+totalStay(b),0),[payingBookings]);
  const totalExp     = useMemo(()=>yearExpenses.reduce((s,e)=>s+e.amount,0),[yearExpenses]);
  const netProfit    = totalRevenue - totalExp;
  const totalNights  = useMemo(()=>payingBookings.reduce((s,b)=>s+b.nights,0),[payingBookings]);
  const persoNights  = useMemo(()=>persoBookings.reduce((s,b)=>s+b.nights,0),[persoBookings]);
  const occupancy    = Math.round(((totalNights+persoNights)/365)*100);
  const avgNight     = totalNights ? Math.round(totalRevenue/totalNights) : 0;
  const pendingCount = payingBookings.filter(b=>b.amount===0).length;
  const todayStr     = today();
  const pastBookings   = payingBookings.filter(b=>b.checkOut <= todayStr);
  const futureBookings = payingBookings.filter(b=>b.checkIn > todayStr);
  const pastRevenue  = pastBookings.reduce((s,b)=>s+netAmount(b),0);
  const futureRevenue = futureBookings.reduce((s,b)=>s+netAmount(b),0);

  const nightsInMonth = (b, monthIdx) => {
    const y = year;
    const monthStart = new Date(y, monthIdx, 1);
    const monthEnd   = new Date(y, monthIdx+1, 1);
    const start = new Date(Math.max(new Date(b.checkIn), monthStart));
    const end   = new Date(Math.min(new Date(b.checkOut), monthEnd));
    return Math.max(0, Math.round((end-start)/86400000));
  };

  // monthlyData uses language-aware month names + internal French keys for recharts
  const monthlyData = useMemo(()=>months.map((m,i)=>({
    name: m,
    Revenus:  payingBookings.filter(b=>new Date(b.checkIn).getMonth()===i).reduce((s,b)=>s+netAmount(b),0),
    Dépenses: yearExpenses.filter(e=>new Date(e.date).getMonth()===i).reduce((s,e)=>s+e.amount,0),
    NuitsPayantes: payingBookings.reduce((s,b)=>s+nightsInMonth(b,i),0),
    NuitsPerso:    persoBookings.reduce((s,b)=>s+nightsInMonth(b,i),0),
  })).map(d=>({...d,Bénéfice:d.Revenus-d.Dépenses})),[payingBookings,persoBookings,yearExpenses,commission,months]);

  const expByCat = useMemo(()=>{
    const map={};
    yearExpenses.forEach(e=>{map[e.category]=(map[e.category]||0)+e.amount;});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[yearExpenses]);

  const calMonths = useMemo(()=>{
    const r=[];
    for(let i=0;i<12;i++){r.push({year,month:i});}
    return r;
  },[year]);

  // ── CRUD ──────────────────────────────────────────────────────────────────────
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
  const addBooking = () => {
    if (!bForm.checkIn||!bForm.checkOut) return;
    const nights=Math.round((new Date(bForm.checkOut)-new Date(bForm.checkIn))/86400000);
    setBookings(prev=>[...prev,{...bForm,id:"MAN-"+nextId,nights,amount:parseFloat(bForm.amount)||0}]);
    setNextId(n=>n+1); setBForm({checkIn:"",checkOut:"",name:"",phone:"",platform:"Direct",amount:"",guests:""}); setShowAddB(false);
    showToast(t("toastBookingAdded"));
  };
  const addExpense = () => {
    if (!eForm.date||!eForm.description||!eForm.amount) return;
    setExpenses(prev=>[...prev,{...eForm,id:nextId,amount:parseFloat(eForm.amount)}]);
    setNextId(n=>n+1); setEForm({date:today(),category:"Ménage",description:"",amount:""}); setShowAddE(false);
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
    setBlocked(prev=>[...prev,{...blForm,type:"personal"}]);
    setBlForm({start:"",end:"",label:""}); setShowAddBl(false);
    showToast(t("toastBlockedAdded"));
  };
  const addRecurring = () => {
    if (!rForm.description||!rForm.amount) return;
    setRecurring(prev=>[...prev,{...rForm,id:"REC-"+nextId,amount:parseFloat(rForm.amount)}]);
    setNextId(n=>n+1); setRForm({category:"Ménage",description:"",amount:"",months:[]}); setShowAddR(false);
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
  const togglePaid = (id) => {
    setBookings(prev=>prev.map(b=>b.id===id?{...b,paid:!b.paid}:b));
    showToast(t("toastPaymentUpdated"));
  };

  const toggleMonth = (m) => setRForm(f=>({...f,months:f.months.includes(m)?f.months.filter(x=>x!==m):[...f.months,m].sort((a,b)=>a-b)}));

  const printRecap = (b) => {
    const total  = totalStay(b);
    const netTot = b.platform==="Airbnb" ? total*(1-commission) : total;
    const commAmt= b.platform==="Airbnb" ? total*commission : 0;
    const loc = locale;
    const rows = [
      [t("recapClient"), b.name||"—"],
      [t("recapCode"), b.id],
      [t("recapPlatform"), b.platform],
      [t("recapArrival"), new Date(b.checkIn).toLocaleDateString(loc,{weekday:"long",day:"numeric",month:"long",year:"numeric"})],
      [t("recapDeparture"), new Date(b.checkOut).toLocaleDateString(loc,{weekday:"long",day:"numeric",month:"long",year:"numeric"})],
      [t("recapDuration"), `${b.nights} ${b.nights>1?t("recapNights"):t("recapNight")}`],
      ...(b.guests?[[t("recapGuests"), `${b.guests} ${b.guests>1?t("recapPersons"):t("recapPerson")}`]]:[]),
      [t("recapRateGross"), b.amount.toLocaleString("fr-MA")+" MAD"],
      ...(b.platform==="Airbnb"?[[`${t("recapCommission")} (-${Math.round(commission*100)}%)`, "-"+Math.round(commAmt).toLocaleString("fr-MA")+" MAD"]]:[]),
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
      +"<p>"+t("recapPayment")+" : <span class='badge "+(b.paid?"paid":"unpaid")+"'>"+(b.paid?t("paidStatus"):t("unpaidStatus"))+"</span></p>"
      +"<div class='footer'>Kasbah Blanca · "+new Date().toLocaleDateString(loc)+"</div>"
      +"<scr"+"ipt>window.onload=function(){window.print()}</scr"+"ipt>"
      +"</body></html>";
    const w = window.open("","_blank","width=600,height=700");
    w.document.write(html);
    w.document.close();
  };

  // ── Alertes arrivées ─────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const arrivals = bookings.filter(b => b.platform!=="Perso").map(b => {
      const ci = new Date(b.checkIn); ci.setHours(0,0,0,0);
      return {...b, type:"arrival", daysUntil: Math.round((ci-now)/86400000)};
    }).filter(b => b.daysUntil >= 0 && b.daysUntil <= 7);
    const departures = bookings.filter(b => b.platform!=="Perso").map(b => {
      const co = new Date(b.checkOut); co.setHours(0,0,0,0);
      return {...b, type:"departure", daysUntil: Math.round((co-now)/86400000)};
    }).filter(b => b.daysUntil >= 0 && b.daysUntil <= 7);
    return [...arrivals, ...departures].sort((a,b) => a.daysUntil - b.daysUntil || a.type.localeCompare(b.type));
  }, [bookings]);

  // ── Notifications push ────────────────────────────────────────────────────────
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
    const checkNotifs = () => {
      const now = new Date(); now.setHours(0,0,0,0);
      bookings.filter(b => b.platform!=="Perso").forEach(b => {
        const ci = new Date(b.checkIn); ci.setHours(0,0,0,0);
        const co = new Date(b.checkOut); co.setHours(0,0,0,0);
        const daysIn  = Math.round((ci-now)/86400000);
        const daysOut = Math.round((co-now)/86400000);
        const name = b.name || b.id;
        if (daysIn === 0) new Notification("🏡 "+t("arrivalToday"), {body: name+" · "+b.nights+"n · "+b.platform, icon:"/apple-touch-icon.png"});
        if (daysIn === 1) new Notification("🟢 "+t("arrivalTomorrow"), {body: name+" · "+b.nights+"n · "+b.platform, icon:"/apple-touch-icon.png"});
        if (daysOut === 0) new Notification("🔴 "+t("departureToday"), {body: name+" · "+b.platform, icon:"/apple-touch-icon.png"});
        if (daysOut === 1) new Notification("🟠 "+t("departureTomorrow"), {body: name+" · "+b.platform, icon:"/apple-touch-icon.png"});
      });
      localStorage.setItem("lastNotifDate", todayKey);
    };
    checkNotifs();
  }, [bookings.length]);

  // ── Prévisionnel ─────────────────────────────────────────────────────────────
  const forecast = useMemo(() => {
    const monthsLeft = 12 - new Date().getMonth();
    const avgMonthly = totalRevenue > 0 ? totalRevenue / Math.max(new Date().getMonth()+1, 1) : 0;
    const projectedTotal = pastRevenue + futureRevenue + (avgMonthly * Math.max(0, monthsLeft - futureBookings.length));
    const avgNightRate = totalNights > 0 ? totalRevenue / totalNights : 0;
    return { projectedTotal, avgMonthly, avgNightRate };
  }, [totalRevenue, pastRevenue, futureRevenue, totalNights]);

  const rc  = {background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem"};
  const mc  = {background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"1rem",flex:"1 1 130px",minWidth:0};
  const inp = {width:"100%",boxSizing:"border-box",marginTop:4,marginBottom:12};

  const tabBtn=(id,lbl)=>(
    <button onClick={()=>setTab(id)} style={{border:"none",background:"none",padding:"8px 14px",cursor:"pointer",fontSize:14,fontWeight:tab===id?500:400,color:tab===id?"var(--color-text-primary)":"var(--color-text-secondary)",borderBottom:tab===id?"2px solid var(--color-text-primary)":"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>{lbl}</button>
  );

  // Tooltip for recharts — uses translated series names via Bar name prop
  const TT=({active,payload,label})=>{
    if(!active||!payload?.length) return null;
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

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <>
    <style>{`
      [data-theme="dark"] {
        --color-background-primary: #1a1a1a;
        --color-background-secondary: #252525;
        --color-text-primary: #f0f0f0;
        --color-text-secondary: #a0a0a0;
        --color-text-tertiary: #666666;
        --color-border-primary: #333333;
        --color-border-secondary: #333333;
        --color-border-tertiary: #2a2a2a;
        --color-text-success: #4caf50;
        --color-text-danger: #ef5350;
        --color-text-warning: #ffa726;
        --color-text-info: #42a5f5;
        --color-background-warning: #3a2a0a;
        --color-background-info: #0a1f3a;
        --color-background-success: #0a2a0a;
        color-scheme: dark;
      }
      [data-theme="dark"] input,
      [data-theme="dark"] select,
      [data-theme="dark"] button {
        background-color: #252525;
        color: #f0f0f0;
        border-color: #333333;
      }
      [data-theme="dark"] input::placeholder { color: #555; }
      * { transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
    `}</style>
    <div style={{fontFamily:"var(--font-sans)",maxWidth:940,margin:"0 auto",padding:"1.5rem 1rem",position:"relative",background:"var(--color-background-primary)",minHeight:"100vh"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"10px 20px",fontSize:13,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:9999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="/apple-touch-icon.png" alt="Kasbah Blanca" style={{width:48,height:48,borderRadius:12,objectFit:"cover",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}} />
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:500}}>{t("title")}</h1>
            <p style={{margin:"4px 0 0",fontSize:13,color:"var(--color-text-secondary)"}}>
              {t("subtitle")} · {cloudStatus==="saving" ? t("saving") : cloudStatus==="saved" ? t("synced") : cloudStatus==="error" ? t("offline") : ""}
              {icsUrl && <span style={{marginLeft:8}}>{syncStatus==="syncing"?"🔄 Sync...":syncStatus==="ok"?`${t("syncOk")} ${lastSync?new Date(lastSync).toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"}):""}`:syncStatus==="error"&&!lastSync?t("syncFail"):lastSync?`${t("syncOk")} ${new Date(lastSync).toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"})}`:""}</span>}
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select value={year} onChange={e=>setYear(+e.target.value)} style={{width:"auto"}}>
            {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select>
          <button onClick={exportExcel} style={{whiteSpace:"nowrap"}}>⬇ Excel {year}</button>
          <div style={{display:"flex",gap:4,background:"var(--color-background-secondary)",borderRadius:8,padding:3}}>
            {["MAD","EUR"].map(c=>(
              <button key={c} onClick={()=>setCurrency(c)} style={{border:"none",borderRadius:6,padding:"4px 12px",fontSize:13,fontWeight:currency===c?600:400,background:currency===c?"var(--color-background-primary)":"transparent",cursor:"pointer",color:currency===c?"var(--color-text-primary)":"var(--color-text-secondary)",boxShadow:currency===c?"0 1px 4px rgba(0,0,0,0.12)":"none",transition:"all .15s"}}>{c}</button>
            ))}
          </div>
          {/* Toggle FR/EN */}
          <div style={{display:"flex",gap:4,background:"var(--color-background-secondary)",borderRadius:8,padding:3}}>
            {["fr","en"].map(l=>(
              <button key={l} onClick={()=>setLang(l)} style={{border:"none",borderRadius:6,padding:"4px 10px",fontSize:13,fontWeight:lang===l?600:400,background:lang===l?"var(--color-background-primary)":"transparent",cursor:"pointer",color:lang===l?"var(--color-text-primary)":"var(--color-text-secondary)",boxShadow:lang===l?"0 1px 4px rgba(0,0,0,0.12)":"none",transition:"all .15s"}}>{l==="fr"?"FR":"EN"}</button>
            ))}
          </div>
          <button onClick={()=>setDarkMode(d=>!d)} style={{padding:"4px 10px",fontSize:14,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer"}} title={darkMode?"Light mode":"Dark mode"}>{darkMode?"☀️":"🌙"}</button>
          <button onClick={()=>setShowIcsUrl(r=>!r)} style={{padding:"4px 10px",fontSize:13,background:icsUrl?"#e8f5e9":"none",border:`0.5px solid ${icsUrl?"#2e7d32":"var(--color-border-secondary)"}`,borderRadius:6,color:icsUrl?"#2e7d32":"var(--color-text-secondary)"}}>🔄 {icsUrl?t("autoSyncOn"):t("configSync")}</button>
          {icsUrl && <button onClick={()=>syncIcs()} style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6}}>{syncStatus==="syncing"?"⏳":"↻"} {t("sync")}</button>}
          <button onClick={()=>setShowRate(r=>!r)} style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6}}>1€ = {rate} MAD · -{Math.round(commission*100)}%</button>
          <button onClick={exportJSON} style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6}}>{t("backup")}</button>
          <label style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>
            {t("restore")}
            <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){importJSON(e.target.files[0]);e.target.value="";}}} />
          </label>
        </div>
      </div>

      {/* Panel taux + commission */}
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

      {/* Panel sync .ics URL */}
      {showIcsUrl && (
        <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"12px 14px",marginBottom:"1rem",fontSize:13}}>
          <p style={{margin:"0 0 8px",fontWeight:500,fontSize:13}}>{t("syncPanelTitle")}</p>
          <p style={{margin:"0 0 10px",fontSize:12,color:"var(--color-text-tertiary)"}}>{t("syncPanelDesc")}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input type="url" placeholder="https://www.airbnb.fr/calendar/ical/..." value={icsUrl} onChange={e=>setIcsUrl(e.target.value)} style={{flex:1,minWidth:200,padding:"6px 10px",fontSize:12,borderRadius:6,border:"0.5px solid var(--color-border-secondary)"}} />
            <button onClick={()=>syncIcs()} style={{padding:"6px 14px",fontSize:12,background:C_RESERVED,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}} disabled={!icsUrl}>{t("syncNow")}</button>
            {icsUrl && <button onClick={()=>{setIcsUrl("");setSyncStatus("");setLastSync(null);}} style={{padding:"6px 10px",fontSize:12,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-danger)"}}>{t("syncDelete")}</button>}
          </div>
          {lastSync && <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-tertiary)"}}>{t("lastSync")} : {new Date(lastSync).toLocaleString(locale)}</p>}
          <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-warning)",background:"var(--color-background-warning)",borderRadius:6,padding:"6px 10px"}}>{t("syncDelay")}</p>
        </div>
      )}

      {/* Alertes arrivées & départs */}
      {alerts.length > 0 && (
        <div style={{marginBottom:"1.25rem",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:12,color:"var(--color-text-tertiary)",fontWeight:500}}>{t("alertsTitle")}</span>
            {!notifEnabled && "Notification" in window && (
              <button onClick={requestNotifPermission} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"none",cursor:"pointer",color:"var(--color-text-secondary)"}}>{t("enableNotif")}</button>
            )}
            {notifEnabled && (
              <button onClick={()=>{setNotifEnabled(false);showToast(t("toastNotifOff"));}} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"0.5px solid #2e7d32",background:"none",cursor:"pointer",color:"#2e7d32"}}>{t("notifOn")}</button>
            )}
          </div>
          {alerts.map((b,i) => {
            const isArr = b.type === "arrival";
            const bg    = isArr
              ? (b.daysUntil===0 ? "#fdecea" : b.daysUntil<=2 ? "#fff3cd" : "#e8f5e9")
              : (b.daysUntil===0 ? "#fce4ec" : b.daysUntil<=2 ? "#fff8e1" : "#e3f2fd");
            const col   = isArr
              ? (b.daysUntil===0 ? C_RESERVED : b.daysUntil<=2 ? "#856404" : "#2e7d32")
              : (b.daysUntil===0 ? "#880e4f" : b.daysUntil<=2 ? "#ff6f00" : C_BLOCKED);
            const icon  = isArr
              ? (b.daysUntil===0 ? "🔴" : b.daysUntil<=2 ? "🟡" : "🟢")
              : (b.daysUntil===0 ? "🔵" : b.daysUntil<=2 ? "🟠" : "⚪");
            const msg   = isArr
              ? (b.daysUntil===0 ? t("arrivalToday") : b.daysUntil===1 ? t("arrivalTomorrow") : `${t("arrivalIn")} ${b.daysUntil}${t("days")}`)
              : (b.daysUntil===0 ? t("departureToday") : b.daysUntil===1 ? t("departureTomorrow") : `${t("departureIn")} ${b.daysUntil}${t("days")}`);
            return (
              <div key={b.id+b.type} style={{background:bg,borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",borderLeft:`3px solid ${col}`}}>
                <span style={{fontSize:14}}>{icon}</span>
                <span style={{fontWeight:600,color:col,fontSize:13,minWidth:130}}>{msg}</span>
                <span style={{fontSize:13,fontWeight:500}}>{b.name||b.id}</span>
                <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{fmtDate(isArr?b.checkIn:b.checkOut,locale)} · {b.nights}n{b.guests?` · 👥 ${b.guests}`:""}</span>
                <span style={{marginLeft:"auto",fontSize:12,color:col,fontWeight:500}}>{b.platform}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Import zones */}
      <div style={{display:"flex",gap:12,marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <DropZone label={t("dropIcsLabel")} sub={t("dropIcsSub")} accept=".ics" onFile={handleIcs} color={C_RESERVED} />
        <DropZone label={t("dropCsvLabel")} sub={t("dropCsvSub")} accept=".csv" onFile={handleCsv} color="var(--color-text-info)" />
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:"1.5rem"}}>
        {[
          {label:t("netRevenue"), value:fmtBoth(totalRevenue,rate), sub:`${t("gross")} : ${fmtMAD(totalGross)} · Airbnb -${Math.round(commission*100)}%`, color:"var(--color-text-success)"},
          {label:t("expenses"),   value:fmtBoth(totalExp,rate),     sub:yearExpenses.length+" "+t("expensesCount"), color:"var(--color-text-danger)"},
          {label:t("netProfit"),  value:fmtBoth(netProfit,rate),    sub:t("margin")+" "+(totalRevenue?Math.round((netProfit/totalRevenue)*100):0)+"%", color:netProfit>=0?"var(--color-text-success)":"var(--color-text-danger)"},
          {label:t("occupation"), value:occupancy+"%",               sub:`${totalNights} ${t("payingNights")} + ${persoNights} ${t("persoNights")}`, color:"var(--color-text-info)"},
          {label:t("avgNight"),   value:avgNight?fmtBoth(avgNight,rate):"—", sub:t("onAmounts"), color:"var(--color-text-secondary)"},
        ].map(k=>(
          <div key={k.label} style={mc}>
            <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{k.label}</p>
            {typeof k.value === "string" && k.value.includes("·") ? (
              <div style={{margin:"6px 0 2px"}}>
                <p style={{margin:0,fontSize:20,fontWeight:500,color:k.color}}>{k.value.split("·")[0].trim()}</p>
                <p style={{margin:0,fontSize:13,color:"var(--color-text-tertiary)"}}>{k.value.split("·")[1].trim()}</p>
              </div>
            ) : (
              <p style={{margin:"6px 0 2px",fontSize:22,fontWeight:500,color:k.color}}>{k.value}</p>
            )}
            <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Stats échues / à venir */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:"1.25rem"}}>
        {[
          {key:"past",  label:t("pastBookings"),  value:fmtBoth(pastRevenue,rate),   sub:pastBookings.length+" "+(pastBookings.length>1?t("staysDonePlural"):t("staysDone")),   color:"#2e7d32"},
          {key:"future",label:t("futureBookings"), value:fmtBoth(futureRevenue,rate),  sub:futureBookings.length+" "+(futureBookings.length>1?t("staysAheadPlural"):t("staysAhead")), color:C_BLOCKED},
          {key:"all",   label:`${t("caTotal")} ${year}`, value:fmtBoth(totalRevenue,rate), sub:(Math.round((pastRevenue/totalRevenue)*100)||0)+"% "+t("encaisse")+" · "+(Math.round((futureRevenue/totalRevenue)*100)||0)+"% "+t("aVenir"), color:"#BA7517"},
        ].map(card=>(
          <div key={card.key} onClick={()=>setStatsPanel(statsPanel===card.key?null:card.key)}
            style={{...mc,borderLeft:`3px solid ${card.color}`,flex:"1 1 200px",cursor:"pointer",transition:"box-shadow 0.15s",boxShadow:statsPanel===card.key?"0 0 0 2px "+card.color+"44":"none"}}>
            <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{card.label} {statsPanel===card.key?"▲":"▼"}</p>
            <p style={{margin:"6px 0 2px",fontSize:18,fontWeight:500,color:card.color}}>{card.value}</p>
            <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Panel détail réservations */}
      {statsPanel && (() => {
        const list = statsPanel==="past" ? pastBookings : statsPanel==="future" ? futureBookings : payingBookings;
        const title = statsPanel==="past" ? t("pastBookings") : statsPanel==="future" ? t("futureBookings") : `${t("caTotal")} ${year}`;
        const color = statsPanel==="past" ? C_RESERVED : statsPanel==="future" ? C_BLOCKED : "#BA7517";
        return (
          <div style={{...rc,marginBottom:"1.25rem",borderLeft:`3px solid ${color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <p style={{margin:0,fontSize:14,fontWeight:500,color}}>{title}</p>
              <button onClick={()=>setStatsPanel(null)} style={{fontSize:12,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)"}}>{t("closeBtn")}</button>
            </div>
            {list.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,margin:0}}>{t("noBookings")}</p>
              : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                      {[t("hPayment"),t("hClient"),t("colArrival"),t("colDeparture"),t("colNights"),t("hPlatform"),t("hNetTotal")].map(h=>(
                        <th key={h} style={{padding:"6px 8px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...list].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b=>(
                      <tr key={b.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"8px"}}><button onClick={()=>togglePaid(b.id)} title={b.paid?t("markUnpaid"):t("markPaid")} style={{border:"none",background:"none",cursor:"pointer",fontSize:14}}>{b.paid?"✅":"⏳"}</button></td>
                        <td style={{padding:"8px",fontWeight:500}}>{b.name||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</td>
                        <td style={{padding:"8px",whiteSpace:"nowrap"}}>{fmtDate(b.checkIn,locale)}</td>
                        <td style={{padding:"8px",whiteSpace:"nowrap"}}>{fmtDate(b.checkOut,locale)}</td>
                        <td style={{padding:"8px",color:"var(--color-text-secondary)"}}>{b.nights}n</td>
                        <td style={{padding:"8px"}}><span style={{fontSize:11,padding:"2px 6px",borderRadius:99,background:"var(--color-background-secondary)"}}>{b.platform}</span></td>
                        <td style={{padding:"8px",fontWeight:500,color:b.paid?"#2e7d32":"var(--color-text-warning)"}}>{b.amount>0?fmtBoth(netAmount(b),rate):<span style={{fontSize:12}}>{t("toEnter")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{padding:"8px",fontWeight:500,fontSize:13}}>{t("total")} · {list.filter(b=>b.paid).length}/{list.length} {lang==="fr"?`payé${list.filter(b=>b.paid).length>1?"s":""}`:`paid`}</td>
                      <td style={{padding:"8px",fontWeight:600,color}}>{fmtBoth(list.reduce((s,b)=>s+netAmount(b),0),rate)}</td>
                    </tr>
                  </tfoot>
                </table>
            }
          </div>
        );
      })()}

      {/* Tabs */}
      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.5rem",overflowX:"auto"}}>
        {tabBtn("calendar",t("tabCalendar"))}
        {tabBtn("bookings",`${t("tabBookings")}${pendingCount>0?` (${pendingCount} ⚠)`:""}`)}
        {tabBtn("chart",t("tabChart"))}
        {tabBtn("expenses",t("tabExpenses"))}
      </div>

      {/* ── CALENDRIER ─────────────────────────────────────────────────────── */}
      {tab==="calendar" && (
        <div>
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

          {/* Grilles mensuelles */}
          <div style={{...rc,marginBottom:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8}}>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>{t("calendarTitle")} {year}</p>
              {/* calView uses internal keys "all" / "upcoming" */}
              <div style={{display:"flex",gap:4,background:"var(--color-background-secondary)",borderRadius:8,padding:3}}>
                {[{key:"all",label:t("allMonths")},{key:"upcoming",label:t("upcoming")}].map(v=>(
                  <button key={v.key} onClick={()=>setCalView(v.key)} style={{border:"none",borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:calView===v.key?600:400,background:calView===v.key?"var(--color-background-primary)":"transparent",cursor:"pointer",color:calView===v.key?"var(--color-text-primary)":"var(--color-text-secondary)",boxShadow:calView===v.key?"0 1px 4px rgba(0,0,0,0.12)":"none",transition:"all .15s"}}>{v.label}</button>
                ))}
              </div>
            </div>
            {bookings.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,textAlign:"center",padding:"1.5rem 0"}}>{t("importIcsMsg")}</p>
              : <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                  {(calView==="upcoming"
                    ? calMonths.filter(({month})=>month>=new Date().getMonth())
                    : calMonths
                  ).map(({year:y,month:m})=><MonthCalendar key={`${y}-${m}`} year={y} month={m} bookings={bookings} blocked={blocked} monthName={months[m]} />)}
                </div>
            }
          </div>

          {/* Périodes bloquées perso */}
          <div style={rc}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>{t("personalPeriods")}</p>
              <button onClick={()=>setShowAddBl(!showAddBl)}>{t("blockDates")}</button>
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
                  <button onClick={addBlocked}>{t("save")}</button>
                  <button onClick={()=>setShowAddBl(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                </div>
              </div>
            )}
            {blocked.filter(b=>b.type==="personal").length===0 && !showAddBl
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,margin:0}}>{t("noPersonalPeriods")}</p>
              : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {blocked.filter(b=>b.type==="personal").map((b,i)=>{
                    const n=Math.round((new Date(b.end)-new Date(b.start))/86400000);
                    const convertToBooking = () => {
                      setBlocked(prev=>prev.filter(x=>x!==b));
                      setBookings(prev=>[...prev,{
                        id:"MAN-"+nextId, checkIn:b.start, checkOut:b.end,
                        nights:n, platform:"Direct", phone:"", name:b.label||"",
                        amount:0, uid:""
                      }]);
                      setNextId(n=>n+1);
                      setTab("bookings");
                      showToast(t("toastConverted"));
                    };
                    return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#2980b922",borderRadius:"var(--border-radius-md)",flexWrap:"wrap",gap:8}}>
                      <span style={{fontSize:13,color:C_BLOCKED,fontWeight:500}}>{b.label||(lang==="fr"?"Bloqué":"Blocked")}</span>
                      <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{fmtDate(b.start,locale)} → {fmtDate(b.end,locale)}</span>
                      <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{n} {n>1?t("dayPlural"):t("daySingle")}</span>
                      <button onClick={convertToBooking} style={{fontSize:12,padding:"4px 12px",background:C_RESERVED,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>{t("toBooking")}</button>
                      <button onClick={()=>{setBlocked(prev=>prev.filter(x=>x!==b));showToast(t("toastBlockedDel"));}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer"}}>✕</button>
                    </div>;
                  })}
                </div>
            }
            {/* Indispo Airbnb */}
            {(()=>{
              // Cacher les blocs dont le début est déjà couvert par une réservation existante
              const in360Days = new Date(); in360Days.setDate(in360Days.getDate() + 360);
              const airbnbBlocked = blocked.filter(b => {
                if (b.type !== "airbnb" && b.type) return false;
                if (new Date(b.start) > in360Days) return false;
                if (ignoredBlocks.includes(b.uid || (b.start+"_"+b.end))) return false;
                // Vérifier que toute la période est couverte (départ matin = arrivée après-midi OK)
                const isCovered = (() => {
                  let cursor = b.start;
                  const allRes = [...bookings, ...blocked.filter(x => x.type === "personal")];
                  while (cursor < b.end) {
                    const covering = allRes.find(r => {
                      const s = r.checkIn || r.start;
                      const e = r.checkOut || r.end;
                      // Tolérance 1 jour : départ matin / arrivée lendemain
                      return s <= cursor && e > cursor;
                    });
                    if (!covering) {
                      // Cherche si quelque chose commence demain (gap 1 jour toléré)
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
                })();
                return !isCovered;
              });
              if (!airbnbBlocked.length) return null;
              return (
                <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                  <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-tertiary)"}}>{t("airbnbUnavail")}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {airbnbBlocked.map((b,i)=>{
                      const n=Math.round((new Date(b.end)-new Date(b.start))/86400000);
                      const convertToBooking = () => {
                        setBlocked(prev=>prev.filter(x=>x!==b));
                        setBookings(prev=>[...prev,{
                          id:"MAN-"+nextId, checkIn:b.start, checkOut:b.end,
                          nights:n, platform:"Direct", phone:"", name:"",
                          amount:0, uid:""
                        }]);
                        setNextId(n=>n+1);
                        setTab("bookings");
                        showToast(t("toastConvertedFull"));
                      };
                      return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"var(--color-text-secondary)",padding:"8px 10px",background:"var(--color-background-secondary)",borderRadius:6,flexWrap:"wrap",gap:6}}>
                        <span>{fmtDate(b.start,locale)} → {fmtDate(b.end,locale)}</span>
                        <span style={{color:"var(--color-text-tertiary)"}}>{n} {n>1?t("dayPlural"):t("daySingle")}</span>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={convertToBooking} style={{fontSize:11,padding:"3px 10px",background:C_RESERVED,color:"#fff",border:"none",borderRadius:5,cursor:"pointer"}}>{t("toBooking")}</button>
                          <button onClick={()=>{
                            const uid = b.uid || (b.start+"_"+b.end);
                            setIgnoredBlocks(prev=>[...new Set([...prev, uid])]);
                            setBlocked(prev=>prev.filter(x=>x!==b));
                            showToast(t("toastAirbnbDel"));
                          }} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button>
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── RÉSERVATIONS ───────────────────────────────────────────────────── */}
      {tab==="bookings" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
            <p style={{margin:0,fontSize:14,color:"var(--color-text-secondary)"}}>
              {yearBookings.length} {t("bookingsSummary")} · {fmtBoth(totalRevenue,rate)}
              {pendingCount>0 && <span style={{marginLeft:8,fontSize:12,color:"var(--color-text-warning)"}}>({pendingCount} {t("noAmountSet")})</span>}
            </p>
            <button onClick={()=>setShowAddB(!showAddB)}>{t("addBooking")}</button>
          </div>

          {showAddB && (
            <div style={{...rc,marginBottom:"1.25rem",background:"var(--color-background-secondary)",border:"none"}}>
              <p style={{margin:"0 0 12px",fontSize:14,fontWeight:500}}>{t("newDirectBooking")}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("colArrival")}</label><input type="date" style={inp} value={bForm.checkIn} onChange={e=>setBForm(f=>({...f,checkIn:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("colDeparture")}</label><input type="date" style={inp} value={bForm.checkOut} onChange={e=>setBForm(f=>({...f,checkOut:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmName")}</label><input type="text" placeholder={t("frmPlaceholderName")} style={inp} value={bForm.name} onChange={e=>setBForm(f=>({...f,name:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmPhone")}</label><input type="text" placeholder={t("frmPlaceholderPhone")} style={inp} value={bForm.phone} onChange={e=>setBForm(f=>({...f,phone:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmPlatform")}</label><select style={inp} value={bForm.platform} onChange={e=>setBForm(f=>({...f,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmGuests")}</label><input type="number" placeholder={t("frmPlaceholderGuests")} min="1" style={inp} value={bForm.guests} onChange={e=>setBForm(f=>({...f,guests:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" placeholder={t("frmPlaceholderAmount")} style={inp} value={bForm.amount} onChange={e=>setBForm(f=>({...f,amount:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addBooking}>{t("save")}</button>
                <button onClick={()=>setShowAddB(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
              </div>
            </div>
          )}

          {/* Modal édition réservation */}
          {editBooking && (
            <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
              <div style={{background:"var(--color-background-primary)",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
                <p style={{margin:"0 0 16px",fontSize:15,fontWeight:500}}>{t("editBookingModalTitle")}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("colArrival")}</label><input type="date" style={inp} value={editBooking.checkIn} onChange={e=>setEditBooking(b=>({...b,checkIn:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("colDeparture")}</label><input type="date" style={inp} value={editBooking.checkOut} onChange={e=>setEditBooking(b=>({...b,checkOut:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmName")}</label><input type="text" style={inp} value={editBooking.name||""} onChange={e=>setEditBooking(b=>({...b,name:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmPlatform")}</label><select style={inp} value={editBooking.platform} onChange={e=>setEditBooking(b=>({...b,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmGuests")}</label><input type="number" min="1" style={inp} value={editBooking.guests||""} onChange={e=>setEditBooking(b=>({...b,guests:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" style={inp} value={editBooking.amount||""} onChange={e=>setEditBooking(b=>({...b,amount:parseFloat(e.target.value)||0}))} /></div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={saveEditBooking} style={{flex:1}}>{t("save")}</button>
                  <button onClick={()=>setEditBooking(null)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                </div>
              </div>
            </div>
          )}

          <div style={rc}>
            {yearBookings.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,textAlign:"center",padding:"1.5rem 0"}}>{t("noBookYear")} {year}.</p>
              : isMobile
                /* ── MOBILE : cartes ── */
                ? <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {[...yearBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b=>(
                      <div key={b.id} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"12px 14px",borderLeft:`3px solid ${C_RESERVED}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                          <div>
                            {b.name && <p style={{margin:"0 0 2px",fontSize:14,fontWeight:500}}>{b.name}</p>}
                            <span style={{fontSize:10,fontFamily:"var(--font-mono)",color:"var(--color-text-info)",background:"var(--color-background-info)",padding:"2px 6px",borderRadius:4}}>{b.id}</span>
                            <span style={{marginLeft:6,fontSize:11,color:"var(--color-text-tertiary)"}}>{b.platform}</span>
                            <span style={{marginLeft:6,fontSize:11,fontWeight:600,color:b.paid?"#2e7d32":"#856404"}}>{b.paid?t("paidStatus"):t("unpaidStatus")}</span>
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <button onClick={()=>togglePaid(b.id)} title={b.paid?t("markUnpaid"):t("markPaid")} style={{fontSize:13,border:"none",background:"none",cursor:"pointer",padding:"0 2px"}}>{b.paid?"✅":"⏳"}</button>
                            <button onClick={()=>printRecap(b)} title={lang==="fr"?"Fiche récap PDF":"PDF summary"} style={{fontSize:13,border:"none",background:"none",cursor:"pointer",padding:"0 2px"}}>📄</button>
                            <button onClick={()=>setEditBooking({...b})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"0 4px"}}>✏️</button>
                            <button onClick={()=>{setBookings(prev=>prev.filter(x=>x.id!==b.id));showToast(t("toastBookingDel"));}} style={{fontSize:12,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"0 4px"}}>✕</button>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px",fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>
                          <span>📅 {fmtDate(b.checkIn,locale)}</span>
                          <span>🏠 {fmtDate(b.checkOut,locale)}</span>
                          <span>🌙 {b.nights} {b.nights>1?t("nightPlural"):t("nightSingle")}</span>
                          {b.guests && <span>👥 {b.guests} {b.guests>1?t("personPlural"):t("personSingle")}</span>}
                          {b.phone && <span>📱 {b.phone}</span>}
                        </div>
                        {editId===b.id
                          ? <span style={{display:"flex",gap:6}}><input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAmount(b.id)} style={{flex:1,padding:"5px 8px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)"}} autoFocus /><button onClick={()=>saveAmount(b.id)} style={{padding:"5px 14px",fontSize:13}}>OK</button></span>
                          : <div onClick={()=>{setEditId(b.id);setEditAmt(b.amount||"");}} style={{cursor:"pointer"}}>
                              {b.amount>0
                                ? <div>
                                    <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>
                                      {b.platform==="Airbnb"
                                        ? <><span style={{textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount)}</span>{fmtBoth(b.amount*(1-commission),rate)}</>
                                        : fmtBoth(b.amount,rate)
                                      } <span style={{fontSize:10}}>/{t("nightSingle")}</span>
                                    </p>
                                    {b.platform==="Airbnb"
                                      ? <><p style={{margin:0,fontSize:13,color:"var(--color-text-tertiary)",textDecoration:"line-through"}}>{fmtMAD(totalStay(b))}</p><p style={{margin:0,fontSize:14,fontWeight:600,color:C_RESERVED}}>{fmtBoth(netAmount(b),rate)} <span style={{fontSize:11,fontWeight:400}}>(-{Math.round(commission*100)}%)</span></p></>
                                      : <p style={{margin:0,fontSize:14,fontWeight:600,color:C_RESERVED}}>{fmtBoth(totalStay(b),rate)}</p>
                                    }
                                  </div>
                                : <span style={{fontSize:13,textDecoration:"underline dotted",color:"var(--color-text-warning)"}}>{t("enterRate")}</span>
                              }
                            </div>
                        }
                      </div>
                    ))}
                    <div style={{padding:"10px 0",fontWeight:500,fontSize:13,borderTop:"0.5px solid var(--color-border-tertiary)",color:"var(--color-text-success)"}}>
                      {t("total")} : {fmtBoth(totalRevenue,rate)}
                    </div>
                  </div>
                /* ── DESKTOP : tableau ── */
                : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                    <thead>
                      <tr style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        {[t("colArrival"),t("colDeparture"),t("colCode"),t("colName"),t("colNights"),t("colGuests"),t("colRate"),t("colTotal"),""].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...yearBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b=>(
                        <tr key={b.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                          <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(b.checkIn,locale)}</td>
                          <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(b.checkOut,locale)}</td>
                          <td style={{padding:"6px"}}><span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--color-text-info)",background:"var(--color-background-info)",padding:"2px 6px",borderRadius:4}}>{b.id}</span></td>
                          <td style={{padding:"10px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</td>
                          <td style={{padding:"10px 6px",color:"var(--color-text-secondary)"}}>{b.nights}n</td>
                          <td style={{padding:"10px 6px",color:"var(--color-text-secondary)"}}>{b.guests ? `👥 ${b.guests}` : "—"}</td>
                          <td style={{padding:"10px 6px"}}>
                            {editId===b.id
                              ? <span style={{display:"flex",gap:4}}><input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAmount(b.id)} style={{width:80,padding:"2px 6px",fontSize:12}} autoFocus /><button onClick={()=>saveAmount(b.id)} style={{fontSize:11,padding:"2px 8px"}}>OK</button></span>
                              : <span onClick={()=>{setEditId(b.id);setEditAmt(b.amount||"");}} style={{cursor:"pointer",color:"var(--color-text-secondary)"}}>
                                  {b.amount>0
                                    ? b.platform==="Airbnb"
                                      ? <span><span style={{fontSize:11,textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount)}</span><span style={{fontWeight:500}}>{fmtBoth(b.amount*(1-commission),rate)}</span><span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>/{t("nightSingle")}</span></span>
                                      : <span>{fmtBoth(b.amount,rate)}<span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>/{t("nightSingle")}</span></span>
                                    : <span style={{fontSize:12,textDecoration:"underline dotted",color:"var(--color-text-warning)"}}>{t("enterRate")}</span>
                                  }
                                </span>
                            }
                          </td>
                          <td style={{padding:"10px 6px"}}>
                            {b.amount>0
                              ? b.platform==="Airbnb"
                                ? <span><span style={{fontSize:11,color:"var(--color-text-tertiary)",textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount*b.nights)}</span><span style={{fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(netAmount(b),rate)}</span></span>
                                : <span style={{fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(b.amount*b.nights,rate)}</span>
                              : <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>—</span>
                            }
                          </td>
                          <td style={{padding:"10px 6px",textAlign:"right",whiteSpace:"nowrap"}}>
                            <button onClick={()=>togglePaid(b.id)} title={b.paid?t("markUnpaid"):t("markPaid")} style={{fontSize:11,border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>{b.paid?"✅":"⏳"}</button>
                            <button onClick={()=>printRecap(b)} title={lang==="fr"?"Fiche récap PDF":"PDF summary"} style={{fontSize:11,border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>📄</button>
                            <button onClick={()=>setEditBooking({...b})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>✏️</button>
                            <button onClick={()=>{setBookings(prev=>prev.filter(x=>x.id!==b.id));showToast(t("toastBookingDel"));}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan={7} style={{padding:"10px 6px",fontWeight:500}}>{t("totalStays")}</td><td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(totalRevenue,rate)}</td><td /></tr>
                    </tfoot>
                  </table>
            }
          </div>
        </div>
      )}

      {/* ── GRAPHIQUE ──────────────────────────────────────────────────────── */}
      {tab==="chart" && (
        <div>
          <div style={{...rc,marginBottom:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:"1rem"}}>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>{t("chartTitle")} — {year}</p>
              <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"var(--color-text-secondary)"}}><div style={{width:12,height:12,borderRadius:2,background:"#2e7d32",flexShrink:0}}/>{t("seriesRevenue")}</span>
                <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"var(--color-text-secondary)"}}><div style={{width:12,height:12,borderRadius:2,background:C_RESERVED,flexShrink:0}}/>{t("seriesExpenses")}</span>
                <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"var(--color-text-secondary)"}}><div style={{width:12,height:12,borderRadius:2,background:C_BLOCKED,flexShrink:0}}/>{t("seriesProfit")}</span>
                <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>· {lang==="fr"?"cliquez pour le détail":"click for details"}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} barGap={4} barCategoryGap="30%"
                onClick={e=>{ if(e&&e.activeTooltipIndex!=null){ const i=e.activeTooltipIndex; setSelectedMonth(selectedMonth===i?null:i); }}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
                <XAxis dataKey="name" tick={({x,y,payload})=>{
                  const i=months.indexOf(payload.value);
                  const active=selectedMonth===i;
                  return <text x={x} y={y+12} textAnchor="middle" fontSize={12} fill={active?"var(--color-text-primary)":"var(--color-text-secondary)"} fontWeight={active?700:400}>{payload.value}</text>;
                }} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:"var(--color-text-secondary)"}} axisLine={false} tickLine={false} tickFormatter={v=>v===0?"0":currency==="EUR"?`${Math.round(v/rate/1000)}k€`:`${Math.round(v/1000)}k`} />
                <Tooltip content={<TT />} cursor={{fill:"var(--color-background-secondary)",radius:4}} />
                <Bar dataKey="Revenus"  name={t("seriesRevenue")}   fill="#2e7d32" radius={[3,3,0,0]} />
                <Bar dataKey="Dépenses" name={t("seriesExpenses")}  fill={C_RESERVED} radius={[3,3,0,0]} />
                <Bar dataKey="Bénéfice" name={t("seriesProfit")}    fill={C_BLOCKED}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Panneau détail mensuel ── */}
          {selectedMonth !== null && (() => {
            const mi = selectedMonth;
            const mName = months[mi];
            const mBookings = payingBookings.filter(b => {
              // Include booking if it overlaps with the month
              const mStart = new Date(year, mi, 1);
              const mEnd   = new Date(year, mi+1, 1);
              return new Date(b.checkIn) < mEnd && new Date(b.checkOut) > mStart;
            });
            const mExpenses = yearExpenses.filter(e => new Date(e.date).getMonth() === mi);
            const mRevenue  = mBookings.reduce((s,b) => s+netAmount(b), 0);
            const mExp      = mExpenses.reduce((s,e) => s+e.amount, 0);
            const mProfit   = mRevenue - mExp;
            const mPast     = mBookings.filter(b => b.checkOut <= todayStr);
            const mFuture   = mBookings.filter(b => b.checkIn > todayStr);
            const mPastRev  = mPast.reduce((s,b)=>s+netAmount(b),0);
            const mFutRev   = mFuture.reduce((s,b)=>s+netAmount(b),0);
            return (
              <div style={{...rc,marginBottom:"1.25rem",borderLeft:"3px solid var(--color-text-primary)",animation:"fadeIn 0.2s ease"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:8}}>
                  <p style={{margin:0,fontSize:15,fontWeight:600}}>{mName} {year}</p>
                  <button onClick={()=>setSelectedMonth(null)} style={{fontSize:12,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)"}}>{t("closeBtn")}</button>
                </div>

                {/* KPIs du mois */}
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:"1.25rem"}}>
                  {[
                    {label:t("netRevenue"),  value:fmtBoth(mRevenue,rate), color:"var(--color-text-success)"},
                    {label:t("expenses"),    value:fmtBoth(mExp,rate),     color:"var(--color-text-danger)"},
                    {label:t("netProfit"),   value:fmtBoth(mProfit,rate),  color:mProfit>=0?"var(--color-text-success)":"var(--color-text-danger)"},
                  ].map(k=>(
                    <div key={k.label} style={{...mc,flex:"1 1 150px"}}>
                      <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{k.label}</p>
                      <p style={{margin:"4px 0 0",fontSize:16,fontWeight:500,color:k.color}}>{k.value.split("·")[0].trim()}</p>
                      <p style={{margin:0,fontSize:11,color:"var(--color-text-tertiary)"}}>{k.value.split("·")[1]?.trim()}</p>
                    </div>
                  ))}
                  <div style={{...mc,flex:"1 1 150px"}}>
                    <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("collected")} / {t("confirmed")}</p>
                    <p style={{margin:"4px 0 0",fontSize:14,fontWeight:500,color:C_RESERVED}}>{mPastRev>0?fmtMAD(mPastRev):"—"}</p>
                    <p style={{margin:0,fontSize:11,color:C_BLOCKED}}>{mFutRev>0?fmtMAD(mFutRev):"—"}</p>
                  </div>
                </div>

                {/* Calendrier agrandi */}
                <div style={{marginBottom:"1.25rem"}}>
                  <MonthCalendar year={year} month={mi} bookings={bookings} blocked={blocked} monthName={mName} />
                </div>

                {/* Réservations du mois */}
                {mBookings.length > 0 && (
                  <div style={{marginBottom:"1rem"}}>
                    <p style={{margin:"0 0 8px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("tabBookings")} · {mBookings.length}</p>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[...mBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b=>{
                        const isPast = b.checkOut <= todayStr;
                        const isFuture = b.checkIn > todayStr;
                        const tag = isPast ? {label:lang==="fr"?"Échu":"Past",   color:C_RESERVED}
                                  : isFuture? {label:lang==="fr"?"À venir":"Upcoming", color:C_BLOCKED}
                                  : {label:lang==="fr"?"En cours":"Ongoing", color:"#BA7517"};
                        return (
                          <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--color-background-secondary)",borderRadius:8,flexWrap:"wrap",borderLeft:`3px solid ${tag.color}`}}>
                            <span style={{fontSize:11,fontWeight:600,color:tag.color,minWidth:52}}>{tag.label}</span>
                            <span style={{fontSize:13,fontWeight:500,flex:1,minWidth:80}}>{b.name||b.id}</span>
                            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{fmtDate(b.checkIn,locale)} → {fmtDate(b.checkOut,locale)}</span>
                            <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{b.nights}n</span>
                            <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-success)",marginLeft:"auto"}}>{b.amount>0?fmtBoth(netAmount(b),rate):"—"}</span>
                            <span style={{fontSize:11}}>{b.paid?"✅":"⏳"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {mBookings.length === 0 && <p style={{fontSize:13,color:"var(--color-text-tertiary)",margin:"0 0 1rem"}}>{t("noBookings")}</p>}

                {/* Dépenses du mois */}
                {mExpenses.length > 0 && (
                  <div>
                    <p style={{margin:"0 0 8px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("tabExpenses")} · {mExpenses.length}</p>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {[...mExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>(
                        <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",background:"var(--color-background-secondary)",borderRadius:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"var(--color-background-warning)",color:"var(--color-text-warning)",fontWeight:500}}>{tCat(e.category)}</span>
                          <span style={{fontSize:12,flex:1,color:"var(--color-text-secondary)"}}>{e.description}</span>
                          <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-danger)"}}>{fmtBoth(e.amount,rate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {mExpenses.length === 0 && <p style={{fontSize:13,color:"var(--color-text-tertiary)",margin:0}}>{lang==="fr"?"Aucune dépense ce mois.":"No expenses this month."}</p>}
              </div>
            );
          })()}

          <div style={rc}>
            <p style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>{t("nightsTitle")}</p>
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
                      <span>{m}</span>
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
            <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"0.5px solid var(--color-border-tertiary)",display:"flex",gap:24,fontSize:13}}>
              <span>{t("totalPayingLabel")} : <strong style={{color:C_RESERVED}}>{totalNights} {t("nightPlural")}</strong></span>
              {persoNights>0 && <span>{t("totalPersoLabel")} : <strong style={{color:C_BLOCKED}}>{persoNights} {t("nightPlural")}</strong></span>}
            </div>
          </div>

          {/* Prévisionnel */}
          <div style={{...rc,marginTop:"1.25rem",borderLeft:"3px solid #BA7517"}}>
            <p style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>{t("forecastTitle")} {year}</p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("collected")}</p>
                <p style={{margin:"6px 0 2px",fontSize:18,fontWeight:500,color:C_RESERVED}}>{fmtBoth(pastRevenue,rate)}</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{pastBookings.length} {pastBookings.length>1?t("staysDonePlural"):t("staysDone")}</p>
              </div>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("confirmed")}</p>
                <p style={{margin:"6px 0 2px",fontSize:18,fontWeight:500,color:C_BLOCKED}}>{fmtBoth(futureRevenue,rate)}</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{futureBookings.length} {futureBookings.length>1?t("staysAheadPlural"):t("staysAhead")}</p>
              </div>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("projected")}</p>
                <p style={{margin:"6px 0 2px",fontSize:18,fontWeight:500,color:"#BA7517"}}>{fmtBoth(forecast.projectedTotal,rate)}</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{t("basedOn")} {fmtMAD(Math.round(forecast.avgMonthly))}{t("perMonth")}</p>
              </div>
              <div style={{...mc,flex:"1 1 160px"}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("fillRate")}</p>
                <p style={{margin:"6px 0 2px",fontSize:18,fontWeight:500,color:"var(--color-text-info)"}}>{occupancy}%</p>
                <p style={{margin:0,fontSize:12,color:"var(--color-text-tertiary)"}}>{totalNights} {t("nightPlural")} · {lang==="fr"?"objectif 70% =":"target 70% ="} {Math.round(365*0.7)} {t("nightPlural")}</p>
              </div>
            </div>
            <div style={{marginTop:"1rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>
                <span>{t("annualProgress")}</span>
                <span>{Math.round((totalRevenue/forecast.projectedTotal)*100)||0}% {t("ofTarget")}</span>
              </div>
              <div style={{background:"var(--color-background-secondary)",borderRadius:99,height:10,overflow:"hidden"}}>
                <div style={{display:"flex",height:"100%",borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:`${Math.round((pastRevenue/forecast.projectedTotal)*100)||0}%`,background:C_RESERVED,transition:"width 0.5s"}} />
                  <div style={{width:`${Math.round((futureRevenue/forecast.projectedTotal)*100)||0}%`,background:C_BLOCKED,opacity:0.6,transition:"width 0.5s"}} />
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

      {/* ── DÉPENSES ───────────────────────────────────────────────────────── */}
      {tab==="expenses" && (
        <div>
          {/* Récurrentes */}
          <div style={{...rc,marginBottom:"1.25rem",borderLeft:"3px solid #378ADD"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:recurring.length>0?"1rem":0,flexWrap:"wrap",gap:8}}>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>{t("expenseTitle")}</p>
              <button onClick={()=>setShowAddR(!showAddR)}>{t("addExpense")}</button>
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
                    <button key={m} onClick={()=>toggleMonth(i)} style={{padding:"4px 10px",fontSize:12,borderRadius:99,border:"0.5px solid var(--color-border-secondary)",background:rForm.months.includes(i)?"#378ADD":"var(--color-background-secondary)",color:rForm.months.includes(i)?"#fff":"var(--color-text-secondary)",cursor:"pointer"}}>{m}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addRecurring}>{t("save")}</button>
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
                        <span key={m} style={{fontSize:11,padding:"2px 6px",borderRadius:99,background:rec.months.includes(i)?"#378ADD22":"transparent",color:rec.months.includes(i)?"#378ADD":"var(--color-text-tertiary)",fontWeight:rec.months.includes(i)?600:400}}>{m}</span>
                      ))}
                    </div>
                    <button onClick={()=>generateRecurring(rec)} style={{fontSize:12,padding:"4px 12px",background:"#378ADD",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>{t("generateYear")} {year} ↗</button>
                    <button onClick={()=>{setRecurring(prev=>prev.filter(r=>r.id!==rec.id));showToast(t("toastRecurringDel"));}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
            <p style={{margin:0,fontSize:14,color:"var(--color-text-secondary)"}}>{yearExpenses.length} {t("expensesCount")} · {fmtBoth(totalExp,rate)}</p>
            <button onClick={()=>setShowAddE(!showAddE)}>{t("addExpense")}</button>
          </div>

          {showAddE && (
            <div style={{...rc,marginBottom:"1.25rem",background:"var(--color-background-secondary)",border:"none"}}>
              <p style={{margin:"0 0 12px",fontSize:14,fontWeight:500}}>{t("newExpenseTitle")}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmDate")}</label><input type="date" style={inp} value={eForm.date} onChange={e=>setEForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmCategory")}</label><select style={inp} value={eForm.category} onChange={e=>setEForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{tCat(c)}</option>)}</select></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmDesc")}</label><input type="text" placeholder={t("frmDescExp")} style={inp} value={eForm.description} onChange={e=>setEForm(f=>({...f,description:e.target.value}))} /></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" placeholder={t("frmPlaceholderAmountExp")} style={inp} value={eForm.amount} onChange={e=>setEForm(f=>({...f,amount:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addExpense}>{t("save")}</button>
                <button onClick={()=>setShowAddE(false)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
              </div>
            </div>
          )}

          {yearExpenses.length===0
            ? <div style={{...rc,textAlign:"center",padding:"2.5rem"}}><p style={{color:"var(--color-text-tertiary)",fontSize:14,margin:0}}>{t("noExpYear")} {year}.</p></div>
            : <div style={rc}>
                {/* Modal édition dépense */}
                {editExpense && (
                  <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
                    <div style={{background:"var(--color-background-primary)",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
                      <p style={{margin:"0 0 16px",fontSize:15,fontWeight:500}}>{t("editExpenseModalTitle")}</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                        <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmDate")}</label><input type="date" style={inp} value={editExpense.date} onChange={e=>setEditExpense(x=>({...x,date:e.target.value}))} /></div>
                        <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmCategory")}</label><select style={inp} value={editExpense.category} onChange={e=>setEditExpense(x=>({...x,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{tCat(c)}</option>)}</select></div>
                        <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmDesc")}</label><input type="text" style={inp} value={editExpense.description} onChange={e=>setEditExpense(x=>({...x,description:e.target.value}))} /></div>
                        <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t("frmAmount")}</label><input type="number" style={inp} value={editExpense.amount} onChange={e=>setEditExpense(x=>({...x,amount:e.target.value}))} /></div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <button onClick={saveEditExpense} style={{flex:1}}>{t("save")}</button>
                        <button onClick={()=>setEditExpense(null)} style={{color:"var(--color-text-secondary)"}}>{t("cancel")}</button>
                      </div>
                    </div>
                  </div>
                )}
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                  <thead><tr style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    {[t("colDate"),t("colCategory"),t("colDesc"),t("colAmount"),""].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[...yearExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>(
                      <tr key={e.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
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
                  <tfoot><tr><td colSpan={3} style={{padding:"10px 6px",fontWeight:500}}>{t("total")}</td><td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-danger)"}}>{fmtBoth(totalExp,rate)}</td><td /></tr></tfoot>
                </table>
                {expByCat.length>0 && (
                  <div style={{marginTop:"1.25rem",paddingTop:"1.25rem",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                    <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>{t("byCategory")}</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {expByCat.map(([cat,amt])=>{const pct=totalExp?Math.round((amt/totalExp)*100):0;return <div key={cat}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{tCat(cat)}</span><span style={{color:"var(--color-text-secondary)"}}>{fmtBoth(amt,rate)} · {pct}%</span></div><div style={{background:"var(--color-background-secondary)",borderRadius:99,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:"#BA7517",borderRadius:99}} /></div></div>;})}
                    </div>
                  </div>
                )}
              </div>
          }
        </div>
      )}
    </div>
    </>
  );
}
