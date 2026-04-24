import React from "react";
import Link from "next/link";
import { type MockMerchant } from "@/data/mockMerchants";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AlertTriangle, FileText, MapPin, ShieldCheck } from "lucide-react";

const riskStyle = (riskLevel: MockMerchant["riskChecks"]["riskLevel"]) => {
  if (riskLevel === "High") return "border-red-200/70 bg-red-50 text-red-700";
  if (riskLevel === "Medium") return "border-amber-200/70 bg-amber-50 text-amber-800";
  return "border-green-200/70 bg-green-50 text-green-700";
};

export const MerchantReviewCard = ({ merchant }: { merchant: MockMerchant }) => {
  const checks = merchant.riskChecks;
  const missing = [
    !checks.emailVerified ? "Email not verified" : null,
    !checks.phoneVerified ? "Phone not verified" : null,
    !checks.crUploaded ? "CR missing" : null,
    !checks.bankDetailsProvided ? "Bank details missing" : null,
    !checks.documentsUploaded ? "Documents missing" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-3xl border border-gray-200/60 bg-white p-6 shadow-sm shadow-gray-900/5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-lg font-black text-gray-900 truncate">{merchant.businessName}</div>
            <StatusBadge status={merchant.status} />
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${riskStyle(checks.riskLevel)}`}>
              Risk {checks.riskLevel}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Owner <span className="font-semibold text-gray-900">{merchant.ownerName}</span> •{" "}
            <span className="font-semibold text-gray-900">{merchant.email}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              {merchant.city}, {merchant.country}
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              {merchant.businessType}
            </span>
            <span className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              {merchant.uploadedDocuments.length} docs
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
          {merchant.id}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white border border-amber-200/70 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-amber-900">Verification gaps</div>
              <div className="text-xs text-amber-800 mt-1">{missing.join(" • ")}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <Link
          href={`/admin/merchants/${merchant.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          Review merchant
        </Link>
        <Link
          href={`/admin/merchants/${merchant.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          Open verification panel
        </Link>
      </div>
    </div>
  );
};

