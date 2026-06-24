import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type CashSession = Database['public']['Tables']['cash_sessions']['Row'] & {
    opened_by_profile?: { full_name: string } | null;
    closed_by_profile?: { full_name: string } | null;
};
type Transaction = Database['public']['Tables']['transactions']['Row'] & {
    client?: { name: string } | null;
    professional?: { name: string } | null;
};

const CashReports = () => {
    const getTodayDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // --- State Filters ---
    const [periodType, setPeriodType] = useState<'diario' | 'mensal' | 'personalizado'>('diario');
    const [diarioDate, setDiarioDate] = useState(getTodayDate());
    const [mensalMonth, setMensalMonth] = useState<number>(new Date().getMonth() + 1);
    const [mensalYear, setMensalYear] = useState<number>(new Date().getFullYear());
    const [personalizadoType, setPersonalizadoType] = useState<'intervalo' | 'ano'>('intervalo');
    const [personalizadoStartDate, setPersonalizadoStartDate] = useState(getTodayDate());
    const [personalizadoEndDate, setPersonalizadoEndDate] = useState(getTodayDate());
    const [personalizadoYear, setPersonalizadoYear] = useState<number>(new Date().getFullYear());

    // --- Fetching State ---
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Detail & Export States ---
    const [activeLeftTab, setActiveLeftTab] = useState<'sessions' | 'transactions'>('sessions');
    const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

    const toggleExpandTx = (id: string) => {
        setExpandedTxIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Helper to calculate dates ---
    const dateInterval = useMemo(() => {
        let start = '';
        let end = '';
        let startYMD = '';
        let endYMD = '';

        if (periodType === 'diario') {
            startYMD = diarioDate;
            endYMD = diarioDate;
        } else if (periodType === 'mensal') {
            const lastDay = new Date(mensalYear, mensalMonth, 0).getDate();
            const monthStr = String(mensalMonth).padStart(2, '0');
            startYMD = `${mensalYear}-${monthStr}-01`;
            endYMD = `${mensalYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
        } else if (periodType === 'personalizado') {
            if (personalizadoType === 'ano') {
                startYMD = `${personalizadoYear}-01-01`;
                endYMD = `${personalizadoYear}-12-31`;
            } else {
                startYMD = personalizadoStartDate;
                endYMD = personalizadoEndDate;
            }
        }

        start = `${startYMD}T00:00:00.000Z`;
        end = `${endYMD}T23:59:59.999Z`;

        return { start, end, startYMD, endYMD };
    }, [
        periodType,
        diarioDate,
        mensalMonth,
        mensalYear,
        personalizadoType,
        personalizadoStartDate,
        personalizadoEndDate,
        personalizadoYear
    ]);

    // --- Fetch Data ---
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { start, end } = dateInterval;

            // Fetch Cash Sessions in period
            const { data: sData, error: sErr } = await supabase
                .from('cash_sessions')
                .select(`
                    *,
                    opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
                    closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
                `)
                .gte('opened_at', start)
                .lte('opened_at', end)
                .order('opened_at', { ascending: false });

            if (sErr) throw sErr;

            // Fetch Transactions in period
            const { data: tData, error: tErr } = await supabase
                .from('transactions')
                .select(`
                    *,
                    client:clients(name),
                    professional:professionals(name)
                `)
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: false });

            if (tErr) throw tErr;

            setSessions((sData || []) as any[]);
            setTransactions((tData || []) as any[]);
        } catch (err: any) {
            console.error('Error fetching reports data:', err);
            setError(err.message || 'Erro ao carregar dados do relatório.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateInterval]);

    // --- Calculations ---
    const metrics = useMemo(() => {
        let totalEntradas = 0;
        let totalSaidas = 0;
        let totalDiferencas = 0;
        let totalComissoes = 0;
        let salesCount = 0;
        let withdrawalsCount = 0;

        transactions.forEach(t => {
            if (t.status === 'cancelado') return;
            if (t.type === 'entrada') {
                totalEntradas += t.amount;
                salesCount++;

                // Calculate commission generated for this sale
                const items = (t.items_json as any[]) || [];
                items.forEach(item => {
                    let rate = 30; // default fallback
                    if (item.commissionPercentage !== undefined) {
                        rate = item.commissionPercentage;
                    } else if (item.commission_percentage !== undefined) {
                        rate = item.commission_percentage;
                    }

                    // Deduct proportional discount from item price
                    let itemDiscount = 0;
                    const discountTotal = typeof t.discount === 'string' ? parseFloat(t.discount) : (t.discount || 0);
                    if (discountTotal > 0 && items.length > 0) {
                        const itemsTotal = items.reduce((sum, it) => sum + (typeof it.price === 'string' ? parseFloat(it.price) : (it.price || 0)), 0);
                        if (itemsTotal > 0) {
                            itemDiscount = (item.price * discountTotal) / itemsTotal;
                        }
                    }
                    const finalPrice = (item.price || 0) - itemDiscount;
                    totalComissoes += (finalPrice * rate) / 100;
                });
            } else if (t.type === 'saida') {
                totalSaidas += t.amount;
                withdrawalsCount++;
            }
        });

        sessions.forEach(s => {
            if (s.status === 'closed') {
                totalDiferencas += s.difference || 0;
            }
        });

        const saldoLiquido = totalEntradas - totalSaidas;
        const ticketMedio = salesCount > 0 ? totalEntradas / salesCount : 0;

        return {
            totalEntradas,
            totalSaidas,
            saldoLiquido,
            totalDiferencas,
            totalComissoes,
            salesCount,
            withdrawalsCount,
            ticketMedio,
            sessionsCount: sessions.length,
            closedSessionsCount: sessions.filter(s => s.status === 'closed').length,
            openSessionsCount: sessions.filter(s => s.status === 'open').length
        };
    }, [transactions, sessions]);

    // --- Chart Data Calculation ---
    const chartData = useMemo(() => {
        if (periodType === 'diario') {
            // Group by hour (08:00 to 20:00)
            const intervals = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
            const dataMap: { [key: string]: number } = {};
            intervals.forEach(h => { dataMap[h] = 0; });

            transactions.forEach(t => {
                if (t.status === 'cancelado' || t.type !== 'entrada' || !t.created_at) return;
                const d = new Date(t.created_at);
                const hour = d.getHours();

                let matched = '08:00';
                if (hour >= 20) matched = '20:00';
                else if (hour >= 18) matched = '18:00';
                else if (hour >= 16) matched = '16:00';
                else if (hour >= 14) matched = '14:00';
                else if (hour >= 12) matched = '12:00';
                else if (hour >= 10) matched = '10:00';

                dataMap[matched] += t.amount;
            });

            return intervals.map(label => ({
                label,
                value: dataMap[label]
            }));
        } else {
            // Group by day
            const dataMap: { [key: string]: number } = {};
            const { startYMD, endYMD } = dateInterval;
            
            const start = new Date(startYMD + 'T12:00:00');
            const end = new Date(endYMD + 'T12:00:00');
            const dateList: string[] = [];

            let current = new Date(start);
            while (current <= end && dateList.length < 31) {
                const ymd = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                dateList.push(ymd);
                current.setDate(current.getDate() + 1);
            }

            dateList.forEach(ymd => {
                dataMap[ymd] = 0;
            });

            transactions.forEach(t => {
                if (t.status === 'cancelado' || t.type !== 'entrada' || !t.created_at) return;
                const ymd = t.created_at.split('T')[0];
                if (dataMap[ymd] !== undefined) {
                    dataMap[ymd] += t.amount;
                }
            });

            return dateList.map(ymd => {
                const parts = ymd.split('-');
                return {
                    label: `${parts[2]}/${parts[1]}`, // e.g. 19/06
                    value: dataMap[ymd]
                };
            });
        }
    }, [transactions, periodType, dateInterval]);

    // --- Export to CSV ---
    const exportToCSV = () => {
        const { startYMD, endYMD } = dateInterval;
        const periodLabel = periodType === 'diario' ? formatDateStr(startYMD) : `${formatDateStr(startYMD)}_a_${formatDateStr(endYMD)}`;
        
        let csvContent = '\uFEFF'; // UTF-8 BOM

        // 1. Header & Consolidated Summary
        csvContent += 'RELATÓRIO CONSOLIDADO DE CAIXA\n';
        csvContent += `Período:;${getPeriodLabel()}\n\n`;
        csvContent += 'RESUMO FINANCEIRO\n';
        csvContent += `Faturamento Bruto:;${formatCurrency(metrics.totalEntradas).replace('R$', '').trim()}\n`;
        csvContent += `Total de Saídas:;${formatCurrency(metrics.totalSaidas).replace('R$', '').trim()}\n`;
        csvContent += `Saldo Líquido:;${formatCurrency(metrics.saldoLiquido).replace('R$', '').trim()}\n`;
        csvContent += `Quebra Acumulada:;${formatCurrency(metrics.totalDiferencas).replace('R$', '').trim()}\n\n`;

        // 2. Performance Indicators
        csvContent += 'INDICADORES DE DESEMPENHO\n';
        csvContent += `Quantidade de Vendas:;${metrics.salesCount}\n`;
        csvContent += `Ticket Médio:;${formatCurrency(metrics.ticketMedio).replace('R$', '').trim()}\n`;
        csvContent += `Quantidade de Retiradas:;${metrics.withdrawalsCount}\n`;
        csvContent += `Comissões Geradas:;${formatCurrency(metrics.totalComissoes).replace('R$', '').trim()}\n\n`;

        // 3. Cash Sessions
        csvContent += 'SESSÕES DE CAIXA\n';
        csvContent += 'Abertura;Fechamento;Status;Operador;Saldo Inicial;Saldo Esperado;Saldo Real;Diferença;Observações\n';
        sessions.forEach(s => {
            const opened = new Date(s.opened_at).toLocaleString('pt-BR');
            const closed = s.closed_at ? new Date(s.closed_at).toLocaleString('pt-BR') : 'Aberto';
            const operator = s.status === 'open'
                ? (s.opened_by_profile as any)?.full_name || 'Operador'
                : (s.closed_by_profile as any)?.full_name || (s.opened_by_profile as any)?.full_name || 'Operador';
            const expected = s.status === 'closed' ? (s.expected_closing_balance || 0) : 0;
            const actual = s.status === 'closed' ? (s.actual_closing_balance || 0) : 0;
            const diff = s.status === 'closed' ? (s.difference || 0) : 0;

            csvContent += `"${opened}";"${closed}";"${s.status === 'open' ? 'Aberto' : 'Fechado'}";"${operator}";"${s.opening_balance}";"${expected}";"${actual}";"${diff}";"${(s.notes || '').replace(/"/g, '""')}"\n`;
        });
        csvContent += '\n';

        // 4. Detailed Transactions
        csvContent += 'DETALHAMENTO DE TRANSAÇÕES\n';
        csvContent += 'Data/Hora;Tipo;Categoria;Descrição;Cliente;Profissional;Método de Pagamento;Status;Desconto;Valor total;Observações\n';
        transactions.forEach(t => {
            const time = t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : '';
            const type = t.type === 'entrada' ? 'Entrada' : 'Saída';
            const clientName = (t as any).client?.name || 'Cliente Externo';
            const proName = (t as any).professional?.name || 'Recepção';
            const status = t.status || 'pago';
            const discount = t.discount || 0;

            csvContent += `"${time}";"${type}";"${t.category || ''}";"${(t.description || '').replace(/"/g, '""')}";"${clientName}";"${proName}";"${t.payment_method || ''}";"${status}";"${discount}";"${t.amount}";"${(t.observation || '').replace(/"/g, '""')}"\n`;
        });

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio_caixa_${periodLabel}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Payment Methods Breakdown ---
    const methodSummary = useMemo(() => {
        const summary: { [key: string]: number } = {
            'Pix': 0,
            'Dinheiro': 0,
            'Cartão de Crédito': 0,
            'Cartão de Débito': 0,
            'Pendente': 0,
            'Outros': 0
        };

        transactions.forEach(t => {
            if (t.status === 'cancelado' || t.type !== 'entrada') return;
            
            const method = (t.payment_method || '').toLowerCase();
            const isPendente = t.status === 'pendente' || method.includes('pendente') || method.includes('fiado');

            if (isPendente) {
                summary['Pendente'] += t.amount;
            } else if (method.includes('pix')) {
                summary['Pix'] += t.amount;
            } else if (method.includes('dinheiro')) {
                summary['Dinheiro'] += t.amount;
            } else if (method.includes('crédito') || method.includes('credito') || method.includes('credit')) {
                summary['Cartão de Crédito'] += t.amount;
            } else if (method.includes('débito') || method.includes('debito') || method.includes('debit')) {
                summary['Cartão de Débito'] += t.amount;
            } else {
                summary['Outros'] += t.amount;
            }
        });

        const totalPay = Object.values(summary).reduce((a, b) => a + b, 0);

        return Object.entries(summary).map(([name, val]) => ({
            name,
            value: val,
            percentage: totalPay > 0 ? (val / totalPay) * 100 : 0
        })).sort((a, b) => b.value - a.value);
    }, [transactions]);

    const formatDateStr = (ymdStr: string) => {
        if (!ymdStr) return '';
        const parts = ymdStr.split('-');
        if (parts.length !== 3) return ymdStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // --- Render Helpers ---
    const getPeriodLabel = () => {
        const { startYMD, endYMD } = dateInterval;
        const startFormatted = formatDateStr(startYMD);
        const endFormatted = formatDateStr(endYMD);

        if (periodType === 'diario') {
            return startFormatted;
        }
        return `${startFormatted} a ${endFormatted}`;
    };

    return (
        <div className="flex flex-col gap-6 py-2 animate-in fade-in duration-300">
            {/* Filter Header */}
            <div className="flex flex-col gap-6 p-6 rounded-3xl bg-[#1f2937]/50 border border-white/5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">Filtros de Relatório</h2>
                        <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">Selecione o período do relatório consolidado de caixas</p>
                    </div>
                    {/* Period Type Selection Buttons */}
                    <div className="flex bg-[#0f172a]/80 p-1.5 rounded-xl border border-white/5">
                        {(['diario', 'mensal', 'personalizado'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setPeriodType(type)}
                                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border-none cursor-pointer
                                    ${periodType === type ? 'bg-[#b45309] text-white shadow-lg shadow-[#b45309]/20' : 'text-white/40 hover:text-white bg-transparent'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub Filters depending on period */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                    {periodType === 'diario' && (
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Selecionar Dia</label>
                            <input
                                id="diario-date"
                                type="date"
                                value={diarioDate}
                                title="Selecionar Dia"
                                placeholder="AAAA-MM-DD"
                                onChange={(e) => setDiarioDate(e.target.value)}
                                className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                            />
                        </div>
                    )}



                    {periodType === 'mensal' && (
                        <>
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mês</label>
                                <select
                                    value={mensalMonth}
                                    title="Mês"
                                    aria-label="Mês"
                                    onChange={(e) => setMensalMonth(Number(e.target.value))}
                                    className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                                >
                                    {[
                                        { v: 1, label: 'Janeiro' },
                                        { v: 2, label: 'Fevereiro' },
                                        { v: 3, label: 'Março' },
                                        { v: 4, label: 'Abril' },
                                        { v: 5, label: 'Maio' },
                                        { v: 6, label: 'Junho' },
                                        { v: 7, label: 'Julho' },
                                        { v: 8, label: 'Agosto' },
                                        { v: 9, label: 'Setembro' },
                                        { v: 10, label: 'Outubro' },
                                        { v: 11, label: 'Novembro' },
                                        { v: 12, label: 'Dezembro' }
                                    ].map(m => (
                                        <option key={m.v} value={m.v} className="bg-[#1f2937] text-white">{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ano</label>
                                <input
                                    type="number"
                                    value={mensalYear}
                                    title="Ano"
                                    placeholder="AAAA"
                                    onChange={(e) => setMensalYear(Number(e.target.value))}
                                    className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                                />
                            </div>
                        </>
                    )}

                    {periodType === 'personalizado' && (
                        <>
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tipo Personalizado</label>
                                <select
                                    value={personalizadoType}
                                    title="Tipo Personalizado"
                                    aria-label="Tipo Personalizado"
                                    onChange={(e) => setPersonalizadoType(e.target.value as any)}
                                    className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                                >
                                    <option value="intervalo" className="bg-[#1f2937] text-white">Intervalo de Datas</option>
                                    <option value="ano" className="bg-[#1f2937] text-white">Ano Inteiro</option>
                                </select>
                            </div>

                            {personalizadoType === 'ano' ? (
                                <div className="flex flex-col gap-1.5 text-left">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Selecionar Ano</label>
                                    <input
                                        type="number"
                                        value={personalizadoYear}
                                        title="Selecionar Ano"
                                        placeholder="AAAA"
                                        onChange={(e) => setPersonalizadoYear(Number(e.target.value))}
                                        className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">De (Data Inicial)</label>
                                        <input
                                            type="date"
                                            value={personalizadoStartDate}
                                            title="De (Data Inicial)"
                                            placeholder="AAAA-MM-DD"
                                            onChange={(e) => setPersonalizadoStartDate(e.target.value)}
                                            className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Até (Data Final)</label>
                                        <input
                                            type="date"
                                            value={personalizadoEndDate}
                                            title="Até (Data Final)"
                                            placeholder="AAAA-MM-DD"
                                            onChange={(e) => setPersonalizadoEndDate(e.target.value)}
                                            className="bg-[#0f172a]/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#b45309]"
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    <div className="flex items-end col-span-1 md:col-span-2 lg:col-span-1">
                        <button
                            onClick={exportToCSV}
                            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest border border-white/10 active:scale-95 transition-all cursor-pointer"
                            title="Exportar Relatório em CSV"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Exportar CSV
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                    <div className="size-12 rounded-full border-4 border-[#d9a821]/20 border-t-[#06b6d4] animate-spin"></div>
                    <p className="text-sm font-bold text-white/50 uppercase tracking-widest">Processando Relatório...</p>
                </div>
            ) : error ? (
                <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center max-w-md mx-auto">
                    <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">error</span>
                    <p className="text-sm text-rose-400 font-bold uppercase">{error}</p>
                </div>
            ) : (
                <>
                    {/* Top Consolidated Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-5 rounded-3xl bg-[#1f2937]/50 border border-white/5 text-left relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px]" />
                            <h3 className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Faturamento Bruto</h3>
                            <p className="text-2xl font-mono font-black text-white">{formatCurrency(metrics.totalEntradas)}</p>
                            <span className="text-[9px] text-white/30 font-bold block mt-2 uppercase tracking-wide">Total de entradas no período</span>
                        </div>

                        <div className="p-5 rounded-3xl bg-[#1f2937]/50 border border-white/5 text-left relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-rose-500/5 rounded-full blur-[40px]" />
                            <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Total de Saídas</h3>
                            <p className="text-2xl font-mono font-black text-white">{formatCurrency(metrics.totalSaidas)}</p>
                            <span className="text-[9px] text-white/30 font-bold block mt-2 uppercase tracking-wide">Sangrias e despesas do período</span>
                        </div>

                        <div className="p-5 rounded-3xl bg-[#1f2937]/50 border border-white/5 text-left relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-cyan-500/5 rounded-full blur-[40px]" />
                            <h3 className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Saldo Líquido</h3>
                            <p className="text-2xl font-mono font-black text-white">{formatCurrency(metrics.saldoLiquido)}</p>
                            <span className="text-[9px] text-white/30 font-bold block mt-2 uppercase tracking-wide">Diferença Entradas vs Saídas</span>
                        </div>

                        <div className="p-5 rounded-3xl bg-[#1f2937]/50 border border-white/5 text-left relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-amber-500/5 rounded-full blur-[40px]" />
                            <h3 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Quebra Acumulada</h3>
                            <p className={`text-2xl font-mono font-black ${metrics.totalDiferencas > 0 ? 'text-emerald-400' : metrics.totalDiferencas < 0 ? 'text-rose-400' : 'text-white'}`}>
                                {metrics.totalDiferencas > 0 ? '+' : ''}{formatCurrency(metrics.totalDiferencas)}
                            </p>
                            <span className="text-[9px] text-white/30 font-bold block mt-2 uppercase tracking-wide">Total de diferenças nos fechamentos</span>
                        </div>
                    </div>

                    {/* Main Analytics Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Session closure list / Transactions list */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex bg-[#0f172a]/80 p-1.5 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setActiveLeftTab('sessions')}
                                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer
                                            ${activeLeftTab === 'sessions' ? 'bg-[#b45309] text-white shadow-lg' : 'text-white/40 hover:text-white bg-transparent'}`}
                                    >
                                        Sessões de Caixa
                                    </button>
                                    <button
                                        onClick={() => setActiveLeftTab('transactions')}
                                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border-none cursor-pointer
                                            ${activeLeftTab === 'transactions' ? 'bg-[#b45309] text-white shadow-lg' : 'text-white/40 hover:text-white bg-transparent'}`}
                                    >
                                        Transações Detalhadas
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                                        {metrics.closedSessionsCount} Fechados
                                    </span>
                                    {metrics.openSessionsCount > 0 && (
                                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                            {metrics.openSessionsCount} Em Aberto
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                                {activeLeftTab === 'sessions' ? (
                                    <>
                                        {sessions.map(session => {
                                            const openedAt = new Date(session.opened_at);
                                            const closedAt = session.closed_at ? new Date(session.closed_at) : null;
                                            const diff = session.difference || 0;

                                            return (
                                                <div key={session.id} className="p-5 rounded-3xl bg-[#1f2937]/50 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-4 text-left">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="text-[10px] text-[#b45309] font-black uppercase tracking-widest block">Período</span>
                                                            <span className="text-sm font-black text-white">
                                                                {openedAt.toLocaleDateString('pt-BR')} {openedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                {closedAt ? ` - ${closedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ' (Aberto)'}
                                                            </span>
                                                        </div>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${session.status === 'open' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400 border border-white/5'}`}>
                                                            {session.status === 'open' ? 'Aberto' : 'Fechado'}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-white/5 pt-4">
                                                        <div>
                                                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Operador</span>
                                                            <span className="text-xs font-bold text-white truncate max-w-[120px] block">
                                                                {session.status === 'open'
                                                                    ? (session.opened_by_profile as any)?.full_name
                                                                    : (session.closed_by_profile as any)?.full_name || (session.opened_by_profile as any)?.full_name || 'Operador'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Saldo Inicial</span>
                                                            <span className="text-xs font-mono font-bold text-white">{formatCurrency(session.opening_balance)}</span>
                                                        </div>
                                                        {session.status === 'closed' && (
                                                            <>
                                                                <div>
                                                                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Saldo Esperado</span>
                                                                    <span className="text-xs font-mono font-bold text-white">{formatCurrency(session.expected_closing_balance || 0)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Saldo Real</span>
                                                                    <span className="text-xs font-mono font-bold text-white">{formatCurrency(session.actual_closing_balance || 0)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Diferença</span>
                                                                    <span className={`text-xs font-mono font-black ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {session.notes && (
                                                        <div className="p-3 bg-[#0f172a]/40 rounded-xl border border-white/5 italic text-xs text-white/40">
                                                            "{session.notes}"
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {sessions.length === 0 && (
                                            <div className="p-16 text-center text-white/20 bg-[#1f2937]/20 rounded-3xl border border-dashed border-white/5 animate-in fade-in duration-300">
                                                <span className="material-symbols-outlined text-5xl mb-3 text-[#b45309]/30">history</span>
                                                <p className="text-sm font-bold text-white/50">Nenhuma sessão de caixa encontrada.</p>
                                                <p className="text-xs text-white/20 mt-1">Ajuste os filtros de busca para atualizar os resultados.</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {transactions.map(t => {
                                            const date = t.created_at ? new Date(t.created_at) : null;
                                            const isEntrada = t.type === 'entrada';
                                            const isPendente = t.status === 'pendente';
                                            const isExpanded = !!expandedTxIds[t.id];
                                            const items = (t.items_json as any[]) || [];

                                            return (
                                                <div key={t.id} className="p-4 rounded-3xl bg-[#1f2937]/50 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-3 text-left">
                                                    <div className="flex justify-between items-center gap-4 cursor-pointer" onClick={() => toggleExpandTx(t.id)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-8 rounded-full flex items-center justify-center 
                                                                ${isPendente ? 'bg-amber-500/10 text-amber-500' : isEntrada ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                                <span className="material-symbols-outlined text-[18px]">
                                                                    {isPendente ? 'warning' : isEntrada ? 'trending_up' : 'trending_down'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-black text-white block truncate max-w-[200px] md:max-w-[300px]">
                                                                    {t.description || t.category || 'Transação'}
                                                                </span>
                                                                <span className="text-[10px] text-white/40 block mt-0.5">
                                                                    {date ? date.toLocaleString('pt-BR') : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <span className={`text-sm font-mono font-black block 
                                                                    ${isPendente ? 'text-amber-500' : isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {isEntrada ? '+' : '-'}{formatCurrency(t.amount)}
                                                                </span>
                                                                {t.discount && t.discount > 0 ? (
                                                                    <span className="text-[9px] font-bold text-rose-400/70 block">
                                                                        Desc: -{formatCurrency(t.discount)}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <span className={`material-symbols-outlined text-white/30 text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                                                expand_more
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {isExpanded && (
                                                        <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2.5 text-xs text-white/70 animate-in slide-in-from-top-2 duration-200">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                                                <div>
                                                                    <span className="text-white/30 block font-bold uppercase tracking-wider text-[9px]">Cliente</span>
                                                                    <span className="text-white font-bold">{(t as any).client?.name || 'Cliente Externo'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-white/30 block font-bold uppercase tracking-wider text-[9px]">Profissional</span>
                                                                    <span className="text-white font-bold">{(t as any).professional?.name || 'Recepção / Geral'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-white/30 block font-bold uppercase tracking-wider text-[9px]">Método de Pagamento</span>
                                                                    <span className="text-white font-bold">{t.payment_method || 'Não especificado'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-white/30 block font-bold uppercase tracking-wider text-[9px]">Status</span>
                                                                    <span className={`font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full inline-block mt-0.5
                                                                        ${isPendente ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                                        {t.status === 'pendente' ? 'Pendente' : 'Pago'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Observation */}
                                                            {t.observation && (
                                                                <div className="p-2.5 bg-[#0f172a]/30 rounded-xl border border-white/5 text-[11px] italic text-white/50">
                                                                    "{t.observation}"
                                                                </div>
                                                            )}

                                                            {/* Items Details */}
                                                            {items.length > 0 && (
                                                                <div className="flex flex-col gap-1.5 mt-1 border-t border-white/5 pt-2">
                                                                    <span className="text-white/30 block font-bold uppercase tracking-wider text-[9px]">Itens da Venda</span>
                                                                    <div className="space-y-1.5">
                                                                        {items.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center p-2 bg-[#0f172a]/40 rounded-xl border border-white/5 text-[11px]">
                                                                                <div>
                                                                                    <span className="text-white font-bold block">{item.title}</span>
                                                                                    <span className="text-[9px] text-white/40">Profissional: {item.professional || 'Geral'}</span>
                                                                                </div>
                                                                                <span className="font-mono font-bold text-white">{formatCurrency(item.price)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {transactions.length === 0 && (
                                            <div className="p-16 text-center text-white/20 bg-[#1f2937]/20 rounded-3xl border border-dashed border-white/5 animate-in fade-in duration-300">
                                                <span className="material-symbols-outlined text-5xl mb-3 text-[#b45309]/30">receipt_long</span>
                                                <p className="text-sm font-bold text-white/50">Nenhuma transação encontrada no período.</p>
                                                <p className="text-xs text-white/20 mt-1">Ajuste os filtros de busca para atualizar os resultados.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Panel: Charts and KPIs */}
                        <div className="flex flex-col gap-8">
                            {/* Evolution Chart */}
                            <div className="p-6 rounded-3xl bg-[#1f2937]/50 border border-white/5 flex flex-col gap-4 text-left">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Evolução do Faturamento</h3>
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                        {periodType === 'diario' ? 'Por Hora' : 'Por Dia'}
                                    </span>
                                </div>
                                
                                <div className="w-full bg-[#0f172a]/40 rounded-2xl p-2 border border-white/5 flex justify-center">
                                    {chartData.length > 0 ? (
                                        (() => {
                                            const maxChartValue = Math.max(...chartData.map(d => d.value), 100);
                                            const chartHeight = 160;
                                            const chartWidth = 500;
                                            const padding = { top: 20, right: 20, bottom: 30, left: 50 };

                                            const points = chartData.map((d, i) => {
                                                const x = padding.left + (i * (chartWidth - padding.left - padding.right)) / Math.max(chartData.length - 1, 1);
                                                const y = chartHeight - padding.bottom - (d.value * (chartHeight - padding.top - padding.bottom)) / maxChartValue;
                                                return { x, y, label: d.label, value: d.value };
                                            });

                                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                            const areaPath = points.length > 0
                                                ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`
                                                : '';

                                            return (
                                                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                                                    <defs>
                                                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#b45309" stopOpacity="0.25" />
                                                            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>

                                                    {/* Grid lines */}
                                                    {[0, 0.5, 1].map((ratio, idx) => {
                                                        const y = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                                                        return (
                                                            <line
                                                                key={idx}
                                                                x1={padding.left}
                                                                y1={y}
                                                                x2={chartWidth - padding.right}
                                                                y2={y}
                                                                stroke="white"
                                                                strokeOpacity="0.05"
                                                                strokeDasharray="4 4"
                                                            />
                                                        );
                                                    })}

                                                    {/* Y Axis Labels */}
                                                    {[0, 0.5, 1].map((ratio, idx) => {
                                                        const val = maxChartValue * (1 - ratio);
                                                        const y = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                                                        return (
                                                            <text
                                                                key={idx}
                                                                x={padding.left - 8}
                                                                y={y + 3}
                                                                fill="white"
                                                                fillOpacity="0.3"
                                                                fontSize="8"
                                                                fontWeight="bold"
                                                                textAnchor="end"
                                                            >
                                                                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                                                            </text>
                                                        );
                                                    })}

                                                    {/* Chart Area */}
                                                    {areaPath && (
                                                        <path d={areaPath} fill="url(#chart-grad)" />
                                                    )}

                                                    {/* Chart Line */}
                                                    {linePath && (
                                                        <path
                                                            d={linePath}
                                                            fill="none"
                                                            stroke="#b45309"
                                                            strokeWidth="2.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    )}

                                                    {/* Data points & labels */}
                                                    {points.map((p, idx) => (
                                                        <g key={idx} className="group/node cursor-pointer">
                                                            <circle
                                                                cx={p.x}
                                                                cy={p.y}
                                                                r="10"
                                                                fill="transparent"
                                                            />
                                                            <circle
                                                                cx={p.x}
                                                                cy={p.y}
                                                                r="4"
                                                                fill="#b45309"
                                                                stroke="#1f2937"
                                                                strokeWidth="1.5"
                                                                className="transition-all group-hover/node:r-6 group-hover/node:fill-amber-400"
                                                            />
                                                            {/* Tooltip value on hover */}
                                                            <text
                                                                x={p.x}
                                                                y={p.y - 8}
                                                                fill="white"
                                                                fontSize="8"
                                                                fontWeight="black"
                                                                textAnchor="middle"
                                                                className="opacity-0 group-hover/node:opacity-100 transition-opacity bg-[#0f172a] px-1 py-0.5 rounded text-[7px]"
                                                            >
                                                                {formatCurrency(p.value).replace(',00', '')}
                                                            </text>

                                                            {/* X Axis Label */}
                                                            <text
                                                                x={p.x}
                                                                y={chartHeight - 8}
                                                                fill="white"
                                                                fillOpacity="0.4"
                                                                fontSize="7"
                                                                fontWeight="bold"
                                                                textAnchor="middle"
                                                            >
                                                                {p.label}
                                                            </text>
                                                        </g>
                                                    ))}
                                                </svg>
                                            );
                                        })()
                                    ) : (
                                        <div className="py-10 text-center text-white/20">Sem dados para exibir o gráfico</div>
                                    )}
                                </div>
                            </div>

                            {/* Performance KPIs */}
                            <div className="p-6 rounded-3xl bg-[#1f2937]/50 border border-white/5 flex flex-col gap-4 text-left">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">Indicadores de Desempenho</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3.5 rounded-2xl bg-[#0f172a]/40 border border-white/5 text-left">
                                        <span className="text-white/30 text-[9px] font-black uppercase tracking-wider block">Qtd. Vendas</span>
                                        <span className="text-lg font-mono font-black text-white">{metrics.salesCount}</span>
                                    </div>
                                    
                                    <div className="p-3.5 rounded-2xl bg-[#0f172a]/40 border border-white/5 text-left">
                                        <span className="text-white/30 text-[9px] font-black uppercase tracking-wider block">Ticket Médio</span>
                                        <span className="text-lg font-mono font-black text-white">{formatCurrency(metrics.ticketMedio)}</span>
                                    </div>
                                    
                                    <div className="p-3.5 rounded-2xl bg-[#0f172a]/40 border border-white/5 text-left col-span-2 relative overflow-hidden group">
                                        <div className="absolute top-[-20%] right-[-20%] w-24 h-24 bg-amber-500/5 rounded-full blur-[20px]" />
                                        <span className="text-amber-400 text-[9px] font-black uppercase tracking-wider block">Comissões Geradas</span>
                                        <span className="text-xl font-mono font-black text-white mt-0.5 block">{formatCurrency(metrics.totalComissoes)}</span>
                                        <span className="text-[8px] text-white/30 block mt-1">Soma de comissões profissionais estimadas</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Methods breakdown chart/list */}
                            <div className="flex flex-col gap-6">
                                <h3 className="text-lg font-black text-white tracking-tight text-left">Faturamento por Método</h3>

                                <div className="p-6 rounded-3xl bg-[#1f2937]/50 border border-white/5 flex flex-col gap-5 text-left">
                                    {methodSummary.map(method => (
                                        <div key={method.name} className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-white/80">{method.name}</span>
                                                <span className="text-white font-mono">{formatCurrency(method.value)}</span>
                                            </div>
                                            {/* Progress Bar Container */}
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                                                    style={{ width: `${method.percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] text-white/30 font-bold tracking-wider">{method.percentage.toFixed(1)}% do faturamento total</span>
                                        </div>
                                    ))}

                                    {transactions.filter(t => t.type === 'entrada' && t.status !== 'cancelado').length === 0 && (
                                        <div className="py-10 text-center text-white/20">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-[#b45309]/30">payments</span>
                                            <p className="text-xs font-bold text-white/50">Sem entradas financeiras neste período.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CashReports;
