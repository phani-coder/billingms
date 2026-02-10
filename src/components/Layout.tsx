import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FileText, ShoppingCart, Users,
  BarChart3, Database, Settings, Menu, X, Zap, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/billing', label: 'Billing', icon: FileText },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/backup', label: 'Backup', icon: Database },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar-gradient flex flex-col transition-all duration-300 no-print z-50',
          isMobile
            ? cn('fixed inset-y-0 left-0 w-64', sidebarOpen ? 'translate-x-0' : '-translate-x-full')
            : collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
            <Zap className="w-5 h-5 text-accent-foreground" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="overflow-hidden flex-1">
              <h1 className="text-sm font-bold text-sidebar-foreground truncate">ElectroBill</h1>
              <p className="text-[10px] text-sidebar-muted">Billing & Inventory</p>
            </div>
          )}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-sidebar-muted hover:text-sidebar-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!collapsed || isMobile) && <span>{label}</span>}
                {(!collapsed || isMobile) && active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background border-b">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent">
                <Zap className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
              <span className="text-sm font-bold">ElectroBill</span>
            </div>
          </div>
        )}
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
