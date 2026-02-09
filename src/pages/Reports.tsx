import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { BarChart3, TrendingUp, Package, AlertTriangle, IndianRupee } from 'lucide-react';

type ReportType = 'daily' | 'monthly' | 'stock' | 'lowStock' | 'profit';

export default function Reports() {
  const [report, setReport] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const allInvoices = useLiveQuery(() => db.invoices.where('status').equals('completed').toArray()) ?? [];
  const items = useLiveQuery(() => db.items.filter(i => i.isActive).toArray()) ?? [];

  const tabs: { key: ReportType; label: string; icon: any }[] = [
    { key: 'daily', label: 'Daily Sales', icon: BarChart3 },
    { key: 'monthly', label: 'Monthly Sales', icon: TrendingUp },
    { key: 'stock', label: 'Stock Summary', icon: Package },
    { key: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
    { key: 'profit', label: 'Profit Report', icon: IndianRupee },
  ];

  const dailyInvoices = useMemo(() => {
    const d = new Date(selectedDate);
    return allInvoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= startOfDay(d) && invDate <= endOfDay(d);
    });
  }, [allInvoices, selectedDate]);

  const monthlyInvoices = useMemo(() => {
    const d = new Date(selectedDate);
    return allInvoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      return invDate >= startOfMonth(d) && invDate <= endOfMonth(d);
    });
  }, [allInvoices, selectedDate]);

  const lowStockItems = items.filter(i => i.currentStock <= i.minStockLevel);

  const profitData = useMemo(() => {
    // Calculate profit from all invoices
    let totalRevenue = 0;
    let totalCost = 0;
    const inv = report === 'profit' ? allInvoices : [];
    for (const invoice of inv) {
      for (const item of invoice.items) {
        const dbItem = items.find(i => i.id === item.itemId);
        totalRevenue += item.taxableAmount;
        totalCost += (dbItem?.purchasePrice ?? 0) * item.quantity;
      }
    }
    return { totalRevenue, totalCost, profit: totalRevenue - totalCost };
  }, [allInvoices, items, report]);

  const renderTotal = (invoices: typeof allInvoices) => {
    const total = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const tax = invoices.reduce((s, i) => s + i.totalCgst + i.totalSgst + i.totalIgst, 0);
    return { total, tax, count: invoices.length };
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setReport(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              report === t.key ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {(report === 'daily' || report === 'monthly') && (
        <div className="mb-4">
          <input type="date" className="px-3 py-2 rounded-lg border bg-background text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
      )}

      {report === 'daily' && (() => {
        const { total, tax, count } = renderTotal(dailyInvoices);
        return (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="stat-card"><p className="text-2xl font-bold amount-text">₹{total.toLocaleString('en-IN')}</p><p className="text-sm text-muted-foreground">Total Sales</p></div>
              <div className="stat-card"><p className="text-2xl font-bold amount-text">{count}</p><p className="text-sm text-muted-foreground">Invoices</p></div>
              <div className="stat-card"><p className="text-2xl font-bold amount-text">₹{tax.toFixed(2)}</p><p className="text-sm text-muted-foreground">Total Tax</p></div>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3">Invoice #</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-right px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Payment</th>
                </tr></thead>
                <tbody>
                  {dailyInvoices.map(inv => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">{inv.customerName}</td>
                      <td className="px-4 py-3 text-right">{inv.items.length}</td>
                      <td className="px-4 py-3 text-right amount-text font-semibold">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 uppercase text-xs">{inv.paymentMode}</td>
                    </tr>
                  ))}
                  {dailyInvoices.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No sales on this date</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {report === 'monthly' && (() => {
        const { total, tax, count } = renderTotal(monthlyInvoices);
        return (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sales for {format(new Date(selectedDate), 'MMMM yyyy')}</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="stat-card"><p className="text-2xl font-bold amount-text">₹{total.toLocaleString('en-IN')}</p><p className="text-sm text-muted-foreground">Total Sales</p></div>
              <div className="stat-card"><p className="text-2xl font-bold amount-text">{count}</p><p className="text-sm text-muted-foreground">Invoices</p></div>
              <div className="stat-card"><p className="text-2xl font-bold amount-text">₹{tax.toFixed(2)}</p><p className="text-sm text-muted-foreground">Total Tax</p></div>
            </div>
          </div>
        );
      })()}

      {report === 'stock' && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-right px-4 py-3">Value (₹)</th>
            </tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{i.sku}</td>
                  <td className="px-4 py-3">{i.category}</td>
                  <td className={`px-4 py-3 text-right amount-text ${i.currentStock <= i.minStockLevel ? 'text-destructive font-bold' : ''}`}>{i.currentStock} {i.unit}</td>
                  <td className="px-4 py-3 text-right amount-text">₹{(i.currentStock * i.purchasePrice).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-bold">
                <td colSpan={3} className="px-4 py-3">Total Stock Value</td>
                <td className="px-4 py-3 text-right amount-text">{items.reduce((s, i) => s + i.currentStock, 0)}</td>
                <td className="px-4 py-3 text-right amount-text">₹{items.reduce((s, i) => s + i.currentStock * i.purchasePrice, 0).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {report === 'lowStock' && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Brand</th>
              <th className="text-right px-4 py-3">Current</th>
              <th className="text-right px-4 py-3">Minimum</th>
              <th className="text-right px-4 py-3">Deficit</th>
            </tr></thead>
            <tbody>
              {lowStockItems.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">All items well-stocked!</td></tr>
              ) : lowStockItems.map(i => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3">{i.brand}</td>
                  <td className="px-4 py-3 text-right amount-text text-destructive font-bold">{i.currentStock}</td>
                  <td className="px-4 py-3 text-right amount-text">{i.minStockLevel}</td>
                  <td className="px-4 py-3 text-right amount-text text-destructive">{i.minStockLevel - i.currentStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report === 'profit' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-2xl font-bold amount-text">₹{profitData.totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <div className="stat-card">
            <p className="text-2xl font-bold amount-text">₹{profitData.totalCost.toLocaleString('en-IN')}</p>
            <p className="text-sm text-muted-foreground">Total Cost</p>
          </div>
          <div className="stat-card">
            <p className={`text-2xl font-bold amount-text ${profitData.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              ₹{profitData.profit.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-muted-foreground">Gross Profit</p>
          </div>
        </div>
      )}
    </div>
  );
}
