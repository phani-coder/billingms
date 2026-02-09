const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");

function getDatabasePath() {
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "billing.db");
return dbPath;
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

  createTables();
}


function createTables() {
db.exec(`
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE NOT NULL,
password TEXT NOT NULL,
role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
sku TEXT UNIQUE NOT NULL,
category TEXT,
brand TEXT,
specification TEXT,
unit TEXT DEFAULT 'pcs',
purchasePrice REAL NOT NULL,
sellingPrice REAL NOT NULL,
gstPercent REAL DEFAULT 18,
currentStock INTEGER DEFAULT 0,
minStockLevel INTEGER DEFAULT 0,
createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER,
  item_id INTEGER,
  quantity INTEGER,
  price REAL,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id),
  FOREIGN KEY(item_id) REFERENCES items(id)
);


`);
}

function getDB() {
return db;
}

module.exports = {
initDatabase,
getDB
};