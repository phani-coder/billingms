import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getNextInvoiceNumber, updateStockAfterSale, getSettings, validateStockForSale, invoiceNumberExists } from '@/db/database';
import type { InventoryItem, Invoice, InvoiceItem, Customer } from '@/types';
import { Search, Plus, Trash2, Printer, FileDown, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import ItemFormDialog from '@/components/ItemFormDialog';
import InvoicePrint from '@/components/InvoicePrint';
import type { AppSettings } from '@/types';
import { roundCurrency, calculateGst, sanitizeInput } from '@/lib/validation';

export default function Billing() {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [isIgst, setIsIgst] = useState(false);
  const [paymentMode, setPaymentMode] = useState<Invoice['paymentMode']>('cash');
  const [notes, setNotes] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const itemSearchRef = useRef<HTMLInputElement>(null);

  const items = useLiveQuery(() => db.items.filter(i => i.isActive).toArray()) ?? [];
  const customers = useLiveQuery(() => db.customers.toArray()) ?? [];

  useEffect(() => {
    getNextInvoiceNumber().then(setInvoiceNumber);
    getSettings().then(setSettings);
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.brand.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addLineItem = (item: InventoryItem) => {
    if (item.currentStock <= 0) return toast.error('Item is out of stock!');
    const existing = lineItems.find(l => l.itemId === item.id);
    if (existing) {
      if (existing.quantity >= item.currentStock) return toast.error('Insufficient stock!');
      updateLineItem(lineItems.indexOf(existing), 'quantity', existing.quantity + 1);
    } else {
      const taxableAmount = roundCurrency(item.sellingPrice);
      const { cgst, sgst, igst } = calculateGst(taxableAmount, item.gstPercent, isIgst);
      const newItem: InvoiceItem = {
        itemId: item.id!,
        name: item.name,
        sku: item.sku,
        hsnCode: item.hsnCode,
        quantity: 1,
        unit: item.unit,
        price: item.sellingPrice,
        discount: 0,
        gstPercent: item.gstPercent,
        cgst, sgst, igst,
        taxableAmount,
        totalAmount: roundCurrency(taxableAmount + cgst + sgst + igst),
      };
      setLineItems(prev => [...prev, newItem]);
    }
    setItemSearch('');
    setShowItemDropdown(false);
  };

  const updateLineItem = (index: number, field: string, value: number) => {
    if (field === 'quantity') value = Math.max(1, Math.min(99999, Math.floor(value)));
    if (field === 'discount') value = Math.max(0, Math.min(99999999, value));
    if (field === 'price') value = Math.max(0, Math.min(99999999, value));
    
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      const taxableAmount = roundCurrency((item.price - item.discount) * item.quantity);
      const { cgst, sgst, igst } = calculateGst(taxableAmount, item.gstPercent, isIgst);
      item.taxableAmount = taxableAmount;
      item.cgst = cgst; item.sgst = sgst; item.igst = igst;
      item.totalAmount = roundCurrency(taxableAmount + cgst + sgst + igst);
      updated[index] = item;
      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((s, i) => s + i.taxableAmount, 0);
  const totalCgst = lineItems.reduce((s, i) => s + i.cgst * i.quantity, 0);
  const totalSgst = lineItems.reduce((s, i) => s + i.sgst * i.quantity, 0);
  const totalIgst = lineItems.reduce((s, i) => s + i.igst * i.quantity, 0);
  const totalDiscount = lineItems.reduce((s, i) => s + i.discount * i.quantity, 0);
  const rawTotal = subtotal + totalCgst + totalSgst + totalIgst;
  const roundOff = Math.round(rawTotal) - rawTotal;
  const grandTotal = Math.round(rawTotal);

  const handleSave = async (status: 'draft' | 'completed') => {
    if (lineItems.length === 0) return toast.error('Add at least one item');
    if (status === 'completed') {
      const stockValidation = await validateStockForSale(
        lineItems.map(li => ({ itemId: li.itemId, quantity: li.quantity }))
      );
      if (!stockValidation.valid) {
        stockValidation.errors.forEach(err => toast.error(err));
        return;
      }
    }
    if (await invoiceNumberExists(invoiceNumber)) {
      toast.error('Invoice number already exists. Refreshing...');
      const newNum = await getNextInvoiceNumber();
      setInvoiceNumber(newNum);
      return;
    }
    try {
      const invoice: Invoice = {
        invoiceNumber,
        invoiceType: 'tax_invoice',
        invoiceDate: new Date(invoiceDate),
        customerId: selectedCustomer?.id ?? 0,
        customerName: sanitizeInput(selectedCustomer?.name ?? 'Walk-in Customer'),
        customerGst: selectedCustomer?.gstNumber ?? '',
        customerAddress: sanitizeInput(selectedCustomer?.address ?? ''),
        customerPhone: selectedCustomer?.phone ?? '',
        customerStateCode: selectedCustomer?.stateCode,
        items: lineItems,
        subtotal: roundCurrency(subtotal),
        totalCgst: roundCurrency(totalCgst),
        totalSgst: roundCurrency(totalSgst),
        totalIgst: roundCurrency(totalIgst),
        totalDiscount: roundCurrency(totalDiscount),
        grandTotal,
        roundOff: roundCurrency(roundOff),
        paymentMode,
        isIgst,
        notes: sanitizeInput(notes),
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const id = await db.invoices.add(invoice);
      if (status === 'completed') {
        await updateStockAfterSale(
          lineItems.map(li => ({ itemId: li.itemId, quantity: li.quantity, name: li.name })),
          invoiceNumber
        );
      }
      const saved = await db.invoices.get(id);
      setSavedInvoice(saved ?? null);
      toast.success(status === 'completed' ? 'Invoice saved!' : 'Draft saved');
      if (status === 'completed') setShowPrint(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save invoice');
    }
  };

  const handleNewInvoice = async () => {
    setLineItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setNotes('');
    setPaymentMode('cash');
    setSavedInvoice(null);
    setShowPrint(false);
    const num = await getNextInvoiceNumber();
    setInvoiceNumber(num);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); itemSearchRef.current?.focus(); }
      if (e.key === 'F9') { e.preventDefault(); handleSave('completed'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lineItems]);

  if (showPrint && savedInvoice && settings) {
    return <InvoicePrint invoice={savedInvoice} settings={settings} onBack={() => setShowPrint(false)} onNew={handleNewInvoice} />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">New Invoice</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Press F2 to search items • F9 to save</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => handleSave('draft')} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted">
            <Save className="w-4 h-4" /> Draft
          </button>
          <button onClick={() => handleSave('completed')} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <FileDown className="w-4 h-4" /> Save & Print
          </button>
        </div>
      </div>

      {/* Invoice header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="input-label">Invoice #</label>
          <input className="w-full px-3 py-2.5 rounded-lg border bg-muted text-sm amount-text" value={invoiceNumber} readOnly />
        </div>
        <div>
          <label className="input-label">Date</label>
          <input type="date" className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
        </div>
        <div className="relative sm:col-span-2 lg:col-span-1">
          <label className="input-label">Customer</label>
          <input
            className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
            placeholder="Search customer or leave blank"
            value={selectedCustomer ? selectedCustomer.name : customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true); }}
            onFocus={() => setShowCustomerDropdown(true)}
          />
          {selectedCustomer && (
            <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="absolute right-2 top-8 p-1">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {showCustomerDropdown && !selectedCustomer && customerSearch && (
            <div className="absolute z-10 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredCustomers.map(c => (
                <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); }}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground ml-2">{c.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isIgst} onChange={e => setIsIgst(e.target.checked)} className="rounded" />
          Interstate (IGST)
        </label>
        <select className="px-3 py-1.5 rounded-lg border bg-background text-sm" value={paymentMode} onChange={e => setPaymentMode(e.target.value as Invoice['paymentMode'])}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank">Bank Transfer</option>
          <option value="credit">Credit</option>
        </select>
      </div>

      {/* Item search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={itemSearchRef}
          className="w-full pl-10 pr-20 py-3 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search item by name, SKU..."
          value={itemSearch}
          onChange={e => { setItemSearch(e.target.value); setShowItemDropdown(true); }}
          onFocus={() => setShowItemDropdown(true)}
          onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
        />
        <button
          onClick={() => setShowAddItem(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded bg-accent text-accent-foreground hover:opacity-80 text-xs font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New
        </button>
        {showItemDropdown && itemSearch && (
          <div className="absolute z-10 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                No items found.{' '}
                <button onClick={() => setShowAddItem(true)} className="text-primary underline">Add new</button>
              </div>
            ) : filteredItems.map(item => (
              <button key={item.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center" onClick={() => addLineItem(item)}>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs hidden sm:inline">{item.brand} • {item.sku}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="amount-text font-semibold">₹{item.sellingPrice}</span>
                  <span className={`ml-2 text-xs ${item.currentStock <= item.minStockLevel ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {item.currentStock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Line items - Desktop table */}
      <div className="hidden lg:block bg-card rounded-xl border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-semibold">#</th>
              <th className="text-left px-3 py-2 font-semibold">Item</th>
              <th className="text-right px-3 py-2 font-semibold">Price</th>
              <th className="text-right px-3 py-2 font-semibold w-20">Qty</th>
              <th className="text-right px-3 py-2 font-semibold w-20">Disc.</th>
              <th className="text-right px-3 py-2 font-semibold">GST%</th>
              <th className="text-right px-3 py-2 font-semibold">Tax</th>
              <th className="text-right px-3 py-2 font-semibold">Total</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No items added. Search and add items above.</td></tr>
            ) : lineItems.map((li, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{li.name}</p>
                  <p className="text-xs text-muted-foreground">{li.sku} {li.hsnCode && `• HSN: ${li.hsnCode}`}</p>
                </td>
                <td className="px-3 py-2 text-right amount-text">₹{li.price.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2">
                  <input type="number" min="1" className="w-16 text-right px-2 py-1 rounded border bg-background text-sm amount-text" value={li.quantity}
                    onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="0" step="0.01" className="w-16 text-right px-2 py-1 rounded border bg-background text-sm amount-text" value={li.discount}
                    onChange={e => updateLineItem(idx, 'discount', parseFloat(e.target.value) || 0)} />
                </td>
                <td className="px-3 py-2 text-right amount-text">{li.gstPercent}%</td>
                <td className="px-3 py-2 text-right amount-text text-xs">
                  {isIgst ? `IGST: ₹${(li.igst * li.quantity).toFixed(2)}` : (
                    <>{`C: ₹${(li.cgst * li.quantity).toFixed(2)}`}<br />{`S: ₹${(li.sgst * li.quantity).toFixed(2)}`}</>
                  )}
                </td>
                <td className="px-3 py-2 text-right amount-text font-semibold">₹{li.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">
                  <button onClick={() => removeLineItem(idx)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Line items - Mobile cards */}
      <div className="lg:hidden space-y-3 mb-6">
        {lineItems.length === 0 ? (
          <div className="bg-card rounded-xl border p-6 text-center text-muted-foreground text-sm">
            No items added. Search and add items above.
          </div>
        ) : lineItems.map((li, idx) => (
          <div key={idx} className="bg-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{li.name}</p>
                <p className="text-xs text-muted-foreground">{li.sku} {li.hsnCode && `• HSN: ${li.hsnCode}`}</p>
              </div>
              <button onClick={() => removeLineItem(idx)} className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Qty</label>
                <input type="number" min="1" className="w-full text-center px-2 py-1.5 rounded border bg-background text-sm amount-text" value={li.quantity}
                  onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Price</label>
                <p className="text-sm amount-text font-medium py-1.5">₹{li.price.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Disc.</label>
                <input type="number" min="0" step="0.01" className="w-full text-center px-2 py-1.5 rounded border bg-background text-sm amount-text" value={li.discount}
                  onChange={e => updateLineItem(idx, 'discount', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
              <span className="text-muted-foreground">GST {li.gstPercent}%</span>
              <span className="font-semibold amount-text">₹{li.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      {lineItems.length > 0 && (
        <div className="flex justify-end mb-6">
          <div className="bg-card rounded-xl border p-5 w-full sm:max-w-sm space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="amount-text">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {totalDiscount > 0 && <div className="flex justify-between text-sm text-success"><span>Discount</span><span className="amount-text">-₹{totalDiscount.toFixed(2)}</span></div>}
            {isIgst ? (
              <div className="flex justify-between text-sm"><span>IGST</span><span className="amount-text">₹{totalIgst.toFixed(2)}</span></div>
            ) : (
              <>
                <div className="flex justify-between text-sm"><span>CGST</span><span className="amount-text">₹{totalCgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>SGST</span><span className="amount-text">₹{totalSgst.toFixed(2)}</span></div>
              </>
            )}
            {roundOff !== 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Round Off</span><span className="amount-text">{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span></div>}
            <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Grand Total</span><span className="amount-text">₹{grandTotal.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="input-label">Notes</label>
        <textarea className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm h-16 resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
      </div>

      {showAddItem && <ItemFormDialog item={null} onClose={() => setShowAddItem(false)} />}
    </div>
  );
}
