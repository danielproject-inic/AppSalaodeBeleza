import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, Users, Layers, Sparkles, Scissors, Edit3, Trash2, 
  Plus, X, Check, Clock 
} from 'lucide-react';
import VanillaTilt from 'vanilla-tilt';
import { useServices } from '../hooks/useServices';
import { useProfessionals } from '../hooks/useProfessionals';
import { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type Service = Database['public']['Tables']['services']['Row'];

const ServicesCatalog: React.FC = () => {
    const { services, loading, error, addService, updateService, deleteService, refresh } = useServices();
    const { professionals, loading: proLoading } = useProfessionals();

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    // Category Manager states
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [localNewCategories, setLocalNewCategories] = useState<string[]>(['Cabelo', 'Estética', 'Spa', 'Mão', 'Pés']);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');

    // Form states
    const [svcName, setSvcName] = useState('');
    const [svcCat, setSvcCat] = useState('');
    const [svcDesc, setSvcDesc] = useState('');
    const [svcTime, setSvcTime] = useState('');
    const [svcPrice, setSvcPrice] = useState('');
    const [commission, setCommission] = useState('');
    const [isVariablePrice, setIsVariablePrice] = useState(false);
    const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);
    const [searchCollab, setSearchCollab] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCollab, setFilterCollab] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Categories list (dynamic - from existing services + manually added)
    const categories = useMemo(() => {
        const cats = new Set([
            ...services.map(s => s.category).filter(Boolean),
            ...localNewCategories
        ]);
        return Array.from(cats).filter(Boolean);
    }, [services, localNewCategories]);

    const handleAddCategory = () => {
        const name = newCategoryName.trim();
        if (!name) return;
        const exists = categories.some(cat => cat.toLowerCase() === name.toLowerCase());
        if (!exists) {
            setLocalNewCategories(prev => [...prev, name]);
        }
        setSvcCat(name);
        setNewCategoryName('');
    };

    const handleRenameCategory = async (oldName: string, newName: string) => {
        const formattedNewName = newName.trim();
        if (!formattedNewName || oldName === formattedNewName) return;

        try {
            const { error: updateError } = await supabase
                .from('services')
                .update({ category: formattedNewName })
                .eq('category', oldName);

            if (updateError) throw updateError;

            if (localNewCategories.includes(oldName)) {
                setLocalNewCategories(prev => prev.map(c => c === oldName ? formattedNewName : c));
            }
            if (svcCat === oldName) {
                setSvcCat(formattedNewName);
            }
            if (refresh) {
                await refresh();
            }
        } catch (err: any) {
            console.error("Erro ao renomear categoria:", err.message);
        }
        setEditingCategory(null);
    };

    const handleDeleteCategory = async (catName: string) => {
        try {
            const { error: updateError } = await supabase
                .from('services')
                .update({ category: '' })
                .eq('category', catName);

            if (updateError) throw updateError;

            setLocalNewCategories(prev => prev.filter(c => c !== catName));

            if (svcCat === catName) {
                const remaining = categories.filter(c => c !== catName);
                setSvcCat(remaining[0] || '');
            }

            if (refresh) {
                await refresh();
            }
        } catch (err: any) {
            console.error("Erro ao deletar categoria:", err.message);
        }
    };

    useEffect(() => {
        const cards = document.querySelectorAll(".tilt-card");
        if (cards.length > 0) {
            VanillaTilt.init(Array.from(cards) as HTMLElement[], {
                max: 15,
                speed: 400,
                perspective: 1000,
                glare: true,
                "max-glare": 0.2,
            });
        }
    }, [services, searchQuery, filterCollab, filterCategory]);

    const filteredServices = services.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === '' || s.category === filterCategory;
        const matchesCollab = filterCollab === '' || (s.professionals && s.professionals.some((p: any) => p.professional?.id === filterCollab));
        return matchesSearch && matchesCategory && matchesCollab;
    });

    const handleOpenAdd = () => {
        setSvcName('');
        setSvcCat('');
        setSvcDesc('');
        setSvcTime('');
        setSvcPrice('');
        setCommission('');
        setIsVariablePrice(false);
        setSelectedCollabs([]);
        setSearchCollab('');
        setImagePreview(null);
        setIsEditing(false);
        setCurrentServiceId(null);
        setIsPanelOpen(true);
    };

    const handleEditService = (s: any) => {
        setSvcName(s.title);
        setSvcCat(s.category);
        setSvcDesc(s.description || '');
        setSvcTime(s.duration_minutes.toString());
        setSvcPrice(s.price.toString());
        setIsVariablePrice(s.is_variable_price || false);
        setImagePreview(s.image_url);
        const assignedIds = s.professionals ? s.professionals.map((p: any) => p.professional?.id).filter(Boolean) : [];
        setSelectedCollabs(assignedIds);
        setCommission(s.commission_percentage?.toString() || '');
        setIsEditing(true);
        setCurrentServiceId(s.id);
        setIsPanelOpen(true);
    };

    const handleSaveService = async () => {
        const serviceData: any = {
            title: svcName,
            category: svcCat,
            description: svcDesc,
            price: parseFloat(svcPrice) || 0,
            duration_minutes: parseInt(svcTime) || 0,
            image_url: imagePreview || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000',
            commission_percentage: parseFloat(commission) || 0,
            is_variable_price: isVariablePrice
        };

        if (isEditing && currentServiceId) {
            await updateService(currentServiceId, serviceData, selectedCollabs);
        } else {
            await addService(serviceData, selectedCollabs);
        }
        setIsPanelOpen(false);
    };

    const toggleCollaborator = (id: string) => {
        setSelectedCollabs(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    // Generate a unique, vibrant color based on ID
    const getServiceColor = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 85%, 60%)`;
    };

    return (
        <div className="w-full flex flex-col min-h-screen grid-hud relative overflow-hidden bg-[#0f172a] font-sans">
            <div className="hologram-bg"></div>

            {/* HEADER HUD */}
            <header className="h-32 px-12 mx-8 rounded-[1rem] mt-6 flex items-center justify-between relative overflow-hidden glass-hud border border-white/5">
                <div className="z-10 flex gap-12 items-center">
                    <div className="space-y-1">
                         <h1 className="text-xl lg:text-2xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Syne', sans-serif" }}>
                            Catálogo De <span className="text-amber-500">Serviços</span>
                         </h1>
                    </div>
                    <div className="hidden md:flex gap-8 border-l border-white/10 pl-8">
                         <div className="flex flex-col">
                              <span className="stat-badge text-slate-500 uppercase mb-0.5">Total Serviços</span>
                              <span className="text-xl font-black text-white text-glow" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {services.length}
                              </span>
                         </div>
                    </div>
                </div>

                <div className="z-10">
                    <button 
                        onClick={handleOpenAdd}
                        className="bg-white text-black font-black px-8 py-3.5 rounded-[0.8rem] flex items-center gap-3 hover:bg-amber-500 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] active:scale-95 group"
                    >
                         <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                         <span className="tracking-widest uppercase text-[8px]">Novo Serviço</span>
                    </button>
                </div>
            </header>

            {/* FILTERS SYSTEM */}
            <div className="px-12 py-3 mx-8 mt-2">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white/5 p-5 rounded-[1rem] border border-white/5 glass-hud relative overflow-hidden">
                      <div className="relative group">
                           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-amber-500 size-4 transition-colors" />
                           <input 
                                type="text" 
                                placeholder="BUSCAR POR NOME..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-[0.6rem] py-3 pl-14 pr-6 text-white font-black tracking-widest text-[9px] outline-none focus:border-amber-500/50 transition-all placeholder:text-amber-500 placeholder:opacity-70 text-center uppercase"
                           />
                      </div>

                      <div className="relative group">
                           <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-amber-500 size-4 transition-colors" />
                           <select 
                                value={filterCollab}
                                onChange={(e) => setFilterCollab(e.target.value)}
                                className="appearance-none w-full bg-white/5 border border-white/10 rounded-[0.6rem] py-3 pl-14 pr-10 text-white font-black tracking-widest text-[9px] outline-none focus:border-amber-500/50 transition-all uppercase text-center cursor-pointer"
                           >
                                <option value="" className="bg-[#0f172a]">TODOS COLABORADORES</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id} className="bg-[#0f172a]">{p.name.toUpperCase()}</option>
                                ))}
                           </select>
                           {filterCollab && (
                                <X 
                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-700 size-3 cursor-pointer hover:text-red-500 transition-colors"
                                    onClick={() => setFilterCollab('')}
                                />
                           )}
                      </div>

                      <div className="relative group">
                           <Layers className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-amber-500 size-4 transition-colors" />
                           <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="appearance-none w-full bg-white/5 border border-white/10 rounded-[0.6rem] py-3 pl-14 pr-10 text-white font-black tracking-widest text-[9px] outline-none focus:border-amber-500/50 transition-all uppercase text-center cursor-pointer"
                           >
                                <option value="" className="bg-[#0f172a]">TODAS CATEGORIAS</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat} className="bg-[#0f172a]">{cat.toUpperCase()}</option>
                                ))}
                           </select>
                           {filterCategory && (
                                <X 
                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-700 size-3 cursor-pointer hover:text-red-500 transition-colors"
                                    onClick={() => setFilterCategory('')}
                                />
                           )}
                      </div>
                 </div>
            </div>

            {/* GRID AREA */}
            <div className="flex-1 overflow-y-auto px-12 pb-32 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pt-6">
                      {filteredServices.map(s => {
                          const serviceColor = getServiceColor(s.id);
                          return (
                          <div key={s.id} className="tilt-card holographic-card rounded-[1rem] p-7 flex flex-col group max-w-[360px] mx-auto w-full h-full overflow-hidden">
                               
                               {/* VIBRANT IDENTITY BAND */}
                               <div 
                                    className="absolute top-0 left-0 w-full h-1.5 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:h-2"
                                    style={{ backgroundColor: serviceColor, boxShadow: `0 2px 15px ${serviceColor}` }}
                               ></div>
                               
                               {/* ACTIONS */}
                               <div className="absolute bottom-36 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
                                    <button 
                                        onClick={() => handleEditService(s)}
                                        className="size-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 flex items-center justify-center text-white hover:bg-amber-500 hover:text-black transition-all shadow-xl"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteConfirmId(s.id)}
                                        className="size-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all shadow-xl"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                               </div>

                               {/* HEADER */}
                               <div className="mb-12 flex justify-end items-center relative z-10 w-full">
                                    <div className="text-right">
                                         <span className="stat-badge text-slate-600 block mb-1 uppercase tracking-widest text-[7px]">COMISSÃO</span>
                                         <span className="text-xl font-black text-white text-glow" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            {s.commission_percentage}%
                                         </span>
                                    </div>
                               </div>

                               {/* TITLE */}
                               <div className="flex flex-col items-center justify-center space-y-3 mb-12 w-full relative z-10">
                                    <div className="flex flex-col items-center w-full px-4">
                                        <h3 
                                             className="text-[16px] font-black text-white italic tracking-tighter leading-[1.2] transition-colors text-center line-clamp-3 h-[60px] flex items-center justify-center w-full" 
                                             style={{ fontFamily: "'Syne', sans-serif" }}
                                        >
                                             {s.title}
                                        </h3>
                                    </div>
                                    <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[90%] text-center font-body line-clamp-2">
                                        {s.description || 'Sem descrição cadastrada para este protocolo.'}
                                    </p>
                               </div>

                               {/* STATS (DEMAND LEVEL RESTORED FROM PROTOTYPE) */}
                               <div className="bg-white/3 rounded-[0.8rem] p-5 mb-14 border border-white/5 text-center relative z-10">
                                    {(() => {
                                        const demand = 65 + (s.title.length % 30);
                                        const status = demand > 85 ? 'Alta' : demand > 75 ? 'Média' : 'Estável';
                                        return (
                                            <>
                                                <div className="flex flex-col items-center gap-1.5 mb-3">
                                                     <span className="stat-badge text-slate-500 uppercase tracking-widest text-[7px]">NÍVEL DE PROCURA</span>
                                                     <div className="flex items-center gap-1.5">
                                                         <span className="stat-badge font-bold uppercase" style={{ color: serviceColor }}>{demand}% ({status})</span>
                                                     </div>
                                                </div>
                                                <div className="h-1 w-full bg-slate-900/50 rounded-full overflow-hidden">
                                                     <div 
                                                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                                                        style={{ width: `${demand}%`, backgroundColor: serviceColor, boxShadow: `0 0 15px ${serviceColor}` }}
                                                     ></div>
                                                </div>
                                            </>
                                        );
                                    })()}
                               </div>

                               {/* FOOTER */}
                               <div className="mt-auto flex items-end justify-between px-1 relative z-10">
                                    <div className="flex flex-col items-center">
                                         <span className="stat-badge text-slate-700 uppercase tracking-widest mb-1 text-[7px]">DURAÇÃO</span>
                                         <div className="flex items-baseline gap-1">
                                              <span className="text-lg font-black text-white tracking-tighter">{s.duration_minutes}</span>
                                              <span className="text-[8px] font-black text-slate-600 uppercase">min</span>
                                         </div>
                                    </div>
                                    <div className="text-right flex flex-col items-center">
                                         <span className="stat-badge text-slate-700 uppercase tracking-widest mb-1 text-[7px]">{s.is_variable_price ? 'A PARTIR DE' : 'TOTAL'}</span>
                                         <div className="flex items-baseline justify-end gap-1">
                                              <span className="text-[10px] font-black text-slate-600">R$</span>
                                              <span className="text-3xl font-black text-white tracking-tighter text-glow">{s.price}</span>
                                         </div>
                                    </div>
                               </div>
                          </div>
                      ); })}
                 </div>
            </div>

            {/* SIDE PANEL */}
            <div className={`fixed inset-0 z-[120] flex justify-end transition-all duration-700 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div 
                    className={`absolute inset-0 bg-black/20 backdrop-blur-[4px] transition-opacity duration-300 ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                    onClick={() => setIsPanelOpen(false)}
                ></div>
                <div className="w-full max-w-xl bg-[#0f172a] border-l border-white/10 h-full relative z-[130] p-10 lg:p-12 overflow-y-auto custom-scrollbar flex flex-col items-center grid-hud shadow-2xl">
                    
                    <button 
                        onClick={() => setIsPanelOpen(false)}
                        className="absolute top-8 right-8 size-10 border border-white/10 rounded-[0.5rem] flex items-center justify-center text-slate-600 hover:text-white transition-all hover:bg-white/5 hover:rotate-90 duration-500 group"
                    >
                         <X size={20} className="transition-transform group-hover:scale-110" />
                    </button>

                    <div className="flex flex-col items-center justify-center mb-16 text-center">
                         <div className="space-y-3">
                              <h2 className="text-2xl lg:text-3xl font-black text-white italic uppercase tracking-tighter leading-[0.9] text-glow" style={{ fontFamily: "'Syne', sans-serif" }}>
                                {isEditing ? 'Editar' : 'Novo'}<br/><span className="text-amber-500">Protocolo</span>
                              </h2>
                              <div className="flex items-center justify-center gap-3">
                                   <div className="size-1.5 bg-amber-500 animate-pulse rounded-full"></div>
                                   <span className="stat-badge text-white/60 uppercase tracking-[0.4em]">Ficha de Registro</span>
                              </div>
                         </div>
                    </div>

                    <div className="space-y-8 w-full flex flex-col items-center">
                         {/* FORM AREA */}
                         <div className="bg-white/5 border border-white/5 rounded-[1rem] p-8 lg:p-10 space-y-10 w-full relative overflow-hidden shadow-inner">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-2 flex flex-col items-center">
                                       <label className="stat-badge text-amber-500 uppercase tracking-[0.4em]">Identificação</label>
                                       <input 
                                            type="text" 
                                            placeholder="NOME DO SERVIÇO" 
                                            value={svcName}
                                            onChange={(e) => setSvcName(e.target.value)}
                                            className="w-full bg-transparent border-b border-white/10 py-3 text-white font-black text-lg outline-none focus:border-amber-500 transition-all placeholder:text-white/45 text-center"
                                       />
                                  </div>
                                  <div className="space-y-2 flex flex-col items-center relative">
                                       <div className="flex items-center justify-center gap-2">
                                            <label className="stat-badge text-amber-500 uppercase tracking-[0.4em]">Categoria</label>
                                            <button 
                                                onClick={() => setShowCategoryManager(true)}
                                                className="size-5 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-black transition-all mb-0.5"
                                            >
                                                <Plus size={12} />
                                            </button>
                                       </div>
                                       <select 
                                            value={svcCat}
                                            onChange={(e) => setSvcCat(e.target.value)}
                                            className="w-full bg-transparent border-b border-white/10 py-3 text-white font-black uppercase text-md outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer text-center"
                                       >
                                            {svcCat === '' && <option value="" className="bg-[#0f172a]" disabled>SELECIONE...</option>}
                                            {categories.map(cat => (
                                                <option key={cat} value={cat} className="bg-[#0f172a]">{cat.toUpperCase()}</option>
                                            ))}
                                       </select>
                                  </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-2 flex flex-col items-center">
                                       <label className="stat-badge text-amber-500 uppercase tracking-[0.4em]">Financeiro</label>
                                       <div className="relative w-full flex justify-center items-center">
                                            <span className="absolute left-4 bottom-3 text-amber-500/80 font-black text-sm">R$</span>
                                            <input 
                                                type="number" 
                                                placeholder="00.00" 
                                                value={svcPrice}
                                                onChange={(e) => setSvcPrice(e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 py-2 text-white font-black text-2xl outline-none focus:border-amber-500 transition-all font-mono tracking-normal text-center placeholder:text-white/45"
                                            />
                                       </div>
                                  </div>
                                  <div className="space-y-2 flex flex-col items-center">
                                       <label className="stat-badge text-amber-500 uppercase tracking-[0.4em]">Comissão</label>
                                       <div className="relative w-full flex justify-center items-center">
                                            <input 
                                                type="number" 
                                                placeholder="00" 
                                                value={commission}
                                                onChange={(e) => setCommission(e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 py-2 text-white font-black text-2xl outline-none focus:border-amber-500 transition-all font-mono tracking-normal text-center placeholder:text-white/45"
                                            />
                                            <span className="absolute right-4 bottom-3 text-amber-500/80 font-extrabold text-lg">%</span>
                                       </div>
                                  </div>
                             </div>

                             <div className="flex justify-center items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-4 w-full">
                                  <label className="text-white text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-3 select-none">
                                       <input
                                            type="checkbox"
                                            checked={isVariablePrice}
                                            onChange={(e) => setIsVariablePrice(e.target.checked)}
                                            className="size-4 rounded border-white/10 bg-transparent text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                       />
                                       Preço Variável (A partir de)
                                  </label>
                             </div>

                             <div className="grid grid-cols-1 gap-8">
                                  <div className="space-y-2 flex flex-col items-center">
                                       <label className="stat-badge text-amber-500 uppercase tracking-[0.4em]">Duração Estimada</label>
                                       <div className="relative w-1/2 flex justify-center items-center">
                                            <input 
                                                type="number" 
                                                placeholder="00" 
                                                value={svcTime}
                                                onChange={(e) => setSvcTime(e.target.value)}
                                                className="w-full bg-transparent border-b border-white/10 py-2 text-white font-black text-3xl outline-none focus:border-amber-500 transition-all font-mono text-center tracking-normal placeholder:text-white/45"
                                            />
                                            <span className="absolute right-2 bottom-3 text-amber-500/80 font-black text-[9px]">MIN</span>
                                       </div>
                                  </div>
                             </div>

                             <div className="space-y-4 flex flex-col items-center">
                                  <label className="stat-badge text-amber-500 uppercase tracking-[0.4em]">Resumo do Protocolo</label>
                                  <textarea 
                                    placeholder="DESCREVA OS DETALHES TÉCNICOS..." 
                                    value={svcDesc}
                                    onChange={(e) => setSvcDesc(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-[1rem] p-6 text-white font-medium text-sm outline-none focus:border-amber-500/50 transition-all h-28 resize-none placeholder:text-white/45 text-center"
                                  ></textarea>
                             </div>
                         </div>

                         {/* ASSOCIATED AGENTS */}
                         <div className="space-y-5 px-4 flex flex-col items-center w-full pb-10">
                              <label className="stat-badge text-amber-500 uppercase tracking-[0.6em]">Agentes Associados</label>
                              <div className="flex flex-wrap gap-4 justify-center">
                                    {professionals.map(collab => (
                                        <button 
                                            key={collab.id}
                                            onClick={() => toggleCollaborator(collab.id)}
                                            className={`px-7 py-4 border-2 font-black rounded-[1rem] text-[9px] uppercase tracking-widest transition-all ${
                                                selectedCollabs.includes(collab.id) 
                                                ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-lg' 
                                                : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {collab.name}
                                        </button>
                                    ))}
                              </div>
                         </div>
                    </div>

                    {/* FOOTER BUTTONS */}
                    <div className="mt-auto pt-16 flex gap-5 w-full">
                         <button 
                            onClick={() => setIsPanelOpen(false)} 
                            className="flex-1 py-6 border border-white/5 text-slate-300 font-black text-[9px] uppercase tracking-[0.4em] rounded-[1rem] hover:text-amber-500 hover:border-amber-500/30 transition-all"
                         >
                            Cancelar
                         </button>
                         <button 
                            onClick={handleSaveService}
                            className="flex-[2] py-6 bg-amber-500 text-black font-black text-[9px] uppercase tracking-[0.4em] rounded-[1rem] shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:bg-white transition-all"
                         >
                            {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
                         </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200 glass-hud">
                        <div className="flex items-center justify-center mb-4">
                            <div className="size-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-center text-white mb-2 uppercase tracking-tighter italic">Excluir Serviço?</h3>
                        <p className="text-xs text-center text-slate-500 mb-6 font-body uppercase tracking-widest font-black">
                            Esta ação não pode ser desfeita. O serviço será removido permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-3 px-4 rounded-lg border border-white/10 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    await deleteService(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }}
                                className="flex-1 py-3 px-4 rounded-lg bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all hover:bg-red-600"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Manager Modal */}
            {showCategoryManager && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200 glass-hud flex flex-col max-h-[85vh]">
                        
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Layers size={18} className="text-amber-500" />
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Gerenciar Categorias</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowCategoryManager(false);
                                    setEditingCategory(null);
                                }}
                                className="size-8 border border-white/10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all hover:bg-white/5"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Add New Category */}
                        <div className="mb-6 space-y-2">
                            <label className="stat-badge text-slate-400 uppercase tracking-widest text-[8px] block">Nova Categoria</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="NOME DA CATEGORIA..." 
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddCategory();
                                    }}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-bold text-xs uppercase outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600"
                                />
                                <button 
                                    onClick={handleAddCategory}
                                    className="px-4 bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-white transition-all flex items-center gap-1.5"
                                >
                                    <Plus size={12} />
                                    Adicionar
                                </button>
                            </div>
                        </div>

                        {/* List of Categories */}
                        <label className="stat-badge text-slate-400 uppercase tracking-widest text-[8px] mb-2 block">Categorias Existentes</label>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[40vh]">
                            {categories.map(cat => {
                                const isEditingThis = editingCategory === cat;
                                return (
                                    <div key={cat} className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-lg hover:bg-white/5 transition-all">
                                        {isEditingThis ? (
                                            <div className="flex-1 flex gap-2 items-center mr-2">
                                                <input 
                                                    type="text" 
                                                    value={editCategoryName}
                                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenameCategory(cat, editCategoryName);
                                                    }}
                                                    className="flex-1 bg-white/5 border border-amber-500/30 rounded px-2 py-1 text-white font-bold text-xs uppercase outline-none"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => handleRenameCategory(cat, editCategoryName)}
                                                    className="size-7 bg-green-500/10 border border-green-500/20 text-green-500 rounded flex items-center justify-center hover:bg-green-500 hover:text-black transition-all"
                                                >
                                                    <Check size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => setEditingCategory(null)}
                                                    className="size-7 bg-white/5 border border-white/10 text-slate-500 rounded flex items-center justify-center hover:text-white transition-all"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-white font-black tracking-wider text-xs uppercase">{cat}</span>
                                                <div className="flex gap-1.5">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingCategory(cat);
                                                            setEditCategoryName(cat);
                                                        }}
                                                        className="size-7 bg-white/5 border border-white/10 text-slate-400 rounded flex items-center justify-center hover:bg-amber-500 hover:text-black hover:border-amber-500 transition-all"
                                                        title="Renomear"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCategory(cat)}
                                                        className="size-7 bg-white/5 border border-white/10 text-slate-400 rounded flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t border-white/5 flex">
                            <button
                                onClick={() => {
                                    setShowCategoryManager(false);
                                    setEditingCategory(null);
                                }}
                                className="w-full py-3 rounded-lg border border-white/10 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest bg-white/5 transition-all text-center"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="fixed bottom-4 right-4 z-[300] bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl font-black tracking-widest text-[10px] uppercase animate-bounce text-center">
                    {error}
                </div>
            )}
        </div>
    );
};

export default ServicesCatalog;
