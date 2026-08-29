import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { 
  Calendar as CalendarIcon, Clock, User, CheckCircle2, PlayCircle, 
  Phone, MessageSquare, Sparkles, Award, Flame, ChevronLeft, ChevronRight, 
  FileText, Info, DollarSign, X, Coffee, AlertTriangle, ShieldCheck, Heart,
  CalendarDays, Zap, Plus, Compass
} from 'lucide-react';

interface AppointmentItem {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  servico_iniciado_at: string | null;
  servico_terminado_at: string | null;
  client: { 
    id: string;
    name: string; 
    phone: string | null; 
    favorite_drink: string | null; 
    allergies: string | null;
    preferences: string | null;
    is_vip: boolean | null;
    avatar_url: string | null;
  } | null;
  service: { 
    id: string;
    title: string; 
    category: string | null;
    price: number; 
    duration_minutes: number; 
    commission_percentage: number | null 
  } | null;
}

export const CollaboratorMobileHome: React.FC = () => {
  const { profile, professionalId } = useCurrentUserRef();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    fetchAppointments(true);

    // Live Supabase WebSockets Realtime Channel Listener
    const channel = supabase
      .channel('appointments-live-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments(false);
        }
      )
      .subscribe();

    // Live High-Frequency Auto-Sync (every 4 seconds)
    const pollInterval = setInterval(() => {
      fetchAppointments(false);
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [professionalId, selectedDate]);

  useEffect(() => {
    setCalendarViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          notes,
          servico_iniciado_at,
          servico_terminado_at,
          client:clients ( id, name, phone, favorite_drink, allergies, preferences, is_vip, avatar_url ),
          service:services ( id, title, category, price, duration_minutes, commission_percentage )
        `)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .neq('status', 'cancelado')
        .neq('status', 'cancelada')
        .order('start_time', { ascending: true });

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error } = await query;

      if (!error && data) {
        setAppointments(data as any);
      }
    } catch (e) {
      console.error('Erro ao carregar agendamentos:', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const isCompletedStatus = (status: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'concluido' || s === 'concluído' || s === 'finalizado' || s === 'pago' || s === 'concluida' || s === 'finalizada';
  };

  const isCancelledStatus = (status: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'cancelado' || s === 'cancelada';
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'em_andamento') {
        updateData.servico_iniciado_at = new Date().toISOString();
      } else if (newStatus === 'concluido') {
        updateData.servico_terminado_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (!error) {
        fetchAppointments(false);
        if (selectedAppointment && selectedAppointment.id === id) {
          setSelectedAppointment({ ...selectedAppointment, status: newStatus });
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedAppointment) return;
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ notes: noteText })
        .eq('id', selectedAppointment.id);

      if (!error) {
        fetchAppointments(false);
        setSelectedAppointment({ ...selectedAppointment, notes: noteText });
      }
    } catch (e) {
      console.error('Erro ao salvar nota:', e);
    } finally {
      setSavingNote(false);
    }
  };

  const changeDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Exclude cancelled appointments completely
  const activeAppointments = appointments.filter(app => !isCancelledStatus(app.status));

  const filteredAppointments = activeAppointments.filter(app => {
    if (filter === 'pending') return app.status === 'agendado' || app.status === 'confirmado';
    if (filter === 'in_progress') return app.status === 'em_andamento';
    if (filter === 'completed') return isCompletedStatus(app.status);
    return true;
  });

  const nextAppointment = activeAppointments.find(a => a.status === 'agendado' || a.status === 'confirmado' || a.status === 'em_andamento');

  const completedAppointments = activeAppointments.filter(a => isCompletedStatus(a.status));
  const inProgressAppointments = activeAppointments.filter(a => a.status === 'em_andamento');
  
  const estimatedCommission = activeAppointments.reduce((acc, curr) => {
    const price = curr.service?.price || 0;
    const pct = curr.service?.commission_percentage || 50;
    return acc + (price * pct / 100);
  }, 0);

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  // Calendar Grid Calculation Helpers for Date Picker Modal
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarYear = calendarViewDate.getFullYear();
  const calendarMonth = calendarViewDate.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const startingDayOffset = firstDay === 0 ? 6 : firstDay - 1;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Work Hours Beam Array for 3D Chronological Timeline (08:00 às 20:00)
  const workHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const currentHourNum = new Date().getHours();

  return (
    <div className="flex flex-col min-h-screen text-slate-100 pb-28">
      {/* Header Bar */}
      <header className="px-5 pt-9 pb-4 bg-[#0b1026]/90 backdrop-blur-xl border-b border-[#00f0ff]/20 sticky top-0 z-40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-7">
            {/* User Avatar Photo Container */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#b000ff] p-[2px] shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Foto do Usuário'}
                    className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                  />
                ) : (
                  <div className="w-full h-full rounded-[14px] bg-[#050814] flex items-center justify-center text-[#00f0ff] font-black text-lg uppercase">
                    {profile?.full_name?.charAt(0) || <User className="w-6 h-6 text-[#00f0ff]" />}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00f0ff] border-2 border-[#050814] shadow-[0_0_8px_#00f0ff] animate-pulse" />
            </div>

            {/* Name ON TOP, COLABORADOR BELOW (With generous spacing) */}
            <div className="pl-2">
              <h1 className="text-base font-black text-white tracking-tight leading-none">
                {profile?.full_name?.split(' ')[0] || 'Profissional'}
              </h1>
              <span className="text-[10px] text-[#00f0ff] font-black uppercase tracking-widest block mt-1">
                COLABORADOR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedDate(new Date())}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                isToday(selectedDate) 
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{isToday(selectedDate) ? 'Hoje' : 'Ir p/ Hoje'}</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        <div 
          className="flex items-center justify-between p-1.5 rounded-2xl border border-[#00f0ff]/30 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
          style={{ backgroundColor: '#070b19' }}
        >
          <button 
            onClick={() => changeDate(-1)}
            className="p-2.5 rounded-xl text-[#00f0ff] hover:bg-[#00f0ff]/20 active:scale-95 transition-all flex items-center justify-center border border-[#00f0ff]/30"
            style={{ backgroundColor: '#0e1738', color: '#00f0ff' }}
            title="Dia Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[#00f0ff]" />
          </button>

          {/* Clickable Date Text */}
          <button
            onClick={() => setShowDatePickerModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#00f0ff]/40 shadow-[0_0_15px_rgba(0,240,255,0.2)] active:scale-95 transition-all cursor-pointer group"
            style={{ backgroundColor: '#0e1738', color: '#ffffff' }}
          >
            <CalendarDays className="w-4 h-4 text-[#00f0ff] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-white uppercase tracking-wider capitalize">
              {formatDateLabel(selectedDate)}
            </span>
          </button>

          <button 
            onClick={() => changeDate(1)}
            className="p-2.5 rounded-xl text-[#00f0ff] hover:bg-[#00f0ff]/20 active:scale-95 transition-all flex items-center justify-center border border-[#00f0ff]/30"
            style={{ backgroundColor: '#0e1738', color: '#00f0ff' }}
            title="Próximo Dia"
          >
            <ChevronRight className="w-5 h-5 text-[#00f0ff]" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 space-y-4">
        {/* KPI Metrics Dashboard Bar */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-[#0b1026]/80 border border-[#00f0ff]/20 text-center backdrop-blur-md">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Agendados</span>
            <span className="text-base font-black text-white">{appointments.length}</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0b1026]/80 border border-[#10b981]/20 text-center backdrop-blur-md">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Concluídos</span>
            <span className="text-base font-black text-[#10b981]">{completedAppointments.length}</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0b1026]/80 border border-[#ffd700]/20 text-center backdrop-blur-md">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Est. Comissão</span>
            <span className="text-base font-black text-[#ffd700]">R$ {estimatedCommission.toFixed(0)}</span>
          </div>
        </div>

        {/* Featured Next Appointment Widget (if today) */}
        {nextAppointment && isToday(selectedDate) && (
          <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#0e1738]/95 to-[#180e38]/95 border border-[#00f0ff]/40 shadow-[0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-xl">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#00f0ff]/10 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                  {nextAppointment.status === 'em_andamento' ? '🔥 EM ANDAMENTO' : '⏳ PRÓXIMO ATENDIMENTO'}
                </span>
              </div>
              <span className="text-xs font-extrabold text-[#ffd700] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(nextAppointment.start_time)}
              </span>
            </div>

            <div className="space-y-1 mb-3">
              <h2 className="text-lg font-black text-white tracking-tight">
                {nextAppointment.client?.name || 'Cliente Sem Nome'}
              </h2>
              <p className="text-xs font-bold text-[#00f0ff]">
                {nextAppointment.service?.title || 'Serviço Personalizado'}
              </p>

              {/* Client Preference Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {nextAppointment.client?.favorite_drink && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ffd700] bg-[#ffd700]/10 px-2 py-0.5 rounded-md border border-[#ffd700]/30">
                    <Coffee className="w-3 h-3" />
                    <span>{nextAppointment.client.favorite_drink}</span>
                  </span>
                )}
                {nextAppointment.client?.allergies && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Alergia: {nextAppointment.client.allergies}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              {nextAppointment.status !== 'em_andamento' && (
                <button
                  onClick={() => handleUpdateStatus(nextAppointment.id, 'em_andamento')}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#00a8ff] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.5)] active:scale-95 transition-transform"
                >
                  <PlayCircle className="w-4 h-4 fill-black" />
                  <span>Iniciar Atendimento</span>
                </button>
              )}
              {nextAppointment.status === 'em_andamento' && (
                <button
                  onClick={() => handleUpdateStatus(nextAppointment.id, 'concluido')}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.5)] active:scale-95 transition-transform"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir Atendimento</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedAppointment(nextAppointment);
                  setNoteText(nextAppointment.notes || '');
                }}
                className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center"
                title="Ver Detalhes"
              >
                <Info className="w-4 h-4" />
              </button>

              {nextAppointment.client?.phone && (
                <a
                  href={`https://wa.me/55${nextAppointment.client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 text-[#25d366] flex items-center justify-center shadow-[0_0_10px_rgba(37,211,102,0.3)]"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status Category Filter Pills (Centered 3-Column Grid) */}
        <div className="grid grid-cols-3 gap-2 w-full pt-1">
          {[
            { id: 'pending', label: 'Agendados' },
            { id: 'in_progress', label: 'Em Andamento' },
            { id: 'completed', label: 'Concluídos' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`py-2 px-1 rounded-xl text-xs font-extrabold text-center transition-all ${
                filter === f.id
                  ? 'bg-gradient-to-r from-[#00f0ff] to-[#b000ff] text-white shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'bg-[#0b1026]/70 text-slate-400 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 🌟 3D FUTURISTIC SPATIAL CHRONOLOGICAL TIMELINE OR LIST VIEWS */}
        <div className="space-y-4 pt-1">
          {loading ? (
            <div className="py-16 text-center space-y-3 bg-[#070b19]/60 rounded-3xl border border-[#00f0ff]/20">
              <div className="w-12 h-12 border-4 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin mx-auto shadow-[0_0_20px_#00f0ff]" />
              <p className="text-xs text-[#00f0ff] font-black uppercase tracking-widest">Sincronizando Órbita do Tempo...</p>
            </div>
          ) : filter === 'in_progress' ? (
            /* SLEEK LIST VIEW FOR IN PROGRESS SERVICES */
            <div className="space-y-3 pt-1">
              {inProgressAppointments.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-[#0b1026]/60 border border-[#00f0ff]/20 text-slate-400 space-y-2 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                  <Zap className="w-8 h-8 text-[#00f0ff]/40 mx-auto animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Nenhum atendimento em andamento para esta data.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inProgressAppointments.map((app) => {
                    const price = app.service?.price || 0;
                    const pct = app.service?.commission_percentage || 50;
                    const commissionVal = (price * pct) / 100;

                    return (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedAppointment(app);
                          setNoteText(app.notes || '');
                        }}
                        className="relative p-4 rounded-3xl bg-gradient-to-br from-[#0b1638]/95 via-[#130f38]/95 to-[#0b1638]/95 border border-[#00f0ff] shadow-[0_10px_35px_rgba(0,240,255,0.3)] backdrop-blur-xl space-y-3 cursor-pointer active:scale-[0.98] transition-all ring-1 ring-[#00f0ff]"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#00f0ff] bg-[#00f0ff]/15 px-3 py-0.5 rounded-xl border border-[#00f0ff]/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatTime(app.start_time)} → {formatTime(app.end_time)}</span>
                            </span>
                          </div>

                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.4)] animate-pulse">
                            ⚡ Em Andamento
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#b000ff] p-[1.5px] shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                              <img
                                src={app.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.client?.name}`}
                                alt={app.client?.name}
                                className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">{app.client?.name || 'Cliente'}</h4>
                              <p className="text-xs text-[#00f0ff] font-bold mt-0.5">{app.service?.title}</p>
                            </div>
                          </div>

                          <div className="text-right bg-[#050814]/80 p-2.5 rounded-2xl border border-white/10">
                            <span className="text-xs font-black text-white block">R$ {price.toFixed(2)}</span>
                            <span className="text-[9px] font-bold text-[#ffd700] block mt-0.5">
                              Comissão: R$ {commissionVal.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(app.id, 'concluido');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Finalizar Atendimento</span>
                          </button>
                          {app.client?.phone && (
                            <a
                              href={`https://wa.me/55${app.client.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 text-[#25d366] flex items-center justify-center hover:bg-[#25d366]/30"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : filter === 'completed' ? (
            /* SLEEK LIST VIEW FOR COMPLETED SERVICES (Native Page Scroll) */
            <div className="space-y-3 pt-1">
              {completedAppointments.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-[#0b1026]/60 border border-slate-800/80 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#10b981]/40 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Nenhum atendimento concluído para esta data.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedAppointments.map((app) => {
                    const price = app.service?.price || 0;
                    const pct = app.service?.commission_percentage || 50;
                    const commissionVal = (price * pct) / 100;

                    return (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedAppointment(app);
                          setNoteText(app.notes || '');
                        }}
                        className="p-4 rounded-3xl bg-gradient-to-br from-[#061824]/95 via-[#082020]/95 to-[#061824]/95 border border-[#10b981]/40 shadow-[0_8px_25px_rgba(16,185,129,0.2)] backdrop-blur-xl space-y-3 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#10b981] bg-[#10b981]/15 px-3 py-0.5 rounded-xl border border-[#10b981]/30 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatTime(app.start_time)} → {formatTime(app.end_time)}</span>
                            </span>
                          </div>

                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                            ✓ Concluído
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#00f0ff] p-[1.5px]">
                              <img
                                src={app.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.client?.name}`}
                                alt={app.client?.name}
                                className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">{app.client?.name || 'Cliente'}</h4>
                              <p className="text-xs text-[#10b981] font-bold mt-0.5">{app.service?.title}</p>
                            </div>
                          </div>

                          <div className="text-right bg-[#050814]/80 p-2.5 rounded-2xl border border-white/10">
                            <span className="text-xs font-black text-white block">R$ {price.toFixed(2)}</span>
                            <span className="text-[9px] font-bold text-[#ffd700] block mt-0.5">
                              Comissão: R$ {commissionVal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 3D Chronological Timeline Container (Native Page Scroll) */
            <div className="relative pl-10 space-y-5 pt-2 pb-6">
              {/* Render Hourly Slots Chronologically */}
              {workHours.map((hour, index) => {
                const hourFormatted = `${hour.toString().padStart(2, '0')}:00`;
                
                // Find appointments starting in this hour slot
                const hourAppointments = filteredAppointments.filter(app => {
                  if (!app.start_time) return false;
                  const appHour = new Date(app.start_time).getHours();
                  return appHour === hour;
                });

                const isCurrentHour = isToday(selectedDate) && currentHourNum === hour;

                return (
                  <div key={hour} className="relative space-y-2 group">
                    {/* Continuous Glowing Laser Beam Segment (Connects all nodes seamlessly) */}
                    {index < workHours.length - 1 && (
                      <div className="absolute -left-[18px] top-3 -bottom-6 w-[3px] bg-gradient-to-b from-[#00f0ff] via-[#b000ff] to-[#00f0ff] rounded-full shadow-[0_0_10px_#00f0ff,0_0_18px_#b000ff] z-0" />
                    )}

                    {/* Hourly 3D Orb Node Marker (Fully Visible Zero Clipping) */}
                    <div className="absolute -left-[29px] top-1 flex items-center justify-center z-10">
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          hourAppointments.length > 0
                            ? 'bg-[#00f0ff] border-white shadow-[0_0_15px_#00f0ff] scale-110'
                            : isCurrentHour
                            ? 'bg-[#ffd700] border-white shadow-[0_0_15px_#ffd700] animate-pulse'
                            : 'bg-[#070b19] border-[#00f0ff]/40'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${hourAppointments.length > 0 ? 'bg-[#050814]' : isCurrentHour ? 'bg-black' : 'bg-[#00f0ff]'}`} />
                      </div>
                      <span className="text-[10px] font-black text-[#00f0ff] ml-7 tracking-wider bg-[#070b19]/90 px-2 py-0.5 rounded-lg border border-[#00f0ff]/30 shadow-md whitespace-nowrap">
                        {hourFormatted}
                      </span>
                    </div>

                    {/* Live NOW 3D Laser Indicator */}
                    {isCurrentHour && (
                      <div className="pt-7 pb-1 pl-1 flex items-center gap-2">
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-[#00f0ff] via-[#ffd700] to-transparent shadow-[0_0_10px_#00f0ff]" />
                        <span className="text-[9px] font-black uppercase text-[#ffd700] bg-[#ffd700]/10 px-2 py-0.5 rounded-full border border-[#ffd700]/40 shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                          📍 Linha do Tempo Atual
                        </span>
                      </div>
                    )}

                    {/* Appointment Cards for this hour slot */}
                    {hourAppointments.length > 0 ? (
                      <div className="pt-7 space-y-3">
                        {hourAppointments.map((app) => {
                          const price = app.service?.price || 0;
                          const pct = app.service?.commission_percentage || 50;
                          const commissionVal = (price * pct) / 100;
                          const isInProgress = app.status === 'em_andamento';
                          const isCompleted = isCompletedStatus(app.status);

                          return (
                            <div
                              key={app.id}
                              onClick={() => {
                                setSelectedAppointment(app);
                                setNoteText(app.notes || '');
                              }}
                              className={`relative p-4 rounded-3xl transition-all duration-300 cursor-pointer backdrop-blur-xl border space-y-3 ${
                                isInProgress
                                  ? 'bg-gradient-to-br from-[#0b1638]/95 via-[#130f38]/95 to-[#0b1638]/95 border-[#00f0ff] shadow-[0_10px_35px_rgba(0,240,255,0.3),0_0_20px_rgba(0,240,255,0.2)] ring-1 ring-[#00f0ff]'
                                  : isCompleted
                                  ? 'bg-gradient-to-br from-[#061824]/95 via-[#082020]/95 to-[#061824]/95 border-[#10b981]/50 shadow-[0_8px_25px_rgba(16,185,129,0.2)]'
                                  : 'bg-gradient-to-br from-[#090e24]/95 via-[#101738]/95 to-[#090e24]/95 border-[#00f0ff]/30 hover:border-[#00f0ff]/60 shadow-[0_8px_25px_rgba(0,0,0,0.6)]'
                              } active:scale-[0.98]`}
                            >
                              {/* 3D Corner Hologram Glow Accent */}
                              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f0ff]/10 rounded-full blur-xl pointer-events-none" />

                              {/* Time Range & Status Pill */}
                              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-[#00f0ff] bg-[#00f0ff]/15 px-3 py-1 rounded-xl border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)] flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{formatTime(app.start_time)} → {formatTime(app.end_time)}</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {app.service?.duration_minutes || 30} min
                                  </span>
                                </div>

                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                  isCompleted
                                    ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : isInProgress
                                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.4)] animate-pulse'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                  {isCompleted ? '✓ Concluído' : isInProgress ? '🔥 Em Andamento' : '⏳ Agendado'}
                                </span>
                              </div>

                              {/* Client Info & 3D Avatar */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#b000ff] p-[1.5px] shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                                    <img
                                      src={app.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.client?.name}`}
                                      alt={app.client?.name}
                                      className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                                    />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-black text-white">{app.client?.name || 'Cliente'}</h4>
                                      {app.client?.is_vip && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/40">VIP</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#00f0ff] font-bold mt-0.5">{app.service?.title}</p>
                                  </div>
                                </div>

                                {/* Financial Cockpit Badge */}
                                <div className="text-right bg-[#050814]/80 p-2.5 rounded-2xl border border-white/10">
                                  <span className="text-xs font-black text-white block">R$ {price.toFixed(2)}</span>
                                  <span className="text-[9px] font-bold text-[#ffd700] block mt-0.5">
                                    Sua Com: R$ {commissionVal.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Special Client Preferences */}
                              {(app.notes || app.client?.favorite_drink || app.client?.allergies) && (
                                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5 text-[10px]">
                                  {app.client?.favorite_drink && (
                                    <span className="text-[#ffd700] bg-[#ffd700]/10 px-2 py-0.5 rounded-lg border border-[#ffd700]/30 font-bold flex items-center gap-1">
                                      <Coffee className="w-3 h-3" />
                                      <span>{app.client.favorite_drink}</span>
                                    </span>
                                  )}
                                  {app.client?.allergies && (
                                    <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/30 font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Alergia: {app.client.allergies}</span>
                                    </span>
                                  )}
                                  {app.notes && (
                                    <span className="text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 font-medium truncate max-w-full">
                                      📝 {app.notes}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Quick Action Footer */}
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                                {app.status === 'agendado' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(app.id, 'em_andamento');
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#00a8ff] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.4)] active:scale-95"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5 fill-black" />
                                    <span>Iniciar</span>
                                  </button>
                                )}
                                {app.status === 'em_andamento' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(app.id, 'concluido');
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Finalizar</span>
                                  </button>
                                )}
                                {app.client?.phone && (
                                  <a
                                    href={`https://wa.me/55${app.client.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 rounded-xl bg-[#25d366]/20 border border-[#25d366]/40 text-[#25d366] flex items-center justify-center hover:bg-[#25d366]/30"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* 3D Spatial Cyber Docking Bay (Empty Slot for Pending Filter) */
                      filter === 'pending' && (
                        <div className="pt-6">
                          <div className="p-3 rounded-2xl border border-dashed border-[#00f0ff]/20 bg-[#070b19]/40 hover:bg-[#070b19]/70 transition-all flex items-center justify-between text-slate-500">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <Zap className="w-3.5 h-3.5 text-[#00f0ff]/40" />
                              <span>Horário Livre ({hourFormatted})</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-[#00f0ff]/50 bg-[#00f0ff]/5 px-2 py-0.5 rounded-md border border-[#00f0ff]/10">
                              Disponível
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Interactive Cyber Calendar Picker Modal */}
      {showDatePickerModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
        >
          <div className="bg-[#0b1026] border border-[#00f0ff]/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.3)] my-auto mx-auto">
            <div className="pb-3 border-b border-white/10 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#00f0ff]" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Selecionar Data da Agenda</h3>
            </div>

            {/* Interactive Grid Calendar */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCalendarViewDate(new Date(calendarYear, calendarMonth - 1, 1))}
                  className="p-2 rounded-xl text-[#00f0ff] hover:bg-[#00f0ff]/20 border border-[#00f0ff]/30 active:scale-95 transition-all flex items-center justify-center"
                  style={{ backgroundColor: '#0e1738', color: '#00f0ff' }}
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4 text-[#00f0ff]" />
                </button>
                <span className="text-xs font-black text-[#00f0ff] uppercase tracking-wider">
                  {monthNames[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={() => setCalendarViewDate(new Date(calendarYear, calendarMonth + 1, 1))}
                  className="p-2 rounded-xl text-[#00f0ff] hover:bg-[#00f0ff]/20 border border-[#00f0ff]/30 active:scale-95 transition-all flex items-center justify-center"
                  style={{ backgroundColor: '#0e1738', color: '#00f0ff' }}
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4 text-[#00f0ff]" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 text-center gap-1">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, idx) => (
                  <span key={idx} className="text-[9px] font-black text-slate-400 uppercase">
                    {day}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: startingDayOffset }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateObj = new Date(calendarYear, calendarMonth, dayNum);
                  const isSelected = dateObj.getDate() === selectedDate.getDate() &&
                    dateObj.getMonth() === selectedDate.getMonth() &&
                    dateObj.getFullYear() === selectedDate.getFullYear();
                  const isTodayDate = isToday(dateObj);

                  return (
                    <button
                      key={dayNum}
                      onClick={() => {
                        setSelectedDate(dateObj);
                        setShowDatePickerModal(false);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#00f0ff] to-[#b000ff] text-white font-black shadow-[0_0_10px_rgba(0,240,255,0.5)] scale-105'
                          : isTodayDate
                          ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-black'
                          : 'bg-[#050814] text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions: Ir Para Hoje + Fechar */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setSelectedDate(new Date());
                  setShowDatePickerModal(false);
                }}
                className="w-full py-2.5 rounded-2xl border border-[#00f0ff]/40 text-xs font-black uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors"
                style={{ backgroundColor: '#0e1738', color: '#00f0ff' }}
              >
                Ir para Hoje
              </button>

              <button
                onClick={() => setShowDatePickerModal(false)}
                className="w-full py-2.5 rounded-2xl border border-red-500/40 text-xs font-black uppercase tracking-wider transition-colors"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail & Notes Modal / Sheet */}
      {selectedAppointment && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
        >
          <div className="bg-[#0b1026] border border-[#00f0ff]/30 rounded-3xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto shadow-[0_0_40px_rgba(0,240,255,0.2)] my-auto mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="text-base font-black text-white">Ficha Completa do Atendimento</h3>
              </div>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Info */}
            <div className="p-4 rounded-2xl bg-[#050814] border border-white/10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#b000ff] p-[2px]">
                <img
                  src={selectedAppointment.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAppointment.client?.name}`}
                  alt={selectedAppointment.client?.name}
                  className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                />
              </div>
              <div>
                <h4 className="text-base font-black text-white">{selectedAppointment.client?.name || 'Cliente'}</h4>
                <p className="text-xs text-slate-400">{selectedAppointment.client?.phone || 'Sem telefone'}</p>
                {selectedAppointment.client?.is_vip && (
                  <span className="inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/40">
                    CLIENTE VIP
                  </span>
                )}
              </div>
            </div>

            {/* Service & Financial Info */}
            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Serviço Marcado:</span>
                  <span className="font-extrabold text-[#00f0ff]">{selectedAppointment.service?.title}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Duração Prevista:</span>
                  <span className="font-bold text-white">{selectedAppointment.service?.duration_minutes || 30} minutos</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Valor Total:</span>
                  <span className="font-bold text-white">R$ {(selectedAppointment.service?.price || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400 font-semibold">Sua Comissão ({selectedAppointment.service?.commission_percentage || 50}%):</span>
                  <span className="font-black text-[#ffd700]">
                    R$ {((selectedAppointment.service?.price || 0) * (selectedAppointment.service?.commission_percentage || 50) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Client Preferences & Allergies */}
            {(selectedAppointment.client?.favorite_drink || selectedAppointment.client?.allergies || selectedAppointment.client?.preferences) && (
              <div className="p-3.5 rounded-2xl bg-[#050814] border border-[#ffd700]/20 space-y-1.5">
                <span className="text-[10px] font-black text-[#ffd700] uppercase tracking-wider block">Preferências do Cliente</span>
                {selectedAppointment.client?.favorite_drink && (
                  <p className="text-xs text-slate-300">🍹 <strong>Bebida:</strong> {selectedAppointment.client.favorite_drink}</p>
                )}
                {selectedAppointment.client?.allergies && (
                  <p className="text-xs text-red-400">⚠️ <strong>Alergia:</strong> {selectedAppointment.client.allergies}</p>
                )}
                {selectedAppointment.client?.preferences && (
                  <p className="text-xs text-slate-300">📌 <strong>Obs:</strong> {selectedAppointment.client.preferences}</p>
                )}
              </div>
            )}

            {/* Note Editor */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Anotação / Observações do Atendimento</span>
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Digite detalhes do corte, produto utilizado ou observação..."
                rows={3}
                className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#00a8ff] text-[#050814] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              >
                {savingNote ? 'Salvando...' : 'Salvar Observação'}
              </button>
            </div>

            {/* Status Actions */}
            <div className="flex items-center gap-2 pt-2">
              {selectedAppointment.status !== 'em_andamento' && (
                <button
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'em_andamento')}
                  className="flex-1 py-3 rounded-xl bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4 fill-[#00f0ff]" />
                  <span>Iniciar</span>
                </button>
              )}
              {selectedAppointment.status === 'em_andamento' && (
                <button
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'concluido')}
                  className="flex-1 py-3 rounded-xl bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
