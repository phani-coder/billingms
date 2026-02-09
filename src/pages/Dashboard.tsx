import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from '@/db/database';
import {
  Package, FileText, Users, AlertTriangle,
  TrendingUp, IndianRupee, ShoppingCart, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function Dashboard() {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const items = useLiveQuery(() => db.items.filter(i => i.isActive).toArray()) ?? [];
  const customers = useLiveQuery(() => db.customers.count()) ?? 0;
  const lowStockItems = items.filter(i => i.currentStock <= i.minStockLevel);

  const todayInvoices = useLiveQuery(() =>
    db.invoices
      .where('invoiceDate')
      .between(todayStart, todayEnd, true, true)
      .and(inv => inv.status === 'completed')
      .toArray()
  ) ?? [];

  const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const allInvoices = useLiveQuery(() => db.invoices.where('status').equals('completed').count()) ?? 0;
  const recentInvoices = useLiveQuery(() =>
    db.invoices.orderBy('createdAt').reverse().limit(5).toArray()
  ) ?? [];

  const stats = [
    {
      label: "Today's Sales",
      value: `₹${todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: 'text-success',
      bg: 'bg-success/10',
      link: '/reports',
    },
    {
      label: "Today's Invoices",
      value: todayInvoices.length,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
      link: '/billing',
    },
    {
      label: 'Total Items',
      value: items.length,
      icon: Package,
      color: 'text-accent',
      bg: 'bg-accent/10',
      link: '/inventory',
    },
    {
      label: 'Low Stock Alerts',
      value: lowStockItems.length,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      link: '/inventory',
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Link
          to="/billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          <FileText className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} to={s.link} className="stat-card group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold amount-text">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Invoices</h2>
            <Link to="/billing" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet. Create your first invoice!</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold amount-text">₹{inv.grandTotal.toLocaleString('en-IN')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === 'completed' ? 'bg-success/10 text-success' :
                      inv.status === 'draft' ? 'bg-accent/10 text-accent' :
                      'bg-destructive/10 text-destructive'
                    }`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Low Stock Alerts</h2>
            <Link to="/inventory" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">All items are well-stocked 👍</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.brand} • {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive amount-text">{item.currentStock} {item.unit}</p>
                    <p className="text-xs text-muted-foreground">Min: {item.minStockLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
