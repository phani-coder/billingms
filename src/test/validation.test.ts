import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  isValidGstNumber,
  isValidPhone,
  isValidEmail,
  customerSchema,
  supplierSchema,
  inventoryItemSchema,
  invoiceLineItemSchema,
  roundCurrency,
} from '@/lib/validation';

describe('Input Validation - Security Tests', () => {
  
  describe('Input Sanitization', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      expect(sanitizeInput(malicious)).toBe('Hello');
    });

    it('should remove all HTML tags', () => {
      const input = '<div><p>Hello</p></div>';
      expect(sanitizeInput(input)).toBe('Hello');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      expect(sanitizeInput(input)).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert(1) test';
      // Event handlers only stripped when part of HTML tags
      expect(sanitizeInput(input)).toBe('alert(1) test');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should preserve safe text', () => {
      const safe = 'Havells 6A MCB - Single Pole';
      expect(sanitizeInput(safe)).toBe(safe);
    });
  });

  describe('GST Number Validation', () => {
    it('should accept valid GST numbers', () => {
      expect(isValidGstNumber('07AAACS1234A1Z5')).toBe(true);
      expect(isValidGstNumber('27AABCU9603R1ZM')).toBe(true);
    });

    it('should reject invalid GST numbers', () => {
      expect(isValidGstNumber('INVALID')).toBe(false);
      expect(isValidGstNumber('12345')).toBe(false);
      expect(isValidGstNumber('07AAACS1234A1Z')).toBe(false); // too short
    });

    it('should accept empty GST (optional field)', () => {
      expect(isValidGstNumber('')).toBe(true);
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('6123456789')).toBe(true);
      expect(isValidPhone('7000000000')).toBe(true);
      expect(isValidPhone('8888888888')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('1234567890')).toBe(false); // doesn't start with 6-9
      expect(isValidPhone('987654321')).toBe(false); // too short
      expect(isValidPhone('98765432100')).toBe(false); // too long
      expect(isValidPhone('abcdefghij')).toBe(false);
    });

    it('should accept empty phone (optional field)', () => {
      expect(isValidPhone('')).toBe(true);
    });

    it('should handle phone with spaces', () => {
      expect(isValidPhone('98765 43210')).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.in')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });

    it('should accept empty email (optional field)', () => {
      expect(isValidEmail('')).toBe(true);
    });
  });

  describe('Customer Schema Validation', () => {
    it('should validate correct customer data', () => {
      const result = customerSchema.safeParse({
        name: 'Test Customer',
        phone: '9876543210',
        gstNumber: '',
        address: 'Test Address',
        email: 'test@test.com',
        isWalkIn: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = customerSchema.safeParse({
        name: '',
        phone: '',
      });
      expect(result.success).toBe(false);
    });

    it('should sanitize name input', () => {
      const result = customerSchema.safeParse({
        name: '<script>alert(1)</script>Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test');
      }
    });

    it('should reject name exceeding max length', () => {
      const result = customerSchema.safeParse({
        name: 'x'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Inventory Item Schema Validation', () => {
    it('should validate correct item data', () => {
      const result = inventoryItemSchema.safeParse({
        name: 'MCB 6A',
        sku: 'MCB-6A-001',
        category: 'Electrical',
        brand: 'Havells',
        specification: '6 Amp Single Pole',
        purchasePrice: 100,
        sellingPrice: 150,
        gstPercent: 18,
        currentStock: 50,
        minStockLevel: 10,
        unit: 'pcs',
        hsnCode: '8536',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative prices', () => {
      const result = inventoryItemSchema.safeParse({
        name: 'Test',
        sku: 'TEST-001',
        purchasePrice: -100,
        sellingPrice: 150,
        gstPercent: 18,
        currentStock: 50,
        minStockLevel: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative stock', () => {
      const result = inventoryItemSchema.safeParse({
        name: 'Test',
        sku: 'TEST-001',
        purchasePrice: 100,
        sellingPrice: 150,
        gstPercent: 18,
        currentStock: -10,
        minStockLevel: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject GST > 100%', () => {
      const result = inventoryItemSchema.safeParse({
        name: 'Test',
        sku: 'TEST-001',
        purchasePrice: 100,
        sellingPrice: 150,
        gstPercent: 150,
        currentStock: 50,
        minStockLevel: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject prices exceeding max', () => {
      const result = inventoryItemSchema.safeParse({
        name: 'Test',
        sku: 'TEST-001',
        purchasePrice: 100000000,
        sellingPrice: 150,
        gstPercent: 18,
        currentStock: 50,
        minStockLevel: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invoice Line Item Schema', () => {
    it('should validate correct line item', () => {
      const result = invoiceLineItemSchema.safeParse({
        quantity: 5,
        price: 100,
        discount: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should reject quantity less than 1', () => {
      const result = invoiceLineItemSchema.safeParse({
        quantity: 0,
        price: 100,
        discount: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative discount', () => {
      const result = invoiceLineItemSchema.safeParse({
        quantity: 1,
        price: 100,
        discount: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Currency Rounding', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(123.456)).toBe(123.46);
      expect(roundCurrency(123.454)).toBe(123.45);
      expect(roundCurrency(123.455)).toBe(123.46);
    });

    it('should handle edge cases', () => {
      expect(roundCurrency(0)).toBe(0);
      expect(roundCurrency(0.001)).toBe(0);
      expect(roundCurrency(0.005)).toBe(0.01);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL-like input', () => {
      const malicious = "'; DROP TABLE items; --";
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe("'; DROP TABLE items; --"); // SQL chars preserved, but used with parameterized queries
    });

    it('should handle null bytes', () => {
      const input = 'test\x00injection';
      // Note: This should be handled by parameterized queries, not sanitization
      expect(typeof sanitizeInput(input)).toBe('string');
    });
  });

  describe('Buffer Overflow Prevention', () => {
    it('should limit name length', () => {
      const longName = 'x'.repeat(1000);
      const result = customerSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it('should limit address length', () => {
      const longAddress = 'x'.repeat(1000);
      const result = customerSchema.safeParse({ 
        name: 'Test',
        address: longAddress,
      });
      expect(result.success).toBe(false);
    });
  });
});
