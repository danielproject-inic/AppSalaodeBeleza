import React, { useState, useMemo, useEffect, useCallback } from 'react';
import AppointmentCard from '../components/AppointmentCard';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { useAppointments } from '../hooks/useAppointments';
import { useServices } from '../hooks/useServices';
import { useProfessionals } from '../hooks/useProfessionals';
import { useClients } from '../hooks/useClients';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';

interface Client {
  id: string;
  name: string;
  avatar?: string;
  phone: string | null;
}

interface Professional {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface Service {
  id: string;
  title: string;
  durationMinutes: number | null;
  price: number;
  assignedCollabs: string[];
}


interface Appointment {
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
  status: 'confirmed' | 'pending' | 'cancelled' | 'noshow' | 'pago' | 'em_atendimento';
  date: string;
  servico_iniciado_at?: string;
  servico_terminado_at?: string;
}

const GLASS_PANEL = "bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl";

const Agenda: React.FC = () => {
  const { professionalId, loading: userLoading } = useCurrentUserRef();
  const { time, dateString } = useCurrentTime();
  const [currentDate, setCurrentDate] = useState(dateString);

  const { appointments: dbAppointments, loading: loadingApts, addAppointment, updateAppointment } = useAppointments(
    `${currentDate}T00:00:00`,
    `${currentDate}T23:59:59`,
    professionalId || undefined
  );
  
  const { services: dbServices, loading: loadingSvcs } = useServices();
  const { professionals: dbProfessionals } = useProfessionals();
  const { clients: dbClients } = useClients();

  const currentProfessional = useMemo(() => {
    return dbProfessionals.find(p => p.id === professionalId);
  }, [dbProfessionals, professionalId]);

  const services = useMemo(() => {
    return dbServices.map(s => ({
      id: s.id,
      title: s.title,
      durationMinutes: s.duration_minutes,
      price: s.price,
      assignedCollabs: s.professionals ? s.professionals.map((p: any) => p.professional?.id).filter(Boolean) : []
    })).filter(s => s.assignedCollabs.includes(professionalId || ''));
  }, [dbServices, professionalId]);

  const clients = useMemo(() => {
    return dbClients.map(c => ({
      id: c.id,
      name: c.name,
      avatar: c.avatar_url || undefined,
      phone: c.phone || ''
    }));
  }, [dbClients]);

  const appointments = useMemo(() => {
    return dbAppointments.map(a => {
      const startTime = new Date(a.start_time);
      const startH = startTime.getHours().toString().padStart(2, '0');
      const startM = startTime.getMinutes().toString().padStart(2, '0');
      const duration = a.end_time ? (new Date(a.end_time).getTime() - startTime.getTime()) / 60000 : 60;
      const endTime = new Date(startTime.getTime() + duration * 60000);

      return {
        id: a.id,
        clientId: a.client_id || undefined,
        clientName: a.client?.name || 'Cliente Externo',
        service: a.service?.title || 'Serviço',
        professionalId: a.professional_id || '',
        professionalName: a.professional?.name || 'Profissional',
        startHour: startH,
        startMinute: startM,
        endHour: endTime.getHours().toString().padStart(2, '0'),
        endMinute: endTime.getMinutes().toString().padStart(2, '0'),
        durationMinutes: duration,
        status: a.status as any,
        date: a.start_time.split('T')[0],
        servico_iniciado_at: a.servico_iniciado_at || undefined,
        servico_terminado_at: a.servico_terminado_at || undefined
      };
    });
  }, [dbAppointments]);

  // --- Wizard State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [wizardDate, setWizardDate] = useState(currentDate);
  const [manualTime, setManualTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [endTimePreview, setEndTimePreview] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ hour: string, minute: string } | null>(null);
  const [filterClient, setFilterClient] = useState('');

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    await updateAppointment(id, { status } as any);
  }, [updateAppointment]);

  const handleCancel = (apt: any) => {
    setAppointmentToCancel(apt);
    setIsCancelModalOpen(true);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedClient || !selectedService || !selectedTimeSlot || !professionalId) return;
    const start = new Date(`${wizardDate}T${selectedTimeSlot.hour}:${selectedTimeSlot.minute}:00`);
    const end = new Date(start.getTime() + (selectedService.durationMinutes || 0) * 60000);


    await addAppointment({
      client_id: selectedClient.id,
      professional_id: professionalId,
      service_id: selectedService.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'confirmed'
    });

    setIsModalOpen(false);
    resetWizard();
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedClient(undefined);
    setSelectedService(null);
    setManualTime('');
    setTimeError('');
    setEndTimePreview('');
    setSelectedTimeSlot(null);
  };

  const validateTime = (timeStr: string) => {
    setManualTime(timeStr);
    if (!timeStr) {
      setTimeError('');
      return;
    }
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr);
    const m = parseInt(mStr);
    
    const newStart = h * 60 + m;
    const duration = selectedService?.durationMinutes || 0;
    const newEnd = newStart + duration;

    // Basic collision check
    const hasCollision = appointments.some(apt => {
        const aptStart = parseInt(apt.startHour) * 60 + parseInt(apt.startMinute);
        const aptEnd = aptStart + apt.durationMinutes;
        return (newStart < aptEnd && newEnd > aptStart);
    });

    if (hasCollision) {
      setTimeError('Horário ocupado');
      setSelectedTimeSlot(null);
    } else {
      setTimeError('');
      setSelectedTimeSlot({ hour: hStr, minute: mStr });
      const endH = Math.floor(newEnd / 60);
      const endM = newEnd % 60;
      setEndTimePreview(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
    }
  };

  if (userLoading || loadingApts) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      {/* Header */}
      <header className={`px-6 py-4 flex items-center justify-between sticky top-0 z-40 ${GLASS_PANEL} m-4 rounded-2xl`}>
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Minha Agenda</h1>
          
          {/* Date Nav */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
               onClick={() => {
                const date = new Date(currentDate + 'T12:00:00');
                date.setDate(date.getDate() - 1);
                setCurrentDate(date.toISOString().split('T')[0]);
              }}
              className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="bg-transparent border-none text-slate-800 font-bold outline-none text-sm cursor-pointer"
            />
            <button
               onClick={() => {
                const date = new Date(currentDate + 'T12:00:00');
                date.setDate(date.getDate() + 1);
                setCurrentDate(date.toISOString().split('T')[0]);
              }}
              className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0f172a] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Novo Agendamento
        </button>
      </header>

      {/* Main Timeline */}
      <main className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto relative bg-white/40 backdrop-blur-sm rounded-[32px] border border-slate-200 min-h-[1920px] shadow-inner p-6">
          {/* Hour Grid */}
          {Array.from({ length: 18 }, (_, i) => 5 + i).map(hour => (
            <div key={hour} className="h-[120px] border-b border-dashed border-slate-200 relative">
               <span className="absolute -left-12 top-0 text-[10px] font-black text-slate-400 tabular-nums">
                {hour.toString().padStart(2, '0')}:00
               </span>
            </div>
          ))}

          {/* Current Time Indicator */}
          {currentDate === dateString && (
            <div 
              className="absolute w-full border-t-2 border-red-500 z-50 pointer-events-none"
              style={{ top: `${((time.getHours() - 5) * 120) + ((time.getMinutes() / 60) * 120)}px` }}
            >
              <div className="absolute -left-1.5 -top-[5px] size-3 bg-red-500 rounded-full animate-ping"></div>
              <div className="absolute -left-1.5 -top-[5px] size-3 bg-red-500 rounded-full"></div>
            </div>
          )}

          {/* Appointments */}
          {appointments.map(apt => (
            <AppointmentCard 
              key={apt.id} 
              apt={apt} 
              onUpdateStatus={handleUpdateStatus}
              onCancel={handleCancel}
              onReschedule={() => {}} // Not implemented for now
            />
          ))}
        </div>
      </main>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-slate-200">
            <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Cancelar Agendamento?</h3>
            <p className="text-slate-500 text-sm mb-8">Esta ação removerá o cliente da sua agenda de hoje.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all">
                Voltar
              </button>
              <button 
                onClick={() => {
                  handleUpdateStatus(appointmentToCancel.id, 'cancelled');
                  setIsCancelModalOpen(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Novo Agendamento</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Passo {wizardStep} de 3</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <span className="material-symbols-outlined">close</span>
               </button>
             </div>

             <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">Selecione o Cliente</h3>
                    <input 
                      type="text" 
                      placeholder="Pesquisar cliente..." 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 font-medium transition-all"
                      value={filterClient}
                      onChange={e => setFilterClient(e.target.value)}
                    />
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {clients.filter(c => c.name.toLowerCase().includes(filterClient.toLowerCase())).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => { setSelectedClient(c); setWizardStep(2); }}
                          className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-800 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400">{c.name[0]}</div>
                            <span className="font-bold text-slate-700">{c.name}</span>
                          </div>
                          <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">Selecione o Serviço</h3>
                    <div className="space-y-2">
                       {services.map(s => (
                         <div 
                           key={s.id} 
                           onClick={() => { setSelectedService({ ...s, price: s.price || 0 }); setWizardStep(3); }}
                           className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-800 transition-all cursor-pointer group flex justify-between items-center"
                         >
                            <div>
                               <p className="font-bold text-slate-700">{s.title}</p>
                               <p className="text-xs text-slate-400">{s.durationMinutes} min • R$ {(s.price || 0).toFixed(2)}</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-8">
                    <h3 className="font-black text-slate-700 uppercase tracking-tight text-sm">Defina o Horário</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Data</label>
                          <input 
                            type="date" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" 
                            value={wizardDate}
                            onChange={e => setWizardDate(e.target.value)}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Início</label>
                          <input 
                            type="time" 
                            className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg ${timeError ? 'border-red-300 text-red-500' : ''}`}
                            value={manualTime}
                            onChange={e => validateTime(e.target.value)}
                          />
                       </div>
                    </div>
                    
                    {timeError && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{timeError}</p>}
                    
                    {!timeError && manualTime && (
                       <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl animate-in slide-in-from-bottom-2">
                          <p className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            Confirmado: {manualTime} às {endTimePreview}
                          </p>
                       </div>
                    )}
                  </div>
                )}
             </div>

             <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-4">
                <button 
                  onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                  className={`px-6 py-3 bg-white text-slate-500 font-bold rounded-xl border border-slate-200 transition-all ${wizardStep === 1 ? 'opacity-0 invisible' : ''}`}
                >
                  Voltar
                </button>
                {wizardStep < 3 ? (
                  <div className="flex-1" />
                ) : (
                  <button 
                    disabled={!selectedTimeSlot || !!timeError}
                    onClick={handleConfirmAppointment}
                    className="flex-1 bg-[#0f172a] text-white py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                  >
                    Confirmar Agenda
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
