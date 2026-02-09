import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getRolePermissions,
  hasAllPermissions,
  hasAnyPermission,
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
} from '@/lib/rbac';
import type { UserRole, RolePermissions } from '@/types';

describe('Role-Based Access Control - Production Certification Tests', () => {
  
  describe('Role Permissions Matrix', () => {
    const allRoles: UserRole[] = ['superadmin', 'admin', 'billing_staff', 'purchase_staff', 'readonly_auditor'];
    
    it('should have permissions defined for all roles', () => {
      for (const role of allRoles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      }
    });

    it('should have display names for all roles', () => {
      for (const role of allRoles) {
        expect(ROLE_DISPLAY_NAMES[role]).toBeDefined();
        expect(ROLE_DISPLAY_NAMES[role].length).toBeGreaterThan(0);
      }
    });
  });

  describe('SuperAdmin Permissions', () => {
    const role: UserRole = 'superadmin';

    it('should have all permissions', () => {
      const permissions = getRolePermissions(role);
      const allPermissions = Object.values(permissions);
      expect(allPermissions.every(p => p === true)).toBe(true);
    });

    it('should be able to manage users', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(true);
    });

    it('should be able to restore backups', () => {
      expect(hasPermission(role, 'canRestore')).toBe(true);
    });

    it('should be able to view audit logs', () => {
      expect(hasPermission(role, 'canViewAuditLog')).toBe(true);
    });
  });

  describe('Admin Permissions', () => {
    const role: UserRole = 'admin';

    it('should have invoice permissions', () => {
      expect(hasPermission(role, 'canCreateInvoice')).toBe(true);
      expect(hasPermission(role, 'canEditInvoice')).toBe(true);
      expect(hasPermission(role, 'canCancelInvoice')).toBe(true);
    });

    it('should NOT be able to delete invoices', () => {
      expect(hasPermission(role, 'canDeleteInvoice')).toBe(false);
    });

    it('should NOT be able to manage users', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
    });

    it('should NOT be able to restore backups', () => {
      expect(hasPermission(role, 'canRestore')).toBe(false);
    });

    it('should be able to backup but not restore', () => {
      expect(hasPermission(role, 'canBackup')).toBe(true);
      expect(hasPermission(role, 'canRestore')).toBe(false);
    });
  });

  describe('Billing Staff Permissions', () => {
    const role: UserRole = 'billing_staff';

    it('should be able to create invoices', () => {
      expect(hasPermission(role, 'canCreateInvoice')).toBe(true);
    });

    it('should NOT be able to edit or delete invoices', () => {
      expect(hasPermission(role, 'canEditInvoice')).toBe(false);
      expect(hasPermission(role, 'canDeleteInvoice')).toBe(false);
      expect(hasPermission(role, 'canCancelInvoice')).toBe(false);
    });

    it('should be able to manage customers', () => {
      expect(hasPermission(role, 'canManageCustomers')).toBe(true);
    });

    it('should NOT have any admin permissions', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
      expect(hasPermission(role, 'canManageSettings')).toBe(false);
      expect(hasPermission(role, 'canBackup')).toBe(false);
      expect(hasPermission(role, 'canRestore')).toBe(false);
      expect(hasPermission(role, 'canViewAuditLog')).toBe(false);
    });

    it('should NOT be able to manage inventory', () => {
      expect(hasPermission(role, 'canManageInventory')).toBe(false);
    });
  });

  describe('Purchase Staff Permissions', () => {
    const role: UserRole = 'purchase_staff';

    it('should be able to create purchases', () => {
      expect(hasPermission(role, 'canCreatePurchase')).toBe(true);
    });

    it('should be able to manage inventory', () => {
      expect(hasPermission(role, 'canManageInventory')).toBe(true);
    });

    it('should be able to manage suppliers', () => {
      expect(hasPermission(role, 'canManageSuppliers')).toBe(true);
    });

    it('should NOT be able to create invoices', () => {
      expect(hasPermission(role, 'canCreateInvoice')).toBe(false);
    });

    it('should NOT have admin permissions', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
      expect(hasPermission(role, 'canViewReports')).toBe(false);
    });
  });

  describe('Read-Only Auditor Permissions', () => {
    const role: UserRole = 'readonly_auditor';

    it('should be able to view reports', () => {
      expect(hasPermission(role, 'canViewReports')).toBe(true);
    });

    it('should be able to view audit logs', () => {
      expect(hasPermission(role, 'canViewAuditLog')).toBe(true);
    });

    it('should be able to export data', () => {
      expect(hasPermission(role, 'canExportData')).toBe(true);
    });

    it('should NOT be able to create anything', () => {
      expect(hasPermission(role, 'canCreateInvoice')).toBe(false);
      expect(hasPermission(role, 'canCreatePurchase')).toBe(false);
    });

    it('should NOT be able to edit anything', () => {
      expect(hasPermission(role, 'canEditInvoice')).toBe(false);
      expect(hasPermission(role, 'canEditPurchase')).toBe(false);
      expect(hasPermission(role, 'canManageInventory')).toBe(false);
      expect(hasPermission(role, 'canManageCustomers')).toBe(false);
      expect(hasPermission(role, 'canManageSuppliers')).toBe(false);
    });

    it('should NOT have any admin permissions', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
      expect(hasPermission(role, 'canManageSettings')).toBe(false);
      expect(hasPermission(role, 'canBackup')).toBe(false);
      expect(hasPermission(role, 'canRestore')).toBe(false);
    });
  });

  describe('Permission Helper Functions', () => {
    it('hasAllPermissions should require all permissions', () => {
      const result = hasAllPermissions('superadmin', ['canCreateInvoice', 'canEditInvoice', 'canDeleteInvoice']);
      expect(result).toBe(true);

      const result2 = hasAllPermissions('billing_staff', ['canCreateInvoice', 'canEditInvoice']);
      expect(result2).toBe(false);
    });

    it('hasAnyPermission should require at least one permission', () => {
      const result = hasAnyPermission('billing_staff', ['canCreateInvoice', 'canEditInvoice']);
      expect(result).toBe(true);

      const result2 = hasAnyPermission('readonly_auditor', ['canCreateInvoice', 'canEditInvoice']);
      expect(result2).toBe(false);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('billing_staff should never have more permissions than admin', () => {
      const billingPerms = getRolePermissions('billing_staff');
      const adminPerms = getRolePermissions('admin');
      
      for (const [key, value] of Object.entries(billingPerms)) {
        if (value === true) {
          expect(adminPerms[key as keyof RolePermissions]).toBe(true);
        }
      }
    });

    it('admin should never have more permissions than superadmin', () => {
      const adminPerms = getRolePermissions('admin');
      const superadminPerms = getRolePermissions('superadmin');
      
      for (const [key, value] of Object.entries(adminPerms)) {
        if (value === true) {
          expect(superadminPerms[key as keyof RolePermissions]).toBe(true);
        }
      }
    });

    it('readonly_auditor should have minimal write permissions', () => {
      const perms = getRolePermissions('readonly_auditor');
      const writePerms = [
        perms.canCreateInvoice,
        perms.canEditInvoice,
        perms.canDeleteInvoice,
        perms.canCreatePurchase,
        perms.canEditPurchase,
        perms.canManageInventory,
        perms.canManageUsers,
        perms.canBackup,
        perms.canRestore,
      ];
      expect(writePerms.every(p => p === false)).toBe(true);
    });
  });
});
