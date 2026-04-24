"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCustomerById, setCustomerStatus, updateCustomer, type CustomerStatus } from "@/services/adminService";
import { AlertTriangle, CheckCircle2, Mail, Phone, ShieldCheck } from "lucide-react";

const badgeClass = (status: CustomerStatus) => {
  if (status === "approved") return "border-green-200/70 bg-green-50 text-green-800";
  if (status === "pending_verification") return "border-amber-200/70 bg-amber-50 text-amber-800";
  if (status === "rejected") return "border-red-200/70 bg-red-50 text-red-700";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

const riskPill = (level: string) => {
  if (level === "High") return "border-red-200/70 bg-red-50 text-red-700";
  if (level === "Medium") return "border-amber-200/70 bg-amber-50 text-amber-800";
  return "border-green-200/70 bg-green-50 text-green-700";
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const customer = useMemo(() => getCustomerById(id), [id]);
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [rejectionReason, setRejectionReason] = useState(customer?.rejectionReason ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!customer) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">
            Customer not found.{" "}
            <Link href="/admin/customers" className="font-semibold text-primary-700 hover:underline">
              Back to customers
            </Link>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const checks = customer.riskChecks;
  const items = [
    { label: "Email verified", ok: checks.emailVerified },
    { label: "Phone verified", ok: checks.phoneVerified },
  ];

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 truncate">{customer.name}</h1>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(customer.status)}`}>
              {customer.status.replaceAll("_", " ")}
            </span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${riskPill(checks.riskLevel)}`}>
              Risk {checks.riskLevel}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{customer.email}</span> • {customer.phone}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              try {
                updateCustomer(customer.id, { notes });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save notes.");
              }
            }}
          >
            Save Notes
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/customers")}>
            Back
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Customer profile</h3>
            <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
              {customer.id}
            </div>
          </div>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Email</div>
                <div className="text-sm font-black text-gray-900 mt-1 inline-flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {customer.email}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Phone</div>
                <div className="text-sm font-black text-gray-900 mt-1 inline-flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {customer.phone}
                </div>
              </div>
              <div className="md:col-span-2 rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Address</div>
                <div className="text-sm font-semibold text-gray-800 mt-1">{customer.address ?? "Not provided"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <h3 className="text-lg font-black text-gray-900">Fraud & risk checks</h3>
            </div>
            <CardContent className="p-6 space-y-3">
              {items.map((item) => (
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
              ))}
            </CardContent>
          </Card>

          <Card>
            <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Account actions</h3>
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                <ShieldCheck className="w-4 h-4 text-primary-700" />
                Admin
              </span>
            </div>
            <CardContent className="p-6 space-y-4">
              {customer.rejectionReason && (
                <div className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="font-black">Rejection reason:</span> {customer.rejectionReason}
                </div>
              )}

              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Admin notes</div>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Rejection reason</div>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Visible to customer on login"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => {
                    setError(null);
                    try {
                      setCustomerStatus({ id: customer.id, status: "approved" });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to approve customer.");
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    try {
                      setCustomerStatus({ id: customer.id, status: "rejected", rejectionReason });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to reject customer.");
                    }
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    try {
                      setCustomerStatus({ id: customer.id, status: "suspended" });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to suspend customer.");
                    }
                  }}
                >
                  Suspend
                </Button>
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Mock workflow • stored locally</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

