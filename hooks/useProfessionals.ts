import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type BaseProfessional = Database['public']['Tables']['professionals']['Row'];

export interface Professional extends BaseProfessional {
    reviews?: Database['public']['Tables']['professional_reviews']['Row'][];
}

type Exception = Database['public']['Tables']['professional_exceptions']['Row'];

export const useProfessionals = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [proResponse, exResponse] = await Promise.all([
                supabase
                    .from('professionals')
                    .select('*, reviews:professional_reviews(*)')
                    .order('name'),
                supabase.from('professional_exceptions').select('*')
            ]);

            if (proResponse.error) throw proResponse.error;
            if (exResponse.error) throw exResponse.error;

            setProfessionals(proResponse.data || []);
            setExceptions(exResponse.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addProfessional = async (newPro: Database['public']['Tables']['professionals']['Insert']) => {
        try {
            const { data, error } = await supabase
                .from('professionals')
                .insert(newPro)
                .select()
                .single();

            if (error) throw error;
            setProfessionals(prev => [...prev, data]);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateProfessional = async (id: string, updates: Database['public']['Tables']['professionals']['Update']) => {
        try {
            const { data, error } = await supabase
                .from('professionals')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setProfessionals(prev => prev.map(p => p.id === id ? data : p));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteProfessional = async (id: string) => {
        try {
            const { error } = await supabase
                .from('professionals')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProfessionals(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const addException = async (exception: Database['public']['Tables']['professional_exceptions']['Insert']) => {
        try {
            const { data, error } = await supabase
                .from('professional_exceptions')
                .insert(exception)
                .select()
                .single();

            if (error) throw error;
            setExceptions(prev => [...prev, data]);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateException = async (id: string, updates: Database['public']['Tables']['professional_exceptions']['Update']) => {
        try {
            const { data, error } = await supabase
                .from('professional_exceptions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setExceptions(prev => prev.map(e => e.id === id ? data : e));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteException = async (id: string) => {
        try {
            const { error } = await supabase
                .from('professional_exceptions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setExceptions(prev => prev.filter(e => e.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    return {
        professionals,
        exceptions,
        loading,
        error,
        addProfessional,
        updateProfessional,
        deleteProfessional,
        addException,
        updateException,
        deleteException,
        refresh: fetchData
    };
};
