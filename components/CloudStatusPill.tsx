import React, { useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { WifiOff, RefreshCw, Cloud, CloudOff, CheckCircle2 } from 'lucide-react';

export const CloudStatusPill: React.FC = () => {
    const { isOnline, pendingCount, isSyncing, syncNow } = useNetworkStatus();
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div 
            className="relative inline-flex items-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {isSyncing ? (
                <button
                    disabled
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-500/40 backdrop-blur-md shadow-sm shadow-sky-500/20 cursor-wait transition-all animate-pulse"
                    title="Sincronizando alterações locais com o banco de dados na nuvem..."
                >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>Sincronizando{pendingCount > 0 ? ` (${pendingCount})` : '...'}</span>
                </button>
            ) : !isOnline ? (
                <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 backdrop-blur-md shadow-sm shadow-amber-500/20 transition-all select-none"
                >
                    <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <div className="flex items-center gap-1.5">
                        <span>Modo Offline</span>
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500/30 text-amber-200 rounded-full border border-amber-500/50">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                </div>
            ) : pendingCount > 0 ? (
                <button
                    onClick={() => syncNow()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/50 backdrop-blur-md shadow-sm shadow-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400 hover:scale-105 active:scale-95 cursor-pointer transition-all"
                    title="Clique para sincronizar agora com o servidor"
                >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sincronizar ({pendingCount})</span>
                </button>
            ) : (
                <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-emerald-400/90 bg-emerald-950/30 border border-emerald-500/20 backdrop-blur-sm select-none"
                    title="Conectado à nuvem. Dados sincronizados em tempo real."
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="hidden sm:inline text-[11px] tracking-wide text-emerald-300/80">Online</span>
                </div>
            )}

            {/* Tooltip explicativo quando passa o mouse */}
            {showTooltip && (
                <div className="absolute top-full right-0 mt-2 z-50 w-64 p-3 rounded-xl bg-slate-900/95 border border-slate-700/70 text-slate-200 text-xs shadow-2xl backdrop-blur-lg animate-in fade-in duration-150 pointer-events-none">
                    <div className="font-semibold mb-1 flex items-center gap-1.5 text-slate-100">
                        {isOnline ? (
                            <>
                                <Cloud className="w-4 h-4 text-emerald-400" />
                                <span>Conexão Ativa</span>
                            </>
                        ) : (
                            <>
                                <CloudOff className="w-4 h-4 text-amber-400" />
                                <span>Sem Conexão à Internet</span>
                            </>
                        )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                        {isOnline ? (
                            pendingCount > 0 ? (
                                `${pendingCount} operação(ões) registrada(s) localmente aguardando confirmação na nuvem.`
                            ) : (
                                'Todas as alterações de clientes, agendamentos e caixa estão salvas e seguras na nuvem.'
                            )
                        ) : (
                            'O sistema está operando em Modo Offline. Você pode continuar usando normalmente; tudo será sincronizado com a nuvem automaticamente assim que a conexão retornar.'
                        )}
                    </p>
                </div>
            )}
        </div>
    );
};
