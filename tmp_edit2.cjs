const fs = require('fs');
let c = fs.readFileSync('screens/DetailedAgenda.tsx', 'utf8');

// 1. New State and UseEffect replacements
// Find:
//  const [selectedProfFilter, setSelectedProfFilter] = useState('all');
// 
//  useEffect(() => {
//  if (!isPowerful && professionalId) {
//  setSelectedProfFilter(professionalId);
//  }
//  }, [isPowerful, professionalId]);

const oldStateRe = /const \[selectedProfFilter, setSelectedProfFilter\] = useState\('all'\);\s+useEffect\(\(\) => \{\s+if \(!isPowerful && professionalId\) \{\s+setSelectedProfFilter\(professionalId\);\s+\}\s+\}, \[isPowerful, professionalId\]\);/g;

const newStateStr = `const [selectedProfFilter, setSelectedProfFilter] = useState('all');
 const [statusFilter, setStatusFilter] = useState('all');
 const [selectedProfTab, setSelectedProfTab] = useState<string>('');

 useEffect(() => {
 if (!isPowerful && professionalId) {
 setSelectedProfFilter(professionalId);
 setSelectedProfTab(professionalId);
 }
 }, [isPowerful, professionalId]);

 useEffect(() => {
 if (professionals.length > 0 && !selectedProfTab) {
 setSelectedProfTab(professionals[0].id);
 }
 }, [professionals, selectedProfTab]);`;

if (oldStateRe.test(c)) {
  c = c.replace(oldStateRe, newStateStr);
  console.log('State replaced successfully.');
} else {
  console.log('State block not found or already replaced.');
}

// 2. Main return replace
// Find from " return (" up to "export default DetailedAgenda;"

const returnStartIdx = c.indexOf(" return (");
const exportStartIdx = c.lastIndexOf("\nexport default DetailedAgenda;");

if (returnStartIdx !== -1 && exportStartIdx !== -1) {
  const beforeReturn = c.substring(0, returnStartIdx);
  const afterExport = c.substring(exportStartIdx);

  const newReturnBlock = ` // --- COMPUTED VALUES FOR SPLIT TIMELINE++ ---
 const activeProfessional = professionals.find(p => p.id === selectedProfTab);
 const activeAppts = selectedProfTab ? (appointmentsByProf.get(selectedProfTab) || []) : [];
 const filteredAppts = activeAppts.filter(a => statusFilter === 'all' || a.status === statusFilter);
 const totalAppts = appointments.filter(a => a.status !== 'cancelled').length;
 const totalRevenue = appointments.filter(a => a.status !== 'cancelled').reduce((sum, a) => {
  const svc = services.find(s => s.title === a.service);
  return sum + (svc?.price || 0);
 }, 0);
 const occupancyRate = professionals.length > 0 ? Math.round((totalAppts / (professionals.length * 10)) * 100) : 0;

 const upcomingAppts = appointments
  .filter(a => a.status !== 'cancelled' && a.status !== 'pago')
  .sort((a, b) => (a.startHour + a.startMinute).localeCompare(b.startHour + b.startMinute))
  .slice(0, 5);

 const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const h = 7 + i;
  return h.toString().padStart(2, '0') + ':00';
 });

 const getColorForAppt = (apt: Appointment) => COLORS[apt.professionalName.charCodeAt(0) % COLORS.length];

 // Calendar helper
 const calDate = new Date(currentDate + 'T12:00:00');
 const calYear = calDate.getFullYear();
 const calMonth = calDate.getMonth();
 const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
 const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
 const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const calMonthName = monthNames[calMonth] + ' ' + calYear;
 const todayStr = new Date().toISOString().split('T')[0];

 return (
 <div className="flex h-full flex-col bg-transparent overflow-hidden text-white font-sans selection:bg-cyan-500/30">
  {/* 3-COLUMN SPLIT TIMELINE++ LAYOUT */}
  <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '260px 1fr 300px' }}>

   {/* ========= LEFT PANEL ========= */}
   <div className="border-r border-white/[0.04] flex flex-col overflow-y-auto p-5" style={{ scrollbarWidth: 'thin' }}>
    {/* Header */}
    <div className="pb-4 border-b border-white/[0.04] mb-4">
     <h1 className="text-xl font-black tracking-tight">Agenda</h1>
     <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[2px] mt-1">Visão Profissional • Tempo Real</p>
    </div>

    {/* Mini Calendar */}
    <div className="flex justify-between items-center mb-3">
     <h4 className="text-[13px] font-extrabold">{calMonthName}</h4>
     <div className="flex gap-1">
      <button onClick={() => { const d = new Date(calDate); d.setMonth(d.getMonth()-1); setCurrentDate(d.toISOString().split('T')[0]); }} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-transparent text-white/40 flex items-center justify-center hover:text-white transition-all">
       <span className="material-symbols-outlined" style={{fontSize:14}}>chevron_left</span>
      </button>
      <button onClick={() => { const d = new Date(calDate); d.setMonth(d.getMonth()+1); setCurrentDate(d.toISOString().split('T')[0]); }} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-transparent text-white/40 flex items-center justify-center hover:text-white transition-all">
       <span className="material-symbols-outlined" style={{fontSize:14}}>chevron_right</span>
      </button>
     </div>
    </div>
    <div className="grid grid-cols-7 gap-[2px] text-center mb-5">
     {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="text-[9px] font-bold text-white/20 uppercase py-1">{d}</div>)}
     {Array.from({length: firstDayOfWeek}).map((_,i)=> <div key={'e'+i}/>)}
     {Array.from({length: daysInMonth}, (_,i)=> {
      const day = i+1;
      const dayStr = \`\${calYear}-\${(calMonth+1).toString().padStart(2,'0')}-\${day.toString().padStart(2,'0')}\`;
      const isToday = dayStr === todayStr;
      const isSelected = dayStr === currentDate;
      return (
       <button key={day} onClick={() => setCurrentDate(dayStr)}
        className={\`text-[11px] font-semibold py-[7px] rounded-lg cursor-pointer transition-all \${isSelected ? 'bg-amber-700 text-white font-black shadow-lg shadow-amber-900/30' : isToday ? 'text-amber-500 font-bold ring-1 ring-amber-700' : 'text-white/35 hover:bg-white/[0.04] hover:text-white'}\`}>
        {day}
       </button>
      );
     })}
    </div>

    {/* Filter: Status */}
    <div className="mb-4">
     <div className="text-[9px] font-extrabold text-white/20 uppercase tracking-[2px] mb-2">Filtrar por Status</div>
     <div className="flex flex-wrap gap-[6px]">
      {[{v:'all',l:'Todos'},{v:'confirmed',l:'✓ Confirmados'},{v:'pending',l:'● Pendentes'},{v:'em_atendimento',l:'Em Atendimento'}].map(f => (
       <button key={f.v} onClick={() => setStatusFilter(f.v)}
        className={\`text-[10px] font-bold py-[5px] px-3 rounded-full border transition-all \${statusFilter===f.v ? 'bg-amber-700/15 border-amber-700 text-amber-500' : 'border-white/[0.06] text-white/40 hover:border-amber-700/30 hover:text-white'}\`}>
        {f.l}
       </button>
      ))}
     </div>
    </div>

    {/* Upcoming */}
    <div className="mt-2 text-left">
     <div className="text-[9px] font-extrabold text-white/20 uppercase tracking-[2px] mb-3">Próximos Atendimentos</div>
     {upcomingAppts.length === 0 && <p className="text-xs text-white/20">Nenhum agendamento</p>}
     {upcomingAppts.map(apt => (
      <div key={apt.id} className="flex items-center gap-3 p-[10px] rounded-xl border border-white/[0.03] mb-[6px] cursor-pointer transition-all hover:bg-amber-700/[0.04] hover:border-amber-700/15">
       <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: apt.status === 'confirmed' ? '#10b981' : apt.status === 'pending' ? '#f59e0b' : '#818cf8'}} />
       <div>
        <div className="text-xs font-bold">{apt.clientName}</div>
        <div className="text-[10px] text-white/30 font-medium mt-[2px]">{apt.startHour}:{apt.startMinute} — {apt.service}</div>
       </div>
      </div>
     ))}
    </div>
   </div>

   {/* ========= CENTER PANEL: TIMELINE ========= */}
   <div className="flex flex-col overflow-hidden bg-[#0A0F1C]">
    {/* Professional Tabs */}
    <div className="flex gap-1 px-6 py-3 border-b border-white/[0.04] overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
     {professionals.map((p, i) => (
      <button key={p.id} onClick={() => { setSelectedProfTab(p.id); setSelectedProfFilter(p.id); }}
       className={\`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all \${selectedProfTab === p.id ? 'bg-amber-700/10 border-amber-700/30 text-amber-500' : 'border-white/[0.04] text-white/40 hover:border-amber-700/20 hover:text-white'}\`}>
       <img src={p.avatar} alt="" className="w-6 h-6 rounded-lg object-cover"/>
       <span>{p.name}</span>
       <span className="w-[6px] h-[6px] rounded-full" style={{background: i % 2 === 0 ? '#10b981' : '#f59e0b'}} />
      </button>
     ))}
     <div className="ml-auto flex gap-[6px]">
      <button className="flex justify-center items-center w-8 h-8 rounded-lg border border-white/[0.06] text-white/40 hover:text-white transition-all"><span className="material-symbols-outlined" style={{fontSize: 18}}>search</span></button>
      <button onClick={handleOpenModal}
       className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white border-none shadow-lg transition-all hover:scale-105 active:scale-95"
       style={{background: 'linear-gradient(135deg,#b45309,#d97706)'}}>
       <span className="material-symbols-outlined text-sm">add</span>
       Novo
      </button>
     </div>
    </div>

    {/* Timeline */}
    <div className="flex-1 overflow-y-auto px-6 pb-6 relative" style={{ scrollbarWidth: 'thin' }}>
     {loadingApts ? (
      <div className="flex items-center justify-center h-40 text-white/20">
       <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Carregando...
      </div>
     ) : (
      <>
      {/* Current time indicator */}
      {currentDate === dateString && (
       <div className="absolute w-full h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20 pointer-events-none transition-all"
        style={{top: \`\${Math.max(0, ((new Date().getHours() - 7) * 72) + (new Date().getMinutes() / 60 * 72) + 16)}px\`}}>
        <span className="absolute -left-12 -top-[7px] text-[9px] font-black text-red-500 py-0.5 px-1.5 rounded-r bg-red-950/80">AGORA</span>
        <span className="absolute left-0 -top-[3px] w-[8px] h-[8px] rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"/>
       </div>
      )}
      <div className="pt-4">
      {timeSlots.map((slot, i) => {
       const slotH = parseInt(slot.split(':')[0]);
       const mAppts = filteredAppts.filter(a => parseInt(a.startHour) === slotH);
       return (
        <div key={slot} className="flex relative border-b border-dashed border-white/[0.03] min-h-[72px] pb-2 group">
         <div className="w-14 text-[11px] font-bold text-white/15 pt-2 flex-shrink-0 group-hover:text-white/30 transition-colors">{slot}</div>
         <div className="flex-1">
          {mAppts.length === 0 ? (
           <div className="text-[10px] text-white/[0.08] font-medium pt-2 pl-2 cursor-pointer hover:bg-white/[0.02] h-full rounded transition-all" onClick={() => { /* Quick add here later */ }}>Disponível</div>
          ) : (
           mAppts.map(apt => {
            const color = getColorForAppt(apt);
            const statusBadge = apt.status === 'pago' ? {bg:'rgba(16,185,129,0.1)',color:'#10b981',text:'✓ Concluído'} :
             apt.status === 'em_atendimento' ? {bg:'rgba(99,102,241,0.1)',color:'#818cf8',text:'● Em Atendimento'} :
             apt.status === 'confirmed' ? {bg:'rgba(16,185,129,0.1)',color:'#10b981',text:'✓ Confirmado'} :
             {bg:'rgba(245,158,11,0.1)',color:'#f59e0b',text:'● Pendente'};
            const svc = services.find(s => s.title === apt.service);
            
            // Calculate height/top for precise timeline if desired, using basic block flow for now
            return (
             <div key={apt.id} className="relative bg-[#1a2333] border border-white/[0.04] rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-1 hover:bg-[#1f2937] hover:border-white/[0.1] hover:shadow-xl group/card mb-2" style={{borderLeftWidth:3,borderLeftColor:color}}>
              <div className="flex justify-between items-start">
               <div>
                <div className="text-sm font-extrabold text-[#f3f4f6]">{apt.clientName}</div>
                <div className="text-[11px] text-amber-600 font-semibold mt-1">{apt.service}</div>
               </div>
               <span className="text-[9px] font-extrabold uppercase tracking-[1.5px] py-1 px-[10px] rounded-md" style={{background:statusBadge.bg,color:statusBadge.color}}>{statusBadge.text}</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
               <span className="text-[10px] font-semibold text-white/30 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>schedule</span>{apt.durationMinutes} min</span>
               <span className="text-[10px] font-semibold text-white/30 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>payments</span>R$ {svc?.price.toFixed(2) || '---'}</span>
               <span className="text-[10px] font-semibold text-white/30 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>call</span>{clients.find(c=>c.name===apt.clientName)?.phone || '(00) 0000-0000'}</span>
               
               {/* Quick actions on hover */}
               <div className="flex gap-1 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity">
                {apt.status === 'pending' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'confirmed')}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-400"><span className="material-symbols-outlined" style={{fontSize:15}}>check</span></button>}
                {apt.status === 'confirmed' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'em_atendimento')}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500 hover:text-indigo-400"><span className="material-symbols-outlined" style={{fontSize:15}}>play_arrow</span></button>}
                {apt.status === 'em_atendimento' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'pago')}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-400"><span className="material-symbols-outlined" style={{fontSize:15}}>check_circle</span></button>}
                <button onClick={(e) => {e.stopPropagation(); startReschedule(apt)}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-amber-600/20 hover:border-amber-600 hover:text-amber-400"><span className="material-symbols-outlined" style={{fontSize:15}}>edit</span></button>
                <button onClick={(e) => {e.stopPropagation(); handleCancel(apt)}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500 hover:text-red-400"><span className="material-symbols-outlined" style={{fontSize:15}}>close</span></button>
               </div>
              </div>
             </div>
            );
           })
          )}
         </div>
        </div>
       );
      })}
      </div>
      </>
     )}
    </div>
   </div>

   {/* ========= RIGHT PANEL: STATS ========= */}
   <div className="border-l border-white/[0.04] flex flex-col gap-4 p-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px]">Agendamentos Hoje</div>
     <div className="text-3xl font-black mt-2 tracking-tight">{totalAppts}</div>
     <div className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1"><span className="material-symbols-outlined" style={{fontSize:12}}>arrow_upward</span>20% vs ontem</div>
     <div className="h-[4px] bg-white/[0.04] rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full" style={{width:\`\${Math.min(occupancyRate,100)}%\`,background:'linear-gradient(90deg,#10b981,#34d399)'}}/></div>
    </div>

    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px]">Receita Estimada</div>
     <div className="text-3xl font-black mt-2 tracking-tight text-emerald-500">R$ {totalRevenue.toLocaleString('pt-BR')}</div>
     <div className="flex flex-col gap-1 mt-4 border-t border-white/[0.05] pt-3">
      <div className="flex justify-between items-center text-xs">
       <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span><span className="font-bold text-white/60">PIX</span></div>
       <span className="font-bold">R$ {Math.round(totalRevenue*0.5).toLocaleString('pt-BR')}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
       <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span className="font-bold text-white/60">Cartão</span></div>
       <span className="font-bold">R$ {Math.round(totalRevenue*0.3).toLocaleString('pt-BR')}</span>
      </div>
     </div>
    </div>

    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px]">Taxa de Ocupação</div>
     <div className="text-3xl font-black mt-2 tracking-tight text-amber-500">{occupancyRate}%</div>
     <div className="h-[4px] bg-white/[0.04] rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full" style={{width:\`\${Math.min(occupancyRate,100)}%\`,background:'linear-gradient(90deg,#b45309,#d97706)'}}/></div>
    </div>

    {upcomingAppts.length > 0 && (
     <div className="rounded-2xl p-[18px] border border-amber-700/20" style={{background:'linear-gradient(135deg,rgba(180,83,9,0.15),rgba(180,83,9,0.02))'}}>
      <div className="text-[9px] font-extrabold text-amber-600 uppercase tracking-[2px]">Próximo Atendimento</div>
      <div className="text-2xl font-black text-amber-500 mt-2">em 18 min</div>
      <div className="text-sm font-bold mt-2 text-white">{upcomingAppts[0].clientName}</div>
      <div className="text-xs text-white/50 mt-1">{upcomingAppts[0].service} • {upcomingAppts[0].startHour}:{upcomingAppts[0].startMinute}</div>
     </div>
    )}

    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px] mb-3">Ações Rápidas</div>
     <div className="grid grid-cols-2 gap-2">
      <button onClick={handleOpenModal} className="p-3 pb-2 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
       <span className="material-symbols-outlined text-amber-500" style={{fontSize:20}}>list_alt</span>
       <div className="text-[8px] font-bold text-white/50 uppercase tracking-[1px] mt-1 space-y-0 text-center leading-tight">Lista<br/>Espera</div>
      </button>
      <button className="p-3 pb-2 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
       <span className="material-symbols-outlined text-amber-500" style={{fontSize:20}}>update</span>
       <div className="text-[8px] font-bold text-white/50 uppercase tracking-[1px] mt-1 space-y-0 text-center leading-tight">Reagendar</div>
      </button>
      <button className="p-3 pb-2 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
       <span className="material-symbols-outlined text-amber-500" style={{fontSize:20}}>bar_chart</span>
       <div className="text-[8px] font-bold text-white/50 uppercase tracking-[1px] mt-1 space-y-0 text-center leading-tight">Relatório</div>
      </button>
      <button className="p-3 pb-2 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:border-amber-700/30 hover:bg-amber-700/[0.05] transition-all">
       <span className="material-symbols-outlined text-amber-500" style={{fontSize:20}}>settings</span>
       <div className="text-[8px] font-bold text-white/50 uppercase tracking-[1px] mt-1 space-y-0 text-center leading-tight">Config</div>
      </button>
     </div>
    </div>

    {/* Live Activity Feed */}
    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px] mb-4 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"/>
      Tempo Real
     </div>
     
     <style dangerouslySetInnerHTML={{__html: \`
      .feed-item { animation: feed-in 0.5s ease-out forwards; opacity: 0; }
      @keyframes feed-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
     \`}} />
     
     <div className="space-y-0">
      {appointments.filter(a => a.status === 'pago').slice(0, 1).map((a, i) => (
       <div key={a.id+'f'} className="flex gap-2.5 py-2.5 border-b border-white/[0.03] feed-item" style={{animationDelay: \`\${i*100}ms\`}}>
        <div className="w-[7px] h-[7px] rounded-full mt-[5px] flex-shrink-0 bg-emerald-500"/>
        <div>
         <div className="text-[10px] font-medium text-white/50 leading-[1.4]"><strong className="text-white">{a.professionalName}</strong> finalizou <strong className="text-white">{a.clientName}</strong></div>
         <div className="text-[9px] text-white/20 mt-0.5 font-bold">há 12 min</div>
        </div>
       </div>
      ))}
      {appointments.filter(a => a.status === 'confirmed').slice(0, 2).map((a, i) => (
       <div key={a.id+'c'} className="flex gap-2.5 py-2.5 border-b border-white/[0.03] feed-item" style={{animationDelay: \`\${(i+1)*100}ms\`}}>
        <div className="w-[7px] h-[7px] rounded-full mt-[5px] flex-shrink-0 bg-amber-500"/>
        <div>
         <div className="text-[10px] font-medium text-white/50 leading-[1.4]"><strong className="text-white">{a.clientName}</strong> confirmou às {a.startHour}:{a.startMinute}</div>
         <div className="text-[9px] text-white/20 mt-0.5 font-bold">há {20 + i*10} min</div>
        </div>
       </div>
      ))}
      {appointments.filter(a => a.status === 'cancelled').slice(0, 2).map((a, i) => (
       <div key={a.id+'x'} className="flex gap-2.5 py-2.5 border-b border-white/[0.03] feed-item" style={{animationDelay: \`\${(i+3)*100}ms\`}}>
        <div className="w-[7px] h-[7px] rounded-full mt-[5px] flex-shrink-0 bg-red-500"/>
        <div>
         <div className="text-[10px] font-medium text-white/50 leading-[1.4]"><strong className="text-white">{a.clientName}</strong> cancelou {a.service}</div>
         <div className="text-[9px] text-white/20 mt-0.5 font-bold">há {45 + i*15} min</div>
        </div>
       </div>
      ))}
     </div>
    </div>

   </div>
  </div>

  {/* ===== MODALS ===== */}
  {/* CANCEL MODAL */}
  {isCancelModalOpen && (
   <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl w-[90%] max-w-md animate-in zoom-in-95 border border-white/10 text-white">
     <h3 className="text-xl font-bold mb-2">Cancelar Agendamento</h3>
     <p className="text-sm text-white/50 mb-4">Por favor, informe o motivo do cancelamento.</p>
     <textarea value={cancelJustification} onChange={(e) => setCancelJustification(e.target.value)} placeholder="Ex: Cliente teve imprevisto, Profissional doente..." className="w-full p-4 rounded-xl border border-white/10 bg-[#0f172a] mb-5 min-h-[120px] focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm text-white" autoFocus />
     <div className="flex gap-3 justify-end">
      <button onClick={() => { setIsCancelModalOpen(false); setCancelJustification(''); }} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all">Voltar</button>
      <button onClick={() => { if (appointmentToCancel) { handleUpdateStatus(appointmentToCancel.id, 'cancelled'); setIsCancelModalOpen(false); setCancelJustification(''); setAppointmentToCancel(null); }}} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2">
       <span className="material-symbols-outlined text-sm">cancel</span>Confirmar Cancelamento
      </button>
     </div>
    </div>
   </div>
  )}

  {/* WIZARD MODAL */}
  {isModalOpen && (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
    <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/10 animate-in zoom-in-95 text-white">
     <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0f172a]">
      <div>
       <h2 className="text-xl font-bold flex items-center gap-2.5 text-white">
        <span className="material-symbols-outlined text-amber-500">calendar_add_on</span>Novo Agendamento
       </h2>
       <p className="text-sm text-white/50 mt-1">Passo {wizardStep} de 4</p>
      </div>
      <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
       <span className="material-symbols-outlined" style={{fontSize:20}}>close</span>
      </button>
     </div>
     <div className="flex h-1.5 w-full bg-[#0f172a]">
      <div className="transition-all duration-300" style={{width:\`\${(wizardStep/4)*100}%\`,background:'linear-gradient(90deg, #b45309, #f59e0b)'}}/>
     </div>
     <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
      {wizardStep === 1 && renderStep1()}
      {wizardStep === 2 && renderStep2()}
      {wizardStep === 3 && renderStep3()}
      {wizardStep === 4 && renderStep4()}
     </div>
     <div className="p-6 border-t border-white/10 bg-[#0f172a] flex justify-between gap-3">
      <button onClick={() => setWizardStep(prev => Math.max(1, prev - 1))} className={\`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all \${wizardStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white/5 hover:bg-white/10 border border-white/10'}\`}>
       <span className="material-symbols-outlined text-lg">arrow_back</span>Voltar
      </button>
      {wizardStep < 4 ? (
       <button onClick={() => setWizardStep(prev => prev + 1)} disabled={(wizardStep === 1 && !selectedClient) || (wizardStep === 2 && !selectedProfessional) || (wizardStep === 3 && !selectedService)} className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-900/20 transition-all active:scale-95 disabled:opacity-50 text-white" style={{background:'linear-gradient(135deg, #b45309, #d97706)'}}>
        Continuar<span className="material-symbols-outlined text-lg">arrow_forward</span>
       </button>
      ) : (
       <button onClick={handleConfirmAppointment} disabled={!selectedTimeSlot || !!timeError} className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all active:scale-95">
        {isRescheduling ? 'Confirmar Reagendamento' : 'Confirmar Agendamento'}<span className="material-symbols-outlined text-lg">check_circle</span>
       </button>
      )}
     </div>
    </div>
   </div>
  )}

  {/* ERROR MODAL */}
  {errorModalState.isOpen && (
   <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-500/20 flex flex-col items-center p-8 text-center animate-in zoom-in text-white">
     <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/20 text-red-500 flex items-center justify-center mb-6 shadow-inner ring-1 ring-red-500/30">
      <span className="material-symbols-outlined text-4xl">warning</span>
     </div>
     <h3 className="text-2xl font-black mb-2 uppercase tracking-tight text-white">Oops!</h3>
     <p className="text-white/60 text-sm font-medium mb-8 leading-relaxed max-w-[250px]">{errorModalState.message}</p>
     <button onClick={() => setErrorModalState({ isOpen: false, message: '' })} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/10">
      Entendi
     </button>
    </div>
   </div>
  )}
 </div>
 );
`;

  c = beforeReturn + newReturnBlock + afterExport;
  console.log('Return replaced successfully.');
} else {
  console.log('Error finding return/export indexes.');
}

fs.writeFileSync('screens/DetailedAgenda.tsx', c);
console.log('File written.');
