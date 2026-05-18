import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X, MessageSquare, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReviewModalProps {
    appointment: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ appointment, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    client_id: appointment.client_id,
                    appointment_id: appointment.id,
                    service_id: appointment.service_id,
                    rating,
                    comment
                });

            if (error) throw error;
            onSuccess();
        } catch (err) {
            console.error('Error submitting review:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-[#07090f] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
                {/* Decoration */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-400/10 blur-[100px] rounded-full" />
                
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter italic">Avaliar Serviço</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Sua opinião é fundamental para nós</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-8">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Serviço realizado</p>
                    <p className="text-sm font-black text-white uppercase italic">{appointment.services?.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Com {appointment.professionals?.name}</p>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Como foi sua experiência?</p>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                onClick={() => setRating(star)}
                                className="p-2 transition-transform hover:scale-125 focus:outline-none"
                            >
                                <Star 
                                    className={`w-8 h-8 transition-all ${
                                        (hoveredRating || rating) >= star 
                                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' 
                                            : 'text-slate-700'
                                    }`} 
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" /> Deixe um comentário (opcional)
                    </label>
                    <textarea 
                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all min-h-[100px] resize-none font-medium"
                        placeholder="Conte-nos o que você mais gostou..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>

                <button
                    disabled={rating === 0 || loading}
                    onClick={handleSubmit}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 text-[#07090f] py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 group shadow-[0_4px_20px_rgba(8,145,178,0.2)]"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-[#07090f]/30 border-t-[#07090f] rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Enviar Avaliação</span>
                            <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    );
};

export default ReviewModal;
