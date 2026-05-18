import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSalonConfig } from '../hooks/useSalonConfig';

interface SalonContextType {
    salonName: string;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const SalonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { config, loading, error, refresh } = useSalonConfig();

    // Fallback to "App Salão de Beleza" if no name is configured
    const salonName = config?.name || "App Salão de Beleza";

    useEffect(() => {
        if (salonName) {
            document.title = salonName;
        }
    }, [salonName]);

    return (
        <SalonContext.Provider value={{ salonName, loading, error, refresh }}>
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
