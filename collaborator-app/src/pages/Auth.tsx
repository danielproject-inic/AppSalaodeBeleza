import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSalonConfig } from '../hooks/useSalonConfig';

interface AuthProps {
    onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { config } = useSalonConfig();

    const handleLogin = async (e: React.FormEvent) => {
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
            setError(err.message || 'Erro na autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#e8e2d4]/40 font-sans p-6">
            <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl border border-slate-300">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-[#0f172a] text-white mb-6 shadow-xl shadow-[#0f172a]/20">
                        {config?.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover rounded-3xl" />
                        ) : (
                            <span className="material-symbols-outlined text-4xl text-white">badge</span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 font-display">Painel do Colaborador</h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">{config?.name || 'Bem-vindo'}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">error</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 mt-1 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 mt-1 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center disabled:opacity-50 active:scale-95 translate-y-0"
                    >
                        {loading ? 'Entrando...' : 'Entrar na Agenda'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Auth;
