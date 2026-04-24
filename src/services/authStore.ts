"use client";

import type { UserRole } from "@/types";

export type AuthRole = Exclude<UserRole, "ADMIN">;

export type MerchantRegistrationInput = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  businessType: string;
  commercialRegistrationNumber: string;
  bankDetails: string;
  storeName: string;
  storeSlug: string;
  documentFileName?: string;
};

export type CustomerRegistrationInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
};

export type AuthUser = {
  id: string;
  role: AuthRole;
  email: string;
  name: string;
  phone?: string;
  storeSlug?: string;
  storeName?: string;
};

type StoredMerchant = MerchantRegistrationInput & { id: string; passwordHash: string };
type StoredCustomer = CustomerRegistrationInput & { id: string; passwordHash: string };

type Session = {
  token: string;
  user: AuthUser;
  exp: number;
};

const USERS_KEY = "msquare.users.v1";
const SESSION_KEY = "msquare.session.v1";

const isBrowser = () => typeof window !== "undefined";

const b64url = (input: string) => {
  if (!isBrowser()) return input;
  const utf8 = new TextEncoder().encode(input);
  let binary = "";
  utf8.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

const generateJwt = (payload: Record<string, unknown>) => {
  const header = { alg: "none", typ: "JWT" };
  return `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}.`;
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const loadUsers = () => {
  if (!isBrowser()) return { merchants: [] as StoredMerchant[], customers: [] as StoredCustomer[] };
  return safeJsonParse<{ merchants: StoredMerchant[]; customers: StoredCustomer[] }>(
    window.localStorage.getItem(USERS_KEY),
    { merchants: [], customers: [] },
  );
};

const saveUsers = (users: { merchants: StoredMerchant[]; customers: StoredCustomer[] }) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const saveSession = (session: Session) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const loadSession = (): Session | null => {
  if (!isBrowser()) return null;
  const session = safeJsonParse<Session | null>(window.localStorage.getItem(SESSION_KEY), null);
  if (!session) return null;
  if (!session.exp || session.exp <= nowSeconds()) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
};

export const logout = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
};

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const normalizeSlug = (slug: string) =>
  slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const hashPassword = async (password: string) => {
  if (!isBrowser() || !window.crypto?.subtle) return `plain:${password}`;
  const buf = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", buf);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
};

const verifyPassword = async (password: string, stored: string) => {
  if (stored.startsWith("plain:")) return stored === `plain:${password}`;
  const hashed = await hashPassword(password);
  return hashed === stored;
};

const createSessionForUser = (user: AuthUser) => {
  const exp = nowSeconds() + 60 * 60 * 24 * 7;
  const token = generateJwt({ sub: user.id, role: user.role, exp });
  const session: Session = { token, user, exp };
  saveSession(session);
  return session;
};

export const registerMerchant = async (input: MerchantRegistrationInput) => {
  const users = loadUsers();

  const email = input.email.trim().toLowerCase();
  if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
  if (input.password.trim().length < 8) throw new Error("Password must be at least 8 characters.");
  if (!input.businessName.trim()) throw new Error("Business name is required.");
  if (!input.ownerName.trim()) throw new Error("Owner name is required.");
  if (!input.phone.trim()) throw new Error("Phone is required.");
  if (!input.storeName.trim()) throw new Error("Store name is required.");

  const storeSlug = normalizeSlug(input.storeSlug || input.storeName);
  if (!storeSlug) throw new Error("Store slug is required.");

  const emailTaken =
    users.merchants.some((m) => m.email.toLowerCase() === email) ||
    users.customers.some((c) => c.email.toLowerCase() === email);
  if (emailTaken) throw new Error("An account with this email already exists.");

  if (users.merchants.some((m) => normalizeSlug(m.storeSlug) === storeSlug)) {
    throw new Error("Store slug is already taken.");
  }

  const id = `m_${Math.random().toString(16).slice(2, 10)}`;
  const passwordHash = await hashPassword(input.password);
  const stored: StoredMerchant = { ...input, email, storeSlug, id, passwordHash };
  users.merchants = [stored, ...users.merchants];
  saveUsers(users);

  const session = createSessionForUser({
    id,
    role: "MERCHANT",
    email,
    name: input.ownerName.trim(),
    phone: input.phone.trim(),
    storeName: input.storeName.trim(),
    storeSlug,
  });

  return { session };
};

export const registerCustomer = async (input: CustomerRegistrationInput) => {
  const users = loadUsers();

  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) throw new Error("Name is required.");
  if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
  if (!input.phone.trim()) throw new Error("Phone is required.");
  if (input.password.trim().length < 8) throw new Error("Password must be at least 8 characters.");

  const emailTaken =
    users.customers.some((c) => c.email.toLowerCase() === email) ||
    users.merchants.some((m) => m.email.toLowerCase() === email);
  if (emailTaken) throw new Error("An account with this email already exists.");

  const id = `c_${Math.random().toString(16).slice(2, 10)}`;
  const passwordHash = await hashPassword(input.password);
  const stored: StoredCustomer = { ...input, email, id, passwordHash };
  users.customers = [stored, ...users.customers];
  saveUsers(users);

  const session = createSessionForUser({
    id,
    role: "CUSTOMER",
    email,
    name: input.name.trim(),
    phone: input.phone.trim(),
  });

  return { session };
};

export const loginWithEmail = async (input: { email: string; password: string; role: AuthRole }) => {
  const users = loadUsers();
  const email = input.email.trim().toLowerCase();
  if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
  if (!input.password) throw new Error("Password is required.");

  if (input.role === "MERCHANT") {
    const merchant = users.merchants.find((m) => m.email.toLowerCase() === email);
    if (!merchant) throw new Error("No merchant account found for this email.");
    const ok = await verifyPassword(input.password, merchant.passwordHash);
    if (!ok) throw new Error("Incorrect password.");

    const session = createSessionForUser({
      id: merchant.id,
      role: "MERCHANT",
      email,
      name: merchant.ownerName.trim(),
      phone: merchant.phone.trim(),
      storeName: merchant.storeName.trim(),
      storeSlug: merchant.storeSlug,
    });
    return { session };
  }

  const customer = users.customers.find((c) => c.email.toLowerCase() === email);
  if (!customer) throw new Error("No customer account found for this email.");
  const ok = await verifyPassword(input.password, customer.passwordHash);
  if (!ok) throw new Error("Incorrect password.");

  const session = createSessionForUser({
    id: customer.id,
    role: "CUSTOMER",
    email,
    name: customer.name.trim(),
    phone: customer.phone.trim(),
  });
  return { session };
};

export const requireRole = (role: AuthRole) => {
  const session = loadSession();
  if (!session) return { ok: false as const, session: null };
  if (session.user.role !== role) return { ok: false as const, session: null };
  return { ok: true as const, session };
};
