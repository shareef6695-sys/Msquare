"use client";

import type { ExecutiveRole } from "@/data/mockCEOStats";

export type ExecutiveSession = {
  token: string;
  exp: number;
  user: {
    role: ExecutiveRole;
    email: string;
    name: string;
  };
};

const EXEC_SESSION_KEY = "msquare.exec.session.v1";

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

const EXEC_ACCOUNTS: Array<{ role: ExecutiveRole; email: string; password: string; name: string }> = [
  { role: "ceo", email: "ceo@msquare.demo", password: "ceo1234", name: "CEO" },
  { role: "managing_director", email: "md@msquare.demo", password: "md1234", name: "Managing Director" },
  { role: "gm", email: "gm@msquare.demo", password: "gm1234", name: "General Manager" },
  { role: "finance_manager", email: "finance@msquare.demo", password: "finance1234", name: "Finance Manager" },
  { role: "sales_manager", email: "sales@msquare.demo", password: "sales1234", name: "Sales Manager" },
];

export const listExecutiveDemoAccounts = () => {
  return EXEC_ACCOUNTS.map((a) => ({ role: a.role, email: a.email, password: a.password, name: a.name }));
};

export const loadExecutiveSession = (): ExecutiveSession | null => {
  if (!isBrowser()) return null;
  const session = safeJsonParse<ExecutiveSession | null>(window.localStorage.getItem(EXEC_SESSION_KEY), null);
  if (!session) return null;
  if (!session.exp || session.exp <= nowSeconds()) {
    window.localStorage.removeItem(EXEC_SESSION_KEY);
    return null;
  }
  return session;
};

export const logoutExecutive = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(EXEC_SESSION_KEY);
};

export const loginExecutive = (input: { email: string; password: string; role?: ExecutiveRole }) => {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) throw new Error("Email and password are required.");

  const candidate = EXEC_ACCOUNTS.find((a) => a.email === email && (input.role ? a.role === input.role : true));
  if (!candidate || candidate.password !== password) throw new Error("Invalid executive credentials.");

  const exp = nowSeconds() + 60 * 60 * 24;
  const session: ExecutiveSession = {
    token: `exec.${Math.random().toString(16).slice(2, 10)}`,
    exp,
    user: { role: candidate.role, email: candidate.email, name: candidate.name },
  };
  if (isBrowser()) window.localStorage.setItem(EXEC_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const requireExecutive = (allowed?: ExecutiveRole[]) => {
  const session = loadExecutiveSession();
  if (!session) return { ok: false as const, session: null };
  if (allowed && allowed.length > 0 && !allowed.includes(session.user.role)) return { ok: false as const, session: null };
  return { ok: true as const, session };
};

