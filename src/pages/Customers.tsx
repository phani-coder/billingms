import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Customer } from '@/types';
import { Plus, Search, Edit2, Trash2, Users, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', gstNumber: '', address: '', email: '', isWalkIn: false });

  const customers = useLiveQuery(() => db.customers.toArray()) ?? [];
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.gstNumber.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (editCustomer?.id) {
      await db.customers.update(editCustomer.id, { ...form });
      toast.success('Customer updated');
    } else {
      await db.customers.add({ ...form, createdAt: new Date() } as Customer);
      toast.success('Customer added');
    }
    setShowForm(false);
    setEditCustomer(null);
    setForm({ name: '', phone: '', gstNumber: '', address: '', email: '', isWalkIn: false });
  };

  const handleEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone, gstNumber: c.gstNumber, address: c.address, email: c.email, isWalkIn: c.isWalkIn });
    setShowForm(true);
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    await db.customers.delete(c.id!);
    toast.success('Customer deleted');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
        </div>
        <button onClick={() => { setEditCustomer(null); setForm({ name: '', phone: '', gstNumber: '', address: '', email: '', isWalkIn: false }); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 text-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search by name, phone, GST..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-card rounded-xl border p-4 card-hover">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{c.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {c.phone && <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
              {c.address && <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><MapPin className="w-3 h-3" /> {c.address}</p>}
              {c.gstNumber && <p className="text-xs font-mono mt-2 text-muted-foreground">GST: {c.gstNumber}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-xl border w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="input-label">Name *</label>
                <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="input-label">GST Number</label>
                <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Address</label>
                <textarea className="w-full px-3 py-2 rounded-lg border bg-background text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">{editCustomer ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
