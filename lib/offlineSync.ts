// Sincronizador em Segundo Plano (Background Sync Engine)
// Salon Suite Pro — Sincronização Automática com a Nuvem

import { supabase } from './supabase';
import {
    getSyncQueue,
    removeSyncQueueItem,
    updateSyncQueueItem,
    SyncQueueItem,
    getPendingSyncCount
} from './offlineStorage';

let isSyncing = false;
let autoSyncInitialized = false;

// Verifica se o dispositivo está com internet real
export const checkRealOnline = async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
    }

    try {
        // Teste rápido com timeout de 3 segundos no Supabase
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) return navigator.onLine;

        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
            }
        });

        clearTimeout(timeoutId);
        return res.ok || res.status === 401 || res.status === 403; // Qualquer resposta HTTP indica que a conexão existe
    } catch {
        return false;
    }
};

// Processa todos os itens da fila de sincronização em ordem cronológica (FIFO)
export const processSyncQueue = async (): Promise<{ total: number; success: number; failed: number }> => {
    if (isSyncing) {
        return { total: 0, success: 0, failed: 0 };
    }

    const online = await checkRealOnline();
    if (!online) {
        return { total: 0, success: 0, failed: 0 };
    }

    isSyncing = true;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-sync-started'));
    }

    let successCount = 0;
    let failedCount = 0;
    const queue = await getSyncQueue();

    try {
        for (const item of queue) {
            try {
                await updateSyncQueueItem(item.id, { status: 'syncing' });

                let res: { error: any } | null = null;

                if (item.action === 'insert') {
                    // Upsert garante que se já tiver sido gravado não duplique
                    res = await (supabase.from(item.table) as any).upsert(item.payload, { onConflict: 'id' });
                } else if (item.action === 'update') {
                    res = await (supabase.from(item.table) as any).update(item.payload).eq('id', item.recordId);
                } else if (item.action === 'delete') {
                    res = await (supabase.from(item.table) as any).delete().eq('id', item.recordId);
                }

                if (res && res.error) {
                    console.warn(`[OfflineSync] Erro ao sincronizar item ${item.id}:`, res.error);
                    
                    // Se for erro de rede, interrompe o loop para tentar novamente quando a internet estabilizar
                    if (res.error.message?.includes('fetch') || res.error.message?.includes('network')) {
                        await updateSyncQueueItem(item.id, { status: 'pending', lastError: res.error.message });
                        break;
                    }

                    await updateSyncQueueItem(item.id, {
                        status: 'failed',
                        retryCount: item.retryCount + 1,
                        lastError: res.error.message
                    });
                    failedCount++;
                } else {
                    // Sucesso: remove o item da fila
                    await removeSyncQueueItem(item.id);
                    successCount++;
                }
            } catch (err: any) {
                console.error(`[OfflineSync] Exceção ao processar item ${item.id}:`, err);
                await updateSyncQueueItem(item.id, {
                    status: 'failed',
                    retryCount: item.retryCount + 1,
                    lastError: err.message || 'Erro desconhecido'
                });
                failedCount++;
            }
        }
    } finally {
        isSyncing = false;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-sync-completed', {
                detail: { success: successCount, failed: failedCount }
            }));
            window.dispatchEvent(new CustomEvent('offline-sync-updated'));
        }
    }

    return { total: queue.length, success: successCount, failed: failedCount };
};

// Inicializador automático do listener de rede e timer periódico
export const initAutoSync = (): () => void => {
    if (typeof window === 'undefined') return () => {};
    if (autoSyncInitialized) return () => {};

    autoSyncInitialized = true;

    const handleOnline = () => {
        console.log('[OfflineSync] Conexão detectada. Iniciando sincronização...');
        setTimeout(() => {
            processSyncQueue();
        }, 1500); // 1.5s de delay para a conexão estabilizar
    };

    window.addEventListener('online', handleOnline);

    // Verificação periódica a cada 30 segundos se houver pendências
    const interval = setInterval(async () => {
        const count = await getPendingSyncCount();
        if (count > 0 && navigator.onLine) {
            processSyncQueue();
        }
    }, 30000);

    // Primeira verificação logo ao iniciar
    setTimeout(() => {
        if (navigator.onLine) {
            processSyncQueue();
        }
    }, 2000);

    return () => {
        window.removeEventListener('online', handleOnline);
        clearInterval(interval);
        autoSyncInitialized = false;
    };
};
