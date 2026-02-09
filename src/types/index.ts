export interface InventoryItem {
  id?: number;
  name: string;
  sku: string;
  category: string;
  brand: string;
  specification: string; // wattage, size, etc.
  purchasePrice: number;
  sellingPrice: number;
  gstPercent: number;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  hsnCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  gstNumber: string;
  address: string;
  email: string;
  isWalkIn: boolean;
  createdAt: Date;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  gstNumber: string;
  address: string;
  email: string;
  createdAt: Date;
}

export interface InvoiceItem {
  itemId: number;
  name: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxableAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  invoiceDate: Date;
  customerId: number;
  customerName: string;
  customerGst: string;
  customerAddress: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalDiscount: number;
  grandTotal: number;
  roundOff: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'credit' | 'bank';
  isIgst: boolean; // interstate supply
  notes: string;
  status: 'draft' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseEntry {
  id?: number;
  purchaseNumber: string;
  purchaseDate: Date;
  supplierId: number;
  supplierName: string;
  invoiceRef: string;
  items: PurchaseItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  notes: string;
  createdAt: Date;
}

export interface PurchaseItem {
  itemId: number;
  name: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
  gstPercent: number;
  totalAmount: number;
}

export interface StockLedger {
  id?: number;
  itemId: number;
  itemName: string;
  type: 'purchase' | 'sale' | 'adjustment';
  referenceId: string;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  date: Date;
}

export interface AppSettings {
  id?: number;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessGst: string;
  businessEmail: string;
  stateCode: string;
  invoicePrefix: string;
  currentInvoiceNumber: number;
  currentPurchaseNumber: number;
  autoBackup: boolean;
  lastBackup: Date | null;
}

export type UserRole = 'admin' | 'billing';
