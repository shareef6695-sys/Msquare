"use client";

export type ExecutiveDateRange = "today" | "7d" | "30d" | "6m" | "year";
export type ExecutiveRegion = "Saudi Arabia" | "UAE" | "GCC" | "Global";
export type ExecutiveBusinessType = "B2B" | "B2C" | "Enterprise";
export type ExecutiveCurrency = "SAR" | "USD" | "AED";
export type MerchantStatus = "active" | "pending" | "on_hold" | "suspended";

export type ExecutiveFilters = {
  dateRange: ExecutiveDateRange;
  region: ExecutiveRegion;
  businessType: ExecutiveBusinessType;
  currency: ExecutiveCurrency;
  category: string;
  merchantStatus: MerchantStatus | "all";
};

export type SeriesPoint = { name: string; value: number; prev?: number };
export type DistPoint = { name: string; value: number };

export type MerchantRecord = {
  id: string;
  name: string;
  region: ExecutiveRegion;
  businessType: ExecutiveBusinessType;
  status: MerchantStatus;
  gmvSar: number;
  revenueSar: number;
  orders: number;
};

export type LcRecord = {
  id: string;
  merchantName: string;
  region: ExecutiveRegion;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SETTLED";
  amountSar: number;
  createdAt: string;
};

export type DisputeRecord = {
  id: string;
  merchantName: string;
  region: ExecutiveRegion;
  type: "delivery" | "quality" | "payment" | "document";
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  amountSar: number;
  createdAt: string;
};

export type ComplianceIssueRecord = {
  id: string;
  merchantName: string;
  region: ExecutiveRegion;
  type: "expired_document" | "missing_document" | "risk_flag";
  severity: "low" | "medium" | "high" | "critical";
  documentName?: string;
  createdAt: string;
};

export type RefundRecord = {
  id: string;
  merchantName: string;
  region: ExecutiveRegion;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  amountSar: number;
  createdAt: string;
};

export type CustomerGrowthPoint = { name: string; value: number; prev?: number };

export type MockExecutiveAnalytics = {
  updatedAt: string;
  categories: string[];
  merchants: MerchantRecord[];
  series: {
    gmv: SeriesPoint[];
    revenue: SeriesPoint[];
    orders: SeriesPoint[];
    activeMerchants: SeriesPoint[];
    newMerchants: SeriesPoint[];
    escrowBalance: SeriesPoint[];
    lcTransactions: SeriesPoint[];
    pendingPayouts: SeriesPoint[];
    refunds: SeriesPoint[];
    customerGrowth: CustomerGrowthPoint[];
  };
  distributions: {
    ordersByStatus: DistPoint[];
    merchantsByRegion: DistPoint[];
    salesByCategory: DistPoint[];
    disputesByType: DistPoint[];
    complianceIssues: DistPoint[];
  };
  records: {
    revenueByMerchant: MerchantRecord[];
    gmvByMerchant: MerchantRecord[];
    lcTransactions: LcRecord[];
    disputes: DisputeRecord[];
    complianceIssues: ComplianceIssueRecord[];
    refunds: RefundRecord[];
  };
};

const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

const baseSeries = (values: number[], prevValues: number[] = []) => {
  return months.map((m, i) => ({ name: m, value: values[i] ?? 0, prev: prevValues[i] }));
};

const dist = (rows: Array<[string, number]>) => rows.map(([name, value]) => ({ name, value }));

const randomId = (p: string) => `${p}_${Math.random().toString(16).slice(2, 10)}`;

const mockMerchants: MerchantRecord[] = [
  { id: "m_01", name: "Al Jazera Steel", region: "Saudi Arabia", businessType: "B2B", status: "active", gmvSar: 12_800_000, revenueSar: 980_000, orders: 212 },
  { id: "m_02", name: "Gulf Industrial Supply", region: "GCC", businessType: "Enterprise", status: "active", gmvSar: 10_450_000, revenueSar: 820_000, orders: 318 },
  { id: "m_03", name: "Riyadh Construction Mart", region: "Saudi Arabia", businessType: "B2B", status: "active", gmvSar: 8_900_000, revenueSar: 710_000, orders: 164 },
  { id: "m_04", name: "Machinery Hub KSA", region: "Saudi Arabia", businessType: "Enterprise", status: "on_hold", gmvSar: 7_600_000, revenueSar: 630_000, orders: 98 },
  { id: "m_05", name: "Electrical Pro Trading", region: "UAE", businessType: "B2C", status: "active", gmvSar: 6_980_000, revenueSar: 560_000, orders: 241 },
  { id: "m_06", name: "Doha Metals", region: "GCC", businessType: "B2B", status: "pending", gmvSar: 2_250_000, revenueSar: 140_000, orders: 52 },
  { id: "m_07", name: "Global Tools Network", region: "Global", businessType: "B2C", status: "active", gmvSar: 5_200_000, revenueSar: 410_000, orders: 376 },
];

const mockLc: LcRecord[] = Array.from({ length: 14 }).map((_, i) => {
  const m = mockMerchants[i % mockMerchants.length]!;
  const statuses: LcRecord["status"][] = ["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "SETTLED"];
  const status = statuses[i % statuses.length]!;
  return {
    id: `lc_${String(i + 1).padStart(3, "0")}`,
    merchantName: m.name,
    region: m.region,
    status,
    amountSar: 250_000 + (i * 47_500) % 900_000,
    createdAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
  };
});

const mockDisputes: DisputeRecord[] = Array.from({ length: 18 }).map((_, i) => {
  const m = mockMerchants[(i + 2) % mockMerchants.length]!;
  const types: DisputeRecord["type"][] = ["delivery", "quality", "payment", "document"];
  const statuses: DisputeRecord["status"][] = ["OPEN", "UNDER_REVIEW", "RESOLVED"];
  return {
    id: `dsp_${String(i + 1).padStart(3, "0")}`,
    merchantName: m.name,
    region: m.region,
    type: types[i % types.length]!,
    status: statuses[i % statuses.length]!,
    amountSar: 8_000 + (i * 2_250) % 60_000,
    createdAt: new Date(Date.now() - (i + 1) * 18 * 60 * 60 * 1000).toISOString(),
  };
});

const mockCompliance: ComplianceIssueRecord[] = Array.from({ length: 16 }).map((_, i) => {
  const m = mockMerchants[(i + 1) % mockMerchants.length]!;
  const types: ComplianceIssueRecord["type"][] = ["expired_document", "missing_document", "risk_flag"];
  const severities: ComplianceIssueRecord["severity"][] = ["low", "medium", "high", "critical"];
  const docs = ["Commercial Registration", "VAT Certificate", "IBAN Proof", "Owner ID", "Insurance Policy"];
  const type = types[i % types.length]!;
  return {
    id: `cmp_${String(i + 1).padStart(3, "0")}`,
    merchantName: m.name,
    region: m.region,
    type,
    severity: severities[(i + 2) % severities.length]!,
    documentName: type === "risk_flag" ? undefined : docs[i % docs.length],
    createdAt: new Date(Date.now() - (i + 1) * 9 * 60 * 60 * 1000).toISOString(),
  };
});

const mockRefunds: RefundRecord[] = Array.from({ length: 10 }).map((_, i) => {
  const m = mockMerchants[(i + 3) % mockMerchants.length]!;
  const statuses: RefundRecord["status"][] = ["REQUESTED", "APPROVED", "REJECTED", "PAID"];
  return {
    id: `rf_${String(i + 1).padStart(3, "0")}`,
    merchantName: m.name,
    region: m.region,
    status: statuses[i % statuses.length]!,
    amountSar: 2_500 + (i * 1_100) % 25_000,
    createdAt: new Date(Date.now() - (i + 2) * 7 * 60 * 60 * 1000).toISOString(),
  };
});

export const DEFAULT_EXEC_FILTERS: ExecutiveFilters = {
  dateRange: "6m",
  region: "Global",
  businessType: "B2B",
  currency: "SAR",
  category: "All",
  merchantStatus: "all",
};

export const getMockExecutiveAnalytics = (filters: ExecutiveFilters): MockExecutiveAnalytics => {
  const updatedAt = new Date(Date.now() - 12 * 60 * 1000).toISOString();

  const categories = ["Steel", "Industrial Tools", "Construction", "Electrical", "Machinery", "Other"];

  const regionOk = (r: ExecutiveRegion) => (filters.region === "Global" ? true : r === filters.region || (filters.region === "GCC" && r === "GCC"));
  const btOk = (b: ExecutiveBusinessType) => (filters.businessType ? b === filters.businessType : true);
  const statusOk = (s: MerchantStatus) => (filters.merchantStatus === "all" ? true : s === filters.merchantStatus);

  const merchants = mockMerchants.filter((m) => regionOk(m.region) && btOk(m.businessType) && statusOk(m.status));

  const scale = (() => {
    if (filters.region === "Saudi Arabia") return 0.72;
    if (filters.region === "UAE") return 0.28;
    if (filters.region === "GCC") return 0.44;
    return 1;
  })();

  const period = (() => {
    if (filters.dateRange === "today") return 0.08;
    if (filters.dateRange === "7d") return 0.18;
    if (filters.dateRange === "30d") return 0.42;
    if (filters.dateRange === "year") return 1.6;
    return 1;
  })();

  const gmv = baseSeries(
    [16_200_000, 18_450_000, 20_100_000, 21_750_000, 24_380_000, 27_570_000].map((v) => Math.round(v * scale * period)),
    [15_200_000, 17_600_000, 19_400_000, 20_300_000, 22_900_000, 25_800_000].map((v) => Math.round(v * scale * period)),
  );
  const revenue = baseSeries(
    [1_240_000, 1_380_000, 1_520_000, 1_680_000, 1_920_000, 2_140_000].map((v) => Math.round(v * scale * period)),
    [1_180_000, 1_310_000, 1_440_000, 1_520_000, 1_780_000, 1_960_000].map((v) => Math.round(v * scale * period)),
  );
  const orders = baseSeries(
    [3420, 3910, 4160, 4420, 4880, 5210].map((v) => Math.round(v * scale * period)),
    [3300, 3720, 4040, 4210, 4700, 4980].map((v) => Math.round(v * scale * period)),
  );

  const merchantsGrowth = baseSeries(
    [318, 334, 352, 368, 392, 412].map((v) => Math.round(v * scale * (filters.region === "Global" ? 1 : 0.85))),
    [300, 322, 340, 355, 376, 398].map((v) => Math.round(v * scale * (filters.region === "Global" ? 1 : 0.85))),
  );

  const newMerchants = months.map((m, i) => {
    const curr = merchantsGrowth[i]?.value ?? 0;
    const prev = i === 0 ? Math.max(0, curr - 10) : merchantsGrowth[i - 1]?.value ?? 0;
    const delta = Math.max(0, curr - prev);
    return { name: m, value: delta, prev: Math.max(0, (merchantsGrowth[i]?.prev ?? prev) - (merchantsGrowth[i - 1]?.prev ?? prev)) };
  });

  const escrowBalance = baseSeries(
    [5_600_000, 5_900_000, 6_120_000, 6_300_000, 6_550_000, 6_780_000].map((v) => Math.round(v * scale * period)),
    [5_250_000, 5_520_000, 5_860_000, 6_010_000, 6_220_000, 6_470_000].map((v) => Math.round(v * scale * period)),
  );

  const lcTx = baseSeries(
    [9_800_000, 10_600_000, 11_300_000, 12_100_000, 13_500_000, 14_300_000].map((v) => Math.round(v * scale * period)),
    [9_100_000, 9_900_000, 10_900_000, 11_500_000, 12_900_000, 13_700_000].map((v) => Math.round(v * scale * period)),
  );

  const pendingPayouts = baseSeries(
    [920_000, 1_010_000, 1_080_000, 1_140_000, 1_190_000, 1_240_000].map((v) => Math.round(v * scale * period)),
    [870_000, 960_000, 1_020_000, 1_090_000, 1_120_000, 1_180_000].map((v) => Math.round(v * scale * period)),
  );

  const refunds = baseSeries(
    [58_000, 62_000, 70_000, 74_000, 82_000, 90_000].map((v) => Math.round(v * scale * period)),
    [51_000, 58_000, 63_000, 69_000, 75_000, 83_000].map((v) => Math.round(v * scale * period)),
  );

  const customerGrowth = baseSeries(
    [8200, 9100, 9800, 10_600, 11_500, 12_400].map((v) => Math.round(v * scale * period)),
    [7800, 8600, 9300, 10_100, 10_900, 11_700].map((v) => Math.round(v * scale * period)),
  );

  const orderStatuses = dist([
    ["PENDING", Math.max(12, Math.round(86 * scale * period))],
    ["PROCESSING", Math.max(18, Math.round(124 * scale * period))],
    ["SHIPPED", Math.max(10, Math.round(74 * scale * period))],
    ["DELIVERED", Math.max(22, Math.round(196 * scale * period))],
    ["CANCELLED", Math.max(2, Math.round(10 * scale * period))],
  ]);

  const merchantsByRegion = dist([
    ["Saudi Arabia", mockMerchants.filter((m) => m.region === "Saudi Arabia").length],
    ["UAE", mockMerchants.filter((m) => m.region === "UAE").length],
    ["GCC", mockMerchants.filter((m) => m.region === "GCC").length],
    ["Global", mockMerchants.filter((m) => m.region === "Global").length],
  ]);

  const salesByCategory = dist([
    ["Steel", Math.round(41_200_000 * scale * period)],
    ["Industrial Tools", Math.round(18_700_000 * scale * period)],
    ["Construction", Math.round(22_500_000 * scale * period)],
    ["Electrical", Math.round(15_850_000 * scale * period)],
    ["Machinery", Math.round(20_200_000 * scale * period)],
    ["Other", Math.round(10_000_000 * scale * period)],
  ]);

  const disputesByType = dist([
    ["delivery", Math.max(2, Math.round(8 * scale * period))],
    ["quality", Math.max(1, Math.round(6 * scale * period))],
    ["payment", Math.max(1, Math.round(4 * scale * period))],
    ["document", Math.max(1, Math.round(3 * scale * period))],
  ]);

  const complianceIssues = dist([
    ["expired_document", Math.max(1, Math.round(12 * scale))],
    ["missing_document", Math.max(1, Math.round(7 * scale))],
    ["risk_flag", Math.max(1, Math.round(5 * scale))],
  ]);

  const records = {
    revenueByMerchant: merchants.slice().sort((a, b) => b.revenueSar - a.revenueSar),
    gmvByMerchant: merchants.slice().sort((a, b) => b.gmvSar - a.gmvSar),
    lcTransactions: mockLc.filter((x) => regionOk(x.region)),
    disputes: mockDisputes.filter((x) => regionOk(x.region)),
    complianceIssues: mockCompliance.filter((x) => regionOk(x.region)),
    refunds: mockRefunds.filter((x) => regionOk(x.region)),
  };

  if (filters.category && filters.category !== "All") {
    const catFactor = filters.category === "Steel" ? 1 : 0.55;
    const scaled = (arr: SeriesPoint[]) => arr.map((p) => ({ ...p, value: Math.round(p.value * catFactor), prev: p.prev ? Math.round(p.prev * catFactor) : undefined }));
    return {
      updatedAt,
      categories,
      merchants,
      series: {
        gmv: scaled(gmv),
        revenue: scaled(revenue),
        orders: scaled(orders),
        activeMerchants: merchantsGrowth,
        newMerchants,
        escrowBalance: scaled(escrowBalance),
        lcTransactions: scaled(lcTx),
        pendingPayouts: scaled(pendingPayouts),
        refunds: scaled(refunds),
        customerGrowth,
      },
      distributions: { ordersByStatus: orderStatuses, merchantsByRegion, salesByCategory: salesByCategory.filter((c) => c.name === filters.category), disputesByType, complianceIssues },
      records,
    };
  }

  return {
    updatedAt,
    categories,
    merchants,
    series: {
      gmv,
      revenue,
      orders,
      activeMerchants: merchantsGrowth,
      newMerchants,
      escrowBalance,
      lcTransactions: lcTx,
      pendingPayouts,
      refunds,
      customerGrowth,
    },
    distributions: { ordersByStatus: orderStatuses, merchantsByRegion, salesByCategory, disputesByType, complianceIssues },
    records,
  };
};

export const createMockDrilldownRows = (input: {
  metric:
    | "GMV"
    | "Revenue"
    | "Orders"
    | "Active Merchants"
    | "New Merchants"
    | "Escrow Balance"
    | "LC Transactions"
    | "Pending Payouts"
    | "Disputes"
    | "Compliance Alerts"
    | "Refunds"
    | "Customer Growth";
  analytics: MockExecutiveAnalytics;
  clickedName?: string;
}) => {
  if (input.metric === "Revenue") {
    return input.analytics.records.revenueByMerchant.slice(0, 12).map((m) => ({
      id: m.id,
      primary: m.name,
      secondary: `${m.region} • ${m.businessType} • ${m.status}`,
      valueSar: m.revenueSar,
    }));
  }
  if (input.metric === "GMV") {
    return input.analytics.records.gmvByMerchant.slice(0, 12).map((m) => ({
      id: m.id,
      primary: m.name,
      secondary: `${m.region} • ${m.businessType} • ${m.status}`,
      valueSar: m.gmvSar,
    }));
  }
  if (input.metric === "LC Transactions") {
    return input.analytics.records.lcTransactions
      .slice(0, 16)
      .map((x) => ({
        id: x.id,
        primary: `${x.id} • ${x.status}`,
        secondary: `${x.merchantName} • ${x.region} • ${new Date(x.createdAt).toLocaleDateString()}`,
        valueSar: x.amountSar,
      }));
  }
  if (input.metric === "Disputes") {
    return input.analytics.records.disputes.slice(0, 16).map((x) => ({
      id: x.id,
      primary: `${x.id} • ${x.type} • ${x.status}`,
      secondary: `${x.merchantName} • ${x.region} • ${new Date(x.createdAt).toLocaleDateString()}`,
      valueSar: x.amountSar,
    }));
  }
  if (input.metric === "Compliance Alerts") {
    return input.analytics.records.complianceIssues.slice(0, 16).map((x) => ({
      id: x.id,
      primary: `${x.type.replaceAll("_", " ")} • ${x.severity.toUpperCase()}`,
      secondary: `${x.merchantName} • ${x.region}${x.documentName ? ` • ${x.documentName}` : ""}`,
      valueSar: 0,
    }));
  }
  if (input.metric === "Refunds") {
    return input.analytics.records.refunds.slice(0, 16).map((x) => ({
      id: x.id,
      primary: `${x.id} • ${x.status}`,
      secondary: `${x.merchantName} • ${x.region} • ${new Date(x.createdAt).toLocaleDateString()}`,
      valueSar: x.amountSar,
    }));
  }
  if (input.metric === "Orders") {
    return input.analytics.merchants.slice(0, 12).map((m) => ({
      id: m.id,
      primary: m.name,
      secondary: `${m.region} • ${m.businessType} • ${m.status}`,
      valueSar: m.orders,
    }));
  }
  if (input.metric === "Active Merchants" || input.metric === "New Merchants") {
    return input.analytics.merchants.slice(0, 12).map((m) => ({
      id: m.id,
      primary: m.name,
      secondary: `${m.region} • ${m.businessType} • ${m.status}`,
      valueSar: 0,
    }));
  }
  if (input.metric === "Escrow Balance" || input.metric === "Pending Payouts") {
    return input.analytics.records.revenueByMerchant.slice(0, 12).map((m) => ({
      id: randomId("fin"),
      primary: m.name,
      secondary: `${m.region} • ${m.businessType}`,
      valueSar: Math.round((m.revenueSar * 1.25) / 10) * 10,
    }));
  }
  if (input.metric === "Customer Growth") {
    return input.analytics.series.customerGrowth.map((p) => ({
      id: randomId("cg"),
      primary: p.name,
      secondary: input.clickedName ? `Clicked ${input.clickedName}` : "Monthly new customers",
      valueSar: p.value,
    }));
  }
  return [];
};
