/**
 * GST Calculation Library
 * Implements Indian GST rounding rules and tax computation
 */

// GST rounding: Round to nearest rupee for total, 2 decimals for line items
// As per GST rules, the taxable value is rounded to nearest rupee

export function roundToNearestRupee(value: number): number {
  return Math.round(value);
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// GST rounding for line items (Round half up)
export function roundGstAmount(value: number): number {
  // GST rule: Round to 2 decimal places using "round half up"
  return roundToTwoDecimals(value);
}

// Calculate taxable amount after discount
export function calculateTaxableAmount(
  quantity: number,
  unitPrice: number,
  discountPerUnit: number
): number {
  const netPrice = unitPrice - discountPerUnit;
  const taxable = quantity * netPrice;
  return roundToTwoDecimals(taxable);
}

// Calculate GST components
export interface GstBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
}

export function calculateGstBreakdown(
  taxableAmount: number,
  gstPercent: number,
  isInterState: boolean
): GstBreakdown {
  const gstAmount = roundGstAmount((taxableAmount * gstPercent) / 100);
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (isInterState) {
    // IGST for interstate
    igst = gstAmount;
  } else {
    // CGST + SGST for intrastate (split equally)
    const halfGst = roundGstAmount(gstAmount / 2);
    cgst = halfGst;
    sgst = halfGst;
    // Handle odd cent - add to CGST
    if (roundToTwoDecimals(cgst + sgst) !== gstAmount) {
      cgst = roundToTwoDecimals(gstAmount - sgst);
    }
  }
  
  const totalGst = roundToTwoDecimals(cgst + sgst + igst);
  const totalAmount = roundToTwoDecimals(taxableAmount + totalGst);
  
  return {
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalGst,
    totalAmount,
  };
}

// Calculate line item with all GST components
export interface LineItemCalculation {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstPerUnit: number;
  sgstPerUnit: number;
  igstPerUnit: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  lineTotal: number;
}

export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  discountPerUnit: number,
  gstPercent: number,
  isInterState: boolean
): LineItemCalculation {
  const netUnitPrice = roundToTwoDecimals(unitPrice - discountPerUnit);
  const taxableAmount = roundToTwoDecimals(netUnitPrice * quantity);
  
  // Calculate GST on taxable amount
  const gstBreakdown = calculateGstBreakdown(taxableAmount, gstPercent, isInterState);
  
  // Per unit GST (for display)
  const perUnitGst = calculateGstBreakdown(netUnitPrice, gstPercent, isInterState);
  
  return {
    quantity,
    unitPrice,
    discount: discountPerUnit,
    taxableAmount,
    gstPercent,
    cgstPerUnit: perUnitGst.cgst,
    sgstPerUnit: perUnitGst.sgst,
    igstPerUnit: perUnitGst.igst,
    totalCgst: gstBreakdown.cgst,
    totalSgst: gstBreakdown.sgst,
    totalIgst: gstBreakdown.igst,
    lineTotal: gstBreakdown.totalAmount,
  };
}

// Calculate invoice totals
export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateInvoiceTotals(
  lineItems: LineItemCalculation[]
): InvoiceTotals {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscount = lineItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const taxableValue = lineItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalCgst = lineItems.reduce((sum, item) => sum + item.totalCgst, 0);
  const totalSgst = lineItems.reduce((sum, item) => sum + item.totalSgst, 0);
  const totalIgst = lineItems.reduce((sum, item) => sum + item.totalIgst, 0);
  const totalTax = roundToTwoDecimals(totalCgst + totalSgst + totalIgst);
  
  const rawTotal = roundToTwoDecimals(taxableValue + totalTax);
  const grandTotal = roundToNearestRupee(rawTotal);
  const roundOff = roundToTwoDecimals(grandTotal - rawTotal);
  
  return {
    subtotal: roundToTwoDecimals(subtotal),
    totalDiscount: roundToTwoDecimals(totalDiscount),
    taxableValue: roundToTwoDecimals(taxableValue),
    totalCgst: roundToTwoDecimals(totalCgst),
    totalSgst: roundToTwoDecimals(totalSgst),
    totalIgst: roundToTwoDecimals(totalIgst),
    totalTax,
    roundOff,
    grandTotal,
  };
}

// HSN summary for invoice (grouped by HSN and GST rate)
export interface HsnSummaryItem {
  hsnCode: string;
  description: string;
  quantity: number;
  unit: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export function calculateHsnSummary(
  items: Array<{
    hsnCode: string;
    name: string;
    quantity: number;
    unit: string;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  }>
): HsnSummaryItem[] {
  const grouped = new Map<string, HsnSummaryItem>();
  
  for (const item of items) {
    const key = item.hsnCode || 'N/A';
    const existing = grouped.get(key);
    
    if (existing) {
      existing.quantity += item.quantity;
      existing.taxableValue = roundToTwoDecimals(existing.taxableValue + item.taxableAmount);
      existing.cgst = roundToTwoDecimals(existing.cgst + item.cgst * item.quantity);
      existing.sgst = roundToTwoDecimals(existing.sgst + item.sgst * item.quantity);
      existing.igst = roundToTwoDecimals(existing.igst + item.igst * item.quantity);
      existing.totalTax = roundToTwoDecimals(existing.cgst + existing.sgst + existing.igst);
    } else {
      grouped.set(key, {
        hsnCode: key,
        description: item.name,
        quantity: item.quantity,
        unit: item.unit,
        taxableValue: item.taxableAmount,
        cgst: roundToTwoDecimals(item.cgst * item.quantity),
        sgst: roundToTwoDecimals(item.sgst * item.quantity),
        igst: roundToTwoDecimals(item.igst * item.quantity),
        totalTax: roundToTwoDecimals((item.cgst + item.sgst + item.igst) * item.quantity),
      });
    }
  }
  
  return Array.from(grouped.values());
}

// Validate GST number format
export function isValidGstin(gstin: string): boolean {
  if (!gstin) return false;
  // 15 character alphanumeric: 2 state code + 10 PAN + 1 entity + 1 check digit + 1 (Z)
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstin.toUpperCase());
}

// Extract state code from GSTIN
export function getStateCodeFromGstin(gstin: string): string | null {
  if (!isValidGstin(gstin)) return null;
  return gstin.substring(0, 2);
}

// Check if transaction is interstate based on GSTINs
export function isInterStateTransaction(sellerGstin: string, buyerGstin: string): boolean {
  const sellerState = getStateCodeFromGstin(sellerGstin);
  const buyerState = getStateCodeFromGstin(buyerGstin);
  
  if (!sellerState || !buyerState) return false;
  return sellerState !== buyerState;
}

// Format currency for display (Indian format)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Number to words (Indian system)
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  
  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  
  let result = '';
  
  // Indian numbering: Crore, Lakh, Thousand, Hundred
  if (wholePart >= 10000000) {
    result += convertLessThanThousand(Math.floor(wholePart / 10000000)) + ' Crore ';
    num = wholePart % 10000000;
  } else {
    num = wholePart;
  }
  
  if (num >= 100000) {
    result += convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh ';
    num = num % 100000;
  }
  
  if (num >= 1000) {
    result += convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand ';
    num = num % 1000;
  }
  
  if (num > 0) {
    result += convertLessThanThousand(num);
  }
  
  result = result.trim() + ' Rupees';
  
  if (decimalPart > 0) {
    result += ' and ' + convertLessThanThousand(decimalPart) + ' Paise';
  }
  
  return result + ' Only';
}
