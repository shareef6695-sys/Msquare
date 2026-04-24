"use client";

import React, { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { MerchantReviewCard } from "@/components/admin/MerchantReviewCard";
import { listMerchants } from "@/services/adminService";
import { type MerchantStatus } from "@/data/mockMerchants";
import { Card, CardContent } from "@/components/ui/Card";
import { Search } from "lucide-react";

export default function AdminMerchantsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MerchantStatus | "all">("all");

  const merchants = useMemo(() => listMerchants({ query, status }), [query, status]);
  const counts = useMemo(() => {
    const all = listMerchants({ status: "all" });
    const pending = all.filter((m) => m.status === "pending_verification").length;
    const approved = all.filter((m) => m.status === "approved").length;
    const rejected = all.filter((m) => m.status === "rejected").length;
    const suspended = all.filter((m) => m.status === "suspended").length;
    return { total: all.length, pending, approved, rejected, suspended };
  }, []);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Merchants</h1>
          <p className="text-gray-500">Review and approve suppliers before they can sell on MSquare.</p>
        </div>
        <div className="max-w-md w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search business, owner, email, CR, VAT..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "all" as const, label: `All (${counts.total})` },
          { key: "pending_verification" as const, label: `Pending (${counts.pending})` },
          { key: "approved" as const, label: `Approved (${counts.approved})` },
          { key: "rejected" as const, label: `Rejected (${counts.rejected})` },
          { key: "suspended" as const, label: `Suspended (${counts.suspended})` },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              status === tab.key ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {merchants.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">No merchants match your filters.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {merchants.map((m) => (
            <MerchantReviewCard key={m.id} merchant={m} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
