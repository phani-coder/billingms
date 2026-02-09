import { db } from '@/db/database';
import type { AuditAction, AuditLogEntry, UserRole } from '@/types';
import { getCurrentUser, getMachineId } from './rbac';

// Write immutable audit log entry
export async function writeAuditLog(
  action: AuditAction,
  entityType: string,
  entityId: string,
  options?: {
    previousValues?: object;
    newValues?: object;
    details?: string;
  }
): Promise<void> {
  const user = getCurrentUser();
  
  const entry: AuditLogEntry = {
    timestamp: new Date(),
    userId: user?.id ?? 0,
    userName: user?.displayName ?? 'System',
    userRole: user?.role ?? 'billing_staff',
    action,
    entityType,
    entityId,
    previousValues: options?.previousValues ? JSON.stringify(options.previousValues) : undefined,
    newValues: options?.newValues ? JSON.stringify(options.newValues) : undefined,
    machineId: getMachineId(),
    details: options?.details,
  };

  await db.auditLog.add(entry);
}

// Log invoice actions
export async function logInvoiceAction(
  action: 'invoice_create' | 'invoice_edit' | 'invoice_delete' | 'invoice_cancel' | 'invoice_print',
  invoiceNumber: string,
  previousValues?: object,
  newValues?: object
): Promise<void> {
  await writeAuditLog(action, 'invoice', invoiceNumber, { previousValues, newValues });
}

// Log purchase actions
export async function logPurchaseAction(
  action: 'purchase_create' | 'purchase_edit' | 'purchase_delete',
  purchaseNumber: string,
  previousValues?: object,
  newValues?: object
): Promise<void> {
  await writeAuditLog(action, 'purchase', purchaseNumber, { previousValues, newValues });
}

// Log stock adjustments
export async function logStockAdjustment(
  itemId: number,
  itemName: string,
  previousStock: number,
  newStock: number,
  reason: string
): Promise<void> {
  await writeAuditLog('stock_adjustment', 'inventory', String(itemId), {
    previousValues: { stock: previousStock },
    newValues: { stock: newStock },
    details: `${itemName}: ${previousStock} → ${newStock} (${reason})`,
  });
}

// Log user actions
export async function logUserAction(
  action: 'user_create' | 'user_edit' | 'user_delete' | 'user_login' | 'user_logout' | 'user_role_change',
  userId: number,
  details?: string
): Promise<void> {
  await writeAuditLog(action, 'user', String(userId), { details });
}

// Log backup/restore actions
export async function logBackupAction(
  action: 'backup_create' | 'backup_restore' | 'backup_encrypt',
  filename: string,
  details?: string
): Promise<void> {
  await writeAuditLog(action, 'backup', filename, { details });
}

// Log settings changes
export async function logSettingsChange(
  previousValues: object,
  newValues: object
): Promise<void> {
  await writeAuditLog('settings_change', 'settings', 'app_settings', { previousValues, newValues });
}

// Get audit log with filters
export async function getAuditLog(options?: {
  startDate?: Date;
  endDate?: Date;
  userId?: number;
  action?: AuditAction;
  entityType?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  let query = db.auditLog.orderBy('timestamp').reverse();
  
  const entries = await query.toArray();
  
  let filtered = entries;
  
  if (options?.startDate) {
    filtered = filtered.filter(e => e.timestamp >= options.startDate!);
  }
  if (options?.endDate) {
    filtered = filtered.filter(e => e.timestamp <= options.endDate!);
  }
  if (options?.userId) {
    filtered = filtered.filter(e => e.userId === options.userId);
  }
  if (options?.action) {
    filtered = filtered.filter(e => e.action === options.action);
  }
  if (options?.entityType) {
    filtered = filtered.filter(e => e.entityType === options.entityType);
  }
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

// Export audit log to CSV
export function exportAuditLogToCsv(entries: AuditLogEntry[]): string {
  const headers = [
    'Timestamp',
    'User',
    'Role',
    'Action',
    'Entity Type',
    'Entity ID',
    'Machine ID',
    'Details',
    'Previous Values',
    'New Values',
  ];
  
  const rows = entries.map(e => [
    e.timestamp.toISOString(),
    e.userName,
    e.userRole,
    e.action,
    e.entityType,
    e.entityId,
    e.machineId,
    e.details ?? '',
    e.previousValues ?? '',
    e.newValues ?? '',
  ]);
  
  const escapeCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\n');
}

// Audit action display names
export const AUDIT_ACTION_NAMES: Record<AuditAction, string> = {
  invoice_create: 'Invoice Created',
  invoice_edit: 'Invoice Edited',
  invoice_delete: 'Invoice Deleted',
  invoice_cancel: 'Invoice Cancelled',
  invoice_print: 'Invoice Printed',
  purchase_create: 'Purchase Created',
  purchase_edit: 'Purchase Edited',
  purchase_delete: 'Purchase Deleted',
  stock_adjustment: 'Stock Adjusted',
  stock_opening: 'Opening Stock Set',
  customer_create: 'Customer Created',
  customer_edit: 'Customer Edited',
  customer_delete: 'Customer Deleted',
  supplier_create: 'Supplier Created',
  supplier_edit: 'Supplier Edited',
  supplier_delete: 'Supplier Deleted',
  item_create: 'Item Created',
  item_edit: 'Item Edited',
  item_delete: 'Item Deleted',
  user_create: 'User Created',
  user_edit: 'User Edited',
  user_delete: 'User Deleted',
  user_login: 'User Login',
  user_logout: 'User Logout',
  user_role_change: 'Role Changed',
  backup_create: 'Backup Created',
  backup_restore: 'Backup Restored',
  backup_encrypt: 'Backup Encrypted',
  settings_change: 'Settings Changed',
  multiuser_enable: 'Multi-User Enabled',
  multiuser_disable: 'Multi-User Disabled',
};
