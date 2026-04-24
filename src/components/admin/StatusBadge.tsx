import React from "react";
import { type MerchantStatus } from "@/data/mockMerchants";

const styles: Record<string, string> = {
  pending_verification: "border-amber-200/70 bg-amber-50 text-amber-800",
  more_documents_required: "border-blue-200/70 bg-blue-50 text-blue-800",
  approved: "border-green-200/70 bg-green-50 text-green-800",
  rejected: "border-red-200/70 bg-red-50 text-red-700",
  suspended: "border-gray-200/70 bg-gray-50 text-gray-700",
};

export const StatusBadge = ({ status }: { status: MerchantStatus }) => {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${styles[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
};
