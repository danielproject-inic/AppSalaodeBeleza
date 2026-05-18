import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Filter, Heart } from 'lucide-react';
import { useSalon } from '../contexts/SalonContext';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category: string;
    stock_quantity: number;
}

const Store: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (!error && data) {
                setProducts(data);
            }
            setLoading(false);
        };

        fetchProducts();
    }, []);

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = !selectedCategory || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const { salonName } = useSalon();

    return (
        <motion.div
            className="p-6 pb-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <header className="mb-10 pt-4 md:pt-0">
                <div className="flex justify-between items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl md:text-3xl font-black text-stone-900 tracking-tighter uppercase italic">Vitrine {salonName}</h1>
                        <p className="text-magenta-600 text-xs mt-1 font-black uppercase tracking-widest italic">Excelência em cada detalhe de auto-cuidado</p>
                    </motion.div>
                    <div className="flex gap-3">
                        {/* Hidden on desktop header, moved to search bar line */}
                    </div>
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-4 max-w-4xl">
                    <div className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/80 border border-stone-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all outline-none backdrop-blur-xl text-stone-900 font-medium"
                            />
                        </div>
                        <button className="px-5 py-2 bg-stone-100 border border-stone-200 text-stone-600 rounded-2xl transition-all flex items-center gap-2 group whitespace-nowrap shadow-sm hover:bg-stone-200">
                            <Filter className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Filtrar</span>
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!selectedCategory
                                ? 'bg-stone-800 border-stone-800 text-amber-50 shadow-[0_4px_15px_rgba(41,37,36,0.2)]'
                                : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-stone-800 border-stone-800 text-amber-50 shadow-[0_4px_15px_rgba(41,37,36,0.2)]'
                                    : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-magenta-500/20 border-t-magenta-400 rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Explorando vitrine...</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((product, i) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 + 0.3 }}
                            whileHover={{ y: -8 }}
                            className="glass-card p-4 group flex flex-col cursor-pointer border-white/5 hover:border-magenta-500/30 transition-all relative"
                        >
                            <div className="aspect-square rounded-2xl bg-slate-50 mb-4 overflow-hidden relative border border-slate-100">
                                <img
                                    src={product.image_url || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400'}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                                />
                                <div className="absolute top-2 right-2">
                                    <button className="p-2 rounded-lg bg-black/50 backdrop-blur-md text-white/50 hover:text-magenta-400 transition-colors">
                                        <Heart className="w-4 h-4" />
                                    </button>
                                </div>
                                {!product.stock_quantity || product.stock_quantity === 0 ? (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                                        <span className="text-[10px] font-black text-red-700 uppercase tracking-[0.2em] border border-red-700 px-3 py-1">Esgotado</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-1 mb-4 flex-1">
                                <span className="text-[8px] font-black text-magenta-500 uppercase tracking-widest">{product.category || 'Premium'}</span>
                                <h3 className="text-base font-black text-stone-900 leading-tight tracking-tighter uppercase italic line-clamp-1">{product.name}</h3>
                                <p className="text-stone-600 text-[10px] leading-relaxed line-clamp-2 font-black uppercase tracking-tight italic">
                                    {product.description || 'Fórmula exclusiva desenvolvida com tecnologia de ponta para resultados extraordinários.'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                                <span className="text-lg font-black text-amber-600 tracking-tighter italic drop-shadow-sm">
                                    R$ {Number(product.price).toFixed(2)}
                                </span>
                                <button
                                    className="w-10 h-10 rounded-xl bg-magenta-500/10 text-magenta-500 flex items-center justify-center group-hover:bg-magenta-500 group-hover:text-black transition-all shadow-[0_0_15px_rgba(217,70,239,0)] group-hover:shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Center Notice: DISPONÍVEL EM BREVE */}
            <div className="mt-20 flex flex-col items-center justify-center text-center py-16 px-6 relative overflow-hidden rounded-[2.5rem] border border-dashed border-white/10 bg-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-magenta-500/5 to-cyan-500/5 pointer-events-none" />
                
                <div className="w-20 h-20 rounded-3xl bg-magenta-500/10 flex items-center justify-center mb-6 border border-magenta-500/20 shadow-[0_0_30px_rgba(217,70,239,0.1)]">
                    <ShoppingBag className="w-10 h-10 text-magenta-500" />
                </div>

                <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-stone-900 mb-2 italic">Vitrine Exclusiva</h2>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-magenta-500" />
                    <span className="text-sm font-black text-magenta-500 uppercase tracking-[.3em] animate-pulse">Disponível em breve</span>
                    <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-magenta-500" />
                </div>

                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                    Estamos preparando uma seleção especial de produtos profissionais para você adquirir diretamente pelo aplicativo.
                </p>

                {/* Decorative Elements */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-magenta-500/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-cyan-400/5 rounded-full blur-3xl opacity-50" />
            </div>
        </motion.div>
    );
};

export default Store;
