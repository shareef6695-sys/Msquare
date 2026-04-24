"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { resendCustomerVerificationCode, startCustomerSignup, verifyCustomerEmailAndCreateAccount } from "@/services/authStore";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptTradeAssurance, setAcceptTradeAssurance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const emailHint = useMemo(() => form.email.trim().toLowerCase(), [form.email]);

  useEffect(() => {
    setError(null);
  }, [step]);

  return (
    <AuthLayout title="Customer Registration" subtitle="Create your buyer account to purchase with confidence">
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          { k: 1, label: "Account" },
          { k: 2, label: "Verify" },
          { k: 3, label: "Done" },
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
              startCustomerSignup({
                name: form.name,
                email: form.email,
                phone: form.phone,
                password: form.password,
                address: form.address || undefined,
                acceptTerms,
                acceptTradeAssurance,
              });
              setCodeSent(true);
              setStep(2);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Registration failed.");
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              required
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
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

          <div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">Address (optional)</label>
            <textarea
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
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
            <Link href="/customer-login" className="font-semibold text-primary-700 hover:text-primary-800">
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
              We sent a verification code to <span className="font-semibold text-gray-900">{emailHint || "your email"}</span>.
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
                  resendCustomerVerificationCode();
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
            onClick={async () => {
              setError(null);
              setIsSubmitting(true);
              try {
                await verifyCustomerEmailAndCreateAccount(code);
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
        <div className="space-y-4">
          <div className="rounded-2xl border border-green-200/70 bg-green-50 px-5 py-4 text-sm text-green-800">
            <div className="font-black">Email verification success</div>
            <div className="mt-1 text-green-700">Your account is ready. You can continue to your dashboard.</div>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              router.push("/account");
            }}
          >
            Go to Account
          </Button>
          <Link href="/customer-login">
            <Button variant="outline" className="w-full">
              Sign in again
            </Button>
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
