import { useState, useEffect, useCallback } from 'react';
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
            const items = data || [];
            setAppointments(items);
            setError(null);

            // Armazena no cache local IndexedDB para uso offline
            if (items.length > 0) {
                cacheItems('appointments', items).catch(err => 
                    console.warn('[useAppointments] Erro ao salvar cache:', err)
                );
            }
        } catch (err: any) {
            console.warn('[useAppointments] Falha ao buscar da nuvem, tentando cache offline...', err);
            
            // Fallback Offline: carregar do IndexedDB
            try {
                const cached = await getCachedItems<Appointment>('appointments');
                let filtered = cached;

                if (startDate) {
                    filtered = filtered.filter(a => a.start_time >= startDate);
                }
                if (endDate) {
                    filtered = filtered.filter(a => a.start_time <= endDate);
                }
                if (professionalId) {
                    filtered = filtered.filter(a => a.professional_id === professionalId);
                }

                filtered.sort((a, b) => (a.start_time > b.start_time ? 1 : -1));
                setAppointments(filtered);
                setError(null);
            } catch (cacheErr: any) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();

        const channelId = `appointments_channel_${Math.random().toString(36).substring(2, 9)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchAppointments();
            })
            .subscribe();

        // Recarrega do banco assim que uma sincronização offline for concluída com sucesso
        const handleSyncCompleted = () => {
            fetchAppointments();
        };
        window.addEventListener('offline-sync-completed', handleSyncCompleted);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('offline-sync-completed', handleSyncCompleted);
        };
    }, [startDate, endDate, professionalId]);

    const addAppointment = useCallback(async (appointment: Database['public']['Tables']['appointments']['Insert']) => {
        const id = appointment.id || generateUUID();
        const appointmentWithId = {
            ...appointment,
            id,
            created_at: appointment.created_at || new Date().toISOString(),
            updated_at: appointment.updated_at || new Date().toISOString()
        };

        const handleOfflineAdd = async () => {
            console.log('[useAppointments] Registrando agendamento em modo offline...', appointmentWithId);
            // Salva no cache local
            await putCachedItem('appointments', appointmentWithId);
            // Enfileira para sincronização
            await enqueueSync({
                table: 'appointments',
                action: 'insert',
                recordId: id,
                payload: appointmentWithId
            });
            // Atualiza UI instantaneamente (otimista 0ms)
            setAppointments(prev => [...prev, appointmentWithId as Appointment]);
            return appointmentWithId as Appointment;
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return await handleOfflineAdd();
        }

        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert(appointmentWithId)
                .select(`
                    *,
                    client:clients(*),
                    service:services(*),
                    professional:professionals(*)
                `)
                .single();

            if (error) throw error;
            setAppointments(prev => [...prev, data]);
            putCachedItem('appointments', data).catch(console.warn);
            return data;
        } catch (err: any) {
            // Se falhou por motivo de rede, faz fallback offline
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineAdd();
            }
            setError(err.message);
            return null;
        }
    }, []);

    const updateAppointment = useCallback(async (id: string, updates: Database['public']['Tables']['appointments']['Update']) => {
        const handleOfflineUpdate = async () => {
            console.log('[useAppointments] Atualizando agendamento em modo offline...', id, updates);
            let updatedRecord: Appointment | null = null;
            
            setAppointments(prev => {
                const next = prev.map(a => {
                    if (a.id === id) {
                        updatedRecord = { ...a, ...updates, updated_at: new Date().toISOString() };
                        return updatedRecord;
                    }
                    return a;
                });
                return next;
            });

            if (updatedRecord) {
                await putCachedItem('appointments', updatedRecord);
            }

            await enqueueSync({
                table: 'appointments',
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
            putCachedItem('appointments', data).catch(console.warn);
            return data;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineUpdate();
            }
            setError(err.message);
            return null;
        }
    }, []);

    const deleteAppointment = useCallback(async (id: string) => {
        const handleOfflineDelete = async () => {
            console.log('[useAppointments] Excluindo agendamento em modo offline...', id);
            setAppointments(prev => prev.filter(a => a.id !== id));
            await deleteCachedItem('appointments', id);
            await enqueueSync({
                table: 'appointments',
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
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAppointments(prev => prev.filter(a => a.id !== id));
            deleteCachedItem('appointments', id).catch(console.warn);
            return true;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineDelete();
            }
            setError(err.message);
            return false;
        }
    }, []);

    return { appointments, loading, error, addAppointment, updateAppointment, deleteAppointment, refresh: fetchAppointments };
};
