"use client";

import { type EmailTemplate } from "@/data/emailTemplates";

export type MockEmailPayload = EmailTemplate & {
  to: string;
  from: string;
  sentAt: string;
  meta?: Record<string, unknown>;
};

export type MockEmailResult = { id: string; sentAt: string };

export type MockNotification = {
  id: string;
  channel: "email" | "sms" | "dashboard";
  to: string;
  subject?: string;
  title?: string;
  message: string;
  createdAt: string;
  status: "sent" | "skipped";
  readAt?: string;
  meta?: Record<string, unknown>;
};

const NOTIFICATIONS_KEY = "msquare.notifications.v1";

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const isBrowser = () => typeof window !== "undefined";

const loadNotificationsStore = () => {
  if (!isBrowser()) return [] as MockNotification[];
  return safeJsonParse<MockNotification[]>(window.localStorage.getItem(NOTIFICATIONS_KEY), []);
};

const saveNotificationsStore = (items: MockNotification[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
};

export const listMockNotifications = (input?: { to?: string; limit?: number }) => {
  const all = loadNotificationsStore();
  const to = input?.to?.trim().toLowerCase();
  const filtered = to ? all.filter((n) => n.to === to) : all;
  return filtered.slice(0, input?.limit ?? 50);
};

export const listMockNotificationsForTargets = (input: { targets: string[]; limit?: number }) => {
  const all = loadNotificationsStore();
  const targets = input.targets.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (targets.length === 0) return [];
  return all.filter((n) => targets.includes(n.to)).slice(0, input.limit ?? 50);
};

export const getUnreadCountForTargets = (targets: string[]) => {
  const all = loadNotificationsStore();
  const normalized = targets.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return 0;
  return all.filter((n) => normalized.includes(n.to) && !n.readAt).length;
};

export const markNotificationRead = (id: string) => {
  const all = loadNotificationsStore();
  const now = new Date().toISOString();
  const next = all.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n));
  saveNotificationsStore(next);
  return next.find((n) => n.id === id) ?? null;
};

export const markAllNotificationsReadForTargets = (targets: string[]) => {
  const all = loadNotificationsStore();
  const normalized = targets.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return { updated: 0 };
  const now = new Date().toISOString();
  let updated = 0;
  const next = all.map((n) => {
    if (!normalized.includes(n.to) || n.readAt) return n;
    updated += 1;
    return { ...n, readAt: now };
  });
  saveNotificationsStore(next);
  return { updated };
};

const addNotification = (notification: MockNotification) => {
  const existing = loadNotificationsStore();
  saveNotificationsStore([notification, ...existing].slice(0, 500));
  return notification;
};

export const sendMockEmail = async (input: { to: string; template: EmailTemplate; meta?: Record<string, unknown> }) => {
  const payload: MockEmailPayload = {
    to: input.to.trim().toLowerCase(),
    from: "no-reply@msquare.demo",
    subject: input.template.subject,
    text: input.template.text,
    html: input.template.html,
    sentAt: new Date().toISOString(),
    meta: input.meta,
  };

  console.log("[MSquare Mock Email]", payload);

  const id = `email_${Math.random().toString(16).slice(2, 10)}`;
  addNotification({
    id,
    channel: "email",
    to: payload.to,
    subject: payload.subject,
    message: payload.text,
    createdAt: payload.sentAt,
    status: "sent",
    meta: payload.meta,
  });

  return { id, sentAt: payload.sentAt } satisfies MockEmailResult;
};

export const sendMockSms = async (input: { to: string; message: string; meta?: Record<string, unknown> }) => {
  const to = input.to.trim();
  const createdAt = new Date().toISOString();
  const id = `sms_${Math.random().toString(16).slice(2, 10)}`;
  const payload = { id, to, message: input.message, createdAt, meta: input.meta };
  console.log("[MSquare Mock SMS]", payload);
  addNotification({ id, channel: "sms", to: to.toLowerCase(), message: input.message, createdAt, status: "sent", meta: input.meta });
  return { id, sentAt: createdAt } satisfies MockEmailResult;
};

export const sendDashboardNotification = async (input: { to: string; title: string; message: string; meta?: Record<string, unknown> }) => {
  const to = input.to.trim().toLowerCase();
  const createdAt = new Date().toISOString();
  const id = `dash_${Math.random().toString(16).slice(2, 10)}`;
  const payload = { id, to, title: input.title, message: input.message, createdAt, meta: input.meta };
  console.log("[MSquare Mock Dashboard Notification]", payload);
  addNotification({
    id,
    channel: "dashboard",
    to,
    title: input.title,
    message: input.message,
    createdAt,
    status: "sent",
    meta: input.meta,
  });
  return { id, sentAt: createdAt } satisfies MockEmailResult;
};
