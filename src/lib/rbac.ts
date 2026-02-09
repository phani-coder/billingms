import type { UserRole, RolePermissions, User } from '@/types';

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  superadmin: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: true,
    canCancelInvoice: true,
    canCreatePurchase: true,
    canEditPurchase: true,
    canManageInventory: true,
    canManageCustomers: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canBackup: true,
    canRestore: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewAuditLog: true,
  },
  admin: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: false,
    canCancelInvoice: true,
    canCreatePurchase: true,
    canEditPurchase: true,
    canManageInventory: true,
    canManageCustomers: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canBackup: true,
    canRestore: false,
    canManageUsers: false,
    canManageSettings: true,
    canViewAuditLog: true,
  },
  billing_staff: {
    canCreateInvoice: true,
    canEditInvoice: false,
    canDeleteInvoice: false,
    canCancelInvoice: false,
    canCreatePurchase: false,
    canEditPurchase: false,
    canManageInventory: false,
    canManageCustomers: true,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canBackup: false,
    canRestore: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: false,
  },
  purchase_staff: {
    canCreateInvoice: false,
    canEditInvoice: false,
    canDeleteInvoice: false,
    canCancelInvoice: false,
    canCreatePurchase: true,
    canEditPurchase: false,
    canManageInventory: true,
    canManageCustomers: false,
    canManageSuppliers: true,
    canViewReports: false,
    canExportData: false,
    canBackup: false,
    canRestore: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: false,
  },
  readonly_auditor: {
    canCreateInvoice: false,
    canEditInvoice: false,
    canDeleteInvoice: false,
    canCancelInvoice: false,
    canCreatePurchase: false,
    canEditPurchase: false,
    canManageInventory: false,
    canManageCustomers: false,
    canManageSuppliers: false,
    canViewReports: true,
    canExportData: true,
    canBackup: false,
    canRestore: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAuditLog: true,
  },
};

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  superadmin: 'Super Administrator',
  admin: 'Administrator',
  billing_staff: 'Billing Staff',
  purchase_staff: 'Purchase Staff',
  readonly_auditor: 'Read-Only Auditor',
};

// Check if user has permission
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

// Check multiple permissions (AND logic)
export function hasAllPermissions(role: UserRole, permissions: (keyof RolePermissions)[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Check multiple permissions (OR logic)
export function hasAnyPermission(role: UserRole, permissions: (keyof RolePermissions)[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

// Get machine ID for audit purposes
export function getMachineId(): string {
  let machineId = localStorage.getItem('electrobill_machine_id');
  if (!machineId) {
    machineId = `M-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('electrobill_machine_id', machineId);
  }
  return machineId;
}

// Simple password hashing (for demo - use bcrypt in production with backend)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'electrobill_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// Generate session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Current user context (stored in memory)
let currentUser: User | null = null;
let currentSession: { token: string; expiresAt: Date } | null = null;

export function setCurrentUser(user: User | null, session?: { token: string; expiresAt: Date }): void {
  currentUser = user;
  currentSession = session ?? null;
  if (user) {
    sessionStorage.setItem('electrobill_user', JSON.stringify({ id: user.id, role: user.role }));
  } else {
    sessionStorage.removeItem('electrobill_user');
  }
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function getCurrentUserRole(): UserRole | null {
  return currentUser?.role ?? null;
}

export function isLoggedIn(): boolean {
  return currentUser !== null && currentSession !== null && new Date() < currentSession.expiresAt;
}

// Check permission for current user
export function can(permission: keyof RolePermissions): boolean {
  if (!currentUser) return false;
  return hasPermission(currentUser.role, permission);
}

// Require permission - throws if not authorized
export function requirePermission(permission: keyof RolePermissions, action: string): void {
  if (!can(permission)) {
    throw new Error(`Access denied: You do not have permission to ${action}`);
  }
}
