const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { initDatabase, getDB, backupDatabase } = require("./backend/db.cjs");

console.log("MAIN PROCESS STARTED");

const isDev = process.env.NODE_ENV === "development";

// ===================== SESSION STORE =====================
// Stores active sessions in main process memory.
// Renderer cannot forge these — it only sends tokens via contextBridge.
const activeSessions = new Map(); // token -> { userId, role, expiresAt }

function registerSession(token, userId, role, expiresAt) {
  activeSessions.set(token, { userId, role, expiresAt: new Date(expiresAt) });
}

function getSession(token) {
  const session = activeSessions.get(token);
  if (!session) return null;
  if (new Date() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

function invalidateSession(token) {
  activeSessions.delete(token);
}

// Permission map (mirrors src/lib/rbac.ts — kept in sync manually)
const ROLE_PERMISSIONS = {
  superadmin: { canManageInventory: true, canCreateInvoice: true, canEditInvoice: true,
    canDeleteInvoice: true, canManageUsers: true, canManageSettings: true,
    canCreatePurchase: true, canEditPurchase: true, canManageCustomers: true,
    canManageSuppliers: true, canViewReports: true, canExportData: true,
    canBackup: true, canRestore: true, canViewAuditLog: true, canCancelInvoice: true },
  admin: { canManageInventory: true, canCreateInvoice: true, canEditInvoice: true,
    canDeleteInvoice: false, canManageUsers: false, canManageSettings: true,
    canCreatePurchase: true, canEditPurchase: true, canManageCustomers: true,
    canManageSuppliers: true, canViewReports: true, canExportData: true,
    canBackup: true, canRestore: false, canViewAuditLog: true, canCancelInvoice: true },
  billing_staff: { canManageInventory: false, canCreateInvoice: true, canEditInvoice: false,
    canDeleteInvoice: false, canManageUsers: false, canManageSettings: false,
    canCreatePurchase: false, canEditPurchase: false, canManageCustomers: true,
    canManageSuppliers: false, canViewReports: false, canExportData: false,
    canBackup: false, canRestore: false, canViewAuditLog: false, canCancelInvoice: false },
  purchase_staff: { canManageInventory: true, canCreateInvoice: false, canEditInvoice: false,
    canDeleteInvoice: false, canManageUsers: false, canManageSettings: false,
    canCreatePurchase: true, canEditPurchase: false, canManageCustomers: false,
    canManageSuppliers: true, canViewReports: false, canExportData: false,
    canBackup: false, canRestore: false, canViewAuditLog: false, canCancelInvoice: false },
  readonly_auditor: { canManageInventory: false, canCreateInvoice: false, canEditInvoice: false,
    canDeleteInvoice: false, canManageUsers: false, canManageSettings: false,
    canCreatePurchase: false, canEditPurchase: false, canManageCustomers: false,
    canManageSuppliers: false, canViewReports: true, canExportData: true,
    canBackup: false, canRestore: false, canViewAuditLog: true, canCancelInvoice: false },
};

// BUG FIX: All IPC handlers now verify the session token before executing.
// Previously there were NO permission checks in main.cjs — any renderer code
// (or browser console call) could invoke any IPC handler regardless of user role.
function requirePermission(token, permission) {
  const session = getSession(token);
  if (!session) throw new Error("AUTH_REQUIRED: Session expired or invalid. Please log in.");
  const perms = ROLE_PERMISSIONS[session.role];
  if (!perms || !perms[permission]) {
    throw new Error(`ACCESS_DENIED: Role '${session.role}' does not have '${permission}'`);
  }
  return session;
}

// ===================== WINDOW =====================
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // BUG FIX: Disable DevTools entirely in production at the platform level,
      // not just reactively on open. Previously only closed after open — too late.
      devTools: isDev,
    }
  });

  if (!isDev) {
    // BUG FIX: Block F12, Ctrl+Shift+I, Ctrl+Shift+J keyboard shortcuts
    // that were previously able to open DevTools before the close handler fired.
    win.webContents.on("before-input-event", (event, input) => {
      if (
        input.key === "F12" ||
        (input.control && input.shift && (input.key === "I" || input.key === "J" || input.key === "C")) ||
        (input.meta && input.alt && input.key === "I") // macOS
      ) {
        event.preventDefault();
      }
    });

    win.webContents.on("context-menu", (e) => {
      e.preventDefault();
    });
  }

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // Auto backup on startup (5 second delay to let app settle)
  setTimeout(async () => {
    try {
      await backupDatabase();
      console.log("Startup auto-backup completed");
    } catch (err) {
      console.error("Startup auto-backup failed:", err);
    }
  }, 5000);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ===================== AUTH IPC HANDLERS =====================

ipcMain.handle("auth-login", async (event, { username, password }) => {
  try {
    const bcrypt = require("bcryptjs");
    const db = getDB();
    const user = db.prepare(
      "SELECT * FROM users WHERE username = ? AND is_active = 1"
    ).get(username);

    if (!user) throw new Error("INVALID_CREDENTIALS");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("INVALID_CREDENTIALS");

    // Generate session token
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    // Store session in main process memory
    registerSession(token, user.id, user.role, expiresAt);

    // Write to sessions table
    db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt.toISOString());

    // Update last login
    db.prepare("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    // Write audit log
    db.prepare(`
      INSERT INTO audit_log (user_id, user_name, user_role, action, entity_type, entity_id)
      VALUES (?, ?, ?, 'user_login', 'user', ?)
    `).run(user.id, user.display_name || user.username, user.role, String(user.id));

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        mustChangePassword: user.must_change_password === 1,
      }
    };
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") throw err;
    throw new Error("LOGIN_FAILED: " + err.message);
  }
});

ipcMain.handle("auth-logout", (event, { token }) => {
  try {
    const session = getSession(token);
    if (session) {
      const db = getDB();
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
      db.prepare(`
        INSERT INTO audit_log (user_id, user_name, user_role, action, entity_type, entity_id)
        VALUES (?, ?, ?, 'user_logout', 'user', ?)
      `).run(session.userId, "", session.role, String(session.userId));
      invalidateSession(token);
    }
    return { success: true };
  } catch (err) {
    throw new Error("LOGOUT_FAILED: " + err.message);
  }
});

// BUG FIX: Force password change on first login.
// Previously createDefaultAdmin() set a hardcoded 'admin123' password with no
// mechanism to force a change. Now must_change_password flag is checked on login
// and enforced here.
ipcMain.handle("auth-change-password", async (event, { token, currentPassword, newPassword }) => {
  const session = getSession(token);
  if (!session) throw new Error("AUTH_REQUIRED: Session expired or invalid. Please log in."); // any logged-in user can change own password
  const bcrypt = require("bcryptjs");
  const db = getDB();

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("INVALID_CURRENT_PASSWORD");

  if (newPassword.length < 8) throw new Error("PASSWORD_TOO_SHORT: Minimum 8 characters required");

  const newHash = await bcrypt.hash(newPassword, 12);
  db.prepare(`
    UPDATE users SET password = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newHash, session.userId);

  return { success: true };
});

ipcMain.handle("auth-create-user", async (event, { token, username, password, displayName, role }) => {
  requirePermission(token, "canManageUsers");
  const bcrypt = require("bcryptjs");
  const db = getDB();

  if (password.length < 8) throw new Error("PASSWORD_TOO_SHORT");

  const hash = await bcrypt.hash(password, 12);
  try {
    const result = db.prepare(`
      INSERT INTO users (username, password, display_name, role, must_change_password)
      VALUES (?, ?, ?, ?, 1)
    `).run(username, hash, displayName, role);
    return { id: result.lastInsertRowid };
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") throw new Error("USERNAME_TAKEN");
    throw err;
  }
});

ipcMain.handle("auth-init-default-admin", async () => {
  // Only runs if NO users exist at all (fresh install only)
  const bcrypt = require("bcryptjs");
  const db = getDB();
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (count.count > 0) return { skipped: true };

  const hash = await bcrypt.hash("admin123", 12);
  db.prepare(`
    INSERT INTO users (username, password, display_name, role, must_change_password)
    VALUES ('admin', ?, 'Administrator', 'superadmin', 1)
  `).run(hash);
  console.log("Default admin created. Password must be changed on first login.");
  return { created: true };
});

// ===================== ITEMS IPC HANDLERS =====================

ipcMain.handle("get-items", (event, { token }) => {
  requirePermission(token, "canManageInventory");
  const db = getDB();
  return db.prepare("SELECT * FROM items WHERE is_active = 1 ORDER BY name ASC").all();
});

ipcMain.handle("add-item", (event, { token, item }) => {
  requirePermission(token, "canManageInventory");
  try {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO items
        (name, sku, barcode, category, brand, specification, unit, hsn_code,
         purchase_price, selling_price, gst_percent, current_stock, min_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      item.name, item.sku, item.barcode || null, item.category, item.brand,
      item.specification, item.unit, item.hsnCode || null,
      item.purchasePrice, item.sellingPrice, item.gstPercent,
      item.currentStock, item.minStockLevel
    );
    return { id: result.lastInsertRowid };
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") throw new Error("SKU_ALREADY_EXISTS");
    throw error;
  }
});

ipcMain.handle("update-item", (event, { token, item }) => {
  requirePermission(token, "canManageInventory");
  const db = getDB();
  db.prepare(`
    UPDATE items SET
      name = ?, sku = ?, barcode = ?, category = ?, brand = ?, specification = ?,
      unit = ?, hsn_code = ?, purchase_price = ?, selling_price = ?, gst_percent = ?,
      current_stock = ?, min_stock_level = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    item.name, item.sku, item.barcode || null, item.category, item.brand,
    item.specification, item.unit, item.hsnCode || null,
    item.purchasePrice, item.sellingPrice, item.gstPercent,
    item.currentStock, item.minStockLevel, item.id
  );
  return { success: true };
});

ipcMain.handle("delete-item", (event, { token, id }) => {
  requirePermission(token, "canManageInventory");
  const db = getDB();
  // Soft delete only — items with invoice history must never be hard deleted
  db.prepare("UPDATE items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return { success: true };
});

// ===================== BACKUP IPC HANDLER =====================

ipcMain.handle("backup-db", async (event, { token }) => {
  requirePermission(token, "canBackup");
  const backupPath = await backupDatabase();
  return { path: backupPath };
});

// ===================== AUDIT LOG IPC HANDLER =====================

ipcMain.handle("get-audit-log", (event, { token, limit }) => {
  requirePermission(token, "canViewAuditLog");
  const db = getDB();
  const rows = db.prepare(
    "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?"
  ).all(limit || 500);
  return rows;
});
