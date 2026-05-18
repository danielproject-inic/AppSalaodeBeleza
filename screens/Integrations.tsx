import React, { useState, useEffect } from 'react';
import { useSalon } from '../contexts/SalonContext';
import { supabase } from '../lib/supabase';

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    connected: boolean;
    lastSync?: string;
    account?: string;
}

interface IntegrationsProps {
    variant?: 'classic' | 'modern';
}

const Integrations: React.FC<IntegrationsProps> = ({ variant = 'classic' }) => {
    const { salonName } = useSalon();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<string | null>(null);
    const [showConfigModal, setShowConfigModal] = useState<string | null>(null);

    const fetchIntegrations = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('salon_integrations')
                .select('*')
                .order('integration_id');

            if (error) throw error;

            if (data) {
                // Map DB data to the Integration interface
                const mapped: Integration[] = data.map(item => {
                    // Default values for icons and colors based on ID
                    let icon = 'hub';
                    let iconBg = '#f3f4f6';
                    let iconColor = '#374151';

                    if (item.integration_id === 'calendar') {
                        icon = 'calendar_apps_script';
                        iconBg = '#e3f2fd';
                        iconColor = '#1565c0';
                    } else if (item.integration_id === 'payments') {
                        icon = 'account_balance_wallet';
                        iconBg = '#f3e5f5';
                        iconColor = '#7b1fa2';
                    } else if (item.integration_id === 'notifications') {
                        icon = 'ad_units';
                        iconBg = '#e0f2f1';
                        iconColor = '#00695c';
                    }

                    return {
                        id: item.integration_id,
                        name: item.name,
                        description: item.settings?.description || getFallbackDescription(item.integration_id),
                        icon,
                        iconBg,
                        iconColor,
                        connected: item.is_connected,
                        lastSync: item.last_sync ? new Date(item.last_sync).toLocaleString('pt-BR') : undefined,
                        account: item.settings?.account
                    };
                });
                setIntegrations(mapped);
            }
        } catch (err) {
            console.error('Error fetching integrations:', err);
            setNotification('Erro ao carregar integrações.');
        } finally {
            setLoading(false);
        }
    };

    const getFallbackDescription = (id: string) => {
        switch (id) {
            case 'calendar': return 'Conecte sua agenda ao Google Calendar e Apple Agenda para sincronização mútua e bloqueio de conflitos.';
            case 'payments': return 'Gateway completo para processamento de Cartão de Crédito via Stripe e recebimento instantâneo por PIX.';
            case 'notifications': return 'Envio automatizado de lembretes de agendamento 24h antes e alertas de retorno via WhatsApp.';
            default: return '';
        }
    };

    useEffect(() => {
        fetchIntegrations();
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleConnect = async (id: string) => {
        try {
            const { error } = await supabase
                .from('salon_integrations')
                .update({ 
                    is_connected: true, 
                    last_sync: new Date().toISOString() 
                })
                .eq('integration_id', id);

            if (error) throw error;

            setNotification('Integração conectada com sucesso!');
            fetchIntegrations();
        } catch (err) {
            console.error('Error connecting:', err);
            setNotification('Erro ao conectar integração.');
        }
    };

    const handleDisconnect = async (id: string) => {
        try {
            const { error } = await supabase
                .from('salon_integrations')
                .update({ 
                    is_connected: false,
                    last_sync: null 
                })
                .eq('integration_id', id);

            if (error) throw error;

            setNotification('Integração desconectada.');
            setShowConfigModal(null);
            fetchIntegrations();
        } catch (err) {
            console.error('Error disconnecting:', err);
            setNotification('Erro ao desconectar integração.');
        }
    };

    const handleSync = async (id: string) => {
        try {
            const { error } = await supabase
                .from('salon_integrations')
                .update({ last_sync: new Date().toISOString() })
                .eq('integration_id', id);

            if (error) throw error;

            setNotification('Sincronização realizada!');
            fetchIntegrations();
        } catch (err) {
            console.error('Error syncing:', err);
            setNotification('Erro ao sincronizar.');
        }
    };

    const handleOpenDocs = () => {
        setNotification('Abrindo documentação...');
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="size-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando Conexões...</p>
            </div>
        );
    }

    if (variant === 'modern') {
        return (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {notification && (
                    <div className="fixed top-24 right-20 z-[1000] px-8 py-4 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 text-white font-bold shadow-2xl flex items-center gap-4">
                        <span className="material-symbols-outlined text-[var(--nb-neon-cyan)]">hub</span>
                        {notification}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrations.map(integration => (
                        <div 
                            key={integration.id}
                            className={`bg-white/5 border border-white/10 p-8 rounded-[40px] flex flex-col gap-6 hover:bg-white/[0.08] transition-all group relative overflow-hidden ${!integration.connected ? 'opacity-80' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="size-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-3xl">{integration.icon}</span>
                                </div>
                                {integration.connected ? (
                                    <div className="flex items-center gap-2 bg-[var(--nb-neon-cyan)]/10 px-3 py-1 rounded-full border border-[var(--nb-neon-cyan)]/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                                        <div className="size-1.5 rounded-full bg-[var(--nb-neon-cyan)] animate-pulse" />
                                        <span className="text-[10px] font-black text-[var(--nb-neon-cyan)] uppercase tracking-wider">Ativo</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                        <div className="size-1.5 rounded-full bg-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inativo</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-white font-black uppercase tracking-tight text-lg leading-tight">{integration.name}</h4>
                                <p className="text-slate-500 text-xs font-medium mt-3 leading-relaxed">{integration.description}</p>
                            </div>

                            <div className="mt-auto space-y-4">
                                {integration.connected ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                            <span>Sincronização</span>
                                            <span className="text-[var(--nb-neon-cyan)]">{integration.lastSync || 'Pendente'}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleSync(integration.id)} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all">Sincronizar</button>
                                            <button onClick={() => handleDisconnect(integration.id)} className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                                <span className="material-symbols-outlined text-sm">link_off</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleConnect(integration.id)}
                                        className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm font-black">add_link</span>
                                        Conectar Protocolo
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-[var(--nb-neon-pink)]/5 border border-[var(--nb-neon-pink)]/10 rounded-[40px] flex items-center justify-between">
                     <div className="flex gap-4 items-center">
                         <div className="size-10 rounded-full bg-[var(--nb-neon-pink)]/20 flex items-center justify-center text-[var(--nb-neon-pink)]">
                             <span className="material-symbols-outlined">api</span>
                         </div>
                         <div>
                             <p className="text-white font-black uppercase tracking-tighter text-sm">Manual de Desenvolvedor & API</p>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Documentação oficial para conexões customizadas</p>
                         </div>
                     </div>
                     <button onClick={handleOpenDocs} className="px-6 py-4 rounded-2xl border border-[var(--nb-neon-pink)]/30 text-[var(--nb-neon-pink)] font-black uppercase tracking-widest text-[9px] hover:bg-[var(--nb-neon-pink)] hover:text-white transition-all">Acessar Docs</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#e8e2d4]/40 h-full font-display text-slate-800 overflow-y-auto">
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl bg-slate-900 text-slate-800 font-bold shadow-2xl animate-in slide-in- fade-in duration-300 flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                    {notification}
                </div>
            )}

            {/* Config Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-300">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">Configurar Integração</h2>
                                <button onClick={() => setShowConfigModal(null)} className="p-2 rounded-lg bg-white shadow-sm border border-slate-300 hover:border-cyan-200 hover:shadow transition-all rounded-xl transition-colors">
                                    <span className="material-symbols-outlined text-text-secondary">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-text-secondary text-sm">
                                Gerencie as configurações desta integração.
                            </p>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-100 flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                <span className="text-sm font-medium text-emerald-700">Conexão ativa e funcionando</span>
                            </div>
                            <button onClick={() => handleSync(showConfigModal)} className="w-full py-3 rounded-xl border border-slate-300 text-slate-800 font-bold hover:bg-white transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">sync</span>
                                Sincronizar Agora
                            </button>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button onClick={() => setShowConfigModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-800 font-bold hover:bg-white transition-all">
                                Cancelar
                            </button>
                            <button onClick={() => handleDisconnect(showConfigModal)} className="flex-1 py-3 rounded-xl bg-red-500/100 text-slate-800 font-bold hover:bg-red-600 transition-all">
                                Desconectar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="pb-16 px-6 lg:px-10 w-full max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-300 dark:border-[#1e293b] mb-10 mt-2">
                    <div>
                        <h1 className="text-h1 text-slate-800 dark:text-slate-800 mb-2">Integrações</h1>
                        <p className="text-body text-text-secondary max-w-2xl">Gerencie conexões com ferramentas externas para automatizar seu fluxo de trabalho.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleOpenDocs} className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#1e293b] text-slate-800 dark:text-slate-500 font-bold text-sm bg-white dark:bg-[#0f172a] hover:bg-white dark:hover:bg-[#252216] transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">help</span>
                            Documentação
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {integrations.map(integration => (
                            <div key={integration.id} className={`group relative bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-300 dark:border-[#1e293b] hover:border-primary/30 transition-all duration-300 hover:shadow-cyan-500/20 shadow-none flex flex-col justify-between h-full ${!integration.connected ? 'opacity-90 hover:opacity-100' : ''}`}>
                                <div>
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="size-14 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: integration.iconBg, color: integration.iconColor }}>
                                            <span className="material-symbols-outlined text-2xl">{integration.icon}</span>
                                        </div>
                                        {integration.connected ? (
                                            <div className="flex items-center gap-1.5 bg-green-500/10 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-900/30">
                                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Conectado</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl dark:bg-gray-800 px-2.5 py-1 rounded-full border border-slate-300 dark:border-gray-700">
                                                <div className="size-1.5 rounded-full bg-gray-400"></div>
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Desconectado</span>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-h3 text-slate-800 dark:text-slate-800">{integration.name}</h3>
                                    <p className="text-body-sm text-text-secondary mt-2 mb-6 leading-relaxed">{integration.description}</p>
                                </div>
                                <div className="pt-4 border-t border-slate-300 dark:border-[#1e293b]">
                                    {integration.connected ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-text-secondary">
                                                {integration.account ? `Conta: ${integration.account}` : integration.lastSync ? `Última sync: ${integration.lastSync}` : ''}
                                            </span>
                                            <button onClick={() => setShowConfigModal(integration.id)} className="text-sm font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1">
                                                Configurar <span className="material-symbols-outlined text-sm">settings</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleConnect(integration.id)} className="w-full py-2.5 rounded-lg border border-primary/30 bg-[#0f172a] text-white/5 text-primary font-bold hover:bg-[#0f172a] text-white hover:text-slate-800 transition-all duration-300 text-sm flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-lg">link</span> Conectar Agora
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Integrations;
