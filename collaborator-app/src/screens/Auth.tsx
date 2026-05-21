import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSalonConfig } from '../hooks/useSalonConfig';
import { useSalon } from '../contexts/SalonContext';

interface AuthProps {
    onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const { salonName } = useSalon();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ title: string, message: string } | null>(null);
    const { config, loading: loadingConfig } = useSalonConfig();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            onAuthSuccess();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] font-display overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#b45309]/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md px-6 relative z-10">
                <div className="bg-[#1f2937]/50 backdrop-blur-xl border border-white/5 rounded-[32px] p-10 shadow-2xl relative group">
                    <div className="relative z-20">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-black text-white mb-1 leading-tight tracking-tight min-h-[40px]">
                                App Salão de Beleza
                            </h1>
                            <p className="text-[#b45309] font-black uppercase tracking-widest text-[10px] mb-4">
                                Colaborador
                            </p>
                            <p className="text-white/40 font-medium tracking-wide text-sm px-4 min-h-[20px]">
                                O próximo nível da gestão de beleza.
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-in slide-in-">
                                <span className="material-symbols-outlined text-red-400 text-xl">error</span>
                                <p className="text-red-400 text-sm font-semibold">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleAuth} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                    E-mail Corporativo
                                </label>
                                <div className="group relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#b45309] transition-colors duration-300">mail</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@exemplo.com"
                                        className="w-full h-14 bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 text-white focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all duration-300 font-medium placeholder:text-white/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                    Senha de Acesso
                                </label>
                                <div className="group relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#b45309] transition-colors duration-300">lock</span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-14 bg-black/20 border border-white/10 rounded-2xl pl-12 pr-12 text-white focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all duration-300 font-medium placeholder:text-white/20"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-[#b45309] transition-colors duration-300 focus:outline-none flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined select-none text-[20px]">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!email) {
                                                setError("Digite seu e-mail corporativo no campo acima para redefinir a senha.");
                                                return;
                                            }
                                            setLoading(true);
                                            try {
                                                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                                    redirectTo: window.location.origin,
                                                });
                                                if (error) throw error;
                                                setSuccess({
                                                    title: 'E-mail Enviado!',
                                                    message: 'Instruções de redefinição de senha foram enviadas para o seu e-mail.'
                                                });
                                            } catch (err: any) {
                                                setError(err.message || "Erro ao solicitar redefinição de senha.");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        className="text-[11px] font-bold text-[#b45309] hover:text-[#d97706] transition-colors tracking-wide"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#b45309] to-[#d97706] text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(180,83,9,0.3)] hover:shadow-[0_0_30px_rgba(180,83,9,0.5)] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:grayscale"
                            >
                                {loading ? (
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Entrar no Painel
                                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                    </span>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-8 text-center pt-8 border-t border-white/5">
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                Acesso restrito a colaboradores autorizados.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-[10px] text-white/20 uppercase tracking-[.2em] font-black">
                    &copy; {new Date().getFullYear()} {salonName || 'Salon Suite'}. All rights reserved.
                </p>
            </div>

            {/* Success Modal */}
            {success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#1f2937] rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="size-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-4xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-3 tracking-tight">{success.title}</h2>
                        <p className="text-white/60 text-sm font-medium mb-8 leading-relaxed">
                            {success.message}
                        </p>
                        <button
                            onClick={() => setSuccess(null)}
                            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:brightness-110 text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Auth;
