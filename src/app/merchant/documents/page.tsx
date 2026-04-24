"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";

export default function MerchantDocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/merchant/compliance");
  }, [router]);

  return (
    <MerchantLayout>
      <div className="rounded-3xl border border-gray-200/60 bg-white p-10 text-sm font-semibold text-gray-600 shadow-sm shadow-gray-900/5">
        Redirecting to compliance documents…
      </div>
    </MerchantLayout>
  );
}

