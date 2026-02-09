import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateGstBreakdown,
  calculateLineItem,
  calculateInvoiceTotals,
  roundToTwoDecimals,
  roundToNearestRupee,
  roundGstAmount,
  calculateTaxableAmount,
  isValidGstin,
  getStateCodeFromGstin,
  isInterStateTransaction,
  numberToWords,
  calculateHsnSummary,
} from '@/lib/gst-calculations';

describe('GST Calculations - Production Certification Tests', () => {
  
  describe('Rounding Functions', () => {
    it('should round to 2 decimals correctly', () => {
      expect(roundToTwoDecimals(123.456)).toBe(123.46);
      expect(roundToTwoDecimals(123.454)).toBe(123.45);
      expect(roundToTwoDecimals(123.455)).toBe(123.46); // round half up
      expect(roundToTwoDecimals(0.005)).toBe(0.01);
      expect(roundToTwoDecimals(0.004)).toBe(0);
    });

    it('should round to nearest rupee correctly', () => {
      expect(roundToNearestRupee(123.49)).toBe(123);
      expect(roundToNearestRupee(123.50)).toBe(124);
      expect(roundToNearestRupee(123.51)).toBe(124);
      expect(roundToNearestRupee(0.49)).toBe(0);
      expect(roundToNearestRupee(0.50)).toBe(1);
    });

    it('should handle edge cases for GST rounding', () => {
      expect(roundGstAmount(0.005)).toBe(0.01);
      expect(roundGstAmount(0.004)).toBe(0);
      expect(roundGstAmount(100.555)).toBe(100.56);
      expect(roundGstAmount(-100.555)).toBe(-100.55); // JS rounds towards zero for negatives
    });
  });

  describe('Taxable Amount Calculation', () => {
    it('should calculate taxable amount without discount', () => {
      expect(calculateTaxableAmount(10, 100, 0)).toBe(1000);
    });

    it('should calculate taxable amount with discount', () => {
      expect(calculateTaxableAmount(10, 100, 10)).toBe(900);
    });

    it('should handle single unit', () => {
      expect(calculateTaxableAmount(1, 1500, 100)).toBe(1400);
    });

    it('should handle decimal prices', () => {
      expect(calculateTaxableAmount(3, 99.99, 0)).toBe(299.97);
    });
  });

  describe('GST Breakdown - Intrastate (CGST + SGST)', () => {
    it('should split 18% GST into CGST 9% and SGST 9%', () => {
      const result = calculateGstBreakdown(1000, 18, false);
      expect(result.cgst).toBe(90);
      expect(result.sgst).toBe(90);
      expect(result.igst).toBe(0);
      expect(result.totalGst).toBe(180);
      expect(result.totalAmount).toBe(1180);
    });

    it('should handle 5% GST rate', () => {
      const result = calculateGstBreakdown(1000, 5, false);
      expect(result.cgst).toBe(25);
      expect(result.sgst).toBe(25);
      expect(result.igst).toBe(0);
      expect(result.totalGst).toBe(50);
    });

    it('should handle 12% GST rate', () => {
      const result = calculateGstBreakdown(1000, 12, false);
      expect(result.cgst).toBe(60);
      expect(result.sgst).toBe(60);
      expect(result.totalGst).toBe(120);
    });

    it('should handle 28% GST rate', () => {
      const result = calculateGstBreakdown(1000, 28, false);
      expect(result.cgst).toBe(140);
      expect(result.sgst).toBe(140);
      expect(result.totalGst).toBe(280);
    });

    it('should handle odd penny in split correctly', () => {
      // 100 * 5% = 5 -> split = 2.50 each (no odd penny)
      const result1 = calculateGstBreakdown(100, 5, false);
      expect(result1.cgst + result1.sgst).toBe(5);
      
      // 101 * 5% = 5.05 -> split = 2.525 each -> rounded
      const result2 = calculateGstBreakdown(101, 5, false);
      expect(result2.cgst + result2.sgst).toBeCloseTo(5.05, 2);
    });
  });

  describe('GST Breakdown - Interstate (IGST)', () => {
    it('should apply full IGST for interstate', () => {
      const result = calculateGstBreakdown(1000, 18, true);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(180);
      expect(result.totalGst).toBe(180);
      expect(result.totalAmount).toBe(1180);
    });

    it('should handle 5% IGST', () => {
      const result = calculateGstBreakdown(1000, 5, true);
      expect(result.igst).toBe(50);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
    });
  });

  describe('Line Item Calculation', () => {
    it('should calculate line item with all GST components', () => {
      const result = calculateLineItem(5, 200, 0, 18, false);
      expect(result.taxableAmount).toBe(1000);
      expect(result.totalCgst).toBe(90);
      expect(result.totalSgst).toBe(90);
      expect(result.lineTotal).toBe(1180);
    });

    it('should handle discount in line item', () => {
      const result = calculateLineItem(10, 100, 10, 18, false);
      expect(result.taxableAmount).toBe(900);
      expect(result.totalCgst).toBe(81);
      expect(result.totalSgst).toBe(81);
      expect(result.lineTotal).toBe(1062);
    });

    it('should calculate IGST for interstate', () => {
      const result = calculateLineItem(2, 500, 0, 18, true);
      expect(result.taxableAmount).toBe(1000);
      expect(result.totalIgst).toBe(180);
      expect(result.totalCgst).toBe(0);
      expect(result.totalSgst).toBe(0);
    });
  });

  describe('Invoice Totals Calculation', () => {
    it('should calculate totals for multiple line items', () => {
      const lineItems = [
        calculateLineItem(2, 500, 0, 18, false),  // 1000 + 180
        calculateLineItem(3, 100, 0, 5, false),   // 300 + 15
      ];
      
      const totals = calculateInvoiceTotals(lineItems);
      expect(totals.taxableValue).toBe(1300);
      expect(totals.totalCgst).toBe(97.50);
      expect(totals.totalSgst).toBe(97.50);
      expect(totals.totalTax).toBe(195);
      expect(totals.grandTotal).toBe(1495);
      expect(totals.roundOff).toBe(0);
    });

    it('should handle round-off correctly', () => {
      const lineItems = [
        calculateLineItem(1, 999, 0, 18, false), // 999 + 179.82 = 1178.82
      ];
      
      const totals = calculateInvoiceTotals(lineItems);
      expect(totals.grandTotal).toBe(1179);
      expect(totals.roundOff).toBe(0.18);
    });

    it('should handle mixed GST rates', () => {
      const lineItems = [
        calculateLineItem(1, 1000, 0, 5, false),
        calculateLineItem(1, 1000, 0, 12, false),
        calculateLineItem(1, 1000, 0, 18, false),
        calculateLineItem(1, 1000, 0, 28, false),
      ];
      
      const totals = calculateInvoiceTotals(lineItems);
      expect(totals.taxableValue).toBe(4000);
      // 5% + 12% + 18% + 28% = 50 + 120 + 180 + 280 = 630
      expect(totals.totalTax).toBe(630);
      expect(totals.grandTotal).toBe(4630);
    });
  });

  describe('GSTIN Validation', () => {
    it('should validate correct GSTIN format', () => {
      expect(isValidGstin('07AAACS1234A1Z5')).toBe(true);
      expect(isValidGstin('27AABCU9603R1ZM')).toBe(true);
      expect(isValidGstin('29AADCB2230M1ZK')).toBe(true);
    });

    it('should reject invalid GSTIN', () => {
      expect(isValidGstin('')).toBe(false);
      expect(isValidGstin('INVALID')).toBe(false);
      expect(isValidGstin('07AAACS1234A1Z')).toBe(false); // too short
      expect(isValidGstin('07AAACS1234A1Z5X')).toBe(false); // too long
    });

    it('should extract state code from GSTIN', () => {
      expect(getStateCodeFromGstin('07AAACS1234A1Z5')).toBe('07');
      expect(getStateCodeFromGstin('27AABCU9603R1ZM')).toBe('27');
      expect(getStateCodeFromGstin('INVALID')).toBe(null);
    });

    it('should detect interstate transactions', () => {
      expect(isInterStateTransaction('07AAACS1234A1Z5', '27AABCU9603R1ZM')).toBe(true);
      expect(isInterStateTransaction('07AAACS1234A1Z5', '07BBBCS5678B2Z6')).toBe(false);
    });
  });

  describe('Number to Words (Indian Format)', () => {
    it('should convert simple numbers', () => {
      expect(numberToWords(0)).toBe('Zero Rupees Only');
      expect(numberToWords(1)).toBe('One Rupees Only');
      expect(numberToWords(10)).toBe('Ten Rupees Only');
      expect(numberToWords(15)).toBe('Fifteen Rupees Only');
    });

    it('should convert two-digit numbers', () => {
      expect(numberToWords(21)).toBe('Twenty One Rupees Only');
      expect(numberToWords(99)).toBe('Ninety Nine Rupees Only');
    });

    it('should convert three-digit numbers', () => {
      expect(numberToWords(100)).toBe('One Hundred Rupees Only');
      expect(numberToWords(123)).toBe('One Hundred Twenty Three Rupees Only');
      expect(numberToWords(999)).toBe('Nine Hundred Ninety Nine Rupees Only');
    });

    it('should convert thousands (Indian system)', () => {
      expect(numberToWords(1000)).toBe('One Thousand Rupees Only');
      expect(numberToWords(12345)).toBe('Twelve Thousand Three Hundred Forty Five Rupees Only');
      expect(numberToWords(99999)).toBe('Ninety Nine Thousand Nine Hundred Ninety Nine Rupees Only');
    });

    it('should convert lakhs (Indian system)', () => {
      expect(numberToWords(100000)).toBe('One Lakh Rupees Only');
      expect(numberToWords(123456)).toBe('One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees Only');
    });

    it('should convert crores (Indian system)', () => {
      expect(numberToWords(10000000)).toBe('One Crore Rupees Only');
      expect(numberToWords(12345678)).toContain('Crore');
    });

    it('should handle paise', () => {
      expect(numberToWords(100.50)).toBe('One Hundred Rupees and Fifty Paise Only');
      expect(numberToWords(1234.75)).toContain('Paise');
    });
  });

  describe('HSN Summary', () => {
    it('should group items by HSN code', () => {
      const items = [
        { hsnCode: '8536', name: 'MCB', quantity: 5, unit: 'pcs', taxableAmount: 500, cgst: 45, sgst: 45, igst: 0 },
        { hsnCode: '8536', name: 'Switch', quantity: 3, unit: 'pcs', taxableAmount: 300, cgst: 27, sgst: 27, igst: 0 },
        { hsnCode: '8544', name: 'Wire', quantity: 10, unit: 'm', taxableAmount: 1000, cgst: 90, sgst: 90, igst: 0 },
      ];
      
      const summary = calculateHsnSummary(items);
      expect(summary.length).toBe(2);
      
      const hsn8536 = summary.find(s => s.hsnCode === '8536');
      expect(hsn8536?.quantity).toBe(8);
      expect(hsn8536?.taxableValue).toBe(800);
      
      const hsn8544 = summary.find(s => s.hsnCode === '8544');
      expect(hsn8544?.quantity).toBe(10);
      expect(hsn8544?.taxableValue).toBe(1000);
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    it('should handle zero values', () => {
      const result = calculateGstBreakdown(0, 18, false);
      expect(result.totalAmount).toBe(0);
    });

    it('should handle 0% GST rate', () => {
      const result = calculateGstBreakdown(1000, 0, false);
      expect(result.totalGst).toBe(0);
      expect(result.totalAmount).toBe(1000);
    });

    it('should handle large amounts (crores)', () => {
      const result = calculateGstBreakdown(10000000, 18, false);
      expect(result.totalGst).toBe(1800000);
      expect(result.totalAmount).toBe(11800000);
    });

    it('should handle very small amounts', () => {
      const result = calculateGstBreakdown(0.01, 18, false);
      expect(result.totalAmount).toBeLessThanOrEqual(0.02);
    });
  });
});
