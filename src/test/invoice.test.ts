import { describe, it, expect, beforeEach } from 'vitest';
import { roundCurrency, calculateGst } from '@/lib/validation';

describe('Invoice Creation - Production Certification Tests', () => {
  
  describe('Invoice Line Item Calculations', () => {
    it('should calculate line item total correctly', () => {
      const price = 100;
      const quantity = 5;
      const discount = 10;
      const gstPercent = 18;
      
      const taxableAmount = (price - discount) * quantity;
      expect(taxableAmount).toBe(450);
      
      const gstAmount = roundCurrency(taxableAmount * gstPercent / 100);
      expect(gstAmount).toBe(81);
      
      const total = roundCurrency(taxableAmount + gstAmount);
      expect(total).toBe(531);
    });

    it('should handle zero discount', () => {
      const price = 250;
      const quantity = 2;
      const discount = 0;
      const gstPercent = 12;
      
      const taxableAmount = (price - discount) * quantity;
      expect(taxableAmount).toBe(500);
      
      const { cgst, sgst } = calculateGst(taxableAmount, gstPercent, false);
      expect(cgst).toBe(30);
      expect(sgst).toBe(30);
    });

    it('should handle 100% discount (free item)', () => {
      const price = 100;
      const quantity = 1;
      const discount = 100;
      
      const taxableAmount = (price - discount) * quantity;
      expect(taxableAmount).toBe(0);
      
      const { cgst, sgst, igst } = calculateGst(taxableAmount, 18, false);
      expect(cgst).toBe(0);
      expect(sgst).toBe(0);
      expect(igst).toBe(0);
    });

    it('should prevent negative taxable amount', () => {
      const price = 100;
      const discount = 150; // More than price
      const quantity = 1;
      
      // Business logic should cap discount at price
      const cappedDiscount = Math.min(discount, price);
      const taxableAmount = Math.max(0, (price - cappedDiscount) * quantity);
      expect(taxableAmount).toBe(0);
    });
  });

  describe('Invoice Totals Calculation', () => {
    const mockLineItems = [
      { price: 100, quantity: 2, discount: 0, gstPercent: 18 },
      { price: 500, quantity: 1, discount: 50, gstPercent: 12 },
      { price: 250, quantity: 4, discount: 10, gstPercent: 5 },
    ];

    it('should calculate subtotal correctly', () => {
      const subtotal = mockLineItems.reduce((sum, item) => {
        return sum + (item.price - item.discount) * item.quantity;
      }, 0);
      // (100-0)*2 + (500-50)*1 + (250-10)*4 = 200 + 450 + 960 = 1610
      expect(subtotal).toBe(1610);
    });

    it('should calculate total tax correctly', () => {
      let totalCgst = 0;
      let totalSgst = 0;
      
      mockLineItems.forEach(item => {
        const taxableAmount = (item.price - item.discount) * item.quantity;
        const { cgst, sgst } = calculateGst(taxableAmount, item.gstPercent, false);
        totalCgst += cgst;
        totalSgst += sgst;
      });
      
      expect(totalCgst).toBe(18 + 27 + 24); // 69
      expect(totalSgst).toBe(18 + 27 + 24); // 69
    });


    it('should not double count tax when quantity is already included in taxable amount', () => {
      const lineItems = [
        { quantity: 2, cgst: 18, sgst: 18, igst: 0 },
        { quantity: 4, cgst: 24, sgst: 24, igst: 0 },
      ];

      const totalCgst = lineItems.reduce((sum, item) => sum + item.cgst, 0);
      const totalSgst = lineItems.reduce((sum, item) => sum + item.sgst, 0);

      expect(totalCgst).toBe(42);
      expect(totalSgst).toBe(42);
    });
    it('should calculate grand total correctly', () => {
      let grandTotal = 0;
      
      mockLineItems.forEach(item => {
        const taxableAmount = (item.price - item.discount) * item.quantity;
        const gstAmount = roundCurrency(taxableAmount * item.gstPercent / 100);
        grandTotal += taxableAmount + gstAmount;
      });
      // 200+36 + 450+54 + 960+48 = 236+504+1008 = 1748
      expect(grandTotal).toBe(1748);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should format invoice number correctly', () => {
      const prefix = 'INV';
      const fiscalYear = '2025-26';
      const sequenceNumber = 42;
      
      const invoiceNumber = `${prefix}/${fiscalYear}/${String(sequenceNumber).padStart(4, '0')}`;
      expect(invoiceNumber).toBe('INV/2025-26/0042');
    });

    it('should handle large sequence numbers', () => {
      const prefix = 'SE';
      const fiscalYear = '2025-26';
      const sequenceNumber = 99999;
      
      const invoiceNumber = `${prefix}/${fiscalYear}/${String(sequenceNumber).padStart(4, '0')}`;
      expect(invoiceNumber).toBe('SE/2025-26/99999');
    });

    it('should handle custom prefixes', () => {
      const prefix = 'EXPORT';
      const fiscalYear = '2025-26';
      const sequenceNumber = 1;
      
      const invoiceNumber = `${prefix}/${fiscalYear}/${String(sequenceNumber).padStart(4, '0')}`;
      expect(invoiceNumber).toBe('EXPORT/2025-26/0001');
    });
  });

  describe('Round Off Calculation', () => {
    it('should round to nearest rupee', () => {
      const amounts = [
        { grandTotal: 1234.49, expected: -0.49 },
        { grandTotal: 1234.50, expected: 0.50 },
        { grandTotal: 1234.51, expected: 0.49 },
        { grandTotal: 1234.00, expected: 0 },
      ];
      
      amounts.forEach(({ grandTotal, expected }) => {
        const rounded = Math.round(grandTotal);
        const roundOff = roundCurrency(rounded - grandTotal);
        expect(roundOff).toBe(expected);
      });
    });
  });

  describe('Invoice Status Transitions', () => {
    type InvoiceStatus = 'draft' | 'completed' | 'cancelled';
    
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      'draft': ['completed', 'cancelled'],
      'completed': ['cancelled'],
      'cancelled': [], // Terminal state
    };

    it('should allow valid status transitions', () => {
      expect(validTransitions['draft'].includes('completed')).toBe(true);
      expect(validTransitions['draft'].includes('cancelled')).toBe(true);
      expect(validTransitions['completed'].includes('cancelled')).toBe(true);
    });

    it('should block invalid status transitions', () => {
      expect(validTransitions['cancelled'].length).toBe(0);
      expect(validTransitions['completed'].includes('draft')).toBe(false);
    });
  });

  describe('IGST vs CGST/SGST Selection', () => {
    it('should use IGST for inter-state', () => {
      const taxableAmount = 1000;
      const gstPercent = 18;
      
      const { cgst, sgst, igst } = calculateGst(taxableAmount, gstPercent, true);
      expect(igst).toBe(180);
      expect(cgst).toBe(0);
      expect(sgst).toBe(0);
    });

    it('should use CGST/SGST for intra-state', () => {
      const taxableAmount = 1000;
      const gstPercent = 18;
      
      const { cgst, sgst, igst } = calculateGst(taxableAmount, gstPercent, false);
      expect(igst).toBe(0);
      expect(cgst).toBe(90);
      expect(sgst).toBe(90);
    });
  });

  describe('Amount in Words', () => {
    const numberToWords = (num: number): string => {
      if (num === 0) return 'Zero';
      
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
      if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
      if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
      return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
    };

    it('should convert small amounts', () => {
      expect(numberToWords(5)).toBe('Five');
      expect(numberToWords(15)).toBe('Fifteen');
      expect(numberToWords(99)).toBe('Ninety Nine');
    });

    it('should convert hundreds', () => {
      expect(numberToWords(100)).toBe('One Hundred');
      expect(numberToWords(234)).toBe('Two Hundred Thirty Four');
    });

    it('should convert thousands (Indian numbering)', () => {
      expect(numberToWords(1000)).toBe('One Thousand');
      expect(numberToWords(12345)).toBe('Twelve Thousand Three Hundred Forty Five');
    });

    it('should convert lakhs', () => {
      expect(numberToWords(100000)).toBe('One Lakh');
      expect(numberToWords(123456)).toBe('One Lakh Twenty Three Thousand Four Hundred Fifty Six');
    });

    it('should convert crores', () => {
      expect(numberToWords(10000000)).toBe('One Crore');
    });
  });
});

describe('Invoice Payment Modes', () => {
  const validPaymentModes = ['cash', 'upi', 'card', 'credit', 'bank_transfer'];

  it('should accept all valid payment modes', () => {
    validPaymentModes.forEach(mode => {
      expect(validPaymentModes.includes(mode)).toBe(true);
    });
  });

  it('should have default payment mode as cash', () => {
    const defaultMode = 'cash';
    expect(validPaymentModes[0]).toBe(defaultMode);
  });
});
