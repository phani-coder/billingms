import type { Invoice, AppSettings } from '@/types';
import { format } from 'date-fns';
import { Printer, ArrowLeft, Plus } from 'lucide-react';

interface Props {
  invoice: Invoice;
  settings: AppSettings;
  onBack: () => void;
  onNew: () => void;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  return convert(Math.floor(num)) + ' Rupees Only';
}

export default function InvoicePrint({ invoice, settings, onBack, onNew }: Props) {
  const handlePrint = () => window.print();

  return (
    <div>
      <div className="no-print flex gap-3 mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <Printer className="w-4 h-4" /> Print Invoice
        </button>
        <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="bg-card border rounded-xl p-8 max-w-4xl mx-auto print:border-0 print:shadow-none print:p-4 print:max-w-none" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* Header */}
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold">{settings.businessName}</h1>
          <p className="text-sm text-muted-foreground">{settings.businessAddress}</p>
          <p className="text-sm text-muted-foreground">Phone: {settings.businessPhone} | Email: {settings.businessEmail}</p>
          <p className="text-sm font-medium">GSTIN: {settings.businessGst}</p>
          <h2 className="text-lg font-bold mt-2">TAX INVOICE</h2>
        </div>

        {/* Invoice details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><strong>Invoice No:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}</p>
            <p><strong>Payment:</strong> {invoice.paymentMode.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p><strong>Customer:</strong> {invoice.customerName}</p>
            {invoice.customerGst && <p><strong>GSTIN:</strong> {invoice.customerGst}</p>}
            {invoice.customerPhone && <p><strong>Phone:</strong> {invoice.customerPhone}</p>}
            {invoice.customerAddress && <p className="text-xs">{invoice.customerAddress}</p>}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm border mb-4">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="border-r px-2 py-1.5 text-left">#</th>
              <th className="border-r px-2 py-1.5 text-left">Item</th>
              <th className="border-r px-2 py-1.5 text-left">HSN</th>
              <th className="border-r px-2 py-1.5 text-right">Qty</th>
              <th className="border-r px-2 py-1.5 text-right">Rate</th>
              <th className="border-r px-2 py-1.5 text-right">Disc.</th>
              <th className="border-r px-2 py-1.5 text-right">Taxable</th>
              {invoice.isIgst ? (
                <th className="border-r px-2 py-1.5 text-right">IGST</th>
              ) : (
                <>
                  <th className="border-r px-2 py-1.5 text-right">CGST</th>
                  <th className="border-r px-2 py-1.5 text-right">SGST</th>
                </>
              )}
              <th className="px-2 py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="border-r px-2 py-1">{idx + 1}</td>
                <td className="border-r px-2 py-1">{item.name}<br /><span className="text-xs text-muted-foreground">{item.sku}</span></td>
                <td className="border-r px-2 py-1 font-mono text-xs">{item.hsnCode}</td>
                <td className="border-r px-2 py-1 text-right amount-text">{item.quantity} {item.unit}</td>
                <td className="border-r px-2 py-1 text-right amount-text">₹{item.price.toFixed(2)}</td>
                <td className="border-r px-2 py-1 text-right amount-text">₹{(item.discount * item.quantity).toFixed(2)}</td>
                <td className="border-r px-2 py-1 text-right amount-text">₹{item.taxableAmount.toFixed(2)}</td>
                {invoice.isIgst ? (
                  <td className="border-r px-2 py-1 text-right amount-text">₹{(item.igst * item.quantity).toFixed(2)}<br /><span className="text-xs">@{item.gstPercent}%</span></td>
                ) : (
                  <>
                    <td className="border-r px-2 py-1 text-right amount-text">₹{(item.cgst * item.quantity).toFixed(2)}<br /><span className="text-xs">@{item.gstPercent / 2}%</span></td>
                    <td className="border-r px-2 py-1 text-right amount-text">₹{(item.sgst * item.quantity).toFixed(2)}<br /><span className="text-xs">@{item.gstPercent / 2}%</span></td>
                  </>
                )}
                <td className="px-2 py-1 text-right amount-text font-semibold">₹{item.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal:</span><span className="amount-text">₹{invoice.subtotal.toFixed(2)}</span></div>
            {invoice.totalDiscount > 0 && <div className="flex justify-between"><span>Discount:</span><span className="amount-text">-₹{invoice.totalDiscount.toFixed(2)}</span></div>}
            {invoice.isIgst ? (
              <div className="flex justify-between"><span>IGST:</span><span className="amount-text">₹{invoice.totalIgst.toFixed(2)}</span></div>
            ) : (
              <>
                <div className="flex justify-between"><span>CGST:</span><span className="amount-text">₹{invoice.totalCgst.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>SGST:</span><span className="amount-text">₹{invoice.totalSgst.toFixed(2)}</span></div>
              </>
            )}
            {invoice.roundOff !== 0 && <div className="flex justify-between text-muted-foreground"><span>Round Off:</span><span className="amount-text">{invoice.roundOff > 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Grand Total:</span><span className="amount-text">₹{invoice.grandTotal.toLocaleString('en-IN')}</span></div>
          </div>
        </div>

        <p className="text-xs italic mb-4">{numberToWords(invoice.grandTotal)}</p>

        {invoice.notes && <p className="text-xs mb-4"><strong>Notes:</strong> {invoice.notes}</p>}

        <div className="flex justify-between items-end mt-8 pt-4 border-t text-sm">
          <p className="text-muted-foreground">Thank you for your business!</p>
          <div className="text-center">
            <div className="w-40 border-b mb-1"></div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
