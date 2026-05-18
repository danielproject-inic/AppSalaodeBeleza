import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Json } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Professional = Database['public']['Tables']['professionals']['Row'];

export interface SystemUser extends Omit<Profile, 'role' | 'permissions' | 'phone' | 'cpf' | 'birth_date' | 'address_json' | 'cash_pin' | 'email' | 'force_password_change' | 'onboarding_completed' | 'points'> {
    role: string | null;
    permissions: Record<string, boolean>; // Granular permissions
    email?: string | null;
    status?: string | null;
    professional_id?: string | null;
    phone?: string | null;
    cpf?: string | null;
    birth_date?: string | null;
    address_json?: Json | null;
    cash_pin?: string | null;
    force_password_change?: boolean | null;
    onboarding_completed?: boolean | null;
    points?: number | null;
    created_at?: string | null;
}

export const useSystemUsers = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // 1. Fetch Profiles (System Access) - NOW THE PRIMARY SOURCE
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*');

            if (profileError) throw profileError;

            // 2. Fetch Professionals (Staff Data)
            const { data: professionals, error: proError } = await supabase
                .from('professionals')
                .select('*')
                .order('name');

            if (proError) throw proError;

            // 3. Merge Data: Map Profiles to System Users
            const profileIdsMatched = new Set<string>();
            const merged: SystemUser[] = (profiles || []).map(profile => {
                // Parse permissions
                const perms = (profile.permissions as Record<string, boolean>) || {};

                // Try to find a professional linked to this profile
                // Linking logic: Match by profile ID first, then fallback to email match
                // IMPORTANT: If name differences are significant, don't match by email (prevents Daniel/Angela collision)
                const linkedPro = professionals?.find(pro => {
                    const idMatch = pro.id === profile.id;
                    const emailMatch = pro.email?.toLowerCase() === (profile as any).email?.toLowerCase() && pro.email;

                    if (idMatch) return true;
                    if (emailMatch) {
                        // If names are present and very different, it's a collision, not a match
                        const pName = profile.full_name?.toLowerCase() || '';
                        const proName = pro.name?.toLowerCase() || '';
                        if (pName && proName && !pName.includes(proName) && !proName.includes(pName)) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                });

                if (linkedPro) profileIdsMatched.add(linkedPro.id);

                return {
                    ...profile,
                    role: profile.role || null,
                    permissions: perms,
                    email: (profile as any).email || linkedPro?.email || 'Sem email',
                    full_name: profile.full_name || linkedPro?.name || 'Sem Nome',
                    avatar_url: profile.avatar_url || linkedPro?.avatar_url || null,
                    status: 'active',
                    professional_id: linkedPro?.id,
                    cash_pin: profile.cash_pin || null,
                    updated_at: profile.updated_at
                };
            });

            // 4. Add Professionals who DON'T have a profile yet (Pending Access)
            professionals?.forEach(pro => {
                if (!profileIdsMatched.has(pro.id)) {
                    merged.push({
                        id: pro.id,
                        full_name: pro.name,
                        avatar_url: pro.avatar_url,
                        role: null,
                        permissions: {},
                        email: pro.email || 'Sem email',
                        status: 'no_access',
                        professional_id: pro.id,
                        cash_pin: null,
                        onboarding_completed: false,
                        force_password_change: false,
                        points: 0,
                        updated_at: pro.updated_at,
                        created_at: pro.created_at
                    });
                }
            });

            setUsers(merged);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const updateUserPermissions = async (userId: string, newPermissions: Record<string, boolean>) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ permissions: newPermissions })
                .eq('id', userId);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: newPermissions } : u));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const updateProfessionalEmail = async (professionalId: string, email: string) => {
        try {
            const { error } = await supabase
                .from('professionals')
                .update({ email })
                .eq('id', professionalId);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.professional_id === professionalId ? { ...u, email } : u));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const updateUserCashPin = async (userId: string, newPin: string | null) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ cash_pin: newPin })
                .eq('id', userId);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, cash_pin: newPin } : u));
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    return { users, loading, error, refresh: fetchUsers, updateUserRole, updateUserPermissions, updateProfessionalEmail, updateUserCashPin };
};
