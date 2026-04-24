"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getMerchantById, setMerchantStatus, updateMerchant } from "@/services/adminService";
import { AlertTriangle, Banknote, CheckCircle2, FileText, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

const riskPill = (level: string) => {
  if (level === "High") return "border-red-200/70 bg-red-50 text-red-700";
  if (level === "Medium") return "border-amber-200/70 bg-amber-50 text-amber-800";
  return "border-green-200/70 bg-green-50 text-green-700";
};

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const merchant = useMemo(() => getMerchantById(id), [id]);
  const [notes, setNotes] = useState(merchant?.notes ?? "");
  const [rejectionReason, setRejectionReason] = useState(merchant?.rejectionReason ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!merchant) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">
            Merchant not found.{" "}
            <Link href="/admin/merchants" className="font-semibold text-primary-700 hover:underline">
              Back to merchants
            </Link>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const checks = merchant.riskChecks;
  const items = [
    { label: "Email verified", ok: checks.emailVerified },
    { label: "Phone verified", ok: checks.phoneVerified },
    { label: "CR uploaded", ok: checks.crUploaded },
    { label: "Bank details provided", ok: checks.bankDetailsProvided },
    { label: "Documents uploaded", ok: checks.documentsUploaded },
  ];

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 truncate">{merchant.businessName}</h1>
            <StatusBadge status={merchant.status} />
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${riskPill(checks.riskLevel)}`}>
              Risk {checks.riskLevel}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Store{" "}
            <span className="font-semibold text-gray-900">
              {merchant.storeName} ({merchant.storeSlug})
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => {
              setError(null);
              try {
                updateMerchant(merchant.id, { notes });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save notes.");
              }
            }}
            variant="outline"
          >
            Save Notes
          </Button>
          <Button
            onClick={() => {
              router.push("/admin/merchants");
            }}
            variant="outline"
          >
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
            <h3 className="text-lg font-black text-gray-900">Business profile</h3>
            <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
              {merchant.id}
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Owner name</div>
                <div className="text-sm font-black text-gray-900 mt-1">{merchant.ownerName}</div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Business type</div>
                <div className="text-sm font-black text-gray-900 mt-1">{merchant.businessType}</div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Commercial registration</div>
                <div className="text-sm font-black text-gray-900 mt-1">{merchant.commercialRegistrationNumber}</div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">VAT number</div>
                <div className="text-sm font-black text-gray-900 mt-1">{merchant.vatNumber}</div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Location</div>
                <div className="text-sm font-black text-gray-900 mt-1 inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {merchant.city}, {merchant.country}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Contact</div>
                <div className="mt-1 space-y-1 text-sm text-gray-700">
                  <div className="inline-flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{merchant.email}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{merchant.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-gray-200/60 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-600">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-gray-900">IBAN / bank details</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{merchant.iban}</div>
                  <div className="text-sm text-gray-600 mt-1">{merchant.bankDetails}</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-black text-gray-900 mb-3">Uploaded documents</div>
              {merchant.uploadedDocuments.length === 0 ? (
                <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm text-gray-500">
                  No documents uploaded.
                </div>
              ) : (
                <div className="space-y-3">
                  {merchant.uploadedDocuments.map((doc) => (
                    <div key={doc.name} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{doc.name}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate">{doc.url}</div>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-700">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-white px-4 py-3"
                >
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
              <h3 className="text-lg font-black text-gray-900">Approval panel</h3>
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                <ShieldCheck className="w-4 h-4 text-primary-700" />
                Admin
              </span>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Current status</div>
                <div className="mt-2">
                  <StatusBadge status={merchant.status} />
                </div>
                {merchant.rejectionReason && (
                  <div className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Rejection reason:</span> {merchant.rejectionReason}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Admin notes</div>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Write internal notes for compliance and review..."
                />
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Rejection reason</div>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Provide a clear reason the merchant will see..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => {
                    setError(null);
                    try {
                      setMerchantStatus({ id: merchant.id, status: "approved" });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to approve merchant.");
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
                      setMerchantStatus({ id: merchant.id, status: "rejected", rejectionReason });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to reject merchant.");
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
                      setMerchantStatus({ id: merchant.id, status: "suspended" });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to suspend merchant.");
                    }
                  }}
                >
                  Suspend
                </Button>
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Mock workflow • stored locally
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

