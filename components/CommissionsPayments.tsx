import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCommissions } from '../hooks/useCommissions';
import { useTransactions } from '../hooks/useTransactions';
import { useAdvanceRequests } from '../hooks/useAdvanceRequests';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { useSalon } from '../contexts/SalonContext';

type PeriodFilter = 'daily' | 'biweekly' | 'monthly';

const CommissionsPayments: React.FC = () => {
    const { salonName } = useSalon();
    const { role, professionalId, loading: userLoading } = useCurrentUserRef();
    const isAdmin = role === 'admin' || role === 'manager';

    const { commissions, professionalsStats, payCommissions, loading: commissionsLoading } = useCommissions(undefined, isAdmin ? undefined : (professionalId || ''));
    const { transactions } = useTransactions();
    const loading = commissionsLoading || userLoading;

    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('biweekly');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [generatingBatchId, setGeneratingBatchId] = useState<string | null>(null);
    const [batchAdjustments, setBatchAdjustments] = useState<Record<string, number>>({});
    const [batchObservations, setBatchObservations] = useState<Record<string, string>>({});
    const [batchAutoVales, setBatchAutoVales] = useState<Record<string, number>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [batchStatusOverride, setBatchStatusOverride] = useState<Record<string, string>>({});
    const [commissionStatusMap, setCommissionStatusMap] = useState<Record<string, string>>({}); // Maps commissionId -> status (Aprovado, etc)
    const [loadingPersistence, setLoadingPersistence] = useState(true);
    const [paymentMethodModalBatchId, setPaymentMethodModalBatchId] = useState<string | null>(null);
    const [confirmingBatchId, setConfirmingBatchId] = useState<string | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'PIX' | 'Dinheiro' | null>(null);
    const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
    const [successTitle, setSuccessTitle] = useState('');
    const [successDescription, setSuccessDescription] = useState('');
    const [detailsProFilter, setDetailsProFilter] = useState('');
    const [checkedBatches, setCheckedBatches] = useState<Record<string, boolean>>({});

    // Fetch batch statuses from DB on mount
    useEffect(() => {
        // Force filter for non-admins
        if (!isAdmin && professionalId && !selectedProfessionalId) {
            setSelectedProfessionalId(professionalId);
        }

        const fetchBatchStatuses = async () => {
            try {
                const { data, error } = await supabase
                    .from('commission_batches')
                    .select('*');

                if (error) throw error;

                if (data) {
                    const overrides: Record<string, string> = {};
                    const commissionMap: Record<string, string> = {};

                    (data as any[]).forEach(batch => {
                        overrides[batch.id] = batch.status;

                        // Load saved adjustments, vales, observations if any
                        if (batch.data && typeof batch.data === 'object') {
                            if (batch.data.adjustments) setBatchAdjustments(prev => ({ ...prev, ...batch.data.adjustments }));
                            if (batch.data.observations) setBatchObservations(prev => ({ ...prev, ...batch.data.observations }));
                            if (batch.data.autoVales) setBatchAutoVales(prev => ({ ...prev, ...batch.data.autoVales }));


                            // If we have commission IDs stored in the Json data, map them
                            if (batch.data && typeof batch.data === 'object' && (batch.data as any).commissionIds) {
                                const ids = (batch.data as any).commissionIds as string[];
                                ids.forEach(id => {
                                    // Only override if the new status is more "advanced" or if we don't have one
                                    // Status priority: Pagamento Confirmado > Pendente de Confirmação > Aprovado > Aguardando Aprovação
                                    const currentStatus = commissionMap[id];
                                    const newStatus = batch.status;

                                    const priority: Record<string, number> = {
                                        'Pagamento Confirmado': 4,
                                        'Pendente de Confirmação': 3,
                                        'Aprovado': 2,
                                        'Aguardando Aprovação': 1,
                                        'Em preparação': 0
                                    };

                                    if (!currentStatus || (priority[newStatus] || 0) > (priority[currentStatus] || 0)) {
                                        commissionMap[id] = newStatus;
                                    }
                                });
                            }
                        }
                    });

                    setBatchStatusOverride(overrides);
                    setCommissionStatusMap(commissionMap);
                }
            } catch (err) {
                console.error("Error fetching batch statuses:", err);
            } finally {
                setLoadingPersistence(false);
            }
        };
        fetchBatchStatuses();
    }, [isAdmin, professionalId]);

    const updateBatchStatus = async (batchId: string, status: string, additionalData?: any) => {
        const batch = batches.find(b => b.id === batchId);
        if (!batch) {
            // If batch not found in current view, still try to update local status if we have ID
            setBatchStatusOverride(prev => ({ ...prev, [batchId]: status }));
            return;
        }

        try {
            const commissionIds = batch.commissions.map(c => c.id);

            const { error } = await supabase
                .from('commission_batches')
                .upsert({
                    id: batchId,
                    status,
                    period: batch?.period || '',
                    data: {
                        commissionIds,
                        total: batch.total,
                        professionalId: batch.commissions[0]?.professionalId,
                        ...(additionalData || {})
                    },
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setBatchStatusOverride(prev => ({ ...prev, [batchId]: status }));

            // Update the commission individual map
            setCommissionStatusMap(prev => {
                const next = { ...prev };
                commissionIds.forEach(id => {
                    next[id] = status;
                });
                return next;
            });
        } catch (err) {
            console.error("Error updating batch status:", err);
            setBatchStatusOverride(prev => ({ ...prev, [batchId]: status }));
        }
    };

    // Reset expanded rows when period filter changes
    useEffect(() => {
        setExpandedRows({});
    }, [periodFilter]);

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    // Estilos para animações e ramificações
    const styles = `
 @keyframes slideInRight {
 from { opacity: 0; transform: translateX(-10px); }
 to { opacity: 1; transform: translateX(0); }
 }
 .animate-slideInRight {
 animation: slideInRight 0.3s ease-out forwards;
 }
 .branch-line-v {
 position: absolute;
 left: 20px;
 top: 0;
 bottom: 0;
 width: 1px;
 background-color: #e2e8f0;
 }
 .branch-line-h {
 position: absolute;
 left: 20px;
 top: 50%;
 width: 12px;
 height: 1px;
 background-color: #e2e8f0;
 }
 .branch-line-v-inner {
 position: absolute;
 left: 28px;
 top: 0;
 bottom: 0;
 width: 1px;
 background-color: #f1f5f9;
 }
 .branch-line-h-inner {
 position: absolute;
 left: 28px;
 top: 50%;
 width: 8px;
 height: 1px;
 background-color: #f1f5f9;
 }
 `;

    // Calculate KPIs from commissions
    const kpis = useMemo(() => {
        const total = commissions.reduce((sum, c) => sum + c.commissionValue, 0);
        const paid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionValue, 0);
        const pending = total - paid;

        // "Aprovado" in this context could be interpreted as Pending but validated, 
        // or effectively the same as Pending for now since we don't have an explicit 'approved' status.
        // Let's treat it as Total - Paid (so effectively Pending) for the visual.
        const approved = pending;

        return [
            { label: 'PREVISTO', value: total, color: 'text-cyan-600', border: 'border-cyan-100', bg: 'bg-cyan-50/50', icon: 'trending_up' },
            { label: 'APROVADO', value: approved, color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50', icon: 'check_circle' },
            { label: 'PENDENTE', value: pending, color: 'text-amber-600', border: 'border-amber-100', bg: 'bg-amber-50', icon: 'schedule' },
            { label: 'CONFIRMADO', value: paid, color: 'text-purple-600', border: 'border-purple-100', bg: 'bg-purple-50', icon: 'payments' },
        ];
    }, [commissions]);

    // Group commissions by date ranges to create payment batches, filtered by professional
    const batches = useMemo(() => {
        let filteredCommissions = commissions;

        if (selectedProfessionalId) {
            filteredCommissions = commissions.filter(c => c.professionalId === selectedProfessionalId);
        }

        if (filteredCommissions.length === 0) return [];

        // Sort commissions by date
        const sorted = [...filteredCommissions].sort((a, b) => a.date.localeCompare(b.date));

        const batchMap = new Map<string, typeof commissions>();

        sorted.forEach(c => {
            const [y, m, d] = c.date.split('-').map(Number);
            let key = '';

            if (periodFilter === 'daily') {
                key = c.date; // YYYY-MM-DD
            } else if (periodFilter === 'monthly') {
                key = `${y}-${String(m).padStart(2, '0')}`;
            } else {
                // Biweekly
                key = `${y}-${String(m).padStart(2, '0')}-${d <= 15 ? '1' : '2'}`;
            }

            // CRITICAL FIX: Batches MUST be grouped by professional, otherwise one payment would cover the whole salon!
            // Use underscore or pipe to separate UUID from date string to avoid splitting on UUID dashes
            const batchKey = `${c.professionalId}_${key}`;

            if (!batchMap.has(batchKey)) {
                batchMap.set(batchKey, []);
            }
            batchMap.get(batchKey)!.push(c);
        });

        // Convert to batch objects with hierarchical structure
        return Array.from(batchMap.entries()).map(([batchKey, comms]) => {
            const total = comms.reduce((sum, c) => sum + c.commissionValue, 0);
            const paidCount = comms.filter(c => c.status === 'paid').length;
            const allPaid = comms.length > 0 && paidCount === comms.length;
            const noPaid = paidCount === 0;

            const dateStr = comms[0].date;
            const [y, m, d_num] = dateStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d_num);

            let periodLabel = '';
            if (periodFilter === 'daily') {
                periodLabel = dateObj.toLocaleDateString('pt-BR');
            } else if (periodFilter === 'monthly') {
                periodLabel = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            } else {
                periodLabel = d_num <= 15
                    ? `01/${String(m).padStart(2, '0')} - 15/${String(m).padStart(2, '0')}`
                    : `16/${String(m).padStart(2, '0')} - ${new Date(y, m, 0).getDate()}/${String(m).padStart(2, '0')}`;
            }

            // Extract the dateKey part from batchKey for the ID
            const [proId, dateKey] = batchKey.split('_');

            // Build initials from the first 3 names of the collaborator
            const nameParts = comms[0].professionalName.split(' ').filter((p: string) => p.length > 0);
            const initials = nameParts.slice(0, 3).map((n: string) => n[0].toUpperCase()).join('');

            // Format date as DDMMYYYY
            const batchDateFormatted = `${String(d_num).padStart(2, '0')}${String(m).padStart(2, '0')}${y}`;

            const batchId = `${initials}${batchDateFormatted}`;

            // Hierarchical structure
            const children: any[] = [];
            if (periodFilter === 'daily') {
                // For daily, children are aggregated services
                const svcMap = new Map<string, number>();
                comms.forEach(c => {
                    svcMap.set(c.service, (svcMap.get(c.service) || 0) + c.commissionValue);
                });
                Array.from(svcMap.entries()).forEach(([name, amount]) => {
                    children.push({ id: `${batchId}-${name}`, label: name, total: amount, type: 'service' });
                });
            } else {
                // For biweekly/monthly, children are days
                const dayMap = new Map<string, typeof commissions>();
                comms.forEach(c => {
                    if (!dayMap.has(c.date)) dayMap.set(c.date, []);
                    dayMap.get(c.date)!.push(c);
                });

                Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([dayKey, dayComms]) => {
                    const dayTotal = dayComms.reduce((sum, c) => sum + c.commissionValue, 0);
                    const [dy, dm, dd] = dayKey.split('-').map(Number);
                    const dayDate = new Date(dy, dm - 1, dd);
                    const dayId = `${batchId}-${dayKey}`;

                    // Services within that day
                    const svcMap = new Map<string, number>();
                    dayComms.forEach(c => {
                        svcMap.set(c.service, (svcMap.get(c.service) || 0) + c.commissionValue);
                    });
                    const dayServices = Array.from(svcMap.entries()).map(([name, amount]) => ({
                        id: `${dayId}-${name}`,
                        label: name,
                        total: amount,
                        type: 'service'
                    }));

                    children.push({
                        id: dayId,
                        label: dayDate.toLocaleDateString('pt-BR'),
                        total: dayTotal,
                        type: 'day',
                        children: dayServices
                    });
                });
            }

            // Determine aggregated status from individual commission statuses for visual consistency
            const commStatuses = comms.map(c => commissionStatusMap[c.id] || (c.status === 'paid' ? 'Pagamento Confirmado' : 'Em preparação'));

            let displayStatus = allPaid ? 'Pagamento Confirmado' : noPaid ? 'Em preparação' : 'Parcial';

            // Logic to bubble up the most relevant status across filters for consistency
            if (!allPaid) {
                if (commStatuses.some(s => s === 'Pagamento Confirmado')) {
                    displayStatus = 'Pagamento Confirmado';
                } else if (commStatuses.some(s => s === 'Pendente de Confirmação')) {
                    displayStatus = 'Pendente de Confirmação';
                } else if (commStatuses.some(s => s === 'Aprovado')) {
                    displayStatus = 'Aprovado';
                } else if (commStatuses.some(s => s === 'Aguardando Aprovação')) {
                    displayStatus = 'Aguardando Aprovação';
                } else if (!noPaid) {
                    displayStatus = 'Parcial';
                }
            }

            const statusColors: Record<string, string> = {
                'Pago': 'text-purple-700 border-purple-200 bg-purple-50',
                'Pendente de Confirmação': 'text-orange-700 border-orange-200 bg-orange-50',
                'Aprovado': 'text-emerald-700 border-emerald-200 bg-emerald-50',
                'Aguardando Aprovação': 'text-blue-700 border-blue-200 bg-blue-50',
                'Em preparação': 'text-slate-600 border-slate-200 bg-slate-50',
                'Pagamento Confirmado': 'text-emerald-700 border-emerald-200 bg-emerald-50',
                'Parcial': 'text-amber-700 border-amber-200 bg-amber-50'
            };

            return {
                id: batchId,
                period: periodLabel,
                professionalId: comms[0].professionalId,
                professionalName: comms[0].professionalName,
                total,
                status: displayStatus,
                statusColor: statusColors[displayStatus] || statusColors['Em preparação'],
                commissions: comms,
                children
            };
        }).reverse();
    }, [commissions, periodFilter, selectedProfessionalId, commissionStatusMap]);

    // Reset selected batch if filter changes or if current selection is invalid
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');

    // Update selected batch when filters change
    React.useEffect(() => {
        setSelectedBatchId('');
    }, [periodFilter, selectedProfessionalId]);


    // Get details for the selected batch
    const batchDetails = useMemo(() => {
        const batch = batches.find(b => b.id === selectedBatchId);
        if (!batch) return null;

        // Group commissions by professional
        const proMap = new Map();
        batch.commissions.forEach(c => {
            if (!proMap.has(c.professionalId)) {
                const batchProKey = `${batch.id}-${c.professionalId}`;
                proMap.set(c.professionalId, {
                    id: c.professionalId,
                    name: c.professionalName,
                    amount: 0,
                    pendingAmount: 0,
                    commissions: [],
                    included: c.status !== 'paid', // Default to included if not paid
                    alert: null,
                    alertType: null,
                    adjustment: batchAdjustments[batchProKey] || 0,
                    autoVale: batchAutoVales[batchProKey] || 0
                });
            }
            const pro = proMap.get(c.professionalId);
            pro.amount += c.commissionValue;
            if (c.status !== 'paid') {
                pro.pendingAmount += c.commissionValue;
            }
            pro.commissions.push(c);
        });

        // Calculate payment method reconciliation
        const batchTransactions = transactions.filter(t =>
            batch.commissions.some(c => c.transactionId === t.id)
        );

        const methodTotals = {
            pix: 0,
            cartao: 0,
            dinheiro: 0,
            outros: 0
        };

        batchTransactions.forEach(t => {
            const methodRaw = (t.payment_method || 'outros').toLowerCase();

            if (methodRaw.includes('pix')) {
                methodTotals.pix += t.amount;
            } else if (methodRaw.includes('dinheiro')) {
                methodTotals.dinheiro += t.amount;
            } else if (methodRaw.includes('cart') || methodRaw.includes('crédito') || methodRaw.includes('débito')) {
                methodTotals.cartao += t.amount;
            } else {
                methodTotals.outros += t.amount;
            }
        });

        const totalReconciled = Object.values(methodTotals).reduce((sum, v) => sum + v, 0);
        const pixPercent = totalReconciled > 0 ? (methodTotals.pix / totalReconciled) * 100 : 0;
        const cardPercent = totalReconciled > 0 ? (methodTotals.cartao / totalReconciled) * 100 : 0;
        const cashPercent = totalReconciled > 0 ? (methodTotals.dinheiro / totalReconciled) * 100 : 0;
        const reconciledPercent = totalReconciled > 0 ? Math.min(100, (totalReconciled / batch.total) * 100) : 0;

        return {
            id: batch.id,
            period: batch.period,
            professionals: Array.from(proMap.values())
                .filter((p: any) => !detailsProFilter || p.id === detailsProFilter),
            reconciliation: {
                percent: reconciledPercent,
                methods: {
                    pix: { amount: methodTotals.pix, percent: pixPercent },
                    cartao: { amount: methodTotals.cartao, percent: cardPercent },
                    dinheiro: { amount: methodTotals.dinheiro, percent: cashPercent }
                }
            }
        };
    }, [selectedBatchId, batches, transactions, selectedProfessionalId, detailsProFilter, batchAdjustments, batchAutoVales]);

    const { fetchApprovedVales } = useAdvanceRequests();

    // Effect to fetch approved vales when generating a batch
    useEffect(() => {
        if (!generatingBatchId) return;

        const currentBatch = batches.find(b => b.id === generatingBatchId);
        if (!currentBatch || currentBatch.commissions.length === 0) return;

        const professionalsInBatch = Array.from(new Set(currentBatch.commissions.map(c => c.professionalId)));

        // Determine date range for the batch
        const firstCommDate = new Date(currentBatch.commissions[0].date);
        let startDate: Date;
        let endDate: Date;

        if (periodFilter === 'daily') {
            startDate = new Date(firstCommDate.setHours(0, 0, 0, 0));
            endDate = new Date(firstCommDate.setHours(23, 59, 59, 999));
        } else if (periodFilter === 'monthly') {
            startDate = new Date(firstCommDate.getFullYear(), firstCommDate.getMonth(), 1);
            endDate = new Date(firstCommDate.getFullYear(), firstCommDate.getMonth() + 1, 0, 23, 59, 59, 999);
        } else {
            // Biweekly
            if (firstCommDate.getDate() <= 15) {
                startDate = new Date(firstCommDate.getFullYear(), firstCommDate.getMonth(), 1);
                endDate = new Date(firstCommDate.getFullYear(), firstCommDate.getMonth(), 15, 23, 59, 59, 999);
            } else {
                startDate = new Date(firstCommDate.getFullYear(), firstCommDate.getMonth(), 16);
                endDate = new Date(firstCommDate.getFullYear(), firstCommDate.getMonth() + 1, 0, 23, 59, 59, 999);
            }
        }

        const fetchAllVales = async () => {
            const valesMap: Record<string, number> = {};
            for (const proId of professionalsInBatch) {
                // Asserting string for proId to fix lint
                const vales = await fetchApprovedVales(proId as string, startDate.toISOString(), endDate.toISOString());
                const totalVales = vales.reduce((sum: number, v: any) => sum + Number(v.amount || 0), 0);
                if (totalVales > 0) {
                    valesMap[`${generatingBatchId}-${proId}`] = totalVales;
                }
            }
            setBatchAutoVales(prev => ({ ...prev, ...valesMap }));
        };

        fetchAllVales();
    }, [generatingBatchId, periodFilter, batches]);

    const handlePayBatch = async () => {
        if (!selectedBatchId) return;
        setPaymentMethodModalBatchId(selectedBatchId);
    };

    const handleConfirmPayment = async () => {
        if (!paymentMethodModalBatchId || !selectedPaymentMethod) {
            setSuccessTitle('Atenção');
            setSuccessDescription('Por favor, selecione um método de pagamento.');
            setShowSuccessFeedback(true);
            return;
        }

        await updateBatchStatus(paymentMethodModalBatchId, 'Pendente de Confirmação');

        setSuccessTitle('Pronto!');
        setSuccessDescription('O método de pagamento foi definido e aguarda confirmação do colaborador(a).');
        setShowSuccessFeedback(true);

        setPaymentMethodModalBatchId(null);
    };

    const handleCollaboratorConfirm = async () => {
        if (!confirmingBatchId || !currentActiveBatch) return;

        setProcessingPayment(true);
        try {
            const targetProId = selectedProfessionalId || professionalId || (currentActiveBatch.commissions[0]?.professionalId);

            if (!targetProId) {
                throw new Error("Profissional não identificado para o registro do pagamento.");
            }

            const batchProKey = `${confirmingBatchId}-${targetProId}`;
            const adjustment = batchAdjustments[batchProKey] || 0;
            const autoVale = batchAutoVales[batchProKey] || 0;
            const finalAmount = currentActiveBatch.total - adjustment - autoVale;

            const result = await payCommissions(
                targetProId,
                finalAmount,
                selectedPaymentMethod || 'PIX',
                `Pagamento de Comissões - Lote ${confirmingBatchId} (${currentActiveBatch.period})`
            );

            if (!result) throw new Error("Erro ao registrar transação financeira no banco de dados.");

            await updateBatchStatus(confirmingBatchId, 'Pagamento Confirmado');

            // Show custom success feedback
            setSuccessTitle('Sucesso!');
            setSuccessDescription('Seu recebimento foi confirmado e registrado no fluxo de caixa.');
            setShowSuccessFeedback(true);

            // Critical: Close modal first to avoid stale data reference issues
            setConfirmingBatchId(null);
            setSelectedPaymentMethod(null);
        } catch (error: any) {
            console.error('Erro ao confirmar recebimento:', error);
            setTimeout(() => {
                setSuccessTitle('Erro ao Confirmar');
                setSuccessDescription(`Falha na confirmação: ${error.message || 'Erro desconhecido'}`);
                setShowSuccessFeedback(true);
            }, 300); // Small delay to prevent modal stacking issues if confirm modal is closing
        } finally {
            setProcessingPayment(false);
        }
    };

    const closeSuccessFeedback = () => {
        setShowSuccessFeedback(false);
    };

    const handleConfirmGenerateBatch = async () => {
        if (!generatingBatchId) return;
        setIsGenerating(true);

        const batchAdj: any = {};
        const batchObs: any = {};
        const batchVales: any = {};

        Object.keys(batchAdjustments).forEach(k => { if (k.startsWith(generatingBatchId)) batchAdj[k] = batchAdjustments[k]; });
        Object.keys(batchObservations).forEach(k => { if (k.startsWith(generatingBatchId)) batchObs[k] = batchObservations[k]; });
        Object.keys(batchAutoVales).forEach(k => { if (k.startsWith(generatingBatchId)) batchVales[k] = batchAutoVales[k]; });

        await updateBatchStatus(generatingBatchId, 'Aguardando Aprovação', {
            adjustments: batchAdj,
            observations: batchObs,
            autoVales: batchVales
        });
        setGeneratingBatchId(null);
        setIsGenerating(false);

        setSuccessTitle('Lote Gerado!');
        setSuccessDescription('O lote foi gerated com sucesso e os colaboradores foram notificados via App.');
        setShowSuccessFeedback(true);
    };

    const handleApproveBatch = async () => {
        if (!selectedBatchId) return;
        await updateBatchStatus(selectedBatchId, 'Aprovado');

        setSuccessTitle('Lote Aprovado!');
        setSuccessDescription('O lote foi aprovado com sucesso! O botão de recebimento foi liberado para os colaboradores.');
        setShowSuccessFeedback(true);
    };

    const currentActiveBatch = batches.find(b => b.id === (generatingBatchId || confirmingBatchId || selectedBatchId));
    const currentGeneratingBatch = batches.find(b => b.id === generatingBatchId);
    const generatingProData = currentGeneratingBatch ? Array.from(
        currentGeneratingBatch.commissions.reduce((acc: Map<string, any>, c) => {
            if (!acc.has(c.professionalId)) {
                acc.set(c.professionalId, { id: c.professionalId, name: c.professionalName, amount: 0 });
            }
            acc.get(c.professionalId).amount += c.commissionValue;
            return acc;
        }, new Map()).values()
    ) : [];

    if (loadingPersistence) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 bg-white border border-slate-200 shadow-sm rounded-xl backdrop-blur-sm p-12 rounded-2xl border border-cyan-100/50 shadow-xl">
                    <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sincronizando Banco de Dados...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fadeIn gap-6">

            <style>{styles}</style>

            {/* --- Top KPIs --- */}
            <div className="grid grid-cols-4 gap-4">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className={`relative overflow-hidden rounded-xl border ${kpi.border} ${kpi.bg} p-4 shadow-none group hover:shadow-md transition-all`}>
                        <div className={`absolute top-0 right-0 p-3 opacity-10 ${kpi.color}`}>
                            <span className="material-symbols-outlined text-4xl">{kpi.icon}</span>
                        </div>
                        <div className="flex flex-col gap-1 relative z-10">
                            <span className={`text-[10px] font-black tracking-widest ${kpi.color} uppercase`}>{kpi.label}</span>
                            <span className={`text-2xl font-black text-slate-800`}>{formatBRL(kpi.value)}</span>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-1 via-${kpi.color.split('-')[1]}-500/20 `}></div>
                    </div>
                ))}
            </div>

            {/* --- Filters --- */}
            <div className="flex items-center justify-between -mt-2 mb-2">
                <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl border border-cyan-100/50 rounded-full p-1 flex items-center shadow-none">
                    <button
                        onClick={() => setPeriodFilter('daily')}
                        className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${periodFilter === 'daily' ? 'bg-white text-slate-800 shadow-md border border-cyan-100/50' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                        Diário
                    </button>
                    <button
                        onClick={() => setPeriodFilter('biweekly')}
                        className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${periodFilter === 'biweekly' ? 'bg-white text-slate-800 shadow-md border border-cyan-100/50' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                        Quinzenal
                    </button>
                    <button
                        onClick={() => setPeriodFilter('monthly')}
                        className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${periodFilter === 'monthly' ? 'bg-white text-slate-800 shadow-md border border-cyan-100/50' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                        Mensal
                    </button>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-3 bg-white border border-cyan-100/50 rounded-xl px-4 py-1.5 shadow-none">
                        <span className="material-symbols-outlined text-slate-400 text-lg">filter_alt</span>
                        <div className="w-px h-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl"></div>
                        <select
                            value={selectedProfessionalId}
                            onChange={(e) => setSelectedProfessionalId(e.target.value)}
                            className="text-xs font-bold bg-transparent outline-none text-slate-800/80 hover: font-extrabold transition-colors bg-none appearance-none pr-6 cursor-pointer"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '1em' }}
                        >
                            <option value="">Todos os Colaboradores</option>
                            {professionalsStats.map(pro => (
                                <option key={pro.id} value={pro.id}>{pro.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>


            {/* --- Main Content Split --- */}

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* LEFT: Batches Table */}
                <div className="col-span-7 bg-white border border-cyan-100/50 rounded-xl p-6 flex flex-col shadow-none">
                    <h3 className="text-sm font-black text-slate-800/90 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Lotes de Pagamentos</h3>
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="pb-2 pl-2">Lote</th>
                                    {isAdmin && <th className="pb-2">Colaborador</th>}
                                    <th className="pb-2">Período</th>
                                    <th className="pb-2">Total R$</th>
                                    <th className="pb-2 text-center pr-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                                            Nenhum lote encontrado para este período.
                                        </td>
                                    </tr>
                                ) : batches.map((batch) => (
                                    <React.Fragment key={batch.id}>
                                        {/* ROOT ROW */}
                                        <tr
                                            onClick={() => {
                                                setSelectedBatchId(batch.id);
                                            }}
                                            onDoubleClick={() => {
                                                setExpandedRows(prev => ({ ...prev, [batch.id]: !prev[batch.id] }));
                                            }}
                                            className={`group cursor-pointer transition-all ${selectedBatchId === batch.id ? 'ring-2 ring-cyan-500 ring-offset-1 relative z-10 shadow-md' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className={`py-3 pl-3 rounded-l-lg border-y border-l font-mono text-xs font-bold ${selectedBatchId === batch.id ? 'bg-cyan-50/30 border-cyan-200 text-slate-800' : 'bg-white border-slate-200 text-slate-800'}`}>
                                                <div className="flex items-center gap-2">
                                                    {isAdmin && batch.status === 'Em preparação' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={!!checkedBatches[batch.id]}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                setCheckedBatches(prev => ({ ...prev, [batch.id]: !prev[batch.id] }));
                                                                setSelectedBatchId(batch.id);
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer flex-shrink-0 accent-cyan-600"
                                                        />
                                                    )}
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedRows(prev => ({ ...prev, [batch.id]: !prev[batch.id] }));
                                                        }}
                                                        className={`w-5 h-5 flex flex-shrink-0 items-center justify-center rounded border transition-colors ${selectedBatchId === batch.id ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-sm hover:bg-cyan-100' : 'bg-white border-slate-200 text-slate-400 hover:border-cyan-300'}`}
                                                    >
                                                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${expandedRows[batch.id] ? 'rotate-90' : ''}`}>chevron_right</span>
                                                    </div>
                                                    <span>{batch.id}</span>
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className={`py-3 border-y text-xs font-bold ${selectedBatchId === batch.id ? 'bg-cyan-50/30 border-cyan-200 text-slate-800' : 'bg-white border-slate-200 text-slate-800/80'}`}>
                                                    {batch.professionalName}
                                                </td>
                                            )}
                                            <td className={`py-3 border-y text-xs font-medium ${selectedBatchId === batch.id ? 'bg-cyan-50/30 border-cyan-200 text-slate-800' : 'bg-white border-slate-200 text-slate-500'}`}>{batch.period}</td>
                                            <td className={`py-3 border-y text-sm font-black ${selectedBatchId === batch.id ? 'bg-cyan-50/30 border-cyan-200 text-slate-800' : 'bg-white border-slate-200 text-slate-800'}`}>{formatBRL(batch.total)}</td>
                                            <td className={`py-3 pr-4 rounded-r-lg border-y border-r text-center ${selectedBatchId === batch.id ? 'bg-cyan-50/30 border-cyan-200' : 'bg-white border-slate-200'}`}>
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-none ${batch.statusColor}`}>
                                                    {batch.status === 'Em preparação' && <span className="material-symbols-outlined text-[12px] animate-spin-slow">settings</span>}
                                                    {batch.status === 'Parcial' && <span className="material-symbols-outlined text-[12px]">schedule</span>}
                                                    {batch.status === 'Pagamento Confirmado' && <span className="material-symbols-outlined text-[12px]">paid</span>}
                                                    {batch.status === 'Aprovado' && <span className="material-symbols-outlined text-[12px]">verified</span>}
                                                    {batch.status === 'Pendente de Confirmação' && <span className="material-symbols-outlined text-[12px]">pending_actions</span>}
                                                    {batch.status === 'Aguardando Aprovação' && <span className="material-symbols-outlined text-[12px]">mail</span>}
                                                    {batch.status}
                                                </span>
                                            </td>
                                        </tr>

                                        {/* HIERARCHY LEVEL 1 (Days for Biweekly/Monthly, Services for Daily) */}
                                        {expandedRows[batch.id] && batch.children.map((child: any) => (
                                            <React.Fragment key={child.id}>
                                                <tr
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (child.type === 'day') {
                                                            setExpandedRows(prev => ({ ...prev, [child.id]: !prev[child.id] }));
                                                        }
                                                    }}
                                                    className={`animate-slideInRight cursor-pointer hover:bg-slate-50 transition-colors`}
                                                >
                                                    <td className="py-2 pl-12 border-b border-slate-50 text-slate-700 text-xs font-bold relative group/child">
                                                        <div className="branch-line-v"></div>
                                                        <div className="branch-line-h"></div>

                                                        <div className="flex items-center gap-2">
                                                            {child.type === 'day' && (
                                                                <div className="w-4 h-4 flex items-center justify-center rounded bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl text-slate-400 transition-transform">
                                                                    <span className={`material-symbols-outlined text-[14px] ${expandedRows[child.id] ? 'rotate-90' : ''}`}>chevron_right</span>
                                                                </div>
                                                            )}
                                                            <span className={child.type === 'service' ? 'text-[11px] font-black uppercase tracking-tighter text-slate-400' : 'text-slate-800/80'}>
                                                                {child.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {isAdmin && <td className="py-2 border-b border-slate-50"></td>}
                                                    <td className="py-2 border-b border-slate-50 text-[9px] text-slate-300 font-black uppercase tracking-widest">
                                                        {child.type === 'day' ? 'Dia' : 'Serviço'}
                                                    </td>
                                                    <td className="py-2 border-b border-slate-50 text-[11px] font-black text-slate-800/90">{formatBRL(child.total)}</td>
                                                    <td colSpan={2} className="py-2 border-b border-slate-50 text-right pr-4">
                                                        {child.type === 'service' && <span className="text-[10px] font-bold text-slate-300">Agregado</span>}
                                                    </td>
                                                </tr>

                                                {/* HIERARCHY LEVEL 2 (Services for Days) */}
                                                {child.type === 'day' && expandedRows[child.id] && child.children.map((svc: any) => (
                                                    <tr key={svc.id} className="animate-slideInRight">
                                                        <td className="py-1.5 pl-20 border-b border-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-tight relative">
                                                            <div className="branch-line-v"></div>
                                                            <div className="branch-line-v-inner"></div>
                                                            <div className="branch-line-h-inner"></div>

                                                            {svc.label}
                                                        </td>
                                                        {isAdmin && <td className="py-1.5 border-b border-slate-50"></td>}
                                                        <td className="py-1.5 border-b border-slate-50 text-[8px] text-slate-200 font-black uppercase tracking-widest">Serviço</td>
                                                        <td className="py-1.5 border-b border-slate-50 text-[10px] font-bold text-slate-400">{formatBRL(svc.total)}</td>
                                                        <td colSpan={2} className="py-1.5 border-b border-slate-50"></td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: Batch Details Panel */}
                <div className="col-span-5 flex flex-col gap-4">

                    {batchDetails ? (
                        <>
                            {/* Details Card */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-5 relative overflow-hidden flex flex-col shadow-sm">
                                {/* Subtle Ambient Light */}
                                {/* Ambient Light Removed */}

                                {/* Header */}
                                <div className="mb-6 relative z-10 border-b border-slate-50 pb-4">
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                        Detalhes do Lote <span className="font-extrabold font-mono tracking-tighter">{batchDetails.id}</span>
                                    </h2>
                                    <div className="flex justify-between items-end mt-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{batchDetails.period}</span>
                                        {isAdmin && (
                                            <span className="text-[10px] font-black uppercase bg-slate-50 text-slate-600 px-3 py-1 rounded-full border border-slate-100 shadow-sm">{batchDetails.professionals[0]?.name}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Professionals List */}
                                <div className="flex-1 overflow-auto space-y-3 pr-1">
                                    {batchDetails.professionals.map((pro: any, idx: number) => (
                                        <div key={idx} className={`p-3 rounded-lg border transition-all ${pro.pendingAmount === 0 ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-cyan-100/60' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-cyan-100/60 shadow-none'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-sm font-black text-slate-800/90 block">{pro.name}</span>
                                                    <div className="flex gap-2">
                                                        <span className="text-xs font-bold text-slate-500">Bruto: {formatBRL(pro.amount)}</span>
                                                        {(pro.adjustment > 0 || pro.autoVale > 0) && (
                                                            <span className="text-[10px] font-bold text-red-500 pt-0.5" title="Descontos e Vales">- {formatBRL(pro.adjustment + pro.autoVale)}</span>
                                                        )}
                                                        {pro.pendingAmount > 0 && <span className="text-xs font-black text-emerald-600">Líquido: {formatBRL(pro.pendingAmount - pro.adjustment - pro.autoVale)}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] text-slate-400 uppercase font-black mb-1">Status</span>
                                                    <button className={`w-10 h-5 rounded-full relative transition-colors ${pro.pendingAmount === 0 ? 'bg-emerald-500/100' : 'bg-slate-300'}`}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-none ${pro.pendingAmount === 0 ? 'right-0.5' : 'left-0.5'}`}></div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Alerts */}
                                            {pro.alert && (
                                                <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold ${pro.alertType === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{pro.alertType === 'error' ? 'error' : 'warning'}</span>
                                                    {pro.alert}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Reconciliation Stats */}
                                <div className="mt-6 pt-4 border-t border-cyan-100/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reconciliação</span>
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">CONCILIADO {batchDetails.reconciliation.percent.toFixed(0)}%</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* PIX */}
                                        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-2 border border-cyan-100/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined font-extrabold text-[14px]">pix</span>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase">PIX</span>
                                                </div>
                                                <span className="text-[9px] font-extrabold font-bold">{batchDetails.reconciliation.methods.pix.percent.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-200 rounded-full mb-1">
                                                <div className="h-full bg-cyan-500 text-white shadow-md rounded-full" style={{ width: `${batchDetails.reconciliation.methods.pix.percent}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-800 font-black tracking-tighter">{formatBRL(batchDetails.reconciliation.methods.pix.amount)}</span>
                                        </div>

                                        {/* Cartão */}
                                        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-2 border border-cyan-100/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined font-extrabold text-[14px]">credit_card</span>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase">CARTÃO</span>
                                                </div>
                                                <span className="text-[9px] font-extrabold font-bold">{batchDetails.reconciliation.methods.cartao.percent.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-200 rounded-full mb-1">
                                                <div className="h-full bg-cyan-500 text-white shadow-md rounded-full" style={{ width: `${batchDetails.reconciliation.methods.cartao.percent}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-800 font-black tracking-tighter">{formatBRL(batchDetails.reconciliation.methods.cartao.amount)}</span>
                                        </div>

                                        {/* Dinheiro */}
                                        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-2 border border-cyan-100/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-emerald-600 text-[14px]">payments</span>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase">DINHEIRO</span>
                                                </div>
                                                <span className="text-[9px] text-emerald-600 font-bold">{batchDetails.reconciliation.methods.dinheiro.percent.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-200 rounded-full mb-1">
                                                <div className="h-full bg-emerald-500/100 rounded-full" style={{ width: `${batchDetails.reconciliation.methods.dinheiro.percent}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-800 font-black tracking-tighter">{formatBRL(batchDetails.reconciliation.methods.dinheiro.amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => { if (selectedBatchId) setGeneratingBatchId(selectedBatchId); }}
                                            disabled={!selectedBatchId || !checkedBatches[selectedBatchId] || (batchStatusOverride[selectedBatchId] !== undefined && batchStatusOverride[selectedBatchId] !== 'Em preparação')}
                                            className={`col-span-1 py-3 text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-none group ${!selectedBatchId || !checkedBatches[selectedBatchId] || (batchStatusOverride[selectedBatchId] !== undefined && batchStatusOverride[selectedBatchId] !== 'Em preparação')
                                                ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                                                : ' bg-cyan-500 text-white shadow-md hover:bg-cyan-600'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">factory</span>
                                            Gerar Lote
                                        </button>
                                        <button
                                            onClick={handlePayBatch}
                                            disabled={processingPayment || (!selectedBatchId || batchStatusOverride[selectedBatchId] !== 'Aguardando Aprovação')}
                                            className={`col-span-1 py-3 text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-none group ${processingPayment || (!selectedBatchId || batchStatusOverride[selectedBatchId] !== 'Aguardando Aprovação')
                                                ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                                                : 'bg-purple-500 hover:bg-purple-600'
                                                }`}
                                        >
                                            {processingPayment ? (
                                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                            ) : (
                                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">payments</span>
                                            )}
                                            {processingPayment ? 'Processando...' : 'Pagar'}
                                        </button>
                                    </>
                                )}
                                {/* Collaborator: Confirmar Pagamento */}
                                {!isAdmin && selectedBatchId && batchStatusOverride[selectedBatchId] === 'Pendente de Confirmação' && (
                                    <button
                                        onClick={() => { setConfirmingBatchId(selectedBatchId); }}
                                        disabled={processingPayment}
                                        className="col-span-2 py-3.5 bg-emerald-500/100 hover:bg-emerald-600 text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg group"
                                    >
                                        {processingPayment ? (
                                            <span className="material-symbols-outlined animate-spin">refresh</span>
                                        ) : (
                                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">verified</span>
                                        )}
                                        {processingPayment ? 'Processando...' : 'Confirmar Pagamento'}
                                    </button>
                                )}
                                <button className={`${isAdmin ? 'col-span-1' : 'col-span-2'} py-2.5 bg-white border border-cyan-100/50 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2`}>
                                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                                    Exportar PDF
                                </button>
                                {isAdmin && (
                                    <button className="col-span-1 py-2.5 bg-white border border-cyan-100/50 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">table_chart</span>
                                        Exportar CSV
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-white border border-cyan-100/50 rounded-xl shadow-none">
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic">Selecione um lote</p>
                        </div>
                    )}

                </div>
            </div>

            {/* --- GENERATE BATCH MODAL --- */}
            {generatingBatchId && currentGeneratingBatch && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-48 pb-6 px-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-cyan-100/50 flex flex-col max-h-[calc(100vh-14rem)]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-cyan-100/50 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                <span className="material-symbols-outlined font-extrabold">factory</span>
                                Gerar Lote {generatingBatchId}
                            </h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Conferência de Comissões e Ajustes</p>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                {generatingProData.map((pro: any) => {
                                    const adjustment = batchAdjustments[`${generatingBatchId}-${pro.id}`] || 0;
                                    const autoVale = batchAutoVales[`${generatingBatchId}-${pro.id}`] || 0;
                                    const observation = batchObservations[`${generatingBatchId}-${pro.id}`] || '';
                                    const finalAmount = pro.amount - adjustment - autoVale;

                                    return (
                                        <div key={pro.id} className="p-4 rounded-xl border border-cyan-100/50 bg-white shadow-none hover:border-cyan-200 transition-all group">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm font-black text-slate-800/90">{pro.name}</span>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base: {formatBRL(pro.amount)}</span>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">DESCONTOS</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                                            <input
                                                                type="number"
                                                                placeholder="0,00"
                                                                value={adjustment || ''}
                                                                onChange={(e) => setBatchAdjustments(prev => ({ ...prev, [`${generatingBatchId}-${pro.id}`]: parseFloat(e.target.value) || 0 }))}
                                                                className="w-full bg-white border border-cyan-100/50 rounded-lg py-2 pl-9 pr-4 text-sm font-bold text-slate-800/80 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Vale (Automático)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                                            <input
                                                                type="number"
                                                                readOnly
                                                                value={autoVale || 0}
                                                                className="w-full bg-orange-50 border border-orange-100 rounded-lg py-2 pl-9 pr-4 text-sm font-black text-orange-600 outline-none"
                                                            />
                                                            {autoVale > 0 && (
                                                                <span className="absolute -top-2 -right-1 bg-orange-500/100 text-slate-800 text-[8px] px-1 rounded animate-pulse">VALE ATIVO</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Observação</label>
                                                    <textarea
                                                        placeholder="Motivo do desconto ou observação geral..."
                                                        value={observation}
                                                        onChange={(e) => setBatchObservations(prev => ({ ...prev, [`${generatingBatchId}-${pro.id}`]: e.target.value }))}
                                                        className="w-full bg-white border border-cyan-100/50 rounded-lg p-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all resize-none h-16"
                                                    />
                                                </div>

                                                <div className="flex justify-end pt-2 border-t border-slate-50">
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Total Líquido</span>
                                                        <span className={`text-xl font-black ${finalAmount < 0 ? 'text-red-500' : ' font-extrabold'}`}>{formatBRL(finalAmount)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Notification Toggle */}
                            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined font-extrabold">notifications_active</span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-cyan-900 uppercase">Notificar Colaboradores</span>
                                        <p className="text-[10px] text-cyan-700 font-medium">Enviar aviso via App e WhatsApp sobre o fechamento.</p>
                                    </div>
                                </div>
                                <div className="w-12 h-6 bg-cyan-500 text-white shadow-md rounded-full relative p-1 shadow-inner">
                                    <div className="w-4 h-4 bg-white rounded-full absolute right-1"></div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-cyan-100/50 flex gap-4 bg-slate-50">
                            <button
                                onClick={() => setGeneratingBatchId(null)}
                                className="flex-1 py-3 text-slate-500 font-bold text-sm bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-xl rounded-xl transition-all uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmGenerateBatch}
                                disabled={isGenerating}
                                className={`flex-[2] py-3 ${isGenerating ? 'bg-slate-300' : ' bg-cyan-500 text-white shadow-md hover:bg-cyan-600 shadow-lg '} text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 group`}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">lock</span>
                                        FECHAR LOTE E ENVIAR AVISOS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- PAYMENT METHOD MODAL --- */}
            {paymentMethodModalBatchId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-cyan-100/50 flex flex-col">
                        <div className="p-6 border-b border-cyan-100/50 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Método de Pagamento</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Lote: {paymentMethodModalBatchId}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-bold text-slate-700">Selecione como deseja realizar este pagamento:</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSelectedPaymentMethod('PIX')}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedPaymentMethod === 'PIX' ? 'border-cyan-500 bg-cyan-50 shadow-sm' : 'border-slate-100 hover:border-cyan-200'}`}
                                >
                                    <span className="material-symbols-outlined text-3xl font-extrabold">pix</span>
                                    <span className="text-sm font-black text-slate-800/80">PIX</span>
                                </button>
                                <button
                                    onClick={() => setSelectedPaymentMethod('Dinheiro')}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedPaymentMethod === 'Dinheiro' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 hover:border-emerald-200'}`}
                                >
                                    <span className="material-symbols-outlined text-3xl text-emerald-600">payments</span>
                                    <span className="text-sm font-black text-slate-800/80">Dinheiro</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 border-t border-cyan-100/50 flex gap-4 bg-slate-50">
                            <button
                                onClick={() => { setPaymentMethodModalBatchId(null); setSelectedPaymentMethod(null); }}
                                className="flex-1 py-3 text-slate-500 font-bold text-sm bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-xl rounded-xl transition-all uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={!selectedPaymentMethod}
                                className={`flex-[2] py-3 ${!selectedPaymentMethod ? 'bg-slate-300' : ' bg-cyan-500 text-white shadow-md hover:bg-cyan-600 shadow-lg '} text-slate-800 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3`}
                            >
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUCCESS FEEDBACK MODAL (UNIVERSAL) --- */}
            {showSuccessFeedback && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[360px] overflow-hidden border-[8px] border-slate-800 flex flex-col h-[500px] relative">
                        {/* Simulation iPhone Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10"></div>

                        <div className="p-8 pt-12 flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 animate-bounce">
                                <span className="material-symbols-outlined text-5xl font-black">check_circle</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800/90 mb-2">{successTitle}</h3>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{successDescription}</p>

                            <button
                                onClick={closeSuccessFeedback}
                                className="w-full py-4 bg-emerald-500/100 hover:bg-emerald-600 text-slate-800 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 mt-auto"
                            >
                                Entendido
                            </button>
                        </div>
                        {/* Simulation Home Bar */}
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 rounded-full"></div>
                    </div>
                </div>
            )}

            {/* --- COLLABORATOR CONFIRMATION MODAL (SIMULATION) --- */}
            {confirmingBatchId && currentActiveBatch && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-48 pb-6 px-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[360px] overflow-hidden border-[8px] border-slate-800 flex flex-col h-[640px] relative">
                        {/* Simulation iPhone Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10"></div>

                        <div className="p-6 pt-10 flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{salonName} App</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-white mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">Você tem um pagamento a receber!</h4>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Referente ao lote: {confirmingBatchId}</p>
                            </div>

                            <div className="space-y-3 flex-1 overflow-auto pr-1">
                                {(() => {
                                    const targetProId = selectedProfessionalId || professionalId || (currentActiveBatch.commissions[0]?.professionalId);
                                    const batchProKey = `${confirmingBatchId}-${targetProId}`;
                                    const adjustment = batchAdjustments[batchProKey] || 0;
                                    const autoVale = batchAutoVales[batchProKey] || 0;
                                    const totalDeductions = adjustment + autoVale;
                                    const finalAmount = currentActiveBatch.total - totalDeductions;
                                    return (
                                        <>
                                            <div className="bg-slate-50 rounded-2xl p-4 border border-white flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Valor Base</span>
                                                <span className="text-sm font-black text-slate-800/90">{formatBRL(currentActiveBatch.total)}</span>
                                            </div>
                                            {totalDeductions > 0 && (
                                                <div className="bg-slate-50 rounded-2xl p-4 border border-white flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-500">Ajustes / Vales</span>
                                                    <span className="text-sm font-black text-red-500">-{formatBRL(totalDeductions)}</span>
                                                </div>
                                            )}
                                            <div className="bg-cyan-600 rounded-3xl p-6 text-slate-800 shadow-lg ">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 block mb-1">Valor Final a Receber</span>
                                                <span className="text-3xl font-black text-white">{formatBRL(finalAmount)}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <button
                                onClick={handleCollaboratorConfirm}
                                disabled={processingPayment}
                                className="w-full py-5 bg-slate-900 hover:bg-black text-slate-800 rounded-[2rem] font-black text-sm transition-all shadow-xl flex items-center justify-center gap-3 group mt-auto mb-4"
                            >
                                {processingPayment ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : (
                                    <>
                                        Confirmar Recebimento
                                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Pressione para confirmar o depósito</p>
                        </div>

                        {/* Simulation Home Bar */}
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 rounded-full"></div>
                    </div>
                </div>
            )
            }

            {/* --- SUCCESS MODAL --- */}
            {
                showSuccessFeedback && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-cyan-100/50 flex flex-col items-center p-8 text-center animate-scaleIn">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/100 text-slate-800 flex items-center justify-center mb-6 shadow-lg ">
                                <span className="material-symbols-outlined text-4xl">check_circle</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">{successTitle}</h3>
                            <p className="text-slate-500 text-sm font-medium mb-8">{successDescription}</p>
                            <button
                                onClick={closeSuccessFeedback}
                                className="w-full py-4 bg-slate-900 hover:bg-black text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                            >
                                Excelente!
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CommissionsPayments;
