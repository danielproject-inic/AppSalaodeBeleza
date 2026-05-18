import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Headset } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSalon } from '../contexts/SalonContext';

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

interface SupportChatProps {
    userId: string;
}

const SupportChat: React.FC<SupportChatProps> = ({ userId }) => {
    const { salonName } = useSalon();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            const subscription = supabase
                .channel('support_messages')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                    setMessages(prev => [...prev, payload.new as Message]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
            .order('created_at', { ascending: true });

        if (data) setMessages(data);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || loading) return;

        setLoading(true);
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: userId,
                content: newMessage,
                recipient_id: null // To admin/support
            });

        if (!error) {
            setNewMessage('');
        }
        setLoading(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[90]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-[#07090f] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <Headset className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase italic tracking-tighter">Suporte {salonName}</p>
                                    <p className="text-[8px] font-bold text-cyan-200 uppercase tracking-widest">Online agora</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            <div className="text-center py-4">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] bg-white/5 px-2 py-1 rounded">Hoje</span>
                            </div>

                            {messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                                        msg.sender_id === userId 
                                            ? 'bg-cyan-600 text-[#07090f] rounded-br-none' 
                                            : 'bg-white/10 text-white border border-white/5 rounded-bl-none'
                                    }`}>
                                        {msg.content}
                                        <div className={`text-[8px] mt-1 opacity-50 ${msg.sender_id === userId ? 'text-black' : 'text-slate-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white/[0.02] border-t border-white/5">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escreva sua mensagem..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-all font-medium"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim() || loading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-cyan-500 rounded-xl flex items-center justify-center text-[#07090f] font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Float Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-cyan-600 rounded-full flex items-center justify-center text-[#07090f] shadow-[0_0_20px_rgba(8,145,178,0.4)] border border-cyan-400/30"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </motion.button>
        </div>
    );
};

export default SupportChat;
