const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(
  process.env.APPDATA || process.env.HOME,
  "ElectroBill",
  "billing.db"
);

const db = new Database(dbPath);

console.log("Seeding test data...");

// Seed customers
const customers = [
  { name: "Rajesh Electricals", phone: "9876543210", gst: "07AAACR1234A1Z5", address: "12 Main Market, Delhi" },
  { name: "Sharma Electronics", phone: "9876543211", gst: "27AAACS5678B2Z6", address: "45 MG Road, Mumbai" },
  { name: "Kumar Traders", phone: "9876543212", gst: "", address: "23 Park Street, Bangalore" },
  { name: "Gupta Enterprises", phone: "9876543213", gst: "29AAACG9012C3Z7", address: "78 Brigade Road, Bangalore" },
  { name: "Walk-in Customer", phone: "", gst: "", address: "" },
];

customers.forEach(c => {
  db.prepare(`
    INSERT INTO customers (name, phone, gst_number, address, state_code)
    VALUES (?, ?, ?, ?, ?)
  `).run(c.name, c.phone, c.gst, c.address, c.gst.substring(0, 2) || "07");
});

console.log(`✓ Added ${customers.length} customers`);

// Seed inventory items
const items = [
  { name: "MCB 16A Single Pole", sku: "MCB-16-SP", category: "MCBs & Distribution", brand: "Havells", spec: "16A SP", unit: "pcs", hsn: "8536", purchase: 45, selling: 75, gst: 18, stock: 50 },
  { name: "MCB 32A Double Pole", sku: "MCB-32-DP", category: "MCBs & Distribution", brand: "Schneider", spec: "32A DP", unit: "pcs", hsn: "8536", purchase: 120, selling: 180, gst: 18, stock: 30 },
  { name: "Wire 1.5 Sq mm", sku: "WIRE-1.5", category: "Wires & Cables", brand: "Polycab", spec: "1.5mm² FR", unit: "mtr", hsn: "8544", purchase: 12, selling: 18, gst: 18, stock: 500 },
  { name: "Wire 2.5 Sq mm", sku: "WIRE-2.5", category: "Wires & Cables", brand: "Polycab", spec: "2.5mm² FR", unit: "mtr", hsn: "8544", purchase: 18, selling: 28, gst: 18, stock: 400 },
  { name: "LED Bulb 9W", sku: "LED-9W", category: "Lighting", brand: "Philips", spec: "9W Cool White", unit: "pcs", hsn: "8539", purchase: 80, selling: 120, gst: 18, stock: 100 },
  { name: "LED Bulb 12W", sku: "LED-12W", category: "Lighting", brand: "Syska", spec: "12W Warm White", unit: "pcs", hsn: "8539", purchase: 110, selling: 160, gst: 18, stock: 80 },
  { name: "Ceiling Fan 1200mm", sku: "FAN-1200", category: "Fans & Motors", brand: "Crompton", spec: "1200mm 75W", unit: "pcs", hsn: "8414", purchase: 1200, selling: 1800, gst: 18, stock: 20 },
  { name: "Ceiling Fan 900mm", sku: "FAN-900", category: "Fans & Motors", brand: "Usha", spec: "900mm 55W", unit: "pcs", hsn: "8414", purchase: 900, selling: 1350, gst: 18, stock: 25 },
  { name: "Switch 1-Way", sku: "SW-1W", category: "Switches & Sockets", brand: "Anchor", spec: "16A 1-Way", unit: "pcs", hsn: "8536", purchase: 25, selling: 45, gst: 18, stock: 200 },
  { name: "Socket 3-Pin", sku: "SOCK-3P", category: "Switches & Sockets", brand: "Legrand", spec: "16A 3-Pin", unit: "pcs", hsn: "8536", purchase: 35, selling: 60, gst: 18, stock: 150 },
  { name: "PVC Conduit 25mm", sku: "COND-25", category: "Conduits & Accessories", brand: "Precision", spec: "25mm 3m", unit: "pcs", hsn: "3917", purchase: 45, selling: 70, gst: 18, stock: 100 },
  { name: "Junction Box 4x4", sku: "JB-4X4", category: "Conduits & Accessories", brand: "Anchor", spec: "4x4 inch", unit: "pcs", hsn: "3926", purchase: 15, selling: 28, gst: 18, stock: 120 },
];

items.forEach(i => {
  db.prepare(`
    INSERT INTO items (name, sku, category, brand, specification, unit, hsn_code, purchase_price, selling_price, gst_percent, current_stock, min_stock_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5)
  `).run(i.name, i.sku, i.category, i.brand, i.spec, i.unit, i.hsn, i.purchase, i.selling, i.gst, i.stock);
});

console.log(`✓ Added ${items.length} inventory items`);

db.close();
console.log("✓ Test data seeded successfully!");