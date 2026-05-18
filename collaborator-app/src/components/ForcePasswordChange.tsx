import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ForcePasswordChangeProps {
    onComplete: () => void;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Update Auth Password
            const { error: authError } = await supabase.auth.updateUser({
                password: password
            });
            if (authError) throw authError;

            // 2. Update Profile to clear the flag
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ force_password_change: false })
                    .eq('id', user.id);
                if (profileError) throw profileError;
            }

            onComplete();
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0f172a] font-display">
            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#b45309]/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-[#1f2937]/50 backdrop-blur-xl border border-white/5 rounded-[32px] p-10 shadow-2xl relative">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
                            <span className="material-symbols-outlined text-amber-500 text-3xl">security</span>
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">Primeiro Acesso</h1>
                        <p className="text-white/40 font-medium text-sm">
                            Por segurança, você precisa alterar sua senha padrão antes de continuar.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-in slide-in-from-top-1">
                            <span className="material-symbols-outlined text-red-400 text-xl">error</span>
                            <p className="text-red-400 text-sm font-semibold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Nova Senha</label>
                            <div className="group relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors">lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Confirmar Senha</label>
                            <div className="group relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors">lock_reset</span>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-black/20 border border-white/10 rounded-2xl pl-12 pr-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-black uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-98 transition-all flex items-center justify-center disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Definir Nova Senha"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForcePasswordChange;
