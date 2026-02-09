import { db, getSettings } from '@/db/database';
import type { BackupManifest, BackupFile, AppSettings } from '@/types';
import { getCurrentUser, getMachineId } from './rbac';
import { logBackupAction } from './audit';
import { format } from 'date-fns';

const APP_VERSION = '1.0.0';
const BACKUP_VERSION = 2;

// Calculate SHA256 checksum
export async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify checksum
export async function verifyChecksum(data: string, expectedChecksum: string): Promise<boolean> {
  const computed = await calculateChecksum(data);
  return computed === expectedChecksum;
}

// Simple XOR encryption (for demo - use AES in production)
export function encryptData(data: string, password: string): string {
  const key = password.repeat(Math.ceil(data.length / password.length)).slice(0, data.length);
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i));
  }
  return btoa(encrypted);
}

export function decryptData(encryptedData: string, password: string): string {
  const decoded = atob(encryptedData);
  const key = password.repeat(Math.ceil(decoded.length / password.length)).slice(0, decoded.length);
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i));
  }
  return decrypted;
}

// Create full backup
export async function createBackup(options?: {
  encrypt?: boolean;
  password?: string;
}): Promise<{ filename: string; content: string; manifest: BackupManifest }> {
  const user = getCurrentUser();
  
  // Gather all data
  const data = {
    items: await db.items.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    invoices: await db.invoices.toArray(),
    purchases: await db.purchases.toArray(),
    stockLedger: await db.stockLedger.toArray(),
    settings: await db.settings.toArray(),
    auditLog: await db.auditLog.toArray(),
    users: await db.users.toArray(),
  };
  
  const dataJson = JSON.stringify(data);
  const checksum = await calculateChecksum(dataJson);
  
  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    machineId: getMachineId(),
    userId: user?.id ?? 0,
    userName: user?.displayName ?? 'System',
    checksum,
    encrypted: options?.encrypt ?? false,
    tables: {
      items: data.items.length,
      customers: data.customers.length,
      suppliers: data.suppliers.length,
      invoices: data.invoices.length,
      purchases: data.purchases.length,
      stockLedger: data.stockLedger.length,
      auditLog: data.auditLog.length,
      users: data.users.length,
    },
  };
  
  const backupFile: BackupFile = {
    manifest,
    data,
  };
  
  let content = JSON.stringify(backupFile, null, 2);
  
  if (options?.encrypt && options?.password) {
    content = encryptData(content, options.password);
    manifest.encrypted = true;
  }
  
  const filename = `electrobill-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
  
  // Update last backup in settings
  const settings = await getSettings();
  await db.settings.update(settings.id!, {
    lastBackup: new Date(),
    lastBackupFile: filename,
  });
  
  // Log the backup action
  await logBackupAction('backup_create', filename, `Tables: ${Object.entries(manifest.tables).map(([k, v]) => `${k}:${v}`).join(', ')}`);
  
  return { filename, content, manifest };
}

// Validate backup file structure
export function validateBackupStructure(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid backup file: not an object');
    return { valid: false, errors };
  }
  
  if (!data.manifest) {
    errors.push('Missing manifest');
  } else {
    if (!data.manifest.version) errors.push('Missing manifest version');
    if (!data.manifest.checksum) errors.push('Missing manifest checksum');
    if (!data.manifest.createdAt) errors.push('Missing manifest creation date');
  }
  
  if (!data.data) {
    errors.push('Missing data section');
  } else {
    const requiredTables = ['items', 'customers', 'suppliers', 'invoices', 'purchases', 'stockLedger', 'settings'];
    for (const table of requiredTables) {
      if (!Array.isArray(data.data[table])) {
        errors.push(`Missing or invalid table: ${table}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Parse and validate backup file
export async function parseBackupFile(
  content: string,
  password?: string
): Promise<{ success: boolean; backup?: BackupFile; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    let jsonContent = content;
    
    // Try to detect if encrypted (base64)
    if (content.match(/^[A-Za-z0-9+/=]+$/)) {
      if (!password) {
        return { success: false, errors: ['Backup is encrypted. Please provide password.'] };
      }
      try {
        jsonContent = decryptData(content, password);
      } catch {
        return { success: false, errors: ['Failed to decrypt backup. Wrong password?'] };
      }
    }
    
    const backup = JSON.parse(jsonContent) as BackupFile;
    
    // Validate structure
    const structureValidation = validateBackupStructure(backup);
    if (!structureValidation.valid) {
      return { success: false, errors: structureValidation.errors };
    }
    
    // Verify checksum
    const dataJson = JSON.stringify(backup.data);
    const isValid = await verifyChecksum(dataJson, backup.manifest.checksum);
    if (!isValid) {
      errors.push('Checksum verification failed. Backup may be corrupted.');
      return { success: false, errors };
    }
    
    return { success: true, backup, errors: [] };
  } catch (e) {
    return { success: false, errors: ['Failed to parse backup file: ' + (e instanceof Error ? e.message : 'Unknown error')] };
  }
}

// Preview backup contents (for sandbox restore)
export function getBackupPreview(backup: BackupFile): {
  manifest: BackupManifest;
  summary: { table: string; count: number }[];
  sampleData: { table: string; samples: any[] }[];
} {
  const summary = Object.entries(backup.manifest.tables).map(([table, count]) => ({ table, count }));
  
  const sampleData = [
    { table: 'items', samples: backup.data.items.slice(0, 3) },
    { table: 'invoices', samples: backup.data.invoices.slice(0, 3) },
    { table: 'customers', samples: backup.data.customers.slice(0, 3) },
  ];
  
  return { manifest: backup.manifest, summary, sampleData };
}

// Restore from backup
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const user = getCurrentUser();
  
  await db.transaction('rw', [
    db.items, db.customers, db.suppliers, db.invoices, 
    db.purchases, db.stockLedger, db.settings, db.auditLog, db.users
  ], async () => {
    // Clear all tables
    await db.items.clear();
    await db.customers.clear();
    await db.suppliers.clear();
    await db.invoices.clear();
    await db.purchases.clear();
    await db.stockLedger.clear();
    await db.settings.clear();
    // Don't clear audit log - append restore event
    // Don't clear users if we have users in backup
    
    // Restore data
    if (backup.data.items?.length) await db.items.bulkAdd(backup.data.items);
    if (backup.data.customers?.length) await db.customers.bulkAdd(backup.data.customers);
    if (backup.data.suppliers?.length) await db.suppliers.bulkAdd(backup.data.suppliers);
    if (backup.data.invoices?.length) await db.invoices.bulkAdd(backup.data.invoices);
    if (backup.data.purchases?.length) await db.purchases.bulkAdd(backup.data.purchases);
    if (backup.data.stockLedger?.length) await db.stockLedger.bulkAdd(backup.data.stockLedger);
    if (backup.data.settings?.length) await db.settings.bulkAdd(backup.data.settings);
    if (backup.data.users?.length) {
      await db.users.clear();
      await db.users.bulkAdd(backup.data.users);
    }
  });
  
  // Log restore action
  await logBackupAction(
    'backup_restore',
    backup.manifest.createdAt,
    `Restored from backup created on ${backup.manifest.createdAt} by ${backup.manifest.userName}`
  );
}

// Auto-backup scheduler (runs in background)
let autoBackupInterval: number | null = null;

export function startAutoBackupScheduler(): void {
  // Check every minute if backup is due
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
  }
  
  autoBackupInterval = window.setInterval(async () => {
    try {
      const settings = await getSettings();
      if (!settings.autoBackup) return;
      
      const now = new Date();
      const [targetHour, targetMinute] = (settings.autoBackupTime || '02:00').split(':').map(Number);
      
      // Check if it's time for backup
      if (now.getHours() === targetHour && now.getMinutes() === targetMinute) {
        // Check if we already backed up today
        if (settings.lastBackup) {
          const lastBackup = new Date(settings.lastBackup);
          if (lastBackup.toDateString() === now.toDateString()) {
            return; // Already backed up today
          }
        }
        
        // Perform auto backup
        const { filename, content } = await createBackup({
          encrypt: settings.backupEncryption,
          password: settings.backupEncryption ? 'auto_backup_key' : undefined,
        });
        
        // In a real app, this would save to the configured folder
        // For browser app, we store in IndexedDB or trigger download
        console.log(`Auto-backup created: ${filename}`);
        
        // Store backup in local storage (limited, but works for demo)
        try {
          localStorage.setItem('electrobill_last_auto_backup', content);
          localStorage.setItem('electrobill_last_auto_backup_name', filename);
        } catch {
          // localStorage might be full
          console.warn('Could not store auto-backup in localStorage');
        }
      }
    } catch (e) {
      console.error('Auto-backup failed:', e);
    }
  }, 60000); // Check every minute
}

export function stopAutoBackupScheduler(): void {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
  }
}

// Get backup status
export async function getBackupStatus(): Promise<{
  lastBackup: Date | null;
  lastBackupFile: string | null;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  nextBackup: Date | null;
}> {
  const settings = await getSettings();
  
  let nextBackup: Date | null = null;
  if (settings.autoBackup && settings.autoBackupTime) {
    const [hour, minute] = settings.autoBackupTime.split(':').map(Number);
    const now = new Date();
    nextBackup = new Date(now);
    nextBackup.setHours(hour, minute, 0, 0);
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }
  }
  
  return {
    lastBackup: settings.lastBackup,
    lastBackupFile: settings.lastBackupFile || null,
    autoBackupEnabled: settings.autoBackup,
    autoBackupTime: settings.autoBackupTime || '02:00',
    nextBackup,
  };
}
