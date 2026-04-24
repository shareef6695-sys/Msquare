 "use client";

import React, { useEffect, useState } from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { loadSession, loginWithEmail, seedDemoAccountsIfMissing } from "@/services/authStore";
import { requireAdmin } from "@/services/adminService";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const admin = requireAdmin();
    if (admin.ok) {
      router.replace("/admin/dashboard");
      return;
    }
    const session = loadSession();
    if (session) {
      if (session.user.role === "MERCHANT") router.replace("/merchant/dashboard");
      else router.replace("/customer/dashboard");
      return;
    }
    seedDemoAccountsIfMissing();
  }, [router]);

  return (
    <AuthLayout 
      title="Merchant Login" 
      subtitle="Manage your store and scale your business"
    >
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          try {
            await loginWithEmail({ email, password, role: "MERCHANT" });
            router.push("/merchant/dashboard");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">Email address</label>
          <input 
            type="email" 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            required 
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">Remember me</label>
          </div>
          <span className="text-sm font-medium text-gray-400">Password reset (mock)</span>
        </div>

        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In as Merchant"}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to MSquare?</span>
          </div>
        </div>
        <div className="mt-6">
          <Link href="/merchant-register">
            <Button variant="outline" className="w-full">Create Merchant Account</Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
