import type { CurrencyCode } from "@/types";

export type MerchantStatus = "pending_verification" | "more_documents_required" | "approved" | "rejected" | "suspended";
export type RiskLevel = "Low" | "Medium" | "High";

export type ComplianceDocumentType =
  | "Commercial Registration Certificate"
  | "VAT Certificate"
  | "Owner ID / National ID"
  | "Bank Letter / IBAN Certificate"
  | "Chamber of Commerce Certificate"
  | "Authorized Signatory Document"
  | "Compliance Document";

export type ComplianceDocumentStatus = "valid" | "expiring_soon" | "expired" | "rejected" | "under_review";

export type ComplianceDocumentImportance = "critical" | "medium" | "low";

export type ComplianceRestrictionLevel = "warning" | "limited_access" | "payout_hold" | "full_hold";

export type ComplianceReminderType = "30_days" | "15_days" | "7_days" | "on_expiry" | "after_expiry";

export type ComplianceNotificationChannel = "email" | "sms" | "dashboard";

export type ComplianceReminderHistoryItem = {
  id: string;
  type: ComplianceReminderType;
  channel: ComplianceNotificationChannel;
  sentAt: string;
  status: "sent" | "skipped";
};

export type ComplianceDocument = {
  id: string;
  documentType: ComplianceDocumentType;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  status: ComplianceDocumentStatus;
  uploadedAt: string;
  reviewedAt?: string;
  importance?: ComplianceDocumentImportance;
  overrideBy?: string;
  overrideReason?: string;
  overrideExpiry?: string;
  reminderHistory?: ComplianceReminderHistoryItem[];
};

export type ComplianceStatus = "clear" | "under_review";

export type MockMerchant = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  sellingCurrency?: CurrencyCode;
  businessType: string;
  commercialRegistrationNumber: string;
  vatNumber: string;
  iban: string;
  bankDetails: string;
  storeName: string;
  storeSlug: string;
  uploadedDocuments: Array<{ name: string; url: string }>;
  status: MerchantStatus;
  rejectionReason?: string;
  notes?: string;
  documentsRequested?: string[];
  documentsRequestedAt?: string;
  complianceStatus?: ComplianceStatus;
  complianceHold?: boolean;
  complianceHoldSince?: string;
  complianceHoldReason?: string;
  complianceDocuments?: ComplianceDocument[];
  complianceScore?: number;
  complianceBadge?: "Good" | "Warning" | "Critical";
  restrictionLevel?: ComplianceRestrictionLevel;
  payoutHold?: boolean;
  payoutHoldReason?: string;
  complianceRiskLevel?: RiskLevel;
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

export const mockMerchants: MockMerchant[] = [
  {
    id: "m1",
    businessName: "Al Jeddah Tools LLC",
    ownerName: "Ahmed Al Harbi",
    email: "merchant1@msquare.demo",
    phone: "+966 50 000 0001",
    country: "Saudi Arabia",
    city: "Jeddah",
    sellingCurrency: "SAR",
    businessType: "Distributor",
    commercialRegistrationNumber: "CR-10203040",
    vatNumber: "VAT-300112233",
    iban: "SA0000000000000000000001",
    bankDetails: "Bank: Demo Bank • SWIFT: DEMOSAAA • Beneficiary: Al Jeddah Tools LLC",
    storeName: "Al Jeddah Tools",
    storeSlug: "al-jeddah-tools",
    uploadedDocuments: [
      { name: "Commercial Registration (CR).pdf", url: "/mock/docs/m1-cr.pdf" },
      { name: "Bank Letter.pdf", url: "/mock/docs/m1-bank.pdf" },
    ],
    status: "approved",
    notes: "Verified CR and bank letter. Low risk.",
    complianceStatus: "clear",
    complianceHold: false,
    complianceDocuments: [
      {
        id: "m1_doc_cr",
        documentType: "Commercial Registration Certificate",
        fileUrl: "/mock/docs/m1-cr.pdf",
        issueDate: "2025-06-01",
        expiryDate: "2026-05-20",
        status: "valid",
        uploadedAt: "2026-04-01T10:00:00.000Z",
        reviewedAt: "2026-04-02T09:00:00.000Z",
      },
      {
        id: "m1_doc_vat",
        documentType: "VAT Certificate",
        fileUrl: "/mock/docs/m1-vat.pdf",
        issueDate: "2025-05-15",
        expiryDate: "2027-05-15",
        status: "valid",
        uploadedAt: "2026-04-01T10:00:00.000Z",
        reviewedAt: "2026-04-02T09:00:00.000Z",
      },
      {
        id: "m1_doc_bank",
        documentType: "Bank Letter / IBAN Certificate",
        fileUrl: "/mock/docs/m1-bank.pdf",
        issueDate: "2026-01-05",
        expiryDate: "2027-01-05",
        status: "valid",
        uploadedAt: "2026-04-01T10:00:00.000Z",
        reviewedAt: "2026-04-02T09:00:00.000Z",
      },
    ],
    riskChecks: {
      emailVerified: true,
      phoneVerified: true,
      crUploaded: true,
      bankDetailsProvided: true,
      documentsUploaded: true,
      riskLevel: "Low",
    },
    createdAt: "2026-04-01",
  },
  {
    id: "m2",
    businessName: "Tech World Trading",
    ownerName: "Sara Khan",
    email: "merchant2@msquare.demo",
    phone: "+966 50 000 0002",
    country: "Saudi Arabia",
    city: "Riyadh",
    sellingCurrency: "SAR",
    businessType: "Wholesaler",
    commercialRegistrationNumber: "CR-55667788",
    vatNumber: "VAT-778899001",
    iban: "SA0000000000000000000002",
    bankDetails: "Bank: Demo Bank • SWIFT: DEMOSAAA • Beneficiary: Tech World Trading",
    storeName: "Tech World",
    storeSlug: "tech-world",
    uploadedDocuments: [{ name: "Commercial Registration (CR).pdf", url: "/mock/docs/m2-cr.pdf" }],
    status: "pending_verification",
    notes: "Awaiting bank details verification and document completeness.",
    complianceStatus: "under_review",
    complianceHold: false,
    complianceDocuments: [
      {
        id: "m2_doc_cr",
        documentType: "Commercial Registration Certificate",
        fileUrl: "/mock/docs/m2-cr.pdf",
        issueDate: "2025-04-10",
        expiryDate: "2026-05-09",
        status: "valid",
        uploadedAt: "2026-04-10T12:10:00.000Z",
      },
      {
        id: "m2_doc_owner",
        documentType: "Owner ID / National ID",
        fileUrl: "/mock/docs/m2-owner-id.pdf",
        issueDate: "2021-01-01",
        expiryDate: "2026-04-24",
        status: "valid",
        uploadedAt: "2026-04-10T12:10:00.000Z",
      },
    ],
    riskChecks: {
      emailVerified: false,
      phoneVerified: true,
      crUploaded: true,
      bankDetailsProvided: true,
      documentsUploaded: true,
      riskLevel: "Medium",
    },
    createdAt: "2026-04-10",
  },
  {
    id: "m3",
    businessName: "Gulf Machinery Co.",
    ownerName: "Fahad Al Qahtani",
    email: "merchant3@msquare.demo",
    phone: "+966 50 000 0003",
    country: "Saudi Arabia",
    city: "Dammam",
    sellingCurrency: "SAR",
    businessType: "Manufacturer",
    commercialRegistrationNumber: "CR-99001122",
    vatNumber: "VAT-112233445",
    iban: "SA0000000000000000000003",
    bankDetails: "Bank: Demo Bank • SWIFT: DEMOSAAA • Beneficiary: Gulf Machinery Co.",
    storeName: "Gulf Machinery",
    storeSlug: "gulf-machinery",
    uploadedDocuments: [],
    status: "rejected",
    rejectionReason: "Missing CR document and inconsistent bank beneficiary name.",
    notes: "Reject until CR uploaded and bank letter matches business name.",
    complianceStatus: "under_review",
    complianceHold: true,
    complianceHoldSince: "2026-04-12T09:30:00.000Z",
    complianceHoldReason: "Expired or missing compliance documents.",
    complianceDocuments: [
      {
        id: "m3_doc_cr",
        documentType: "Commercial Registration Certificate",
        fileUrl: "/mock/docs/m3-cr.pdf",
        issueDate: "2024-02-01",
        expiryDate: "2026-04-10",
        status: "expired",
        uploadedAt: "2026-04-12T09:00:00.000Z",
      },
      {
        id: "m3_doc_bank",
        documentType: "Bank Letter / IBAN Certificate",
        fileUrl: "/mock/docs/m3-bank.pdf",
        issueDate: "2025-01-01",
        expiryDate: "2026-04-01",
        status: "expired",
        uploadedAt: "2026-04-12T09:00:00.000Z",
      },
    ],
    riskChecks: {
      emailVerified: false,
      phoneVerified: false,
      crUploaded: false,
      bankDetailsProvided: true,
      documentsUploaded: false,
      riskLevel: "High",
    },
    createdAt: "2026-04-12",
  },
] as const;
