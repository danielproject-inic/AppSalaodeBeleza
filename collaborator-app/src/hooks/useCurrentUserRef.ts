import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type ModuleKey =
    // Dashboard
    | 'dashboard_view'
    // Agenda
    | 'agenda_view' | 'agenda_edit'
    // Clients
    | 'clients_view' | 'clients_create' | 'clients_edit' | 'clients_delete'
    // Team
    | 'team_navbar_view' | 'team_view_all' | 'team_self_edit' | 'team_edit'
    // Services
    | 'services_view' | 'services_edit'
    // Products
    | 'products_view' | 'products_edit'
    // Finance: Caixa
    | 'cashflow_view' | 'cashflow_edit'
    // Finance: Comissões
    | 'commissions_view' | 'commissions_edit'
    // Settings
    | 'settings_view' | 'settings_edit';

const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
    admin: {
        dashboard_view: true,
        agenda_view: true, agenda_edit: true,
        clients_view: true, clients_create: true, clients_edit: true, clients_delete: true,
        team_navbar_view: true, team_view_all: true, team_self_edit: true, team_edit: true,
        services_view: true, services_edit: true,
        products_view: true, products_edit: true,
        cashflow_view: true, cashflow_edit: true,
        commissions_view: true, commissions_edit: true,
        settings_view: true, settings_edit: true
    },
    manager: {
        dashboard_view: true,
        agenda_view: true, agenda_edit: true,
        clients_view: true, clients_create: true, clients_edit: true, clients_delete: true,
        team_navbar_view: true, team_view_all: true, team_self_edit: true, team_edit: true,
        services_view: true, services_edit: true,
        products_view: true, products_edit: true,
        cashflow_view: true, cashflow_edit: true,
        commissions_view: true, commissions_edit: true,
        settings_view: true, settings_edit: true
    },
    receptionist: {
        dashboard_view: true,
        agenda_view: true, agenda_edit: true,
        clients_view: true, clients_create: true, clients_edit: true, clients_delete: false,
        team_navbar_view: false, team_view_all: false, team_self_edit: false, team_edit: false,
        services_view: true, services_edit: false,
        products_view: true, products_edit: false,
        cashflow_view: true, cashflow_edit: true,
        commissions_view: true, commissions_edit: false,
        settings_view: false, settings_edit: false
    },
    professional: {
        dashboard_view: false,
        agenda_view: false, agenda_edit: false,
        clients_view: false, clients_create: false, clients_edit: false, clients_delete: false,
        team_navbar_view: false, team_view_all: false, team_self_edit: false, team_edit: false,
        services_view: false, services_edit: false,
        products_view: false, products_edit: false,
        cashflow_view: false, cashflow_edit: false,
        commissions_view: false, commissions_edit: false,
        settings_view: false, settings_edit: false
    },
    user: {
        dashboard_view: false,
        agenda_view: false, agenda_edit: false,
        clients_view: false, clients_create: false, clients_edit: false, clients_delete: false,
        team_navbar_view: false, team_view_all: false, team_self_edit: false, team_edit: false,
        services_view: false, services_edit: false,
        products_view: false, products_edit: false,
        cashflow_view: false, cashflow_edit: false,
        commissions_view: false, commissions_edit: false,
        settings_view: false, settings_edit: false
    }
};

export const useCurrentUserRef = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [professionalId, setProfessionalId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string>('user');
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                setError(null);
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError) throw authError;

                if (user) {
                    // 1. Fetch Profile
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (profileError) throw profileError;

                    if (userProfile) {
                        setProfile(userProfile);
                        const rawRole = (userProfile.role || 'user').toLowerCase();
                        setRole(rawRole);

                        const basePerms = ROLE_DEFAULTS[rawRole] || ROLE_DEFAULTS['user'];
                        const dbPerms = (userProfile.permissions as Record<string, boolean>) || {};
                        const mergedPerms: Record<string, boolean> = { ...basePerms };

                        Object.keys(dbPerms).forEach(key => {
                            mergedPerms[key] = dbPerms[key];
                        });

                        setPermissions(mergedPerms);

                        // 2. Fetch corresponding Professional Record if email matches
                        if (user.email) {
                            const { data: pro } = await supabase
                                .from('professionals')
                                .select('id')
                                .ilike('email', user.email)
                                .maybeSingle();

                            if (pro) setProfessionalId(pro.id);
                        }
                    }
                }
            } catch (err: any) {
                console.error("Auth context error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchUser();
        });

        return () => subscription.unsubscribe();
    }, []);

    const hasAccess = (module: ModuleKey): boolean => {
        if (role === 'admin') return true;
        return !!permissions[module];
    };

    const mustChangePassword = !!profile?.force_password_change;

    return { profile, role, professionalId, permissions, hasAccess, loading, error, mustChangePassword };
};
