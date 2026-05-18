import React, { useState, useEffect, useMemo } from 'react';
import { Professional, Commission, useCommissions } from '../hooks/useCommissions';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';

interface CommissionsDetailProps {
  onNavigate?: (screen: string) => void;
}

const CommissionsDetail: React.FC<CommissionsDetailProps> = ({ onNavigate }) => {
  const { role, professionalId, profile } = useCurrentUserRef();
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Dinheiro'>('Pix');
  const [notification, setNotification] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const { commissions, professionalsStats, loading, payCommissions } = useCommissions(filterMonth);

  const isPowerful = role === 'admin' || role === 'manager';

  // Filter professionals based on category
  const filteredProfessionals = useMemo(() => {
    let result = professionalsStats;
    if (!isPowerful && professionalId) {
      result = result.filter(p => p.id === professionalId);
    }
    if (selectedCategory === 'Cabeleireiros') {
      result = result.filter(p =>
        p.role.toLowerCase().includes('cabeleirei') ||
        p.role.toLowerCase().includes('barbeiro')
      );
    } else if (selectedCategory === 'Esteticistas') {
      result = result.filter(p => p.role.toLowerCase().includes('estetic'));
    }
    return result;
  }, [professionalsStats, isPowerful, professionalId, selectedCategory]);

  // Filter commissions based on role
  const filteredCommissions = useMemo(() => {
    let result = commissions;
    if (!isPowerful && professionalId) {
      result = result.filter(c => c.professionalId === professionalId);
    }
    return result;
  }, [commissions, isPowerful, professionalId]);

  // Group commissions by professional with pending amounts
  const professionalCommissions = useMemo(() => {
    const groups: {
      [key: string]: {
        professional: Professional | undefined;
        pendingAmount: number;
        bonusPercent: number;
        bonusValue: number;
        funcao: string;
        totalServices: number;
      }
    } = {};

    filteredCommissions.filter(c => c.status === 'pending').forEach(c => {
      if (!groups[c.professionalId]) {
        const pro = filteredProfessionals.find(p => p.id === c.professionalId);
        if (!pro) return; // Skip if not in filtered list
        groups[c.professionalId] = {
          professional: pro,
          pendingAmount: 0,
          bonusPercent: Math.round(pro?.commissionRate || 30),
          bonusValue: 200, // Could be calculated based on performance
          funcao: pro?.role || 'Profissional',
          totalServices: 0
        };
      }
      groups[c.professionalId].pendingAmount += c.commissionValue;
      groups[c.professionalId].totalServices += 1;
    });

    return Object.values(groups).sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [filteredCommissions, filteredProfessionals]);

  // Calculate totals from REAL database data
  const totalCommissions = useMemo(() => {
    return filteredCommissions.reduce((sum, c) => sum + c.commissionValue, 0);
  }, [filteredCommissions]);

  const totalReadyToPay = useMemo(() => {
    return filteredCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commissionValue, 0);
  }, [filteredCommissions]);

  const totalPaid = useMemo(() => {
    return filteredCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionValue, 0);
  }, [filteredCommissions]);

  const selectedTotal = useMemo(() => {
    if (selectedProfessionals.length === 0) return totalReadyToPay;
    return professionalCommissions
      .filter(pc => selectedProfessionals.includes(pc.professional?.id || ''))
      .reduce((sum, pc) => sum + pc.pendingAmount, 0);
  }, [selectedProfessionals, professionalCommissions, totalReadyToPay]);

  // Calculate performance metrics from real data
  const performanceMetrics = useMemo(() => {
    const goal = 10000;
    const currentMonthCommissions = filteredCommissions.filter(c => {
      const commDate = new Date(c.date);
      const now = new Date();
      return commDate.getMonth() === now.getMonth() && commDate.getFullYear() === now.getFullYear();
    });
    const achieved = currentMonthCommissions.reduce((sum, c) => sum + c.commissionValue, 0);
    const percentChange = goal > 0 ? Math.round((achieved / goal) * 100) - 100 : 0;
    const totalClientsServed = new Set(filteredCommissions.map(c => c.client)).size;

    return {
      goal,
      achieved: achieved || totalCommissions,
      percentChange: percentChange > 0 ? `+ ${percentChange}%` : `${percentChange}%`,
      totalClients: totalClientsServed
    };
  }, [filteredCommissions, totalCommissions]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const formatBRL = (value: number) => 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePayNow = async (profId: string, amount: number, profName: string) => {
    if (!isPowerful) {
      setNotification('Você não tem permissão para realizar pagamentos.');
      return;
    }

    setProcessingPayment(profId);
    try {
      const result = await payCommissions(profId, amount, paymentMethod);
      if (result) {
        setNotification(`Pagamento de ${formatBRL(amount)} para ${profName} realizado com sucesso via ${paymentMethod}!`);
      } else {
        setNotification('Erro ao processar pagamento. Tente novamente.');
      }
    } catch (error) {
      setNotification('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!isPowerful) {
      setNotification('Você não tem permissão para realizar pagamentos.');
      return;
    }

    const toPay = selectedProfessionals.length > 0
      ? professionalCommissions.filter(pc => selectedProfessionals.includes(pc.professional?.id || ''))
      : professionalCommissions;

    if (toPay.length === 0) {
      setNotification('Nenhum pagamento pendente para processar.');
      return;
    }

    setProcessingPayment('batch');
    let successCount = 0;
    let totalAmount = 0;

    for (const pc of toPay) {
      if (pc.professional && pc.pendingAmount > 0) {
        const result = await payCommissions(pc.professional.id, pc.pendingAmount, paymentMethod);
        if (result) {
          successCount++;
          totalAmount += pc.pendingAmount;
        }
      }
    }

    setProcessingPayment(null);

    if (successCount > 0) {
      setNotification(`${successCount} pagamento(s) no valor total de ${formatBRL(totalAmount)} processado(s) com sucesso!`);
      setSelectedProfessionals([]);
    } else {
      setNotification('Nenhum pagamento foi processado.');
    }
  };

  const toggleProfessionalSelection = (id: string) => {
    setSelectedProfessionals(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getPeriodString = () => {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    return `01 – ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} de ${monthNames[now.getMonth()]}`;
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center" style={{ background: 'transparent' }}>
      <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-auto" style={{ background: '#e8e2d4]/40', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl bg-slate-900 text-slate-800 font-semibold shadow-2xl flex items-center gap-3 max-w-md animate-in slide-in-">
          <div className="w-8 h-8 rounded-full bg-emerald-500/100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-slate-800 text-lg">check</span>
          </div>
          <span className="text-sm">{notification}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* HEADER BAR */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg shadow-md text-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined font-extrabold" style={{ fontSize: '20px' }}>receipt_long</span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#3d3d3d' }}>Pagamento de Comissões</h1>
        </div>
        <div className="flex items-center gap-5">
          <button className="relative">
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '22px' }}>notifications</span>
            {professionalCommissions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/100 text-slate-800 text-[9px] font-bold flex items-center justify-center">
                {professionalCommissions.length}
              </span>
            )}
          </button>
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '22px' }}>mail</span>
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '22px' }}>search</span>
          <div className="flex items-center gap-3 ml-2">
            <div
              className="w-11 h-11 rounded-full bg-cover bg-center bg-[#0f172a] border-2 border-[#0f172a] flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined
              }}
            >
              {!profile?.avatar_url && (
                <span className="text-xs font-black text-white/40">{profile?.full_name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#3d3d3d' }}>{profile?.name || 'Usuário'}</p>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'capitalize' }}>{role}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '18px' }}>expand_more</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-5 h-full">

          {/* ════════════════════════════════════════════════ */}
          {/* LEFT COLUMN (8 cols) */}
          {/* ════════════════════════════════════════════════ */}
          <div className="col-span-8 flex flex-col gap-5">

            {/* ROW 1: Two KPI Cards */}
            <div className="grid grid-cols-2 gap-5">

              {/* Card: Total de Comissões */}
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #fffef9 0%, #fdfbf5 100%)',
                  border: '1px solid #f0ebe0',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}
              >
                <div className="absolute bottom-0 right-0 w-32 h-20 opacity-30" style={{
                  background: 'radial-gradient(ellipse at bottom right, #d4a84b 0%, transparent 70%)'
                }}></div>
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ width: '3px', height: '16px', background: '#c9a227', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#888' }}>Total de Comissões</span>
                </div>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#2d2d2d', letterSpacing: '-0.5px' }}>
                  {formatBRL(totalCommissions)}
                </p>
                <p style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px' }}>
                  {formatBRL(totalPaid)} já pago
                </p>
              </div>

              {/* Card: Pronto para Pagamento */}
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #fffef9 0%, #fdfbf5 100%)',
                  border: '1px solid #f0ebe0',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '2px' }}>
                  Período: {getPeriodString()}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ width: '3px', height: '16px', background: '#22c55e', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>Pronto para Pagamento</span>
                </div>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#2d2d2d', letterSpacing: '-0.5px' }}>
                  {formatBRL(totalReadyToPay)}
                </p>
                <div
                  className="absolute right-4 bottom-4 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: totalReadyToPay > 0 ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' : '#e5e5e5' }}
                >
                  <span className="material-symbols-outlined text-slate-800" style={{ fontSize: '20px' }}>
                    {totalReadyToPay > 0 ? 'check' : 'done_all'}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: Selecionar Colaboradores */}
            <div
              className="rounded-2xl p-5 flex-1"
              style={{
                background: '#fff',
                border: '1px solid #f0ebe0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}
            >
              <div className="flex items-center gap-6 mb-4">
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#444' }}>Selecionar Colaboradores</span>
                <div className="flex items-center gap-1">
                  {['Todos', 'Cabeleireiros', 'Esteticistas'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSelectedCategory(tab)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: selectedCategory === tab ? '#fef3c7' : 'transparent',
                        color: selectedCategory === tab ? '#92400e' : '#888',
                        border: selectedCategory === tab ? '1px solid #fcd34d' : '1px solid transparent'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Header */}
              <div className="grid items-center mb-2 pr-2" style={{ gridTemplateColumns: '200px 100px 80px 80px 70px 90px', fontSize: '11px', fontWeight: 500, color: '#aaa' }}>
                <span></span>
                <span>Função</span>
                <span>Comissão</span>
                <span>Bônus</span>
                <span>Status</span>
                <span>Ação</span>
              </div>

              {/* Collaborators List from Database */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {professionalCommissions.length > 0 ? professionalCommissions.map((pc, index) => (
                  <div
                    key={pc.professional?.id}
                    className="grid items-center py-3 px-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      gridTemplateColumns: '200px 100px 80px 80px 70px 90px',
                      background: selectedProfessionals.includes(pc.professional?.id || '')
                        ? 'linear-gradient(90deg, #fef3c7 0%, #fef3c7 50%, transparent 100%)'
                        : index === 0
                          ? 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 50%, transparent 100%)'
                          : '#fafafa',
                      border: selectedProfessionals.includes(pc.professional?.id || '')
                        ? '1px solid #fcd34d'
                        : index === 0 ? '1px solid #fde68a' : '1px solid #f0f0f0'
                    }}
                    onClick={() => pc.professional && toggleProfessionalSelection(pc.professional.id)}
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-cover bg-center flex-shrink-0 bg-white/5 flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundImage: pc.professional?.avatar ? `url(${pc.professional.avatar})` : undefined,
                          border: `3px solid ${index === 0 ? '#d4a84b' : index === 1 ? '#f97316' : index === 2 ? '#eab308' : '#d4a84b'}`
                        }}
                      >
                        {!pc.professional?.avatar && (
                          <span className="text-xs font-black text-slate-400">{pc.professional?.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{pc.professional?.name}</p>
                        <p style={{ fontSize: '10px', fontWeight: 500, color: '#999' }}>{pc.funcao}</p>
                      </div>
                    </div>

                    {/* Função */}
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#666' }}>{pc.funcao}</span>

                    {/* Comissão % */}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#444' }}>{pc.bonusPercent}%</span>

                    {/* Valor pendente */}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#444' }}>
                      {formatBRL(pc.pendingAmount)}
                    </span>

                    {/* Status */}
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#f59e0b' }}>
                      Pendente
                    </span>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pc.professional) {
                          handlePayNow(pc.professional.id, pc.pendingAmount, pc.professional.name);
                        }
                      }}
                      disabled={processingPayment === pc.professional?.id || !isPowerful}
                      className="flex items-center justify-center gap-1 disabled:opacity-50"
                      style={{
                        padding: '7px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#fff',
                        background: '#0f172a',
                        boxShadow: '0 2px 8px rgba(212, 168, 75, 0.3)'
                      }}
                    >
                      {processingPayment === pc.professional?.id ? (
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>progress_activity</span>
                      ) : (
                        <>Pagar<span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span></>
                      )}
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                    <p className="text-sm">Nenhuma comissão pendente!</p>
                    <p className="text-xs mt-1">Todos os pagamentos estão em dia.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 3: Análise de Desempenho */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: '#fff',
                border: '1px solid #f0ebe0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#444' }}>Análise de Desempenho</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === 0 ? '#c9a227' : '#ddd' }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="w-1 h-4 rounded-full bg-pink-400"></div>
                      <div className="w-1 h-6 rounded-full bg-amber-400"></div>
                      <div className="w-1 h-3 rounded-full bg-purple-400"></div>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: '#888' }}>Meta: {formatBRL(performanceMetrics.goal)}</p>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginTop: '4px' }}>
                        Alcançado: <span style={{ fontWeight: 700, color: '#333' }}>{formatBRL(performanceMetrics.achieved)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-center px-6 py-2 rounded-lg" style={{ background: '#f0fdf4' }}>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{performanceMetrics.percentChange}</p>
                    <p style={{ fontSize: '10px', fontWeight: 500, color: '#666' }}>Este mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: '#faf5ff' }}>
                  <div style={{ width: '3px', height: '24px', background: '#a855f7', borderRadius: '2px' }}></div>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#7c3aed' }}>+{performanceMetrics.totalClients}</p>
                    <p style={{ fontSize: '10px', fontWeight: 500, color: '#666' }}>Clientes Atendidos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN (4 cols) */}
          {/* ════════════════════════════════════════════════ */}
          <div className="col-span-4 flex flex-col gap-5">

            {/* Card: Resumo do Pagamento */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: '#fff',
                border: '1px solid #f0ebe0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#444' }}>Resumo do Pagamento</span>
                <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f5f5f5' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#999' }}>more_horiz</span>
                </button>
              </div>

              {/* Total a Pagar */}
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#666' }}>Total a Pagar:</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#2d2d2d' }}>{formatBRL(selectedTotal)}</span>
              </div>

              {/* Selected count */}
              {selectedProfessionals.length > 0 && (
                <div className="mb-4 p-2 rounded-lg" style={{ background: '#fef3c7' }}>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#92400e' }}>
                    {selectedProfessionals.length} profissional(is) selecionado(s)
                  </p>
                </div>
              )}

              {/* Método de Pagamento */}
              <div className="mb-5">
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px' }}>Método de Pagamento:</p>
                <div className="flex items-center gap-2">
                  {(['Pix', 'Dinheiro'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className="flex items-center gap-1.5"
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: paymentMethod === method ? '#dcfce7' : '#f5f5f5',
                        color: paymentMethod === method ? '#166534' : '#666',
                        border: paymentMethod === method ? '1px solid #bbf7d0' : '1px solid #e5e5e5'
                      }}
                    >
                      {method === 'Pix' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>}
                      {method === 'Dinheiro' && <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>payments</span>}
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmar Pagamento */}
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment === 'batch' || totalReadyToPay === 0 || !isPowerful}
                className="w-full flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                  background: '#0f172a',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.35)'
                }}
              >
                {processingPayment === 'batch' ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                    Processando...
                  </>
                ) : (
                  <>
                    Confirmar Pagamento
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                  </>
                )}
              </button>

              {!isPowerful && (
                <p style={{ fontSize: '10px', color: '#f59e0b', marginTop: '8px', textAlign: 'center' }}>
                  Apenas gerentes podem processar pagamentos
                </p>
              )}
            </div>

            {/* Card: Análise de Desempenho (Mini) */}
            <div
              className="rounded-2xl p-5 flex-1"
              style={{
                background: '#fff',
                border: '1px solid #f0ebe0',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#444' }}>Análise de Desempenho</span>
                <button className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f5f5f5' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#999' }}>more_horiz</span>
                </button>
              </div>

              <p style={{ fontSize: '11px', fontWeight: 500, color: '#888', marginBottom: '8px' }}>Meta: {formatBRL(performanceMetrics.goal)}</p>

              {/* Chart - based on real data */}
              <div className="flex items-end gap-1 mb-4" style={{ height: '80px' }}>
                {professionalsStats.slice(0, 7).map((pro, i) => {
                  const height = performanceMetrics.goal > 0
                    ? Math.min(100, (pro.totalEarned / performanceMetrics.goal) * 100)
                    : 20;
                  const colors = ['#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#8b5cf6', '#6366f1'];
                  return (
                    <div
                      key={pro.id}
                      className="flex-1 rounded-t"
                      style={{ height: `${height}%`, background: colors[i % colors.length], minHeight: '10px' }}
                      title={`${pro.name}: ${formatBRL(pro.totalEarned)}`}
                    />
                  );
                })}
                {professionalsStats.length === 0 && (
                  <div className="flex-1 text-center text-xs text-slate-400">
                    Sem dados
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#888' }}>Total Comissões:</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#333' }}>{formatBRL(totalCommissions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#888' }}>Clientes:</span>
                  <div className="text-right">
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#8b5cf6' }}>+{performanceMetrics.totalClients}</p>
                    <p style={{ fontSize: '10px', fontWeight: 500, color: '#666' }}>Atendidos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionsDetail;
