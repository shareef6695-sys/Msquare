"use client";

import { mockMerchants, type MerchantStatus, type MockMerchant } from "@/data/mockMerchants";

type AdminSession = { token: string; exp: number; email: string };

const ADMIN_SESSION_KEY = "msquare.admin.session.v1";
const MERCHANTS_KEY = "msquare.admin.merchants.v1";
const CUSTOMERS_KEY = "msquare.admin.customers.v1";
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

export type CustomerStatus = "approved" | "rejected" | "suspended" | "pending_verification";
export type MockCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  status: CustomerStatus;
  rejectionReason?: string;
  notes?: string;
  riskChecks: {
    emailVerified: boolean;
    phoneVerified: boolean;
    riskLevel: "Low" | "Medium" | "High";
  };
  createdAt: string;
};

const loadMerchantsStore = (): MockMerchant[] => {
  if (!isBrowser()) return mockMerchants;
  const existing = safeJsonParse<MockMerchant[]>(window.localStorage.getItem(MERCHANTS_KEY), []);
  if (existing.length > 0) return existing;
  window.localStorage.setItem(MERCHANTS_KEY, JSON.stringify(mockMerchants));
  return mockMerchants;
};

const loadCustomersStore = (): MockCustomer[] => {
  if (!isBrowser()) return [];
  const existing = safeJsonParse<MockCustomer[]>(window.localStorage.getItem(CUSTOMERS_KEY), []);
  if (existing.length > 0) return existing;

  const users = safeJsonParse<{ merchants: Array<Record<string, unknown>>; customers: Array<Record<string, unknown>> }>(
    window.localStorage.getItem(USERS_KEY),
    { merchants: [], customers: [] },
  );

  const fromUsers = users.customers
    .filter(Boolean)
    .map((c) => {
      const id = String((c as any).id ?? "");
      if (!id) return null;
      const status = ((c as any).status as CustomerStatus | undefined) ?? "approved";
      const createdAt = String((c as any).createdAt ?? "2026-04-01");
      return {
        id,
        name: String((c as any).name ?? "Customer"),
        email: String((c as any).email ?? "").toLowerCase(),
        phone: String((c as any).phone ?? ""),
        address: (c as any).address ? String((c as any).address) : undefined,
        status,
        rejectionReason: (c as any).rejectionReason ? String((c as any).rejectionReason) : undefined,
        notes: (c as any).notes ? String((c as any).notes) : undefined,
        riskChecks: (c as any).riskChecks ?? { emailVerified: false, phoneVerified: false, riskLevel: "Medium" },
        createdAt,
      } satisfies MockCustomer;
    })
    .filter(Boolean) as MockCustomer[];

  const seeded =
    fromUsers.length > 0
      ? fromUsers
      : ([
          {
            id: "c_demo",
            name: "Demo Buyer",
            email: "customer@msquare.demo",
            phone: "+966 50 111 2222",
            address: "Riyadh, Saudi Arabia",
            status: "approved",
            notes: "Seeded demo customer.",
            riskChecks: { emailVerified: true, phoneVerified: true, riskLevel: "Low" },
            createdAt: "2026-04-01",
          },
        ] satisfies MockCustomer[]);

  window.localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveMerchantsStore = (merchants: MockMerchant[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(MERCHANTS_KEY, JSON.stringify(merchants));
};

const saveCustomersStore = (customers: MockCustomer[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
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

const syncCustomerToUsers = (customer: MockCustomer) => {
  if (!isBrowser()) return;
  const users = safeJsonParse<{ merchants: Array<Record<string, unknown>>; customers: Array<Record<string, unknown>> }>(
    window.localStorage.getItem(USERS_KEY),
    { merchants: [], customers: [] },
  );
  const nextCustomers = users.customers.map((c) => {
    if ((c as any).id !== customer.id) return c;
    return {
      ...c,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status,
      rejectionReason: customer.rejectionReason,
      notes: customer.notes,
      riskChecks: customer.riskChecks,
      createdAt: customer.createdAt,
    };
  });
  window.localStorage.setItem(USERS_KEY, JSON.stringify({ ...users, customers: nextCustomers }));
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

export const listCustomers = (input?: { query?: string; status?: CustomerStatus | "all" }) => {
  const customers = loadCustomersStore();
  const query = input?.query?.trim().toLowerCase();
  const status = input?.status ?? "all";

  return customers.filter((c) => {
    const matchesStatus = status === "all" ? true : c.status === status;
    if (!matchesStatus) return false;
    if (!query) return true;
    const hay = [c.name, c.email, c.phone, c.address ?? "", c.id].join(" ").toLowerCase();
    return hay.includes(query);
  });
};

export const getMerchantById = (id: string) => {
  const merchants = loadMerchantsStore();
  return merchants.find((m) => m.id === id) ?? null;
};

export const getCustomerById = (id: string) => {
  const customers = loadCustomersStore();
  return customers.find((c) => c.id === id) ?? null;
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

export const updateCustomer = (id: string, patch: Partial<MockCustomer>) => {
  const customers = loadCustomersStore();
  const next = customers.map((c) => (c.id === id ? { ...c, ...patch } : c));
  saveCustomersStore(next);
  const updated = next.find((c) => c.id === id) ?? null;
  if (updated) syncCustomerToUsers(updated);
  return updated;
};

export const setCustomerStatus = (input: { id: string; status: CustomerStatus; rejectionReason?: string }) => {
  const customer = getCustomerById(input.id);
  if (!customer) throw new Error("Customer not found.");
  const next: Partial<MockCustomer> = {
    status: input.status,
    rejectionReason: input.status === "rejected" ? input.rejectionReason || "Rejected by admin." : undefined,
  };
  return updateCustomer(input.id, next);
};

export const upsertCustomerFromRegistration = (customer: MockCustomer) => {
  const customers = loadCustomersStore();
  const exists = customers.some((c) => c.id === customer.id);
  const next = exists ? customers.map((c) => (c.id === customer.id ? customer : c)) : [customer, ...customers];
  saveCustomersStore(next);
  return customer;
};

export const seedAdminMerchants = () => {
  loadMerchantsStore();
};

export const seedAdminCustomers = () => {
  loadCustomersStore();
};
