import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, Lock, Loader2, CheckCircle2, AlertCircle, Camera, ChevronRight, MapPin, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface EditProfileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const EditProfileDrawer: React.FC<EditProfileDrawerProps> = ({ isOpen, onClose, user: authUser }) => {
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    
    // Auth Edit State
    const [newEmail, setNewEmail] = useState(authUser.email);
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
            setError('');
            setSuccess('');
            setExpandedSection(null);
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
        if (data) setProfileData(data);
    };

    const handleSave = async (section: string) => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (section === 'personal' || section === 'address') {
                // 1. Update Profile table
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: profileData.full_name,
                        phone: profileData.phone,
                        cpf: profileData.cpf,
                        birth_date: profileData.birth_date,
                        address_json: profileData.address_json
                    })
                    .eq('id', authUser.id);

                if (profileError) throw profileError;

                // 2. Update Auth Metadata
                await supabase.auth.updateUser({
                    data: { 
                        full_name: profileData.full_name,
                        phone: profileData.phone
                    }
                });

                // 3. Sync with Clients table
                await supabase.from('clients').upsert({
                    id: authUser.id,
                    name: profileData.full_name,
                    email: authUser.email,
                    phone: profileData.phone,
                    cpf: profileData.cpf,
                    birth_date: profileData.birth_date,
                    address_json: profileData.address_json,
                    updated_at: new Date().toISOString()
                });

                setSuccess('Informações atualizadas com sucesso!');
            } else if (section === 'security') {
                if (newPassword && !currentPassword) {
                    throw new Error('Você deve digitar a senha atual para alterá-la.');
                }

                if (newPassword) {
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: authUser.email,
                        password: currentPassword
                    });
                    if (signInError) throw new Error('Senha atual incorreta.');
                }

                const updates: any = {};
                if (newEmail !== authUser.email) updates.email = newEmail;
                if (newPassword) updates.password = newPassword;

                if (Object.keys(updates).length > 0) {
                    const { error } = await supabase.auth.updateUser(updates);
                    if (error) throw error;
                    setSuccess('Dados de acesso atualizados!');
                    setNewPassword('');
                    setCurrentPassword('');
                }
            }
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
        setError('');
        setSuccess('');
    };

    if (!profileData) return null;

    const AccordionItem = ({ id, icon: Icon, title, subtitle, children }: { id: string, icon: any, title: string, subtitle: string, children: React.ReactNode }) => {
        const isExpanded = expandedSection === id;
        return (
            <div className="border-b border-stone-200/60 last:border-0 overflow-hidden">
                <button 
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-white/30 transition-all outline-none"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' : 'bg-stone-100 text-stone-500'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h3 className={`text-xs font-black uppercase tracking-widest transition-colors ${isExpanded ? 'text-stone-900' : 'text-stone-600'}`}>
                                {title}
                            </h3>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        className="text-stone-300"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </motion.div>
                </button>
                
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <div className="px-6 pb-8 pt-2 space-y-6">
                                {children}
                                <button 
                                    onClick={() => handleSave(id)}
                                    disabled={loading}
                                    className="w-full h-12 bg-stone-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-stone-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#e8e2d4] shadow-2xl z-[101] overflow-y-auto"
                    >
                        <div className="min-h-full flex flex-col">
                            {/* Header */}
                            <div className="p-8 pb-4">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-stone-900 tracking-tighter uppercase italic">Configurações</h2>
                                        <p className="text-magenta-600 text-[10px] font-black uppercase tracking-widest mt-1">Gerencie sua conta premium</p>
                                    </div>
                                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors outline-none">
                                        <X className="w-6 h-6 text-stone-600" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-24 h-24 rounded-full bg-stone-100 p-1 relative border border-stone-200 shadow-xl">
                                        <img
                                            src={authUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser?.id}`}
                                            alt="Avatar"
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-stone-100">
                                            <Camera className="w-4 h-4 text-stone-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest mt-4 italic">{profileData.full_name}</h3>
                                    <p className="text-[9px] font-black text-magenta-500 uppercase tracking-widest mt-1 drop-shadow-sm">Nível Elite</p>
                                </div>
                                
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p className="text-xs font-bold uppercase italic">{error}</p>
                                    </motion.div>
                                )}

                                {success && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-600"
                                    >
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <p className="text-xs font-bold uppercase italic">{success}</p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Accordion List */}
                            <div className="flex-1 bg-white/40 border-t border-stone-200/60 shadow-inner">
                                <AccordionItem 
                                    id="personal" 
                                    icon={User} 
                                    title="Dados Pessoais" 
                                    subtitle="Nome, Telefone e Documentos"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-magenta-500 transition-colors" />
                                                <input 
                                                    value={profileData.full_name} 
                                                    onChange={e => setProfileData({...profileData, full_name: e.target.value})}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Telefone</label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-cyan-500 transition-colors" />
                                                    <input 
                                                        value={profileData.phone} 
                                                        onChange={e => setProfileData({...profileData, phone: e.target.value})}
                                                        className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">CPF</label>
                                                <input 
                                                    value={profileData.cpf} 
                                                    onChange={e => setProfileData({...profileData, cpf: e.target.value})}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                                            <input 
                                                type="date"
                                                value={profileData.birth_date || ''} 
                                                onChange={e => setProfileData({...profileData, birth_date: e.target.value})}
                                                className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem 
                                    id="address" 
                                    icon={MapPin} 
                                    title="Endereço" 
                                    subtitle="Dados de Localização"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">CEP</label>
                                            <input 
                                                value={profileData.address_json?.cep || ''} 
                                                onChange={e => setProfileData({...profileData, address_json: {...profileData.address_json, cep: e.target.value}})}
                                                placeholder="00000-000"
                                                className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                                                <input 
                                                    value={profileData.address_json?.rua || ''} 
                                                    onChange={e => setProfileData({...profileData, address_json: {...profileData.address_json, rua: e.target.value}})}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nº</label>
                                                <input 
                                                    value={profileData.address_json?.numero || ''} 
                                                    onChange={e => setProfileData({...profileData, address_json: {...profileData.address_json, numero: e.target.value}})}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Bairro</label>
                                                <input 
                                                    value={profileData.address_json?.bairro || ''} 
                                                    onChange={e => setProfileData({...profileData, address_json: {...profileData.address_json, bairro: e.target.value}})}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Cidade</label>
                                                <input 
                                                    value={profileData.address_json?.cidade || ''} 
                                                    onChange={e => setProfileData({...profileData, address_json: {...profileData.address_json, cidade: e.target.value}})}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Estado (UF)</label>
                                            <input 
                                                value={profileData.address_json?.estado || ''} 
                                                onChange={e => setProfileData({...profileData, address_json: {...profileData.address_json, estado: e.target.value}})}
                                                maxLength={2}
                                                placeholder="Ex: SP"
                                                className="w-24 bg-stone-50/50 border border-stone-200 rounded-xl py-3 px-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all uppercase shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </AccordionItem>

                                <AccordionItem 
                                    id="security" 
                                    icon={ShieldCheck} 
                                    title="Dados de Acesso" 
                                    subtitle="E-mail e Senha de Acesso"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-cyan-500 transition-colors" />
                                                <input 
                                                    type="email"
                                                    value={newEmail} 
                                                    onChange={e => setNewEmail(e.target.value)}
                                                    className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-stone-100/50 border border-stone-200 rounded-2xl space-y-4 shadow-inner">
                                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest text-center">Para alterar a senha, preencha abaixo</p>
                                            
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Senha Atual</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
                                                    <input 
                                                        type={showCurrentPassword ? 'text' : 'password'}
                                                        value={currentPassword} 
                                                        onChange={e => setCurrentPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-11 pr-12 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none flex items-center justify-center"
                                                    >
                                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nova Senha</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-magenta-500 transition-colors" />
                                                    <input 
                                                        type={showNewPassword ? 'text' : 'password'}
                                                        value={newPassword} 
                                                        onChange={e => setNewPassword(e.target.value)}
                                                        placeholder="Mínimo 6 caracteres"
                                                        className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-11 pr-12 text-xs font-bold text-stone-800 outline-none focus:border-stone-500 transition-all shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none flex items-center justify-center"
                                                    >
                                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionItem>
                            </div>

                            {/* Footer */}
                            <div className="p-8 bg-stone-100/30 border-t border-stone-200/60 mt-auto">
                                <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest text-center leading-relaxed">
                                    Suas informações são protegidas por criptografia de ponta a ponta.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EditProfileDrawer;
