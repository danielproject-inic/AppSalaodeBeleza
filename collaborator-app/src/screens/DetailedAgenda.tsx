import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import AppointmentCard from '../components/AppointmentCard';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { useAppointments } from '../hooks/useAppointments';
import { useServices } from '../hooks/useServices';
import { useProfessionals } from '../hooks/useProfessionals';
import { useClients } from '../hooks/useClients';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { useTransactions } from '../hooks/useTransactions';
import { useSalonConfig } from '../hooks/useSalonConfig';
import { Database } from '../lib/database.types';
import './M10Canvas.css';
import './M10Agenda.css';

interface Client {
 id: string;
 name: string;
 avatar?: string;
 phone: string;
}

interface Professional {
 id: string;
 name: string;
 avatar?: string;
 role: string;
}

interface Service {
 id: string;
 title: string;
 durationMinutes: number;
 price: number;
 is_variable_price?: boolean;
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
 updatedAt?: string;
}

const GLASS = "bg-[#0e0e1a]/92 backdrop-blur-2xl border border-white/5 shadow-2xl";
const ACCENT_PINK = "#ff1493";
const ACCENT_CYAN = "#00fff5";
const COLORS = ['#ff1493','#00fff5','#a78bfa','#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6'];

interface DetailedAgendaProps {
 globalExceptions?: Record<string, Record<string, 'off' | 'vacation' | 'sick'>>;
 collaborators?: any[];
}

const DetailedAgenda: React.FC<DetailedAgendaProps> = ({ collaborators = [] }) => {
 const { role, professionalId, hasAccess } = useCurrentUserRef();
 const { time, dateString } = useCurrentTime();
 const [currentDate, setCurrentDate] = useState<string | null>(dateString);
 const [viewDate, setViewDate] = useState(dateString);

 const todayObj = new Date();
 const todayStr = new Date(todayObj.getTime() - todayObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];

 // Month range for calendar indicators
 const calDate = useMemo(() => (() => {
    const d = new Date((currentDate || viewDate || dateString) + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  })(), [currentDate, viewDate]);
 const calYear = calDate.getFullYear();
 const calMonth = calDate.getMonth();
 const startOfMonth = new Date(calYear, calMonth, 1).toISOString().split('T')[0] + 'T00:00:00';
 const endOfMonth = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0] + 'T23:59:59';

 const { appointments: dbAppointments, loading: loadingApts, addAppointment, updateAppointment, deleteAppointment } = useAppointments(
  startOfMonth,
  endOfMonth
 );
 const { services: dbServices, loading: loadingSvcs } = useServices();
 const { professionals: dbProfessionals, exceptions: dbExceptions, loading: loadingPros } = useProfessionals();
 const { clients: dbClients, loading: loadingClients } = useClients();
 const { addTransaction } = useTransactions();
 const { config: salonConfig } = useSalonConfig();

 const canSeeAll = role === 'admin' || role === 'manager' || role === 'receptionist' || hasAccess('team_view_all');
 const isPowerful = role === 'admin' || role === 'manager' || role === 'receptionist';

 const professionals: Professional[] = useMemo(() => {
  return dbProfessionals
   .filter(p => canSeeAll || p.id === professionalId)
   .map(p => ({
    id: p.id,
    name: p.name,
    role: (p as any).role || (p as any).roles?.[0] || 'Profissional',
    avatar: p.avatar_url || undefined
   }));
 }, [dbProfessionals, canSeeAll, professionalId]);

 const clients: Client[] = useMemo(() => {
  return dbClients.map(c => ({
   id: c.id,
   name: c.name,
   avatar: c.avatar_url || undefined,
   phone: c.phone || ''
  }));
 }, [dbClients]);

 const services: Service[] = useMemo(() => {
  return (dbServices || []).map(s => ({
   id: s.id,
   title: s.title,
   durationMinutes: s.duration_minutes || 30,
   price: s.price || 0,
   is_variable_price: s.is_variable_price || false,
   assignedCollabs: (s as any).professionals ? (s as any).professionals.map((p: any) => p.professional?.id).filter(Boolean) : []
  }));
 }, [dbServices]);

 const appointments: Appointment[] = useMemo(() => {
  return (dbAppointments || []).map(a => {
   if (!a.start_time) return null;
   const startTime = new Date(a.start_time);
   const startH = startTime.getHours().toString().padStart(2, '0');
   const startM = startTime.getMinutes().toString().padStart(2, '0');
   const duration = a.end_time ? (new Date(a.end_time).getTime() - startTime.getTime()) / 60000 : 60;
   const endTime = new Date(startTime.getTime() + duration * 60000);
   const endH = endTime.getHours().toString().padStart(2, '0');
   const endM = endTime.getMinutes().toString().padStart(2, '0');
   return {
    id: a.id,
    clientId: a.client_id || undefined,
    clientName: a.client?.name || 'Cliente Externo',
    service: a.service?.title || 'Serviço',
    professionalId: a.professional_id || '',
    professionalName: a.professional?.name || 'Profissional',
    startHour: startH,
    startMinute: startM,
    endHour: endH,
    endMinute: endM,
    durationMinutes: duration,
    status: a.status as any,
    date: (a.start_time || '').split('T')[0],
    servico_iniciado_at: a.servico_iniciado_at || undefined,
    servico_terminado_at: a.servico_terminado_at || undefined,
    updatedAt: a.updated_at || a.created_at || undefined
   };
  }).filter(Boolean) as Appointment[];
 }, [dbAppointments]);

 const dailyAppointments = useMemo(() => {
  return appointments.filter(a => a.date === currentDate);
 }, [appointments, currentDate]);

 const monthAppointmentsByDate = useMemo(() => {
  const map = new Map<string, Appointment[]>();
  appointments.forEach(a => {
   if (!map.has(a.date)) map.set(a.date, []);
   map.get(a.date)?.push(a);
  });
  return map;
 }, [appointments]);

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isRescheduling, setIsRescheduling] = useState(false);
 const [rescheduleId, setRescheduleId] = useState<string | null>(null);
 const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
 const [cancelJustification, setCancelJustification] = useState('');
 const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
 const [errorModalState, setErrorModalState] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: '' });
 const [endTimePreview, setEndTimePreview] = useState('');
 const [selectedProfFilter, setSelectedProfFilter] = useState('all');
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
 }, [professionals, selectedProfTab]);

 const [wizardStep, setWizardStep] = useState(1);
 const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
 const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
 const [selectedService, setSelectedService] = useState<Service | null>(null);
 const [wizardDate, setWizardDate] = useState('');
 const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ hour: string, minute: string } | null>(null);
 const [manualTime, setManualTime] = useState('');
 const [timeError, setTimeError] = useState('');
 const [filterClient, setFilterClient] = useState('');

 // Auto-validate time whenever date or time changes
 useEffect(() => {
  if (!manualTime || !selectedProfessional || !selectedService || !wizardDate) {
   setTimeError('');
   setSelectedTimeSlot(null);
   setEndTimePreview('');
   return;
  }

  const [hStr, mStr] = manualTime.split(':');
  const h = parseInt(hStr); const m = parseInt(mStr);
  if (isNaN(h) || isNaN(m)) return;

  const startTimeInMinutes = h * 60 + m;
  const duration = selectedService.durationMinutes;
  const newStart = h * 60 + m;
  const newEnd = newStart + duration;

  // 1. Check for past times if today
  const now = new Date();
  const isToday = wizardDate === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (isToday && startTimeInMinutes <= currentMinutes) {
   setTimeError('Não é possível agendar em horários passados.');
   setSelectedTimeSlot(null);
   setEndTimePreview('');
   return;
  }

  // 2. Check Salon Business Hours
  const getBusinessHoursForDate = (dateStr: string) => {
   if (!dateStr) return { start: '05:00', end: '20:00', isOpen: true };
   const dateParts = dateStr.split('-').map(Number);
   const selDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
   const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   const dayKey = dayNames[selDate.getDay()];
   
   const businessHours = salonConfig?.business_hours 
    ? (typeof salonConfig.business_hours === 'string' ? JSON.parse(salonConfig.business_hours) : salonConfig.business_hours)
    : null;

   if (businessHours && businessHours[dayKey]) {
    return { 
      start: businessHours[dayKey].start || '05:00', 
      end: businessHours[dayKey].end || '20:00', 
      isOpen: businessHours[dayKey].isOpen 
    };
   }
   return { start: '05:00', end: '20:00', isOpen: true };
  };

  const { start, end, isOpen } = getBusinessHoursForDate(wizardDate);

  if (!isOpen) {
   setTimeError('O salão está fechado neste dia.');
   setSelectedTimeSlot(null);
   setEndTimePreview('');
   return;
  }

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const salonStart = sh * 60 + sm;
  const salonEnd = eh * 60 + em;

  const lastStartLimit = (eh === 20 && em === 0) ? 19 * 60 + 59 : salonEnd;

  if (startTimeInMinutes < salonStart || startTimeInMinutes > lastStartLimit) {
   setTimeError(`Fora do horário do salão (${start} - ${eh === 20 && em === 0 ? '19:59' : end}).`);
   setSelectedTimeSlot(null);
   setEndTimePreview('');
   return;
  }

  // Check Exceptions
  const dayExceptions = dbExceptions.filter(ex => ex.date === wizardDate && ex.professional_id === selectedProfessional.id);
  const hasExceptionConflict = dayExceptions.some(ex => {
   if (ex.type === 'vacation' || ex.type === 'sick' || ex.type === 'off') return true;
   if (ex.type === 'lunch' && ex.start_time && ex.end_time) {
    const [exH1, exM1] = ex.start_time.split(':').map(Number);
    const [exH2, exM2] = ex.end_time.split(':').map(Number);
    const exStart = exH1 * 60 + exM1;
    const exEnd = exH2 * 60 + exM2;
    return (newStart < exEnd && newEnd > exStart);
   }
   return false;
  });

  if (hasExceptionConflict) {
   setTimeError('O profissional está indisponível nesta data/horário.');
   setSelectedTimeSlot(null);
   setEndTimePreview('');
   return;
  }

  // Check existing appointments
  const existingApps = (appointments || []).filter(a => a.professionalId === selectedProfessional.id && a.date === wizardDate && a.status !== 'cancelled' && a.status !== 'pago');
  const hasCollision = existingApps.some(apt => {
   const aptStart = parseInt(apt.startHour) * 60 + parseInt(apt.startMinute);
   const aptEnd = aptStart + apt.durationMinutes;
   return (newStart < aptEnd && newEnd > aptStart);
  });

  if (hasCollision) {
   setTimeError('Este horário já está ocupado.');
   setSelectedTimeSlot(null);
   setEndTimePreview('');
  } else {
   setTimeError('');
   setSelectedTimeSlot({ hour: hStr, minute: mStr });
   const endH = Math.floor(newEnd / 60);
   const endM = newEnd % 60;
   setEndTimePreview(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
  }
 }, [manualTime, wizardDate, selectedProfessional, selectedService, dbExceptions, appointments, salonConfig]);

 const appointmentsByProf = useMemo(() => {
  const map = new Map<string, Appointment[]>();
  dailyAppointments.forEach(apt => {
   const isVisible = apt.status !== 'cancelled' && apt.status !== 'pago';
   if (isVisible) {
    if (!map.has(apt.professionalId)) {
     map.set(apt.professionalId, []);
    }
    map.get(apt.professionalId)?.push(apt);
   }
  });
  return map;
 }, [dailyAppointments]);

 const getAppointmentsForProfessional = (profId: string, date: string = currentDate || todayStr) => {
  return appointmentsByProf.get(profId) || [];
 };

 const resetWizard = () => {
  setWizardStep(1);
  setSelectedClient(undefined);
  setSelectedProfessional(null);
  setSelectedService(null);
  setSelectedTimeSlot(null);
  setWizardDate('');
  setFilterClient('');
  setIsRescheduling(false);
  setRescheduleId(null);
  setManualTime('');
  setTimeError('');
  setEndTimePreview('');
 };

 const handleOpenModal = () => {
  resetWizard();
  setIsModalOpen(true);
 };

 const handleConfirmAppointment = async () => {
  if (!selectedClient || !selectedProfessional || !selectedService || !selectedTimeSlot || !wizardDate) return;
  const start = new Date(`${wizardDate}T${selectedTimeSlot.hour}:${selectedTimeSlot.minute}:00`);
  const end = new Date(start.getTime() + selectedService.durationMinutes * 60000);
  const appointmentData: any = {
   client_id: selectedClient.id,
   professional_id: selectedProfessional.id,
   service_id: selectedService.id,
   start_time: start.toISOString(),
   end_time: end.toISOString()
  };
  if (isRescheduling && rescheduleId) {
   await updateAppointment(rescheduleId, { ...appointmentData, status: 'confirmed' });
  } else {
   await addAppointment({ ...appointmentData, status: 'pending' });
  }
  setIsModalOpen(false);
  resetWizard();
 };

 const handleUpdateStatus = useCallback(async (id: string, status: Appointment['status']) => {
  const apt = appointments.find(a => a.id === id);
  if (!apt) return;

  const updates: any = { status };
  if (status === 'em_atendimento') {
   updates.servico_iniciado_at = new Date().toISOString();
  } else if (status === 'pago') {
   updates.servico_terminado_at = new Date().toISOString();
   
   // Inject transaction logic
   const svc = services.find(s => s.title === apt.service);
   if (svc) {
     const pro = dbProfessionals.find(p => p.id === apt.professionalId);
     await addTransaction({
       amount: svc.price,
       type: 'entrada',
       status: 'pago', // Liquidado/Pago
       description: `Pgto: Serviço ${apt.service}`,
       client_id: apt.clientId || null,
       professional_id: apt.professionalId,
       payment_method: 'Dinheiro', // Fixado inicialmente para ter um tipo válido no caixa
       category: 'Serviço',
       items_json: [{
           id: svc.id,
           title: svc.title,
           price: svc.price,
           professional: pro?.name || 'N/A',
           commissionPercentage: (svc as any).commission_percentage || 0
       }]
     });
   }
  }
  await updateAppointment(id, updates);
 }, [updateAppointment, appointments, services, dbProfessionals, addTransaction]);

 const handleCancel = useCallback((apt: Appointment) => {
  setAppointmentToCancel(apt);
  setIsCancelModalOpen(true);
 }, []);

 const startReschedule = useCallback((apt: Appointment) => {
  const client = clients.find(c => c.name === apt.clientName);
  const professional = professionals.find(p => p.id === apt.professionalId);
  const service = services.find(s => s.title === apt.service);
  if (professional && service) {
   setIsRescheduling(true);
   setRescheduleId(apt.id);
   setSelectedClient(client || { id: apt.clientId || '', name: apt.clientName, phone: '' });
   setSelectedProfessional(professional);
   setSelectedService(service);
   setWizardDate(currentDate || todayStr);
   setWizardStep(4);
   setIsModalOpen(true);
  } else {
   setErrorModalState({ isOpen: true, message: 'Não foi possível carregar os dados para reagendamento.' });
  }
 }, [clients, professionals, services, currentDate]);

 const renderStep1 = () => {
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(filterClient.toLowerCase()));
  return (
   <div className="space-y-4 animate-in fade-in slide-in- duration-300">
    <h3 className="text-lg font-bold text-white mb-4">1. Selecione o Cliente</h3>
    <input type="text" placeholder="Buscar cliente..." title="Buscar cliente..." value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 focus:ring-2 focus:ring-cyan-500 text-white" autoFocus />
    <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar">
     {filteredClients.map(client => (
      <div key={client.id} onClick={() => { setSelectedClient(client); setWizardStep(2); }} className="p-3 rounded-lg border border-white/10 hover:border-cyan-500 hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-all">
       <div className="flex items-center gap-3">
        <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundImage: client.avatar ? `url("${client.avatar}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
         {!client.avatar && <span className="text-sm font-black text-white/20">{client.name?.charAt(0) || 'C'}</span>}
        </div>
        <div><p className="font-bold text-gray-200">{client.name}</p><p className="text-xs text-slate-400">{client.phone}</p></div>
       </div>
      </div>
     ))}
    </div>
   </div>
  );
 };

 const renderStep2 = () => {
  return (
   <div className="space-y-4 animate-in fade-in slide-in- duration-300">
    <div className="flex items-center justify-between mb-4">
     <h3 className="text-lg font-bold text-white">2. Selecione o Profissional</h3>
     <button onClick={() => setWizardStep(1)} className="text-xs text-slate-400 hover:underline">Voltar</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
     {professionals.map(prof => (
      <div key={prof.id} onClick={() => { setSelectedProfessional(prof); setWizardStep(3); }} className="p-4 rounded-xl border border-white/10 hover:border-cyan-500 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-all">
        <div className="size-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundImage: prof.avatar ? `url("${prof.avatar}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
         {!prof.avatar && <span className="text-lg font-black text-white/20">{prof.name?.charAt(0) || 'P'}</span>}
        </div>
       <div><p className="font-bold text-white">{prof.name}</p><p className="text-xs text-amber-600 uppercase font-bold">{prof.role}</p></div>
      </div>
     ))}
    </div>
   </div>
  );
 };

 const renderStep3 = () => {
  const availableServices = services.filter(s => s.assignedCollabs.includes(selectedProfessional?.id || ''));
  return (
   <div className="space-y-4 animate-in fade-in slide-in- duration-300">
    <div className="flex items-center justify-between mb-4">
     <h3 className="text-lg font-bold text-white">3. Selecione o Serviço</h3>
     <button onClick={() => setWizardStep(2)} className="text-xs text-slate-400 hover:underline">Voltar</button>
    </div>
    <div className="max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar">
     {availableServices.length > 0 ? availableServices.map(service => (
      <div key={service.id} onClick={() => { setSelectedService(service); setWizardStep(4); }} className="p-4 rounded-lg border border-white/10 hover:border-cyan-500 hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-all">
       <div><p className="font-bold text-gray-200">{service.title}</p><p className="text-xs text-slate-400">{service.durationMinutes} min • {service.is_variable_price ? 'A partir de ' : ''}R$ {service.price.toFixed(2)}</p></div>
      </div>
     )) : (
      <div className="text-center py-8 text-slate-400"><p>Nenhum serviço disponível.</p></div>
     )}
    </div>
   </div>
  );
 };

 const getBusinessHoursForDate = (dateStr: string) => {
  if (!dateStr) return { start: '05:00', end: '20:00', isOpen: true };
  const dateParts = dateStr.split('-').map(Number);
  const selDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayNames[selDate.getDay()];
  
  const businessHours = salonConfig?.business_hours 
   ? (typeof salonConfig.business_hours === 'string' ? JSON.parse(salonConfig.business_hours) : salonConfig.business_hours)
   : null;

  if (businessHours && businessHours[dayKey]) {
   return { 
     start: businessHours[dayKey].start || '05:00', 
     end: businessHours[dayKey].end || '20:00', 
     isOpen: businessHours[dayKey].isOpen 
   };
  }
  return { start: '05:00', end: '20:00', isOpen: true };
 };

  const renderTimeline = () => {
      if (!wizardDate || !selectedProfessional || !selectedService) return null;

      const { start, end, isOpen } = getBusinessHoursForDate(wizardDate);
      if (!isOpen) {
          return (
              <div className="text-center py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wider">
                  O salão está fechado neste dia
              </div>
          );
      }

      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const totalMinutes = endMinutes - startMinutes;

       const hourMarkers: { label: string; offsetPercent: number }[] = [];
       for (let h = startH; h <= endH; h++) {
           const m = h * 60;
           const pct = ((m - startMinutes) / totalMinutes) * 100;
           if (pct >= 0 && pct <= 100) {
               hourMarkers.push({
                   label: `${h.toString().padStart(2, '0')}:00`,
                   offsetPercent: pct
               });
           }
       }

       const dayExceptions = dbExceptions.filter(
           ex => ex.date === wizardDate && ex.professional_id === selectedProfessional.id
       );

       const existingApps = (appointments || []).filter(
           a => a.professionalId === selectedProfessional.id && a.date === wizardDate && a.status !== 'cancelled' && a.status !== 'pago'
       );

       // Build the smart ruler labels (green for free hours, red for occupied start/end times)
       const rulerLabels: { label: string; offsetPercent: number; type: 'free' | 'occupied' | 'exception' }[] = [];

       // 1. Add regular hour markers (if free)
       for (let h = startH; h <= endH; h++) {
           const m = h * 60;
           const pct = ((m - startMinutes) / totalMinutes) * 100;
           if (pct >= 0 && pct <= 100) {
               const isApptOccupied = existingApps.some(apt => {
                   const aptStart = parseInt(apt.startHour) * 60 + parseInt(apt.startMinute);
                   const aptEnd = aptStart + apt.durationMinutes;
                   return m >= aptStart && m < aptEnd;
               });

               const isExOccupied = dayExceptions.some(ex => {
                   if (ex.type === 'vacation' || ex.type === 'sick' || ex.type === 'off') return true;
                   if (ex.type === 'lunch' && ex.start_time && ex.end_time) {
                       const [exH1, exM1] = ex.start_time.split(':').map(Number);
                       const [exH2, exM2] = ex.end_time.split(':').map(Number);
                       const exStart = exH1 * 60 + exM1;
                       const exEnd = exH2 * 60 + exM2;
                       return m >= exStart && m < exEnd;
                   }
                   return false;
               });

               if (!isApptOccupied && !isExOccupied) {
                   rulerLabels.push({
                       label: `${h.toString().padStart(2, '0')}:00`,
                       offsetPercent: pct,
                       type: 'free'
                   });
               }
           }
       }

       // 2. Add exact start/end times of occupied appointments (marked red)
       existingApps.forEach(apt => {
           const aptStart = parseInt(apt.startHour) * 60 + parseInt(apt.startMinute);
           const aptEnd = aptStart + apt.durationMinutes;

           const startPct = ((aptStart - startMinutes) / totalMinutes) * 100;
           const endPct = ((aptEnd - startMinutes) / totalMinutes) * 100;

           rulerLabels.push({
               label: `${apt.startHour}:${apt.startMinute}`,
               offsetPercent: startPct,
               type: 'occupied'
           });

           rulerLabels.push({
               label: `${apt.endHour}:${apt.endMinute}`,
               offsetPercent: endPct,
               type: 'occupied'
            });
       });

       // 3. Add exception/lunch start/end times (marked red as well, since they block the time)
       dayExceptions.forEach(ex => {
           if (ex.type === 'lunch' && ex.start_time && ex.end_time) {
               const [exH1, exM1] = ex.start_time.split(':').map(Number);
               const [exH2, exM2] = ex.end_time.split(':').map(Number);
               const exStart = exH1 * 60 + exM1;
               const exEnd = exH2 * 60 + exM2;

               const startPct = ((exStart - startMinutes) / totalMinutes) * 100;
               const endPct = ((exEnd - startMinutes) / totalMinutes) * 100;

               rulerLabels.push({
                   label: ex.start_time,
                   offsetPercent: startPct,
                   type: 'exception'
               });
               rulerLabels.push({
                   label: ex.end_time,
                   offsetPercent: endPct,
                   type: 'exception'
               });
           }
       });

       // 4. Sort and deduplicate to avoid overlapping text (priority to occupied/exception labels)
       rulerLabels.sort((a, b) => a.offsetPercent - b.offsetPercent);
       const filteredRulerLabels: typeof rulerLabels = [];
       rulerLabels.forEach(label => {
           const tooCloseIndex = filteredRulerLabels.findIndex(existing => 
               Math.abs(existing.offsetPercent - label.offsetPercent) < 7.5
           );

           if (tooCloseIndex !== -1) {
               const existing = filteredRulerLabels[tooCloseIndex];
               if (label.type !== 'free' && existing.type === 'free') {
                   filteredRulerLabels[tooCloseIndex] = label;
               }
           } else {
               filteredRulerLabels.push(label);
           }
       });

      const apptBlocks = existingApps.map(apt => {
          const aptStart = parseInt(apt.startHour) * 60 + parseInt(apt.startMinute);
          const aptEnd = aptStart + apt.durationMinutes;
          const left = Math.max(0, ((aptStart - startMinutes) / totalMinutes) * 100);
          const right = Math.min(100, ((aptEnd - startMinutes) / totalMinutes) * 100);
          const width = right - left;
          return {
              id: apt.id,
              clientName: apt.clientName,
              left,
              width,
              label: `${apt.startHour}:${apt.startMinute} - Ocupado: ${apt.clientName}`
          };
      });

      const exceptionBlocks: any[] = [];
      dayExceptions.forEach(ex => {
          if (ex.type === 'vacation' || ex.type === 'sick' || ex.type === 'off') {
              exceptionBlocks.push({
                  left: 0,
                  width: 100,
                  label: ex.type === 'vacation' ? 'Férias' : ex.type === 'sick' ? 'Licença' : 'Folga'
              });
          } else if (ex.type === 'lunch' && ex.start_time && ex.end_time) {
              const [exH1, exM1] = ex.start_time.split(':').map(Number);
              const [exH2, exM2] = ex.end_time.split(':').map(Number);
              const exStart = exH1 * 60 + exM1;
              const exEnd = exH2 * 60 + exM2;
              const left = Math.max(0, ((exStart - startMinutes) / totalMinutes) * 100);
              const right = Math.min(100, ((exEnd - startMinutes) / totalMinutes) * 100);
              const width = right - left;
              exceptionBlocks.push({
                  left,
                  width,
                  label: 'Intervalo'
              });
          }
      });

      let selectedBlock: any = null;
      if (manualTime) {
          const [selH, selM] = manualTime.split(':').map(Number);
          const selStart = selH * 60 + selM;
          const selEnd = selStart + selectedService.durationMinutes;
          const left = Math.max(0, ((selStart - startMinutes) / totalMinutes) * 100);
          const right = Math.min(100, ((selEnd - startMinutes) / totalMinutes) * 100);
          const width = right - left;
          selectedBlock = { left, width };
      }

      const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, clickX / rect.width));
          const clickedM = startMinutes + pct * totalMinutes;
          const roundedM = Math.round(clickedM / 15) * 15;
          const finalM = Math.max(startMinutes, Math.min(endMinutes - selectedService.durationMinutes, roundedM));
          const hour = Math.floor(finalM / 60).toString().padStart(2, '0');
          const min = (finalM % 60).toString().padStart(2, '0');
          setManualTime(`${hour}:${min}`);
      };

      const suggestions: string[] = [];
      const isToday = wizardDate === todayStr;
      const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const lastStart = (endH === 20 && endM === 0) ? 19 * 60 + 59 : endMinutes;
      for (let m = startMinutes; m <= lastStart; m += 15) {
          if (isToday && m <= currentMinutes) continue;

          const endM = m + selectedService.durationMinutes;

          const hasExceptionConflict = dayExceptions.some(ex => {
              if (ex.type === 'vacation' || ex.type === 'sick' || ex.type === 'off') return true;
              if (ex.type === 'lunch' && ex.start_time && ex.end_time) {
                  const [exH1, exM1] = ex.start_time.split(':').map(Number);
                  const [exH2, exM2] = ex.end_time.split(':').map(Number);
                  const exStart = exH1 * 60 + exM1;
                  const exEnd = exH2 * 60 + exM2;
                  return (m < exEnd && endM > exStart);
              }
              return false;
          });
          if (hasExceptionConflict) continue;

          const hasApptConflict = existingApps.some(apt => {
              const aptStart = parseInt(apt.startHour) * 60 + parseInt(apt.startMinute);
              const aptEnd = aptStart + apt.durationMinutes;
              return (m < aptEnd && endM > aptStart);
          });
          if (hasApptConflict) continue;

          const hour = Math.floor(m / 60).toString().padStart(2, '0');
          const min = (m % 60).toString().padStart(2, '0');
          suggestions.push(`${hour}:${min}`);
      }

      return (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <label className="block text-[10px] font-black uppercase tracking-[1.5px] text-pink-500">Linha do Tempo de {selectedProfessional.name}</label>
              
              <div className="relative">
                  <div className="flex justify-between text-[11px] font-bold mb-1.5 relative h-4 select-none">
                      {filteredRulerLabels.map((marker, i) => {
                          const isFree = marker.type === 'free';
                          return (
                              <span 
                                  key={i} 
                                  className={`absolute -translate-x-1/2 font-black transition-colors ${isFree ? 'text-emerald-400' : 'text-red-400'}`} 
                                  style={{ left: `${marker.offsetPercent}%` }}
                              >
                                  {marker.label}
                              </span>
                          );
                      })}
                  </div>
                  <div className="h-1" />

                  <div 
                      onClick={handleTimelineClick}
                      className="relative w-full h-14 bg-white/5 rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-colors"
                  >
                      {hourMarkers.map((marker, i) => (
                          <div 
                              key={i} 
                              className="absolute top-0 bottom-0 border-l border-white/[0.03] pointer-events-none" 
                              style={{ left: `${marker.offsetPercent}%` }}
                          />
                      ))}

                      {exceptionBlocks.map((block, i) => (
                          <div 
                              key={`ex-${i}`}
                              className="absolute top-0 bottom-0 bg-amber-500/10 border-x border-amber-500/20 text-amber-500 text-[8px] font-extrabold flex items-center justify-center p-1 text-center pointer-events-none"
                              style={{ left: `${block.left}%`, width: `${block.width}%` }}
                          >
                              {block.label}
                          </div>
                      ))}

                      {apptBlocks.map((block, i) => (
                          <div 
                              key={`apt-${i}`}
                              className="absolute top-0 bottom-0 bg-red-500/20 border-x border-red-500/30 text-red-400 text-[8px] font-extrabold flex items-center justify-center p-1 text-center pointer-events-none"
                              style={{ left: `${block.left}%`, width: `${block.width}%` }}
                              title={block.label}
                          >
                              <span className="truncate max-w-full">{block.clientName} (Ocupado)</span>
                          </div>
                      ))}

                      {selectedBlock && (
                          <div 
                              className="absolute top-0 bottom-0 bg-cyan-500/20 border-x border-cyan-400 shadow-[0_0_12px_rgba(0,255,245,0.2)] animate-pulse pointer-events-none flex items-center justify-center"
                              style={{ left: `${selectedBlock.left}%`, width: `${selectedBlock.width}%` }}
                          >
                              <span className="text-cyan-400 text-[8px] font-black uppercase tracking-wider">Novo</span>
                          </div>
                      )}
                  </div>
              </div>

              <p className="text-[8px] text-slate-500 text-center font-bold italic">
                  Dica: Clique em qualquer área livre da barra acima para selecionar o horário de início (arredondado de 15 em 15 minutos).
              </p>

              <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="block text-[8px] font-black uppercase tracking-[1px] text-slate-400">Sugestões de Horários Livres ({suggestions.length})</span>
                  {suggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                          {suggestions.map(timeStr => {
                              const isSelected = manualTime === timeStr;
                              return (
                                  <button
                                      key={timeStr}
                                      type="button"
                                      onClick={() => setManualTime(timeStr)}
                                      className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-all ${
                                          isSelected 
                                              ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_rgba(0,255,245,0.3)] scale-95" 
                                              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                                      }`}
                                  >
                                      {timeStr}
                                  </button>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="text-[10px] text-red-400 font-bold bg-red-500/10 p-2.5 rounded-lg text-center uppercase tracking-wide">
                          Nenhum horário livre compatível com a duração ({selectedService.durationMinutes} min) neste dia.
                      </div>
                  )}
              </div>
          </div>
      );
  };

 const renderStep4 = () => {
  return (
   <div className="space-y-6 animate-in fade-in slide-in- duration-300">
    <div className="flex items-center justify-between mb-2">
     <h3 className="text-lg font-bold text-white">{isRescheduling ? '4. Selecione Nova Data' : '4. Data e Horário'}</h3>
     <button onClick={() => setWizardStep(3)} className="text-xs text-slate-400 hover:underline">Voltar</button>
    </div>
    <div className="grid grid-cols-2 gap-4">
     <div>
      <label className="block text-xs font-bold text-slate-400 mb-1">Data</label>
       <input type="date" value={wizardDate || ''} title="Data do Agendamento" placeholder="AAAA-MM-DD" onChange={(e) => setWizardDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:ring-cyan-500 text-white" />
     </div>
     <div>
      <label className="block text-xs font-bold text-slate-400 mb-1">Horário</label>
      <input 
        type="time" 
        value={manualTime} 
        title="Horário do Agendamento"
        placeholder="HH:MM"
        onChange={(e) => setManualTime(e.target.value)} 
        disabled={!!timeError && (timeError.includes('fechado') || timeError.includes('passados'))}
        className={`w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:ring-cyan-500 text-white transition-all ${(timeError.includes('fechado') || timeError.includes('passados')) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} 
      />
     </div>
    </div>

    {renderTimeline()}

    <div className="min-h-[24px]">
     {timeError && <div className="text-red-400 text-sm font-medium">{timeError}</div>}
     {!timeError && manualTime && <div className="text-emerald-400 text-sm font-bold bg-emerald-500/10 p-3 rounded-lg">Horário Disponível • Término: {endTimePreview}</div>}
    </div>
   </div>
  );
 };

 // --- COMPUTED VALUES FOR SPLIT TIMELINE++ ---
 const activeProfessional = professionals.find(p => p.id === selectedProfTab);
 const activeAppts = selectedProfTab ? (appointmentsByProf.get(selectedProfTab) || []) : [];
 const filteredAppts = activeAppts.filter(a => statusFilter === 'all' || a.status === statusFilter);

 // Calendar helpers
 const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
 const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
 const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const calMonthName = monthNames[calMonth] + ' ' + calYear;

   useEffect(() => {
    const h = (e: KeyboardEvent) => { 
      if (e.key === 'Escape' && !isModalOpen && !isCancelModalOpen) {
        setCurrentDate(null); 
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
   }, [isModalOpen, isCancelModalOpen]);

  // Stats: Switch between daily and monthly, ALWAYS filtered by selected professional
  const statsSource = useMemo(() => {
    const source = currentDate ? dailyAppointments : appointments;
    return source.filter(a => a.status !== 'cancelled' && a.professionalId === selectedProfTab);
  }, [currentDate, dailyAppointments, appointments, selectedProfTab]);

  const totalAppts = statsSource.length;
  const totalRevenue = statsSource.reduce((sum, a) => {
   const svc = services.find(s => s.title === a.service);
   return sum + (svc?.price || 0);
  }, 0);
  
  const baseCapacity = 10; // slots per day for one professional
  const divisor = currentDate ? baseCapacity : (baseCapacity * daysInMonth);
  const occupancyRate = divisor > 0 ? Math.round((totalAppts / divisor) * 100) : 0;

   const upcomingAppts = (appointments || [])
    .filter(a => a && a.status !== 'cancelled' && a.status !== 'pago' && a.professionalId === selectedProfTab)
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.startHour}:${a.startMinute}:00`).getTime();
      const timeB = new Date(`${b.date}T${b.startHour}:${b.startMinute}:00`).getTime();
      return timeA - timeB;
    });

   const timeSlots = Array.from({ length: 19 }, (_, i) => {
    const h = 5 + i;
    return h.toString().padStart(2, '0') + ':00';
   });

 const getColorForAppt = (apt: Appointment) => {
  const name = apt?.professionalName || 'P';
  const code = name.charCodeAt(0) || 0;
  return COLORS[code % COLORS.length];
 };

 return (
  <div className="m10-wrapper flex h-full flex-col overflow-hidden text-white font-sans selection:bg-pink-500/30"
    onClick={(e) => {
     const t = e.target as HTMLElement;
     const interactive = t.closest('button, input, select, textarea, .m10-appt-card');
     if (!interactive) {
       setCurrentDate(null);
     }
    }}>
   {/* 3-COLUMN SPLIT TIMELINE++ LAYOUT */}
       <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '260px 1fr 340px' }}>

   {/* ========= LEFT PANEL ========= */}
    <div className="m10-agenda-left flex flex-col overflow-y-auto p-5 scrollbar-thin">
     {/* Header */}
     <div className="pb-4 border-b border-white/[0.04] mb-4">
      <h1 className="text-xl font-black tracking-wider font-bebas">Agenda</h1>
      <p className="text-[10px] text-pink-500 font-bold uppercase tracking-[2px] mt-1">Visão Profissional • Tempo Real</p>
     </div>

    {/* Mini Calendar */}
    <div className="flex justify-between items-center mb-3">
     <h4 className="text-[13px] font-extrabold">{calMonthName}</h4>
     <div className="flex gap-1">
      <button onClick={() => { 
        const d = new Date(calDate); 
        d.setMonth(d.getMonth()-1); 
        const next = d.toISOString().split('T')[0];
        setViewDate(next);
        if (currentDate) setCurrentDate(next);
       }} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-transparent text-white/40 flex items-center justify-center hover:text-white transition-all">
       <span className="material-symbols-outlined icon-sm">chevron_left</span>
      </button>
      <button onClick={() => { 
        const d = new Date(calDate); 
        d.setMonth(d.getMonth()+1); 
        const next = d.toISOString().split('T')[0];
        setViewDate(next);
        if (currentDate) setCurrentDate(next);
       }} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-transparent text-white/40 flex items-center justify-center hover:text-white transition-all">
       <span className="material-symbols-outlined icon-sm">chevron_right</span>
      </button>
     </div>
    </div>
    <div className="grid grid-cols-7 gap-[2px] text-center mb-5">
     {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="text-[9px] font-bold text-white/20 uppercase py-1">{d}</div>)}
     {Array.from({length: firstDayOfWeek}).map((_,i)=> <div key={'e'+i}/>)}
     {Array.from({length: daysInMonth}, (_,i)=> {
       const day = i+1;
       const dayStr = `${calYear}-${(calMonth+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
       const isToday = dayStr === todayStr;
       const isSelected = dayStr === currentDate;
       
       // Check for exceptions in this day - FILTERED BY SELECTED PROFESSIONAL
       const dayEx = dbExceptions.filter(ex => ex.date === dayStr && ex.professional_id === selectedProfTab);
       const hasCriticalEx = dayEx.some(ex => ex.type === 'vacation' || ex.type === 'sick' || ex.type === 'off');
       const hasLunchEx = dayEx.some(ex => ex.type === 'lunch');

       let specialClass = "";
       if (isSelected) {
         specialClass = "bg-pink-600 text-black font-black shadow-lg shadow-pink-900/30";
       } else if (hasCriticalEx) {
         specialClass = "ring-2 ring-red-500/40 text-red-400 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
       } else if (hasLunchEx) {
         specialClass = "ring-2 ring-blue-400/40 text-blue-400 bg-blue-500/5 shadow-[0_0_10px_rgba(96,165,250,0.15)]";
       } else if (isToday) {
         specialClass = "text-pink-500 font-bold ring-1 ring-pink-700";
       } else {
         specialClass = "text-white/35 hover:bg-white/[0.04] hover:text-white";
       }

       // Show dots for the currently selected professional tab
       const dotProfId = selectedProfTab || professionalId;
       const dayAppts = (monthAppointmentsByDate.get(dayStr) || []).filter(a => a.professionalId === dotProfId);
       const hasAppts = dayAppts.length > 0;
       const allFinalized = hasAppts && dayAppts.every(a => a.status === 'pago' || a.status === 'cancelled');
       
       let tooltipText = "";
       if (hasAppts) {
         const profCounts: Record<string, number> = {};
         dayAppts.forEach(a => {
           profCounts[a.professionalName] = (profCounts[a.professionalName] || 0) + 1;
         });
         tooltipText = Object.entries(profCounts)
           .map(([name, count]) => `${name}: ${count}`)
           .join(' | ');
       }

       return (
        <button key={day} onClick={(e) => { e.stopPropagation(); setCurrentDate(dayStr); }} title={tooltipText}
         className={`relative text-[11px] font-semibold py-[7px] rounded-xl cursor-pointer transition-all ${specialClass}`}>
         {day}
         {hasAppts && (
           <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${allFinalized ? 'bg-white/25' : 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]'}`} />
         )}
        </button>
       );
      })}
    </div>

    {/* Collaborators List */}
    <div className="mt-2 text-left">
     <div className="text-[9px] font-extrabold text-white/20 uppercase tracking-[2px] mb-3">Colaboradores</div>
     <div className="flex flex-col gap-1.5">
      {professionals.map((p, i) => {
        const profAppts = dailyAppointments.filter(a => a.professionalId === p.id && a.status !== 'cancelled');
        const allPaid = profAppts.length > 0 && profAppts.every(a => a.status === 'pago');
        const dayEx = dbExceptions.filter(ex => ex.date === currentDate && ex.professional_id === p.id);
        const hasCriticalEx = dayEx.some(ex => ex.type === 'vacation' || ex.type === 'sick' || ex.type === 'off');
        const hasLunchEx = dayEx.some(ex => ex.type === 'lunch');
        
        let statusColor = '#6b7280'; // Cinza (Vazio)
        if (hasCriticalEx) {
          statusColor = '#ef4444'; // Vermelho (Indisponível)
        } else if (hasLunchEx) {
          statusColor = '#60a5fa'; // Azul (Almoço)
        } else if (allPaid) {
          statusColor = '#6b7280'; // Cinza (Finalizado)
        } else if (profAppts.length > 0) {
          statusColor = '#10b981'; // Verde (Com agendamentos ativos)
        }

        return (
          <button key={p.id} onClick={(e) => { e.stopPropagation(); setSelectedProfTab(p.id); setSelectedProfFilter(p.id); }}
           className={`flex items-center gap-3 px-3 py-3 rounded-2xl border text-xs font-bold transition-all w-full text-left ${selectedProfTab === p.id ? 'bg-amber-700/10 border-amber-700/40 text-amber-500' : 'border-white/[0.04] text-white/40 hover:border-amber-700/20 hover:text-white'}`}>
           <div className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundImage: p.avatar ? `url("${p.avatar}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {!p.avatar && <span className="text-xs font-black text-white/20">{p.name?.charAt(0) || 'P'}</span>}
           </div>
           <span className="flex-1 truncate">{p.name}</span>
           <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ background: statusColor }} />
          </button>
        );
      })}
     </div>
    </div>
   </div>

   {/* ========= CENTER PANEL: TIMELINE ========= */}
   <div className="m10-agenda-center flex flex-col overflow-hidden relative">
    {/* Professional Header */}
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04] flex-shrink-0">
     {/* Logotipo ou Identificação */}
     <div className="flex items-center gap-3">
      {activeProfessional && (
       <>
        <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg" style={{ backgroundImage: activeProfessional.avatar ? `url("${activeProfessional.avatar}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
         {!activeProfessional.avatar && <span className="text-xl font-black text-white/20">{activeProfessional.name?.charAt(0) || 'P'}</span>}
        </div>
        <div>
         <h2 className="text-sm font-bold text-white leading-tight">{activeProfessional.name}</h2>
         <p className="text-[10px] text-pink-500 font-bold uppercase tracking-wider">Profissional Especialista</p>
        </div>
       </>
      )}
     </div>
     <div className="flex gap-[6px]">
        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(); }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black border-none shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{background: 'var(--pink)'}}>
        <span className="material-symbols-outlined text-sm">add</span>
        Agendar Horário
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
        <div className="absolute w-full h-[2px] now-line z-20 pointer-events-none transition-all"
         style={{top: `${Math.max(0, ((time.getHours() - 5) * 72) + (time.getMinutes() / 60 * 72) + 24)}px`}}>
         <span className="absolute left-2 -top-[18px] text-[9px] font-black now-label py-0.5 px-1.5 rounded-md shadow-lg border border-pink-500/30">AGORA</span>
         <span className="absolute left-0 -top-[3px] w-[8px] h-[8px] rounded-full bg-pink-500 shadow-[0_0_8px_#ff1493] animate-pulse"/>
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
          {(() => {
            const slotEx = dbExceptions.filter(ex => {
             if (ex.date !== currentDate || ex.professional_id !== selectedProfTab) return false;
             if (!ex.start_time || !ex.end_time) return true; // Full day
             const [sH] = ex.start_time.split(':').map(Number);
             const [eH] = ex.end_time.split(':').map(Number);
             return slotH >= sH && slotH < eH;
            });

            if (slotEx.length > 0) {
             return slotEx.map(ex => (
              <div key={ex.id} className={`mb-2 p-3 rounded-xl border flex items-center gap-3 ${ex.type === 'lunch' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
               <span className="material-symbols-outlined text-sm">{ex.type === 'lunch' ? 'restaurant' : 'event_busy'}</span>
               <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest">{ex.type === 'lunch' ? 'Almoço' : ex.type === 'vacation' ? 'Férias' : ex.type === 'sick' ? 'Atestado' : 'Indisponível'}</span>
                {ex.notes && <span className="text-[10px] opacity-60 font-bold">{ex.notes}</span>}
               </div>
              </div>
             ));
            }

            if (mAppts.length === 0) {
             return <div className="text-[10px] text-white/[0.08] font-medium pt-2 pl-2 cursor-pointer hover:bg-white/[0.02] h-full rounded transition-all">Disponível</div>;
            }
            
            return null;
           })()}
           
           {mAppts.map(apt => {
            const color = getColorForAppt(apt);
            const statusBadge = apt.status === 'pago' ? {bg:'rgba(16,185,129,0.1)',color:'#10b981',text:'✓ Concluído'} :
             apt.status === 'em_atendimento' ? {bg:'rgba(99,102,241,0.1)',color:'#818cf8',text:'● Em Atendimento'} :
             apt.status === 'confirmed' ? {bg:'rgba(16,185,129,0.1)',color:'#10b981',text:'✓ Confirmado'} :
             {bg:'rgba(245,158,11,0.1)',color:'#f59e0b',text:'● Pendente'};
            const svc = services.find(s => s.title === apt.service);
            
            return (
             <div key={apt.id} className="m10-appt-card relative bg-[#1a2333] border border-white/[0.04] rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-1 hover:bg-[#1f2937] hover:border-white/[0.1] hover:shadow-xl group/card mb-2" style={{borderLeftWidth:3,borderLeftColor:color}}>
              <div className="flex justify-between items-start">
               <div>
                <div className="text-sm font-extrabold text-[#f3f4f6]">{apt.clientName}</div>
                <div className="text-[11px] text-amber-600 font-semibold mt-1">{apt.service}</div>
               </div>
               <span className="text-[9px] font-extrabold uppercase tracking-[1.5px] py-1 px-[10px] rounded-md" style={{background:statusBadge.bg,color:statusBadge.color, border: '1px solid currentColor'}}>{statusBadge.text}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
               <span className="text-[10px] font-semibold text-white/30 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>schedule</span>{apt.startHour}:{apt.startMinute} - {apt.endHour}:{apt.endMinute}</span>
               <span className="text-[10px] font-semibold text-white/30 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>timer</span>{apt.durationMinutes} min</span>
               <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>payments</span>{svc?.is_variable_price ? 'A partir de ' : ''}R$ {svc?.price.toFixed(2) || '---'}</span>
               <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{fontSize:13}}>call</span>{clients.find(c=>c.name===apt.clientName)?.phone || '(00) 0000-0000'}</span>
               
               <div className="flex gap-1 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity">
                {apt.status === 'pending' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'confirmed')}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-400"><span className="material-symbols-outlined" style={{fontSize:15}}>check</span></button>}
                {apt.status === 'confirmed' && <button onClick={(e) => {e.stopPropagation(); handleUpdateStatus(apt.id,'em_atendimento')}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500 hover:text-indigo-400"><span className="material-symbols-outlined" style={{fontSize:15}}>play_arrow</span></button>}
                <button onClick={(e) => {e.stopPropagation(); startReschedule(apt)}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-amber-600/20 hover:border-amber-600 hover:text-amber-400"><span className="material-symbols-outlined" style={{fontSize:15}}>edit</span></button>
                <button onClick={(e) => {e.stopPropagation(); handleCancel(apt)}} className="w-7 h-7 rounded border border-white/[0.08] bg-black/40 text-white/60 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500 hover:text-red-400"><span className="material-symbols-outlined" style={{fontSize:15}}>close</span></button>
               </div>
              </div>
             </div>
            );
           })}
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
   <div className="m10-agenda-right flex flex-col gap-4 p-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px]">{currentDate ? 'Agendamentos Hoje' : 'Agendamentos Mês'}</div>
     <div className="text-3xl font-black mt-2 tracking-tight font-bebas">{totalAppts}</div>
     <div className="text-[10px] font-bold text-cyan-400 mt-2 flex items-center gap-1"><span className="material-symbols-outlined" style={{fontSize:12}}>arrow_upward</span>20% vs {currentDate ? 'ontem' : 'mês ant.'}</div>
     <div className="h-[4px] bg-white/[0.04] rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.min(occupancyRate,100)}%`,background:'var(--cyan)'}}/></div>
    </div>

    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px]">Receita Estimada</div>
     <div className="text-3xl font-black mt-2 tracking-tight text-white font-bebas">R$ <span className="pink-val">{totalRevenue.toLocaleString('pt-BR')}</span></div>
     <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-4 pt-3 border-t border-white/[0.05]">Total projetado para o {currentDate ? 'dia' : 'mês'}</p>
    </div>

    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px]">Taxa de Ocupação</div>
     <div className="text-3xl font-black mt-2 tracking-tight text-pink-500 font-bebas">{occupancyRate}%</div>
     <div className="h-[4px] bg-white/[0.04] rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.min(occupancyRate,100)}%`,background:'var(--pink)'}}/></div>
    </div>

    {upcomingAppts.length > 0 && (
     <div className="rounded-2xl p-[18px] border border-pink-700/20 flex flex-col max-h-[400px]" style={{background:'linear-gradient(135deg,rgba(255, 20, 147, 0.1),rgba(255, 20, 147, 0.02))'}}>
      <div className="text-[9px] font-extrabold text-pink-600 uppercase tracking-[2px] mb-3 flex justify-between items-center">
        <span>Agendamentos do Mês</span>
        <span className="bg-pink-500/20 px-1.5 py-0.5 rounded text-[8px]">{upcomingAppts.length}</span>
      </div>
      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
       {upcomingAppts.map((apt, i) => {
         const aptTime = new Date(`${apt.date}T${apt.startHour}:${apt.startMinute}:00`);
         const diffMs = aptTime.getTime() - time.getTime();
         const diffMins = Math.round(diffMs / 60000);
         
         let label = '';
         if (diffMins < 0) {
             if (apt.date === dateString) label = `${Math.abs(diffMins)}m atrasado`;
             else label = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
         }
         else if (diffMins === 0) label = 'Agora';
         else if (diffMins < 60) label = `${diffMins}min`;
         else if (diffMins < 1440) label = `${Math.floor(diffMins/60)}h ${diffMins%60}m`;
         else label = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

         return (
          <div key={apt.id} className={`flex items-center justify-between ${i < upcomingAppts.length - 1 ? 'pb-3 border-b border-white/[0.03]' : ''}`}>
           <div className="flex-1 pr-2">
            <div className="text-[11px] font-bold text-white">{apt.clientName}</div>
            <div className="text-[9px] text-white/40 mt-0.5 font-medium">{apt.service} • {apt.startHour}:{apt.startMinute}</div>
           </div>
           <div className="text-right flex-shrink-0">
            <div className="text-[9px] text-pink-500 font-black uppercase tracking-wider">{label}</div>
            <div className="text-[8px] text-white/20 font-bold mt-0.5">{apt.professionalName}</div>
           </div>
          </div>
         );
       })}
      </div>
     </div>
    )}


    {/* Live Activity Feed */}
    <div className="rounded-2xl p-[18px] bg-white/[0.02] border border-white/[0.04] backdrop-blur-xl">
     <div className="text-[9px] font-extrabold text-white/30 uppercase tracking-[2px] mb-4 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_6px_rgba(255,20,147,0.8)]"/>
      Tempo Real
     </div>
     
     <style dangerouslySetInnerHTML={{__html: `
      .feed-item { animation: feed-in 0.5s ease-out forwards; opacity: 0; }
      @keyframes feed-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
     `}} />
     
     <div className="space-y-0">
      {appointments
        .filter(a => ['pago', 'confirmed', 'cancelled', 'em_atendimento'].includes(a.status))
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 5)
        .map((a, i) => {
          const updateTime = new Date(a.updatedAt || 0);
          const diffMs = time.getTime() - updateTime.getTime();
          const diffMins = Math.max(0, Math.floor(diffMs / 60000));
          
          let timeLabel = diffMins === 0 ? 'agora' : `há ${diffMins} min`;
          if (diffMins >= 60 && diffMins < 1440) timeLabel = `há ${Math.floor(diffMins/60)}h`;
          else if (diffMins >= 1440) timeLabel = `há ${Math.floor(diffMins/1440)}d`;

          const dotColor = a.status === 'pago' ? 'bg-cyan-400' : 
                          a.status === 'confirmed' ? 'bg-pink-500' : 
                          a.status === 'cancelled' ? 'bg-red-500' : 'bg-emerald-400';

          let message = "";
          if (a.status === 'pago') message = `<strong class="text-white">${a.professionalName}</strong> finalizou <strong class="text-white">${a.clientName}</strong>`;
          else if (a.status === 'confirmed') message = `<strong class="text-white">${a.clientName}</strong> confirmou às ${a.startHour}:${a.startMinute}`;
          else if (a.status === 'cancelled') message = `<strong class="text-white">${a.clientName}</strong> cancelou ${a.service}`;
          else if (a.status === 'em_atendimento') message = `<strong class="text-white">${a.professionalName}</strong> iniciou ${a.service}`;

          return (
            <div key={a.id+'feed'} className="flex gap-2.5 py-2.5 border-b border-white/[0.03] feed-item" style={{animationDelay: `${i*100}ms`}}>
             <div className={`w-[7px] h-[7px] rounded-full mt-[5px] flex-shrink-0 ${dotColor}`}/>
             <div>
              <div className="text-[10px] font-medium text-white/50 leading-[1.4]" dangerouslySetInnerHTML={{__html: message}} />
              <div className="text-[9px] text-white/20 mt-0.5 font-bold uppercase tracking-wider">{timeLabel}</div>
             </div>
            </div>
          );
        })}
     </div>
    </div>

   </div>
  </div>

  {/* ===== MODALS ===== */}
  {/* CANCEL MODAL */}
  {isCancelModalOpen && createPortal(
   <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl w-[90%] max-w-md animate-in zoom-in-95 border border-white/10 text-white">
     <h3 className="text-xl font-bold mb-2">Cancelar Agendamento</h3>
     <p className="text-sm text-white/50 mb-4">Por favor, informe o motivo do cancelamento.</p>
     <textarea value={cancelJustification} onChange={(e) => setCancelJustification(e.target.value)} placeholder="Ex: Cliente teve imprevisto, Profissional doente..." className="w-full p-4 rounded-xl border border-white/10 bg-[#0f172a] mb-5 min-h-[120px] focus:ring-2 focus:ring-pink-500 outline-none resize-none text-sm text-white" autoFocus />
     <div className="flex gap-3 justify-end">
      <button onClick={() => { setIsCancelModalOpen(false); setCancelJustification(''); }} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all">Voltar</button>
      <button onClick={() => { if (appointmentToCancel) { handleUpdateStatus(appointmentToCancel.id, 'cancelled'); setIsCancelModalOpen(false); setCancelJustification(''); setAppointmentToCancel(null); }}} className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2">
       <span className="material-symbols-outlined text-sm">cancel</span>Confirmar Cancelamento
      </button>
     </div>
    </div>
   </div>,
   document.body
  )}

  {/* WIZARD MODAL */}
  {isModalOpen && createPortal(
   <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
    <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/10 animate-in zoom-in-95 text-white">
     <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0f172a]">
      <div>
       <h2 className="text-xl font-bold flex items-center gap-2.5 text-white font-bebas">
        <span className="material-symbols-outlined text-pink-500">calendar_add_on</span>Novo Agendamento
       </h2>
       <p className="text-sm text-white/50 mt-1">Passo {wizardStep} de 4</p>
      </div>
      <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
       <span className="material-symbols-outlined" style={{fontSize:20}}>close</span>
      </button>
     </div>
     <div className="flex h-1.5 w-full bg-[#0f172a]">
      <div className="transition-all duration-300" style={{width:`${(wizardStep/4)*100}%`,background:'linear-gradient(90deg, var(--pink), var(--cyan))'}}/>
     </div>
     <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
      {wizardStep === 1 && renderStep1()}
      {wizardStep === 2 && renderStep2()}
      {wizardStep === 3 && renderStep3()}
      {wizardStep === 4 && renderStep4()}
     </div>
     <div className="p-6 border-t border-white/10 bg-[#0f172a] flex justify-between gap-3">
      <button onClick={() => setWizardStep(prev => Math.max(1, prev - 1))} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${wizardStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
       <span className="material-symbols-outlined text-lg">arrow_back</span>Voltar
      </button>
      {wizardStep < 4 ? (
       <button onClick={() => setWizardStep(prev => prev + 1)} disabled={(wizardStep === 1 && !selectedClient) || (wizardStep === 2 && !selectedProfessional) || (wizardStep === 3 && !selectedService)} className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-pink-900/20 transition-all active:scale-95 disabled:opacity-50 text-black" style={{background:'var(--pink)'}}>
        Continuar<span className="material-symbols-outlined text-lg">arrow_forward</span>
       </button>
      ) : (
       <button onClick={handleConfirmAppointment} disabled={!selectedTimeSlot || !!timeError || !wizardDate} className="flex items-center gap-2 px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black rounded-xl font-bold text-sm shadow-[0_4px_15px_rgba(0,255,245,0.3)] transition-all active:scale-95">
        {isRescheduling ? 'Confirmar Reagendamento' : 'Confirmar Agendamento'}<span className="material-symbols-outlined text-lg">check_circle</span>
       </button>
      )}
     </div>
    </div>
   </div>,
   document.body
  )}

  {/* ERROR MODAL */}
  {errorModalState.isOpen && createPortal(
   <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
   </div>,
   document.body
  )}
 </div>
 );

};

export default DetailedAgenda;
