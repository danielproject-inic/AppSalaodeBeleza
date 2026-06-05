import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Phone, ArrowRight, Sparkles, Eye, EyeOff, X, ChevronRight } from 'lucide-react';
import { useSalon } from '../contexts/SalonContext';

const Auth: React.FC = () => {
    const { salonName } = useSalon();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [savedEmails, setSavedEmails] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    React.useEffect(() => {
        const saved = localStorage.getItem('saved_emails_client');
        if (saved) {
            try {
                setSavedEmails(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const handleRemoveEmail = (emailToRemove: string) => {
        const updated = savedEmails.filter(e => e !== emailToRemove);
        setSavedEmails(updated);
        localStorage.setItem('saved_emails_client', JSON.stringify(updated));
    };
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                // Persistir email no localStorage após login de sucesso
                const saved = localStorage.getItem('saved_emails_client');
                let emailsList: string[] = saved ? JSON.parse(saved) : [];
                if (!emailsList.includes(email.trim().toLowerCase())) {
                    emailsList.push(email.trim().toLowerCase());
                    localStorage.setItem('saved_emails_client', JSON.stringify(emailsList));
                }
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: phone,
                            role: 'client'
                        }
                    }
                });
                if (error) throw error;
                if (data.user) {
                    setMessage({ type: 'success', text: 'Registro realizado! Verifique seu e-mail.' });
                }
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Ocorreu um erro.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#e8e2d4] relative overflow-hidden">
            {/* Animated Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full animate-pulse-slow"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md z-10"
            >
                <div className="glass-card p-8 border hover:border-amber-200 transition-colors">
                    <div className="flex flex-col items-center mb-8">
                        <h1 className="text-3xl font-black text-stone-800 tracking-tighter uppercase italic">App Salão de Beleza</h1>
                        <p className="text-stone-500 text-sm font-medium mt-1">Sua beleza em uma nova dimensão</p>
                    </div>

                    <div className="flex gap-4 mb-8 bg-stone-200/50 p-1 rounded-xl">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white text-stone-800 shadow-md shadow-stone-200/50' : 'text-stone-500 hover:text-stone-800'}`}
                        >
                            ENTRAR
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white text-stone-800 shadow-md shadow-stone-200/50' : 'text-stone-500 hover:text-stone-800'}`}
                        >
                            CADASTRAR
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <input
                                            type="text"
                                            placeholder="NOME COMPLETO"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-white/60 border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                                            required={!isLogin}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <input
                                            type="tel"
                                            placeholder="TELEFONE"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-white/60 border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="email"
                                placeholder="E-MAIL"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/60 border border-stone-200 rounded-xl py-3 pl-10 pr-12 text-sm font-bold text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                                required
                            />
                            {isLogin && savedEmails.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-600 transition-colors focus:outline-none flex items-center justify-center"
                                >
                                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showDropdown ? 'rotate-90 text-amber-600' : ''}`} />
                                </button>
                            )}

                            {/* Dropdown absoluto */}
                            {isLogin && showDropdown && savedEmails.length > 0 && (
                                <>
                                    {/* Backdrop transparente para fechar ao clicar fora */}
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-stone-200 rounded-2xl py-2 shadow-2xl overflow-hidden animate-in fade-in duration-200 text-stone-800">
                                        {savedEmails.map((savedEmail) => (
                                            <div
                                                key={savedEmail}
                                                className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 cursor-pointer group/item transition-colors"
                                                onClick={() => {
                                                    setEmail(savedEmail);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <span className="text-sm text-stone-700 group-hover/item:text-stone-900 font-bold truncate flex-1">{savedEmail}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveEmail(savedEmail);
                                                        if (savedEmails.length <= 1) {
                                                            setShowDropdown(false);
                                                        }
                                                    }}
                                                    className="text-stone-300 hover:text-red-500 p-1 flex items-center justify-center transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="SENHA"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/60 border border-stone-200 rounded-xl py-3 pl-10 pr-12 text-sm font-bold text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none flex items-center justify-center"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {message.text && (
                            <div className={`p-4 rounded-xl text-xs font-bold border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-amber-50/30 border-t-amber-50 rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {isLogin ? 'ENTRAR AGORA' : 'FINALIZAR REGISTRO'}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {isLogin && (
                        <div className="mt-6 text-center">
                            <button type="button" className="text-[10px] font-black uppercase text-stone-400 hover:text-stone-600 transition-colors tracking-widest">
                                ESQUECI MINHA SENHA
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
