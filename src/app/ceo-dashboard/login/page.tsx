"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { listExecutiveDemoAccounts, loadExecutiveSession, loginExecutive } from "@/services/executiveAuthService";
import type { ExecutiveRole } from "@/data/mockCEOStats";

export default function ExecutiveLoginPage() {
  const router = useRouter();
  const demoAccounts = useMemo(() => listExecutiveDemoAccounts(), []);

  const [role, setRole] = useState<ExecutiveRole>("ceo");
  const [email, setEmail] = useState("ceo@msquare.demo");
  const [password, setPassword] = useState("ceo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = loadExecutiveSession();
    if (session) router.replace("/ceo-dashboard");
  }, [router]);

  useEffect(() => {
    const preset = demoAccounts.find((a) => a.role === role);
    if (!preset) return;
    setEmail(preset.email);
    setPassword(preset.password);
  }, [demoAccounts, role]);

  return (
    <AuthLayout title="Executive Access" subtitle="Leadership dashboard (mock credentials)">
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            loginExecutive({ email, password, role });
            router.push("/ceo-dashboard");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as ExecutiveRole)}
          >
            <option value="ceo">CEO</option>
            <option value="managing_director">Managing Director</option>
            <option value="gm">General Manager</option>
            <option value="finance_manager">Finance Manager</option>
            <option value="sales_manager">Sales Manager</option>
          </select>
        </div>

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

        <Button className="w-full" disabled={busy}>
          {busy ? "Signing in..." : "Sign In"}
        </Button>

        <div className="text-center text-xs text-gray-500">
          <Link href="/" className="font-semibold text-primary-700 hover:text-primary-800">
            Back to MSquare
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

