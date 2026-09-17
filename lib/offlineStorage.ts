// Motor de Armazenamento Local Offline (IndexedDB)
// Salon Suite Pro — Camada de Persistência Offline

export interface SyncQueueItem {
    id: string;
    table: 'appointments' | 'transactions' | 'clients' | 'services' | 'professionals';
    action: 'insert' | 'update' | 'delete';
    recordId: string;
    payload: any;
    createdAt: string;
    retryCount: number;
    status: 'pending' | 'syncing' | 'failed';
    lastError?: string;
}

const DB_NAME = 'salon_suite_pro_offline';
const DB_VERSION = 1;

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

let dbPromise: Promise<IDBDatabase> | null = null;

export const getOfflineDB = (): Promise<IDBDatabase> => {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.reject(new Error('IndexedDB não suportado neste ambiente'));
    }

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Cache stores para leitura rápida offline
            if (!db.objectStoreNames.contains('appointments')) {
                db.createObjectStore('appointments', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('transactions')) {
                db.createObjectStore('transactions', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('clients')) {
                db.createObjectStore('clients', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('services')) {
                db.createObjectStore('services', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('professionals')) {
                db.createObjectStore('professionals', { keyPath: 'id' });
            }

            // Fila de Sincronização (Outbox Queue)
            if (!db.objectStoreNames.contains('sync_queue')) {
                const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
                syncStore.createIndex('status', 'status', { unique: false });
                syncStore.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });

    return dbPromise;
};

// --- Operações de Cache Local ---

export const cacheItems = async <T extends { id: string }>(
    storeName: 'appointments' | 'transactions' | 'clients' | 'services' | 'professionals',
    items: T[]
): Promise<void> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        for (const item of items) {
            if (item && item.id) {
                store.put(item);
            }
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn(`Erro ao salvar cache em ${storeName}:`, err);
    }
};

export const getCachedItems = async <T>(
    storeName: 'appointments' | 'transactions' | 'clients' | 'services' | 'professionals'
): Promise<T[]> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn(`Erro ao ler cache de ${storeName}:`, err);
        return [];
    }
};

export const putCachedItem = async <T extends { id: string }>(
    storeName: 'appointments' | 'transactions' | 'clients' | 'services' | 'professionals',
    item: T
): Promise<void> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn(`Erro ao salvar item no cache ${storeName}:`, err);
    }
};

export const deleteCachedItem = async (
    storeName: 'appointments' | 'transactions' | 'clients' | 'services' | 'professionals',
    id: string
): Promise<void> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(id);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn(`Erro ao deletar item do cache ${storeName}:`, err);
    }
};

// --- Operações da Fila de Sincronização (Outbox Queue) ---

export const enqueueSync = async (item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<SyncQueueItem> => {
    const queueItem: SyncQueueItem = {
        ...item,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        retryCount: 0,
        status: 'pending'
    };

    try {
        const db = await getOfflineDB();
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        store.put(queueItem);

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });

        // Dispara evento para notificar hooks e badges
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-sync-updated'));
        }
    } catch (err) {
        console.error('Erro ao enfileirar sincronização:', err);
    }

    return queueItem;
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const items = (request.result || []) as SyncQueueItem[];
                // Ordena por ordem cronológica (FIFO)
                items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Erro ao ler fila de sincronização:', err);
        return [];
    }
};

export const removeSyncQueueItem = async (id: string): Promise<void> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        store.delete(id);

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-sync-updated'));
        }
    } catch (err) {
        console.error('Erro ao remover item da fila:', err);
    }
};

export const updateSyncQueueItem = async (id: string, updates: Partial<SyncQueueItem>): Promise<void> => {
    try {
        const db = await getOfflineDB();
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const getReq = store.get(id);

        getReq.onsuccess = () => {
            if (getReq.result) {
                const updated = { ...getReq.result, ...updates };
                store.put(updated);
            }
        };

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-sync-updated'));
        }
    } catch (err) {
        console.error('Erro ao atualizar item da fila:', err);
    }
};

export const getPendingSyncCount = async (): Promise<number> => {
    try {
        const queue = await getSyncQueue();
        return queue.filter(item => item.status === 'pending' || item.status === 'failed').length;
    } catch {
        return 0;
    }
};
