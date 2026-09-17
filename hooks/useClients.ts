import { useState, useEffect } from 'react';
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

type Client = Database['public']['Tables']['clients']['Row'];

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchType?: 'name_phone' | 'phone' | 'cpf' | 'name';
    existingClient?: Client;
    message?: string;
}

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
            const items = data || [];
            setClients(items);
            setError(null);

            if (items.length > 0) {
                cacheItems('clients', items).catch(err =>
                    console.warn('[useClients] Erro ao salvar cache local:', err)
                );
            }
        } catch (err: any) {
            console.warn('[useClients] Falha ao buscar da nuvem, tentando cache offline...', err);
            try {
                const cached = await getCachedItems<Client>('clients');
                cached.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setClients(cached);
                setError(null);
            } catch (cacheErr: any) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();

        const channelId = `clients_channel_${Math.random().toString(36).substring(2, 9)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                fetchClients();
            })
            .subscribe();

        const handleSyncCompleted = () => {
            fetchClients();
        };
        window.addEventListener('offline-sync-completed', handleSyncCompleted);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('offline-sync-completed', handleSyncCompleted);
        };
    }, []);

    // Check for duplicate clients by name, phone, or CPF
    const checkDuplicate = (name: string, phone: string, cpf: string, excludeId?: string): DuplicateCheckResult => {
        const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
        const normalizedPhone = phone.replace(/\D/g, '');
        const normalizedCpf = cpf.replace(/\D/g, '');

        for (const client of clients) {
            // Skip the client being edited
            if (excludeId && client.id === excludeId) continue;

            const existingName = (client.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const existingPhone = (client.phone || '').replace(/\D/g, '');
            const existingCpf = (client.cpf || '').replace(/\D/g, '');

            // 1. Exact name + phone match (strongest duplicate indicator)
            if (normalizedName && existingName === normalizedName && normalizedPhone && existingPhone === normalizedPhone) {
                return {
                    isDuplicate: true,
                    matchType: 'name_phone',
                    existingClient: client,
                    message: `Já existe um cliente com o mesmo nome e telefone: "${client.name}" — Tel: ${client.phone}`
                };
            }

            // 2. Same CPF (unique identifier)
            if (normalizedCpf.length === 11 && existingCpf === normalizedCpf) {
                return {
                    isDuplicate: true,
                    matchType: 'cpf',
                    existingClient: client,
                    message: `Já existe um cliente com o mesmo CPF: "${client.name}" — CPF: ${client.cpf}`
                };
            }

            // 3. Same phone (warning - might be family)
            if (normalizedPhone.length >= 10 && existingPhone === normalizedPhone) {
                return {
                    isDuplicate: true,
                    matchType: 'phone',
                    existingClient: client,
                    message: `Já existe um cliente com o mesmo telefone: "${client.name}" — Tel: ${client.phone}`
                };
            }

            // 4. Same name (warning - might be different person)
            if (normalizedName.length >= 3 && existingName === normalizedName) {
                return {
                    isDuplicate: true,
                    matchType: 'name',
                    existingClient: client,
                    message: `Já existe um cliente com o mesmo nome: "${client.name}"`
                };
            }
        }

        return { isDuplicate: false };
    };

    const addClient = async (newClient: Database['public']['Tables']['clients']['Insert']) => {
        const id = newClient.id || generateUUID();
        const clientWithId: Client = {
            ...newClient,
            id,
            created_at: newClient.created_at || new Date().toISOString()
        } as Client;

        const handleOfflineAdd = async () => {
            console.log('[useClients] Cadastrando cliente em modo offline...', clientWithId);
            await putCachedItem('clients', clientWithId);
            await enqueueSync({
                table: 'clients',
                action: 'insert',
                recordId: id,
                payload: clientWithId
            });
            setClients(prev => [...prev, clientWithId]);
            return clientWithId;
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return await handleOfflineAdd();
        }

        try {
            const { data, error } = await supabase
                .from('clients')
                .insert(clientWithId)
                .select()
                .single();

            if (error) throw error;
            setClients(prev => [...prev, data]);
            putCachedItem('clients', data).catch(console.warn);
            return data;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineAdd();
            }
            setError(err.message);
            return null;
        }
    };

    const updateClient = async (id: string, updates: Database['public']['Tables']['clients']['Update']) => {
        const handleOfflineUpdate = async () => {
            console.log('[useClients] Atualizando cliente em modo offline...', id, updates);
            let updatedRecord: Client | null = null;
            setClients(prev => {
                const next = prev.map(c => {
                    if (c.id === id) {
                        updatedRecord = { ...c, ...updates };
                        return updatedRecord;
                    }
                    return c;
                });
                return next;
            });

            if (updatedRecord) {
                await putCachedItem('clients', updatedRecord);
            }

            await enqueueSync({
                table: 'clients',
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
                .from('clients')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setClients(prev => prev.map(c => c.id === id ? data : c));
            putCachedItem('clients', data).catch(console.warn);
            return data;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineUpdate();
            }
            setError(err.message);
            return null;
        }
    };

    const deleteClient = async (id: string) => {
        const handleOfflineDelete = async () => {
            console.log('[useClients] Excluindo cliente em modo offline...', id);
            setClients(prev => prev.filter(c => c.id !== id));
            await deleteCachedItem('clients', id);
            await enqueueSync({
                table: 'clients',
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
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setClients(prev => prev.filter(c => c.id !== id));
            deleteCachedItem('clients', id).catch(console.warn);
            return true;
        } catch (err: any) {
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                return await handleOfflineDelete();
            }
            setError(err.message);
            return false;
        }
    };

    return { clients, loading, error, addClient, updateClient, deleteClient, checkDuplicate, refresh: fetchClients };
};
