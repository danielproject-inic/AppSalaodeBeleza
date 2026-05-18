import React, { useState } from 'react';

import { SimulationResult } from '../hooks/useCommissions';

interface CommissionClosingModalProps {
 isOpen: boolean;
 simulationData: SimulationResult[];
 onClose: () => void;
 onConfirm: () => void;
}

const CommissionClosingModal: React.FC<CommissionClosingModalProps> = ({ isOpen, simulationData, onClose, onConfirm }) => {
 const [isProcessing, setIsProcessing] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);

 if (!isOpen) return null;

 const formatBRL = (val: number) => {
 return new Intl.NumberFormat('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 }).format(val);
 };

 const eligiblePros = simulationData.filter(sim => sim.netValue > 0);
 const totalPayout = eligiblePros.reduce((acc, curr) => acc + curr.netValue, 0);

 const handleConfirm = () => {
 setIsProcessing(true);
 // Simulate API call and processing
 setTimeout(() => {
 setIsProcessing(false);
 setIsSuccess(true);
 setTimeout(() => {
 onConfirm(); // Callback to parent to close and update state
 setIsSuccess(false); // reset for next time
 }, 2000);
 }, 1500);
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={!isProcessing && !isSuccess ? onClose : undefined} />

 {/* Modal */}
 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col transform transition-all">

 {isProcessing ? (
 <div className="p-12 flex flex-col items-center justify-center text-center">
 <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-6"></div>
 <h3 className="text-xl font-bold text-slate-800/90 mb-2">Processando Fechamento...</h3>
 <p className="text-sm text-slate-500">Travejando período, gerando espelhos e integrando pagamentos.</p>
 </div>
 ) : isSuccess ? (
 <div className="p-12 flex flex-col items-center justify-center text-center">
 <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
 <span className="material-symbols-outlined text-4xl">check_circle</span>
 </div>
 <h3 className="text-xl font-bold text-slate-800/90 mb-2">Fechamento Concluído!</h3>
 <p className="text-sm text-slate-500">O período foi fechado com sucesso e os espelhos foram gerados.</p>
 </div>
 ) : (
 <>
 <div className="p-6 border-b border-cyan-100/50 flex justify-between items-center bg-cyan-500 text-white shadow-md shadow-cyan-500/20">
 <div className="flex items-center gap-3">
 <span className="material-symbols-outlined text-[24px]">lock</span>
 <div>
 <h2 className="text-xl font-bold tracking-tight">Fechar Comissões</h2>
 </div>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-cyan-600 rounded-full transition-colors">
 <span className="material-symbols-outlined text-cyan-100 border-none">close</span>
 </button>
 </div>

 <div className="p-6">
 <p className="font-bold text-slate-800/90 mb-4">Você está prestes a realizar o fechamento definitivo do ciclo.</p>

 <div className="shadow-md text-white/10 border border-cyan-500/20 p-4 rounded-xl mb-6">
 <h4 className="text-sm font-bold text-cyan-800 mb-2">Resumo do Pagamento</h4>
 <div className="space-y-1">
 <div className="flex justify-between text-xs text-cyan-700">
 <span>Total a ser transferido (PIX/TED):</span>
 <span className="font-bold text-lg">{formatBRL(totalPayout)}</span>
 </div>
 <div className="flex justify-between text-xs text-cyan-700">
 <span>Profissionais afetados:</span>
 <span className="font-bold">{eligiblePros.length}</span>
 </div>
 </div>
 </div>

 <ul className="space-y-3 mb-6">
 <li className="flex items-start gap-2 bg-white p-3 rounded-lg border border-cyan-100/50">
 <span className="material-symbols-outlined font-extrabold mt-0.5 text-lg">verified</span>
 <div>
 <b className="text-sm text-slate-800/90">Trava de Período (Locking)</b>
 <p className="text-xs text-slate-500">Ninguém mais poderá adicionar, editar ou excluir serviços deste ciclo.</p>
 </div>
 </li>
 <li className="flex items-start gap-2 bg-white p-3 rounded-lg border border-cyan-100/50">
 <span className="material-symbols-outlined font-extrabold mt-0.5 text-lg">receipt_long</span>
 <div>
 <b className="text-sm text-slate-800/90">Geração de Espelho</b>
 <p className="text-xs text-slate-500">Holerites detalhados serão gerados para todos os profissionais.</p>
 </div>
 </li>
 <li className="flex items-start gap-2 bg-white p-3 rounded-lg border border-cyan-100/50">
 <span className="material-symbols-outlined font-extrabold mt-0.5 text-lg">account_balance</span>
 <div>
 <b className="text-sm text-slate-800/90">Integração Financeira</b>
 <p className="text-xs text-slate-500">Prepara o lote de pagamentos via PIX ou remessa bancária.</p>
 </div>
 </li>
 </ul>

 <div className="bg-orange-500/10 border border-orange-200 p-4 rounded-xl flex gap-3 text-orange-800 mb-6">
 <span className="material-symbols-outlined text-orange-500">warning</span>
 <span className="text-sm font-medium">Esta ação é irreversível. Certifique-se de que todos os lançamentos estão corretos.</span>
 </div>

 <div className="flex justify-end gap-3 pt-2">
 <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-700 bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-xl rounded-xl transition-all">
 Cancelar
 </button>
 <button onClick={handleConfirm} className="px-6 py-3 text-sm font-bold text-slate-800 bg-cyan-500 text-white shadow-md shadow-md hover:bg-cyan-600 rounded-xl transition-all flex items-center gap-2">
 <span className="material-symbols-outlined text-[18px]">gavel</span>
 Confirmar Fechamento
 </button>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 );
};

export default CommissionClosingModal;
