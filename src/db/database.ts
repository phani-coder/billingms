import Dexie, { type Table } from 'dexie';
import type { InventoryItem, Customer, Supplier, Invoice, PurchaseEntry, StockLedger, AppSettings } from '@/types';

export class AppDatabase extends Dexie {
  items!: Table<InventoryItem>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  invoices!: Table<Invoice>;
  purchases!: Table<PurchaseEntry>;
  stockLedger!: Table<StockLedger>;
  settings!: Table<AppSettings>;

  constructor() {
    super('ElectroBillDB');
    this.version(2).stores({
      items: '++id, name, sku, category, brand, specification, isActive, createdAt',
      customers: '++id, name, phone, gstNumber, createdAt',
      suppliers: '++id, name, phone, gstNumber, createdAt',
      invoices: '++id, invoiceNumber, invoiceDate, customerId, status, createdAt',
      purchases: '++id, purchaseNumber, purchaseDate, supplierId, createdAt',
      stockLedger: '++id, itemId, type, date',
      settings: '++id',
    });
  }
}

export const db = new AppDatabase();

export async function getSettings(): Promise<AppSettings> {
  let settings = await db.settings.toCollection().first();
  if (!settings) {
    const id = await db.settings.add({
      businessName: 'Sharma Electricals',
      businessAddress: '123, Main Market, New Delhi - 110001',
      businessPhone: '9876543210',
      businessGst: '07AAACS1234A1Z5',
      businessEmail: 'info@sharmaelectricals.com',
      stateCode: '07',
      invoicePrefix: 'SE',
      currentInvoiceNumber: 1000,
      currentPurchaseNumber: 500,
      autoBackup: false,
      lastBackup: null,
    });
    settings = await db.settings.get(id);
  }
  return settings!;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const settings = await getSettings();
  const next = settings.currentInvoiceNumber + 1;
  await db.settings.update(settings.id!, { currentInvoiceNumber: next });
  const fy = getFiscalYear();
  return `${settings.invoicePrefix}/${fy}/${String(next).padStart(4, '0')}`;
}

export async function getNextPurchaseNumber(): Promise<string> {
  const settings = await getSettings();
  const next = settings.currentPurchaseNumber + 1;
  await db.settings.update(settings.id!, { currentPurchaseNumber: next });
  return `PUR/${String(next).padStart(4, '0')}`;
}

function getFiscalYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1) % 100}`;
}

export async function updateStockAfterSale(items: { itemId: number; quantity: number; name: string }[], invoiceNumber: string) {
  for (const item of items) {
    const dbItem = await db.items.get(item.itemId);
    if (dbItem) {
      const newStock = dbItem.currentStock - item.quantity;
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
}

export async function updateStockAfterPurchase(items: { itemId: number; quantity: number; name: string; purchasePrice: number }[], purchaseNumber: string) {
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
}

export async function exportDatabase(): Promise<string> {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    items: await db.items.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    invoices: await db.invoices.toArray(),
    purchases: await db.purchases.toArray(),
    stockLedger: await db.stockLedger.toArray(),
    settings: await db.settings.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importDatabase(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  await db.transaction('rw', [db.items, db.customers, db.suppliers, db.invoices, db.purchases, db.stockLedger, db.settings], async () => {
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
  });
}
