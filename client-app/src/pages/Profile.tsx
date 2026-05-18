import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Phone, LogOut, MapPin, Camera, Loader2, Calendar, Clock, Settings, ShieldCheck, Trophy, ArrowRight } from 'lucide-react';

const Profile: React.FC<{ user: any; onLogout: () => void }> = ({ user: initialUser, onLogout }) => {
    const [user, setUser] = useState(initialUser);
    const [uploading, setUploading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [stats, setStats] = useState({ total_appointments: 0, points: 0, year: '' });
    const [recentAppointments, setRecentAppointments] = useState<any[]>([]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { data: { user: updatedUser }, error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;
            if (updatedUser) setUser(updatedUser);

        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao carregar avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                setProfileData(profile);
                
                // Fetch stats
                const { count } = await supabase
                    .from('appointments')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', user.id);

                setStats({
                    total_appointments: count || 0,
                    points: profile.points || 0,
                    year: new Date(profile.created_at || user.created_at).getFullYear().toString()
                });

                // Fetch recent appointments
                const { data: recent } = await supabase
                    .from('appointments')
                    .select('*, services(title)')
                    .eq('client_id', user.id)
                    .order('start_time', { ascending: false })
                    .limit(3);
                
                if (recent) setRecentAppointments(recent);
            }
        };

        fetchUserData();
    }, [user.id]);


    if (!profileData) return <div className="p-12 text-center text-stone-500 font-bold">Carregando perfil...</div>;

    return (
        <motion.div
            className="p-6 pb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <header className="mb-10 pt-4 md:pt-0">
                <h1 className="text-3xl font-black text-stone-900 tracking-tighter uppercase italic drop-shadow-sm">Seu Perfil</h1>
                <p className="text-magenta-600 text-xs mt-1 font-black uppercase tracking-widest italic">Acesso exclusivo ao seu ecossistema de beleza</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-8 flex flex-col items-center text-center border-stone-200/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors"></div>

                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#07090f] to-white/10 p-1 mb-4 relative group/avatar">
                            <img
                                src={user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                                alt="Avatar"
                                className="w-full h-full rounded-full object-cover shadow-xl border-2 border-white/20"
                            />
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-2 border-white/20">
                                {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                            </label>
                        </div>

                        <h2 className="text-2xl font-black text-stone-900 tracking-tighter uppercase italic">{profileData.full_name || 'Usuário'}</h2>
                        <p className="text-amber-600 text-xs font-black uppercase tracking-widest mb-6 italic">Membro Gold</p>

                        <div className="w-full space-y-3 mt-4">
                            <div className="flex items-center gap-3 p-3 bg-[#fdfaf6]/40 rounded-xl border border-stone-200/50">
                                <Mail className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs text-stone-700 font-bold truncate italic">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-[#fdfaf6]/40 rounded-xl border border-stone-200/50">
                                <Phone className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs text-stone-700 font-bold italic">{profileData.phone || '(11) 99999-9999'}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-[#fdfaf6]/40 rounded-xl border border-stone-200/50">
                                <MapPin className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs text-stone-700 font-bold italic">
                                    {profileData.address_json?.cidade || 'São Paulo'}, {profileData.address_json?.estado || 'BR'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full mt-8 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest italic"
                        >
                            <LogOut className="w-4 h-4" /> SAIR DA CONTA
                        </button>
                    </div>
                </div>

                {/* Stats & Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="glass-card p-6 border-stone-200/50 flex flex-col items-center text-center space-y-2 group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-2">
                                <Clock className="w-6 h-6 text-cyan-500" />
                            </div>
                            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Agendamentos</p>
                            <p className="text-2xl font-black text-stone-900 tracking-tighter uppercase italic">{stats.total_appointments}</p>
                        </motion.div>

                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="glass-card p-6 border-stone-200/50 flex flex-col items-center text-center space-y-2 group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-magenta-500/10 flex items-center justify-center border border-magenta-500/20 mb-2">
                                <Trophy className="w-6 h-6 text-magenta-500" />
                            </div>
                            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Pontos Fidelidade</p>
                            <p className="text-2xl font-black text-stone-900 tracking-tighter uppercase italic">{stats.points}</p>
                        </motion.div>

                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="glass-card p-6 border-stone-200/50 flex flex-col items-center text-center space-y-2 group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-2">
                                <Calendar className="w-6 h-6 text-amber-500" />
                            </div>
                            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Membro desde</p>
                            <p className="text-2xl font-black text-stone-900 tracking-tighter uppercase italic">{stats.year}</p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Recent History */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-magenta-500" /> Histórico Recente
                            </h3>
                            <div className="glass-card overflow-hidden border-stone-200/50">
                                {recentAppointments.length > 0 ? (
                                    <div className="divide-y divide-stone-100">
                                        {recentAppointments.map((apt, i) => (
                                            <div key={i} className="p-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                                                <div>
                                                    <p className="text-xs font-black text-stone-800 uppercase italic tracking-tight">{apt.services?.title}</p>
                                                    <p className="text-[10px] text-stone-500 font-bold">{new Date(apt.start_time).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase italic ${
                                                    apt.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                                    apt.status === 'canceled' ? 'bg-red-100 text-red-600' :
                                                    'bg-amber-100 text-amber-600'
                                                }`}>
                                                    {apt.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-[10px] font-bold text-stone-400 uppercase italic">Nenhum histórico encontrado</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security & Settings */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-cyan-500" /> Configurações
                            </h3>
                            <div className="glass-card p-2 border-stone-200/50 space-y-1">
                                {[
                                    { label: 'Privacidade & Dados', icon: ShieldCheck, color: 'text-emerald-500' },
                                    { label: 'Termos de Uso', icon: Calendar, color: 'text-stone-400' },
                                    { label: 'Ajuda & Suporte', icon: Phone, color: 'text-amber-500' }
                                ].map((item, i) => (
                                    <button key={i} className="w-full flex items-center justify-between p-3 hover:bg-stone-50/50 rounded-xl transition-all group">
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-4 h-4 ${item.color}`} />
                                            <span className="text-[10px] font-black text-stone-700 uppercase italic tracking-widest">{item.label}</span>
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-stone-300 group-hover:translate-x-1 group-hover:text-stone-500 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Profile;
