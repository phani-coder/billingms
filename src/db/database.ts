import Dexie, { type Table } from 'dexie';
import type { 
  InventoryItem, Customer, Supplier, Invoice, PurchaseEntry, 
  StockLedger, AppSettings, User, UserSession, AuditLogEntry 
} from '@/types';

export class AppDatabase extends Dexie {
  items!: Table<InventoryItem>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  invoices!: Table<Invoice>;
  purchases!: Table<PurchaseEntry>;
  stockLedger!: Table<StockLedger>;
  settings!: Table<AppSettings>;
  users!: Table<User>;
  sessions!: Table<UserSession>;
  auditLog!: Table<AuditLogEntry>;

  constructor() {
    super('ElectroBillDB');
    this.version(3).stores({
      items: '++id, name, sku, barcode, category, brand, specification, isActive, createdAt',
      customers: '++id, name, phone, gstNumber, createdAt',
      suppliers: '++id, name, phone, gstNumber, createdAt',
      invoices: '++id, invoiceNumber, invoiceType, invoiceDate, customerId, status, createdAt',
      purchases: '++id, purchaseNumber, purchaseDate, supplierId, createdAt',
      stockLedger: '++id, itemId, type, date, userId',
      settings: '++id',
      users: '++id, username, role, isActive',
      sessions: '++id, userId, token, expiresAt',
      auditLog: '++id, timestamp, userId, action, entityType, entityId',
    });
  }
}

export const db = new AppDatabase();

// Default settings
const DEFAULT_SETTINGS: Omit<AppSettings, 'id'> = {
  businessName: 'Sharma Electricals',
  businessAddress: '123, Main Market, New Delhi - 110001',
  businessPhone: '9876543210',
  businessGst: '07AAACS1234A1Z5',
  businessEmail: 'info@sharmaelectricals.com',
  stateCode: '07',
  invoicePrefix: 'SE',
  currentInvoiceNumber: 1000,
  currentPurchaseNumber: 500,
  invoiceFooter: 'Thank you for your business!',
  authorizedSignatory: 'Authorized Signatory',
  autoBackup: false,
  autoBackupTime: '02:00',
  backupFolder: '',
  backupRetentionDays: 30,
  backupEncryption: false,
  lastBackup: null,
  lastBackupFile: undefined,
  multiUserEnabled: false,
  multiUserCertified: false,
  eInvoiceEnabled: false,
  language: 'en',
  thermalPrinterEnabled: false,
  thermalPrinterWidth: 80,
  itemsPerPage: 50,
  enableCaching: true,
};

export async function getSettings(): Promise<AppSettings> {
  let settings = await db.settings.toCollection().first();
  if (!settings) {
    const id = await db.settings.add(DEFAULT_SETTINGS as AppSettings);
    settings = await db.settings.get(id);
  }
  return settings!;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const settings = await getSettings();
  await db.settings.update(settings.id!, updates);
}

export async function getNextInvoiceNumber(): Promise<string> {
  return await db.transaction('rw', db.settings, async () => {
    const settings = await getSettings();
    const next = settings.currentInvoiceNumber + 1;
    await db.settings.update(settings.id!, { currentInvoiceNumber: next });
    const fy = getFiscalYear();
    return `${settings.invoicePrefix}/${fy}/${String(next).padStart(4, '0')}`;
  });
}

export async function invoiceNumberExists(invoiceNumber: string): Promise<boolean> {
  const existing = await db.invoices.where('invoiceNumber').equals(invoiceNumber).first();
  return !!existing;
}

export async function getNextPurchaseNumber(): Promise<string> {
  return await db.transaction('rw', db.settings, async () => {
    const settings = await getSettings();
    const next = settings.currentPurchaseNumber + 1;
    await db.settings.update(settings.id!, { currentPurchaseNumber: next });
    return `PUR/${String(next).padStart(4, '0')}`;
  });
}

export async function purchaseNumberExists(purchaseNumber: string): Promise<boolean> {
  const existing = await db.purchases.where('purchaseNumber').equals(purchaseNumber).first();
  return !!existing;
}

function getFiscalYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1) % 100}`;
}

// Validate stock availability
export async function validateStockForSale(items: { itemId: number; quantity: number }[]): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const item of items) {
    const dbItem = await db.items.get(item.itemId);
    if (!dbItem) {
      errors.push(`Item ID ${item.itemId} not found`);
    } else if (dbItem.currentStock < item.quantity) {
      errors.push(`Insufficient stock for ${dbItem.name}: available ${dbItem.currentStock}, requested ${item.quantity}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function updateStockAfterSale(items: { itemId: number; quantity: number; name: string }[], invoiceNumber: string) {
  await db.transaction('rw', [db.items, db.stockLedger], async () => {
    for (const item of items) {
      const dbItem = await db.items.get(item.itemId);
      if (dbItem) {
        const newStock = dbItem.currentStock - item.quantity;
        if (newStock < 0) throw new Error(`Insufficient stock for ${item.name}`);
        await db.items.update(item.itemId, { currentStock: newStock, updatedAt: new Date() });
        await db.stockLedger.add({
          itemId: item.itemId,
          itemName: item.name,
          type: 'sale',
          referenceId: invoiceNumber,
          quantityChange: -item.quantity,
          previousStock: dbItem.currentStock,
          newStock,
          date: new Date(),
        });
      }
    }
  });
}

export async function reverseStockAfterSaleCancellation(items: { itemId: number; quantity: number; name: string }[], invoiceNumber: string) {
  await db.transaction('rw', [db.items, db.stockLedger], async () => {
    for (const item of items) {
      const dbItem = await db.items.get(item.itemId);
      if (dbItem) {
        const newStock = dbItem.currentStock + item.quantity;
        await db.items.update(item.itemId, { currentStock: newStock, updatedAt: new Date() });
        await db.stockLedger.add({
          itemId: item.itemId,
          itemName: item.name,
          type: 'adjustment',
          referenceId: `CANCEL-${invoiceNumber}`,
          quantityChange: item.quantity,
          previousStock: dbItem.currentStock,
          newStock,
          date: new Date(),
        });
      }
    }
  });
}

export async function cancelInvoice(invoiceId: number): Promise<void> {
  const invoice = await db.invoices.get(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'cancelled') throw new Error('Invoice already cancelled');
  
  await db.transaction('rw', [db.invoices, db.items, db.stockLedger], async () => {
    if (invoice.status === 'completed') {
      await reverseStockAfterSaleCancellation(
        invoice.items.map(i => ({ itemId: i.itemId, quantity: i.quantity, name: i.name })),
        invoice.invoiceNumber
      );
    }
    await db.invoices.update(invoiceId, { status: 'cancelled', updatedAt: new Date() });
  });
}

export async function updateStockAfterPurchase(items: { itemId: number; quantity: number; name: string; purchasePrice: number }[], purchaseNumber: string) {
  await db.transaction('rw', [db.items, db.stockLedger], async () => {
    for (const item of items) {
      const dbItem = await db.items.get(item.itemId);
      if (dbItem) {
        const newStock = dbItem.currentStock + item.quantity;
        await db.items.update(item.itemId, {
          currentStock: newStock,
          purchasePrice: item.purchasePrice,
          updatedAt: new Date(),
        });
        await db.stockLedger.add({
          itemId: item.itemId,
          itemName: item.name,
          type: 'purchase',
          referenceId: purchaseNumber,
          quantityChange: item.quantity,
          previousStock: dbItem.currentStock,
          newStock,
          date: new Date(),
        });
      }
    }
  });
}

export async function exportDatabase(): Promise<string> {
  const data = {
    version: 2,
    exportDate: new Date().toISOString(),
    items: await db.items.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    invoices: await db.invoices.toArray(),
    purchases: await db.purchases.toArray(),
    stockLedger: await db.stockLedger.toArray(),
    settings: await db.settings.toArray(),
    users: await db.users.toArray(),
    auditLog: await db.auditLog.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importDatabase(jsonStr: string): Promise<void> {
  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON format');
  }
  
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid backup file structure');
  }
  
  const expectedArrays = ['items', 'customers', 'suppliers', 'invoices', 'purchases', 'stockLedger', 'settings'];
  for (const key of expectedArrays) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`Invalid backup: ${key} must be an array`);
    }
  }

  await db.transaction('rw', [db.items, db.customers, db.suppliers, db.invoices, db.purchases, db.stockLedger, db.settings, db.users, db.auditLog], async () => {
    await db.items.clear();
    await db.customers.clear();
    await db.suppliers.clear();
    await db.invoices.clear();
    await db.purchases.clear();
    await db.stockLedger.clear();
    await db.settings.clear();

    if (data.items?.length) await db.items.bulkAdd(data.items);
    if (data.customers?.length) await db.customers.bulkAdd(data.customers);
    if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
    if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
    if (data.purchases?.length) await db.purchases.bulkAdd(data.purchases);
    if (data.stockLedger?.length) await db.stockLedger.bulkAdd(data.stockLedger);
    if (data.settings?.length) await db.settings.bulkAdd(data.settings);
    if (data.users?.length) {
      await db.users.clear();
      await db.users.bulkAdd(data.users);
    }
  });
}

// User management
export async function createDefaultAdmin(): Promise<void> {
  const existingAdmin = await db.users.where('role').equals('superadmin').first();
  if (!existingAdmin) {
    // Create default superadmin with password "admin123"
    const { hashPassword } = await import('@/lib/rbac');
    const passwordHash = await hashPassword('admin123');
    await db.users.add({
      username: 'admin',
      passwordHash,
      displayName: 'Administrator',
      role: 'superadmin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return await db.users.where('username').equals(username).first();
}

export async function getAllUsers(): Promise<User[]> {
  return await db.users.toArray();
}
