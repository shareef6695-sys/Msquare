"use client";

import React from "react";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { mockMerchants } from "@/data/mockMerchants";
import { MapPin, ShieldCheck, Star } from "lucide-react";

export default function AdminMerchantsPage() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">All merchants</h1>
        <p className="text-gray-500">Manage verified suppliers and marketplace integrity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockMerchants.map((m) => (
          <Card key={m.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-black text-gray-900 truncate">{m.name}</div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {m.location}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{m.rating}</span>
                      <span className="text-gray-400">/ 5</span>
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                  {m.id}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}

