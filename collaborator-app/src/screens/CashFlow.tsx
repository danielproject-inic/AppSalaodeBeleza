import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTransactions } from '../hooks/useTransactions';
import { useBills } from '../hooks/useBills';
import { useAppointments } from '../hooks/useAppointments';
import { useServices, ServiceWithPros } from '../hooks/useServices';
import { useProfessionals } from '../hooks/useProfessionals';
import { useClients } from '../hooks/useClients';
import { Database } from '../lib/database.types';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { supabase } from '../lib/supabase';
import { useAdvanceRequests } from '../hooks/useAdvanceRequests';
import { useCashSessions } from '../hooks/useCashSessions';
import CashReports from '../../../components/CashReports';


// --- Interfaces ---
interface Transaction {
    id: string;
    type: 'entrada' | 'saida' | 'conta' | 'vale';
    description: string;
    category: string;
    amount: number;
    paymentMethod: string;
    time: string;
    status: 'pago' | 'pendente' | 'cancelado';
    client?: string;
    professional?: string;
    discount?: number;
    items?: ServiceItem[];
    observation?: string;
    cash_session_id?: string | null;
    date: string;
}

interface ServiceItem {
    id: string;
    title: string;
    price: number;
    professional?: string;
    allowedPros?: string[];
    commissionPercentage?: number;
    startTime?: string;
    endTime?: string;
    scheduledDate?: string;
    servicoIniciadoAt?: string;
    is_variable_price?: boolean;
}

interface Bill {
    id: string;
    description: string;
    supplier: string;
    amount: number;
    dueDate: string;
    status: 'pendente' | 'vencida' | 'paga';
    category: string;
}

interface ScheduledClient {
    id: string;
    name: string;
    avatar?: string;
    service: string;
    professional: string;
    time: string;
    endTime: string;
    amount: number;
    status: 'aguardando' | 'em_atendimento' | 'concluido' | 'pago' | 'confirmed' | 'pending';
    serviceId?: string;
    date?: string;
    servicoIniciadoAt?: string;
}

// Local Service interface for flattened UI usage
interface ServiceFlat {
    id: string;
    title: string;
    cat: string;
    price: number;
    allowedPros: string[];
    commissionPercentage?: number | null;
    is_variable_price?: boolean;
}

// Helper for safe localStorage access
const safeGetItem = (key: string, defaultVal: string) => {
    try {
        if (typeof window === 'undefined') return defaultVal;
        return localStorage.getItem(key) || defaultVal;
    } catch (e) {
        console.warn('LocalStorage access failed', e);
        return defaultVal;
    }
};

const CashFlow = () => {
    // --- Helpers ---
    const getTodayDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // --- State ---
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    const adjustDate = (days: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setSelectedDate(newDate);
    };

    // --- Supabase Hooks ---
    const { transactions: dbTransactions, addTransaction, loading: loadingTrans } = useTransactions();
    const { bills: dbBills, addBill, updateBill: updateDbBill, loading: loadingBills } = useBills();
    // OPTIMIZATION: Fetch appointments for the selected date
    const { appointments: dbAppointments, updateAppointment } = useAppointments(`${selectedDate}T00:00:00`, `${selectedDate}T23:59:59`);
    const { services: dbServices } = useServices();
    const { professionals: dbProfessionals } = useProfessionals();
    const { clients: dbClients } = useClients();
    const { requests: advanceRequests, updateRequestStatus } = useAdvanceRequests();

    // --- UI State ---
    const { activeSession, sessionsHistory, openSession, closeSession, loading: sessionsLoading } = useCashSessions();
    const isCaixaOpen = activeSession !== null;
    const isSessionFromPreviousDay = useMemo(() => {
        if (!activeSession) return false;
        const openedDate = new Date(activeSession.opened_at).toLocaleDateString('en-CA'); // formato YYYY-MM-DD
        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
        return openedDate < todayStr;
    }, [activeSession]);

    useEffect(() => {
        if (!sessionsLoading && activeSession) {
            const openedDate = new Date(activeSession.opened_at).toLocaleDateString('en-CA');
            const todayStr = getTodayDate();
            if (openedDate < todayStr) {
                setSelectedDate(openedDate);
            }
        }
    }, [activeSession, sessionsLoading]);

    const operador = activeSession ? (activeSession.opened_by_profile as any)?.full_name || 'Operador' : '';
    const valorInicial = activeSession ? activeSession.opening_balance.toString() : '0';

    const [valorInicialInput, setValorInicialInput] = useState('0');
    const [actualClosingBalanceInput, setActualClosingBalanceInput] = useState('');

    const [modalMode, setModalMode] = useState<'none' | 'open' | 'close' | 'payment' | 'transaction' | 'bill' | 'vale' | 'add_service' | 'resolve_pending'>('none');

    const { profile, role, professionalId } = useCurrentUserRef();
    const isAdmin = role === 'admin' || role === 'manager' || role === 'receptionist';
    const pinRef = useRef<HTMLInputElement>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinStatus, setPinStatus] = useState<'neutral' | 'success' | 'error'>('neutral');
    const [isCreatingPin, setIsCreatingPin] = useState(false);
    const [success, setSuccess] = useState<{ title: string, message: string } | null>(null);

    const [closureObservations, setClosureObservations] = useState('');
    const [cartItems, setCartItems] = useState<ServiceItem[]>([]);

    // Transaction Form
    const [transType, setTransType] = useState<'entrada' | 'saida'>('entrada');
    const [transDesc, setTransDesc] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [transMethod, setTransMethod] = useState('');
    const [transDiscount, setTransDiscount] = useState('');
    const [transProf, setTransProf] = useState(''); // Main professional

    // Payment specific
    const [selectedClient, setSelectedClient] = useState<ScheduledClient | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');

    const [quickReason, setQuickReason] = useState('');
    const [activeTab, setActiveTab] = useState<'agendados' | 'recebimentos' | 'saidas' | 'contas' | 'pendentes' | 'historico' | 'relatorios'>('agendados');
    const [showPinEntry, setShowPinEntry] = useState(false);

    // Payment Finalization State
    const [paymentStage, setPaymentStage] = useState<'selection' | 'confirmation'>('selection');
    const [paymentObservation, setPaymentObservation] = useState('');
    const [paymentDiscountPercent, setPaymentDiscountPercent] = useState('');
    const [cashReceived, setCashReceived] = useState('');
    const [isWalkIn, setIsWalkIn] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [pendingDueDate, setPendingDueDate] = useState('');
    const [selectedPendingTransaction, setSelectedPendingTransaction] = useState<any>(null);
    const [resolvePaymentMethod, setResolvePaymentMethod] = useState('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ PIX: '', Dinheiro: '', Crédito: '', Débito: '', Pendente: '' });
    const [tempSelPro, setTempSelPro] = useState<string>('');
    const [tempSelService, setTempSelService] = useState<ServiceFlat | null>(null);

    const [managerEmail, setManagerEmail] = useState('');
    const [managerPassword, setManagerPassword] = useState('');
    const [isDiscountAuthorized, setIsDiscountAuthorized] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isValidatingAuth, setIsValidatingAuth] = useState(false);

    useEffect(() => {
        setIsDiscountAuthorized(false);
        setAuthError('');
    }, [paymentDiscountPercent]);

    const needsManagerAuth = useMemo(() => {
        const hasDiscount = (parseFloat(paymentDiscountPercent) || 0) > 0;
        const isUserNotManager = !['admin', 'manager'].includes(role || '');
        return hasDiscount && isUserNotManager;
    }, [paymentDiscountPercent, role]);

    const handleValidateManagerAuth = async () => {
        if (!managerEmail.trim() || !managerPassword.trim()) {
            setAuthError('Preencha o e-mail e a senha do gerente.');
            return;
        }
        setIsValidatingAuth(true);
        setAuthError('');
        try {
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL || '',
                import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                { auth: { persistSession: false } }
            );
            const { data: authData, error: authErr } = await tempSupabase.auth.signInWithPassword({
                email: managerEmail,
                password: managerPassword
            });
            if (authErr) {
                setAuthError('Credenciais inválidas.');
                setIsDiscountAuthorized(false);
                return;
            }
            if (authData?.user) {
                const { data: profileData, error: profileErr } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', authData.user.id)
                    .single();
                
                if (profileErr || !profileData || !['admin', 'manager'].includes(profileData.role || '')) {
                    setAuthError('Este usuário não possui permissão de gerente.');
                    setIsDiscountAuthorized(false);
                } else {
                    setIsDiscountAuthorized(true);
                    setAuthError('');
                }
            }
        } catch (err: any) {
            setAuthError('Erro ao validar: ' + err.message);
            setIsDiscountAuthorized(false);
        } finally {
            setIsValidatingAuth(false);
        }
    };

    // --- Mapping Logic ---
    const professionalsList = useMemo(() => dbProfessionals.map(p => p.name), [dbProfessionals]);

    const allClientsFormatted = useMemo(() => dbClients.map(c => ({ id: c.id, name: c.name })), [dbClients]);

    const filteredClients = useMemo(() => {
        const query = clientSearchQuery.trim().toLowerCase();
        const filtered = allClientsFormatted.filter(c => 
            c.name.toLowerCase().includes(query)
        );
        if (selectedClient && !filtered.some(c => c.id === selectedClient.id)) {
            const found = allClientsFormatted.find(c => c.id === selectedClient.id);
            if (found) {
                filtered.unshift(found);
            }
        }
        return filtered;
    }, [allClientsFormatted, clientSearchQuery, selectedClient]);

    const servicesWithPros: ServiceFlat[] = useMemo(() => {
        return dbServices.map(s => {
            // Fix: Use the typed ServiceWithPros structure
            const specificPros = s.professionals?.map(p => p.professional?.name).filter(Boolean) as string[];

            return {
                id: s.id,
                title: s.title,
                cat: s.category || 'Geral',
                price: s.price || 0,
                allowedPros: (specificPros && specificPros.length > 0) ? specificPros : professionalsList,
                commissionPercentage: s.commission_percentage,
                is_variable_price: s.is_variable_price || false
            };
        });
    }, [dbServices, professionalsList]);

    const scheduledClients: ScheduledClient[] = useMemo(() => {
        return dbAppointments.map(a => {
            const client = dbClients.find(c => c.id === a.client_id);
            const professional = dbProfessionals.find(p => p.id === a.professional_id);
            const service = dbServices.find(s => s.id === a.service_id);
            const startTime = new Date(a.start_time);

            return {
                id: a.id,
                name: client?.name || 'Cliente Externo',
                avatar: client?.avatar_url || undefined,
                service: service?.title || 'Serviço',
                professional: professional?.name || 'Não atribuído',
                time: startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                endTime: (() => {
                    const end = a.end_time ? new Date(a.end_time) : new Date(startTime.getTime() + (service?.duration_minutes || 60) * 60000);
                    return end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                })(),
                amount: service?.price || 0,
                status: a.status as ScheduledClient['status'],
                serviceId: a.service_id || undefined,
                // Fix: Use local date for comparison to match getTodayDate()
                date: (() => {
                    if (!startTime || isNaN(startTime.getTime())) return '';
                    return `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`;
                })(),
                servicoIniciadoAt: a.servico_iniciado_at || undefined
            };
        });
    }, [dbAppointments, dbClients, dbProfessionals, dbServices]);

    const hasPendingCheckouts = useMemo(() => {
        if (!isSessionFromPreviousDay || !activeSession) return false;
        const openedDate = new Date(activeSession.opened_at).toLocaleDateString('en-CA');
        return scheduledClients.some(client => client.date === openedDate && client.status === 'em_atendimento');
    }, [scheduledClients, isSessionFromPreviousDay, activeSession]);


    const transactions: Transaction[] = useMemo(() => {
        let filtered = dbTransactions;

        // Filter by professional if not admin/manager/receptionist
        if (!isAdmin && professionalId) {
            filtered = dbTransactions.filter(t => t.professional_id === professionalId);
        }

        return filtered.map(t => {
            const client = dbClients.find(c => c.id === t.client_id);
            const professional = dbProfessionals.find(p => p.id === t.professional_id);
            const createdAt = new Date(t.created_at || '');

            return {
                id: t.id,
                type: t.type as Transaction['type'],
                description: t.description || 'Transação',
                category: t.category || '',
                amount: t.amount,
                paymentMethod: t.payment_method || 'N/A',
                time: createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                status: (t.status as Transaction['status']) || 'pago',
                client: client?.name,
                professional: professional?.name,
                discount: t.discount || 0,
                items: (t.items_json as any) || [],
                observation: t.observation || '',
                cash_session_id: t.cash_session_id,
                date: createdAt.toLocaleDateString('pt-BR')
            };
        });
    }, [dbTransactions, dbClients, dbProfessionals, isAdmin, professionalId]);

    const bills: Bill[] = useMemo(() => {
        return dbBills.map(b => ({
            id: b.id,
            description: b.description,
            supplier: b.supplier || 'N/A',
            amount: b.amount,
            dueDate: b.due_date,
            status: (b.status as Bill['status']) || 'pendente',
            category: b.category || 'Geral'
        }));
    }, [dbBills]);

    const recebimentosAgrupados = useMemo(() => {
        const entries = transactions.filter(t => t.type === 'entrada');
        const groups: { date: string; items: Transaction[] }[] = [];
        entries.forEach(t => {
            const dateKey = t.date || 'Sem data';
            let group = groups.find(g => g.date === dateKey);
            if (!group) {
                group = { date: dateKey, items: [] };
                groups.push(group);
            }
            group.items.push(t);
        });
        return groups;
    }, [transactions]);

    // --- Helpers ---
    const parseCurrency = (val: string) => parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const getCurrentTime = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Session specific transactions for balance calculations
    const sessionTransactions = useMemo(() => {
        if (!activeSession) return [];
        return transactions.filter(t => t.cash_session_id === activeSession.id);
    }, [transactions, activeSession]);

    // Computed Totals
    const totalEntradas = sessionTransactions.filter(t => t.type === 'entrada' && t.status === 'pago').reduce((acc, t) => acc + t.amount, 0);
    const totalSaidas = sessionTransactions.filter(t => ['saida', 'conta', 'vale'].includes(t.type) && t.status === 'pago').reduce((acc, t) => acc + t.amount, 0);
    const saldoAtual = parseCurrency(valorInicial) + totalEntradas - totalSaidas;

    // --- Actions ---
    const resetForm = () => {
        setTransDesc('');
        setTransAmount('');
        setTransMethod('');
        setTransDiscount('');
        setTransProf('');
        setCartItems([]);
        setSelectedClient(null);
        setServiceSearch('');
        setCashReceived('');
        setClientSearchQuery('');
        setPendingDueDate('');
        setSelectedPendingTransaction(null);
        setResolvePaymentMethod('');
        setManagerEmail('');
        setManagerPassword('');
        setIsDiscountAuthorized(false);
        setAuthError('');
        setIsValidatingAuth(false);
        setIsSplitPayment(false);
        setSplitAmounts({ PIX: '', Dinheiro: '', Crédito: '', Débito: '', Pendente: '' });
    };

    const handleOpenPayment = (client: ScheduledClient) => {
        setSelectedClient(client);
        // Initialize cart with the scheduled service and assigned professional
        const serviceDetails = servicesWithPros.find(s => s.title === client.service);
        setCartItems([{
            id: client.serviceId || '',
            title: client.service,
            price: client.amount,
            professional: client.professional,
            allowedPros: serviceDetails?.allowedPros, // Pass allowed pros for the scheduled service
            commissionPercentage: serviceDetails?.commissionPercentage || 0,
            startTime: client.time,
            endTime: client.endTime,
            scheduledDate: client.date,
            servicoIniciadoAt: client.servicoIniciadoAt,
            is_variable_price: serviceDetails?.is_variable_price
        }]);
        setTransProf(client.professional); // Set summary professional
        setPaymentStage('selection'); // Reset stage
        setPaymentObservation('');
        setPaymentDiscountPercent('');
        setIsWalkIn(false); // Not a walk-in
        setModalMode('payment');
    };

    const handleAddServiceToCart = (service: any) => {
        // Default to the first allowed professional, or "Various" if none match (fallback)
        const defaultPro = service.allowedPros && service.allowedPros.length > 0 ? service.allowedPros[0] : (transProf || professionalsList[0]);

        setCartItems(prev => [...prev, {
            id: service.id,
            title: service.title,
            price: service.price,
            professional: defaultPro,
            allowedPros: service.allowedPros, // Pass allowed list to item
            commissionPercentage: service.commissionPercentage || 0,
            is_variable_price: service.is_variable_price
        }]);
        setServiceSearch('');
    };


    const handleOpenAddService = () => {
        setTempSelPro(transProf || ''); // Initialize with selected professional if any
        setTempSelService(null);
        setModalMode('add_service');
    };

    const handleConfirmAddService = () => {
        if (!tempSelService || !tempSelPro) return;

        const sWithPros = tempSelService ? servicesWithPros.find(s => s.id === tempSelService.id) : null;

        setCartItems(prev => [...prev, {
            id: tempSelService.id,
            title: tempSelService.title,
            price: tempSelService.price,
            professional: tempSelPro,
            allowedPros: sWithPros?.allowedPros, // Keep reference
            commissionPercentage: sWithPros?.commissionPercentage || 0,
            is_variable_price: sWithPros?.is_variable_price
        }]);
        setModalMode('payment'); // Go back to payment
    };

    // Filter services based on selected Pro in sub-modal
    const availableServicesForPro = servicesWithPros.filter(s =>
        !tempSelPro || (s.allowedPros && s.allowedPros.includes(tempSelPro))
    );

    const handleUpdateItemProfessional = (index: number, newPro: string) => {
        setCartItems(prev => prev.map((item, i) => i === index ? { ...item, professional: newPro } : item));
    };

    const handleUpdateItemPrice = (index: number, newPrice: number) => {
        setCartItems(prev => prev.map((item, i) => i === index ? { ...item, price: newPrice } : item));
    };

    const handleProcessPayment = async () => {
        if (isProcessingPayment) return;
        
        if (needsManagerAuth && !isDiscountAuthorized) {
            alert('A autorização do gerente é obrigatória para conceder desconto.');
            return;
        }

        setIsProcessingPayment(true);

        try {
            const getTransactionCreatedAt = () => {
                if (isSessionFromPreviousDay && activeSession) {
                    const sessionDate = new Date(activeSession.opened_at);
                    const now = new Date();
                    sessionDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                    return sessionDate.toISOString();
                }
                return new Date().toISOString();
            };

            const subtotal = cartItems.reduce((acc, i) => acc + i.price, 0);
            const percent = parseFloat(paymentDiscountPercent) || 0;
            const discount = (subtotal * percent) / 100;
            const total = Math.max(0, subtotal - discount);

            // Get unique professionals involved
            const involvedProsNames = Array.from(new Set(cartItems.map(i => i.professional || transProf || 'N/A')));

            // Find professional IDs if possible (simplified here to use the first one as primary)
            const primaryPro = dbProfessionals.find(p => p.name === involvedProsNames[0]);
            const dbClient = dbClients.find(c => c.name === selectedClient?.name);

            if (isSplitPayment) {
                const activeMethods = Object.entries(splitAmounts)
                    .map(([method, val]) => ({ method, amount: parseFloat(val) || 0 }))
                    .filter(item => item.amount > 0);

                if (activeMethods.length === 0) {
                    alert('Por favor, informe o valor para pelo menos uma forma de pagamento.');
                    setIsProcessingPayment(false);
                    return;
                }

                const valDinheiro = parseFloat(splitAmounts.Dinheiro) || 0;
                if (valDinheiro > 0) {
                    const received = parseFloat(cashReceived) || 0;
                    if (received < valDinheiro) {
                        alert('O valor recebido em dinheiro é menor que a parte a ser paga em dinheiro.');
                        setIsProcessingPayment(false);
                        return;
                    }
                }

                const valPendente = parseFloat(splitAmounts.Pendente) || 0;
                if (valPendente > 0) {
                    if (!selectedClient || !dbClient) {
                        alert('Para pagamentos pendentes, é obrigatório selecionar um cliente cadastrado.');
                        setIsProcessingPayment(false);
                        return;
                    }
                    if (!pendingDueDate) {
                        alert('Por favor, selecione a data prometida para o pagamento.');
                        setIsProcessingPayment(false);
                        return;
                    }
                }

                // First active method is the parent transaction
                const firstMethod = activeMethods[0];

                let parentObs = paymentObservation;
                if (firstMethod.method === 'Dinheiro') {
                    const received = parseFloat(cashReceived) || 0;
                    const change = Math.max(0, received - firstMethod.amount);
                    const cashDetails = `[Dinheiro Recebido: ${formatCurrency(received)} | Troco: ${formatCurrency(change)}]`;
                    parentObs = parentObs ? `${parentObs} ${cashDetails}` : cashDetails;
                } else if (firstMethod.method === 'Pendente') {
                    const dueDateInfo = `[Vencimento: ${pendingDueDate}]`;
                    parentObs = parentObs ? `${dueDateInfo} ${parentObs}` : dueDateInfo;
                }
                parentObs = `[Pgto Dividido - Principal] ${parentObs}`;

                const finalCartItems = cartItems.map(item => ({
                    ...item,
                    servicoTerminadoAt: getTransactionCreatedAt()
                }));

                const parentTransData: any = {
                    type: 'entrada',
                    description: selectedClient ? `Pgto: ${selectedClient.name}` : transDesc || 'Venda Avulsa',
                    category: 'Serviço',
                    amount: firstMethod.amount,
                    payment_method: firstMethod.method,
                    status: firstMethod.method === 'Pendente' ? 'pendente' : 'pago',
                    client_id: dbClient?.id || null,
                    professional_id: primaryPro?.id || null,
                    discount: discount, // Full discount goes to parent
                    items_json: finalCartItems, // Full items go to parent
                    observation: parentObs,
                    cash_session_id: activeSession?.id || null,
                    created_at: getTransactionCreatedAt()
                };

                const parentTransResult = await addTransaction(parentTransData);
                if (!parentTransResult) {
                    alert('Erro ao salvar transação principal.');
                    setIsProcessingPayment(false);
                    return;
                }

                const parentId = parentTransResult.id;

                // Create child transactions for remaining active methods
                for (let i = 1; i < activeMethods.length; i++) {
                    const childMethod = activeMethods[i];
                    let childObs = `[Pgto Dividido - Vinculado ao ID: ${parentId}]`;
                    if (childMethod.method === 'Dinheiro') {
                        const received = parseFloat(cashReceived) || 0;
                        const change = Math.max(0, received - childMethod.amount);
                        const cashDetails = `[Dinheiro Recebido: ${formatCurrency(received)} | Troco: ${formatCurrency(change)}]`;
                        childObs = `${childObs} ${cashDetails}`;
                    } else if (childMethod.method === 'Pendente') {
                        const dueDateInfo = `[Vencimento: ${pendingDueDate}]`;
                        childObs = `${dueDateInfo} ${childObs}`;
                    }

                    const childTransData: any = {
                        type: 'entrada',
                        description: selectedClient ? `Pgto: ${selectedClient.name} (Parte)` : transDesc || 'Venda Avulsa (Parte)',
                        category: 'Serviço',
                        amount: childMethod.amount,
                        payment_method: childMethod.method,
                        status: childMethod.method === 'Pendente' ? 'pendente' : 'pago',
                        client_id: dbClient?.id || null,
                        professional_id: primaryPro?.id || null,
                        discount: 0,
                        items_json: [], // Empty items_json to prevent double commissions
                        observation: childObs,
                        cash_session_id: activeSession?.id || null,
                        created_at: getTransactionCreatedAt()
                    };

                    await addTransaction(childTransData);
                }

                if (selectedClient && selectedClient.id) {
                    const hasPendente = activeMethods.some(m => m.method === 'Pendente');
                    await updateAppointment(selectedClient.id, {
                        status: hasPendente ? 'concluido' : 'pago',
                        servico_terminado_at: getTransactionCreatedAt()
                    });
                }

            } else {
                // Single Payment Mode
                if (transMethod === 'Dinheiro') {
                    const received = parseFloat(cashReceived) || 0;
                    if (received < total) {
                        alert('O valor recebido em dinheiro é menor que o total líquido.');
                        setIsProcessingPayment(false);
                        return;
                    }
                }

                if (transMethod === 'Pendente') {
                    if (!selectedClient || !dbClient) {
                        alert('Para pagamentos pendentes, é obrigatório selecionar um cliente cadastrado.');
                        setIsProcessingPayment(false);
                        return;
                    }
                    if (!pendingDueDate) {
                        alert('Por favor, selecione a data prometida para o pagamento.');
                        setIsProcessingPayment(false);
                        return;
                    }
                }

                let finalObs = paymentObservation;
                if (transMethod === 'Dinheiro') {
                    const received = parseFloat(cashReceived) || 0;
                    const change = Math.max(0, received - total);
                    const cashDetails = `[Dinheiro Recebido: ${formatCurrency(received)} | Troco: ${formatCurrency(change)}]`;
                    finalObs = finalObs ? `${finalObs} ${cashDetails}` : cashDetails;
                } else if (transMethod === 'Pendente') {
                    const dueDateInfo = `[Vencimento: ${pendingDueDate}]`;
                    finalObs = finalObs ? `${dueDateInfo} ${finalObs}` : dueDateInfo;
                }

                const finalCartItems = cartItems.map(item => ({
                    ...item,
                    servicoTerminadoAt: getTransactionCreatedAt()
                }));

                const newTrans: any = {
                    type: 'entrada',
                    description: selectedClient ? `Pgto: ${selectedClient.name}` : transDesc || 'Venda Avulsa',
                    category: 'Serviço',
                    amount: total,
                    payment_method: transMethod,
                    status: transMethod === 'Pendente' ? 'pendente' : 'pago',
                    client_id: dbClient?.id || null,
                    professional_id: primaryPro?.id || null,
                    discount: discount,
                    items_json: finalCartItems,
                    observation: finalObs,
                    cash_session_id: activeSession?.id || null,
                    created_at: getTransactionCreatedAt()
                };

                await addTransaction(newTrans);

                if (selectedClient && selectedClient.id) {
                    await updateAppointment(selectedClient.id, {
                        status: transMethod === 'Pendente' ? 'concluido' : 'pago',
                        servico_terminado_at: getTransactionCreatedAt()
                    });
                }
            }

            setModalMode('none');
            resetForm();
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleMethodSelect = (method: string) => {
        setTransMethod(method);
        setPaymentStage('confirmation');
    };

    const handleWalkIn = () => {
        setTransType('entrada');
        setCartItems([]);
        setPaymentStage('selection');
        setPaymentObservation('');
        setPaymentDiscountPercent('');
        setSelectedClient(null); // Ensure no client is initially selected
        setClientSearchQuery('');
        setPendingDueDate('');
        setSelectedPendingTransaction(null);
        setResolvePaymentMethod('');
        setIsWalkIn(true); // Enable walk-in mode
        setModalMode('payment');
    };

    const extractDueDate = (obs: string | null) => {
        if (!obs) return null;
        const match = obs.match(/\[Vencimento:\s*([^\]]+)\]/);
        return match ? match[1] : null;
    };

    const handleSendWhatsAppReminder = (t: any) => {
        const client = dbClients.find(c => c.name === t.client || c.id === t.client_id);
        if (!client) {
            alert('Não foi possível localizar o cadastro deste cliente.');
            return;
        }

        const clientName = client.name;
        const phone = client.phone ? client.phone.replace(/\D/g, '') : '';
        if (!phone) {
            alert('Este cliente não possui telefone cadastrado.');
            return;
        }

        const amountFormatted = formatCurrency(t.amount);
        const dueDate = extractDueDate(t.observation);
        const dueDateStr = dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'breve';

        const message = `Olá, ${clientName}! Esperamos que esteja bem. 🌸\n\nPassando para lembrar que consta em nosso sistema um pagamento pendente no valor de ${amountFormatted}, com vencimento em ${dueDateStr}. Como prefere realizar o pagamento? Se desejar, podemos gerar um Pix Copia e Cola para facilitar!\n\nAgradecemos a preferência!\n\nAtenciosamente, Salon Suite Pro`;

        let cleanPhone = phone;
        if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }

        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleResolvePendingPayment = async () => {
        if (!selectedPendingTransaction) return;
        if (!resolvePaymentMethod) {
            alert('Por favor, selecione a forma de pagamento.');
            return;
        }

        const { error } = await supabase
            .from('transactions')
            .update({
                status: 'pago',
                payment_method: resolvePaymentMethod,
                created_at: new Date().toISOString(),
                cash_session_id: activeSession?.id || null
            })
            .eq('id', selectedPendingTransaction.id);

        if (error) {
            alert('Erro ao dar baixa no pagamento: ' + error.message);
            return;
        }

        setModalMode('none');
        resetForm();
    };

    // Quick Op handled by Vale modal now

    const filteredServices = servicesWithPros.filter(s => s.title.toLowerCase().includes(serviceSearch.toLowerCase()));

    const handlePinChange = async (value: string) => {
        if (value.length > 4) return;
        setPinInput(value);
        setPinStatus('neutral');

        if (value.length === 4) {
            if (isCreatingPin) {
                // Save new PIN
                if (profile?.id) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ cash_pin: value })
                        .eq('id', profile.id);

                    if (!updateError) {
                    setPinStatus('success');
                    setTimeout(() => {
                        setIsCreatingPin(false);
                        setPinInput('');
                        setPinStatus('neutral');
                        setSuccess({
                            title: 'Senha Criada!',
                            message: 'Sua senha de acesso ao caixa foi configurada com sucesso.'
                        });
                    }, 1000);
                }
            }
        } else {
                // Verify PIN
                if (value === profile?.cash_pin) {
                    setPinStatus('success');
                    setTimeout(() => {
                        setValorInicialInput('0');
                        setModalMode('open');
                        setPinInput('');
                        setPinStatus('neutral');
                    }, 1000);
                } else {
                    setPinStatus('error');
                    setTimeout(() => {
                        setPinInput('');
                        setPinStatus('neutral');
                    }, 1000);
                }
            }
        }
    };

    // --- Components ---
    const PaymentMethodBtn = ({ method, icon, label, activeColor, borderColor }: { method: string, icon: string, label: string, activeColor: string, borderColor: string }) => (
        <button
            onClick={() => handleMethodSelect(method)}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group 
 ${transMethod === method
                    ? `bg-[#0f172a] ${borderColor} shadow-[0_0_20px_rgba(0,0,0,0.3)] scale-[1.05] z-10`
                    : `bg-[#111827]/40 border-white/5 hover:border-white/10 hover:bg-[#111827]/60`}`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-300
                ${transMethod === method ? activeColor + ' shadow-lg' : 'bg-white/5 text-white/20 group-hover:text-white/40'}`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors
                ${transMethod === method ? 'text-white' : 'text-white/30 group-hover:text-white/50'}`}>{label}</span>
            {transMethod === method && <div className={`absolute top-0 right-0 w-12 h-12 ${activeColor} opacity-10 blur-2xl rounded-full -mr-6 -mt-6`} />}
        </button>
    );

    return (
        <div className="flex h-full flex-col bg-transparent overflow-hidden text-white font-sans relative">

            {/* BACKGROUND AMBIENCE - Nordic Chic */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#2c3e50]/20 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#b87333]/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Offline Overlay - Dark Modal Style */}
            {!isCaixaOpen && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl">
                    <div
                        className="relative group mb-12 flex flex-col items-center cursor-pointer active:scale-95 transition-all duration-500"
                        onClick={() => {
                            if (!showPinEntry && !isCreatingPin && profile?.cash_pin) {
                                setShowPinEntry(true);
                                setTimeout(() => pinRef.current?.focus(), 100);
                            } else if (!profile?.cash_pin && !isCreatingPin) {
                                setIsCreatingPin(true);
                            } else {
                                pinRef.current?.focus();
                            }
                        }}
                    >
                        {/* THE RING - Reference 1 Parity */}
                        <div className={`w-56 h-56 rounded-full border-2 flex items-center justify-center relative transition-all duration-700 shadow-2xl
                            ${pinStatus === 'neutral' ? 'border-white/5 bg-[#1f2937]/50 ring-1 ring-white/10' :
                                pinStatus === 'success' ? 'border-[#10b981] bg-[#10b981]/10 shadow-[#10b981]/20' :
                                    'border-red-500 bg-red-500/10 shadow-red-200 ring-4 ring-red-500/10'}`}>

                            <span className={`material-symbols-outlined text-8xl transition-all duration-700 select-none
                                ${pinStatus === 'neutral' ? 'text-white/20' :
                                    pinStatus === 'success' ? 'text-emerald-500 scale-125 rotate-[-12deg]' :
                                        'text-red-500 scale-95'}`}>
                                {pinStatus === 'success' ? 'lock_open' : 'lock'}
                            </span>
                        </div>

                        {/* PIN Inputs (Dots) */}
                        {(showPinEntry || isCreatingPin) && (
                            <>
                                <p className="mt-8 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] animate-in fade-in slide-in- duration-700">
                                    {isCreatingPin ? 'Crie sua Senha' : 'Digite a Senha'}
                                </p>
                                <div className="mt-6 flex gap-4 animate-in fade-in slide-in- duration-700">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className={`size-4 rounded-full border-2 transition-all duration-300 
 ${pinInput.length > i ?
                                                (pinStatus === 'error' ? 'bg-red-500/100 border-red-500' : 'bg-[#1a252f] border-[#b87333] scale-125') :
                                                (pinInput.length === i ? 'bg-transparent border-[#b87333] animate-pulse scale-110 shadow-[0_0_10px_rgba(184,115,51,0.4)]' : 'bg-transparent border-slate-300')}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-full max-w-sm flex flex-col items-center gap-8">
                        {!showPinEntry && !isCreatingPin ? (
                            <button
                                onClick={() => {
                                    if (profile?.cash_pin) setShowPinEntry(true);
                                    else setIsCreatingPin(true);
                                    setTimeout(() => pinRef.current?.focus(), 100);
                                }}
                                className="px-12 py-6 bg-gradient-to-r from-[#b45309] to-[#d97706] text-white font-black tracking-[0.2em] uppercase hover:brightness-110 transition-all shadow-2xl rounded-2xl active:scale-95 text-sm"
                            >
                                {profile?.cash_pin ? 'ABRIR CAIXA' : 'CONFIGURAR ACESSO'}
                            </button>
                        ) : (
                            <div className="relative w-full px-12 flex flex-col items-center">
                                <input
                                    ref={pinRef}
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    value={pinInput}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePinChange(e.target.value)}
                                    autoFocus
                                    className="opacity-0 absolute inset-0 cursor-default"
                                />

                                {pinStatus === 'error' && (
                                    <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em] text-center animate-bounce">Senha Incorreta</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Forced Closure Overlay for Caixas left open on previous days */}
            {isCaixaOpen && isSessionFromPreviousDay && !hasPendingCheckouts && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl p-4 overflow-hidden">
                    <div className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-[#1e293b] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col p-6 md:p-8 space-y-4 md:space-y-6 custom-scrollbar">
                        <div className="text-center space-y-2">
                            <div className="size-20 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <span className="material-symbols-outlined text-4xl">priority_high</span>
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Bebas Neue' }}>
                                Caixa Pendente de Fechamento!
                            </h2>
                            <p className="text-white/40 text-xs font-bold leading-relaxed px-4 uppercase tracking-widest">
                                Há um caixa aberto do dia {new Date(activeSession.opened_at).toLocaleDateString('pt-BR')}. Você deve fechá-lo antes de continuar.
                            </p>
                        </div>

                        <div className="p-6 bg-[#0f172a] rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Aberto em</span>
                                <span className="text-xs font-bold text-white">
                                    {new Date(activeSession.opened_at).toLocaleDateString('pt-BR')} {new Date(activeSession.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Aberto por</span>
                                <span className="text-xs font-bold text-white">{(activeSession as any).opened_by_profile?.full_name || 'Operador'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest">Saldo Esperado</span>
                                <span className="text-xl font-mono font-black text-cyan-400">{formatCurrency(saldoAtual)}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2 block">Valor Real Físico em Caixa (Obrigatório)</label>
                                <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4 focus-within:border-cyan-500/30 transition-all shadow-inner">
                                    <span className="font-mono text-cyan-400 font-black text-xl">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={actualClosingBalanceInput}
                                        onChange={e => setActualClosingBalanceInput(e.target.value)}
                                        className="bg-transparent text-white outline-none w-full font-mono text-2xl font-black focus:ring-0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2 block">Notas de Encerramento (Obrigatório)</label>
                                <textarea
                                    value={closureObservations}
                                    onChange={e => setClosureObservations(e.target.value)}
                                    placeholder="Ex: Esqueci de fechar ontem. Saldo confere..."
                                    className="w-full bg-[#111827]/40 border border-white/5 rounded-2xl p-5 text-sm text-white/80 outline-none focus:border-cyan-500/30 transition-all min-h-[100px] resize-none"
                                />
                            </div>

                            <button
                                disabled={!closureObservations.trim() || !actualClosingBalanceInput}
                                onClick={async () => {
                                    if (activeSession && profile?.id) {
                                        const actualVal = parseFloat(actualClosingBalanceInput) || 0;
                                        await closeSession(activeSession.id, actualVal, saldoAtual, closureObservations, profile.id);
                                        setActualClosingBalanceInput('');
                                        setClosureObservations('');
                                        setShowPinEntry(false);
                                        setPinInput('');
                                        setPinStatus('neutral');
                                    }
                                }}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl 
                                    ${(!closureObservations.trim() || !actualClosingBalanceInput)
                                        ? 'bg-white/5 text-white/10 cursor-not-allowed opacity-60'
                                        : 'bg-rose-500 text-slate-900 hover:bg-rose-400 shadow-rose-500/20 active:scale-95'}`}
                            >
                                Confirmar Fechamento de Caixa do Dia Anterior
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area - Dark Glass */}
            <header className="px-8 py-6 flex flex-none items-center justify-between border-b border-white/5 bg-[#111827]/50 backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#1f2937] border border-white/5 shadow-xl">
                        <span className="material-symbols-outlined text-white text-3xl">account_balance_wallet</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight leading-none"> Fluxo de Caixa </h1>
                        <p className="text-[10px] font-black text-[#b45309] uppercase tracking-[0.2em] mt-2 italic shadow-[#b45309]/20 shadow-sm">Gestão Financeira em Tempo Real</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-300 shadow-none p-1">
                        <button
                            onClick={() => adjustDate(1)}
                            disabled={isSessionFromPreviousDay}
                            className={`p-1.5 rounded-lg text-slate-400 transition-all flex items-center justify-center
                                ${isSessionFromPreviousDay ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 hover:text-[#b87333] active:scale-90'}`}
                            title="Próximo Dia"
                        >
                            <span className="material-symbols-outlined text-lg">expand_less</span>
                        </button>
                        
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                            <input
                                type="date"
                                value={selectedDate}
                                disabled={isSessionFromPreviousDay}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                                className={`bg-transparent border-none text-xs font-bold text-slate-700 outline-none
                                    ${isSessionFromPreviousDay ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            />
                        </div>

                        <button
                            onClick={() => adjustDate(-1)}
                            disabled={isSessionFromPreviousDay}
                            className={`p-1.5 rounded-lg text-slate-400 transition-all flex items-center justify-center
                                ${isSessionFromPreviousDay ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#e8e2d4]/40 hover:text-cyan-500 active:scale-90'}`}
                            title="Dia Anterior"
                        >
                            <span className="material-symbols-outlined text-lg">expand_more</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-slate-300 shadow-none">
                        <div className={`size-2 rounded-full ${isCaixaOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500/100'}`}></div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{isCaixaOpen ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
                        <div className="w-[1px] h-4 bg-gray-200"></div>
                        <span className="text-xs font-mono font-bold text-slate-400">{operador || 'Operador'}</span>
                    </div>

                    {isCaixaOpen && (
                        <button
                            onClick={() => {
                                setClosureObservations('');
                                setModalMode('close');
                            }}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500 transition-all text-slate-400 shadow-none"
                        >
                            <span className="material-symbols-outlined">power_settings_new</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden p-6 gap-6 relative z-10">
                {/* Main Content Area */}
                <div className="flex-[2] flex flex-col bg-[#111827] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Warning Banner for Pending Checkouts of Previous Day */}
                    {isSessionFromPreviousDay && hasPendingCheckouts && (
                        <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-amber-500 text-2xl">warning</span>
                                <div>
                                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider">Atendimentos Pendentes no Caixa Anterior</h4>
                                    <p className="text-xs text-white/70 mt-0.5 uppercase tracking-wide">
                                        Existem atendimentos de {new Date(activeSession.opened_at).toLocaleDateString('pt-BR')} pendentes de pagamento. Finalize-os para poder encerrar o caixa.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Tabs Navigation */}
                    <div className="flex items-center gap-8 px-10 py-6 border-b border-white/5 bg-[#1f2937]/30">
                        {[
                            { id: 'agendados', label: 'AGENDADOS', icon: 'calendar_month' },
                            { id: 'recebimentos', label: 'RECEBIMENTOS', icon: 'arrow_downward' },
                            { id: 'saidas', label: 'SAÍDAS', icon: 'arrow_upward' },
                            { id: 'contas', label: 'CONTAS A PAGAR', icon: 'book' },
                            { id: 'pendentes', label: 'A RECEBER (FIADO)', icon: 'schedule' },
                            ...(isAdmin ? [
                                { id: 'historico', label: 'HISTÓRICO', icon: 'history' },
                                { id: 'relatorios', label: 'RELATÓRIOS', icon: 'analytics' }
                            ] : [])
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 pb-2 transition-all relative group
                                    ${activeTab === tab.id ? 'text-[#b45309]' : 'text-white/40 hover:text-white'}`}
                            >
                                <span className={`material-symbols-outlined text-xl ${activeTab === tab.id ? 'fill-1' : ''}`}>{tab.icon}</span>
                                <span className="text-[10px] font-black leading-none tracking-widest uppercase">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute -bottom-[25px] left-0 right-0 h-1 bg-[#b45309] rounded-t-full shadow-[0_-4px_12px_rgba(180,83,9,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-transparent">
                        {activeTab === 'agendados' && scheduledClients
                            .filter(client => client.date === selectedDate && client.status === 'em_atendimento')
                            .map(client => (
                                <div key={client.id} className="group flex items-center justify-between p-5 rounded-2xl bg-[#1f2937]/50 border border-white/5 hover:bg-[#1f2937] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-cover bg-center border border-white/10 shadow-xl bg-white/5 flex items-center justify-center overflow-hidden" style={{ backgroundImage: client.avatar ? `url(${client.avatar})` : undefined }}>
                                            {!client.avatar && <span className="text-xs font-black text-white/20">{client.name.charAt(0)}</span>}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-lg tracking-tight">{client.name}</h3>
                                            <div className="flex items-center gap-3 mt-1.5 opacity-60">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-[#b45309]">{client.service}</span>
                                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                                <span className="text-[10px] font-bold text-white uppercase">{client.professional}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-black text-white text-xl tracking-tight">{formatCurrency(client.amount)}</p>
                                            <p className="text-[9px] text-[#b45309] font-black uppercase tracking-widest animate-pulse mt-1">Aguardando Pagamento</p>
                                        </div>
                                        <button
                                            onClick={() => handleOpenPayment(client)}
                                            className="w-12 h-12 rounded-xl bg-[#b45309] text-white flex items-center justify-center hover:scale-110 shadow-lg shadow-[#b45309]/20 transition-all active:scale-95"
                                        >
                                            <span className="material-symbols-outlined font-black">payments</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                        {activeTab === 'recebimentos' && recebimentosAgrupados.map(group => (
                            <div key={group.date} className="space-y-4">
                                <div className="flex items-center gap-3 py-2">
                                    <div className="h-[1px] flex-1 bg-white/10"></div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                        <span className="material-symbols-outlined text-[14px] text-[#b45309]">calendar_today</span>
                                        <span className="text-[10px] font-black text-slate-300 tracking-[0.2em]">{group.date}</span>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-white/10"></div>
                                </div>
                                {group.items.map(t => {
                                    const isPendente = t.status === 'pendente';
                                    return (
                                        <div key={t.id} className={`flex items-center justify-between p-5 rounded-[1.5rem] bg-white border border-slate-300 ${isPendente ? 'hover:border-rose-300 hover:shadow-rose-50/50' : 'hover:border-emerald-300 hover:shadow-emerald-50/50'} hover:shadow-md transition-all`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3.5 rounded-2xl ${isPendente ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                                                    <span className="material-symbols-outlined">arrow_downward</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{t.description}</h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">{t.time}</span>
                                                        {t.items && t.items.length > 0 ? (
                                                            t.items.map((item, idx) => (
                                                                <div key={idx} className={`flex items-center gap-1.5 ${isPendente ? 'bg-rose-50/80 border border-rose-100 text-rose-800' : 'bg-emerald-50/80 border border-emerald-100 text-emerald-800'} px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider`}>
                                                                    <span>{item.title}</span>
                                                                    {item.professional && (
                                                                        <>
                                                                            <span className={isPendente ? 'text-rose-300' : 'text-emerald-300'}>|</span>
                                                                            <span className={`font-bold ${isPendente ? 'text-rose-600' : 'text-emerald-600'}`}>{item.professional}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Serviço avulso</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-mono ${isPendente ? 'text-rose-500' : 'text-emerald-500'} font-black text-xl`}>{formatCurrency(t.amount)}</p>
                                                <p className={`text-[10px] ${isPendente ? 'text-rose-500 font-black' : 'text-slate-400 font-bold'} uppercase tracking-widest`}>{t.paymentMethod}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {activeTab === 'saidas' && transactions.filter(t => ['saida', 'sangria'].includes(t.type)).map(t => (
                            <div key={t.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white border border-slate-300 hover:border-rose-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100">
                                        <span className="material-symbols-outlined">arrow_upward</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{t.description}</h3>
                                        <p className="text-xs text-slate-800 mt-1">{t.time}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-rose-500 font-black text-xl">-{formatCurrency(t.amount)}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Caixa</p>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'contas' && bills.map(bill => (
                            <div key={bill.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white border border-slate-300 hover:border-violet-300 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-3.5 rounded-2xl bg-violet-50 text-violet-500 border border-violet-100">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{bill.description}</h3>
                                        <p className="text-xs text-slate-800 mt-1">{bill.supplier} • Vence em: <span className="font-bold">{bill.dueDate}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-rose-500 font-black text-xl">-{formatCurrency(bill.amount)}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded shadow-sm text-white font-bold uppercase tracking-widest ${bill.status === 'paga' ? 'bg-emerald-500' : bill.status === 'vencida' ? 'bg-rose-500' : 'bg-amber-500'}`}>{bill.status}</span>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'pendentes' && transactions
                            .filter(t => t.type === 'entrada' && t.status === 'pendente')
                            .map(t => {
                                const dueDate = extractDueDate(t.observation);
                                const isOverdue = dueDate ? new Date(dueDate + 'T23:59:59') < new Date() : false;
                                const formattedDueDate = dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data';

                                return (
                                    <div key={t.id} className="group flex items-center justify-between p-5 rounded-[1.5rem] bg-[#1f2937]/50 border border-white/5 hover:bg-[#1f2937] transition-all animate-in fade-in duration-300">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-cyan-400">
                                                <span className="material-symbols-outlined text-2xl">pending_actions</span>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-white text-lg tracking-tight">{t.client || 'Cliente Cadastrado'}</h3>
                                                <p className="text-xs text-white/50 mt-1">
                                                    {t.description} • {t.professional || 'Profissional'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[9px] font-bold text-white/30 uppercase">Prometido para:</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                                                        {formattedDueDate}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isOverdue ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                                        {isOverdue ? 'Vencido' : 'No Prazo'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-mono text-white font-black text-xl">{formatCurrency(t.amount)}</p>
                                                {t.discount && t.discount > 0 ? (
                                                    <p className="text-[10px] text-emerald-400 font-bold uppercase mt-0.5">-{formatCurrency(t.discount)} Desc.</p>
                                                ) : null}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSendWhatsAppReminder(t)}
                                                    className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 flex items-center justify-center transition-all active:scale-95"
                                                    title="Enviar Lembrete por WhatsApp"
                                                >
                                                    <span className="material-symbols-outlined text-lg">chat</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedPendingTransaction(t);
                                                        setResolvePaymentMethod('');
                                                        setModalMode('resolve_pending');
                                                    }}
                                                    className="px-4 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black uppercase tracking-widest text-[10px] flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95"
                                                    title="Dar Baixa no Pagamento"
                                                >
                                                    Dar Baixa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        {activeTab === 'pendentes' && transactions.filter(t => t.type === 'entrada' && t.status === 'pendente').length === 0 && (
                            <div className="p-10 text-center text-white/20 bg-[#1f2937]/30 rounded-3xl border border-dashed border-white/5 animate-in fade-in duration-300">
                                <span className="material-symbols-outlined text-5xl mb-3 text-cyan-400/40">volunteer_activism</span>
                                <p className="text-sm font-bold text-white/50">Nenhum pagamento pendente no momento!</p>
                                <p className="text-xs text-white/20 mt-1">Tudo está em dia.</p>
                            </div>
                        )}

                        {activeTab === 'historico' && (
                            <div className="space-y-4">
                                {sessionsHistory.map(session => {
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
                                                <div className="flex items-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${session.status === 'open' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400 border border-white/5'}`}>
                                                        {session.status === 'open' ? 'Aberto' : 'Fechado'}
                                                    </span>
                                                    {(() => {
                                                        const sessionOpenedDate = openedAt.toLocaleDateString('en-CA');
                                                        const todayObj = new Date();
                                                        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                                                        const isHistorySessionFromPreviousDay = sessionOpenedDate < todayStr;
                                                        
                                                        if (session.status === 'open' && isHistorySessionFromPreviousDay) {
                                                            return (
                                                                <button
                                                                    onClick={() => {
                                                                        const operatorName = (session.opened_by_profile as any)?.full_name || 'Operador';
                                                                        const phone = (session.opened_by_profile as any)?.phone ? (session.opened_by_profile as any).phone.replace(/\D/g, '') : '';
                                                                        
                                                                        const sessionDateFormatted = openedAt.toLocaleDateString('pt-BR');
                                                                        const message = `Olá, ${operatorName}! Consta em nosso sistema que o caixa do dia ${sessionDateFormatted} ainda está em aberto. Por favor, realize o fechamento no aplicativo o quanto antes.\n\nAtenciosamente, Salon Suite Pro`;
                                                                        
                                                                        if (!phone) {
                                                                            alert('Este operador não possui telefone cadastrado.');
                                                                            return;
                                                                        }
                                                                        
                                                                        let cleanPhone = phone;
                                                                        if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
                                                                            cleanPhone = '55' + cleanPhone;
                                                                        }
                                                                        
                                                                        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ml-2 border-none font-sans"
                                                                    title="Notificar Operador via WhatsApp"
                                                                >
                                                                    <span className="material-symbols-outlined text-[12px]">chat</span>
                                                                    Notificar
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
                                                <div>
                                                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Operador</span>
                                                    <span className="text-xs font-bold text-white">
                                                        {session.status === 'open' 
                                                            ? (session.opened_by_profile as any)?.full_name 
                                                            : (session.closed_by_profile as any)?.full_name || (session.opened_by_profile as any)?.full_name || 'Operador'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Valor Inicial</span>
                                                    <span className="text-xs font-mono font-bold text-white">{formatCurrency(session.opening_balance)}</span>
                                                </div>
                                                {session.status === 'closed' && (
                                                    <>
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
                                {sessionsHistory.length === 0 && (
                                    <div className="p-10 text-center text-white/20 bg-[#1f2937]/30 rounded-3xl border border-dashed border-white/5">
                                        <span className="material-symbols-outlined text-5xl mb-3 text-[#b45309]/40">history</span>
                                        <p className="text-sm font-bold text-white/50">Nenhum histórico de caixa registrado.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'relatorios' && <CashReports />}
                    </div>
                </div>

                {/* Right Panel / Stats & Actions */}
                <div className="flex-1 max-w-[400px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    {/* Balance Card - Dark Reference Style */}
                    <div className="rounded-3xl p-5 bg-[#1f2937] border border-white/5 text-white shadow-2xl relative overflow-hidden group flex-shrink-0">
                        <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-[#b45309]/10 rounded-full blur-[60px]" />

                        <div className="relative z-10">
                            <h3 className="text-[#b45309] text-[10px] font-black uppercase tracking-[0.2em] mb-2">SALDO TOTAL EM CAIXA</h3>
                            <p className="text-3xl font-black mb-3 tracking-tighter text-white">{formatCurrency(saldoAtual)}</p>

                            <div className="space-y-4 border-t border-white/5 pt-4">
                                <div className="flex justify-between items-center group/item">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Entradas Hoje</span>
                                    </div>
                                    <span className="font-black text-emerald-500 text-lg">+{formatCurrency(totalEntradas)}</span>
                                </div>
                                <div className="flex justify-between items-center group/item">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Saídas Hoje</span>
                                    </div>
                                    <span className="font-black text-rose-500 text-lg">-{formatCurrency(totalSaidas)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-2 gap-4 flex-none">
                        <button
                            onClick={handleWalkIn}
                            className="col-span-2 p-5 rounded-3xl bg-[#1f2937]/50 border border-white/5 hover:bg-[#1f2937] transition-all flex flex-col gap-3 text-left group shadow-2xl flex-shrink-0"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#b45309] text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">point_of_sale</span>
                            </div>
                            <div>
                                <h4 className="text-white font-black text-2xl tracking-tight">Receber Avulso</h4>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Venda Direta / Balcão</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setModalMode('transaction')}
                            className="p-5 rounded-[2rem] bg-white border border-slate-300 hover:border-rose-300 hover:bg-rose-50 transition-all flex flex-col items-center gap-3 group shadow-none"
                        >
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">remove_circle</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest group-hover:text-rose-600 transition-colors">Despesa</span>
                        </button>

                        <button
                            onClick={() => setModalMode('bill')}
                            className="p-5 rounded-[2rem] bg-white border border-slate-300 hover:border-violet-300 hover:bg-violet-50 transition-all flex flex-col items-center gap-3 group shadow-none"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">receipt_long</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest group-hover:text-violet-600 transition-colors">Contas</span>
                        </button>

                        <button
                            onClick={() => setModalMode('vale')}
                            className="p-5 rounded-[2rem] bg-white border border-slate-300 hover:border-amber-300 hover:bg-amber-50 transition-all flex flex-col items-center gap-3 group shadow-none"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">currency_exchange</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Vale</span>
                        </button>
                    </div>
                </div>
            </main >
            {/* Modals Container */}
            {
                modalMode !== 'none' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-md animate-in fade-in duration-200 p-4">
                        <div className="relative bg-[#1e293b] w-full max-w-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/5 bg-[#0f172a]/40 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3" style={{fontFamily:'Bebas Neue'}}>
                                    <span className="material-symbols-outlined text-cyan-400 text-3xl">
                                        {modalMode === 'payment' ? 'payments' : modalMode === 'close' ? 'priority_high' : 'settings'}
                                    </span>
                                    {modalMode === 'payment' ? (isWalkIn ? 'Pagamentos Avulsos' : 'Processar Pagamento') :
                                        modalMode === 'add_service' ? 'Adicionar Serviço' :
                                            modalMode === 'open' ? 'Abertura de Caixa' :
                                                modalMode === 'close' ? 'Fechamento de Caixa' : 'Nova Transação'}
                                </h2>
                                <button
                                    onClick={() => setModalMode('none')}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white border border-transparent hover:border-white/10"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar bg-transparent">
                                {/* PAYMENT MODE */}
                                {modalMode === 'payment' && (
                                    <div className="space-y-8">
                                        {/* Top Bar: Client & Pro */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-[#111827]/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center col-span-2 shadow-inner gap-3">
                                                <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest">Cliente</span>
                                                {isWalkIn ? (
                                                    <div className="space-y-3 relative">
                                                        {selectedClient ? (
                                                            <div className="flex items-center justify-between p-3 bg-[#1e293b] border border-cyan-500/30 rounded-xl">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                                                        <span className="material-symbols-outlined text-cyan-400 text-sm">person</span>
                                                                    </div>
                                                                    <span className="font-bold text-white">{selectedClient.name}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedClient(null)}
                                                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Digite para buscar o cliente..."
                                                                    value={clientSearchQuery}
                                                                    onChange={e => setClientSearchQuery(e.target.value)}
                                                                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl pl-10 pr-10 py-2 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                                                                />
                                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-lg">search</span>
                                                                {clientSearchQuery && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setClientSearchQuery('')}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xs">close</span>
                                                                    </button>
                                                                )}

                                                                {/* Autocomplete Dropdown List */}
                                                                {clientSearchQuery.trim() !== '' && (
                                                                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#1e293b] border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl p-1.5 space-y-1 custom-scrollbar">
                                                                        {filteredClients.length > 0 ? (
                                                                            filteredClients.map(client => (
                                                                                <button
                                                                                    key={client.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedClient({
                                                                                            id: client.id,
                                                                                            name: client.name,
                                                                                            service: 'Serviço Avulso',
                                                                                            professional: '',
                                                                                            time: getCurrentTime(),
                                                                                            endTime: getCurrentTime(),
                                                                                            amount: 0,
                                                                                            status: 'aguardando'
                                                                                        });
                                                                                        setClientSearchQuery('');
                                                                                    }}
                                                                                    className="w-full text-left px-3.5 py-2.5 rounded-lg hover:bg-white/5 text-sm text-white font-bold transition-all flex items-center gap-2.5 group"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-white/20 group-hover:text-cyan-400 text-sm">person</span>
                                                                                    <span>{client.name}</span>
                                                                                </button>
                                                                            ))
                                                                        ) : (
                                                                            <div className="px-3.5 py-2.5 text-xs text-white/40 italic text-center">
                                                                                Nenhum cliente encontrado
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xl font-black text-white tracking-tight">{selectedClient?.name || 'Cliente Avulso'}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Service Cart Section */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Itens no Checkout</span>
                                                <button
                                                    onClick={handleOpenAddService}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#0f172a]/10 text-cyan-500 rounded-xl text-xs font-black hover:bg-[#0f172a]/20 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                    ADICIONAR SERVIÇO
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {cartItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-[#111827]/40 border border-white/5 rounded-2xl group relative hover:border-white/10 transition-all">
                                                        <button
                                                            onClick={() => setCartItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute -right-2 -top-2 w-6 h-6 bg-[#1e293b] border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-rose-500 hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">close</span>
                                                        </button>
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-cyan-400 shadow-none border border-white/5">
                                                                <span className="material-symbols-outlined">content_cut</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white">{item.title}</p>
                                                                <p className="text-[10px] text-white/30 font-bold uppercase">
                                                                    {item.professional}
                                                                    {item.commissionPercentage ? <span className="text-cyan-400 ml-1">• Comiss: {item.commissionPercentage}%</span> : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {item.is_variable_price ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-white/50">R$</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={item.price || ''}
                                                                    onChange={e => handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                                                    className="w-24 bg-[#1e293b] border border-white/10 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="font-mono font-black text-white text-lg">{formatCurrency(item.price)}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Observações (Opcional)</label>
                                                <textarea
                                                    value={paymentObservation}
                                                    onChange={e => setPaymentObservation(e.target.value)}
                                                    placeholder="Detalhes adicionais da venda..."
                                                    className="w-full bg-[#111827]/40 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-cyan-500/30 focus:bg-[#111827]/60 shadow-sm transition-all min-h-[60px] resize-none"
                                                />
                                            </div>

                                        </div>

                                        {paymentStage === 'selection' ? (
                                            <div className="space-y-8 animate-in fade-in duration-300">
                                                {/* Totals Summary */}
                                                <div className="p-6 bg-[#0f172a] rounded-[2rem] text-white flex justify-between items-center shadow-2xl border border-white/5 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />
                                                    <div className="relative z-10">
                                                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                                                        <p className="text-4xl font-black text-emerald-400" style={{fontFamily:'Bebas Neue'}}>R$ <span className="text-white">{cartItems.reduce((a, b) => a + b.price, 0).toLocaleString('pt-BR')}</span></p>
                                                    </div>
                                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                                                        <span className="material-symbols-outlined text-3xl text-emerald-400">shopping_cart_checkout</span>
                                                    </div>
                                                </div>

                                                {/* Modo Dividido / Único Toggle */}
                                                <div className="flex bg-[#111827]/40 border border-white/5 rounded-2xl p-1 mb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsSplitPayment(false);
                                                            setTransMethod('');
                                                            setSplitAmounts({ PIX: '', Dinheiro: '', Crédito: '', Débito: '', Pendente: '' });
                                                        }}
                                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                                            ${!isSplitPayment ? 'bg-[#0f172a] text-cyan-400 border border-white/5 shadow-lg' : 'text-white/40 hover:text-white'}`}
                                                    >
                                                        Pagamento Único
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsSplitPayment(true);
                                                            setTransMethod('Split');
                                                            setPaymentDiscountPercent('');
                                                            setCashReceived('');
                                                            setPendingDueDate('');
                                                        }}
                                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                                            ${isSplitPayment ? 'bg-[#0f172a] text-cyan-400 border border-white/5 shadow-lg' : 'text-white/40 hover:text-white'}`}
                                                    >
                                                        Dividir Pagamento
                                                    </button>
                                                </div>

                                                {isSplitPayment ? (
                                                    <div className="space-y-6 animate-in fade-in duration-300">
                                                         {/* Inputs of Split Amounts */}
                                                         <div className="grid grid-cols-2 gap-4">
                                                             {/* PIX */}
                                                             <div className="space-y-1">
                                                                 <label className="text-[10px] text-emerald-400 uppercase font-black tracking-widest px-2">Pix</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-emerald-400 text-lg">qr_code_2</span>
                                                                     <input
                                                                         type="number"
                                                                         step="0.01"
                                                                         placeholder="0.00"
                                                                         value={splitAmounts.PIX}
                                                                         onChange={e => setSplitAmounts(prev => ({ ...prev, PIX: e.target.value }))}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                     />
                                                                 </div>
                                                             </div>

                                                             {/* Dinheiro */}
                                                             <div className="space-y-1">
                                                                 <label className="text-[10px] text-amber-400 uppercase font-black tracking-widest px-2">Dinheiro</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-amber-400 text-lg">payments</span>
                                                                     <input
                                                                         type="number"
                                                                         step="0.01"
                                                                         placeholder="0.00"
                                                                         value={splitAmounts.Dinheiro}
                                                                         onChange={e => setSplitAmounts(prev => ({ ...prev, Dinheiro: e.target.value }))}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                     />
                                                                 </div>
                                                             </div>

                                                             {/* Crédito */}
                                                             <div className="space-y-1">
                                                                 <label className="text-[10px] text-indigo-400 uppercase font-black tracking-widest px-2">Cartão Crédito</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-indigo-400 text-lg">credit_card</span>
                                                                     <input
                                                                         type="number"
                                                                         step="0.01"
                                                                         placeholder="0.00"
                                                                         value={splitAmounts.Crédito}
                                                                         onChange={e => setSplitAmounts(prev => ({ ...prev, Crédito: e.target.value }))}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                     />
                                                                 </div>
                                                             </div>

                                                             {/* Débito */}
                                                             <div className="space-y-1">
                                                                 <label className="text-[10px] text-blue-400 uppercase font-black tracking-widest px-2">Cartão Débito</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-blue-400 text-lg">credit_score</span>
                                                                     <input
                                                                         type="number"
                                                                         step="0.01"
                                                                         placeholder="0.00"
                                                                         value={splitAmounts.Débito}
                                                                         onChange={e => setSplitAmounts(prev => ({ ...prev, Débito: e.target.value }))}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                     />
                                                                 </div>
                                                             </div>

                                                             {/* Pendente */}
                                                             <div className="col-span-2 space-y-1">
                                                                 <label className="text-[10px] text-rose-400 uppercase font-black tracking-widest px-2">Pagar Depois (Pendente / Fiado)</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-rose-400 text-lg">pending_actions</span>
                                                                     <input
                                                                         type="number"
                                                                         step="0.01"
                                                                         placeholder="0.00"
                                                                         value={splitAmounts.Pendente}
                                                                         onChange={e => setSplitAmounts(prev => ({ ...prev, Pendente: e.target.value }))}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                     />
                                                                 </div>
                                                             </div>
                                                         </div>

                                                         {/* Condicionais de Dinheiro e Pendente */}
                                                         {(parseFloat(splitAmounts.Dinheiro) || 0) > 0 && (
                                                             <div className="space-y-1 pl-4 border-l-2 border-amber-500/30 animate-in slide-in-from-top-2 duration-300">
                                                                 <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Valor Recebido em Dinheiro (Obrigatório)</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-cyan-400 text-lg">payments</span>
                                                                     <input
                                                                         type="number"
                                                                         step="0.01"
                                                                         placeholder="0.00"
                                                                         value={cashReceived}
                                                                         onChange={e => setCashReceived(e.target.value)}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                         required
                                                                     />
                                                                 </div>
                                                                 {cashReceived && (parseFloat(cashReceived) || 0) >= (parseFloat(splitAmounts.Dinheiro) || 0) && (
                                                                     <p className="text-xs text-amber-400 font-bold px-2 mt-1">
                                                                         Troco: {formatCurrency((parseFloat(cashReceived) || 0) - (parseFloat(splitAmounts.Dinheiro) || 0))}
                                                                     </p>
                                                                 )}
                                                             </div>
                                                         )}

                                                         {(parseFloat(splitAmounts.Pendente) || 0) > 0 && (
                                                             <div className="space-y-1 pl-4 border-l-2 border-rose-500/30 animate-in slide-in-from-top-2 duration-300">
                                                                 <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Data Prometida para o Pagamento (Obrigatório)</label>
                                                                 <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                     <span className="material-symbols-outlined text-cyan-400 text-lg">calendar_today</span>
                                                                     <input
                                                                         type="date"
                                                                         value={pendingDueDate}
                                                                         onChange={e => setPendingDueDate(e.target.value)}
                                                                         className="bg-transparent text-white outline-none w-full font-mono text-base font-bold cursor-pointer"
                                                                         required
                                                                     />
                                                                 </div>
                                                             </div>
                                                         )}

                                                         {/* Desconto */}
                                                         <div className="space-y-1">
                                                             <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Desconto Opcional (%)</label>
                                                             <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                 <span className="material-symbols-outlined text-cyan-400 text-lg">percent</span>
                                                                 <input
                                                                     type="number"
                                                                     placeholder="0"
                                                                     value={paymentDiscountPercent}
                                                                     onChange={e => setPaymentDiscountPercent(e.target.value)}
                                                                     className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                 />
                                                             </div>
                                                         </div>

                                                         {/* Manager Auth */}
                                                         {needsManagerAuth && (
                                                             <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3 mt-2 animate-in slide-in-from-top-2 duration-300">
                                                                 <div className="flex items-center gap-2 text-amber-400">
                                                                     <span className="material-symbols-outlined text-lg">shield_person</span>
                                                                     <span className="text-[10px] font-black uppercase tracking-widest">Autorização do Gerente Necessária</span>
                                                                 </div>
                                                                 {isDiscountAuthorized ? (
                                                                     <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                                                         <span className="material-symbols-outlined text-lg">verified</span>
                                                                         <span className="text-xs font-bold">Desconto Autorizado por Gerente</span>
                                                                     </div>
                                                                 ) : (
                                                                     <div className="space-y-2">
                                                                         <input
                                                                             type="email"
                                                                             placeholder="E-mail do Gerente"
                                                                             value={managerEmail}
                                                                             onChange={e => setManagerEmail(e.target.value)}
                                                                             className="w-full bg-[#111827]/40 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500/30"
                                                                         />
                                                                         <input
                                                                             type="password"
                                                                             placeholder="Senha do Gerente"
                                                                             value={managerPassword}
                                                                             onChange={e => setManagerPassword(e.target.value)}
                                                                             className="w-full bg-[#111827]/40 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500/30"
                                                                         />
                                                                         {authError && (
                                                                             <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider">{authError}</p>
                                                                         )}
                                                                         <button
                                                                             type="button"
                                                                             onClick={handleValidateManagerAuth}
                                                                             disabled={isValidatingAuth || !managerEmail || !managerPassword}
                                                                             className="w-full py-2 bg-amber-500 disabled:bg-white/5 disabled:text-white/20 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all border-none font-sans cursor-pointer"
                                                                         >
                                                                             {isValidatingAuth ? 'Validando...' : 'Autorizar Desconto'}
                                                                         </button>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         )}

                                                         {/* Real-time Summary Card */}
                                                         <div className="p-6 rounded-3xl bg-[#0f172a] text-white space-y-3 shadow-2xl border border-white/5 relative overflow-hidden group">
                                                             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                                             <div className="relative z-10 space-y-2.5">
                                                                 <div className="flex justify-between items-center text-xs">
                                                                     <span className="text-white/40 font-black uppercase tracking-widest">Subtotal</span>
                                                                     <span className="font-bold text-white/80">{formatCurrency(cartItems.reduce((a, b) => a + b.price, 0))}</span>
                                                                 </div>
                                                                 {parseFloat(paymentDiscountPercent) > 0 && (
                                                                     <div className="flex justify-between items-center text-xs">
                                                                         <span className="text-emerald-400 font-black uppercase tracking-widest">Desconto</span>
                                                                         <span className="font-bold text-emerald-400">-{formatCurrency((cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100)}</span>
                                                                     </div>
                                                                 )}
                                                                 <div className="flex justify-between items-center pt-2 border-t border-white/5 text-sm">
                                                                     <span className="text-white/40 font-black uppercase tracking-widest">Total Líquido</span>
                                                                     <span className="font-bold text-white">{formatCurrency(Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100))}</span>
                                                                 </div>
                                                                 <div className="flex justify-between items-center text-sm">
                                                                     <span className="text-white/40 font-black uppercase tracking-widest">Total Informado</span>
                                                                     <span className="font-bold text-white">{formatCurrency((parseFloat(splitAmounts.PIX) || 0) + (parseFloat(splitAmounts.Dinheiro) || 0) + (parseFloat(splitAmounts.Crédito) || 0) + (parseFloat(splitAmounts.Débito) || 0) + (parseFloat(splitAmounts.Pendente) || 0))}</span>
                                                                 </div>
                                                                 <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                                                     <span className="text-cyan-400 font-black uppercase tracking-[0.2em] text-[10px]">Diferença</span>
                                                                     <span className={`text-2xl font-black ${Math.abs(
                                                                         Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100) -
                                                                         ((parseFloat(splitAmounts.PIX) || 0) + (parseFloat(splitAmounts.Dinheiro) || 0) + (parseFloat(splitAmounts.Crédito) || 0) + (parseFloat(splitAmounts.Débito) || 0) + (parseFloat(splitAmounts.Pendente) || 0))
                                                                     ) < 0.01 ? 'text-emerald-400' : 'text-amber-500'}`} style={{ fontFamily: 'Bebas Neue' }}>
                                                                         {Math.abs(
                                                                             Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100) -
                                                                             ((parseFloat(splitAmounts.PIX) || 0) + (parseFloat(splitAmounts.Dinheiro) || 0) + (parseFloat(splitAmounts.Crédito) || 0) + (parseFloat(splitAmounts.Débito) || 0) + (parseFloat(splitAmounts.Pendente) || 0))
                                                                         ) < 0.01 ? 'R$ 0,00 (Pronto)' : formatCurrency(
                                                                             Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100) -
                                                                             ((parseFloat(splitAmounts.PIX) || 0) + (parseFloat(splitAmounts.Dinheiro) || 0) + (parseFloat(splitAmounts.Crédito) || 0) + (parseFloat(splitAmounts.Débito) || 0) + (parseFloat(splitAmounts.Pendente) || 0))
                                                                         )}
                                                                     </span>
                                                                 </div>
                                                             </div>
                                                         </div>

                                                         {/* Action Buttons */}
                                                         <div className="flex gap-3 pt-3">
                                                             <button
                                                                 onClick={() => setModalMode('none')}
                                                                 className="flex-1 py-4 rounded-xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                                             >
                                                                 Cancelar
                                                             </button>
                                                             <button
                                                                 disabled={
                                                                     isProcessingPayment ||
                                                                     Math.abs(
                                                                         Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100) -
                                                                         ((parseFloat(splitAmounts.PIX) || 0) + (parseFloat(splitAmounts.Dinheiro) || 0) + (parseFloat(splitAmounts.Crédito) || 0) + (parseFloat(splitAmounts.Débito) || 0) + (parseFloat(splitAmounts.Pendente) || 0))
                                                                     ) >= 0.01 ||
                                                                     ((parseFloat(splitAmounts.Dinheiro) || 0) > 0 && (!cashReceived || (parseFloat(cashReceived) || 0) < (parseFloat(splitAmounts.Dinheiro) || 0))) ||
                                                                     ((parseFloat(splitAmounts.Pendente) || 0) > 0 && !pendingDueDate) ||
                                                                     ((parseFloat(splitAmounts.Pendente) || 0) > 0 && (!selectedClient || !dbClients.some(c => c.name === selectedClient?.name))) ||
                                                                     (needsManagerAuth && !isDiscountAuthorized)
                                                                 }
                                                                 onClick={handleProcessPayment}
                                                                 className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all 
                                                                     ${(
                                                                         isProcessingPayment ||
                                                                         Math.abs(
                                                                             Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0)) / 100) -
                                                                             ((parseFloat(splitAmounts.PIX) || 0) + (parseFloat(splitAmounts.Dinheiro) || 0) + (parseFloat(splitAmounts.Crédito) || 0) + (parseFloat(splitAmounts.Débito) || 0) + (parseFloat(splitAmounts.Pendente) || 0))
                                                                         ) >= 0.01 ||
                                                                         ((parseFloat(splitAmounts.Dinheiro) || 0) > 0 && (!cashReceived || (parseFloat(cashReceived) || 0) < (parseFloat(splitAmounts.Dinheiro) || 0))) ||
                                                                         ((parseFloat(splitAmounts.Pendente) || 0) > 0 && !pendingDueDate) ||
                                                                         ((parseFloat(splitAmounts.Pendente) || 0) > 0 && (!selectedClient || !dbClients.some(c => c.name === selectedClient?.name))) ||
                                                                         (needsManagerAuth && !isDiscountAuthorized)
                                                                     )
                                                                         ? 'bg-white/5 text-white/10 cursor-not-allowed opacity-60 shadow-none'
                                                                         : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 active:scale-95'}`}
                                                             >
                                                                 {isProcessingPayment ? 'Processando...' : 'Finalizar e Emitir'}
                                                             </button>
                                                         </div>
                                                    </div>
                                                ) : (
                                                    /* Single Payment Method Options Selection */
                                                    <div className="space-y-6 animate-in fade-in duration-300">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block">Forma de Pagamento</label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <PaymentMethodBtn method="PIX" icon="qr_code_2" label="Pix" activeColor="bg-emerald-500 text-white" borderColor="border-emerald-500/50" />
                                                                <PaymentMethodBtn method="Dinheiro" icon="payments" label="Dinheiro" activeColor="bg-amber-500 text-white" borderColor="border-amber-500/50" />
                                                                <PaymentMethodBtn method="Crédito" icon="credit_card" label="Cartão Crédito" activeColor="bg-indigo-500 text-white" borderColor="border-indigo-500/50" />
                                                                <PaymentMethodBtn method="Débito" icon="credit_score" label="Cartão Débito" activeColor="bg-blue-500 text-white" borderColor="border-blue-500/50" />
                                                                <div className="col-span-2">
                                                                    <PaymentMethodBtn method="Pendente" icon="pending_actions" label="Pagar Depois (Pendente / Fiado)" activeColor="bg-rose-500 text-white" borderColor="border-rose-500/50" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => setModalMode('none')}
                                                            className="w-full py-5 rounded-2xl text-white/30 font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 hover:text-white transition-all mt-4"
                                                        >
                                                            Cancelar Operação
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Confirmation Stage */
                                            <div className="space-y-4 animate-in slide-in- duration-400">
                                                <div className="p-6 bg-[#0f172a]/40 rounded-2xl border border-white/5 flex flex-col items-center relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50" />
                                                    <div className="size-14 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-3 shadow-lg ">
                                                        <span className="material-symbols-outlined text-3xl text-cyan-400">task_alt</span>
                                                    </div>
                                                    <span className="text-[10px] text-cyan-400 uppercase font-black tracking-[0.2em] mb-1">Pagamento via</span>
                                                    <span className="text-2xl font-black text-white uppercase tracking-tight" style={{fontFamily:'Bebas Neue'}}>{transMethod}</span>
                                                </div>

                                                <div className="space-y-4">
                                                    {['PIX', 'Dinheiro', 'Crédito', 'Débito'].includes(transMethod) && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Desconto Opcional (%)</label>
                                                            <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                <span className="material-symbols-outlined text-cyan-400 text-lg">percent</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={paymentDiscountPercent}
                                                                    onChange={e => setPaymentDiscountPercent(e.target.value)}
                                                                    className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {needsManagerAuth && (
                                                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3 mt-2 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center gap-2 text-amber-400">
                                                                <span className="material-symbols-outlined text-lg">shield_person</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Autorização do Gerente Necessária</span>
                                                            </div>
                                                            {isDiscountAuthorized ? (
                                                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                                                    <span className="material-symbols-outlined text-lg">verified</span>
                                                                    <span className="text-xs font-bold">Desconto Autorizado por Gerente</span>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="email"
                                                                        placeholder="E-mail do Gerente"
                                                                        value={managerEmail}
                                                                        onChange={e => setManagerEmail(e.target.value)}
                                                                        className="w-full bg-[#111827]/40 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500/30"
                                                                    />
                                                                    <input
                                                                        type="password"
                                                                        placeholder="Senha do Gerente"
                                                                        value={managerPassword}
                                                                        onChange={e => setManagerPassword(e.target.value)}
                                                                        className="w-full bg-[#111827]/40 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-amber-500/30"
                                                                    />
                                                                    {authError && (
                                                                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider">{authError}</p>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleValidateManagerAuth}
                                                                        disabled={isValidatingAuth || !managerEmail || !managerPassword}
                                                                        className="w-full py-2 bg-amber-500 disabled:bg-white/5 disabled:text-white/20 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all border-none font-sans cursor-pointer"
                                                                    >
                                                                        {isValidatingAuth ? 'Validando...' : 'Autorizar Desconto'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {transMethod === 'Dinheiro' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Valor Recebido em Dinheiro (Obrigatório)</label>
                                                            <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                <span className="material-symbols-outlined text-cyan-400 text-lg">payments</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={cashReceived}
                                                                    onChange={e => setCashReceived(e.target.value)}
                                                                    className="bg-transparent text-white outline-none w-full font-mono text-base font-bold"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {transMethod === 'Pendente' && (
                                                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                                            <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Data Prometida para o Pagamento (Obrigatório)</label>
                                                            <div className="flex items-center gap-2 bg-[#111827]/40 border border-white/5 rounded-xl p-3 focus-within:border-cyan-500/30 transition-all">
                                                                <span className="material-symbols-outlined text-cyan-400 text-lg">calendar_today</span>
                                                                <input
                                                                    type="date"
                                                                    value={pendingDueDate}
                                                                    onChange={e => setPendingDueDate(e.target.value)}
                                                                    className="bg-transparent text-white outline-none w-full font-mono text-base font-bold cursor-pointer"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Observações Internas</label>
                                                        <textarea
                                                            value={paymentObservation}
                                                            onChange={e => setPaymentObservation(e.target.value)}
                                                            placeholder="Detalhes adicionais da transação..."
                                                            className="w-full bg-[#111827]/40 border border-white/5 rounded-xl p-3 text-sm text-white/80 outline-none focus:border-cyan-500/30 min-h-[70px] resize-none transition-all"
                                                        />
                                                    </div>

                                                    <div className="p-6 rounded-3xl bg-[#0f172a] text-white flex justify-between items-center shadow-2xl border border-white/5 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                                        <div className="relative z-10 w-full pr-16">
                                                            <span className="text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px]">Total Líquido</span>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <span className="text-4xl font-black text-emerald-400" style={{fontFamily:'Bebas Neue'}}>
                                                                    R$ <span className="text-white">{(Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0) / 100))).toLocaleString('pt-BR')}</span>
                                                                </span>
                                                                {paymentDiscountPercent && (
                                                                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-black">-{paymentDiscountPercent}% OFF</span>
                                                                )}
                                                            </div>
                                                            {transMethod === 'Dinheiro' && (
                                                                <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5 text-xs text-white/50 animate-in fade-in duration-300">
                                                                    <div className="flex justify-between">
                                                                        <span>Dinheiro Recebido:</span>
                                                                        <span className="font-mono text-white font-bold">{formatCurrency(parseFloat(cashReceived) || 0)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span>Troco:</span>
                                                                        <span className="font-mono text-amber-400 font-bold">
                                                                            {formatCurrency(Math.max(0, (parseFloat(cashReceived) || 0) - (Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0) / 100)))))}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 absolute right-6 top-1/2 -translate-y-1/2">
                                                            <span className="material-symbols-outlined text-3xl">point_of_sale</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 pt-3">
                                                        <button
                                                            onClick={() => setPaymentStage('selection')}
                                                            className="flex-1 py-4 rounded-xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                                        >
                                                            Voltar
                                                        </button>
                                                        <button
                                                            disabled={
                                                                isProcessingPayment ||
                                                                (transMethod === 'Dinheiro' && (!cashReceived || (parseFloat(cashReceived) || 0) < (Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0) / 100))))) ||
                                                                (transMethod === 'Pendente' && !pendingDueDate) ||
                                                                (needsManagerAuth && !isDiscountAuthorized)
                                                            }
                                                            onClick={handleProcessPayment}
                                                            className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all 
                                                                ${(isProcessingPayment || (transMethod === 'Dinheiro' && (!cashReceived || (parseFloat(cashReceived) || 0) < (Math.max(0, cartItems.reduce((a, b) => a + b.price, 0) - (cartItems.reduce((a, b) => a + b.price, 0) * (parseFloat(paymentDiscountPercent) || 0) / 100))))) || (transMethod === 'Pendente' && !pendingDueDate) || (needsManagerAuth && !isDiscountAuthorized))
                                                                    ? 'bg-white/5 text-white/10 cursor-not-allowed opacity-60 shadow-none'
                                                                    : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 active:scale-95'}`}
                                                        >
                                                            {isProcessingPayment ? 'Processando...' : 'Finalizar e Emitir'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ADD SERVICE MODAL internal view */}
                                {modalMode === 'add_service' && (
                                    <div className="space-y-8 animate-in fade-in duration-300">
                                        <div className="bg-[#111827]/50 p-6 rounded-2xl border border-white/5">
                                            <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest mb-2 block">Venda para</span>
                                            <span className="text-xl font-black text-white tracking-tight">{selectedClient?.name || 'Cliente Avulso'}</span>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">1. Escolha o Profissional</label>
                                                <select
                                                    value={tempSelPro}
                                                    onChange={e => { setTempSelPro(e.target.value); setTempSelService(null); }}
                                                    className="w-full bg-[#111827]/40 border border-white/5 rounded-2xl px-5 py-3 text-lg font-bold text-white outline-none focus:border-cyan-500/30 shadow-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Selecione um profissional...</option>
                                                    {professionalsList.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>

                                            <div className={`space-y-2 transition-all duration-500 ${!tempSelPro ? 'opacity-30 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">2. Selecione o Serviço</label>
                                                <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto custom-scrollbar p-1">
                                                    {(servicesWithPros || []).filter(s => s.allowedPros.includes(tempSelPro)).map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setTempSelService(s)}
                                                            className={`p-5 rounded-2xl border-2 text-left transition-all flex justify-between items-center group
                                                                ${tempSelService?.id === s.id
                                                                    ? 'bg-white/5 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.01]'
                                                                    : 'bg-[#111827]/40 border-white/5 text-white/60 hover:border-white/10 hover:bg-[#111827]/60'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-10 rounded-xl flex items-center justify-center transition-colors 
                                                                    ${tempSelService?.id === s.id ? 'bg-cyan-500 text-slate-900' : 'bg-white/5 text-white/20 border border-white/5 group-hover:text-white/40 transition-all rounded-xl'}`}>
                                                                    <span className="material-symbols-outlined text-xl">spa</span>
                                                                </div>
                                                                <span className="font-bold text-white">{s.title}</span>
                                                            </div>
                                                            <span className="font-mono font-black text-cyan-400">{formatCurrency(s.price)}</span>
                                                        </button>
                                                    ))}
                                                    {availableServicesForPro.length === 0 && tempSelPro && (
                                                        <div className="p-8 text-center text-white/20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                            <span className="material-symbols-outlined text-3xl mb-2">sentiment_dissatisfied</span>
                                                            <p className="text-sm font-bold">Nenhum serviço disponível para este profissional</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-6">
                                            <button
                                                onClick={() => setModalMode('payment')}
                                                className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleConfirmAddService}
                                                disabled={!tempSelPro || !tempSelService}
                                                className="flex-[2] py-4 rounded-2xl bg-cyan-500 text-slate-900 font-black uppercase tracking-widest text-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-400 transition-all shadow-xl active:scale-95"
                                            >
                                                Confirmar Inclusão
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* INITIALIZATION / OPEN CAIXA */}
                                {modalMode === 'open' && (
                                    <div className="space-y-8 py-4 animate-in zoom-in-95 duration-400">
                                        <div className="w-28 h-28 mx-auto rounded-[2rem] border-4 border-white/5 flex items-center justify-center relative shadow-inner bg-[#111827]/40 group overflow-hidden">
                                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                                            <span className="material-symbols-outlined text-5xl text-cyan-400 group-hover:scale-110 transition-transform relative z-10">lock_open</span>
                                        </div>

                                        <div className="text-center">
                                            <h3 className="text-3xl font-black text-white tracking-tight uppercase" style={{fontFamily:'Bebas Neue'}}>Iniciar Expediente</h3>
                                            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Confirme os dados para ABRIR CAIXA</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Operador Responsável</label>
                                                <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4">
                                                    <span className="material-symbols-outlined text-cyan-400">verified_user</span>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={profile?.full_name || operador}
                                                        className="bg-transparent text-white outline-none w-full font-bold focus:ring-0"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Fundo de Reserva (Saldo Inicial)</label>
                                                <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4 focus-within:border-cyan-500/30 transition-all shadow-inner">
                                                    <span className="font-mono text-cyan-400 font-black text-xl">R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={valorInicialInput}
                                                        onChange={e => setValorInicialInput(e.target.value)}
                                                        className="bg-transparent text-white outline-none w-full font-mono text-2xl font-black focus:ring-0"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    const val = parseFloat(valorInicialInput) || 0;
                                                    if (profile?.id) {
                                                        await openSession(val, profile.id);
                                                        setModalMode('none');
                                                        setValorInicialInput('0');
                                                    } else {
                                                        alert('Erro: Usuário não identificado.');
                                                    }
                                                }}
                                                className="w-full py-6 rounded-2xl bg-cyan-500 text-slate-900 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 transition-all active:scale-95"
                                            >
                                                ABRIR CAIXA
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* VALE / SOLICITAÇÕES DE VALE */}
                                {modalMode === 'vale' && (
                                    <div className="space-y-6 py-2 animate-in slide-in- duration-400">
                                        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                            <span className="material-symbols-outlined text-3xl">currency_exchange</span>
                                        </div>

                                        <div className="text-center">
                                            <h3 className="text-3xl font-black text-white tracking-tight uppercase" style={{fontFamily:'Bebas Neue'}}>Solicitações de Vale</h3>
                                            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Aprove ou negue os adiantamentos solicitados</p>
                                        </div>

                                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
                                            {advanceRequests.length === 0 ? (
                                                <div className="p-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                                    <span className="material-symbols-outlined text-white/20 text-4xl mb-2">assignment_late</span>
                                                    <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Nenhuma solicitação pendente</p>
                                                </div>
                                            ) : (
                                                advanceRequests.map(req => (
                                                    <div key={req.id} className="p-5 rounded-3xl bg-[#111827]/40 border border-white/5 shadow-none hover:border-white/10 transition-all">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-black text-xs border border-orange-500/20">
                                                                    {req.professional?.name?.charAt(0) || 'P'}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-black text-white leading-tight uppercase tracking-tight">{req.professional?.name}</h4>
                                                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                                                        {new Date(req.created_at).toLocaleDateString('pt-BR')} • {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="font-mono font-black text-xl text-white tracking-tighter" style={{fontFamily:'Bebas Neue'}}>{formatCurrency(req.amount)}</span>
                                                        </div>

                                                        {req.reason && (
                                                            <div className="mb-4 p-3 bg-[#0f172a]/40 rounded-xl border border-white/5 italic text-xs text-white/40">
                                                                "{req.reason}"
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    const success = await updateRequestStatus(req.id, 'approved');
                                                                    if (success) {
                                                                        await addTransaction({
                                                                            type: 'saida',
                                                                            description: `Vale: ${req.professional?.name}`,
                                                                            category: 'Vale',
                                                                            amount: req.amount,
                                                                            payment_method: 'Dinheiro',
                                                                            status: 'pago',
                                                                            professional_id: req.professional_id,
                                                                            cash_session_id: activeSession?.id || null
                                                                        });
                                                                    }
                                                                }}
                                                                className="flex-1 py-3 rounded-xl bg-orange-500 text-slate-900 font-black uppercase tracking-widest text-[9px] hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                                            >
                                                                Aprovar
                                                            </button>
                                                            <button
                                                                onClick={() => updateRequestStatus(req.id, 'denied')}
                                                                className="flex-1 py-3 rounded-xl border border-white/10 text-white/30 font-black uppercase tracking-widest text-[9px] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all active:scale-95"
                                                            >
                                                                Negar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setModalMode('none')}
                                            className="w-full py-5 rounded-2xl border border-white/10 text-white/30 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                )}

                                {/* TRANSACTION / DESPESA */}
                                {modalMode === 'transaction' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-md">
                                            <span className="material-symbols-outlined text-3xl">remove_circle</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Descrição da Despesa</label>
                                                <input
                                                    type="text"
                                                    value={transDesc}
                                                    onChange={e => setTransDesc(e.target.value)}
                                                    placeholder="Ex: Materiais, fornecedores..."
                                                    className="w-full bg-[#111827]/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-rose-500/30 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Valor</label>
                                                <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4 focus-within:border-rose-500/30 transition-all">
                                                    <span className="font-mono text-rose-400 font-black text-xl">R$</span>
                                                    <input
                                                        type="number"
                                                        value={transAmount}
                                                        onChange={e => setTransAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="bg-transparent text-white outline-none w-full font-mono text-3xl font-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    onClick={() => setModalMode('none')}
                                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const val = parseCurrency(transAmount);
                                                        const primaryPro = dbProfessionals.find(p => p.name === transProf);

                                                        await addTransaction({
                                                            type: 'saida',
                                                            description: transDesc || 'Despesa Avulsa',
                                                            category: 'Despesa',
                                                            amount: val,
                                                            payment_method: 'Dinheiro',
                                                            status: 'pago',
                                                            professional_id: primaryPro?.id || null,
                                                            cash_session_id: activeSession?.id || null
                                                        });
                                                        setModalMode('none');
                                                        resetForm();
                                                    }}
                                                    className="flex-[2] py-4 rounded-2xl bg-rose-500 text-slate-900 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-500/20 transition-all active:scale-95"
                                                >
                                                    Registrar Despesa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* BILL / CONTA A PAGAR */}
                                {modalMode === 'bill' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-md">
                                            <span className="material-symbols-outlined text-3xl">receipt_long</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Descrição da Conta</label>
                                                <input
                                                    type="text"
                                                    value={transDesc}
                                                    onChange={e => setTransDesc(e.target.value)}
                                                    placeholder="Ex: Aluguel, Energia, Fornecedor..."
                                                    className="w-full bg-[#111827]/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500/30 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Valor</label>
                                                <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4 focus-within:border-indigo-500/30 transition-all">
                                                    <span className="font-mono text-indigo-400 font-black text-xl">R$</span>
                                                    <input
                                                        type="number"
                                                        value={transAmount}
                                                        onChange={e => setTransAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="bg-transparent text-white outline-none w-full font-mono text-3xl font-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    onClick={() => setModalMode('none')}
                                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const val = parseCurrency(transAmount);

                                                        await addTransaction({
                                                            type: 'conta',
                                                            description: transDesc || 'Conta a Pagar',
                                                            category: 'Conta',
                                                            amount: val,
                                                            payment_method: 'Transferência',
                                                            status: 'pago',
                                                            cash_session_id: activeSession?.id || null
                                                        });

                                                        // Optional: If this was matching an existing bill, we could update it
                                                        const matchedBill = dbBills.find(b => b.description === transDesc && b.status !== 'paga');
                                                        if (matchedBill) {
                                                            await updateDbBill(matchedBill.id, { status: 'paga' });
                                                        }

                                                        setModalMode('none');
                                                        resetForm();
                                                    }}
                                                    className="flex-[2] py-4 rounded-2xl bg-indigo-500 text-slate-900 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                                                >
                                                    Pagar Conta
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CLOSURE / FECHAMENTO */}
                                {modalMode === 'close' && (
                                    <div className="space-y-8 animate-in zoom-in-95 duration-400">
                                        <div className="p-8 bg-[#0f172a] rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                                <span className="material-symbols-outlined text-[10rem]">analytics</span>
                                            </div>

                                            <div className="relative z-10 space-y-8">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]">Saldo em Mãos</span>
                                                        <p className="text-5xl font-black mt-1 text-white" style={{fontFamily:'Bebas Neue'}}>R$ <span className="text-white">{saldoAtual.toLocaleString('pt-BR')}</span></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Status do Turno</span>
                                                        <div className="flex items-center gap-2 mt-1 justify-end">
                                                            <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                            <span className="font-black text-emerald-400 text-[10px] uppercase tracking-widest">Finalizando</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-8">
                                                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                                                        <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block mb-2">Entradas (+)</span>
                                                        <span className="text-emerald-400 font-black text-2xl tracking-tighter" style={{fontFamily:'Bebas Neue'}}>+{formatCurrency(totalEntradas)}</span>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                                                        <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block mb-2">Saídas (-)</span>
                                                        <span className="text-rose-400 font-black text-2xl tracking-tighter" style={{fontFamily:'Bebas Neue'}}>-{formatCurrency(totalSaidas)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Valor Real Físico em Caixa (Obrigatório)</label>
                                                <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4 focus-within:border-cyan-500/30 transition-all shadow-inner">
                                                    <span className="font-mono text-cyan-400 font-black text-xl">R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={actualClosingBalanceInput}
                                                        onChange={e => setActualClosingBalanceInput(e.target.value)}
                                                        className="bg-transparent text-white outline-none w-full font-mono text-2xl font-black focus:ring-0"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Notas de Encerramento (Obrigatório)</label>
                                                <textarea
                                                    value={closureObservations}
                                                    onChange={e => setClosureObservations(e.target.value)}
                                                    placeholder="Relate quebras de caixa, observações ou lembretes..."
                                                    className="w-full bg-[#111827]/40 border border-white/5 rounded-2xl p-5 text-sm text-white/80 outline-none focus:border-cyan-500/30 transition-all min-h-[120px] resize-none"
                                                />
                                            </div>

                                            <div className="p-5 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 flex items-start gap-3">
                                                <span className="material-symbols-outlined text-cyan-400 mt-0.5">warning</span>
                                                <p className="text-[11px] text-cyan-400/70 font-bold leading-relaxed">
                                                    Ao confirmar o fechamento, o caixa será bloqueado para novas operações neste turno e o histórico será consolidado.
                                                </p>
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setModalMode('none')}
                                                    className="flex-1 py-5 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                                >
                                                    Manter Aberto
                                                </button>
                                                <button
                                                    disabled={!closureObservations.trim() || !actualClosingBalanceInput}
                                                    onClick={async () => {
                                                        if (activeSession && profile?.id) {
                                                            const actualVal = parseFloat(actualClosingBalanceInput) || 0;
                                                            await closeSession(activeSession.id, actualVal, saldoAtual, closureObservations, profile.id);
                                                            setModalMode('none');
                                                            setActualClosingBalanceInput('');
                                                            setClosureObservations('');
                                                            setShowPinEntry(false);
                                                            setPinInput('');
                                                            setPinStatus('neutral');
                                                        }
                                                    }}
                                                    className={`flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl 
                                                        ${(!closureObservations.trim() || !actualClosingBalanceInput)
                                                            ? 'bg-white/5 text-white/10 cursor-not-allowed opacity-60'
                                                            : 'bg-rose-500 text-slate-900 hover:bg-rose-400 shadow-rose-500/20 active:scale-95'}`}
                                                >
                                                    Confirmar Fechamento
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* RESOLVE PENDING PAYMENT */}
                                {modalMode === 'resolve_pending' && selectedPendingTransaction && (
                                    <div className="space-y-8 animate-in zoom-in-95 duration-400 font-sans">
                                        <div className="w-20 h-20 mx-auto rounded-[1.5rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-lg">
                                            <span className="material-symbols-outlined text-4xl text-cyan-400">pending_actions</span>
                                        </div>

                                        <div className="text-center">
                                            <h3 className="text-3xl font-black text-white tracking-tight uppercase" style={{fontFamily:'Bebas Neue'}}>Dar Baixa em Débito</h3>
                                            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Quitar pagamento pendente do cliente</p>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/5 space-y-4">
                                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                                <span className="text-[10px] text-white/40 uppercase font-black tracking-wider">Cliente:</span>
                                                <span className="text-sm font-bold text-white">{selectedPendingTransaction.client}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                                <span className="text-[10px] text-white/40 uppercase font-black tracking-wider">Serviços:</span>
                                                <span className="text-sm font-bold text-white/80">{selectedPendingTransaction.description}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-cyan-400 uppercase font-black tracking-wider">Valor a Receber:</span>
                                                <span className="text-2xl font-black text-cyan-400 font-mono">{formatCurrency(selectedPendingTransaction.amount)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2 block">Escolha a Forma de Pagamento Real</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['PIX', 'Dinheiro', 'Crédito', 'Débito'].map(method => (
                                                    <button
                                                        key={method}
                                                        type="button"
                                                        onClick={() => setResolvePaymentMethod(method)}
                                                        className={`py-3 px-4 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2
                                                            ${resolvePaymentMethod === method
                                                                ? 'bg-cyan-500 text-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                                                                : 'bg-[#111827]/40 border-white/5 text-white/60 hover:border-white/10 hover:bg-[#111827]/60'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-base">
                                                            {method === 'PIX' ? 'qr_code_2' : method === 'Dinheiro' ? 'payments' : method === 'Crédito' ? 'credit_card' : 'credit_score'}
                                                        </span>
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button
                                                onClick={() => {
                                                    setModalMode('none');
                                                    resetForm();
                                                }}
                                                className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                onClick={handleResolvePendingPayment}
                                                disabled={!resolvePaymentMethod}
                                                className={`flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl
                                                    ${!resolvePaymentMethod
                                                        ? 'bg-white/5 text-white/10 cursor-not-allowed opacity-60'
                                                        : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-emerald-500/20 active:scale-95'}`}
                                            >
                                                Confirmar Quitação
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Success Modal */}
            {
                success && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0f172a]/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
                        <div className="bg-[#1e293b] rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50" />
                            <div className="size-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                <span className="material-symbols-outlined text-5xl">check_circle</span>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight" style={{fontFamily:'Bebas Neue'}}>{success.title}</h2>
                            <p className="text-white/40 text-xs font-bold mb-8 leading-relaxed px-4 uppercase tracking-widest">
                                {success.message}
                            </p>
                            <button
                                onClick={() => setSuccess(null)}
                                className="w-full h-14 bg-emerald-500 text-slate-900 rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[10px]"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CashFlow;