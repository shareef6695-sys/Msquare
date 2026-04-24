"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getMerchantById } from "@/services/adminService";
import { Building2, Mail, Phone, Settings } from "lucide-react";

export default function MerchantSettingsPage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<"admin" | "manager" | "viewer">("admin");

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    setEmail(session.user.email);
    setPhone(session.user.phone ?? null);
    setTeamRole((session.user.merchantTeamRole ?? "admin") as any);
  }, []);

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  return (
    <MerchantLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-500">Merchant account settings (mock).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">Account</div>
              <div className="text-xs text-gray-500 mt-1">Read-only for MVP demo</div>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Business</div>
                  <div className="text-sm font-black text-gray-900 mt-1">{merchant?.businessName ?? merchant?.storeName ?? "—"}</div>
                  <div className="text-xs text-gray-500 mt-1">Role: {teamRole}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Email</div>
                  <div className="text-sm font-black text-gray-900 mt-1 break-all">{email ?? "—"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200/60 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Phone</div>
                  <div className="text-sm font-black text-gray-900 mt-1">{phone ?? "—"}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="text-lg font-black text-gray-900">Quick links</div>
              <Link href="/merchant/team" className="block">
                <Button variant="outline" className="w-full">
                  Team management
                </Button>
              </Link>
              <Link href="/merchant/compliance" className="block">
                <Button variant="outline" className="w-full">
                  Compliance
                </Button>
              </Link>
              <Link href="/merchant/notifications" className="block">
                <Button variant="outline" className="w-full">
                  Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}

