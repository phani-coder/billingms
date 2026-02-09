import type { Invoice, AppSettings, EInvoiceData, EInvoiceItem } from '@/types';
import { format } from 'date-fns';

// GST State Codes
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

// Unit codes for e-invoice
export const E_INVOICE_UNITS: Record<string, string> = {
  'pcs': 'PCS',
  'nos': 'NOS',
  'kg': 'KGS',
  'g': 'GMS',
  'l': 'LTR',
  'ml': 'MLT',
  'm': 'MTR',
  'cm': 'CMS',
  'mm': 'MMS',
  'sqm': 'SQM',
  'sqft': 'SQF',
  'box': 'BOX',
  'set': 'SET',
  'pair': 'PAR',
  'roll': 'ROL',
  'pack': 'PAC',
};

// Generate e-invoice JSON (GST India format)
export function generateEInvoiceJson(invoice: Invoice, settings: AppSettings): EInvoiceData {
  const sellerStateCode = settings.stateCode || '07';
  const buyerStateCode = invoice.customerStateCode || sellerStateCode;
  
  // Determine supply type
  const isInterState = sellerStateCode !== buyerStateCode;
  const supplyType = isInterState ? 'INTER' : 'INTRA';
  
  // Document type
  let docType = 'INV';
  switch (invoice.invoiceType) {
    case 'credit_note': docType = 'CRN'; break;
    case 'debit_note': docType = 'DBN'; break;
    case 'export': docType = 'EXP'; break;
    default: docType = 'INV';
  }
  
  // Build item list
  const itemList: EInvoiceItem[] = invoice.items.map((item, index) => ({
    SlNo: String(index + 1),
    PrdDesc: item.name.substring(0, 300),
    IsServc: 'N',
    HsnCd: item.hsnCode || '0000',
    Barcde: null,
    Qty: item.quantity,
    FreeQty: 0,
    Unit: E_INVOICE_UNITS[item.unit.toLowerCase()] || 'OTH',
    UnitPrice: item.price,
    TotAmt: item.price * item.quantity,
    Discount: item.discount * item.quantity,
    PreTaxVal: item.taxableAmount,
    AssAmt: item.taxableAmount,
    GstRt: item.gstPercent,
    IgstAmt: item.igst * item.quantity,
    CgstAmt: item.cgst * item.quantity,
    SgstAmt: item.sgst * item.quantity,
    CesRt: 0,
    CesAmt: 0,
    CesNonAdvlAmt: 0,
    StateCesRt: 0,
    StateCesAmt: 0,
    StateCesNonAdvlAmt: 0,
    OthChrg: 0,
    TotItemVal: item.totalAmount,
  }));
  
  const eInvoice: EInvoiceData = {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: invoice.customerGst ? 'B2B' : 'B2C',
      RegRev: 'N',
      EcmGstin: null,
      IgstOnIntra: isInterState ? 'N' : 'Y',
    },
    DocDtls: {
      Typ: docType,
      No: invoice.invoiceNumber,
      Dt: format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'),
    },
    SellerDtls: {
      Gstin: settings.businessGst,
      LglNm: settings.businessName,
      TrdNm: settings.businessName,
      Addr1: settings.businessAddress.substring(0, 100),
      Addr2: '',
      Loc: 'Delhi',
      Pin: 110001,
      Stcd: sellerStateCode,
      Ph: settings.businessPhone,
      Em: settings.businessEmail,
    },
    BuyerDtls: {
      Gstin: invoice.customerGst || 'URP',
      LglNm: invoice.customerName,
      TrdNm: invoice.customerName,
      Pos: buyerStateCode,
      Addr1: invoice.customerAddress?.substring(0, 100) || 'NA',
      Addr2: '',
      Loc: 'Delhi',
      Pin: 110001,
      Stcd: buyerStateCode,
      Ph: invoice.customerPhone || '',
      Em: '',
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: invoice.subtotal,
      CgstVal: invoice.totalCgst,
      SgstVal: invoice.totalSgst,
      IgstVal: invoice.totalIgst,
      CesVal: 0,
      StCesVal: 0,
      Discount: invoice.totalDiscount,
      OthChrg: 0,
      RndOffAmt: invoice.roundOff,
      TotInvVal: invoice.grandTotal,
    },
  };
  
  return eInvoice;
}

// Validate e-invoice data
export function validateEInvoiceData(data: EInvoiceData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Seller validations
  if (!data.SellerDtls.Gstin || data.SellerDtls.Gstin.length !== 15) {
    errors.push('Invalid seller GSTIN');
  }
  if (!data.SellerDtls.LglNm) {
    errors.push('Seller legal name is required');
  }
  if (!data.SellerDtls.Addr1) {
    errors.push('Seller address is required');
  }
  if (!data.SellerDtls.Pin || data.SellerDtls.Pin < 100000 || data.SellerDtls.Pin > 999999) {
    errors.push('Invalid seller PIN code');
  }
  
  // Buyer validations for B2B
  if (data.TranDtls.SupTyp === 'B2B') {
    if (!data.BuyerDtls.Gstin || data.BuyerDtls.Gstin.length !== 15) {
      errors.push('Invalid buyer GSTIN for B2B transaction');
    }
  }
  
  // Item validations
  if (!data.ItemList || data.ItemList.length === 0) {
    errors.push('At least one item is required');
  }
  
  data.ItemList.forEach((item, index) => {
    if (!item.HsnCd || item.HsnCd.length < 4) {
      errors.push(`Item ${index + 1}: Invalid HSN code`);
    }
    if (item.Qty <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be positive`);
    }
    if (item.UnitPrice < 0) {
      errors.push(`Item ${index + 1}: Unit price cannot be negative`);
    }
  });
  
  // Value validations
  if (data.ValDtls.TotInvVal <= 0) {
    errors.push('Invoice total must be positive');
  }
  
  return { valid: errors.length === 0, errors };
}

// Export e-invoice JSON file
export function exportEInvoiceJson(invoice: Invoice, settings: AppSettings): string {
  const eInvoice = generateEInvoiceJson(invoice, settings);
  return JSON.stringify(eInvoice, null, 2);
}

// Check if e-invoice is required (based on turnover threshold)
export function isEInvoiceRequired(invoice: Invoice, settings: AppSettings): boolean {
  // E-invoice is mandatory for businesses with turnover > 5 crore (as of 2023)
  // For demo, we check if it's enabled in settings
  return settings.eInvoiceEnabled && invoice.invoiceType === 'tax_invoice' && !!invoice.customerGst;
}
