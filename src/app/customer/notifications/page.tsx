"use client";

import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { loadSession } from "@/services/authStore";
import {
  getUnreadCountForTargets,
  listMockNotificationsForTargets,
  markAllNotificationsReadForTargets,
  markNotificationRead,
  type MockNotification,
} from "@/services/emailService";

export default function CustomerNotificationsPage() {
  const [targets, setTargets] = useState<string[]>([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [channel, setChannel] = useState<"all" | "dashboard" | "email" | "sms">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    const out = [session.user.email, session.user.phone].filter(Boolean) as string[];
    setTargets(out);
  }, []);

  const notifications = useMemo(() => {
    refreshKey;
    if (targets.length === 0) return [] as MockNotification[];
    const raw = listMockNotificationsForTargets({ targets, limit: 200 });
    const filtered = raw
      .filter((n) => (channel === "all" ? true : n.channel === channel))
      .filter((n) => (onlyUnread ? !n.readAt : true))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return filtered;
  }, [channel, onlyUnread, refreshKey, targets]);

  const unreadCount = useMemo(() => {
    refreshKey;
    return targets.length ? getUnreadCountForTargets(targets) : 0;
  }, [refreshKey, targets]);

  const columns: Array<DataTableColumn<MockNotification>> = useMemo(
    () => [
      {
        key: "title",
        header: "Notification",
        sortable: true,
        render: (n) => (
          <div className="min-w-0">
            <div className="font-black text-gray-900 truncate">{n.title ?? n.subject ?? "Update"}</div>
            <div className="text-sm text-gray-600 mt-1 line-clamp-2">{n.message}</div>
            <div className="text-xs font-semibold text-gray-500 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
          </div>
        ),
        value: (n) => n.title ?? n.subject ?? n.message,
      },
      {
        key: "channel",
        header: "Channel",
        sortable: true,
        render: (n) => <StatusPill status={n.channel.toUpperCase()} />,
        value: (n) => n.channel,
      },
      {
        key: "status",
        header: "Read",
        sortable: true,
        render: (n) => <StatusPill status={n.readAt ? "READ" : "UNREAD"} />,
        value: (n) => (n.readAt ? 1 : 0),
      },
      {
        key: "actions",
        header: "",
        render: (n) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(n.readAt)}
              onClick={() => {
                markNotificationRead(n.id);
                setRefreshKey((k) => k + 1);
              }}
            >
              Mark read
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <CustomerLayout>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Email, SMS, and dashboard updates for your account.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm shadow-gray-900/5">
            <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Unread</div>
            <div className="mt-1 text-lg font-black text-gray-900">{unreadCount}</div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (targets.length === 0) return;
              markAllNotificationsReadForTargets(targets);
              setRefreshKey((k) => k + 1);
            }}
            disabled={targets.length === 0 || unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-black text-gray-900">Activity feed</div>
                <div className="text-sm text-gray-500">Filter and search your notifications.</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="rounded-xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="all">All channels</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
                <button
                  type="button"
                  onClick={() => setOnlyUnread((v) => !v)}
                  className={clsx(
                    "inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-black transition-colors",
                    onlyUnread ? "border-primary-200/70 bg-primary-50 text-primary-700" : "border-gray-200/60 bg-white text-gray-800 hover:bg-gray-50",
                  )}
                >
                  {onlyUnread ? "Unread only" : "All"}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              rows={notifications}
              columns={columns}
              getRowId={(n) => n.id}
              initialSort={{ key: "title", dir: "asc" }}
              searchPlaceholder="Search notifications…"
              searchKeys={[
                (n) => n.title,
                (n) => n.subject,
                (n) => n.message,
                (n) => n.channel,
                (n) => (n.readAt ? "read" : "unread"),
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
