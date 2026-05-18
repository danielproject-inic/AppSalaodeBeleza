import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, QrCode, ShieldCheck, Check, Copy } from 'lucide-react';

interface PaymentSimulationProps {
    amount: number;
    onSuccess: (paymentType: string) => void;
}

const PaymentSimulation: React.FC<PaymentSimulationProps> = ({ amount, onSuccess }) => {
    const [method, setMethod] = useState<'pix' | 'card' | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);

    const handlePixSuccess = () => {
        setProcessing(true);
        setTimeout(() => {
            setProcessing(false);
            onSuccess('pix');
        }, 2000);
    };

    const handleCardPay = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setTimeout(() => {
            setProcessing(false);
            onSuccess('card');
        }, 3000);
    };

    return (
        <div className="space-y-6">
            {!method ? (
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-magenta-600 uppercase tracking-widest text-center italic drop-shadow-sm">Escolha a forma de pagamento</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setMethod('pix')}
                            className="bg-white/40 border border-stone-200/50 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-cyan-400/10 hover:border-cyan-400/50 transition-all group shadow-sm"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-black text-stone-900 uppercase italic">PIX</span>
                        </button>
                        <button
                            onClick={() => setMethod('card')}
                            className="bg-white/40 border border-stone-200/50 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-magenta-500/10 hover:border-magenta-500/50 transition-all group shadow-sm"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-magenta-500/10 flex items-center justify-center text-magenta-500 group-hover:scale-110 transition-transform">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-black text-stone-900 uppercase italic">Cartão</span>
                        </button>
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 border border-white/10 rounded-3xl p-6"
                >
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setMethod(null)} className="text-[10px] font-black text-stone-600 uppercase tracking-widest hover:text-stone-900 italic underline decoration-cyan-400 underline-offset-4">Alterar</button>
                        <span className="text-xs font-black text-stone-900 uppercase italic tracking-tighter">R$ {amount.toFixed(2)}</span>
                    </div>

                    {method === 'pix' && (
                        <div className="flex flex-col items-center gap-6">
                            <div className="p-4 bg-white rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                <div className="w-40 h-40 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                                    <QrCode className="w-12 h-12" />
                                </div>
                            </div>
                            <div className="w-full space-y-3">
                                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                                    <code className="text-[10px] text-cyan-400 font-mono truncate">00020101021226870014br.gov.bcb.pix0125...</code>
                                    <button 
                                        onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                        className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">Copie o código acima para pagar no seu banco</p>
                            </div>
                            <button
                                onClick={handlePixSuccess}
                                disabled={processing}
                                className="w-full bg-cyan-600 py-4 rounded-2xl font-black uppercase text-xs text-[#07090f] shadow-[0_4px_20px_rgba(8,145,178,0.2)] disabled:opacity-50"
                            >
                                {processing ? "Processando..." : "Confirmar Pagamento"}
                            </button>
                        </div>
                    )}

                    {method === 'card' && (
                        <form onSubmit={handleCardPay} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Número do Cartão</label>
                                <div className="relative">
                                    <input type="text" placeholder="**** **** **** ****" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-magenta-500/50" required />
                                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Validade</label>
                                    <input type="text" placeholder="MM/AA" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-magenta-500/50" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CVV</label>
                                    <input type="text" placeholder="123" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-magenta-500/50" required />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-magenta-600 py-4 rounded-2xl font-black uppercase text-xs text-white shadow-[0_4px_20px_rgba(217,70,239,0.2)] disabled:opacity-50"
                            >
                                {processing ? "Processando..." : "Pagar Agora"}
                            </button>
                        </form>
                    )}
                </motion.div>
            )}

            <div className="flex items-center justify-center gap-2 text-stone-600">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Pagamento Seguro & Encriptado</span>
            </div>
        </div>
    );
};

export default PaymentSimulation;
