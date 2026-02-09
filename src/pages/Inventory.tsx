import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import ItemFormDialog from '@/components/ItemFormDialog';

export default function Inventory() {
const [search, setSearch] = useState('');
const [showForm, setShowForm] = useState(false);
const [editItem, setEditItem] = useState<InventoryItem | null>(null);
const [filterCategory, setFilterCategory] = useState('all');
const [items, setItems] = useState<any[]>([]);

useEffect(() => {
loadItems();
}, []);

const loadItems = async () => {
const data = await window.api.getItems();
setItems(data || []);
};

const categories = [...new Set(items.map(i => i.category))].sort();

const filtered = items.filter(i => {
const matchSearch =
!search ||
(i.name && i.name.toLowerCase().includes(search.toLowerCase())) ||
(i.sku && i.sku.toLowerCase().includes(search.toLowerCase()));
const matchCat =
  filterCategory === 'all' || i.category === filterCategory;

return matchSearch && matchCat;
});

const handleDelete = async (item: any) => {
const confirmDelete = confirm(`Delete "${item.name}"? This action cannot be undone.`);
if (!confirmDelete) return;
await window.api.deleteItem(item.id);
await loadItems();
toast.success('Item deleted');
};

return (
<div className="animate-fade-in">
<div className="page-header">
<div>
<h1 className="page-title">Inventory</h1>
<p className="text-sm text-muted-foreground">
{items.length} items in stock
</p>
</div>
<button
onClick={() => { setEditItem(null); setShowForm(true); }}
className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm"
>
<Plus className="w-4 h-4" /> Add Item
</button>
</div>
  {filtered.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Package className="w-12 h-12 mb-3 opacity-40" />
      <p className="font-medium">No items found</p>
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
              <th className="text-right px-4 py-3 font-semibold">Price</th>
              <th className="text-right px-4 py-3 font-semibold">Stock</th>
              <th className="text-center px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.sku}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3 text-right">₹{item.price}</td>
                <td className="px-4 py-3 text-right">{item.stock}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
      onClose={() => {
        setShowForm(false);
        setEditItem(null);
        loadItems();
      }}
    />
  )}
</div>
);
}