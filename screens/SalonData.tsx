import React, { useState, useEffect, useRef } from 'react';
import { useSalonConfig } from '../hooks/useSalonConfig';

const defaultData = {
  name: '',
  cnpj: '',
  address: '',
  phone: '',
  email: '',
  business_hours: '',
  social_links: null,
  logo_url: '',
  marketing_description: '',
};

// --- TYPES ---
interface WeekDaySchedule {
  isOpen: boolean;
  start: string;
  end: string;
}

interface BusinessSchedule {
  [key: string]: WeekDaySchedule;
}

interface AddressParts {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
}

const DAYS_TRANSLATE: Record<string, string> = {
  'monday': 'Segunda-feira',
  'tuesday': 'Terça-feira',
  'wednesday': 'Quarta-feira',
  'thursday': 'Quinta-feira',
  'friday': 'Sexta-feira',
  'saturday': 'Sábado',
  'sunday': 'Domingo'
};

const DEFAULT_SCHEDULE: BusinessSchedule = {
  'monday': { isOpen: true, start: '09:00', end: '18:00' },
  'tuesday': { isOpen: true, start: '09:00', end: '18:00' },
  'wednesday': { isOpen: true, start: '09:00', end: '18:00' },
  'thursday': { isOpen: true, start: '09:00', end: '18:00' },
  'friday': { isOpen: true, start: '09:00', end: '18:00' },
  'saturday': { isOpen: true, start: '09:00', end: '14:00' },
  'sunday': { isOpen: false, start: '09:00', end: '12:00' },
};

// --- MASK HELPERS ---
const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

interface SalonDataProps {
  variant?: 'classic' | 'modern';
}

const SalonData: React.FC<SalonDataProps> = ({ variant = 'classic' }) => {
  const { config, loading, error: supabaseError, updateConfig } = useSalonConfig();
  const [localData, setLocalData] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Complex States
  const [schedule, setSchedule] = useState<BusinessSchedule>(DEFAULT_SCHEDULE);
  const [socials, setSocials] = useState<{ platform: string, url: string }[]>([{ platform: 'instagram', url: '' }]);
  const [addressParts, setAddressParts] = useState<AddressParts>({
    cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', complemento: ''
  });

  // Sync local state when config is loaded
  useEffect(() => {
    if (config) {
      setLocalData({ ...config });

      // Parse Business Hours
      try {
        if (config.business_hours) {
          const parsed = typeof config.business_hours === 'string'
            ? JSON.parse(config.business_hours)
            : config.business_hours;
          setSchedule(parsed || DEFAULT_SCHEDULE);
        }
      } catch (e) { console.warn('Failed to parse schedule', e); setSchedule(DEFAULT_SCHEDULE); }

      // Parse Social Links
      try {
        const links = config.social_links as any;
        if (Array.isArray(links)) {
          setSocials(links.length > 0 ? links : [{ platform: 'instagram', url: '' }]);
        } else if (links && typeof links === 'object') {
          setSocials(Object.entries(links).map(([k, v]) => ({ platform: k, url: v as string })));
        } else {
          setSocials([{ platform: 'instagram', url: '' }]);
        }
      } catch (e) { console.warn('Failed to parse social links', e); setSocials([{ platform: 'instagram', url: '' }]); }

      // Parse Address from address_json
      if (config.address_json) {
        const addr = config.address_json as any;
        setAddressParts({
          cep: addr.cep || '',
          logradouro: addr.logradouro || '',
          numero: addr.numero || '',
          bairro: addr.bairro || '',
          cidade: addr.cidade || '',
          uf: addr.estado || addr.uf || '',
          complemento: addr.complemento || ''
        });
      } else {
        setAddressParts({
          cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', complemento: ''
        });
      }
    }
  }, [config]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (supabaseError) {
      setNotification(`Erro: ${supabaseError}`);
    }
  }, [supabaseError]);

  // CEP Fetcher
  const handleBlurCEP = async () => {
    const cleanCep = addressParts.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddressParts(prev => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
          }));
        } else {
          setNotification('Erro: CEP não encontrado.');
        }
      } catch (error) {
        setNotification('Erro ao buscar CEP.');
      }
    }
  };

  const handleChangeAddress = (field: keyof AddressParts, value: string) => {
    let val = value;
    if (field === 'cep') val = maskCEP(value);
    setAddressParts(prev => ({ ...prev, [field]: val }));
  };

  const handleChangeSchedule = (day: string, field: keyof WeekDaySchedule, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSocialChange = (index: number, value: string) => {
    const newSocials = [...socials];
    newSocials[index].url = value;
    setSocials(newSocials);
  };

  const addSocial = () => setSocials([...socials, { platform: 'instagram', url: '' }]);
  const removeSocial = (index: number) => setSocials(socials.filter((_, i) => i !== index));

  const handleChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === 'cnpj') formattedValue = maskCNPJ(value);
    if (field === 'phone') formattedValue = maskPhone(value);
    setLocalData((prev: any) => ({ ...prev, [field]: formattedValue }));
  };

  const handleSave = async () => {
    if (!localData) return;
    setIsSaving(true);
    const payload = { ...localData };

    // 1. Serialize Schedule
    payload.business_hours = schedule;

    // 2. Serialize Socials
    payload.social_links = socials;

    // 3. Structured Address
    payload.address_json = {
      cep: addressParts.cep,
      logradouro: addressParts.logradouro,
      numero: addressParts.numero,
      bairro: addressParts.bairro,
      cidade: addressParts.cidade,
      estado: addressParts.uf,
      complemento: addressParts.complemento
    };

    // 4. Fallback string address
    payload.address = `${addressParts.logradouro}, ${addressParts.numero}${addressParts.complemento ? ' - ' + addressParts.complemento : ''} - ${addressParts.bairro}, ${addressParts.cidade} - ${addressParts.uf}, ${addressParts.cep}`;

    const result = await updateConfig(payload);
    setIsSaving(false);
    if (result) {
      setNotification('Dados do salão salvos com sucesso!');
    }
  };

  const handleCancel = () => {
    if (config) {
      setLocalData({ ...config });
      setNotification('Alterações descartadas.');
      try {
        if (config.business_hours) {
          const parsed = typeof config.business_hours === 'string' ? JSON.parse(config.business_hours) : config.business_hours;
          setSchedule(parsed || DEFAULT_SCHEDULE);
        }
      } catch (e) { setSchedule(DEFAULT_SCHEDULE); }

      try {
        const links = config.social_links as any;
        if (Array.isArray(links)) setSocials(links.length > 0 ? links : [{ platform: 'instagram', url: '' }]);
        else if (links && typeof links === 'object') setSocials(Object.entries(links).map(([k, v]) => ({ platform: k, url: v as string })));
      } catch (e) { setSocials([{ platform: 'instagram', url: '' }]); }

      if (config.address_json) {
        const addr = config.address_json as any;
        setAddressParts({
          cep: addr.cep || '',
          logradouro: addr.logradouro || '',
          numero: addr.numero || '',
          bairro: addr.bairro || '',
          cidade: addr.cidade || '',
          uf: addr.estado || addr.uf || '',
          complemento: addr.complemento || ''
        });
      }
    }
  };

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setNotification('Erro: Imagem maior que 2MB');
      return;
    }

    setIsSaving(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const fileExt = file.name.split('.').pop();
      const fileName = `salon-logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setLocalData((prev: any) => ({ ...prev, logo_url: publicUrl }));
      setNotification('Logo carregado! Não esqueça de salvar.');
    } catch (error) {
      console.error('Error uploading logo:', error);
      setNotification('Erro ao enviar logo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !localData) {
    return (
      <div className="h-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const data = localData || defaultData;

  if (variant === 'modern') {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {notification && (
          <div className="fixed top-20 right-20 z-[1000] px-8 py-5 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 text-white font-bold shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-4">
             <span className="material-symbols-outlined text-[var(--nb-neon-cyan)]">{notification.includes('Erro') ? 'error' : 'shield_check'}</span>
             {notification}
          </div>
        )}

        {/* 1. Logotipo Card (Horizontal) */}
        <div className="bg-white/5 border border-white/10 p-10 rounded-[40px] flex items-center gap-10 group relative overflow-hidden card-glaze-pink">
             <div className="relative size-24 shrink-0">
                  <div className="w-full h-full rounded-2xl bg-white/5 border border-[var(--nb-neon-pink)] flex items-center justify-center overflow-hidden transition-all group-hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                      {data.logo_url ? (
                          <img src={data.logo_url} className="w-full h-full object-cover p-3" />
                      ) : (
                          <span className="material-symbols-outlined text-4xl text-[var(--nb-neon-pink)]">add_a_photo</span>
                      )}
                  </div>
             </div>
             <div className="flex-1">
                  <h4 className="text-white font-black uppercase tracking-tight text-xl">Logotipo do Salão</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">PNG ou SVG, fundo transparente recomendado.</p>
             </div>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-4 rounded-full bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] shrink-0"
             >
                 Fazer Upload
             </button>
             <input ref={fileInputRef} onChange={handleFileChange} type="file" accept="image/*" className="hidden" />
        </div>

        {/* 2. Business Information (2 columns) */}
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">Nome Comercial</label>
                    <input 
                      value={data.name || ''} 
                      onChange={(e) => handleChange('name', e.target.value)} 
                      placeholder="Nome do Salão"
                      className="w-full h-16 rounded-[24px] nb-input px-8 text-white focus:outline-none font-bold" 
                    />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">CNPJ</label>
                    <input 
                      value={data.cnpj || ''} 
                      onChange={(e) => handleChange('cnpj', e.target.value)} 
                      placeholder="00.000.000/0000-00"
                      className="w-full h-16 rounded-[24px] nb-input px-8 text-white focus:outline-none font-bold" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">E-mail de Contato</label>
                    <input 
                      value={data.email || ''} 
                      onChange={(e) => handleChange('email', e.target.value)} 
                      placeholder="contato@empresa.com.br"
                      className="w-full h-16 rounded-[24px] nb-input px-8 text-white focus:outline-none font-bold" 
                    />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">WhatsApp Business</label>
                    <input 
                      value={data.phone || ''} 
                      onChange={(e) => handleChange('phone', e.target.value)} 
                      placeholder="(00) 00000-0000"
                      className="w-full h-16 rounded-[24px] nb-input px-8 text-white focus:outline-none font-bold" 
                    />
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">Endereço Completo</label>
                <input 
                  value={data.address || ''} 
                  onChange={(e) => handleChange('address', e.target.value)} 
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  className="w-full h-16 rounded-[24px] nb-input px-8 text-white focus:outline-none font-bold" 
                />
            </div>
        </div>

        {/* 3. Schedule Section */}
        <div className="space-y-8 pt-6">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Horário de Funcionamento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {Object.keys(DEFAULT_SCHEDULE).map(day => (
                 <div key={day} className="bg-white/5 border border-white/5 p-8 rounded-[40px] flex flex-col gap-6 hover:bg-white/[0.08] transition-all group relative overflow-hidden">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-white font-black uppercase tracking-tight text-xl">{DAYS_TRANSLATE[day]}</p>
                        
                        <div 
                          onClick={() => handleChangeSchedule(day, 'isOpen', !schedule[day]?.isOpen)}
                          className={`w-14 h-8 rounded-full relative cursor-pointer transition-all shrink-0 ${schedule[day]?.isOpen ? 'bg-[var(--nb-neon-cyan)] shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 size-6 rounded-full bg-white transition-all ${schedule[day]?.isOpen ? 'left-7' : 'left-1'}`} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         {schedule[day]?.isOpen ? (
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Entrada */}
                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-5 py-2.5 rounded-2xl transition-all focus-within:border-[var(--nb-neon-cyan)]/50">
                                    <input 
                                        type="time" 
                                        value={schedule[day].start} 
                                        onChange={(e) => handleChangeSchedule(day, 'start', e.target.value)}
                                        className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer [color-scheme:dark]" 
                                    />
                                    <div className="flex items-center gap-2 opacity-40">
                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Início</span>
                                    </div>
                                </div>
                                
                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">até</span>

                                {/* Saída */}
                                <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-5 py-2.5 rounded-2xl transition-all focus-within:border-[var(--nb-neon-cyan)]/50">
                                    <input 
                                        type="time" 
                                        value={schedule[day].end} 
                                        onChange={(e) => handleChangeSchedule(day, 'end', e.target.value)}
                                        className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer [color-scheme:dark]" 
                                    />
                                    <div className="flex items-center gap-2 opacity-40">
                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Fim</span>
                                    </div>
                                </div>
                            </div>
                         ) : (
                            <div className="flex items-center gap-3 bg-rose-500/5 px-6 py-3 rounded-2xl border border-rose-500/10">
                                <span className="material-symbols-outlined text-rose-500/40 text-sm">block</span>
                                <span className="text-[11px] font-black text-rose-500/40 uppercase italic tracking-widest">Estabelecimento Fechado</span>
                            </div>
                         )}
                    </div>
                 </div>
               ))}
            </div>
        </div>

        {/* Action Bar */}
        <div className="pt-10 border-t border-white/10 flex justify-end gap-6 items-center">
            <button onClick={handleCancel} className="px-8 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">Descartar</button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-12 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
            >
              {isSaving ? <div className="size-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <span className="material-symbols-outlined text-xl">check</span>}
              Salvar Alterações
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#e8e2d4]/40 h-full overflow-y-auto">
      {notification && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl ${notification.includes('Erro') ? 'bg-red-600' : 'bg-slate-900'} text-slate-800 font-bold shadow-2xl animate-in slide-in- fade-in duration-300 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-400">{notification.includes('Erro') ? 'error' : 'check_circle'}</span>
          {notification}
        </div>
      )}

      <main className="pb-16 px-6 lg:px-10 w-full max-w-7xl mx-auto pt-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-300 mb-10 text-slate-800/90">
          <div>
            <h1 className="text-3xl font-black mb-2">Dados do Salão</h1>
            <p className="text-sm text-slate-400 font-medium max-w-2xl">Gerencie as informações fundamentais e identidade visual do seu estabelecimento.</p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-none border border-gray-50 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Sidebar: Logo */}
            <div className="lg:col-span-3 p-10 border-r border-slate-300 flex flex-col items-center justify-start gap-8 bg-[#e8e2d4]/20">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Logo do Salão</label>

              <div className="relative group">
                <div className="size-52 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-none group-hover:border-primary/50 transition-all">
                  {data.logo_url ? (
                    <img src={data.logo_url} alt="Logo" className="w-full h-full object-cover p-2" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-200 text-6xl">storefront</span>
                  )}
                </div>
                <button
                  onClick={handleLogoUpload}
                  className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <span className="material-symbols-outlined text-slate-800 text-3xl">upload</span>
                </button>
                <input ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" type="file" />
              </div>

              <div className="text-center space-y-2">
                <button onClick={handleLogoUpload} className="text-xs font-black text-slate-800 uppercase tracking-widest hover:text-slate-800-dark transition-colors">Carregar Imagem</button>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">PNG ou JPG (Max 2MB)</p>
              </div>
            </div>

            {/* Right: Form fields */}
            <div className="lg:col-span-9 p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nome do Salão</label>
                  <input
                    value={data.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 text-base text-slate-800/80 font-bold focus:ring-2 focus:ring-slate-300 outline-none transition-all"
                    placeholder="Ex: Studio Beaux"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                  <input
                    value={data.cnpj || ''}
                    onChange={(e) => handleChange('cnpj', e.target.value)}
                    className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 text-base text-slate-800/80 font-bold focus:ring-2 focus:ring-slate-300 outline-none transition-all"
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">Endereço Completo</label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CEP</label>
                    <div className="relative group">
                      <input
                        value={addressParts.cep}
                        onChange={(e) => handleChangeAddress('cep', e.target.value)}
                        onBlur={handleBlurCEP}
                        className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 font-bold text-slate-800/80 focus:ring-2 focus:ring-slate-300 outline-none"
                        placeholder="00000-000"
                      />
                      <span className="material-symbols-outlined absolute right-6 top-4 text-slate-800 text-xl">search</span>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logradouro</label>
                    <input
                      value={addressParts.logradouro}
                      onChange={(e) => handleChangeAddress('logradouro', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 font-bold text-slate-800/80 focus:ring-2 focus:ring-slate-300 outline-none"
                      placeholder="Rua..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Número</label>
                    <input
                      value={addressParts.numero}
                      onChange={(e) => handleChangeAddress('numero', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 font-bold text-slate-800/80"
                      placeholder="123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
                    <input
                      value={addressParts.bairro}
                      onChange={(e) => handleChangeAddress('bairro', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 font-bold text-slate-800/80"
                      placeholder="Centro"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                    <input
                      value={addressParts.cidade}
                      onChange={(e) => handleChangeAddress('cidade', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 font-bold text-slate-800/80"
                      placeholder="São Paulo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">UF</label>
                    <input
                      value={addressParts.uf}
                      onChange={(e) => handleChangeAddress('uf', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-6 font-bold text-slate-800/80 text-center uppercase"
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Telefone de Contato</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-6 top-4 text-slate-400 group-focus-within:text-slate-800 transition-colors">call</span>
                    <input
                      value={data.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 pl-14 pr-6 text-base text-slate-800/80 font-bold focus:ring-2 focus:ring-slate-300 outline-none"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email de Contato</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-6 top-4 text-slate-400 group-focus-within:text-slate-800 transition-colors">mail</span>
                    <input
                      value={data.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 pl-14 pr-6 text-base text-slate-800/80 font-bold focus:ring-2 focus:ring-slate-300 outline-none"
                      placeholder="contato@exemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Social Networks */}
              <div className="space-y-6 pt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">Redes Sociais</label>
                <div className="space-y-4">
                  {socials.map((social, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-1 relative group">
                        <span className="material-symbols-outlined absolute left-6 top-4 text-slate-400 group-focus-within:text-slate-800 transition-colors">public</span>
                        <input
                          value={social.url}
                          onChange={(e) => handleSocialChange(idx, e.target.value)}
                          className="w-full h-14 rounded-2xl bg-white border border-slate-300 pl-14 pr-6 text-base text-slate-800/80 font-bold"
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                      {idx > 0 && (
                        <button onClick={() => removeSocial(idx)} className="size-14 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addSocial} className="px-6 h-12 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-black uppercase tracking-widest hover:bg-[#e8e2d4]/40 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Adicionar outra rede
                  </button>
                </div>
              </div>

              {/* Business Hours */}
              <div className="space-y-6 pt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">Horário de Funcionamento</label>
                <div className="bg-white border border-slate-300 shadow-sm rounded-xl rounded-[32px] p-8 border border-slate-300 space-y-4">
                  {Object.keys(DEFAULT_SCHEDULE).map((dayKey) => (
                    <div key={dayKey} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4 w-48">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={schedule[dayKey]?.isOpen}
                            onChange={(e) => handleChangeSchedule(dayKey, 'isOpen', e.target.checked)}
                            className="size-6 rounded-lg border-2 border-slate-300 text-slate-800 focus:ring-slate-300 cursor-pointer"
                          />
                        </div>
                        <span className={`text-sm font-bold uppercase tracking-widest ${schedule[dayKey]?.isOpen ? 'text-slate-800/80' : 'text-slate-500'}`}>
                          {DAYS_TRANSLATE[dayKey]}
                        </span>
                      </div>
                      <div className={`flex flex-1 items-center gap-3 transition-all ${schedule[dayKey]?.isOpen ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        {schedule[dayKey]?.isOpen ? (
                          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-300 shadow-none">
                            <input type="time" value={schedule[dayKey]?.start} onChange={(e) => handleChangeSchedule(dayKey, 'start', e.target.value)} className="bg-transparent text-sm font-bold text-slate-800/80 outline-none" />
                            <span className="text-slate-500 font-bold">às</span>
                            <input type="time" value={schedule[dayKey]?.end} onChange={(e) => handleChangeSchedule(dayKey, 'end', e.target.value)} className="bg-transparent text-sm font-bold text-slate-800/80 outline-none" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-red-300 uppercase tracking-[0.2em] ml-6 italic">Estabelecimento Fechado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-10 py-8 bg-white border border-slate-300 shadow-sm rounded-xl border-t border-gray-50 flex justify-end gap-4">
            <button onClick={handleCancel} disabled={isSaving} className="px-8 h-14 rounded-2xl bg-white border border-slate-300 text-slate-400 font-bold hover:bg-white hover:text-slate-700 transition-all disabled:opacity-50">
              Descartar Alterações
            </button>
            <button onClick={handleSave} disabled={isSaving} className="px-12 h-14 rounded-2xl bg-[#0f172a] text-white font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50">
              {isSaving ? (
                <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-xl">check_circle</span>
              )}
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SalonData;
