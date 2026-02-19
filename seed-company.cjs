const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(
  process.env.APPDATA || process.env.HOME,
  "ElectroBill",
  "billing.db"
);

const db = new Database(dbPath);

db.prepare(`
  UPDATE settings SET 
    business_name = 'SRI VIJAYA VAARAHI PVT LTD',
    business_gst = '37AABCS1234F1Z5',
    business_address = 'Your Address Here',
    business_phone = '9876543210',
    state_code = '37'
  WHERE id = 1
`).run();

console.log('✓ Company name updated!');
db.close();