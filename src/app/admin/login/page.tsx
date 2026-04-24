"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { loginAdmin } from "@/services/adminService";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@msquare.demo");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <AuthLayout title="Admin Login" subtitle="Secure access to MSquare control center">
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          try {
            loginAdmin({ email, password });
            router.push("/admin/dashboard");
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

        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In as Admin"}
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

