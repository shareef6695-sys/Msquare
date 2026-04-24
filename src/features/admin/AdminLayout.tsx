"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

const menuItems = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/admin/dashboard" },
  { icon: <Users className="w-5 h-5" />, label: "All merchants", href: "/admin/merchants" },
  { icon: <BadgeCheck className="w-5 h-5" />, label: "All orders", href: "/admin/orders" },
  { icon: <Banknote className="w-5 h-5" />, label: "Payments", href: "/admin/payments" },
  { icon: <Gavel className="w-5 h-5" />, label: "Disputes", href: "/admin/disputes" },
  { icon: <FileText className="w-5 h-5" />, label: "LC transactions", href: "/admin/lc-transactions" },
] as const;

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 lg:w-64 bg-white border-r border-gray-200/60 flex flex-col z-40 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 bg-gradient-to-b from-gray-950 to-gray-900 border-b border-gray-100/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/10 rounded-2xl flex items-center justify-center">
              <span className="text-white font-black">M</span>
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white">MSquare</div>
              <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Admin</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                pathname === item.href
                  ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {pathname === item.href && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-primary-600" />
              )}
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100/60">
          <button className="flex items-center gap-3 px-4 py-3 w-full text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors">
            <LogOut className="w-5 h-5" />
            Logout
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
            <div className="max-w-md w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search merchants, orders..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
              <ShieldCheck className="w-4 h-4 text-primary-700" />
              Admin Console
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-black">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
