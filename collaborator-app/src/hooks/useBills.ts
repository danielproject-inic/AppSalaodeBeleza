import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Bill = Database['public']['Tables']['bills']['Row'];
type BillInsert = Database['public']['Tables']['bills']['Insert'];

export const useBills = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBills = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .order('due_date', { ascending: true });

            if (error) throw error;
            setBills(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addBill = async (bill: BillInsert) => {
        try {
            const { data, error } = await supabase
                .from('bills')
                .insert(bill)
                .select()
                .single();

            if (error) throw error;
            setBills(prev => {
                const updated = [data, ...prev];
                return updated.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
            });
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateBill = async (id: string, updates: Partial<BillInsert>) => {
        try {
            const { data, error } = await supabase
                .from('bills')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setBills(prev => prev.map(b => b.id === id ? data : b));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteBill = async (id: string) => {
        try {
            const { error } = await supabase
                .from('bills')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBills(prev => prev.filter(b => b.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchBills();

        const subscription = supabase
            .channel('public:bills')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
                fetchBills();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return {
        bills,
        loading,
        error,
        addBill,
        updateBill,
        deleteBill,
        refetch: fetchBills
    };
};
