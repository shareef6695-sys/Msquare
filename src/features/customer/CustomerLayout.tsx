"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, 
  ShoppingBag, 
  MapPin, 
  Heart, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { logout, requireRole } from "@/services/authStore";

const customerMenuItems = [
  { icon: <User className="w-5 h-5" />, label: 'My Profile', href: '/customer/profile' },
  { icon: <ShoppingBag className="w-5 h-5" />, label: 'Order History', href: '/customer/orders' },
  { icon: <MapPin className="w-5 h-5" />, label: 'Addresses', href: '/customer/addresses' },
  { icon: <Heart className="w-5 h-5" />, label: 'Wishlist', href: '/customer/wishlist' },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/customer/settings' },
];

export const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const gate = requireRole("CUSTOMER");
    if (!gate.ok) router.replace("/customer-login");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="container-max">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 space-y-6 lg:sticky lg:top-24 self-start">
            <div className="bg-white p-6 rounded-3xl border border-gray-200/60 shadow-sm shadow-gray-900/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold border-2 border-white shadow-sm">
                  SM
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Sarah Miller</p>
                  <p className="text-xs text-gray-500">Premium Member</p>
                </div>
              </div>
              
              <nav className="space-y-1">
                {customerMenuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      pathname === item.href 
                        ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ))}
                <button
                  className="flex items-center gap-3 px-4 py-3 w-full text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors mt-4"
                  onClick={() => {
                    logout();
                    router.replace("/customer-login");
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </nav>
            </div>
            
            <div className="bg-gradient-to-br from-primary-700 to-primary-600 p-6 rounded-3xl text-white shadow-lg shadow-primary-600/20">
              <h4 className="font-black mb-2">Need Help?</h4>
              <p className="text-sm text-primary-100 mb-4">Our support team is available 24/7 to assist you.</p>
              <button className="w-full bg-white text-primary-700 py-2.5 rounded-2xl text-sm font-bold hover:bg-primary-50 transition-colors">
                Contact Support
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
