"use client";

export const MOCK_AI_LATENCY_MS = 900;

export const mockAiCopy = {
  productDescriptions: [
    {
      title: "Industrial-Grade {name} for Reliable B2B Supply",
      bullets: [
        "Consistent quality suitable for recurring procurement",
        "Specification-ready listing for RFQs and tenders",
        "Optimized for logistics, packaging, and bulk ordering",
        "Clear compliance-ready documentation placeholders",
      ],
      seo: ["wholesale {name}", "{category} supplier", "bulk {name}", "B2B {category}", "industrial {name}"],
      description:
        "{name} is designed for professional buyers who need dependable quality, repeatable specs, and smooth fulfillment. This listing highlights key requirements commonly used in B2B procurement—materials, dimensions, tolerance expectations, packaging, and delivery readiness—so you can compare suppliers quickly and place confident orders.\n\nIdeal for distributors, contractors, and industrial procurement teams. Customization and volume pricing can be discussed via RFQ.",
    },
    {
      title: "{name} | Premium {category} for Enterprise Buyers",
      bullets: [
        "Enterprise-ready QC approach (batch consistency focus)",
        "MOQ-friendly packaging and palletization options",
        "Supports LC / Escrow workflows in MSquare",
        "Clear lead time and dispatch communication",
      ],
      seo: ["{name} manufacturer", "{category} wholesale", "{name} MOQ", "LC accepted supplier", "Escrow protected order"],
      description:
        "Source {name} with a focus on consistency, procurement clarity, and delivery confidence. This product is positioned for enterprise buyers seeking predictable batches, transparent order terms, and a smooth trade-finance workflow.\n\nUse MSquare Trade Assurance, Escrow, or LC to align payment and shipment milestones while keeping the ordering process simple for your team.",
    },
  ],
  categoryRationales: [
    "Product name strongly matches common keywords in this category.",
    "The description indicates typical use-cases aligned with this category.",
    "Buyer intent signals point to this category as the best browsing match.",
  ],
  searchSummaries: [
    "These results match your intent based on product name, category, supplier location, and typical B2B buying patterns.",
    "Recommendations are based on keyword similarity, category fit, and buyer-friendly ordering terms.",
  ],
  merchantAssistant: {
    greeting: "Hi, I’m the MSquare Assistant. Ask me anything about listings, LC payments, or Trade Assurance.",
    qa: [
      {
        match: ["add product", "create product", "list product", "upload product"],
        answer:
          "To add a product: go to Merchant → Products → Add product. Fill name, category, pricing, MOQ, stock, and images. Use “Generate with AI” to draft a description, then edit it to match your spec and compliance terms before saving.",
      },
      {
        match: ["improve listing", "better listing", "optimize", "seo"],
        answer:
          "To improve listings: include clear specs (dimensions, grade/material, tolerance), packaging, lead time, and supported payment methods. Use bullet points for procurement teams, and add SEO keywords buyers typically search for.",
      },
      {
        match: ["lc", "letter of credit", "how lc works"],
        answer:
          "LC is a bank-backed payment method where documents and milestones matter. In MSquare (mock), LC orders move through Under review → Approved → Settled. Always ensure invoice and shipping docs match the LC terms. Final approval stays with admins/banks.",
      },
      {
        match: ["trade assurance", "buyer protection"],
        answer:
          "Trade Assurance protects buyers by aligning order terms, shipment milestones, and dispute handling. Keep your listing accurate, confirm lead times, and share tracking updates to reduce dispute risk.",
      },
    ],
    fallback:
      "I can help with product listings, procurement-friendly descriptions, LC steps, and Trade Assurance. Try: “How do I improve my listing?” or “How does LC payment work?”",
  },
  compliance: {
    riskExplanations: {
      Low: "Low risk indicates the account has strong compliance signals and minimal overdue or rejected documents.",
      Medium: "Medium risk indicates some compliance gaps (expiring/under review) that may require follow-up before higher limits are allowed.",
      High: "High risk indicates significant compliance gaps (expired/rejected/overdue) and likely requires restrictions until resolved.",
    },
    recommendedActions: {
      expired: "Request replacement and keep account on hold until a valid document is submitted and approved.",
      expiring_soon: "Notify the account and request an updated document before expiry to avoid operational restrictions.",
      under_review: "Review document clarity and metadata. Approve if readable and valid; otherwise request replacement with guidance.",
      rejected: "Provide a clear rejection reason and request a corrected re-upload. Keep decisions manual.",
      default: "Request clarification and supporting documents. Do not auto-approve.",
    },
    missingDocsByOwner: {
      merchant: ["Commercial Registration", "VAT certificate", "IBAN confirmation letter", "Authorized signatory ID"],
      customer: ["National ID / Passport", "Company authorization letter (if applicable)"],
    },
    rejectionReasons: [
      "Document is not readable or missing key fields (name/number/expiry).",
      "Document appears expired or does not match the submitted issue/expiry dates.",
      "Business name or registration number does not match account details.",
      "Missing signature/stamp or incorrect format for verification.",
    ],
  },
};

export const pickFrom = <T,>(items: T[], seed: string) => {
  if (items.length === 0) throw new Error("No mock AI responses available.");
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const idx = Math.abs(h) % items.length;
  return items[idx];
};

