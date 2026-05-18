import React, { useState, useEffect, useMemo } from 'react';
import { useSystemUsers, SystemUser } from '../hooks/useSystemUsers';
import { supabase } from '../lib/supabase';

// --- ACCESS LEVELS & METADATA ---
const accessLevelLabels: Record<string, { label: string; bg: string; text: string; icon: string; description: string }> = {
    admin: { label: 'Administrador', bg: 'bg-[#e8e2d4]/40', text: 'text-slate-800', icon: 'admin_panel_settings', description: 'Acesso total a todas as funcionalidades.' },
    manager: { label: 'Gerente', bg: 'bg-blue-500/10', text: 'text-blue-500', icon: 'shield_person', description: 'Gestão de equipe e relatórios.' },
    receptionist: { label: 'Recepção', bg: 'bg-purple-500/10', text: 'text-purple-500', icon: 'desk', description: 'Gestão da agenda e clientes.' },
    professional: { label: 'Profissional', bg: 'bg-slate-100', text: 'text-slate-500', icon: 'content_cut', description: 'Acesso apenas à própria agenda.' },
};

// --- CRUD PERMISSION GROUPS ---
const PERMISSION_GROUPS = [
    {
        id: 'dashboard',
        label: 'Dashboard & Analytics',
        icon: 'analytics',
        actions: [
            { id: 'dashboard_view', label: 'Visualizar Dashboard Geral', desc: 'Acesso à tela inicial com KPIs básicos.' },
            { id: 'analytics_advanced', label: 'Relatórios Avançados', desc: 'Acesso a filtros e gráficos detalhados.' }
        ]
    },
    {
        id: 'agenda',
        label: 'Gestão de Agenda',
        icon: 'calendar_month',
        actions: [
            { id: 'agenda_view', label: 'Visualizar Agenda', desc: 'Ver agendamentos próprios ou de terceiros.' },
            { id: 'agenda_edit', label: 'Criar/Editar Agendamentos', desc: 'Marcar, remarcar e cancelar horários.' },
            { id: 'agenda_admin', label: 'Bloquear Horários', desc: 'Criar intervalos ou fechar agenda do dia.' }
        ]
    },
    {
        id: 'clients',
        label: 'Base de Clientes',
        icon: 'group',
        actions: [
            { id: 'clients_view', label: 'Visualizar Lista', desc: 'Acesso à busca e listagem de clientes.' },
            { id: 'clients_create', label: 'Adicionar Novos', desc: 'Cadastrar novos clientes no sistema.' },
            { id: 'clients_edit', label: 'Editar Dados', desc: 'Alterar informações, fotos e histórico.' },
            { id: 'clients_delete', label: 'Exclusão Segura', desc: 'Remover clientes (Ação Restrita).' }
        ]
    },
    {
        id: 'team',
        label: 'Gestão de Equipe',
        icon: 'badge',
        actions: [
            { id: 'team_navbar_view', label: 'Ver Menu Colaboradores', desc: 'Ativa o item na barra de navegação principal.' },
            { id: 'team_self_edit', label: 'Editar Próprio Perfil', desc: 'Permite ao usuário atualizar seus dados pessoais e foto.' },
            { id: 'team_view_all', label: 'Visualizar Toda a Equipe', desc: 'Ver todos os profissionais. (Desativado: vê apenas o próprio perfil)' },
            { id: 'team_edit', label: 'Gerenciar Colaboradores', desc: 'Adicionar, editar e desativar outros membros da equipe.' }
        ]
    },
    {
        id: 'finance',
        label: 'Financeiro & Caixa',
        icon: 'account_balance_wallet',
        actions: [
            { id: 'cashflow_view', label: 'Visualizar Caixa', desc: 'Acesso ao flux financeiro do dia.' },
            { id: 'cashflow_edit', label: 'Lançar Transações', desc: 'Registrar entradas, saídas e despesas.' },
            { id: 'cashflow_close', label: 'Fichar/Abrir Caixa', desc: 'Responsabilidade por fechamento de turno.' },
            { id: 'cashflow_audit', label: 'Relatório de Auditoria', desc: 'Ver alterações manuais e correções.' }
        ]
    },
    {
        id: 'inventory',
        label: 'Estoque & Produtos',
        icon: 'inventory_2',
        actions: [
            { id: 'products_view', label: 'Visualizar Estoque', desc: 'Consultar níveis e preços de produtos.' },
            { id: 'products_edit', label: 'Gerenciar Produtos', desc: 'Cadastrar novos itens e categorias.' },
            { id: 'inventory_adjust', label: 'Ajuste Manual', desc: 'Corrigir contagem de estoque manualmente.' }
        ]
    },
    {
        id: 'system',
        label: 'Sistema & Config',
        icon: 'settings_suggest',
        actions: [
            { id: 'settings_view', label: 'Acessar Configurações', desc: 'Ver dados do salão e horários.' },
            { id: 'settings_edit', label: 'Alterar Sistema', desc: 'Mudar regras de negócio e taxas.' },
            { id: 'system_backup', label: 'Exportar Dados', desc: 'Baixar backups e relatórios CSV.' }
        ]
    }
];

interface UsersPermissionsProps {
    variant?: 'classic' | 'modern';
}

const UsersPermissions: React.FC<UsersPermissionsProps> = ({ variant = 'classic' }) => {
    const { users, loading, error, updateUserRole, updateUserPermissions, updateProfessionalEmail, updateUserCashPin, refresh } = useSystemUsers();

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [notification, setNotification] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [pendingPermissions, setPendingPermissions] = useState<Record<string, boolean>>({});
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [isGeneratingAccess, setIsGeneratingAccess] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [showPin, setShowPin] = useState(false);

    const styles = `
  @keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
  }
  .animate-scaleIn {
  animation: scaleIn 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  }
  .custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
  }
  `;


    // Show Notification
    const showNotify = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const generateInitials = (name: string, email?: string) => {
        if (!name || name === 'Sem Nome') {
            if (email && email !== 'Sem email') return email.substring(0, 2).toUpperCase();
            return '??';
        }
        const parts = name.trim().split(' ');
        return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchSearch = !searchQuery ||
                (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchRole = !filterRole || user.role === filterRole;
            return matchSearch && matchRole;
        });
    }, [users, searchQuery, filterRole]);

    const handleEditClick = (user: SystemUser) => {
        setSelectedUser(user);
        setPendingPermissions(user.permissions || {});
        setIsSidebarOpen(true);
        setIsEditing(false);
        setShowPin(false);
    };

    const handleSaveRole = async (newRole: string) => {
        if (!selectedUser) return;
        setIsEditing(true);
        const success = await updateUserRole(selectedUser.id, newRole);
        if (success) {
            showNotify('Função atualizada com sucesso!');
            setSelectedUser(prev => prev ? ({ ...prev, role: newRole }) : null);
        } else {
            showNotify('Erro ao atualizar função.');
        }
        setIsEditing(false);
    };

    const handleTogglePermission = (actionId: string) => {
        setPendingPermissions(prev => ({
            ...prev,
            [actionId]: !prev[actionId]
        }));
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;
        setIsEditing(true);
        const success = await updateUserPermissions?.(selectedUser.id, pendingPermissions);
        if (success) {
            showNotify('Permissões manuais atualizadas!');
            setSelectedUser(prev => prev ? ({ ...prev, permissions: pendingPermissions }) : null);
        } else {
            showNotify('Erro ao atualizar permissões.');
        }
        setIsEditing(false);
    };

    const handleInviteClick = () => {
        setInviteEmail(selectedUser?.email && selectedUser.email !== 'Sem email' ? selectedUser.email : '');
        setShowInviteModal(true);
    };

    const handleSendInvite = async () => {
        if (!selectedUser || !selectedUser.professional_id) return;
        if (!inviteEmail.includes('@')) {
            showNotify('Digite um email válido.');
            return;
        }

        // Validação de E-mail Ãšnico
        const emailInUse = users.some(u =>
            u.email?.toLowerCase() === inviteEmail.toLowerCase() &&
            u.id !== selectedUser.id
        );

        if (emailInUse) {
            showNotify('Este e-mail já está em uso por outro usuário.');
            return;
        }

        setIsSendingInvite(true);
        if (updateProfessionalEmail) {
            await updateProfessionalEmail(selectedUser.professional_id, inviteEmail);
        }

        const subject = encodeURIComponent(`Convite de Acesso - Studio Angela Barbosa`);
        const body = encodeURIComponent(`Olá ${selectedUser.full_name},\n\nVocê foi convidado para acessar o sistema.\n\nPara criar sua senha e acessar, clique no link abaixo:\n${window.location.origin}\n\nSeu email de acesso é: ${inviteEmail}\n\nAtenciosamente,\nAdministração`);
        window.open(`mailto:${inviteEmail}?subject=${subject}&body=${body}`);

        setIsSendingInvite(false);
        setShowInviteModal(false);
        showNotify('Cliente de e-mail aberto! Envie a mensagem.');
        setSelectedUser(prev => prev ? ({ ...prev, email: inviteEmail }) : null);
    };

    const handleGenerateAccess = async () => {
        if (!selectedUser?.email || selectedUser.email === 'Sem email') {
            showNotify('O colaborador precisa de um e-mail cadastrado.');
            return;
        }

        setIsGeneratingAccess(true);
        setTempPassword(null);

        try {
            const { data, error } = await supabase.functions.invoke('invite-collaborator', {
                body: { 
                    email: selectedUser.email,
                    fullName: selectedUser.full_name,
                    resetSelection: selectedUser.status === 'active' // Se já tem acesso, reseta
                }
            });

            if (error) throw error;

            if (data?.temp_password) {
                setTempPassword(data.temp_password);
                showNotify('Acesso gerado com sucesso!');
                refresh(); // Atualiza a lista para mostrar status ativo
            }
        } catch (err: any) {
            console.error("Erro ao gerar acesso:", err);
            showNotify(err.message || 'Erro ao comunicar com o servidor.');
        } finally {
            setIsGeneratingAccess(false);
        }
    };


    if (loading && !users.length) return (
        <div className="h-full flex items-center justify-center bg-transparent">
            <div className="flex flex-col items-center gap-4">
                <div className="size-12 border-4 border-white/20 border-t-[var(--nb-neon-cyan)] rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">Carregando equipe...</p>
            </div>
        </div>
    );

    if (variant === 'modern') {
        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <style>{styles}</style>
                {notification && (
                    <div className="fixed top-24 right-20 z-[1000] px-8 py-4 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 text-white font-bold shadow-2xl flex items-center gap-4">
                        <span className="material-symbols-outlined text-[var(--nb-neon-cyan)]">shield_check</span>
                        {notification}
                    </div>
                )}

                <div className="flex items-center justify-between gap-6">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="nb-input w-full h-14 pl-16 pr-6 rounded-2xl text-white font-medium" 
                            placeholder="Pesquisar por nome ou e-mail..."
                        />
                    </div>
                    <button onClick={refresh} className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                        <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                </div>


                <div className="grid grid-cols-1 gap-4">
                    {filteredUsers.map(user => (
                        <div 
                            key={user.id} 
                            onClick={() => handleEditClick(user)}
                            className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex items-center justify-between hover:bg-white/[0.08] hover:border-[var(--nb-neon-cyan)]/30 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="size-16 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xl font-black text-slate-400">{generateInitials(user.full_name || '', user.email)}</span>}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-[#0f172a] ${user.status === 'active' ? 'bg-[var(--nb-neon-cyan)]' : 'bg-slate-600'}`} />
                                </div>
                                <div>
                                    <h4 className="font-black text-white uppercase tracking-tight">{user.full_name || user.email?.split('@')[0] || 'Usuário'}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.email}</span>
                                        <span className="size-1 rounded-full bg-slate-700" />
                                        <span className="text-[10px] font-black text-[var(--nb-neon-cyan)] uppercase tracking-widest">{accessLevelLabels[user.role || '']?.label || 'Membro'}</span>
                                    </div>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors">chevron_right</span>
                        </div>
                    ))}
                </div>

                {/* Modern Sidebar Overlay */}
                {isSidebarOpen && selectedUser && (
                    <div className="fixed inset-0 z-[2000] flex justify-end">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
                        <div className="relative w-full max-w-xl bg-[#0f172a] border-l border-white/10 shadow-[-50px_0_100px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-700">
                             <div className="p-10 border-b border-white/5 flex items-center justify-between">
                                 <div>
                                     <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Perfil do Colaborador</h3>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Acesso e Privilégios</p>
                                 </div>
                                 <button onClick={() => setIsSidebarOpen(false)} className="size-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                                     <span className="material-symbols-outlined">close</span>
                                 </button>
                             </div>

                             <div className="flex-1 overflow-y-auto p-10 space-y-12">
                                 <div className="flex flex-col items-center">
                                     <div className="size-32 rounded-[40px] bg-slate-800 border-2 border-white/10 flex items-center justify-center overflow-hidden mb-6 shadow-2xl">
                                          {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-slate-400">{generateInitials(selectedUser.full_name || '')}</span>}
                                     </div>
                                     <h2 className="text-3xl font-black text-white text-center leading-none">{selectedUser.full_name || 'Sem Nome'}</h2>
                                     <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-3">{selectedUser.email}</p>
                                 </div>

                                 {/* Acesso Pendente / Reset */}
                                 {selectedUser.status !== 'active' && (
                                     <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                                         <div className="absolute -top-10 -right-10 size-32 bg-amber-500/10 blur-3xl rounded-full"></div>
                                         <h4 className="font-black text-amber-500 text-xl mb-3 uppercase tracking-tight">Acesso Pendente</h4>
                                         <p className="text-sm text-slate-400 font-bold mb-8 leading-relaxed">Gere um acesso padrão para este colaborador começar a usar o App.</p>
                                         
                                         <div className="space-y-3">
                                             <button
                                                 onClick={handleGenerateAccess}
                                                 disabled={isGeneratingAccess}
                                                 className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl hover:bg-amber-500 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                             >
                                                 {isGeneratingAccess ? (
                                                     <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                 ) : (
                                                     <>
                                                         <span className="material-symbols-outlined">key</span>
                                                         GERAR ACESSO PADRÃO
                                                     </>
                                                 )}
                                             </button>
                                         </div>

                                         {tempPassword && (
                                             <div className="mt-6 p-6 bg-black/40 border-2 border-emerald-500/30 rounded-2xl animate-in zoom-in-95 text-left">
                                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Senha Temporária:</p>
                                                 <div className="flex items-center justify-between gap-4">
                                                     <span className="text-3xl font-black text-white tracking-[0.2em]">{tempPassword}</span>
                                                     <button 
                                                         onClick={() => {
                                                             navigator.clipboard.writeText(tempPassword);
                                                             showNotify('Senha copiada!');
                                                         }}
                                                         className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                                     >
                                                         <span className="material-symbols-outlined text-xl">content_copy</span>
                                                     </button>
                                                 </div>
                                                 <p className="text-[9px] text-slate-500 font-bold mt-4 leading-tight italic">
                                                     Forneça esta senha ao colaborador para o primeiro acesso.
                                                 </p>
                                             </div>
                                         )}
                                     </div>
                                 )}

                                 {/* Funções */}
                                 <div className="space-y-6">
                                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Nível de Acesso</label>
                                     <div className="grid grid-cols-1 gap-3">
                                          {Object.entries(accessLevelLabels).filter(([k]) => k !== 'admin').map(([key, info]) => (
                                              <div 
                                                key={key} 
                                                onClick={() => handleSaveRole(key)}
                                                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-5 ${selectedUser.role === key ? 'bg-white border-white text-black' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                                              >
                                                  <span className="material-symbols-outlined">{info.icon}</span>
                                                  <div className="flex-1">
                                                      <span className="block font-black uppercase text-xs tracking-tight">{info.label}</span>
                                                      <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedUser.role === key ? 'text-black/50' : 'text-slate-500'}`}>{info.description}</p>
                                                  </div>
                                                  {selectedUser.role === key && <span className="material-symbols-outlined">check_circle</span>}
                                              </div>
                                          ))}
                                     </div>
                                 </div>

                                 {/* MÃ“DULOS DE ACESSO - GRANULAR VERSION */}
                                  {selectedUser.role !== 'admin' && selectedUser.role !== 'manager' && (
                                 <div className="space-y-6 pb-10">
                                     <div className="flex items-center justify-between ml-1">
                                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Permissões por Módulo</label>
                                         <button 
                                            onClick={handleSavePermissions}
                                            disabled={isEditing}
                                            className="text-[9px] font-black text-[var(--nb-neon-cyan)] uppercase tracking-widest hover:brightness-125 transition-all flex items-center gap-2"
                                         >
                                             {isEditing ? <div className="size-2 border border-white/20 border-t-[var(--nb-neon-cyan)] rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-sm">save</span>}
                                             Salvar Tudo
                                         </button>
                                     </div>
                                     
                                     <div className="space-y-3">
                                          {[
                                              { 
                                                  id: 'dashboard', label: 'Dashboard', icon: 'dashboard',
                                                  actions: [
                                                      { id: 'dashboard_view', label: 'Visualizar KPIs' },
                                                      { id: 'analytics_advanced', label: 'Relatórios Avançados' }
                                                  ]
                                              },
                                              { 
                                                  id: 'finance', label: 'Caixa & Vendas', icon: 'point_of_sale',
                                                  actions: [
                                                      { id: 'cashflow_view', label: 'Ver Fluxo de Caixa' },
                                                      { id: 'cashflow_edit', label: 'Lançar Recebíveis/Saídas' },
                                                      { id: 'cashflow_close', label: 'Fechar Turno' }
                                                  ]
                                              },
                                              { 
                                                  id: 'agenda', label: 'Agenda Global', icon: 'calendar_month',
                                                  actions: [
                                                      { id: 'agenda_view', label: 'Visualizar Horários' },
                                                      { id: 'agenda_edit', label: 'Criar/Remarcar' },
                                                      { id: 'agenda_admin', label: 'Bloqueio de Agenda' }
                                                  ]
                                              },
                                              { 
                                                  id: 'clients', label: 'Base de Clientes', icon: 'group',
                                                  actions: [
                                                      { id: 'clients_view', label: 'Consultar Lista' },
                                                      { id: 'clients_create', label: 'Cadastrar Novos' },
                                                      { id: 'clients_edit', label: 'Editar Histórico' },
                                                      { id: 'clients_delete', label: 'Excluir Registros' }
                                                  ]
                                              },
                                              { 
                                                  id: 'team', label: 'Gestão de Equipe', icon: 'badge',
                                                  actions: [
                                                      { id: 'team_navbar_view', label: 'Acesso ao Módulo' },
                                                      { id: 'team_view_all', label: 'Ver Todos os Colegas' },
                                                      { id: 'team_edit', label: 'Alterar Permissões' }
                                                  ]
                                              },
                                              { 
                                                  id: 'services', label: 'Serviços', icon: 'content_cut',
                                                  actions: [
                                                      { id: 'services_view', label: 'Ver Tabela de Preços' },
                                                      { id: 'services_edit', label: 'Alterar Valores/Tempo' }
                                                  ]
                                              },
                                              { 
                                                  id: 'commissions', label: 'Comissões', icon: 'attach_money',
                                                  actions: [
                                                      { id: 'commissions_view', label: 'Visualizar Ganhos' },
                                                      { id: 'commissions_edit', label: 'Marcar Pagamento' }
                                                  ]
                                              },
                                              { 
                                                  id: 'inventory', label: 'Produtos/Estoque', icon: 'inventory_2',
                                                  actions: [
                                                      { id: 'products_view', label: 'Ver Itens' },
                                                      { id: 'products_edit', label: 'Cadastrar/Preço' },
                                                      { id: 'inventory_adjust', label: 'Ajuste de Saldo' }
                                                  ]
                                              },
                                              { 
                                                  id: 'system', label: 'Configurações', icon: 'settings',
                                                  actions: [
                                                      { id: 'settings_view', label: 'Acessar Painel' },
                                                      { id: 'settings_edit', label: 'Mudar Regras do Salão' }
                                                  ]
                                              },
                                          ].map((mod) => {
                                              const hasAny = mod.actions.some(a => pendingPermissions[a.id]);
                                              // Use a local state check for expansion if we don't want to add a global one, 
                                              // but adding a simple "expanded" toggle per item is better.
                                              // For now, let's use a module-level local state by checking if it's currently focused.
                                              return (
                                                  <div key={mod.id} className={`rounded-3xl border transition-all overflow-hidden ${hasAny ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5'}`}>
                                                      <div 
                                                        onClick={(e) => {
                                                            const el = e.currentTarget.nextElementSibling;
                                                            if (el) el.classList.toggle('hidden');
                                                            const icon = e.currentTarget.querySelector('.chevron-icon');
                                                            if (icon) icon.classList.toggle('rotate-180');
                                                        }}
                                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all group"
                                                      >
                                                          <div className={`size-10 rounded-xl flex items-center justify-center border ${hasAny ? 'bg-[var(--nb-neon-cyan)]/20 border-[var(--nb-neon-cyan)]/30 text-[var(--nb-neon-cyan)]' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                                                              <span className="material-symbols-outlined text-xl">{mod.icon}</span>
                                                          </div>
                                                          <span className={`font-black uppercase text-xs tracking-tight flex-1 ${hasAny ? 'text-white' : 'text-slate-500'}`}>{mod.label}</span>
                                                          <span className="material-symbols-outlined text-slate-600 chevron-icon transition-transform duration-300">expand_more</span>
                                                      </div>
                                                      <div className="px-4 pb-4 grid grid-cols-1 gap-2 hidden animate-in slide-in-from-top-2 duration-300">
                                                          {mod.actions.map(action => (
                                                              <div 
                                                                key={action.id}
                                                                onClick={() => handleTogglePermission(action.id)}
                                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${pendingPermissions[action.id] ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-500'}`}
                                                              >
                                                                  <div className={`size-4 rounded-md border flex items-center justify-center transition-all ${pendingPermissions[action.id] ? 'bg-[var(--nb-neon-cyan)] border-[var(--nb-neon-cyan)]' : 'bg-transparent border-white/10'}`}>
                                                                      {pendingPermissions[action.id] && <span className="material-symbols-outlined text-[10px] text-black font-black">check</span>}
                                                                  </div>
                                                                  <span className="text-[10px] font-bold uppercase tracking-wide">{action.label}</span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                     </div>
                                 </div>
                                  )}

                                 {/* PIN de Segurança */}
                                 <div className="bg-[var(--nb-neon-cyan)]/10 border border-[var(--nb-neon-cyan)]/20 p-8 rounded-[40px] space-y-6">
                                      <div className="flex items-center gap-3 text-[var(--nb-neon-cyan)]">
                                          <span className="material-symbols-outlined">lock</span>
                                          <h5 className="font-black uppercase tracking-widest text-xs">Protocolo de Terminal (PIN)</h5>
                                      </div>
                                      <div className="relative">
                                          <input 
                                            type={showPin ? "text" : "password"}
                                            maxLength={4}
                                            value={selectedUser.cash_pin || ''}
                                            onChange={async (e) => {
                                                const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                                if (updateUserCashPin) await updateUserCashPin(selectedUser.id, val);
                                                setSelectedUser(prev => prev ? ({...prev, cash_pin: val}) : null);
                                                showNotify('PIN ATUALIZADO');
                                            }}
                                            className="w-full h-16 bg-black/40 border border-white/10 rounded-2xl text-center text-2xl font-black text-white tracking-[1em]"
                                          />
                                          <button onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                                              <span className="material-symbols-outlined">{showPin ? 'visibility_off' : 'visibility'}</span>
                                          </button>
                                      </div>
                                 </div>

                                 {/* Reset Password */}
                                 <button 
                                    onClick={async () => {
                                        const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
                                        showNotify(error ? 'ERRO AO ENVIAR' : 'E-MAIL DE REDEFINIÃ‡ÃƒO ENVIADO');
                                    }}
                                    className="w-full py-5 rounded-3xl border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                                 >
                                     <span className="material-symbols-outlined">key</span>
                                     Resetar Senha de Acesso
                                 </button>
                             </div>

                             <div className="p-10 border-t border-white/5 bg-black/20">
                                 <button className="w-full py-5 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-3">
                                     <span className="material-symbols-outlined">delete_forever</span>
                                     Desativar Credenciais
                                 </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-[#e8e2d4]/40 h-full font-display text-slate-800 overflow-hidden flex relative">
            <style>{styles}</style>
            {notification && (
                <div className="fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl bg-white text-slate-800 font-bold shadow-2xl animate-in slide-in- fade-in duration-300 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-800">check_circle</span>
                    {notification}
                </div>
            )}

            <main className="flex-1 overflow-y-auto pb-16 px-6 lg:px-10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-300 mb-8 mt-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#e8e2d4]/40 rounded-lg text-slate-800">
                                <span className="material-symbols-outlined">shield_person</span>
                            </div>
                            <h1 className="text-h2 text-slate-800 leading-none">Usuários e Permissões</h1>
                            <button onClick={refresh} className="ml-2 p-2 bg-white shadow-sm border border-slate-300 hover:border-slate-300 hover:shadow transition-all rounded-lg text-slate-400 transition-colors" title="Atualizar Lista">
                                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
                            </button>
                        </div>
                        <p className="text-body text-text-secondary max-w-2xl">Gerencie o acesso da sua equipe com precisão e segurança.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: 'Total de Usuários', val: users.length, icon: 'group', color: 'text-slate-800/80', bg: 'bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl' },
                        { label: 'Administradores', val: users.filter(u => u.role === 'admin').length, icon: 'admin_panel_settings', color: 'text-slate-800', bg: 'bg-[#e8e2d4]/40' },
                        { label: 'Gerentes', val: users.filter(u => u.role === 'manager').length, icon: 'shield', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Profissionais', val: users.filter(u => u.role === 'professional').length, icon: 'content_cut', color: 'text-slate-500', bg: 'bg-slate-100' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-300 shadow-none flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-black text-slate-800">{stat.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-300 shadow-xl overflow-hidden backdrop-blur-xl">
                    <div className="p-6 border-b border-slate-300 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-300 shadow-sm rounded-xl">
                        <div className="relative w-full md:w-96 group">
                            <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors">search</span>
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none font-medium text-slate-800/80 transition-all placeholder:text-slate-400"
                                placeholder="Buscar usuários..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <select
                                    value={filterRole}
                                    onChange={e => setFilterRole(e.target.value)}
                                    className="appearance-none pl-4 pr-10 py-3 rounded-xl bg-white border border-slate-300 font-bold text-sm text-slate-800/80 focus:ring-2 focus:ring-[#06b6d4]/50 outline-none cursor-pointer hover:bg-white transition-colors shadow-none"
                                >
                                    <option value="">Todas as Funções</option>
                                    <option value="manager">Gerente</option>
                                    <option value="receptionist">Recepção</option>
                                    <option value="professional">Profissional</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-3.5 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 border-b border-slate-300 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-5">Usuário</div>
                        <div className="col-span-3">Função</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Ações</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <div className="p-12 text-center">
                                <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">search_off</span>
                                <p className="text-slate-400 font-medium">Nenhum usuário encontrado</p>
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover: shadow-md text-white/10/30 transition-colors group cursor-pointer" onClick={() => handleEditClick(user)}>
                                    <div className="col-span-5 flex items-center gap-4">
                                        <div className="relative">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.full_name || 'User'} className="size-12 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="size-12 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-slate-500 text-lg group-hover:scale-105 transition-transform">
                                                    {generateInitials(user.full_name || '', user.email)}
                                                </div>
                                            )}
                                            <div className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white ${user.status === 'active' ? 'bg-emerald-500/100' : 'bg-gray-300'}`}></div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-800/90 text-base">
                                                    {(user.full_name && user.full_name !== 'Sem Nome') ? user.full_name : (user.email !== 'Sem email' ? user.email?.split('@')[0] : 'Usuário Sem Nome')}
                                                </h4>
                                                {(!user.full_name || user.full_name === 'Sem Nome') && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Incompleto</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-3">
                                        {user.role ? (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${accessLevelLabels[user.role]?.bg || 'bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl'} ${accessLevelLabels[user.role]?.text || 'text-slate-600'} border-transparent`}>
                                                <span className="material-symbols-outlined text-[16px]">{accessLevelLabels[user.role]?.icon || 'person'}</span>
                                                {accessLevelLabels[user.role]?.label || user.role}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md text-white/15 text-cyan-700 border border-slate-300">
                                                <span className="material-symbols-outlined text-[16px]">pending</span>
                                                Pendente
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${user.status === 'active' ? 'text-emerald-600 bg-emerald-500/10' : 'text-slate-500 bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl'}`}>
                                            {user.status === 'active' ? 'Ativo' : 'Sem Acesso'}
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(user); }} className="size-9 rounded-full hover:bg-white hover:shadow-md flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all">
                                            <span className="material-symbols-outlined">edit_square</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* User Sidebar - Futuristic Redesign */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-[#0f172a]/95 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 transform transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} overflow-hidden border-l border-slate-300`}>
                {selectedUser && (
                    <div className="h-full flex flex-col relative">
                        {/* Futuristic Background Elements */}
                        <div className="absolute top-0 left-0 w-full h-1 opacity-50"></div>
                        <div className="absolute -top-24 -right-24 size-64 bg-cyan-500 text-white shadow-md/10 blur-[100px] rounded-full"></div>
                        <div className="absolute -bottom-24 -left-24 size-64 bg-[#e8e2d4]/40 blur-[100px] rounded-full"></div>

                        {/* Header */}
                        <div className="p-8 border-b border-slate-300 flex items-center justify-between sticky top-0 bg-[#0f172a]/50 backdrop-blur-md z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500 text-white shadow-md/20 rounded-lg border border-slate-300">
                                    <span className="material-symbols-outlined text-slate-800 font-bold">person_search</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Inteligência de Usuário</h3>
                                    <p className="text-[10px] font-bold text-slate-800 font-bold tracking-[0.2em] uppercase">Centro de Controle v2.0</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSidebarOpen(false)} className="size-10 rounded-xl bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl hover:bg-slate-50 border border-slate-300 flex items-center justify-center transition-all group">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-800 group-hover:rotate-90 transition-all">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {/* Profile Header */}
                            <div className="flex flex-col items-center mb-12 relative">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 rounded-full blur-lg opacity-20 animate-pulse"></div>
                                    {selectedUser.avatar_url ? (
                                        <img src={selectedUser.avatar_url} className="size-32 rounded-3xl object-cover shadow-2xl border-2 border-slate-300 relative z-10" />
                                    ) : (
                                        <div className="size-32 rounded-3xl bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border-2 border-slate-300 flex items-center justify-center text-4xl font-black text-slate-400 relative z-10 backdrop-blur-xl">
                                            {generateInitials(selectedUser.full_name || '')}
                                        </div>
                                    )}
                                    <div className={`absolute -bottom-2 -right-2 size-8 rounded-2xl border-4 border-slate-800 shadow-xl flex items-center justify-center ${selectedUser.status === 'active' ? ' bg-cyan-500 text-white shadow-md' : 'bg-gray-600'}`}>
                                        <span className="material-symbols-outlined text-xs text-slate-800 font-black">{selectedUser.status === 'active' ? 'bolt' : 'power_off'}</span>
                                    </div>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 text-center leading-tight mb-2 tracking-tighter">{selectedUser.full_name || 'Sem Nome'}</h2>
                                <p className="text-slate-800 font-bold/60 font-mono text-xs tracking-wider uppercase mb-6">{selectedUser.email}</p>

                                <div className="flex gap-2">
                                    <div className="px-4 py-1.5 rounded-full bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Status: <span className={selectedUser.status === 'active' ? 'text-slate-800 font-bold' : 'text-slate-500'}>{selectedUser.status === 'active' ? 'Online/Ativo' : 'Offline'}</span>
                                    </div>
                                    <div className="px-4 py-1.5 rounded-full bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Perfil: <span className="text-slate-800">{accessLevelLabels[selectedUser.role || '']?.label || 'Indefinido'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                {selectedUser.status !== 'active' && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 size-32 bg-amber-500/10 blur-3xl rounded-full"></div>
                                        <h4 className="font-black text-amber-500 text-xl mb-3 uppercase tracking-tight">Acesso Pendente</h4>
                                        <p className="text-sm text-slate-400 font-bold mb-8 leading-relaxed">Este colaborador ainda não possui credenciais. Gere um acesso padrão para ele começar.</p>
                                        
                                        <div className="space-y-3">
                                            <button
                                                onClick={handleGenerateAccess}
                                                disabled={isGeneratingAccess}
                                                className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl hover:bg-amber-500 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {isGeneratingAccess ? (
                                                    <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined">key</span>
                                                        GERAR ACESSO PADRÃO
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={handleInviteClick}
                                                className="w-full py-4 text-slate-400 font-black rounded-2xl border border-white/10 hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                <span className="material-symbols-outlined">mail</span>
                                                CONVITE VIA E-MAIL
                                            </button>
                                        </div>

                                        {tempPassword && (
                                            <div className="mt-6 p-6 bg-black/40 border-2 border-emerald-500/30 rounded-2xl animate-in zoom-in-95 text-left">
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Senha Temporária Gerada:</p>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-3xl font-black text-white tracking-[0.2em]">{tempPassword}</span>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(tempPassword);
                                                            showNotify('Senha copiada!');
                                                        }}
                                                        className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">content_copy</span>
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-slate-500 font-bold mt-4 leading-tight italic">
                                                    Dê esta senha ao colaborador. Ele deverá trocá-la no primeiro acesso ao App.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedUser.status === 'active' && (
                                    <div className="space-y-10">
                                        {/* Access Level Selector */}
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-6">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Nível de Credencial de Acesso</label>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                {Object.entries(accessLevelLabels)
                                                    .filter(([key]) => key !== 'admin')
                                                    .map(([key, info]) => (
                                                        <div
                                                            key={key}
                                                            onClick={() => handleSaveRole(key)}
                                                            className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-5 group relative overflow-hidden ${selectedUser.role === key ? 'border-slate-300 bg-cyan-500 text-white shadow-md/10 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'border-slate-300 bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl hover:border-white/20 hover:bg-white/[0.08]'}`}
                                                        >
                                                            {selectedUser.role === key && <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 text-white shadow-md"></div>}
                                                            <div className={`size-12 rounded-2xl flex items-center justify-center ${selectedUser.role === key ? ' bg-cyan-500 text-white shadow-md shadow-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl text-slate-400 group-hover:text-slate-800'}`}>
                                                                <span className="material-symbols-outlined text-2xl">{info.icon}</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className={`font-black uppercase tracking-tight ${selectedUser.role === key ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>{info.label}</h4>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{info.description}</p>
                                                            </div>
                                                            {selectedUser.role === key && (
                                                                <div className="size-6 bg-cyan-500 text-white shadow-md rounded-full flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-slate-800 text-[16px] font-black">check</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Granular Permissions Section */}
                                        <div className="bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 rounded-[2.5rem] p-8 backdrop-blur-xl relative">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-xl bg-[#e8e2d4]/40 flex items-center justify-center border border-slate-300">
                                                        <span className="material-symbols-outlined text-slate-800 text-xl">tune</span>
                                                    </div>
                                                    <h5 className="font-black text-slate-800 uppercase tracking-tighter">Acesso Granular a Protocolos</h5>
                                                </div>
                                                {selectedUser.role !== 'manager' && (
                                                    <button
                                                        onClick={handleSavePermissions}
                                                        disabled={isEditing}
                                                        className="text-[10px] font-black text-slate-800 font-bold hover:text-cyan-300 uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {isEditing ? (
                                                            <div className="size-3 border-2 border-slate-300/30 border-t-cyan-400 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[16px]">save</span>
                                                        )}
                                                        Salvar Alterações
                                                    </button>
                                                )}
                                            </div>

                                            {selectedUser.role === 'manager' && (
                                                <div className="bg-[#e8e2d4]/40 border border-slate-300 rounded-2xl p-4 flex items-start gap-4 mb-8">
                                                    <span className="material-symbols-outlined text-slate-800 mt-0.5">verified_user</span>
                                                    <p className="text-[10px] text-slate-800 font-bold leading-relaxed uppercase tracking-widest">
                                                        Nível de Autoridade: **ROOT/GERENTE**. Todos os sub-protocolos são habilitados por padrão.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-10">
                                                {PERMISSION_GROUPS.map((group) => (
                                                    <div key={group.id} className="relative">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <span className="material-symbols-outlined text-slate-400 text-xl">{group.icon}</span>
                                                            <h6 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em]">{group.label}</h6>
                                                            <div className="flex-1 h-[1px] bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl ml-2"></div>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {(() => {
                                                                const actionsToRender = group.actions.filter(a => a.id !== 'team_self_edit');

                                                                return actionsToRender.map((action) => {
                                                                    const isManager = selectedUser.role === 'manager';
                                                                    const hasPerm = pendingPermissions[action.id] || isManager;

                                                                    const isNavbarAction = action.id === 'team_navbar_view';
                                                                    const selfEditAction = group.actions.find(a => a.id === 'team_self_edit');
                                                                    const hasSelfEditPerm = selfEditAction ? (pendingPermissions[selfEditAction.id] || isManager) : false;

                                                                    return (
                                                                        <div
                                                                            key={action.id}
                                                                            className={`${isNavbarAction ? 'col-span-full' : ''} bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 rounded-3xl overflow-hidden transition-all hover:border-white/20`}
                                                                        >
                                                                            <div
                                                                                onClick={() => !isManager && handleTogglePermission(action.id)}
                                                                                className={`group flex items-center gap-4 p-5 cursor-pointer transition-all ${hasPerm ? ' bg-cyan-500 text-white shadow-md/10' : 'hover:bg-white/[0.05]'}`}
                                                                            >
                                                                                <div className={`size-6 rounded-lg flex items-center justify-center border transition-all ${hasPerm ? ' bg-cyan-500 text-white shadow-md border-slate-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-[#0f172a] border-slate-300 group-hover:border-white/30'}`}>
                                                                                    {hasPerm && <span className="material-symbols-outlined text-slate-800 text-sm font-black animate-scaleIn">check</span>}
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <span className={`block text-xs font-black uppercase tracking-tight ${hasPerm ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}>{action.label}</span>
                                                                                    {action.desc && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{action.desc}</p>}
                                                                                </div>
                                                                            </div>

                                                                            {isNavbarAction && selfEditAction && (
                                                                                <div className={`px-6 pb-5 pt-2 border-t border-slate-300 bg-black/20 transition-all ${!hasPerm ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                                                                                    <div
                                                                                        onClick={() => !isManager && handleTogglePermission(selfEditAction.id)}
                                                                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 hover:border-slate-300 cursor-pointer group/sub"
                                                                                    >
                                                                                        <div className={`size-5 rounded flex items-center justify-center border transition-all ${hasSelfEditPerm ? ' bg-cyan-500 text-white shadow-md border-slate-300' : 'bg-[#0f172a] border-slate-300 group-hover/sub:border-white/30'}`}>
                                                                                            {hasSelfEditPerm && <span className="material-symbols-outlined text-slate-800 text-[12px] font-black">check</span>}
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <span className={`block text-[10px] font-black uppercase tracking-tight ${hasSelfEditPerm ? 'text-slate-800' : 'text-slate-400 group-hover/sub:text-slate-600'}`}>{selfEditAction.label}</span>
                                                                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{selfEditAction.desc}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Security & System PIN */}
                                        <div className="bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 rounded-[2.5rem] p-8 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8 text-slate-800">
                                                <div className="size-8 rounded-xl bg-rose-500/20 flex items-center justify-center border border-red-500/30">
                                                    <span className="material-symbols-outlined text-red-400">shield_lock</span>
                                                </div>
                                                <h5 className="font-black uppercase tracking-tighter">PIN de Protocolo de Segurança</h5>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">PIN de Acesso (Terminal)</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPin ? "text" : "password"}
                                                            maxLength={4}
                                                            value={selectedUser.cash_pin || ''}
                                                            onChange={async (e) => {
                                                                const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                                                const success = await updateUserCashPin?.(selectedUser.id, val);
                                                                if (success) {
                                                                    setSelectedUser(prev => prev ? ({ ...prev, cash_pin: val }) : null);
                                                                    showNotify('PIN DE SEGURANÃ‡A SINCRONIZADO');
                                                                }
                                                            }}
                                                            className="w-full pl-6 pr-12 py-4 rounded-2xl bg-[#0f172a] border border-slate-300 focus:border-slate-300 focus:ring-4 focus:ring-cyan-500/10 outline-none font-black text-slate-800 font-bold text-xl transition-all tracking-[1em]"
                                                            placeholder="0000"
                                                        />
                                                        <button
                                                            onClick={() => setShowPin(!showPin)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined">{showPin ? 'visibility_off' : 'visibility'}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={async () => {
                                                        const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
                                                        if (error) {
                                                            showNotify('Erro de Protocolo: Falha no Reset');
                                                        } else {
                                                            showNotify('Link de Reset de Criptografia Enviado');
                                                        }
                                                    }}
                                                    className="w-full py-4 px-6 rounded-2xl border border-slate-300 bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center gap-3 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-slate-800 font-bold text-lg">lock_reset</span>
                                                    Disparar Sequência de Redefinição de Senha
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* System Meta Data */}
                                <div className="bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl border border-slate-300 rounded-3xl p-6">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-200 text-sm">database</span> Metadados do Sistema
                                    </h5>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Neural ID</span>
                                            <span className="font-mono text-[9px] text-slate-400 bg-black/20 px-2 py-1 rounded-lg select-all">{selectedUser.id}</span>
                                        </div>
                                        {selectedUser.created_at && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-500 uppercase">Timestamp de Entrada</span>
                                                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-tighter">{new Date(selectedUser.created_at).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dangerous Actions - Destructive */}
                        <div className="p-8 border-t border-slate-300 bg-[#0f172a]/80 backdrop-blur-xl">
                            <button onClick={() => { showNotify('IDENTIDADE DELETADA'); setIsSidebarOpen(false); }} className="w-full py-4 rounded-2xl border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500 transition-all flex items-center justify-center gap-3 group">
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete_forever</span>
                                TERMINAR CREDENCIAL DO SISTEMA
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Overlays */}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"></div>}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}></div>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="size-16 bg-[#e8e2d4]/40 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <span className="material-symbols-outlined text-3xl text-slate-800">alternate_email</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Enviar Convite</h3>
                        <p className="text-center text-slate-500 mb-8">
                            Confirme ou insira o e-mail do colaborador para enviar o link de acesso.
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">E-mail do Colaborador</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]/20 outline-none font-medium text-slate-800/80 transition-all"
                                placeholder="exemplo@email.com"
                            />
                        </div>

                        <button
                            onClick={handleSendInvite}
                            disabled={isSendingInvite}
                            className="w-full py-3.5 bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:bg-cyan-600 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                            {isSendingInvite ? (
                                <>
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">send</span>
                                    Criar E-mail e Enviar
                                </>
                            )}
                        </button>

                        <button onClick={() => setShowInviteModal(false)} className="w-full mt-3 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPermissions;
