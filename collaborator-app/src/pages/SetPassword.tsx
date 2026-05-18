import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SetPassword: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // The invite link will have a token in the URL hash
        // Supabase automatically picks up the token from the URL hash
        // and establishes a session when the page loads
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                // User has been authenticated via the invite link
                console.log('Auth event:', event);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
                data: { must_change_password: false }
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao definir a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#e8e2d4]/40 font-sans p-6">
                <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl border border-slate-300 text-center">
                    <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-emerald-500 text-white mb-6">
                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Senha Definida!</h1>
                    <p className="text-slate-400 text-sm mt-2">Redirecionando para o painel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#e8e2d4]/40 font-sans p-6">
            <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl border border-slate-300">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-[#0f172a] text-white mb-6 shadow-xl shadow-[#0f172a]/20">
                        <span className="material-symbols-outlined text-4xl">lock_open</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Bem-vindo à Equipe!</h1>
                    <p className="text-slate-400 text-sm mt-2">Defina sua senha para acessar o painel.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">error</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 mt-1 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                            placeholder="Mínimo 6 caracteres"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 mt-1 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                            placeholder="Repita a senha"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {loading ? 'Salvando...' : 'Definir Senha e Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetPassword;
