"use client";

import { mockMerchants, type MerchantStatus, type MockMerchant } from "@/data/mockMerchants";

type AdminSession = { token: string; exp: number; email: string };

const ADMIN_SESSION_KEY = "msquare.admin.session.v1";
const MERCHANTS_KEY = "msquare.admin.merchants.v1";
const USERS_KEY = "msquare.users.v1";

const isBrowser = () => typeof window !== "undefined";
const nowSeconds = () => Math.floor(Date.now() / 1000);

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const loadMerchantsStore = (): MockMerchant[] => {
  if (!isBrowser()) return mockMerchants;
  const existing = safeJsonParse<MockMerchant[]>(window.localStorage.getItem(MERCHANTS_KEY), []);
  if (existing.length > 0) return existing;
  window.localStorage.setItem(MERCHANTS_KEY, JSON.stringify(mockMerchants));
  return mockMerchants;
};

const saveMerchantsStore = (merchants: MockMerchant[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(MERCHANTS_KEY, JSON.stringify(merchants));
};

const syncMerchantToUsers = (merchant: MockMerchant) => {
  if (!isBrowser()) return;
  const users = safeJsonParse<{ merchants: Array<Record<string, unknown>>; customers: Array<Record<string, unknown>> }>(
    window.localStorage.getItem(USERS_KEY),
    { merchants: [], customers: [] },
  );
  const nextMerchants = users.merchants.map((m) => {
    if ((m as any).id !== merchant.id) return m;
    return {
      ...m,
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      email: merchant.email,
      phone: merchant.phone,
      businessType: merchant.businessType,
      commercialRegistrationNumber: merchant.commercialRegistrationNumber,
      bankDetails: merchant.bankDetails,
      storeName: merchant.storeName,
      storeSlug: merchant.storeSlug,
      country: merchant.country,
      city: merchant.city,
      vatNumber: merchant.vatNumber,
      iban: merchant.iban,
      status: merchant.status,
      rejectionReason: merchant.rejectionReason,
      notes: merchant.notes,
      uploadedDocuments: merchant.uploadedDocuments,
      riskChecks: merchant.riskChecks,
    };
  });
  window.localStorage.setItem(USERS_KEY, JSON.stringify({ ...users, merchants: nextMerchants }));
};

export const loginAdmin = (input: { email: string; password: string }) => {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) throw new Error("Email and password are required.");
  if (email !== "admin@msquare.demo" || password !== "admin1234") {
    throw new Error("Invalid admin credentials.");
  }
  const exp = nowSeconds() + 60 * 60 * 24;
  const session: AdminSession = { token: `admin.${Math.random().toString(16).slice(2, 10)}`, exp, email };
  if (isBrowser()) window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const loadAdminSession = (): AdminSession | null => {
  if (!isBrowser()) return null;
  const session = safeJsonParse<AdminSession | null>(window.localStorage.getItem(ADMIN_SESSION_KEY), null);
  if (!session) return null;
  if (session.exp <= nowSeconds()) {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
  return session;
};

export const requireAdmin = () => {
  const session = loadAdminSession();
  if (!session) return { ok: false as const, session: null };
  return { ok: true as const, session };
};

export const logoutAdmin = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const listMerchants = (input?: { query?: string; status?: MerchantStatus | "all" }) => {
  const merchants = loadMerchantsStore();
  const query = input?.query?.trim().toLowerCase();
  const status = input?.status ?? "all";

  return merchants.filter((m) => {
    const matchesStatus = status === "all" ? true : m.status === status;
    if (!matchesStatus) return false;
    if (!query) return true;
    const hay = [
      m.businessName,
      m.ownerName,
      m.email,
      m.phone,
      m.storeName,
      m.storeSlug,
      m.city,
      m.country,
      m.commercialRegistrationNumber,
      m.vatNumber,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
};

export const getMerchantById = (id: string) => {
  const merchants = loadMerchantsStore();
  return merchants.find((m) => m.id === id) ?? null;
};

export const updateMerchant = (id: string, patch: Partial<MockMerchant>) => {
  const merchants = loadMerchantsStore();
  const next = merchants.map((m) => (m.id === id ? { ...m, ...patch } : m));
  saveMerchantsStore(next);
  const updated = next.find((m) => m.id === id) ?? null;
  if (updated) syncMerchantToUsers(updated);
  return updated;
};

export const setMerchantStatus = (input: { id: string; status: MerchantStatus; rejectionReason?: string }) => {
  const merchant = getMerchantById(input.id);
  if (!merchant) throw new Error("Merchant not found.");
  const next: Partial<MockMerchant> = {
    status: input.status,
    rejectionReason: input.status === "rejected" ? input.rejectionReason || "Rejected by admin." : undefined,
  };
  return updateMerchant(input.id, next);
};

export const upsertMerchantFromRegistration = (merchant: MockMerchant) => {
  const merchants = loadMerchantsStore();
  const exists = merchants.some((m) => m.id === merchant.id);
  const next = exists ? merchants.map((m) => (m.id === merchant.id ? merchant : m)) : [merchant, ...merchants];
  saveMerchantsStore(next);
  return merchant;
};

export const seedAdminMerchants = () => {
  loadMerchantsStore();
};
