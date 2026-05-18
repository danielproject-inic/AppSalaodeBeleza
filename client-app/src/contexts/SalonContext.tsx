import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface SalonContextType {
    salonName: string;
    loading: boolean;
    error: string | null;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const SalonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [salonName, setSalonName] = useState<string>('App Salão de Beleza');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSalonConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('salon_config')
                    .select('name')
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                if (data && data.name) {
                    setSalonName(data.name);
                    document.title = `${data.name} - App do Cliente`;
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSalonConfig();
    }, []);

    return (
        <SalonContext.Provider value={{ salonName, loading, error }}>
            {children}
        </SalonContext.Provider>
    );
};

export const useSalon = () => {
    const context = useContext(SalonContext);
    if (context === undefined) {
        throw new Error('useSalon must be used within a SalonProvider');
    }
    return context;
};
