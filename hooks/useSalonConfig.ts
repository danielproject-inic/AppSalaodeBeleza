import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type SalonConfig = Database['public']['Tables']['salon_config']['Row'];

export const useSalonConfig = () => {
    const [config, setConfig] = useState<SalonConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('salon_config')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setConfig(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const updateConfig = async (updates: Database['public']['Tables']['salon_config']['Update']) => {
        try {
            let result;
            if (config?.id) {
                // Update existing
                result = await supabase
                    .from('salon_config')
                    .update(updates)
                    .eq('id', config.id)
                    .select()
                    .single();
            } else {
                // Create new
                result = await supabase
                    .from('salon_config')
                    .insert(updates as any) // Type assertion might be needed if mismatch in optional fields
                    .select()
                    .single();
            }

            const { data, error } = result;

            if (error) throw error;
            setConfig(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    return { config, loading, error, updateConfig, refresh: fetchConfig };
};
