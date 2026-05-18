import React from 'react';

import { SimulationResult } from '../hooks/useCommissions';

interface CommissionSimulationModalProps {
 isOpen: boolean;
 simulationData: SimulationResult[];
 onClose: () => void;
 onProceed: () => void;
}

const CommissionSimulationModal: React.FC<CommissionSimulationModalProps> = ({ isOpen, simulationData, onClose, onProceed }) => {
 if (!isOpen) return null;

 const formatBRL = (val: number) => {
 return new Intl.NumberFormat('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 }).format(val);
 };

 const totalToPay = simulationData.reduce((acc, curr) => acc + curr.netValue, 0);
 const totalBonuses = simulationData.reduce((acc, curr) => acc + curr.bonusesAdded, 0);
 const totalFees = simulationData.reduce((acc, curr) => acc + curr.feesDeducted, 0);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

 {/* Modal */}
 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
 <div className="p-6 border-b border-cyan-100/50 flex justify-between items-center bg-white">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-full shadow-md text-white/15 flex items-center justify-center font-extrabold shadow-inner">
 <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
 </div>
 <div>
 <h2 className="text-2xl font-bold text-slate-800/90 tracking-tight">Simulação de Fechamento</h2>
 <p className="text-sm text-slate-500 font-medium">Prévia do processamento das comissões do ciclo atual.</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
 <span className="material-symbols-outlined text-slate-400">close</span>
 </button>
 </div>

 <div className="p-6 overflow-y-auto flex-1 space-y-6">
 {/* Header Summary */}
 <div className="grid grid-cols-4 gap-4">
 <div className="bg-white border border-slate-200 shadow-sm rounded-xl border border-cyan-100/50 rounded-xl p-4">
 <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total a Pagar</div>
 <div className="text-2xl font-black font-extrabold">{formatBRL(totalToPay)}</div>
 </div>
 <div className="bg-emerald-500/10/50 border border-emerald-100 rounded-xl p-4">
 <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Bônus Calculados</div>
 <div className="text-xl font-bold text-emerald-700">+{formatBRL(totalBonuses)}</div>
 </div>
 <div className="bg-red-500/10/50 border border-red-100 rounded-xl p-4">
 <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Taxas Abatidas</div>
 <div className="text-xl font-bold text-red-700">-{formatBRL(totalFees)}</div>
 </div>
 <div className="bg-purple-500/10/50 border border-purple-100 rounded-xl p-4">
 <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Status</div>
 <div className="flex items-center gap-1 text-purple-700 font-bold mt-1">
 <span className="material-symbols-outlined text-lg">verified</span>
 100% Validado
 </div>
 </div>
 </div>

 <div className="border border-cyan-100/50 rounded-xl overflow-hidden shadow-none">
 <table className="w-full text-left">
 <thead className="bg-white border-b border-cyan-100/50">
 <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
 <th className="py-4 pl-4">Profissional</th>
 <th className="py-4 text-right">Com. Bruta</th>
 <th className="py-4 text-right text-red-500">Taxas (-)</th>
 <th className="py-4 text-right text-emerald-500">Bônus (+)</th>
 <th className="py-4 text-right text-orange-500">Ajustes (+/-)</th>
 <th className="py-4 pr-4 text-right font-extrabold">Líquido</th>
 </tr>
 </thead>
 <tbody>
 {simulationData.map((pro, idx) => (
 <tr key={idx} className="border-b border-slate-50 bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-xl0 transition-colors last:border-0">
 <td className="py-4 pl-4 font-bold text-slate-800/90">{pro.professional}</td>
 <td className="py-4 text-right text-sm font-medium text-slate-700">{formatBRL(pro.grossValue)}</td>
 <td className="py-4 text-right text-sm font-bold text-red-500">-{formatBRL(pro.feesDeducted)}</td>
 <td className="py-4 text-right text-sm font-bold text-emerald-500">+{formatBRL(pro.bonusesAdded)}</td>
 <td className={`py-4 text-right text-sm font-bold ${pro.adjustments < 0 ? 'text-orange-500' : 'text-slate-500'}`}>
 {formatBRL(pro.adjustments)}
 </td>
 <td className="py-4 pr-4 text-right font-black font-extrabold">{formatBRL(pro.netValue)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <div className="p-6 border-t border-cyan-100/50 bg-white flex justify-between items-center">
 <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
 <span className="material-symbols-outlined text-[16px]">info</span>
 Esta é apenas uma simulação. O fechamento não será realizado.
 </span>
 <div className="flex gap-3">
 <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-500 border border-cyan-100/50 bg-white hover:bg-white rounded-xl transition-all">
 Cancelar
 </button>
 <button onClick={onProceed} className="px-6 py-3 text-sm font-bold text-slate-800 bg-slate-900 shadow-md hover:bg-black rounded-xl transition-all flex items-center gap-2">
 Ir para Fechamento Definitivo
 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};

export default CommissionSimulationModal;
