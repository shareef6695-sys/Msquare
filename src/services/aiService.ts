"use client";

import { MOCK_AI_LATENCY_MS, mockAiCopy, pickFrom } from "@/data/mockAIResponses";

export type AIGenerationMeta = {
  provider: "mock";
  model: "msquare-mock-ai-v1";
  generatedAt: string;
};

export type AIProductDescriptionInput = {
  productName: string;
  categoryName?: string;
  features?: string[];
  targetBuyer?: string;
};

export type AIProductDescriptionOutput = {
  title: string;
  description: string;
  bulletPoints: string[];
  seoKeywords: string[];
  meta: AIGenerationMeta;
};

export type CategoryChoice = { id: string; name: string; slug?: string };

export type AICategorySuggestionInput = {
  productName: string;
  description?: string;
  categories: CategoryChoice[];
};

export type AICategorySuggestionOutput = {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  confidence: number;
  rationales: string[];
  meta: AIGenerationMeta;
};

export type AISearchMatch = {
  productId: string;
  score: number;
  reasons: string[];
};

export type AISearchProductsInput<TProduct extends { id: string; name: string; description?: string; merchantName?: string; location?: string; categoryId?: string }> =
  {
    query: string;
    products: TProduct[];
    categoriesById?: Record<string, { name: string }>;
    limit?: number;
  };

export type AISearchProductsOutput = {
  summary: string;
  matches: AISearchMatch[];
  meta: AIGenerationMeta;
};

export type AIProductRecommendationsInput<TProduct extends { id: string; categoryId?: string; merchantId?: string }> = {
  productId: string;
  products: TProduct[];
  limit?: number;
};

export type AIProductRecommendationsOutput = {
  similarProductIds: string[];
  frequentlyBoughtTogetherProductIds: string[];
  recommendedSupplierIds: string[];
  meta: AIGenerationMeta;
};

export type AIComplianceAnalysisInput = {
  ownerType: "merchant" | "customer";
  documentType: string;
  computedStatus: string;
  riskLevel: "Low" | "Medium" | "High";
  daysToExpiry?: number;
  inGrace?: boolean;
  hasOverride?: boolean;
};

export type AIComplianceAnalysisOutput = {
  missingDocuments: string[];
  riskExplanation: string;
  recommendedAction: string;
  rejectionReasonSuggestion: string;
  notes: string[];
  meta: AIGenerationMeta;
};

export type AIRejectionReasonInput = {
  documentType: string;
  computedStatus?: string;
  riskLevel?: "Low" | "Medium" | "High";
  context?: string;
};

export type AIRejectionReasonOutput = {
  reason: string;
  alternatives: string[];
  meta: AIGenerationMeta;
};

export type AIMerchantAssistantInput = {
  message: string;
};

export type AIMerchantAssistantOutput = {
  answer: string;
  meta: AIGenerationMeta;
};

const delay = async (ms: number) => {
  await new Promise((r) => window.setTimeout(r, ms));
};

const meta = (): AIGenerationMeta => ({
  provider: "mock",
  model: "msquare-mock-ai-v1",
  generatedAt: new Date().toISOString(),
});

const normalize = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9\s]/g, " ").replaceAll(/\s+/g, " ").trim();

const tokens = (s: string) => normalize(s).split(" ").filter(Boolean);

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const interpolate = (tmpl: string, vars: Record<string, string>) => {
  return tmpl.replaceAll(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

export const generateProductDescription = async (input: AIProductDescriptionInput): Promise<AIProductDescriptionOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const seed = `${input.productName}|${input.categoryName ?? ""}|${(input.features ?? []).join(",")}|${input.targetBuyer ?? ""}`;
  const template = pickFrom(mockAiCopy.productDescriptions, seed);

  const category = (input.categoryName ?? "Industrial Supplies").trim() || "Industrial Supplies";
  const name = input.productName.trim() || "Product";

  const baseBullets = [...template.bullets];
  const featureBullets = (input.features ?? []).filter(Boolean).slice(0, 4).map((f) => `Feature: ${f}`);
  const buyerBullet = input.targetBuyer?.trim() ? [`Best for: ${input.targetBuyer.trim()}`] : [];
  const bulletPoints = [...buyerBullet, ...featureBullets, ...baseBullets].slice(0, 8);

  const seoKeywords = template.seo.map((k) => interpolate(k, { name, category })).slice(0, 10);
  const title = interpolate(template.title, { name, category });

  const description = [
    interpolate(template.description, { name, category }),
    input.features && input.features.length > 0 ? `\nKey features: ${input.features.filter(Boolean).slice(0, 6).join(", ")}.` : "",
  ]
    .join("")
    .trim();

  return { title, description, bulletPoints, seoKeywords, meta: meta() };
};

export const suggestCategory = async (input: AICategorySuggestionInput): Promise<AICategorySuggestionOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const q = `${input.productName} ${input.description ?? ""}`.trim();
  const qTokens = new Set(tokens(q));

  const scored = input.categories.map((c) => {
    const nameTokens = tokens(c.name);
    const hit = nameTokens.reduce((acc, t) => acc + (qTokens.has(t) ? 1 : 0), 0);
    const partial = nameTokens.reduce((acc, t) => acc + (Array.from(qTokens).some((qt) => qt.includes(t) || t.includes(qt)) ? 0.35 : 0), 0);
    const raw = hit + partial;
    return { c, raw };
  });

  scored.sort((a, b) => b.raw - a.raw);
  const best = scored[0]?.c ?? input.categories[0];
  const second = scored[1]?.raw ?? 0;
  const first = scored[0]?.raw ?? 0;

  const confidence = clamp(0.55 + (first - second) * 0.08 + clamp(first * 0.05, 0, 0.25), 0.5, 0.92);

  const rationales = mockAiCopy.categoryRationales.slice(0, 3);
  return {
    suggestedCategoryId: best.id,
    suggestedCategoryName: best.name,
    confidence: Number(confidence.toFixed(2)),
    rationales,
    meta: meta(),
  };
};

export const searchProductsWithAI = async <
  TProduct extends { id: string; name: string; description?: string; merchantName?: string; location?: string; categoryId?: string },
>(
  input: AISearchProductsInput<TProduct>,
): Promise<AISearchProductsOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const q = input.query.trim();
  const qTokens = tokens(q);
  const qSet = new Set(qTokens);

  const matches: AISearchMatch[] = input.products
    .map((p) => {
      const categoryName = p.categoryId && input.categoriesById ? input.categoriesById[p.categoryId]?.name ?? "" : "";
      const hay = `${p.name} ${p.description ?? ""} ${p.merchantName ?? ""} ${p.location ?? ""} ${categoryName}`;
      const hayTokens = tokens(hay);
      const haySet = new Set(hayTokens);

      let score = 0;
      const reasons: string[] = [];

      const nameTokens = new Set(tokens(p.name));
      const nameHits = qTokens.filter((t) => nameTokens.has(t)).length;
      if (nameHits > 0) {
        score += 3 * nameHits;
        reasons.push("Matches product name keywords");
      }

      const descHits = qTokens.filter((t) => haySet.has(t)).length;
      if (descHits > 0) score += 1.2 * descHits;

      if (categoryName) {
        const catHits = tokens(categoryName).filter((t) => qSet.has(t)).length;
        if (catHits > 0) {
          score += 2.2 * catHits;
          reasons.push("Aligned with the suggested category intent");
        }
      }

      const merchantHits = p.merchantName ? tokens(p.merchantName).filter((t) => qSet.has(t)).length : 0;
      if (merchantHits > 0) {
        score += 1.5 * merchantHits;
        reasons.push("Matches supplier/brand terms");
      }

      const locationHits = p.location ? tokens(p.location).filter((t) => qSet.has(t)).length : 0;
      if (locationHits > 0) {
        score += 1.1 * locationHits;
        reasons.push("Matches preferred shipping/location terms");
      }

      const fuzzy = hayTokens.reduce((acc, ht) => acc + (qTokens.some((qt) => ht.includes(qt) || qt.includes(ht)) ? 0.15 : 0), 0);
      score += fuzzy;

      if (reasons.length === 0 && score > 0.5) reasons.push("General relevance to your query");

      return { productId: p.id, score, reasons };
    })
    .filter((m) => m.score > 1.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 6)
    .map((m) => ({ ...m, score: Number(m.score.toFixed(2)) }));

  const summary = pickFrom(mockAiCopy.searchSummaries, q || "search");
  return { summary, matches, meta: meta() };
};

export const getProductRecommendations = async <TProduct extends { id: string; categoryId?: string; merchantId?: string }>(
  input: AIProductRecommendationsInput<TProduct>,
): Promise<AIProductRecommendationsOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const base = input.products.find((p) => p.id === input.productId);
  const categoryId = base?.categoryId;
  const merchantId = base?.merchantId;

  const similar = input.products
    .filter((p) => p.id !== input.productId)
    .map((p) => {
      let score = 0;
      if (categoryId && p.categoryId === categoryId) score += 3;
      if (merchantId && p.merchantId !== merchantId) score += 0.6;
      return { p, score };
    })
    .filter((x) => x.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 6)
    .map((x) => x.p.id);

  const together = input.products
    .filter((p) => p.id !== input.productId)
    .map((p) => {
      let score = 0;
      if (merchantId && p.merchantId === merchantId) score += 2;
      if (categoryId && p.categoryId === categoryId) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.p.id);

  const supplierCounts = new Map<string, number>();
  for (const pid of [...similar, ...together]) {
    const p = input.products.find((x) => x.id === pid);
    if (!p?.merchantId) continue;
    supplierCounts.set(p.merchantId, (supplierCounts.get(p.merchantId) ?? 0) + 1);
  }
  const recommendedSupplierIds = Array.from(supplierCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => id);

  return {
    similarProductIds: similar,
    frequentlyBoughtTogetherProductIds: together,
    recommendedSupplierIds,
    meta: meta(),
  };
};

export const analyzeComplianceDocuments = async (input: AIComplianceAnalysisInput): Promise<AIComplianceAnalysisOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const status = String(input.computedStatus ?? "").toLowerCase();
  const action =
    status === "expired"
      ? mockAiCopy.compliance.recommendedActions.expired
      : status === "expiring_soon"
        ? mockAiCopy.compliance.recommendedActions.expiring_soon
        : status === "under_review"
          ? mockAiCopy.compliance.recommendedActions.under_review
          : status === "rejected"
            ? mockAiCopy.compliance.recommendedActions.rejected
            : mockAiCopy.compliance.recommendedActions.default;

  const missing = (mockAiCopy.compliance.missingDocsByOwner as any)[input.ownerType] ?? [];
  const riskExplanation = (mockAiCopy.compliance.riskExplanations as any)[input.riskLevel] ?? mockAiCopy.compliance.riskExplanations.Medium;

  const rejectionReasonSuggestion = pickFrom(mockAiCopy.compliance.rejectionReasons, `${input.documentType}|${input.riskLevel}|${status}`);

  const notes: string[] = [];
  if (typeof input.daysToExpiry === "number") {
    if (input.daysToExpiry < 0) notes.push(`Overdue by ${Math.abs(input.daysToExpiry)} days.`);
    else notes.push(`${input.daysToExpiry} days until expiry.`);
  }
  if (input.inGrace) notes.push("Within grace period. Limit operations according to policy.");
  if (input.hasOverride) notes.push("Expiry override exists. Verify override reason and supporting evidence.");

  return {
    missingDocuments: missing.slice(0, 4),
    riskExplanation,
    recommendedAction: action,
    rejectionReasonSuggestion,
    notes,
    meta: meta(),
  };
};

export const generateRejectionReason = async (input: AIRejectionReasonInput): Promise<AIRejectionReasonOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const seed = `${input.documentType}|${input.computedStatus ?? ""}|${input.riskLevel ?? ""}|${input.context ?? ""}`;
  const reason = pickFrom(mockAiCopy.compliance.rejectionReasons, seed);
  const alternatives = mockAiCopy.compliance.rejectionReasons.filter((r) => r !== reason).slice(0, 3);
  return { reason, alternatives, meta: meta() };
};

export const getMerchantAssistantReply = async (input: AIMerchantAssistantInput): Promise<AIMerchantAssistantOutput> => {
  await delay(MOCK_AI_LATENCY_MS);

  const msg = normalize(input.message);
  const rules = mockAiCopy.merchantAssistant.qa;
  for (const r of rules) {
    if (r.match.some((m) => msg.includes(normalize(m)))) return { answer: r.answer, meta: meta() };
  }
  return { answer: mockAiCopy.merchantAssistant.fallback, meta: meta() };
};

