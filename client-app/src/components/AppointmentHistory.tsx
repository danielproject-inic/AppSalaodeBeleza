import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, User, ChevronRight, Star, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewModal from './ReviewModal';
import { supabase } from '../lib/supabase';

interface Appointment {
    id: string;
    start_time: string;
    status: string;
    client_id: string;
    service_id: string;
    services: { title: string };
    professionals: { name: string };
    price: number;
    reviewed?: boolean;
}

interface AppointmentHistoryProps {
    appointments: Appointment[];
    onRebook?: (serviceId: string) => void;
}

const AppointmentHistory: React.FC<AppointmentHistoryProps> = ({ appointments, onRebook }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [professionalFilter, setProfessionalFilter] = useState('all');
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [reviewedApts, setReviewedApts] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchReviews = async () => {
            const aptIds = appointments.map(a => a.id);
            if (aptIds.length === 0) return;

            const { data } = await supabase
                .from('reviews')
                .select('appointment_id')
                .in('appointment_id', aptIds);
            
            if (data) {
                setReviewedApts(new Set(data.map(r => r.appointment_id)));
            }
        };
        fetchReviews();
    }, [appointments]);

    const filteredAppointments = appointments.filter(apt => {
        const matchesSearch = apt.services.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             apt.professionals.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        const matchesProfessional = professionalFilter === 'all' || apt.professionals.name === professionalFilter;
        return matchesSearch && matchesStatus && matchesProfessional;
    });

    const uniqueProfessionals = Array.from(new Set(appointments.map(a => a.professionals.name))).sort();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
            case 'scheduled': return 'text-cyan-600 bg-cyan-50 border-cyan-100';
            default: return 'text-slate-500 bg-slate-50 border-slate-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Concluído';
            case 'cancelled': return 'Cancelado';
            case 'scheduled': return 'Confirmado';
            default: return status;
        }
    };

    return (
        <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-magenta-400">Histórico de Atendimentos</h2>
                
                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text"
                            placeholder="Pesquisar serviço ou profissional..."
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 pl-10 pr-4 text-xs text-stone-900 focus:outline-none focus:border-amber-400 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="bg-stone-50 border border-stone-200 rounded-xl py-2 px-3 text-xs text-stone-600 focus:outline-none focus:border-cyan-400 transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Status: Todos</option>
                        <option value="completed">Concluídos</option>
                        <option value="scheduled">Agendados</option>
                        <option value="cancelled">Cancelados</option>
                    </select>
                    <select 
                        className="bg-stone-50 border border-stone-200 rounded-xl py-2 px-3 text-xs text-stone-600 focus:outline-none focus:border-cyan-400 transition-colors"
                        value={professionalFilter}
                        onChange={(e) => setProfessionalFilter(e.target.value)}
                    >
                        <option value="all">Profissional: Todos</option>
                        {uniqueProfessionals.map(prof => (
                            <option key={prof} value={prof}>{prof}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredAppointments.length > 0 ? filteredAppointments.map((apt) => (
                        <motion.div
                            key={apt.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-slate-200 transition-all group"
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/10 to-magenta-500/10 flex items-center justify-center border border-white/10">
                                        <Calendar className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                                            {apt.services.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User className="w-3 h-3 text-slate-500" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                {apt.professionals.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-1 text-slate-500 mb-1">
                                                <Clock className="w-3 h-3" />
                                                <p className="text-[10px] font-bold uppercase">
                                                    {new Date(apt.start_time).toLocaleDateString('pt-BR')} às {new Date(apt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 justify-end">
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${getStatusColor(apt.status)}`}>
                                                    {getStatusLabel(apt.status)}
                                                </span>
                                                {apt.status === 'completed' && !reviewedApts.has(apt.id) && (
                                                    <button 
                                                        onClick={() => setSelectedApt(apt)}
                                                        className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-yellow-400/30 bg-yellow-400/10 text-yellow-500 hover:bg-yellow-400 hover:text-white transition-all flex items-center gap-1"
                                                    >
                                                        <Star className="w-2.5 h-2.5 fill-current" />
                                                        Avaliar
                                                    </button>
                                                )}
                                                {apt.status === 'completed' && onRebook && (
                                                    <button 
                                                        onClick={() => onRebook(apt.service_id)}
                                                        className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-500 hover:bg-cyan-400 hover:text-white transition-all flex items-center gap-1"
                                                    >
                                                        <RotateCcw className="w-2.5 h-2.5" />
                                                        Repetir
                                                    </button>
                                                )}
                                                {reviewedApts.has(apt.id) && (
                                                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 flex items-center gap-1">
                                                        <Star className="w-2.5 h-2.5 fill-current" />
                                                        Avaliado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                            <p className="text-slate-500 text-sm font-bold uppercase italic">Nenhum resultado encontrado</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {selectedApt && (
                    <ReviewModal 
                        appointment={selectedApt}
                        onClose={() => setSelectedApt(null)}
                        onSuccess={() => {
                            setReviewedApts(prev => new Set([...Array.from(prev), selectedApt.id]));
                            setSelectedApt(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AppointmentHistory;
