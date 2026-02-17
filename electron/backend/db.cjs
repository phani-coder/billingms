const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");

function getDatabasePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "billing.db");
}

let db;

function initDatabase() {
  const dbPath = getDatabasePath();
  console.log("Database path:", dbPath);

  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const integrity = db.pragma("quick_check", { simple: true });
  if (integrity !== "ok") {
    console.error("Database corruption detected!");
    db.close();
    try {
      const corruptedPath = dbPath.replace(".db", "-corrupted-" + Date.now() + ".db");
      fs.renameSync(dbPath, corruptedPath);
      console.log("Corrupted DB moved to:", corruptedPath);
    } catch (err) {
      console.error("Failed to rename corrupted DB:", err);
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }

  createTables();
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'billing_staff',
      display_name TEXT,
      is_active INTEGER DEFAULT 1,
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      category TEXT,
      brand TEXT,
      specification TEXT,
      unit TEXT DEFAULT 'pcs',
      hsn_code TEXT,
      purchase_price REAL NOT NULL DEFAULT 0 CHECK(purchase_price >= 0),
      selling_price REAL NOT NULL DEFAULT 0 CHECK(selling_price >= 0),
      gst_percent REAL DEFAULT 18,
      current_stock INTEGER DEFAULT 0 CHECK(current_stock >= 0),
      min_stock_level INTEGER DEFAULT 5 CHECK(min_stock_level >= 0),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      gst_number TEXT,
      address TEXT,
      email TEXT,
      state_code TEXT,
      is_walk_in INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      gst_number TEXT,
      address TEXT,
      email TEXT,
      state_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_type TEXT NOT NULL DEFAULT 'tax_invoice',
      invoice_date TEXT NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_gst TEXT,
      customer_address TEXT,
      customer_phone TEXT,
      customer_state_code TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      total_cgst REAL NOT NULL DEFAULT 0,
      total_sgst REAL NOT NULL DEFAULT 0,
      total_igst REAL NOT NULL DEFAULT 0,
      total_discount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      round_off REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      is_igst INTEGER DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      hsn_code TEXT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit TEXT,
      price REAL NOT NULL CHECK(price >= 0),
      discount REAL NOT NULL DEFAULT 0,
      gst_percent REAL NOT NULL DEFAULT 0,
      cgst REAL NOT NULL DEFAULT 0,
      sgst REAL NOT NULL DEFAULT 0,
      igst REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number TEXT UNIQUE NOT NULL,
      purchase_date TEXT NOT NULL,
      supplier_id INTEGER,
      supplier_name TEXT NOT NULL,
      supplier_gst TEXT,
      invoice_ref TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      total_tax REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      purchase_price REAL NOT NULL CHECK(purchase_price >= 0),
      gst_percent REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      quantity_change INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      user_id INTEGER,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL DEFAULT 'My Business',
      business_address TEXT,
      business_phone TEXT,
      business_gst TEXT,
      business_email TEXT,
      state_code TEXT DEFAULT '07',
      invoice_prefix TEXT DEFAULT 'INV',
      current_invoice_number INTEGER DEFAULT 1000,
      current_purchase_number INTEGER DEFAULT 500,
      invoice_footer TEXT,
      authorized_signatory TEXT,
      auto_backup INTEGER DEFAULT 0,
      auto_backup_time TEXT DEFAULT '02:00',
      backup_folder TEXT,
      backup_retention_days INTEGER DEFAULT 30,
      multi_user_enabled INTEGER DEFAULT 0,
      e_invoice_enabled INTEGER DEFAULT 0,
      language TEXT DEFAULT 'en',
      items_per_page INTEGER DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      previous_values TEXT,
      new_values TEXT,
      machine_id TEXT,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      machine_id TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
    CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(purchase_number);
    CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Insert default settings if not exists
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO settings (business_name, invoice_prefix, current_invoice_number, current_purchase_number)
      VALUES ('My Business', 'INV', 1000, 500)
    `).run();
  }
}

// BUG FIX: Single, correct backupDatabase using SQLite's safe hot-backup API.
// Previous code had two definitions — the unsafe fs.copyFileSync version was
// winning due to JS hoisting. db.backup() is the correct SQLite backup method.
async function backupDatabase() {
  const db = getDB();
  const dbPath = getDatabasePath();
  const backupDir = path.join(path.dirname(dbPath), "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, "billing-backup-" + Date.now() + ".db");

  // db.backup() is better-sqlite3's built-in safe backup API.
  // It uses SQLite's online backup mechanism — safe even during active writes.
  await db.backup(backupPath);
  console.log("Backup created:", backupPath);
  return backupPath;
}

function getDB() {
  if (!db) throw new Error("Database not initialised. Call initDatabase() first.");
  return db;
}

// Get next invoice number atomically (no gaps, no duplicates)
function getNextInvoiceNumber(prefix) {
  return db.transaction(() => {
    const settings = db.prepare("SELECT id, current_invoice_number, invoice_prefix FROM settings LIMIT 1").get();
    const next = settings.current_invoice_number + 1;
    db.prepare("UPDATE settings SET current_invoice_number = ? WHERE id = ?").run(next, settings.id);

    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fy = `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
    const pfx = prefix || settings.invoice_prefix || 'INV';
    return `${pfx}/${fy}/${String(next).padStart(4, '0')}`;
  })();
}

// Validate stock availability before sale
function validateStock(items) {
  const errors = [];
  for (const item of items) {
    const row = db.prepare("SELECT name, current_stock FROM items WHERE id = ?").get(item.itemId);
    if (!row) {
      errors.push(`Item ID ${item.itemId} not found`);
    } else if (row.current_stock < item.quantity) {
      errors.push(`Insufficient stock for ${row.name}: available ${row.current_stock}, requested ${item.quantity}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  initDatabase,
  getDB,
  backupDatabase,
  getNextInvoiceNumber,
  validateStock,
};
