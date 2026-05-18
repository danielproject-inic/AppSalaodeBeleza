import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CashPinSetupProps {
 onComplete: () => void;
 userId: string;
}

const CashPinSetup: React.FC<CashPinSetupProps> = ({ onComplete, userId }) => {
 const [pin, setPin] = useState('');
 const [confirmPin, setConfirmPin] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (pin.length !== 4) {
 setError('O PIN deve ter 4 dígitos.');
 return;
 }
 if (pin !== confirmPin) {
 setError('Os PINs não conferem.');
 return;
 }

 setLoading(true);
 setError(null);

 try {
 const { error: updateError } = await supabase
 .from('profiles')
 .update({ cash_pin: pin })
 .eq('id', userId);

 if (updateError) throw updateError;
 onComplete();
 } catch (err) {
 console.error('Error setting PIN:', err);
 setError('Erro ao salvar o PIN. Tente novamente.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
 <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
 <div className="flex flex-col items-center text-center mb-8">
 <div className="size-20 bg-cyan-500 text-white/10 rounded-full flex items-center justify-center mb-6">
 <span className="material-symbols-outlined text-4xl text-primary">lock_reset</span>
 </div>
 <h3 className="text-2xl font-black text-slate-800/90 mb-2">Segurança do Caixa</h3>
 <p className="text-sm text-slate-400 font-medium">Detectamos que você ainda não possui um PIN de segurança para movimentações no caixa. Vamos configurar agora?</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Novo PIN (4 dígitos)</label>
 <input
 type="password"
 maxLength={4}
 required
 value={pin}
 onChange={e => setPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
 className="w-full h-14 bg-white border border-cyan-100/50 rounded-2xl px-6 text-2xl tracking-[1em] text-center focus:ring-2 focus:ring-primary/20 outline-none transition-all"
 placeholder="****"
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmar PIN</label>
 <input
 type="password"
 maxLength={4}
 required
 value={confirmPin}
 onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
 className="w-full h-14 bg-white border border-cyan-100/50 rounded-2xl px-6 text-2xl tracking-[1em] text-center focus:ring-2 focus:ring-primary/20 outline-none transition-all"
 placeholder="****"
 />
 </div>

 {error && (
 <p className="text-xs text-red-500 font-bold text-center bg-red-500/10 py-2 rounded-lg">{error}</p>
 )}

 <button
 type="submit"
 disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
 className="w-full h-14 bg-cyan-500 text-white text-slate-800 font-bold rounded-2xl shadow-cyan-500/20 hover:bg-cyan-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
 >
 {loading ? (
 <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
 ) : (
 <>
 Definir PIN de Segurança
 <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">verified_user</span>
 </>
 )}
 </button>
 </form>
 </div>
 </div>
 );
};

export default CashPinSetup;
