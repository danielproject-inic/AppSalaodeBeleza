import { useState, useEffect, useCallback } from 'react';
import { checkRealOnline, processSyncQueue } from '../lib/offlineSync';
import { getPendingSyncCount } from '../lib/offlineStorage';

export interface NetworkStatus {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    syncNow: () => Promise<void>;
    checkConnection: () => Promise<boolean>;
}

export const useNetworkStatus = (): NetworkStatus => {
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    const refreshPendingCount = useCallback(async () => {
        try {
            const count = await getPendingSyncCount();
            setPendingCount(count);
        } catch {
            setPendingCount(0);
        }
    }, []);

    const checkConnection = useCallback(async (): Promise<boolean> => {
        const online = await checkRealOnline();
        setIsOnline(online);
        return online;
    }, []);

    const syncNow = useCallback(async () => {
        setIsSyncing(true);
        try {
            await processSyncQueue();
        } finally {
            await refreshPendingCount();
            setIsSyncing(false);
        }
    }, [refreshPendingCount]);

    useEffect(() => {
        // Checagem inicial
        checkConnection();
        refreshPendingCount();

        const handleOnline = async () => {
            const realOnline = await checkRealOnline();
            setIsOnline(realOnline);
            if (realOnline) {
                syncNow();
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleSyncStarted = () => {
            setIsSyncing(true);
        };

        const handleSyncCompleted = () => {
            setIsSyncing(false);
            refreshPendingCount();
        };

        const handleSyncUpdated = () => {
            refreshPendingCount();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-sync-started', handleSyncStarted);
        window.addEventListener('offline-sync-completed', handleSyncCompleted);
        window.addEventListener('offline-sync-updated', handleSyncUpdated);

        // Intervalo para atualizar a contagem de itens pendentes a cada 10 segundos
        const countInterval = setInterval(() => {
            refreshPendingCount();
        }, 10000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-sync-started', handleSyncStarted);
            window.removeEventListener('offline-sync-completed', handleSyncCompleted);
            window.removeEventListener('offline-sync-updated', handleSyncUpdated);
            clearInterval(countInterval);
        };
    }, [checkConnection, refreshPendingCount, syncNow]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        checkConnection
    };
};
