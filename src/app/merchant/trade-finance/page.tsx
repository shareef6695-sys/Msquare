"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { getMerchantById, updateMerchant } from "@/services/adminService";
import { sendDashboardNotification } from "@/services/emailService";
import { loadOrders, seedOrdersIfEmpty } from "@/services/orderStore";
import type { Order } from "@/types";
import { validateLcDocumentPack } from "@/services/lcDocumentValidationService";
import { Banknote, ClipboardList, FileDown, FileSearch, FileText, ShieldCheck } from "lucide-react";

type LcUiState = Record<
  string,
  {
    uploaded: boolean;
    status: string;
    lastAction?: string;
    fileName?: string;
    invoiceUrl?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    shipmentDate?: string;
    certificateText?: string;
    insuranceCoveragePercent?: number;
  }
>;

const LC_STATE_KEY = "msquare.lcState.v1";

const openPrintableDocument = (input: { html: string; title: string }) => {
  const w = window.open("", "_blank", "noopener,noreferrer,width=980,height=720");
  if (!w) return;
  w.document.open();
  w.document.write(input.html);
  w.document.close();
  w.document.title = input.title;
  window.setTimeout(() => {
    w.focus();
    w.print();
  }, 250);
};

export default function MerchantTradeFinancePage() {
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lcState, setLcState] = useState<LcUiState>({});
  const [ibanDraft, setIbanDraft] = useState("");
  const [bankDetailsDraft, setBankDetailsDraft] = useState("");
  const [bankSavedToast, setBankSavedToast] = useState<string | null>(null);

  useEffect(() => {
    setOrders(seedOrdersIfEmpty());
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    const id = session.user.merchantParentId ?? session.user.id;
    setMerchantId(id);
    setOrders(loadOrders());
  }, []);

  const merchant = useMemo(() => (merchantId ? getMerchantById(merchantId) : null), [merchantId]);

  useEffect(() => {
    if (!merchant) return;
    setIbanDraft(merchant.iban ?? "");
    setBankDetailsDraft(merchant.bankDetails ?? "");
  }, [merchant]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LC_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LcUiState;
      if (parsed && typeof parsed === "object") setLcState(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LC_STATE_KEY, JSON.stringify(lcState));
  }, [lcState]);

  const lcOrders = useMemo(() => {
    const mine = merchantId ? orders.filter((o) => o.merchantId === merchantId) : [];
    return mine
      .filter((o) => o.paymentMethod === "LC" || o.paymentType === "lc")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [merchantId, orders]);

  const counts = useMemo(() => {
    const total = lcOrders.length;
    const under = lcOrders.filter((o) => (o.lcStatus ?? "DRAFT") === "UNDER_REVIEW" || (o.lcStatus ?? "DRAFT") === "DRAFT").length;
    const approved = lcOrders.filter((o) => (o.lcStatus ?? "DRAFT") === "APPROVED").length;
    const settled = lcOrders.filter((o) => (o.lcStatus ?? "DRAFT") === "SETTLED").length;
    return { total, under, approved, settled };
  }, [lcOrders]);

  const saveBankDetails = () => {
    if (!merchantId) return;
    const iban = ibanDraft.trim();
    const bankDetails = bankDetailsDraft.trim();
    const cur = getMerchantById(merchantId);
    if (!cur) return;
    updateMerchant(merchantId, {
      iban,
      bankDetails,
      riskChecks: { ...cur.riskChecks, bankDetailsProvided: Boolean(iban) },
    });
    setBankSavedToast("Bank details saved.");
    window.setTimeout(() => setBankSavedToast(null), 2500);
  };

  const notifyAdmin = async (order: Order, message: string) => {
    await sendDashboardNotification({
      to: "admin@msquare.demo",
      title: "Trade finance update",
      message,
      meta: { event: "trade_finance", orderId: order.id, merchantId: order.merchantId },
    });
  };

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Trade Finance</h1>
          <p className="text-gray-500">
            Centralize LC orders, documents, and approvals for enterprise buyers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-900/5">
          <span className="h-2 w-2 rounded-full bg-primary-500" />
          LC workflow dashboard
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-primary-50 text-primary-700 border-primary-200/60">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-gray-900">LC Requests</div>
                <div className="text-xs text-gray-500 mt-1">{counts.total} LC orders</div>
              </div>
              <Link href="/merchant/lc-requests">
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-blue-50 text-blue-700 border-blue-200/60">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-gray-900">LC Documents</div>
                <div className="text-xs text-gray-500 mt-1">Upload + validate packs</div>
              </div>
              <a href="#lc-documents">
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-amber-50 text-amber-800 border-amber-200/60">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-gray-900">LC Status</div>
                <div className="text-xs text-gray-500 mt-1">
                  {counts.under} under review • {counts.approved} approved
                </div>
              </div>
              <a href="#lc-status">
                <Button variant="outline" size="sm">
                  Track
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-200/60">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-gray-900">Bank Details</div>
                <div className="text-xs text-gray-500 mt-1">Beneficiary + SWIFT</div>
              </div>
              <a href="#bank-details">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-black text-gray-900">LC Requests</div>
              <div className="text-sm text-gray-500 mt-1">LC orders for your store (mock).</div>
            </div>
            <Link href="/merchant/lc-requests">
              <Button variant="outline" className="w-full sm:w-auto">
                <FileSearch className="w-4 h-4 mr-2" />
                Open LC requests
              </Button>
            </Link>
          </div>
          <CardContent className="p-6">
            {lcOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                <div className="text-lg font-black text-gray-900">No LC orders yet</div>
                <div className="text-sm text-gray-500 mt-2">LC orders appear when buyers select LC at checkout.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {lcOrders.slice(0, 6).map((o) => (
                  <div key={o.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900 break-all">{o.id}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {o.createdAt} • {o.items.length} items • LC status: {(o.lcStatus ?? "DRAFT").replaceAll("_", " ")}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {o.invoices?.proformaInvoiceHtml && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPrintableDocument({ html: o.invoices?.proformaInvoiceHtml ?? "", title: `Proforma Invoice - ${o.id}` })}
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Proforma
                          </Button>
                        )}
                        <Link href={`/merchant/orders/${o.id}`}>
                          <Button variant="outline" size="sm">
                            View order
                          </Button>
                        </Link>
                        <a href="#lc-documents">
                          <Button size="sm">Manage docs</Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                {lcOrders.length > 6 && (
                  <div className="text-xs text-gray-500">
                    Showing 6 of {lcOrders.length}. Open LC requests to view all.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">Actions</div>
            <div className="text-sm text-gray-500 mt-1">Shortcuts for day-to-day trade finance tasks.</div>
          </div>
          <CardContent className="p-6 space-y-3">
            <a href="#bank-details">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Banknote className="w-4 h-4" />
                Update bank details
              </Button>
            </a>
            <a href="#lc-documents">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="w-4 h-4" />
                Upload LC documents
              </Button>
            </a>
            <a href="#lc-status">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ShieldCheck className="w-4 h-4" />
                Review LC status
              </Button>
            </a>
            <Link href="/merchant/notifications">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileSearch className="w-4 h-4" />
                View notifications
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div id="lc-documents" className="mt-8">
        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">LC Documents + Validation</div>
            <div className="text-sm text-gray-500 mt-1">Upload document packs and validate against common UCP 600 discrepancies.</div>
          </div>
          <CardContent className="p-6">
            {lcOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">
                No LC orders to manage.
              </div>
            ) : (
              <div className="space-y-4">
                {lcOrders.map((order) => {
                  const lc = lcState[order.id] ?? { uploaded: false, status: "Draft pending" };
                  const hasData = Boolean(
                    lc.fileName ||
                      lc.invoiceUrl ||
                      lc.invoiceNumber ||
                      lc.invoiceDate ||
                      lc.shipmentDate ||
                      lc.certificateText ||
                      lc.insuranceCoveragePercent !== undefined,
                  );
                  const validation = hasData ? validateLcDocumentPack(order, lc) : null;

                  return (
                    <details key={order.id} className="rounded-3xl border border-gray-200/60 bg-white">
                      <summary className="cursor-pointer list-none p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-gray-900 break-all">{order.id}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              LC status: {(order.lcStatus ?? "DRAFT").replaceAll("_", " ")} • Uploaded: {lc.uploaded ? "Yes" : "No"}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {validation ? (
                              validation.passed ? (
                                <span className="inline-flex items-center rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                                  Validated
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50 px-3 py-1 text-xs font-black text-red-800">
                                  Discrepancies {validation.errors.length + validation.warnings.length}
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                                Awaiting details
                              </span>
                            )}
                            <Link href={`/merchant/orders/${order.id}`}>
                              <Button variant="outline" size="sm">
                                View order
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </summary>

                      <div className="px-5 pb-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 p-4">
                            <div className="text-sm font-black text-gray-900">Upload pack</div>
                            <div className="text-xs text-gray-500 mt-1">PDF or zip/rar</div>
                            <div className="mt-3">
                              <input
                                id={`lc-pack-${order.id}`}
                                type="file"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  setLcState((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      ...prev[order.id],
                                      uploaded: true,
                                      status: prev[order.id]?.status ?? "Documents uploaded",
                                      lastAction: "Merchant uploaded pack",
                                      fileName: file.name,
                                    },
                                  }));
                                }}
                              />
                              <label
                                htmlFor={`lc-pack-${order.id}`}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                                Choose file
                              </label>
                              <div className="mt-2 text-xs text-gray-500 break-all">{lc.fileName ? `Selected: ${lc.fileName}` : "No file selected"}</div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 p-4">
                            <div className="text-sm font-black text-gray-900">Invoice link</div>
                            <div className="text-xs text-gray-500 mt-1">Optional URL for sharing with buyer/bank.</div>
                            <input
                              value={lc.invoiceUrl ?? ""}
                              onChange={(e) =>
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: { ...prev[order.id], invoiceUrl: e.target.value },
                                }))
                              }
                              className="mt-3 w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs font-black text-gray-700 mb-1">Invoice number</div>
                            <input
                              value={lc.invoiceNumber ?? ""}
                              onChange={(e) =>
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: { ...prev[order.id], invoiceNumber: e.target.value },
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                              placeholder="e.g., INV-2026-000123"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-700 mb-1">Invoice date</div>
                            <input
                              value={lc.invoiceDate ?? ""}
                              onChange={(e) =>
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: { ...prev[order.id], invoiceDate: e.target.value },
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-700 mb-1">Shipment date</div>
                            <input
                              value={lc.shipmentDate ?? ""}
                              onChange={(e) =>
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: { ...prev[order.id], shipmentDate: e.target.value },
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-700 mb-1">Insurance coverage (%)</div>
                            <input
                              value={lc.insuranceCoveragePercent?.toString() ?? ""}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: { ...prev[order.id], insuranceCoveragePercent: Number.isFinite(n) ? n : undefined },
                                }));
                              }}
                              inputMode="decimal"
                              className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                              placeholder="e.g., 110"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-xs font-black text-gray-700 mb-1">Certificate wording</div>
                            <textarea
                              value={lc.certificateText ?? ""}
                              onChange={(e) =>
                                setLcState((prev) => ({
                                  ...prev,
                                  [order.id]: { ...prev[order.id], certificateText: e.target.value },
                                }))
                              }
                              rows={3}
                              className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                              placeholder={`Include wording and reference ${order.id}`}
                            />
                          </div>
                        </div>

                        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {validation.errors.length > 0 && (
                              <div className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                                <div className="font-black">Bank discrepancies</div>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                  {validation.errors.map((f, idx) => (
                                    <li key={`${f.code}_${idx}`}>{f.message}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {validation.warnings.length > 0 && (
                              <div className="rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                                <div className="font-black">Warnings</div>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                  {validation.warnings.map((f, idx) => (
                                    <li key={`${f.code}_${idx}`}>{f.message}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <Button
                            className="w-full sm:w-auto"
                            disabled={!validation?.passed}
                            onClick={async () => {
                              setLcState((prev) => ({
                                ...prev,
                                [order.id]: { ...prev[order.id], lastAction: "Submitted to admin for review" },
                              }));
                              await notifyAdmin(order, `Merchant submitted LC document pack for review: ${order.id}.`);
                            }}
                          >
                            Submit for admin review
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={async () => {
                              await notifyAdmin(order, `Merchant requested LC status update for order ${order.id}.`);
                            }}
                          >
                            Request status update
                          </Button>
                        </div>
                        {!validation?.passed && hasData && (
                          <div className="mt-2 text-xs text-gray-500">Fix discrepancies to enable “Submit for admin review”.</div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="lc-status" className="mt-8">
        <Card>
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">LC Status</div>
            <div className="text-sm text-gray-500 mt-1">Track bank milestones per order (mock).</div>
          </div>
          <CardContent className="p-6">
            {lcOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">
                No LC statuses to track.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {lcOrders.map((o) => (
                  <div key={o.id} className="rounded-3xl border border-gray-200/60 bg-white p-5">
                    <div className="text-sm font-black text-gray-900 break-all">{o.id}</div>
                    <div className="text-xs text-gray-500 mt-1">Current: {(o.lcStatus ?? "DRAFT").replaceAll("_", " ")}</div>
                    <div className="mt-4 space-y-2">
                      {["DRAFT", "UNDER_REVIEW", "APPROVED", "SETTLED"].map((s) => (
                        <div key={s} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">{s.replaceAll("_", " ")}</div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest ${
                              (o.lcStatus ?? "DRAFT") === s ? "text-primary-700" : "text-gray-400"
                            }`}
                          >
                            {(o.lcStatus ?? "DRAFT") === s ? "Current" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="bank-details" className="mt-8">
        <Card>
          <div className="p-6 border-b border-gray-100/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-black text-gray-900">Bank Details</div>
              <div className="text-sm text-gray-500 mt-1">Used for beneficiary and settlement instructions (mock).</div>
            </div>
            <div className="flex items-center gap-2">
              {bankSavedToast && (
                <span className="inline-flex items-center rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-xs font-black text-green-800">
                  {bankSavedToast}
                </span>
              )}
              <Button onClick={saveBankDetails} className="w-full md:w-auto">
                Save
              </Button>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-black text-gray-700 mb-1">IBAN</div>
              <input
                value={ibanDraft}
                onChange={(e) => setIbanDraft(e.target.value)}
                className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                placeholder="SA..."
              />
              <div className="text-xs text-gray-500 mt-2">Keep beneficiary name consistent with your commercial registration.</div>
            </div>
            <div>
              <div className="text-xs font-black text-gray-700 mb-1">Bank / SWIFT / Beneficiary</div>
              <textarea
                value={bankDetailsDraft}
                onChange={(e) => setBankDetailsDraft(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200/70 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                placeholder="Bank: ... • SWIFT: ... • Beneficiary: ..."
              />
              <div className="text-xs text-gray-500 mt-2 break-all">Current: {merchant?.bankDetails ?? "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
