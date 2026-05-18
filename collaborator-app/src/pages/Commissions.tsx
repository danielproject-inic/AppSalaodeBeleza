import React, { useState, useMemo } from 'react';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { useCommissions } from '../hooks/useCommissions';
import CommissionsTransactions from '../components/CommissionsTransactions';

const Commissions: React.FC = () => {
  const { professionalId, loading: userLoading } = useCurrentUserRef();
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  const { 
    commissions, 
    professionalsStats, 
    loading: commissionsLoading, 
    simulationData 
  } = useCommissions(filterMonth, professionalId || undefined);

  const stats = useMemo(() => {
    const pro = professionalsStats.find(p => p.id === professionalId);
    const sim = simulationData.find(s => s.professionalId === professionalId);
    
    return {
      totalEarned: pro?.totalEarned || 0,
      pendingAmount: pro?.pendingAmount || 0,
      netValue: sim?.netValue || 0,
      grossValue: sim?.grossValue || 0,
      goal: pro?.goal || 5000,
      achieved: Math.round(((pro?.totalEarned || 0) / (pro?.goal || 5000)) * 100)
    };
  }, [professionalsStats, simulationData, professionalId]);

  const serviceDistribution = useMemo(() => {
    const map = new Map<string, { count: number, value: number }>();
    commissions.forEach(c => {
      const current = map.get(c.service) || { count: 0, value: 0 };
      map.set(c.service, { 
        count: current.count + 1, 
        value: current.value + c.commissionValue 
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [commissions]);

  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (userLoading || commissionsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#0f172a] font-display tracking-tight">Meus Ganhos</h1>
          <p className="text-slate-500 font-medium">Acompanhe seu desempenho e comissões</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <span className="material-symbols-outlined text-slate-400 ml-2">calendar_month</span>
           <input 
             type="month" 
             value={filterMonth}
             onChange={e => setFilterMonth(e.target.value)}
             className="bg-transparent border-none text-slate-800 font-bold outline-none text-sm p-1"
           />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Stats & Charts */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          
          {/* Main Card: Net Earnings */}
          <div className="bg-[#0f172a] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-slate-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
             <div className="relative z-10">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Saldo Disponível</span>
                <div className="text-4xl font-black mt-2 mb-8">{formatBRL(stats.pendingAmount)}</div>
                
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                   <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Recebido este mês</p>
                      <p className="text-lg font-black text-emerald-400">{formatBRL(stats.totalEarned - stats.pendingAmount)}</p>
                   </div>
                   <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <span className="material-symbols-outlined text-emerald-400">payments</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Progress to Goal */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Meta Mensal</h3>
                <span className="text-xs font-black text-slate-400">{stats.achieved}%</span>
             </div>
             <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-4 border border-slate-50">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, stats.achieved)}%` }}
                ></div>
             </div>
             <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                {formatBRL(stats.totalEarned)} de {formatBRL(stats.goal)}
             </p>
          </div>

          {/* Service Distribution List */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex-1">
             <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">Produtividade por Serviço</h3>
             <div className="space-y-4">
                {serviceDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{item.count} atendimentos</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">{formatBRL(item.value)}</p>
                      <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-slate-800 opacity-20"
                          style={{ width: `${(item.value / stats.totalEarned) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {serviceDistribution.length === 0 && (
                  <p className="text-center py-10 text-slate-300 text-sm font-bold">Inicie um serviço para ver estatísticas</p>
                )}
             </div>
          </div>
        </div>

        {/* Right: Transactions Table */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full min-h-0">
           <CommissionsTransactions commissions={commissions} />
        </div>
      </div>
    </div>
  );
};

export default Commissions;
