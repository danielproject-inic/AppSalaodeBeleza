import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useProfessionals } from '../hooks/useProfessionals';
import { supabase } from '../lib/supabase';

interface FloatingAppointmentTrackerProps {
    onNavigate: (screen: string) => void;
}

// Sintetizador de áudio sutil usando Web Audio API nativa
const playNotificationSound = (type: 'chime' | 'warning') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'chime') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
            osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.18); // F4
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {
        // Silêncio caso a política do navegador bloqueie antes do primeiro clique
    }
};

export const FloatingAppointmentTracker: React.FC<FloatingAppointmentTrackerProps> = ({ onNavigate }) => {
    // 1. Data de Hoje
    const today = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const startDate = `${todayStr}T00:00:00`;
    const endDate = `${todayStr}T23:59:59`;

    // 2. Hooks de Dados
    const { appointments, updateAppointment } = useAppointments(startDate, endDate);
    const { professionals } = useProfessionals();

    // 3. Estado de Relógio e Interface
    const [now, setNow] = useState(new Date());
    const [selectedProId, setSelectedProId] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
    const [cancelModalApt, setCancelModalApt] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const playedAlertsRef = useRef<Set<string>>(new Set());

    // Tick a cada 15 segundos para manter a precisão do relógio e dos semáforos
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // 4. Análise dos Atendimentos por Profissional
    const trackerData = useMemo(() => {
        // Filtra apenas agendamentos de hoje com status relevante
        const todayApts = appointments.filter(a => {
            if (!a.start_time) return false;
            const aptDate = a.start_time.split('T')[0];
            return aptDate === todayStr && ['confirmed', 'pending', 'em_atendimento'].includes(a.status || '');
        });

        // Agrupa por profissional
        const proMap = new Map<string, typeof todayApts>();
        todayApts.forEach(apt => {
            const proId = apt.professional_id || 'unassigned';
            if (!proMap.has(proId)) proMap.set(proId, []);
            proMap.get(proId)!.push(apt);
        });

        const activeTrackers: Array<{
            professionalId: string;
            professionalName: string;
            professionalAvatar?: string;
            activeApt: any | null;
            pendingApt: any | null;
            nextApt: any | null;
            state: 'in_service_on_time' | 'in_service_delayed' | 'ready_to_start' | 'waiting';
            elapsedMinutes: number;
            remainingToNextMinutes: number | null;
            delayedMinutes: number | null;
            minutesToStart: number | null;
        }> = [];

        proMap.forEach((apts, proId) => {
            const pro = professionals.find(p => p.id === proId);
            const proName = pro?.name || 'Profissional';
            const proAvatar = pro?.avatar_url || undefined;

            // Ordena por horário de início
            const sortedApts = [...apts].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            // Verifica se há alguém EM ATENDIMENTO
            const inServiceApt = sortedApts.find(a => a.status === 'em_atendimento') || null;

            // Próximo agendamento que ainda não começou
            const remainingScheduled = sortedApts.filter(a => ['confirmed', 'pending'].includes(a.status || ''));

            if (inServiceApt) {
                // Profissional está em atendimento
                const startTime = inServiceApt.servico_iniciado_at
                    ? new Date(inServiceApt.servico_iniciado_at)
                    : new Date(inServiceApt.start_time);

                const elapsedMin = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 60000));

                // Busca o próximo cliente agendado DEPOIS deste
                const nextApt = remainingScheduled.find(a => new Date(a.start_time).getTime() > new Date(inServiceApt.start_time).getTime()) || null;

                let state: 'in_service_on_time' | 'in_service_delayed' = 'in_service_on_time';
                let remainingToNextMinutes: number | null = null;
                let delayedMinutes: number | null = null;

                if (nextApt) {
                    const nextStartTime = new Date(nextApt.start_time).getTime();
                    const diffToNextMin = Math.floor((nextStartTime - now.getTime()) / 60000);

                    if (diffToNextMin >= 0) {
                        state = 'in_service_on_time';
                        remainingToNextMinutes = diffToNextMin;
                    } else {
                        state = 'in_service_delayed';
                        delayedMinutes = Math.abs(diffToNextMin);
                    }
                } else {
                    // Se não houver próximo agendamento, calcula baseado na duração estimada do serviço
                    const estimatedDuration = inServiceApt.service?.duration_minutes || 45;
                    if (elapsedMin > estimatedDuration + 10) {
                        state = 'in_service_delayed';
                        delayedMinutes = elapsedMin - estimatedDuration;
                    } else {
                        state = 'in_service_on_time';
                        remainingToNextMinutes = Math.max(0, estimatedDuration - elapsedMin);
                    }
                }

                activeTrackers.push({
                    professionalId: proId,
                    professionalName: proName,
                    professionalAvatar: proAvatar,
                    activeApt: inServiceApt,
                    pendingApt: null,
                    nextApt: nextApt,
                    state,
                    elapsedMinutes: elapsedMin,
                    remainingToNextMinutes,
                    delayedMinutes,
                    minutesToStart: null
                });

            } else if (remainingScheduled.length > 0) {
                // Não está em atendimento: avalia o primeiro agendamento da fila
                const candidate = remainingScheduled[0];
                const candStartTime = new Date(candidate.start_time).getTime();
                const diffMin = Math.floor((candStartTime - now.getTime()) / 60000);

                // Checa se foi colocado em tolerância (snooze)
                const isSnoozed = snoozedUntil[candidate.id] && now.getTime() < snoozedUntil[candidate.id];

                // Considera alerta se faltam 5 minutos ou menos, ou se já passou do horário e não está snoozado
                if (diffMin <= 5 && !isSnoozed) {
                    const delayedMin = diffMin < 0 ? Math.abs(diffMin) : 0;
                    activeTrackers.push({
                        professionalId: proId,
                        professionalName: proName,
                        professionalAvatar: proAvatar,
                        activeApt: null,
                        pendingApt: candidate,
                        nextApt: remainingScheduled[1] || null,
                        state: 'ready_to_start',
                        elapsedMinutes: 0,
                        remainingToNextMinutes: null,
                        delayedMinutes: delayedMin > 0 ? delayedMin : null,
                        minutesToStart: diffMin
                    });
                }
            }
        });

        return activeTrackers;
    }, [appointments, professionals, now, todayStr, snoozedUntil]);

    // Alarme sonoro discreto ao surgir um novo alerta
    useEffect(() => {
        trackerData.forEach(tracker => {
            if (tracker.state === 'ready_to_start' && tracker.pendingApt) {
                const key = `start_${tracker.pendingApt.id}`;
                if (!playedAlertsRef.current.has(key)) {
                    playedAlertsRef.current.add(key);
                    playNotificationSound('chime');
                }
            } else if (tracker.state === 'in_service_delayed' && tracker.activeApt) {
                const key = `delay_${tracker.activeApt.id}_${Math.floor((tracker.delayedMinutes || 0) / 10)}`;
                if (!playedAlertsRef.current.has(key)) {
                    playedAlertsRef.current.add(key);
                    playNotificationSound('warning');
                }
            }
        });
    }, [trackerData]);

    // Seleciona o primeiro profissional ativo caso o selecionado não exista mais
    const currentProTracker = useMemo(() => {
        if (!trackerData.length) return null;
        if (selectedProId) {
            const found = trackerData.find(t => t.professionalId === selectedProId);
            if (found) return found;
        }
        return trackerData[0];
    }, [trackerData, selectedProId]);

    // 5. Ações Rápidas
    const handleStartAppointment = async (aptId: string) => {
        try {
            setActionLoading(true);
            await updateAppointment(aptId, {
                status: 'em_atendimento',
                servico_iniciado_at: new Date().toISOString()
            });
            playNotificationSound('chime');
        } catch (err) {
            console.error('Erro ao iniciar atendimento:', err);
            alert('Não foi possível iniciar o atendimento.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSnoozeAppointment = (aptId: string, minutes: number = 10) => {
        const until = Date.now() + minutes * 60 * 1000;
        setSnoozedUntil(prev => ({ ...prev, [aptId]: until }));
    };

    const handleWhatsApp = (clientName: string, phone?: string | null, appointmentTime?: string) => {
        if (!phone) {
            alert(`O cliente ${clientName} não possui telefone cadastrado.`);
            return;
        }

        let cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }

        const hora = appointmentTime
            ? new Date(appointmentTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : 'agora';

        const message = `Olá, ${clientName}! Tudo bem? 🌸\n\nPassando para confirmar o seu atendimento marcado para às ${hora}. Já está a caminho? Estamos te aguardando!\n\nAtenciosamente, Salon Suite Pro`;

        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleConfirmCancel = async (noshow: boolean) => {
        if (!cancelModalApt) return;
        try {
            setActionLoading(true);
            await updateAppointment(cancelModalApt.id, {
                status: noshow ? 'noshow' : 'cancelled'
            });
            setCancelModalApt(null);
        } catch (err) {
            console.error('Erro ao cancelar:', err);
            alert('Erro ao cancelar agendamento.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleGoToCashier = () => {
        onNavigate('cashflow');
    };

    // Se não houver nenhum atendimento necessitando de ação/atenção no momento, não exibe nada
    if (trackerData.length === 0) {
        return null;
    }

    // MODO MINIMIZADO: Pílula elegante no canto inferior direito
    if (isMinimized) {
        const hasDelayed = trackerData.some(t => t.state === 'in_service_delayed');
        const readyCount = trackerData.filter(t => t.state === 'ready_to_start').length;
        const inServiceCount = trackerData.filter(t => t.state.startsWith('in_service')).length;

        return (
            <div className="fixed bottom-6 right-8 z-[100] animate-in slide-in-from-bottom-5 duration-300">
                <button
                    onClick={() => setIsMinimized(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all active:scale-95 group
                        ${hasDelayed
                            ? 'bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-rose-900/50 animate-pulse ring-2 ring-rose-500/30'
                            : 'bg-[#111827]/95 border-amber-500/40 text-white shadow-black/80 hover:border-amber-500'}`}
                >
                    <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasDelayed ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${hasDelayed ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                    </span>

                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                        {hasDelayed && <span className="text-rose-400 font-black">⚠️ Atraso detectado!</span>}
                        {!hasDelayed && inServiceCount > 0 && <span className="text-emerald-400 font-bold">{inServiceCount} em atendimento</span>}
                        {readyCount > 0 && <span className="text-amber-400 font-bold">• {readyCount} para iniciar</span>}
                    </div>

                    <span className="material-symbols-outlined text-sm opacity-60 group-hover:opacity-100 transition-opacity">open_in_full</span>
                </button>
            </div>
        );
    }

    // MODO COMPLETO: Barra Fixa Flutuante suspensa no topo
    return (
        <aside 
            aria-label="Painel de Atendimentos Ativos e Linha do Tempo"
            className="fixed top-20 lg:top-28 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-4 duration-300"
        >
            <div className="pointer-events-auto w-full max-w-[1400px] bg-[#111827]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all ring-1 ring-white/5">
                
                {/* 1. ABAS DE PROFISSIONAIS (Se houver múltiplos) */}
                {trackerData.length > 1 && (
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/5 overflow-x-auto scrollbar-hide bg-[#0b0f19]/60">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mr-2 flex items-center gap-1 flex-shrink-0">
                            <span className="material-symbols-outlined text-xs">group</span>
                            Profissionais:
                        </span>
                        {trackerData.map(tracker => {
                            const isSelected = currentProTracker?.professionalId === tracker.professionalId;
                            const isDelayed = tracker.state === 'in_service_delayed';
                            const isReady = tracker.state === 'ready_to_start';

                            return (
                                <button
                                    key={tracker.professionalId}
                                    onClick={() => setSelectedProId(tracker.professionalId)}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-shrink-0
                                        ${isSelected
                                            ? 'bg-white/10 text-white border border-white/20 shadow-md'
                                            : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white'}`}
                                >
                                    <div className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] overflow-hidden border border-white/10" style={{ backgroundImage: tracker.professionalAvatar ? `url("${tracker.professionalAvatar}")` : undefined, backgroundSize: 'cover' }}>
                                        {!tracker.professionalAvatar && tracker.professionalName.charAt(0)}
                                    </div>
                                    <span>{tracker.professionalName}</span>
                                    <span className={`size-2 rounded-full ${isDelayed ? 'bg-rose-500 animate-ping' : isReady ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 2. CORPO DO CARD ATIVO */}
                {currentProTracker && (
                    <div className="p-4 lg:p-5 flex flex-col lg:flex-row items-center justify-between gap-4">
                        
                        {/* INFORMAÇÕES DO ATENDIMENTO */}
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            {/* Avatar do Profissional */}
                            <div className="relative flex-shrink-0">
                                <div
                                    className="size-14 rounded-2xl bg-cover bg-center border-2 border-white/10 shadow-lg flex items-center justify-center bg-white/5 overflow-hidden"
                                    style={{ backgroundImage: currentProTracker.professionalAvatar ? `url("${currentProTracker.professionalAvatar}")` : undefined }}
                                >
                                    {!currentProTracker.professionalAvatar && (
                                        <span className="text-xl font-black text-white/30">
                                            {currentProTracker.professionalName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-[#111827] flex items-center justify-center shadow
                                    ${currentProTracker.state === 'in_service_delayed' ? 'bg-rose-500 text-white' : currentProTracker.state === 'ready_to_start' ? 'bg-amber-400 text-slate-900' : 'bg-emerald-500 text-slate-900'}`}>
                                    <span className="material-symbols-outlined text-[11px] font-black">
                                        {currentProTracker.state === 'in_service_delayed' ? 'priority_high' : currentProTracker.state === 'ready_to_start' ? 'schedule' : 'content_cut'}
                                    </span>
                                </div>
                            </div>

                            {/* Detalhes do Cliente e Serviço */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#b87333]">
                                        {currentProTracker.professionalName}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                    
                                    {/* Badge de Estado Principal */}
                                    {currentProTracker.state === 'ready_to_start' && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                            🟡 Horário Atingido — Iniciar?
                                        </span>
                                    )}
                                    {currentProTracker.state === 'in_service_on_time' && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest">
                                            🟢 Em Atendimento • No Prazo
                                        </span>
                                    )}
                                    {currentProTracker.state === 'in_service_delayed' && (
                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">warning</span>
                                            🔴 Atenção: Atraso na Linha do Tempo
                                        </span>
                                    )}
                                </div>

                                {/* Nome do Cliente e Serviço */}
                                {currentProTracker.state === 'ready_to_start' && currentProTracker.pendingApt && (
                                    <div className="mt-1">
                                        <h4 className="text-base lg:text-lg font-black text-white truncate flex items-center gap-2">
                                            <span>{currentProTracker.pendingApt.client?.name || 'Cliente'}</span>
                                            <span className="text-xs font-bold text-white/40">
                                                ({new Date(currentProTracker.pendingApt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                                            </span>
                                        </h4>
                                        <p className="text-xs text-white/50 truncate font-medium">
                                            Serviço: <strong className="text-white/80">{currentProTracker.pendingApt.service?.title || 'Serviço'}</strong> • Duração estimada: {currentProTracker.pendingApt.service?.duration_minutes || 45} min
                                        </p>
                                    </div>
                                )}

                                {currentProTracker.state.startsWith('in_service') && currentProTracker.activeApt && (
                                    <div className="mt-1">
                                        <h4 className="text-base lg:text-lg font-black text-white truncate flex items-center gap-2">
                                            <span>{currentProTracker.activeApt.client?.name || 'Cliente em Atendimento'}</span>
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                ⏱️ {currentProTracker.elapsedMinutes} min decorridos
                                            </span>
                                        </h4>
                                        <p className="text-xs text-white/50 truncate font-medium">
                                            Serviço: <strong className="text-white/80">{currentProTracker.activeApt.service?.title || 'Serviço'}</strong>
                                        </p>
                                    </div>
                                )}

                                {/* SEMÁFORO DO PRÓXIMO CLIENTE */}
                                {currentProTracker.state.startsWith('in_service') && (
                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                        {currentProTracker.nextApt ? (
                                            currentProTracker.state === 'in_service_on_time' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/20">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    <span>No prazo: Faltam <strong>{currentProTracker.remainingToNextMinutes} min</strong> para o próximo: <strong>{currentProTracker.nextApt.client?.name}</strong> ({new Date(currentProTracker.nextApt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-rose-300 font-black bg-rose-950/60 px-3 py-1 rounded-lg border border-rose-500/40 animate-pulse">
                                                    <span className="material-symbols-outlined text-sm">alarm_on</span>
                                                    <span>ATRASADO EM <strong>{currentProTracker.delayedMinutes} MIN</strong> • Próximo cliente: <strong>{currentProTracker.nextApt.client?.name}</strong> aguarda às {new Date(currentProTracker.nextApt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!</span>
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-white/40 text-[11px] font-medium italic">
                                                Nenhum agendamento posterior agendado para hoje com este profissional.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BOTÕES DE AÇÃO IMEDIATA */}
                        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-wrap">
                            
                            {/* CASO 1: HORÁRIO ATINGIDO (AGUARDANDO INÍCIO) */}
                            {currentProTracker.state === 'ready_to_start' && currentProTracker.pendingApt && (
                                <>
                                    {/* Iniciar Atendimento */}
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleStartAppointment(currentProTracker.pendingApt.id)}
                                        className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex-1 sm:flex-none justify-center"
                                        title="Iniciar Atendimento e registrar na Linha do Tempo"
                                    >
                                        <span className="material-symbols-outlined text-base">play_arrow</span>
                                        <span>INICIAR ATENDIMENTO</span>
                                    </button>

                                    {/* Chamar no WhatsApp */}
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleWhatsApp(
                                            currentProTracker.pendingApt.client?.name || 'Cliente',
                                            currentProTracker.pendingApt.client?.phone,
                                            currentProTracker.pendingApt.start_time
                                        )}
                                        className="h-11 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                        title="Chamar cliente no WhatsApp"
                                    >
                                        <span className="material-symbols-outlined text-base">chat</span>
                                        <span className="hidden sm:inline">WHATSAPP</span>
                                    </button>

                                    {/* Tolerância +10 min */}
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleSnoozeAppointment(currentProTracker.pendingApt.id, 10)}
                                        className="h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        title="Adiar aviso em 10 minutos (tolerância de chegada)"
                                    >
                                        <span className="material-symbols-outlined text-sm">snooze</span>
                                        <span>+10 MIN</span>
                                    </button>

                                    {/* Reagendar */}
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => onNavigate('agenda')}
                                        className="h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        title="Ir para a Agenda para reagendar"
                                    >
                                        <span className="material-symbols-outlined text-sm">event_repeat</span>
                                        <span className="hidden sm:inline">REAGENDAR</span>
                                    </button>

                                    {/* Não Compareceu / Cancelar */}
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => setCancelModalApt(currentProTracker.pendingApt)}
                                        className="h-11 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                        title="Registrar falta ou cancelamento"
                                    >
                                        <span className="material-symbols-outlined text-base">person_off</span>
                                        <span className="hidden sm:inline">CANCELAR</span>
                                    </button>
                                </>
                            )}

                            {/* CASO 2: EM ATENDIMENTO (FINALIZAÇÃO COM PAGAMENTO NO CAIXA) */}
                            {currentProTracker.state.startsWith('in_service') && currentProTracker.activeApt && (
                                <>
                                    {/* Chamar no WhatsApp se precisar avisar acompanhante ou enviar recado */}
                                    <button
                                        onClick={() => handleWhatsApp(
                                            currentProTracker.activeApt.client?.name || 'Cliente',
                                            currentProTracker.activeApt.client?.phone
                                        )}
                                        className="h-12 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        title="Mensagem rápida no WhatsApp"
                                    >
                                        <span className="material-symbols-outlined text-base">chat</span>
                                        <span className="hidden sm:inline">WHATSAPP</span>
                                    </button>

                                    {/* Botão de Destaque: FINALIZAR & COBRAR NO CAIXA */}
                                    <button
                                        onClick={handleGoToCashier}
                                        className={`h-12 px-6 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl transition-all active:scale-95 flex-1 sm:flex-none justify-center
                                            ${currentProTracker.state === 'in_service_delayed'
                                                ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30 animate-pulse'
                                                : 'bg-[#b45309] hover:bg-[#d97706] text-white shadow-[#b45309]/30'}`}
                                        title="Finalizar atendimento e receber no Caixa"
                                    >
                                        <span className="material-symbols-outlined text-lg">point_of_sale</span>
                                        <span>FINALIZAR E COBRAR NO CAIXA</span>
                                    </button>
                                </>
                            )}

                            {/* Botão de Minimizar a barra flutuante */}
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="h-11 w-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 flex items-center justify-center transition-all ml-1"
                                title="Minimizar barra"
                            >
                                <span className="material-symbols-outlined text-base">close_fullscreen</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO / NÃO COMPARECEU */}
            {cancelModalApt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0f172a]/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#1e293b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="size-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl">person_off</span>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight font-bebas">
                            Cancelar Agendamento
                        </h3>
                        <p className="text-xs text-white/60 font-medium mt-2 leading-relaxed">
                            O cliente <strong>{cancelModalApt.client?.name || 'Cliente'}</strong> não compareceu para o atendimento de <strong>{cancelModalApt.service?.title || 'Serviço'}</strong>?
                        </p>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button
                                disabled={actionLoading}
                                onClick={() => handleConfirmCancel(true)}
                                className="py-3.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider transition-all"
                            >
                                NÃO COMPARECEU
                            </button>
                            <button
                                disabled={actionLoading}
                                onClick={() => handleConfirmCancel(false)}
                                className="py-3.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20"
                            >
                                CANCELAR HORÁRIO
                            </button>
                        </div>

                        <button
                            disabled={actionLoading}
                            onClick={() => setCancelModalApt(null)}
                            className="mt-4 text-xs font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors py-2"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
};
