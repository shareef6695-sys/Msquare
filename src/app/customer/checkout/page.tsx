"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/services/authStore";
import { requireAdmin } from "@/services/adminService";

export default function CustomerCheckoutPage() {
  const router = useRouter();

  useEffect(() => {
    const admin = requireAdmin();
    if (admin.ok) {
      router.replace("/admin/dashboard");
      return;
    }
    const session = loadSession();
    if (!session) {
      router.replace("/customer-login");
      return;
    }
    if (session.user.role === "MERCHANT") {
      router.replace("/merchant/dashboard");
      return;
    }
    router.replace("/checkout");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="container-max">
        <div className="rounded-3xl border border-gray-200/60 bg-white p-10 text-sm font-semibold text-gray-600 shadow-sm shadow-gray-900/5">
          Redirecting to checkout…
        </div>
      </div>
    </div>
  );
}
