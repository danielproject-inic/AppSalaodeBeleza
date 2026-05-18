import React, { useState, useEffect } from 'react';

interface PreferencesState {
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  highContrast: boolean;
  reduceMotion: boolean;
  notifyNewAppointments: boolean;
  notifyStock: boolean;
  notifyDailyClose: boolean;
  systemSounds: boolean;
}

const defaultPreferences: PreferencesState = {
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
  highContrast: false,
  reduceMotion: false,
  notifyNewAppointments: true,
  notifyStock: true,
  notifyDailyClose: false,
  systemSounds: true,
};

interface SystemPreferencesProps {
    variant?: 'classic' | 'modern';
}

const SystemPreferences: React.FC<SystemPreferencesProps> = ({ variant = 'classic' }) => {
  const [preferences, setPreferences] = useState<PreferencesState>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] = useState<PreferencesState>(defaultPreferences);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(JSON.stringify(preferences) !== JSON.stringify(savedPreferences));
  }, [preferences, savedPreferences]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleChange = <K extends keyof PreferencesState>(key: K, value: PreferencesState[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSavedPreferences(preferences);
    setNotification('Preferências salvas com sucesso!');
  };

  const handleCancel = () => {
    setPreferences(savedPreferences);
    setNotification('Alterações descartadas.');
  };

  const handleRestoreDefaults = () => {
    setPreferences(defaultPreferences);
    setNotification('Preferências restauradas para o padrão.');
  };

  if (variant === 'modern') {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {notification && (
                <div className="fixed top-24 right-20 z-[1000] px-8 py-4 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 text-white font-bold shadow-2xl flex items-center gap-4">
                    <span className="material-symbols-outlined text-[var(--nb-neon-cyan)]">settings_suggest</span>
                    {notification}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 {/* Localization */}
                 <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-[var(--nb-neon-cyan)]">
                            <span className="material-symbols-outlined">public</span>
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase tracking-tight">Regionalismo</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Localização & Moeda</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Idioma</label>
                             <select 
                                value={preferences.language} 
                                onChange={(e) => handleChange('language', e.target.value)}
                                className="w-full h-14 nb-input rounded-2xl px-6 text-white appearance-none outline-none"
                             >
                                 <option value="pt-BR">Português (BR)</option>
                                 <option value="en-US">English (US)</option>
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Fuso Horário</label>
                             <select 
                                value={preferences.timezone} 
                                onChange={(e) => handleChange('timezone', e.target.value)}
                                className="w-full h-14 nb-input rounded-2xl px-6 text-white appearance-none outline-none"
                             >
                                 <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                                 <option value="UTC">UTC (Universal)</option>
                             </select>
                        </div>
                     </div>
                 </div>

                 {/* Appearance */}
                 <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-[var(--nb-neon-pink)]">
                            <span className="material-symbols-outlined">palette</span>
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase tracking-tight">Interface</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tema & Estilo</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                         <div className="space-y-4">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Tema Visual</label>
                             <div className="grid grid-cols-3 gap-3">
                                 {['dark', 'system', 'light'].map(t => (
                                     <button 
                                        key={t}
                                        onClick={() => handleChange('theme', t as any)}
                                        className={`py-3 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-widest ${preferences.theme === t ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                                     >
                                         {t === 'dark' ? 'Neon Noir' : t === 'system' ? 'Lux Onyx' : 'Modo Light'}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         <div className="space-y-4 pt-4">
                             <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                 <div>
                                     <p className="text-[11px] font-black text-white uppercase tracking-tight">Alto Contraste</p>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Melhorar Legibilidade</p>
                                 </div>
                                 <div 
                                    onClick={() => handleChange('highContrast', !preferences.highContrast)}
                                    className={`w-10 h-6 rounded-full relative cursor-pointer transition-all ${preferences.highContrast ? 'bg-[var(--nb-neon-pink)]' : 'bg-white/10'}`}
                                 >
                                     <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${preferences.highContrast ? 'left-5' : 'left-1'}`} />
                                 </div>
                             </div>

                             <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                 <div>
                                     <p className="text-[11px] font-black text-white uppercase tracking-tight">Sons do Sistema</p>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Feedback Sonoro UX</p>
                                 </div>
                                 <div 
                                    onClick={() => handleChange('systemSounds', !preferences.systemSounds)}
                                    className={`w-10 h-6 rounded-full relative cursor-pointer transition-all ${preferences.systemSounds ? 'bg-[var(--nb-neon-cyan)]' : 'bg-white/10'}`}
                                 >
                                     <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${preferences.systemSounds ? 'left-5' : 'left-1'}`} />
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
            </div>

            {/* Action Bar */}
            <div className="pt-10 border-t border-white/10 flex justify-between items-center">
                <button onClick={handleRestoreDefaults} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Voltar aos Padrões</button>
                <div className="flex gap-4">
                    <button onClick={handleCancel} disabled={!hasChanges} className="px-8 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all disabled:opacity-30">Descartar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!hasChanges}
                        className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-lg">check</span>
                        Salvar Preferências
                    </button>
                </div>
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

      <main className="pb-16 px-6 lg:px-10 w-full max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-300 dark:border-[#1e293b] mb-10 mt-2">
          <div>
            <h1 className="text-h1 text-slate-800 dark:text-slate-800 mb-2">Preferências do Sistema</h1>
            <p className="text-body text-text-secondary max-w-2xl">Personalize as configurações globais de uso, localização e interface do sistema.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRestoreDefaults} className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[#1e293b] text-slate-800 dark:text-slate-500 font-bold text-sm bg-white dark:bg-[#0f172a] hover:bg-white dark:hover:bg-[#252216] transition-colors">
              Restaurar Padrões
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <section className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-none border border-slate-300 dark:border-[#1e293b] overflow-hidden">
            {/* Localização e Idioma */}
            <div className="p-8 lg:p-10 border-b border-slate-300 dark:border-[#1e293b]">
              <div className="flex items-center gap-4 mb-6">
                <div className="size-12 rounded-xl bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">globe_asia</span>
                </div>
                <div>
                  <h3 className="text-h3 text-slate-800 dark:text-slate-800">Localização e Idioma</h3>
                  <p className="text-body-sm text-text-secondary">Defina como o sistema exibe datas, horas e valores.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-label text-text-secondary uppercase tracking-wider">Idioma do Sistema</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">translate</span>
                    <select value={preferences.language} onChange={(e) => handleChange('language', e.target.value)} className="w-full appearance-none rounded-xl bg-[#fcfbf8] dark:bg-[#1e293b] border border-slate-300 dark:border-[#1e293b] pl-11 pr-10 py-3.5 text-slate-800 dark:text-slate-800 focus:ring-2 focus:ring-slate-300 focus:border-primary outline-none transition-all font-medium text-base cursor-pointer">
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-label text-text-secondary uppercase tracking-wider">Fuso Horário</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">schedule</span>
                    <select value={preferences.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="w-full appearance-none rounded-xl bg-[#fcfbf8] dark:bg-[#1e293b] border border-slate-300 dark:border-[#1e293b] pl-11 pr-10 py-3.5 text-slate-800 dark:text-slate-800 focus:ring-2 focus:ring-slate-300 focus:border-primary outline-none transition-all font-medium text-base cursor-pointer">
                      <option value="America/Sao_Paulo">(GMT-03:00) Brasília</option>
                      <option value="America/New_York">(GMT-05:00) New York</option>
                      <option value="Europe/London">(GMT+00:00) London</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Moeda Principal</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">payments</span>
                    <select value={preferences.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full appearance-none rounded-xl bg-[#fcfbf8] dark:bg-[#1e293b] border border-slate-300 dark:border-[#1e293b] pl-11 pr-10 py-3.5 text-slate-800 dark:text-slate-800 focus:ring-2 focus:ring-slate-300 focus:border-primary outline-none transition-all font-medium text-base cursor-pointer">
                      <option value="BRL">Real Brasileiro (R$)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Formato de Data</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">calendar_today</span>
                    <select value={preferences.dateFormat} onChange={(e) => handleChange('dateFormat', e.target.value)} className="w-full appearance-none rounded-xl bg-[#fcfbf8] dark:bg-[#1e293b] border border-slate-300 dark:border-[#1e293b] pl-11 pr-10 py-3.5 text-slate-800 dark:text-slate-800 focus:ring-2 focus:ring-slate-300 focus:border-primary outline-none transition-all font-medium text-base cursor-pointer">
                      <option value="DD/MM/YYYY">DD/MM/AAAA (31/12/2023)</option>
                      <option value="MM/DD/YYYY">MM/DD/AAAA (12/31/2023)</option>
                      <option value="YYYY-MM-DD">AAAA-MM-DD (2023-12-31)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-3.5 text-text-secondary text-[20px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Aparência */}
            <div className="p-8 lg:p-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="size-12 rounded-xl bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">palette</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-800">Aparência</h3>
                  <p className="text-text-secondary text-sm">Personalize a experiência visual do painel.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Tema do Sistema</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <label key={theme} className="cursor-pointer group">
                        <input checked={preferences.theme === theme} onChange={() => handleChange('theme', theme)} className="hidden peer" name="theme" type="radio" value={theme} />
                        <div className="rounded-xl border border-slate-300 dark:border-[#1e293b] p-3 text-center transition-all peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-[#0f172a] text-white/5 hover:border-primary/50">
                          <div className={`h-10 w-full rounded mb-2 border border-slate-300 flex items-center justify-center ${theme === 'light' ? 'bg-slate-50' : theme === 'dark' ? 'bg-[#0f172a] border-[#1e293b]' : ' border-slate-300'}`}>
                            <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'} ${theme === 'system' ? 'mix-blend-difference' : ''}`}>
                              {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'settings_brightness'}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-800">{theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-300 dark:border-[#1e293b] bg-[#fcfbf8] dark:bg-[#1e293b]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-secondary">contrast</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-800">Alto Contraste</p>
                        <p className="text-xs text-text-secondary">Aumentar a legibilidade da interface</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input checked={preferences.highContrast} onChange={() => handleChange('highContrast', !preferences.highContrast)} className="sr-only peer" type="checkbox" />
                      <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer dark:bg-[#1e293b] peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-[#444] peer-checked:bg-[#0f172a] text-white"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-300 dark:border-[#1e293b] bg-[#fcfbf8] dark:bg-[#1e293b]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-secondary">motion_photos_off</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-800">Reduzir Movimento</p>
                        <p className="text-xs text-text-secondary">Minimizar animações da interface</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input checked={preferences.reduceMotion} onChange={() => handleChange('reduceMotion', !preferences.reduceMotion)} className="sr-only peer" type="checkbox" />
                      <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer dark:bg-[#1e293b] peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-[#444] peer-checked:bg-[#0f172a] text-white"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Notificações */}
            <div className="p-8 lg:p-10 border-t border-slate-300 dark:border-[#1e293b]">
              <div className="flex items-center gap-4 mb-6">
                <div className="size-12 rounded-xl bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">notifications_active</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-800">Notificações</h3>
                  <p className="text-text-secondary text-sm">Gerencie como você recebe alertas do sistema.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-300 dark:border-[#1e293b] hover:bg-white dark:hover:bg-[#252216] cursor-pointer transition-colors">
                  <input checked={preferences.notifyNewAppointments} onChange={() => handleChange('notifyNewAppointments', !preferences.notifyNewAppointments)} className="rounded text-primary focus:ring-primary border-slate-300 dark:border-[#444] mt-1" type="checkbox" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-800">Novos Agendamentos</p>
                    <p className="text-xs text-text-secondary mt-0.5">Alertas quando um cliente agenda horário.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-300 dark:border-[#1e293b] hover:bg-white dark:hover:bg-[#252216] cursor-pointer transition-colors">
                  <input checked={preferences.notifyStock} onChange={() => handleChange('notifyStock', !preferences.notifyStock)} className="rounded text-primary focus:ring-primary border-slate-300 dark:border-[#444] mt-1" type="checkbox" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-800">Lembretes de Estoque</p>
                    <p className="text-xs text-text-secondary mt-0.5">Aviso de produtos com estoque baixo.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-300 dark:border-[#1e293b] hover:bg-white dark:hover:bg-[#252216] cursor-pointer transition-colors">
                  <input checked={preferences.notifyDailyClose} onChange={() => handleChange('notifyDailyClose', !preferences.notifyDailyClose)} className="rounded text-primary focus:ring-primary border-slate-300 dark:border-[#444] mt-1" type="checkbox" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-800">Fechamento Diário</p>
                    <p className="text-xs text-text-secondary mt-0.5">Resumo financeiro ao final do dia.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white dark:bg-[#252216]/50 px-8 py-6 border-t border-slate-300 dark:border-[#1e293b] flex justify-end gap-4">
              <button onClick={handleCancel} disabled={!hasChanges} className="px-8 py-3.5 rounded-xl border border-slate-300 dark:border-[#1e293b] text-slate-800 dark:text-slate-800 font-bold hover:bg-white dark:hover:bg-[#0f172a] transition-all text-base bg-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!hasChanges} className="px-10 py-3.5 rounded-xl bg-[#0f172a] text-white hover:bg-cyan-600 text-slate-800 font-bold shadow-cyan-500/20 hover:shadow-cyan-500/20-hover transition-all flex items-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined">save</span>
                Salvar Preferências
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SystemPreferences;