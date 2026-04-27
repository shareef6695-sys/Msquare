"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  User, 
  ShoppingBag, 
  MapPin,
  LogOut,
  ChevronRight,
  LifeBuoy,
  FileText,
  Bookmark
} from 'lucide-react';
import { loadSession, logout } from "@/services/authStore";
import { Button } from '@/components/ui/Button';
import { requireAdmin } from '@/services/adminService';

const sidebarCollapsedKey = "msquare.ui.customer.sidebarCollapsed.v1";

const customerMenuItems = [
  { icon: <User className="w-5 h-5" />, label: 'Dashboard', href: '/customer/dashboard' },
  { icon: <ShoppingBag className="w-5 h-5" />, label: 'Orders', href: '/customer/orders' },
  { icon: <FileText className="w-5 h-5" />, label: 'Invoices', href: '/customer/invoices' },
  { icon: <Bookmark className="w-5 h-5" />, label: 'Saved merchants', href: '/customer/saved-merchants' },
  { icon: <LifeBuoy className="w-5 h-5" />, label: 'Support', href: '/customer/support' },
  { icon: <MapPin className="w-5 h-5" />, label: 'Addresses', href: '/customer/addresses' },
  { icon: <User className="w-5 h-5" />, label: 'Profile', href: '/customer/profile' },
];

export const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const admin = requireAdmin();
    if (admin.ok) {
      router.replace("/admin/dashboard");
      return;
    }
    const session = loadSession();
    if (!session) {
      router.replace("/customer-login");
      return;
    }
    if (session.user.role === "MERCHANT") {
      router.replace("/merchant/dashboard");
      return;
    }
    setCustomerId(session.user.id);
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const activeLabel = customerMenuItems.find((x) => x.href === pathname)?.label ?? "Customer Portal";

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200/60 flex flex-col z-40 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer Portal</div>
              </div>
            )}
          </Link>
        </div>

        <div className={`${sidebarCollapsed ? "px-3 py-4" : "px-4 py-4"} border-b border-gray-100/60`}>
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} min-w-0`}>
            <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700 font-black shadow-sm shadow-primary-600/10">
              C
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-black text-gray-900 truncate">Customer</div>
                <div className="text-xs font-semibold text-gray-500 truncate">{customerId ?? "—"}</div>
              </div>
            )}
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? "px-3 py-4" : "px-4 py-4"} space-y-1`}>
          {customerMenuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`relative flex items-center rounded-2xl text-sm font-semibold transition-all ${
                pathname === item.href
                  ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${sidebarCollapsed ? "justify-center px-3 py-3" : "justify-between px-4 py-3"}`}
            >
              <div className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                {item.icon}
                {!sidebarCollapsed && item.label}
              </div>
              {!sidebarCollapsed && <ChevronRight className="w-4 h-4" />}
            </Link>
          ))}

          {!sidebarCollapsed && (
            <div className="pt-5">
              <div className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-600 p-5 text-white shadow-lg shadow-primary-600/20">
                <div className="text-sm font-black">Need help?</div>
                <div className="text-xs text-primary-100 mt-1">Support team available 24/7.</div>
                <Link
                  href="/customer/support"
                  className="mt-4 block w-full rounded-2xl bg-white px-4 py-2.5 text-center text-sm font-black text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  Contact support
                </Link>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100/60">
          <button
            className={`flex items-center w-full text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors ${
              sidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
            }`}
            onClick={() => {
              logout();
              router.replace("/customer-login");
            }}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
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
              <div className="text-xs font-semibold text-gray-500 truncate">Marketplace account</div>
            </div>
            <div className="hidden md:block flex-1" />
            <div className="hidden md:block max-w-md w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, invoices..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700 font-black shadow-sm shadow-primary-600/10">
              C
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="container-max">{children}</div>
        </main>
      </div>
    </div>
  );
};
