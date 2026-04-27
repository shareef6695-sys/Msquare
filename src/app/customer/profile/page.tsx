"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getCustomerById, getCustomerTrustTier, getCustomerVerificationChecks, trustTierLabel } from "@/services/adminService";
import { AlertTriangle, CheckCircle2, Mail, Phone, ShieldCheck, User } from "lucide-react";

export default function CustomerProfilePage() {
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
  }, []);

  const profile = useMemo(() => {
    if (!customerId) return null;
    return getCustomerById(customerId);
  }, [customerId]);

  const verification = useMemo(() => {
    if (!profile) return null;
    return getCustomerVerificationChecks(profile);
  }, [profile]);

  const trustTier = useMemo(() => {
    if (!profile) return null;
    return getCustomerTrustTier(profile);
  }, [profile]);

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Profile</h1>
          <p className="text-gray-500">Customer account details (mock).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/customer/addresses">
            <Button variant="outline">Addresses</Button>
          </Link>
          <Link href="/customer/notifications">
            <Button variant="outline">Notifications</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60">
          <div className="text-lg font-black text-gray-900">Account</div>
        </div>
        <CardContent className="p-6">
          {!profile ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">Loading profile…</div>
              <div className="text-sm text-gray-500 mt-2">If you are not logged in, you will be redirected.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Name</div>
                    <div className="text-lg font-black text-gray-900 mt-1">{profile.name}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Email</div>
                    <div className="text-sm font-black text-gray-900 mt-1 break-all">{profile.email}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200/60 bg-white p-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Phone</div>
                    <div className="text-sm font-black text-gray-900 mt-1">{profile.phone}</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 rounded-3xl border border-gray-200/60 bg-gray-50 p-6">
                <div className="text-sm font-black text-gray-900">Profile settings</div>
                <div className="text-sm text-gray-600 mt-2">
                  Profile edits are mocked for MVP. Use Orders and Addresses pages to manage your purchasing flow.
                </div>
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <Link href="/customer/orders">
                    <Button>View orders</Button>
                  </Link>
                  <Link href="/customer/checkout">
                    <Button variant="outline">Go to checkout</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-black text-gray-900">Verification</div>
            <div className="text-sm text-gray-500 mt-1">Trust checks for buyer accounts (mock).</div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
              trustTier ? "border-green-200/70 bg-green-50 text-green-800" : "border-gray-200/70 bg-gray-50 text-gray-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {trustTier ? trustTierLabel(trustTier) : "Unverified"}
          </span>
        </div>
        <CardContent className="p-6 space-y-3">
          {!verification ? (
            <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading…</div>
          ) : (
            ([
              { label: "Commercial registration", ok: verification.commercialRegistration },
              { label: "VAT registration", ok: verification.vatRegistration },
              { label: "Bank account ownership", ok: verification.bankAccountOwnership },
              { label: "Beneficial owner", ok: verification.beneficialOwner },
            ] as const).map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                {item.ok ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pass
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Review
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </CustomerLayout>
  );
}
