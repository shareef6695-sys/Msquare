"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { listCustomers, type CustomerStatus } from "@/services/adminService";
import { Search, ShieldCheck, UserRound } from "lucide-react";

const badgeClass = (status: CustomerStatus) => {
  if (status === "approved") return "border-green-200/70 bg-green-50 text-green-800";
  if (status === "pending_verification") return "border-amber-200/70 bg-amber-50 text-amber-800";
  if (status === "rejected") return "border-red-200/70 bg-red-50 text-red-700";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

export default function AdminCustomersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");

  const customers = useMemo(() => listCustomers({ query, status }), [query, status]);
  const counts = useMemo(() => {
    const all = listCustomers({ status: "all" });
    const approved = all.filter((c) => c.status === "approved").length;
    const pending = all.filter((c) => c.status === "pending_verification").length;
    const rejected = all.filter((c) => c.status === "rejected").length;
    const suspended = all.filter((c) => c.status === "suspended").length;
    return { total: all.length, approved, pending, rejected, suspended };
  }, []);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Customers</h1>
          <p className="text-gray-500">Review buyer accounts and manage suspensions and compliance notes.</p>
        </div>
        <div className="max-w-md w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "all" as const, label: `All (${counts.total})` },
          { key: "approved" as const, label: `Approved (${counts.approved})` },
          { key: "pending_verification" as const, label: `Pending (${counts.pending})` },
          { key: "rejected" as const, label: `Rejected (${counts.rejected})` },
          { key: "suspended" as const, label: `Suspended (${counts.suspended})` },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              status === tab.key
                ? "border-primary-200/70 bg-primary-50 text-primary-800"
                : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">No customers match your filters.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/customers/${c.id}`}
              className="block rounded-3xl border border-gray-200/60 bg-white p-6 hover:shadow-sm transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-black text-gray-900 truncate">{c.name}</div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(c.status)}`}>
                      {c.status.replaceAll("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                      <ShieldCheck className="w-4 h-4 text-primary-700" />
                      Risk {c.riskChecks.riskLevel}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{c.email}</span> • {c.phone}
                  </div>
                  {c.address && <div className="mt-1 text-xs text-gray-500 truncate">{c.address}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                    {c.id}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

