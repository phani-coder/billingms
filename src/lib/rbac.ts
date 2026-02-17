import type { UserRole, RolePermissions, User } from '@/types';

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  superadmin: {
    canCreateInvoice: true, canEditInvoice: true, canDeleteInvoice: true,
    canCancelInvoice: true, canCreatePurchase: true, canEditPurchase: true,
    canManageInventory: true, canManageCustomers: true, canManageSuppliers: true,
    canViewReports: true, canExportData: true, canBackup: true, canRestore: true,
    canManageUsers: true, canManageSettings: true, canViewAuditLog: true,
  },
  admin: {
    canCreateInvoice: true, canEditInvoice: true, canDeleteInvoice: false,
    canCancelInvoice: true, canCreatePurchase: true, canEditPurchase: true,
    canManageInventory: true, canManageCustomers: true, canManageSuppliers: true,
    canViewReports: true, canExportData: true, canBackup: true, canRestore: false,
    canManageUsers: false, canManageSettings: true, canViewAuditLog: true,
  },
  billing_staff: {
    canCreateInvoice: true, canEditInvoice: false, canDeleteInvoice: false,
    canCancelInvoice: false, canCreatePurchase: false, canEditPurchase: false,
    canManageInventory: false, canManageCustomers: true, canManageSuppliers: false,
    canViewReports: false, canExportData: false, canBackup: false, canRestore: false,
    canManageUsers: false, canManageSettings: false, canViewAuditLog: false,
  },
  purchase_staff: {
    canCreateInvoice: false, canEditInvoice: false, canDeleteInvoice: false,
    canCancelInvoice: false, canCreatePurchase: true, canEditPurchase: false,
    canManageInventory: true, canManageCustomers: false, canManageSuppliers: true,
    canViewReports: false, canExportData: false, canBackup: false, canRestore: false,
    canManageUsers: false, canManageSettings: false, canViewAuditLog: false,
  },
  readonly_auditor: {
    canCreateInvoice: false, canEditInvoice: false, canDeleteInvoice: false,
    canCancelInvoice: false, canCreatePurchase: false, canEditPurchase: false,
    canManageInventory: false, canManageCustomers: false, canManageSuppliers: false,
    canViewReports: true, canExportData: true, canBackup: false, canRestore: false,
    canManageUsers: false, canManageSettings: false, canViewAuditLog: true,
  },
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  superadmin: 'Super Administrator',
  admin: 'Administrator',
  billing_staff: 'Billing Staff',
  purchase_staff: 'Purchase Staff',
  readonly_auditor: 'Read-Only Auditor',
};

// ── Permission helpers ────────────────────────────────────────────────────────

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

export function hasAllPermissions(role: UserRole, permissions: (keyof RolePermissions)[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function hasAnyPermission(role: UserRole, permissions: (keyof RolePermissions)[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

// ── Machine ID (for audit trail) ─────────────────────────────────────────────

export function getMachineId(): string {
  let machineId = localStorage.getItem('electrobill_machine_id');
  if (!machineId) {
    machineId = `M-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('electrobill_machine_id', machineId);
  }
  return machineId;
}

// ── Password hashing ──────────────────────────────────────────────────────────
//
// BUG FIX: Replaced SHA-256 + hardcoded salt with bcryptjs (cost factor 12).
//
// The previous implementation used:
//   crypto.subtle.digest('SHA-256', encode(password + 'electrobill_salt_2024'))
//
// Problems with that approach:
//   1. SHA-256 is a fast hash — designed for speed, not password storage.
//      An attacker can compute billions of SHA-256 hashes per second on a GPU.
//   2. The salt was hardcoded in source code — anyone with the code knows it,
//      eliminating the protection a salt is supposed to provide.
//   3. The User type already says "// bcrypt hash" but SHA-256 was used instead.
//
// bcryptjs runs in the browser/renderer with no native dependencies needed.
// Each hash is slow by design (cost 12 = ~300ms) and includes a unique random
// salt automatically — defeating precomputed rainbow table attacks.
//
// IMPORTANT: Password verification for login is handled in electron/main.cjs
// (the main process) using bcryptjs there too. The renderer-side functions below
// are used only for: (a) testing purposes, (b) any renderer-side validation UI.
// The authoritative check is always in the main process via IPC.

export async function hashPassword(password: string): Promise<string> {
  // Dynamic import — bcryptjs is a devDependency available in the renderer
  // bundle via Vite. In Electron the main process uses require('bcryptjs').
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

// ── Session token (renderer side) ────────────────────────────────────────────

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Current user context ─────────────────────────────────────────────────────

let currentUser: User | null = null;
let currentSessionToken: string | null = null;

export function setCurrentUser(
  user: User | null,
  token?: string
): void {
  currentUser = user;
  currentSessionToken = token ?? null;

  if (user && token) {
    // Store token in sessionStorage (cleared on window close)
    sessionStorage.setItem('electrobill_session_token', token);
    sessionStorage.setItem('electrobill_user', JSON.stringify({
      id: user.id,
      role: user.role,
      displayName: user.displayName,
    }));
  } else {
    sessionStorage.removeItem('electrobill_session_token');
    sessionStorage.removeItem('electrobill_user');
  }
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function getCurrentUserRole(): UserRole | null {
  return currentUser?.role ?? null;
}

export function getSessionToken(): string | null {
  return currentSessionToken ?? sessionStorage.getItem('electrobill_session_token');
}

export function isLoggedIn(): boolean {
  return currentUser !== null && getSessionToken() !== null;
}

// ── BUG FIX: Must-change-password enforcement ─────────────────────────────────
//
// Previously createDefaultAdmin() in database.ts created 'admin123' with no
// mechanism to force a password change. Now the login flow checks this flag
// and must redirect to the change-password screen before any other action.

export function mustChangePassword(): boolean {
  if (!currentUser) return false;
  return (currentUser as any).mustChangePassword === true;
}

// ── Permission checks for current user ───────────────────────────────────────

export function can(permission: keyof RolePermissions): boolean {
  if (!currentUser) return false;
  return hasPermission(currentUser.role, permission);
}

export function requirePermission(permission: keyof RolePermissions, action: string): void {
  if (!currentUser) throw new Error('Access denied: Not logged in');
  if (!can(permission)) {
    throw new Error(`Access denied: You do not have permission to ${action}`);
  }
}
