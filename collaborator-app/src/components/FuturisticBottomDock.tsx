import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarRaw, 
  Award as AwardRaw, 
  Users as UsersRaw, 
  Plus as PlusRaw, 
  MoreHorizontal as MoreHorizontalRaw, 
  User as UserRaw, 
  X as XRaw, 
  Check as CheckRaw, 
  Coffee as CoffeeRaw, 
  AlertTriangle as AlertTriangleRaw, 
  ChevronDown as ChevronDownRaw, 
  Search as SearchRaw 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Calendar = CalendarRaw as any;
const Award = AwardRaw as any;
const Users = UsersRaw as any;
const Plus = PlusRaw as any;
const MoreHorizontal = MoreHorizontalRaw as any;
const User = UserRaw as any;
const X = XRaw as any;
const Check = CheckRaw as any;
const Coffee = CoffeeRaw as any;
const AlertTriangle = AlertTriangleRaw as any;
const ChevronDown = ChevronDownRaw as any;
const Search = SearchRaw as any;

interface FuturisticBottomDockProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onRefreshData?: () => void;
}

export const FuturisticBottomDock = ({
  currentTab,
  onSelectTab,
  onRefreshData
}: FuturisticBottomDockProps) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showProfessionalDropdown, setShowProfessionalDropdown] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Client Form State (Full Official Salon Suite Pro Client Fields)
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientBirthDate, setClientBirthDate] = useState('');
  const [clientCep, setClientCep] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientNeighborhood, setClientNeighborhood] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  // Helper CPF formatter: 000.000.000-00
  const formatCPF = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Helper CEP formatter: 00000-000
  const formatCEP = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 8);
    return nums.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  };

  // Appointment Form State
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [professionalsList, setProfessionalsList] = useState<any[]>([]);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [savingAppointment, setSavingAppointment] = useState(false);

  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (showNewAppointmentModal) {
      setSelectedClientId('');
      setSelectedServiceId('');
      setAppointmentNotes('');
      setFormError('');
      setShowClientDropdown(false);
      setShowServiceDropdown(false);
      setShowProfessionalDropdown(false);
      loadFormData();
    }
  }, [showNewAppointmentModal]);

  const loadFormData = async () => {
    try {
      const [{ data: cData }, { data: sData }, { data: pData }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name', { ascending: true }),
        supabase.from('services').select('id, title, price, duration_minutes').order('title', { ascending: true }),
        supabase.from('professionals').select('id, name').order('name', { ascending: true })
      ]);

      if (cData) setClientsList(cData);
      if (sData) setServicesList(sData);
      if (pData) setProfessionalsList(pData);

      // Keep fields empty so user selects manually

    } catch (e) {
      console.error('Erro ao carregar dados do formulário:', e);
    }
  };

  // Handle Dynamic Action of "+" Button Based on Active Tab
  const handlePlusButtonClick = () => {
    if (currentTab === 'clients') {
      setShowNewClientModal(true);
    } else {
      // Default for Agenda and other tabs: New Appointment
      setShowNewAppointmentModal(true);
    }
  };

  // Save New Client (With all official fields & address_json)
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setSavingClient(true);
    try {
      const addressJson = (clientAddress || clientCep || clientCity || clientNeighborhood || clientState) ? {
        cep: clientCep || null,
        logradouro: clientAddress || null,
        bairro: clientNeighborhood || null,
        cidade: clientCity || null,
        estado: clientState || null
      } : null;

      const { error } = await supabase.from('clients').insert([
        {
          name: clientName,
          phone: clientPhone || null,
          cpf: clientCpf || null,
          email: clientEmail || null,
          birth_date: clientBirthDate || null,
          notes: clientNotes || null,
          address_json: addressJson
        }
      ]);

      if (!error) {
        setClientName('');
        setClientPhone('');
        setClientCpf('');
        setClientEmail('');
        setClientBirthDate('');
        setClientCep('');
        setClientAddress('');
        setClientNeighborhood('');
        setClientCity('');
        setClientState('');
        setClientNotes('');
        setShowNewClientModal(false);
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.error('Erro ao cadastrar cliente:', e);
    } finally {
      setSavingClient(false);
    }
  };

  // Save New Appointment
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setFormError('Por favor, selecione um cliente.');
      return;
    }
    if (!selectedServiceId) {
      setFormError('Por favor, selecione um serviço.');
      return;
    }
    if (!selectedProfessionalId) {
      setFormError('Por favor, selecione um colaborador.');
      return;
    }

    setFormError('');
    setSavingAppointment(true);
    try {
      const service = servicesList.find(s => s.id === selectedServiceId);
      const duration = service?.duration_minutes || 30;

      const startDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const { error } = await supabase.from('appointments').insert([
        {
          client_id: selectedClientId,
          service_id: selectedServiceId,
          professional_id: selectedProfessionalId || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'agendado',
          notes: appointmentNotes || null
        }
      ]);

      if (!error) {
        setAppointmentNotes('');
        setShowNewAppointmentModal(false);
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      console.error('Erro ao agendar:', e);
    } finally {
      setSavingAppointment(false);
    }
  };

  return (
    <>
      {/* Full Screen Width Edge-to-Edge Bottom Dock Container (No pill ends, full margin width) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full pointer-events-none">
        <div className="pointer-events-auto relative flex items-center justify-between px-4 pt-2.5 pb-3 bg-[#070b19]/95 backdrop-blur-2xl border-t border-[#00f0ff]/40 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.9),0_0_25px_rgba(0,240,255,0.2)] w-full">
          
          {/* 1. Agenda */}
          <button
            onClick={() => onSelectTab('agenda')}
            className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 bg-transparent border-0 outline-none transition-all duration-300 active:scale-95 cursor-pointer"
          >
            {currentTab === 'agenda' && (
              <div
                className="absolute -top-2.5 w-7 h-[3px] rounded-full"
                style={{
                  backgroundColor: '#00f0ff',
                  boxShadow: '0 0 12px #00f0ff, 0 0 20px #00f0ff'
                }}
              />
            )}
            <Calendar
              className="w-5 h-5 transition-transform duration-300 mb-1"
              style={{
                color: currentTab === 'agenda' ? '#00f0ff' : '#64748b',
                filter: currentTab === 'agenda' ? 'drop-shadow(0 0 8px #00f0ff)' : undefined
              }}
            />
            <span 
              className="text-[10px] font-black tracking-wider whitespace-nowrap transition-colors"
              style={{ color: currentTab === 'agenda' ? '#ffffff' : '#64748b' }}
            >
              Agenda
            </span>
          </button>

          {/* 2. Clientes (Invertido com Comissões) */}
          <button
            onClick={() => onSelectTab('clients')}
            className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 bg-transparent border-0 outline-none transition-all duration-300 active:scale-95 cursor-pointer"
          >
            {currentTab === 'clients' && (
              <div
                className="absolute -top-2.5 w-7 h-[3px] rounded-full"
                style={{
                  backgroundColor: '#b000ff',
                  boxShadow: '0 0 12px #b000ff, 0 0 20px #b000ff'
                }}
              />
            )}
            <Users
              className="w-5 h-5 transition-transform duration-300 mb-1"
              style={{
                color: currentTab === 'clients' ? '#b000ff' : '#64748b',
                filter: currentTab === 'clients' ? 'drop-shadow(0 0 8px #b000ff)' : undefined
              }}
            />
            <span 
              className="text-[10px] font-black tracking-wider whitespace-nowrap transition-colors"
              style={{ color: currentTab === 'clients' ? '#ffffff' : '#64748b' }}
            >
              Clientes
            </span>
          </button>

          {/* 🌟 3. PROMINENT EXTRA LARGE "+" BUTTON */}
          <div className="relative flex flex-col items-center justify-center px-1">
            <button
              onClick={handlePlusButtonClick}
              className="relative -top-3 w-18 h-18 rounded-full bg-gradient-to-br from-[#00f0ff] via-[#00c8ff] to-[#b000ff] p-[3px] shadow-[0_0_30px_rgba(0,240,255,0.8),0_0_50px_rgba(176,0,255,0.5),0_10px_22px_rgba(0,0,0,0.9)] active:scale-90 transition-all duration-300 cursor-pointer flex items-center justify-center group"
              title={currentTab === 'clients' ? "Cadastrar Novo Cliente" : "Novo Agendamento"}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00f0ff] via-[#00b8ff] to-[#0080ff] flex items-center justify-center border-2 border-white/90 shadow-inner group-hover:scale-105 transition-transform">
                <Plus className="w-10 h-10 text-[#050814] stroke-[1.75]" />
              </div>
            </button>
          </div>

          {/* 4. Comissões (Invertido com Clientes) */}
          <button
            onClick={() => onSelectTab('commissions')}
            className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 bg-transparent border-0 outline-none transition-all duration-300 active:scale-95 cursor-pointer"
          >
            {currentTab === 'commissions' && (
              <div
                className="absolute -top-2.5 w-7 h-[3px] rounded-full"
                style={{
                  backgroundColor: '#ffd700',
                  boxShadow: '0 0 12px #ffd700, 0 0 20px #ffd700'
                }}
              />
            )}
            <Award
              className="w-5 h-5 transition-transform duration-300 mb-1"
              style={{
                color: currentTab === 'commissions' ? '#ffd700' : '#64748b',
                filter: currentTab === 'commissions' ? 'drop-shadow(0 0 8px #ffd700)' : undefined
              }}
            />
            <span 
              className="text-[10px] font-black tracking-wider whitespace-nowrap transition-colors"
              style={{ color: currentTab === 'commissions' ? '#ffffff' : '#64748b' }}
            >
              Comissões
            </span>
          </button>

          {/* 5. Mais... (Contém apenas a opção PERFIL) */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 bg-transparent border-0 outline-none transition-all duration-300 active:scale-95 cursor-pointer"
          >
            {currentTab === 'profile' && (
              <div
                className="absolute -top-2.5 w-7 h-[3px] rounded-full"
                style={{
                  backgroundColor: '#00f0ff',
                  boxShadow: '0 0 12px #00f0ff, 0 0 20px #00f0ff'
                }}
              />
            )}
            <MoreHorizontal
              className="w-5 h-5 transition-transform duration-300 mb-1"
              style={{
                color: currentTab === 'profile' ? '#00f0ff' : '#64748b',
                filter: currentTab === 'profile' ? 'drop-shadow(0 0 8px #00f0ff)' : undefined
              }}
            />
            <span 
              className="text-[10px] font-black tracking-wider whitespace-nowrap transition-colors"
              style={{ color: currentTab === 'profile' ? '#ffffff' : '#64748b' }}
            >
              Mais...
            </span>
          </button>

        </div>
      </div>

      {/* 🔮 SUBMENU "Mais..." (Contém APENAS a opção PERFIL) */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
        >
          <div className="bg-[#0b1026] border border-[#00f0ff]/40 rounded-3xl p-5 w-full max-w-xs space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.3)] my-auto mx-auto">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MoreHorizontal className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Mais Opções</h3>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Options (Contém APENAS a opção PERFIL) */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  onSelectTab('profile');
                  setShowMoreMenu(false);
                }}
                className="w-full p-3.5 rounded-2xl bg-[#050814] border border-[#00f0ff]/40 hover:border-[#00f0ff] flex items-center gap-3 text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
              >
                <div className="p-2.5 rounded-xl bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-black text-white block">Perfil</span>
                  <span className="text-[10px] text-[#00f0ff] font-bold block">Ver e editar meus dados</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowMoreMenu(false)}
              className="w-full py-2.5 rounded-2xl border border-slate-700 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* 📅 MODAL NOVO AGENDAMENTO (Ativado quando no menu Agenda) */}
      {showNewAppointmentModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
        >
          <div className="bg-[#0b1026] border border-[#00f0ff]/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.3)] my-auto mx-auto max-h-[90vh] overflow-y-auto">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Novo Agendamento</h3>
              </div>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-3">
              {formError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
                  ⚠️ {formError}
                </div>
              )}

              {/* Custom Cyber Client Select (Prevents Android WebView White Screen Bug) */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Selecione o Cliente</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowClientDropdown(!showClientDropdown);
                    setShowServiceDropdown(false);
                    setShowProfessionalDropdown(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-[#050814] border border-[#00f0ff]/30 text-xs flex items-center justify-between hover:border-[#00f0ff] transition-all"
                >
                  <span className="truncate">
                    {clientsList.find(c => c.id === selectedClientId)?.name ? (
                      <span className="font-bold text-white">{clientsList.find(c => c.id === selectedClientId).name}</span>
                    ) : (
                      <span className="text-slate-400 font-medium">Selecione o cliente...</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#00f0ff] flex-shrink-0 ml-2 transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showClientDropdown && (
                  <div className="mt-1 p-2 rounded-2xl bg-[#070b19] border border-[#00f0ff]/40 shadow-[0_10px_30px_rgba(0,0,0,0.9)] max-h-48 overflow-y-auto space-y-1 z-50 relative">
                    <div className="p-1 pb-2 border-b border-white/10 sticky top-0 bg-[#070b19]">
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-[#050814] text-xs text-white border border-slate-700 focus:outline-none focus:border-[#00f0ff]"
                        />
                      </div>
                    </div>

                    {clientsList
                      .filter(c => c.name?.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setShowClientDropdown(false);
                            setFormError('');
                          }}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between outline-none appearance-none ${
                            selectedClientId === c.id
                              ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-black border border-[#00f0ff]/60 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                              : 'bg-[#050814] text-white font-bold border border-slate-800/80 hover:border-[#00f0ff]/40 hover:bg-[#090e24]'
                          }`}
                        >
                          <span className="truncate text-white font-bold">{c.name}</span>
                          {selectedClientId === c.id && <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0 ml-2" />}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Custom Cyber Service Select (Prevents Android WebView White Screen Bug) */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Selecione o Serviço</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowServiceDropdown(!showServiceDropdown);
                    setShowClientDropdown(false);
                    setShowProfessionalDropdown(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-[#050814] border border-[#00f0ff]/30 text-xs flex items-center justify-between hover:border-[#00f0ff] transition-all"
                >
                  <span className="truncate">
                    {servicesList.find(s => s.id === selectedServiceId) ? (
                      <span className="font-bold text-white">
                        {servicesList.find(s => s.id === selectedServiceId).title} (R$ {(servicesList.find(s => s.id === selectedServiceId).price || 0).toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">Selecione o serviço...</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#00f0ff] flex-shrink-0 ml-2 transition-transform ${showServiceDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showServiceDropdown && (
                  <div className="mt-1 p-2 rounded-2xl bg-[#070b19] border border-[#00f0ff]/40 shadow-[0_10px_30px_rgba(0,0,0,0.9)] max-h-48 overflow-y-auto space-y-1 z-50 relative">
                    {servicesList.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(s.id);
                          setShowServiceDropdown(false);
                          setFormError('');
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between outline-none appearance-none ${
                          selectedServiceId === s.id
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-black border border-[#00f0ff]/60 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                            : 'bg-[#050814] text-white font-bold border border-slate-800/80 hover:border-[#00f0ff]/40 hover:bg-[#090e24]'
                        }`}
                      >
                        <span className="truncate text-white font-bold">{s.title}</span>
                        <span className="font-black text-[#ffd700] ml-2 flex-shrink-0">R$ {(s.price || 0).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Cyber Professional Select */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Selecione o Colaborador</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfessionalDropdown(!showProfessionalDropdown);
                    setShowClientDropdown(false);
                    setShowServiceDropdown(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-[#050814] border border-[#00f0ff]/30 text-xs flex items-center justify-between hover:border-[#00f0ff] transition-all"
                >
                  <span className="truncate">
                    {professionalsList.find(p => p.id === selectedProfessionalId) ? (
                      <span className="font-bold text-white">
                        {professionalsList.find(p => p.id === selectedProfessionalId).name}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">Selecione o colaborador...</span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#00f0ff] flex-shrink-0 ml-2 transition-transform ${showProfessionalDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProfessionalDropdown && (
                  <div className="mt-1 p-2 rounded-2xl bg-[#070b19] border border-[#00f0ff]/40 shadow-[0_10px_30px_rgba(0,0,0,0.9)] max-h-48 overflow-y-auto space-y-1 z-50 relative">
                    {professionalsList.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProfessionalId(p.id);
                          setShowProfessionalDropdown(false);
                          setFormError('');
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between outline-none appearance-none ${
                          selectedProfessionalId === p.id
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-black border border-[#00f0ff]/60 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                            : 'bg-[#050814] text-white font-bold border border-slate-800/80 hover:border-[#00f0ff]/40 hover:bg-[#090e24]'
                        }`}
                      >
                        <span className="truncate text-white font-bold">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Data</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Horário</label>
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Observações (Opcional)</label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Detalhes ou preferências..."
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={savingAppointment}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#00a8ff] text-[#050814] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                >
                  {savingAppointment ? 'Confirmando...' : 'Confirmar Agendamento'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewAppointmentModal(false)}
                  className="w-full py-2.5 rounded-2xl border border-slate-700 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👥 MODAL CADASTRAR NOVO CLIENTE (Ativado quando no menu Clientes) */}
      {showNewClientModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
        >
          <div className="bg-[#0b1026] border border-[#b000ff]/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-[0_0_50px_rgba(176,0,255,0.3)] my-auto mx-auto max-h-[90vh] overflow-y-auto">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#b000ff]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Cadastrar Novo Cliente</h3>
              </div>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3">
              {/* Nome Completo */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do cliente..."
                  className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                  required
                />
              </div>

              {/* Telefone & CPF */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">CPF</label>
                  <input
                    type="text"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                  />
                </div>
              </div>

              {/* E-mail & Data de Nascimento */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Data Nascimento</label>
                  <input
                    type="date"
                    value={clientBirthDate}
                    onChange={(e) => setClientBirthDate(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                  />
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="pt-1 border-t border-white/5 space-y-2">
                <span className="text-[10px] font-extrabold text-[#b000ff] uppercase tracking-wider block">📍 Endereço (Opcional)</span>
                
                {/* CEP & UF */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">CEP</label>
                    <input
                      type="text"
                      value={clientCep}
                      onChange={(e) => setClientCep(formatCEP(e.target.value))}
                      placeholder="00000-000"
                      className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white uppercase text-center focus:outline-none focus:border-[#b000ff]"
                    />
                  </div>
                </div>

                {/* Logradouro / Endereço */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Endereço (Rua, Nº, Compl.)</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Rua, Número, Apto..."
                    className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                  />
                </div>

                {/* Bairro & Cidade */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Bairro</label>
                    <input
                      type="text"
                      value={clientNeighborhood}
                      onChange={(e) => setClientNeighborhood(e.target.value)}
                      placeholder="Nome do bairro..."
                      className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Cidade</label>
                    <input
                      type="text"
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      placeholder="Nome da cidade..."
                      className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#b000ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Observações Gerais / Preferências */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Observações / Preferências (Opcional)</label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Gosta de atendimento silencioso, etc..."
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-[#050814] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#b000ff]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={savingClient}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#b000ff] to-[#7000ff] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(176,0,255,0.4)]"
                >
                  {savingClient ? 'Cadastrando...' : 'Salvar Cadastro do Cliente'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="w-full py-2.5 rounded-2xl border border-slate-700 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
