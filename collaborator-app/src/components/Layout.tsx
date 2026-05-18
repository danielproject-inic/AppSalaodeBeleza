import React from 'react';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { useSalonConfig } from '../hooks/useSalonConfig';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';

interface LayoutProps {
    children: React.ReactNode;
    currentScreen: string;
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentScreen, onNavigate, onLogout }) => {
    const { formattedTime, formattedDate } = useCurrentTime();
    const { config } = useSalonConfig();
    const { profile } = useCurrentUserRef();

    const menuItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'Início' },
        { id: 'agenda', icon: 'calendar_month', label: 'Minha Agenda' },
        { id: 'commissions', icon: 'payments', label: 'Meus Ganhos' },
    ];

    return (
        <div className="flex flex-col h-screen w-full bg-[#e8e2d4] font-display overflow-hidden text-[#0f172a]">
            {/* 1. Global Header */}
            <header className="flex-none bg-white/95 backdrop-blur-xl border-b border-slate-200 z-50 px-6 lg:px-10 h-20 flex items-center justify-between shadow-sm relative transition-all">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full p-0.5 shadow-sm border border-cyan-100">
                        <div 
                            className="h-full w-full rounded-full bg-cover bg-center" 
                            style={{ backgroundImage: `url("${config?.logo_url || 'https://via.placeholder.com/150'}")` }}
                        ></div>
                    </div>
                    <div className="flex flex-col justify-center h-full">
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">{config?.name || 'Studio Angela Barbosa'}</h1>
                        <span className="text-[11px] font-bold text-cyan-600 tracking-widest uppercase mt-0.5">{config?.phone || '(61) 99999-9999'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden xl:flex flex-col items-end border-r border-slate-200 pr-6">
                        <div className="flex items-center gap-2 text-slate-800 text-base leading-none font-bold">
                            <span className="material-symbols-outlined text-cyan-500 text-[20px]">schedule</span>
                            {formattedTime}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-medium italic">
                            <span className="material-symbols-outlined text-[14px]">event</span>
                            {formattedDate}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:text-cyan-600 hover:bg-slate-50 transition-all">
                            <span className="material-symbols-outlined">search</span>
                        </button>
                        <button className="relative h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:text-cyan-600 hover:bg-slate-50 transition-all">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
                        </button>
                        
                        <div className="group relative">
                            <div className="h-10 w-10 rounded-full border-2 border-transparent hover:border-cyan-500 cursor-pointer transition-all p-0.5">
                                <div 
                                    className="h-full w-full rounded-full bg-cover bg-center" 
                                    style={{ backgroundImage: `url("${profile?.avatar_url || 'https://via.placeholder.com/150'}")` }}
                                ></div>
                            </div>

                            {/* Profile Dropdown */}
                            <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <div className="w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2">
                                    <div className="px-4 py-3 border-b border-slate-50 mb-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{profile?.full_name}</p>
                                    </div>
                                    <button 
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold"
                                    >
                                        <span className="material-symbols-outlined">logout</span>
                                        Sair
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. Floating Navbar */}
            <div className="flex-none z-40 flex justify-center py-4 bg-transparent pointer-events-none sticky top-0">
                <div className="pointer-events-auto relative mx-4">
                    <div className="relative rounded-full p-[1px] bg-slate-200 shadow-xl">
                        <nav className="bg-white/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-full shadow-inner">
                            {menuItems.map((item) => {
                                const isActive = currentScreen === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id)}
                                        className="group relative flex flex-col items-center justify-center rounded-2xl transition-all duration-400 cursor-pointer py-1.5 px-6 min-w-[70px]"
                                    >
                                        {isActive && (
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-cyan-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                                        )}
                                        
                                        <span
                                            className="material-symbols-outlined relative z-10 transition-all duration-300 mb-0.5"
                                            style={{
                                                fontSize: '24px',
                                                color: isActive ? '#06b6d4' : '#64748b'
                                            }}
                                        >
                                            {item.icon}
                                        </span>

                                        <span
                                            className="relative z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300"
                                            style={{
                                                color: isActive ? '#0f172a' : '#94a3b8'
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
            </div>

            {/* 3. Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-[#e8e2d4] pt-2">
                {/* Global Gradient Flare */}
                <div 
                    className="absolute top-0 left-0 w-full h-[400px] z-0 pointer-events-none opacity-50" 
                    style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.04) 0%, rgba(232,226,212,0) 100%)' }}
                ></div>
                
                <div className="h-full w-full overflow-y-auto custom-scrollbar relative z-10 p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;

