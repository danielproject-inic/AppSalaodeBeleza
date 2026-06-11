import React, { useMemo, useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import { useProfessionals } from '../hooks/useProfessionals';
import { useServices } from '../hooks/useServices';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { useCommissions } from '../hooks/useCommissions';

interface DashboardOverviewProps {
    onNavigate?: (screen: string) => void;
}

const CustomDateRangePicker = ({ startDate, endDate, onChange }: { startDate: string, endDate: string, onChange: (start: string, end: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState<string | null>(startDate);
    const [tempEnd, setTempEnd] = useState<string | null>(endDate);
    const [viewDate, setViewDate] = useState(new Date(startDate ? startDate + 'T12:00:00' : Date.now()));

    const handleDateClick = (dateStr: string) => {
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(dateStr);
            setTempEnd(null);
        } else {
            if (dateStr < tempStart) {
                setTempStart(dateStr);
                setTempEnd(null);
            } else {
                setTempEnd(dateStr);
                // Se o usuário quiser, ele pode clicar em Aplicar, mas auto-aplicar também é bom
            }
        }
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDay = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDay(year, month);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const formatDisplayDate = (dStr: string) => {
        if (!dStr) return '--/--/----';
        const [y, m, d] = dStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-black/30 border border-white/10 pl-3 pr-4 py-1.5 rounded-xl hover:border-[#b45309]/50 hover:bg-black/50 transition-all cursor-pointer group animate-in fade-in slide-in-from-left-2 ml-4 shadow-inner"
            >
                <span className="material-symbols-outlined text-white/40 text-[16px] group-hover:text-[#b45309] transition-colors">calendar_month</span>
                <span className="text-white text-[11px] font-black tracking-widest">{formatDisplayDate(startDate)}</span>
                <span className="text-[#b45309] text-[9px] font-black uppercase mx-1">até</span>
                <span className="text-white text-[11px] font-black tracking-widest">{formatDisplayDate(endDate)}</span>
                <span className="material-symbols-outlined text-white/20 text-[14px] group-hover:text-white/60 ml-2">expand_more</span>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => { setIsOpen(false); setTempStart(startDate); setTempEnd(endDate); }}></div>
                    <div className="absolute top-full left-4 mt-2 z-[110] bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-5 w-80 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#b45309]/10 blur-[60px] rounded-full pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 relative z-10 w-full">
                            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="size-7 flex items-center justify-center hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all bg-white/5 border border-white/5"><span className="material-symbols-outlined text-sm">chevron_left</span></button>

                            <div className="flex gap-1 items-center">
                                <select
                                    value={month}
                                    onChange={e => setViewDate(new Date(year, parseInt(e.target.value), 1))}
                                    className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-1 py-1 rounded-lg outline-none cursor-pointer hover:bg-white/10 appearance-none text-center"
                                >
                                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                                        <option key={i} value={i} className="bg-[#0f172a] text-white">{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={year}
                                    onChange={e => setViewDate(new Date(parseInt(e.target.value), month, 1))}
                                    className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-1 py-1 rounded-lg outline-none cursor-pointer hover:bg-white/10 appearance-none text-center"
                                >
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                        <option key={y} value={y} className="bg-[#0f172a] text-white">{y}</option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="size-7 flex items-center justify-center hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all bg-white/5 border border-white/5"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-3 relative z-10">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i} className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-y-2 gap-x-0 text-center relative z-10">
                            {Array.from({ length: startDay }).map((_, i) => <div key={`pad-${i}`} />)}
                            {days.map(day => {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isStart = tempStart === dateStr;
                                const isEnd = tempEnd === dateStr;
                                const isInRange = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
                                const isSelected = isStart || isEnd || isInRange;

                                return (
                                    <div key={day} className={`relative flex items-center justify-center h-8 w-full ${isInRange ? 'bg-[#b45309]/20' : ''} ${isStart && tempEnd ? 'bg-gradient-to-r from-transparent to-[#b45309]/20' : ''} ${isEnd && tempStart ? 'bg-gradient-to-r from-[#b45309]/20 to-transparent' : ''}`}>
                                        <button
                                            onClick={() => handleDateClick(dateStr)}
                                            className={`h-8 w-8 rounded-full text-[11px] font-black transition-all flex items-center justify-center relative z-10 ${isStart || isEnd ? 'bg-[#b45309] text-white shadow-[0_0_15px_rgba(180,83,9,0.6)] scale-110' : isInRange ? 'text-[#b45309] hover:bg-[#b45309]/30' : 'text-white/70 hover:bg-white/10 hover:scale-110'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                                {!tempStart ? 'Escolha o início' : !tempEnd ? 'Escolha o fim' : 'Período Selecionado'}
                            </span>
                            <button
                                onClick={() => {
                                    if (tempStart && tempEnd) {
                                        onChange(tempStart, tempEnd);
                                        setIsOpen(false);
                                    } else if (tempStart && !tempEnd) {
                                        onChange(tempStart, tempStart);
                                        setIsOpen(false);
                                    }
                                }}
                                disabled={!tempStart}
                                className={`px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${tempStart
                                        ? 'bg-[#b45309] hover:bg-[#d97706] text-white shadow-[0_0_20px_rgba(180,83,9,0.4)] hover:scale-105 active:scale-95'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                                    }`}
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
    const { profile, role } = useCurrentUserRef();
    const { transactions: dbTransactions } = useTransactions();
    const { appointments: dbAppointments } = useAppointments();
    const { clients: dbClients } = useClients();
    const { professionals: dbProfessionals } = useProfessionals();
    const { services: dbServices } = useServices();

    const [periodFilter, setPeriodFilter] = useState('diário');
    const [chartView, setChartView] = useState<'semanal' | 'mensal' | 'anual'>('mensal');
    const [activePoint, setActivePoint] = useState<any>(null);
    const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

    const [isInsightsOpen, setIsInsightsOpen] = useState(false);
    const [insightsTab, setInsightsTab] = useState<'vip' | 'idle' | 'cancel'>('vip');

    // Report Dialog States
    const [isClientsReportOpen, setIsClientsReportOpen] = useState(false);
    const [clientsTab, setClientsTab] = useState<'active' | 'new'>('active');
    const [isAgendasReportOpen, setIsAgendasReportOpen] = useState(false);
    const [agendasTab, setAgendasTab] = useState<'active' | 'cancelled'>('active');

    // History Panel State
    const [historyProId, setHistoryProId] = useState<string>('all');
    const [historyDate, setHistoryDate] = useState<string>('');

    const { commissions, professionalsStats } = useCommissions(undefined, role === 'admin' || role === 'manager' ? undefined : (profile?.id || undefined));

    const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

    const toggleExpand = (clientName: string) => {
        setExpandedClients(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    const groupedCommissions = useMemo(() => {
        if (!commissions) return [];
        const filtered = commissions.filter(comm => {
            if (historyProId !== 'all' && comm.professionalId !== historyProId) return false;
            if (historyDate && comm.date !== historyDate) return false;
            return true;
        });

        const groups: Record<string, any[]> = {};
        filtered.forEach(comm => {
            const clientName = comm.clientName || comm.client || 'Cliente';
            if (!groups[clientName]) {
                groups[clientName] = [];
            }
            groups[clientName].push(comm);
        });

        return Object.entries(groups).map(([clientName, list]) => {
            const totalServiceValue = list.reduce((sum, c) => sum + (c.serviceValue || 0), 0);
            const totalDiscountValue = list.reduce((sum, c) => sum + (c.discountValue || 0), 0);
            const totalCommissionValue = list.reduce((sum, c) => sum + (c.commissionValue || 0), 0);
            
            const professionals = Array.from(new Set(list.map(c => c.professionalName))).join(', ');
            const services = list.map(c => c.service).join(', ');

            const dates = Array.from(new Set(list.map(c => {
                const d = c.scheduledDate || c.date;
                return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '';
            }).filter(Boolean)));
            
            // list[0] is typically the latest or earliest depending on source order. 
            // We just format a nice range if there are multiple dates.
            const dateStr = dates.length === 0 ? '' : dates.length === 1 ? dates[0] : `${dates[dates.length - 1]} - ${dates[0]}`;

            const allPaid = list.every(c => c.status === 'paid');
            const status = allPaid ? 'paid' : 'pending';

            return {
                clientName,
                isGroup: list.length > 1,
                servicesCount: list.length,
                totalServiceValue,
                totalDiscountValue,
                totalCommissionValue,
                professionals,
                services,
                dateStr,
                status,
                items: list,
                representative: list[0]
            };
        }).sort((a, b) => {
            const dateA = a.representative.scheduledDate || a.representative.date || '';
            const dateB = b.representative.scheduledDate || b.representative.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            
            const timeA = a.representative.startTime || '';
            const timeB = b.representative.startTime || '';
            return timeB.localeCompare(timeA);
        });
    }, [commissions, historyProId, historyDate]);

    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const periodBounds = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (periodFilter === 'diário') {
            // Already today
        }
        else if (periodFilter === 'ano') {
            start.setMonth(0, 1);
        }
        else if (periodFilter === 'mês') {
            start.setDate(1);
        }
        else if (periodFilter === 'personalizado') {
            if (customStart) {
                const s = new Date(customStart + 'T00:00:00');
                start.setTime(s.getTime());
            }
            if (customEnd) {
                const e = new Date(customEnd + 'T23:59:59.999');
                end.setTime(e.getTime());
            }
        }
        return { start: start.toISOString(), end: end.toISOString() };
    }, [periodFilter, customStart, customEnd]);

    const filteredTransactions = useMemo(() => {
        return dbTransactions.filter(t => {
            const date = t.created_at || '';
            const matchPeriod = date >= periodBounds.start && date <= periodBounds.end;
            return matchPeriod;
        });
    }, [dbTransactions, periodBounds]);

    const filteredAppointments = useMemo(() => {
        return dbAppointments.filter(t => {
            const date = t.start_time || '';
            return date >= periodBounds.start && date <= periodBounds.end;
        });
    }, [dbAppointments, periodBounds]);

    const kpis = useMemo(() => {
        const receita = filteredTransactions
            .filter(t => t.type === 'entrada' && t.status !== 'cancelado')
            .reduce((acc, t) => acc + (t.amount || 0), 0);

        const atendimentos = filteredAppointments.filter(a => a.status !== 'cancelled').length;

        const clientIds = new Set([
            ...filteredTransactions.map(t => t.client_id),
            ...filteredAppointments.map(a => a.client_id)
        ].filter(Boolean));

        const produtos = filteredTransactions
            .filter(t => t.type === 'entrada' && t.category?.toLowerCase().includes('produto'))
            .reduce((acc, t) => acc + (t.amount || 0), 0);

        const novosClientes = dbClients.filter(c => {
            const date = c.created_at || '';
            return date >= periodBounds.start && date <= periodBounds.end;
        }).length;

        return { receita, atendimentos, clientes: clientIds.size, produtos, novosClientes };
    }, [filteredTransactions, filteredAppointments, dbClients, periodBounds]);

    const chartData = useMemo(() => {
        let values: number[] = [];
        let labels: string[] = [];

        const validSales = dbTransactions.filter(t => t.type === 'entrada' && t.status !== 'cancelado');

        if (chartView === 'semanal') {
            labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            values = [0, 0, 0, 0, 0, 0, 0];
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            validSales.forEach(t => {
                if (!t.created_at) return;
                const d = new Date(t.created_at);
                if (d >= startOfWeek) {
                    values[d.getDay()] += t.amount || 0;
                }
            });
        } else if (chartView === 'anual') {
            const currentYear = new Date().getFullYear();
            labels = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map(String);
            values = [0, 0, 0, 0, 0];

            validSales.forEach(t => {
                if (!t.created_at) return;
                const year = new Date(t.created_at).getFullYear();
                const diff = currentYear - year;
                if (diff >= 0 && diff < 5) {
                    values[4 - diff] += t.amount || 0;
                }
            });
        } else {
            // mensal
            labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            values = Array(12).fill(0);
            const currentYear = new Date().getFullYear();

            validSales.forEach(t => {
                if (!t.created_at) return;
                const d = new Date(t.created_at);
                if (d.getFullYear() === currentYear) {
                    values[d.getMonth()] += t.amount || 0;
                }
            });
        }

        const max = Math.max(...values, 1); // 1 is minimum scale for aesthetics
        const niceMax = Math.ceil(max / 500) * 500;
        const step = niceMax / 5;
        const yLabels = Array.from({ length: 6 }).map((_, i) => {
            const val = niceMax - (step * i);
            if (val === 0) return 'R$ 0';
            return val >= 1000 ? `R$ ${(val / 1000).toFixed(1).replace('.0', '')}k` : `R$ ${val}`;
        });

        const points = values.map((v, i) => ({
            x: (i / (Math.max(values.length - 1, 1))) * 1000,
            y: 300 - (v / niceMax) * 280,
            val: v,
            label: labels[i]
        }));
        return { points, labels, yLabels };
    }, [chartView, dbTransactions]);

    const topServices = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredAppointments.forEach(a => {
            if (a.service_id && a.status !== 'cancelled') counts[a.service_id] = (counts[a.service_id] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxCount = Math.max(...sorted.map(s => s[1]), 1);

        const colors = ['#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];

        const mapped = sorted.map((s, idx) => {
            const svc = dbServices.find(srv => srv.id === s[0]);
            return {
                label: svc?.title || 'Serviço',
                h: (s[1] / maxCount) * 100,
                color: colors[idx % colors.length]
            };
        }).sort((a, b) => a.label.localeCompare(b.label));
        return mapped;
    }, [filteredAppointments, dbServices]);

    const topProfessionals = useMemo(() => {
        const revs: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            if (t.professional_id && t.type === 'entrada' && t.status !== 'cancelado') {
                revs[t.professional_id] = (revs[t.professional_id] || 0) + (t.amount || 0);
            }
        });
        const sorted = Object.entries(revs).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return sorted.map(s => {
            const pro = dbProfessionals.find(p => p.id === s[0]);
            return {
                name: pro?.name || 'Profissional',
                val: `R$ ${s[1].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                rating: '5.0',
                avatar: pro?.avatar_url || undefined
            };
        });
    }, [filteredTransactions, dbProfessionals]);

    const todayAgenda = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayApps = dbAppointments.filter(a => {
            const d = new Date(a.start_time);
            return d >= todayStart && d <= todayEnd;
        }).sort((a, b) => a.start_time.localeCompare(b.start_time)).slice(0, 6);

        return todayApps.map(a => {
            const time = new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const client = dbClients.find(c => c.id === a.client_id);
            const svc = dbServices.find(s => s.id === a.service_id);

            let color = '#f59e0b';
            if (a.status === 'pending' || a.status === 'confirmado' || a.status === 'confirmed') color = '#22c55e'; // emerald is actually #10b981
            if (a.status === 'cancelled') color = '#ef4444';
            if (a.status === 'em_atendimento') color = '#3b82f6';
            if (a.status === 'pago') color = '#8b5cf6';

            return {
                time,
                label: client?.name || 'Cliente',
                svc: svc?.title || 'Serviço',
                status: a.status || 'Pendente',
                color
            };
        });
    }, [dbAppointments, dbClients, dbServices]);

    const topClientsList = useMemo(() => {
        const spend: Record<string, number> = {};
        dbTransactions.forEach(t => {
            if (t.client_id && t.type === 'entrada' && t.status !== 'cancelado') {
                spend[t.client_id] = (spend[t.client_id] || 0) + (t.amount || 0);
            }
        });
        const sorted = Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 6);
        return sorted.map(s => {
            const c = dbClients.find(client => client.id === s[0]);
            return {
                name: c?.name || 'Cliente Sem Nome',
                val: `R$ ${s[1].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                vip: c?.is_vip || false,
                avatar: c?.avatar_url || undefined
            };
        });
    }, [dbTransactions, dbClients]);

    // Lógica Dinâmica da Barra de Alertas (Smart Insights)
    const smartInsights = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(now.getDate() - 7);
        const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(now.getDate() - 14);

        // 1. VIPs Inativos (VIPs sem agendamentos nos últimos 30 dias)
        const inactiveVipsList = dbClients.filter(client => {
            if (!client.is_vip) return false;
            const clientAppts = dbAppointments.filter(a => a.client_id === client.id);
            if (clientAppts.length === 0) return true;
            const latestAppt = clientAppts.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
            return new Date(latestAppt.start_time) < thirtyDaysAgo;
        }).map(client => {
            const clientAppts = dbAppointments.filter(a => a.client_id === client.id).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
            return {
                ...client,
                lastVisit: clientAppts.length > 0 ? clientAppts[0].start_time : null
            };
        });

        // 2. Ocupação Hoje
        const todayApptsList = dbAppointments.filter(a => a.start_time.startsWith(todayStr) && a.status !== 'cancelled');
        const hasIdleTimes = todayApptsList.length < 5; // Métrica de exemplo: menos de 5 clientes no dia é ocioso

        // 3. Tendência de Cancelamentos
        const recentCancellationsList = dbAppointments.filter(a => a.status === 'cancelled' && new Date(a.start_time) >= sevenDaysAgo).map(appt => {
            const client = dbClients.find(c => c.id === appt.client_id);
            const svc = dbServices.find(s => s.id === appt.service_id);
            return {
                ...appt,
                clientName: client?.name || 'Cliente Desconhecido',
                clientPhone: client?.phone,
                serviceTitle: svc?.title || 'Serviço'
            };
        });

        const last7Cancellations = recentCancellationsList.length;
        const prev7Cancellations = dbAppointments.filter(a => a.status === 'cancelled' && new Date(a.start_time) >= fourteenDaysAgo && new Date(a.start_time) < sevenDaysAgo).length;
        const cancellationsSpiking = last7Cancellations > prev7Cancellations && last7Cancellations > 0;

        return {
            inactiveVips: inactiveVipsList.length,
            inactiveVipsList,
            hasIdleTimes,
            cancellationsSpiking,
            todayAppts: todayApptsList.length,
            recentCancellationsList
        };
    }, [dbClients, dbAppointments]);

    const periodClients = useMemo(() => {
        const activeClientIds = new Set([
            ...filteredTransactions.map(t => t.client_id),
            ...filteredAppointments.map(a => a.client_id)
        ].filter(Boolean));

        return Array.from(activeClientIds).map(id => {
            const client = dbClients.find(c => c.id === id);
            const duplicateName = client?.name 
                ? dbClients.filter(c => c.name?.trim().toLowerCase() === client.name?.trim().toLowerCase()).length > 1
                : false;

            const appts = filteredAppointments.filter(a => a.client_id === id);
            const txs = filteredTransactions.filter(t => t.client_id === id);
            const totalSpent = txs
                .filter(t => t.type === 'entrada' && t.status !== 'cancelado')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            return {
                id,
                name: client?.name || 'Cliente Sem Nome',
                phone: client?.phone,
                avatar_url: client?.avatar_url,
                is_vip: client?.is_vip,
                isDuplicate: duplicateName,
                appointmentsCount: appts.length,
                activeAppointmentsCount: appts.filter(a => a.status !== 'cancelled').length,
                transactionsCount: txs.length,
                totalSpent,
                created_at: client?.created_at
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredTransactions, filteredAppointments, dbClients]);

    const periodNewClients = useMemo(() => {
        return dbClients.filter(c => {
            const date = c.created_at || '';
            return date >= periodBounds.start && date <= periodBounds.end;
        }).map(client => {
            const duplicateName = client.name 
                ? dbClients.filter(c => c.name?.trim().toLowerCase() === client.name?.trim().toLowerCase()).length > 1
                : false;

            return {
                ...client,
                isDuplicate: duplicateName
            };
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [dbClients, periodBounds]);

    const periodActiveAppointments = useMemo(() => {
        return filteredAppointments
            .filter(a => a.status !== 'cancelled')
            .map(a => {
                const client = dbClients.find(c => c.id === a.client_id);
                const service = dbServices.find(s => s.id === a.service_id);
                const pro = dbProfessionals.find(p => p.id === a.professional_id);
                return {
                    ...a,
                    clientName: client?.name || 'Cliente Sem Nome',
                    serviceTitle: service?.title || 'Serviço',
                    professionalName: pro?.name || 'Profissional'
                };
            }).sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [filteredAppointments, dbClients, dbServices, dbProfessionals]);

    const periodCancelledAppointments = useMemo(() => {
        return filteredAppointments
            .filter(a => a.status === 'cancelled')
            .map(a => {
                const client = dbClients.find(c => c.id === a.client_id);
                const service = dbServices.find(s => s.id === a.service_id);
                const pro = dbProfessionals.find(p => p.id === a.professional_id);
                return {
                    ...a,
                    clientName: client?.name || 'Cliente Sem Nome',
                    serviceTitle: service?.title || 'Serviço',
                    professionalName: pro?.name || 'Profissional'
                };
            }).sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [filteredAppointments, dbClients, dbServices, dbProfessionals]);

    return (
        <div className="w-full py-4 px-2 lg:px-8 selection:bg-[#b45309]/20 relative custom-scrollbar font-sans text-white">
            <main className="max-w-[1180px] mx-auto flex flex-col gap-3 pb-20">

                <header className="flex flex-row justify-between items-center gap-2 bg-[#1f2937]/50 backdrop-blur-md border border-white/5 rounded-full pr-2 pl-2 py-1 shadow-xl h-[56px] relative z-50">
                    <div className="flex items-center gap-1">
                        {['Diário', 'Mês', 'Ano', 'Personalizado'].map((period) => (
                            <button
                                key={period}
                                onClick={() => setPeriodFilter(period.toLowerCase())}
                                className={`px-4 h-9 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-0.5 ${periodFilter === period.toLowerCase()
                                        ? 'bg-[#b45309] text-white shadow-[0_2px_12px_rgba(180,83,9,0.4)]'
                                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                {period}
                            </button>
                        ))}
                        {periodFilter === 'personalizado' && (
                            <CustomDateRangePicker
                                startDate={customStart}
                                endDate={customEnd}
                                onChange={(start, end) => {
                                    setCustomStart(start);
                                    setCustomEnd(end);
                                }}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 pl-5 pr-1.5 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer group">
                            <span className="text-sm font-black text-white uppercase tracking-widest">
                                {role === 'admin' ? 'Admin ' : role === 'manager' ? 'Gerente ' : role === 'receptionist' ? 'Rec. ' : ''}
                                <span className="text-[#b45309] ml-1">
                                    {profile?.full_name ? profile.full_name.split(' ')[0] : 'Usuário'}
                                </span>
                            </span>
                            <div
                                className="size-10 rounded-full bg-cover bg-center border-2 border-[#b45309] shadow-[0_0_15px_rgba(180,83,9,0.5)] bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-all"
                                style={{ backgroundImage: profile?.avatar_url ? `url("${profile.avatar_url}")` : undefined }}
                            >
                                {!profile?.avatar_url && (
                                    <span className="text-xs font-black text-white/40">{profile?.full_name?.charAt(0) || 'U'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Barra de Smart Insights */}
                <div className="flex items-center bg-[#1f2937]/40 border border-white/5 backdrop-blur-sm rounded-md shadow-sm h-9 px-2 relative">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">

                        {/* Insight: VIPs Inativos */}
                        {smartInsights.inactiveVips > 0 ? (
                            <div onClick={() => { setIsInsightsOpen(true); setInsightsTab('vip'); }} className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#b45309]/20 border border-[#b45309]/40 shrink-0 cursor-pointer hover:bg-[#b45309]/30 transition-colors">
                                <span className="material-symbols-outlined text-[14px] text-[#b45309]">sell</span>
                                <span className="text-xs font-bold text-[#b45309] tracking-wider">{smartInsights.inactiveVips} {smartInsights.inactiveVips === 1 ? 'Cliente VIP inativo' : 'Clientes VIP inativos'}</span>
                            </div>
                        ) : (
                            <div onClick={() => { setIsInsightsOpen(true); setInsightsTab('vip'); }} className="flex items-center gap-1 px-2.5 py-0.5 rounded shrink-0 cursor-pointer hover:bg-white/5 transition-colors">
                                <span className="material-symbols-outlined text-[14px] text-emerald-500">verified</span>
                                <span className="text-xs font-bold text-emerald-500/80 tracking-wider">Todos os VIPs ativos</span>
                            </div>
                        )}

                        <div className="w-px h-4 bg-white/10"></div>

                        {/* Insight: Ocupação */}
                        {smartInsights.hasIdleTimes ? (
                            <div onClick={() => { setIsInsightsOpen(true); setInsightsTab('idle'); }} className="flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors">
                                <span className="material-symbols-outlined text-[16px] text-amber-500">more_time</span>
                                <span className="text-xs font-bold text-amber-500 tracking-wider">Horários Ociosos Hoje</span>
                            </div>
                        ) : (
                            <div onClick={() => { setIsInsightsOpen(true); setInsightsTab('idle'); }} className="flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-colors">
                                <span className="material-symbols-outlined text-[16px] text-emerald-500">event_available</span>
                                <span className="text-xs font-bold text-emerald-500 tracking-wider">Agenda Lotada ({smartInsights.todayAppts} hoje)</span>
                            </div>
                        )}

                        <div className="w-px h-4 bg-white/10"></div>

                        {/* Insight: Cancelamentos */}
                        {smartInsights.cancellationsSpiking ? (
                            <div onClick={() => { setIsInsightsOpen(true); setInsightsTab('cancel'); }} className="flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 cursor-pointer hover:bg-rose-500/30 transition-colors">
                                <div className="size-3.5 rounded-full bg-rose-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[10px] text-white">trending_up</span>
                                </div>
                                <span className="text-xs font-bold text-rose-500 tracking-wider">Cancelamentos em Alta</span>
                            </div>
                        ) : (
                            <div onClick={() => { setIsInsightsOpen(true); setInsightsTab('cancel'); }} className="flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded cursor-pointer hover:bg-white/5 transition-colors">
                                <span className="material-symbols-outlined text-[16px] text-white/40">trending_down</span>
                                <span className="text-xs font-bold text-white/50 tracking-wider">Cancelamentos Normais</span>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setIsInsightsOpen(true)} className="bg-white/5 border border-white/10 rounded px-3 h-6 flex items-center gap-0.5 text-xs font-bold text-white/60 uppercase tracking-wider hover:bg-white/10 transition-colors shrink-0 ml-2">
                        Ver Detalhes
                    </button>
                </div>

                <section className="bg-[#111827] border border-white/5 rounded-2xl p-1.5 mt-2 shadow-2xl">
                    <div className="relative flex items-center justify-start h-10 px-4 bg-[#1f2937]/50 rounded-t-xl border-b border-white/5 z-10">
                        <h2 className="relative text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">RESUMO DE HOJE</h2>
                    </div>
                    <div className="px-6 pt-6 pb-6 grid grid-cols-4 gap-6">
                        <div className="bg-[#1f2937] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-[#b45309]/10 flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-[#b45309] text-2xl">trending_up</span>
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Faturamento</span>
                            <span className="text-2xl font-black text-white">R$ {kpis.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-[10px] font-bold text-emerald-500 mt-2">+12.5% vs ontem</span>
                        </div>
                        <div className="bg-[#1f2937] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col items-center">
                            <div 
                                onClick={() => { setIsClientsReportOpen(true); setClientsTab('active'); }}
                                className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 cursor-pointer hover:bg-blue-500/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                title="Ver relatório de clientes"
                            >
                                <span className="material-symbols-outlined text-blue-500 text-2xl">group</span>
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Clientes</span>
                            <span className="text-2xl font-black text-white">{kpis.clientes}</span>
                            <span className="text-[10px] font-bold text-blue-400 mt-2">
                                {kpis.novosClientes} {kpis.novosClientes === 1 ? 'Novo' : 'Novos'} {periodFilter === 'diário' ? 'Hoje' : periodFilter === 'mês' ? 'Este Mês' : periodFilter === 'ano' ? 'Este Ano' : 'No Período'}
                            </span>
                        </div>
                        <div className="bg-[#1f2937] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col items-center">
                            <div 
                                onClick={() => { setIsAgendasReportOpen(true); setAgendasTab('active'); }}
                                className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 cursor-pointer hover:bg-purple-500/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                title="Ver relatório de agendamentos"
                            >
                                <span className="material-symbols-outlined text-purple-500 text-2xl">event_available</span>
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Agendas</span>
                            <span className="text-2xl font-black text-white">{kpis.atendimentos}</span>
                            <span className="text-[10px] font-bold text-purple-400 mt-2">95% Ocupação</span>
                        </div>
                        <div className="bg-[#1f2937] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-amber-500 text-2xl">shopping_bag</span>
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Produtos</span>
                            <span className="text-2xl font-black text-white">R$ {kpis.produtos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-[10px] font-bold text-amber-400 mt-2">+5.2% vs mês ant.</span>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-[1.4fr_1fr] gap-4 items-stretch min-h-[400px]">
                    <div className="flex flex-col gap-3 h-full">
                        <div className="bg-[#111827] border border-white/5 rounded-2xl p-1.5 flex flex-col h-full shadow-xl">
                            <div className="relative flex items-center justify-start h-10 px-4 bg-[#1f2937]/50 rounded-t-xl border-b border-white/5 z-10">
                                <h3 className="relative text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">ANÁLISE DE RECEITA</h3>
                            </div>
                            <div className="p-2 pt-2 flex-1 flex flex-col gap-3 relative">
                                <div className="ref-separator absolute top-0 left-0"></div>

                                <div className="mb-4">
                                    <div className="relative p-0.5 rounded-xl bg-[#1f2937] border border-white/5 overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-[#111827]/50 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-white tracking-tight">Evolução do Faturamento</h3>
                                            </div>
                                            <div className="flex bg-black/20 p-1 rounded-lg">
                                                {['Semanal', 'Mensal', 'Anual'].map((opt) => (
                                                    <button key={opt} onClick={() => setChartView(opt.toLowerCase() as any)} className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${chartView === opt.toLowerCase() ? 'bg-[#b45309] text-white' : 'text-white/40 hover:text-white'}`}>{opt}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="relative overflow-hidden bg-transparent pb-4 pt-8">
                                            <div className="relative mx-4 mb-4" style={{ height: '200px' }}>
                                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                                                    {[...Array(6)].map((_, i) => (<div key={i} className="w-full border-t border-white/5"></div>))}
                                                </div>
                                                <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-[10px] font-bold text-white/20 pointer-events-none pr-4">
                                                    {chartData.yLabels.map((lbl, idx) => (
                                                        <span key={idx}>{lbl}</span>
                                                    ))}
                                                </div>
                                                <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                                    <defs>
                                                        <linearGradient id="areaGradPremium" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#b45309" stopOpacity="0.4" />
                                                            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
                                                        </linearGradient>
                                                        <filter id="glowGold" x="-30%" y="-30%" width="160%" height="160%">
                                                            <feGaussianBlur stdDeviation="5" result="blur" />
                                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                        </filter>
                                                    </defs>
                                                    <path d={`M ${chartData.points[0].x},300 ${chartData.points.map((p, i, a) => { if (i === 0) return `L ${p.x},${p.y}`; const prev = a[i - 1]; const midX = (prev.x + p.x) / 2; return `C ${midX},${prev.y} ${midX},${p.y} ${p.x},${p.y}`; }).join(' ')} L 1000,300 Z`} fill="url(#areaGradPremium)" />
                                                    <path d={`M ${chartData.points[0].x},${chartData.points[0].y} ${chartData.points.map((p, i, a) => { if (i === 0) return ''; const prev = a[i - 1]; const midX = (prev.x + p.x) / 2; return `C ${midX},${prev.y} ${midX},${p.y} ${p.x},${p.y}`; }).join(' ')}`} fill="none" stroke="#b45309" strokeWidth="5" strokeLinecap="round" filter="url(#glowGold)" />
                                                    {chartData.points.map((p, i) => (
                                                        <g key={i} onMouseEnter={() => setActivePoint(p)} onMouseLeave={() => setActivePoint(null)} className="cursor-pointer group">
                                                            {activePoint === p && (<line x1={p.x} y1="0" x2={p.x} y2="300" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />)}
                                                            <circle cx={p.x} cy={p.y} r="6" fill="#b45309" className="group-hover:r-[8] transition-all" filter="url(#glowGold)" />
                                                            <circle cx={p.x} cy={p.y} r="3" fill="white" />
                                                            {activePoint === p && (
                                                                <g className="animate-in fade-in zoom-in duration-200">
                                                                    <rect x={p.x - 45} y={p.y - 50} width="90" height="30" rx="15" fill="#000" />
                                                                    <text x={p.x} y={p.y - 30} textAnchor="middle" fill="#b45309" className="text-[11px] font-black italic">R$ {p.val}</text>
                                                                    <path d={`M${p.x - 6},${p.y - 20} L${p.x + 6},${p.y - 20} L${p.x},${p.y - 12} Z`} fill="#000" />
                                                                </g>
                                                            )}
                                                        </g>
                                                    ))}
                                                </svg>
                                            </div>
                                            <div className="flex justify-between mt-2 px-3">
                                                {chartData.labels.map((m, i) => (
                                                    <span key={i} className={`text-[11px] font-black tracking-wider transition-all duration-300 px-1 rounded ${activePoint?.label === m ? 'text-white bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'text-[#f0e6db]/70 hover:text-[#f0e6db]/100'}`}>{m.toUpperCase()}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-[1.1fr_0.9fr] gap-3 flex-1">
                                    <div className="ref-card flex flex-col p-2 pb-1.5 relative overflow-hidden group/chart">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <span className="material-symbols-outlined text-[#b45309] text-[18px] drop-shadow-[0_0_8px_rgba(180,83,9,0.3)]">bar_chart</span>
                                            <h3 className="text-[12px] font-black text-white tracking-[0.1em] uppercase">Serviços Mais Vendidos</h3>
                                        </div>
                                        <div className="h-24 grid grid-cols-5 items-end gap-3 px-4 pb-0 relative bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5">
                                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] pointer-events-none animate-pulse"></div>
                                            {topServices.length > 0 ? topServices.map((item, i) => (
                                                <div key={i} className="w-full h-full flex flex-col justify-end relative z-10 mx-px group/bar items-center">
                                                    <div className="w-6 sm:w-8 relative transition-all duration-300 group-hover/bar:scale-y-105 group-hover/bar:brightness-125 rounded-t-lg" style={{ height: `${item.h}%`, background: `linear-gradient(180deg, ${item.color}99, ${item.color})`, borderTop: '2px solid rgba(255,255,255,0.6)', boxShadow: `0 0 15px ${item.color}44, inset 0 1px 2px rgba(255,255,255,0.4)`, transformOrigin: 'bottom' }}>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-30"></div>
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#000]/80 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full opacity-0 group-hover/bar:opacity-100 transition-all border border-white/10 shadow-lg pointer-events-none">{item.h.toFixed(0)}%</div>
                                                    </div>
                                                </div>
                                            )) : <div className="col-span-5 absolute inset-0 flex items-center justify-center opacity-40 text-xs font-bold text-[#222]">Sem dados</div>}
                                        </div>
                                        <div className="grid grid-cols-5 gap-3 px-4 mt-2 mb-3">
                                            {topServices.map((m, i) => (
                                                <div key={i} className="w-full relative h-10 flex justify-center items-start pt-1">
                                                    <span className="text-[9px] font-black tracking-tighter text-white/40 uppercase text-center leading-[1.1] line-clamp-2">
                                                        {m.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="ref-card flex-1 flex flex-col p-3 relative h-full">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="material-symbols-outlined text-[18px] text-[#b45309] drop-shadow-[0_0_8px_rgba(180,83,9,0.3)]">shield_person</span>
                                                <h4 className="text-[12px] font-black text-white tracking-[0.1em] uppercase">Desempenho Profissional</h4>
                                            </div>
                                            <div className="flex justify-between px-1 mb-2 text-[10px] font-black text-white/40 border-b border-white/5 pb-1.5 uppercase tracking-widest">
                                                <span className="w-16">Membro</span>
                                                <span className="flex-1 text-center font-black">Receita</span>
                                                <span className="w-14 text-right">Rating</span>
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                {topProfessionals.length > 0 ? topProfessionals.map((p, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 w-20 truncate">
                                                            <div className="size-6 rounded-md bg-cover bg-center border border-white/10 shadow-2xl bg-white/5 flex items-center justify-center overflow-hidden" style={{ backgroundImage: p.avatar ? `url("${p.avatar}")` : undefined }}>
                                                                {!p.avatar && <span className="text-[9px] font-black text-white/20">{p.name.charAt(0)}</span>}
                                                            </div>
                                                            <span className="text-[11px] font-black text-white/80 truncate max-w-[50px] uppercase tracking-tighter">{p.name}</span>
                                                        </div>
                                                        <span className="text-[11px] font-black text-white text-center flex-1">R$ {p.val}</span>
                                                        <div className="flex items-center gap-0.5 w-14 justify-end">
                                                            <span className="text-[11px] font-black text-[#b45309] pb-px">★</span>
                                                            <span className="text-[11px] font-black text-[#b45309] tabular-nums">{p.rating}</span>
                                                        </div>
                                                    </div>
                                                )) : <div className="py-2 text-center text-xs opacity-50 font-bold">Sem dados</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 h-full">
                        <div className="bg-[#111827] border border-white/5 rounded-2xl p-1.5 shadow-xl">
                            <div className="relative flex items-center justify-start h-10 px-4 bg-[#1f2937]/50 rounded-t-xl border-b border-white/5 z-10">
                                <h3 className="relative text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">AGENDA DE HOJE</h3>
                            </div>
                            <div className="p-3 flex flex-col gap-2">
                                <div className="bg-[#1f2937] border border-white/5 p-2 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg">
                                        <span className="material-symbols-outlined text-[#b45309] text-sm">calendar_today</span>
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Dia / Semana</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Online</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                    {todayAgenda.length > 0 ? todayAgenda.map((item, i) => (
                                        <div key={i} className="flex gap-4 items-center bg-[#1f2937]/50 border border-white/5 p-3 rounded-xl hover:bg-[#1f2937] transition-all">
                                            <div className="flex flex-col items-center justify-center border-r border-white/5 pr-4 min-w-[60px]">
                                                <span className="text-xs font-black text-white tracking-tight">{item.time}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black text-white tracking-tight">{item.label}</span>
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md text-white shadow-xl" style={{ backgroundColor: item.color }}>{item.status.toUpperCase()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-white/40">{item.svc}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="py-8 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Sem compromissos hoje</div>}
                                </div>
                            </div>
                        </div>

                        {/* Botões de Ação no Meio - Reference 1 Style */}
                        <div className="grid grid-cols-2 gap-3 my-2">
                            <button onClick={() => onNavigate?.('clients')} className="h-12 flex items-center justify-center gap-3 bg-[#1f2937] text-white border border-white/5 rounded-2xl hover:bg-[#374151] transition-all shadow-xl">
                                <span className="material-symbols-outlined text-[20px] text-[#b45309]">person_add</span>
                                <span className="text-[11px] uppercase font-black tracking-widest leading-none">Novo Cliente</span>
                            </button>
                            <button onClick={() => onNavigate?.('agenda')} className="h-12 flex items-center justify-center gap-3 bg-gradient-to-r from-[#b45309] to-[#d97706] text-white rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">
                                <span className="material-symbols-outlined text-[20px] text-white">add</span>
                                <span className="text-[11px] uppercase font-black tracking-widest leading-none">Agendar</span>
                            </button>
                        </div>

                        <div className="bg-[#111827] border border-white/5 rounded-2xl p-1.5 flex flex-col h-full shadow-2xl">
                            <div className="relative flex items-center justify-start h-10 px-4 bg-[#1f2937]/50 rounded-t-xl border-b border-white/5 z-10">
                                <h3 className="relative text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">ATIVIDADE DOS CLIENTES</h3>
                            </div>
                            <div className="p-3 flex flex-col gap-3 relative flex-1">
                                {topClientsList.length > 0 ? topClientsList.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-[#1f2937]/30 border border-white/5 rounded-xl hover:bg-[#1f2937]/60 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-cover bg-center border border-white/20 shadow-lg bg-white/5 flex items-center justify-center overflow-hidden" style={{ backgroundImage: c.avatar ? `url("${c.avatar}")` : undefined }}>
                                                {!c.avatar && <span className="text-xs font-black text-white/20">{c.name.charAt(0)}</span>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white tracking-tight">{c.name}</span>
                                                <span className="text-[10px] font-bold text-white/40">Check-in há 10 min</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-black text-white tabular-nums">{c.val}</span>
                                            {c.vip && <span className="text-[8px] font-black text-[#b45309] uppercase tracking-widest mt-1">CLIENTE VIP</span>}
                                        </div>
                                    </div>
                                )) : <div className="py-8 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Sem atividade recente</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PAINEL DE HISTÓRICO DE SERVIÇOS REALIZADOS */}
                <section className="bg-[#111827] border border-white/5 rounded-2xl p-1.5 shadow-2xl mt-4">
                    <div className="relative flex items-center justify-between h-12 px-4 bg-[#1f2937]/50 rounded-t-xl border-b border-white/5 z-10">
                        <h2 className="relative text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">HISTÓRICO DE SERVIÇOS REALIZADOS</h2>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Colaborador:</span>
                                <select
                                    className="bg-black/40 border border-white/10 text-[10px] font-bold text-white outline-none rounded-lg px-3 py-1.5 focus:border-[#b45309]/50 transition-all"
                                    value={historyProId}
                                    onChange={(e) => setHistoryProId(e.target.value)}
                                >
                                    <option value="all">TODOS</option>
                                    {professionalsStats.map(p => (
                                        <option key={p.id} value={p.id} className="bg-[#1f2937]">{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Data:</span>
                                <input
                                    type="date"
                                    className="bg-black/40 border border-white/10 text-[10px] font-bold text-white outline-none rounded-lg px-3 py-1.5 focus:border-[#b45309]/50 transition-all [color-scheme:dark]"
                                    value={historyDate}
                                    onChange={(e) => setHistoryDate(e.target.value)}
                                />
                                {(historyProId !== 'all' || historyDate !== '') && (
                                    <button
                                        className="text-[9px] text-[#b45309] uppercase font-black tracking-widest hover:brightness-125 ml-2 transition-all"
                                        onClick={() => { setHistoryProId('all'); setHistoryDate(''); }}
                                    >
                                        Limpar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">Data / Hora</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Cliente</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Colaborador</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Serviço Realizado</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">Valor Real</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">Desconto</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">Total Recebido</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-[#b45309] uppercase tracking-widest text-center">Comissão</th>
                                    <th className="px-4 py-3 text-[9px] font-black text-white/40 uppercase tracking-widest text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {groupedCommissions && groupedCommissions.length > 0 ? groupedCommissions
                                    .map((group: any, idx: number) => {
                                        const isExpanded = expandedClients[group.clientName];
                                        return (
                                            <React.Fragment key={group.clientName || `group-${idx}`}>
                                                <tr className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-4 py-4 text-center">
                                                        {group.isGroup ? (
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <span className="text-[11px] font-black text-white/40 tracking-tight">{group.dateStr}</span>
                                                                <span className="text-[9px] bg-[#b45309]/20 border border-[#b45309]/30 px-1.5 py-0.5 rounded text-[#b45309] font-black uppercase tracking-wider">{group.servicesCount} serviços</span>
                                                            </div>
                                                        ) : (
                                                            (() => {
                                                                const comm = group.representative;
                                                                return comm.scheduledDate ? (
                                                                  <div className="flex flex-col gap-1 items-center">
                                                                    <div className="whitespace-nowrap"><span className="text-[#5a5a78] text-[9px] uppercase tracking-wider">Marcado:</span> <span className="text-white/80">{new Date(comm.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')} às {comm.startTime}</span></div>
                                                                    {comm.servicoIniciadoAt && comm.servicoTerminadoAt && (
                                                                      <div className="whitespace-nowrap"><span className="text-[#5a5a78] text-[9px] uppercase tracking-wider">Realizado:</span> <span className="text-emerald-400/80">{new Date(comm.servicoIniciadoAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(comm.servicoTerminadoAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                                    )}
                                                                  </div>
                                                                ) : (
                                                                  <div className="flex flex-col gap-1 items-center">
                                                                    <span className="text-[11px] font-black text-white/40 tracking-tight">{new Date(comm.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                                    {(comm.startTime || comm.endTime) && (
                                                                        <span className="text-[10px] text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</span>
                                                                    )}
                                                                  </div>
                                                                );
                                                            })()
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {group.isGroup ? (
                                                                <button
                                                                    onClick={() => toggleExpand(group.clientName)}
                                                                    className="focus:outline-none text-[#b45309] hover:brightness-125 transition-all flex items-center justify-center p-1 rounded hover:bg-white/5"
                                                                >
                                                                    <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 24" }}>
                                                                        chevron_right
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <div className="w-7 h-7 flex items-center justify-center text-white/10">
                                                                    <span className="material-symbols-outlined text-[8px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>circle</span>
                                                                </div>
                                                            )}
                                                            <span className="text-[12px] font-black text-white tracking-tight group-hover:text-[#b45309] transition-colors">{group.clientName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[11px] font-black text-[#b45309] uppercase tracking-wider line-clamp-1 max-w-[150px]" title={group.professionals}>{group.professionals}</span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[11px] font-bold text-white/70 line-clamp-1 max-w-[200px]" title={group.services}>{group.services}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[11px] font-bold text-white/60">
                                                            {formatBRL(group.totalServiceValue)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[11px] font-bold text-rose-500/80">
                                                            {group.totalDiscountValue > 0 ? `${formatBRL(group.totalDiscountValue)}` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[12px] font-black text-white tracking-tight">
                                                            {formatBRL(group.totalServiceValue - group.totalDiscountValue)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[12px] font-black text-[#b45309] tracking-tight">
                                                            {formatBRL(group.totalCommissionValue)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${group.status === 'paid'
                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                                : 'bg-[#b45309]/10 border-[#b45309]/20 text-[#b45309]'
                                                            }`}>
                                                            {group.status === 'paid' ? 'Pago' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {group.isGroup && isExpanded && group.items.map((comm: any, cIdx: number) => (
                                                    <tr key={comm.id || `child-${idx}-${cIdx}`} className="bg-[#0f172a]/60 hover:bg-[#1e293b]/40 border-l-[3px] border-[#b45309]/60 transition-colors">
                                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                                            {comm.scheduledDate ? (
                                                              <div className="flex flex-col gap-0.5 items-center opacity-70 scale-95">
                                                                <div className="whitespace-nowrap"><span className="text-[#5a5a78] text-[8px] uppercase tracking-wider">Marcado:</span> <span className="text-white/80">{new Date(comm.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')} às {comm.startTime}</span></div>
                                                                {comm.servicoIniciadoAt && comm.servicoTerminadoAt && (
                                                                  <div className="whitespace-nowrap"><span className="text-[#5a5a78] text-[8px] uppercase tracking-wider">Realizado:</span> <span className="text-emerald-400/80">{new Date(comm.servicoIniciadoAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(comm.servicoTerminadoAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                                )}
                                                              </div>
                                                            ) : (
                                                              <div className="flex flex-col gap-0.5 items-center opacity-70 scale-95">
                                                                <span className="text-[10px] font-black text-white/40 tracking-tight">{new Date(comm.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                                {(comm.startTime || comm.endTime) && (
                                                                    <span className="text-[9px] text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</span>
                                                                )}
                                                              </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 pl-8 border-b border-white/5">
                                                            <div className="flex items-center gap-1 opacity-80">
                                                                <span className="material-symbols-outlined text-[14px] text-[#b45309]/60">subdirectory_arrow_right</span>
                                                                <span className="text-[11px] font-bold text-white/60">{comm.clientName || comm.client || 'Cliente'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-white/5">
                                                            <span className="text-[10px] font-bold text-[#b45309]/80 uppercase tracking-wider">{comm.professionalName}</span>
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-white/5">
                                                            <span className="text-[10px] font-medium text-white/50">{comm.service}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                                            <span className={`text-[10px] font-medium ${comm.isDiscounted ? 'line-through text-white/20' : 'text-white/40'}`}>
                                                                {formatBRL(comm.serviceValue)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                                            <span className="text-[10px] font-medium text-rose-500/60">
                                                                {comm.isDiscounted ? `${formatBRL(comm.discountValue || 0)}` : '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                                            <span className="text-[11px] font-bold text-white/60">
                                                                {formatBRL(comm.serviceValue - (comm.discountValue || 0))}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                                            <div className="flex flex-col items-center scale-95">
                                                                <span className="text-[11px] font-bold text-[#b45309]/80">
                                                                    {formatBRL(comm.commissionValue)}
                                                                </span>
                                                                <span className="text-[8px] text-[#b45309]/40 uppercase tracking-widest mt-0.5">({comm.commissionPercent}%)</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${comm.status === 'paid'
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500/80'
                                                                    : 'bg-[#b45309]/10 border-[#b45309]/20 text-[#b45309]/80'
                                                                }`}>
                                                                {comm.status === 'paid' ? 'Pago' : 'Pendente'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    }) : (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <span className="material-symbols-outlined text-white/10 text-4xl">history</span>
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Nenhum serviço registrado neste período</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </main>

            {/* Smart Insights Drawer */}
            {isInsightsOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in" onClick={() => setIsInsightsOpen(false)} />
                    <div className="fixed top-0 right-0 h-full w-[450px] bg-[#0f172a] border-l border-white/10 shadow-2xl z-[210] flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1f2937]/50">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">lightbulb</span>
                                <h2 className="text-lg font-black text-white uppercase tracking-widest">Smart Insights</h2>
                            </div>
                            <button onClick={() => setIsInsightsOpen(false)} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-4 gap-2 border-b border-white/5">
                            <button onClick={() => setInsightsTab('vip')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${insightsTab === 'vip' ? 'bg-[#b45309]/20 text-[#b45309] border border-[#b45309]/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                VIPs Inativos
                            </button>
                            <button onClick={() => setInsightsTab('idle')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${insightsTab === 'idle' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                Ociosidade
                            </button>
                            <button onClick={() => setInsightsTab('cancel')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${insightsTab === 'cancel' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                Cancelamentos
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {insightsTab === 'vip' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Clientes VIP que não realizam agendamentos há mais de 30 dias. Sugerimos enviar uma mensagem de retenção.</p>
                                    {smartInsights.inactiveVipsList.length > 0 ? smartInsights.inactiveVipsList.map(client => (
                                        <div key={client.id} className="bg-[#1f2937]/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-[#1f2937] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-cover bg-center border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden" style={{ backgroundImage: client.avatar_url ? `url("${client.avatar_url}")` : undefined }}>
                                                    {!client.avatar_url && <span className="text-xs font-black text-white/20">{client.name?.charAt(0) || 'C'}</span>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{client.name}</span>
                                                    <span className="text-[10px] text-white/40">Última visita: {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString('pt-BR') : 'Nunca'}</span>
                                                </div>
                                            </div>
                                            <a href={`https://wa.me/${client.phone?.replace(/\D/g, '')}?text=Oi ${client.name.split(' ')[0]}, notamos que faz um tempo desde sua última visita ao Studio Angela Barbosa. Preparamos um mimo especial para você!`} target="_blank" rel="noreferrer" className="size-10 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">chat</span>
                                            </a>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-emerald-500">verified</span>
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Todos os VIPs estão ativos!</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {insightsTab === 'idle' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Resumo da ocupação da agenda para hoje. Caso haja muitos horários vagos, considere uma promoção relâmpago no Instagram.</p>
                                    <div className="bg-[#1f2937]/50 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                                        <div className={`size-16 rounded-full flex items-center justify-center ${smartInsights.hasIdleTimes ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            <span className="material-symbols-outlined text-3xl">{smartInsights.hasIdleTimes ? 'hourglass_empty' : 'event_available'}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-white mt-2">{smartInsights.todayAppts} Agendamentos</h3>
                                        <p className="text-xs text-white/60">{smartInsights.hasIdleTimes ? 'A ocupação está baixa hoje.' : 'A agenda está movimentada!'}</p>

                                        <button onClick={() => { setIsInsightsOpen(false); onNavigate?.('agenda'); }} className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all w-full">
                                            Abrir Agenda
                                        </button>
                                    </div>
                                </div>
                            )}

                            {insightsTab === 'cancel' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Histórico de cancelamentos nos últimos 7 dias. Tente contatar os clientes para reagendar.</p>
                                    {smartInsights.recentCancellationsList.length > 0 ? smartInsights.recentCancellationsList.map(appt => (
                                        <div key={appt.id} className="bg-[#1f2937]/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 hover:bg-[#1f2937] transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{appt.clientName}</span>
                                                    <span className="text-[10px] text-white/40">{appt.serviceTitle} • {new Date(appt.start_time).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <div className="px-2 py-1 bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase rounded-md border border-rose-500/20">
                                                    Cancelado
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <a href={`https://wa.me/${appt.clientPhone?.replace(/\D/g, '')}?text=Oi ${appt.clientName.split(' ')[0]}, vimos que você precisou cancelar seu agendamento de ${appt.serviceTitle}. Queríamos saber se gostaria de remarcar para outro dia!`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all">
                                                    <span className="material-symbols-outlined text-[14px]">chat</span> Reagendar
                                                </a>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-white/40">trending_down</span>
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Nenhum cancelamento recente</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
            {/* Clientes Report Drawer */}
            {isClientsReportOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in" onClick={() => setIsClientsReportOpen(false)} />
                    <div className="fixed top-0 right-0 h-full w-[450px] bg-[#0f172a] border-l border-white/10 shadow-2xl z-[210] flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1f2937]/50">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">group</span>
                                <h2 className="text-lg font-black text-white uppercase tracking-widest">Relatório de Clientes</h2>
                            </div>
                            <button onClick={() => setIsClientsReportOpen(false)} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-4 gap-2 border-b border-white/5">
                            <button onClick={() => setClientsTab('active')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${clientsTab === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                Clientes do Período ({periodClients.length})
                            </button>
                            <button onClick={() => setClientsTab('new')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${clientsTab === 'new' ? 'bg-[#b45309]/20 text-[#b45309] border border-[#b45309]/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                Novos Cadastros ({periodNewClients.length})
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {clientsTab === 'active' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Clientes que agendaram serviços ou realizaram checkouts no período selecionado.</p>
                                    {periodClients.length > 0 ? periodClients.map(client => (
                                        <div key={client.id} className="bg-[#1f2937]/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:bg-[#1f2937] transition-colors relative">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-cover bg-center border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden" style={{ backgroundImage: client.avatar_url ? `url("${client.avatar_url}")` : undefined }}>
                                                        {!client.avatar_url && <span className="text-xs font-black text-white/20">{client.name?.charAt(0) || 'C'}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-black text-white">{client.name}</span>
                                                            {client.is_vip && (
                                                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase rounded border border-amber-500/20">VIP</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-white/40">{client.phone || 'Sem telefone'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-white block">{formatBRL(client.totalSpent)}</span>
                                                    <span className="text-[9px] text-white/40 block">consumido</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 justify-between">
                                                <div className="flex items-center gap-2 text-[9px] text-white/50 uppercase font-bold tracking-wider">
                                                    <span>📅 {client.appointmentsCount} Agend.</span>
                                                    <span>💳 {client.transactionsCount} Trans.</span>
                                                </div>
                                                {client.isDuplicate && (
                                                    <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-500 text-[8px] font-black uppercase rounded border border-rose-500/20 flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[8px]">warning</span> Cadastro Duplicado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-white/40">group</span>
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Nenhum cliente ativo no período</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {clientsTab === 'new' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Clientes cujo cadastro foi criado no período selecionado.</p>
                                    {periodNewClients.length > 0 ? periodNewClients.map(client => (
                                        <div key={client.id} className="bg-[#1f2937]/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:bg-[#1f2937] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-cover bg-center border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden" style={{ backgroundImage: client.avatar_url ? `url("${client.avatar_url}")` : undefined }}>
                                                        {!client.avatar_url && <span className="text-xs font-black text-white/20">{client.name?.charAt(0) || 'C'}</span>}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-black text-white">{client.name}</span>
                                                            {client.is_vip && (
                                                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase rounded border border-amber-500/20">VIP</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-white/40">Criado em: {client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                                                    </div>
                                                </div>
                                                {client.isDuplicate && (
                                                    <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-500 text-[8px] font-black uppercase rounded border border-rose-500/20 flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[8px]">warning</span> Cadastro Duplicado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-white/40">person_add</span>
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Nenhum cliente cadastrado hoje</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Agendas Report Drawer */}
            {isAgendasReportOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-in fade-in" onClick={() => setIsAgendasReportOpen(false)} />
                    <div className="fixed top-0 right-0 h-full w-[450px] bg-[#0f172a] border-l border-white/10 shadow-2xl z-[210] flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1f2937]/50">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-500">event_available</span>
                                <h2 className="text-lg font-black text-white uppercase tracking-widest">Relatório de Agenda</h2>
                            </div>
                            <button onClick={() => setIsAgendasReportOpen(false)} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-4 gap-2 border-b border-white/5">
                            <button onClick={() => setAgendasTab('active')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${agendasTab === 'active' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                Agendas Ativas ({periodActiveAppointments.length})
                            </button>
                            <button onClick={() => setAgendasTab('cancelled')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${agendasTab === 'cancelled' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                                Cancelados ({periodCancelledAppointments.length})
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {agendasTab === 'active' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Agendamentos confirmados, concluídos ou em andamento no período selecionado.</p>
                                    {periodActiveAppointments.length > 0 ? periodActiveAppointments.map(appt => {
                                        let statusColor = 'bg-amber-500/20 text-amber-500 border-amber-500/20';
                                        let statusText = 'Pendente';
                                        
                                        if (appt.status === 'confirmed' || appt.status === 'confirmado') {
                                            statusColor = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
                                            statusText = 'Confirmado';
                                        } else if (appt.status === 'em_atendimento') {
                                            statusColor = 'bg-blue-500/20 text-blue-400 border-blue-500/20';
                                            statusText = 'Em Atendimento';
                                        } else if (appt.status === 'pago') {
                                            statusColor = 'bg-purple-500/20 text-purple-400 border-purple-500/20';
                                            statusText = 'Pago';
                                        }

                                        return (
                                            <div key={appt.id} className="bg-[#1f2937]/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:bg-[#1f2937] transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white">{appt.clientName}</span>
                                                        <span className="text-[10px] text-[#b45309] font-black uppercase tracking-wider mt-0.5">{appt.serviceTitle}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-md ${statusColor}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[10px] text-white/50 font-bold uppercase tracking-wider">
                                                    <span>🕒 {new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às {new Date(appt.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>💇 {appt.professionalName}</span>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-white/40">event_available</span>
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Nenhum agendamento ativo</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {agendasTab === 'cancelled' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-white/50 mb-2">Agendamentos que foram cancelados no período selecionado.</p>
                                    {periodCancelledAppointments.length > 0 ? periodCancelledAppointments.map(appt => (
                                        <div key={appt.id} className="bg-[#1f2937]/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:bg-[#1f2937] transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{appt.clientName}</span>
                                                    <span className="text-[10px] text-rose-400 font-black uppercase tracking-wider mt-0.5">{appt.serviceTitle}</span>
                                                </div>
                                                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/20 text-[9px] font-black uppercase rounded-md">
                                                    Cancelado
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[10px] text-white/50 font-bold uppercase tracking-wider">
                                                <span>🕒 {new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às {new Date(appt.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>💇 {appt.professionalName}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-white/40">event_busy</span>
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Nenhum cancelamento no período</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardOverview;
