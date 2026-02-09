import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { InventoryItem } from '@/types';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import ItemFormDialog from '@/components/ItemFormDialog';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const items = useLiveQuery(() => db.items.filter(i => i.isActive).toArray()) ?? [];
  const categories = [...new Set(items.map(i => i.category))].sort();

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.brand.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || i.category === filterCategory;
    return matchSearch && matchCat;
  });

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;
    await db.items.update(item.id!, { isActive: false, updatedAt: new Date() });
    toast.success('Item deleted');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} items in stock</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, SKU, brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">No items found</p>
          <p className="text-sm mt-1">Add your first inventory item to get started</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold">Item</th>
                  <th className="text-left px-4 py-3 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Purchase ₹</th>
                  <th className="text-right px-4 py-3 font-semibold">Selling ₹</th>
                  <th className="text-right px-4 py-3 font-semibold">GST %</th>
                  <th className="text-right px-4 py-3 font-semibold">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.brand} {item.specification && `• ${item.specification}`}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3 text-right amount-text">₹{item.purchasePrice.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right amount-text">₹{item.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right amount-text">{item.gstPercent}%</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 amount-text font-semibold ${
                        item.currentStock <= item.minStockLevel ? 'text-destructive' : 'text-foreground'
                      }`}>
                        {item.currentStock <= item.minStockLevel && <AlertTriangle className="w-3 h-3" />}
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditItem(item); setShowForm(true); }}
                          className="p-2 rounded-md hover:bg-muted transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ItemFormDialog
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
