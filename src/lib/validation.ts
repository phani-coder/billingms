import { z } from 'zod';

// Input length limits
const MAX_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 500;
const MAX_SKU_LENGTH = 50;
const MAX_PHONE_LENGTH = 15;
const MAX_GST_LENGTH = 15;
const MAX_EMAIL_LENGTH = 100;
const MAX_NOTES_LENGTH = 1000;

// Sanitize input - remove script tags and dangerous characters
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Validate GST number format (15 characters alphanumeric)
export function isValidGstNumber(gst: string): boolean {
  if (!gst) return true; // GST is optional
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
}

// Validate phone number (Indian format)
export function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Validate email
export function isValidEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Zod schemas for validation
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`).transform(sanitizeInput),
  phone: z.string().max(MAX_PHONE_LENGTH, 'Phone number too long').optional().default(''),
  gstNumber: z.string().max(MAX_GST_LENGTH, 'GST number too long').optional().default(''),
  address: z.string().max(MAX_ADDRESS_LENGTH, `Address must be less than ${MAX_ADDRESS_LENGTH} characters`).optional().default('').transform(sanitizeInput),
  email: z.string().max(MAX_EMAIL_LENGTH, 'Email too long').optional().default(''),
  isWalkIn: z.boolean().optional().default(false),
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`).transform(sanitizeInput),
  phone: z.string().max(MAX_PHONE_LENGTH, 'Phone number too long').optional().default(''),
  gstNumber: z.string().max(MAX_GST_LENGTH, 'GST number too long').optional().default(''),
  address: z.string().max(MAX_ADDRESS_LENGTH, `Address must be less than ${MAX_ADDRESS_LENGTH} characters`).optional().default('').transform(sanitizeInput),
  email: z.string().max(MAX_EMAIL_LENGTH, 'Email too long').optional().default(''),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`).transform(sanitizeInput),
  sku: z.string().min(1, 'SKU is required').max(MAX_SKU_LENGTH, `SKU must be less than ${MAX_SKU_LENGTH} characters`),
  category: z.string().max(MAX_NAME_LENGTH, 'Category too long').optional().default(''),
  brand: z.string().max(MAX_NAME_LENGTH, 'Brand too long').optional().default('').transform(sanitizeInput),
  specification: z.string().max(MAX_NAME_LENGTH, 'Specification too long').optional().default('').transform(sanitizeInput),
  purchasePrice: z.number().min(0, 'Price cannot be negative').max(99999999, 'Price too large'),
  sellingPrice: z.number().min(0, 'Price cannot be negative').max(99999999, 'Price too large'),
  gstPercent: z.number().min(0).max(100, 'Invalid GST percentage'),
  currentStock: z.number().int().min(0, 'Stock cannot be negative').max(999999, 'Stock too large'),
  minStockLevel: z.number().int().min(0, 'Min stock cannot be negative').max(999999, 'Min stock too large'),
  unit: z.string().max(20, 'Unit too long').optional().default('pcs'),
  hsnCode: z.string().max(20, 'HSN code too long').optional().default(''),
});

export const invoiceLineItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99999, 'Quantity too large'),
  price: z.number().min(0, 'Price cannot be negative').max(99999999, 'Price too large'),
  discount: z.number().min(0, 'Discount cannot be negative').max(99999999, 'Discount too large'),
});

export const settingsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(MAX_NAME_LENGTH, 'Business name too long').transform(sanitizeInput),
  businessAddress: z.string().max(MAX_ADDRESS_LENGTH, 'Address too long').optional().default('').transform(sanitizeInput),
  businessPhone: z.string().max(MAX_PHONE_LENGTH, 'Phone too long').optional().default(''),
  businessGst: z.string().max(MAX_GST_LENGTH, 'GST number too long').optional().default(''),
  businessEmail: z.string().max(MAX_EMAIL_LENGTH, 'Email too long').optional().default(''),
  stateCode: z.string().max(5, 'State code too long').optional().default(''),
  invoicePrefix: z.string().max(10, 'Invoice prefix too long').optional().default('INV'),
});

// Validate backup file structure
export const backupSchema = z.object({
  version: z.number().optional(),
  exportDate: z.string().optional(),
  items: z.array(z.any()).optional(),
  customers: z.array(z.any()).optional(),
  suppliers: z.array(z.any()).optional(),
  invoices: z.array(z.any()).optional(),
  purchases: z.array(z.any()).optional(),
  stockLedger: z.array(z.any()).optional(),
  settings: z.array(z.any()).optional(),
});

// Round to 2 decimal places for currency
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// Calculate GST with proper rounding
export function calculateGst(taxableAmount: number, gstPercent: number, isIgst: boolean): { cgst: number; sgst: number; igst: number } {
  const gstAmount = roundCurrency(taxableAmount * gstPercent / 100);
  if (isIgst) {
    return { cgst: 0, sgst: 0, igst: gstAmount };
  }
  const halfGst = roundCurrency(gstAmount / 2);
  return { cgst: halfGst, sgst: halfGst, igst: 0 };
}
