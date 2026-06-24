import React, { useState } from 'react';
import '../NeonBento.css';

// Import real components
import SalonData from './SalonData';
import UsersPermissions from './UsersPermissions';
import NotificationSettings from './NotificationSettings';
import Integrations from './Integrations';
import SystemPreferences from './SystemPreferences';

interface SettingsDashboardProps {
  onNavigate: (screen: string) => void;
}

type BentoKey = 'dados' | 'equipe' | 'notif' | 'integrations' | 'pref' | null;

const SettingsDashboard: React.FC<SettingsDashboardProps> = ({ onNavigate }) => {
  const [selectedTile, setSelectedTile] = useState<BentoKey>(null);

  const VIEWS = {
    dados: {
      title: "Dados do Salão",
      desc: "Gerencie a identidade pública e o núcleo operacional do seu estabelecimento.",
      icon: "storefront",
      color: "var(--nb-neon-pink)",
      component: <SalonData variant="modern" />
    },
    equipe: {
      title: "Minha Equipe",
      desc: "Gestão de profissionais, permissões e níveis de acesso.",
      icon: "group",
      color: "var(--nb-neon-cyan)",
      component: <UsersPermissions variant="modern" />
    },
    notif: {
      title: "Alertas",
      desc: "Configuração de notificações de sistema e regras de automatização.",
      icon: "notifications_active",
      color: "var(--nb-neon-amber)",
      component: <NotificationSettings variant="modern" />
    },
    integrations: {
      title: "Integrações & Financeiro",
      desc: "Conecte sua agenda ao Google, Stripe e WhatsApp corporativo.",
      icon: "hub",
      color: "var(--nb-neon-cyan)",
      component: <Integrations variant="modern" />
    },
    pref: {
      title: "Preferências",
      desc: "Tema, idioma e padrões de visualização da interface.",
      icon: "tune",
      color: "var(--nb-neon-violet)",
      component: <SystemPreferences variant="modern" />
    }
  };

  const closeDetail = () => setSelectedTile(null);

  return (
    <div className="neon-bento-hub h-full w-full overflow-y-auto custom-scrollbar flex flex-col relative font-sans">
      
      {/* Header synchronized with Prototype */}
      <header className="flex-none px-12 pt-12 pb-6">
        <h1 className="font-display text-3xl font-black tracking-tighter text-white">
          CONFIG<span className="text-[var(--nb-neon-cyan)] drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">URAÇÕES</span>
        </h1>
        <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mt-1 opacity-80">
          GERENCIAMENTO MESTRE DO SISTEMA
        </p>
      </header>

      {/* Bento Grid layout matching Prototype image - Fixed row height to prevent squashing */}
      <div 
        className="flex-1 px-12 pb-12 grid grid-cols-4 gap-5 grid-auto-rows-180"
      >
        
        {/* DADOS */}
        <button 
          onClick={() => setSelectedTile('dados')}
          className="bento-card col-span-2 row-span-2 p-6 card-glaze-pink flex flex-col text-left group"
        >
          <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-[var(--nb-neon-pink)] group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-2xl">storefront</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-black mb-2 text-white uppercase tracking-tight">Dados do Salão</h2>
            <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-[320px]">
              Gerencie a identidade pública e o núcleo operacional do seu estabelecimento.
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-white/5 text-slate-500 border border-white/5">VERIFICADO</span>
            <span className="material-symbols-outlined opacity-40 text-xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">north_east</span>
          </div>
        </button>

        {/* EQUIPE */}
        <button 
          onClick={() => setSelectedTile('equipe')}
          className="bento-card col-span-2 row-span-1 p-6 card-glaze-cyan flex flex-col text-left group justify-center"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--nb-neon-cyan)] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">group</span>
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-black text-white uppercase tracking-tight">Minha Equipe</h2>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Gestão de profissionais, permissões e níveis de acesso.</p>
            </div>
          </div>
        </button>

        {/* ALERTAS */}
        <button 
          onClick={() => setSelectedTile('notif')}
          className="bento-card col-span-1 row-span-1 p-5 card-glaze-amber flex flex-col text-left group justify-center"
        >
          <div className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-[var(--nb-neon-amber)] group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-lg">notifications_active</span>
          </div>
          <h2 className="font-display text-base font-black text-white uppercase tracking-tight">Alertas</h2>
          <p className="text-[9px] font-bold text-slate-500 mt-1 leading-snug">Configuração de notificações de sistema e regras.</p>
        </button>

        {/* PREFERENCES */}
        <button 
          onClick={() => setSelectedTile('pref')}
          className="bento-card col-span-1 row-span-2 p-6 card-glaze-violet flex flex-col text-left group"
        >
          <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-[var(--nb-neon-violet)] group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">tune</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-black text-white uppercase tracking-tight leading-tight">Preferências</h2>
            <p className="text-[10px] font-bold text-slate-500 mt-2 leading-relaxed">Tema, idioma e padrões de visualização da interface.</p>
          </div>
          <div className="mt-auto">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-white/5 text-slate-500 border border-white/5">AJUSTADO</span>
          </div>
        </button>

        {/* INTEGRATIONS & FINANCEIRO */}
        <button 
          onClick={() => setSelectedTile('integrations')}
          className="bento-card col-span-3 row-span-1 p-6 card-glaze-cyan flex flex-col text-left group justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--nb-neon-cyan)] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-xl">hub</span>
              </div>
              <div>
                <h2 className="font-display text-xl font-black mb-1 text-white uppercase tracking-tight">Integrações & Financeiro</h2>
                <p className="text-[11px] font-bold text-slate-500">Conecte sua agenda ao Google, Stripe e WhatsApp corporativo.</p>
              </div>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <div className="flex gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">STRIPE</span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">CALENDAR</span>
            </div>
            <span className="material-symbols-outlined opacity-40 text-xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">north_east</span>
          </div>
        </button>

      </div>

      {/* DETAIL MODAL remain functional */}
      {selectedTile && (
        <div className="glass-detail-overlay fixed inset-0 z-[100] flex items-center justify-center p-10 animate-in fade-in duration-300">
          <div className="glass-detail-card w-full max-w-[1300px] h-full max-h-[85vh] rounded-[48px] overflow-hidden grid grid-cols-[350px_1fr] relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            
            {/* Close Button */}
            <button 
              onClick={closeDetail}
              className="absolute top-10 right-10 size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black hover:rotate-90 transition-all z-10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Modal Sidebar */}
            <div className="bg-white/5 p-16 flex flex-col gap-8 border-r border-white/5">
              <div 
                className="size-20 rounded-3xl flex items-center justify-center border"
                style={{ 
                  color: VIEWS[selectedTile].color,
                  borderColor: `${VIEWS[selectedTile].color}44`
                }}
              >
                <span className="material-symbols-outlined text-4xl">{VIEWS[selectedTile].icon}</span>
              </div>
              <div>
                <h1 className="font-display text-4xl font-bold text-white leading-[1.1] mb-4">
                  {VIEWS[selectedTile].title}
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {VIEWS[selectedTile].desc}
                </p>
              </div>

            </div>

            {/* Modal Content */}
            <div className="p-20 overflow-y-auto custom-scrollbar bg-black/40">
              {VIEWS[selectedTile].component}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsDashboard;
