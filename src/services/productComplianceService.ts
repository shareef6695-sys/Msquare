import type { Product } from "@/types";

export type ProductComplianceCheckKey =
  | "certification_requirements"
  | "restricted_goods"
  | "product_category_rules";

export type ProductComplianceViolation = {
  check: ProductComplianceCheckKey;
  platform: "SABER" | "FASAH" | "General";
  code: string;
  message: string;
  productId?: string;
  productName?: string;
};

export type ProductComplianceResult = {
  destinationCountry: string;
  passed: boolean;
  violations: ProductComplianceViolation[];
};

const normalize = (value: string) => value.trim().toLowerCase();

const SAUDI_CATEGORY_RULES: Record<
  string,
  { requiresSaber?: boolean; requiresFasah?: boolean; label: string }
> = {
  c1: { label: "Electronics", requiresSaber: true, requiresFasah: true },
  c3: { label: "Industrial Equipment", requiresSaber: true },
  c5: { label: "Machinery", requiresSaber: true, requiresFasah: true },
  c6: { label: "Beauty", requiresFasah: true },
};

const RESTRICTED_GOODS_TERMS = [
  "alcohol",
  "wine",
  "beer",
  "tobacco",
  "cigarette",
  "vape",
  "weapon",
  "firearm",
  "gun",
  "explosive",
  "narcotic",
  "drug",
];

const containsRestrictedTerm = (product: Product) => {
  const haystack = `${product.name} ${product.description}`.toLowerCase();
  return RESTRICTED_GOODS_TERMS.some((term) => haystack.includes(term));
};

const evaluateSaudiProduct = (product: Product): ProductComplianceViolation[] => {
  const violations: ProductComplianceViolation[] = [];
  const rules = SAUDI_CATEGORY_RULES[product.categoryId];

  if (containsRestrictedTerm(product)) {
    violations.push({
      check: "restricted_goods",
      platform: "FASAH",
      code: "RESTRICTED_GOODS_SA",
      message: "Product appears to match restricted goods terms for Saudi Arabia imports.",
      productId: product.id,
      productName: product.name,
    });
  }

  if (rules) {
    if (rules.requiresSaber && !product.compliance?.saberCertified) {
      violations.push({
        check: "certification_requirements",
        platform: "SABER",
        code: "SABER_CERT_REQUIRED",
        message: `${rules.label} requires SABER certification before import into Saudi Arabia.`,
        productId: product.id,
        productName: product.name,
      });
    }
    if (rules.requiresFasah && !product.compliance?.fasahDeclared) {
      violations.push({
        check: "certification_requirements",
        platform: "FASAH",
        code: "FASAH_DECLARATION_REQUIRED",
        message: `${rules.label} requires FASAH declaration/compliance documentation for Saudi Arabia.`,
        productId: product.id,
        productName: product.name,
      });
    }
  }

  if (!rules && normalize(product.location).includes("saudi")) {
    violations.push({
      check: "product_category_rules",
      platform: "General",
      code: "CATEGORY_RULES_REVIEW",
      message: "Product category is not mapped to Saudi compliance rules yet and needs manual review.",
      productId: product.id,
      productName: product.name,
    });
  }

  return violations;
};

export const evaluateProductCompliance = (
  product: Product,
  destinationCountry: string,
): ProductComplianceResult => {
  const country = normalize(destinationCountry);
  const violations = country === "saudi arabia" ? evaluateSaudiProduct(product) : [];
  return { destinationCountry, passed: violations.length === 0, violations };
};

export const evaluateCartCompliance = (
  products: Product[],
  destinationCountry: string,
): ProductComplianceResult => {
  const country = normalize(destinationCountry);
  const violations =
    country === "saudi arabia"
      ? products.flatMap((product) => evaluateSaudiProduct(product))
      : [];
  return { destinationCountry, passed: violations.length === 0, violations };
};
