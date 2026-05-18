const fs = require('fs');
let c = fs.readFileSync('screens/DetailedAgenda.tsx', 'utf8');
let lines = c.split('\n');

// 1. Find and add new state after selectedProfFilter line
const profFilterIdx = lines.findIndex(l => l.includes("const [selectedProfFilter, setSelectedProfFilter]"));
if (profFilterIdx >= 0) {
  lines.splice(profFilterIdx + 1, 0,
    "\tconst [statusFilter, setStatusFilter] = useState('all');",
    "\tconst [selectedProfTab, setSelectedProfTab] = useState<string>('');"
  );
  console.log('Added new state at line', profFilterIdx + 1);
}

// 2. Find useEffect for isPowerful and add selectedProfTab setter + new useEffect
c = lines.join('\n');
const oldEffect = `setSelectedProfFilter(professionalId);
\t}
\t}, [isPowerful, professionalId]);`;
const newEffect = `setSelectedProfFilter(professionalId);
\tsetSelectedProfTab(professionalId);
\t}
\t}, [isPowerful, professionalId]);

\tuseEffect(() => {
\tif (professionals.length > 0 && !selectedProfTab) {
\tsetSelectedProfTab(professionals[0].id);
\t}
\t}, [professionals, selectedProfTab]);`;

if (c.includes(oldEffect)) {
  c = c.replace(oldEffect, newEffect);
  console.log('Updated useEffect');
} else {
  console.log('useEffect target not found');
}

// 3. Now replace the entire return() section (from "return (" to the end before export)
const returnStart = c.indexOf("\treturn (");
const exportLine = c.indexOf("export default DetailedAgenda;");
if (returnStart < 0 || exportLine < 0) {
  console.log('Could not find return or export markers');
  process.exit(1);
}

const beforeReturn = c.substring(0, returnStart);
const afterExport = c.substring(exportLine);

const newReturn = `\t// --- COMPUTED VALUES FOR SPLIT TIMELINE++ ---
\tconst activeProfessional = professionals.find(p => p.id === selectedProfTab);
\tconst activeAppts = selectedProfTab ? (appointmentsByProf.get(selectedProfTab) || []) : [];
\tconst filteredAppts = activeAppts.filter(a => statusFilter === 'all' || a.status === statusFilter);
\tconst totalAppts = appointments.filter(a => a.status !== 'cancelled').length;
\tconst totalRevenue = appointments.filter(a => a.status !== 'cancelled').reduce((sum, a) => {
\t\tconst svc = services.find(s => s.title === a.service);
\t\treturn sum + (svc?.price || 0);
\t}, 0);
\tconst occupancyRate = professionals.length > 0 ? Math.round((totalAppts / (professionals.length * 10)) * 100) : 0;

\tconst upcomingAppts = appointments
\t\t.filter(a => a.status !== 'cancelled' && a.status !== 'pago')
\t\t.sort((a, b) => (a.startHour + a.startMinute).localeCompare(b.startHour + b.startMinute))
\t\t.slice(0, 5);

\tconst timeSlots = Array.from({ length: 15 }, (_, i) => {
\t\tconst h = 7 + i;
\t\treturn h.toString().padStart(2, '0') + ':00';
\t});

\tconst getColorForAppt = (apt: Appointment) => COLORS[apt.professionalName.charCodeAt(0) % COLORS.length];

\t// Calendar helper
\tconst calDate = new Date(currentDate + 'T12:00:00');
\tconst calYear = calDate.getFullYear();
\tconst calMonth = calDate.getMonth();
\tconst daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
\tconst firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
\tconst monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
\tconst calMonthName = monthNames[calMonth] + ' ' + calYear;
\tconst todayStr = new Date().toISOString().split('T')[0];

\treturn (
\t<div className="flex h-full flex-col bg-transparent overflow-hidden text-white font-sans">
\t\t{/* 3-COLUMN SPLIT TIMELINE++ LAYOUT */}
\t\t<div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '260px 1fr 300px' }}>

\t\t\t{/* ========= LEFT PANEL ========= */}
\t\t\t<div className="border-r border-white/[0.04] flex flex-col overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>
\t\t\t\t{/* Header */}
\t\t\t\t<div className="pb-4 border-b border-white/[0.04] mb-4">
\t\t\t\t\t<h1 className="text-xl font-black tracking-tight">Agenda</h1>
\t\t\t\t\t<p className="text-[10px] text-amber-600 font-bold uppercase tracking-[2px] mt-1">Visão Profissional • Tempo Real</p>
\t\t\t\t</div>

\t\t\t\t{/* Mini Calendar */}
\t\t\t\t<div className="flex justify-between items-center mb-3">
\t\t\t\t\t<h4 className="text-[13px] font-extrabold">{calMonthName}</h4>
\t\t\t\t\t<div className="flex gap-1">
\t\t\t\t\t\t<button onClick={() => { const d = new Date(calDate); d.setMonth(d.getMonth()-1); setCurrentDate(d.toISOString().split('T')[0]); }} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-transparent text-white/40 flex items-center justify-center hover:text-white">
\t\t\t\t\t\t\t<span className="material-symbols-outlined" style={{fontSize:14}}>chevron_left</span>
\t\t\t\t\t\t</button>
\t\t\t\t\t\t<button onClick={() => { const d = new Date(calDate); d.setMonth(d.getMonth()+1); setCurrentDate(d.toISOString().split('T')[0]); }} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-transparent text-white/40 flex items-center justify-center hover:text-white">
\t\t\t\t\t\t\t<span className="material-symbols-outlined" style={{fontSize:14}}>chevron_right</span>
\t\t\t\t\t\t</button>
\t\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t\t<div className="grid grid-cols-7 gap-[2px] text-center mb-5">
\t\t\t\t\t{['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="text-[9px] font-bold text-white/20 uppercase py-1">{d}</div>)}
\t\t\t\t\t{Array.from({length: firstDayOfWeek}).map((_,i)=> <div key={'e'+i}/>)}
\t\t\t\t\t{Array.from({length: daysInMonth}, (_,i)=> {
\t\t\t\t\t\tconst day = i+1;
\t\t\t\t\t\tconst dayStr = \`\${calYear}-\${(calMonth+1).toString().padStart(2,'0')}-\${day.toString().padStart(2,'0')}\`;
\t\t\t\t\t\tconst isToday = dayStr === todayStr;
\t\t\t\t\t\tconst isSelected = dayStr === currentDate;
\t\t\t\t\t\treturn (
\t\t\t\t\t\t\t<button key={day} onClick={() => setCurrentDate(dayStr)}
\t\t\t\t\t\t\t\tclassName={\`text-[11px] font-semibold py-[7px] rounded-lg cursor-pointer transition-all \${isSelected ? 'bg-amber-700 text-white font-black shadow-lg shadow-amber-900/30' : isToday ? 'text-amber-500 font-bold ring-1 ring-amber-700' : 'text-white/35 hover:bg-white/[0.04] hover:text-white'}\`}>
\t\t\t\t\t\t\t\t{day}
\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t);
\t\t\t\t\t})}
\t\t\t\t</div>

\t\t\t\t{/* Filter: Status */}
\t\t\t\t<div className="mb-4">
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/20 uppercase tracking-[2px] mb-2">Filtrar por Status</div>
\t\t\t\t\t<div className="flex flex-wrap gap-[6px]">
\t\t\t\t\t\t{[{v:'all',l:'Todos'},{v:'confirmed',l:'✓ Confirmados'},{v:'pending',l:'● Pendentes'},{v:'em_atendimento',l:'Em Atendimento'}].map(f => (
\t\t\t\t\t\t\t<button key={f.v} onClick={() => setStatusFilter(f.v)}
\t\t\t\t\t\t\t\tclassName={\`text-[10px] font-bold py-[5px] px-3 rounded-full border transition-all \${statusFilter===f.v ? 'bg-amber-700/15 border-amber-700 text-amber-500' : 'border-white/[0.06] text-white/40 hover:border-amber-700/30 hover:text-white'}\`}>
\t\t\t\t\t\t\t\t{f.l}
\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t))}
\t\t\t\t\t</div>
\t\t\t\t</div>

\t\t\t\t{/* Upcoming */}
\t\t\t\t<div className="mt-2">
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/20 uppercase tracking-[2px] mb-3">Próximos Atendimentos</div>
\t\t\t\t\t{upcomingAppts.length === 0 && <p className="text-xs text-white/20">Nenhum agendamento</p>}
\t\t\t\t\t{upcomingAppts.map(apt => (
\t\t\t\t\t\t<div key={apt.id} className="flex items-center gap-3 p-[10px] rounded-xl border border-white/[0.03] mb-[6px] cursor-pointer transition-all hover:bg-amber-700/[0.04] hover:border-amber-700/15">
\t\t\t\t\t\t\t<div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: apt.status === 'confirmed' ? '#10b981' : apt.status === 'pending' ? '#f59e0b' : '#818cf8'}} />
\t\t\t\t\t\t\t<div>
\t\t\t\t\t\t\t\t<div className="text-xs font-bold">{apt.clientName}</div>
\t\t\t\t\t\t\t\t<div className="text-[10px] text-white/30 font-medium mt-[2px]">{apt.startHour}:{apt.startMinute} — {apt.service}</div>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t))}
\t\t\t\t</div>
\t\t\t</div>

\t\t\t{/* ========= CENTER PANEL: TIMELINE ========= */}
\t\t\t<div className="flex flex-col overflow-hidden">
\t\t\t\t{/* Professional Tabs */}
\t\t\t\t<div className="flex gap-1 px-6 py-3 border-b border-white/[0.04] overflow-x-auto flex-shrink-0">
\t\t\t\t\t{professionals.map(p => (
\t\t\t\t\t\t<button key={p.id} onClick={() => { setSelectedProfTab(p.id); setSelectedProfFilter(p.id); }}
\t\t\t\t\t\t\tclassName={\`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all \${selectedProfTab === p.id ? 'bg-amber-700/10 border-amber-700/30 text-amber-500' : 'border-white/[0.04] text-white/40 hover:border-amber-700/20 hover:text-white'}\`}>
\t\t\t\t\t\t\t<img src={p.avatar} alt="" className="w-6 h-6 rounded-lg object-cover"/>
\t\t\t\t\t\t\t<span>{p.name}</span>
\t\t\t\t\t\t\t<span className="w-[6px] h-[6px] rounded-full" style={{background: '#10b981'}} />
\t\t\t\t\t\t</button>
\t\t\t\t\t))}
\t\t\t\t\t<div className="ml-auto flex gap-[6px]">
\t\t\t\t\t\t<button onClick={handleOpenModal}
\t\t\t\t\t\t\tclassName="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white border-none transition-all"
\t\t\t\t\t\t\tstyle={{background: 'linear-gradient(135deg,#b45309,#d97706)'}}>
\t\t\t\t\t\t\t<span className="material-symbols-outlined" style={{fontSize:16}}>add</span>
\t\t\t\t\t\t\tNovo
\t\t\t\t\t\t</button>
\t\t\t\t\t</div>
\t\t\t\t</div>

\t\t\t\t{/* Timeline */}
\t\t\t\t<div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: 'thin' }}>
\t\t\t\t\t{loadingApts ? (
\t\t\t\t\t\t<div className="flex items-center justify-center h-40 text-white/20">
\t\t\t\t\t\t\t<span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Carregando...
\t\t\t\t\t\t</div>
\t\t\t\t\t) : (
\t\t\t\t\t\t<>
\t\t\t\t\t\t{/* Current time indicator */}
\t\t\t\t\t\t{currentDate === dateString && (
\t\t\t\t\t\t\t<div className="relative h-[2px] bg-red-500 ml-14 shadow-[0_0_10px_rgba(239,68,68,0.5)] my-1">
\t\t\t\t\t\t\t\t<span className="absolute -left-14 -top-[7px] text-[9px] font-black text-red-500 tracking-wider">AGORA</span>
\t\t\t\t\t\t\t\t<span className="absolute -left-[6px] -top-1 w-[10px] h-[10px] rounded-full bg-red-500"/>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t)}
\t\t\t\t\t\t{timeSlots.map(slot => {
\t\t\t\t\t\t\tconst slotH = parseInt(slot.split(':')[0]);
\t\t\t\t\t\t\tconst aptsInSlot = filteredAppts.filter(a => parseInt(a.startHour) === slotH);
\t\t\t\t\t\t\treturn (
\t\t\t\t\t\t\t\t<div key={slot} className="flex items-stretch min-h-[72px] border-b border-dashed border-white/[0.03]">
\t\t\t\t\t\t\t\t\t<div className="w-14 text-[11px] font-bold text-white/15 pt-3 flex-shrink-0">{slot}</div>
\t\t\t\t\t\t\t\t\t<div className="flex-1 py-[6px]">
\t\t\t\t\t\t\t\t\t\t{aptsInSlot.length === 0 ? (
\t\t\t\t\t\t\t\t\t\t\t<div className="text-[10px] text-white/[0.08] font-medium pt-3">Disponível</div>
\t\t\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t\t\taptsInSlot.map(apt => {
\t\t\t\t\t\t\t\t\t\t\t\tconst color = getColorForAppt(apt);
\t\t\t\t\t\t\t\t\t\t\t\tconst statusBadge = apt.status === 'pago' ? {bg:'rgba(16,185,129,0.1)',color:'#10b981',text:'✓ Concluído'} :
\t\t\t\t\t\t\t\t\t\t\t\t\tapt.status === 'em_atendimento' ? {bg:'rgba(99,102,241,0.1)',color:'#818cf8',text:'● Em Atendimento'} :
\t\t\t\t\t\t\t\t\t\t\t\t\tapt.status === 'confirmed' ? {bg:'rgba(16,185,129,0.1)',color:'#10b981',text:'✓ Confirmado'} :
\t\t\t\t\t\t\t\t\t\t\t\t\t{bg:'rgba(245,158,11,0.1)',color:'#f59e0b',text:'● Pendente'};
\t\t\t\t\t\t\t\t\t\t\t\tconst svc = services.find(s => s.title === apt.service);
\t\t\t\t\t\t\t\t\t\t\t\treturn (
\t\t\t\t\t\t\t\t\t\t\t\t\t<div key={apt.id} className="bg-[rgba(31,41,55,0.4)] border border-white/[0.04] rounded-[14px] p-[14px_16px] cursor-pointer transition-all hover:translate-x-1 hover:bg-[rgba(31,41,55,0.6)] hover:border-white/[0.08] group mb-2" style={{borderLeftWidth:3,borderLeftColor:color}}>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div className="flex justify-between items-start">
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div className="text-sm font-extrabold">{apt.clientName}</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div className="text-[11px] text-amber-600 font-semibold mt-[3px]">{apt.service}</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<span className="text-[9px] font-extrabold uppercase tracking-[1.5px] py-1 px-[10px] rounded-full" style={{background:statusBadge.bg,color:statusBadge.color}}>{statusBadge.text}</span>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div className="flex gap-4 mt-[10px] items-center">
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<span className="text-[10px] font-semibold text-white/30 flex items-center gap-1"><span className="material-symbols-outlined" style={{fontSize:14}}>schedule</span>{apt.durationMinutes}min</span>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<span className="text-[10px] font-semibold text-white/30 flex items-center gap-1"><span className="material-symbols-outlined" style={{fontSize:14}}>payments</span>R$ {svc?.price.toFixed(2) || '0'}</span>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t{/* Action buttons on hover */}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t{apt.status === 'pending' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'confirmed')}} className="w-7 h-7 rounded-lg border border-white/[0.08] bg-black/30 text-white/50 flex items-center justify-center hover:bg-amber-700/20 hover:border-amber-700 hover:text-white transition-all"><span className="material-symbols-outlined" style={{fontSize:14}}>check</span></button>}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t{apt.status === 'confirmed' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'em_atendimento')}} className="w-7 h-7 rounded-lg border border-white/[0.08] bg-black/30 text-white/50 flex items-center justify-center hover:bg-green-700/20 hover:border-green-600 hover:text-white transition-all"><span className="material-symbols-outlined" style={{fontSize:14}}>play_arrow</span></button>}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t{apt.status === 'em_atendimento' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'pago')}} className="w-7 h-7 rounded-lg border border-white/[0.08] bg-black/30 text-white/50 flex items-center justify-center hover:bg-green-700/20 hover:border-green-600 hover:text-white transition-all"><span className="material-symbols-outlined" style={{fontSize:14}}>check_circle</span></button>}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<button onClick={(e) => {e.stopPropagation(); startReschedule(apt)}} className="w-7 h-7 rounded-lg border border-white/[0.08] bg-black/30 text-white/50 flex items-center justify-center hover:bg-amber-700/20 hover:border-amber-700 hover:text-white transition-all"><span className="material-symbols-outlined" style={{fontSize:14}}>edit</span></button>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<button onClick={(e) => {e.stopPropagation(); handleCancel(apt)}} className="w-7 h-7 rounded-lg border border-white/[0.08] bg-black/30 text-white/50 flex items-center justify-center hover:bg-red-700/20 hover:border-red-600 hover:text-white transition-all"><span className="material-symbols-outlined" style={{fontSize:14}}>close</span></button>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t\t);
\t\t\t\t\t\t\t\t\t\t\t})
\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t);
\t\t\t\t\t\t})}
\t\t\t\t\t\t</>
\t\t\t\t\t)}
\t\t\t\t</div>
\t\t\t</div>

\t\t\t{/* ========= RIGHT PANEL: STATS ========= */}
\t\t\t<div className="border-l border-white/[0.04] flex flex-col gap-3 p-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
\t\t\t\t{/* Appointments Today */}
\t\t\t\t<div className={\`rounded-2xl p-[18px] \${GLASS}\`}>
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/25 uppercase tracking-[2px]">Agendamentos Hoje</div>
\t\t\t\t\t<div className="text-[26px] font-black mt-[6px] tracking-tight">{totalAppts}</div>
\t\t\t\t\t<div className="text-[10px] font-bold text-emerald-500 mt-1">↑ vs ontem</div>
\t\t\t\t\t<div className="h-[5px] bg-white/[0.04] rounded-full mt-[10px] overflow-hidden"><div className="h-full rounded-full" style={{width:\`\${Math.min(occupancyRate,100)}%\`,background:'linear-gradient(90deg,#10b981,#34d399)'}}/></div>
\t\t\t\t</div>

\t\t\t\t{/* Revenue */}
\t\t\t\t<div className={\`rounded-2xl p-[18px] \${GLASS}\`}>
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/25 uppercase tracking-[2px]">Receita Estimada</div>
\t\t\t\t\t<div className="text-[26px] font-black mt-[6px] tracking-tight text-emerald-500">R$ {totalRevenue.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div>
\t\t\t\t</div>

\t\t\t\t{/* Occupancy */}
\t\t\t\t<div className={\`rounded-2xl p-[18px] \${GLASS}\`}>
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/25 uppercase tracking-[2px]">Taxa de Ocupação</div>
\t\t\t\t\t<div className="text-[26px] font-black mt-[6px] tracking-tight text-amber-500">{occupancyRate}%</div>
\t\t\t\t\t<div className="h-[5px] bg-white/[0.04] rounded-full mt-[10px] overflow-hidden"><div className="h-full rounded-full" style={{width:\`\${Math.min(occupancyRate,100)}%\`,background:'linear-gradient(90deg,#b45309,#d97706)'}}/></div>
\t\t\t\t</div>

\t\t\t\t{/* Next Appointment Countdown */}
\t\t\t\t{upcomingAppts.length > 0 && (
\t\t\t\t\t<div className="rounded-2xl p-[18px] border border-amber-700/15" style={{background:'linear-gradient(135deg,rgba(180,83,9,0.12),rgba(180,83,9,0.04))'}}>
\t\t\t\t\t\t<div className="text-[9px] font-extrabold text-amber-700 uppercase tracking-[2px]">Próximo Atendimento</div>
\t\t\t\t\t\t<div className="text-[22px] font-black text-amber-500 mt-[6px]">{upcomingAppts[0].startHour}:{upcomingAppts[0].startMinute}</div>
\t\t\t\t\t\t<div className="text-[13px] font-bold mt-[10px]">{upcomingAppts[0].clientName}</div>
\t\t\t\t\t\t<div className="text-[11px] text-white/40 mt-[2px]">{upcomingAppts[0].service} • {upcomingAppts[0].professionalName}</div>
\t\t\t\t\t</div>
\t\t\t\t)}

\t\t\t\t{/* Quick Actions */}
\t\t\t\t<div className={\`rounded-2xl p-[18px] \${GLASS}\`}>
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/25 uppercase tracking-[2px] mb-2">Ações Rápidas</div>
\t\t\t\t\t<div className="grid grid-cols-2 gap-2">
\t\t\t\t\t\t<button onClick={handleOpenModal} className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
\t\t\t\t\t\t\t<div className="text-lg text-amber-500">📋</div>
\t\t\t\t\t\t\t<div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Agendar</div>
\t\t\t\t\t\t</button>
\t\t\t\t\t\t<button className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
\t\t\t\t\t\t\t<div className="text-lg text-amber-500">🔄</div>
\t\t\t\t\t\t\t<div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Reagendar</div>
\t\t\t\t\t\t</button>
\t\t\t\t\t\t<button className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
\t\t\t\t\t\t\t<div className="text-lg text-amber-500">📊</div>
\t\t\t\t\t\t\t<div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Relatório</div>
\t\t\t\t\t\t</button>
\t\t\t\t\t\t<button className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
\t\t\t\t\t\t\t<div className="text-lg text-amber-500">⚙️</div>
\t\t\t\t\t\t\t<div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">Config</div>
\t\t\t\t\t\t</button>
\t\t\t\t\t</div>
\t\t\t\t</div>

\t\t\t\t{/* Live Activity Feed */}
\t\t\t\t<div className={\`rounded-2xl p-[18px] \${GLASS}\`}>
\t\t\t\t\t<div className="text-[9px] font-extrabold text-white/20 uppercase tracking-[2px] mb-3 flex items-center gap-2">
\t\t\t\t\t\t<span className="w-[6px] h-[6px] rounded-full bg-red-500 animate-pulse"/>
\t\t\t\t\t\tAtividade em Tempo Real
\t\t\t\t\t</div>
\t\t\t\t\t{appointments.filter(a => a.status === 'pago').slice(0, 3).map(a => (
\t\t\t\t\t\t<div key={a.id+'f'} className="flex gap-[10px] py-2 border-b border-white/[0.03]">
\t\t\t\t\t\t\t<div className="w-[7px] h-[7px] rounded-full mt-1 flex-shrink-0 bg-emerald-500"/>
\t\t\t\t\t\t\t<div>
\t\t\t\t\t\t\t\t<div className="text-[10px] font-medium text-white/45"><strong className="text-white font-bold">{a.professionalName}</strong> finalizou <strong className="text-white font-bold">{a.clientName}</strong></div>
\t\t\t\t\t\t\t\t<div className="text-[9px] text-white/15 mt-[2px] font-semibold">{a.service}</div>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t))}
\t\t\t\t\t{appointments.filter(a => a.status === 'confirmed').slice(0, 2).map(a => (
\t\t\t\t\t\t<div key={a.id+'c'} className="flex gap-[10px] py-2 border-b border-white/[0.03]">
\t\t\t\t\t\t\t<div className="w-[7px] h-[7px] rounded-full mt-1 flex-shrink-0 bg-amber-500"/>
\t\t\t\t\t\t\t<div>
\t\t\t\t\t\t\t\t<div className="text-[10px] font-medium text-white/45"><strong className="text-white font-bold">{a.clientName}</strong> confirmou às {a.startHour}:{a.startMinute}</div>
\t\t\t\t\t\t\t\t<div className="text-[9px] text-white/15 mt-[2px] font-semibold">{a.service}</div>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t))}
\t\t\t\t\t{appointments.filter(a => a.status === 'cancelled').slice(0, 1).map(a => (
\t\t\t\t\t\t<div key={a.id+'x'} className="flex gap-[10px] py-2 border-b border-white/[0.03]">
\t\t\t\t\t\t\t<div className="w-[7px] h-[7px] rounded-full mt-1 flex-shrink-0 bg-red-500"/>
\t\t\t\t\t\t\t<div>
\t\t\t\t\t\t\t\t<div className="text-[10px] font-medium text-white/45"><strong className="text-white font-bold">{a.clientName}</strong> cancelou {a.service}</div>
\t\t\t\t\t\t\t\t<div className="text-[9px] text-white/15 mt-[2px] font-semibold">{a.startHour}:{a.startMinute}</div>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t))}
\t\t\t\t</div>
\t\t\t</div>
\t\t</div>

\t\t{/* ===== MODALS (kept from original) ===== */}
\t\t{/* CANCEL MODAL */}
\t\t{isCancelModalOpen && (
\t\t\t<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
\t\t\t\t<div className="bg-[#1f2937] p-6 rounded-2xl shadow-2xl w-[90%] max-w-md border border-white/10">
\t\t\t\t\t<h3 className="text-xl font-bold text-white mb-2">Cancelar Agendamento</h3>
\t\t\t\t\t<p className="text-sm text-white/50 mb-4">Por favor, informe o motivo do cancelamento.</p>
\t\t\t\t\t<textarea value={cancelJustification} onChange={(e) => setCancelJustification(e.target.value)} placeholder="Ex: Cliente teve imprevisto..." className="w-full p-3 rounded-xl border border-white/10 bg-[#111827] mb-4 min-h-[100px] focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm text-white" autoFocus/>
\t\t\t\t\t<div className="flex gap-2 justify-end">
\t\t\t\t\t\t<button onClick={() => { setIsCancelModalOpen(false); setCancelJustification(''); }} className="px-4 py-2 text-white/50 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-sm font-bold">Voltar</button>
\t\t\t\t\t\t<button onClick={() => { if (appointmentToCancel) { handleUpdateStatus(appointmentToCancel.id, 'cancelled'); setIsCancelModalOpen(false); setCancelJustification(''); setAppointmentToCancel(null); }}} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2">
\t\t\t\t\t\t\t<span className="material-symbols-outlined text-sm">cancel</span>Confirmar Cancelamento
\t\t\t\t\t\t</button>
\t\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t</div>
\t\t)}

\t\t{/* NEW APPOINTMENT WIZARD MODAL */}
\t\t{isModalOpen && (
\t\t\t<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
\t\t\t\t<div className="bg-[#1f2937] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
\t\t\t\t\t<div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111827]">
\t\t\t\t\t\t<div>
\t\t\t\t\t\t\t<h2 className="text-xl font-bold text-white flex items-center gap-2">
\t\t\t\t\t\t\t\t<span className="material-symbols-outlined text-amber-500">calendar_add_on</span>
\t\t\t\t\t\t\t\tNovo Agendamento
\t\t\t\t\t\t\t</h2>
\t\t\t\t\t\t\t<p className="text-sm text-white/50">Passo {wizardStep} de 4</p>
\t\t\t\t\t\t</div>
\t\t\t\t\t\t<button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-red-500 transition-colors">
\t\t\t\t\t\t\t<span className="material-symbols-outlined">close</span>
\t\t\t\t\t\t</button>
\t\t\t\t\t</div>
\t\t\t\t\t<div className="flex h-1 w-full bg-[#111827]">
\t\t\t\t\t\t<div className="transition-all duration-300" style={{width:\`\${(wizardStep/4)*100}%\`,background:'linear-gradient(90deg,#b45309,#d97706)'}}/>
\t\t\t\t\t</div>
\t\t\t\t\t<div className="p-6 overflow-y-auto flex-1">
\t\t\t\t\t\t{wizardStep === 1 && renderStep1()}
\t\t\t\t\t\t{wizardStep === 2 && renderStep2()}
\t\t\t\t\t\t{wizardStep === 3 && renderStep3()}
\t\t\t\t\t\t{wizardStep === 4 && renderStep4()}
\t\t\t\t\t</div>
\t\t\t\t\t<div className="p-6 border-t border-white/10 bg-[#111827] flex justify-between gap-3">
\t\t\t\t\t\t<button onClick={() => setWizardStep(prev => Math.max(1, prev - 1))} className={\`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all \${wizardStep === 1 ? 'opacity-0 pointer-events-none' : 'text-white/50 bg-white/5 border border-white/10 hover:border-white/20'}\`}>
\t\t\t\t\t\t\t<span className="material-symbols-outlined text-lg">arrow_back</span>Voltar
\t\t\t\t\t\t</button>
\t\t\t\t\t\t{wizardStep < 4 ? (
\t\t\t\t\t\t\t<button onClick={() => setWizardStep(prev => prev + 1)} disabled={(wizardStep === 1 && !selectedClient) || (wizardStep === 2 && !selectedProfessional) || (wizardStep === 3 && !selectedService)} className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 text-white" style={{background:'linear-gradient(135deg,#b45309,#d97706)'}}>
\t\t\t\t\t\t\t\tContinuar<span className="material-symbols-outlined text-lg">arrow_forward</span>
\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t<button onClick={handleConfirmAppointment} disabled={!selectedTimeSlot || !!timeError} className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95">
\t\t\t\t\t\t\t\t{isRescheduling ? 'Confirmar Reagendamento' : 'Confirmar Agendamento'}<span className="material-symbols-outlined text-lg">check_circle</span>
\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t)}
\t\t\t\t\t</div>
\t\t\t\t</div>
\t\t\t</div>
\t\t)}

\t\t{/* Error Modal */}
\t\t{errorModalState.isOpen && (
\t\t\t<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
\t\t\t\t<div className="bg-[#1f2937] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 flex flex-col items-center p-8 text-center">
\t\t\t\t\t<div className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center mb-6 shadow-lg">
\t\t\t\t\t\t<span className="material-symbols-outlined text-4xl">error</span>
\t\t\t\t\t</div>
\t\t\t\t\t<h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">ERRO</h3>
\t\t\t\t\t<p className="text-white/50 text-sm font-medium mb-8">{errorModalState.message}</p>
\t\t\t\t\t<button onClick={() => setErrorModalState({ isOpen: false, message: '' })} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">Entendi</button>
\t\t\t\t</div>
\t\t\t</div>
\t\t)}
\t</div>
\t);
`;

const newContent = beforeReturn + newReturn + '\n};\n\n' + afterExport;
fs.writeFileSync('screens/DetailedAgenda.tsx', newContent);
console.log('Full rewrite complete! File saved.');
