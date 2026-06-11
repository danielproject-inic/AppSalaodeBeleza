import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

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

    return { clients, loading, error, addClient, updateClient, deleteClient, checkDuplicate, refresh: fetchClients };
};
