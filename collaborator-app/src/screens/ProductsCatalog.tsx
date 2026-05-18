import React, { useState, useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Database } from '../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

const ProductsCatalog: React.FC = () => {
 const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();

 const [searchTerm, setSearchTerm] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('Todas Categorias');
 const [statusFilter, setStatusFilter] = useState('Status: Todos');
 const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

 // Modal/Panel states
 const [isPanelOpen, setIsPanelOpen] = useState(false);
 const [isEditing, setIsEditing] = useState(false);

 // Product form state
 const [prodName, setProdName] = useState('');
 const [prodCat, setProdCat] = useState('Cabelo');
 const [prodDesc, setProdDesc] = useState('');
 const [prodPrice, setProdPrice] = useState('');
 const [prodStock, setProdStock] = useState('');
 const [prodMinStock, setProdMinStock] = useState('5');
 const [prodImage, setProdImage] = useState('');

 const resetForm = () => {
 setProdName('');
 setProdCat('Cabelo');
 setProdDesc('');
 setProdPrice('');
 setProdStock('');
 setProdMinStock('5');
 setProdImage('');
 setIsEditing(false);
 };

 const handleEditProduct = () => {
 if (!selectedProduct) return;
 setProdName(selectedProduct.name);
 setProdCat(selectedProduct.category || 'Cabelo');
 setProdDesc(selectedProduct.description || '');
 setProdPrice(selectedProduct.price?.toString() || '');
 setProdStock(selectedProduct.stock_quantity?.toString() || '');
 setProdMinStock((selectedProduct.min_stock_level || 5).toString());
 setProdImage(selectedProduct.image_url || '');
 setIsEditing(true);
 setIsPanelOpen(true);
 };

 const handleDeleteProduct = async () => {
 if (!selectedProduct) return;
 if (window.confirm(`Deseja realmente excluir o produto ${selectedProduct.name}?`)) {
 const success = await deleteProduct(selectedProduct.id);
 if (success) {
 setSelectedProduct(null);
 }
 }
 };

 const handleUpdateStock = async (id: string, delta: number) => {
 const product = products.find(p => p.id === id);
 if (!product) return;
 const newStock = Math.max(0, (product.stock_quantity || 0) + delta);
 await updateProduct(id, { stock_quantity: newStock });
 };

 const handleSaveProduct = async () => {
 const productData = {
 name: prodName,
 category: prodCat,
 description: prodDesc,
 price: parseFloat(prodPrice) || 0,
 stock_quantity: parseInt(prodStock) || 0,
 min_stock_level: parseInt(prodMinStock) || 5,
 image_url: prodImage || null
 };

 if (isEditing && selectedProduct) {
 await updateProduct(selectedProduct.id, productData);
 } else {
 await addProduct(productData);
 }
 setIsPanelOpen(false);
 resetForm();
 };

 useEffect(() => {
 if (products.length > 0 && !selectedProduct) {
 setSelectedProduct(products[0]);
 } else if (selectedProduct) {
 const updated = products.find(p => p.id === selectedProduct.id);
 if (updated) setSelectedProduct(updated);
 }
 }, [products, selectedProduct]);

 const filteredProducts = products.filter(product => {
 const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

 if (!matchesSearch) return false;

 if (categoryFilter !== 'Todas Categorias' && product.category !== categoryFilter) return false;

 if (statusFilter !== 'Status: Todos') {
 const status = (product.stock_quantity || 0) === 0 ? 'Esgotado' :
 (product.stock_quantity || 0) <= (product.min_stock_level || 5) ? 'Baixo Estoque' : 'Disponível';
 if (statusFilter !== status) return false;
 }

 return true;
 });

 return (
  <div className="bg-transparent text-slate-800 font-sans h-full flex flex-col overflow-hidden relative">
   {/* Coming Soon Overlay */}
   <div className="absolute inset-0 z-[100] bg-white/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
     <div className="bg-[#0f172a]/95 text-white px-10 py-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-700 pointer-events-auto">
       <div className="w-20 h-20 rounded-2xl bg-amber-600/20 flex items-center justify-center border border-amber-600/30 mb-2">
         <span className="material-symbols-outlined text-5xl text-amber-500 animate-pulse">inventory_2</span>
       </div>
       <h3 className="text-3xl font-black tracking-tighter uppercase text-white">Disponível em Breve</h3>
       <p className="text-[11px] font-black text-amber-600/80 uppercase tracking-[0.25em] text-center max-w-[250px] leading-relaxed">
         ESTAMOS PREPARANDO O MELHOR CATÁLOGO PARA VOCÊ
       </p>
     </div>
   </div>
 <div className="flex flex-1 overflow-hidden relative">
 <main className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-300 bg-transparent z-10">
 <div className="px-8 py-6 flex flex-col gap-4 border-b border-slate-300">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-h2 text-slate-800">Catálogo de Produtos</h2>
 <p className="text-body-sm text-amber-600 mt-1">Gerencie seu estoque e preços</p>
 </div>
 <button
 onClick={() => { setIsEditing(false); setIsPanelOpen(true); }}
 className="flex items-center gap-2 px-6 h-11 rounded-xl bg-[#f5c73d] hover:bg-black text-slate-800 font-bold shadow-[0_0_15px_rgba(245,199,61,0.3)] hover:shadow-lg transition-all transform hover:-translate-y-0.5"
 >
 <span className="material-symbols-outlined">add</span>
 <span>Adicionar Novo Produto</span>
 </button>
 </div>
 <div className="flex gap-4 mt-2">
 <div className="relative flex-1 group">
 <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 group-focus-within:text-[#f5c73d] transition-colors">search</span>
 <input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#e8e2d4]/40 border border-slate-300 focus:border-[#f5c73d] focus:ring-1 focus:ring-[#f5c73d] placeholder-[#9c8749]/60 text-body font-sans outline-none"
 placeholder="Buscar por nome ou categoria..."
 type="text"
 />
 </div>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="px-4 py-2 rounded-xl bg-[#e8e2d4]/40 border border-slate-300 text-body font-bold text-amber-600 focus:border-[#f5c73d] focus:ring-[#f5c73d] cursor-pointer outline-none"
 >
 <option>Todas Categorias</option>
 <option>Cabelo</option>
 <option>Manicure</option>
 <option>Estética</option>
 <option>Maquiagem</option>
 </select>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2 rounded-xl bg-[#e8e2d4]/40 border border-slate-300 text-body font-bold text-amber-600 focus:border-[#f5c73d] focus:ring-[#f5c73d] cursor-pointer outline-none"
 >
 <option>Status: Todos</option>
 <option>Disponível</option>
 <option>Baixo Estoque</option>
 <option>Esgotado</option>
 </select>
 <button className="px-4 py-2 rounded-xl border border-slate-300 text-amber-600 hover:bg-[#e8e2d4]/40 transition-colors" title="Mais Filtros">
 <span className="material-symbols-outlined">tune</span>
 </button>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="text-label text-amber-600 uppercase border-b border-slate-300">
 <th className="px-4 py-3 font-bold tracking-wider">Produto</th>
 <th className="px-4 py-3 font-bold tracking-wider text-right">Preço</th>
 <th className="px-4 py-3 font-bold tracking-wider text-center">Estoque</th>
 <th className="px-4 py-3 font-bold tracking-wider text-center">Status</th>
 <th className="px-4 py-3 font-bold tracking-wider text-right">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#f4f0e7]">
 {loading ? (
 <tr>
 <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
 Carregando produtos...
 </td>
 </tr>
 ) : filteredProducts.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
 Nenhum produto encontrado.
 </td>
 </tr>
 ) : (
 filteredProducts.map((product) => {
 const status = (product.stock_quantity || 0) === 0 ? { label: 'Esgotado', color: 'bg-red-500/10 text-red-700 border-red-100', dot: 'bg-red-500/100' } :
 (product.stock_quantity || 0) <= (product.min_stock_level || 5) ? { label: 'Baixo', color: ' shadow-md text-white/10 text-cyan-700 border-cyan-500/20', dot: ' bg-cyan-500 text-white shadow-md' } :
 { label: 'Disponível', color: 'bg-green-500/10 text-green-700 border-green-100', dot: 'bg-emerald-500' };

 return (
 <tr
 key={product.id}
 onClick={() => setSelectedProduct(product)}
 className={`group hover:bg-[#fffdf5] transition-colors cursor-pointer border-l-4 ${selectedProduct?.id === product.id ? 'border-[#f5c73d] bg-[#fffdf5]' : 'border-transparent'}`}
 >
 <td className="px-4 py-4">
 <div className="flex items-center gap-3">
 <div
 className="size-12 rounded-lg bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl bg-center bg-cover border border-slate-300"
 style={{ backgroundImage: product.image_url ? `url("${product.image_url}")` : undefined }}
 >
 {!product.image_url && (
 <div className="w-full h-full flex items-center justify-center text-slate-400">
 <span className="material-symbols-outlined">inventory_2</span>
 </div>
 )}
 </div>
 <div>
 <p className="text-body-bold text-slate-800">{product.name}</p>
 <p className="text-label text-amber-600">{product.category}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-4 text-right">
 <span className="font-bold text-slate-800">R$ {(product.price || 0).toFixed(2)}</span>
 </td>
 <td className="px-4 py-4 text-center">
 <span className={`text-sm font-bold ${(product.stock_quantity || 0) <= (product.min_stock_level || 5) ? 'text-red-600' : 'text-amber-600'}`}>
 {product.stock_quantity || 0} un
 </span>
 </td>
 <td className="px-4 py-4 text-center">
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${status.color}`}>
 <span className={`size-1.5 rounded-full ${status.dot}`}></span>
 {status.label}
 </span>
 </td>
 <td className="px-4 py-4 text-right">
 <button
 onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
 className="text-[#f5c73d] hover:text-[#d4a72c] transition-colors p-1"
 title="Ver Detalhes"
 >
 <span className="material-symbols-outlined text-lg">arrow_forward_ios</span>
 </button>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 <div className="p-4 border-t border-slate-300 flex justify-between items-center text-xs">
 <span className="text-amber-600">Mostrando 1-4 de {filteredProducts.length} produtos</span>
 <div className="flex gap-2">
 <button className="px-3 py-1 rounded border border-slate-300 text-amber-600 hover:bg-[#f4f0e7]">Anterior</button>
 <button className="px-3 py-1 rounded bg-[#0f172a] text-white font-bold">1</button>
 <button className="px-3 py-1 rounded border border-slate-300 text-amber-600 hover:bg-[#f4f0e7]">2</button>
 <button className="px-3 py-1 rounded border border-slate-300 text-amber-600 hover:bg-[#f4f0e7]">Próximo</button>
 </div>
 </div>
 </main>

 <aside className="w-[480px] bg-[#e8e2d4]/40 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.03)] border-l border-slate-300 flex flex-col z-20 overflow-hidden transform transition-transform hidden xl:flex">
 {!selectedProduct ? (
 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
 <span className="material-symbols-outlined text-6xl text-[#e8e2ce] mb-4">inventory_2</span>
 <p className="text-body-bold text-amber-600">Selecione um produto para ver os detalhes</p>
 </div>
 ) : (
 <>
 <div className="p-6 pb-2 shrink-0">
 <div className="flex justify-between items-start mb-4">
 <div
 onClick={() => setSelectedProduct(null)}
 className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wide cursor-pointer hover:text-[#f5c73d]"
 >
 <span className="material-symbols-outlined text-sm">arrow_back</span>
 Voltar
 </div>
 <div className="flex gap-2">
 <button
 onClick={handleDeleteProduct}
 className="size-8 flex items-center justify-center rounded-lg hover:bg-red-500/100/10 text-amber-600 hover:text-red-600 transition-colors"
 title="Excluir"
 >
 <span className="material-symbols-outlined text-lg">delete</span>
 </button>
 <button
 onClick={handleEditProduct}
 className="size-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-slate-300 hover:border-cyan-200 hover:shadow transition-all rounded-xl text-amber-600 hover:text-slate-800 transition-colors"
 title="Editar"
 >
 <span className="material-symbols-outlined text-lg">edit</span>
 </button>
 </div>
 </div>
 <div className="flex items-start justify-between gap-4">
 <h2 className="text-2xl font-black text-slate-800 leading-tight">{selectedProduct.name}</h2>
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${selectedProduct.stock_quantity === 0 ? 'bg-red-100 text-red-700' :
 (selectedProduct.stock_quantity || 0) <= (selectedProduct.min_stock_level || 5) ? ' shadow-md text-white/15 text-cyan-700' :
 'bg-green-100 text-green-700'
 }`}>
 {(selectedProduct.stock_quantity || 0) === 0 ? 'Esgotado' :
 (selectedProduct.stock_quantity || 0) <= (selectedProduct.min_stock_level || 5) ? 'Baixo' : 'Disponível'}
 </span>
 </div>
 <p className="text-amber-600 text-sm mt-1">ID: #{selectedProduct.id.slice(0, 8)}</p>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-2">
 <div
 className="aspect-video w-full rounded-2xl bg-white border border-slate-300 shadow-sm hover:shadow-md transition-all rounded-xl mb-6 bg-center bg-cover shadow-none relative group overflow-hidden"
 style={{ backgroundImage: selectedProduct.image_url ? `url("${selectedProduct.image_url}")` : undefined }}
 >
 {!selectedProduct.image_url && (
 <div className="absolute inset-0 flex items-center justify-center text-slate-500">
 <span className="material-symbols-outlined text-6xl">inventory_2</span>
 </div>
 )}
 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
 </div>
 <div className="grid grid-cols-2 gap-3 mb-6">
 <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-none">
 <p className="text-xs text-amber-600 font-bold uppercase mb-1">Preço Venda</p>
 <p className="text-xl font-black text-[#d4a72c]">R$ {(selectedProduct.price || 0).toFixed(2)}</p>
 </div>
 <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-none">
 <p className="text-xs text-amber-600 font-bold uppercase mb-1">Estoque</p>
 <p className="text-xl font-black text-slate-800">{selectedProduct.stock_quantity || 0} <span className="text-xs font-normal text-amber-600">unidades</span></p>
 </div>
 </div>
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
 <span className="material-symbols-outlined text-[#f5c73d]">info</span>
 Informações Gerais
 </h3>
 <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-3">
 <div className="flex justify-between py-1 border-b border-dashed border-slate-300">
 <span className="text-sm text-amber-600">Categoria</span>
 <span className="text-sm font-medium text-slate-800">{selectedProduct.category}</span>
 </div>
 <div className="pt-1">
 <span className="text-sm text-amber-600 block mb-1">Descrição</span>
 <p className="text-sm text-slate-800 leading-relaxed">
 {selectedProduct.description || 'Nenhuma descrição fornecida.'}
 </p>
 </div>
 </div>
 </div>
 <div>
 <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
 <span className="material-symbols-outlined text-[#f5c73d]">swap_vert</span>
 Controle de Estoque
 </h3>
 <div className="bg-white p-4 rounded-xl border border-slate-300">
 <div className="flex items-center justify-between gap-4 mb-3">
 <button
 onClick={() => handleUpdateStock(selectedProduct.id, -1)}
 className="flex-1 py-2 rounded-lg border border-red-200 bg-red-500/10 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors flex justify-center items-center gap-1"
 >
 <span className="material-symbols-outlined text-sm">remove</span> Saída
 </button>
 <div className="w-20 text-center font-mono font-bold text-lg">{selectedProduct.stock_quantity || 0}</div>
 <button
 onClick={() => handleUpdateStock(selectedProduct.id, 1)}
 className="flex-1 py-2 rounded-lg border border-green-200 bg-green-500/10 text-green-600 font-bold text-sm hover:bg-green-100 transition-colors flex justify-center items-center gap-1"
 >
 <span className="material-symbols-outlined text-sm">add</span> Entrada
 </button>
 </div>
 <p className="text-xs text-center text-amber-600">Mínimo para alerta: {selectedProduct.min_stock_level || 5} un</p>
 </div>
 </div>
 </div>
 </div>
 <div className="p-6 border-t border-slate-300 bg-white">
 <button className="w-full py-4 rounded-xl bg-[#0f172a] text-white font-bold shadow-lg hover:shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
 <span className="material-symbols-outlined text-[#f5c73d]">shopping_cart_checkout</span>
 Registrar Venda
 </button>
 </div>
 </>
 )}
 </aside>
 </div>

 {/* Slide-over Panel for Add/Edit Product */}
 {isPanelOpen && (
 <>
 <div
 className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
 onClick={() => setIsPanelOpen(false)}
 ></div>
 <aside className="fixed right-0 top-0 w-[450px] h-full bg-white shadow-2xl z-[70] flex flex-col transform transition-transform animate-in slide-in-">
 <div className="p-6 border-b border-slate-300 flex justify-between items-center bg-[#e8e2d4]/40">
 <div>
 <h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h3>
 <p className="text-xs text-amber-600">{isEditing ? 'Atualize as informações do item.' : 'Cadastre um novo item no catálogo.'}</p>
 </div>
 <button
 onClick={() => setIsPanelOpen(false)}
 className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
 >
 <span className="material-symbols-outlined">close</span>
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">Nome do Produto</label>
 <input
 type="text"
 value={prodName}
 onChange={(e) => setProdName(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#f5c73d] focus:ring-1 focus:ring-[#f5c73d] outline-none"
 placeholder="Ex: Máscara Hidratante 500g"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">Categoria</label>
 <select
 value={prodCat}
 onChange={(e) => setProdCat(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none"
 >
 <option>Cabelo</option>
 <option>Manicure</option>
 <option>Estética</option>
 <option>Maquiagem</option>
 <option>Outros</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">Preço (R$)</label>
 <input
 type="number"
 value={prodPrice}
 onChange={(e) => setProdPrice(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none"
 placeholder="0,00"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">Estoque Inicial</label>
 <input
 type="number"
 value={prodStock}
 onChange={(e) => setProdStock(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none"
 placeholder="0"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">Estoque Mínimo</label>
 <input
 type="number"
 value={prodMinStock}
 onChange={(e) => setProdMinStock(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none"
 placeholder="5"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">Descrição</label>
 <textarea
 value={prodDesc}
 onChange={(e) => setProdDesc(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none resize-none"
 rows={4}
 placeholder="Detalhes sobre o produto..."
 />
 </div>

 <div>
 <label className="block text-xs font-bold text-amber-600 uppercase mb-1">URL da Imagem</label>
 <input
 type="text"
 value={prodImage}
 onChange={(e) => setProdImage(e.target.value)}
 className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none"
 placeholder="https://exemplo.com/imagem.jpg"
 />
 </div>
 </div>
 </div>

 <div className="p-6 border-t border-slate-300 bg-[#e8e2d4]/40 flex gap-3">
 <button
 onClick={() => setIsPanelOpen(false)}
 className="flex-1 py-4 rounded-xl border border-slate-300 text-amber-600 font-bold hover:bg-white transition-colors"
 >
 Cancelar
 </button>
 <button
 onClick={handleSaveProduct}
 className="flex-1 py-4 rounded-xl bg-[#0f172a] text-white font-bold shadow-lg hover:shadow-xl transition-all"
 >
 {isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
 </button>
 </div>
 </aside>
 </>
 )}

 {/* Error Display */}
 {error && (
 <div className="fixed bottom-4 right-4 z-[100] bg-red-600 text-slate-800 px-6 py-3 rounded-lg shadow-xl animate-bounce font-bold">
 {error}
 </div>
 )}
 </div>
 );
};

export default ProductsCatalog;
