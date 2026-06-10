import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type CashSession = Database['public']['Tables']['cash_sessions']['Row'];
type CashSessionInsert = Database['public']['Tables']['cash_sessions']['Insert'];

export const useCashSessions = () => {
    const [activeSession, setActiveSession] = useState<CashSession | null>(null);
    const [sessionsHistory, setSessionsHistory] = useState<CashSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActiveSession = async () => {
        try {
            const { data, error } = await supabase
                .from('cash_sessions')
                .select(`
                    *,
                    opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
                    closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
                `)
                .eq('status', 'open')
                .order('opened_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            setActiveSession(data && data.length > 0 ? (data[0] as any) : null);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const fetchSessionsHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('cash_sessions')
                .select(`
                    *,
                    opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
                    closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
                `)
                .order('opened_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setSessionsHistory((data || []) as any[]);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const openSession = async (openingBalance: number, operatorId: string) => {
        try {
            const sessionData: CashSessionInsert = {
                opening_balance: openingBalance,
                opened_by: operatorId,
                status: 'open',
                opened_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('cash_sessions')
                .insert(sessionData)
                .select()
                .single();

            if (error) throw error;
            setActiveSession(data);
            await fetchSessionsHistory();
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const closeSession = async (
        sessionId: string,
        actualBalance: number,
        expectedBalance: number,
        notes: string,
        operatorId: string
    ) => {
        try {
            const difference = actualBalance - expectedBalance;
            const updateData = {
                status: 'closed',
                closed_at: new Date().toISOString(),
                closed_by: operatorId,
                expected_closing_balance: expectedBalance,
                actual_closing_balance: actualBalance,
                difference: difference,
                notes: notes,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('cash_sessions')
                .update(updateData)
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            setActiveSession(null);
            await fetchSessionsHistory();
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([fetchActiveSession(), fetchSessionsHistory()]);
            setLoading(false);
        };

        loadInitialData();

        const subscription = supabase
            .channel('public:cash_sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions' }, () => {
                fetchActiveSession();
                fetchSessionsHistory();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return {
        activeSession,
        sessionsHistory,
        loading,
        error,
        openSession,
        closeSession,
        refetch: async () => {
            await Promise.all([fetchActiveSession(), fetchSessionsHistory()]);
        }
    };
};
