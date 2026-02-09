import { useState } from 'react';
import { exportDatabase, importDatabase, getSettings, db } from '@/db/database';
import { Download, Upload, Database, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Backup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `electrobill-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const settings = await getSettings();
      await db.settings.update(settings.id!, { lastBackup: new Date() });

      toast.success('Backup downloaded successfully!');
    } catch (e) {
      toast.error('Backup failed');
    }
    setIsExporting(false);
  };

  const handleImport = () => {
    if (!confirm('⚠️ This will REPLACE all current data with the backup. Are you sure?')) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
        const text = await file.text();
        await importDatabase(text);
        toast.success('Data restored successfully!');
        window.location.reload();
      } catch (err) {
        toast.error('Restore failed. Invalid backup file.');
      }
      setIsImporting(false);
    };
    input.click();
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Backup & Restore</h1>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border p-6 card-hover">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Create Backup</h3>
              <p className="text-sm text-muted-foreground mb-4">Export all data to a JSON file. Includes inventory, invoices, customers, suppliers, and all transaction history.</p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Download Backup'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 card-hover">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Restore from Backup</h3>
              <p className="text-sm text-muted-foreground mb-2">⚠️ This will replace ALL current data. Make sure to backup first.</p>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-accent text-accent text-sm font-semibold hover:bg-accent/10 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Restoring...' : 'Restore from File'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Backup Tips</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Take daily backups to prevent data loss</li>
            <li>• Store backups on a separate USB drive or cloud storage</li>
            <li>• Test restore periodically to verify backup integrity</li>
            <li>• All data is stored locally in your browser's IndexedDB</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
