import React, { useMemo, useState, useEffect } from 'react';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { useAppointments } from '../hooks/useAppointments';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../lib/supabase';

interface DashboardProps {
    onNavigate?: (screen: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { profile, professionalId } = useCurrentUserRef();
    const { appointments: dbAppointments } = useAppointments();
    const { transactions: dbTransactions } = useTransactions();
    const [periodFilter, setPeriodFilter] = useState('hoje');
    const [proData, setProData] = useState<{ average_rating: number; total_reviews: number } | null>(null);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);

    useEffect(() => {
        if (!professionalId) return;
        const fetchProData = async () => {
            const { data } = await supabase
                .from('professionals')
                .select('average_rating, total_reviews')
                .eq('id', professionalId)
                .maybeSingle();
            if (data) {
                setProData({
                    average_rating: Number(data.average_rating || 5),
                    total_reviews: Number(data.total_reviews || 0)
                });
            }
        };
        const fetchReviews = async () => {
            const { data } = await supabase
                .from('professional_reviews')
                .select('rating, comment, client_id')
                .eq('professional_id', professionalId)
                .order('created_at', { ascending: false })
                .limit(5);
            if (data) {
                setRecentReviews(data);
            }
        };
        fetchProData();
        fetchReviews();
    }, [professionalId]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return dbTransactions.filter(t => {
            if (t.professional_id !== professionalId) return false;
            if (t.type !== 'entrada') return false;
            
            if (!t.created_at) return false;
            const tDate = new Date(t.created_at);
            if (periodFilter === 'hoje') {
                return tDate >= startOfDay;
            } else if (periodFilter === 'semana') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return tDate >= oneWeekAgo;
            } else if (periodFilter === 'mês') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return tDate >= startOfMonth;
            }
            return true;
        });
    }, [dbTransactions, professionalId, periodFilter]);

    const myAppointments = useMemo(() => 
        dbAppointments.filter(a => a.professional_id === professionalId && a.status !== 'cancelled')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    , [dbAppointments, professionalId]);

    const filteredAppointments = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return dbAppointments.filter(a => {
            if (a.professional_id !== professionalId) return false;
            if (a.status === 'cancelled') return false;
            
            if (!a.start_time) return false;
            const aDate = new Date(a.start_time);
            if (periodFilter === 'hoje') {
                return aDate >= startOfDay && aDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            } else if (periodFilter === 'semana') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return aDate >= oneWeekAgo;
            } else if (periodFilter === 'mês') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return aDate >= startOfMonth;
            }
            return true;
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [dbAppointments, professionalId, periodFilter]);

    const myRevenue = useMemo(() => 
        filteredTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0)
    , [filteredTransactions]);

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const chartData = useMemo(() => {
        const pointsCount = 7;
        const now = new Date();
        const days = Array.from({ length: pointsCount }, (_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (pointsCount - 1 - i));
            return d.toISOString().split('T')[0];
        });

        const dailyAmounts = days.map(dateStr => {
            return dbTransactions
                .filter(t => t.professional_id === professionalId && t.type === 'entrada' && t.created_at?.startsWith(dateStr))
                .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        });

        const maxAmount = Math.max(...dailyAmounts, 100);

        const points = dailyAmounts.map((val, idx) => {
            const x = Math.round((idx / (pointsCount - 1)) * 1000);
            const y = Math.round(250 - (val / maxAmount) * 200);
            return { x, y };
        });

        const path = points.reduce((acc, p, i) => i === 0 ? `M${p.x},${p.y}` : `${acc} L${p.x},${p.y}`, '');
        const areaPath = `${path} L1000,300 L0,300 Z`;
        return { path, areaPath, points };
    }, [dbTransactions, professionalId]);
    return (
        <div className="h-[100vh] w-full ref-body py-4 px-2 lg:px-6 overflow-y-auto selection:bg-[#d99f5b]/20 relative custom-scrollbar font-display">
            
            <main className="max-w-[1600px] mx-auto flex flex-col gap-3 pb-32">
                
                {/* 1. Header Navigation */}
                <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-1 border border-white/40 bg-white/10 p-2 rounded-2xl shadow-sm backdrop-blur-sm z-20">
                    <div className="flex items-center gap-1">
                        <div className="size-8 rounded-full bg-white/40 flex items-center justify-center mr-2 shadow-sm border border-white/60 text-[#a07d5e] ml-1">
                             <span className="material-symbols-outlined text-lg">language</span>
                        </div>
                        {['Hoje', 'Semana', 'Mês', 'Personalizado'].map((period) => (
                            <button
                                key={period}
                                onClick={() => setPeriodFilter(period.toLowerCase())}
                                className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                                    periodFilter === period.toLowerCase()
                                    ? 'bg-[#d8c2b0] text-[#5e4939] shadow-inner border border-[#bfa693]'
                                    : 'text-ref-muted hover:text-ref-main hover:bg-white/20'
                                }`}
                            >
                                {period} {period === 'Personalizado' && '∨'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ref-muted text-lg">search</span>
                            <input 
                                type="text"
                                placeholder="Buscar clients, serviço ou age..."
                                className="w-full h-9 pl-10 pr-4 bg-transparent border border-[#d6c3b3] rounded-full text-[11px] font-black outline-none focus:bg-white/20 transition-all text-ref-main placeholder:text-ref-muted/50 shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] font-black leading-none text-ref-main uppercase">{profile?.full_name || 'Colaborador'}</span>
                                <span className="text-[9px] font-black text-ref-muted uppercase tracking-[0.1em]">{profile?.role || 'Especialista'}</span>
                            </div>
                            <div className="size-9 rounded-full bg-cover bg-center shadow-md border-2 border-white bg-slate-800 flex items-center justify-center overflow-hidden" style={{ backgroundImage: profile?.avatar_url ? `url("${profile.avatar_url}")` : undefined }}>
                                {!profile?.avatar_url && (
                                    <span className="text-[10px] font-black text-white/40">{profile?.full_name?.charAt(0) || 'U'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Top Alert Chips (Under Header) */}
                <div className="flex flex-wrap items-center gap-2 pb-1 bg-white/20 p-2 rounded-xl border border-white/50 shadow-sm mx-1">
                    <div className="size-7 bg-[#636db6] rounded shadow-inner flex items-center justify-center border border-white/30 mr-1">
                         <span className="material-symbols-outlined text-white text-sm">grid_view</span>
                    </div>
                    {[
                        { label: 'Produto em Falta: 2', icon: 'warning', color: '#cbaa8a' },
                        { label: 'Cancelamentos: 1', icon: 'cancel', color: '#bb625a' },
                        { label: 'Novas Avaliações', icon: 'check_circle', color: '#8c745d' }
                    ].map((alert, i) => (
                        <div key={i} className="flex items-center gap-2 bg-[#ecdccf] border border-white/80 py-1.5 px-3 rounded shadow-sm hover:-translate-y-px transition-transform cursor-pointer">
                            <span className="material-symbols-outlined text-[15px]" style={{color: alert.color}}>{alert.icon}</span>
                            <span className="text-[10px] font-black text-ref-main tracking-wider">{alert.label}</span>
                        </div>
                    ))}
                    <div className="ml-auto text-[10px] font-black bg-white/30 border border-white/60 px-4 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-white/50 transition-all shadow-sm">
                        Ver todos ∨
                    </div>
                </div>

                {/* 3. Main KPIs (Seu Desempenho) */}
                <div className="ref-panel">
                     <div className="ref-header">
                        <div className="ref-drag-handle"><i></i></div>
                        <h2 className="ref-title">Seu Desempenho</h2>
                        <span className="material-symbols-outlined ref-gear-icon">settings</span>
                     </div>

                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-ref-muted/20 p-[1px] rounded-b-2xl">
                         {[
                             { label: 'Ganhos Estimados', val: formatCurrency(myRevenue), sub: periodFilter === 'hoje' ? 'Faturamento hoje' : periodFilter === 'semana' ? 'Últimos 7 dias' : 'Este mês', icon: 'account_balance_wallet' },
                             { label: 'Agendamentos', val: filteredAppointments.length.toString(), sub: `${filteredAppointments.filter(a => a.status === 'pending').length} pendentes`, icon: 'event_available' },
                             { label: 'Avaliação Média', val: proData ? proData.average_rating.toFixed(1) : '5.0', sub: `Baseado em ${proData ? proData.total_reviews : 0} avaliações`, icon: 'star' },
                             { label: 'Fidelização', val: '85%', sub: '+3% este mês', icon: 'favorite' }
                         ].map((k, i) => (
                             <div key={i} className="ref-card flex flex-col justify-between p-3 m-0 min-h-[100px] border-none group cursor-pointer lg:rounded-none">
                                  <div className="flex justify-between items-start">
                                      <h3 className="text-[8px] font-black text-ref-muted uppercase tracking-[0.15em] w-24 leading-snug mt-1">{k.label}</h3>
                                      <div className="size-7 bg-white/20 rounded-md border border-white/60 shadow-sm flex items-center justify-center">
                                          <span className="material-symbols-outlined text-[16px] text-ref-main drop-shadow-sm">{k.icon}</span>
                                      </div>
                                  </div>
                                  <div className="mt-2">
                                      <p className="text-xl font-black text-ref-main tracking-tight drop-shadow-sm leading-none mb-1">{k.val}</p>
                                      <p className="text-[9px] font-black text-ref-main opacity-80">{k.sub}</p>
                                  </div>
                             </div>
                         ))}
                     </div>
                </div>

                {/* 4. Main Content Grid (8/4) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
                    
                    {/* Left Column (8/12) */}
                    <div className="xl:col-span-8 flex flex-col gap-3">
                        
                        {/* CHART SECTION */}
                        <div className="ref-panel flex flex-col">
                             <div className="ref-header">
                                <div className="ref-drag-handle"><i></i></div>
                                <h3 className="ref-title">Comissões e Avaliações</h3>
                                <div className="ml-auto ref-deboss rounded-md border border-white/40 flex overflow-hidden">
                                     <button className="px-3 py-1 text-[9px] font-black text-ref-main bg-white/40">Ganhos</button>
                                     <button className="px-3 py-1 text-[9px] font-black text-ref-muted hover:bg-white/20">Serviços</button>
                                </div>
                            </div>
                            
                            <div className="p-3 flex-1 flex flex-col gap-3 relative pb-4">
                                {/* Top Chart Area (Area Graph) */}
                                <div className="ref-card h-48 flex flex-col p-3 pb-8 relative m-0">
                                    <div className="flex justify-between items-center z-10 w-full mb-2 border-b border-ref-muted/10 pb-2">
                                         <h4 className="text-[11px] font-black text-ref-muted tracking-widest uppercase">Evolução Mensal</h4>
                                         <span className="ref-tag-active bg-[#67926b]/10 border-[#67926b]/30 text-[#67926b]">
                                             <span className="material-symbols-outlined text-[12px] text-[#67926b] mr-1">trending_up</span>
                                              +15%
                                         </span>
                                    </div>
                                    <div className="flex-1 mt-2 relative border-l border-b border-ref-muted/20 ml-6 mr-2">
                                         <div className="absolute -left-8 inset-y-0 flex flex-col justify-between text-[8px] font-black text-ref-muted text-right">
                                             <span>10k</span><span>8k</span><span>6k</span><span>4k</span><span>0</span>
                                         </div>
                                         <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                                            {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-ref-muted border-b border-white/50 border-dashed"></div>)}
                                        </div>
                                        <svg className="w-full h-full overflow-visible drop-shadow-md" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#d99f5b" stopOpacity="0.5" />
                                                    <stop offset="100%" stopColor="#dfd1c3" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d={chartData.areaPath} fill="url(#areaGrad)" />
                                            <path d={chartData.path} fill="none" stroke="#684f3e" strokeWidth="4" className="drop-shadow-sm" />
                                            <path d={chartData.path} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="4" transform="translate(0, 2)" />
                                            {chartData.points.map((p, i) => (
                                                <circle key={i} cx={p.x} cy={p.y} r="6" fill="#f4ede6" stroke="#684f3e" strokeWidth="3" className="shadow-sm" />
                                            ))}
                                        </svg>
                                    </div>
                                    <div className="absolute bottom-2 left-9 right-5 flex justify-between mt-1 pl-1">
                                        {['01', '05', '10', '15', '20', '25', '30'].map((m,i) => (
                                            <span key={i} className="text-[8px] font-black text-ref-muted">{m}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Inner Split: Bar Chart & List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Desempenho (Barras horizontais/verticais) */}
                                    <div className="ref-card flex flex-col m-0 p-3 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent)] pointer-events-none"></div>
                                        <div className="flex items-center gap-2 mb-3 relative z-10 border-b border-white/30 pb-2">
                                            <div className="size-6 bg-white/30 rounded border border-white/60 shadow-inner flex items-center justify-center">
                                                <span className="material-symbols-outlined text-ref-muted text-sm">leaderboard</span>
                                            </div>
                                            <h4 className="text-[10px] font-black text-ref-muted tracking-widest uppercase">Performance</h4>
                                        </div>
                                        <div className="h-32 flex items-end justify-between px-2 gap-1 relative z-10 pt-2">
                                            <div className="absolute left-0 inset-y-2 flex flex-col justify-between text-[7px] font-black text-ref-muted">
                                                <span>100</span><span>50</span><span>0</span>
                                            </div>
                                            <div className="w-full h-full flex items-end gap-1 ml-4 border-l border-b border-white/40 pb-1">
                                                {[60, 80, 45, 90, 30, 75, 50, 95].map((h, i) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group/bar">
                                                        <div className="w-full bg-gradient-to-t from-[#8c745d] to-[#cbaa8a] relative border border-black/10 rounded-t-sm transition-all group-hover/bar:brightness-110" style={{ height: `${Math.max(10, h)}%`, boxShadow: 'inset 1px 1px rgba(255,255,255,0.3), inset -1px 0 rgba(0,0,0,0.1)' }}>
                                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity bg-black/80 text-white px-1 rounded">{h}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-1 ml-4 pr-1 relative z-10">
                                            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D', 'S'].map((m,i) => (
                                                <span key={i} className="text-[8px] font-black text-ref-main/70">{m}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Feedbacks recentes */}
                                    <div className="flex flex-col gap-3">
                                        <div className="ref-card flex-1 flex flex-col m-0 p-3 pt-2">
                                            <div className="flex justify-between items-center mb-2 border-b border-ref-muted/10 pb-1">
                                                <h4 className="text-[10px] uppercase font-black text-ref-muted tracking-widest">Feedback Recente</h4>
                                                <span className="text-[9px] text-[#A66E38] font-black cursor-pointer hover:underline">Ver Todos ∨</span>
                                            </div>
                                            <div className="flex flex-col gap-2 overflow-y-auto max-h-32 pr-1 custom-scrollbar">
                                                {recentReviews.length > 0 ? recentReviews.map((c, i) => (
                                                    <div key={i} className="flex flex-col border-b border-white/40 pb-1 last:border-0 hover:bg-white/10 p-1 rounded transition-colors cursor-pointer">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-ref-main">Cliente #{c.client_id ? c.client_id.slice(0, 4) : 'Anônimo'}</span>
                                                            <div className="flex gap-[1px]">
                                                                {[...Array(5)].map((_, j) => (
                                                                    <span key={j} className={`material-symbols-outlined text-[10px] ${j < c.rating ? 'text-[#eecba1] fill-1 drop-shadow-sm' : 'text-ref-muted/30'}`}>star</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[8px] font-bold text-ref-muted italic">"{c.comment || 'Sem comentário'}"</span>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center text-[10px] text-ref-muted py-4">Nenhuma avaliação recente</div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Horários de Pico */}
                                        <div className="ref-card flex items-center justify-between p-2 m-0 bg-gradient-to-r from-[#d99f5b] to-[#b58d61] border border-white/40 group cursor-pointer relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent)] mix-blend-overlay"></div>
                                            <div className="flex flex-col relative z-10 pl-1">
                                                <span className="text-[8px] uppercase tracking-widest font-black text-white/80 leading-tight">Meta do Mês</span>
                                                <span className="text-[14px] font-black text-white drop-shadow-md leading-none mt-0.5">85% Atingida</span>
                                            </div>
                                            <div className="size-8 rounded-full bg-black/10 shadow-inner flex items-center justify-center border border-white/20 relative z-10 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-white text-[18px]">verified</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logs de Atendimento Hoje */}
                        <div className="ref-panel flex flex-col">
                             <div className="ref-header">
                                <div className="ref-drag-handle"><i></i></div>
                                <h3 className="ref-title">Serviços Executados</h3>
                                <span className="material-symbols-outlined ref-gear-icon">settings</span>
                            </div>
                            <div className="p-3 w-full border-t border-white/50 bg-[#decbb9] rounded-b-2xl shadow-inner pb-4">
                                <div className="ref-deboss p-2 min-h-[100px] flex flex-col gap-1 border border-white/50 bg-[#e7d7c8]">
                                    {filteredAppointments.length > 0 ? filteredAppointments.map((apt, i) => (
                                        <div key={i} className="flex items-center gap-3 p-1.5 border-b border-ref-muted/10 last:border-0 cursor-pointer hover:bg-white/40 transition-colors rounded">
                                            <div className={`size-6 rounded shadow-inner flex items-center justify-center border border-white/60 bg-gradient-to-br ${i % 2 === 0 ? 'from-[#aebda4] to-[#7f9e72]' : 'from-[#d8c8b6] to-[#b5a38f]'}`}>
                                                <span className="material-symbols-outlined text-white text-[14px] drop-shadow-sm">cut</span>
                                            </div>
                                            <span className="text-[12px] font-black text-ref-main font-mono shrink-0 drop-shadow-sm w-12 border-r border-ref-muted/20">{apt.start_time.split('T')[1].slice(0, 5)}</span>
                                            <div className="flex flex-col flex-1 pl-1">
                                                <span className="text-[11px] font-black text-ref-main leading-tight truncate">Cliente #{(apt.client_id || 'Ext').slice(0, 4)}</span>
                                                <span className="text-[9px] font-black text-ref-muted uppercase tracking-wider truncate">Serviço ID: {apt.service_id?.slice(0, 6)}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-[#5C3F22]">R$ --,--</span>
                                                <span className="text-[8px] font-black text-[#67926b] flex items-center gap-0.5"><span className="material-symbols-outlined text-[9px]">done_all</span> Finalizado</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-6 text-center flex flex-col items-center justify-center h-full opacity-60">
                                            <span className="material-symbols-outlined text-3xl mb-1 text-ref-muted/40 drop-shadow-sm">assignment_turned_in</span>
                                            <span className="text-[9px] font-black text-ref-muted uppercase tracking-widest drop-shadow-sm">Nenhum Registro</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN (Agenda Inteligente, Actions) */}
                    <div className="xl:col-span-4 flex flex-col gap-3">
                        
                        {/* Intelligent Agenda Block */}
                        <div className="ref-panel flex-1 flex flex-col">
                             <div className="ref-header">
                                <div className="ref-drag-handle"><i></i></div>
                                <h3 className="ref-title">Agenda Inteligente</h3>
                                <span className="material-symbols-outlined ref-gear-icon">settings</span>
                            </div>
                            
                            <div className="p-3 pb-2 flex flex-col gap-3">
                                {/* Date Switcher */}
                                <div className="ref-card flex items-center justify-between p-2 px-3 m-0 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-ref-muted text-[16px]">calendar_month</span>
                                        <span className="text-[12px] font-black text-ref-main tracking-widest uppercase">Hoje</span>
                                    </div>
                                    <div className="flex items-center gap-2 z-10">
                                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                                        <span className="text-[9px] font-black text-ref-muted uppercase">Online</span>
                                    </div>
                                </div>

                                {/* Status Filters (Confirmado | Pendente | Cancelado) */}
                                <div className="flex items-center justify-between gap-1 mt-1 bg-white/20 p-1 rounded-md border border-white/60 shadow-sm mx-1">
                                    <div className="flex bg-white/40 rounded shadow-inner p-0.5 border border-white/60">
                                        <div className="size-5 rounded bg-black/5 flex items-center justify-center text-ref-main font-black text-[10px] shadow-sm">S</div>
                                        <div className="size-5 rounded flex items-center justify-center text-ref-muted font-black text-[10px] hover:bg-white/50 cursor-pointer">T</div>
                                        <div className="size-5 rounded flex items-center justify-center text-ref-muted font-black text-[10px] hover:bg-white/50 cursor-pointer">Q</div>
                                        <div className="size-5 rounded flex items-center justify-center text-ref-muted font-black text-[10px] hover:bg-white/50 cursor-pointer">Q</div>
                                        <div className="size-5 rounded flex items-center justify-center text-ref-muted font-black text-[10px] hover:bg-white/50 cursor-pointer">S</div>
                                    </div>
                                    <span className="text-[8px] font-black text-ref-main tracking-widest bg-white/30 px-2 py-1 rounded shadow-inner border border-white/50">Todos</span>
                                </div>

                                {/* Appointment List Timeline */}
                                <div className="flex-1 flex flex-col relative z-10 mx-1 mt-2 mb-2">
                                    {/* Line connecting the dots */}
                                    <div className="absolute left-2.5 top-2 max-h-[85%] w-px bg-ref-muted/20 border-r border-white/50 -z-10"></div>
                                    
                                    {filteredAppointments.length > 0 ? filteredAppointments.map((apt, i) => {
                                        let statusObj = { status: 'idle', color: '#ecdccf', tag: '' };
                                        if (i === 0) statusObj = { status: 'done', color: '#cbaa8a', tag: 'FINALIZADO' };
                                        else if (i === 1) statusObj = { status: 'current', color: '#8c745d', tag: 'EM ANDAMENTO' };
                                        else statusObj = { status: 'future', color: '#cbaa8a', tag: '' };
                                        
                                        return (
                                            <div key={i} className="flex gap-2 items-start relative mb-2">
                                                <div className="w-10 text-right pt-[2px]">
                                                    <span className="text-[12px] font-black text-ref-main opacity-80">{apt.start_time.split('T')[1].slice(0, 5)}</span>
                                                </div>
                                                <div className="relative pt-[4px]">
                                                    {/* Status Dot */}
                                                    <div className={`size-4 rounded-full border-2 border-[#ecdccf] shadow-md z-10 relative flex items-center justify-center ${statusObj.status === 'current' ? 'bg-[#8c745d] scale-110' : 'bg-[#d6bea8]'}`} style={statusObj.color && statusObj.status !== 'current' ? {backgroundColor: statusObj.color} : {}}>
                                                        {statusObj.status === 'done' && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                                                        {statusObj.status === 'current' && <div className="size-1.5 rounded-full bg-[#ecdccf] shadow-inner"></div>}
                                                    </div>
                                                </div>
                                                <div className="ref-card flex-1 p-2 py-1.5 flex justify-between items-center pr-3 group m-0 relative">
                                                    <span className="text-[10px] font-black text-ref-main">Cliente #{(apt.client_id || 'Ext').slice(0, 4)}</span>
                                                    {statusObj.status === 'current' && <span className="ref-tag-active">{statusObj.tag}</span>}
                                                    {statusObj.status === 'done' && <span className="ref-tag-done">{statusObj.tag}</span>}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="py-20 text-center opacity-40 flex flex-col items-center">
                                             <span className="material-symbols-outlined text-4xl mb-2">event_available</span>
                                             <span className="text-[10px] font-black uppercase tracking-widest">Agenda livre</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons Grid (Middle Right) */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            {[
                                { label: 'Minha Comissão', icon: 'payments' }, 
                                { label: 'Bloquear Horário', icon: 'block' },
                            ].map((btn, i) => (
                                <button key={i} className="ref-btn h-[46px] p-2 flex flex-row items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[16px] drop-shadow-sm">{btn.icon}</span>
                                    <span className="text-[9px] uppercase font-black tracking-widest leading-tight mt-[2px]">{btn.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Main Navigation Plate (Footer equivalent) */}
                <div className="fixed bottom-0 inset-x-0 mx-auto max-w-[1600px] pointer-events-none z-50 flex justify-center pb-4 px-4">
                    <div className="ref-footer-plate h-14 w-full max-w-xl mx-auto rounded-full flex justify-between items-center px-6 relative pointer-events-auto border-t border-white/60 shadow-[0_10px_30px_rgba(40,20,10,0.5)]">
                         {[
                             { icon: 'calendar_month', active: true, screen: 'agenda' },
                             { icon: 'payments', active: false, screen: 'comissoes' },
                             { icon: 'home', active: false, screen: 'dashboard', main: true },
                             { icon: 'inventory_2', active: false, screen: 'produtos' },
                             { icon: 'person', active: false, screen: 'perfil' }
                         ].map((item, i) => (
                             <button onClick={() => onNavigate?.(item.screen)} key={i} className={`relative flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${item.main ? 'size-14 rounded-full border border-white/60 bg-gradient-to-b from-[#f2e6d9] to-[#d6c3b3] shadow-[0_-4px_10px_rgba(255,255,255,0.6),0_4px_10px_rgba(0,0,0,0.2)] -translate-y-6 group' : 'size-10'}`}>
                                 <span className={`material-symbols-outlined drop-shadow-md ${item.main ? 'text-[28px] text-[#8c745d] group-hover:scale-110 transition-transform' : 'text-[24px]'} ${item.active && !item.main ? 'text-ref-orange fill-1' : ''} ${!item.active && !item.main ? 'text-ref-muted hover:text-ref-main' : ''}`}>
                                    {item.icon}
                                 </span>
                                 {/* Active indicator dot */}
                                 {item.active && !item.main && <div className="absolute -bottom-1 size-1 rounded-full bg-ref-orange shadow-[0_0_4px_var(--ref-orange)]"></div>}
                             </button>
                         ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

