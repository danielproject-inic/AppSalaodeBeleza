import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

export const useTransactions = () => {
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
                .limit(1000);

            if (error) throw error;
            setTransactions(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (transaction: TransactionInsert) => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert(transaction)
                .select()
                .single();

            if (error) throw error;
            setTransactions(prev => [data, ...prev]);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateTransaction = async (id: string, updates: Partial<TransactionInsert>) => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setTransactions(prev => prev.map(t => t.id === id ? data : t));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTransactions(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchTransactions();

        const subscription = supabase
            .channel('public:transactions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchTransactions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return {
        transactions,
        loading,
        error,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        refetch: fetchTransactions
    };
};
