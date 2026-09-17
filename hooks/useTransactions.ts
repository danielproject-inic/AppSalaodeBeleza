import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import {
    cacheItems,
    getCachedItems,
    putCachedItem,
    deleteCachedItem,
    enqueueSync,
    generateUUID
} from '../lib/offlineStorage';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

export const useTransactions = (limitCount: number = 500) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limitCount);

            if (error) throw error;
            const items = data || [];
            setTransactions(items);
            setError(null);

            if (items.length > 0) {
                cacheItems('transactions', items).catch(err =>
                    console.warn('[useTransactions] Erro ao salvar cache local:', err)
                );
            }
        } catch (err: any) {
            console.warn('[useTransactions] Falha ao buscar da nuvem, tentando cache offline...', err);
            try {
                const cached = await getCachedItems<Transaction>('transactions');
                cached.sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });
                setTransactions(cached.slice(0, limitCount));
                setError(null);
            } catch (cacheErr: any) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (transaction: TransactionInsert) => {
        const id = transaction.id || generateUUID();
        const transactionWithId: Transaction = {
            ...transaction,
            id,
            created_at: transaction.created_at || new Date().toISOString()
        } as Transaction;

        const handleOfflineAdd = async () => {
            console.log('[useTransactions] Registrando transação em modo offline...', transactionWithId);
            await putCachedItem('transactions', transactionWithId);
            await enqueueSync({
                table: 'transactions',
                action: 'insert',
                recordId: id,
                payload: transactionWithId
            });
            setTransactions(prev => [transactionWithId, ...prev]);
            return transactionWithId;
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return await handleOfflineAdd();
        }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert(transactionWithId)
                .select()
                .single();

            if (error) throw error;
            setTransactions(prev => [data, ...prev]);
            putCachedItem('transactions', data).catch(console.warn);
            return data;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineAdd();
            }
            setError(err.message);
            return null;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<TransactionInsert>) => {
        const handleOfflineUpdate = async () => {
            console.log('[useTransactions] Atualizando transação em modo offline...', id, updates);
            let updatedRecord: Transaction | null = null;
            setTransactions(prev => {
                const next = prev.map(t => {
                    if (t.id === id) {
                        updatedRecord = { ...t, ...updates } as Transaction;
                        return updatedRecord;
                    }
                    return t;
                });
                return next;
            });

            if (updatedRecord) {
                await putCachedItem('transactions', updatedRecord);
            }

            await enqueueSync({
                table: 'transactions',
                action: 'update',
                recordId: id,
                payload: updates
            });

            return updatedRecord;
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return await handleOfflineUpdate();
        }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setTransactions(prev => prev.map(t => t.id === id ? data : t));
            putCachedItem('transactions', data).catch(console.warn);
            return data;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineUpdate();
            }
            setError(err.message);
            return null;
        }
    };

    const deleteTransaction = async (id: string) => {
        const handleOfflineDelete = async () => {
            console.log('[useTransactions] Excluindo transação em modo offline...', id);
            setTransactions(prev => prev.filter(t => t.id !== id));
            await deleteCachedItem('transactions', id);
            await enqueueSync({
                table: 'transactions',
                action: 'delete',
                recordId: id,
                payload: null
            });
            return true;
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return await handleOfflineDelete();
        }

        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTransactions(prev => prev.filter(t => t.id !== id));
            deleteCachedItem('transactions', id).catch(console.warn);
            return true;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineDelete();
            }
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchTransactions();

        const channelId = `transactions_channel_${Math.random().toString(36).substring(2, 9)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchTransactions();
            })
            .subscribe();

        const handleSyncCompleted = () => {
            fetchTransactions();
        };
        window.addEventListener('offline-sync-completed', handleSyncCompleted);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('offline-sync-completed', handleSyncCompleted);
        };
    }, []);

    return {
        transactions,
        setTransactions,
        loading,
        error,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        refetch: fetchTransactions
    };
};
