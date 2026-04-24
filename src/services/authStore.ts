"use client";

import type { UserRole } from "@/types";
import {
  getCustomerById,
  getMerchantById,
  upsertCustomerFromRegistration,
  upsertMerchantFromRegistration,
  type CustomerStatus,
  type MockCustomer,
} from "@/services/adminService";
import type { MerchantStatus, MockMerchant, RiskLevel } from "@/data/mockMerchants";

export type AuthRole = Exclude<UserRole, "ADMIN">;

export type MerchantRegistrationInput = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  country: string;
  city: string;
  businessType: string;
  commercialRegistrationNumber: string;
  vatNumber: string;
  iban: string;
  bankDetails: string;
  storeName: string;
  storeSlug: string;
  documentFileName?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};

export type CustomerRegistrationInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
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

type StoredMerchant = MerchantRegistrationInput & {
  id: string;
  passwordHash: string;
  status: MerchantStatus;
  rejectionReason?: string;
  notes?: string;
  uploadedDocuments: Array<{ name: string; url: string }>;
  riskChecks: {
    emailVerified: boolean;
    phoneVerified: boolean;
    crUploaded: boolean;
    bankDetailsProvided: boolean;
    documentsUploaded: boolean;
    riskLevel: RiskLevel;
  };
  createdAt: string;
};
type StoredCustomer = CustomerRegistrationInput & {
  id: string;
  passwordHash: string;
  status: CustomerStatus;
  rejectionReason?: string;
  notes?: string;
  riskChecks: { emailVerified: boolean; phoneVerified: boolean; riskLevel: RiskLevel };
  createdAt: string;
};

type Session = {
  token: string;
  user: AuthUser;
  exp: number;
};

const USERS_KEY = "msquare.users.v1";
const SESSION_KEY = "msquare.session.v1";
const MERCHANT_SIGNUP_KEY = "msquare.signup.merchant.v1";
const CUSTOMER_SIGNUP_KEY = "msquare.signup.customer.v1";

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

type MerchantSignupDraft = {
  step: 1 | 2 | 3 | 4;
  account: { ownerName: string; email: string; phone: string; password: string };
  emailVerification: { code: string; sent: boolean; verified: boolean };
  businessProfile?: Omit<
    MerchantRegistrationInput,
    "ownerName" | "email" | "phone" | "password" | "emailVerified" | "phoneVerified"
  >;
  submitted?: boolean;
};

type CustomerSignupDraft = {
  step: 1 | 2 | 3;
  account: { name: string; email: string; phone: string; password: string; address?: string };
  emailVerification: { code: string; sent: boolean; verified: boolean };
  submitted?: boolean;
};

const loadMerchantDraft = (): MerchantSignupDraft | null => {
  if (!isBrowser()) return null;
  return safeJsonParse<MerchantSignupDraft | null>(window.localStorage.getItem(MERCHANT_SIGNUP_KEY), null);
};

const saveMerchantDraft = (draft: MerchantSignupDraft | null) => {
  if (!isBrowser()) return;
  if (!draft) window.localStorage.removeItem(MERCHANT_SIGNUP_KEY);
  else window.localStorage.setItem(MERCHANT_SIGNUP_KEY, JSON.stringify(draft));
};

const loadCustomerDraft = (): CustomerSignupDraft | null => {
  if (!isBrowser()) return null;
  return safeJsonParse<CustomerSignupDraft | null>(window.localStorage.getItem(CUSTOMER_SIGNUP_KEY), null);
};

const saveCustomerDraft = (draft: CustomerSignupDraft | null) => {
  if (!isBrowser()) return;
  if (!draft) window.localStorage.removeItem(CUSTOMER_SIGNUP_KEY);
  else window.localStorage.setItem(CUSTOMER_SIGNUP_KEY, JSON.stringify(draft));
};

export const getMerchantSignupDraftByEmail = (email: string) => {
  const draft = loadMerchantDraft();
  if (!draft) return null;
  if (draft.account.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  return draft;
};

export const getCustomerSignupDraftByEmail = (email: string) => {
  const draft = loadCustomerDraft();
  if (!draft) return null;
  if (draft.account.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  return draft;
};

export const startMerchantSignup = (input: { ownerName: string; email: string; phone: string; password: string }) => {
  const email = input.email.trim().toLowerCase();
  if (!input.ownerName.trim()) throw new Error("Name is required.");
  if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
  if (!input.phone.trim()) throw new Error("Phone is required.");
  if (input.password.trim().length < 8) throw new Error("Password must be at least 8 characters.");

  const draft: MerchantSignupDraft = {
    step: 2,
    account: { ownerName: input.ownerName.trim(), email, phone: input.phone.trim(), password: input.password },
    emailVerification: { code: "123456", sent: true, verified: false },
  };
  saveMerchantDraft(draft);
  return draft;
};

export const resendMerchantVerificationCode = () => {
  const draft = loadMerchantDraft();
  if (!draft) throw new Error("No signup session found.");
  const next: MerchantSignupDraft = {
    ...draft,
    step: 2,
    emailVerification: { ...draft.emailVerification, sent: true, code: "123456" },
  };
  saveMerchantDraft(next);
  return next;
};

export const verifyMerchantEmail = (code: string) => {
  const draft = loadMerchantDraft();
  if (!draft) throw new Error("No signup session found.");
  if (!draft.emailVerification.sent) throw new Error("Please send a verification code first.");
  if (code.trim() !== draft.emailVerification.code) throw new Error("Invalid verification code.");
  const next: MerchantSignupDraft = {
    ...draft,
    step: 3,
    emailVerification: { ...draft.emailVerification, verified: true },
  };
  saveMerchantDraft(next);
  return next;
};

export const submitMerchantBusinessProfile = async (
  profile: Omit<
    MerchantRegistrationInput,
    "ownerName" | "email" | "phone" | "password" | "emailVerified" | "phoneVerified"
  >,
) => {
  const draft = loadMerchantDraft();
  if (!draft) throw new Error("No signup session found.");
  if (!draft.emailVerification.verified) throw new Error("Email verification required.");

  await registerMerchant({
    ...profile,
    ownerName: draft.account.ownerName,
    email: draft.account.email,
    phone: draft.account.phone,
    password: draft.account.password,
    emailVerified: true,
    phoneVerified: false,
  });

  const next: MerchantSignupDraft = { ...draft, step: 4, submitted: true, businessProfile: profile };
  saveMerchantDraft(next);
  return next;
};

export const startCustomerSignup = (input: { name: string; email: string; phone: string; password: string; address?: string }) => {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) throw new Error("Name is required.");
  if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
  if (!input.phone.trim()) throw new Error("Phone is required.");
  if (input.password.trim().length < 8) throw new Error("Password must be at least 8 characters.");

  const draft: CustomerSignupDraft = {
    step: 2,
    account: { name: input.name.trim(), email, phone: input.phone.trim(), password: input.password, address: input.address?.trim() || undefined },
    emailVerification: { code: "123456", sent: true, verified: false },
  };
  saveCustomerDraft(draft);
  return draft;
};

export const resendCustomerVerificationCode = () => {
  const draft = loadCustomerDraft();
  if (!draft) throw new Error("No signup session found.");
  const next: CustomerSignupDraft = {
    ...draft,
    step: 2,
    emailVerification: { ...draft.emailVerification, sent: true, code: "123456" },
  };
  saveCustomerDraft(next);
  return next;
};

export const verifyCustomerEmailAndCreateAccount = async (code: string) => {
  const draft = loadCustomerDraft();
  if (!draft) throw new Error("No signup session found.");
  if (!draft.emailVerification.sent) throw new Error("Please send a verification code first.");
  if (code.trim() !== draft.emailVerification.code) throw new Error("Invalid verification code.");

  const next: CustomerSignupDraft = {
    ...draft,
    step: 3,
    emailVerification: { ...draft.emailVerification, verified: true },
    submitted: true,
  };
  saveCustomerDraft(next);

  await registerCustomer({
    name: draft.account.name,
    email: draft.account.email,
    phone: draft.account.phone,
    password: draft.account.password,
    address: draft.account.address,
    emailVerified: true,
    phoneVerified: false,
  });

  return next;
};

export const seedDemoAccountsIfMissing = async () => {
  if (!isBrowser()) return;
  const users = loadUsers();

  const demoCustomerEmail = "customer@msquare.demo";
  const demoMerchantEmail = "merchant@msquare.demo";

  const hasDemoCustomer = users.customers.some((c) => c.email.toLowerCase() === demoCustomerEmail);
  const hasDemoMerchant = users.merchants.some((m) => m.email.toLowerCase() === demoMerchantEmail);

  if (!hasDemoCustomer) {
    const id = "c_demo";
    const passwordHash = await hashPassword("customer1234");
    const createdAt = "2026-04-01";
    users.customers = [
      {
        id,
        name: "Demo Buyer",
        email: demoCustomerEmail,
        phone: "+966 50 111 2222",
        password: "",
        passwordHash,
        address: "Riyadh, Saudi Arabia",
        status: "approved",
        notes: "Seeded demo customer.",
        riskChecks: { emailVerified: true, phoneVerified: true, riskLevel: "Low" as RiskLevel },
        createdAt,
      },
      ...users.customers,
    ];

    const customerForAdmin: MockCustomer = {
      id,
      name: "Demo Buyer",
      email: demoCustomerEmail,
      phone: "+966 50 111 2222",
      address: "Riyadh, Saudi Arabia",
      status: "approved",
      notes: "Seeded demo customer.",
      riskChecks: { emailVerified: true, phoneVerified: true, riskLevel: "Low" },
      createdAt,
    };
    upsertCustomerFromRegistration(customerForAdmin);
  }

  if (!hasDemoMerchant) {
    const id = "m_demo";
    const passwordHash = await hashPassword("merchant1234");
    const createdAt = "2026-04-01";
    const uploadedDocuments = [{ name: "Commercial Registration (CR).pdf", url: "/mock/docs/m_demo-cr.pdf" }];
    const riskChecks = {
      emailVerified: true,
      phoneVerified: true,
      crUploaded: true,
      bankDetailsProvided: true,
      documentsUploaded: true,
      riskLevel: "Low" as RiskLevel,
    };

    users.merchants = [
      {
        id,
        businessName: "Demo Trading Co.",
        ownerName: "Demo Seller",
        email: demoMerchantEmail,
        phone: "+966 50 333 4444",
        password: "",
        passwordHash,
        country: "Saudi Arabia",
        city: "Riyadh",
        businessType: "Distributor",
        commercialRegistrationNumber: "CR-DEMO-001",
        vatNumber: "VAT-DEMO-001",
        iban: "SA0000000000000000009999",
        bankDetails: "Bank: Demo Bank • SWIFT: DEMOSAAA • Beneficiary: Demo Trading Co.",
        storeName: "Demo Store",
        storeSlug: "demo-store",
        documentFileName: uploadedDocuments[0].name,
        status: "approved",
        rejectionReason: undefined,
        notes: "Auto-approved demo merchant.",
        uploadedDocuments,
        riskChecks,
        createdAt,
      },
      ...users.merchants,
    ];

    const merchantForAdmin: MockMerchant = {
      id,
      businessName: "Demo Trading Co.",
      ownerName: "Demo Seller",
      email: demoMerchantEmail,
      phone: "+966 50 333 4444",
      country: "Saudi Arabia",
      city: "Riyadh",
      businessType: "Distributor",
      commercialRegistrationNumber: "CR-DEMO-001",
      vatNumber: "VAT-DEMO-001",
      iban: "SA0000000000000000009999",
      bankDetails: "Bank: Demo Bank • SWIFT: DEMOSAAA • Beneficiary: Demo Trading Co.",
      storeName: "Demo Store",
      storeSlug: "demo-store",
      uploadedDocuments,
      status: "approved",
      notes: "Auto-approved demo merchant.",
      riskChecks,
      createdAt,
    };
    upsertMerchantFromRegistration(merchantForAdmin);
  }

  saveUsers(users);
};

export const registerMerchant = async (input: MerchantRegistrationInput) => {
  const users = loadUsers();

  const email = input.email.trim().toLowerCase();
  if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
  if (input.password.trim().length < 8) throw new Error("Password must be at least 8 characters.");
  if (!input.businessName.trim()) throw new Error("Business name is required.");
  if (!input.ownerName.trim()) throw new Error("Owner name is required.");
  if (!input.phone.trim()) throw new Error("Phone is required.");
  if (!input.country.trim()) throw new Error("Country is required.");
  if (!input.city.trim()) throw new Error("City is required.");
  if (!input.storeName.trim()) throw new Error("Store name is required.");
  if (!input.vatNumber.trim()) throw new Error("VAT number is required.");
  if (!input.iban.trim()) throw new Error("IBAN is required.");

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
  const createdAt = new Date().toISOString().slice(0, 10);
  const uploadedDocuments = input.documentFileName
    ? [{ name: input.documentFileName, url: `/mock/uploads/${id}/${encodeURIComponent(input.documentFileName)}` }]
    : [];
  const stored: StoredMerchant = {
    ...input,
    email,
    storeSlug,
    id,
    passwordHash,
    status: "pending_verification",
    uploadedDocuments,
    riskChecks: {
      emailVerified: Boolean(input.emailVerified),
      phoneVerified: Boolean(input.phoneVerified),
      crUploaded: Boolean(input.commercialRegistrationNumber.trim()) && uploadedDocuments.length > 0,
      bankDetailsProvided: Boolean(input.bankDetails.trim()),
      documentsUploaded: uploadedDocuments.length > 0,
      riskLevel: (uploadedDocuments.length > 0 ? "Medium" : "High") as RiskLevel,
    },
    createdAt,
  };
  users.merchants = [stored, ...users.merchants];
  saveUsers(users);

  const merchantForAdmin: MockMerchant = {
    id,
    businessName: input.businessName.trim(),
    ownerName: input.ownerName.trim(),
    email,
    phone: input.phone.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    businessType: input.businessType.trim(),
    commercialRegistrationNumber: input.commercialRegistrationNumber.trim(),
    vatNumber: input.vatNumber.trim(),
    iban: input.iban.trim(),
    bankDetails: input.bankDetails.trim(),
    storeName: input.storeName.trim(),
    storeSlug,
    uploadedDocuments,
    status: "pending_verification",
    notes: "",
    riskChecks: stored.riskChecks,
    createdAt,
  };
  upsertMerchantFromRegistration(merchantForAdmin);

  return { id };
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
  const createdAt = new Date().toISOString().slice(0, 10);
  const stored: StoredCustomer = {
    ...input,
    email,
    id,
    passwordHash,
    status: "approved",
    notes: "",
    riskChecks: {
      emailVerified: Boolean(input.emailVerified),
      phoneVerified: Boolean(input.phoneVerified),
      riskLevel: (input.emailVerified ? "Low" : "Medium") as RiskLevel,
    },
    createdAt,
  };
  users.customers = [stored, ...users.customers];
  saveUsers(users);

  const customerForAdmin: MockCustomer = {
    id,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    address: input.address?.trim() ? input.address.trim() : undefined,
    status: "approved",
    notes: "",
    riskChecks: {
      emailVerified: Boolean(input.emailVerified),
      phoneVerified: Boolean(input.phoneVerified),
      riskLevel: input.emailVerified ? "Low" : "Medium",
    },
    createdAt,
  };
  upsertCustomerFromRegistration(customerForAdmin);

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
    if (!merchant) {
      const draft = getMerchantSignupDraftByEmail(email);
      if (draft) {
        if (!draft.emailVerification.verified) throw new Error("Email verification required. Please verify your email to continue registration.");
        if (draft.step < 4) throw new Error("Profile completion required. Please complete your business profile.");
      }
      throw new Error("No merchant account found for this email.");
    }
    const ok = await verifyPassword(input.password, merchant.passwordHash);
    if (!ok) throw new Error("Incorrect password.");

    const verification = getMerchantById(merchant.id);
    const status = (verification?.status ?? (merchant as any).status ?? "pending_verification") as MerchantStatus;
    if (status !== "approved") {
      const reason = verification?.rejectionReason ?? (merchant as any).rejectionReason;
      if (status === "rejected") throw new Error(reason ? `Rejected: ${reason}` : "Rejected: Contact support.");
      if (status === "suspended") throw new Error("Suspended: Contact support.");
      throw new Error("Pending Verification: Your merchant account is under review.");
    }

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
  if (!customer) {
    const draft = getCustomerSignupDraftByEmail(email);
    if (draft) {
      if (!draft.emailVerification.verified) throw new Error("Email verification required. Please verify your email to finish registration.");
      throw new Error("Account creation in progress. Please refresh and try again.");
    }
    throw new Error("No customer account found for this email.");
  }
  const ok = await verifyPassword(input.password, customer.passwordHash);
  if (!ok) throw new Error("Incorrect password.");

  const verification = getCustomerById(customer.id);
  const status = (verification?.status ?? (customer as any).status ?? "approved") as CustomerStatus;
  if (status !== "approved") {
    const reason = verification?.rejectionReason ?? (customer as any).rejectionReason;
    if (status === "rejected") throw new Error(reason ? `Rejected: ${reason}` : "Rejected: Contact support.");
    if (status === "suspended") throw new Error("Suspended: Contact support.");
    throw new Error("Pending Verification: Your customer account is under review.");
  }

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
