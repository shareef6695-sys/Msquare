"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import {
  listMockNotificationsForTargets,
  markAllNotificationsReadForTargets,
  markNotificationRead,
  type MockNotification,
} from "@/services/emailService";
import { Bell, CheckCircle2 } from "lucide-react";

export default function MerchantNotificationsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [items, setItems] = useState<MockNotification[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "MERCHANT") return;
    setEmail(session.user.email);
    setPhone(session.user.phone ?? null);
  }, []);

  const targets = useMemo(() => [email, phone].filter(Boolean) as string[], [email, phone]);

  useEffect(() => {
    if (targets.length === 0) return;
    setItems(listMockNotificationsForTargets({ targets, limit: 200 }));
  }, [targets, refreshKey]);

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Notifications</h1>
          <p className="text-gray-500">In-app notification center (mock).</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            markAllNotificationsReadForTargets(targets);
            setRefreshKey((k) => k + 1);
          }}
          disabled={targets.length === 0 || unreadCount === 0}
        >
          Mark all read
        </Button>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">All notifications</div>
              <div className="text-xs text-gray-500 mt-1">
                {items.length} total • {unreadCount} unread
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No notifications yet</div>
              <div className="text-sm text-gray-500 mt-2">New orders, approvals, compliance, and disputes appear here.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`w-full text-left rounded-3xl border px-5 py-4 transition-colors ${
                    n.readAt ? "border-gray-200/60 bg-white hover:bg-gray-50" : "border-primary-200/70 bg-primary-50/40 hover:bg-primary-50/60"
                  }`}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setRefreshKey((k) => k + 1);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-gray-900">
                        {n.channel.toUpperCase()}
                        {n.subject ? ` • ${n.subject}` : n.title ? ` • ${n.title}` : ""}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                      <div className="text-[11px] text-gray-500 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    {n.readAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4" />
                        Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800 whitespace-nowrap">
                        Unread
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MerchantLayout>
  );
}

