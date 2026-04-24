"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, 
  ShoppingBag, 
  MapPin,
  LogOut,
  ChevronRight,
  Bell,
  AlertTriangle,
  LifeBuoy,
  FileText,
  Bookmark
} from 'lucide-react';
import { loadSession, logout } from "@/services/authStore";
import { Button } from '@/components/ui/Button';
import { type ComplianceDocument } from '@/data/mockMerchants';
import { getComplianceConfig, getCustomerById, requireAdmin, runComplianceCheck, uploadComplianceDocumentReplacement } from '@/services/adminService';
import {
  getUnreadCountForTargets,
  listMockNotificationsForTargets,
  markAllNotificationsReadForTargets,
  markNotificationRead,
  type MockNotification,
} from "@/services/emailService";

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

const customerMenuItems = [
  { icon: <User className="w-5 h-5" />, label: 'Dashboard', href: '/customer/dashboard' },
  { icon: <ShoppingBag className="w-5 h-5" />, label: 'Orders', href: '/customer/orders' },
  { icon: <FileText className="w-5 h-5" />, label: 'Invoices', href: '/customer/invoices' },
  { icon: <FileText className="w-5 h-5" />, label: 'Documents', href: '/customer/documents' },
  { icon: <Bookmark className="w-5 h-5" />, label: 'Saved merchants', href: '/customer/saved-merchants' },
  { icon: <Bell className="w-5 h-5" />, label: 'Notifications', href: '/customer/notifications' },
  { icon: <LifeBuoy className="w-5 h-5" />, label: 'Support', href: '/customer/support' },
  { icon: <MapPin className="w-5 h-5" />, label: 'Addresses', href: '/customer/addresses' },
  { icon: <User className="w-5 h-5" />, label: 'Profile', href: '/customer/profile' },
];

export const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountPhone, setAccountPhone] = useState<string | null>(null);
  const [restrictionLevel, setRestrictionLevel] = useState<"warning" | "limited_access" | "payout_hold" | "full_hold">("warning");
  const [holdReason, setHoldReason] = useState<string | null>(null);
  const [complianceScore, setComplianceScore] = useState<number>(100);
  const [complianceBadge, setComplianceBadge] = useState<"Good" | "Warning" | "Critical">("Good");
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [graceDays, setGraceDays] = useState(() => getComplianceConfig().gracePeriodDays);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);

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
    setCustomerId(session.user.id);
    setAccountEmail(session.user.email);
    setAccountPhone(session.user.phone ?? null);
  }, [router]);

  const pushToast = (message: string) => {
    const id = `toast_${Math.random().toString(16).slice(2, 10)}`;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  };

  const refreshCompliance = useCallback(() => {
    if (!customerId) return;
    const c = getCustomerById(customerId);
    if (!c) return;
    setRestrictionLevel((c.restrictionLevel ?? "warning") as any);
    setHoldReason(c.complianceHoldReason ?? null);
    setComplianceScore(typeof c.complianceScore === "number" ? c.complianceScore : 100);
    setComplianceBadge((c.complianceBadge ?? "Good") as any);
    setDocuments(c.complianceDocuments ?? []);
    setGraceDays(getComplianceConfig().gracePeriodDays);
    const targets = [accountEmail ?? c.email, accountPhone ?? c.phone].filter(Boolean) as string[];
    setNotifications(listMockNotificationsForTargets({ targets, limit: 8 }));
    setUnreadCount(getUnreadCountForTargets(targets));
  }, [accountEmail, accountPhone, customerId]);

  useEffect(() => {
    if (!customerId) return;
    refreshCompliance();
    void runComplianceCheck().then(() => refreshCompliance());
  }, [customerId, refreshCompliance]);

  const categorized = useMemo(() => {
    const valid = documents.filter((d) => d.status === 'valid');
    const expiringSoon = documents.filter((d) => d.status === 'expiring_soon');
    const expired = documents.filter((d) => d.status === 'expired');
    const underReview = documents.filter((d) => d.status === 'under_review');
    return { valid, expiringSoon, expired, underReview };
  }, [documents]);

  const graceActive = useMemo(() => {
    return documents.some((d) => isExpiredInGrace(d, graceDays));
  }, [documents, graceDays]);

  const openUpload = (doc: ComplianceDocument) => {
    setUploadDocId(doc.id);
    setFileName(`${doc.documentType}.pdf`);
    setIssueDate(doc.issueDate);
    setExpiryDate(doc.expiryDate);
    setUploadOpen(true);
  };

  const submitUpload = async () => {
    if (!customerId || !uploadDocId) return;
    if (!fileName.trim() || !issueDate.trim() || !expiryDate.trim()) return;
    setBusy(true);
    try {
      uploadComplianceDocumentReplacement({
        ownerType: 'customer',
        ownerId: customerId,
        documentId: uploadDocId,
        fileUrl: `/mock/uploads/${customerId}/${encodeURIComponent(fileName.trim())}`,
        issueDate: issueDate.trim(),
        expiryDate: expiryDate.trim(),
      });
      setUploadOpen(false);
      refreshCompliance();
      pushToast('Document uploaded. Under review.');
    } finally {
      setBusy(false);
    }
  };

  const Modal = ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => (busy ? null : setUploadOpen(false))} />
        <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">{title}</div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="container-max">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 space-y-6 lg:sticky lg:top-24 self-start">
            <div className="bg-white p-6 rounded-3xl border border-gray-200/60 shadow-sm shadow-gray-900/5">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold border-2 border-white shadow-sm">
                    SM
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Sarah Miller</p>
                    <p className="text-xs text-gray-500">Premium Member</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    className="p-2 rounded-xl border border-gray-200/60 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 relative"
                    onClick={() => {
                      const c = customerId ? getCustomerById(customerId) : null;
                      const targets = [accountEmail ?? c?.email, accountPhone ?? c?.phone].filter(Boolean) as string[];
                      if (!notificationsOpen) {
                        setNotifications(listMockNotificationsForTargets({ targets, limit: 12 }));
                        markAllNotificationsReadForTargets(targets);
                        setUnreadCount(0);
                      }
                      setNotificationsOpen((o) => !o);
                    }}
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-3 w-[340px] max-w-[85vw] rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/15 overflow-hidden z-50">
                      <div className="p-4 border-b border-gray-100/60 flex items-center justify-between">
                        <div className="text-sm font-black text-gray-900">Notifications</div>
                        <button className="text-xs font-black text-primary-700 hover:text-primary-800" onClick={() => setNotificationsOpen(false)}>
                          Close
                        </button>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto p-3 space-y-2">
                        {notifications.length === 0 ? (
                          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No notifications yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className={`w-full text-left rounded-2xl border px-4 py-3 ${
                                n.readAt ? "border-gray-200/60 bg-white" : "border-primary-200/70 bg-primary-50/40"
                              }`}
                              onClick={() => {
                                markNotificationRead(n.id);
                                setNotifications((items) => items.map((x) => (x.id === n.id ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)));
                              }}
                            >
                              <div className="text-xs font-black text-gray-900">
                                {n.channel.toUpperCase()}
                                {n.subject ? ` • ${n.subject}` : n.title ? ` • ${n.title}` : ""}
                              </div>
                              <div className="text-sm text-gray-700 mt-1 line-clamp-2">{n.message}</div>
                              <div className="text-[11px] text-gray-500 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-3 border-t border-gray-100/60">
                        <Link
                          href="/customer/notifications"
                          className="block rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-center text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          View all notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <nav className="space-y-1">
                {customerMenuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      pathname === item.href 
                        ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ))}
                <button
                  className="flex items-center gap-3 px-4 py-3 w-full text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors mt-4"
                  onClick={() => {
                    logout();
                    router.replace("/customer-login");
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </nav>
            </div>
            
            <div className="bg-gradient-to-br from-primary-700 to-primary-600 p-6 rounded-3xl text-white shadow-lg shadow-primary-600/20">
              <h4 className="font-black mb-2">Need Help?</h4>
              <p className="text-sm text-primary-100 mb-4">Our support team is available 24/7 to assist you.</p>
              <Link
                href="/customer/support"
                className="block w-full bg-white text-primary-700 py-2.5 rounded-2xl text-sm font-bold hover:bg-primary-50 transition-colors text-center"
              >
                Contact Support
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {(restrictionLevel !== "warning" || graceActive) && (
              <div
                className={`mb-6 rounded-3xl border px-5 py-4 ${
                  restrictionLevel === "full_hold" ? "border-red-200/70 bg-red-50" : "border-amber-200/70 bg-amber-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-white border flex items-center justify-center ${
                      restrictionLevel === "full_hold" ? "border-red-200/70 text-red-700" : "border-amber-200/70 text-amber-800"
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-black ${restrictionLevel === "full_hold" ? "text-red-900" : "text-amber-900"}`}>
                      Compliance Status: {complianceBadge} ({complianceScore})
                    </div>
                    <div className={`text-sm mt-1 ${restrictionLevel === "full_hold" ? "text-red-800" : "text-amber-800"}`}>
                      {restrictionLevel === "full_hold"
                        ? holdReason ?? "Your account requires document update before purchase."
                        : graceActive
                          ? "You are within the compliance grace period. Please upload updated documents to avoid purchase restrictions."
                          : holdReason ?? "Your account requires document update before purchase."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pathname === '/customer/dashboard' && (
              <>
                <div className="mb-8 rounded-3xl border border-gray-200/60 bg-white shadow-sm shadow-gray-900/5">
                  <div className="p-6 border-b border-gray-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-gray-900">Documents & Compliance</div>
                      <div className="text-sm text-gray-500">Keep your documents valid to avoid purchase restrictions.</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span
                        className={`rounded-full border px-3 py-1 ${
                          complianceBadge === "Critical"
                            ? "border-red-200/70 bg-red-50 text-red-700"
                            : complianceBadge === "Warning"
                              ? "border-amber-200/70 bg-amber-50 text-amber-800"
                              : "border-green-200/70 bg-green-50 text-green-800"
                        }`}
                      >
                        Compliance {complianceBadge} • {complianceScore}
                      </span>
                      <span className="rounded-full border border-green-200/70 bg-green-50 px-3 py-1 text-green-800">Valid {categorized.valid.length}</span>
                      <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-amber-800">
                        Expiring {categorized.expiringSoon.length}
                      </span>
                      <span className="rounded-full border border-red-200/70 bg-red-50 px-3 py-1 text-red-700">Expired {categorized.expired.length}</span>
                      <span className="rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-gray-700">
                        Under review {categorized.underReview.length}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    {documents.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        No compliance documents found.
                      </div>
                    ) : (
                      documents.map((d) => {
                        const effectiveExpiry = d.overrideExpiry ?? d.expiryDate;
                        const dte = daysUntil(effectiveExpiry);
                        const inGrace = d.status === "expired" && dte < 0 && Math.abs(dte) <= graceDays;
                        const tag =
                          d.status === 'valid'
                            ? 'border-green-200/70 bg-green-50 text-green-800'
                            : d.status === 'expiring_soon'
                              ? 'border-amber-200/70 bg-amber-50 text-amber-800'
                              : d.status === 'expired'
                                ? 'border-red-200/70 bg-red-50 text-red-700'
                                : 'border-gray-200/70 bg-gray-50 text-gray-700';

                        const canUpload = d.status === 'expired' || d.status === 'expiring_soon' || d.status === 'rejected';

                        return (
                          <div key={d.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-gray-900">{d.documentType}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                Issue {d.issueDate} • Expiry {effectiveExpiry}
                                {d.overrideExpiry && (
                                  <>
                                    {" "}
                                    • <span className="font-semibold text-gray-700">Override</span>
                                  </>
                                )}
                                {inGrace && <span className="font-semibold text-gray-700"> (grace)</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${tag}`}>
                                {d.status.replaceAll('_', ' ')}
                              </span>
                              {canUpload && (
                                <Button variant="outline" size="sm" onClick={() => openUpload(d)}>
                                  Upload replacement
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mb-8 rounded-3xl border border-gray-200/60 bg-white shadow-sm shadow-gray-900/5">
                  <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-black text-gray-900">Notification Center</div>
                      <div className="text-sm text-gray-500">Compliance reminders and account updates.</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const c = customerId ? getCustomerById(customerId) : null;
                        const targets = [accountEmail ?? c?.email, accountPhone ?? c?.phone].filter(Boolean) as string[];
                        setNotifications(listMockNotificationsForTargets({ targets, limit: 8 }));
                        pushToast("Notification center refreshed.");
                      }}
                      disabled={!customerId}
                    >
                      Refresh
                    </Button>
                  </div>
                  <div className="p-6 space-y-3">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-gray-900">
                                {n.channel.toUpperCase()}
                                {n.subject ? ` • ${n.subject}` : n.title ? ` • ${n.title}` : ""}
                              </div>
                              <div className="mt-1 text-sm text-gray-700">{n.message}</div>
                            </div>
                            <div className="text-xs font-semibold text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
            {children}
          </main>
        </div>
      </div>

      <Modal open={uploadOpen} title="Upload replacement document">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">File name</div>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="document.pdf"
              disabled={busy}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Issue date</div>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                disabled={busy}
              />
            </div>
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Expiry date</div>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitUpload} disabled={busy || !fileName.trim() || !issueDate.trim() || !expiryDate.trim()}>
              Submit for review
            </Button>
          </div>
        </div>
      </Modal>

      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-[60] space-y-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="max-w-sm rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-gray-900/15"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
