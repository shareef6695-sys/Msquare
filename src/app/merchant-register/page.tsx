"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { registerMerchant } from "@/services/authStore";

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    businessType: "",
    commercialRegistrationNumber: "",
    bankDetails: "",
    storeName: "",
    storeSlug: "",
    documentFileName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slugHint = useMemo(() => {
    const raw = form.storeSlug || form.storeName;
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }, [form.storeName, form.storeSlug]);

  return (
    <AuthLayout title="Merchant Registration" subtitle="Create your supplier account and start selling on MSquare">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          try {
            await registerMerchant({
              businessName: form.businessName,
              ownerName: form.ownerName,
              email: form.email,
              phone: form.phone,
              password: form.password,
              businessType: form.businessType,
              commercialRegistrationNumber: form.commercialRegistrationNumber,
              bankDetails: form.bankDetails,
              storeName: form.storeName,
              storeSlug: form.storeSlug || form.storeName,
              documentFileName: form.documentFileName || undefined,
            });
            router.push("/merchant/dashboard");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Business name</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.businessName}
              onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner name</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.ownerName}
              onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Business type</label>
            <input
              required
              placeholder="e.g., Manufacturer, Distributor"
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.businessType}
              onChange={(e) => setForm((p) => ({ ...p, businessType: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <div className="mt-2 text-xs text-gray-500">At least 8 characters.</div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Commercial registration number</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.commercialRegistrationNumber}
              onChange={(e) => setForm((p) => ({ ...p, commercialRegistrationNumber: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Bank details</label>
            <textarea
              required
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.bankDetails}
              onChange={(e) => setForm((p) => ({ ...p, bankDetails: e.target.value }))}
              placeholder="IBAN / SWIFT / Account name (mock)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Store name</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.storeName}
              onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Store slug</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.storeSlug}
              onChange={(e) => setForm((p) => ({ ...p, storeSlug: e.target.value }))}
              placeholder="your-store"
            />
            <div className="mt-2 text-xs text-gray-500">Will be normalized to: {slugHint || "—"}</div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Document upload (mock)</label>
            <input
              type="file"
              className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-semibold hover:file:bg-gray-200"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setForm((p) => ({ ...p, documentFileName: file?.name ?? "" }));
              }}
            />
            <div className="mt-2 text-xs text-gray-500">
              Selected: {form.documentFileName ? form.documentFileName : "None"}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Merchant Account"}
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/merchant-login" className="font-semibold text-primary-700 hover:text-primary-800">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
