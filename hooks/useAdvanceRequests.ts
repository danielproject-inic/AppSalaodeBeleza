import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

export type AdvanceRequest = {
    id: string;
    professional_id: string;
    amount: number;
    status: 'pending' | 'approved' | 'denied';
    reason: string | null;
    created_at: string;
    professional?: {
        name: string;
    };
};

export const useAdvanceRequests = () => {
    const [requests, setRequests] = useState<AdvanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('advance_requests')
                .select(`
                    *,
                    professional:professionals(name)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data as any || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateRequestStatus = async (id: string, status: 'approved' | 'denied') => {
        try {
            const { error } = await supabase
                .from('advance_requests')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            setRequests(prev => prev.filter(r => r.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const fetchApprovedVales = async (professionalId: string, startDate: string, endDate: string) => {
        try {
            const { data, error } = await supabase
                .from('advance_requests')
                .select('*')
                .eq('professional_id', professionalId)
                .eq('status', 'approved')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching approved vales:', err);
            return [];
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    return {
        requests,
        loading,
        error,
        updateRequestStatus,
        fetchApprovedVales,
        refetch: fetchRequests
    };
};
