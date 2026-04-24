export type MerchantStatus = "pending_verification" | "more_documents_required" | "approved" | "rejected" | "suspended";
export type RiskLevel = "Low" | "Medium" | "High";

export type MockMerchant = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
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
