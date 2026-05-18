import React, { useState, useEffect, useRef } from 'react';

interface StaffMember {
    id: string;
    name: string;
    avatar?: string | null;
}

type StatusType = 'working' | 'off' | 'vacation' | 'sick' | 'lunch';

interface AvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMembers: StaffMember[];
    initialStaffId?: string;
    persistedExceptions?: Record<string, Record<string, any>>;
    onSave: (data: any) => void;
}

// --- SUB-COMPONENT: ANALOG TIME PICKER ---
const AnalogTimePicker: React.FC<{
    value: string;
    onChange: (val: string) => void;
    label: string;
}> = ({ value, onChange, label }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const clockRef = useRef<HTMLDivElement>(null);

    const [hours, minutes] = value ? value.split(':').map(Number) : [0, 0];

    const handleSelect = (val: number) => {
        if (mode === 'hours') {
            const newTime = `${String(val).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            onChange(newTime);
            setMode('minutes');
        } else {
            const newTime = `${String(hours).padStart(2, '0')}:${String(val).padStart(2, '0')}`;
            onChange(newTime);
        }
    };

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPicker(false);
        setMode('hours');
    };

    // Dragging Logic
    const calculateValueFromCoords = (e: React.MouseEvent | MouseEvent) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        if (mode === 'hours') {
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hour = Math.round(angle / 30) % 12 || 12;
            if (dist < 75) {
                handleSelect((hour + 12) % 24);
            } else {
                handleSelect(hour);
            }
        } else {
            const min = Math.round(angle / 6) % 60;
            handleSelect(min);
        }
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isDragging) calculateValueFromCoords(e);
        };
        const handleGlobalMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging]);

    const renderClock = () => {
        const center = 110;
        const outerRadius = 88;
        const innerRadius = 60;
        const minuteRadius = 88;
        const currentRadius = mode === 'hours' ? (hours > 0 && hours <= 12 ? outerRadius : innerRadius) : minuteRadius;

        return (
            <div ref={clockRef} onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); calculateValueFromCoords(e); }} className="relative w-[220px] h-[220px] bg-[#1e293b] rounded-full border border-white/10 shadow-2xl p-4 select-none cursor-pointer">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full z-30"></div>
                <div className="absolute top-1/2 left-1/2 w-px bg-amber-500 z-10 transition-all duration-300 origin-bottom pointer-events-none" style={{ height: `${currentRadius}px`, transform: `translateX(-50%) translateY(-100%) rotate(${mode === 'hours' ? (hours % 12 * 30) : (minutes * 6)}deg)` }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-500 z-20 box-border shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                </div>
                {mode === 'hours' ? (
                    <>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                            const angle = (num * 30 - 90) * (Math.PI / 180);
                            const x = center + outerRadius * Math.cos(angle);
                            const y = center + outerRadius * Math.sin(angle);
                            return <div key={num} className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[10px] font-black z-20 flex items-center justify-center pointer-events-none ${hours === num ? 'text-black' : 'text-slate-400'}`} style={{ left: `${x}px`, top: `${y}px` }}>{num}</div>;
                        })}
                        {Array.from({ length: 12 }, (_, i) => (i + 13) % 24).map((num, i) => {
                            const angle = ((i + 1) * 30 - 90) * (Math.PI / 180);
                            const x = center + innerRadius * Math.cos(angle);
                            const y = center + innerRadius * Math.sin(angle);
                            return <div key={num} className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[9px] font-bold z-20 flex items-center justify-center pointer-events-none ${hours === num ? 'text-black' : 'text-slate-500'}`} style={{ left: `${x}px`, top: `${y}px` }}>{String(num).padStart(2, '0')}</div>;
                        })}
                    </>
                ) : (
                    Array.from({ length: 12 }, (_, i) => i * 5).map(num => {
                        const angle = (num * 6 - 90) * (Math.PI / 180);
                        const x = center + minuteRadius * Math.cos(angle);
                        const y = center + minuteRadius * Math.sin(angle);
                        return <div key={num} className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[10px] font-black z-20 flex items-center justify-center pointer-events-none ${minutes === num ? 'text-black' : 'text-slate-400'}`} style={{ left: `${x}px`, top: `${y}px` }}>{String(num).padStart(2, '0')}</div>;
                    })
                )}
            </div>
        );
    };

    return (
        <div className="relative flex-1" ref={containerRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{label}</label>
            <div 
                onClick={() => { setShowPicker(true); setMode('hours'); }}
                className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-colors"
            >
                <span>{value || '--:--'}</span>
                <span className="material-symbols-outlined text-amber-500 text-lg">schedule</span>
            </div>

            {showPicker && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowPicker(false)}>
                    <div className="bg-[#0f172a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#1e293b] p-8 flex flex-col items-center gap-1 border-b border-white/5">
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">{mode === 'hours' ? 'Selecionar Horas' : 'Selecionar Minutos'}</div>
                            <div className="flex items-center gap-3">
                                <span className={`text-5xl font-black transition-colors ${mode === 'hours' ? 'text-amber-500' : 'text-white'}`}>{String(hours).padStart(2, '0')}</span>
                                <span className="text-5xl font-black text-slate-700">:</span>
                                <span className={`text-5xl font-black transition-colors ${mode === 'minutes' ? 'text-amber-500' : 'text-white'}`}>{String(minutes).padStart(2, '0')}</span>
                            </div>
                        </div>
                        <div className="p-10 flex flex-col items-center gap-10">
                            {renderClock()}
                            <div className="flex flex-col gap-6 w-full">
                                <div className="flex justify-center gap-10">
                                    <button onClick={() => setMode('hours')} className={`text-xs font-black uppercase tracking-widest transition-all ${mode === 'hours' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Horas</button>
                                    <button onClick={() => setMode('minutes')} className={`text-xs font-black uppercase tracking-widest transition-all ${mode === 'minutes' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>Minutos</button>
                                </div>
                                <button onClick={handleConfirm} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.3)] transition-all active:scale-95">Confirmar Horário</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose, staffMembers, initialStaffId, persistedExceptions, onSave }) => {
    if (!isOpen) return null;

    const [selectedStaffId, setSelectedStaffId] = useState(initialStaffId || staffMembers[0]?.id);
    const [viewDate, setViewDate] = useState(new Date());
    const [rangeStart, setRangeStart] = useState<string | null>(null);
    const [rangeEnd, setRangeEnd] = useState<string | null>(null);
    const [type, setType] = useState<StatusType>('off');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [exceptions, setExceptions] = useState<Record<string, any>>({});

    useEffect(() => {
        if (selectedStaffId && persistedExceptions && persistedExceptions[selectedStaffId]) {
            setExceptions(persistedExceptions[selectedStaffId]);
        } else {
            setExceptions({});
        }
    }, [selectedStaffId, persistedExceptions]);

    const handleDateClick = (dateStr: string) => {
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(dateStr);
            setRangeEnd(null);
        } else {
            if (new Date(dateStr) < new Date(rangeStart)) {
                setRangeStart(dateStr);
                setRangeEnd(null);
            } else {
                setRangeEnd(dateStr);
            }
        }
    };

    const handleSaveEntry = () => {
        if (!rangeStart) return;
        const newExceptions = { ...exceptions };
        let start = new Date(rangeStart + 'T12:00:00');
        let end = rangeEnd ? new Date(rangeEnd + 'T12:00:00') : start;
        const current = new Date(start);
        while (current <= end) {
            const dateKey = current.toISOString().split('T')[0];
            newExceptions[dateKey] = { type, start_time: startTime || null, end_time: endTime || null, notes };
            current.setDate(current.getDate() + 1);
        }
        setExceptions(newExceptions);
        setRangeStart(null); setRangeEnd(null); setStartTime(''); setEndTime(''); setNotes('');
    };

    const handleRemoveEntry = (date: string) => {
        const newExceptions = { ...exceptions };
        delete newExceptions[date];
        setExceptions(newExceptions);
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDay = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getFirstDay(year, month);
        const padding = Array(startDay).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                    <div key={d} className="text-slate-500 font-black py-2 text-[10px] uppercase tracking-widest">{d}</div>
                ))}
                {padding.map((_, i) => <div key={`pad-${i}`}></div>)}
                {days.map(day => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const entry = exceptions[dateStr];
                    const isStart = rangeStart === dateStr;
                    const isEnd = rangeEnd === dateStr;
                    const isInRange = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd;
                    const isSelected = isStart || isEnd || isInRange;
                    let statusDot = entry ? <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${entry.type === 'vacation' ? 'bg-purple-500' : entry.type === 'sick' ? 'bg-red-500' : entry.type === 'lunch' ? 'bg-orange-500' : 'bg-slate-400'}`}></div> : null;

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(dateStr)}
                            className={`relative h-10 w-full rounded-xl flex items-center justify-center transition-all border ${
                                isSelected ? 'bg-amber-500 text-black font-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/10'
                            } ${isStart ? 'rounded-r-none' : ''} ${isEnd ? 'rounded-l-none' : ''} ${isInRange ? 'rounded-none' : ''}`}
                        >
                            {day}
                            {!isSelected && statusDot}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0f172a] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[750px]">
                <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-[#1e293b]/30">
                    <div><h2 className="text-2xl font-black text-white tracking-tighter uppercase">Gestão de Disponibilidade</h2><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Configuração de escalas e afastamentos</p></div>
                    <div className="flex items-center gap-4">
                        <div className="text-right mr-4"><p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Colaborador</p><select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} className="bg-transparent border-none text-white font-bold text-sm p-0 focus:ring-0 cursor-pointer text-right appearance-none">{staffMembers.map(s => <option key={s.id} value={s.id} className="bg-[#0f172a]">{s.name}</option>)}</select></div>
                        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"><span className="material-symbols-outlined">close</span></button>
                    </div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-[45%] p-10 border-r border-white/5 flex flex-col">
                        <div className="flex justify-between items-center mb-8"><h3 className="text-sm font-black text-white uppercase tracking-widest">Calendário</h3><div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5"><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="size-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white"><span className="material-symbols-outlined text-sm">chevron_left</span></button><span className="text-[10px] font-black text-white uppercase tracking-widest w-32 text-center">{viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="size-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white"><span className="material-symbols-outlined text-sm">chevron_right</span></button></div></div>
                        <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5">{renderCalendar()}</div>
                        <div className="mt-8 flex-1 overflow-y-auto custom-scrollbar pr-2"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Afastamentos Registrados</h4><div className="space-y-3">{Object.entries(exceptions).sort().map(([date, data]: [string, any]) => (<div key={date} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-all"><div className="flex items-center gap-4"><div className={`size-2 rounded-full ${data.type === 'vacation' ? 'bg-purple-500' : data.type === 'sick' ? 'bg-red-500' : data.type === 'lunch' ? 'bg-orange-500' : 'bg-slate-400'}`}></div><div><p className="text-sm font-bold text-white">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</p><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.type === 'off' ? 'Folga' : data.type === 'vacation' ? 'Férias' : data.type === 'sick' ? 'Atestado' : 'Almoço'} {data.start_time && ` • ${data.start_time} - ${data.end_time}`}</p></div></div><button onClick={() => handleRemoveEntry(date)} className="opacity-0 group-hover:opacity-100 size-8 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><span className="material-symbols-outlined text-lg">delete</span></button></div>))}</div></div>
                    </div>
                    <div className="flex-1 px-10 py-6 flex flex-col bg-[#0f172a] relative overflow-hidden">
                        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"></div>
                        <div className="mb-4"><h3 className="text-xl font-black text-white uppercase tracking-tight">Detalhes do Registro</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{rangeStart ? (<>Selecionado: {new Date(rangeStart + 'T12:00:00').toLocaleDateString('pt-BR')} {rangeEnd && ` até ${new Date(rangeEnd + 'T12:00:00').toLocaleDateString('pt-BR')}`}</>) : 'Selecione um período no calendário'}</p></div>
                        <div className="space-y-4 flex-1 pr-2">
                            <div><label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 block">Tipo de Indisponibilidade</label><div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{[{ id: 'off', label: 'Folga', icon: 'event_busy' }, { id: 'vacation', label: 'Férias', icon: 'flight_takeoff' }, { id: 'sick', label: 'Atestado', icon: 'medical_services' }, { id: 'lunch', label: 'Almoço', icon: 'restaurant' }].map(opt => (<button key={opt.id} onClick={() => setType(opt.id as any)} className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all ${type === opt.id ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}><span className="material-symbols-outlined text-xl">{opt.icon}</span><span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span></button>))}</div></div>
                            <div className="flex gap-4"><AnalogTimePicker label="Hora Inicial" value={startTime} onChange={setStartTime} /><AnalogTimePicker label="Hora Final" value={endTime} onChange={setEndTime} /></div>
                            <div className="flex-1 flex flex-col">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 block">Observações</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo do afastamento ou observações importantes..." className="w-full flex-1 bg-[#0f172a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none min-h-[160px] transition-all resize-none" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-4"><button onClick={handleSaveEntry} disabled={!rangeStart} className={`flex-1 px-8 py-4 rounded-2xl font-black transition-all active:scale-95 uppercase text-xs tracking-[0.2em] ${!rangeStart ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'text-black bg-amber-500 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}>Registrar Período</button><button onClick={() => onSave({ staffId: selectedStaffId, exceptions })} className="px-10 py-4 rounded-2xl font-black text-white bg-white/10 hover:bg-white/20 transition-all uppercase text-xs tracking-[0.2em]">Salvar Tudo</button></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
