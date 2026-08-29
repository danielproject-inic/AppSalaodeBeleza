import React from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { User, Star, Award, Shield, LogOut, Sparkles, CheckCircle2, ChevronRight, Settings } from 'lucide-react';

export const CollaboratorProfile: React.FC = () => {
  const { profile, role } = useCurrentUserRef();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col min-h-screen text-slate-100 pb-24">
      {/* Header */}
      <header className="px-5 pt-9 pb-4 bg-[#0b1026]/80 backdrop-blur-xl border-b border-[#00f0ff]/20 sticky top-0 z-40 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#00f0ff] font-semibold uppercase tracking-wider">
            <User className="w-3.5 h-3.5" />
            <span>Perfil do Profissional</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Meu Perfil</h1>
        </div>

        <div className="p-2.5 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff]">
          <Sparkles className="w-5 h-5" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 space-y-4">
        {/* Profile Identity Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0c1638]/90 to-[#1b0d38]/90 border border-[#00f0ff]/30 shadow-[0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-xl text-center space-y-3 relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#00f0ff] to-[#b000ff] p-[3px] mx-auto shadow-[0_0_25px_rgba(0,240,255,0.4)]">
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.full_name || 'Collaborator'}`}
              alt="Avatar"
              className="w-full h-full object-cover rounded-[21px] bg-[#050814]"
            />
          </div>

          <div>
            <h2 className="text-lg font-black text-white">{profile?.full_name || 'Profissional'}</h2>
            <p className="text-xs text-[#00f0ff] font-bold uppercase tracking-wider mt-0.5">{profile?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#b000ff]/20 text-[#b000ff] border border-[#b000ff]/40">
              {role === 'admin' ? '👑 Administrador' : role === 'manager' ? '⚡ Gerente' : '💇 Profissional'}
            </span>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#0b1026]/80 border border-[#ffd700]/30 backdrop-blur-md text-center space-y-1">
            <Star className="w-6 h-6 text-[#ffd700] fill-[#ffd700] mx-auto" />
            <span className="text-2xl font-black text-white block">5.0</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avaliação Média</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1026]/80 border border-[#00f0ff]/30 backdrop-blur-md text-center space-y-1">
            <Award className="w-6 h-6 text-[#00f0ff] mx-auto" />
            <span className="text-2xl font-black text-white block">Top 1</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ranking do Salão</span>
          </div>
        </div>

        {/* Actions List */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleLogout}
            className="w-full p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between transition-colors shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </main>
    </div>
  );
};
