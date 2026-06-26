import React, { memo } from 'react';

export interface Appointment {
 id: string;
 clientName: string;
 clientId?: string;
 service: string;
 professionalId: string;
 professionalName: string;
 startHour: string;
 startMinute: string;
 endHour: string;
 endMinute: string;
 durationMinutes: number;
 status: 'confirmed' | 'pending' | 'cancelled' | 'noshow' | 'pago' | 'em_atendimento' | 'concluido';
 date: string; // YYYY-MM-DD
 servico_iniciado_at?: string;
 servico_terminado_at?: string;
}

interface AppointmentCardProps {
 apt: Appointment;
 onUpdateStatus: (id: string, status: Appointment['status']) => void;
 onReschedule: (apt: Appointment) => void;
 onCancel: (apt: Appointment) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = memo(({ apt, onUpdateStatus, onReschedule, onCancel }) => {
 return (
 <div
 className={`absolute left-5 right-2 rounded-2xl p-3 border-l-[6px] shadow-lg cursor-default transition-all hover:shadow-2xl z-10 group overflow-hidden
 ${apt.status === 'confirmed' || apt.status === 'pago' || apt.status === 'concluido' ? ' dark: dark: border-l-green-500/80 border-t border-r border-b border-cyan-100/50 dark:border-gray-700/50' :
 apt.status === 'pending' ? ' dark: dark: border-l-amber-500/80 border-amber-500/20' :
 'bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl border-l-gray-500'}
 `}
 style={{
 top: `${((parseInt(apt.startHour) - 5) * 120) + ((parseInt(apt.startMinute) / 60) * 120)}px`,
 height: `${(apt.durationMinutes / 60) * 120 - 8}px`
 }}
 >
 {/* Glass Shine Effect - Optimized: only render if pending or confirmed? kept for now but could be removed for perf */}
 <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-[45deg] /10 opacity-0 group-hover:animate-shine" />

 <div className="flex justify-between items-start relative z-10">
 <div className="font-bold text-sm text-slate-800/90 dark:text-gray-100 truncate pr-2">{apt.clientName}</div>
 <div className="flex gap-1">
 { (apt.status === 'confirmed' || apt.status === 'pago' || apt.status === 'concluido') && <span className="material-symbols-outlined text-green-500 text-xs">verified</span>}
 </div>
 </div>
 <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5 max-w-[75%]">{apt.service}</div>

 <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
 <div className="flex items-center gap-1 text-[10px] font-mono bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl dark:bg-black/30 px-1.5 py-0.5 rounded text-slate-500">
 <span className="material-symbols-outlined text-[10px]">schedule</span>
 {apt.startHour}:{apt.startMinute} - {apt.endHour}:{apt.endMinute}
 </div>

 <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity relative z-20">
 {/* PENDING ACTIONS: Confirm, Cancel */}
 {apt.status === 'pending' && (
 <>
 <button
 onClick={(e) => { e.stopPropagation(); onUpdateStatus(apt.id, 'confirmed'); }}
 className="group/btn relative p-1.5 hover:bg-green-500/10 dark:hover:bg-green-900/20 text-green-500 rounded-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
 >
 <span className="material-symbols-outlined text-xl">check_circle</span>
 <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Confirmar</span>
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 onCancel(apt);
 }}
 className="group/btn relative p-1.5 hover:bg-red-500/100/10 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
 >
 <span className="material-symbols-outlined text-xl">cancel</span>
 <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Cancelar</span>
 </button>
 </>
 )}
 {/* CONFIRMED ACTIONS: Iniciar, Reschedule, No-Show, Cancel */}
 {apt.status === 'confirmed' && (
 <>
 <button
 onClick={(e) => { e.stopPropagation(); onUpdateStatus(apt.id, 'em_atendimento'); }}
 className="group/btn relative p-1.5 hover:bg-green-500/10 dark:hover:bg-green-900/20 text-green-600 rounded-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
 >
 <span className="material-symbols-outlined text-xl">play_circle</span>
 <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Iniciar</span>
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onReschedule(apt); }}
 className="group/btn relative p-1.5 hover:bg-blue-500/10 dark:hover:bg-blue-900/20 text-blue-500 rounded-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
 >
 <span className="material-symbols-outlined text-xl">calendar_month</span>
 <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Reagendar</span>
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onUpdateStatus(apt.id, 'noshow'); }}
 className="group/btn relative p-1.5 hover: shadow-md text-white/10 dark:hover:bg-amber-900/20 font-extrabold rounded-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
 >
 <span className="material-symbols-outlined text-xl">block</span>
 <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Falta</span>
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 onCancel(apt);
 }}
 className="group/btn relative p-1.5 hover:bg-red-500/100/10 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-all flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
 >
 <span className="material-symbols-outlined text-xl">cancel</span>
 <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Cancelar</span>
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
});

export default AppointmentCard;
