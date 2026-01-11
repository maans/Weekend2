
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Users, Utensils, Trash2, FileText, Upload, ChevronUp, ChevronDown, Database, 
  Search, X, MapPin, Plus, Lock, Unlock, Check, 
  Compass, Flame, Save, RotateCcw, HelpCircle, CheckCircle2, Printer, Home
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- HJÆLPERE ---
const getWeekNumber = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const getActualDayName = () => {
  const d = new Date().getDay();
  if (d === 6) return 'Lørdag';
  if (d === 0) return 'Søndag';
  return 'Fredag';
};

const cleanValue = (val: any) => {
  if (val === null || val === undefined) return '';
  return String(val).split(',')[0].split('(')[0].trim();
};

const numericSort = (aRoom: string, bRoom: string) => {
  const a = parseInt(aRoom.replace(/\D/g, '')) || 0;
  const b = parseInt(bRoom.replace(/\D/g, '')) || 0;
  if (a !== b) return a - b;
  return aRoom.localeCompare(bRoom, undefined, { numeric: true });
};

// --- KONFIGURATION ---
const STORAGE_KEY = 'weekend_app_v26_master';
const WISE_COLORS = ['bg-[#FFB300]', 'bg-[#00BFA5]', 'bg-[#D81B60]', 'bg-[#1E88E5]', 'bg-[#5E35B1]'];

const CLEANING_CONFIG = [
  { name: "Arken", count: 2 },
  { name: "Den lange gang", count: 3 },
  { name: "Gangene i treenigheden", count: 2 },
  { name: "Biografen", count: 1 },
  { name: "Kunst", count: 1 },
  { name: "Klassefløjen + toiletter", count: 4 },
  { name: "Toiletter i hallen", count: 3 },
  { name: "Toiletter på den lange gang", count: 2 },
  { name: "Gymnastiksalen", count: 2 },
  { name: "Hallen", count: 2 }
];

const TASK_CONFIG = [
  { id: 'f1', label: 'Fredag: Før Aftensmad', day: 'Fredag' },
  { id: 'f2', label: 'Fredag: Efter Aftensmad', day: 'Fredag' },
  { id: 'f3', label: 'Fredag: Aftenservering', day: 'Fredag' },
  { id: 'l1', label: 'Lørdag: Før Mokost', day: 'Lørdag' },
  { id: 'l2', label: 'Lørdag: Efter Mokost', day: 'Lørdag' },
  { id: 'l6', label: 'Lørdag: Eftermiddagsservering', day: 'Lørdag' },
  { id: 'l3', label: 'Lørdag: Før Aftensmad', day: 'Lørdag' },
  { id: 'l4', label: 'Lørdag: Efter Aftensmad', day: 'Lørdag' },
  { id: 'l5', label: 'Lørdag: Aftenservering', day: 'Lørdag' },
  { id: 's1', label: 'Søndag: Før Mokost', day: 'Søndag' },
  { id: 's2', label: 'Søndag: Efter Mokost', day: 'Søndag' },
  { id: 's3', label: 'Søndag: Eftermiddagsservering', day: 'Søndag' },
  { id: 's4', label: 'Søndag: Før Aftensmad', day: 'Søndag' },
  { id: 's5', label: 'Søndag: Efter Aftensmad', day: 'Søndag' },
  { id: 's6', label: 'Søndag: Aftenservering', day: 'Søndag' }
];

const COMMON_SLEEPING_AREAS = ["Teltet", "Shelteret", "Gymnastiksalen", "Medie", "Biografen"];

const App = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('import');
  const [weekendNum, setWeekendNum] = useState(String(getWeekNumber(new Date())));
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string[]>>({});
  const [cleaningAssignments, setCleaningAssignments] = useState<Record<string, string[]>>({});
  const [lockedSlots, setLockedSlots] = useState<Record<string, boolean>>({});
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [brandListDay, setBrandListDay] = useState(getActualDayName());
  const [expandedHouses, setExpandedHouses] = useState<Record<string, boolean>>({});
  const [editingLoc, setEditingLoc] = useState<string | null>(null);
  const [manualAdd, setManualAdd] = useState<any | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [locSearch, setLocSearch] = useState('');
  const [customLoc, setCustomLoc] = useState('');

  // --- PERSISTENS ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.students) setStudents(p.students);
        if (p.weekendNum) setWeekendNum(p.weekendNum);
        if (p.taskAssignments) setTaskAssignments(p.taskAssignments);
        if (p.cleaningAssignments) setCleaningAssignments(p.cleaningAssignments);
        if (p.lockedSlots) setLockedSlots(p.lockedSlots);
      } catch (e) { console.error("Load error", e); }
    }
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        students, weekendNum, taskAssignments, cleaningAssignments, lockedSlots 
      }));
    }
  }, [students, weekendNum, taskAssignments, cleaningAssignments, lockedSlots]);

  // --- ADSKILTE AUTOMATIK FUNKTIONER ---
  const performAutoTasks = useCallback(() => {
    const newTasks = { ...taskAssignments };
    TASK_CONFIG.forEach(t => { if (!lockedSlots[t.id]) newTasks[t.id] = []; });
    const eligible = students.filter(s => s.isPresent && !s.isKitchenDuty);
    let taskPool = [...eligible].sort(() => Math.random() - 0.5);
    let used = new Set<string>();
    TASK_CONFIG.forEach(t => {
      if (lockedSlots[t.id]) return;
      const assigned = taskPool.filter(s => !used.has(s.id)).slice(0, 2).map(s => s.id);
      newTasks[t.id] = assigned;
      assigned.forEach(id => used.add(id));
    });
    setTaskAssignments(newTasks);
    alert("Tjanser er fordelt!");
  }, [students, taskAssignments, lockedSlots]);

  const performAutoCleaning = useCallback(() => {
    const newClean = { ...cleaningAssignments };
    CLEANING_CONFIG.forEach(c => { if (!lockedSlots[c.name]) newClean[c.name] = []; });
    const eligible = students.filter(s => s.isPresent && s.stayType === 'full' && !s.isKitchenDuty);
    let pool = [...eligible].sort(() => Math.random() - 0.5);
    let idx = 0;
    CLEANING_CONFIG.forEach(area => {
      if (lockedSlots[area.name]) return;
      const assigned = pool.slice(idx, idx + area.count).map(s => s.id);
      newClean[area.name] = assigned;
      idx += area.count;
    });
    setCleaningAssignments(newClean);
    alert("Rengøring er fordelt!");
  }, [students, cleaningAssignments, lockedSlots]);

  // --- BACKUP ---
  const downloadData = () => {
    const data = JSON.stringify({ students, weekendNum, taskAssignments, cleaningAssignments, lockedSlots });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekend_backup_uge${weekendNum}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const p = JSON.parse(ev.target?.result as string);
        if (p.students) setStudents(p.students);
        if (p.weekendNum) setWeekendNum(p.weekendNum);
        setTaskAssignments(p.taskAssignments || {});
        setCleaningAssignments(p.cleaningAssignments || {});
        setLockedSlots(p.lockedSlots || {});
        alert("Backup indlæst!");
        setActiveTab('students');
      } catch (err) { alert("Fejl ved indlæsning."); }
    };
    reader.readAsText(file);
  };

  // --- IMPORT ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = ev.target?.result;
        const wb = XLSX.read(result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length < 2) return;
        const headers = data[0].map(h => String(h).trim().toLowerCase());
        const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
        const idx = {
          first: findIdx(['fornavn', 'first name']),
          last: findIdx(['efternavn', 'last name']),
          room: findIdx(['værelse', 'room']),
          house: findIdx(['house', 'gang', 'hus']),
          weekend: findIdx(['weekend', 'til stede', 'status'])
        };
        const parsed = data.slice(1).filter(row => row.length > 0 && row[idx.first]).map((row, i) => {
          const presenceStr = String(row[idx.weekend] || '').toLowerCase();
          let stayType = (presenceStr.includes('hele') || presenceStr === 'ja' || presenceStr === '1') ? 'full' : 'none';
          const house = cleanValue(row[idx.house]) || 'Ukendt';
          const room = cleanValue(row[idx.room]) || '??';
          return {
            id: `std-${Date.now()}-${i}`,
            firstName: String(row[idx.first] || ''),
            lastName: String(row[idx.last] || ''),
            room, house,
            isPresent: stayType !== 'none',
            stayType,
            isKitchenDuty: false,
            isMarked: false,
            sleepingLocations: { 'Fredag': `${house} - ${room}`, 'Lørdag': `${house} - ${room}`, 'Søndag': `${house} - ${room}` }
          };
        });
        setStudents(parsed);
        setActiveTab('students');
      } catch (err) { alert("Excel-fejl."); }
    };
    reader.readAsBinaryString(file);
  };

  const getName = (id: string) => { const s = students.find(x => x.id === id); return s ? `${s.firstName} ${s.lastName}` : '??'; };
  const allHouses = useMemo(() => Array.from(new Set(students.map(s => s.house))).filter(Boolean).sort(), [students]);

  const filtered = students.filter(s => {
    const matchSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (showAllStudents || s.isPresent);
  }).sort((a,b) => a.firstName.localeCompare(b.firstName));

  // --- SOVESTED LOGIK ---
  const studentToEdit = useMemo(() => students.find(s => s.id === editingLoc), [editingLoc, students]);
  const otherRoomsOnGang = useMemo(() => {
    if (!studentToEdit) return [];
    const rooms = Array.from(new Set(students.filter(s => s.house === studentToEdit.house && s.room !== studentToEdit.room).map(s => s.room)));
    return rooms.sort(numericSort);
  }, [studentToEdit, students]);

  const allPossibleRooms = useMemo(() => {
    const map = new Map();
    students.forEach(s => {
      const key = `${s.house} - ${s.room}`;
      if (!map.has(key)) map.set(key, { house: s.house, room: s.room });
    });
    return Array.from(map.values()).sort((a,b) => a.house.localeCompare(b.house) || numericSort(a.room, b.room));
  }, [students]);

  const updateSleepingLoc = (loc: string) => {
    setStudents(p => p.map(s => s.id === editingLoc ? {...s, sleepingLocations: {...s.sleepingLocations, [brandListDay]: loc}} : s));
    setEditingLoc(null);
    setCustomLoc('');
    setLocSearch('');
  };

  return (
    <div className={`min-h-screen ${previewType ? 'bg-white text-black' : 'bg-[#0A0E1A] text-white pb-32'}`}>
      {!previewType && (
        <>
          <header className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#0A0E1A]/90 backdrop-blur-xl z-50">
            <div className="flex items-center gap-3">
              <Compass className="w-8 h-8 text-[#FFB300]"/>
              <h1 className="text-xl font-black uppercase tracking-tighter italic">Weekend</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFaq(true)} className="p-2 opacity-30 hover:opacity-100"><HelpCircle/></button>
              <button onClick={() => { if(confirm("Nulstil?")) { localStorage.clear(); location.reload(); }}} className="p-2 text-red-500 opacity-30 hover:opacity-100"><RotateCcw/></button>
            </div>
          </header>

          <main className="p-4 max-w-2xl mx-auto space-y-8">
            {activeTab === 'import' && (
              <div className="py-10 space-y-12">
                <div className="text-center space-y-6">
                  <div className="bg-white/5 p-12 rounded-[3.5rem] border-2 border-dashed border-white/10">
                     <Upload className="mx-auto w-12 h-12 text-[#FFB300] mb-6"/>
                     <h2 className="text-2xl font-black uppercase mb-6 italic">Indlæs Data</h2>
                     <input type="file" id="up" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv"/>
                     <label htmlFor="up" className="block w-full py-5 bg-[#00BFA5] text-black rounded-2xl font-black uppercase cursor-pointer shadow-lg hover:scale-105 transition-all text-center">Vælg Excel-fil</label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={downloadData} className="flex flex-col items-center gap-2 p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10">
                      <Save className="text-[#1E88E5]"/>
                      <span className="font-black uppercase text-[10px]">Eksport Backup</span>
                   </button>
                   <label htmlFor="restore-input" className="flex flex-col items-center gap-2 p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 cursor-pointer">
                      <RotateCcw className="text-[#D81B60]"/>
                      <span className="font-black uppercase text-[10px]">Import Backup</span>
                      <input type="file" id="restore-input" className="hidden" accept=".json" onChange={handleRestore}/>
                   </label>
                </div>
                {students.length > 0 && (
                  <button onClick={() => setActiveTab('students')} className="w-full p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex justify-between items-center font-black uppercase italic">
                     <span>Vis Elever ({students.filter(s=>s.isPresent).length})</span>
                     <ChevronUp className="rotate-90 opacity-20"/>
                  </button>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="flex gap-2 sticky top-24 z-40 bg-[#0A0E1A] py-2">
                   <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20"/>
                      <input type="text" placeholder="Søg..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 pl-12 rounded-2xl outline-none"/>
                   </div>
                   <button onClick={() => setShowAllStudents(!showAllStudents)} className={`px-6 rounded-2xl font-black uppercase text-[10px] border transition-all ${showAllStudents ? 'bg-[#00BFA5] text-black border-[#00BFA5]' : 'bg-white/5 border-white/10 opacity-40'}`}>Alle</button>
                </div>
                {filtered.map((s, i) => (
                  <div key={s.id} className={`flex items-stretch rounded-[2.2rem] overflow-hidden ${WISE_COLORS[i % 5]} text-black ${!s.isPresent ? 'opacity-30 grayscale' : ''}`}>
                    <div className="flex-1 p-6 cursor-pointer active:bg-black/5" onClick={() => setStudents(p => p.map(x => x.id === s.id ? {...x, isPresent: !x.isPresent} : x))}>
                      <p className="text-xl font-black leading-tight">{s.firstName} {s.lastName}</p>
                      <p className="text-[10px] font-bold uppercase opacity-50 mt-1">{s.house} • {s.room}</p>
                    </div>
                    <button onClick={() => setStudents(p => p.map(x => x.id === s.id ? {...x, isKitchenDuty: !x.isKitchenDuty} : x))} className={`px-8 text-[10px] font-black uppercase transition-all ${s.isKitchenDuty ? 'bg-black text-white' : 'bg-black/10'}`}>
                      {s.isKitchenDuty ? 'Køkken' : 'Køkken?'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'rounds' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center px-4">
                    <h2 className="text-2xl font-black uppercase italic">Runder</h2>
                    <div className="flex bg-white/5 p-1 rounded-xl">
                       {['Fredag', 'Lørdag', 'Søndag'].map(d => (
                          <button key={d} onClick={() => setBrandListDay(d)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-lg ${brandListDay === d ? 'bg-[#FFB300] text-black' : 'opacity-40'}`}>{d}</button>
                       ))}
                    </div>
                 </div>
                 {allHouses.map((house, idx) => {
                    const houseSts = students.filter(s => s.house === house && s.isPresent).sort((a,b) => numericSort(a.room, b.room) || a.firstName.localeCompare(b.firstName));
                    const isExp = expandedHouses[house];
                    return (
                      <div key={house} className="bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden">
                         <div className="p-7 flex justify-between items-center cursor-pointer active:bg-white/5" onClick={() => setExpandedHouses(p => ({...p, [house]: !isExp}))}>
                            <div className="flex items-center gap-5">
                               <div className={`${WISE_COLORS[idx % 5]} w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black`}>{houseSts.length}</div>
                               <span className="font-black uppercase tracking-widest text-sm italic">{house}</span>
                            </div>
                            <div className="opacity-20">{isExp ? <ChevronUp/> : <ChevronDown/>}</div>
                         </div>
                         {isExp && (
                           <div className="p-3 border-t border-white/5 space-y-2 bg-black/20">
                              {houseSts.map(s => (
                                 <div key={s.id} className="bg-white/10 p-5 rounded-2xl flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                       <button onClick={() => setStudents(p => p.map(x => x.id === s.id ? {...x, isMarked: !x.isMarked} : x))} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${s.isMarked ? 'bg-[#00BFA5] border-[#00BFA5] text-black' : 'border-white/10 text-transparent'}`}><Check className="w-5 h-5"/></button>
                                       <div>
                                          <p className="font-black text-lg">{s.firstName} {s.lastName}</p>
                                          <p className="text-[10px] font-black uppercase opacity-30">{s.sleepingLocations[brandListDay]}</p>
                                       </div>
                                    </div>
                                    <button onClick={() => { setLocSearch(''); setEditingLoc(s.id); }} className="p-4 bg-white/5 rounded-2xl active:bg-white/20"><MapPin className="w-5 h-5 opacity-40"/></button>
                                 </div>
                              ))}
                           </div>
                         )}
                      </div>
                    );
                 })}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-8">
                 <div className="flex justify-between items-center px-4">
                    <h2 className="text-2xl font-black uppercase italic">Tjanser</h2>
                    <button onClick={performAutoTasks} className="bg-[#FFB300] text-black px-8 py-3 rounded-2xl font-black uppercase text-[10px] shadow-xl">Fordel Tjanser</button>
                 </div>
                 {['Fredag', 'Lørdag', 'Søndag'].map(day => (
                    <div key={day} className="space-y-4">
                       <h3 className="text-xs font-black text-[#FFB300] uppercase tracking-[0.3em] border-b border-white/5 pb-2 ml-4">{day}</h3>
                       <div className="grid gap-3">
                          {TASK_CONFIG.filter(t => t.day === day).map((t, i) => (
                             <div key={t.id} className={`${WISE_COLORS[i % 5]} p-6 rounded-[2.5rem] text-black shadow-xl`}>
                                <div className="flex justify-between items-center mb-4">
                                   <h4 className="text-sm font-black uppercase italic">{t.label.split(': ')[1]}</h4>
                                   <button onClick={() => setLockedSlots(p => ({...p, [t.id]: !p[t.id]}))} className="p-2.5 bg-black/10 rounded-xl">{lockedSlots[t.id] ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4 opacity-30"/>}</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                   {(taskAssignments[t.id] || []).map(sid => (
                                      <div key={sid} className="bg-black/10 px-4 py-2 rounded-xl text-[11px] font-black flex items-center gap-2">
                                         {getName(sid)} <button onClick={() => setTaskAssignments(p => ({...p, [t.id]: p[t.id].filter(x => x !== sid)}))}><X className="w-3.5 h-3.5 opacity-40"/></button>
                                      </div>
                                   ))}
                                   <button onClick={() => setManualAdd({id: t.id, type: 'task'})} className="p-2.5 bg-black/10 rounded-xl"><Plus className="w-4 h-4"/></button>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
            )}

            {activeTab === 'cleaning' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center px-4">
                    <h2 className="text-2xl font-black uppercase italic">Rengøring</h2>
                    <button onClick={performAutoCleaning} className="bg-[#FFB300] text-black px-8 py-3 rounded-2xl font-black uppercase text-[10px] shadow-xl">Fordel Rengøring</button>
                 </div>
                 <div className="grid gap-3">
                    {CLEANING_CONFIG.map((area, idx) => (
                       <div key={area.name} className={`${WISE_COLORS[idx % 5]} p-6 rounded-[2.5rem] text-black shadow-xl`}>
                          <div className="flex justify-between items-center mb-4">
                             <h4 className="text-sm font-black uppercase italic">{area.name}</h4>
                             <button onClick={() => setLockedSlots(p => ({...p, [area.name]: !p[area.name]}))} className="p-2.5 bg-black/10 rounded-xl">{lockedSlots[area.name] ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4 opacity-30"/>}</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {(cleaningAssignments[area.name] || []).map(sid => (
                                <div key={sid} className="bg-black/10 px-4 py-2 rounded-xl text-[11px] font-black flex items-center gap-2">
                                   {getName(sid)} <button onClick={() => setCleaningAssignments(p => ({...p, [area.name]: p[area.name].filter(x => x !== sid)}))}><X className="w-3.5 h-3.5 opacity-40"/></button>
                                </div>
                             ))}
                             <button onClick={() => setManualAdd({id: area.name, type: 'cleaning'})} className="p-2.5 bg-black/10 rounded-xl"><Plus className="w-4 h-4"/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'print' && (
              <div className="py-10 space-y-8">
                <div className="flex justify-between items-center px-4">
                    <h2 className="text-2xl font-black uppercase italic">Print</h2>
                    <div className="flex bg-white/5 p-1 rounded-xl">
                       {['Fredag', 'Lørdag', 'Søndag'].map(d => (
                          <button key={d} onClick={() => setBrandListDay(d)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-lg ${brandListDay === d ? 'bg-[#FFB300] text-black' : 'opacity-40'}`}>{d}</button>
                       ))}
                    </div>
                 </div>
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 flex justify-between items-center">
                  <span className="text-xs font-black uppercase opacity-40">Uge Nummer</span>
                  <input type="number" value={weekendNum} onChange={e => setWeekendNum(e.target.value)} className="bg-transparent border-b-2 border-white/20 w-16 text-center text-3xl font-black outline-none text-[#FFB300]"/>
                </div>
                <div className="grid gap-6">
                  <button onClick={() => setPreviewType('main')} className="w-full p-10 bg-[#FFB300] text-black rounded-[3rem] font-black uppercase flex justify-between items-center italic shadow-xl">Tjanser <Utensils/></button>
                  <button onClick={() => setPreviewType('brand')} className="w-full p-10 bg-[#D81B60] text-white rounded-[3rem] font-black uppercase flex justify-between items-center italic shadow-xl">Brandlister ({brandListDay}) <Flame/></button>
                  <button onClick={() => setPreviewType('sunday')} className="w-full p-10 bg-[#00BFA5] text-black rounded-[3rem] font-black uppercase flex justify-between items-center italic shadow-xl">Søndagsliste <CheckCircle2/></button>
                </div>
              </div>
            )}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0E1A]/95 backdrop-blur-3xl border-t border-white/10 p-6 flex justify-around items-center no-print z-50">
            {[
              { id: 'import', icon: Database },
              { id: 'students', icon: Users },
              { id: 'rounds', icon: Compass },
              { id: 'tasks', icon: Utensils },
              { id: 'cleaning', icon: Trash2 },
              { id: 'print', icon: FileText }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`p-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-[#FFB300] text-black scale-110 shadow-lg' : 'opacity-20 hover:opacity-100'}`}>
                <tab.icon className="w-6 h-6"/>
              </button>
            ))}
          </nav>
        </>
      )}

      {/* --- PRINT MODUS --- */}
      {previewType && (
        <div className="bg-white text-black min-h-screen">
           <div className="no-print fixed top-0 left-0 right-0 p-6 bg-black flex justify-between items-center text-white z-[1000]">
              <button onClick={() => setPreviewType(null)} className="p-3 bg-white/10 rounded-full"><X/></button>
              <h2 className="font-black uppercase text-xs italic tracking-widest">Print: {previewType === 'main' ? 'Tjanser' : previewType === 'brand' ? `Brandliste - ${brandListDay}` : 'Søndagsliste'}</h2>
              <button onClick={() => window.print()} className="bg-[#00BFA5] text-black px-8 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-3 shadow-lg">Print PDF <Printer className="w-4 h-4"/></button>
           </div>
           
           <div className="max-w-4xl mx-auto pt-24 print:pt-0">
              {previewType === 'brand' && (
                Object.entries(
                  students.filter(s => s.isPresent).reduce((acc: any, s: any) => {
                    const loc = String(s.sleepingLocations[brandListDay] || '');
                    const house = loc.includes(' - ') ? loc.split(' - ')[0] : loc;
                    if (!acc[house]) acc[house] = [];
                    acc[house].push(s);
                    return acc;
                  }, {})
                ).sort().map(([house, sts]: [string, any]) => (
                  <div key={house} className="a4-page page-break p-10 border-[10px] border-red-600 h-[297mm] flex flex-col mb-8 bg-white">
                    <div className="flex justify-between items-end border-b-4 border-red-600 pb-2 mb-6">
                       <h1 className="text-4xl font-black text-red-600 italic uppercase leading-none">Brandliste • {brandListDay}</h1>
                       <div className="text-right"><p className="text-6xl font-black text-red-600 leading-none">{sts.length}</p></div>
                    </div>
                    <h2 className="text-5xl font-black uppercase mb-8 leading-none italic">{house}</h2>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 flex-1 overflow-hidden">
                       {Object.entries(sts.reduce((acc: any, s: any) => {
                           const loc = String(s.sleepingLocations[brandListDay] || '');
                           const room = loc.includes(' - ') ? loc.split(' - ')[1] : 'Fælles';
                           if (!acc[room]) acc[room] = [];
                           acc[room].push(s);
                           return acc;
                         }, {}))
                       .sort((a, b) => numericSort(a[0], b[0]))
                       .map(([room, roomSts]: [string, any]) => (
                         <div key={room} className="border-l-2 border-red-600 pl-3 py-1 break-inside-avoid">
                            <p className="text-[10px] font-black text-red-600 uppercase italic">Værelse {room}</p>
                            {roomSts.sort((a:any, b:any)=>a.firstName.localeCompare(b.firstName)).map((s: any, idx: number) => (
                              <p key={idx} className="text-[17px] font-bold border-b border-slate-50 leading-tight">{s.firstName} {s.lastName}</p>
                            ))}
                         </div>
                       ))}
                    </div>
                  </div>
                ))
              )}

              {previewType === 'main' && (
                <div className="space-y-4 bg-white">
                  {['Fredag', 'Lørdag', 'Søndag'].map(day => (
                    <div key={day} className="a4-page page-break p-12 flex flex-col min-h-[297mm]">
                       <div className="border-b-4 border-black pb-2 mb-8 text-center">
                         <h1 className="text-3xl font-black italic uppercase leading-none">Tjanser - {day} (Uge {weekendNum})</h1>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          {TASK_CONFIG.filter(t => t.day === day).map(t => (
                            <div key={t.id} className="p-4 border border-slate-200 rounded-2xl">
                               <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{t.label.split(': ')[1]}</p>
                               <p className="text-[17px] font-bold italic">{(taskAssignments[t.id] || []).map(getName).join(' & ') || '---'}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
                  <div className="a4-page page-break p-12 flex flex-col min-h-[297mm]">
                    <div className="border-b-4 border-black pb-2 mb-8 text-center">
                      <h1 className="text-3xl font-black italic uppercase">Rengøring (Uge {weekendNum})</h1>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 flex-1 content-start">
                       {CLEANING_CONFIG.map(area => (
                          <div key={area.name} className="border-b border-slate-100 pb-3">
                             <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{area.name}</p>
                             <p className="text-[16px] font-bold italic">{(cleaningAssignments[area.name] || []).map(getName).join(', ') || '---'}</p>
                          </div>
                       ))}
                    </div>
                  </div>
                </div>
              )}

              {previewType === 'sunday' && (
                <div className="a4-page p-12 bg-white min-h-[297mm]">
                   <h1 className="text-3xl font-black italic uppercase border-b-4 border-black pb-4 mb-8">Søndagsliste • Uge {weekendNum}</h1>
                   <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                      {students.sort((a,b) => a.firstName.localeCompare(b.firstName)).map(s => (
                        <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                           <div className="overflow-hidden">
                              <p className="text-[14px] font-bold leading-none truncate">{s.firstName} {s.lastName}</p>
                              <p className="text-[8px] uppercase font-black opacity-30 mt-1">{s.house} • {s.room}</p>
                           </div>
                           <div className="w-7 h-7 border-2 border-black flex-shrink-0 ml-1"></div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- MODALER --- */}
      {editingLoc && studentToEdit && (
        <div className="fixed inset-0 bg-black/98 z-[2000] p-6 flex items-center justify-center backdrop-blur-2xl">
          <div className="bg-[#151926] w-full max-w-xl rounded-[3rem] p-8 border border-white/10 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                   <h3 className="text-xl font-black uppercase text-[#FFB300] italic">{studentToEdit.firstName} {studentToEdit.lastName}</h3>
                   <p className="text-[10px] opacity-40 uppercase font-black">Vælg sovested ({brandListDay})</p>
                </div>
                <button onClick={() => setEditingLoc(null)} className="p-3 bg-white/5 rounded-full"><X/></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scroll">
                
                <button onClick={() => updateSleepingLoc(`${studentToEdit.house} - ${studentToEdit.room}`)} className="w-full p-6 bg-[#FFB300]/10 border border-[#FFB300]/20 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-all">
                   <Home className="text-[#FFB300]"/>
                   <div className="text-left">
                      <p className="font-black text-[#FFB300]">Eget Værelse ({studentToEdit.room})</p>
                      <p className="text-[9px] opacity-40 font-black uppercase">{studentToEdit.house}</p>
                   </div>
                </button>

                <div>
                   <p className="text-[10px] font-black uppercase opacity-30 mb-3 tracking-widest">Andre på gangen ({studentToEdit.house})</p>
                   <div className="grid grid-cols-4 gap-2">
                      {otherRoomsOnGang.map(r => (
                        <button key={r} onClick={() => updateSleepingLoc(`${studentToEdit.house} - ${r}`)} className="p-3 bg-white/5 border border-white/5 rounded-xl font-black text-xs hover:bg-white/10">{r}</button>
                      ))}
                   </div>
                </div>

                <div>
                   <p className="text-[10px] font-black uppercase opacity-30 mb-3 tracking-widest">Fælles områder</p>
                   <div className="grid grid-cols-2 gap-2">
                      {COMMON_SLEEPING_AREAS.map(area => (
                        <button key={area} onClick={() => updateSleepingLoc(area)} className="p-4 bg-white/5 border border-white/5 rounded-xl font-black uppercase text-[10px] hover:bg-white/10">{area}</button>
                      ))}
                   </div>
                </div>

                <div>
                   <p className="text-[10px] font-black uppercase opacity-30 mb-3 tracking-widest">Søg alle værelser</p>
                   <input type="text" placeholder="Søg hus eller værelse..." value={locSearch} onChange={e => setLocSearch(e.target.value)} className="w-full bg-white/5 p-4 rounded-xl mb-3 outline-none border border-white/10 text-sm"/>
                   <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {allPossibleRooms.filter(r => `${r.house} ${r.room}`.toLowerCase().includes(locSearch.toLowerCase())).map(r => (
                        <button key={`${r.house}-${r.room}`} onClick={() => updateSleepingLoc(`${r.house} - ${r.room}`)} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center hover:bg-white/10">
                           <span className="font-bold text-sm">Værelse {r.room}</span>
                           <span className="text-[10px] uppercase opacity-30 font-black">{r.house}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pb-10">
                   <p className="text-[10px] font-black uppercase opacity-30 mb-3 tracking-widest">Manuel indtastning</p>
                   <div className="flex gap-2">
                      <input type="text" placeholder="F.eks. Medierummet..." value={customLoc} onChange={e => setCustomLoc(e.target.value)} className="flex-1 bg-white/5 p-4 rounded-xl outline-none border border-white/10 text-sm"/>
                      <button onClick={() => customLoc && updateSleepingLoc(customLoc)} className="px-6 bg-[#00BFA5] text-black rounded-xl font-black uppercase text-[10px]">Tilføj</button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {manualAdd && (
        <div className="fixed inset-0 bg-black/95 z-[2000] p-6 flex flex-col backdrop-blur-xl">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic">Tilføj til {manualAdd.id}</h3>
              <button onClick={() => setManualAdd(null)} className="p-4 bg-white/10 rounded-full"><X/></button>
           </div>
           <input type="text" placeholder="Søg..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl mb-6 outline-none text-lg"/>
           <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {students.filter(s => s.isPresent && `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                <button key={s.id} onClick={() => {
                   if(manualAdd.type === 'task') setTaskAssignments(p => ({...p, [manualAdd.id]: Array.from(new Set([...(p[manualAdd.id]||[]), s.id]))}));
                   else setCleaningAssignments(p => ({...p, [manualAdd.id]: Array.from(new Set([...(p[manualAdd.id]||[]), s.id]))}));
                   setManualAdd(null);
                   setSearchTerm('');
                }} className="w-full p-6 bg-white/5 rounded-2xl text-left hover:bg-[#00BFA5] hover:text-black transition-all">
                   <p className="font-black text-xl">{s.firstName} {s.lastName}</p>
                   <p className="text-[9px] uppercase opacity-40 font-black">{s.house} • {s.room}</p>
                </button>
              ))}
           </div>
        </div>
      )}

      {showFaq && (
        <div className="fixed inset-0 bg-black/98 z-[2000] p-6 flex items-center justify-center backdrop-blur-xl">
           <div className="bg-[#151926] w-full max-md rounded-[3rem] p-10 border border-white/10 space-y-8">
              <h2 className="text-3xl font-black uppercase text-[#FFB300] italic text-center leading-tight">Vejledning</h2>
              <div className="space-y-4 text-sm opacity-80 leading-relaxed custom-scroll max-h-[60vh] pr-2">
                 <p><b>1. Elevliste:</b> Markér hvem der er på skolen. Brug "Køkken?" til elever, der har fast køkkenvagt - de bliver så aldrig valgt til automatiske tjanser.</p>
                 <p><b>2. Runder:</b> Her styrer du sovepladser. Tryk på Map-ikonet for at flytte en elev. De bliver stående det nye sted på brandlisten.</p>
                 <p><b>3. Tjanser & Rengøring:</b> Brug knapperne til automatisk fordeling. Du kan låse en elev til en tjans med hængelåsen, hvis de absolut skal have den.</p>
                 <p><b>4. Print:</b> Alle lister findes i print-menuen. De er sat op til at spare papir og plads (A4).</p>
                 <p><b>5. Backup:</b> Husk at bruge "Eksport" i import-menuen, hvis du vil gemme din weekendplan til senere brug eller en kollega.</p>
              </div>
              <button onClick={() => setShowFaq(false)} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Forstået</button>
           </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
