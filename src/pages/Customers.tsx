import { useState, useEffect } from 'react';
import type { Customer } from '@/types';
import { Plus, Search, Edit2, Trash2, Users, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { customerSchema, isValidGstNumber, isValidPhone, isValidEmail } from '@/lib/validation';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', gstNumber: '', address: '', email: '', isWalkIn: false });
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    if (window.api) {
      try {
        const data = await window.api.getCustomers();
        setCustomers(data.map((c: any) => ({
          ...c,
          createdAt: new Date(c.created_at),
          isWalkIn: c.is_walk_in === 1,
          gstNumber: c.gst_number || '',
          stateCode: c.state_code || '',
        })));
      } catch (err) {
        toast.error('Failed to load customers');
        console.error(err);
      }
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) || 
    c.gstNumber.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const validation = customerSchema.safeParse(form);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return toast.error(firstError.message);
    }
    const validatedData = validation.data;
    if (form.gstNumber && !isValidGstNumber(form.gstNumber)) {
      return toast.error('Invalid GST number format');
    }
    if (form.phone && !isValidPhone(form.phone)) {
      return toast.error('Invalid phone number format (10 digits starting with 6-9)');
    }
    if (form.email && !isValidEmail(form.email)) {
      return toast.error('Invalid email format');
    }

    try {
      const customerData = {
        name: validatedData.name,
        phone: form.phone,
        gstNumber: form.gstNumber.toUpperCase(),
        address: validatedData.address,
        email: form.email.toLowerCase(),
        isWalkIn: form.isWalkIn,
        stateCode: form.gstNumber ? form.gstNumber.substring(0, 2) : '',
      };

      if (editCustomer?.id && window.api) {
        await window.api.updateCustomer({ ...customerData, id: editCustomer.id });
        toast.success('Customer updated');
      } else if (window.api) {
        await window.api.addCustomer(customerData);
        toast.success('Customer added');
      }

      setShowForm(false);
      setEditCustomer(null);
      setForm({ name: '', phone: '', gstNumber: '', address: '', email: '', isWalkIn: false });
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer');
      console.error(err);
    }
  };

  const handleEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({ 
      name: c.name, 
      phone: c.phone, 
      gstNumber: c.gstNumber, 
      address: c.address, 
      email: c.email, 
      isWalkIn: c.isWalkIn 
    });
    setShowForm(true);
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    try {
      if (window.api && c.id) {
        await window.api.deleteCustomer(c.id);
        toast.success('Customer deleted');
        loadCustomers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer');
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
        </div>
        <button onClick={() => { 
          setEditCustomer(null); 
          setForm({ name: '', phone: '', gstNumber: '', address: '', email: '', isWalkIn: false }); 
          setShowForm(true); 
        }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 text-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="relative mb-5">
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
                <h3 className="font-semibold truncate flex-1 mr-2">{c.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {c.phone && <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
              {c.address && <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1 line-clamp-2"><MapPin className="w-3 h-3 shrink-0" /> {c.address}</p>}
              {c.gstNumber && <p className="text-xs font-mono mt-2 text-muted-foreground break-all">GST: {c.gstNumber}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-t-xl sm:rounded-xl shadow-xl border w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="input-label">Name *</label>
                <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="input-label">GST Number</label>
                <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Address</label>
                <textarea className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 py-4 border-t sticky bottom-0 bg-card">
              <button onClick={() => setShowForm(false)} className="w-full sm:w-auto px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleSave} className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">{editCustomer ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
