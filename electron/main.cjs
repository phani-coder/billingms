const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { initDatabase, getDB } = require("./backend/db.cjs");

console.log("MAIN PROCESS STARTED");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ===================== IPC HANDLERS ===================== */

ipcMain.handle("get-items", () => {
  const db = getDB();
  return db.prepare("SELECT * FROM items ORDER BY id DESC").all();
});

ipcMain.handle("add-item", (event, item) => {
  const db = getDB();

  const stmt = db.prepare(`
    INSERT INTO items
    (name, sku, category, brand, specification, unit, purchasePrice, sellingPrice, gstPercent, currentStock, minStockLevel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    item.name,
    item.sku,
    item.category,
    item.brand,
    item.specification,
    item.unit,
    item.purchasePrice,
    item.sellingPrice,
    item.gstPercent,
    item.currentStock,
    item.minStockLevel
  );

  return { id: result.lastInsertRowid };
});

ipcMain.handle("update-item", (event, item) => {
  const db = getDB();

  db.prepare(`
    UPDATE items SET
      name = ?,
      sku = ?,
      category = ?,
      brand = ?,
      specification = ?,
      unit = ?,
      purchasePrice = ?,
      sellingPrice = ?,
      gstPercent = ?,
      currentStock = ?,
      minStockLevel = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    item.name,
    item.sku,
    item.category,
    item.brand,
    item.specification,
    item.unit,
    item.purchasePrice,
    item.sellingPrice,
    item.gstPercent,
    item.currentStock,
    item.minStockLevel,
    item.id
  );

  return { success: true };
});

ipcMain.handle("delete-item", (event, id) => {
  const db = getDB();
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
  return { success: true };
});
