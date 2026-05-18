import React, { useState } from 'react';
import { useSalonConfig } from '../hooks/useSalonConfig';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import { supabase } from '../lib/supabase';

interface OnboardingProps {
 onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
 const { config, updateConfig } = useSalonConfig();
 const { profile, role } = useCurrentUserRef();
 const [step, setStep] = useState(1);
 const [loading, setLoading] = useState(false);
 const [previewImage, setPreviewImage] = useState<string | null>(null);

 // Custom Error Modal State
 const [errorModalState, setErrorModalState] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: '' });

 // Step 1: Establishment Data
 const [salonData, setSalonData] = useState({
 name: config?.name || '',
 cnpj: config?.cnpj || '',
 phone: config?.phone || '',
 email: config?.email || '',
 logo_url: config?.logo_url || '',
 cep: '',
 street: '',
 number: '',
 neighborhood: '',
 city: '',
 state: ''
 });

 // Step 2: Manager Data
 const [managerData, setManagerData] = useState({
 full_name: profile?.full_name || '',
 avatar_url: profile?.avatar_url || '',
 cpf: '',
 phone: '',
 birth_date: '',
 cep: '',
 street: '',
 number: '',
 neighborhood: '',
 city: '',
 state: ''
 });

 const maskCNPJ = (value: string) => {
 return value
 .replace(/\D/g, '')
 .replace(/^(\d{2})(\d)/, '$1.$2')
 .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
 .replace(/\.(\d{3})(\d)/, '.$1/$2')
 .replace(/(\d{4})(\d)/, '$1-$2')
 .substring(0, 18);
 };

 const maskPhone = (value: string) => {
 return value
 .replace(/\D/g, '')
 .replace(/^(\d{2})(\d)/, '($1) $2')
 .replace(/(\d{5})(\d)/, '$1-$2')
 .substring(0, 15);
 };

 const maskCPF = (value: string) => {
 return value
 .replace(/\D/g, '')
 .replace(/(\d{3})(\d)/, '$1.$2')
 .replace(/(\d{3})(\d)/, '$1.$2')
 .replace(/(\d{3})(\d{1,2})/, '$1-$2')
 .substring(0, 14);
 };

 const maskCEP = (value: string) => {
 return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
 };

 const handleCEPBlur = async (source: 'salon' | 'manager') => {
 const cepValue = source === 'salon' ? salonData.cep : managerData.cep;
 const cleanCEP = cepValue.replace(/\D/g, '');
 if (cleanCEP.length !== 8) return;

 try {
 const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
 const data = await response.json();

 if (!data.erro) {
 if (source === 'salon') {
 setSalonData(prev => ({
 ...prev,
 street: data.logradouro,
 neighborhood: data.bairro,
 city: data.localidade,
 state: data.uf
 }));
 } else {
 setManagerData(prev => ({
 ...prev,
 street: data.logradouro,
 neighborhood: data.bairro,
 city: data.localidade,
 state: data.uf
 }));
 }
 }
 } catch (error) {
 console.error('Error fetching CEP:', error);
 }
 };

 const handleSalonUpdate = async (e: React.FormEvent) => {
 e.preventDefault();
 setStep(2);
 };

 const handleComplete = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 const fullAddress = `${salonData.street}, ${salonData.number}${salonData.neighborhood ? ` - ${salonData.neighborhood}` : ''}, ${salonData.city} - ${salonData.state}`;

 const salonAddress = {
 cep: salonData.cep,
 logradouro: salonData.street,
 numero: salonData.number,
 bairro: salonData.neighborhood,
 cidade: salonData.city,
 estado: salonData.state
 };

 await updateConfig({
 name: salonData.name,
 cnpj: salonData.cnpj,
 phone: salonData.phone,
 email: salonData.email,
 address: fullAddress,
 logo_url: salonData.logo_url,
 address_json: salonAddress
 });

 if (profile?.id) {
 const { data: { user } } = await supabase.auth.getUser();

 const managerAddress = {
 cep: managerData.cep,
 logradouro: managerData.street,
 numero: managerData.number,
 bairro: managerData.neighborhood,
 cidade: managerData.city,
 estado: managerData.state
 };

 // 1. Update Profile
 const { error: profileError } = await supabase
 .from('profiles')
 .update({
 full_name: managerData.full_name,
 avatar_url: managerData.avatar_url,
 phone: managerData.phone,
 cpf: managerData.cpf,
 birth_date: managerData.birth_date || null,
 address_json: managerAddress,
 role: 'manager'
 })
 .eq('id', profile.id);
 if (profileError) throw profileError;

 // 2. Upsert Professional record
 const { error: proError } = await supabase
 .from('professionals')
 .upsert({
 id: profile.id,
 name: managerData.full_name,
 email: user?.email || null,
 avatar_url: managerData.avatar_url,
 phone: managerData.phone,
 cpf: managerData.cpf,
 birth_date: managerData.birth_date || null,
 address_json: managerAddress,
 role: 'manager'
 });
 if (proError) console.warn('Error upserting professional:', proError);
 }

 onComplete();
 } catch (error) {
 console.error('Error saving onboarding data:', error);
 setErrorModalState({ isOpen: true, message: 'Erro ao salvar as configurações. Tente novamente.' });
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] font-display p-6 relative">
  {/* Logout Button */}
  <button 
   onClick={async () => {
    await supabase.auth.signOut();
    window.location.reload();
   }}
   className="absolute top-8 right-8 text-[10px] font-black text-white/40 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-1 bg-[#1f2937]/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg z-50 cursor-pointer"
  >
   <span className="material-symbols-outlined text-[16px]">logout</span>
   <span>Sair / Trocar Conta</span>
  </button>
 <div className="w-full max-w-4xl bg-[#1f2937]/50 backdrop-blur-xl border border-white/5 rounded-[32px] shadow-2xl overflow-hidden p-12">
 {step === 1 && (
 <form onSubmit={handleSalonUpdate} className="space-y-8 animate-in slide-in- duration-500 max-w-2xl mx-auto">
 <div className="text-center">
 <h3 className="text-3xl font-black text-white mb-2">Dados do Salão</h3>
 <p className="text-sm text-white/60 font-medium mb-12">Informações básicas do seu estabelecimento.</p>
 </div>
 <div className="space-y-6">
 {/* Logo Selector at the top */}
 <div className="space-y-2 mb-8">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Logo do Salão</label>
 <div className="flex items-center gap-6">
 <div className="size-24 rounded-2xl bg-black/20 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
 {salonData.logo_url ? (
 <img src={salonData.logo_url} alt="Logo Preview" className="w-full h-full object-contain" />
 ) : (
 <span className="material-symbols-outlined text-white/20 text-4xl">image</span>
 )}
 </div>
 <label className="flex-1 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#b45309]/50 hover:bg-[#b45309]/10 text-white/5 transition-all group">
 <span className="material-symbols-outlined text-white/20 group-hover:text-[#b45309]">upload</span>
 <span className="text-[10px] font-black text-white/40 group-hover:text-[#b45309] uppercase group-hover:text-primary">Selecionar Imagem</span>
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 try {
 const fileExt = file.name.split('.').pop();
 const fileName = `logo-${Date.now()}.${fileExt}`;
 const filePath = `${fileName}`;

 const { error: uploadError } = await supabase.storage
 .from('logos')
 .upload(filePath, file);

 if (uploadError) throw uploadError;

 const { data: { publicUrl } } = supabase.storage
 .from('logos')
 .getPublicUrl(filePath);

 setSalonData({ ...salonData, logo_url: publicUrl });
 } catch (error) {
 console.error('Error uploading logo:', error);
 setErrorModalState({ isOpen: true, message: 'Erro ao enviar a imagem. Verifique se o bucket "logos" existe.' });
 }
 }}
 />
 </label>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nome do Salão</label>
 <input
 type="text"
 required
 value={salonData.name}
 onChange={e => setSalonData({ ...salonData, name: e.target.value })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">CNPJ</label>
 <input
 type="text"
 value={salonData.cnpj}
 onChange={e => setSalonData({ ...salonData, cnpj: maskCNPJ(e.target.value) })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Telefone</label>
 <input
 type="text"
 required
 value={salonData.phone}
 onChange={e => setSalonData({ ...salonData, phone: maskPhone(e.target.value) })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 </div>
 <div className="space-y-4">
 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">CEP</label>
 <input
 type="text"
 required
 value={salonData.cep}
 onChange={e => setSalonData({ ...salonData, cep: maskCEP(e.target.value) })}
 onBlur={() => handleCEPBlur('salon')}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="col-span-2 space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Logradouro</label>
 <input
 type="text"
 required
 value={salonData.street}
 onChange={e => setSalonData({ ...salonData, street: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Número</label>
 <input
 type="text"
 required
 value={salonData.number}
 onChange={e => setSalonData({ ...salonData, number: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="col-span-2 space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Bairro</label>
 <input
 type="text"
 required
 value={salonData.neighborhood}
 onChange={e => setSalonData({ ...salonData, neighborhood: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="col-span-3 space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Cidade</label>
 <input
 type="text"
 required
 value={salonData.city}
 onChange={e => setSalonData({ ...salonData, city: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">UF</label>
 <input
 type="text"
 required
 maxLength={2}
 value={salonData.state}
 onChange={e => setSalonData({ ...salonData, state: e.target.value.toUpperCase() })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all text-center"
 />
 </div>
 </div>

 </div>
 </div>

 <button type="submit" className="w-full h-14 bg-gradient-to-r from-[#b45309] to-[#d97706] text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(180,83,9,0.3)] hover:shadow-[0_0_30px_rgba(180,83,9,0.5)] border-0 transition-all flex items-center justify-center gap-2 mt-4 group">
 Próximo Passo
 <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
 </button>
 </form>
 )}

 {step === 2 && (
 <form onSubmit={handleComplete} className="space-y-8 animate-in slide-in- duration-500 max-w-2xl mx-auto">
 <div className="text-center">
 <h3 className="text-3xl font-black text-white mb-2">Dados do Gerente</h3>
 <p className="text-sm text-white/60 font-medium mb-12">Como devemos chamar você?</p>
 </div>

 <div className="space-y-6">
 {/* Avatar Selector */}
 <div className="space-y-2 mb-8">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Foto de Perfil</label>
 <div className="flex items-center gap-6">
 <div className="size-24 rounded-2xl bg-black/20 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
 {managerData.avatar_url ? (
 <img src={managerData.avatar_url} alt="Avatar Preview" className="w-full h-full object-cover" />
 ) : (
 <span className="material-symbols-outlined text-white/20 text-4xl">account_circle</span>
 )}
 </div>
 <label className="flex-1 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#b45309]/50 hover:bg-[#b45309]/10 text-white/5 transition-all group">
 <span className="material-symbols-outlined text-white/20 group-hover:text-[#b45309]">upload</span>
 <span className="text-[10px] font-black text-white/40 group-hover:text-[#b45309] uppercase group-hover:text-primary">Selecionar Foto</span>
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 try {
 const fileExt = file.name.split('.').pop();
 const fileName = `avatar-${Date.now()}.${fileExt}`;
 const filePath = `${fileName}`;

 const { error: uploadError } = await supabase.storage
 .from('logos') // Using 'logos' bucket as it likely already exists
 .upload(filePath, file);

 if (uploadError) throw uploadError;

 const { data: { publicUrl } } = supabase.storage
 .from('logos')
 .getPublicUrl(filePath);

 setManagerData({ ...managerData, avatar_url: publicUrl });
 } catch (error) {
 console.error('Error uploading avatar:', error);
 setErrorModalState({ isOpen: true, message: 'Erro ao enviar a foto. Tente novamente.' });
 }
 }}
 />
 </label>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nome Completo</label>
 <input
 type="text"
 required
 value={managerData.full_name}
 onChange={e => setManagerData({ ...managerData, full_name: e.target.value })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">CPF</label>
 <input
 type="text"
 required
 value={managerData.cpf}
 onChange={e => setManagerData({ ...managerData, cpf: maskCPF(e.target.value) })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Data de Nascimento</label>
 <input
 type="date"
 required
 value={managerData.birth_date}
 onChange={e => setManagerData({ ...managerData, birth_date: e.target.value })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Telefone Pessoal</label>
 <input
 type="text"
 required
 value={managerData.phone}
 onChange={e => setManagerData({ ...managerData, phone: maskPhone(e.target.value) })}
 className="w-full h-14 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-2xl px-6 text-base focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>

 {/* Manager Address */}
 <div className="space-y-4 pt-4 border-t border-white/10">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Endereço Residencial</label>
 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">CEP</label>
 <input
 type="text"
 required
 value={managerData.cep}
 onChange={e => setManagerData({ ...managerData, cep: maskCEP(e.target.value) })}
 onBlur={() => handleCEPBlur('manager')}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="col-span-2 space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Logradouro</label>
 <input
 type="text"
 required
 value={managerData.street}
 onChange={e => setManagerData({ ...managerData, street: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Número</label>
 <input
 type="text"
 required
 value={managerData.number}
 onChange={e => setManagerData({ ...managerData, number: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="col-span-2 space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Bairro</label>
 <input
 type="text"
 required
 value={managerData.neighborhood}
 onChange={e => setManagerData({ ...managerData, neighborhood: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="col-span-3 space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Cidade</label>
 <input
 type="text"
 required
 value={managerData.city}
 onChange={e => setManagerData({ ...managerData, city: e.target.value })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">UF</label>
 <input
 type="text"
 required
 maxLength={2}
 value={managerData.state}
 onChange={e => setManagerData({ ...managerData, state: e.target.value.toUpperCase() })}
 className="w-full h-12 bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 text-sm focus:ring-2 focus:ring-[#b45309]/50 focus:border-[#b45309] outline-none transition-all text-center"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-4 pt-4">
 <button
 type="button"
 onClick={() => setStep(1)}
 className="h-14 px-8 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center"
 >
 Voltar
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex-1 h-14 bg-gradient-to-r from-[#b45309] to-[#d97706] text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(180,83,9,0.3)] hover:shadow-[0_0_30px_rgba(180,83,9,0.5)] border-0 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
 >
 {loading ? (
 <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
 ) : (
 <>
 Concluir Configuração
 <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">check_circle</span>
 </>
 )}
 </button>
 </div>
 </form>
  )}
  </div>

 {/* Custom Error Modal */}
 {errorModalState.isOpen && (
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0f172a]/80 backdrop-blur-md animate-fadeIn">
 <div className="bg-[#1f2937] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 flex flex-col items-center p-8 text-center animate-scaleIn">
 <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
 <span className="material-symbols-outlined text-4xl">error</span>
 </div>
 <h3 className="text-2xl font-black text-white mb-2 tracking-tight">ERRO</h3>
 <p className="text-white/60 text-sm font-medium mb-8">{errorModalState.message}</p>
 <button
 onClick={() => setErrorModalState({ isOpen: false, message: '' })}
 className="w-full py-4 bg-gradient-to-r from-red-500 to-red-400 hover:brightness-110 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95"
 >
 Entendi
 </button>
 </div>
 </div>
 )}
 </div>
 );
};

export default Onboarding;
