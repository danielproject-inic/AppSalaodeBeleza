import React from 'react';

interface CashClosureModalProps {
    saldoAtual: number;
    totalEntradas: number;
    totalSaidas: number;
    formatCurrency: (val: number) => string;
    actualClosingBalanceInput: string;
    setActualClosingBalanceInput: (val: string) => void;
    closureObservations: string;
    setClosureObservations: (val: string) => void;
    onClose: () => void;
    onConfirm: () => void;
}

export const CashClosureModal: React.FC<CashClosureModalProps> = ({
    saldoAtual,
    totalEntradas,
    totalSaidas,
    formatCurrency,
    actualClosingBalanceInput,
    setActualClosingBalanceInput,
    closureObservations,
    setClosureObservations,
    onClose,
    onConfirm
}) => {
    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-400">
            <div className="p-8 bg-[#0f172a] rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <span className="material-symbols-outlined text-[10rem]">analytics</span>
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]">Saldo em Mãos</span>
                            <p className="text-5xl font-black mt-1 text-white font-bebas">R$ <span className="text-white">{saldoAtual.toLocaleString('pt-BR')}</span></p>
                        </div>
                        <div className="text-right">
                            <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Status do Turno</span>
                            <div className="flex items-center gap-2 mt-1 justify-end">
                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="font-black text-emerald-400 text-[10px] uppercase tracking-widest">Finalizando</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-8">
                        <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block mb-2">Entradas (+)</span>
                            <span className="text-emerald-400 font-black text-2xl tracking-tighter font-bebas">+{formatCurrency(totalEntradas)}</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block mb-2">Saídas (-)</span>
                            <span className="text-rose-400 font-black text-2xl tracking-tighter font-bebas">-{formatCurrency(totalSaidas)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Valor Real Físico em Caixa (Obrigatório)</label>
                    <div className="flex items-center gap-3 bg-[#111827]/40 border border-white/5 rounded-2xl p-4 focus-within:border-cyan-500/30 transition-all shadow-inner">
                        <span className="font-mono text-cyan-400 font-black text-xl">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            title="Valor Real Físico em Caixa"
                            aria-label="Valor Real Físico em Caixa"
                            value={actualClosingBalanceInput}
                            onChange={e => setActualClosingBalanceInput(e.target.value)}
                            className="bg-transparent text-white outline-none w-full font-mono text-2xl font-black focus:ring-0"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Notas de Encerramento (Obrigatório)</label>
                    <textarea
                        value={closureObservations}
                        onChange={e => setClosureObservations(e.target.value)}
                        placeholder="Relate quebras de caixa, observações ou lembretes..."
                        title="Notas de Encerramento"
                        aria-label="Notas de Encerramento"
                        className="w-full bg-[#111827]/40 border border-white/5 rounded-2xl p-5 text-sm text-white/80 outline-none focus:border-cyan-500/30 transition-all min-h-[120px] resize-none"
                    />
                </div>

                <div className="p-5 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 flex items-start gap-3">
                    <span className="material-symbols-outlined text-cyan-400 mt-0.5">warning</span>
                    <p className="text-[11px] text-cyan-400/70 font-bold leading-relaxed">
                        Ao confirmar o fechamento, o caixa será bloqueado para novas operações neste turno e o histórico será consolidado.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-5 rounded-2xl border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white transition-all"
                    >
                        Manter Aberto
                    </button>
                    <button
                        disabled={!closureObservations.trim() || !actualClosingBalanceInput}
                        onClick={onConfirm}
                        className={`flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl 
                            ${(!closureObservations.trim() || !actualClosingBalanceInput)
                                ? 'bg-white/5 text-white/10 cursor-not-allowed opacity-60'
                                : 'bg-rose-500 text-slate-900 hover:bg-rose-400 shadow-rose-500/20 active:scale-95'}`}
                    >
                        Confirmar Fechamento
                    </button>
                </div>
            </div>
        </div>
    );
};
