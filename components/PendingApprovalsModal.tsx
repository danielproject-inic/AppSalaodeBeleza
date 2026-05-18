import React from 'react';

import { PendingApproval } from '../hooks/useCommissions';

interface PendingApprovalsModalProps {
 isOpen: boolean;
 pendingApprovals: PendingApproval[];
 onClose: () => void;
 onApprove: (id: string) => void;
 onReject: (id: string) => void;
}

const PendingApprovalsModal: React.FC<PendingApprovalsModalProps> = ({ isOpen, pendingApprovals, onClose, onApprove, onReject }) => {
 if (!isOpen) return null;

 const formatBRL = (val: number) => {
 return new Intl.NumberFormat('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 }).format(val);
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

 {/* Modal */}
 <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
 <div className="p-6 border-b border-cyan-100/50 flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-slate-800/90">Aprovações Pendentes</h2>
 <p className="text-sm text-slate-500">Analise as anomalias detectadas pelo Fechamento Inteligente.</p>
 </div>
 <button onClick={onClose} className="p-2 bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-full transition-colors">
 <span className="material-symbols-outlined text-slate-400">close</span>
 </button>
 </div>

 <div className="p-6 overflow-y-auto flex-1 space-y-4">
 {pendingApprovals.map(approval => (
 <div key={approval.id} className="border border-cyan-100/50 rounded-xl p-4 hover:border-cyan-200 transition-colors bg-white">
 <div className="flex justify-between items-start mb-2">
 <div>
 <h4 className="font-bold text-slate-800/90">{approval.professional}</h4>
 <span className="text-xs font-medium text-slate-500">{approval.service}</span>
 </div>
 <span className={`font-bold ${approval.value < 0 ? 'text-red-500' : 'text-slate-800/80'}`}>
 {formatBRL(approval.value)}
 </span>
 </div>
 <div className="bg-white border text-sm border-cyan-100/50 p-3 rounded-lg mb-3">
 <span className="text-red-500 font-bold mr-1">Atenção:</span>
 <span className="text-slate-700">{approval.reason}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-xs text-slate-400 flex items-center gap-1">
 <span className="material-symbols-outlined text-[14px]">lightbulb</span>
 {approval.recommendedAction}
 </span>
 <div className="flex gap-2">
 <button
 onClick={() => onReject(approval.id)}
 className="px-4 py-1.5 text-xs font-bold text-slate-500 border border-cyan-100/50 bg-white bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-lg transition-colors"
 >
 Recusar
 </button>
 <button
 onClick={() => onApprove(approval.id)}
 className="px-4 py-1.5 text-xs font-bold text-slate-800 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 rounded-lg shadow-[0_4px_10px_rgba(6,182,212,0.3)] transition-colors"
 >
 Aprovar
 </button>
 </div>
 </div>
 </div>
 ))}

 {pendingApprovals.length === 0 && (
 <div className="text-center py-10">
 <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">check_circle</span>
 <p className="text-slate-500 font-medium text-sm">Nenhuma aprovação pendente. Tudo pronto para o fechamento!</p>
 </div>
 )}
 </div>

 <div className="p-6 border-t border-cyan-100/50 bg-white flex justify-end">
 <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors">
 Concluir
 </button>
 </div>
 </div>
 </div>
 );
};

export default PendingApprovalsModal;
