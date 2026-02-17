import { useState, useEffect } from 'react';
import { getSettings, db } from '@/db/database';
import type { AppSettings } from '@/types';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => { getSettings().then(setSettings); }, []);

  const set = (k: string, v: any) => setSettings(prev => prev ? { ...prev, [k]: v } : prev);

  const handleSave = async () => {
    if (!settings?.id) return;
    await db.settings.update(settings.id, {
      businessName: settings.businessName,
      businessAddress: settings.businessAddress,
      businessPhone: settings.businessPhone,
      businessGst: settings.businessGst,
      businessEmail: settings.businessEmail,
      stateCode: settings.stateCode,
      invoicePrefix: settings.invoicePrefix,
    });
    toast.success('Settings saved!');
  };

  if (!settings) return <p className="p-6">Loading...</p>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="page-title">Business Settings</h1>
      </div>

      <div className="bg-card rounded-xl border p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Business Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="input-label">Business Name</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={settings.businessName} onChange={e => set('businessName', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="input-label">Address</label>
            <textarea className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={settings.businessAddress} onChange={e => set('businessAddress', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Phone</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={settings.businessPhone} onChange={e => set('businessPhone', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={settings.businessEmail} onChange={e => set('businessEmail', e.target.value)} />
          </div>
          <div>
            <label className="input-label">GSTIN</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono" value={settings.businessGst} onChange={e => set('businessGst', e.target.value)} />
          </div>
          <div>
            <label className="input-label">State Code</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={settings.stateCode} onChange={e => set('stateCode', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Invoice Prefix</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={settings.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Current Invoice #</label>
            <input className="w-full px-3 py-2.5 rounded-lg border bg-muted text-sm amount-text" value={settings.currentInvoiceNumber} readOnly />
          </div>
        </div>
        <div className="mt-6">
          <button onClick={handleSave} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
