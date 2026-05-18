import React, { useState, useEffect } from 'react';

interface NotificationSettingsState {
  newAppointments: boolean;
  cancellationsRescheduling: boolean;
  reminders24h: boolean;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  productExpiry: boolean;
  dailySummary: boolean;
  emailSummary: boolean;
  goalsReached: boolean;
}

const defaultSettings: NotificationSettingsState = {
  newAppointments: true,
  cancellationsRescheduling: true,
  reminders24h: false,
  lowStockAlert: true,
  lowStockThreshold: 5,
  productExpiry: true,
  dailySummary: false,
  emailSummary: false,
  goalsReached: true,
};

interface NotificationSettingsProps {
    variant?: 'classic' | 'modern';
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ variant = 'classic' }) => {
  const [settings, setSettings] = useState<NotificationSettingsState>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<NotificationSettingsState>(defaultSettings);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if there are unsaved changes
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(savedSettings));
  }, [settings, savedSettings]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleToggle = (key: keyof NotificationSettingsState) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSavedSettings(settings);
    setNotification('Configurações salvas com sucesso!');
  };

  const handleCancel = () => {
    setSettings(savedSettings);
    setNotification('Alterações descartadas.');
  };

  const handleRestoreDefaults = () => {
    setSettings(defaultSettings);
    setNotification('Configurações restauradas para o padrão.');
  };

  const ModernToggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
        onClick={onChange}
        className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${checked ? 'bg-[var(--nb-neon-cyan)] shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-white/10'}`}
    >
        <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </div>
  );

  if (variant === 'modern') {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {notification && (
                <div className="fixed top-24 right-20 z-[1000] px-8 py-4 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 text-white font-bold shadow-2xl flex items-center gap-4">
                    <span className="material-symbols-outlined text-[var(--nb-neon-cyan)]">notifications_active</span>
                    {notification}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Agenda Section */}
                 <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-8">
                     <div className="flex items-center gap-4">
                         <div className="size-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-[var(--nb-neon-cyan)]">
                             <span className="material-symbols-outlined">calendar_today</span>
                         </div>
                         <div>
                             <h4 className="text-white font-black uppercase tracking-tight">Agenda & Fluxo</h4>
                             <p className="text-[10px] font-bold text-[var(--nb-neon-cyan)] uppercase tracking-widest">O Cérebro Vigilante</p>
                         </div>
                     </div>

                     <div className="space-y-4">
                          {[
                              { key: 'newAppointments', label: 'Novas Reservas', desc: 'Notificar ao receber agendamento' },
                              { key: 'cancellationsRescheduling', label: 'Cancelamentos', desc: 'Alertar sobre horários liberados' },
                              { key: 'reminders24h', label: 'Lembretes 24h', desc: 'Resumo das próximas 24 horas' }
                          ].map(item => (
                              <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                  <div>
                                      <p className="text-xs font-black text-slate-300 uppercase tracking-tight">{item.label}</p>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.desc}</p>
                                  </div>
                                  <ModernToggle checked={settings[item.key as keyof NotificationSettingsState] as boolean} onChange={() => handleToggle(item.key as keyof NotificationSettingsState)} />
                              </div>
                          ))}
                     </div>
                 </div>

                 {/* Operations Section */}
                 <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-8">
                     <div className="flex items-center gap-4">
                         <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-[var(--nb-neon-amber)]">
                             <span className="material-symbols-outlined">inventory</span>
                         </div>
                         <div>
                             <h4 className="text-white font-black uppercase tracking-tight">Operações</h4>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alertas de Estoque & Caixa</p>
                         </div>
                     </div>

                     <div className="space-y-4">
                          {[
                              { key: 'lowStockAlert', label: 'Estoque Mínimo', desc: 'Alerta de reposição de insumos' },
                              { key: 'productExpiry', label: 'Vencimentos', desc: 'Avisos de validade de produtos' },
                              { key: 'dailySummary', label: 'Resumo de Caixa', desc: 'Fechamento financeiro diário' }
                          ].map(item => (
                              <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors">
                                  <div>
                                      <p className="text-xs font-black text-slate-300 uppercase tracking-tight">{item.label}</p>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.desc}</p>
                                  </div>
                                  <ModernToggle checked={settings[item.key as keyof NotificationSettingsState] as boolean} onChange={() => handleToggle(item.key as keyof NotificationSettingsState)} />
                              </div>
                          ))}
                     </div>
                 </div>
            </div>

            {/* Action Bar */}
            <div className="pt-10 border-t border-white/10 flex justify-between items-center">
                <button onClick={handleRestoreDefaults} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Restaurar Padrões de Sistema</button>
                <div className="flex gap-4">
                    <button onClick={handleCancel} disabled={!hasChanges} className="px-8 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all disabled:opacity-30">Descartar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!hasChanges}
                        className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-lg">check</span>
                        Confirmar Regras
                    </button>
                </div>
            </div>
        </div>
    );
  }

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input checked={checked} onChange={onChange} className="sr-only peer" type="checkbox" />
      <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-[#1e293b] peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-[#444] peer-checked:bg-[#0f172a] text-white hover:peer-checked:bg-cyan-600 shadow-inner"></div>
    </label>
  );

  return (
    <div className="bg-[#e8e2d4]/40 h-full font-display text-slate-800 overflow-y-auto">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl bg-slate-900 text-slate-800 font-bold shadow-2xl animate-in slide-in- fade-in duration-300 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          {notification}
        </div>
      )}

      <main className="pb-16 px-6 lg:px-10 w-full max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-300 dark:border-[#1e293b] mb-10 mt-2">
          <div>
            <h1 className="text-h1 text-slate-800 dark:text-slate-800 mb-2">Configuração de Notificações</h1>
            <p className="text-body text-text-secondary max-w-2xl">Gerencie seus alertas de agendamentos, estoque e relatórios do sistema.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRestoreDefaults} className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#1e293b] text-slate-800 dark:text-slate-500 font-bold text-sm bg-white dark:bg-[#0f172a] hover:bg-white dark:hover:bg-[#252216] transition-colors">
              Restaurar Padrões
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Agendamentos Section */}
          <section className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-none border border-slate-300 dark:border-[#1e293b] overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-300 dark:border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-[#e8e2d4]/40 dark:bg-[#1e293b] flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-h3 text-slate-800 dark:text-slate-800">Agendamentos</h3>
                  <p className="text-body-sm text-text-secondary">Notificações sobre a agenda e clientes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wide bg-[#e8e2d4]/40 dark:bg-[#1e293b] px-3 py-1 rounded-full">Alta Prioridade</span>
              </div>
            </div>
            <div className="divide-y divide-[#f4f0e7] dark:divide-[#1e293b]">
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Novos Agendamentos</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Receba um alerta imediato quando um cliente agendar pelo app.</p>
                </div>
                <ToggleSwitch checked={settings.newAppointments} onChange={() => handleToggle('newAppointments')} />
              </div>
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Cancelamentos e Reagendamentos</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Saiba quando um horário for liberado ou alterado.</p>
                </div>
                <ToggleSwitch checked={settings.cancellationsRescheduling} onChange={() => handleToggle('cancellationsRescheduling')} />
              </div>
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Lembretes de 24 horas</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Resumo diário dos agendamentos do dia seguinte.</p>
                </div>
                <ToggleSwitch checked={settings.reminders24h} onChange={() => handleToggle('reminders24h')} />
              </div>
            </div>
          </section>

          {/* Estoque Section */}
          <section className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-none border border-slate-300 dark:border-[#1e293b] overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-300 dark:border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-[#e8e2d4]/40 dark:bg-[#1e293b] flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">inventory_2</span>
                </div>
                <div>
                  <h3 className="text-h3 text-slate-800 dark:text-slate-800">Estoque e Produtos</h3>
                  <p className="text-body-sm text-text-secondary">Controle de inventário e insumos</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#f4f0e7] dark:divide-[#1e293b]">
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Alerta de Estoque Baixo</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Notificar quando produtos atingirem a quantidade mínima.</p>
                </div>
                <ToggleSwitch checked={settings.lowStockAlert} onChange={() => handleToggle('lowStockAlert')} />
              </div>
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Validade de Produtos</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Avisos sobre produtos próximos do vencimento.</p>
                </div>
                <ToggleSwitch checked={settings.productExpiry} onChange={() => handleToggle('productExpiry')} />
              </div>
            </div>
          </section>

          {/* Relatórios Section */}
          <section className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-none border border-slate-300 dark:border-[#1e293b] overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-300 dark:border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-[#e8e2d4]/40 dark:bg-[#1e293b] flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">bar_chart</span>
                </div>
                <div>
                  <h3 className="text-h3 text-slate-800 dark:text-slate-800">Relatórios e Financeiro</h3>
                  <p className="text-body-sm text-text-secondary">Insights de desempenho e alertas de caixa</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[#f4f0e7] dark:divide-[#1e293b]">
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Resumo Diário</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Receber o fechamento de caixa e métricas ao final do dia.</p>
                </div>
                <ToggleSwitch checked={settings.dailySummary} onChange={() => handleToggle('dailySummary')} />
              </div>
              <div className="flex items-center justify-between p-6 lg:px-8 hover:bg-[#fcfbf8] dark:hover:bg-[#0f172a] transition-colors">
                <div className="pr-8">
                  <h4 className="text-h4 text-slate-800 dark:text-slate-800">Metas Alcançadas</h4>
                  <p className="text-body-sm text-text-secondary mt-1">Notificar quando a equipe bater as metas mensais.</p>
                </div>
                <ToggleSwitch checked={settings.goalsReached} onChange={() => handleToggle('goalsReached')} />
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="pt-8 border-t border-slate-300 dark:border-[#1e293b] flex justify-end gap-4 mt-6">
            <button onClick={handleCancel} disabled={!hasChanges} className="px-8 py-3.5 rounded-xl border border-slate-300 dark:border-[#1e293b] text-slate-800 dark:text-slate-800 font-bold hover:bg-white dark:hover:bg-[#252216] transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!hasChanges} className="px-10 py-3.5 rounded-xl bg-[#0f172a] text-white hover:bg-cyan-600 text-slate-800 font-bold shadow-cyan-500/20 hover:shadow-cyan-500/20-hover transition-all flex items-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined">save</span>
              Salvar Alterações
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationSettings;