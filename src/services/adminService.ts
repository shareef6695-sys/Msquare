"use client";

import {
  mockMerchants,
  type ComplianceDocument,
  type ComplianceDocumentImportance,
  type ComplianceNotificationChannel,
  type ComplianceReminderHistoryItem,
  type ComplianceReminderType,
  type ComplianceRestrictionLevel,
  type ComplianceDocumentStatus,
  type ComplianceDocumentType,
  type ComplianceStatus,
  type MerchantStatus,
  type MockMerchant,
  type RiskLevel,
  type TrustTier,
} from "@/data/mockMerchants";
import {
  buildAccountHoldPlacedEmail,
  buildAccountHoldReleasedEmail,
  buildDocumentExpiredEmail,
  buildDocumentExpiryReminderEmail,
  buildDocumentRejectedEmail,
  buildDocumentReplacementRequestedEmail,
  buildPayoutHoldEmail,
} from "@/data/emailTemplates";
import { sendDashboardNotification, sendMockEmail, sendMockSms } from "@/services/emailService";

type AdminSession = { token: string; exp: number; email: string };

const ADMIN_SESSION_KEY = "msquare.admin.session.v1";
const MERCHANTS_KEY = "msquare.admin.merchants.v1";
const CUSTOMERS_KEY = "msquare.admin.customers.v1";
const AUDIT_LOG_KEY = "msquare.admin.auditLog.v1";
const USERS_KEY = "msquare.users.v1";
const COMPLIANCE_CONFIG_KEY = "msquare.compliance.config.v1";

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
  complianceStatus?: ComplianceStatus;
  complianceHold?: boolean;
  complianceHoldSince?: string;
  complianceHoldReason?: string;
  complianceDocuments?: ComplianceDocument[];
  complianceScore?: number;
  complianceBadge?: "Good" | "Warning" | "Critical";
  restrictionLevel?: ComplianceRestrictionLevel;
  complianceRiskLevel?: RiskLevel;
  riskChecks: {
    emailVerified: boolean;
    phoneVerified: boolean;
    riskLevel: RiskLevel;
  };
  createdAt: string;
};

export type VerificationChecks = {
  commercialRegistration: boolean;
  vatRegistration: boolean;
  bankAccountOwnership: boolean;
  beneficialOwner: boolean;
};

export const trustTierLabel = (tier: TrustTier) => {
  if (tier === "factory_verified") return "Factory verified";
  if (tier === "gold_supplier") return "Gold supplier";
  return "Verified";
};

const isPassingDocStatus = (status: ComplianceDocument["status"]) => status === "valid" || status === "expiring_soon";

const hasPassingDoc = (docs: ComplianceDocument[], type: ComplianceDocumentType) =>
  docs.some((d) => d.documentType === type && isPassingDocStatus(d.status));

export const getMerchantVerificationChecks = (merchant: MockMerchant): VerificationChecks => {
  const docs = merchant.complianceDocuments ?? [];
  return {
    commercialRegistration: Boolean(merchant.commercialRegistrationNumber?.trim()) && hasPassingDoc(docs, "Commercial Registration Certificate"),
    vatRegistration: Boolean(merchant.vatNumber?.trim()) && hasPassingDoc(docs, "VAT Certificate"),
    bankAccountOwnership: Boolean(merchant.iban?.trim()) && hasPassingDoc(docs, "Bank Letter / IBAN Certificate"),
    beneficialOwner: Boolean(merchant.ownerName?.trim()) && hasPassingDoc(docs, "Owner ID / National ID"),
  };
};

export const getCustomerVerificationChecks = (customer: MockCustomer): VerificationChecks => {
  const docs = customer.complianceDocuments ?? [];
  return {
    commercialRegistration: hasPassingDoc(docs, "Commercial Registration Certificate"),
    vatRegistration: hasPassingDoc(docs, "VAT Certificate"),
    bankAccountOwnership: hasPassingDoc(docs, "Bank Letter / IBAN Certificate"),
    beneficialOwner: hasPassingDoc(docs, "Owner ID / National ID"),
  };
};

export const getMerchantTrustTier = (merchant: MockMerchant): TrustTier | null => {
  if (merchant.trustTierOverride) return merchant.trustTierOverride;
  const checks = getMerchantVerificationChecks(merchant);
  const all = Object.values(checks).every(Boolean);
  if (!all) return null;
  const docs = merchant.complianceDocuments ?? [];
  if (hasPassingDoc(docs, "Chamber of Commerce Certificate") || hasPassingDoc(docs, "Authorized Signatory Document")) return "factory_verified";
  if ((merchant.complianceScore ?? 0) >= 95 && merchant.riskChecks.riskLevel === "Low") return "gold_supplier";
  return "verified";
};

export const getCustomerTrustTier = (customer: MockCustomer): TrustTier | null => {
  const checks = getCustomerVerificationChecks(customer);
  const all = Object.values(checks).every(Boolean);
  return all ? "verified" : null;
};

const startOfDayUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export type ComplianceConfig = {
  gracePeriodDays: number;
  limitedOperations: {
    merchant: { allowNewOrders: boolean; allowNewProducts: boolean; allowShipping: boolean };
    customer: { allowCheckout: boolean };
  };
};

const defaultComplianceConfig: ComplianceConfig = {
  gracePeriodDays: 15,
  limitedOperations: {
    merchant: { allowNewOrders: true, allowNewProducts: false, allowShipping: true },
    customer: { allowCheckout: false },
  },
};

export const getComplianceConfig = (): ComplianceConfig => {
  if (!isBrowser()) return defaultComplianceConfig;
  const raw = safeJsonParse<Partial<ComplianceConfig> | null>(window.localStorage.getItem(COMPLIANCE_CONFIG_KEY), null);
  if (!raw) return defaultComplianceConfig;
  const gracePeriodDays = typeof raw.gracePeriodDays === "number" ? raw.gracePeriodDays : defaultComplianceConfig.gracePeriodDays;
  return {
    gracePeriodDays,
    limitedOperations: {
      merchant: { ...defaultComplianceConfig.limitedOperations.merchant, ...(raw.limitedOperations?.merchant ?? {}) },
      customer: { ...defaultComplianceConfig.limitedOperations.customer, ...(raw.limitedOperations?.customer ?? {}) },
    },
  };
};

export const setComplianceConfig = (patch: Partial<ComplianceConfig>) => {
  if (!isBrowser()) return getComplianceConfig();
  const next: ComplianceConfig = {
    ...getComplianceConfig(),
    ...patch,
    limitedOperations: {
      merchant: { ...getComplianceConfig().limitedOperations.merchant, ...(patch.limitedOperations?.merchant ?? {}) },
      customer: { ...getComplianceConfig().limitedOperations.customer, ...(patch.limitedOperations?.customer ?? {}) },
    },
  };
  window.localStorage.setItem(COMPLIANCE_CONFIG_KEY, JSON.stringify(next));
  return next;
};

const daysUntil = (expiryDate: string, now = new Date()) => {
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const diffMs = startOfDayUtc(expiry) - startOfDayUtc(now);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const getEffectiveExpiryDate = (doc: ComplianceDocument) => doc.overrideExpiry ?? doc.expiryDate;

const inferImportance = (documentType: ComplianceDocumentType): ComplianceDocumentImportance => {
  if (documentType === "Commercial Registration Certificate" || documentType === "Owner ID / National ID") return "critical";
  if (documentType === "VAT Certificate" || documentType === "Bank Letter / IBAN Certificate") return "medium";
  return "low";
};

const normalizeDocument = (doc: ComplianceDocument): ComplianceDocument => {
  const importance = doc.importance ?? inferImportance(doc.documentType);
  const reminderHistory = Array.isArray(doc.reminderHistory) ? doc.reminderHistory : [];
  return { ...doc, importance, reminderHistory };
};

const computeDocumentStatus = (doc: ComplianceDocument, now = new Date()): ComplianceDocumentStatus => {
  if (doc.status === "rejected" || doc.status === "under_review") return doc.status;
  const d = daysUntil(getEffectiveExpiryDate(doc), now);
  if (d <= 0) return "expired";
  if (d <= 30) return "expiring_soon";
  return "valid";
};

const computeComplianceScore = (docs: ComplianceDocument[], now: Date, graceDays: number) => {
  let score = 100;
  for (const d of docs) {
    const importance = d.importance ?? inferImportance(d.documentType);
    const effective = getEffectiveExpiryDate(d);
    const dte = daysUntil(effective, now);
    const inGrace = dte < 0 && Math.abs(dte) <= graceDays;
    const status = computeDocumentStatus(d, now);

    const expiredPenalty = importance === "critical" ? 70 : importance === "medium" ? 40 : 15;
    const expiringPenalty = importance === "critical" ? 15 : importance === "medium" ? 8 : 3;
    const underReviewPenalty = importance === "critical" ? 12 : importance === "medium" ? 8 : 5;
    const rejectedPenalty = importance === "critical" ? 25 : importance === "medium" ? 18 : 10;

    if (status === "expired") score -= inGrace ? Math.floor(expiredPenalty / 2) : expiredPenalty;
    if (status === "expiring_soon") score -= expiringPenalty;
    if (status === "under_review") score -= underReviewPenalty;
    if (status === "rejected") score -= rejectedPenalty;
  }
  return Math.max(0, Math.min(100, score));
};

const evaluateRestrictions = (ownerType: ComplianceOwnerType, docs: ComplianceDocument[], now: Date, config: ComplianceConfig) => {
  const graceDays = config.gracePeriodDays;
  const expired = docs
    .map((d) => {
      const effective = getEffectiveExpiryDate(d);
      const dte = daysUntil(effective, now);
      const status = computeDocumentStatus(d, now);
      const inGrace = status === "expired" && dte < 0 && Math.abs(dte) <= graceDays;
      const importance = d.importance ?? inferImportance(d.documentType);
      return { doc: d, status, importance, dte, inGrace };
    })
    .filter((x) => x.status === "expired");

  const hasCriticalExpiredBeyondGrace = expired.some((x) => x.importance === "critical" && !x.inGrace);
  const hasCriticalExpiredInGrace = expired.some((x) => x.importance === "critical" && x.inGrace);
  const hasMediumExpiredBeyondGrace = expired.some((x) => x.importance === "medium" && !x.inGrace);
  const hasMediumExpiredInGrace = expired.some((x) => x.importance === "medium" && x.inGrace);

  const hasBankIssue = expired.some((x) => x.doc.documentType === "Bank Letter / IBAN Certificate");

  let restrictionLevel: ComplianceRestrictionLevel = "warning";
  if (hasCriticalExpiredBeyondGrace) restrictionLevel = "full_hold";
  else if (ownerType === "customer" && hasMediumExpiredBeyondGrace) restrictionLevel = "limited_access";
  else if (ownerType === "merchant" && (hasMediumExpiredBeyondGrace || hasBankIssue)) restrictionLevel = "payout_hold";
  else if (hasCriticalExpiredInGrace) restrictionLevel = ownerType === "merchant" ? "payout_hold" : "limited_access";
  else if (hasMediumExpiredInGrace) restrictionLevel = "warning";
  else if (docs.some((d) => computeDocumentStatus(d, now) === "expiring_soon")) restrictionLevel = "warning";

  const payoutHold = ownerType === "merchant" && (restrictionLevel === "payout_hold");
  const payoutHoldReason = payoutHold ? "Your payouts are temporarily on hold due to compliance requirements." : undefined;

  return { restrictionLevel, payoutHold, payoutHoldReason };
};

const createDefaultComplianceDocuments = (ownerType: "merchant" | "customer", ownerId: string): ComplianceDocument[] => {
  const base = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const mk = (id: string, documentType: ComplianceDocumentType, expiryDate: string): ComplianceDocument => ({
    id,
    documentType,
    fileUrl: `/mock/docs/${ownerId}/${encodeURIComponent(documentType)}.pdf`,
    issueDate: base,
    expiryDate,
    status: "valid",
    uploadedAt: nowIso,
    reviewedAt: nowIso,
  });

  if (ownerType === "merchant") {
    return [
      mk(`${ownerId}_doc_cr`, "Commercial Registration Certificate", "2027-04-24"),
      mk(`${ownerId}_doc_vat`, "VAT Certificate", "2027-04-24"),
      mk(`${ownerId}_doc_owner`, "Owner ID / National ID", "2027-04-24"),
      mk(`${ownerId}_doc_bank`, "Bank Letter / IBAN Certificate", "2027-04-24"),
    ];
  }

  return [
    mk(`${ownerId}_doc_cr`, "Commercial Registration Certificate", "2027-04-24"),
    mk(`${ownerId}_doc_vat`, "VAT Certificate", "2027-04-24"),
    mk(`${ownerId}_doc_bank`, "Bank Letter / IBAN Certificate", "2027-04-24"),
    mk(`${ownerId}_doc_owner`, "Owner ID / National ID", "2027-04-24"),
  ];
};

const normalizeMerchantCompliance = (merchant: MockMerchant) => {
  const existing = merchant.complianceDocuments && merchant.complianceDocuments.length > 0 ? merchant.complianceDocuments : createDefaultComplianceDocuments("merchant", merchant.id);
  const now = new Date();
  const complianceDocuments = existing.map(normalizeDocument).map((d) => ({ ...d, status: computeDocumentStatus(d, now) }));
  const config = getComplianceConfig();
  const score = computeComplianceScore(complianceDocuments, now, config.gracePeriodDays);
  const { restrictionLevel, payoutHold, payoutHoldReason } = evaluateRestrictions("merchant", complianceDocuments, now, config);
  const badge = restrictionLevel === "full_hold" || score < 50 ? "Critical" : restrictionLevel !== "warning" || score < 85 ? "Warning" : "Good";
  const expiredCount = complianceDocuments.filter((d) => computeDocumentStatus(d, now) === "expired").length;
  const holdEvents = loadAuditLogStore().filter((e) => e.targetType === "merchant" && e.targetId === merchant.id && e.type === "account placed on hold").length;
  const complianceRiskLevel: RiskLevel =
    restrictionLevel === "full_hold" || expiredCount >= 2 || holdEvents >= 2 ? "High" : expiredCount === 1 ? "Medium" : "Low";
  return {
    ...merchant,
    complianceDocuments,
    complianceScore: merchant.complianceScore ?? score,
    complianceBadge: merchant.complianceBadge ?? badge,
    restrictionLevel: merchant.restrictionLevel ?? restrictionLevel,
    payoutHold: merchant.payoutHold ?? payoutHold,
    payoutHoldReason: merchant.payoutHoldReason ?? payoutHoldReason,
    complianceRiskLevel: merchant.complianceRiskLevel ?? complianceRiskLevel,
    complianceStatus: merchant.complianceStatus ?? (restrictionLevel === "warning" ? "clear" : "under_review"),
    complianceHold: merchant.complianceHold ?? (restrictionLevel === "full_hold"),
    complianceHoldSince: merchant.complianceHoldSince ?? (restrictionLevel === "full_hold" ? new Date().toISOString() : undefined),
    complianceHoldReason: merchant.complianceHoldReason ?? (restrictionLevel === "full_hold" ? "Expired documents require review." : undefined),
  } satisfies MockMerchant;
};

const normalizeCustomerCompliance = (customer: MockCustomer) => {
  const existing = customer.complianceDocuments && customer.complianceDocuments.length > 0 ? customer.complianceDocuments : createDefaultComplianceDocuments("customer", customer.id);
  const now = new Date();
  const complianceDocuments = existing.map(normalizeDocument).map((d) => ({ ...d, status: computeDocumentStatus(d, now) }));
  const config = getComplianceConfig();
  const score = computeComplianceScore(complianceDocuments, now, config.gracePeriodDays);
  const { restrictionLevel } = evaluateRestrictions("customer", complianceDocuments, now, config);
  const badge = restrictionLevel === "full_hold" || score < 50 ? "Critical" : restrictionLevel !== "warning" || score < 85 ? "Warning" : "Good";
  const expiredCount = complianceDocuments.filter((d) => computeDocumentStatus(d, now) === "expired").length;
  const holdEvents = loadAuditLogStore().filter((e) => e.targetType === "customer" && e.targetId === customer.id && e.type === "account placed on hold").length;
  const complianceRiskLevel: RiskLevel =
    restrictionLevel === "full_hold" || expiredCount >= 2 || holdEvents >= 2 ? "High" : expiredCount === 1 ? "Medium" : "Low";
  return {
    ...customer,
    complianceDocuments,
    complianceScore: customer.complianceScore ?? score,
    complianceBadge: customer.complianceBadge ?? badge,
    restrictionLevel: customer.restrictionLevel ?? restrictionLevel,
    complianceRiskLevel: customer.complianceRiskLevel ?? complianceRiskLevel,
    complianceStatus: customer.complianceStatus ?? (restrictionLevel === "warning" ? "clear" : "under_review"),
    complianceHold: customer.complianceHold ?? (restrictionLevel === "full_hold"),
    complianceHoldSince: customer.complianceHoldSince ?? (restrictionLevel === "full_hold" ? new Date().toISOString() : undefined),
    complianceHoldReason:
      customer.complianceHoldReason ??
      (restrictionLevel === "full_hold"
        ? "Expired documents require review."
        : restrictionLevel === "limited_access"
          ? "Your account requires document update before purchase."
          : undefined),
  } satisfies MockCustomer;
};

const loadMerchantsStore = (): MockMerchant[] => {
  if (!isBrowser()) return mockMerchants;
  const existing = safeJsonParse<MockMerchant[]>(window.localStorage.getItem(MERCHANTS_KEY), []);
  if (existing.length > 0) {
    const normalized = existing.map(normalizeMerchantCompliance);
    window.localStorage.setItem(MERCHANTS_KEY, JSON.stringify(normalized));
    return normalized;
  }
  const seeded = mockMerchants.map(normalizeMerchantCompliance);
  window.localStorage.setItem(MERCHANTS_KEY, JSON.stringify(seeded));
  return seeded;
};

const loadCustomersStore = (): MockCustomer[] => {
  if (!isBrowser()) return [];
  const existing = safeJsonParse<MockCustomer[]>(window.localStorage.getItem(CUSTOMERS_KEY), []);
  if (existing.length > 0) {
    const normalized = existing.map(normalizeCustomerCompliance);
    window.localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(normalized));
    return normalized;
  }

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
      const complianceStatusRaw = (c as any).complianceStatus;
      const complianceStatus =
        complianceStatusRaw === "clear" || complianceStatusRaw === "under_review" ? (complianceStatusRaw as ComplianceStatus) : undefined;
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
        complianceStatus,
        complianceHold: typeof (c as any).complianceHold === "boolean" ? Boolean((c as any).complianceHold) : undefined,
        complianceHoldSince: (c as any).complianceHoldSince ? String((c as any).complianceHoldSince) : undefined,
        complianceHoldReason: (c as any).complianceHoldReason ? String((c as any).complianceHoldReason) : undefined,
        complianceDocuments: Array.isArray((c as any).complianceDocuments) ? ((c as any).complianceDocuments as ComplianceDocument[]) : undefined,
        riskChecks: (c as any).riskChecks ?? { emailVerified: false, phoneVerified: false, riskLevel: "Medium" },
        createdAt,
      } satisfies MockCustomer;
    })
    .filter(Boolean) as MockCustomer[];

  const seeded =
    fromUsers.length > 0
      ? fromUsers.map(normalizeCustomerCompliance)
      : ([
          {
            id: "c_demo",
            name: "Demo Buyer",
            email: "customer@msquare.demo",
            phone: "+966 50 111 2222",
            address: "Riyadh, Saudi Arabia",
            status: "approved",
            notes: "Seeded demo customer.",
            complianceStatus: "clear",
            complianceHold: false,
            complianceDocuments: [
              {
                id: "c_demo_doc_cr",
                documentType: "Commercial Registration Certificate",
                fileUrl: "/mock/docs/c_demo/cr.pdf",
                issueDate: "2025-01-01",
                expiryDate: "2027-01-01",
                status: "valid",
                uploadedAt: "2026-04-01T10:00:00.000Z",
                reviewedAt: "2026-04-02T09:00:00.000Z",
              },
              {
                id: "c_demo_doc_vat",
                documentType: "VAT Certificate",
                fileUrl: "/mock/docs/c_demo/vat.pdf",
                issueDate: "2025-01-01",
                expiryDate: "2027-01-01",
                status: "valid",
                uploadedAt: "2026-04-01T10:00:00.000Z",
                reviewedAt: "2026-04-02T09:00:00.000Z",
              },
              {
                id: "c_demo_doc_bank",
                documentType: "Bank Letter / IBAN Certificate",
                fileUrl: "/mock/docs/c_demo/bank.pdf",
                issueDate: "2026-01-01",
                expiryDate: "2027-01-01",
                status: "valid",
                uploadedAt: "2026-04-01T10:00:00.000Z",
                reviewedAt: "2026-04-02T09:00:00.000Z",
              },
              {
                id: "c_demo_doc_owner",
                documentType: "Owner ID / National ID",
                fileUrl: "/mock/docs/c_demo/owner-id.pdf",
                issueDate: "2021-01-01",
                expiryDate: "2027-05-10",
                status: "valid",
                uploadedAt: "2026-04-01T10:00:00.000Z",
                reviewedAt: "2026-04-02T09:00:00.000Z",
              },
            ],
            riskChecks: { emailVerified: true, phoneVerified: true, riskLevel: "Low" },
            createdAt: "2026-04-01",
          },
        ] satisfies MockCustomer[]).map(normalizeCustomerCompliance);

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
      trustTierOverride: merchant.trustTierOverride,
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

export type AdminAuditEventType =
  | "approved"
  | "rejected"
  | "documents requested"
  | "email sent"
  | "expiry reminder sent"
  | "document expired"
  | "account placed on hold"
  | "document uploaded"
  | "document approved"
  | "document rejected"
  | "replacement requested"
  | "account hold released"
  | "admin override"
  | "payout hold applied"
  | "payout hold released";
export type AdminAuditEvent = {
  id: string;
  type: AdminAuditEventType;
  targetType: "merchant" | "customer";
  targetId: string;
  actorEmail: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

const loadAuditLogStore = (): AdminAuditEvent[] => {
  if (!isBrowser()) return [];
  return safeJsonParse<AdminAuditEvent[]>(window.localStorage.getItem(AUDIT_LOG_KEY), []);
};

const saveAuditLogStore = (events: AdminAuditEvent[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(events));
};

export const appendAdminAuditEvent = (input: Omit<AdminAuditEvent, "id" | "createdAt">) => {
  const createdAt = new Date().toISOString();
  const event: AdminAuditEvent = {
    id: `audit_${Math.random().toString(16).slice(2, 10)}`,
    createdAt,
    ...input,
  };
  const existing = loadAuditLogStore();
  saveAuditLogStore([event, ...existing].slice(0, 500));
  return event;
};

export const listAdminAuditEvents = (input?: { targetType?: AdminAuditEvent["targetType"]; targetId?: string; limit?: number }) => {
  const events = loadAuditLogStore();
  const targetType = input?.targetType;
  const targetId = input?.targetId;
  const filtered = events.filter((e) => (targetType ? e.targetType === targetType : true) && (targetId ? e.targetId === targetId : true));
  return filtered.slice(0, input?.limit ?? 100);
};

export type ComplianceOwnerType = "merchant" | "customer";

const getOwnerEmailAndName = (input: { ownerType: ComplianceOwnerType; ownerId: string }) => {
  if (input.ownerType === "merchant") {
    const m = getMerchantById(input.ownerId);
    if (!m) throw new Error("Merchant not found.");
    return { email: m.email, name: m.businessName, phone: m.phone };
  }
  const c = getCustomerById(input.ownerId);
  if (!c) throw new Error("Customer not found.");
  return { email: c.email, name: c.name, phone: c.phone };
};

const setOwnerComplianceHold = (input: { ownerType: ComplianceOwnerType; ownerId: string; hold: boolean; reason?: string }) => {
  const nowIso = new Date().toISOString();
  if (input.ownerType === "merchant") {
    const current = getMerchantById(input.ownerId);
    if (!current) throw new Error("Merchant not found.");
    return updateMerchant(input.ownerId, {
      complianceHold: input.hold,
      complianceStatus: input.hold ? "under_review" : "clear",
      complianceHoldSince: input.hold ? (current.complianceHoldSince ?? nowIso) : undefined,
      complianceHoldReason: input.hold ? input.reason ?? "Expired documents require review." : undefined,
    });
  }
  const current = getCustomerById(input.ownerId);
  if (!current) throw new Error("Customer not found.");
  return updateCustomer(input.ownerId, {
    complianceHold: input.hold,
    complianceStatus: input.hold ? "under_review" : "clear",
    complianceHoldSince: input.hold ? (current.complianceHoldSince ?? nowIso) : undefined,
    complianceHoldReason: input.hold ? input.reason ?? "Expired documents require review." : undefined,
  });
};

const updateOwnerDocument = (input: {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  documentId: string;
  patch: Partial<ComplianceDocument>;
}) => {
  if (input.ownerType === "merchant") {
    const merchant = getMerchantById(input.ownerId);
    if (!merchant) throw new Error("Merchant not found.");
    const nextDocs = (merchant.complianceDocuments ?? []).map((d) => (d.id === input.documentId ? { ...d, ...input.patch } : d));
    return updateMerchant(input.ownerId, { complianceDocuments: nextDocs });
  }
  const customer = getCustomerById(input.ownerId);
  if (!customer) throw new Error("Customer not found.");
  const nextDocs = (customer.complianceDocuments ?? []).map((d) => (d.id === input.documentId ? { ...d, ...input.patch } : d));
  return updateCustomer(input.ownerId, { complianceDocuments: nextDocs });
};

export const uploadComplianceDocumentReplacement = (input: {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  documentId: string;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
}) => {
  const nowIso = new Date().toISOString();
  updateOwnerDocument({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    documentId: input.documentId,
    patch: {
      fileUrl: input.fileUrl,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      status: "under_review",
      uploadedAt: nowIso,
      reviewedAt: undefined,
      overrideBy: undefined,
      overrideReason: undefined,
      overrideExpiry: undefined,
    },
  });
  appendAdminAuditEvent({
    type: "document uploaded",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: getOwnerEmailAndName({ ownerType: input.ownerType, ownerId: input.ownerId }).email,
    meta: { documentId: input.documentId, fileUrl: input.fileUrl, issueDate: input.issueDate, expiryDate: input.expiryDate },
  });
  if (input.ownerType === "merchant") updateMerchant(input.ownerId, { complianceStatus: "under_review" });
  else updateCustomer(input.ownerId, { complianceStatus: "under_review" });
  void runComplianceCheck();
};

export const adminApproveComplianceDocument = async (input: {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  documentId: string;
  actorEmail: string;
}) => {
  const nowIso = new Date().toISOString();
  updateOwnerDocument({ ownerType: input.ownerType, ownerId: input.ownerId, documentId: input.documentId, patch: { status: "valid", reviewedAt: nowIso } });
  appendAdminAuditEvent({
    type: "document approved",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { documentId: input.documentId },
  });
  await runComplianceCheck({ actorEmail: input.actorEmail });
};

export const adminRejectComplianceDocument = async (input: {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  documentId: string;
  actorEmail: string;
  reason: string;
}) => {
  const nowIso = new Date().toISOString();
  updateOwnerDocument({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    documentId: input.documentId,
    patch: { status: "rejected", reviewedAt: nowIso },
  });
  appendAdminAuditEvent({
    type: "document rejected",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { documentId: input.documentId, reason: input.reason },
  });

  const owner = getOwnerEmailAndName({ ownerType: input.ownerType, ownerId: input.ownerId });
  const template = buildDocumentRejectedEmail({ accountName: owner.name, reason: input.reason });
  const res = await sendMockEmail({ to: owner.email, template, meta: { ownerType: input.ownerType, ownerId: input.ownerId, action: "document_rejected" } });
  appendAdminAuditEvent({
    type: "email sent",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { emailId: res.id, subject: template.subject, to: owner.email },
  });
  setOwnerComplianceHold({ ownerType: input.ownerType, ownerId: input.ownerId, hold: true, reason: "Document rejected. Replacement required." });
};

export const adminRequestReplacement = async (input: {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  documentId: string;
  actorEmail: string;
  message: string;
}) => {
  appendAdminAuditEvent({
    type: "replacement requested",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { documentId: input.documentId, message: input.message },
  });
  const owner = getOwnerEmailAndName({ ownerType: input.ownerType, ownerId: input.ownerId });
  const template = buildDocumentReplacementRequestedEmail({ accountName: owner.name, message: input.message });
  const res = await sendMockEmail({ to: owner.email, template, meta: { ownerType: input.ownerType, ownerId: input.ownerId, action: "replacement_requested" } });
  appendAdminAuditEvent({
    type: "email sent",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { emailId: res.id, subject: template.subject, to: owner.email },
  });
  setOwnerComplianceHold({ ownerType: input.ownerType, ownerId: input.ownerId, hold: true, reason: "Replacement requested by admin." });
};

export const adminReleaseComplianceHold = async (input: { ownerType: ComplianceOwnerType; ownerId: string; actorEmail: string }) => {
  setOwnerComplianceHold({ ownerType: input.ownerType, ownerId: input.ownerId, hold: false });
  appendAdminAuditEvent({
    type: "account hold released",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
  });
  const owner = getOwnerEmailAndName({ ownerType: input.ownerType, ownerId: input.ownerId });
  const template = buildAccountHoldReleasedEmail({ accountName: owner.name });
  const res = await sendMockEmail({ to: owner.email, template, meta: { ownerType: input.ownerType, ownerId: input.ownerId, action: "hold_released_manual" } });
  appendAdminAuditEvent({
    type: "email sent",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { emailId: res.id, subject: template.subject, to: owner.email },
  });
};

export const adminOverrideDocumentExpiry = async (input: {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  documentId: string;
  overrideExpiry: string;
  overrideReason: string;
  actorEmail: string;
}) => {
  updateOwnerDocument({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    documentId: input.documentId,
    patch: { overrideBy: input.actorEmail, overrideReason: input.overrideReason, overrideExpiry: input.overrideExpiry },
  });
  appendAdminAuditEvent({
    type: "admin override",
    targetType: input.ownerType,
    targetId: input.ownerId,
    actorEmail: input.actorEmail,
    meta: { documentId: input.documentId, overrideExpiry: input.overrideExpiry, overrideReason: input.overrideReason },
  });
  await runComplianceCheck({ actorEmail: input.actorEmail });
};

export const listComplianceOverview = () => {
  const merchants = loadMerchantsStore();
  const customers = loadCustomersStore();
  const config = getComplianceConfig();
  const now = new Date();

  const allDocs: Array<{
    ownerType: ComplianceOwnerType;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    ownerRiskLevel: RiskLevel;
    ownerRestrictionLevel: ComplianceRestrictionLevel;
    ownerComplianceScore: number;
    ownerComplianceBadge: "Good" | "Warning" | "Critical";
    document: ComplianceDocument;
    computedStatus: ComplianceDocumentStatus;
    daysToExpiry: number;
    effectiveExpiryDate: string;
    importance: ComplianceDocumentImportance;
    inGrace: boolean;
  }> = [];

  merchants.forEach((m) => {
    (m.complianceDocuments ?? []).forEach((d) => {
      const doc = normalizeDocument(d);
      const effectiveExpiryDate = getEffectiveExpiryDate(doc);
      const dte = daysUntil(effectiveExpiryDate, now);
      const computedStatus = computeDocumentStatus(doc, now);
      const inGrace = computedStatus === "expired" && dte < 0 && Math.abs(dte) <= config.gracePeriodDays;
      allDocs.push({
        ownerType: "merchant",
        ownerId: m.id,
        ownerName: m.businessName,
        ownerEmail: m.email,
        ownerRiskLevel: m.complianceRiskLevel ?? "Low",
        ownerRestrictionLevel: m.restrictionLevel ?? "warning",
        ownerComplianceScore: m.complianceScore ?? 100,
        ownerComplianceBadge: m.complianceBadge ?? "Good",
        document: doc,
        computedStatus,
        daysToExpiry: dte,
        effectiveExpiryDate,
        importance: doc.importance ?? inferImportance(doc.documentType),
        inGrace,
      });
    });
  });

  customers.forEach((c) => {
    (c.complianceDocuments ?? []).forEach((d) => {
      const doc = normalizeDocument(d);
      const effectiveExpiryDate = getEffectiveExpiryDate(doc);
      const dte = daysUntil(effectiveExpiryDate, now);
      const computedStatus = computeDocumentStatus(doc, now);
      const inGrace = computedStatus === "expired" && dte < 0 && Math.abs(dte) <= config.gracePeriodDays;
      allDocs.push({
        ownerType: "customer",
        ownerId: c.id,
        ownerName: c.name,
        ownerEmail: c.email,
        ownerRiskLevel: c.complianceRiskLevel ?? "Low",
        ownerRestrictionLevel: c.restrictionLevel ?? "warning",
        ownerComplianceScore: c.complianceScore ?? 100,
        ownerComplianceBadge: c.complianceBadge ?? "Good",
        document: doc,
        computedStatus,
        daysToExpiry: dte,
        effectiveExpiryDate,
        importance: doc.importance ?? inferImportance(doc.documentType),
        inGrace,
      });
    });
  });

  const expiredDocuments = allDocs.filter((x) => x.computedStatus === "expired");
  const expiringSoon = allDocs.filter((x) => x.computedStatus === "expiring_soon");
  const pendingReview = allDocs.filter((x) => x.document.status === "under_review");
  const onHoldAccounts = {
    merchants: merchants.filter((m) => Boolean(m.complianceHold)),
    customers: customers.filter((c) => Boolean(c.complianceHold)),
  };

  const scoreOverview = {
    merchants: {
      good: merchants.filter((m) => (m.complianceBadge ?? "Good") === "Good").length,
      warning: merchants.filter((m) => (m.complianceBadge ?? "Good") === "Warning").length,
      critical: merchants.filter((m) => (m.complianceBadge ?? "Good") === "Critical").length,
      avg: merchants.length > 0 ? Math.round(merchants.reduce((sum, m) => sum + (m.complianceScore ?? 100), 0) / merchants.length) : 100,
    },
    customers: {
      good: customers.filter((c) => (c.complianceBadge ?? "Good") === "Good").length,
      warning: customers.filter((c) => (c.complianceBadge ?? "Good") === "Warning").length,
      critical: customers.filter((c) => (c.complianceBadge ?? "Good") === "Critical").length,
      avg: customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + (c.complianceScore ?? 100), 0) / customers.length) : 100,
    },
  };

  return { expiredDocuments, expiringSoon, pendingReview, onHoldAccounts, allDocs, scoreOverview };
};

const canSendReminder = (doc: ComplianceDocument, type: ComplianceReminderType, channel: ComplianceNotificationChannel) => {
  const history = Array.isArray(doc.reminderHistory) ? doc.reminderHistory : [];
  return !history.some((h) => h.type === type && h.channel === channel && h.status === "sent");
};

const addReminderHistory = (doc: ComplianceDocument, item: Omit<ComplianceReminderHistoryItem, "id">): ComplianceDocument => {
  const history = Array.isArray(doc.reminderHistory) ? doc.reminderHistory : [];
  const next: ComplianceReminderHistoryItem = { id: `rem_${Math.random().toString(16).slice(2, 10)}`, ...item };
  return { ...doc, reminderHistory: [...history, next] };
};

export const runComplianceCheck = async (input?: { actorEmail?: string }) => {
  const now = new Date();
  const config = getComplianceConfig();
  const reminderSchedule: Array<{ dte: number; type: ComplianceReminderType }> = [
    { dte: 30, type: "30_days" },
    { dte: 15, type: "15_days" },
    { dte: 7, type: "7_days" },
    { dte: 0, type: "on_expiry" },
    { dte: -1, type: "after_expiry" },
    { dte: -7, type: "after_expiry" },
  ];
  let remindersSent = 0;
  let documentsExpired = 0;
  let holdsPlaced = 0;
  let payoutHoldsApplied = 0;

  const handleOwner = async (ownerType: ComplianceOwnerType, ownerId: string, actorEmail: string) => {
    const owner = getOwnerEmailAndName({ ownerType, ownerId });
    const currentDocs =
      ownerType === "merchant" ? getMerchantById(ownerId)?.complianceDocuments ?? [] : getCustomerById(ownerId)?.complianceDocuments ?? [];
    const prevOwner = ownerType === "merchant" ? getMerchantById(ownerId) : getCustomerById(ownerId);
    const prevRestriction = (prevOwner as any)?.restrictionLevel as ComplianceRestrictionLevel | undefined;
    const prevHold = Boolean((prevOwner as any)?.complianceHold);
    const prevPayoutHold = Boolean((prevOwner as any)?.payoutHold);

    let nextDocs = currentDocs.map(normalizeDocument);

    for (const doc of currentDocs) {
      const normalized = normalizeDocument(doc);
      const computed = computeDocumentStatus(normalized, now);
      nextDocs = nextDocs.map((d) => (d.id === normalized.id ? { ...d, ...normalized, status: computed } : d));

      const effectiveExpiry = getEffectiveExpiryDate(normalized);
      const dte = daysUntil(effectiveExpiry, now);
      const schedule = reminderSchedule.find((x) => x.dte === dte);
      if (schedule) {
        const channels: ComplianceNotificationChannel[] = ["email", "dashboard"];
        const importance = normalized.importance ?? inferImportance(normalized.documentType);
        if (importance === "critical" && (schedule.type === "on_expiry" || schedule.type === "after_expiry")) channels.push("sms");

        for (const channel of channels) {
          const nextDoc = nextDocs.find((d) => d.id === normalized.id) ?? normalized;
          if (!canSendReminder(nextDoc, schedule.type, channel)) continue;

          const template =
            dte > 0
              ? buildDocumentExpiryReminderEmail({
                  accountName: owner.name,
                  documentType: normalized.documentType,
                  expiryDate: effectiveExpiry,
                  days: dte,
                })
              : buildDocumentExpiredEmail({ accountName: owner.name, documentType: normalized.documentType, expiryDate: effectiveExpiry });

          if (channel === "email") {
            const res = await sendMockEmail({
              to: owner.email,
              template,
              meta: { ownerType, ownerId, documentId: normalized.id, reminderType: schedule.type, days: dte },
            });
            appendAdminAuditEvent({
              type: "email sent",
              targetType: ownerType,
              targetId: ownerId,
              actorEmail,
              meta: { emailId: res.id, subject: template.subject, to: owner.email },
            });
          } else if (channel === "sms") {
            if (!owner.phone?.trim()) {
              const updated = addReminderHistory(nextDoc, {
                type: schedule.type,
                channel,
                sentAt: new Date().toISOString(),
                status: "skipped",
              });
              nextDocs = nextDocs.map((d) => (d.id === updated.id ? updated : d));
              appendAdminAuditEvent({
                type: "expiry reminder sent",
                targetType: ownerType,
                targetId: ownerId,
                actorEmail,
                meta: {
                  documentId: normalized.id,
                  documentType: normalized.documentType,
                  expiryDate: effectiveExpiry,
                  type: schedule.type,
                  channel,
                  status: "skipped",
                  reason: "Missing phone number",
                },
              });
              continue;
            }

            await sendMockSms({
              to: owner.phone,
              message: dte > 0 ? `MSquare reminder: ${normalized.documentType} expires on ${effectiveExpiry}` : `MSquare: ${normalized.documentType} expired on ${effectiveExpiry}`,
              meta: { ownerType, ownerId, documentId: normalized.id, reminderType: schedule.type, days: dte },
            });
          } else {
            await sendDashboardNotification({
              to: owner.email,
              title: "Compliance notification",
              message:
                dte > 0
                  ? `Document expiring soon: ${normalized.documentType} (${dte} days left).`
                  : `Action required: ${normalized.documentType} has expired.`,
              meta: { ownerType, ownerId, documentId: normalized.id, reminderType: schedule.type, days: dte },
            });
          }

          const updated = addReminderHistory(nextDoc, {
            type: schedule.type,
            channel,
            sentAt: new Date().toISOString(),
            status: "sent",
          });
          nextDocs = nextDocs.map((d) => (d.id === updated.id ? updated : d));
          appendAdminAuditEvent({
            type: "expiry reminder sent",
            targetType: ownerType,
            targetId: ownerId,
            actorEmail,
            meta: { documentId: normalized.id, documentType: normalized.documentType, expiryDate: effectiveExpiry, type: schedule.type, channel },
          });
          remindersSent += 1;
        }
      }
    }

    const score = computeComplianceScore(nextDocs, now, config.gracePeriodDays);
    const { restrictionLevel, payoutHold, payoutHoldReason } = evaluateRestrictions(ownerType, nextDocs, now, config);
    const badge = restrictionLevel === "full_hold" || score < 50 ? "Critical" : restrictionLevel !== "warning" || score < 85 ? "Warning" : "Good";

    const hasExpiredTransition = nextDocs.some((d) => d.status === "expired") && !currentDocs.some((d) => computeDocumentStatus(normalizeDocument(d), now) === "expired");
    if (hasExpiredTransition) {
      documentsExpired += 1;
      appendAdminAuditEvent({
        type: "document expired",
        targetType: ownerType,
        targetId: ownerId,
        actorEmail,
      });
    }

    if (ownerType === "merchant") {
      updateMerchant(ownerId, {
        complianceDocuments: nextDocs,
        complianceScore: score,
        complianceBadge: badge,
        restrictionLevel,
        payoutHold,
        payoutHoldReason,
      });
    } else {
      updateCustomer(ownerId, {
        complianceDocuments: nextDocs,
        complianceScore: score,
        complianceBadge: badge,
        restrictionLevel,
      });
    }

    const shouldFullHold = restrictionLevel === "full_hold";
    if (shouldFullHold && !prevHold) {
      setOwnerComplianceHold({ ownerType, ownerId, hold: true, reason: ownerType === "merchant" ? "Your account is on hold due to expired documents. Please update your documents." : "Your account requires document update before purchase." });
      appendAdminAuditEvent({ type: "account placed on hold", targetType: ownerType, targetId: ownerId, actorEmail, meta: { restrictionLevel } });
      holdsPlaced += 1;
      const holdEmail = buildAccountHoldPlacedEmail({ accountName: owner.name });
      const sent = await sendMockEmail({ to: owner.email, template: holdEmail, meta: { ownerType, ownerId, action: "hold_placed", restrictionLevel } });
      appendAdminAuditEvent({ type: "email sent", targetType: ownerType, targetId: ownerId, actorEmail, meta: { emailId: sent.id, subject: holdEmail.subject, to: owner.email } });
      await sendDashboardNotification({ to: owner.email, title: "Account on hold", message: holdEmail.text, meta: { ownerType, ownerId, action: "hold_placed" } });
    }

    if (!shouldFullHold && prevHold) {
      setOwnerComplianceHold({ ownerType, ownerId, hold: false });
      appendAdminAuditEvent({ type: "account hold released", targetType: ownerType, targetId: ownerId, actorEmail, meta: { previous: prevRestriction, current: restrictionLevel } });
      const releasedEmail = buildAccountHoldReleasedEmail({ accountName: owner.name });
      const sent = await sendMockEmail({ to: owner.email, template: releasedEmail, meta: { ownerType, ownerId, action: "hold_released" } });
      appendAdminAuditEvent({ type: "email sent", targetType: ownerType, targetId: ownerId, actorEmail, meta: { emailId: sent.id, subject: releasedEmail.subject, to: owner.email } });
      await sendDashboardNotification({ to: owner.email, title: "Hold released", message: releasedEmail.text, meta: { ownerType, ownerId, action: "hold_released" } });
    }

    if (ownerType === "merchant") {
      if (payoutHold && !prevPayoutHold) {
        payoutHoldsApplied += 1;
        appendAdminAuditEvent({ type: "payout hold applied", targetType: ownerType, targetId: ownerId, actorEmail, meta: { reason: payoutHoldReason } });
        const payoutEmail = buildPayoutHoldEmail({ accountName: owner.name });
        const sent = await sendMockEmail({ to: owner.email, template: payoutEmail, meta: { ownerType, ownerId, action: "payout_hold_applied" } });
        appendAdminAuditEvent({ type: "email sent", targetType: ownerType, targetId: ownerId, actorEmail, meta: { emailId: sent.id, subject: payoutEmail.subject, to: owner.email } });
        await sendDashboardNotification({ to: owner.email, title: "Payouts on hold", message: payoutHoldReason ?? payoutEmail.text, meta: { ownerType, ownerId, action: "payout_hold_applied" } });
      }
      if (!payoutHold && prevPayoutHold) {
        appendAdminAuditEvent({ type: "payout hold released", targetType: ownerType, targetId: ownerId, actorEmail });
        await sendDashboardNotification({ to: owner.email, title: "Payouts resumed", message: "Your payouts are no longer on hold.", meta: { ownerType, ownerId, action: "payout_hold_released" } });
      }
    }
  };

  const systemActor = input?.actorEmail ?? "system@msquare.demo";
  const merchants = loadMerchantsStore();
  const customers = loadCustomersStore();

  for (const m of merchants) {
    await handleOwner("merchant", m.id, systemActor);
  }
  for (const c of customers) {
    await handleOwner("customer", c.id, systemActor);
  }

  return { ok: true as const, checkedAt: now.toISOString(), remindersSent, documentsExpired, holdsPlaced, payoutHoldsApplied };
};

export const checkDocumentExpiry = async () => {
  return runComplianceCheck();
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

export const setMerchantStatus = (input: { id: string; status: MerchantStatus; rejectionReason?: string; documentsRequested?: string[] }) => {
  const merchant = getMerchantById(input.id);
  if (!merchant) throw new Error("Merchant not found.");
  const documentsRequested = (input.documentsRequested ?? []).map((d) => d.trim()).filter(Boolean);
  const next: Partial<MockMerchant> = {
    status: input.status,
    rejectionReason: input.status === "rejected" ? input.rejectionReason || "Rejected by admin." : undefined,
    documentsRequested: input.status === "more_documents_required" ? documentsRequested : undefined,
    documentsRequestedAt: input.status === "more_documents_required" ? new Date().toISOString() : undefined,
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
