import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

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
    // Essai extraction du nom depuis SUMMARY (ex: "John D (Airbnb)") ou DESCRIPTION
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

const EXPENSE_CATS = ["Ménage","Frais Airbnb","Maintenance","Fournitures","Taxes/CFE","Internet","Eau/Électricité","Assurance","Autre"];
const PLATFORMS    = ["Direct","Airbnb","Booking.com","Gens de confiance","Perso","Autre"];
const MONTHS       = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const STORAGE_KEY  = "riad_dashboard_v1";
const DEFAULT_RATE = 10.83;

// Couleurs calendrier
const C_RESERVED = "#c0392b";   // rouge  — réservé (Airbnb ou direct)
const C_BLOCKED  = "#2980b9";   // bleu   — bloqué perso (vacances)
const C_AVAIL    = "#e8f5e9";   // vert clair — disponible
const C_TODAY_BG = "#fff3cd";   // ambre  — aujourd'hui
const C_TODAY_FG = "#856404";

const fmtMAD  = (n) => new Intl.NumberFormat("fr-MA",{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n)) + " MAD";
const fmtEUR  = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n));
const fmt     = (n, rate, cur) => cur === "EUR" ? fmtEUR(n / rate) : fmtMAD(n);
const fmtBoth = (n, rate)       => fmtMAD(n) + "  ·  " + fmtEUR(n / rate);
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
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

function MonthCalendar({ year, month, bookings, blocked }) {
  const offset  = (new Date(year,month,1).getDay()+6)%7;
  const days    = new Date(year,month+1,0).getDate();
  const inRange = (d, s, e) => { const pad=(n)=>String(n).padStart(2,"0"); const ds=`${year}-${pad(month+1)}-${pad(d)}`; return ds>=s && ds<e; };
  const cells   = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  return (
    <div style={{flex:"1 1 210px",minWidth:190}}>
      <p style={{margin:"0 0 8px",fontWeight:500,fontSize:13,textAlign:"center"}}>{MONTHS[month]} {year}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:"var(--color-text-tertiary)",padding:"2px 0"}}>{d}</div>)}
        {cells.map((d,i)=>{
          const isReserved = d && bookings.some(b=>inRange(d,b.checkIn,b.checkOut) && b.platform!=="Perso");
          const isPerso    = d && bookings.some(b=>inRange(d,b.checkIn,b.checkOut) && b.platform==="Perso");
          const isBlocked  = d && blocked.some(b=>inRange(d,b.start,b.end));
          const isToday    = d && (() => { const t=new Date(); return t.getFullYear()===year&&t.getMonth()===month&&t.getDate()===d; })();
          let bg, color, fw=400;
          if      (isReserved) { bg=C_RESERVED; color="#fff"; fw=500; }
          else if (isPerso)    { bg=C_BLOCKED;  color="#fff"; fw=500; }
          else if (isBlocked)  { bg=C_BLOCKED;  color="#fff"; fw=500; }
          else if (isToday)    { bg=C_TODAY_BG; color=C_TODAY_FG; fw=600; }
          else if (d)          { bg=C_AVAIL;    color="#2e7d32"; }
          else                 { bg="transparent"; color="var(--color-text-primary)"; }
          return <div key={i} style={{textAlign:"center",fontSize:12,padding:"5px 2px",background:bg,color,borderRadius:"var(--border-radius-md)",fontWeight:fw}}>{d||""}</div>;
        })}
      </div>
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
  const [showAddBl, setShowAddBl] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [editAmt,   setEditAmt]   = useState("");
  const [editBooking, setEditBooking] = useState(null); // full booking edit
  const [nextId,    setNextId]    = useState(300);
  const [bForm, setBForm]   = useState({checkIn:"",checkOut:"",name:"",phone:"",platform:"Direct",amount:""});
  const [eForm, setEForm]   = useState({date:today(),category:"Ménage",description:"",amount:""});
  const [blForm, setBlForm] = useState({start:"",end:"",label:"Vacances perso"});
  const [currency,  setCurrency]  = useState("MAD");
  const [rate,      setRate]      = useState(DEFAULT_RATE);
  const [showRate,  setShowRate]  = useState(false);
  const [commission, setCommission] = useState(0.20); // 20% conciergerie Airbnb
  const [recurring, setRecurring] = useState([]);
  const [showAddR,  setShowAddR]  = useState(false);
  const [rForm,     setRForm]     = useState({category:"Ménage",description:"",amount:"",months:[]});

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
    }
  }, []);

  useEffect(() => {
    saveStorage({ bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring });
  }, [bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring]);

  // ── Cloud sync (Firestore) ───────────────────────────────────────────────────
  const [cloudStatus, setCloudStatus] = useState("");
  const saveTimer = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bookings)  setBookings(data.bookings);
        if (data.blocked)   setBlocked(data.blocked);
        if (data.expenses)  setExpenses(data.expenses);
        if (data.recurring) setRecurring(data.recurring);
        if (data.rate)      setRate(data.rate);
        if (data.currency)  setCurrency(data.currency);
        if (data.commission !== undefined) setCommission(data.commission);
        setCloudStatus("saved");
      }
    }, () => setCloudStatus("error"));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setCloudStatus("saving");
    saveTimer.current = setTimeout(() => {
      saveCloud({ bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring })
        .then(() => setCloudStatus("saved"))
        .catch(() => setCloudStatus("error"));
    }, 1500);
  }, [bookings, blocked, expenses, year, nextId, currency, rate, commission, recurring]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 3500); };

  // ── Import iCal — préserve les réservations manuelles ────────────────────────
  const handleIcs = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { bookings: newB, blocked: newBl } = parseIcs(e.target.result);
        if (!newB.length && !newBl.length) { showToast("❌ Aucun événement trouvé dans ce fichier."); return; }
        setBookings(prev => {
          const manuals = prev.filter(b => b.id.startsWith("MAN-"));
          const existing = Object.fromEntries(prev.map(b=>[b.id,{amount:b.amount,name:b.name||""}]));
          const airbnb   = newB.map(b=>({...b, amount:existing[b.id]?.amount??0, name:existing[b.id]?.name??""}));
          return [...airbnb, ...manuals];
        });
        // Conserver les blocages personnels
        // Ignorer les blocages Airbnb qui chevauchent une réservation manuelle
        setBlocked(prev => {
          const personal = prev.filter(b => b.type === "personal");
          const manualBookings = bookings.filter(b => b.id.startsWith("MAN-"));
          const filteredAirbnb = newBl.filter(bl =>
            !manualBookings.some(mb => mb.checkIn < bl.end && mb.checkOut > bl.start)
          );
          return [...filteredAirbnb, ...personal];
        });
        if (newB.length) {
          const years = newB.map(b=>new Date(b.checkIn).getFullYear());
          setYear(years.sort((a,b)=>years.filter(v=>v===b).length-years.filter(v=>v===a).length)[0]);
        }
        showToast(`✅ ${newB.length} réservation${newB.length>1?"s":""} Airbnb importée${newB.length>1?"s":""}`);
      } catch { showToast("❌ Erreur de lecture du fichier .ics"); }
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
        if (!keys.length) { showToast("❌ Aucun montant trouvé — vérifiez que c'est bien l'export Finances Airbnb."); return; }
        let matched = 0;
        setBookings(prev => prev.map(b => {
          if (amounts[b.id]) { matched++; return {...b, amount: amounts[b.id]}; }
          return b;
        }));
        showToast(`✅ ${matched} montant${matched>1?"s":""} mis à jour sur ${keys.length} ligne${keys.length>1?"s":""} CSV`);
      } catch { showToast("❌ Erreur de lecture du fichier CSV"); }
    };
    reader.readAsText(file, "utf-8");
  };

  // ── Export Excel ──────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const bRows = [["Code","Nom","Arrivée","Départ","Nuits","Plateforme","Tél.","Montant (MAD)","Montant (€)"]];
    [...yearBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).forEach(b =>
      bRows.push([b.id, b.name||"", b.checkIn, b.checkOut, b.nights, b.platform, b.phone, b.amount, +(b.amount/rate).toFixed(2)])
    );
    bRows.push([]); bRows.push(["TOTAL","","","",totalNights+" nuits","","",totalRevenue,+(totalRevenue/rate).toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bRows), "Réservations");

    const eRows = [["Date","Catégorie","Description","Montant (MAD)","Montant (€)"]];
    [...yearExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(e =>
      eRows.push([e.date, e.category, e.description, e.amount, +(e.amount/rate).toFixed(2)])
    );
    eRows.push([]); eRows.push(["TOTAL","","",totalExp,+(totalExp/rate).toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eRows), "Dépenses");

    const mRows = [["Mois","Revenus (MAD)","Dépenses (MAD)","Bénéfice (MAD)","Revenus (€)","Dépenses (€)","Bénéfice (€)"]];
    monthlyData.forEach(d => mRows.push([d.name, d.Revenus, d.Dépenses, d.Bénéfice, Math.round(d.Revenus/rate), Math.round(d.Dépenses/rate), Math.round(d.Bénéfice/rate)]));
    mRows.push([]); mRows.push(["TOTAL", totalRevenue, totalExp, netProfit, Math.round(totalRevenue/rate), Math.round(totalExp/rate), Math.round(netProfit/rate)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mRows), "Bilan mensuel");

    XLSX.writeFile(wb, `Riad_${year}.xlsx`);
    showToast("✅ Export Excel téléchargé");
  };

  // ── Export / Import JSON ──────────────────────────────────────────────────────
  const exportJSON = () => {
    const data = { bookings, blocked, expenses, rate, currency, recurring, exportedAt: new Date().toISOString(), version: 1 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `riad_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast("✅ Sauvegarde JSON téléchargée");
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version) throw new Error("Format invalide");
        if (data.bookings)  setBookings(data.bookings);
        if (data.blocked)   setBlocked(data.blocked);
        if (data.expenses)  setExpenses(data.expenses);
        if (data.recurring) setRecurring(data.recurring);
        if (data.rate)      setRate(data.rate);
        if (data.currency)  setCurrency(data.currency);
        showToast(`✅ Sauvegarde restaurée · ${data.bookings?.length||0} réservations · ${data.expenses?.length||0} dépenses`);
      } catch { showToast("❌ Fichier JSON invalide"); }
    };
    reader.readAsText(file);
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const yearBookings = useMemo(()=>bookings.filter(b=>new Date(b.checkIn).getFullYear()===year),[bookings,year]);
  const yearExpenses = useMemo(()=>expenses.filter(e=>new Date(e.date).getFullYear()===year),[expenses,year]);
  const netAmount   = (b) => b.platform==="Airbnb" ? b.amount*(1-commission) : b.amount;
  const totalRevenue = useMemo(()=>yearBookings.reduce((s,b)=>s+netAmount(b),0),[yearBookings,commission]);
  const totalGross   = useMemo(()=>yearBookings.reduce((s,b)=>s+b.amount,0),[yearBookings]);
  const totalExp     = useMemo(()=>yearExpenses.reduce((s,e)=>s+e.amount,0),[yearExpenses]);
  const netProfit    = totalRevenue - totalExp;
  const totalNights  = useMemo(()=>yearBookings.reduce((s,b)=>s+b.nights,0),[yearBookings]);
  const occupancy    = Math.round((totalNights/365)*100);
  const avgNight     = totalNights ? Math.round(totalRevenue/totalNights) : 0;
  const pendingCount = yearBookings.filter(b=>b.amount===0).length;

  const monthlyData = useMemo(()=>MONTHS.map((m,i)=>({
    name:m,
    Revenus:  yearBookings.filter(b=>new Date(b.checkIn).getMonth()===i).reduce((s,b)=>s+b.amount,0),
    Dépenses: yearExpenses.filter(e=>new Date(e.date).getMonth()===i).reduce((s,e)=>s+e.amount,0),
  })).map(d=>({...d,Bénéfice:d.Revenus-d.Dépenses})),[yearBookings,yearExpenses]);

  const expByCat = useMemo(()=>{
    const map={};
    yearExpenses.forEach(e=>{map[e.category]=(map[e.category]||0)+e.amount;});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[yearExpenses]);

  const calMonths = useMemo(()=>{
    const t=new Date(); const r=[];
    for(let i=0;i<4;i++){const d=new Date(t.getFullYear(),t.getMonth()+i,1);r.push({year:d.getFullYear(),month:d.getMonth()});}
    return r;
  },[]);

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const saveAmount = (id) => {
    setBookings(prev=>prev.map(b=>b.id===id?{...b,amount:parseFloat(editAmt)||0}:b));
    setEditId(null); setEditAmt(""); showToast("✅ Montant enregistré");
  };
  const saveEditBooking = () => {
    if (!editBooking) return;
    const nights = Math.round((new Date(editBooking.checkOut)-new Date(editBooking.checkIn))/86400000);
    setBookings(prev=>prev.map(b=>b.id===editBooking.id?{...editBooking,nights}:b));
    setEditBooking(null);
    showToast("✅ Réservation mise à jour");
  };
  const addBooking = () => {
    if (!bForm.checkIn||!bForm.checkOut) return;
    const nights=Math.round((new Date(bForm.checkOut)-new Date(bForm.checkIn))/86400000);
    setBookings(prev=>[...prev,{...bForm,id:"MAN-"+nextId,nights,amount:parseFloat(bForm.amount)||0}]);
    setNextId(n=>n+1); setBForm({checkIn:"",checkOut:"",name:"",phone:"",platform:"Direct",amount:""}); setShowAddB(false);
    showToast("✅ Réservation ajoutée");
  };
  const addExpense = () => {
    if (!eForm.date||!eForm.description||!eForm.amount) return;
    setExpenses(prev=>[...prev,{...eForm,id:nextId,amount:parseFloat(eForm.amount)}]);
    setNextId(n=>n+1); setEForm({date:today(),category:"Ménage",description:"",amount:""}); setShowAddE(false);
    showToast("✅ Dépense ajoutée");
  };
  const addBlocked = () => {
    if (!blForm.start||!blForm.end) return;
    setBlocked(prev=>[...prev,{...blForm,type:"personal"}]);
    setBlForm({start:"",end:"",label:"Vacances perso"}); setShowAddBl(false);
    showToast("✅ Période bloquée ajoutée");
  };
  const addRecurring = () => {
    if (!rForm.description||!rForm.amount) return;
    setRecurring(prev=>[...prev,{...rForm,id:"REC-"+nextId,amount:parseFloat(rForm.amount)}]);
    setNextId(n=>n+1); setRForm({category:"Ménage",description:"",amount:"",months:[]}); setShowAddR(false);
    showToast("✅ Dépense récurrente ajoutée");
  };
  const generateRecurring = (rec) => {
    const newExp = rec.months.map(m => {
      const date = `${year}-${String(m+1).padStart(2,"0")}-01`;
      return { id: nextId+m, category:rec.category, description:rec.description+" 🔄", amount:rec.amount, date, recurringId:rec.id };
    });
    const toAdd = newExp.filter(ne => !expenses.some(e=>e.recurringId===rec.id && new Date(e.date).getMonth()===new Date(ne.date).getMonth() && new Date(e.date).getFullYear()===year));
    setExpenses(prev=>[...prev,...toAdd]);
    setNextId(n=>n+toAdd.length);
    if (toAdd.length===0) showToast("⚠️ Ces mois sont déjà générés");
    else showToast("✅ " + toAdd.length + " dépense" + (toAdd.length>1?"s":"") + " générée" + (toAdd.length>1?"s":"") + " pour " + year);
  };
  const toggleMonth = (m) => setRForm(f=>({...f,months:f.months.includes(m)?f.months.filter(x=>x!==m):[...f.months,m].sort((a,b)=>a-b)}));

  // ── Styles ────────────────────────────────────────────────────────────────────
  const rc  = {background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem"};
  const mc  = {background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"1rem",flex:"1 1 130px",minWidth:0};
  const inp = {width:"100%",boxSizing:"border-box",marginTop:4,marginBottom:12};
  const tabBtn=(id,lbl)=>(
    <button onClick={()=>setTab(id)} style={{border:"none",background:"none",padding:"8px 14px",cursor:"pointer",fontSize:14,fontWeight:tab===id?500:400,color:tab===id?"var(--color-text-primary)":"var(--color-text-secondary)",borderBottom:tab===id?"2px solid var(--color-text-primary)":"2px solid transparent",marginBottom:-1,whiteSpace:"nowrap"}}>{lbl}</button>
  );
  const TT=({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return <div style={{...rc,padding:"10px 14px",fontSize:13,minWidth:150}}><p style={{margin:"0 0 6px",fontWeight:500}}>{label}</p>{payload.map(p=><p key={p.name} style={{margin:"2px 0",color:p.color}}>{p.name} : {fmt(p.value,rate,currency)}</p>)}</div>;
  };

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:940,margin:"0 auto",padding:"1.5rem 1rem",position:"relative"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"10px 20px",fontSize:13,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:9999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:500}}>Kasbah Blanca Marrakech</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"var(--color-text-secondary)"}}>
            Tableau de bord locatif · {cloudStatus==="saving" ? "⏳ Sauvegarde..." : cloudStatus==="saved" ? "☁️ Synchronisé" : cloudStatus==="error" ? "⚠️ Hors ligne" : ""}
          </p>
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
          <button onClick={()=>setShowRate(r=>!r)} style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6}}>1€ = {rate} MAD · Airbnb -{Math.round(commission*100)}%</button>
          <button onClick={exportJSON} style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6}}>💾 Backup</button>
          <label style={{padding:"4px 10px",fontSize:13,background:"none",border:"0.5px solid var(--color-border-secondary)",borderRadius:6,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>
            📂 Restore
            <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){importJSON(e.target.files[0]);e.target.value="";}}} />
          </label>
        </div>
      </div>
      {showRate && (
        <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 14px",marginBottom:"1rem",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:13}}>
          <span style={{color:"var(--color-text-secondary)"}}>Taux de change :</span>
          <span style={{fontWeight:500}}>1 EUR =</span>
          <input type="number" value={rate} onChange={e=>setRate(parseFloat(e.target.value)||DEFAULT_RATE)} step="0.01" min="1" style={{width:90,padding:"4px 8px",fontSize:13}} />
          <span style={{fontWeight:500}}>MAD</span>
          <span style={{color:"var(--color-text-tertiary)"}}>· Xe.com · 12 mars 2026</span>
          <span style={{marginLeft:16,color:"var(--color-text-secondary)",fontWeight:500}}>|</span>
          <span style={{color:"var(--color-text-secondary)"}}>Commission conciergerie Airbnb :</span>
          <input type="number" value={Math.round(commission*100)} onChange={e=>setCommission((parseFloat(e.target.value)||0)/100)} step="1" min="0" max="100" style={{width:60,padding:"4px 8px",fontSize:13}} />
          <span style={{fontWeight:500}}>%</span>
        </div>
      )}

      {/* Import zones */}
      <div style={{display:"flex",gap:12,marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <DropZone label="📅 Calendrier Airbnb (.ics)" sub="Glissez-déposez ou cliquez · réservations & blocages" accept=".ics" onFile={handleIcs} color={C_RESERVED} />
        <DropZone label="💶 Historique finances (.csv)" sub="Export Airbnb → Finances → Transactions · montants auto" accept=".csv" onFile={handleCsv} color="var(--color-text-info)" />
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:"1.5rem"}}>
        {[
          {label:"Revenus nets",   value:fmtBoth(totalRevenue,rate), sub:`Brut : ${fmtMAD(totalGross)} · Airbnb -${Math.round(commission*100)}%`, color:"var(--color-text-success)"},
          {label:"Dépenses",       value:fmtBoth(totalExp,rate),     sub:yearExpenses.length+" entrées",      color:"var(--color-text-danger)"},
          {label:"Bénéfice net",   value:fmtBoth(netProfit,rate),    sub:"Marge "+(totalRevenue?Math.round((netProfit/totalRevenue)*100):0)+"%", color:netProfit>=0?"var(--color-text-success)":"var(--color-text-danger)"},
          {label:"Occupation",     value:occupancy+"%",               sub:totalNights+" nuits / 365",           color:"var(--color-text-info)"},
          {label:"Moy. / nuit",    value:avgNight?fmtBoth(avgNight,rate):"—", sub:"sur montants saisis",      color:"var(--color-text-secondary)"},
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

      {/* Tabs */}
      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.5rem",overflowX:"auto"}}>
        {tabBtn("calendar","Calendrier")}
        {tabBtn("bookings",`Réservations${pendingCount>0?` (${pendingCount} ⚠)`:""}`)}
        {tabBtn("chart","Graphique")}
        {tabBtn("expenses","Dépenses")}
      </div>

      {/* ── CALENDRIER ─────────────────────────────────────────────────────── */}
      {tab==="calendar" && (
        <div>
          {/* Légende */}
          <div style={{display:"flex",gap:16,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
            {[
              {bg:C_AVAIL,    fg:"#2e7d32", label:"Disponible"},
              {bg:C_RESERVED, fg:"#fff",    label:"Réservé (client)"},
              {bg:C_BLOCKED,  fg:"#fff",    label:"Bloqué (perso)"},
              {bg:C_TODAY_BG, fg:C_TODAY_FG,label:"Aujourd'hui"},
            ].map(l=>(
              <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--color-text-secondary)"}}>
                <div style={{width:20,height:20,borderRadius:4,background:l.bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:l.fg}}>14</span>
                </div>
                {l.label}
              </div>
            ))}
          </div>

          {/* Grilles mensuelles */}
          <div style={{...rc,marginBottom:"1.25rem"}}>
            <p style={{margin:"0 0 1.25rem",fontSize:14,fontWeight:500}}>4 prochains mois</p>
            {bookings.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,textAlign:"center",padding:"1.5rem 0"}}>Importez votre fichier .ics pour afficher le calendrier.</p>
              : <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>{calMonths.map(({year:y,month:m})=><MonthCalendar key={`${y}-${m}`} year={y} month={m} bookings={bookings} blocked={blocked} />)}</div>
            }
          </div>

          {/* Périodes bloquées perso */}
          <div style={rc}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>🔵 Périodes bloquées (vacances perso)</p>
              <button onClick={()=>setShowAddBl(!showAddBl)}>+ Bloquer dates ↗</button>
            </div>
            {showAddBl && (
              <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"1rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500}}>Nouvelle période bloquée</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Du</label><input type="date" style={inp} value={blForm.start} onChange={e=>setBlForm(f=>({...f,start:e.target.value}))} /></div>
                  <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Au</label><input type="date" style={inp} value={blForm.end} onChange={e=>setBlForm(f=>({...f,end:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Motif</label><input type="text" placeholder="Vacances perso" style={inp} value={blForm.label} onChange={e=>setBlForm(f=>({...f,label:e.target.value}))} /></div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addBlocked}>Enregistrer</button>
                  <button onClick={()=>setShowAddBl(false)} style={{color:"var(--color-text-secondary)"}}>Annuler</button>
                </div>
              </div>
            )}
            {blocked.filter(b=>b.type==="personal").length===0 && !showAddBl
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,margin:0}}>Aucune période personnelle bloquée.</p>
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
                      showToast("✅ Converti en réservation — saisissez le montant");
                    };
                    return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#2980b922",borderRadius:"var(--border-radius-md)",flexWrap:"wrap",gap:8}}>
                      <span style={{fontSize:13,color:C_BLOCKED,fontWeight:500}}>{b.label||"Bloqué"}</span>
                      <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{fmtDate(b.start)} → {fmtDate(b.end)}</span>
                      <span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>{n} jour{n>1?"s":""}</span>
                      <button onClick={convertToBooking} style={{fontSize:12,padding:"4px 12px",background:C_RESERVED,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>→ Réservation</button>
                      <button onClick={()=>{setBlocked(prev=>prev.filter(x=>x!==b));showToast("Période supprimée");}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer"}}>✕</button>
                    </div>;
                  })}
                </div>
            }
            {/* Indispo Airbnb */}
            {blocked.filter(b=>b.type==="airbnb"||!b.type).length>0 && (
              <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-tertiary)"}}>Indisponibilités Airbnb — cliquez "→ Réservation" si c'est une résa directe</p>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {blocked.filter(b=>b.type==="airbnb"||!b.type).map((b,i)=>{
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
                      showToast("✅ Converti en réservation — saisissez le nom et le montant");
                    };
                    return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"var(--color-text-secondary)",padding:"8px 10px",background:"var(--color-background-secondary)",borderRadius:6,flexWrap:"wrap",gap:6}}>
                      <span>{fmtDate(b.start)} → {fmtDate(b.end)}</span>
                      <span style={{color:"var(--color-text-tertiary)"}}>{n} jour{n>1?"s":""}</span>
                      <button onClick={convertToBooking} style={{fontSize:11,padding:"3px 10px",background:C_RESERVED,color:"#fff",border:"none",borderRadius:5,cursor:"pointer"}}>→ Réservation</button>
                    </div>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RÉSERVATIONS ───────────────────────────────────────────────────── */}
      {tab==="bookings" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
            <p style={{margin:0,fontSize:14,color:"var(--color-text-secondary)"}}>
              {yearBookings.length} réservations · {fmtBoth(totalRevenue,rate)}
              {pendingCount>0 && <span style={{marginLeft:8,fontSize:12,color:"var(--color-text-warning)"}}>({pendingCount} sans montant)</span>}
            </p>
            <button onClick={()=>setShowAddB(!showAddB)}>+ Ajouter ↗</button>
          </div>

          {showAddB && (
            <div style={{...rc,marginBottom:"1.25rem",background:"var(--color-background-secondary)",border:"none"}}>
              <p style={{margin:"0 0 12px",fontSize:14,fontWeight:500}}>Réservation directe (hors Airbnb)</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Arrivée</label><input type="date" style={inp} value={bForm.checkIn} onChange={e=>setBForm(f=>({...f,checkIn:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Départ</label><input type="date" style={inp} value={bForm.checkOut} onChange={e=>setBForm(f=>({...f,checkOut:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Nom du client</label><input type="text" placeholder="Jean Dupont" style={inp} value={bForm.name} onChange={e=>setBForm(f=>({...f,name:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Tél. (4 derniers)</label><input type="text" placeholder="…1234" style={inp} value={bForm.phone} onChange={e=>setBForm(f=>({...f,phone:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Plateforme</label><select style={inp} value={bForm.platform} onChange={e=>setBForm(f=>({...f,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Montant (MAD)</label><input type="number" placeholder="1500" style={inp} value={bForm.amount} onChange={e=>setBForm(f=>({...f,amount:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addBooking}>Enregistrer</button>
                <button onClick={()=>setShowAddB(false)} style={{color:"var(--color-text-secondary)"}}>Annuler</button>
              </div>
            </div>
          )}

          {/* Modal édition réservation */}
          {editBooking && (
            <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
              <div style={{background:"var(--color-background-primary)",borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
                <p style={{margin:"0 0 16px",fontSize:15,fontWeight:500}}>✏️ Modifier la réservation</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Arrivée</label><input type="date" style={inp} value={editBooking.checkIn} onChange={e=>setEditBooking(b=>({...b,checkIn:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Départ</label><input type="date" style={inp} value={editBooking.checkOut} onChange={e=>setEditBooking(b=>({...b,checkOut:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Nom du client</label><input type="text" style={inp} value={editBooking.name||""} onChange={e=>setEditBooking(b=>({...b,name:e.target.value}))} /></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Plateforme</label><select style={inp} value={editBooking.platform} onChange={e=>setEditBooking(b=>({...b,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Montant (MAD)</label><input type="number" style={inp} value={editBooking.amount||""} onChange={e=>setEditBooking(b=>({...b,amount:parseFloat(e.target.value)||0}))} /></div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={saveEditBooking} style={{flex:1}}>Enregistrer</button>
                  <button onClick={()=>setEditBooking(null)} style={{color:"var(--color-text-secondary)"}}>Annuler</button>
                </div>
              </div>
            </div>
          )}

          <div style={rc}>
            {yearBookings.length===0
              ? <p style={{color:"var(--color-text-tertiary)",fontSize:13,textAlign:"center",padding:"1.5rem 0"}}>Aucune réservation pour {year}.</p>
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
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>setEditBooking({...b})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"0 4px"}}>✏️</button>
                            <button onClick={()=>{setBookings(prev=>prev.filter(x=>x.id!==b.id));showToast("Réservation supprimée");}} style={{fontSize:12,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"0 4px"}}>✕</button>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px",fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>
                          <span>📅 {fmtDate(b.checkIn)}</span>
                          <span>🏠 {fmtDate(b.checkOut)}</span>
                          <span>🌙 {b.nights} nuit{b.nights>1?"s":""}</span>
                          {b.phone && <span>📱 {b.phone}</span>}
                        </div>
                        {editId===b.id
                          ? <span style={{display:"flex",gap:6}}><input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAmount(b.id)} style={{flex:1,padding:"5px 8px",fontSize:13,borderRadius:6,border:"1px solid var(--color-border-secondary)"}} autoFocus /><button onClick={()=>saveAmount(b.id)} style={{padding:"5px 14px",fontSize:13}}>OK</button></span>
                          : <div onClick={()=>{setEditId(b.id);setEditAmt(b.amount||"");}} style={{cursor:"pointer"}}>
                              {b.amount>0
                                ? <div>
                                    {b.platform==="Airbnb"
                                      ? <><p style={{margin:0,fontSize:13,color:"var(--color-text-tertiary)",textDecoration:"line-through"}}>{fmtMAD(b.amount)}</p><p style={{margin:0,fontSize:14,fontWeight:600,color:C_RESERVED}}>{fmtBoth(netAmount(b),rate)} <span style={{fontSize:11,fontWeight:400}}>(-{Math.round(commission*100)}%)</span></p></>
                                      : <p style={{margin:0,fontSize:14,fontWeight:600,color:C_RESERVED}}>{fmtBoth(b.amount,rate)}</p>
                                    }
                                  </div>
                                : <span style={{fontSize:13,textDecoration:"underline dotted",color:"var(--color-text-warning)"}}>Saisir montant ↗</span>
                              }
                            </div>
                        }
                      </div>
                    ))}
                    <div style={{padding:"10px 0",fontWeight:500,fontSize:13,borderTop:"0.5px solid var(--color-border-tertiary)",color:"var(--color-text-success)"}}>
                      Total : {fmtBoth(totalRevenue,rate)}
                    </div>
                  </div>
                /* ── DESKTOP : tableau ── */
                : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                    <thead>
                      <tr style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        {["Arrivée","Départ","Code","Nom","Nuits","Montant",""].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...yearBookings].sort((a,b)=>new Date(a.checkIn)-new Date(b.checkIn)).map(b=>(
                        <tr key={b.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                          <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(b.checkIn)}</td>
                          <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(b.checkOut)}</td>
                          <td style={{padding:"6px"}}><span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--color-text-info)",background:"var(--color-background-info)",padding:"2px 6px",borderRadius:4}}>{b.id}</span></td>
                          <td style={{padding:"10px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name||<span style={{color:"var(--color-text-tertiary)"}}>—</span>}</td>
                          <td style={{padding:"10px 6px",color:"var(--color-text-secondary)"}}>{b.nights}n</td>
                          <td style={{padding:"10px 6px"}}>
                            {editId===b.id
                              ? <span style={{display:"flex",gap:4}}><input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveAmount(b.id)} style={{width:80,padding:"2px 6px",fontSize:12}} autoFocus /><button onClick={()=>saveAmount(b.id)} style={{fontSize:11,padding:"2px 8px"}}>OK</button></span>
                              : <span onClick={()=>{setEditId(b.id);setEditAmt(b.amount||"");}} style={{cursor:"pointer"}}>
                                  {b.amount>0
                                    ? b.platform==="Airbnb"
                                      ? <span><span style={{fontSize:11,color:"var(--color-text-tertiary)",textDecoration:"line-through",marginRight:4}}>{fmtMAD(b.amount)}</span><span style={{fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(netAmount(b),rate)}</span></span>
                                      : <span style={{fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(b.amount,rate)}</span>
                                    : <span style={{fontSize:12,textDecoration:"underline dotted",color:"var(--color-text-warning)"}}>saisir ↗</span>
                                  }
                                </span>
                            }
                          </td>
                          <td style={{padding:"10px 6px",textAlign:"right"}}><button onClick={()=>setEditBooking({...b})} style={{fontSize:11,color:"var(--color-text-info)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✏️</button><button onClick={()=>{setBookings(prev=>prev.filter(x=>x.id!==b.id));showToast("Réservation supprimée");}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan={5} style={{padding:"10px 6px",fontWeight:500}}>Total</td><td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-success)"}}>{fmtBoth(totalRevenue,rate)}</td><td /></tr>
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
            <p style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>Revenus et dépenses — {year}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize:12,fill:"var(--color-text-secondary)"}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:"var(--color-text-secondary)"}} axisLine={false} tickLine={false} tickFormatter={v=>v===0?"0":currency==="EUR"?`${Math.round(v/rate/1000)}k€`:`${Math.round(v/1000)}k`} />
                <Tooltip content={<TT />} />
                <Bar dataKey="Revenus"  fill={C_RESERVED} radius={[3,3,0,0]} />
                <Bar dataKey="Dépenses" fill="#E24B4A"    radius={[3,3,0,0]} />
                <Bar dataKey="Bénéfice" fill={C_BLOCKED}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={rc}>
            <p style={{margin:"0 0 1rem",fontSize:14,fontWeight:500}}>Nuits réservées par mois</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {MONTHS.map((m,i)=>{
                const n=yearBookings.filter(b=>new Date(b.checkIn).getMonth()===i).reduce((s,b)=>s+b.nights,0);
                return <div key={m}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{m}</span><span style={{color:"var(--color-text-secondary)"}}>{n} nuit{n>1?"s":""}</span></div><div style={{background:"var(--color-background-secondary)",borderRadius:99,height:6,overflow:"hidden"}}><div style={{width:`${Math.round((n/31)*100)}%`,height:"100%",background:C_RESERVED,borderRadius:99}} /></div></div>;
              })}
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
              <p style={{margin:0,fontSize:14,fontWeight:500}}>🔄 Dépenses récurrentes</p>
              <button onClick={()=>setShowAddR(!showAddR)}>+ Ajouter ↗</button>
            </div>
            {showAddR && (
              <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"1rem",marginBottom:"1rem"}}>
                <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500}}>Nouvelle dépense récurrente</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Catégorie</label><select style={inp} value={rForm.category} onChange={e=>setRForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Montant (MAD)</label><input type="number" placeholder="500" style={inp} value={rForm.amount} onChange={e=>setRForm(f=>({...f,amount:e.target.value}))} /></div>
                  <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:12,color:"var(--color-text-secondary)"}}>Description</label><input type="text" placeholder="Ex : Abonnement Internet" style={inp} value={rForm.description} onChange={e=>setRForm(f=>({...f,description:e.target.value}))} /></div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  {MONTHS.map((m,i)=>(
                    <button key={m} onClick={()=>toggleMonth(i)} style={{padding:"4px 10px",fontSize:12,borderRadius:99,border:"0.5px solid var(--color-border-secondary)",background:rForm.months.includes(i)?"#378ADD":"var(--color-background-secondary)",color:rForm.months.includes(i)?"#fff":"var(--color-text-secondary)",cursor:"pointer"}}>{m}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addRecurring}>Enregistrer</button>
                  <button onClick={()=>setShowAddR(false)} style={{color:"var(--color-text-secondary)"}}>Annuler</button>
                </div>
              </div>
            )}
            {recurring.length>0 && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {recurring.map(rec=>(
                  <div key={rec.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--color-background-secondary)",borderRadius:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"var(--color-background-warning)",color:"var(--color-text-warning)",fontWeight:500,flexShrink:0}}>{rec.category}</span>
                    <span style={{fontSize:13,flex:1,minWidth:120}}>{rec.description}</span>
                    <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-danger)",flexShrink:0}}>{fmtBoth(rec.amount,rate)}</span>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {MONTHS.map((m,i)=>(
                        <span key={m} style={{fontSize:11,padding:"2px 6px",borderRadius:99,background:rec.months.includes(i)?"#378ADD22":"transparent",color:rec.months.includes(i)?"#378ADD":"var(--color-text-tertiary)",fontWeight:rec.months.includes(i)?600:400}}>{m}</span>
                      ))}
                    </div>
                    <button onClick={()=>generateRecurring(rec)} style={{fontSize:12,padding:"4px 12px",background:"#378ADD",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}>Générer {year} ↗</button>
                    <button onClick={()=>{setRecurring(prev=>prev.filter(r=>r.id!==rec.id));showToast("Récurrente supprimée");}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 4px"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
            <p style={{margin:0,fontSize:14,color:"var(--color-text-secondary)"}}>{yearExpenses.length} dépenses · {fmtBoth(totalExp,rate)}</p>
            <button onClick={()=>setShowAddE(!showAddE)}>+ Ajouter ↗</button>
          </div>

          {showAddE && (
            <div style={{...rc,marginBottom:"1.25rem",background:"var(--color-background-secondary)",border:"none"}}>
              <p style={{margin:"0 0 12px",fontSize:14,fontWeight:500}}>Nouvelle dépense</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Date</label><input type="date" style={inp} value={eForm.date} onChange={e=>setEForm(f=>({...f,date:e.target.value}))} /></div>
                <div><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Catégorie</label><select style={inp} value={eForm.category} onChange={e=>setEForm(f=>({...f,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Description</label><input type="text" placeholder="Ex : Nettoyage fin de séjour" style={inp} value={eForm.description} onChange={e=>setEForm(f=>({...f,description:e.target.value}))} /></div>
                <div style={{gridColumn:"1 / -1"}}><label style={{fontSize:13,color:"var(--color-text-secondary)"}}>Montant (MAD)</label><input type="number" placeholder="600" style={inp} value={eForm.amount} onChange={e=>setEForm(f=>({...f,amount:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addExpense}>Enregistrer</button>
                <button onClick={()=>setShowAddE(false)} style={{color:"var(--color-text-secondary)"}}>Annuler</button>
              </div>
            </div>
          )}

          {yearExpenses.length===0
            ? <div style={{...rc,textAlign:"center",padding:"2.5rem"}}><p style={{color:"var(--color-text-tertiary)",fontSize:14,margin:0}}>Aucune dépense pour {year}.</p></div>
            : <div style={rc}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                  <thead><tr style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{["Date","Catégorie","Description","Montant",""].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",color:"var(--color-text-secondary)",fontWeight:400,fontSize:12}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[...yearExpenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>(
                      <tr key={e.id} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                        <td style={{padding:"10px 6px",whiteSpace:"nowrap"}}>{fmtDate(e.date)}</td>
                        <td style={{padding:"10px 6px"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"var(--color-background-warning)",color:"var(--color-text-warning)",fontWeight:500}}>{e.category}</span></td>
                        <td style={{padding:"10px 6px",overflow:"hidden",textOverflow:"ellipsis",color:"var(--color-text-secondary)"}}>{e.description}</td>
                        <td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-danger)"}}>{fmtBoth(e.amount,rate)}</td>
                        <td style={{padding:"10px 6px",textAlign:"right"}}><button onClick={()=>{setExpenses(prev=>prev.filter(x=>x.id!==e.id));showToast("Dépense supprimée");}} style={{fontSize:11,color:"var(--color-text-danger)",border:"none",background:"none",cursor:"pointer",padding:"2px 6px"}}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={3} style={{padding:"10px 6px",fontWeight:500}}>Total</td><td style={{padding:"10px 6px",fontWeight:500,color:"var(--color-text-danger)"}}>{fmtBoth(totalExp,rate)}</td><td /></tr></tfoot>
                </table>
                {expByCat.length>0 && (
                  <div style={{marginTop:"1.25rem",paddingTop:"1.25rem",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
                    <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Répartition par catégorie</p>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {expByCat.map(([cat,amt])=>{const pct=totalExp?Math.round((amt/totalExp)*100):0;return <div key={cat}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{cat}</span><span style={{color:"var(--color-text-secondary)"}}>{fmtBoth(amt,rate)} · {pct}%</span></div><div style={{background:"var(--color-background-secondary)",borderRadius:99,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:"#BA7517",borderRadius:99}} /></div></div>;})}
                    </div>
                  </div>
                )}
              </div>
          }
        </div>
      )}
    </div>
  );
}
