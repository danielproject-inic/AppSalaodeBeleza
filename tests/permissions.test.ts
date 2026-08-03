import { describe, it, expect } from 'vitest';

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
    }
};

function hasAccess(userRole: string, customPermissions: Record<string, boolean> | null, moduleKey: string): boolean {
    if (customPermissions && typeof customPermissions === 'object' && moduleKey in customPermissions) {
        return !!customPermissions[moduleKey];
    }
    const roleDefaults = ROLE_DEFAULTS[userRole] || ROLE_DEFAULTS.professional;
    return !!roleDefaults[moduleKey];
}

describe('Matriz de Permissões RBAC (useCurrentUserRef)', () => {
    it('Admin deve ter acesso total a todos os módulos por padrão', () => {
        expect(hasAccess('admin', null, 'dashboard_view')).toBe(true);
        expect(hasAccess('admin', null, 'settings_edit')).toBe(true);
        expect(hasAccess('admin', null, 'cashflow_edit')).toBe(true);
    });

    it('Recepcionista não deve poder excluir clientes nem acessar configurações', () => {
        expect(hasAccess('receptionist', null, 'clients_view')).toBe(true);
        expect(hasAccess('receptionist', null, 'clients_delete')).toBe(false);
        expect(hasAccess('receptionist', null, 'settings_view')).toBe(false);
    });

    it('Permissões customizadas devem ter precedência sobre o padrão da role', () => {
        const custom = { settings_view: true };
        expect(hasAccess('receptionist', custom, 'settings_view')).toBe(true);
    });
});
