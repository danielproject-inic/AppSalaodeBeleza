import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AvailabilityModal } from '../components/AvailabilityModal';
import { useProfessionals } from '../hooks/useProfessionals';
import { useSystemUsers } from '../hooks/useSystemUsers';
import { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

interface TeamManagementProps {
    globalExceptions?: Record<string, Record<string, 'off' | 'vacation' | 'sick'>>; // Keep for legacy if needed or remove
    hasAccess?: (module: any) => boolean;
    currentProfileId?: string;
    collaborators?: any[]; // Keep for prop compatibility if needed
    onUpdateCollaborators?: (cols: any[]) => void;
    onUpdateExceptions?: (id: string, ex: any) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ hasAccess, currentProfileId }) => {
    // Interfaces (kept relevant ones)
    interface Agendamento {
        mes: string;
        dia: string;
        servico: string;
        cliente: string;
        status: 'Concluído' | 'Agendado';
    }

    interface Collaborator {
        id: string;
        nome: string;
        cpf: string;
        funcoes: string[];
        status: 'Ativo' | 'Férias' | 'Ausente' | 'Desligado' | 'Inativo';
        periodo: string;
        avatar: string | null;
        email: string;
        telefone: string;
        nascimento: string;
        admissao: string;
        desligamento?: string;
        endereco: {
            cep: string;
            logradouro: string;
            numero: string;
            bairro: string;
            cidade: string;
            estado: string;
            complemento?: string;
        };
        comissao: string;
        rating: number;
        totalReviews: number;
        agendamentosRecentes: Agendamento[];
        desempenho: number[];
    }

    // --- SUPABASE HOOK ---
    const {
        professionals: dbProfessionals,
        exceptions: dbExceptions,
        loading,
        error: supabaseError,
        addProfessional,
        updateProfessional,
        deleteProfessional,
        addException,
        updateException,
        deleteException,
        refresh
    } = useProfessionals();

    const { users } = useSystemUsers();

    const collaborators: Collaborator[] = useMemo(() => {
        return dbProfessionals.map(p => {
            const addr = (p.address_json as any) || {};
            return {
                id: p.id,
                nome: p.name,
                cpf: p.cpf || '',
                funcoes: p.functions || [],
                status: p.status as any || 'Ativo',
                periodo: 'Integral', // Default or could be in DB
                avatar: p.avatar_url || null,
                email: p.email || '',
                telefone: p.phone || '',
                nascimento: p.birth_date || '',
                admissao: p.hire_date || '',
                desligamento: p.termination_date || undefined,
                endereco: {
                    cep: addr.cep || '',
                    logradouro: addr.logradouro || '',
                    numero: addr.numero || '',
                    bairro: addr.bairro || '',
                    cidade: addr.cidade || '',
                    estado: addr.estado || '',
                    complemento: addr.complemento || ''
                },
                comissao: p.base_commission ? `${p.base_commission}%` : '30%',
                rating: p.average_rating ? Number(p.average_rating) : 5.0,
                totalReviews: p.total_reviews || 0,
                agendamentosRecentes: [], // Needs separate fetch or join
                desempenho: [] // Needs stats
            };
        });
    }, [dbProfessionals]);

    // Map exceptions to the format expected by the rendering logic (globalExceptions format)
    const globalExceptions = useMemo(() => {
        const result: Record<string, Record<string, any>> = {};
        dbExceptions.forEach(ex => {
            if (!result[ex.professional_id!]) result[ex.professional_id!] = {};
            result[ex.professional_id!][ex.date] = {
                type: ex.type,
                start_time: ex.start_time,
                end_time: ex.end_time,
                notes: ex.notes
            };
        });
        return result;
    }, [dbExceptions]);

    const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

    // Ensure selected stays in sync if list updates or filters apply
    useEffect(() => {
        // If we don't have all-view access, always force selection to "me" if not set or if someone else is selected
        if (hasAccess && !hasAccess('team_view_all') && currentProfileId) {
            const me = collaborators.find(c => c.id === currentProfileId);
            if (me && (!selectedCollaborator || selectedCollaborator.id !== currentProfileId)) {
                setSelectedCollaborator(me);
                return;
            }
        }

        if (!selectedCollaborator && collaborators.length > 0) {
            const me = collaborators.find(c => c.id === currentProfileId);
            setSelectedCollaborator(me || collaborators[0]);
        } else if (selectedCollaborator) {
            const updated = collaborators.find(c => c.id === selectedCollaborator.id);
            if (updated) {
                setSelectedCollaborator(updated);
            } else {
                const me = collaborators.find(c => c.id === currentProfileId);
                setSelectedCollaborator(me || (collaborators.length > 0 ? collaborators[0] : null));
            }
        }
    }, [collaborators, currentProfileId, hasAccess]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isTerminationChecked, setIsTerminationChecked] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Confirm/Success Modals
    const [successModalState, setSuccessModalState] = useState<{ isOpen: boolean, title: string, description: string, isError?: boolean }>({ isOpen: false, title: '', description: '', isError: false });

    // Validation States
    const [cpfStatus, setCpfStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [cepLoading, setCepLoading] = useState(false);
    const [functionInput, setFunctionInput] = useState('');
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<{ message: string; isError: boolean; showReset?: boolean } | null>(null);
    const [credentialsModal, setCredentialsModal] = useState<{ email: string; password: string } | null>(null);
    const handleInviteCollaborator = async (email: string, forceReset = false) => {
        if (!email) return;
        setInviteLoading(true);
        setInviteStatus(null);
        try {
            const { data: result, error: invokeError } = await supabase.functions.invoke('invite-collaborator', {
                body: { email, resetSelection: forceReset }
            });

            if (invokeError) {
                // Try to parse the error message from the response if it's a non-2xx status
                let errorMsg = 'Erro ao criar acesso';
                try {
                    const errorJson = await invokeError.context.json();
                    errorMsg = errorJson.error || errorMsg;

                    if (errorJson.code === 'USER_EXISTS') {
                        setInviteStatus({
                            message: 'Este e-mail já possui conta. Deseja reiniciar o acesso dele?',
                            isError: true,
                            showReset: true
                        });
                        return;
                    }
                } catch (e) { }
                throw new Error(errorMsg);
            }

            // Show the credentials modal
            setCredentialsModal({ email, password: result.temp_password });
            setInviteStatus({ message: 'Acesso criado com sucesso! ✅', isError: false });
        } catch (err: any) {
            setInviteStatus({ message: err.message || 'Erro ao criar acesso', isError: true });
        } finally {
            setInviteLoading(false);
        }
    };

    // Staff members for availability modal
    const staffMembers = collaborators
        .filter(c => c.status !== 'Desligado')
        .map(c => ({
            id: c.id,
            name: c.nome,
            avatar: c.avatar || ''
        }));

    const emptyCollaborator = {
        nome: '',
        cpf: '',
        funcoes: [] as string[],
        telefone: '',
        email: '',
        status: 'Ativo' as 'Ativo' | 'Férias' | 'Ausente' | 'Desligado' | 'Inativo',
        nascimento: '',
        admissao: '',
        desligamento: '',
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento: '',
        periodo: 'Integral'
    };

    const [newCollaborator, setNewCollaborator] = useState(emptyCollaborator);

    // Search and Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFunction, setFilterFunction] = useState('Todas as Funções');
    const [filterStatus, setFilterStatus] = useState('Status: Todos');

    const filteredCollaborators = collaborators.filter(collab => {
        // --- PERMISSION FILTERING ---
        // If user cannot see all, they only see themselves
        if (hasAccess && !hasAccess('team_view_all')) {
            if (collab.id !== currentProfileId) return false;
        }

        const matchesSearch = collab.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            collab.funcoes.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFunction = filterFunction === 'Todas as Funções' || collab.funcoes.includes(filterFunction);

        const matchesStatus = filterStatus === 'Status: Todos' || collab.status === filterStatus;

        return matchesSearch && matchesFunction && matchesStatus;
    });

    // Helpers
    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const validateCPF = (cpf: string) => {
        const strCPF = cpf.replace(/[^\d]+/g, '');
        if (strCPF.length !== 11) return false;
        if (/^(\d)\1+$/.test(strCPF)) return false;
        let soma = 0;
        let resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(strCPF.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(strCPF.substring(10, 11))) return false;
        return true;
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const formatCEP = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 8);
        if (numbers.length <= 5) return numbers;
        return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    };

    const fetchAddress = async (cep: string) => {
        const numbers = cep.replace(/\D/g, '');
        if (numbers.length !== 8) return;
        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setNewCollaborator(prev => ({
                    ...prev,
                    logradouro: data.logradouro || '',
                    bairro: data.bairro || '',
                    cidade: data.localidade || '',
                    estado: data.uf || ''
                }));
            }
        } catch (error) {
            console.error(error);
            setSuccessModalState({ isOpen: true, title: 'ERRO NO CEP', description: 'Erro ao buscar o CEP. Verifique se os dígitos estão corretos.', isError: true });
        } finally {
            setCepLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cpf') {
            formattedValue = formatCPF(value);
            if (formattedValue.length === 14) {
                const isValid = validateCPF(formattedValue);
                console.log('CPF Validation Result:', isValid);
                setCpfStatus(isValid ? 'valid' : 'invalid');
            } else {
                setCpfStatus('idle');
            }
        } else if (name === 'telefone') {
            formattedValue = formatPhone(value);
        } else if (name === 'cep') {
            formattedValue = formatCEP(value);
            if (formattedValue.replace(/\D/g, '').length === 8) fetchAddress(formattedValue);
        }

        console.log('Setting newCollaborator field:', name, 'value:', formattedValue);
        setNewCollaborator(prev => {
            const updated = { ...prev, [name]: formattedValue };
            console.log('Updated newCollaborator state:', updated);
            return updated;
        });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddFunction = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && functionInput.trim()) {
            e.preventDefault();
            if (!newCollaborator.funcoes.includes(functionInput.trim())) {
                setNewCollaborator(prev => ({
                    ...prev,
                    funcoes: [...prev.funcoes, functionInput.trim()]
                }));
            }
            setFunctionInput('');
        }
    };

    const removeFunction = (func: string) => {
        setNewCollaborator(prev => ({
            ...prev,
            funcoes: prev.funcoes.filter(f => f !== func)
        }));
    };

    // Actions
    const handleOpenAdd = () => {
        setIsEditing(false);
        setNewCollaborator(emptyCollaborator);
        setAvatarPreview(null);
        setCpfStatus('idle');
        setIsTerminationChecked(false);
        setIsModalOpen(true);
    };

    const handleOpenEdit = () => {
        if (!selectedCollaborator) return;
        setIsEditing(true);
        setNewCollaborator({
            nome: selectedCollaborator.nome,
            cpf: selectedCollaborator.cpf || '',
            funcoes: selectedCollaborator.funcoes,
            telefone: selectedCollaborator.telefone,
            email: selectedCollaborator.email,
            status: selectedCollaborator.status,
            periodo: selectedCollaborator.periodo,
            nascimento: selectedCollaborator.nascimento || '',
            admissao: selectedCollaborator.admissao || '',
            desligamento: selectedCollaborator.desligamento || '',
            cep: selectedCollaborator.endereco?.cep || '',
            logradouro: selectedCollaborator.endereco?.logradouro || '',
            numero: selectedCollaborator.endereco?.numero || '',
            bairro: selectedCollaborator.endereco?.bairro || '',
            cidade: selectedCollaborator.endereco?.cidade || '',
            estado: selectedCollaborator.endereco?.estado || '',
            complemento: selectedCollaborator.endereco?.complemento || ''
        });
        setAvatarPreview(selectedCollaborator.avatar);
        setCpfStatus(selectedCollaborator.cpf && validateCPF(selectedCollaborator.cpf) ? 'valid' : 'idle');

        setIsTerminationChecked(selectedCollaborator.status === 'Desligado' || !!selectedCollaborator.desligamento);

        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        console.log('handleDelete triggered');
        if (!selectedCollaborator) return;
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCollaborator) return;
        console.log('Confirmed deletion for:', selectedCollaborator.nome);
        const success = await deleteProfessional(selectedCollaborator.id);
        if (success) {
            setIsConfirmModalOpen(false);
            setSuccessModalState({ isOpen: true, title: 'COLABORADOR EXCLUÍDO', description: 'O colaborador foi excluído com sucesso.' });
        } else {
            setSuccessModalState({ isOpen: true, title: 'ERRO AO EXCLUIR', description: `Erro ao excluir colaborador: ${supabaseError || 'Erro desconhecido'}`, isError: true });
        }
    };

    const handleSaveCollaborator = async () => {
        // Validação de E-mail Único
        if (newCollaborator.email) {
            const emailInUse = collaborators.some(c =>
                c.email.toLowerCase() === newCollaborator.email.toLowerCase() &&
                (!isEditing || c.id !== selectedCollaborator?.id)
            );

            if (emailInUse) {
                setSuccessModalState({ isOpen: true, title: 'E-MAIL EM USO', description: `O e-mail "${newCollaborator.email}" já está em uso por outro colaborador.`, isError: true });
                return;
            }
        }

        const finalStatus = isTerminationChecked && newCollaborator.desligamento ? 'Desligado' : 'Ativo';

        const professionalData: any = {
            name: newCollaborator.nome,
            cpf: newCollaborator.cpf,
            functions: newCollaborator.funcoes.length > 0 ? newCollaborator.funcoes : ['N/A'],
            status: finalStatus,
            avatar_url: avatarPreview,
            email: newCollaborator.email,
            phone: newCollaborator.telefone,
            birth_date: newCollaborator.nascimento || null,
            hire_date: newCollaborator.admissao || null,
            termination_date: newCollaborator.desligamento || null,
            address_json: {
                cep: newCollaborator.cep,
                logradouro: newCollaborator.logradouro,
                numero: newCollaborator.numero,
                bairro: newCollaborator.bairro,
                cidade: newCollaborator.cidade,
                estado: newCollaborator.estado,
                complemento: newCollaborator.complemento
            },
            base_commission: isEditing && selectedCollaborator ? selectedCollaborator.comissao.replace('%', '') : '30'
        };

        let result;
        if (isEditing && selectedCollaborator) {
            result = await updateProfessional(selectedCollaborator.id, professionalData);
        } else {
            result = await addProfessional(professionalData);
        }

        if (result) {
            setIsModalOpen(false);
            setNewCollaborator(emptyCollaborator);
            setAvatarPreview(null);
            setCpfStatus('idle');
            setSuccessModalState({ isOpen: true, title: isEditing ? 'COLABORADOR ATUALIZADO' : 'NOVO COLABORADOR', description: isEditing ? 'Dados do colaborador atualizados com sucesso.' : 'Novo colaborador adicionado com sucesso.' });
        } else {
            setSuccessModalState({ isOpen: true, title: 'ERRO AO SALVAR', description: `Erro ao salvar colaborador: ${supabaseError || 'Erro desconhecido'}`, isError: true });
        }
    };



    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Ativo': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'Férias': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'Ausente': return 'bg-rose-50 text-rose-600 border-rose-200';
            case 'Desligado': return 'bg-[#e8e2d4]/40 text-slate-500 border-slate-300 shadow-sm';
            // Legacy/Fallback
            case 'Inativo': return 'bg-[#e8e2d4]/40 text-slate-500 border-slate-300 shadow-sm';
            default: return 'bg-white text-slate-500';
        }
    };

    const getStatusDotColor = (status: string) => {
        switch (status) {
            case 'Ativo': return 'bg-emerald-500 shadow-emerald-500/50';
            case 'Férias': return 'bg-amber-500 shadow-amber-500/50';
            case 'Ausente': return 'bg-rose-500 shadow-rose-500/50';
            case 'Desligado': return 'bg-slate-400';
            // Legacy/Fallback
            case 'Inativo': return 'bg-slate-400';
            default: return 'bg-slate-400';
        }
    };

    return (
        <>
            <div className="flex h-full overflow-hidden bg-[#0f172a] font-display text-slate-100 p-6 gap-6">
                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#1e293b] rounded-3xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden flex flex-col animate-fadeIn max-h-[90vh] border border-white/10">
                            <div className="p-8 shrink-0 bg-[#0f172a]/80 border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                        <span className="material-symbols-outlined text-amber-500 text-3xl">{isEditing ? 'edit' : 'person_add'}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black text-white tracking-tight uppercase font-bebas">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-0.5">{isEditing ? 'Atualize os dados do membro da equipe' : 'Adicione um novo membro à equipe'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                {/* Avatar Section - Centered */}
                                <div className="flex flex-col items-center mb-8 pt-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="size-32 rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500 cursor-pointer flex items-center justify-center overflow-hidden group transition-all relative bg-[#0f172a] mb-2"
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-500 group-hover:text-amber-500 transition-colors">
                                                <span className="material-symbols-outlined text-4xl mb-1">add_a_photo</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Foto</span>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" title="Foto de perfil" aria-label="Foto de perfil" />
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Recomendado: 400x400</p>
                                </div>

                                {/* Form Section - Full Width */}
                                <div className="space-y-6">
                                    {/* Dados Pessoais */}
                                    <div>
                                        <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                            <span className="w-12 h-px bg-amber-500/20"></span>
                                            Dados Pessoais
                                        </h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Nome Completo</label>
                                                <input type="text" name="nome" value={newCollaborator.nome} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 text-lg font-bold" placeholder="Ex: Ana Silva" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">CPF</label>
                                                <div className="relative">
                                                    <input type="text" name="cpf" value={newCollaborator.cpf} onChange={handleInputChange} className={`w-full px-6 py-4 rounded-2xl border ${cpfStatus === 'invalid' ? 'border-red-500/50 bg-red-500/5' : cpfStatus === 'valid' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5'} bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-mono text-lg`} placeholder="000.000.000-00" maxLength={14} />
                                                    {cpfStatus === 'valid' && <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 text-lg">check_circle</span>}
                                                    {cpfStatus === 'invalid' && <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-red-500 text-lg">error</span>}
                                                </div>
                                                {cpfStatus === 'invalid' && <p className="text-[10px] text-red-500 mt-2 font-black uppercase tracking-widest px-1">CPF Inválido</p>}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Nascimento</label>
                                                <input type="date" name="nascimento" value={newCollaborator.nascimento} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all font-bold" title="Data de nascimento" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">WhatsApp</label>
                                                <input type="text" name="telefone" value={newCollaborator.telefone} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-bold" placeholder="(00) 00000-0000" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Email Profissional</label>
                                                <input type="email" name="email" value={newCollaborator.email} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-bold" placeholder="email@exemplo.com" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div>
                                        <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                            <span className="w-12 h-px bg-amber-500/20"></span>
                                            Endereço
                                        </h4>
                                        <div className="grid grid-cols-6 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">CEP</label>
                                                <div className="relative">
                                                    <input type="text" name="cep" value={newCollaborator.cep} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-bold" placeholder="00000-000" maxLength={9} />
                                                    {cepLoading && <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 text-lg animate-spin">progress_activity</span>}
                                                </div>
                                            </div>
                                            <div className="col-span-4">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Logradouro</label>
                                                <input type="text" name="logradouro" value={newCollaborator.logradouro} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-bold" placeholder="Av. Paulista..." />
                                            </div>

                                            <div className="col-span-1">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Nº</label>
                                                <input type="text" name="numero" value={newCollaborator.numero} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-bold" title="Número do endereço" placeholder="Ex: 123" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Complemento</label>
                                                <input type="text" name="complemento" value={newCollaborator.complemento} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all placeholder:text-white/10 font-bold" placeholder="Apto..." />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Bairro</label>
                                                <input type="text" name="bairro" value={newCollaborator.bairro} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/20 text-white/40 outline-none transition-all font-bold cursor-not-allowed" readOnly title="Bairro" placeholder="Bairro" />
                                            </div>

                                            <div className="col-span-4">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Cidade</label>
                                                <input type="text" name="cidade" value={newCollaborator.cidade} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/20 text-white/40 outline-none transition-all font-bold cursor-not-allowed" readOnly title="Cidade" placeholder="Cidade" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Estado</label>
                                                <input type="text" name="estado" value={newCollaborator.estado} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/20 text-white/40 outline-none transition-all font-bold text-center cursor-not-allowed" readOnly title="Estado" placeholder="UF" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dados Profissionais */}
                                    <div>
                                        <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                            <span className="w-12 h-px bg-amber-500/20"></span>
                                            Dados Profissionais
                                        </h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Funções (Digite e pressione Enter)</label>
                                                <div className="w-full px-6 py-4 rounded-2xl border border-white/5 focus-within:border-amber-500/30 bg-[#0f172a]/60 flex flex-wrap gap-2 min-h-[60px] transition-all">
                                                    {newCollaborator.funcoes.map(func => (
                                                        <span key={func} className="bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                                                            {func}
                                                            <button onClick={() => removeFunction(func)} className="hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                                                        </span>
                                                    ))}
                                                    <input
                                                        type="text"
                                                        value={functionInput}
                                                        onChange={(e) => setFunctionInput(e.target.value)}
                                                        onKeyDown={handleAddFunction}
                                                        className="flex-1 outline-none min-w-[150px] bg-transparent text-white text-lg font-bold placeholder:text-white/10"
                                                        placeholder={newCollaborator.funcoes.length === 0 ? "Ex: Hair Stylist" : ""}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2.5 px-1">Data de Admissão</label>
                                                <input type="date" name="admissao" value={newCollaborator.admissao} onChange={handleInputChange} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-[#0f172a]/60 text-white focus:border-amber-500/30 outline-none transition-all font-bold" title="Data de admissão" />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-2.5 px-1">
                                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">Desligamento</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="terminationCheck"
                                                            checked={isTerminationChecked}
                                                            onChange={(e) => setIsTerminationChecked(e.target.checked)}
                                                            className="w-4 h-4 rounded border-white/10 bg-[#0f172a] text-amber-500 focus:ring-amber-500/50"
                                                        />
                                                        <label htmlFor="terminationCheck" className="text-[10px] text-white/40 font-black uppercase tracking-widest cursor-pointer">Desligar</label>
                                                    </div>
                                                </div>
                                                <input
                                                    type="date"
                                                    name="desligamento"
                                                    value={newCollaborator.desligamento || ''}
                                                    onChange={handleInputChange}
                                                    disabled={!isTerminationChecked}
                                                    title="Data de desligamento"
                                                    className={`w-full px-6 py-4 rounded-2xl border outline-none transition-all font-bold ${!isTerminationChecked
                                                        ? 'bg-[#0f172a]/20 border-white/5 text-white/10 cursor-not-allowed'
                                                        : 'bg-[#0f172a]/60 border-white/5 text-white focus:border-amber-500/30'
                                                        }`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 border-t border-white/5 flex gap-4 bg-[#0f172a]/50">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 px-4 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/5 hover:text-white transition-all">Cancelar</button>
                                <button onClick={handleSaveCollaborator} disabled={!newCollaborator.nome} className="flex-[2] py-4 px-4 bg-amber-500 text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-20 active:scale-95">{isEditing ? 'Atualizar Colaborador' : 'Salvar Colaborador'}</button>
                            </div>
                        </div>
                    </div>
                )}

                <section className="flex-1 flex flex-col min-w-0 bg-transparent">
                    {/* Header & Filters */}
                    <div className="mb-2 p-5 flex flex-col gap-4 bg-[#1e293b] border border-white/5 rounded-3xl shadow-2xl z-10 backdrop-blur-md shrink-0">
                        <div className="flex flex-row items-center justify-between gap-4 w-full">
                            <div className="text-left flex-1">
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Equipe</h2>
                                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-1">Gerencie o desempenho e dados dos seus profissionais.</p>
                            </div>
                            {hasAccess?.('team_edit') !== false && (
                                <button
                                    onClick={handleOpenAdd}
                                    className="px-6 py-4 text-white rounded-xl flex items-center justify-center gap-2 font-black transition-all shadow-[0_5px_20px_rgba(180,83,9,0.3)] hover:shadow-[0_5px_25px_rgba(180,83,9,0.5)] active:scale-95 group uppercase tracking-widest text-xs shrink-0 btn-gradient--amber"
                                >
                                    <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform duration-300">add</span>
                                    Adicionar Novo Colaborador
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors">search</span>
                                <input
                                    className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-white/5 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all shadow-none text-white placeholder-white/20 outline-none font-bold"
                                    placeholder="Buscar por nome, função..."
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="relative">
                                    <select
                                        value={filterFunction}
                                        onChange={(e) => setFilterFunction(e.target.value)}
                                        title="Filtrar por função"
                                        className="px-6 py-4 bg-[#0f172a] border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-none outline-none cursor-pointer appearance-none pr-12 min-w-[200px]"
                                    >
                                        <option>Todas as Funções</option>
                                        <option>Hair Stylist</option>
                                        <option>Manicure</option>
                                        <option>Barbeiro</option>
                                        <option>Esteticista</option>
                                        <option>Colorista</option>
                                        <option>Maquiadora</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                                </div>
                                <div className="relative">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        title="Filtrar por status"
                                        className="px-6 py-4 bg-[#0f172a] border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-none outline-none cursor-pointer appearance-none pr-12 min-w-[200px]"
                                    >
                                        <option>Status: Todos</option>
                                        <option>Ativo</option>
                                        <option>Ausente</option>
                                        <option>Férias</option>
                                        <option>Inativo</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid of Cards */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                            {filteredCollaborators.map(collab => (
                                <div
                                    key={collab.id}
                                    onClick={() => setSelectedCollaborator(collab)}
                                    className={`group bg-[#1e293b] rounded-3xl p-6 border cursor-pointer relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 ${selectedCollaborator?.id === collab.id
                                        ? 'border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                                        : 'border-white/5 hover:border-white/10 shadow-xl'
                                        }`}
                                >
                                    {selectedCollaborator?.id === collab.id && (
                                        <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black px-3 py-1 rounded-bl-xl z-10 tracking-widest uppercase">SELECIONADO</div>
                                    )}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="relative">
                                            {(() => {
                                                const today = new Date().toLocaleDateString('en-CA');
                                                const staffEx = globalExceptions[collab.id];
                                                const statusEx = staffEx ? staffEx[today] : null;
                                                const statusType = typeof statusEx === 'object' ? statusEx?.type : statusEx;

                                                const ringClass =
                                                    statusType === 'vacation' ? 'ring-2 ring-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' :
                                                        statusType === 'sick' ? 'ring-2 ring-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                                                            statusType === 'off' ? 'ring-2 ring-gray-400 grayscale opacity-70' :
                                                                statusType === 'lunch' ? 'ring-2 ring-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]' :
                                                                    collab.status === 'Ativo' ? 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/20' :
                                                                        collab.status === 'Férias' ? 'ring-2 ring-purple-500' :
                                                                            collab.status === 'Ausente' ? 'ring-2 ring-red-500' :
                                                                                'ring-2 ring-gray-400 opacity-70 grayscale';
                                                return (
                                                    <div
                                                        className={`size-14 rounded-xl bg-cover bg-center transition-all ring-offset-2 ring-offset-[#0f172a] ${ringClass}`}
                                                        style={{ backgroundImage: collab.avatar ? `url('${collab.avatar}')` : undefined }}
                                                    >
                                                        {!collab.avatar && (
                                                            <div className="size-full flex items-center justify-center bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all text-slate-400 font-bold text-xl rounded-xl">
                                                                {collab.nome.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm tracking-tight">{collab.nome}</h3>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${selectedCollaborator?.id === collab.id ? 'text-amber-500' : 'text-slate-500 group-hover:text-slate-400 transition-colors'}`}>
                                                {collab.funcoes.join(' • ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 mb-4 min-h-[42px]">
                                        {(() => {
                                            const todayStr = new Date().toLocaleDateString('en-CA');
                                            const staffEx = globalExceptions[collab.id];
                                            const currentStatusRaw = staffEx ? staffEx[todayStr] : null;
                                            let currentStatus = typeof currentStatusRaw === 'object' ? currentStatusRaw?.type : currentStatusRaw;

                                            // Fallback to static status if no dynamic exception
                                            if (!currentStatus || currentStatus === 'working') {
                                                if (collab.status === 'Férias') currentStatus = 'vacation';
                                                else if (collab.status === 'Ausente') currentStatus = 'sick';
                                                // 'Ativo' remains null/working
                                            }

                                            const isUnavailable = currentStatus && currentStatus !== 'working';

                                            if (!isUnavailable) {
                                                // Scan for future exceptions (next 30 days)
                                                const futureEvents: { type: 'vacation' | 'off' | 'sick' | 'lunch', start: string, end: string }[] = [];
                                                if (staffEx) {
                                                    let scanDate = new Date(todayStr.split('-').map(Number).join('/')); // Use yyyy-mm-dd
                                                    scanDate.setDate(scanDate.getDate() + 1); // Start tomorrow

                                                    let currentRange: { type: 'vacation' | 'off' | 'sick' | 'lunch', start: string, end: string } | null = null;
                                                    const getFmt = (d: Date) => d.toLocaleDateString('en-CA');

                                                    for (let i = 0; i < 30; i++) {
                                                        const dStr = getFmt(scanDate);
                                                        const statusRaw = staffEx[dStr];
                                                        const status = typeof statusRaw === 'object' ? statusRaw?.type : statusRaw;

                                                        if (status === 'vacation' || status === 'off' || status === 'sick' || status === 'lunch') {
                                                            if (currentRange && currentRange.type === status) {
                                                                currentRange.end = dStr;
                                                            } else {
                                                                if (currentRange) futureEvents.push(currentRange);
                                                                currentRange = { type: status as any, start: dStr, end: dStr };
                                                            }
                                                        } else {
                                                            if (currentRange) {
                                                                futureEvents.push(currentRange);
                                                                currentRange = null;
                                                            }
                                                        }
                                                        scanDate.setDate(scanDate.getDate() + 1);
                                                    }
                                                    if (currentRange) futureEvents.push(currentRange);
                                                }

                                                const formatDate = (dStr: string) => {
                                                    const [y, m, d] = dStr.split('-').map(Number);
                                                    return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
                                                };

                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${collab.status === 'Ativo' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]' :
                                                                collab.status === 'Desligado' ? 'text-slate-500 bg-[#0f172a] border border-white/5' :
                                                                    'text-slate-400 bg-[#0f172a] border border-white/10'
                                                                }`}>
                                                                {collab.status}
                                                            </span>
                                                        </div>
                                                        {futureEvents.map((event, idx) => {
                                                            const labelMap = {
                                                                vacation: { text: 'FÉRIAS PREVISTA', color: 'text-purple-500' },
                                                                off: { text: 'FOLGA PREVISTA', color: 'text-slate-500' },
                                                                sick: { text: 'ATESTADO PREVISTO', color: 'text-red-500' },
                                                                lunch: { text: 'ALMOÇO PREVISTO', color: 'text-blue-500' }
                                                            };
                                                            const { text, color } = labelMap[event.type];
                                                            const dateRange = event.start === event.end
                                                                ? formatDate(event.start)
                                                                : `${formatDate(event.start)} - ${formatDate(event.end)}`;

                                                            return (
                                                                <span key={idx} className={`text-[10px] font-bold uppercase tracking-wide ml-0.5 ${color}`}>
                                                                    ({text} {dateRange})
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }

                                            // Calculate Range
                                            const getNextDate = (dateStr: string, offset: number) => {
                                                const [y, m, d] = dateStr.split('-').map(Number);
                                                const date = new Date(y, m - 1, d);
                                                date.setDate(date.getDate() + offset);
                                                return date.toLocaleDateString('en-CA');
                                            };

                                            let startStr = todayStr;
                                            let endStr = todayStr;
                                            let rangeFound = false;

                                            // Only scan if we have exception data
                                            const todayStatusRaw = staffEx ? staffEx[todayStr] : null;
                                            const todayStatus = typeof todayStatusRaw === 'object' ? todayStatusRaw?.type : todayStatusRaw;
                                            if (staffEx && todayStatus === currentStatus) {
                                                rangeFound = true;
                                                // Scan Backwards
                                                let tempDate = todayStr;
                                                while (true) {
                                                    const prevDate = getNextDate(tempDate, -1);
                                                    const prevStatusRaw = staffEx ? staffEx[prevDate] : null;
                                                    const prevStatus = typeof prevStatusRaw === 'object' ? prevStatusRaw?.type : prevStatusRaw;

                                                    if (prevStatus === currentStatus) {
                                                        startStr = prevDate;
                                                        tempDate = prevDate;
                                                    } else {
                                                        break;
                                                    }
                                                }

                                                // Scan Forwards
                                                tempDate = todayStr;
                                                while (true) {
                                                    const nextDate = getNextDate(tempDate, 1);
                                                    const nextStatusRaw = staffEx ? staffEx[nextDate] : null;
                                                    const nextStatus = typeof nextStatusRaw === 'object' ? nextStatusRaw?.type : nextStatusRaw;

                                                    if (nextStatus === currentStatus) {
                                                        endStr = nextDate;
                                                        tempDate = nextDate;
                                                    } else {
                                                        break;
                                                    }
                                                }
                                            }

                                            const formatDate = (dStr: string) => {
                                                const [y, m, d] = dStr.split('-').map(Number);
                                                return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}`;
                                            };

                                            const label = currentStatus === 'vacation' ? 'Férias' : currentStatus === 'sick' ? 'Atestado' : currentStatus === 'lunch' ? 'Almoço' : 'Folga';
                                            const colorClass = currentStatus === 'vacation' ? 'text-purple-600 bg-purple-500/10 border-purple-200 shadow-purple-100' :
                                                currentStatus === 'sick' ? 'text-red-600 bg-red-500/10 border-red-200 shadow-red-100' :
                                                    currentStatus === 'lunch' ? 'text-blue-600 bg-blue-500/10 border-blue-200 shadow-blue-100' :
                                                        'text-slate-600 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-cyan-100/60';

                                            return (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shadow-none ${colorClass}`}>
                                                            {label}
                                                            {currentStatus === 'lunch' && currentStatusRaw?.start_time && (
                                                                <span className="ml-1.5 opacity-60 font-medium">
                                                                    • {currentStatusRaw.start_time.slice(0, 5)} - {currentStatusRaw.end_time?.slice(0, 5)}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {rangeFound && (
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide ml-0.5">
                                                            Período: {formatDate(startStr)} - {formatDate(endStr)}
                                                        </span>
                                                    )}
                                                    {!rangeFound && (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-0.5">
                                                            DATA INDEFINIDA
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <span>ID: #{collab.id.slice(0, 8)}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1 text-amber-500">
                                                <span className="material-symbols-outlined text-[14px]">star</span>
                                                {collab.rating.toFixed(1)}
                                            </span>
                                            <span className="text-slate-600">({collab.totalReviews})</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section >

                {/* Right Sidebar */}
                <aside className="w-[400px] bg-[#1e293b] border border-white/5 rounded-3xl flex-shrink-0 hidden lg:flex flex-col shadow-2xl z-20 overflow-hidden">
                    {
                        selectedCollaborator ? (
                            <>
                                <div className="relative h-28 bg-[#1e293b] border-b border-white/10 overflow-hidden shadow-[inset_0_-10px_30px_rgba(0,0,0,0.3)]">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 via-cyan-800/50 to-teal-700/50"></div>
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {(() => {
                                            const isMe = selectedCollaborator.id === currentProfileId;
                                            const canEdit = isMe ? hasAccess?.('team_self_edit') : hasAccess?.('team_edit');

                                            if (!canEdit) return null;

                                            return (
                                                <div className="relative group">
                                                    <button
                                                        onClick={handleOpenEdit}
                                                        className="size-10 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all flex items-center justify-center border border-white/20 shadow-lg cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Editar
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                        {selectedCollaborator.id !== currentProfileId && hasAccess?.('team_edit') && (
                                            <div className="relative group">
                                                <button
                                                    onClick={(e) => {
                                                        console.log('Delete button clicked');
                                                        e.stopPropagation();
                                                        handleDelete();
                                                    }}
                                                    className="size-10 rounded-xl bg-red-500/10 backdrop-blur-md hover:bg-red-500/30 text-red-400 transition-all flex items-center justify-center border border-red-500/20 shadow-lg cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    Excluir
                                                </span>
                                            </div>
                                        )}
                                        <div className="relative group">
                                            <button
                                                onClick={() => setIsAvailabilityModalOpen(true)}
                                                className="size-10 rounded-xl bg-purple-500/10 backdrop-blur-md hover:bg-purple-500/30 text-purple-400 transition-all flex items-center justify-center border border-purple-500/20 shadow-lg cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">event_available</span>
                                            </button>
                                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                Escala
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-8 pb-4 -mt-10 flex flex-col items-center border-b border-white/5">
                                    <div className="relative group/avatar">
                                        {(() => {
                                            const today = new Date().toLocaleDateString('en-CA');
                                            const staffEx = globalExceptions[selectedCollaborator.id];
                                            const statusEx = staffEx ? staffEx[today] : null;
                                            const statusType = typeof statusEx === 'object' ? statusEx?.type : statusEx;

                                            const ringClass =
                                                statusType === 'vacation' ? 'ring-4 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' :
                                                    statusType === 'sick' ? 'ring-4 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                                                        statusType === 'off' ? 'ring-4 ring-gray-400 grayscale opacity-70' :
                                                            statusType === 'lunch' ? 'ring-4 ring-blue-500 shadow-[0_0_15px_rgba(96,165,250,0.4)]' :
                                                                selectedCollaborator.status === 'Ativo' ? 'ring-4 ring-emerald-500 shadow-[0_0_20px_#00ff9d]' :
                                                                    selectedCollaborator.status === 'Férias' ? 'ring-4 ring-purple-500' :
                                                                        selectedCollaborator.status === 'Ausente' ? 'ring-4 ring-red-500' :
                                                                            'ring-4 ring-gray-400 opacity-70 grayscale';
                                            return (
                                                <div
                                                    className={`size-24 rounded-xl bg-cover bg-center shadow-2xl ring-offset-4 ring-offset-[#1e293b] ${ringClass}`}
                                                    style={{ backgroundImage: selectedCollaborator.avatar ? `url('${selectedCollaborator.avatar}')` : undefined }}
                                                >
                                                    {!selectedCollaborator.avatar && (
                                                        <div className="size-full flex items-center justify-center bg-[#1e293b] border border-white/10 shadow-sm text-slate-400 font-bold text-5xl rounded-xl">
                                                            {selectedCollaborator.nome.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}


                                    </div>
                                    <h2 className="text-lg font-black text-white mt-3 tracking-tight uppercase">{selectedCollaborator.nome}</h2>
                                    <div className="flex flex-col items-center gap-0.5 mt-1">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ativo em {formatDateDisplay(selectedCollaborator.admissao)}</span>
                                        {(selectedCollaborator.status === 'Desligado' || selectedCollaborator.desligamento) && (
                                            <span className="text-xs text-red-500 font-black uppercase tracking-widest mt-1">Desligado em {formatDateDisplay(selectedCollaborator.desligamento || '')}</span>
                                        )}
                                    </div>

                                </div>
                                <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8">
                                    <div>
                                        <h4 className="text-[11px] font-black text-amber-500/80 uppercase tracking-[.15em] mb-4 flex items-center gap-2">
                                            <span className="size-1.5 rounded-full text-white"></span>
                                            Dados Pessoais
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 bg-[#0f172a]/40 p-5 rounded-2xl border border-white/5 shadow-lg group transition-all hover:bg-[#0f172a]/60 hover:border-amber-500/20">
                                                <div className="size-12 rounded-xl bg-[#0f172a] flex items-center justify-center text-amber-500 border border-white/10 group-hover:border-amber-500/30 transition-colors shadow-inner">
                                                    <span className="material-symbols-outlined text-2xl">work</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-1">Função</p>
                                                    <p className="text-sm font-bold text-white uppercase tracking-wider">{selectedCollaborator.funcoes.join(' • ')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-[#0f172a]/40 p-5 rounded-2xl border border-white/5 shadow-lg group transition-all hover:bg-[#0f172a]/60 hover:border-amber-500/20">
                                                <div className="size-12 rounded-xl bg-[#0f172a] flex items-center justify-center text-amber-500 border border-white/10 group-hover:border-amber-500/30 transition-colors shadow-inner">
                                                    <span className="material-symbols-outlined text-2xl">call</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-1">Celular / WhatsApp</p>
                                                    <p className="text-sm font-bold text-white">{selectedCollaborator.telefone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-[#0f172a]/40 p-5 rounded-2xl border border-white/5 shadow-lg group transition-all hover:bg-[#0f172a]/60 hover:border-amber-500/20">
                                                <div className="size-12 rounded-xl bg-[#0f172a] flex items-center justify-center text-amber-500 border border-white/10 group-hover:border-amber-500/30 transition-colors shadow-inner">
                                                    <span className="material-symbols-outlined text-2xl">mail</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-1">Email</p>
                                                    <p className="text-sm font-bold text-white truncate">{selectedCollaborator.email}</p>
                                                </div>
                                                {(() => {
                                                    const currentUserRole = users.find(u => u.professional_id === currentProfileId)?.role;
                                                    const targetRole = users.find(u => u.professional_id === selectedCollaborator.id || u.email === selectedCollaborator.email)?.role;

                                                    // Ocultar botão se o alvo for manager/admin OU se quem visualiza for manager (só admin convida managers)
                                                    const isTargetManagerOrAdmin = targetRole === 'admin' || targetRole === 'manager';
                                                    const isViewerAdmin = currentUserRole === 'admin';

                                                    return selectedCollaborator.email && hasAccess && hasAccess('team_edit') && !isTargetManagerOrAdmin && isViewerAdmin && (
                                                        <button
                                                            onClick={() => handleInviteCollaborator(selectedCollaborator.email)}
                                                            disabled={inviteLoading}
                                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0 ml-2"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">{inviteLoading ? 'hourglass_top' : 'send'}</span>
                                                            {inviteLoading ? '...' : 'Convidar'}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                            {inviteStatus && (
                                                <div className={`mt-2 px-3 py-2 rounded-xl text-xs font-semibold ${inviteStatus.isError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span>{inviteStatus.message}</span>
                                                        {inviteStatus.showReset && (
                                                            <button
                                                                onClick={() => handleInviteCollaborator(selectedCollaborator.email, true)}
                                                                className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shrink-0"
                                                            >
                                                                Reiniciar Acesso
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                                <p>Selecione um colaborador</p>
                            </div>
                        )}
                </aside >
            </div >

            {isAvailabilityModalOpen && staffMembers.length > 0 && selectedCollaborator && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-3xl shadow-2xl max-w-5xl w-full mx-4 overflow-hidden flex flex-col animate-fadeIn max-h-[95vh] border border-white/10">
                        <AvailabilityModal
                            isOpen={isAvailabilityModalOpen}
                            onClose={() => setIsAvailabilityModalOpen(false)}
                            staffMembers={staffMembers}
                            initialStaffId={selectedCollaborator.id}
                            persistedExceptions={globalExceptions}
                            onSave={async (data: any) => {
                                const { staffId, exceptions: newExceptionsRecord, shifts, workingDays } = data;

                                // 1. Update professional schedule config (shifts and workingDays)
                                const currentProf = dbProfessionals.find(p => p.id === staffId);
                                if (currentProf) {
                                    const updatedAddressJson = {
                                        ...(currentProf.address_json as any || {}),
                                        schedule: { shifts, workingDays }
                                    };
                                    await updateProfessional(staffId, { address_json: updatedAddressJson });
                                }

                                // 2. Sync Exceptions
                                const currentStaffExceptions = dbExceptions.filter(ex => ex.professional_id === staffId);

                                // Identify deletions
                                const toDelete = currentStaffExceptions.filter(ex => !newExceptionsRecord[ex.date]);
                                for (const ex of toDelete) {
                                    await deleteException(ex.id);
                                }

                                // Identify updates and additions
                                for (const [date, entry] of Object.entries(newExceptionsRecord)) {
                                    const data = entry as any;
                                    const existing = currentStaffExceptions.find(ex => ex.date === date);
                                    if (existing) {
                                        if (existing.type !== data.type || existing.start_time !== data.start_time || existing.end_time !== data.end_time) {
                                            await updateException(existing.id, {
                                                type: data.type,
                                                start_time: data.start_time,
                                                end_time: data.end_time,
                                                notes: data.notes
                                            });
                                        }
                                    } else {
                                        await addException({
                                            professional_id: staffId,
                                            date: date,
                                            type: data.type,
                                            start_time: data.start_time,
                                            end_time: data.end_time,
                                            notes: data.notes
                                        });
                                    }
                                }

                                setIsAvailabilityModalOpen(false);
                            }}
                        />
                    </div>
                </div>
            )}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1e293b] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-white/10 animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                                <span className="material-symbols-outlined text-red-500 text-4xl">delete_forever</span>
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Excluir Colaborador</h3>
                            <p className="text-slate-400 text-sm mb-8">
                                Tem certeza que deseja excluir <strong className="text-white">{selectedCollaborator?.nome}</strong>? Esta ação é irreversível.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="flex-1 py-4 px-4 border border-white/10 text-slate-400 font-bold uppercase tracking-widest rounded-2xl hover:bg-white/5 hover:text-white transition-all shadow-sm"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 px-4 bg-red-500 text-white font-bold uppercase tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.2)] active:scale-95"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {credentialsModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="bg-[#1e293b] rounded-3xl p-10 max-w-md w-full shadow-2xl border border-white/10 animate-scaleIn">
                        <div className="text-center mb-8">
                            <div className="size-20 rounded-3xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
                                <span className="material-symbols-outlined text-4xl">key</span>
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Acesso Criado!</h3>
                            <p className="text-slate-400 text-sm mt-3 font-medium">
                                Compartilhe estas credenciais com o colaborador.
                            </p>
                        </div>

                        <div className="space-y-4 mb-10">
                            <div className="bg-[#0f172a] p-5 rounded-2xl border border-white/5 p-5 group">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">E-mail de Acesso</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-white font-bold">{credentialsModal.email}</p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(credentialsModal.email)}
                                        className="text-slate-500 hover:text-amber-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xl">content_copy</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#0f172a] p-5 rounded-2xl border border-white/5 p-5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Senha Temporária</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-3xl font-black text-amber-500 tracking-[.25em]">{credentialsModal.password}</p>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(credentialsModal.password)}
                                        className="text-slate-500 hover:text-amber-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xl">content_copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setCredentialsModal(null)}
                            className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[.2em] rounded-2xl transition-all border border-white/10 active:scale-95"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default TeamManagement;
