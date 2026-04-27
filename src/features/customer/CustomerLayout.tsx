"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from "clsx";
import { 
  Bell,
  ChevronLeft,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { loadSession, logout } from "@/services/authStore";
import { requireAdmin } from '@/services/adminService';

const customerMenuItems = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/customer/dashboard" },
  { icon: <ShoppingBag className="w-5 h-5" />, label: "Orders", href: "/customer/orders" },
  { icon: <Truck className="w-5 h-5" />, label: "Tracking", href: "/customer/dashboard#tracking" },
  { icon: <FileText className="w-5 h-5" />, label: "RFQs", href: "/customer/dashboard#rfqs" },
  { icon: <CreditCard className="w-5 h-5" />, label: "Payments", href: "/customer/dashboard#payments" },
  { icon: <Bell className="w-5 h-5" />, label: "Notifications", href: "/customer/notifications" },
];

export const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("Customer");
  const [profileOrg, setProfileOrg] = useState<string>("Customer Portal");

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
      router.replace("/customer-login");
      return;
    }
    if (session.user.role === "MERCHANT") {
      router.replace("/merchant/dashboard");
      return;
    }
    setCustomerId(session.user.id);
    setProfileName(session.user.name ?? session.user.email ?? "Customer");
    setProfileOrg("Customer Portal");
  }, [router]);

  const activeLabel = (() => {
    const direct = customerMenuItems.find((x) => x.href === pathname);
    if (direct) return direct.label;
    if (pathname.startsWith("/customer/orders")) return "Orders";
    if (pathname.startsWith("/customer/notifications")) return "Notifications";
    if (pathname.startsWith("/customer/dashboard")) return "Dashboard";
    return "Customer";
  })();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer Portal</div>
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
          {customerMenuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={clsx(
                "relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors",
                sidebarCollapsed && "lg:justify-center lg:px-3",
                pathname === item.href ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              {pathname === item.href && (
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
              router.replace("/customer-login");
            }}
          >
            <LogOut className="w-5 h-5" />
            <span className={clsx("truncate", sidebarCollapsed && "lg:hidden")}>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
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
              <div className="text-[11px] font-semibold text-gray-500 truncate">{customerId ?? "—"}</div>
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
                {String(profileName || "C")
                  .trim()
                  .split(" ")
                  .slice(0, 2)
                  .map((x) => x.slice(0, 1).toUpperCase())
                  .join("")}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
