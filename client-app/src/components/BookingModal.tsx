import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Clock, User, Zap, Wallet, CreditCard } from 'lucide-react';
import PaymentSimulation from './PaymentSimulation';

interface BookingModalProps {
    service: {
        id: string;
        title: string;
        price: number;
        duration_minutes: number;
    } | null;
    onClose: () => void;
    clientId: string;
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose, clientId }) => {
    const [step, setStep] = useState(1);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualTime, setManualTime] = useState<string>('');
    const [timeError, setTimeError] = useState<string>('');
    const [endTimePreview, setEndTimePreview] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<string>('local'); // 'local' or 'online'

    useEffect(() => {
        if (service) {
            fetchProfessionals();
        }
    }, [service]);

    useEffect(() => {
        if (selectedProfessional && selectedDate) {
            fetchExistingAppointments();
        }
    }, [selectedProfessional, selectedDate]);

    const fetchProfessionals = async () => {
        if (!service) return;
        setLoading(true);
        try {
            const { data: profRefs, error: refError } = await supabase
                .from('service_professionals')
                .select('professional_id')
                .eq('service_id', service.id);

            if (refError) throw refError;

            const profIds = profRefs.map(r => r.professional_id);
            const { data: profs, error: profError } = await supabase
                .from('professionals')
                .select('*')
                .in('id', profIds)
                .eq('status', 'Ativo');

            if (profError) throw profError;
            setProfessionals(profs || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingAppointments = async () => {
        if (!selectedProfessional) return;
        try {
            const startOfDay = `${selectedDate}T00:00:00.000Z`;
            const endOfDay = `${selectedDate}T23:59:59.999Z`;

            const { data, error } = await supabase
                .from('appointments')
                .select('start_time, end_time, status')
                .eq('professional_id', selectedProfessional.id)
                .neq('status', 'cancelled')
                .gte('start_time', startOfDay)
                .lte('start_time', endOfDay);

            if (error) throw error;
            setExistingAppointments(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const validateTime = (timeStr: string) => {
        setManualTime(timeStr);
        if (!timeStr || !service) {
            setTimeError('');
            setEndTimePreview('');
            return;
        }

        const [h, m] = timeStr.split(':').map(Number);
        const startTimeInMinutes = h * 60 + m;
        const businessStart = 5 * 60; // 05:00
        const businessEnd = 20 * 60; // 20:00

        if (startTimeInMinutes < businessStart || startTimeInMinutes >= businessEnd) {
            setTimeError('Fora do horário de funcionamento (05:00 - 19:59).');
            setEndTimePreview('');
            return;
        }

        const newEndInMinutes = startTimeInMinutes + service.duration_minutes;
        const hasCollision = existingAppointments.some(apt => {
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            const aptStartInMinutes = aptStart.getHours() * 60 + aptStart.getMinutes();
            const aptEndInMinutes = aptEnd.getHours() * 60 + aptEnd.getMinutes();

            return (startTimeInMinutes < aptEndInMinutes && newEndInMinutes > aptStartInMinutes);
        });

        if (hasCollision) {
            setTimeError('Este horário já está ocupado.');
            setEndTimePreview('');
        } else {
            setTimeError('');
            const endH = Math.floor(newEndInMinutes / 60);
            const endM = newEndInMinutes % 60;
            setEndTimePreview(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
        }
    };

    const handleConfirm = async () => {
        if (!service || !selectedProfessional || !selectedDate || !manualTime || timeError) return;
        
        if (paymentMethod === 'online' && step === 3) {
            setStep(4);
            return;
        }

        setLoading(true);
        try {
            const [h, m] = manualTime.split(':').map(Number);
            const [year, month, day] = selectedDate.split('-').map(Number);
            const startDate = new Date(year, month - 1, day, h, m);
            const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);

            const { error } = await supabase
                .from('appointments')
                .insert({
                    client_id: clientId,
                    service_id: service.id,
                    professional_id: selectedProfessional.id,
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString(),
                    status: 'pending'
                });

            if (error) throw error;
            setStep(5);
        } catch (err) {
            console.error(err);
            alert('Erro ao agendar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!service) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#0a0a0b]/90 backdrop-blur-md"
            ></motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl glass-card border-[rgba(34,_211,_238,_0.2)] overflow-hidden z-10 flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(34,211,238,0.1)]"
            >
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22d3ee] to-[#0ea5e9] flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-[#22d3ee] uppercase tracking-[0.2em]">Agendamento Premium</h2>
                            <p className="text-base font-bold text-white truncate max-w-[200px]">{service.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-90 group">
                        <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex h-1.5 bg-white/5 relative">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 5) * 100}%` }}
                        className={`h-full absolute left-0 top-0 transition-all duration-500 ${step === 5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[#22d3ee] shadow-[0_0_10px_rgba(34,211,238,0.5)]'}`}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-[#22d3ee]" />
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Escolha o Profissional</h3>
                                </div>

                                {loading ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-3 border-[#22d3ee]/20 border-t-[#22d3ee] rounded-full animate-spin"></div>
                                        <p className="text-xs font-bold text-[#22d3ee] animate-pulse">BUSCANDO TALENTOS...</p>
                                    </div>
                                ) : professionals.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {professionals.map((prof) => (
                                            <button
                                                key={prof.id}
                                                onClick={() => {
                                                    setSelectedProfessional(prof);
                                                    setStep(2);
                                                }}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group relative overflow-hidden ${selectedProfessional?.id === prof.id ? "bg-[#22d3ee]/10 border-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.1)]" : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"}`}
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-[#0a0a0b] border border-white/10 overflow-hidden shadow-inner">
                                                    <img src={prof.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${prof.name}`} alt={prof.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-white group-hover:text-[#22d3ee] transition-colors">{prof.name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tight mt-1">{prof.functions?.join(' • ')}</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                        <p className="text-slate-500 font-bold italic">Nenhum profissional disponível para este serviço.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-[#22d3ee]" />
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecionar Data</h3>
                                        </div>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => {
                                                setSelectedDate(e.target.value);
                                                validateTime('');
                                            }}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-[#22d3ee]/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-[#22d3ee]" />
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Horário de Início</h3>
                                        </div>
                                        <input
                                            type="time"
                                            value={manualTime}
                                            onChange={(e) => validateTime(e.target.value)}
                                            className={`w-full bg-white/5 border rounded-2xl p-4 text-white font-black text-xl outline-none focus:ring-2 transition-all shadow-inner
                                                ${timeError ? 'border-red-500/50 focus:ring-red-500/20 text-red-100' :
                                                    manualTime && !timeError ? 'border-emerald-500/50 focus:ring-emerald-500/20 text-emerald-100' :
                                                        'border-white/10 focus:ring-[#22d3ee]/50'}`}
                                        />
                                    </div>
                                </div>

                                {timeError ? (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                        <X className="w-4 h-4" /> {timeError}
                                    </motion.div>
                                ) : manualTime && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <CheckCircle2 className="w-4 h-4" /> Horário Disponível! Término previsto: {endTimePreview} ({service.duration_minutes} min)
                                    </motion.div>
                                )}

                                {/* Timeline Visual */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Agenda do Profissional</h3>
                                    <div className="relative h-24 bg-white/5 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
                                        <div className="absolute inset-0 flex">
                                            {Array.from({ length: 19 }, (_, i) => 5 + i).map(h => (
                                                <div key={h} className="flex-1 border-r border-white/5 relative group">
                                                    <span className="absolute top-2 left-1 text-[8px] font-black text-slate-600 group-hover:text-slate-400 transition-colors">{h}h</span>
                                                </div>
                                            ))}
                                        </div>

                                        {existingAppointments.map((apt, i) => {
                                            const start = new Date(apt.start_time);
                                            const end = new Date(apt.end_time);
                                            const startMin = start.getHours() * 60 + start.getMinutes();
                                            const endMin = end.getHours() * 60 + end.getMinutes();
                                            const left = ((startMin - 300) / 1080) * 100;
                                            const width = ((endMin - startMin) / 1080) * 100;

                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute top-8 bottom-4 bg-red-500/20 border-l border-r border-red-500/50 flex items-center justify-center overflow-hidden"
                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                >
                                                    <span className="text-[8px] font-black text-red-400 uppercase rotate-90 sm:rotate-0">Ocupado</span>
                                                </div>
                                            );
                                        })}

                                        {!timeError && manualTime && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute top-8 bottom-4 bg-[#22d3ee]/20 border-x border-[#22d3ee] shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                                                style={{
                                                    left: `${((parseInt(manualTime.split(':')[0]) * 60 + parseInt(manualTime.split(':')[1]) - 300) / 1080) * 100}%`,
                                                    width: `${(service.duration_minutes / 1080) * 100}%`
                                                }}
                                            />
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-bold text-center italic">A visualização mostra apenas o intervalo comercial das 05h às 23h.</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2 mb-8">
                                    <h3 className="text-xs font-black text-[#22d3ee] uppercase tracking-[0.2em]">Resumo do Agendamento</h3>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">QUASE LÁ!</p>
                                </div>

                                <div className="glass-card p-6 border-white/5 bg-white/5 space-y-4">
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-slate-500 uppercase text-[10px]">Serviço</span>
                                        <span className="text-white">{service.title}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-slate-500 uppercase text-[10px]">Data e Hora</span>
                                        <span className="text-[#22d3ee]">{new Date(selectedDate + 'T12:00:00').toLocaleDateString()} às {manualTime}</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                        <span className="text-slate-500 uppercase text-[10px]">Valor Total</span>
                                        <span className="text-2xl font-black text-white italic">R$ {service.price.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mt-8">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Como deseja pagar?</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setPaymentMethod('online')}
                                            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'online' ? 'bg-[#22d3ee]/10 border-[#22d3ee] text-[#22d3ee]' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase">Pagar Agora</span>
                                        </button>
                                        <button 
                                            onClick={() => setPaymentMethod('local')}
                                            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'local' ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                        >
                                            <Wallet className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase">Pagar no Salão</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2 mb-8">
                                    <h3 className="text-xs font-black text-[#22d3ee] uppercase tracking-[0.2em]">Check-out Online</h3>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">PAGAMENTO SEGURO</p>
                                </div>
                                <PaymentSimulation amount={service.price} onSuccess={handleConfirm} />
                            </motion.div>
                        )}

                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center"
                            >
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center justify-center mb-8 relative">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring" }}
                                    >
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                    </motion.div>
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-2xl animate-pulse"></div>
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 italic">Confirmado!</h3>
                                <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed">
                                    Seu agendamento foi {paymentMethod === 'online' ? 'pago e ' : ''}confirmado com sucesso.
                                </p>
                                <button
                                    onClick={onClose}
                                    className="mt-10 btn-futuristic w-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                                >
                                    VOLTAR AO PAINEL
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {step < 5 && (
                    <div className="p-6 sm:px-8 border-t border-white/10 bg-white/5 flex gap-4">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="p-4 px-6 rounded-2xl border border-white/10 text-slate-400 font-bold flex items-center gap-2 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">VOLTAR</span>
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            disabled={loading || (step === 2 && (!manualTime || !!timeError))}
                            className={`flex-1 btn-futuristic flex items-center justify-center gap-2 group ${loading || (step === 2 && (!manualTime || !!timeError)) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="font-black italic tracking-tighter">
                                        {step === 3 ? (paymentMethod === 'online' ? 'IR PARA PAGAMENTO' : 'RESERVAR AGORA') : 'PRÓXIMO PASSO'}
                                    </span>
                                    {step < 3 && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default BookingModal;

