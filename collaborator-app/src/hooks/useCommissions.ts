import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useTransactions } from './useTransactions';
import { useProfessionals } from './useProfessionals';
import { useClients } from './useClients';
import { useServices } from './useServices';
import { useAdvanceRequests } from './useAdvanceRequests';

export interface Commission {
    id: string; // Using transaction_id + index or similar
    professionalId: string;
    professionalName: string;
    professionalRole: string;
    professionalAvatar: string;
    service: string;
    client: string;
    date: string;
    startTime?: string;
    endTime?: string;
    serviceValue: number;
    commissionPercent: number;
    commissionValue: number;
    status: 'paid' | 'pending';
    transactionId: string;
    isDiscounted?: boolean;
    discountValue?: number;
}

export interface PendingApproval {
    id: string;
    professional: string;
    professionalId: string;
    service: string;
    reason: string;
    value: number;
    recommendedAction: string;
    type: 'discount' | 'advance';
    sourceId: string; // transaction_id or advance_request_id
}

export interface SimulationResult {
    id: string;
    professionalId: string;
    professional: string;
    grossValue: number;
    feesDeducted: number;
    bonusesAdded: number;
    adjustments: number; // from pending approvals
    netValue: number;
}

export interface Professional {
    id: string;
    name: string;
    role: string;
    avatar: string;
    commissionRate: number;
    totalEarned: number;
    pendingAmount: number;
    goal?: number;
    color: string;
}

export const useCommissions = (filterMonth?: string, professionalId?: string) => {
    const { transactions, loading: loadingTrans, addTransaction } = useTransactions();
    const { professionals, loading: loadingPros } = useProfessionals();
    const { clients, loading: loadingClients } = useClients();
    const { services, loading: loadingServices } = useServices();
    const [advances, setAdvances] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [loadingAdvances, setLoadingAdvances] = useState(true);
    const [loadingBatches, setLoadingBatches] = useState(true);

    useEffect(() => {
        const fetchBatches = async () => {
            let query = supabase.from('commission_batches').select('*');
            let { data } = await query;
            if (data) {
                if (professionalId) {
                    data = data.filter(b => (b.data as any)?.professionalId === professionalId);
                }
                setBatches(data);
            }
            setLoadingBatches(false);
        };
        fetchBatches();
    }, [professionalId]);

    useEffect(() => {
        // Fetch pending/approved but unpaid advances for all professionals
        const fetchAdvances = async () => {
            try {
                let query = supabase
                    .from('advance_requests')
                    .select('*, professional:professionals(name)')
                    .in('status', ['pending', 'approved']);

                if (professionalId !== undefined) {
                    query = query.eq('professional_id', professionalId);
                }

                const { data, error } = await query;

                if (!error && data) {
                    setAdvances(data);
                }
            } catch (err) {
                console.error("Error fetching advances for commissions:", err);
            } finally {
                setLoadingAdvances(false);
            }
        };
        fetchAdvances();
    }, [professionalId]);

    const loading = loadingTrans || loadingPros || loadingClients || loadingServices || loadingAdvances || loadingBatches;

    const commissionsData = useMemo(() => {
        if (loading) return { commissions: [], professionalsStats: [], pendingApprovals: [], simulationData: [] };

        const allCommissions: Commission[] = [];
        const proStatsMap = new Map<string, Professional>();
        const pendingApprovals: PendingApproval[] = [];
        const simulationMap = new Map<string, SimulationResult>();

        const filteredProfessionals = (professionalId !== undefined)
            ? professionals.filter(p => p.id === professionalId)
            : professionals;

        // If a specific professional is requested but not found in our list, return empty (fail-safe)
        if (professionalId && filteredProfessionals.length === 0) {
            return { commissions: [], professionalsStats: [], pendingApprovals: [], simulationData: [] };
        }

        // Initialize pro stats
        filteredProfessionals.forEach(pro => {
            proStatsMap.set(pro.id, {
                id: pro.id,
                name: pro.name,
                role: (pro.functions && pro.functions[0]) || 'Profissional',
                avatar: pro.avatar_url || '',
                commissionRate: parseFloat(pro.base_commission || '30'),
                totalEarned: 0,
                pendingAmount: 0,
                color: '#f59e0b' // Default color
            });
            simulationMap.set(pro.id, {
                id: pro.id,
                professionalId: pro.id,
                professional: pro.name,
                grossValue: 0,
                feesDeducted: 0,
                bonusesAdded: 0,
                adjustments: 0,
                netValue: 0
            });
        });

        // Track payments per professional (Category: Comissão, type: saida)
        const paymentsMap = new Map<string, number>();
        transactions.forEach(t => {
            // Check for both 'Comissão' and 'Pagamento de Comissão' for compatibility
            if (t.type === 'saida' && (t.category === 'Comissão' || t.category === 'Pagamento de Comissão') && t.professional_id) {
                if (professionalId && t.professional_id !== professionalId) return;
                const val = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
                paymentsMap.set(t.professional_id, (paymentsMap.get(t.professional_id) || 0) + (val || 0));
            }
        });

        // Calculate commissions from transactions
        transactions.forEach(t => {
            if (t.type === 'entrada' && t.status === 'pago') {
                const items = (t.items_json as any[]) || [];
                const client = clients.find(c => c.id === t.client_id);
                const date = t.created_at ? t.created_at.split('T')[0] : '';

                items.forEach((item, index) => {
                    // Try to find professional by name if not in transaction directly
                    // Note: CashFlow stores professional name in item.professional
                    const itemPro = filteredProfessionals.find(p => p.name === item.professional);
                    if (itemPro) {
                        let rate = 30; // Default fallback

                        if (item.commissionPercentage !== undefined) {
                            rate = item.commissionPercentage;
                        } else {
                            // Fallback: Try to find service by title to get current commission percentage
                            const service = services.find(s => s.title === item.title);
                            if (service && service.commission_percentage !== undefined && service.commission_percentage !== null) {
                                rate = service.commission_percentage;
                            } else {
                                // Fallback: Professional's base commission
                                rate = parseFloat(itemPro.base_commission || '30');
                            }
                        }

                        const commissionValue = (item.price * rate) / 100;

                        const commInfo: Commission = {
                            id: `${t.id}-${index}`,
                            professionalId: itemPro.id,
                            professionalName: itemPro.name,
                            professionalRole: (itemPro.functions && itemPro.functions[0]) || 'Profissional',
                            professionalAvatar: itemPro.avatar_url || '',
                            service: item.title,
                            client: client?.name || 'Cliente Externo',
                            date: (t as any).date || (t.created_at ? t.created_at.split('T')[0] : ''),
                            serviceValue: item.price,
                            commissionPercent: rate,
                            commissionValue: commissionValue,
                            status: 'pending', // We'll determine status below
                            transactionId: t.id,
                            isDiscounted: (t.discount || 0) > 0,
                            discountValue: t.discount || 0
                        };
                        allCommissions.push(commInfo);

                        // Se a transação teve desconto na recepção, joga para aprovação!
                        if (commInfo.isDiscounted && commInfo.status === 'pending') {
                            // Pra não duplicar as aprovações pendentes (caso tenham 2 profissionais no item)
                            // Adicionamos no array de Aprovação
                            pendingApprovals.push({
                                id: `disc-${t.id}-${itemPro.id}`,
                                professional: itemPro.name,
                                professionalId: itemPro.id,
                                service: item.title,
                                reason: `Transação teve desconto de R$ ${t.discount} aplicado pela recepção.`,
                                value: commissionValue, // O valor da comissão que está em jogo
                                recommendedAction: 'Descontar a comissão, deduzir do bruto ou aprovar pagamento integral.',
                                type: 'discount',
                                sourceId: t.id
                            });
                        }

                        const stats = proStatsMap.get(itemPro.id);
                        if (stats) {
                            stats.totalEarned += commissionValue;
                        }

                        // Populate simulation Data for GROSS and FEES
                        const sim = simulationMap.get(itemPro.id);
                        if (sim) {
                            sim.grossValue += commissionValue;
                        }
                    }
                });
            }
        });

        // Determine status based on confirmed batches
        const paidCommissionIds = new Set<string>();
        const requestedCommissionIds = new Set<string>();

        batches.forEach(b => {
            const ids = b.data?.commissionIds || [];
            if (b.status === 'paid') {
                ids.forEach((id: string) => paidCommissionIds.add(id));
            } else if (b.status === 'pending_collaborator') {
                ids.forEach((id: string) => requestedCommissionIds.add(id));
            }
        });

        allCommissions.forEach(c => {
            if (paidCommissionIds.has(c.id)) {
                c.status = 'paid';
            } else if (requestedCommissionIds.has(c.id)) {
                // @ts-ignore - custom status for internal UI
                c.status = 'requested';
            } else {
                c.status = 'pending';
                const stats = proStatsMap.get(c.professionalId);
                if (stats) stats.pendingAmount += c.commissionValue;
            }
        });

        console.log("Commission Status Logic Finished", {
            totalCommissions: allCommissions.length,
            paid: allCommissions.filter(c => c.status === 'paid').length
        });

        // 2) Load vales (adiantamentos) into PendingApprovals and Adjustments
        advances.forEach(adv => {
            // Include only advances from current professionals
            if (proStatsMap.has(adv.professional_id)) {
                pendingApprovals.push({
                    id: `adv-${adv.id}`,
                    professionalId: adv.professional_id,
                    professional: adv.professional?.name || 'Profissional',
                    service: 'Adiantamento / Vale',
                    reason: `Vale solicitado: ${adv.reason || 'Sem motivo'}. Status: ${adv.status}`,
                    value: -(adv.amount),
                    recommendedAction: adv.status === 'pending' ? 'Aprovar o vale para descontar no fechamento.' : 'Desconto confirmado.',
                    type: 'advance',
                    sourceId: adv.id
                });

                // If it's approved, automatically decrement from sim adjustments
                if (adv.status === 'approved') {
                    const sim = simulationMap.get(adv.professional_id);
                    if (sim) {
                        sim.adjustments -= adv.amount;
                    }
                }
            }
        });

        // 3) Finalize Simulation NET values
        const simulationData = Array.from(simulationMap.values()).map(sim => {
            sim.netValue = sim.grossValue - sim.feesDeducted + sim.bonusesAdded + sim.adjustments;
            return sim;
        }).filter(sim => sim.grossValue > 0 || Math.abs(sim.adjustments) > 0); // only show pros with data

        return {
            commissions: allCommissions,
            professionalsStats: Array.from(proStatsMap.values()),
            pendingApprovals,
            simulationData
        };
    }, [transactions, professionals, clients, advances, loading, professionalId, filterMonth]);

    const [error, setError] = useState<string | null>(null);

    const payCommissions = async (professionalId: string, amount: number, method: string, description?: string) => {
        console.log(`payCommissions called for ${professionalId} with amount ${amount}`);
        const pro = professionals.find(p => p.id === professionalId);
        if (!pro) {
            const msg = 'Profissional não encontrado para pagamento';
            console.error(msg);
            setError(msg);
            return null;
        }

        const newTransaction: Database['public']['Tables']['transactions']['Insert'] = {
            type: 'saida',
            description: description || `Pagamento de Comissão: ${pro.name}`,
            category: 'Pagamento de Comissão',
            amount: amount,
            payment_method: method,
            status: 'pago',
            professional_id: professionalId,
            created_at: new Date().toISOString()
        };

        console.log("Sending new transaction to addTransaction:", newTransaction);
        const result = await addTransaction(newTransaction);
        if (!result) {
            console.error("addTransaction returned null for payment");
        } else {
            console.log("Payment transaction added successfully:", result);
        }
        return result;
    };

    const executeSmartClosing = async (selectedIds?: string[]) => {
        console.log("executeSmartClosing started with IDs:", selectedIds);
        try {
            setError(null);
            
            let dataToProcess: { professionalId: string, professional: string, netValue: number }[] = [];

            if (!selectedIds || selectedIds.length === 0) {
                console.log("No selected IDs, processing all simulationData:", commissionsData.simulationData);
                dataToProcess = commissionsData.simulationData;
            } else {
                const aggregation: Record<string, { id: string, name: string, total: number }> = {};
                
                selectedIds.forEach(id => {
                    // Match by direct ID or by professionalId-prefix
                    const sim = commissionsData.simulationData.find(s => s.id === id || id.startsWith(s.id + '-'));
                    if (sim) {
                        if (!aggregation[sim.id]) {
                            aggregation[sim.id] = { id: sim.id, name: sim.professional, total: sim.netValue };
                        }
                    } else {
                        console.warn(`No simulation data found for ID: ${id}`);
                    }
                });

                dataToProcess = Object.values(aggregation).map(a => ({
                    professionalId: a.id,
                    professional: a.name,
                    netValue: a.total
                }));
            }

            console.log("Data to process for liquidation:", dataToProcess);

            if (dataToProcess.length === 0) {
                const msg = "Nenhum dado financeiro encontrado para liquidar.";
                console.warn(msg);
                setError(msg);
                return false;
            }

            let processedCount = 0;
            for (const sim of dataToProcess) {
                if (sim.netValue > 0) {
                    console.log(`Processing liquidation for ${sim.professional}: R$ ${sim.netValue}`);
                    const payResult = await payCommissions(sim.professionalId, sim.netValue, 'PIX / Transferência');
                    
                    if (payResult) {
                        processedCount++;
                        // Mark advances as paid
                        const { error: advError } = await supabase
                            .from('advance_requests')
                            .update({ status: 'paid' })
                            .eq('professional_id', sim.professionalId)
                            .eq('status', 'approved');
                        
                        if (advError) console.error("Error updating advances:", advError);
                    }
                } else {
                    console.log(`Skipping ${sim.professional} because netValue is ${sim.netValue}`);
                }
            }

            console.log(`Liquidation finished. Processed ${processedCount} professionals.`);
            return processedCount > 0;
        } catch (err: any) {
            setError(err.message || 'Erro ao executar o fechamento inteligente');
            return false;
        }
    };

    const confirmPayment = async (batchId: string) => {
        try {
            setError(null);
            
            // 1. Atualizar o status do lote para 'paid'
            const { error: batchError } = await supabase
                .from('commission_batches')
                .update({ status: 'paid', confirmed_at: new Date().toISOString() })
                .eq('id', batchId);

            if (batchError) throw batchError;

            // 2. Localizar o lote para criar a transação de pagamento de comissão no histórico
            const batch = batches.find(b => b.id === batchId);
            if (batch && batch.data) {
                // O gerente já enviou a solicitação de liquidação. Quando o colaborador confirma, 
                // vamos registrar na tabela transactions como 'Pago' e o valor.
                const { professionalId, amount } = batch.data;
                await payCommissions(professionalId, amount, 'PIX / Transferência (Confirmado App)');
            }

            return true;
        } catch (err: any) {
            setError(err.message || 'Erro ao confirmar recebimento');
            return false;
        }
    };

    return {
        ...commissionsData,
        loading,
        error,
        payCommissions,
        executeSmartClosing,
        confirmPayment,
        batches,
        refresh: () => { } // Refresh is handled by useTransactions auto-subscription
    };
};
