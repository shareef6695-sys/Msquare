"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { logoutExecutive, requireExecutive } from "@/services/executiveAuthService";
import type { ExecutiveRole } from "@/data/mockCEOStats";

const ALLOWED: ExecutiveRole[] = ["ceo", "managing_director", "gm", "finance_manager", "sales_manager"];

export const ExecutiveLayout = ({
  children,
  title = "CEO Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const inLogin = useMemo(() => pathname.startsWith("/ceo-dashboard/login"), [pathname]);

  useEffect(() => {
    if (inLogin) {
      setReady(true);
      return;
    }
    const res = requireExecutive(ALLOWED);
    if (!res.ok) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [inLogin, router]);

  if (!ready && !inLogin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200/60">
        <div className="container-max h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/ceo-dashboard" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center">
                <span className="text-primary-700 font-black">M</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-gray-900 truncate">MSquare</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 truncate">Executive</div>
              </div>
            </Link>
            <div className="hidden sm:block h-6 w-px bg-gray-200/80" />
            <div className="hidden sm:block text-sm font-black text-gray-900 truncate">{title}</div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="hidden sm:block">
              <Button variant="outline">Back to MSquare</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                logoutExecutive();
                router.replace("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20">
        <div className="container-max">{children}</div>
      </main>
    </div>
  );
};
