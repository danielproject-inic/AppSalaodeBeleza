import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users as UsersRaw, 
  Search as SearchRaw, 
  Phone as PhoneRaw, 
  MessageSquare as MessageSquareRaw, 
  Sparkles as SparklesRaw, 
  MapPin as MapPinRaw, 
  Mail as MailRaw, 
  Calendar as CalendarRaw, 
  FileText as FileTextRaw, 
  X as XRaw, 
  UserCheck as UserCheckRaw, 
  Star as StarRaw, 
  Clock as ClockRaw,
  Cake as CakeRaw,
  ChevronRight as ChevronRightRaw,
  ExternalLink as ExternalLinkRaw,
  ShieldCheck as ShieldCheckRaw
} from 'lucide-react';

const Users = UsersRaw as any;
const Search = SearchRaw as any;
const Phone = PhoneRaw as any;
const MessageSquare = MessageSquareRaw as any;
const Sparkles = SparklesRaw as any;
const MapPin = MapPinRaw as any;
const Mail = MailRaw as any;
const Calendar = CalendarRaw as any;
const FileText = FileTextRaw as any;
const X = XRaw as any;
const UserCheck = UserCheckRaw as any;
const Star = StarRaw as any;
const Clock = ClockRaw as any;
const Cake = CakeRaw as any;
const ChevronRight = ChevronRightRaw as any;
const ExternalLink = ExternalLinkRaw as any;
const ShieldCheck = ShieldCheckRaw as any;

export const CollaboratorClientsRadar: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setClients(data);
      }
    } catch (e) {
      console.error('Erro ao buscar clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.cpf?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    return true;
  });




  const getFullAddressString = (addrJson: any) => {
    if (!addrJson) return null;
    const parts = [
      addrJson.logradouro,
      addrJson.bairro,
      addrJson.cidade,
      addrJson.estado
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050814] text-slate-100 pb-28">
      {/* 🚀 CYBER HEADER */}
      <header className="px-5 pt-8 pb-4 bg-[#070b19]/90 backdrop-blur-xl border-b border-[#00f0ff]/20 sticky top-0 z-40 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#00f0ff] font-extrabold uppercase tracking-widest">
              <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Gestão Inteligente</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Radar de Clientes
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                {clients.length}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-2xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center gap-1.5 text-xs font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              <Sparkles className="w-4 h-4 text-[#00f0ff]" />
              <span>CYBER HUB</span>
            </div>
          </div>
        </div>

        {/* 🔍 SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#00f0ff] absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#050814] border border-[#00f0ff]/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>


      </header>

      {/* 🚀 MAIN CONTENT */}
      <main className="flex-1 px-4 pt-4 space-y-3">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#00f0ff]/20 border-t-[#00f0ff] rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(0,240,255,0.4)]" />
            <p className="text-xs text-[#00f0ff] font-extrabold uppercase tracking-widest animate-pulse">Sincronizando Fichas de Clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-[#070b19] border border-slate-800 text-slate-400 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhum cliente encontrado</h3>
            <p className="text-xs text-slate-400">Tente buscar por outro nome ou utilize o botão "+" no menu inferior para cadastrar um novo cliente.</p>
          </div>
        ) : (
          filteredClients.map(client => {
            const addrStr = getFullAddressString(client.address_json);

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClientDetail(client)}
                className="p-4 rounded-3xl bg-[#070b19] border border-[#00f0ff]/20 hover:border-[#00f0ff]/60 transition-all cursor-pointer relative overflow-hidden group shadow-[0_8px_25px_rgba(0,0,0,0.6)]"
              >
                {/* Glow Accent Stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00f0ff] to-[#b000ff]" />

                <div className="flex items-center justify-between gap-3">
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00f0ff] via-[#b000ff] to-[#ff00a0] p-[2px] shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                        <img
                          src={client.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(client.name)}`}
                          alt={client.name}
                          className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                        />
                      </div>
                      {client.is_vip && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ffd700] border-2 border-[#070b19] flex items-center justify-center shadow-[0_0_8px_rgba(255,215,0,0.8)]">
                          <Star className="w-3 h-3 text-[#050814] fill-[#050814]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white truncate tracking-wide group-hover:text-[#00f0ff] transition-colors">
                          {client.name}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-400 font-medium">
                        {client.phone ? (
                          <span className="text-slate-300 font-bold">{client.phone}</span>
                        ) : (
                          <span className="italic text-slate-500">Sem telefone</span>
                        )}
                      </p>

                      {addrStr && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 truncate">
                          <MapPin className="w-3 h-3 text-[#00f0ff] flex-shrink-0" />
                          <span className="truncate">{addrStr}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>

                    <button
                      onClick={() => setSelectedClientDetail(client)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#00f0ff] transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 📄 MODAL FICHA DETALHADA DO CLIENTE */}
      {selectedClientDetail && (
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
          <div className="bg-[#070b19] border border-[#00f0ff]/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.3)] my-auto mx-auto max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Ficha do Cliente</h3>
              </div>
            </div>

            {/* Profile Avatar Card */}
            <div className="p-4 rounded-2xl bg-[#050814] border border-slate-800 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f0ff] via-[#b000ff] to-[#ff00a0] p-[2px] flex-shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                <img
                  src={selectedClientDetail.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedClientDetail.name)}`}
                  alt={selectedClientDetail.name}
                  className="w-full h-full object-cover rounded-[14px] bg-[#050814]"
                />
              </div>

              <div className="min-w-0">
                <h4 className="text-base font-black text-white">{selectedClientDetail.name}</h4>
                <p className="text-xs text-[#00f0ff] font-bold">{selectedClientDetail.phone || 'Sem telefone'}</p>
                {selectedClientDetail.is_vip && (
                  <span className="inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/40">
                    ⭐ CLIENTE VIP
                  </span>
                )}
              </div>
            </div>

            {/* Client Details Grid */}
            <div className="space-y-2.5">
              {/* CPF */}
              {selectedClientDetail.cpf && (
                <div className="p-3 rounded-2xl bg-[#050814] border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">🪪 CPF</span>
                  <span className="text-white font-black">{selectedClientDetail.cpf}</span>
                </div>
              )}

              {/* Email */}
              {selectedClientDetail.email && (
                <div className="p-3 rounded-2xl bg-[#050814] border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#00f0ff]" /> E-mail
                  </span>
                  <span className="text-white font-bold truncate max-w-[180px]">{selectedClientDetail.email}</span>
                </div>
              )}


              {/* Address */}
              {getFullAddressString(selectedClientDetail.address_json) && (
                <div className="p-3 rounded-2xl bg-[#050814] border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00f0ff]" /> Endereço
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullAddressString(selectedClientDetail.address_json) || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#00f0ff] font-extrabold flex items-center gap-1 hover:underline"
                    >
                      <span>Abrir GPS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-white font-medium text-xs leading-relaxed">
                    {getFullAddressString(selectedClientDetail.address_json)}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedClientDetail.notes && (
                <div className="p-3 rounded-2xl bg-[#050814] border border-slate-800 space-y-1 text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#ffd700]" /> Observações & Preferências
                  </span>
                  <p className="text-slate-200 italic">{selectedClientDetail.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons inside Modal */}
            <div className="pt-2 space-y-2">
              {selectedClientDetail.phone && (
                <>
                  <a
                    href={`https://wa.me/55${selectedClientDetail.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,211,102,0.4)]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WHATSAPP</span>
                  </a>
                  <a
                    href={`tel:${selectedClientDetail.phone.replace(/\D/g, '')}`}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#00a8ff] text-[#050814] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                  >
                    <Phone className="w-4 h-4" />
                    <span>FAZER CHAMADA</span>
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="w-full py-2.5 rounded-2xl border border-slate-700 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
