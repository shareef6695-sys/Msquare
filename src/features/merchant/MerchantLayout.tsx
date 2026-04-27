"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from "clsx";
import { 
  BarChart3,
  Boxes,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  ShoppingCart,
  LogOut,
  Search,
} from 'lucide-react';
import { loadSession, logout } from "@/services/authStore";
import { requireAdmin } from '@/services/adminService';

const menuItems = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/merchant/dashboard' },
  { icon: <Package className="w-5 h-5" />, label: 'Products', href: '/merchant/products' },
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'Orders', href: '/merchant/orders' },
  { icon: <Boxes className="w-5 h-5" />, label: 'Inventory', href: '/merchant/operations?tab=inventory' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '/merchant/dashboard#analytics' },
  { icon: <MessageSquare className="w-5 h-5" />, label: 'Messages', href: '/merchant/dashboard#messages' },
];

export const MerchantLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("Merchant");
  const [profileOrg, setProfileOrg] = useState<string>("Merchant Portal");

  useEffect(() => {
    setSidebarOpen(false);
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
    setProfileName(session.user.name ?? session.user.email ?? "Merchant");
    setProfileOrg("Merchant Portal");
  }, [router]);

  const activeLabel = (() => {
    const direct = menuItems.find((x) => x.href === pathname);
    if (direct) return direct.label;
    if (pathname.startsWith("/merchant/products")) return "Products";
    if (pathname.startsWith("/merchant/orders")) return "Orders";
    if (pathname.startsWith("/merchant/operations")) return "Inventory";
    if (pathname.startsWith("/merchant/dashboard")) return "Dashboard";
    return "Merchant";
  })();

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
        className={clsx(
          "fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200/60 flex flex-col z-40 transform transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64",
        )}
      >
        <div className="px-4 py-4 border-b border-gray-100/60 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-primary-600 rounded-2xl flex items-center justify-center shadow-sm shadow-primary-600/20">
              <span className="text-white font-black">M</span>
            </div>
            <div className={clsx("min-w-0", sidebarCollapsed && "lg:hidden")}>
              <div className="text-lg font-black tracking-tight text-gray-900">MSquare</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Merchant Portal</div>
            </div>
          </Link>
          <button
            type="button"
            className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200/60 text-gray-700 hover:bg-gray-50"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <ChevronLeft className={clsx("w-4 h-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
        </div>

        <nav className={clsx("flex-1 px-3 py-4 space-y-1 overflow-y-auto", sidebarCollapsed ? "lg:px-2" : "lg:px-4")}>
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={clsx(
                "relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors",
                sidebarCollapsed && "lg:justify-center lg:px-3",
                pathname === item.href || (item.href.includes("/merchant/operations") && pathname.startsWith("/merchant/operations"))
                  ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              {(pathname === item.href ||
                (item.href.includes("/merchant/operations") && pathname.startsWith("/merchant/operations"))) && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary-600" />
              )}
              {item.icon}
              <span className={clsx("truncate", sidebarCollapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100/60">
          <button
            className="flex items-center gap-3 px-4 py-3 w-full text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors"
            onClick={() => {
              logout();
              router.replace("/merchant-login");
            }}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/90 backdrop-blur border-b border-gray-200/60 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="lg:hidden p-2 rounded-xl border border-gray-200/60 text-gray-700 hover:bg-gray-50"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-sm font-black text-gray-900 truncate">{activeLabel}</div>
              <div className="text-[11px] font-semibold text-gray-500 truncate">{merchantId ?? "—"}</div>
            </div>
            <div className="max-w-md w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search orders, products…" 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-900 truncate">{profileName}</p>
                <p className="text-xs text-gray-500 truncate">{profileOrg}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-white shadow-sm">
                {String(profileName || "M")
                  .trim()
                  .split(" ")
                  .slice(0, 2)
                  .map((x) => x.slice(0, 1).toUpperCase())
                  .join("")}
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
