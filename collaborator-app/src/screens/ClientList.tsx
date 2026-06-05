import React, { useState, useRef, useEffect } from 'react';
import { useClients } from '../hooks/useClients';
import { Database } from '../lib/database.types';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { useAppointments } from '../hooks/useAppointments';
import { useTransactions } from '../hooks/useTransactions';
import { useProfessionals } from '../hooks/useProfessionals';
import { supabase } from '../lib/supabase';

type Client = Database['public']['Tables']['clients']['Row'];

const ClientList: React.FC = () => {
    const { clients, loading, error: supabaseError, addClient, updateClient, deleteClient } = useClients();
    const { hasAccess, role: userRole, professionalId: loggedProId } = useCurrentUserRef();
    const canViewAll = userRole === 'admin' || userRole === 'manager' || hasAccess('team_view_all');
    const { appointments: allAppointments } = useAppointments();
    const { transactions: allTransactions } = useTransactions();
    const { professionals } = useProfessionals();
    const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailItem, setDetailItem] = useState<any>(null);
    const [showNewClientModal, setShowNewClientModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'Todos' | 'Recentes' | 'VIP' | 'Aniversariantes'>('Todos');
    const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [cepLoading, setCepLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    // Removed isDeleteModalOpen, replaced by confirmModalState
    const [historyFilterDate, setHistoryFilterDate] = useState('');
    const [historyFilterPro, setHistoryFilterPro] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Confirm/Success Modals
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, clientId: string | null }>({ isOpen: false, clientId: null });
    const [successModalState, setSuccessModalState] = useState<{ isOpen: boolean, title: string, description: string }>({ isOpen: false, title: '', description: '' });

    // Update selected client when clients list changes or is loaded for the first time
    useEffect(() => {
        if (clients.length > 0 && !selectedClient) {
            setSelectedClient(clients[0]);
        } else if (selectedClient) {
            const updated = clients.find(c => c.id === selectedClient.id);
            if (updated) setSelectedClient(updated);
        }
    }, [clients, selectedClient]);

    const [newClient, setNewClient] = useState({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        nascimento: '',
        cep: '',
        endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        isVip: false,
        alergias: '',
        preferencias: '',
        bebidaPreferida: '',
        avatar: null as File | null
    });

    // Máscara de CPF: 000.000.000-00
    const formatCPF = (value: string): string => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    };

    // Validação de CPF
    const validateCPF = (cpf: string): boolean => {
        const numbers = cpf.replace(/\D/g, '');
        if (numbers.length !== 11) return false;

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(numbers)) return false;

        // Validação do primeiro dígito verificador
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(numbers[i]) * (10 - i);
        }
        let digit = (sum * 10) % 11;
        if (digit === 10) digit = 0;
        if (digit !== parseInt(numbers[9])) return false;

        // Validação do segundo dígito verificador
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(numbers[i]) * (11 - i);
        }
        digit = (sum * 10) % 11;
        if (digit === 10) digit = 0;
        if (digit !== parseInt(numbers[10])) return false;

        return true;
    };

    // Máscara de Telefone: (00) 00000-0000
    const formatPhone = (value: string): string => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    };

    // Máscara de CEP: 00000-000
    const formatCEP = (value: string): string => {
        const numbers = value.replace(/\D/g, '').slice(0, 8);
        if (numbers.length <= 5) return numbers;
        return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    };

    // Formatar data para exibição: YYYY-MM-DD -> DD/MM/AAAA
    const formatDateDisplay = (dateStr: string | null | undefined): string => {
        if (!dateStr) return 'Não informado';
        try {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    };

    // Busca CEP na API ViaCEP
    const fetchAddress = async (cep: string) => {
        const numbers = cep.replace(/\D/g, '');
        if (numbers.length !== 8) return;

        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setNewClient(prev => ({
                    ...prev,
                    endereco: data.logradouro || '',
                    bairro: data.bairro || '',
                    cidade: data.localidade || '',
                    estado: data.uf || ''
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        } finally {
            setCepLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let formattedValue = value;

        if (name === 'cpf') {
            formattedValue = formatCPF(value);
            const isValid = validateCPF(formattedValue);
            if (formattedValue.replace(/\D/g, '').length === 11) {
                setCpfStatus(isValid ? 'valid' : 'invalid');
            } else {
                setCpfStatus('idle');
            }
        } else if (name === 'telefone') {
            formattedValue = formatPhone(value);
        } else if (name === 'cep') {
            formattedValue = formatCEP(value);
            if (formattedValue.replace(/\D/g, '').length === 8) {
                fetchAddress(formattedValue);
            }
        }

        setNewClient(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : formattedValue
        }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewClient(prev => ({ ...prev, avatar: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditClient = () => {
        if (!selectedClient) return;
        setIsEditing(true);
        const addr = (selectedClient.address_json as any) || {};
        setNewClient({
            nome: selectedClient.name,
            cpf: selectedClient.cpf || '',
            telefone: selectedClient.phone || '',
            email: selectedClient.email || '',
            nascimento: selectedClient.birth_date || '',
            cep: addr.cep || '',
            endereco: addr.logradouro || '',
            bairro: addr.bairro || '',
            cidade: addr.cidade || '',
            estado: addr.estado || '',
            isVip: selectedClient.is_vip || false,
            alergias: selectedClient.allergies || '',
            preferencias: selectedClient.preferences || '',
            bebidaPreferida: selectedClient.favorite_drink || '',
            avatar: null
        });
        setAvatarPreview(selectedClient.avatar_url || null);
        if (selectedClient.cpf && validateCPF(selectedClient.cpf)) {
            setCpfStatus('valid');
        } else {
            setCpfStatus('idle');
        }
        setShowNewClientModal(true);
    };

    const handleDeleteClient = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the client when clicking delete button
        if (!selectedClient) return;
        setConfirmModalState({ isOpen: true, clientId: selectedClient.id });
    };

    const confirmDeleteClient = async () => {
        if (!confirmModalState.clientId) return;

        try {
            const success = await deleteClient(confirmModalState.clientId);
            if (success) {
                setConfirmModalState({ isOpen: false, clientId: null });
                setSuccessModalState({ isOpen: true, title: 'CLIENTE EXCLUÍDO', description: 'O cliente foi excluído com sucesso.' });

                if (selectedClient?.id === confirmModalState.clientId) {
                    // If the deleted client was selected, try to select another one or null
                    const remaining = clients.filter(c => c.id !== confirmModalState.clientId);
                    setSelectedClient(remaining.length > 0 ? remaining[0] : undefined);
                }
            } else {
                setConfirmModalState({ isOpen: false, clientId: null });
                // Show an error message in the success modal or a dedicated error modal
                setSuccessModalState({ isOpen: true, title: 'ERRO AO EXCLUIR', description: 'Não foi possível excluir o cliente. Verifique se existem agendamentos ou transações vinculadas.' });
            }
        } catch (err: any) {
            console.error('Erro na deleção:', err);
            setConfirmModalState({ isOpen: false, clientId: null });
            setSuccessModalState({ isOpen: true, title: 'ERRO INESPERADO', description: `Erro inesperado ao excluir cliente: ${err.message}` });
        }
    };

    const handleSaveClient = async () => {
        let finalAvatarUrl = avatarPreview;

        // If there's a new file to upload
        if (newClient.avatar) {
            try {
                const fileExt = newClient.avatar.name.split('.').pop();
                const fileName = `new-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, newClient.avatar);

                if (!uploadError) {
                    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                    finalAvatarUrl = data.publicUrl;
                }
            } catch (err) {
                console.error('Error uploading avatar:', err);
            }
        }

        const clientData = {
            name: newClient.nome,
            cpf: newClient.cpf,
            phone: newClient.telefone,
            email: newClient.email,
            birth_date: newClient.nascimento || null,
            is_vip: newClient.isVip,
            allergies: newClient.alergias,
            preferences: newClient.preferencias,
            favorite_drink: newClient.bebidaPreferida,
            avatar_url: finalAvatarUrl,
            address_json: {
                cep: newClient.cep,
                logradouro: newClient.endereco,
                bairro: newClient.bairro,
                cidade: newClient.cidade,
                estado: newClient.estado
            }
        };

        let result;
        if (isEditing && selectedClient) {
            result = await updateClient(selectedClient.id, clientData);
            if (result) {
                setSelectedClient(result);
                setSuccessModalState({ isOpen: true, title: 'CLIENTE ATUALIZADO', description: 'Os dados do cliente foram atualizados com sucesso.' });
            } else {
                setSuccessModalState({ isOpen: true, title: 'ERRO AO ATUALIZAR', description: 'Não foi possível atualizar os dados do cliente.' });
            }
        } else {
            result = await addClient({
                ...clientData,
                tags: ['Novo']
            });
            if (result) {
                setSelectedClient(result);
                setSuccessModalState({ isOpen: true, title: 'CLIENTE CADASTRADO', description: 'Novo cliente adicionado com sucesso!' });
            } else {
                setSuccessModalState({ isOpen: true, title: 'ERRO AO CADASTRAR', description: 'Não foi possível adicionar o novo cliente.' });
            }
        }

        resetModal();
    };

    const resetModal = () => {
        setShowNewClientModal(false);
        setIsEditing(false);
        setNewClient({
            nome: '',
            cpf: '',
            telefone: '',
            email: '',
            nascimento: '',
            cep: '',
            endereco: '',
            bairro: '',
            cidade: '',
            estado: '',
            isVip: false,
            alergias: '',
            preferencias: '',
            bebidaPreferida: '',
            avatar: null
        });
        setAvatarPreview(null);
        setCpfStatus('idle');
    };

    const filteredClients = clients.filter(client => {
        // 1. Search Filter
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.phone && client.phone.includes(searchTerm)) ||
            (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        // 2. Category Filter
        if (activeFilter === 'Todos') return true;
        if (activeFilter === 'Recentes') {
            const isRecentTag = client.tags?.includes('Recentes') || client.tags?.includes('Novo');
            if (isRecentTag) return true;
            return false;
        }
        if (activeFilter === 'VIP') return client.is_vip;
        if (activeFilter === 'Aniversariantes') {
            if (!client.birth_date) return false;
            try {
                const birthMonth = parseInt(client.birth_date.split('-')[1]) - 1; // 0-indexed
                const currentMonth = new Date().getMonth();
                return birthMonth === currentMonth;
            } catch (e) {
                return false;
            }
        }

        return true;
    });

    // Combine and sort history
    const clientHistory = React.useMemo(() => {
        if (!selectedClient) return [];

        // 1. Get all Income Transactions (already through checkout)
        const paidTransactions = allTransactions
            .filter(t => t.client_id === selectedClient.id && t.type === 'entrada')
            .map(t => {
                const items = (t.items_json as any[]) || [];
                const mainService = items.length > 0 ? items[0].title : (t.description?.replace('Pgto: ', '') || 'Venda/Serviço');
                const hasExtras = items.length > 1;
                const totalAmount = t.amount;
                // In our checkout flow, the primary pro is stored in primaryTransaction.professional_id
                // but individual items in items_json also have professional name.
                const professionalName = professionals.find(p => p.id === t.professional_id)?.name ||
                    (items.length > 0 ? items[0].professional : 'Não atribuído');

                return {
                    id: t.id,
                    date: t.created_at || '',
                    type: 'transaction',
                    title: mainService,
                    professional: professionalName,
                    amount: totalAmount,
                    status: t.status || 'pago',
                    observation: t.observation,
                    items: items,
                    hasExtras,
                    startTime: (t as any).servico_iniciado_at,
                    endTime: (t as any).servico_terminado_at,
                    discount: t.discount || 0,
                    professionalId: t.professional_id,
                    raw: t
                };
            });

        // 2. Get Paid Appointments (but filter out those that likely created a transaction)
        const paidAppointments = allAppointments
            .filter(a => {
                if (a.client_id !== selectedClient.id) return false;
                if (a.status !== 'pago' && a.status !== 'Pago') return false;

                // Anti-deduplication logic: 
                // We filter out appointments that have a corresponding transaction on the same day.
                // We assume they match if they share the same date.
                const aptDate = a.start_time.split('T')[0];
                const hasMatchingTrans = paidTransactions.some(t => {
                    const transDate = t.date.split('T')[0];
                    return transDate === aptDate;
                });

                return !hasMatchingTrans;
            })
            .map(a => ({
                id: a.id,
                date: a.start_time,
                type: 'appointment',
                title: a.service?.title || 'Agendamento',
                professional: a.professional?.name || 'Não atribuído',
                amount: a.service?.price || 0,
                status: a.status,
                observation: a.notes,
                items: [],
                hasExtras: false,
                startTime: (a as any).servico_iniciado_at,
                endTime: (a as any).servico_terminado_at,
                discount: 0,
                professionalId: a.professional_id,
                raw: a
            }));

        return [...paidTransactions, ...paidAppointments]
            .filter(item => {
                // 1. Role-based restriction: Professionals (non-admins) see only their own services
                if (userRole === 'professional' && loggedProId && item.professionalId !== loggedProId) {
                    return false;
                }

                // 2. User-applied filters
                const matchesDate = !historyFilterDate || item.date.startsWith(historyFilterDate);
                const matchesPro = !historyFilterPro || item.professional === historyFilterPro;
                return matchesDate && matchesPro;
            })
            .sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
    }, [selectedClient, allTransactions, allAppointments, professionals, historyFilterDate, historyFilterPro, userRole, loggedProId]);

    // Calculate Stats
    const clientStats = React.useMemo(() => {
        if (!selectedClient) return { total: 0, visits: 0 };

        const total = clientHistory.reduce((acc, item) => acc + item.amount, 0);

        return { total, visits: clientHistory.length };
    }, [selectedClient, clientHistory]);

    return (
        <div className="bg-[#0A0F1C] text-white h-full font-sans flex flex-col overflow-hidden relative selection:bg-amber-500/30">

            {/* Modal de Novo Cliente */}
            {showNewClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="font-extrabold p-6 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#0f172a] rounded-xl backdrop-blur-sm">
                                    <span className="material-symbols-outlined text-white text-2xl">person_add</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                                    <p className="text-white/80 text-sm">{isEditing ? 'Atualize os dados do cliente' : 'Preencha os dados para cadastrar'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">

                            {/* Avatar Upload */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 rounded-full bg-[#1e293b] border border-white/10 shadow-sm hover:shadow-md transition-all rounded-xl border-4 border-dashed border-white/10 hover:border-amber-500 flex items-center justify-center cursor-pointer transition-all overflow-hidden group"
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center text-white/40 group-hover:text-amber-500 transition-colors">
                                                <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                                <span className="text-[10px] font-bold mt-1">FOTO</span>
                                            </div>
                                        )}
                                    </div>
                                    {avatarPreview && (
                                        <button
                                            onClick={() => { setAvatarPreview(null); setNewClient(prev => ({ ...prev, avatar: null })); }}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500/100 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Dados Básicos */}
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">person</span>
                                    Dados Pessoais
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Nome Completo *</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">badge</span>
                                            <input
                                                type="text"
                                                name="nome"
                                                value={newClient.nome}
                                                onChange={handleInputChange}
                                                placeholder="Nome do cliente"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* CPF */}
                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">CPF</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">fingerprint</span>
                                            <input
                                                type="text"
                                                name="cpf"
                                                value={newClient.cpf}
                                                onChange={handleInputChange}
                                                placeholder="000.000.000-00"
                                                maxLength={14}
                                                className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-[#1e293b] text-white outline-none transition-all ${cpfStatus === 'valid' ? 'border-green-500 focus:ring-2 focus:ring-green-500/50' :
                                                    cpfStatus === 'invalid' ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' :
                                                        'border-white/10 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500'
                                                    }`}
                                            />
                                            {cpfStatus === 'valid' && (
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-500">check_circle</span>
                                            )}
                                            {cpfStatus === 'invalid' && (
                                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-red-500">error</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Telefone */}
                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Telefone *</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">call</span>
                                            <input
                                                type="tel"
                                                name="telefone"
                                                value={newClient.telefone}
                                                onChange={handleInputChange}
                                                placeholder="(00) 00000-0000"
                                                maxLength={15}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Email</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">mail</span>
                                            <input
                                                type="email"
                                                name="email"
                                                value={newClient.email}
                                                onChange={handleInputChange}
                                                placeholder="email@exemplo.com"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Nascimento */}
                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Data de Nascimento</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">cake</span>
                                            <input
                                                type="date"
                                                name="nascimento"
                                                value={newClient.nascimento}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Localização */}
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">location_on</span>
                                    Localização
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">CEP</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">explore</span>
                                            <input
                                                type="text"
                                                name="cep"
                                                value={newClient.cep}
                                                onChange={handleInputChange}
                                                placeholder="00000-000"
                                                maxLength={9}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                            />
                                            {cepLoading && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-[#06b6d4] rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Endereço (Logradouro)</label>
                                        <input
                                            type="text"
                                            name="endereco"
                                            value={newClient.endereco}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Av. Paulista, 1000"
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Bairro</label>
                                        <input
                                            type="text"
                                            name="bairro"
                                            value={newClient.bairro}
                                            onChange={handleInputChange}
                                            placeholder="Bairro"
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Cidade</label>
                                        <input
                                            type="text"
                                            name="cidade"
                                            value={newClient.cidade}
                                            onChange={handleInputChange}
                                            placeholder="Cidade"
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-label text-white/50 uppercase tracking-wide mb-2">Estado (UF)</label>
                                        <input
                                            type="text"
                                            name="estado"
                                            value={newClient.estado}
                                            onChange={handleInputChange}
                                            placeholder="SP"
                                            maxLength={2}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preferências */}
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">favorite</span>
                                    Preferências
                                </h4>
                                <textarea
                                    name="preferencias"
                                    value={newClient.preferencias}
                                    onChange={handleInputChange}
                                    placeholder="Observações complementares..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1e293b] text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-4 flex gap-3 border-t border-white/10 bg-[#1e293b] shrink-0">
                            <button
                                onClick={resetModal}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-bold bg-[#1e293b] shadow-sm border border-white/10 hover:border-amber-500/30 hover:shadow transition-all rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClient}
                                disabled={!newClient.nome || !newClient.telefone}
                                className="flex-1 py-3 rounded-xl bg-[#0f172a] hover:bg-amber-600 text-white font-bold transition-all shadow-lg shadow-amber-900/40 disabled:opacity-50"
                            >
                                {isEditing ? 'Salvar Alterações' : 'Salvar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Histórico */}
            {showDetailModal && detailItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="shadow-md text-white/10 p-6 border-b border-amber-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#0f172a] text-white shadow-md rounded-lg text-white">
                                    <span className="material-symbols-outlined">
                                        payments
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{detailItem.title}</h3>
                                    <p className="text-xs text-white/50">
                                         {new Date(detailItem.date.includes('T') ? detailItem.date : detailItem.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {new Date(detailItem.date.includes('T') ? detailItem.date : detailItem.date + 'T12:00:00').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-white/40 hover:text-white/80 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Profissional</p>
                                    <p className="text-sm font-bold text-white">{detailItem.professional}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Status</p>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block bg-emerald-50 text-emerald-600 border border-emerald-200`}>
                                        PAGO
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-white/40 font-bold uppercase mb-2">Serviços Extras / Adicionais</p>
                                <div className="bg-[#1e293b] rounded-xl border border-white/10 overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-[#1e293b] border border-white/10 shadow-sm hover:shadow-md transition-all rounded-xl text-white/50 font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2">Serviço Extra</th>
                                                <th className="px-4 py-2">Profissional</th>
                                                <th className="px-4 py-2 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {detailItem.items.slice(1).map((item: any, idx: number) => (
                                                <tr key={idx} className="bg-[#1e293b]">
                                                    <td className="px-4 py-3 font-bold text-white">{item.title || item.name}</td>
                                                    <td className="px-4 py-3 text-white/80">{item.professional || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-right font-black text-white">
                                                        {(item.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="shadow-md text-white/10 font-black text-cyan-900 border-t-2 border-amber-500/20">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 uppercase tracking-widest text-[10px]">Total dos Extras</td>
                                                <td className="px-4 py-3 text-right text-sm">
                                                    {detailItem.items.slice(1).reduce((acc: number, item: any) => acc + (item.price || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-white/40 font-bold uppercase mb-2">Observações / Notas</p>
                                <div className="shadow-md text-white/10/50 rounded-lg p-4 border border-amber-500/20 min-h-[80px]">
                                    <p className="text-sm text-white/80 italic">
                                        {detailItem.observation || 'Nenhuma observação registrada.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-0">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="w-full py-3 bg-[#1e293b] border border-white/10 shadow-sm hover:shadow-md transition-all rounded-xl hover:bg-slate-200 text-white/80 font-bold rounded-xl transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Adding error display from Supabase */}
            {supabaseError && (
                <div className="fixed bottom-4 right-4 z-[100] bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce font-bold">
                    {supabaseError}
                </div>
            )}

            <main className="flex-1 flex overflow-hidden bg-[#0f172a]">
                {/* Sidebar List */}
                <aside className="w-[400px] bg-[#0f172a] flex flex-col z-10 flex-shrink-0">
                    <div className="m-4 p-5 flex flex-col gap-4 bg-[#1e293b] border border-white/5 rounded-2xl shadow-xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-h2 text-white">Lista de Clientes</h2>
                            <span className="bg-white/10 text-label px-2 py-1 rounded-md">{filteredClients.length} Total</span>
                        </div>

                        {hasAccess('clients_create') && (
                            <button
                                onClick={() => {
                                    resetModal();
                                    setShowNewClientModal(true);
                                }}
                                className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-500/30 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95 group"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform duration-300">add</span>
                                Cadastrar Novo Cliente
                            </button>
                        )}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-white/40 group-focus-within:text-amber-500 transition-colors">search</span>
                            </div>
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-[#1e293b] focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:outline-none shadow-none text-white text-body transition-all"
                                placeholder="Buscar cliente..."
                                type="text"
                            />
                        </div>
                        {/* Filter buttons omitted for brevity in chunk but they are logically the same */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide font-bold">
                            {['Todos', 'VIP', 'Aniversariantes'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter as any)}
                                    className={`px-3 py-1.5 text-label rounded-full shadow-none whitespace-nowrap transition-colors cursor-pointer ${activeFilter === filter ? 'bg-amber-600/20 text-amber-500 border border-amber-600/30 font-bold shadow-md shadow-amber-900/20' : 'bg-transparent border border-white/10 text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0f172a]">



                        {loading ? (
                            <div className="flex flex-col items-center py-10 gap-2">
                                <div className="w-8 h-8 border-4 border-amber-500/30 border-t-[#06b6d4] rounded-full animate-spin"></div>
                                <p className="text-white/40 text-sm font-bold animate-pulse">Carregando...</p>
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="text-center py-8 text-white/50">
                                <span className="material-symbols-outlined text-4xl mb-2 text-white/50">search_off</span>
                                <p>Nenhum cliente encontrado</p>
                            </div>
                        ) : (
                            filteredClients.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className={`bg-[#1e293b] p-4 rounded-xl shadow-md border-l-4 cursor-pointer ring-1 transition-all group ${selectedClient?.id === client.id
                                        ? 'border-amber-500 ring-amber-500/50 shadow-md text-white/10/10 shadow-lg'
                                        : 'border-transparent ring-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-4 text-white">
                                        <div className="relative">
                                            <div
                                                className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 bg-[#1e293b] border border-white/10 shadow-sm hover:shadow-md transition-all rounded-xl"
                                                style={{ backgroundImage: client.avatar_url ? `url("${client.avatar_url}")` : undefined }}
                                            >
                                                {!client.avatar_url && (
                                                    <div className="w-full h-full flex items-center justify-center bg-white/10 text-amber-500 font-bold rounded-full">
                                                        {client.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className={`text-body-bold truncate ${selectedClient?.id === client.id ? 'text-amber-500' : 'text-white'}`}>{client.name}</h3>
                                            </div>
                                            <p className="text-white/40 text-label truncate mt-0.5">{client.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            )))}
                    </div>


                </aside>

                {/* Content Section */}
                <section className="flex-1 bg-[#1e293b] overflow-y-auto relative rounded-tl-xl border-l border-t border-white/5 shadow-2xl mt-4 custom-scrollbar">
                    {!selectedClient ? (
                        <div className="h-full flex flex-col items-center justify-center bg-[#1e293b] text-white/40">
                            <span className="material-symbols-outlined text-6xl mb-4">person_search</span>
                            <p className="text-xl font-bold">Selecione um cliente para ver os detalhes</p>
                        </div>
                    ) : (
                        <>
                            {/* Unified Header Area */}
                            <div className="relative px-8 pt-10 pb-6 border-b border-white/5">
                                <div className="absolute top-10 right-8 flex gap-3 z-20">
                                    {hasAccess('clients_edit') && (
                                        <button
                                            type="button"
                                            onClick={handleEditClient}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-xl text-white text-xs font-bold border border-white/10 shadow-lg transition-all cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                            Editar Cliente
                                        </button>
                                    )}
                                    {hasAccess('clients_delete') && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteClient}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 text-xs font-bold border border-red-500/20 shadow-lg transition-all cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                            Excluir
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-end gap-6 relative z-10">
                                    <div className="relative group/avatar">
                                        <div 
                                            className={`size-32 rounded-3xl bg-cover bg-center shadow-2xl ring-offset-4 ring-offset-[#1e293b] transition-all duration-300 ${
                                                selectedClient.is_vip 
                                                ? 'ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                                                : 'ring-4 ring-white/10'
                                            }`}
                                            style={{ backgroundImage: selectedClient.avatar_url ? `url("${selectedClient.avatar_url}")` : undefined }}
                                        >
                                            {!selectedClient.avatar_url && (
                                                <div className="w-full h-full flex items-center justify-center bg-[#0f172a] border border-white/10 text-amber-500 font-bold text-5xl rounded-3xl">
                                                    {selectedClient.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <h1 className="text-4xl font-black text-white tracking-tight mb-1 uppercase" style={{ fontFamily: 'Bebas Neue' }}>{selectedClient.name}</h1>
                                        <div className="flex items-center gap-3 text-sm">
                                            {selectedClient.is_vip && (
                                                <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> VIP
                                                </span>
                                            )}
                                            {(selectedClient.address_json as any)?.cidade && (
                                                <span className="flex items-center gap-1.5 text-white/40 font-bold text-[10px] uppercase tracking-widest">
                                                    <span className="material-symbols-outlined text-[16px] text-amber-500/50">location_on</span> 
                                                    {(selectedClient.address_json as any).cidade}, {(selectedClient.address_json as any).estado}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-4 space-y-8">
                                <div className="grid grid-cols-5 gap-8 text-white">
                                    {/* Left Column: Details */}
                                    <div className="col-span-2 space-y-6">
                                        <div className="bg-[#0f172a] rounded-xl p-5 border border-white/10">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-amber-500">person</span>
                                                Dados Pessoais
                                            </h3>
                                            <ul className="space-y-4 text-sm">
                                                <li className="flex items-start gap-3">
                                                    <div className="p-2 bg-[#1e293b] rounded-lg border border-white/10 text-white/40">
                                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-medium">Telefone</p>
                                                        <p className="font-bold text-white">{selectedClient.phone || 'Não informado'}</p>
                                                        <button className="text-[10px] text-green-600 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                                            <span className="material-symbols-outlined text-[10px]">chat</span> Enviar WhatsApp
                                                        </button>
                                                    </div>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <div className="p-2 bg-[#1e293b] rounded-lg border border-white/10 text-white/40">
                                                        <span className="material-symbols-outlined text-[18px]">mail</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-medium">Email</p>
                                                        <p className="font-bold text-white">{selectedClient.email || 'Não informado'}</p>
                                                    </div>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <div className="p-2 bg-[#1e293b] rounded-lg border border-white/10 text-white/40">
                                                        <span className="material-symbols-outlined text-[18px]">cake</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-medium">Aniversário</p>
                                                        <p className="font-bold text-white">{formatDateDisplay(selectedClient.birth_date)}</p>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                        {/* Alergias e Preferências */}
                                        {(selectedClient.allergies || selectedClient.preferences || selectedClient.favorite_drink) && (
                                            <div className="bg-[#0f172a] text-white shadow-md/10 rounded-xl p-5 border border-amber-500/20">
                                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined font-extrabold">favorite</span>
                                                    Cuidados e Preferências
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedClient.allergies && (
                                                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-100">
                                                            <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Alergias</p>
                                                            <p className="text-sm text-red-700 font-bold">{selectedClient.allergies}</p>
                                                        </div>
                                                    )}
                                                    {selectedClient.preferences && (
                                                        <div>
                                                            <p className="text-[10px] font-extrabold font-bold uppercase mb-1">Observações</p>
                                                            <p className="text-sm text-white">{selectedClient.preferences}</p>
                                                        </div>
                                                    )}
                                                    {selectedClient.favorite_drink && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined font-extrabold text-sm">local_cafe</span>
                                                            <p className="text-sm text-white">Bebida: <span className="font-bold">{selectedClient.favorite_drink}</span></p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Endereço */}
                                        {(selectedClient.address_json as any)?.logradouro && (
                                            <div className="bg-[#0f172a] rounded-xl p-5 border border-white/10">
                                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-white/40">explore</span>
                                                    Endereço
                                                </h3>
                                                <p className="text-sm text-white font-bold">{(selectedClient.address_json as any).logradouro}</p>
                                                <p className="text-xs text-slate-400">{(selectedClient.address_json as any).bairro}, {(selectedClient.address_json as any).cidade} - {(selectedClient.address_json as any).estado}</p>
                                                <p className="text-xs text-slate-400">CEP: {(selectedClient.address_json as any).cep}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: History & Stats */}
                                    <div className="col-span-3 space-y-6">
                                        {/* Tag clouds / Insights */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="shadow-md text-white/10 p-5 rounded-xl border border-amber-500/20 flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-none border border-amber-500/20">
                                                    <span className="material-symbols-outlined">payments</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Total Gasto</p>
                                                    <p className="text-xl font-black text-amber-500">
                                                        {clientStats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-blue-500/10 p-5 rounded-xl border border-blue-100 flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-none border border-blue-500/20">
                                                    <span className="material-symbols-outlined">calendar_today</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Visitas</p>
                                                    <p className="text-xl font-black text-blue-400">
                                                        {clientStats.visits}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#1e293b] rounded-xl border border-white/10 overflow-hidden shadow-none">
                                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1e293b] border border-white/10 shadow-sm rounded-xl">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                                        <span className="material-symbols-outlined font-extrabold">history</span>
                                                        Histórico de Serviços
                                                    </h3>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Date Filter */}
                                                    <div className="flex items-center gap-2 px-2 py-1 bg-[#1e293b] border border-white/10 rounded-lg shadow-none">
                                                        <span className="material-symbols-outlined text-white/40 text-sm">calendar_month</span>
                                                        <input
                                                            type="date"
                                                            value={historyFilterDate}
                                                            onChange={(e) => setHistoryFilterDate(e.target.value)}
                                                            className="text-[10px] font-bold text-white/60 focus:outline-none bg-transparent"
                                                        />
                                                    </div>

                                                    {/* Professional Filter */}
                                                    {canViewAll && (
                                                        <div className="flex items-center gap-2 px-2 py-1 bg-[#1e293b] border border-white/10 rounded-lg shadow-none">
                                                            <span className="material-symbols-outlined text-white/40 text-sm">person</span>
                                                            <select
                                                                value={historyFilterPro}
                                                                onChange={(e) => setHistoryFilterPro(e.target.value)}
                                                                disabled={userRole === 'professional'}
                                                                className={`text-[10px] font-bold text-white/60 focus:outline-none bg-transparent appearance-none ${userRole === 'professional' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                            >
                                                                <option value="">{userRole === 'professional' ? professionals.find(p => p.id === loggedProId)?.name : 'Colaborador: Todos'}</option>
                                                                {userRole !== 'professional' && professionals.map(p => (
                                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Clear Filters */}
                                                    {(historyFilterDate || historyFilterPro) && (
                                                        <button
                                                            onClick={() => {
                                                                setHistoryFilterDate('');
                                                                setHistoryFilterPro('');
                                                            }}
                                                            className="size-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shadow-none"
                                                            title="Limpar Filtros"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">filter_list_off</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="divide-y divide-white/10">
                                                {clientHistory.length > 0 ? (
                                                    clientHistory
                                                        .map(item => (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => {
                                                                    if (item.hasExtras) {
                                                                        setDetailItem(item);
                                                                        setShowDetailModal(true);
                                                                    }
                                                                }}
                                                                className={`p-4 flex items-center justify-between group transition-colors ${item.hasExtras ? 'hover:bg-[#1e293b] cursor-pointer' : ''
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="size-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600">
                                                                        <span className="material-symbols-outlined text-xl">
                                                                            payments
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-start gap-4">
                                                                            <p className="font-bold text-sm text-white truncate flex-1">{item.title}</p>
                                                                            <div className="text-right">
                                                                                <div className="flex flex-col items-end">
                                                                                    {(item.hasExtras || item.discount > 0) ? (
                                                                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                                                                            {item.type === 'transaction' && item.items.length > 0 ? (
                                                                                                <>
                                                                                                    {item.items[0].price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                                    {item.hasExtras && ` + ${item.items.slice(1).reduce((acc: number, i: any) => acc + (i.price || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                                                                                    {item.discount > 0 && ` - ${item.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                                                                                    {" ="}
                                                                                                </>
                                                                                            ) : (
                                                                                                <>
                                                                                                    {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                                    {item.discount > 0 && ` (-${item.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
                                                                                                    {" ="}
                                                                                                </>
                                                                                            )}
                                                                                        </p>
                                                                                    ) : null}
                                                                                    <p className="text-sm font-black text-white whitespace-nowrap">
                                                                                        {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center mt-1 gap-2">
                                                                            <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
                                                                                 {new Date(item.date.includes('T') ? item.date : item.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {item.professional}
                                                                            </p>
                                                                            {(item.startTime || item.endTime) && (
                                                                                <div className="flex items-center gap-2 bg-[#1e293b] px-2 py-0.5 rounded border border-white/10">
                                                                                    {item.startTime && (
                                                                                        <span className="text-[9px] font-bold text-white/50">
                                                                                            INÍCIO: <span className="font-extrabold">{new Date(item.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        </span>
                                                                                    )}
                                                                                    {item.endTime && (
                                                                                        <span className="text-[9px] font-bold text-white/50">
                                                                                            FIM: <span className="text-green-600">{new Date(item.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="ml-4 flex flex-col items-end gap-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'confirmed' || item.status === 'pago' ? 'bg-green-100 text-green-700' :
                                                                        item.status === 'pending' ? ' shadow-md text-white/15 text-cyan-700' : 'bg-[#1e293b] border border-white/10 shadow-sm hover:shadow-md transition-all rounded-xl text-white/60'
                                                                        }`}>
                                                                        {item.status === 'confirmed' ? 'Confirmado' :
                                                                            item.status === 'pending' ? 'Pendente' :
                                                                                item.status === 'pago' ? 'Pago' : item.status}
                                                                    </span>
                                                                    {item.hasExtras && (
                                                                        <button
                                                                            className="text-[10px] font-black font-extrabold shadow-md text-white/10 px-2 py-0.5 rounded border border-amber-500/30 hover: shadow-md text-white/15 transition-colors whitespace-nowrap shadow-none"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDetailItem(item);
                                                                                setShowDetailModal(true);
                                                                            }}
                                                                        >
                                                                            VER DETALHES
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="p-8 text-center text-white/40">
                                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">history_edu</span>
                                                        <p className="text-sm">Nenhum histórico encontrado para este cliente.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>

            {/* --- CONFIRMATION MODAL --- */}
            {confirmModalState.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 flex flex-col p-8 animate-scaleIn">
                        <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-6 mx-auto">
                            <span className="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 text-center uppercase tracking-tight">Excluir Cliente</h3>
                        <p className="text-white/50 text-sm font-medium mb-8 text-center">Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e todo o histórico será perdido.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModalState({ isOpen: false, clientId: null })}
                                className="flex-1 py-3 px-4 bg-[#1e293b] border border-white/10 shadow-sm hover:shadow-md transition-all rounded-xl hover:bg-gray-200 text-white/80 rounded-xl font-bold text-xs uppercase tracking-widest transition-all text-center"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteClient}
                                className="flex-1 py-3 px-4 bg-red-500/100 hover:bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all text-center"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUCCESS MODAL --- */}
            {successModalState.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#1e293b] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 flex flex-col items-center p-8 text-center animate-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/100 text-white flex items-center justify-center mb-6 shadow-lg ">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{successModalState.title}</h3>
                        <p className="text-white/50 text-sm font-medium mb-8">{successModalState.description}</p>
                        <button
                            onClick={() => setSuccessModalState({ isOpen: false, title: '', description: '' })}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                        >
                            Excelente!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientList;