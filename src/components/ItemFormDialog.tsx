import { useState } from 'react';
import type { InventoryItem } from '@/types';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryItemSchema, sanitizeInput } from '@/lib/validation';

const defaultItem: Omit<InventoryItem, 'id'> = {
  name: '', sku: '', category: '', brand: '', specification: '',
  purchasePrice: 0, sellingPrice: 0, gstPercent: 18, currentStock: 0,
  minStockLevel: 5, unit: 'pcs', hsnCode: '', isActive: true,
  createdAt: new Date(), updatedAt: new Date(),
};

const categories = [
  'Wires & Cables', 'Switches & Sockets', 'MCBs & Distribution',
  'Fans & Motors', 'Lighting', 'Conduits & Accessories', 'Tools',
  'Meters & Instruments', 'Transformers', 'Other'
];

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
}

export default function ItemFormDialog({ item, onClose }: Props) {
  const [form, setForm] = useState(item ? { ...item } : { ...defaultItem });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
  const validation = inventoryItemSchema.safeParse({
  name: form.name,
  sku: form.sku,
  category: form.category,
  brand: form.brand,
  specification: form.specification,
  purchasePrice: form.purchasePrice,
  sellingPrice: form.sellingPrice,
  gstPercent: form.gstPercent,
  currentStock: form.currentStock,
  minStockLevel: form.minStockLevel,
  unit: form.unit,
  hsnCode: form.hsnCode,
  });

   if (!validation.success) {
   const firstError = validation.error.errors[0];
   return toast.error(firstError.message);
   }

   try {
	const payload = {
	name: form.name,
	sku: form.sku,
	category: form.category,
	brand: form.brand,
	specification: form.specification,
	unit: form.unit,
	purchasePrice: form.purchasePrice,
	sellingPrice: form.sellingPrice,
	gstPercent: form.gstPercent,
	currentStock: form.currentStock,
	minStockLevel: form.minStockLevel,
	};
     if (item?.id) {
  	await window.api.updateItem({ ...payload, id: item.id });
  	toast.success("Item updated");
	} else {
  	await window.api.addItem(payload);
  	toast.success("Item added");
	}
	onClose();

  } catch (err) {
toast.error("Failed to save item");
}
};

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="input-label">Item Name *</label>
            <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="input-label">SKU / Item Code *</label>
            <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.sku} onChange={e => set('sku', e.target.value)} />
          </div>
          <div>
            <label className="input-label">HSN Code</label>
            <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.hsnCode} onChange={e => set('hsnCode', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Category</label>
            <select className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Brand</label>
            <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.brand} onChange={e => set('brand', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Specification (Wattage, Size)</label>
            <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.specification} onChange={e => set('specification', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Unit</label>
            <select className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {['pcs', 'mtr', 'kg', 'box', 'roll', 'set', 'pair', 'bundle'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Purchase Price (₹) *</label>
            <input type="number" min="0" step="0.01" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring amount-text" value={form.purchasePrice} onChange={e => set('purchasePrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="input-label">Selling Price (₹) *</label>
            <input type="number" min="0" step="0.01" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring amount-text" value={form.sellingPrice} onChange={e => set('sellingPrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="input-label">GST %</label>
            <select className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.gstPercent} onChange={e => set('gstPercent', parseFloat(e.target.value))}>
              {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Current Stock</label>
            <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring amount-text" value={form.currentStock} onChange={e => set('currentStock', parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="input-label">Min Stock Alert Level</label>
            <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring amount-text" value={form.minStockLevel} onChange={e => set('minStockLevel', parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">{item ? 'Update' : 'Add Item'}</button>
        </div>
      </div>
    </div>
  );
}
