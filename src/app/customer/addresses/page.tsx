"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { type Address } from "@/types";
import { MapPin, Plus, Trash2 } from "lucide-react";

export default function CustomerAddressesPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [draft, setDraft] = useState({ street: "", city: "", state: "", zipCode: "", country: "Saudi Arabia" });

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
  }, []);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.addresses.${customerId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setAddresses([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Address[];
      setAddresses(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAddresses([]);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.addresses.${customerId}.v1`;
    window.localStorage.setItem(key, JSON.stringify(addresses));
  }, [addresses, customerId]);

  const canAdd = useMemo(() => {
    return Boolean(draft.street.trim() && draft.city.trim() && draft.state.trim() && draft.zipCode.trim() && draft.country.trim());
  }, [draft]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Addresses</h1>
          <p className="text-gray-500">Saved delivery addresses (mock local storage).</p>
        </div>
        <Link href="/customer/checkout">
          <Button>Go to checkout</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">Saved addresses</div>
                <div className="text-xs text-gray-500 mt-1">{addresses.length} total</div>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            {addresses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-lg font-black text-gray-900">No saved addresses</div>
                <div className="text-sm text-gray-500 mt-2">Add an address to speed up checkout.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-3xl border border-gray-200/60 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900">{a.street}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {a.city}, {a.state} • {a.country} • {a.zipCode}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddresses((prev) => prev.filter((x) => x.id !== a.id))}
                      className="whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">Add address</div>
            <div className="text-sm text-gray-500 mt-1">Used for shipping and invoices.</div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Street</div>
              <input
                value={draft.street}
                onChange={(e) => setDraft((d) => ({ ...d, street: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Street, building, unit…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-black text-gray-900 mb-2">City</div>
                <input
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Riyadh"
                />
              </div>
              <div>
                <div className="text-sm font-black text-gray-900 mb-2">State</div>
                <input
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Riyadh"
                />
              </div>
              <div>
                <div className="text-sm font-black text-gray-900 mb-2">ZIP</div>
                <input
                  value={draft.zipCode}
                  onChange={(e) => setDraft((d) => ({ ...d, zipCode: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="00000"
                />
              </div>
              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Country</div>
                <input
                  value={draft.country}
                  onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Saudi Arabia"
                />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!canAdd || !customerId}
              onClick={() => {
                if (!customerId) return;
                const next: Address = { id: `addr_${Math.random().toString(16).slice(2, 10)}`, ...draft };
                setAddresses((prev) => [next, ...prev]);
                setDraft({ street: "", city: "", state: "", zipCode: "", country: "Saudi Arabia" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add address
            </Button>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}

