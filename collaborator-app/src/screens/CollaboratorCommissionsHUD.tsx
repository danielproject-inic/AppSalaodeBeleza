import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { Award, DollarSign, TrendingUp, Calendar, Zap, CheckCircle2, ChevronRight, PieChart } from 'lucide-react';
import { Sparkles, Trophy, ShieldCheck, Wallet } from 'lucide-react';

export const CollaboratorCommissionsHUD: React.FC = () => {
  const { profile, professionalId } = useCurrentUserRef();
  const [totalEarned, setTotalEarned] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionsData();
  }, [professionalId]);

  const fetchCommissionsData = async () => {
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch completed appointments for this professional
      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          servico_terminado_at,
          status,
          service:services ( title, price, commission_percentage ),
          client:clients ( name )
        `)
        .eq('status', 'concluido')
        .order('start_time', { ascending: false });

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error } = await query;

      if (!error && data) {
        let totalAcc = 0;
        let todayAcc = 0;
        let count = 0;

        const transactions = data.map((item: any) => {
          const price = item.service?.price || 0;
          const pct = item.service?.commission_percentage || 50; // default 50%
          const commissionAmount = (price * pct) / 100;

          totalAcc += commissionAmount;
          count += 1;

          const itemDate = new Date(item.start_time);
          if (itemDate >= todayStart) {
            todayAcc += commissionAmount;
          }

          return {
            id: item.id,
            serviceTitle: item.service?.title || 'Atendimento',
            clientName: item.client?.name || 'Cliente',
            date: itemDate,
            totalPrice: price,
            commissionPct: pct,
            commissionAmount: commissionAmount
          };
        });

        setTotalEarned(totalAcc);
        setTodayEarned(todayAcc);
        setCompletedCount(count);
        setRecentTransactions(transactions);
      }
    } catch (e) {
      console.error('Erro ao buscar dados de comissão:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-slate-100 pb-24">
      {/* Header */}
      <header className="px-5 pt-9 pb-4 bg-[#0b1026]/80 backdrop-blur-xl border-b border-[#ffd700]/20 sticky top-0 z-40 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#ffd700] font-semibold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Extrato Holográfico</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Minhas Comissões</h1>
        </div>

        <div className="p-2.5 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700]">
          <Wallet className="w-5 h-5" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 space-y-4">
        {/* Cockpit Gauges Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#121a38]/90 to-[#220d38]/90 border border-[#ffd700]/30 shadow-[0_0_30px_rgba(255,215,0,0.15)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#ffd700]/10 blur-3xl pointer-events-none" />

          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total de Comissões Acumuladas</div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-black text-white tracking-tight">
              R$ {totalEarned.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-[#10b981] flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              +100% Repasse
            </span>
          </div>

          {/* Sub Gauge Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-[#050814]/70 border border-[#ffd700]/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Ganho de Hoje</span>
              <span className="text-lg font-black text-[#ffd700]">R$ {todayEarned.toFixed(2)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#050814]/70 border border-[#00f0ff]/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Atendimentos Concluídos</span>
              <span className="text-lg font-black text-[#00f0ff]">{completedCount} Serviços</span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#ffd700] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Histórico de Repasses ({recentTransactions.length})</span>
          </h3>

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#ffd700]/20 border-t-[#ffd700] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Calculando Extrato Espacial...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0b1026]/60 border border-slate-800 text-slate-400 space-y-2">
              <Wallet className="w-8 h-8 text-[#ffd700]/40 mx-auto" />
              <p className="text-sm font-bold">Nenhum atendimento finalizado registrado ainda.</p>
            </div>
          ) : (
            recentTransactions.map(tx => (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-[#0b1026]/80 border border-[#ffd700]/20 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              >
                <div>
                  <h4 className="text-sm font-black text-white">{tx.serviceTitle}</h4>
                  <p className="text-xs text-slate-400">{tx.clientName} • {tx.date.toLocaleDateString()}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400">Valor Serviço: R$ {tx.totalPrice.toFixed(2)}</span>
                    <span className="text-[10px] font-extrabold text-[#00f0ff]">({tx.commissionPct}% comissão)</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-[#10b981] block">+R$ {tx.commissionAmount.toFixed(2)}</span>
                  <span className="text-[9px] font-extrabold uppercase text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/30 inline-block mt-1">
                    Liberado
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
