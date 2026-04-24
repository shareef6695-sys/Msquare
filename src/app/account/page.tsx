"use client";

import React from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, ShieldCheck } from "lucide-react";

export default function AccountPage() {
  return (
    <CustomerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Account</h1>
        <p className="text-gray-500">Manage your profile, orders, LC documents, and protection features.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-black text-gray-900">Trade Assurance</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Escrow protection, optional shipment insurance, and dispute resolution for safer sourcing.
                  </div>
                </div>
              </div>
              <Link href="/customer/orders" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                View Orders
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["Secure payment (escrow)", "LC supported orders", "Shipment insurance add-on", "Buyer protection disputes"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">LC Center</div>
                <div className="text-sm text-gray-500 mt-1">Upload LC documents and track bank status.</div>
              </div>
            </div>
            <Link href="/customer/orders" className="mt-5 block">
              <Button variant="outline" className="w-full">
                Manage LC
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <h3 className="text-lg font-black">Quick actions</h3>
        </div>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/marketplace"
            className="rounded-2xl border border-gray-200/60 bg-white p-5 hover:border-primary-200/70 hover:shadow-sm transition-all"
          >
            <div className="text-sm font-black text-gray-900">Browse marketplace</div>
            <div className="text-xs text-gray-500 mt-1">Discover verified suppliers and products.</div>
          </Link>
          <Link
            href="/customer/orders"
            className="rounded-2xl border border-gray-200/60 bg-white p-5 hover:border-primary-200/70 hover:shadow-sm transition-all"
          >
            <div className="text-sm font-black text-gray-900">My orders</div>
            <div className="text-xs text-gray-500 mt-1">Track shipments, confirm delivery, and manage LC.</div>
          </Link>
          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 p-5">
            <div className="text-sm font-black text-gray-900">Addresses</div>
            <div className="text-xs text-gray-500 mt-1">Coming soon.</div>
          </div>
          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 p-5">
            <div className="text-sm font-black text-gray-900">Profile</div>
            <div className="text-xs text-gray-500 mt-1">Coming soon.</div>
          </div>
        </CardContent>
      </Card>
    </CustomerLayout>
  );
}

