import React, { useState, useMemo } from 'react';
import { useCommissions, Commission } from '../hooks/useCommissions';
import { useTransactions } from '../hooks/useTransactions';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';

interface CommissionsTransactionsProps {
    commissions?: Commission[];
}

const CommissionsTransactions: React.FC<CommissionsTransactionsProps> = ({ commissions: externalCommissions }) => {
    const { role, professionalId, loading: userLoading } = useCurrentUserRef();
    const isAdmin = role === 'admin' || role === 'manager';

    const { commissions: internalCommissions, loading: commissionsLoading } = useCommissions(undefined, isAdmin ? undefined : (professionalId || ''));
    const commissions = externalCommissions || internalCommissions;
    const { transactions } = useTransactions();
    const loading = commissionsLoading || userLoading;

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter State
    const [selectedPeriod, setSelectedPeriod] = useState('Todos');
    const [selectedProfessional, setSelectedProfessional] = useState('Todos');
    const [selectedStatus, setSelectedStatus] = useState('Todos');
    const [selectedService, setSelectedService] = useState('Todos');
    const [selectedChannel, setSelectedChannel] = useState('Todos');

    // Enhance commissions with transaction data
    const enhancedCommissions = useMemo(() => {
        return commissions.map(c => {
            const transaction = transactions.find(t => t.id === c.transactionId);
            const time = transaction?.created_at
                ? new Date(transaction.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '--:--';
            const channel = transaction?.payment_method
                ? transaction.payment_method === 'pix' ? 'App Móvel'
                    : transaction.payment_method === 'cartao' ? 'Recepção'
                        : transaction.payment_method === 'dinheiro' ? 'Recepção'
                            : 'Site Web'
                : 'Site Web';
            const displayStatus = c.status === 'paid' ? 'Paga' : 'Prevista';
            const discount = 0;
            const rule = `${c.commissionPercent}%`;

            return {
                ...c,
                time,
                discount,
                channel,
                rule,
                displayStatus,
                // Helper for period filter (e.g., "Oct 2024")
                periodLabel: c.date ? new Date(c.date.includes('T') ? c.date : c.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'N/A'
            };
        });
    }, [commissions, transactions]);

    // Extract Unique Filter Values
    const filterOptions = useMemo(() => {
        const periods = Array.from(new Set(enhancedCommissions.map(c => c.periodLabel))).filter(Boolean).sort();
        const professionals = Array.from(new Set(enhancedCommissions.map(c => c.professionalName))).filter(Boolean).sort();
        const services = Array.from(new Set(enhancedCommissions.map(c => c.service))).filter(Boolean).sort();
        const statuses = Array.from(new Set(enhancedCommissions.map(c => c.displayStatus))).filter(Boolean).sort();
        const channels = Array.from(new Set(enhancedCommissions.map(c => c.channel))).filter(Boolean).sort();

        return { periods, professionals, services, statuses, channels };
    }, [enhancedCommissions]);

    // Filter Logic
    const filteredCommissions = useMemo(() => {
        return enhancedCommissions.filter(item => {
            const matchPeriod = selectedPeriod === 'Todos' || item.periodLabel === selectedPeriod;
            const matchPro = selectedProfessional === 'Todos' || item.professionalName === selectedProfessional;
            const matchService = selectedService === 'Todos' || item.service === selectedService;
            const matchStatus = selectedStatus === 'Todos' || item.displayStatus === selectedStatus;
            const matchChannel = selectedChannel === 'Todos' || item.channel === selectedChannel;

            return matchPeriod && matchPro && matchService && matchStatus && matchChannel;
        });
    }, [enhancedCommissions, selectedPeriod, selectedProfessional, selectedService, selectedStatus, selectedChannel]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage);
    const paginatedCommissions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCommissions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCommissions, currentPage]);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [selectedPeriod, selectedProfessional, selectedService, selectedStatus, selectedChannel]);

    // Set default professional for non-admins
    React.useEffect(() => {
        if (!isAdmin && enhancedCommissions.length > 0 && selectedProfessional === 'Todos') {
            setSelectedProfessional(enhancedCommissions[0].professionalName);
        }
    }, [isAdmin, enhancedCommissions, selectedProfessional]);

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Paga': return 'border-cyan-200 text-cyan-600 bg-cyan-50 font-bold';
            case 'Prevista': return 'border-amber-200 text-amber-600 bg-amber-50 font-bold';
            case 'Aprovada': return 'border-emerald-200 text-emerald-600 bg-emerald-50 font-bold';
            case 'Contestada': return 'border-rose-200 text-rose-600 bg-rose-50 font-bold';
            default: return 'border-slate-200 text-slate-500 bg-slate-50 font-bold';
        }
    };

    // Helper component for Select dropdowns
    const FilterSelect = ({ label, value, options, onChange, colorClass, textClass }: any) => (
        <div className={`flex items-center gap-2 ${colorClass} border border-opacity-50 rounded-full px-4 py-2 transition-colors group whitespace-nowrap`}>
            <span className={`${textClass} text-xs font-bold uppercase tracking-wider`}>{label}:</span>
            <div className="relative flex items-center">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`bg-transparent border-none outline-none text-sm font-bold ${textClass} cursor-pointer appearance-none pr-6`}
                    style={{ backgroundImage: 'none' }}
                >
                    <option value="Todos">Todos</option>
                    {options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <span className={`material-symbols-outlined text-sm ${textClass} absolute right-0 pointer-events-none`}>expand_more</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full animate-fadeIn">
            {/* --- Filter Bar --- */}
            <div className="bg-white border border-cyan-100/50 shadow-none rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1 pb-1">
                    <FilterSelect
                        label="Período"
                        value={selectedPeriod}
                        options={filterOptions.periods}
                        onChange={setSelectedPeriod}
                        colorClass="bg-cyan-50 border-cyan-100 hover:bg-cyan-100/50"
                        textClass="text-cyan-600"
                    />
                    {isAdmin && (
                        <FilterSelect
                            label="Profissional"
                            value={selectedProfessional}
                            options={filterOptions.professionals}
                            onChange={setSelectedProfessional}
                            colorClass="bg-purple-50 border-purple-100 hover:bg-purple-50/80"
                            textClass="text-purple-600"
                        />
                    )}
                    <FilterSelect
                        label="Status"
                        value={selectedStatus}
                        options={filterOptions.statuses}
                        onChange={setSelectedStatus}
                        colorClass="bg-emerald-50 border-emerald-100 hover:bg-emerald-50/80"
                        textClass="text-emerald-600"
                    />
                    <FilterSelect
                        label="Serviço"
                        value={selectedService}
                        options={filterOptions.services}
                        onChange={setSelectedService}
                        colorClass="bg-amber-50 border-amber-100 hover:bg-amber-50/80"
                        textClass="text-amber-600"
                    />
                    <FilterSelect
                        label="Canal"
                        value={selectedChannel}
                        options={filterOptions.channels}
                        onChange={setSelectedChannel}
                        colorClass="bg-indigo-50 border-indigo-100 hover:bg-indigo-50/80"
                        textClass="text-indigo-600"
                    />
                </div>


            </div>

            {/* --- Table --- */}
            <div className="flex-1 overflow-hidden bg-white border border-cyan-100/50 rounded-xl shadow-none flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 font-grotesk">
                            <tr className="border-b border-cyan-100/50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                                <th className="p-4 font-bold">Data/Hora</th>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Profissional</th>
                                <th className="p-4 font-bold">Serviço</th>
                                <th className="p-4 font-bold">Valor (R$)</th>
                                <th className="p-4 font-bold">Desconto</th>
                                <th className="p-4 font-bold">Canal</th>
                                <th className="p-4 font-bold">Regra</th>
                                <th className="p-4 font-bold">Comissão (R$)</th>
                                <th className="p-4 font-bold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedCommissions.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                                        {loading ? 'Carregando...' : 'Nenhuma comissão encontrada com os filtros atuais'}
                                    </td>
                                </tr>
                            ) : paginatedCommissions.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-100 last:border-0 font-body">
                                    <td className="p-4 text-slate-500 text-xs font-bold">
                                        <div className="flex flex-col">
                                            <span className="text-slate-800">{new Date(item.date.includes('T') ? item.date : item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            <span className="text-slate-400 text-[10px] uppercase">{item.time}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-800/80 text-sm font-bold">{item.client}</td>
                                    <td className="p-4 text-slate-800 text-sm font-bold">{item.professionalName}</td>
                                    <td className="p-4 text-slate-700 text-sm font-medium">{item.service}</td>
                                    <td className="p-4 text-slate-800 text-sm font-bold">{formatBRL(item.serviceValue)}</td>
                                    <td className="p-4 text-slate-400 text-sm font-medium">{formatBRL(item.discount)}</td>
                                    <td className="p-4 text-slate-700 text-sm font-medium">{item.channel}</td>
                                    <td className="p-4 text-slate-700 text-sm font-medium italic">{item.rule}</td>
                                    <td className="p-4 font-extrabold text-sm font-black text-cyan-700">{formatBRL(item.commissionValue)}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(item.displayStatus)} uppercase tracking-wider`}>
                                            {item.displayStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-3 border-t border-cyan-100/50 flex justify-center items-center gap-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${currentPage === 1 ? 'border-cyan-100/50 text-slate-300 cursor-not-allowed' : 'border-cyan-100/50 text-slate-400 hover:text-slate-800 hover:border-slate-400'}`}
                        >
                            <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${currentPage === 1 ? 'border-cyan-100/50 text-slate-300 cursor-not-allowed' : 'border-cyan-100/50 text-slate-400 hover:text-slate-800 hover:border-slate-400'}`}
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>

                        <span className="text-slate-500 text-sm font-bold tracking-tight">Página {currentPage} de {totalPages}</span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${currentPage === totalPages ? 'border-cyan-100/50 text-slate-300 cursor-not-allowed' : 'border-cyan-100/50 text-slate-400 hover:text-slate-800 hover:border-slate-400'}`}
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${currentPage === totalPages ? 'border-cyan-100/50 text-slate-300 cursor-not-allowed' : 'border-cyan-100/50 text-slate-400 hover:text-slate-800 hover:border-slate-400'}`}
                        >
                            <span className="material-symbols-outlined text-sm">keyboard_double_arrow_right</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommissionsTransactions;
