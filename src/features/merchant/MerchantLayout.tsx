"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard,
  FileText,
  FileSearch,
  LogOut,
  Search,
  Settings,
  Boxes,
  ClipboardList,
  Building2,
  Calculator,
  Receipt,
  Warehouse,
  BarChart3
} from 'lucide-react';
import { loadSession, logout } from "@/services/authStore";
import { Button } from '@/components/ui/Button';
import { requireAdmin } from '@/services/adminService';

const sidebarCollapsedKey = "msquare.ui.merchant.sidebarCollapsed.v1";

const menuItems = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/merchant/dashboard' },
  { icon: <Package className="w-5 h-5" />, label: 'Products', href: '/merchant/products' },
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'Orders', href: '/merchant/orders' },
  { icon: <Users className="w-5 h-5" />, label: 'Customers', href: '/merchant/customers' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', href: '/merchant/payments' },
  { icon: <FileSearch className="w-5 h-5" />, label: 'LC Requests', href: '/merchant/lc-requests' },
  { icon: <FileText className="w-5 h-5" />, label: 'Trade Finance', href: '/merchant/trade-finance' },
  { icon: <Users className="w-5 h-5" />, label: 'Team', href: '/merchant/team' },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/merchant/settings' },
];

const opsItems = [
  { icon: <Boxes className="w-5 h-5" />, label: 'Inventory', href: '/merchant/operations?tab=inventory' },
  { icon: <ClipboardList className="w-5 h-5" />, label: 'Purchases', href: '/merchant/operations?tab=purchases' },
  { icon: <Building2 className="w-5 h-5" />, label: 'Suppliers', href: '/merchant/operations?tab=suppliers' },
  { icon: <Calculator className="w-5 h-5" />, label: 'Finance', href: '/merchant/operations?tab=finance' },
  { icon: <Receipt className="w-5 h-5" />, label: 'Invoices', href: '/merchant/operations?tab=invoices' },
  { icon: <Warehouse className="w-5 h-5" />, label: 'Warehouse', href: '/merchant/operations?tab=warehouse' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Reports', href: '/merchant/operations?tab=reports' },
];

export const MerchantLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [opsTab, setOpsTab] = useState('inventory');
  const [merchantId, setMerchantId] = useState<string | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
    if (pathname === '/merchant/operations' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) setOpsTab(tab);
    }
  }, [pathname]);

  useEffect(() => {
    const admin = requireAdmin();
    if (admin.ok) {
      router.replace("/admin/dashboard");
      return;
    }
    const session = loadSession();
    if (!session) {
      router.replace("/merchant-login");
      return;
    }
    if (session.user.role === "CUSTOMER") {
      router.replace("/customer/dashboard");
      return;
    }
    setMerchantId(session.user.merchantParentId ?? session.user.id);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(sidebarCollapsedKey);
    if (!raw) return;
    setSidebarCollapsed(raw === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(sidebarCollapsedKey, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const activeLabel =
    menuItems.find((x) => x.href === pathname)?.label ??
    (pathname === "/merchant/operations" ? "Operations" : null) ??
    "Merchant Portal";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200/60 flex flex-col z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? "lg:w-[84px]" : "lg:w-72"}`}
      >
        <div className={`bg-gradient-to-b from-primary-50/70 to-white border-b border-gray-100/60 ${sidebarCollapsed ? "p-4" : "p-6"}`}>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-2xl flex items-center justify-center shadow-sm shadow-primary-600/20">
              <span className="text-white font-black">M</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="text-lg font-black tracking-tight text-gray-900">MSquare</div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Merchant Portal</div>
              </div>
            )}
          </Link>
        </div>

        <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? "px-3 py-4" : "px-4 py-4"} space-y-1`}>
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`relative flex items-center rounded-2xl text-sm font-semibold transition-all ${
                pathname === item.href 
                  ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              } ${sidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"}`}
            >
              {pathname === item.href && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary-600" />
              )}
              {item.icon}
              {!sidebarCollapsed && item.label}
            </Link>
          ))}

          <div className="pt-5">
            {!sidebarCollapsed ? (
              <div className="px-4 pb-2 text-[11px] font-black uppercase tracking-widest text-gray-400">Business Operations</div>
            ) : (
              <div className="sr-only">Business Operations</div>
            )}
            <div className="space-y-1">
              {opsItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className={`relative flex items-center rounded-2xl text-sm font-semibold transition-all ${
                    pathname === '/merchant/operations' && item.href.includes(`tab=${opsTab}`)
                      ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  } ${sidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"}`}
                >
                  {pathname === '/merchant/operations' && item.href.includes(`tab=${opsTab}`) && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary-600" />
                  )}
                  {item.icon}
                  {!sidebarCollapsed && item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100/60">
          <button
            className={`flex items-center w-full text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors ${
              sidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
            }`}
            onClick={() => {
              logout();
              router.replace("/merchant-login");
            }}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-gray-200/60 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              className="lg:hidden p-2 rounded-xl border border-gray-200/60 text-gray-700 hover:bg-gray-50"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              className="hidden lg:inline-flex p-2 rounded-xl border border-gray-200/60 text-gray-700 hover:bg-gray-50"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <div className="text-sm font-black text-gray-900 truncate">{activeLabel}</div>
              <div className="text-xs font-semibold text-gray-500 truncate">Welcome back</div>
            </div>
            <div className="hidden md:block flex-1" />
            <div className="hidden md:block max-w-md w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search orders, products..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-black text-gray-900">Merchant</p>
                <p className="text-xs text-gray-500">{merchantId ?? "—"}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700 font-black shadow-sm shadow-primary-600/10">
                M
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
