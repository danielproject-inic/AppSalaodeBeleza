import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Sparkles, Clock, ChevronRight, Search, Filter } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import { AnimatePresence } from 'framer-motion';

interface Service {
    id: string;
    title: string;
    category: string;
    description: string;
    price: number;
    duration_minutes: number;
}

const Services: React.FC<{ clientId: string }> = ({ clientId }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    useEffect(() => {
        const fetchServices = async () => {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .order('category', { ascending: true });

            if (!error && data) {
                setServices(data);
                
                // Triggers "Agendar Novamente" logic from Dashboard
                const rebookId = localStorage.getItem('rebookServiceId');
                if (rebookId) {
                    const toRebook = data.find(s => s.id === rebookId);
                    if (toRebook) {
                        setSelectedService(toRebook);
                        localStorage.removeItem('rebookServiceId');
                    }
                }
            }
            setLoading(false);
        };

        fetchServices();
    }, []);

    const filteredServices = services.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div
            className="p-6 pb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <header className="mb-10 pt-4 md:pt-0">
                <div className="flex justify-between items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl md:text-3xl font-black text-stone-900 tracking-tighter uppercase italic drop-shadow-sm">Catálogo de Serviços</h1>
                        <p className="text-magenta-600 text-xs mt-1 font-black uppercase tracking-widest italic">Descubra sua próxima transformação</p>
                    </motion.div>
                    <div className="flex gap-3">
                        <button className="p-3 bg-white/40 border border-stone-200/50 rounded-xl hover:bg-white/60 transition-colors shadow-sm">
                            <Filter className="w-5 h-5 text-stone-600" />
                        </button>
                    </div>
                </div>

                <div className="mt-8 relative max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Buscar serviços ou categorias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/40 border border-stone-200/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all outline-none backdrop-blur-xl text-stone-900 font-bold italic"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Sincronizando com a nuvem...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service, i) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 + 0.3 }}
                            whileHover={{ y: -4 }}
                            className="glass-card p-6 group flex flex-col cursor-pointer border-stone-200/50 hover:border-stone-400/30 shadow-sm"
                            onClick={() => setSelectedService(service)}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-white/40 rounded-xl flex items-center justify-center border border-stone-200/50 group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-400/10 px-2 py-1 rounded-md border border-cyan-400/20">
                                    {service.category || 'Geral'}
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-stone-900 mb-2 leading-tight tracking-tighter uppercase italic drop-shadow-sm">{service.title}</h3>
                            <p className="text-stone-600 text-sm mb-6 flex-1 leading-relaxed line-clamp-2 font-black italic uppercase tracking-tight">{service.description || 'Uma experiência única de beleza e bem-estar projetada para realçar sua essência.'}</p>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-stone-600 bg-white/40 px-2.5 py-1 rounded-lg border border-stone-200/50">
                                        <Clock className="w-3.5 h-3.5 text-magenta-500" />
                                        <span className="text-xs font-black italic uppercase">{service.duration_minutes} min</span>
                                    </div>
                                    <span className="text-lg font-black text-amber-600 tracking-tighter italic drop-shadow-sm">
                                        R$ {Number(service.price).toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-500/20"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedService && (
                    <BookingModal
                        service={selectedService}
                        onClose={() => setSelectedService(null)}
                        clientId={clientId}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Services;
