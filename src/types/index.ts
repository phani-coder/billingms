// ==================== CORE TYPES ====================

export interface InventoryItem {
  id?: number;
  name: string;
  sku: string;
  barcode?: string;
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
  location?: string; // bin/shelf location
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
  stateCode?: string; // For IGST determination
  createdAt: Date;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  gstNumber: string;
  address: string;
  email: string;
  stateCode?: string;
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

// Invoice types for GST compliance
export type InvoiceType = 'tax_invoice' | 'proforma' | 'credit_note' | 'debit_note' | 'export' | 'b2b' | 'b2c';

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: Date;
  customerId: number;
  customerName: string;
  customerGst: string;
  customerAddress: string;
  customerPhone: string;
  customerStateCode?: string;
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
  // E-invoice fields
  eInvoiceEnabled?: boolean;
  irn?: string; // Invoice Reference Number for e-invoice
  ackNo?: string;
  ackDate?: Date;
  // Linked documents
  linkedInvoiceId?: number; // For credit/debit notes
  // Audit
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseEntry {
  id?: number;
  purchaseNumber: string;
  purchaseDate: Date;
  supplierId: number;
  supplierName: string;
  supplierGst?: string;
  invoiceRef: string;
  items: PurchaseItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  notes: string;
  createdBy?: number;
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
  type: 'purchase' | 'sale' | 'adjustment' | 'opening' | 'return';
  referenceId: string;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  userId?: number;
  date: Date;
}

// ==================== RBAC TYPES ====================

export type UserRole = 'superadmin' | 'admin' | 'billing_staff' | 'purchase_staff' | 'readonly_auditor';

export interface User {
  id?: number;
  username: string;
  passwordHash: string; // bcrypt hash
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  machineId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id?: number;
  userId: number;
  token: string;
  machineId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Role permissions matrix
export interface RolePermissions {
  canCreateInvoice: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canCancelInvoice: boolean;
  canCreatePurchase: boolean;
  canEditPurchase: boolean;
  canManageInventory: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canBackup: boolean;
  canRestore: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAuditLog: boolean;
}

// ==================== AUDIT TYPES ====================

export type AuditAction = 
  | 'invoice_create' | 'invoice_edit' | 'invoice_delete' | 'invoice_cancel' | 'invoice_print'
  | 'purchase_create' | 'purchase_edit' | 'purchase_delete'
  | 'stock_adjustment' | 'stock_opening'
  | 'customer_create' | 'customer_edit' | 'customer_delete'
  | 'supplier_create' | 'supplier_edit' | 'supplier_delete'
  | 'item_create' | 'item_edit' | 'item_delete'
  | 'user_create' | 'user_edit' | 'user_delete' | 'user_login' | 'user_logout' | 'user_role_change'
  | 'backup_create' | 'backup_restore' | 'backup_encrypt'
  | 'settings_change' | 'multiuser_enable' | 'multiuser_disable';

export interface AuditLogEntry {
  id?: number;
  timestamp: Date;
  userId: number;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousValues?: string; // JSON stringified
  newValues?: string; // JSON stringified
  machineId: string;
  ipAddress?: string;
  details?: string;
}

// ==================== BACKUP TYPES ====================

export interface BackupManifest {
  version: number;
  appVersion: string;
  createdAt: string;
  machineId: string;
  userId: number;
  userName: string;
  checksum: string; // SHA256 of data
  encrypted: boolean;
  tables: {
    items: number;
    customers: number;
    suppliers: number;
    invoices: number;
    purchases: number;
    stockLedger: number;
    auditLog: number;
    users: number;
  };
}

export interface BackupFile {
  manifest: BackupManifest;
  data: {
    items: InventoryItem[];
    customers: Customer[];
    suppliers: Supplier[];
    invoices: Invoice[];
    purchases: PurchaseEntry[];
    stockLedger: StockLedger[];
    settings: AppSettings[];
    auditLog: AuditLogEntry[];
    users: User[];
  };
}

// ==================== SETTINGS TYPES ====================

export interface AppSettings {
  id?: number;
  // Business info
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessGst: string;
  businessEmail: string;
  stateCode: string;
  businessLogo?: string; // base64 or path
  // Invoice settings
  invoicePrefix: string;
  currentInvoiceNumber: number;
  currentPurchaseNumber: number;
  invoiceFooter?: string;
  authorizedSignatory?: string;
  // Backup settings
  autoBackup: boolean;
  autoBackupTime: string; // HH:MM format
  backupFolder: string;
  backupRetentionDays: number;
  backupEncryption: boolean;
  lastBackup: Date | null;
  lastBackupFile?: string;
  // Multi-user settings
  multiUserEnabled: boolean;
  multiUserCertified: boolean;
  multiUserCertifiedDate?: Date;
  // E-invoice settings
  eInvoiceEnabled: boolean;
  eInvoiceGstin?: string;
  // UI settings
  language: 'en' | 'hi';
  thermalPrinterEnabled: boolean;
  thermalPrinterWidth: number; // mm
  // Performance
  itemsPerPage: number;
  enableCaching: boolean;
}

// ==================== E-INVOICE TYPES (GST India) ====================

export interface EInvoiceData {
  Version: string;
  TranDtls: {
    TaxSch: string;
    SupTyp: string;
    RegRev: string;
    EcmGstin: string | null;
    IgstOnIntra: string;
  };
  DocDtls: {
    Typ: string;
    No: string;
    Dt: string;
  };
  SellerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm: string;
    Addr1: string;
    Addr2: string;
    Loc: string;
    Pin: number;
    Stcd: string;
    Ph: string;
    Em: string;
  };
  BuyerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm: string;
    Pos: string;
    Addr1: string;
    Addr2: string;
    Loc: string;
    Pin: number;
    Stcd: string;
    Ph: string;
    Em: string;
  };
  ItemList: EInvoiceItem[];
  ValDtls: {
    AssVal: number;
    CgstVal: number;
    SgstVal: number;
    IgstVal: number;
    CesVal: number;
    StCesVal: number;
    Discount: number;
    OthChrg: number;
    RndOffAmt: number;
    TotInvVal: number;
  };
}

export interface EInvoiceItem {
  SlNo: string;
  PrdDesc: string;
  IsServc: string;
  HsnCd: string;
  Barcde: string | null;
  Qty: number;
  FreeQty: number;
  Unit: string;
  UnitPrice: number;
  TotAmt: number;
  Discount: number;
  PreTaxVal: number;
  AssAmt: number;
  GstRt: number;
  IgstAmt: number;
  CgstAmt: number;
  SgstAmt: number;
  CesRt: number;
  CesAmt: number;
  CesNonAdvlAmt: number;
  StateCesRt: number;
  StateCesAmt: number;
  StateCesNonAdvlAmt: number;
  OthChrg: number;
  TotItemVal: number;
}
