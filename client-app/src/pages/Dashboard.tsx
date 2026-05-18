import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Sparkles, ShoppingBag, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceCharts from '../components/ServiceCharts';
import AppointmentHistory from '../components/AppointmentHistory';
import NotificationCenter from '../components/NotificationCenter';
import SupportChat from '../components/SupportChat';

interface DashboardProps {
    user: any;
    setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setActiveTab }) => {
    const [nextAppointment, setNextAppointment] = useState<any>(null);
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ services: 0, products: 0, points: 0 });
    const [topProfessionals, setTopProfessionals] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Fetch next appointment
                const { data: appointment } = await supabase
                    .from('appointments')
                    .select('*, services(title), professionals(name)')
                    .eq('client_id', user.id)
                    .in('status', ['pending', 'confirmed'])
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (appointment) {
                    setNextAppointment(appointment);
                } else {
                    setNextAppointment(null);
                }

                // 2. Fetch all appointments (History & Stats)
                const { data: history } = await supabase
                    .from('appointments')
                    .select('*, services(title, category), professionals(name)')
                    .eq('client_id', user.id)
                    .order('start_time', { ascending: false });

                if (history) {
                    setAllAppointments(history);
                    
                    // Generate chart data (frequency of top 5 services)
                    const svcCounts: Record<string, number> = {};
                    history.forEach(apt => {
                        const title = apt.services?.title || 'Outro';
                        svcCounts[title] = (svcCounts[title] || 0) + 1;
                    });
                    
                    const chartFormatted = Object.entries(svcCounts)
                        .map(([label, value]) => ({ 
                            label, 
                            value, 
                            color: label.toLowerCase().includes('cabelo') ? '#22d3ee' : '#d946ef' 
                        }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5);
                    
                    setChartData(chartFormatted);

                    // Extract unique professionals
                    const profsMap = new Map();
                    history.forEach(apt => {
                        if (apt.professionals) {
                            profsMap.set(apt.professionals.name, {
                                name: apt.professionals.name,
                                count: (profsMap.get(apt.professionals.name)?.count || 0) + 1
                            });
                        }
                    });
                    setTopProfessionals(Array.from(profsMap.values()).sort((a, b) => b.count - a.count));
                }

                // 3. Fetch services total count
                const { count: servicesCount } = await supabase
                    .from('services')
                    .select('*', { count: 'exact', head: true });

                if (servicesCount !== null) {
                    setStats(prev => ({ ...prev, services: servicesCount }));
                }

                // 4. Fetch products total count
                const { count: productsCount } = await supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true });

                if (productsCount !== null) {
                    setStats(prev => ({ ...prev, products: productsCount }));
                }

                // 5. Update points
                setStats(prev => ({ ...prev, points: user.user_metadata.points || 0 }));

            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchUnreadCount = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('read', false);
            
            if (count !== null) setUnreadCount(count);
        };

        fetchDashboardData();
        fetchUnreadCount();
    }, [user.id]);

    const handleRebook = (serviceId: string) => {
        localStorage.setItem('rebookServiceId', serviceId);
        setActiveTab('services');
    };

    const handleCancelNextAppointment = async () => {
        if (!nextAppointment) return;
        if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;
        
        try {
            await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', nextAppointment.id);
            
            // Removing from next appt view immediately
            setNextAppointment(null);
            
            // Note: In a real scenario we might re-fetch dashboard data here to update history and refresh.
        } catch(err) {
            console.error('Erro ao cancelar agendamento:', err);
        }
    };


    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 pb-24 max-w-7xl mx-auto"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-10 pt-4 md:pt-0">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-3xl md:text-3xl font-black text-stone-900 tracking-tighter uppercase italic">
                        Olá, {user.user_metadata.full_name?.split(' ')[0] || 'Cliente'}!
                    </h1>
                </motion.div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => setShowNotifications(true)}
                        className="relative cursor-pointer transition-transform hover:scale-105 bg-stone-100 p-2 rounded-xl border border-stone-200 group"
                    >
                        <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-amber-600' : 'text-stone-500 group-hover:text-stone-900'}`} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-magenta-500 rounded-full border border-[#07090f] shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
                        )}
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Serviços Disponíveis', value: stats.services.toString(), icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-400/10', action: () => setActiveTab('services') },
                    { label: 'Sua Pontuação', value: stats.points.toString(), icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10', action: () => {} },
                    { label: 'Produtos em Destaque', value: stats.products.toString(), icon: ShoppingBag, color: 'text-magenta-500', bg: 'bg-magenta-500/10', action: () => setActiveTab('store') },
                ].map((card, i) => (
                    <motion.div
                        key={i}
                        onClick={card.action}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i + 0.3 }}
                        className="glass-card p-4 flex items-center gap-4 border-white/5 group hover:border-white/10 transition-all cursor-pointer"
                    >
                        <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-stone-700 uppercase tracking-widest italic drop-shadow-sm">{card.label}</p>
                            <p className="text-xl font-black text-stone-900 tracking-tighter uppercase">{card.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Next Appointment Section */}
                <div className="space-y-8">
                    {/* Next Appointment Card */}
                    <motion.div
                        className="glass-card p-6 flex flex-col justify-between h-[280px]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Próximo Agendamento</h2>
                        </div>

                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-20 bg-white/40 rounded-2xl border border-stone-200/50"></div>
                                <div className="h-10 w-full bg-white/40 rounded-xl mt-4 border border-stone-200/50"></div>
                            </div>
                        ) : nextAppointment ? (
                            <div className="flex flex-col h-full justify-between">
                                <div className="flex items-center gap-4 bg-white/40 p-4 rounded-2xl border border-stone-200/50 mb-6 hover:bg-white/60 transition-colors shadow-sm">
                                    <div className="bg-white/60 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-center border border-cyan-400/30 shadow-sm">
                                        <span className="text-[10px] font-black text-cyan-600 uppercase">
                                            {new Date(nextAppointment.start_time).toLocaleDateString('pt-BR', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-black text-stone-900 leading-none mt-1">
                                            {new Date(nextAppointment.start_time).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black text-stone-600 uppercase tracking-tight italic">
                                                {new Date(nextAppointment.start_time).toLocaleDateString('pt-BR', { weekday: 'long' })}, {new Date(nextAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {nextAppointment.status === 'pending' ? (
                                                <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 animate-pulse">
                                                    AGUARDANDO CONFIRMAÇÃO
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                                    CONFIRMADO
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-stone-900 tracking-tighter uppercase italic drop-shadow-sm">{nextAppointment.services?.title}</h3>
                                        <p className="text-cyan-600 text-[10px] mt-1 font-black uppercase tracking-widest">{nextAppointment.professionals?.name}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handleCancelNextAppointment} className="w-full btn-outline flex items-center justify-center py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200">
                                        Cancelar
                                    </button>
                                    <button onClick={() => {
                                        localStorage.setItem('rebookServiceId', nextAppointment.service_id);
                                        handleCancelNextAppointment().then(() => setActiveTab('services'));
                                    }} className="w-full btn-primary flex items-center justify-center py-3 text-[10px] font-black uppercase tracking-widest">
                                        Reagendar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center flex flex-col items-center flex-1 justify-center bg-white/40 rounded-2xl border border-dashed border-stone-300">
                                <p className="text-stone-600 text-sm mb-6 font-black uppercase italic tracking-widest">Você não tem agendamentos futuros</p>
                                <button onClick={() => setActiveTab('services')} className="btn-primary w-full max-w-[200px] text-[10px]">
                                    Agendar Agora
                                </button>
                            </div>
                        )}
                    </motion.div>

                </div>

                {/* Service Graphics Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <ServiceCharts 
                        title="Top Serviços Realizados" 
                        data={chartData} 
                    />
                </motion.div>
            </div>

            {/* Quick Re-book & Professionals */}
            {/* Favorite Professionals - Expanded to Full Width */}
            <div className="mb-8">
                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seus Profissionais Favoritos</h2>
                        <button onClick={() => setActiveTab('services')} className="text-[9px] font-black text-cyan-400 uppercase tracking-widest hover:text-white transition-colors">Ver Todos</button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {topProfessionals.length > 0 ? topProfessionals.slice(0, 5).map((prof, i) => (
                            <motion.div 
                                onClick={() => setActiveTab('services')}
                                key={i}
                                className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center text-center hover:bg-white/10 transition-colors cursor-pointer group"
                                whileHover={{ scale: 1.05 }}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-magenta-500 p-0.5 mb-3">
                                    <div className="w-full h-full rounded-full bg-stone-50 flex items-center justify-center overflow-hidden uppercase font-black text-stone-900 text-lg italic border border-stone-200">
                                        {prof.name.substring(0, 1)}
                                    </div>
                                </div>
                                <h3 className="text-[10px] font-black text-stone-900 uppercase tracking-tighter italic">{prof.name}</h3>
                                <p className="text-[8px] font-black text-magenta-500 uppercase tracking-widest mt-1 italic">{prof.count} Visitas</p>
                            </motion.div>
                        )) : (
                            <div className="col-span-full py-10 text-center flex flex-col items-center justify-center">
                                <p className="text-[10px] font-bold text-slate-500 uppercase italic mb-4">Comece a agendar para ver seus profissionais aqui</p>
                                <button onClick={() => setActiveTab('services')} className="btn-primary text-[10px]">Agendar Agora</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Appointment History Section */}
            <div className="mb-12">
                <AppointmentHistory appointments={allAppointments} onRebook={handleRebook} />
            </div>

            <AnimatePresence>
                {showNotifications && (
                    <NotificationCenter 
                        userId={user.id} 
                        onClose={() => setShowNotifications(false)} 
                    />
                )}
            </AnimatePresence>

            <SupportChat userId={user.id} />
        </motion.div>
    );
};

export default Dashboard;
