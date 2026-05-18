import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Cake, Sparkles, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface OnboardingProps {
    user: any;
    onComplete: () => void;
}

const ClientOnboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: user?.user_metadata?.full_name || '',
        phone: user?.user_metadata?.phone || '',
        cpf: '',
        birth_date: '',
        cep: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        preferences: ''
    });

    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .substring(0, 14);
    };

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 15);
    };

    const maskCEP = (value: string) => {
        return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    };

    const handleCEPBlur = async () => {
        const cleanCEP = formData.cep.replace(/\D/g, '');
        if (cleanCEP.length !== 8) return;

        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    address: data.logradouro || '',
                    neighborhood: data.bairro || '',
                    city: data.localidade || '',
                    state: data.uf || ''
                }));
            }
        } catch (error) {
            console.error('Error fetching CEP:', error);
        } finally {
            setCepLoading(false);
        }
    };

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const addressJson = {
                cep: formData.cep,
                logradouro: formData.address,
                bairro: formData.neighborhood,
                cidade: formData.city,
                estado: formData.state
            };

            // 1. Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    cpf: formData.cpf,
                    birth_date: formData.birth_date || null,
                    address_json: addressJson,
                    onboarding_completed: true
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Upsert Client record for sync
            const { error: clientError } = await supabase
                .from('clients')
                .upsert({
                    id: user.id,
                    name: formData.full_name,
                    email: user.email,
                    phone: formData.phone,
                    cpf: formData.cpf,
                    birth_date: formData.birth_date || null,
                    address_json: addressJson,
                    preferences: formData.preferences,
                    updated_at: new Date().toISOString()
                });

            if (clientError) console.warn('Error syncing client record:', clientError);

            onComplete();
        } catch (error) {
            console.error('Error saving onboarding data:', error);
            alert('Erro ao salvar os seus dados. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#e8e2d4] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl"
            >
                <div className="glass-card p-8 border border-white/60 bg-[#fdfaf6]/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-magenta-500/5 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full"></div>

                    <div className="relative z-10">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-magenta-500 to-amber-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-magenta-500/20 rotate-3">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase italic">
                                Bem-vindo(a)!
                            </h1>
                            <p className="text-stone-600 font-medium mt-2 max-w-sm">
                                Precisamos de mais algumas informações para proporcionar a melhor experiência de beleza para você.
                            </p>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex justify-center gap-2 mb-10">
                            {[1, 2, 3].map((s) => (
                                <div 
                                    key={s}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-12 bg-magenta-600' : 'w-4 bg-stone-200'}`}
                                />
                            ))}
                        </div>

                        <form onSubmit={(e) => { if (step === 3) handleComplete(e); else { e.preventDefault(); setStep(step + 1); } }} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-magenta-600 uppercase tracking-widest ml-1">Nome Completo</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-magenta-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.full_name}
                                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                    className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-magenta-500/10 focus:border-magenta-500 outline-none transition-all font-bold text-stone-800"
                                                    placeholder="SEU NOME COMPLETO"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-cyan-600 uppercase tracking-widest ml-1">CPF</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.cpf}
                                                    onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                                    className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-stone-800"
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Telefone</label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
                                                    <input
                                                        type="tel"
                                                        required
                                                        value={formData.phone}
                                                        onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                                        className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-stone-800"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-magenta-600 uppercase tracking-widest ml-1">Data de Nascimento</label>
                                            <div className="relative group">
                                                <Cake className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-magenta-500 transition-colors" />
                                                <input
                                                    type="date"
                                                    required
                                                    value={formData.birth_date}
                                                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                                    className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-4 focus:ring-magenta-500/10 focus:border-magenta-500 outline-none transition-all font-bold text-stone-800"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] font-black text-cyan-600 uppercase tracking-widest ml-1">CEP</label>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.cep}
                                                        onChange={e => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                                                        onBlur={handleCEPBlur}
                                                        className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-stone-800"
                                                        placeholder="00000-000"
                                                    />
                                                    {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500 animate-spin" />}
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Endereço</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-stone-500/10 focus:border-stone-500 outline-none transition-all font-bold text-stone-800"
                                                    placeholder="Logradouro, número"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Bairro</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.neighborhood}
                                                    onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                                    className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-stone-500/10 focus:border-stone-500 outline-none transition-all font-bold text-stone-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Cidade</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.city}
                                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                    className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-stone-500/10 focus:border-stone-500 outline-none transition-all font-bold text-stone-800"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Estado</label>
                                            <input
                                                type="text"
                                                maxLength={2}
                                                required
                                                value={formData.state}
                                                onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                                className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-stone-500/10 focus:border-stone-500 outline-none transition-all font-bold text-stone-800"
                                                placeholder="UF"
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Preferências e Observações</label>
                                            <textarea
                                                value={formData.preferences}
                                                onChange={e => setFormData({ ...formData, preferences: e.target.value })}
                                                rows={4}
                                                className="w-full bg-white/50 border border-stone-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium text-stone-800 resize-none"
                                                placeholder="Alguma alergia, preferência de café, ou obs. importante?"
                                            />
                                        </div>

                                        <div className="p-6 bg-magenta-500/5 rounded-[2rem] border border-magenta-500/10 flex items-start gap-4">
                                            <div className="w-10 h-10 bg-magenta-500 rounded-xl flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-magenta-600 uppercase italic tracking-tight">Tudo Quase Pronto!</h4>
                                                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                                                    Ao concluir, seu cadastro será sincronizado com nosso sistema para agilizar seus próximos atendimentos.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-4 pt-4">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(step - 1)}
                                        className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                                    >
                                        Voltar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-[2] py-4 bg-gradient-to-r from-magenta-600 to-amber-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-magenta-600/20 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70' : ''}`}
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {step === 3 ? 'CONCLUIR CADASTRO' : 'PRÓXIMO PASSO'}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ClientOnboarding;
