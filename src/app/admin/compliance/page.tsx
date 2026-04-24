"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  adminApproveComplianceDocument,
  adminOverrideDocumentExpiry,
  adminRejectComplianceDocument,
  adminReleaseComplianceHold,
  adminRequestReplacement,
  getComplianceConfig,
  listComplianceOverview,
  requireAdmin,
  runComplianceCheck,
  setComplianceConfig,
  type ComplianceOwnerType,
} from "@/services/adminService";
import { listMockNotifications, type MockNotification } from "@/services/emailService";
import { AlertTriangle, CheckCircle2, Clock, FileText, ShieldCheck, User } from "lucide-react";

type Tab = "expired" | "expiring" | "pending" | "holds";

const badge = (status: string) => {
  if (status === "expired") return "border-red-200/70 bg-red-50 text-red-700";
  if (status === "expiring_soon") return "border-amber-200/70 bg-amber-50 text-amber-800";
  if (status === "under_review") return "border-gray-200/70 bg-gray-50 text-gray-700";
  if (status === "valid") return "border-green-200/70 bg-green-50 text-green-800";
  if (status === "rejected") return "border-red-200/70 bg-red-50 text-red-700";
  return "border-gray-200/70 bg-gray-50 text-gray-700";
};

export default function AdminCompliancePage() {
  const admin = requireAdmin();
  const actorEmail = admin.ok ? admin.session.email : "admin@msquare.demo";

  const [tab, setTab] = useState<Tab>("expired");
  const [refreshKey, setRefreshKey] = useState(0);
  const [overview, setOverview] = useState(() => listComplianceOverview());
  const [config, setConfig] = useState(() => getComplianceConfig());
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);
  const [notificationChannel, setNotificationChannel] = useState<"all" | "email" | "sms" | "dashboard">("all");
  const [notificationTo, setNotificationTo] = useState("");

  const [filterOwnerType, setFilterOwnerType] = useState<"all" | ComplianceOwnerType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "expired" | "expiring_soon" | "under_review" | "rejected">("all");
  const [filterDocumentType, setFilterDocumentType] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<"all" | "Low" | "Medium" | "High">("all");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selected, setSelected] = useState<null | { ownerType: ComplianceOwnerType; ownerId: string; documentId: string }>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [overrideExpiry, setOverrideExpiry] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const rejectionPresets = [
    "Unclear file",
    "Expired document",
    "Invalid document",
    "Mismatch with business name",
    "Missing signature/stamp",
    "Incorrect format",
  ] as const;

  useEffect(() => {
    setOverview(listComplianceOverview());
    setNotifications(listMockNotifications({ limit: 200 }));
  }, [refreshKey]);

  const pushToast = (messageText: string) => {
    const id = `toast_${Math.random().toString(16).slice(2, 10)}`;
    setToasts((t) => [...t, { id, message: messageText }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  const Modal = ({
    open,
    title,
    children,
    onClose,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">{title}</div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  const runExpiryCheck = async () => {
    setBusy(true);
    try {
      const res = await runComplianceCheck({ actorEmail });
      if (res.remindersSent > 0) pushToast("Expiry reminder sent.");
      if (res.holdsPlaced > 0) pushToast("Account placed on compliance hold.");
      if ((res as any).payoutHoldsApplied > 0) pushToast("Your payouts are temporarily on hold due to compliance requirements.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const approveDoc = async (ownerType: ComplianceOwnerType, ownerId: string, documentId: string) => {
    setBusy(true);
    try {
      await adminApproveComplianceDocument({ ownerType, ownerId, documentId, actorEmail });
      pushToast("Document approved. Account hold released.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const releaseHold = async (ownerType: ComplianceOwnerType, ownerId: string) => {
    setBusy(true);
    try {
      await adminReleaseComplianceHold({ ownerType, ownerId, actorEmail });
      pushToast("Document approved. Account hold released.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!selected) return;
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await adminRejectComplianceDocument({
        ownerType: selected.ownerType,
        ownerId: selected.ownerId,
        documentId: selected.documentId,
        actorEmail,
        reason: reason.trim(),
      });
      setRejectOpen(false);
      setReason("");
      pushToast("Document rejected. User notified.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirmReplacement = async () => {
    if (!selected) return;
    if (!message.trim()) return;
    setBusy(true);
    try {
      await adminRequestReplacement({
        ownerType: selected.ownerType,
        ownerId: selected.ownerId,
        documentId: selected.documentId,
        actorEmail,
        message: message.trim(),
      });
      setReplacementOpen(false);
      setMessage("");
      pushToast("Document request sent successfully.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirmOverride = async () => {
    if (!selected) return;
    if (!overrideExpiry.trim() || !overrideReason.trim()) return;
    setBusy(true);
    try {
      await adminOverrideDocumentExpiry({
        ownerType: selected.ownerType,
        ownerId: selected.ownerId,
        documentId: selected.documentId,
        actorEmail,
        overrideExpiry: overrideExpiry.trim(),
        overrideReason: overrideReason.trim(),
      });
      setOverrideOpen(false);
      setOverrideReason("");
      pushToast("Override applied successfully.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const applyFilters = (rows: typeof overview.allDocs) => {
    return rows.filter((r) => {
      if (filterOwnerType !== "all" && r.ownerType !== filterOwnerType) return false;
      if (filterRisk !== "all" && r.ownerRiskLevel !== filterRisk) return false;
      if (filterDocumentType !== "all" && r.document.documentType !== filterDocumentType) return false;
      if (filterStatus !== "all") {
        const s = r.document.status === "under_review" || r.document.status === "rejected" ? r.document.status : r.computedStatus;
        if (s !== filterStatus) return false;
      }
      return true;
    });
  };

  const expiredRows = applyFilters(overview.expiredDocuments);
  const expiringRows = applyFilters(overview.expiringSoon);
  const pendingRows = applyFilters(overview.pendingReview);

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Compliance</h1>
          <p className="text-gray-500">Monitor document expiry, holds, and pending reviews.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={runExpiryCheck} disabled={busy}>
            Run expiry check
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="text-sm font-black text-gray-900">Compliance score overview</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Merchants avg</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{overview.scoreOverview.merchants.avg}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Good {overview.scoreOverview.merchants.good} • Warning {overview.scoreOverview.merchants.warning} • Critical{" "}
                  {overview.scoreOverview.merchants.critical}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Customers avg</div>
                <div className="mt-1 text-2xl font-black text-gray-900">{overview.scoreOverview.customers.avg}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Good {overview.scoreOverview.customers.good} • Warning {overview.scoreOverview.customers.warning} • Critical{" "}
                  {overview.scoreOverview.customers.critical}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-black text-gray-900">Grace period</div>
            <div className="mt-2 text-sm text-gray-600">Applies after expiry before full hold.</div>
            <div className="mt-4 flex items-center gap-3">
              <select
                className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                value={String(config.gracePeriodDays)}
                onChange={(e) => setConfig((c) => ({ ...c, gracePeriodDays: Number(e.target.value) }))}
                disabled={busy}
              >
                {[7, 15, 30].map((d) => (
                  <option key={d} value={String(d)}>
                    {d} days
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  const next = setComplianceConfig({ gracePeriodDays: config.gracePeriodDays, limitedOperations: config.limitedOperations });
                  setConfig(next);
                  pushToast("Compliance config saved.");
                  refresh();
                }}
                disabled={busy}
              >
                Save
              </Button>
            </div>
            <div className="mt-6">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Limited operations during grace</div>
              <div className="mt-3 space-y-3">
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  <span>Merchant: allow new orders</span>
                  <input
                    type="checkbox"
                    checked={config.limitedOperations.merchant.allowNewOrders}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        limitedOperations: { ...c.limitedOperations, merchant: { ...c.limitedOperations.merchant, allowNewOrders: e.target.checked } },
                      }))
                    }
                    disabled={busy}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  <span>Merchant: allow new products</span>
                  <input
                    type="checkbox"
                    checked={config.limitedOperations.merchant.allowNewProducts}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        limitedOperations: { ...c.limitedOperations, merchant: { ...c.limitedOperations.merchant, allowNewProducts: e.target.checked } },
                      }))
                    }
                    disabled={busy}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  <span>Merchant: allow shipping</span>
                  <input
                    type="checkbox"
                    checked={config.limitedOperations.merchant.allowShipping}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        limitedOperations: { ...c.limitedOperations, merchant: { ...c.limitedOperations.merchant, allowShipping: e.target.checked } },
                      }))
                    }
                    disabled={busy}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  <span>Customer: allow checkout</span>
                  <input
                    type="checkbox"
                    checked={config.limitedOperations.customer.allowCheckout}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        limitedOperations: { ...c.limitedOperations, customer: { ...c.limitedOperations.customer, allowCheckout: e.target.checked } },
                      }))
                    }
                    disabled={busy}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="p-6 border-b border-gray-100/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-lg font-black text-gray-900">Notification center</div>
            <div className="text-sm text-gray-500">All mock email, SMS, and dashboard notifications.</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              className="w-full sm:w-44 rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
              value={notificationChannel}
              onChange={(e) => setNotificationChannel(e.target.value as any)}
            >
              <option value="all">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="dashboard">Dashboard</option>
            </select>
            <input
              value={notificationTo}
              onChange={(e) => setNotificationTo(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
              placeholder="Filter by recipient…"
            />
            <Button
              variant="outline"
              onClick={() => {
                setNotifications(listMockNotifications({ limit: 200 }));
                pushToast("Notification center refreshed.");
              }}
              disabled={busy}
            >
              Refresh
            </Button>
          </div>
        </div>
        <CardContent className="p-6">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No notifications yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase tracking-wider">
                    <th className="py-3 pr-4 font-semibold">Time</th>
                    <th className="py-3 pr-4 font-semibold">Channel</th>
                    <th className="py-3 pr-4 font-semibold">To</th>
                    <th className="py-3 pr-4 font-semibold">Title</th>
                    <th className="py-3 pr-0 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notifications
                    .filter((n) => {
                      if (notificationChannel !== "all" && n.channel !== notificationChannel) return false;
                      const q = notificationTo.trim().toLowerCase();
                      if (q && !n.to.toLowerCase().includes(q)) return false;
                      return true;
                    })
                    .slice(0, 25)
                    .map((n) => (
                      <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 text-xs font-semibold text-gray-600 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                            {n.channel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm font-semibold text-gray-800">{n.to}</td>
                        <td className="py-3 pr-4 text-sm text-gray-700">
                          {n.subject ?? n.title ?? <span className="text-gray-400">—</span>}
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</div>
                        </td>
                        <td className="py-3 pr-0">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
                              n.status === "sent"
                                ? "border-green-200/70 bg-green-50 text-green-800"
                                : "border-amber-200/70 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <select
          className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
          value={filterOwnerType}
          onChange={(e) => setFilterOwnerType(e.target.value as any)}
        >
          <option value="all">All accounts</option>
          <option value="merchant">Merchants</option>
          <option value="customer">Customers</option>
        </select>
        <select
          className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="expired">Expired</option>
          <option value="expiring_soon">Expiring soon</option>
          <option value="under_review">Under review</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as any)}
        >
          <option value="all">All risk levels</option>
          <option value="Low">Low risk</option>
          <option value="Medium">Medium risk</option>
          <option value="High">High risk</option>
        </select>
        <select
          className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
          value={filterDocumentType}
          onChange={(e) => setFilterDocumentType(e.target.value)}
        >
          <option value="all">All document types</option>
          {Array.from(new Set(overview.allDocs.map((d) => d.document.documentType))).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "expired" as const, label: `Expired (${expiredRows.length})`, icon: <AlertTriangle className="w-4 h-4" /> },
          { key: "expiring" as const, label: `Expiring soon (${expiringRows.length})`, icon: <Clock className="w-4 h-4" /> },
          { key: "pending" as const, label: `Pending review (${pendingRows.length})`, icon: <FileText className="w-4 h-4" /> },
          {
            key: "holds" as const,
            label: `Accounts on hold (${overview.onHoldAccounts.merchants.length + overview.onHoldAccounts.customers.length})`,
            icon: <ShieldCheck className="w-4 h-4" />,
          },
        ].map((t) => (
          <button
            key={t.key}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-primary-200/70 bg-primary-50 text-primary-800" : "border-gray-200/60 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "holds" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            ...overview.onHoldAccounts.merchants.map((m) => ({ ownerType: "merchant" as const, ownerId: m.id, name: m.businessName, email: m.email })),
            ...overview.onHoldAccounts.customers.map((c) => ({ ownerType: "customer" as const, ownerId: c.id, name: c.name, email: c.email })),
          ].map((a) => (
            <Card key={`${a.ownerType}:${a.ownerId}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200/70 flex items-center justify-center text-red-700">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-gray-900 truncate">{a.name}</div>
                        <div className="text-xs text-gray-500 truncate">{a.email}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">{a.ownerType}</div>
                  </div>
                  <Button variant="outline" onClick={() => releaseHold(a.ownerType, a.ownerId)} disabled={busy}>
                    Release hold
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
            <div className="text-lg font-black text-gray-900">
              {tab === "expired" ? "Expired documents" : tab === "expiring" ? "Expiring soon" : "Documents pending review"}
            </div>
          </div>
          <CardContent className="p-6 space-y-3">
            {(tab === "expired" ? expiredRows : tab === "expiring" ? expiringRows : pendingRows).length === 0 ? (
              <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No items found.</div>
            ) : (
              (tab === "expired" ? expiredRows : tab === "expiring" ? expiringRows : pendingRows).map((row) => (
                <div
                  key={`${row.ownerType}:${row.ownerId}:${row.document.id}`}
                  className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900">{row.document.documentType}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {row.ownerType}: <span className="font-semibold text-gray-700">{row.ownerName}</span> • {row.ownerEmail}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Issue {row.document.issueDate} • Expiry {row.effectiveExpiryDate}
                      {row.document.overrideExpiry && (
                        <>
                          {" "}
                          • <span className="font-semibold text-gray-700">Override</span>
                        </>
                      )}
                      {typeof row.daysToExpiry === "number" && tab !== "pending" && (
                        <>
                          {" "}
                          • {row.daysToExpiry >= 0 ? `${row.daysToExpiry} days left` : `${Math.abs(row.daysToExpiry)} days overdue`}
                          {row.inGrace && <span className="font-semibold text-gray-700"> (grace)</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${badge(row.computedStatus)}`}>
                      {row.computedStatus.replaceAll("_", " ")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
                        row.ownerRiskLevel === "High"
                          ? "border-red-200/70 bg-red-50 text-red-700"
                          : row.ownerRiskLevel === "Medium"
                            ? "border-amber-200/70 bg-amber-50 text-amber-800"
                            : "border-green-200/70 bg-green-50 text-green-800"
                      }`}
                    >
                      Risk {row.ownerRiskLevel}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
                        row.ownerComplianceBadge === "Critical"
                          ? "border-red-200/70 bg-red-50 text-red-700"
                          : row.ownerComplianceBadge === "Warning"
                            ? "border-amber-200/70 bg-amber-50 text-amber-800"
                            : "border-green-200/70 bg-green-50 text-green-800"
                      }`}
                    >
                      Compliance {row.ownerComplianceBadge} • {row.ownerComplianceScore}
                    </span>
                    {row.document.status === "under_review" && (
                      <Button onClick={() => approveDoc(row.ownerType, row.ownerId, row.document.id)} disabled={busy}>
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected({ ownerType: row.ownerType, ownerId: row.ownerId, documentId: row.document.id });
                        setRejectOpen(true);
                      }}
                      disabled={busy}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected({ ownerType: row.ownerType, ownerId: row.ownerId, documentId: row.document.id });
                        setReplacementOpen(true);
                      }}
                      disabled={busy}
                    >
                      Request replacement
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected({ ownerType: row.ownerType, ownerId: row.ownerId, documentId: row.document.id });
                        setOverrideExpiry(row.effectiveExpiryDate);
                        setOverrideReason("");
                        setOverrideOpen(true);
                      }}
                      disabled={busy}
                    >
                      Override expiry
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={rejectOpen}
        title="Reject document"
        onClose={() => {
          if (busy) return;
          setRejectOpen(false);
          setReason("");
        }}
      >
        <div className="text-sm text-gray-700">Select a reason or enter a custom reason. The user will be notified by email.</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <select
            className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            value={(rejectionPresets as readonly string[]).includes(reason) ? reason : ""}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
          >
            <option value="">Select a reason…</option>
            {rejectionPresets.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Enter custom reason…"
            disabled={busy}
          />
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirmReject} disabled={busy || !reason.trim()}>
            Confirm rejection
          </Button>
        </div>
      </Modal>

      <Modal
        open={replacementOpen}
        title="Request replacement"
        onClose={() => {
          if (busy) return;
          setReplacementOpen(false);
          setMessage("");
        }}
      >
        <div className="text-sm text-gray-700">Ask the user to upload a replacement. The request will be sent by email.</div>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Enter request message…"
          disabled={busy}
        />
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={() => setReplacementOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirmReplacement} disabled={busy || !message.trim()}>
            Send request
          </Button>
        </div>
      </Modal>

      <Modal
        open={overrideOpen}
        title="Admin override"
        onClose={() => {
          if (busy) return;
          setOverrideOpen(false);
          setOverrideReason("");
        }}
      >
        <div className="text-sm text-gray-700">Set a temporary validity date and provide an override reason.</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Override expiry date</div>
            <input
              type="date"
              value={overrideExpiry}
              onChange={(e) => setOverrideExpiry(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              disabled={busy}
            />
          </div>
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Override reason</div>
            <textarea
              rows={4}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Enter override reason…"
              disabled={busy}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirmOverride} disabled={busy || !overrideExpiry.trim() || !overrideReason.trim()}>
            Apply override
          </Button>
        </div>
      </Modal>

      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-[60] space-y-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="max-w-sm rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-gray-900/15"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <div>{t.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
