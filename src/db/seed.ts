import { db } from './database';
import type { InventoryItem, Customer, Supplier } from '@/types';

export async function seedDemoData() {
  // Check if data already exists
  const existingItems = await db.items.count();
  if (existingItems > 0) return;

  // Suppliers
  const suppliers: Omit<Supplier, 'id'>[] = [
    { name: 'Havells India Ltd', phone: '9876543210', gstNumber: '07AAACH1234A1Z5', address: 'Greater Noida, UP', email: 'orders@havells.com', createdAt: new Date() },
    { name: 'Polycab Wires Pvt Ltd', phone: '9876543211', gstNumber: '24AABCP5678B1Z8', address: 'Halol, Gujarat', email: 'sales@polycab.com', createdAt: new Date() },
    { name: 'Anchor Electricals', phone: '9876543212', gstNumber: '27AAACA9012C1Z2', address: 'Mumbai, Maharashtra', email: 'info@anchor.com', createdAt: new Date() },
    { name: 'Legrand India', phone: '9876543213', gstNumber: '27AABCL3456D1Z6', address: 'Jalgaon, Maharashtra', email: 'orders@legrand.in', createdAt: new Date() },
    { name: 'Finolex Cables', phone: '9876543214', gstNumber: '27AAACF7890E1Z0', address: 'Pune, Maharashtra', email: 'sales@finolex.com', createdAt: new Date() },
  ];

  for (const s of suppliers) {
    await db.suppliers.add(s as Supplier);
  }

  // Customers
  const customers: Omit<Customer, 'id'>[] = [
    { name: 'Rajesh Electrical Works', phone: '9898123456', gstNumber: '07AABCR1234A1Z5', address: 'Laxmi Nagar, Delhi', email: 'rajesh@gmail.com', isWalkIn: false, createdAt: new Date() },
    { name: 'Kumar Constructions', phone: '9898123457', gstNumber: '07AABCK5678B1Z8', address: 'Dwarka, Delhi', email: 'kumar.const@gmail.com', isWalkIn: false, createdAt: new Date() },
    { name: 'Sharma Electric House', phone: '9898123458', gstNumber: '07AABCS9012C1Z2', address: 'Rohini, Delhi', email: 'sharma.electric@gmail.com', isWalkIn: false, createdAt: new Date() },
    { name: 'Patel Traders', phone: '9898123459', gstNumber: '', address: 'Karol Bagh, Delhi', email: '', isWalkIn: false, createdAt: new Date() },
    { name: 'Gupta Hardware', phone: '9898123460', gstNumber: '07AABCG3456D1Z6', address: 'Chandni Chowk, Delhi', email: 'gupta.hw@gmail.com', isWalkIn: false, createdAt: new Date() },
  ];

  for (const c of customers) {
    await db.customers.add(c as Customer);
  }

  // Inventory Items - Realistic electrical spare parts
  const items: Omit<InventoryItem, 'id'>[] = [
    // Wires & Cables
    { name: 'FR PVC Wire 1.5 sq mm', sku: 'WIRE-FR-1.5', category: 'Wires & Cables', brand: 'Havells', specification: '1.5 sq mm, 90m coil', purchasePrice: 1850, sellingPrice: 2150, gstPercent: 18, currentStock: 25, minStockLevel: 10, unit: 'roll', hsnCode: '8544', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'FR PVC Wire 2.5 sq mm', sku: 'WIRE-FR-2.5', category: 'Wires & Cables', brand: 'Havells', specification: '2.5 sq mm, 90m coil', purchasePrice: 2950, sellingPrice: 3450, gstPercent: 18, currentStock: 20, minStockLevel: 8, unit: 'roll', hsnCode: '8544', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'FR PVC Wire 4 sq mm', sku: 'WIRE-FR-4', category: 'Wires & Cables', brand: 'Polycab', specification: '4 sq mm, 90m coil', purchasePrice: 4650, sellingPrice: 5400, gstPercent: 18, currentStock: 15, minStockLevel: 5, unit: 'roll', hsnCode: '8544', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Submersible Cable 3 Core', sku: 'CABLE-SUB-3C', category: 'Wires & Cables', brand: 'Finolex', specification: '1.5 sq mm, 100m', purchasePrice: 3200, sellingPrice: 3800, gstPercent: 18, currentStock: 8, minStockLevel: 3, unit: 'roll', hsnCode: '8544', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Flexible Wire 0.75 sq mm', sku: 'WIRE-FLEX-0.75', category: 'Wires & Cables', brand: 'Anchor', specification: '0.75 sq mm, 90m', purchasePrice: 1100, sellingPrice: 1350, gstPercent: 18, currentStock: 30, minStockLevel: 10, unit: 'roll', hsnCode: '8544', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Switches & Sockets
    { name: 'Modular Switch 6A', sku: 'SW-MOD-6A', category: 'Switches & Sockets', brand: 'Anchor Roma', specification: '6A, 1 Way', purchasePrice: 42, sellingPrice: 55, gstPercent: 18, currentStock: 200, minStockLevel: 50, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Modular Switch 16A', sku: 'SW-MOD-16A', category: 'Switches & Sockets', brand: 'Anchor Roma', specification: '16A, 1 Way', purchasePrice: 65, sellingPrice: 85, gstPercent: 18, currentStock: 150, minStockLevel: 40, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Modular Socket 6A', sku: 'SOC-MOD-6A', category: 'Switches & Sockets', brand: 'Legrand', specification: '6A, 5 Pin', purchasePrice: 55, sellingPrice: 72, gstPercent: 18, currentStock: 180, minStockLevel: 50, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Modular Socket 16A', sku: 'SOC-MOD-16A', category: 'Switches & Sockets', brand: 'Legrand', specification: '16A, 6 Pin', purchasePrice: 78, sellingPrice: 98, gstPercent: 18, currentStock: 120, minStockLevel: 30, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Switch Plate 8 Module', sku: 'PLATE-8M', category: 'Switches & Sockets', brand: 'Anchor Roma', specification: '8 Module White', purchasePrice: 85, sellingPrice: 110, gstPercent: 18, currentStock: 100, minStockLevel: 25, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Bell Push Switch', sku: 'SW-BELL', category: 'Switches & Sockets', brand: 'Havells', specification: '6A Bell Push', purchasePrice: 48, sellingPrice: 65, gstPercent: 18, currentStock: 80, minStockLevel: 20, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // MCBs & Distribution
    { name: 'MCB SP 16A C Curve', sku: 'MCB-SP-16A', category: 'MCBs & Distribution', brand: 'Havells', specification: '16A, C Curve, 10kA', purchasePrice: 145, sellingPrice: 185, gstPercent: 18, currentStock: 60, minStockLevel: 20, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'MCB SP 32A C Curve', sku: 'MCB-SP-32A', category: 'MCBs & Distribution', brand: 'Havells', specification: '32A, C Curve, 10kA', purchasePrice: 165, sellingPrice: 210, gstPercent: 18, currentStock: 45, minStockLevel: 15, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'MCB DP 40A C Curve', sku: 'MCB-DP-40A', category: 'MCBs & Distribution', brand: 'Legrand', specification: '40A, C Curve, DP', purchasePrice: 420, sellingPrice: 520, gstPercent: 18, currentStock: 25, minStockLevel: 10, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'RCCB 40A 30mA DP', sku: 'RCCB-40A', category: 'MCBs & Distribution', brand: 'Havells', specification: '40A, 30mA, DP', purchasePrice: 1450, sellingPrice: 1750, gstPercent: 18, currentStock: 15, minStockLevel: 5, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'DB Box 8 Way SPN', sku: 'DB-8WAY-SPN', category: 'MCBs & Distribution', brand: 'Havells', specification: '8 Way SPN Metal', purchasePrice: 850, sellingPrice: 1050, gstPercent: 18, currentStock: 12, minStockLevel: 5, unit: 'pcs', hsnCode: '8537', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'DB Box 12 Way TPN', sku: 'DB-12WAY-TPN', category: 'MCBs & Distribution', brand: 'Havells', specification: '12 Way TPN Metal', purchasePrice: 2200, sellingPrice: 2650, gstPercent: 18, currentStock: 6, minStockLevel: 3, unit: 'pcs', hsnCode: '8537', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Fans & Motors
    { name: 'Ceiling Fan 1200mm', sku: 'FAN-CEIL-1200', category: 'Fans & Motors', brand: 'Havells', specification: '1200mm, 75W, Brown', purchasePrice: 1850, sellingPrice: 2250, gstPercent: 18, currentStock: 8, minStockLevel: 3, unit: 'pcs', hsnCode: '8414', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Exhaust Fan 9 inch', sku: 'FAN-EXH-9', category: 'Fans & Motors', brand: 'Havells', specification: '9 inch, 35W', purchasePrice: 950, sellingPrice: 1180, gstPercent: 18, currentStock: 12, minStockLevel: 4, unit: 'pcs', hsnCode: '8414', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Table Fan 400mm', sku: 'FAN-TABLE-400', category: 'Fans & Motors', brand: 'Crompton', specification: '400mm, 55W', purchasePrice: 1450, sellingPrice: 1780, gstPercent: 18, currentStock: 6, minStockLevel: 2, unit: 'pcs', hsnCode: '8414', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Fan Regulator Electronic', sku: 'REG-FAN-ELEC', category: 'Fans & Motors', brand: 'Anchor', specification: '5 Step Electronic', purchasePrice: 185, sellingPrice: 240, gstPercent: 18, currentStock: 40, minStockLevel: 15, unit: 'pcs', hsnCode: '8533', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Lighting
    { name: 'LED Bulb 9W B22', sku: 'LED-BULB-9W', category: 'Lighting', brand: 'Philips', specification: '9W, B22, Cool White', purchasePrice: 75, sellingPrice: 99, gstPercent: 18, currentStock: 100, minStockLevel: 30, unit: 'pcs', hsnCode: '8539', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'LED Bulb 15W B22', sku: 'LED-BULB-15W', category: 'Lighting', brand: 'Philips', specification: '15W, B22, Cool White', purchasePrice: 110, sellingPrice: 145, gstPercent: 18, currentStock: 80, minStockLevel: 25, unit: 'pcs', hsnCode: '8539', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'LED Tube Light 20W', sku: 'LED-TUBE-20W', category: 'Lighting', brand: 'Havells', specification: '20W, 4ft, Cool White', purchasePrice: 180, sellingPrice: 230, gstPercent: 18, currentStock: 50, minStockLevel: 15, unit: 'pcs', hsnCode: '8539', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'LED Panel Light 12W Round', sku: 'LED-PNL-12W-R', category: 'Lighting', brand: 'Philips', specification: '12W, Round, Recessed', purchasePrice: 220, sellingPrice: 285, gstPercent: 18, currentStock: 35, minStockLevel: 10, unit: 'pcs', hsnCode: '8539', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'LED Street Light 30W', sku: 'LED-STREET-30W', category: 'Lighting', brand: 'Havells', specification: '30W, IP65', purchasePrice: 1100, sellingPrice: 1400, gstPercent: 18, currentStock: 10, minStockLevel: 3, unit: 'pcs', hsnCode: '9405', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Batten Holder', sku: 'HOLDER-BATTEN', category: 'Lighting', brand: 'Anchor', specification: 'B22, Bakelite', purchasePrice: 12, sellingPrice: 18, gstPercent: 18, currentStock: 200, minStockLevel: 50, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Conduits & Accessories
    { name: 'PVC Conduit Pipe 25mm', sku: 'COND-PVC-25', category: 'Conduits & Accessories', brand: 'Precision', specification: '25mm, 3m Length', purchasePrice: 65, sellingPrice: 85, gstPercent: 18, currentStock: 100, minStockLevel: 30, unit: 'pcs', hsnCode: '3917', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Conduit Bend 25mm', sku: 'COND-BEND-25', category: 'Conduits & Accessories', brand: 'Precision', specification: '25mm, 90 degree', purchasePrice: 8, sellingPrice: 12, gstPercent: 18, currentStock: 300, minStockLevel: 100, unit: 'pcs', hsnCode: '3917', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Junction Box 4x4', sku: 'JBOX-4X4', category: 'Conduits & Accessories', brand: 'Anchor', specification: '4x4 inch, PVC', purchasePrice: 22, sellingPrice: 32, gstPercent: 18, currentStock: 150, minStockLevel: 40, unit: 'pcs', hsnCode: '8538', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Concealed Box 3 Module', sku: 'CBOX-3M', category: 'Conduits & Accessories', brand: 'Havells', specification: '3 Module Metal', purchasePrice: 28, sellingPrice: 40, gstPercent: 18, currentStock: 200, minStockLevel: 50, unit: 'pcs', hsnCode: '8538', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Tools & Accessories
    { name: 'Insulation Tape Black', sku: 'TAPE-INS-BLK', category: 'Tools', brand: '3M', specification: '18mm x 8m', purchasePrice: 32, sellingPrice: 45, gstPercent: 18, currentStock: 100, minStockLevel: 30, unit: 'pcs', hsnCode: '3919', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Cable Tie 150mm', sku: 'TIE-150', category: 'Tools', brand: 'Generic', specification: '150mm, White, 100pcs pack', purchasePrice: 45, sellingPrice: 65, gstPercent: 18, currentStock: 50, minStockLevel: 15, unit: 'pcs', hsnCode: '3926', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Wire Connector 3 Way', sku: 'CONN-3WAY', category: 'Tools', brand: 'Generic', specification: '3 Way Push Connector', purchasePrice: 8, sellingPrice: 12, gstPercent: 18, currentStock: 200, minStockLevel: 50, unit: 'pcs', hsnCode: '8536', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Tester Screwdriver', sku: 'TOOL-TESTER', category: 'Tools', brand: 'Taparia', specification: '140mm, Neon', purchasePrice: 25, sellingPrice: 38, gstPercent: 18, currentStock: 40, minStockLevel: 10, unit: 'pcs', hsnCode: '8205', isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Low stock items for testing alerts
    { name: 'Stabilizer 5 KVA', sku: 'STAB-5KVA', category: 'Meters & Instruments', brand: 'V-Guard', specification: '5 KVA, Wall Mount', purchasePrice: 4500, sellingPrice: 5500, gstPercent: 18, currentStock: 2, minStockLevel: 3, unit: 'pcs', hsnCode: '8504', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Inverter 850VA', sku: 'INV-850VA', category: 'Meters & Instruments', brand: 'Luminous', specification: '850VA, Pure Sine Wave', purchasePrice: 5200, sellingPrice: 6200, gstPercent: 18, currentStock: 1, minStockLevel: 2, unit: 'pcs', hsnCode: '8504', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  for (const item of items) {
    await db.items.add(item as InventoryItem);
  }

  console.log('Demo data seeded successfully!');
}
