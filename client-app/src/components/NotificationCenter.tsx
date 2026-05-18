import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, X, Check, Trash2, Info, Calendar, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    type: string;
    created_at: string;
}

interface NotificationCenterProps {
    userId: string;
    onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, [userId]);

    const fetchNotifications = async () => {
        const { data, error: _error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data) setNotifications(data);
        setLoading(false);
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        }
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(notifications.filter(n => n.id !== id));
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'appointment': return <Calendar className="w-4 h-4 text-cyan-400" />;
            case 'promo': return <Sparkles className="w-4 h-4 text-magenta-400" />;
            default: return <Info className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md h-full bg-[#07090f] border-l border-white/10 shadow-2xl flex flex-col"
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Notificações</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fique por dentro das novidades</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((n) => (
                            <motion.div
                                key={n.id}
                                layout
                                className={`p-4 rounded-2xl border transition-all ${
                                    n.read ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/10 border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shrink-0 ${
                                        n.read ? 'bg-white/5' : 'bg-white/10'
                                    }`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-sm font-black uppercase tracking-tight italic ${n.read ? 'text-slate-400' : 'text-white'}`}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase">
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={`text-xs leading-relaxed ${n.read ? 'text-slate-500' : 'text-slate-300'}`}>
                                            {n.message}
                                        </p>
                                        <div className="flex gap-4 mt-4">
                                            {!n.read && (
                                                <button 
                                                    onClick={() => markAsRead(n.id)}
                                                    className="text-[9px] font-black uppercase text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
                                                >
                                                    <Check className="w-3 h-3" /> Marcar como lida
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => deleteNotification(n.id)}
                                                className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 flex items-center gap-1.5"
                                            >
                                                <Trash2 className="w-3 h-3" /> Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                            <Bell className="w-12 h-12 text-slate-500 mb-4" />
                            <p className="text-sm font-bold uppercase italic italic">Tudo limpo por aqui</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Você não tem novas notificações</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-white/[0.02]">
                    <p className="text-[9px] font-bold text-slate-500 uppercase text-center tracking-widest">
                        Exibindo as últimas 20 notificações
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default NotificationCenter;
