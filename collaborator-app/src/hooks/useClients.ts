import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

export const useClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const addClient = async (newClient: Database['public']['Tables']['clients']['Insert']) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .insert(newClient)
                .select()
                .single();

            if (error) throw error;
            setClients(prev => [...prev, data]);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateClient = async (id: string, updates: Database['public']['Tables']['clients']['Update']) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setClients(prev => prev.map(c => c.id === id ? data : c));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteClient = async (id: string) => {
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setClients(prev => prev.filter(c => c.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    return { clients, loading, error, addClient, updateClient, deleteClient, refresh: fetchClients };
};
