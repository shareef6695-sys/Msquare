"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Building2, 
  ShieldCheck,
  FileText,
  CheckCircle2,
  Lock,
  Truck
} from 'lucide-react';
import { createEscrowOrder } from "@/services/orderStore";
import { Address, PaymentMethod } from "@/types";
import { loadSession } from "@/services/authStore";
import { getComplianceConfig, getCustomerById, requireAdmin, runComplianceCheck } from "@/services/adminService";
import { clearCart, getResolvedCartItems } from "@/services/cartStore";
import { evaluateCartCompliance } from "@/services/productComplianceService";

const startOfDayUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

const daysUntil = (expiryDate: string, now = new Date()) => {
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const diffMs = startOfDayUtc(expiry) - startOfDayUtc(now);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const isExpiredInGrace = (
  doc: { expiryDate: string; overrideExpiry?: string; status?: string },
  graceDays: number,
  now = new Date(),
) => {
  if (doc.status === "rejected" || doc.status === "under_review") return false;
  const effective = doc.overrideExpiry ?? doc.expiryDate;
  const dte = daysUntil(effective, now);
  return dte < 0 && Math.abs(dte) <= graceDays;
};

const paymentMethods: Array<{
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  description: string;
  disabled?: boolean;
}> = [
  { id: 'CARD', label: 'Credit / Debit Card', icon: <CreditCard className="w-5 h-5" />, description: 'All major cards supported' },
  { id: 'APPLE_PAY', label: 'Apple Pay', icon: <Smartphone className="w-5 h-5" />, description: 'Fast and secure payment' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <Building2 className="w-5 h-5" />, description: 'Direct transfer to our account' },
  { id: 'COD', label: 'Cash on Delivery', icon: <Banknote className="w-5 h-5" />, description: 'Pay when you receive' },
  { id: 'ESCROW', label: 'Escrow (MSquare)', icon: <ShieldCheck className="w-5 h-5" />, description: 'Funds held until delivery is confirmed' },
  { id: 'LC', label: 'Letter of Credit (LC)', icon: <FileText className="w-5 h-5" />, description: 'Enterprise buyers only (bank-issued LC)' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [graceWarning, setGraceWarning] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState({ street: "", city: "", state: "", zipCode: "", country: "Saudi Arabia" });
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "freight">("standard");

  const cart = getResolvedCartItems();
  const itemsTotal = cart.subtotal;
  const tax = itemsTotal * 0.1;
  const standardShippingFee = Math.min(120, Math.max(25, itemsTotal * 0.02));
  const expressShippingFee = Math.min(180, Math.max(60, itemsTotal * 0.04));
  const freightShippingFee = Math.min(240, Math.max(95, itemsTotal * 0.055));
  const shippingFee = shippingMethod === "express" ? expressShippingFee : shippingMethod === "freight" ? freightShippingFee : standardShippingFee;
  const deliveryEstimateDays = shippingMethod === "express" ? 3 : shippingMethod === "freight" ? 9 : 6;
  const insuranceFee = includeInsurance ? itemsTotal * 0.015 : 0;
  const orderTotal = itemsTotal + tax + shippingFee + insuranceFee;
  const destinationCountry =
    addresses.find((a) => a.id === selectedAddressId)?.country || addressDraft.country || "Saudi Arabia";
  const productCompliance = useMemo(
    () => evaluateCartCompliance(cart.items.map((i) => i.product), destinationCountry),
    [cart.items, destinationCountry],
  );
  const productComplianceBlocked = !productCompliance.passed;

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
    const id = session.user.id;
    setCustomerId(id);
    const customer = getCustomerById(id);
    if (!customer) return;
    void runComplianceCheck().then(() => {
      const refreshed = getCustomerById(id);
      if (!refreshed) return;
      const config = getComplianceConfig();
      const graceActive = Boolean(refreshed.complianceDocuments?.some((d) => isExpiredInGrace(d, config.gracePeriodDays)));
      const allowCheckoutDuringGrace = config.limitedOperations.customer.allowCheckout;
      const restrictionLevel = refreshed.restrictionLevel ?? "warning";
      const blocked =
        restrictionLevel === "full_hold" || (restrictionLevel !== "warning" && !(graceActive && allowCheckoutDuringGrace));
      setRestricted(blocked);
      setGraceWarning(
        graceActive && !blocked
          ? "You are within the compliance grace period. Please upload updated documents to avoid purchase restrictions."
          : null,
      );
      setHoldMessage(refreshed.complianceHoldReason ?? (blocked ? "Your account requires document update before purchase." : null));
    });
  }, [router]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.addresses.${customerId}.v1`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Address[];
      if (Array.isArray(parsed)) {
        setAddresses(parsed);
        setSelectedAddressId(parsed[0]?.id ?? null);
      }
    } catch {}
  }, [customerId]);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    const key = `msquare.addresses.${customerId}.v1`;
    window.localStorage.setItem(key, JSON.stringify(addresses));
  }, [addresses, customerId]);

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setOrderError(null);
    setTimeout(() => {
      try {
        if (cart.items.length === 0) throw new Error("Your cart is empty.");
        if (productComplianceBlocked) {
          throw new Error("Product compliance violations detected for destination country rules (SABER/FASAH/category restrictions).");
        }
        const shippingAddress =
          addresses.find((a) => a.id === selectedAddressId) ??
          ({
            id: `addr_${Date.now()}`,
            ...addressDraft,
            street: addressDraft.street || "Customer Address",
            city: addressDraft.city || "Riyadh",
            state: addressDraft.state || "Riyadh",
            zipCode: addressDraft.zipCode || "00000",
            country: addressDraft.country || "Saudi Arabia",
          } satisfies Address);

        const created = createEscrowOrder({
          items: cart.items.map((i) => ({
            id: `oi_${i.productId}`,
            productId: i.productId,
            productName: i.product.name,
            price: i.product.price,
            quantity: i.quantity,
          })),
          totalAmount: orderTotal,
          paymentMethod: selectedMethod,
          insuranceEnabled: includeInsurance,
          customerId: customerId ?? undefined,
          merchantId: cart.merchantId ?? undefined,
          shipping: { methodId: shippingMethod, methodName: shippingMethod === "express" ? "Express" : shippingMethod === "freight" ? "Freight" : "Standard", cost: shippingFee, estimatedDays: deliveryEstimateDays },
          shippingAddress,
        });
        clearCart();
        try {
          window.localStorage.setItem("msquare.lastOrderId.v1", created.id);
        } catch {}
        setIsProcessing(false);
        router.push(`/customer/order-confirmation?orderId=${encodeURIComponent(created.id)}`);
      } catch (e) {
        setIsProcessing(false);
        setOrderError(e instanceof Error ? e.message : "Failed to place order.");
      }
    }, 2000);
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-20">
      <div className="container-max">
        <h1 className="text-3xl font-bold mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Address */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="text-xl font-bold">Shipping Address</h2>
              </div>
              <Card>
                <CardContent className="p-8 space-y-5">
                  {addresses.length > 0 && (
                    <div>
                      <div className="text-sm font-bold text-gray-900 mb-2">Saved addresses</div>
                      <div className="grid grid-cols-1 gap-3">
                        {addresses.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelectedAddressId(a.id)}
                            className={`text-left rounded-2xl border px-4 py-3 ${
                              selectedAddressId === a.id ? "border-primary-200/70 bg-primary-50" : "border-gray-200/60 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="text-sm font-black text-gray-900">{a.street}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {a.city}, {a.state} • {a.country} • {a.zipCode}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-5 py-4">
                    <div className="text-sm font-black text-gray-900">Add a new address</div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                        <input
                          value={addressDraft.street}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, street: e.target.value }))}
                          type="text"
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none bg-white"
                          placeholder="Street, building, unit…"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          value={addressDraft.city}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                          type="text"
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none bg-white"
                          placeholder="e.g., Riyadh"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <input
                          value={addressDraft.state}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))}
                          type="text"
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none bg-white"
                          placeholder="e.g., Riyadh"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                        <input
                          value={addressDraft.zipCode}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, zipCode: e.target.value }))}
                          type="text"
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none bg-white"
                          placeholder="e.g., 00000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                        <input
                          value={addressDraft.country}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, country: e.target.value }))}
                          type="text"
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!customerId) return;
                          if (!addressDraft.street.trim()) return;
                          const addr: Address = {
                            id: `addr_${Math.random().toString(16).slice(2, 10)}`,
                            street: addressDraft.street.trim(),
                            city: addressDraft.city.trim() || "Riyadh",
                            state: addressDraft.state.trim() || "Riyadh",
                            zipCode: addressDraft.zipCode.trim() || "00000",
                            country: addressDraft.country.trim() || "Saudi Arabia",
                          };
                          setAddresses((a) => [addr, ...a]);
                          setSelectedAddressId(addr.id);
                          setAddressDraft({ street: "", city: "", state: "", zipCode: "", country: "Saudi Arabia" });
                        }}
                        disabled={!customerId || !addressDraft.street.trim()}
                      >
                        Save address
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <h2 className="text-xl font-bold">Shipping Method</h2>
              </div>
              <Card>
                <CardContent className="p-8 space-y-4">
                  {[
                    { id: "standard" as const, title: "Standard", desc: "Estimated 6 days", badge: `${standardShippingFee.toFixed(2)} USD` },
                    { id: "express" as const, title: "Express", desc: "Estimated 3 days", badge: `${expressShippingFee.toFixed(2)} USD` },
                    { id: "freight" as const, title: "Freight (Bulk)", desc: "Estimated 9 days", badge: `${freightShippingFee.toFixed(2)} USD` },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setShippingMethod(m.id)}
                      className={`w-full text-left rounded-2xl border-2 px-5 py-4 flex items-center justify-between gap-4 ${
                        shippingMethod === m.id ? "border-primary-600 bg-primary-50/30" : "border-white bg-white hover:border-gray-200"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black text-gray-900">{m.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                      </div>
                      <div className="text-xs font-black text-gray-900 bg-gray-100 rounded-full px-3 py-1">{m.badge}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Payment Method */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <h2 className="text-xl font-bold">Payment Method</h2>
              </div>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => !method.disabled && setSelectedMethod(method.id)}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      selectedMethod === method.id 
                        ? 'border-primary-600 bg-primary-50/30' 
                        : method.disabled ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-white bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${selectedMethod === method.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {method.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{method.label}</p>
                        <p className="text-xs text-gray-500">{method.description}</p>
                      </div>
                    </div>
                    {method.disabled ? (
                      <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded uppercase tracking-wider">Coming Soon</span>
                    ) : (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.id ? 'border-primary-600 bg-primary-600' : 'border-gray-200'
                      }`}>
                        {selectedMethod === method.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Total</span>
                    <span className="font-bold text-gray-900">${itemsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-bold text-gray-900">${shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="font-bold text-gray-900">${tax.toFixed(2)}</span>
                  </div>
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-700">
                      <span> Add Shipment Insurance (+1.5%)</span>
                      <input
                        type="checkbox"
                        checked={includeInsurance}
                        onChange={(event) => setIncludeInsurance(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Insurance fee</span>
                      <span className="font-semibold text-gray-700">${insuranceFee.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <div className="text-right">
                      <p className="text-2xl font-black text-primary-600">${orderTotal.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">USD</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl mb-8 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-gray-400 mt-1" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Payments are secure and encrypted. Your card information is never stored on our servers.
                  </p>
                </div>

                <Button 
                  className="w-full py-4 text-lg font-bold" 
                  size="lg"
                  disabled={isProcessing || restricted || productComplianceBlocked || cart.items.length === 0}
                  onClick={handlePlaceOrder}
                >
                  {cart.items.length === 0
                    ? "Cart empty"
                    : restricted
                      ? "Compliance required"
                      : productComplianceBlocked
                        ? "Product compliance required"
                        : isProcessing
                          ? "Processing..."
                          : "Place Order"}
                </Button>
                {productComplianceBlocked && (
                  <div className="mt-4 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                    <div className="font-black">
                      Product compliance violations ({destinationCountry})
                    </div>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      {productCompliance.violations.map((v, idx) => (
                        <li key={`${v.code}_${idx}`}>
                          {v.productName ? `${v.productName}: ` : ""}
                          {v.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {graceWarning && (
                  <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    {graceWarning}
                  </div>
                )}
                {restricted && (
                  <div className="mt-4 rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                    {holdMessage ?? "Your account requires document update before purchase."}
                  </div>
                )}
                {orderError && (
                  <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    {orderError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
