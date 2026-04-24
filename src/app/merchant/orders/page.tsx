"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { markOrderShipped, seedOrdersIfEmpty } from "@/services/orderStore";
import { requireRole } from "@/services/authStore";
import { getComplianceConfig, getMerchantById } from "@/services/adminService";
import { Order } from "@/types";
import { AlertCircle, PackageCheck, ShieldCheck, Truck } from "lucide-react";

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

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

const badgeClass = (status: Order["status"]) => {
  if (status === "DELIVERED") return "bg-green-50 text-green-700 border-green-200/70";
  if (status === "SHIPPED") return "bg-blue-50 text-blue-700 border-blue-200/70";
  if (status === "PROCESSING") return "bg-amber-50 text-amber-800 border-amber-200/70";
  if (status === "PAID") return "bg-indigo-50 text-indigo-700 border-indigo-200/70";
  if (status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200/70";
  return "bg-gray-50 text-gray-700 border-gray-200/70";
};

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restrictionLevel, setRestrictionLevel] = useState<"warning" | "limited_access" | "payout_hold" | "full_hold">("warning");
  const [shippingAllowed, setShippingAllowed] = useState(true);
  const [teamRole, setTeamRole] = useState<"admin" | "manager" | "viewer">("admin");

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
  }, []);

  useEffect(() => {
    const gate = requireRole("MERCHANT");
    if (!gate.ok) return;
    setTeamRole((gate.session.user.merchantTeamRole ?? "admin") as any);
    const effectiveMerchantId = gate.session.user.merchantParentId ?? gate.session.user.id;
    const merchant = getMerchantById(effectiveMerchantId);
    setRestrictionLevel((merchant?.restrictionLevel ?? "warning") as any);
    const config = getComplianceConfig();
    const graceActive = Boolean(merchant?.complianceDocuments?.some((d) => isExpiredInGrace(d, config.gracePeriodDays)));
    setShippingAllowed(!graceActive || config.limitedOperations.merchant.allowShipping);
  }, []);

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [orders]);

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Orders</h1>
          <p className="text-gray-500">
            Manage fulfillment. Payments are held in escrow and released after delivery confirmation.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-900/5">
          <ShieldCheck className="w-4 h-4 text-primary-700" />
          Escrow protected
        </div>
      </div>

      <div className="space-y-6">
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center mx-auto text-gray-400">
                <Truck className="w-7 h-7" />
              </div>
              <div className="mt-5 text-lg font-black text-gray-900">No orders yet</div>
              <p className="mt-2 text-sm text-gray-500">
                New orders will show up here after customers place orders in the marketplace.
              </p>
            </CardContent>
          </Card>
        ) : (
          sorted.map((order) => {
            const canShip = order.status === "PROCESSING" || order.status === "PAID";
            const isEscrow = order.paymentType === "escrow" || order.paymentMethod === "ESCROW";
            const isPaidInEscrow = isEscrow && order.escrowStatus === "HELD" && order.payoutStatus === "ON_HOLD";
            const isReleased = isEscrow && (order.escrowStatus === "RELEASED" || order.payoutStatus === "RELEASED");
            const hasDispute = order.disputeStatus && order.disputeStatus !== "NONE";
            const hasClaim = order.insuranceClaimStatus && order.insuranceClaimStatus !== "NONE";

            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="p-6 border-b border-gray-100/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm font-black text-gray-900">{order.id}</div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badgeClass(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                      {order.tradeAssurance && (
                        <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                          Trade Assurance
                        </span>
                      )}
                      {order.insuranceEnabled && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                          Insured
                        </span>
                      )}
                      {isPaidInEscrow && (
                        <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                          Escrow held
                        </span>
                      )}
                      {isReleased && (
                        <span className="inline-flex items-center rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                          Released
                        </span>
                      )}
                      {hasDispute && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                          Dispute {order.disputeStatus}
                        </span>
                      )}
                      {hasClaim && (
                        <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                          Claim {order.insuranceClaimStatus}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Created {order.createdAt} • {order.items.length} items • Method{" "}
                      <span className="font-semibold text-gray-700">{order.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Order total</div>
                      <div className="text-base font-black text-gray-900">{formatMoney(order.totalAmount)}</div>
                    </div>
                    {canShip ? (
                      <Button
                        onClick={() => setOrders(markOrderShipped(order.id))}
                        className="whitespace-nowrap"
                        disabled={teamRole === "viewer" || restrictionLevel === "full_hold" || !shippingAllowed}
                        title={
                          teamRole === "viewer"
                            ? "Viewer role cannot update shipment status."
                            : restrictionLevel === "full_hold"
                            ? "Account on hold due to compliance requirements."
                            : !shippingAllowed
                              ? "Shipping is temporarily restricted during the compliance grace period."
                              : undefined
                        }
                      >
                        Mark Shipped
                      </Button>
                    ) : (
                      <Button variant="outline" className="whitespace-nowrap" disabled>
                        {order.status === "SHIPPED"
                          ? "Awaiting delivery"
                          : order.status === "DELIVERED"
                            ? "Completed"
                            : "Locked"}
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="text-sm font-black text-gray-900 mb-3">Items</div>
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{item.productName}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Qty {item.quantity} • {formatMoney(item.price)}
                              </div>
                            </div>
                            <div className="text-sm font-black text-gray-900">
                              {formatMoney(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200/60 bg-gray-50 p-5">
                      <div className="text-sm font-black text-gray-900 mb-4">{isEscrow ? "Escrow Flow" : "LC Flow"}</div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-600">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {isEscrow ? "Funds held in escrow" : "LC initiated"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {isEscrow
                                ? "Payment is secured until the customer confirms delivery."
                                : "Buyer submits LC request and documents for bank review."}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-600">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Ship the order</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Once shipped, the order waits for delivery confirmation or settlement.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl bg-white border flex items-center justify-center ${
                              isReleased ? "border-green-200/70 text-green-700" : "border-gray-200/60 text-gray-600"
                            }`}
                          >
                            <PackageCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {isEscrow ? "Payout released" : "Settlement"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {isEscrow ? (isReleased ? "Released after delivery confirmation." : "Pending confirmation.") : "Pending bank settlement."}
                            </div>
                          </div>
                        </div>
                      </div>
                      {(hasDispute || hasClaim) && (
                        <div className="mt-5 rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-600">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">Protection cases</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {hasDispute ? `Dispute: ${order.disputeStatus}` : "No disputes"} •{" "}
                                {hasClaim ? `Claim: ${order.insuranceClaimStatus}` : "No claims"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </MerchantLayout>
  );
}
