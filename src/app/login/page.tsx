"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ceo-dashboard/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="container-max">
        <div className="rounded-3xl border border-gray-200/60 bg-white p-10 text-center shadow-sm shadow-gray-900/5">
          <div className="text-lg font-black text-gray-900">Redirecting…</div>
          <div className="text-sm text-gray-500 mt-2">Taking you to the login page.</div>
          <Link href="/ceo-dashboard/login" className="mt-6 inline-block">
            <Button variant="outline">Open login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

