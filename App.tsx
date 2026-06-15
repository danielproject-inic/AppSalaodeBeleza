
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

import { useCurrentTime } from './hooks/useCurrentTime';
import { useSalonConfig } from './hooks/useSalonConfig';
import { useCurrentUserRef, ModuleKey } from './hooks/useCurrentUserRef';
import { useAutoLogout } from './hooks/useAutoLogout';

// Supabase state is now handled internally by child components via hooks
const App = () => {
  const [session, setSession] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('overview');
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

    // Prevent scrolling on number inputs globally
    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        target.blur();
      }
    };
    document.addEventListener('wheel', handleWheel);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Medir largura física real do container de scroll para alinhamento perfeito do Nav Bar
  useEffect(() => {
    if (!session) return;

    const updateScrollbarWidth = () => {
      const scrollEl = document.getElementById('main-scroll-container');
      if (scrollEl) {
        const scrollbarWidth = scrollEl.offsetWidth - scrollEl.clientWidth;
        document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
      }
    };

    updateScrollbarWidth();
    const timer = setTimeout(updateScrollbarWidth, 100);

    const scrollEl = document.getElementById('main-scroll-container');
    let observer: ResizeObserver | null = null;
    if (scrollEl) {
      observer = new ResizeObserver(() => {
        updateScrollbarWidth();
      });
      observer.observe(scrollEl);
    }

    window.addEventListener('resize', updateScrollbarWidth);

    return () => {
      clearTimeout(timer);
      if (observer && scrollEl) {
        observer.unobserve(scrollEl);
      }
      window.removeEventListener('resize', updateScrollbarWidth);
    };
  }, [session, currentScreen]);

  useEffect(() => {
    // Logic to clear "ghost" sessions if the database was wiped
    if (!permissionsLoading && session && !profile) {
      handleLogout();
    }
  }, [permissionsLoading, session, profile]);

  useEffect(() => {
    // Logic to redirect if user loses permission to current screen?
    // For now, renderScreen handles conditional rendering, but maybe we force switch to overview?
    // We'll let renderScreen show Unauthorized component for better UX.
  }, [currentScreen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Logout automático por inatividade ou suspensão do SO (15 minutos)
  useAutoLogout(handleLogout, 15, !!session);

  const renderScreen = () => {
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
      case 'clients': return hasAccess('clients_view') ? <ClientList /> : <Unauthorized />;
      case 'commissions': return hasAccess('commissions_view') ? <SalonComissoesDashboard /> : <Unauthorized />;
      case 'agenda': return hasAccess('agenda_view') ? <DetailedAgenda /> : <Unauthorized />;
      case 'users': return hasAccess('settings_view') ? <UsersPermissions /> : <Unauthorized />; // Users mgmt usually part of settings/admin
      default: return <DashboardOverview />;
    }
  };

  const allMenuItems = [
    { id: 'overview', icon: 'dashboard', label: 'Dashboard', module: 'dashboard_view' as ModuleKey },
    { id: 'cashflow', icon: 'point_of_sale', label: 'Caixa', module: 'cashflow_view' as ModuleKey },
    { id: 'agenda', icon: 'calendar_month', label: 'Agenda', module: 'agenda_view' as ModuleKey },
    { id: 'clients', icon: 'group', label: 'Clientes', module: 'clients_view' as ModuleKey },
    { id: 'team', icon: 'badge', label: 'Colaboradores', module: 'team_navbar_view' as ModuleKey },
    { id: 'services', icon: 'content_cut', label: 'Serviços', module: 'services_view' as ModuleKey },
    { id: 'commissions', icon: 'attach_money', label: 'Comissões', module: 'commissions_view' as ModuleKey },
    { id: 'products', icon: 'inventory_2', label: 'Produtos', module: 'products_view' as ModuleKey },
    { id: 'settings', icon: 'settings', label: 'Configurações', module: 'settings_view' as ModuleKey },
  ];

  const menuItems = allMenuItems.filter(item => hasAccess(item.module));

  // Redirect to first allowed screen if current is unauthorized
  useEffect(() => {
    if (!permissionsLoading && !hasAccess((allMenuItems.find(i => i.id === currentScreen)?.module as ModuleKey) || 'dashboard_view')) {
      if (menuItems.length > 0) {
        setCurrentScreen(menuItems[0].id);
      }
    }
  }, [permissionsLoading, currentScreen, hasAccess, allMenuItems, menuItems]); // Added hasAccess, allMenuItems, menuItems to dependencies

  if (!session) {
    return <Auth onAuthSuccess={() => { }} />;
  }

  // If session exists but salon not configured, show onboarding
  // Allow the first logged in user to complete onboarding if the system is fresh
  if (!config?.name && !permissionsLoading && !configLoading) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // If user has cash access but no PIN, force PIN setup
  if (session && profile && !profile.cash_pin && hasAccess('cashflow_view') && !permissionsLoading) {
    return <CashPinSetup userId={session.user.id} onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0f172a] font-display overflow-hidden text-[#f1f5f9]">

      {/* 1. Global Header - Exact Reference 1 Tone */}
      <header className="flex-none bg-[#0f172a] border-b border-white/5 z-50 px-6 lg:px-10 h-28 flex items-center justify-between relative transition-all">
        <div className="flex items-center gap-8">
          <div className="h-20 w-20 rounded-2xl p-0.5 shadow-sm border border-cyan-100 flex items-center justify-center bg-white/5 overflow-hidden">
            <div className="h-full w-full rounded-2xl bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: config?.logo_url ? `url("${config.logo_url}")` : undefined }}>
              {!config?.logo_url && <span className="material-symbols-outlined text-white/20 text-4xl">store</span>}
            </div>
          </div>
          <div className="flex flex-col justify-center h-full text-white">
            <h1 className="text-2xl font-black leading-tight tracking-tight">{config?.name || ''}</h1>
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
              <div className="h-12 w-12 rounded-2xl border-2 border-transparent hover:border-[#b87333] cursor-pointer transition-all p-0.5 bg-white/5 overflow-hidden">
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

      {/* 2. Optimized Floating Navbar — Reference 1 Parity */}
      <div 
        className="flex-none z-40 flex justify-center py-4 px-2 lg:px-8 bg-transparent pointer-events-none sticky top-0"
        style={{ 
          width: 'calc(100% - var(--scrollbar-width, 0px))',
          marginRight: 'var(--scrollbar-width, 0px)' 
        }}
      >
        <div className="pointer-events-auto relative w-full max-w-[1180px]">
          <nav className="bg-[#1f2937]/90 backdrop-blur-xl border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide w-full shadow-2xl">
              {menuItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentScreen(item.id)}
                    className="group relative flex flex-col items-center justify-center rounded-xl transition-all duration-400 cursor-pointer flex-1"
                    style={{
                      padding: '8px 16px',
                      minWidth: '76px',
                    }}
                  >
                    {/* Badge for coming soon items */}
                    {item.id === 'products' && (
                      <span className="absolute -top-1 -right-2 z-20 bg-amber-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm shadow-xl ring-1 ring-white/20 whitespace-nowrap animate-pulse uppercase tracking-tighter">
                        Em Breve
                      </span>
                    )}

                    {/* Active background glow */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-[#2c3e50] border border-[#b87333]/20" />
                    )}

                    {/* Icon with Subtle Glow */}
                    <div className="relative z-10 flex items-center justify-center" style={{ width: '38px', height: '38px' }}>
                      {isActive && (
                        <div className="absolute inset-0 rounded-full bg-[#b45309]/10 shadow-[0_0_8px_rgba(180,83,9,0.3)] border border-[#b45309]/30" />
                      )}
                      <span
                        className="material-symbols-outlined relative z-10 transition-all duration-300"
                        style={{
                          fontSize: '28px',
                          color: isActive ? '#b45309' : '#9ca3af'
                        }}
                      >
                        {item.icon}
                      </span>
                    </div>

                    {/* Label */}
                    <span
                      className="relative z-10 transition-colors duration-300"
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        marginTop: '2px',
                        color: isActive ? '#ffffff' : '#4b5563'
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
        </div>
      </div>

      {/* Main Content Area - Full Width with Max Constraint */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative ref-body">
        <div className="flex-1 w-full h-full overflow-y-auto relative" id="main-scroll-container">
          <div className="h-full w-full max-w-[1920px] mx-auto bg-transparent">
            {renderScreen()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;