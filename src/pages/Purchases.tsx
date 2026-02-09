import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getNextPurchaseNumber, updateStockAfterPurchase, purchaseNumberExists } from '@/db/database';
import type { Supplier, PurchaseItem, InventoryItem } from '@/types';
import { Plus, Search, Trash2, Save, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { supplierSchema, isValidGstNumber, isValidPhone, isValidEmail, sanitizeInput } from '@/lib/validation';

export default function Purchases() {
  const [tab, setTab] = useState<'new' | 'history' | 'suppliers'>('new');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDD, setShowItemDD] = useState(false);
  const [lineItems, setLineItems] = useState<(PurchaseItem & { currentPrice: number })[]>([]);
  const [notes, setNotes] = useState('');

  // Supplier form
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', gstNumber: '', address: '', email: '' });

  const items = useLiveQuery(() => db.items.filter(i => i.isActive).toArray()) ?? [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) ?? [];
  const purchases = useLiveQuery(() => db.purchases.orderBy('createdAt').reverse().toArray()) ?? [];

  useEffect(() => { getNextPurchaseNumber().then(setPurchaseNumber); }, []);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.sku.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addItem = (item: InventoryItem) => {
    if (lineItems.find(l => l.itemId === item.id)) return toast.error('Item already added');
    setLineItems(prev => [...prev, {
      itemId: item.id!, name: item.name, sku: item.sku, quantity: 1,
      purchasePrice: item.purchasePrice, gstPercent: item.gstPercent,
      totalAmount: item.purchasePrice, currentPrice: item.purchasePrice
    }]);
    setItemSearch('');
    setShowItemDD(false);
  };

  const updateItem = (idx: number, field: string, val: number) => {
    // Validate input - prevent negative values
    if (field === 'quantity') {
      val = Math.max(1, Math.min(99999, Math.floor(val)));
    }
    if (field === 'purchasePrice') {
      val = Math.max(0, Math.min(99999999, val));
    }
    
    setLineItems(prev => {
      const u = [...prev];
      (u[idx] as any)[field] = val;
      u[idx].totalAmount = Math.round(u[idx].purchasePrice * u[idx].quantity * (1 + u[idx].gstPercent / 100) * 100) / 100;
      return u;
    });
  };

  const grandTotal = lineItems.reduce((s, i) => s + i.totalAmount, 0);

  const handleSave = async () => {
    if (!selectedSupplier) return toast.error('Select a supplier');
    if (lineItems.length === 0) return toast.error('Add at least one item');

    // Check for duplicate purchase number
    if (await purchaseNumberExists(purchaseNumber)) {
      toast.error('Purchase number already exists. Refreshing...');
      const newNum = await getNextPurchaseNumber();
      setPurchaseNumber(newNum);
      return;
    }

    try {
      await db.purchases.add({
        purchaseNumber, 
        purchaseDate: new Date(purchaseDate), 
        supplierId: selectedSupplier.id!,
        supplierName: sanitizeInput(selectedSupplier.name), 
        invoiceRef: sanitizeInput(invoiceRef), 
        items: lineItems,
        subtotal: Math.round(lineItems.reduce((s, i) => s + i.purchasePrice * i.quantity, 0) * 100) / 100,
        totalTax: Math.round((grandTotal - lineItems.reduce((s, i) => s + i.purchasePrice * i.quantity, 0)) * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100, 
        notes: sanitizeInput(notes), 
        createdAt: new Date(),
      });

      await updateStockAfterPurchase(
        lineItems.map(li => ({ itemId: li.itemId, quantity: li.quantity, name: li.name, purchasePrice: li.purchasePrice })),
        purchaseNumber
      );

      toast.success('Purchase recorded & stock updated!');
      setLineItems([]);
      setSelectedSupplier(null);
      setNotes('');
      setInvoiceRef('');
      const num = await getNextPurchaseNumber();
      setPurchaseNumber(num);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save purchase');
    }
  };

  const handleAddSupplier = async () => {
    // Validate with zod schema
    const validation = supplierSchema.safeParse(supplierForm);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return toast.error(firstError.message);
    }

    // Additional format validations
    if (supplierForm.gstNumber && !isValidGstNumber(supplierForm.gstNumber)) {
      return toast.error('Invalid GST number format');
    }
    if (supplierForm.phone && !isValidPhone(supplierForm.phone)) {
      return toast.error('Invalid phone number format (10 digits starting with 6-9)');
    }
    if (supplierForm.email && !isValidEmail(supplierForm.email)) {
      return toast.error('Invalid email format');
    }

    await db.suppliers.add({ 
      name: validation.data.name,
      phone: supplierForm.phone,
      gstNumber: supplierForm.gstNumber.toUpperCase(),
      address: validation.data.address,
      email: supplierForm.email.toLowerCase(),
      createdAt: new Date() 
    } as Supplier);
    toast.success('Supplier added');
    setShowSupplierForm(false);
    setSupplierForm({ name: '', phone: '', gstNumber: '', address: '', email: '' });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Purchases</h1>
        <div className="flex gap-2">
          {['new', 'history', 'suppliers'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}>
              {t === 'new' ? 'New Purchase' : t === 'history' ? 'History' : 'Suppliers'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'suppliers' && (
        <div>
          <button onClick={() => setShowSupplierForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold mb-4">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
          {suppliers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No suppliers yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(s => (
                <div key={s.id} className="bg-card rounded-xl border p-4 card-hover">
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.phone && <p className="text-sm text-muted-foreground">{s.phone}</p>}
                  {s.gstNumber && <p className="text-xs font-mono text-muted-foreground mt-1">GST: {s.gstNumber}</p>}
                  {s.address && <p className="text-xs text-muted-foreground mt-1">{s.address}</p>}
                </div>
              ))}
            </div>
          )}
          {showSupplierForm && (
            <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowSupplierForm(false)}>
              <div className="bg-card rounded-xl shadow-xl border w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold">Add Supplier</h2></div>
                <div className="p-6 space-y-4">
                  {['name', 'phone', 'gstNumber', 'address', 'email'].map(f => (
                    <div key={f}>
                      <label className="input-label capitalize">{f === 'gstNumber' ? 'GST Number' : f} {f === 'name' ? '*' : ''}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={(supplierForm as any)[f]} onChange={e => setSupplierForm(p => ({ ...p, [f]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t">
                  <button onClick={() => setShowSupplierForm(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
                  <button onClick={handleAddSupplier} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Add</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {purchases.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No purchase records yet.</p>
          ) : (
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3">Purchase #</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Supplier</th>
                  <th className="text-left px-4 py-3">Ref</th>
                  <th className="text-right px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Total</th>
                </tr></thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{p.purchaseNumber}</td>
                      <td className="px-4 py-3">{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3">{p.supplierName}</td>
                      <td className="px-4 py-3">{p.invoiceRef || '-'}</td>
                      <td className="px-4 py-3 text-right">{p.items.length}</td>
                      <td className="px-4 py-3 text-right amount-text font-semibold">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'new' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="input-label">Purchase #</label>
              <input className="w-full px-3 py-2 rounded-lg border bg-muted text-sm amount-text" value={purchaseNumber} readOnly />
            </div>
            <div>
              <label className="input-label">Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Supplier *</label>
              <select className="w-full px-3 py-2 rounded-lg border bg-background text-sm" value={selectedSupplier?.id ?? ''}
                onChange={e => setSelectedSupplier(suppliers.find(s => s.id === Number(e.target.value)) ?? null)}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="input-label">Supplier Invoice Ref</label>
            <input className="w-full max-w-sm px-3 py-2 rounded-lg border bg-background text-sm" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} />
          </div>

          <div className="relative mb-4 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-card text-sm" placeholder="Search items to add..."
              value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDD(true); }}
              onFocus={() => setShowItemDD(true)} onBlur={() => setTimeout(() => setShowItemDD(false), 200)} />
            {showItemDD && itemSearch && (
              <div className="absolute z-10 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredItems.map(i => (
                  <button key={i.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between" onClick={() => addItem(i)}>
                    <span>{i.name} <span className="text-muted-foreground">({i.sku})</span></span>
                    <span className="amount-text">₹{i.purchasePrice}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-right px-3 py-2 w-24">Qty</th>
                <th className="text-right px-3 py-2 w-28">Price ₹</th>
                <th className="text-right px-3 py-2">GST%</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="w-10"></th>
              </tr></thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No items. Search and add above.</td></tr>
                ) : lineItems.map((li, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{li.name}</td>
                    <td className="px-3 py-2"><input type="number" min="1" className="w-20 text-right px-2 py-1 rounded border bg-background text-sm amount-text"
                      value={li.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" className="w-24 text-right px-2 py-1 rounded border bg-background text-sm amount-text"
                      value={li.purchasePrice} onChange={e => updateItem(idx, 'purchasePrice', parseFloat(e.target.value) || 0)} /></td>
                    <td className="px-3 py-2 text-right amount-text">{li.gstPercent}%</td>
                    <td className="px-3 py-2 text-right amount-text font-semibold">₹{li.totalAmount.toFixed(2)}</td>
                    <td className="px-3 py-2"><button onClick={() => setLineItems(p => p.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lineItems.length > 0 && (
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total: <span className="amount-text">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                <Save className="w-4 h-4" /> Save Purchase
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
