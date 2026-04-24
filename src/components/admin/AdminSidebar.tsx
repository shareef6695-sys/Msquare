"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, FileText, Gavel, LayoutDashboard, Store, ShieldCheck, Users } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: "Merchants", href: "/admin/merchants", icon: <Store className="w-5 h-5" /> },
  { label: "Customers", href: "/admin/customers", icon: <Users className="w-5 h-5" /> },
  { label: "Orders", href: "/admin/orders", icon: <ShieldCheck className="w-5 h-5" /> },
  { label: "Payments", href: "/admin/payments", icon: <Banknote className="w-5 h-5" /> },
  { label: "Disputes", href: "/admin/disputes", icon: <Gavel className="w-5 h-5" /> },
  { label: "LC requests", href: "/admin/lc-requests", icon: <FileText className="w-5 h-5" /> },
] as const;

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <Link
          key={item.href}
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
  );
};
