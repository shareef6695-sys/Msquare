"use client";

import React, { useEffect, useState } from "react";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import {
  getComplianceConfig,
  getMerchantById,
  getMerchantTrustTier,
  getMerchantVerificationChecks,
  runComplianceCheck,
  trustTierLabel,
  uploadComplianceDocumentReplacement,
} from "@/services/adminService";
import { type ComplianceDocument } from "@/data/mockMerchants";
import { AlertTriangle, CheckCircle2, FileUp, ShieldCheck } from "lucide-react";

const startOfDayUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const daysUntil = (expiryDate: string, now = new Date()) => {
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const diffMs = startOfDayUtc(expiry) - startOfDayUtc(now);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const isExpiredInGrace = (
  doc: { expiryDate: string; overrideExpiry?: string; status?: string },
  graceDays: number,
  now = new Date(),
) => {
  if (doc.status === "rejected" || doc.status === "under_review") return false;
  const effective = doc.overrideExpiry ?? doc.expiryDate;
  const dte = daysUntil(effective, now);
  return dte < 0 && Math.abs(dte) <= graceDays;
};

export default function MerchantCompliancePage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setMerchantId(session.user.merchantParentId ?? session.user.id);
    void runComplianceCheck().then(() => setRefreshKey((k) => k + 1));
  }, []);

  const merchant = merchantId ? getMerchantById(merchantId) : null;
  const documents = merchant?.complianceDocuments ?? [];
  const config = getComplianceConfig();
  const graceActive = documents.some((d) => isExpiredInGrace(d, config.gracePeriodDays));
  const verification = merchant ? getMerchantVerificationChecks(merchant) : null;
  const trustTier = merchant ? getMerchantTrustTier(merchant) : null;

  const categorized = {
    valid: documents.filter((d) => d.status === "valid"),
    expiringSoon: documents.filter((d) => d.status === "expiring_soon"),
    expired: documents.filter((d) => d.status === "expired"),
    underReview: documents.filter((d) => d.status === "under_review"),
    rejected: documents.filter((d) => d.status === "rejected"),
  };

  const badge = (status: ComplianceDocument["status"]) => {
    if (status === "valid") return "bg-green-50 text-green-700 border-green-200/70";
    if (status === "expiring_soon") return "bg-amber-50 text-amber-800 border-amber-200/70";
    if (status === "expired") return "bg-red-50 text-red-700 border-red-200/70";
    if (status === "rejected") return "bg-red-50 text-red-700 border-red-200/70";
    return "bg-blue-50 text-blue-700 border-blue-200/70";
  };

  const openUpload = (doc: ComplianceDocument) => {
    setUploadDocId(doc.id);
    setFileName(`${doc.documentType}.pdf`);
    setIssueDate(doc.issueDate);
    setExpiryDate(doc.expiryDate);
    setUploadOpen(true);
  };

  const submitUpload = () => {
    if (!merchantId || !uploadDocId) return;
    if (!fileName.trim() || !issueDate.trim() || !expiryDate.trim()) return;
    setBusy(true);
    try {
      uploadComplianceDocumentReplacement({
        ownerType: "merchant",
        ownerId: merchantId,
        documentId: uploadDocId,
        fileUrl: `/mock/uploads/${merchantId}/${encodeURIComponent(fileName.trim())}`,
        issueDate: issueDate.trim(),
        expiryDate: expiryDate.trim(),
      });
      setUploadOpen(false);
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const Modal = ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => (busy ? null : setUploadOpen(false))} />
        <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">{title}</div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <MerchantLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Compliance</h1>
        <p className="text-gray-500">Document status, holds, and replacements (mock).</p>
      </div>

      {(merchant?.restrictionLevel !== "warning" || merchant?.payoutHold || graceActive) && (
        <div className="mb-6 rounded-3xl border border-amber-200/70 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-amber-200/70 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-amber-900">
                Compliance Status: {merchant?.complianceBadge ?? "Good"} ({merchant?.complianceScore ?? 100})
              </div>
              <div className="text-sm text-amber-800 mt-1">
                {merchant?.restrictionLevel === "full_hold"
                  ? merchant?.complianceHoldReason ?? "Account hold is active."
                  : merchant?.payoutHold
                    ? merchant?.payoutHoldReason ?? "Payout hold is active."
                    : graceActive
                      ? "Grace period active. Upload updated documents to avoid restrictions."
                      : "Limited access due to compliance requirements."}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <div className="text-lg font-black text-gray-900">Documents</div>
            <div className="text-sm font-semibold text-gray-500">{documents.length} total</div>
          </div>
          <CardContent className="p-6">
            {documents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                <div className="text-lg font-black text-gray-900">No documents</div>
                <div className="text-sm text-gray-500 mt-2">Upload replacements from required document entries.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((d) => (
                  <div key={d.id} className="rounded-3xl border border-gray-200/60 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">{d.documentType}</div>
                      <div className="text-xs text-gray-500 mt-1">Expires {d.overrideExpiry ?? d.expiryDate}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badge(d.status)}`}>
                        {d.status.replaceAll("_", " ")}
                      </span>
                      {(d.status === "expired" || d.status === "expiring_soon" || d.status === "rejected") && (
                        <Button variant="outline" size="sm" onClick={() => openUpload(d)}>
                          <FileUp className="w-4 h-4 mr-2" />
                          Upload replacement
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Trust tier</div>
                  <div className="text-sm text-gray-500 mt-1">Supplier verification status (mock).</div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
                    trustTier
                      ? trustTier === "factory_verified"
                        ? "border-purple-200/70 bg-purple-50 text-purple-800"
                        : trustTier === "gold_supplier"
                          ? "border-amber-200/70 bg-amber-50 text-amber-900"
                          : "border-green-200/70 bg-green-50 text-green-800"
                      : "border-gray-200/70 bg-gray-50 text-gray-700"
                  }`}
                >
                  {trustTier ? trustTierLabel(trustTier) : "Unverified"}
                </span>
              </div>
            </div>
            <CardContent className="p-6 space-y-3">
              {verification ? (
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
              ) : (
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">Loading…</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-gray-900">Summary</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Valid {categorized.valid.length} • Expiring {categorized.expiringSoon.length} • Expired {categorized.expired.length}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-5"
                onClick={() => {
                  void runComplianceCheck().then(() => setRefreshKey((k) => k + 1));
                }}
              >
                Run compliance check
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={uploadOpen} title="Upload document replacement">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">File name</div>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              disabled={busy}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Issue date</div>
              <input
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="YYYY-MM-DD"
                disabled={busy}
              />
            </div>
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Expiry date</div>
              <input
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="YYYY-MM-DD"
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitUpload} disabled={busy || !fileName.trim() || !issueDate.trim() || !expiryDate.trim()}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </MerchantLayout>
  );
}
