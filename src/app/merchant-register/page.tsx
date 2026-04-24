"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import {
  loadSession,
  resendMerchantVerificationCode,
  startMerchantSignup,
  submitMerchantBusinessProfile,
  verifyMerchantEmail,
} from "@/services/authStore";
import { requireAdmin } from "@/services/adminService";

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [account, setAccount] = useState({
    ownerName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptTradeAssurance, setAcceptTradeAssurance] = useState(false);
  const [profile, setProfile] = useState({
    businessName: "",
    country: "Saudi Arabia",
    city: "",
    businessType: "",
    commercialRegistrationNumber: "",
    vatNumber: "",
    iban: "",
    bankDetails: "",
    storeName: "",
    storeSlug: "",
    documentFileName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const slugHint = useMemo(() => {
    const raw = profile.storeSlug || profile.storeName;
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }, [profile.storeName, profile.storeSlug]);

  useEffect(() => {
    setError(null);
  }, [step]);

  useEffect(() => {
    const admin = requireAdmin();
    if (admin.ok) {
      router.replace("/admin/dashboard");
      return;
    }
    const session = loadSession();
    if (!session) return;
    if (session.user.role === "MERCHANT") router.replace("/merchant/dashboard");
    else router.replace("/customer/dashboard");
  }, [router]);

  return (
    <AuthLayout title="Merchant Registration" subtitle="Create your supplier account and start selling on MSquare">
      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          { k: 1, label: "Account" },
          { k: 2, label: "Verify" },
          { k: 3, label: "Business" },
          { k: 4, label: "Review" },
        ].map((s) => (
          <div
            key={s.k}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-widest text-center ${
              step === (s.k as any) ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-400"
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            try {
              startMerchantSignup({ ...account, acceptTerms, acceptTradeAssurance });
              setCodeSent(true);
              setStep(2);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Account creation failed.");
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={account.ownerName}
              onChange={(e) => setAccount((p) => ({ ...p, ownerName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={account.email}
              onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={account.phone}
              onChange={(e) => setAccount((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={account.password}
              onChange={(e) => setAccount((p) => ({ ...p, password: e.target.value }))}
            />
            <div className="mt-2 text-xs text-gray-500">At least 8 characters.</div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-5 py-4 space-y-3">
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                I accept the <span className="font-semibold text-gray-900">Terms & Conditions</span>.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acceptTradeAssurance}
                onChange={(e) => setAcceptTradeAssurance(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                I accept the <span className="font-semibold text-gray-900">Trade Assurance policy</span>.
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <Button className="w-full" disabled={!acceptTerms || !acceptTradeAssurance}>
            Continue to Email Verification
          </Button>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/merchant-login" className="font-semibold text-primary-700 hover:text-primary-800">
              Sign in
            </Link>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-5 py-4">
            <div className="text-sm font-black text-gray-900">Verify your email</div>
            <div className="mt-1 text-sm text-gray-600">
              We sent a verification code to{" "}
              <span className="font-semibold text-gray-900">{account.email.trim().toLowerCase() || "your email"}</span>.
            </div>
            {codeSent && (
              <div className="mt-2 text-xs text-gray-500">
                Demo code: <span className="font-black text-gray-900">123456</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                try {
                  resendMerchantVerificationCode();
                  setCodeSent(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to send code.");
                }
              }}
            >
              Resend code
            </Button>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              className="sm:col-span-2 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            disabled={isSubmitting}
            onClick={() => {
              setError(null);
              setIsSubmitting(true);
              try {
                verifyMerchantEmail(code);
                setEmailVerified(true);
                setStep(3);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Verification failed.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Verifying..." : "Verify Email"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
            Back
          </Button>
        </div>
      )}

      {step === 3 && (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setIsSubmitting(true);
            try {
              await submitMerchantBusinessProfile({
                businessName: profile.businessName,
                country: profile.country,
                city: profile.city,
                businessType: profile.businessType,
                commercialRegistrationNumber: profile.commercialRegistrationNumber,
                vatNumber: profile.vatNumber,
                iban: profile.iban,
                bankDetails: profile.bankDetails,
                storeName: profile.storeName,
                storeSlug: profile.storeSlug || profile.storeName,
                documentFileName: profile.documentFileName || undefined,
              });
              setStep(4);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Profile submission failed.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {emailVerified && (
            <div className="rounded-2xl border border-green-200/70 bg-green-50 px-5 py-4 text-sm text-green-800">
              <div className="font-black">Email verification success</div>
              <div className="mt-1 text-green-700">Complete your business profile to submit for review.</div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-5 py-4 text-sm text-gray-700">
            <div className="font-black text-gray-900">Profile completion required</div>
            <div className="mt-1">Provide business information and upload documents to activate selling on MSquare.</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Business name</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.businessName}
                onChange={(e) => setProfile((p) => ({ ...p, businessName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business type</label>
              <input
                required
                placeholder="e.g., Manufacturer, Distributor"
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.businessType}
                onChange={(e) => setProfile((p) => ({ ...p, businessType: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.country}
                onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">CR number</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.commercialRegistrationNumber}
                onChange={(e) => setProfile((p) => ({ ...p, commercialRegistrationNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">VAT number</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.vatNumber}
                onChange={(e) => setProfile((p) => ({ ...p, vatNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IBAN</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.iban}
                onChange={(e) => setProfile((p) => ({ ...p, iban: e.target.value }))}
                placeholder="SA..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Bank details</label>
              <textarea
                required
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.bankDetails}
                onChange={(e) => setProfile((p) => ({ ...p, bankDetails: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Store name</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.storeName}
                onChange={(e) => setProfile((p) => ({ ...p, storeName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Store slug</label>
              <input
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={profile.storeSlug}
                onChange={(e) => setProfile((p) => ({ ...p, storeSlug: e.target.value }))}
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
                  setProfile((p) => ({ ...p, documentFileName: file?.name ?? "" }));
                }}
              />
              <div className="mt-2 text-xs text-gray-500">
                Selected: {profile.documentFileName ? profile.documentFileName : "None"}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <Button className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </Button>

          <Button variant="outline" className="w-full" type="button" onClick={() => setStep(2)}>
            Back
          </Button>
        </form>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary-200/70 bg-primary-50 px-5 py-4 text-sm text-primary-800">
            <div className="font-black">Account under review</div>
            <div className="mt-1 text-primary-700">
              Status: <span className="font-black">Pending Verification</span>. An MSquare admin will review your business profile and documents.
            </div>
          </div>
          <Link href="/merchant-login">
            <Button className="w-full">Go to Merchant Login</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
