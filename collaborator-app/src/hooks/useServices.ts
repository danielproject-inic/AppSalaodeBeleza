import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Service = Database['public']['Tables']['services']['Row'];

export interface ServiceWithPros extends Service {
    professionals: {
        professional: Database['public']['Tables']['professionals']['Row']
    }[]
}

export const useServices = () => {
    const [services, setServices] = useState<ServiceWithPros[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('services')
                .select(`
                    *,
                    professionals:service_professionals(
                        professional:professionals(*)
                    )
                `)
                .order('title');

            if (error) throw error;
            setServices(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addService = async (service: Database['public']['Tables']['services']['Insert'], professionalIds?: string[]) => {
        try {
            const { data, error } = await supabase
                .from('services')
                .insert(service)
                .select()
                .single();

            if (error) throw error;

            if (professionalIds && professionalIds.length > 0) {
                const relations = professionalIds.map(proId => ({
                    service_id: data.id,
                    professional_id: proId
                }));
                const { error: relError } = await supabase
                    .from('service_professionals')
                    .insert(relations);

                if (relError) throw relError;
            }

            await fetchServices();
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const updateService = async (id: string, updates: Database['public']['Tables']['services']['Update'], professionalIds?: string[]) => {
        try {
            const { data, error } = await supabase
                .from('services')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            if (professionalIds !== undefined) {
                // Delete old relations
                const { error: delError } = await supabase
                    .from('service_professionals')
                    .delete()
                    .eq('service_id', id);

                if (delError) throw delError;

                // Insert new relations
                if (professionalIds.length > 0) {
                    const relations = professionalIds.map(proId => ({
                        service_id: id,
                        professional_id: proId
                    }));
                    const { error: relError } = await supabase
                        .from('service_professionals')
                        .insert(relations);

                    if (relError) throw relError;
                }
            }

            await fetchServices();
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    };

    const deleteService = async (id: string) => {
        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setServices(prev => prev.filter(s => s.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    return { services, loading, error, addService, updateService, deleteService, refresh: fetchServices };
};
