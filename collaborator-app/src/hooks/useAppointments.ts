import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
    client?: Database['public']['Tables']['clients']['Row'] | null;
    service?: Database['public']['Tables']['services']['Row'] | null;
    professional?: Database['public']['Tables']['professionals']['Row'] | null;
};

export const useAppointments = (startDate?: string, endDate?: string, professionalId?: string) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('appointments')
                .select(`
                    *,
                    client:clients(*),
                    service:services(*),
                    professional:professionals(*)
                `);

            if (startDate) {
                query = query.gte('start_time', startDate);
            }
            if (endDate) {
                query = query.lte('start_time', endDate);
            }
            if (professionalId) {
                query = query.eq('professional_id', professionalId);
            }

            const { data, error } = await query.order('start_time');

            if (error) throw error;
            setAppointments(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();

        // Subscribe to changes
        const subscription = supabase
            .channel('appointments_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [startDate, endDate, professionalId]);

    const addAppointment = useCallback(async (appointment: Database['public']['Tables']['appointments']['Insert']) => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert(appointment)
                .select(`
                    *,
                    client:clients(*),
                    service:services(*),
                    professional:professionals(*)
                `)
                .single();

            if (error) throw error;
            setAppointments(prev => [...prev, data]);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    }, []);

    const updateAppointment = useCallback(async (id: string, updates: Database['public']['Tables']['appointments']['Update']) => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .update(updates)
                .eq('id', id)
                .select(`
                    *,
                    client:clients(*),
                    service:services(*),
                    professional:professionals(*)
                `)
                .single();

            if (error) throw error;
            setAppointments(prev => prev.map(a => a.id === id ? data : a));
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    }, []);

    const deleteAppointment = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAppointments(prev => prev.filter(a => a.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    return { appointments, loading, error, addAppointment, updateAppointment, deleteAppointment, refresh: fetchAppointments };
};
