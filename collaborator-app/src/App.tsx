import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './screens/Auth';
import SettingsDashboard from './screens/SettingsDashboard';
import Integrations from './screens/Integrations';
import ServicesCatalog from './screens/ServicesCatalog';
import TeamManagement from './screens/TeamManagement';
import SalonData from './screens/SalonData';
import ProductsCatalog from './screens/ProductsCatalog';
import DashboardOverview from './screens/DashboardOverview';
import SystemPreferences from './screens/SystemPreferences';
import NotificationSettings from './screens/NotificationSettings';
import CashFlow from './screens/CashFlow';
import ClientList from './screens/ClientList';
import CommissionsDetail from './screens/CommissionsDetail';
import SalonComissoesDashboard from './screens/SalonComissoesDashboard';
import DetailedAgenda from './screens/DetailedAgenda';
import UsersPermissions from './screens/UsersPermissions';
import Onboarding from './screens/Onboarding';
import CashPinSetup from './components/CashPinSetup';
import ForcePasswordChange from './components/ForcePasswordChange';
import CashReports from './components/CashReports';

// Futuristic Space Cyber Neon Mobile Modules
import { CosmicBackground } from './components/CosmicBackground';
import { FuturisticBottomDock } from './components/FuturisticBottomDock';
import { CollaboratorMobileHome } from './screens/CollaboratorMobileHome';
import { CollaboratorCommissionsHUD } from './screens/CollaboratorCommissionsHUD';
import { CollaboratorClientsRadar } from './screens/CollaboratorClientsRadar';
import { CollaboratorProfile } from './screens/CollaboratorProfile';

import { useCurrentTime } from './hooks/useCurrentTime';
import { useSalonConfig } from './hooks/useSalonConfig';
import { useCurrentUserRef, ModuleKey } from './hooks/useCurrentUserRef';
import { useAutoLogout } from './hooks/useAutoLogout';

export const App = () => {
  const [session, setSession] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('overview');
  const [mobileTab, setMobileTab] = useState<string>('agenda');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  const { formattedTime, formattedDate } = useCurrentTime();
  const { config, loading: configLoading } = useSalonConfig();
  const { profile, role, professionalId, hasAccess, loading: permissionsLoading, mustChangePassword } = useCurrentUserRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        target.blur();
      }
    };
    document.addEventListener('wheel', handleWheel);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useAutoLogout(handleLogout, 15, !!session);

  const renderWebScreen = () => {
    if (permissionsLoading || configLoading) return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="size-16 rounded-full border-4 border-[#d9a821]/20 border-t-[#06b6d4] animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando...</p>
      </div>
    );

    const Unauthorized = () => (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
        <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-red-500">lock</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 max-w-md">Você não tem permissão para acessar esta área. Contate o administrador se acreditar que isso é um erro.</p>
        <button onClick={() => setCurrentScreen('overview')} className="mt-8 px-8 py-3 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-violet-600 transition-all shadow-lg shadow-cyan-500/20">
          Voltar ao Dashboard
        </button>
      </div>
    );

    switch (currentScreen) {
      case 'settings': return hasAccess('settings_view') ? <SettingsDashboard onNavigate={setCurrentScreen} /> : <Unauthorized />;
      case 'integrations': return hasAccess('settings_view') ? <Integrations /> : <Unauthorized />;
      case 'services': return hasAccess('services_view') ? <ServicesCatalog /> : <Unauthorized />;
      case 'team': return hasAccess('team_navbar_view') ? <TeamManagement currentProfileId={professionalId ?? undefined} hasAccess={hasAccess} /> : <Unauthorized />;
      case 'salondata': return hasAccess('settings_view') ? <SalonData /> : <Unauthorized />;
      case 'products': return hasAccess('products_view') ? <ProductsCatalog /> : <Unauthorized />;
      case 'overview': return hasAccess('dashboard_view') ? <DashboardOverview onNavigate={setCurrentScreen} /> : <Unauthorized />;
      case 'preferences': return hasAccess('settings_view') ? <SystemPreferences /> : <Unauthorized />;
      case 'notifications': return hasAccess('settings_view') ? <NotificationSettings /> : <Unauthorized />;
      case 'cashflow': return hasAccess('cashflow_view') ? <CashFlow /> : <Unauthorized />;
      case 'reports': return hasAccess('settings_view') ? <CashReports /> : <Unauthorized />;
      case 'clients': return hasAccess('clients_view') ? <ClientList /> : <Unauthorized />;
      case 'commissions': return hasAccess('commissions_view') ? <SalonComissoesDashboard /> : <Unauthorized />;
      case 'agenda': return hasAccess('agenda_view') ? <DetailedAgenda /> : <Unauthorized />;
      case 'users': return hasAccess('settings_view') ? <UsersPermissions /> : <Unauthorized />;
      default: return <DashboardOverview />;
    }
  };

  const allMenuItems = [
    { id: 'overview', icon: 'dashboard', label: 'Dashboard', module: 'dashboard_view' as ModuleKey },
    { id: 'cashflow', icon: 'point_of_sale', label: 'Caixa', module: 'cashflow_view' as ModuleKey },
    { id: 'reports', icon: 'analytics', label: 'Relatórios', module: 'settings_view' as ModuleKey },
    { id: 'agenda', icon: 'calendar_month', label: 'Agenda', module: 'agenda_view' as ModuleKey },
    { id: 'clients', icon: 'group', label: 'Clientes', module: 'clients_view' as ModuleKey },
    { id: 'team', icon: 'badge', label: 'Colaboradores', module: 'team_navbar_view' as ModuleKey },
    { id: 'services', icon: 'content_cut', label: 'Serviços', module: 'services_view' as ModuleKey },
    { id: 'commissions', icon: 'attach_money', label: 'Comissões', module: 'commissions_view' as ModuleKey },
    { id: 'products', icon: 'inventory_2', label: 'Produtos', module: 'products_view' as ModuleKey },
    { id: 'settings', icon: 'settings', label: 'Configurações', module: 'settings_view' as ModuleKey },
  ];

  const menuItems = allMenuItems.filter(item => hasAccess(item.module));

  if (!session) {
    return <Auth onAuthSuccess={() => { }} />;
  }

  if (mustChangePassword && !permissionsLoading) {
    return <ForcePasswordChange onComplete={() => window.location.reload()} />;
  }

  if (session && profile && !profile.cash_pin && hasAccess('cashflow_view') && !permissionsLoading) {
    return <CashPinSetup userId={session.user.id} onComplete={() => window.location.reload()} />;
  }

  // MOBILE / APK MODE: Futuristic Space Cyber Neon Experience ("Top das Galáxias")
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#050814] font-display text-slate-100 selection:bg-[#00f0ff] selection:text-black overflow-x-hidden">
        {/* Cosmic Ambient Nebula Animation */}
        <CosmicBackground />

        {/* Screen Content Render */}
        <div className="relative z-10">
          {mobileTab === 'agenda' && <CollaboratorMobileHome />}
          {mobileTab === 'commissions' && <CollaboratorCommissionsHUD />}
          {mobileTab === 'clients' && <CollaboratorClientsRadar />}
          {mobileTab === 'profile' && <CollaboratorProfile />}
        </div>

        {/* Floating Glass Dock Navigation */}
        <FuturisticBottomDock
          currentTab={mobileTab}
          onSelectTab={setMobileTab}
        />
      </div>
    );
  }

  // DESKTOP WEB MODE: Classic Salon Suite Pro Web Layout
  return (
    <div className="flex flex-col h-screen w-full bg-[#0f172a] font-display overflow-hidden text-[#f1f5f9]">
      {/* 1. Global Header */}
      <header className="flex-none bg-[#0f172a] border-b border-white/5 z-50 px-6 lg:px-10 h-28 flex items-center justify-between relative transition-all">
        <div className="flex items-center gap-8">
          <div className="h-20 w-20 rounded-2xl p-0.5 shadow-sm border border-cyan-100 flex items-center justify-center bg-white/5 overflow-hidden">
            <div className="h-full w-full rounded-2xl bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: config?.logo_url ? `url("${config.logo_url}")` : undefined }}>
              {!config?.logo_url && <span className="material-symbols-outlined text-white/20 text-4xl">store</span>}
            </div>
          </div>
          <div className="flex flex-col justify-center h-full text-white">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-black leading-tight tracking-tight">{config?.name || ''}</h1>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-slate-700"></span>
                Colab.: {profile?.full_name?.split(' ').slice(0, 2).join(' ') || '...'}
              </span>
            </div>
            <span className="text-xs font-bold text-[#b87333] tracking-[0.2em] uppercase mt-1">{config?.phone || ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="hidden xl:flex flex-col items-end border-r border-[#2c3e50]/50 pr-8">
            <div className="flex items-center gap-3 text-white text-2xl leading-none font-black">
              <span className="material-symbols-outlined text-[#b87333] text-[24px]">schedule</span>
              {formattedTime}
            </div>
            <div className="text-sm text-slate-400 mt-1.5 flex items-center gap-1 font-bold italic tracking-wide">
              <span className="material-symbols-outlined text-[16px]">event</span>
              {formattedDate}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="group relative">
              <div className="h-12 w-12 rounded-2xl border-2 border-transparent hover:border-[#b87333] cursor-pointer transition-all p-0.5 bg-[#1e293b] overflow-hidden">
                {profile?.avatar_url ? (
                  <div className="h-full w-full rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url("${profile.avatar_url}")` }}></div>
                ) : (
                  <div className="h-full w-full rounded-2xl flex items-center justify-center bg-[#1e293b] text-white font-bold text-lg uppercase">
                    {profile?.full_name?.charAt(0) || <span className="material-symbols-outlined">person</span>}
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2">
                  <div className="px-4 py-3 border-b border-slate-50 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sessão Ativa</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{session?.user?.email}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold">
                    <span className="material-symbols-outlined">logout</span>
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Floating Navbar */}
      {menuItems.length > 0 ? (
        <div 
          className="flex-none z-40 flex justify-center py-4 px-2 lg:px-8 bg-transparent pointer-events-none sticky top-0"
          style={{ 
            width: 'calc(100% - var(--scrollbar-width, 0px))',
            marginRight: 'var(--scrollbar-width, 0px)' 
          }}
        >
          <div className="pointer-events-auto relative w-full max-w-[1600px]">
            <nav className="bg-[#1f2937]/90 backdrop-blur-xl border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide w-full shadow-2xl">
                {menuItems.map((item) => {
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentScreen(item.id)}
                      className="group relative flex flex-col items-center justify-center rounded-xl transition-all duration-400 cursor-pointer flex-1 px-4 py-2 min-w-[76px]"
                    >
                      {item.id === 'products' && (
                        <span className="absolute -top-1 -right-2 z-20 bg-amber-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm shadow-xl ring-1 ring-white/20 whitespace-nowrap animate-pulse uppercase tracking-tighter">
                          Em Breve
                        </span>
                      )}

                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-[#2c3e50] border border-[#b87333]/20" />
                      )}

                      <div className="relative z-10 flex items-center justify-center w-[38px] h-[38px]">
                        {isActive && (
                          <div className="absolute inset-0 rounded-full bg-[#b45309]/10 shadow-[0_0_8px_rgba(180,83,9,0.3)] border border-[#b45309]/30" />
                        )}
                        <span
                          className={`material-symbols-outlined relative z-10 transition-all duration-300 text-[28px] ${
                            isActive ? 'text-[#b45309]' : 'text-[#9ca3af]'
                          }`}
                        >
                          {item.icon}
                        </span>
                      </div>

                      <span
                        className={`relative z-10 transition-colors duration-300 text-[12px] font-bold tracking-wider mt-0.5 ${
                          isActive ? 'text-white' : 'text-[#4b5563]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
          </div>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative ref-body">
        <div className="flex-1 w-full h-full overflow-y-auto relative" id="main-scroll-container">
          <div className="h-full w-full max-w-[1920px] mx-auto bg-transparent">
            {renderWebScreen()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;