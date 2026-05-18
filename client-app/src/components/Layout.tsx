import React, { useState } from 'react';
import { Calendar, ShoppingBag, User, LogOut, LayoutDashboard, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSalon } from '../contexts/SalonContext';
import EditProfileDrawer from './EditProfileDrawer';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    user: any;
}


const NavIconMobile = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-wide font-medium">{label}</span>
        </button>
    );
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, user }) => {
    const { salonName } = useSalon();
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
        { id: 'services', icon: Calendar, label: 'Agendar' },
        { id: 'store', icon: ShoppingBag, label: 'Loja' },
        { id: 'profile', icon: User, label: 'Perfil' },
    ];

    return (
        <div className="min-h-screen text-slate-900">
            {/* Top Header */}
            <header className="fixed top-0 left-0 w-full h-20 bg-[#fdfaf6]/70 backdrop-blur-3xl border-b border-stone-200 px-6 flex items-center justify-between z-[60] shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-magenta-500 tracking-tighter uppercase leading-none drop-shadow-sm">{salonName}</h1>
                    <span className="text-[9px] font-bold text-stone-600 uppercase tracking-widest mt-1">Beauty Salon • Premium</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end">
                        <p className="text-xs font-bold text-stone-900 leading-none">{user.user_metadata.full_name?.split(' ')[0] || 'Cliente'}</p>
                        <p className="text-[10px] text-magenta-600 uppercase font-black tracking-widest mt-1 drop-shadow-sm">Nível Elite</p>
                    </div>
                    
                    <button 
                        onClick={() => setIsEditDrawerOpen(true)}
                        className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-all"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <img
                        src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 p-0.5 object-cover shrink-0 cursor-pointer hover:border-amber-600 transition-colors"
                        onClick={() => setActiveTab('profile')}
                    />
                    
                    <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <EditProfileDrawer 
                isOpen={isEditDrawerOpen} 
                onClose={() => setIsEditDrawerOpen(false)} 
                user={user} 
            />

            {/* Desktop Horizontal Navbar */}
            <div className="hidden md:flex fixed top-20 left-0 w-full justify-center py-4 bg-transparent pointer-events-none z-50">
                <div className="pointer-events-auto relative">
                    <div className="relative rounded-full p-[1px] bg-stone-200/50 border border-stone-200 backdrop-blur-3xl shadow-lg">
                        <nav className="bg-[#fdfaf6]/80 rounded-full px-6 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide shadow-inner">
                            {menuItems.map((item) => {
                                const isActive = activeTab === item.id;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`group relative flex items-center gap-3 px-6 py-2 rounded-full transition-all duration-500 ${isActive ? 'bg-stone-800 text-amber-50 shadow-[0_4px_15px_rgba(41,37,36,0.2)]' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'}`}
                                    >
                                        <Icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        <span className={`text-xs font-black uppercase tracking-widest transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
                                            {item.label}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabDesktop"
                                                className="absolute inset-0 rounded-full border border-white/20"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-[#fdfaf6]/80 backdrop-blur-3xl border-t border-stone-200 flex items-center justify-around px-2 z-50 pb-safe shadow-[0_-4px_20px_rgba(168,162,158,0.1)]">
                {menuItems.map((item) => (
                    <NavIconMobile
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={activeTab === item.id}
                        onClick={() => setActiveTab(item.id)}
                    />
                ))}
            </nav>

            {/* Main Content */}
            <main className="min-h-screen pt-24 md:pt-40 pb-24 md:pb-8 relative z-10 w-full overflow-x-hidden px-4 md:px-8 max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="h-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Layout;
