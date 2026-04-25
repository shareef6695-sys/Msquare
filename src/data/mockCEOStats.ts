"use client";

export type ExecutiveRole = "ceo" | "managing_director" | "gm" | "finance_manager" | "sales_manager";

export type ExecutiveKpis = {
  totalGmvSar: number;
  totalRevenueSar: number;
  activeMerchants: number;
  ordersToday: number;
  pendingPayoutsSar: number;
  escrowBalanceSar: number;
  lcTransactionsSar: number;
  openDisputes: number;
  refundsSar: number;
  failedPayments: number;
  highRiskTransactions: number;
  expiredDocuments: number;
};

export type ExecutiveTrendPoint = { month: string; gmvSar: number; revenueSar: number; orders: number; merchants: number };

export type CategoryDistribution = Array<{ category: string; gmvSar: number; orders: number }>;

export type ExecutiveAlert = {
  id: string;
  type: "high_risk_transaction" | "expired_document" | "dispute" | "failed_payment" | "compliance";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  detail: string;
  createdAt: string;
};

export type ExecutiveTopMerchant = { merchantId: string; name: string; gmvSar: number; orders: number; risk: "low" | "medium" | "high" };
export type ExecutiveTopProduct = { productId: string; name: string; merchantName: string; category: string; gmvSar: number; orders: number };
export type ExecutiveTopCategory = { category: string; gmvSar: number; orders: number; growthPct: number };

export type MockCEOStats = {
  updatedAt: string;
  kpis: ExecutiveKpis;
  trends: ExecutiveTrendPoint[];
  categoryDistribution: CategoryDistribution;
  alerts: ExecutiveAlert[];
  topMerchants: ExecutiveTopMerchant[];
  topProducts: ExecutiveTopProduct[];
  topCategories: ExecutiveTopCategory[];
};

export const mockCEOStats: MockCEOStats = {
  updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  kpis: {
    totalGmvSar: 128_450_000,
    totalRevenueSar: 9_880_000,
    activeMerchants: 412,
    ordersToday: 186,
    pendingPayoutsSar: 1_240_000,
    escrowBalanceSar: 6_780_000,
    lcTransactionsSar: 14_300_000,
    openDisputes: 27,
    refundsSar: 410_000,
    failedPayments: 19,
    highRiskTransactions: 6,
    expiredDocuments: 12,
  },
  trends: [
    { month: "Nov", gmvSar: 16_200_000, revenueSar: 1_240_000, orders: 3_420, merchants: 318 },
    { month: "Dec", gmvSar: 18_450_000, revenueSar: 1_380_000, orders: 3_910, merchants: 334 },
    { month: "Jan", gmvSar: 20_100_000, revenueSar: 1_520_000, orders: 4_160, merchants: 352 },
    { month: "Feb", gmvSar: 21_750_000, revenueSar: 1_680_000, orders: 4_420, merchants: 368 },
    { month: "Mar", gmvSar: 24_380_000, revenueSar: 1_920_000, orders: 4_880, merchants: 392 },
    { month: "Apr", gmvSar: 27_570_000, revenueSar: 2_140_000, orders: 5_210, merchants: 412 },
  ],
  categoryDistribution: [
    { category: "Steel", gmvSar: 41_200_000, orders: 1_140 },
    { category: "Industrial Tools", gmvSar: 18_700_000, orders: 1_980 },
    { category: "Construction", gmvSar: 22_500_000, orders: 1_260 },
    { category: "Electrical", gmvSar: 15_850_000, orders: 1_740 },
    { category: "Machinery", gmvSar: 20_200_000, orders: 880 },
    { category: "Other", gmvSar: 10_000_000, orders: 640 },
  ],
  alerts: [
    {
      id: "al_01",
      type: "high_risk_transaction",
      severity: "critical",
      title: "High-risk transaction flagged",
      detail: "Unusual payment pattern on a large order. Review recommended before payout.",
      createdAt: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    },
    {
      id: "al_02",
      type: "expired_document",
      severity: "high",
      title: "Merchant documents expired",
      detail: "Commercial registration expired for 3 merchants. Payout hold may apply.",
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "al_03",
      type: "dispute",
      severity: "medium",
      title: "Disputes increased",
      detail: "Dispute rate increased in Industrial Tools category (last 7 days).",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "al_04",
      type: "failed_payment",
      severity: "medium",
      title: "Failed payments spike",
      detail: "Payment failure rate increased for bank transfer. Monitor settlement delays.",
      createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "al_05",
      type: "compliance",
      severity: "high",
      title: "Compliance alerts pending",
      detail: "12 documents expiring within 14 days. Send reminders and consider grace policy.",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ],
  topMerchants: [
    { merchantId: "m_steel_01", name: "Al Jazera Steel", gmvSar: 12_800_000, orders: 212, risk: "low" },
    { merchantId: "m_ind_02", name: "Gulf Industrial Supply", gmvSar: 10_450_000, orders: 318, risk: "medium" },
    { merchantId: "m_con_07", name: "Riyadh Construction Mart", gmvSar: 8_900_000, orders: 164, risk: "low" },
    { merchantId: "m_mach_03", name: "Machinery Hub KSA", gmvSar: 7_600_000, orders: 98, risk: "high" },
    { merchantId: "m_ele_05", name: "Electrical Pro Trading", gmvSar: 6_980_000, orders: 241, risk: "medium" },
  ],
  topProducts: [
    { productId: "p_01", name: "Structural Steel Beams", merchantName: "Al Jazera Steel", category: "Steel", gmvSar: 7_250_000, orders: 86 },
    { productId: "p_02", name: "Industrial Fasteners Pack", merchantName: "Gulf Industrial Supply", category: "Industrial Tools", gmvSar: 4_980_000, orders: 214 },
    { productId: "p_03", name: "Electrical Cable Reels", merchantName: "Electrical Pro Trading", category: "Electrical", gmvSar: 4_620_000, orders: 132 },
    { productId: "p_04", name: "Concrete Additives", merchantName: "Riyadh Construction Mart", category: "Construction", gmvSar: 4_100_000, orders: 96 },
    { productId: "p_05", name: "CNC Spares Kit", merchantName: "Machinery Hub KSA", category: "Machinery", gmvSar: 3_740_000, orders: 41 },
  ],
  topCategories: [
    { category: "Steel", gmvSar: 41_200_000, orders: 1_140, growthPct: 12.4 },
    { category: "Construction", gmvSar: 22_500_000, orders: 1_260, growthPct: 9.1 },
    { category: "Machinery", gmvSar: 20_200_000, orders: 880, growthPct: 14.8 },
    { category: "Industrial Tools", gmvSar: 18_700_000, orders: 1_980, growthPct: 6.2 },
    { category: "Electrical", gmvSar: 15_850_000, orders: 1_740, growthPct: 7.5 },
  ],
};

