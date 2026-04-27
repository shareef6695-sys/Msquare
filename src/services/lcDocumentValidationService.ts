import type { Order } from "@/types";

export type LcValidationCheckKey = "invoice_format" | "shipment_date" | "certificate_wording" | "insurance_coverage";

export type LcValidationFinding = {
  check: LcValidationCheckKey;
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type LcDocumentPack = {
  uploaded?: boolean;
  fileName?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  shipmentDate?: string;
  certificateText?: string;
  insuranceCoveragePercent?: number;
};

export type LcValidationResult = {
  ruleSet: "UCP_600";
  passed: boolean;
  errors: LcValidationFinding[];
  warnings: LcValidationFinding[];
};

const normalize = (value: string) => value.trim().toLowerCase();

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseIsoDate = (value: string) => {
  if (!isIsoDate(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetweenUtc = (a: Date, b: Date) => {
  const start = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const end = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
};

const invoiceNumberLooksValid = (invoiceNumber: string) => {
  const v = invoiceNumber.trim();
  if (v.length < 5) return false;
  return /^[A-Z0-9][A-Z0-9._\-\/ ]{3,}$/.test(v);
};

export const validateLcDocumentPack = (order: Order, pack: LcDocumentPack | undefined | null): LcValidationResult => {
  const errors: LcValidationFinding[] = [];
  const warnings: LcValidationFinding[] = [];
  const now = new Date();
  const orderCreated = new Date(order.createdAt);

  const push = (finding: LcValidationFinding) => {
    (finding.severity === "error" ? errors : warnings).push(finding);
  };

  const fileName = pack?.fileName?.trim() ?? "";
  const invoiceNumber = pack?.invoiceNumber?.trim() ?? "";
  const invoiceDateRaw = pack?.invoiceDate?.trim() ?? "";
  const shipmentDateRaw = pack?.shipmentDate?.trim() ?? "";
  const certificateText = pack?.certificateText?.trim() ?? "";
  const insuranceCoveragePercent =
    typeof pack?.insuranceCoveragePercent === "number" ? pack.insuranceCoveragePercent : undefined;

  if (!fileName) {
    push({
      check: "invoice_format",
      code: "UCP600_PACK_MISSING",
      message: "LC document pack is missing (no uploaded file).",
      severity: "error",
    });
  } else if (!/\.(pdf|zip|rar)$/i.test(fileName)) {
    push({
      check: "invoice_format",
      code: "UCP600_PACK_FORMAT",
      message: "Uploaded LC file should be a PDF or an archive (zip/rar).",
      severity: "warning",
    });
  }

  if (!invoiceNumber) {
    push({
      check: "invoice_format",
      code: "UCP600_ART18_INVOICE_NUMBER_MISSING",
      message: "Invoice number is missing.",
      severity: "error",
    });
  } else if (!invoiceNumberLooksValid(invoiceNumber)) {
    push({
      check: "invoice_format",
      code: "UCP600_ART18_INVOICE_NUMBER_FORMAT",
      message: "Invoice number format looks invalid.",
      severity: "error",
    });
  }

  const invoiceDate = invoiceDateRaw ? parseIsoDate(invoiceDateRaw) : null;
  if (!invoiceDate) {
    push({
      check: "invoice_format",
      code: "UCP600_ART18_INVOICE_DATE_INVALID",
      message: "Invoice date is missing or invalid (expected YYYY-MM-DD).",
      severity: "error",
    });
  } else if (daysBetweenUtc(invoiceDate, now) < 0) {
    push({
      check: "invoice_format",
      code: "UCP600_ART18_INVOICE_DATE_FUTURE",
      message: "Invoice date is in the future.",
      severity: "warning",
    });
  }

  const shipmentDate = shipmentDateRaw ? parseIsoDate(shipmentDateRaw) : null;
  if (!shipmentDate) {
    push({
      check: "shipment_date",
      code: "UCP600_SHIPMENT_DATE_INVALID",
      message: "Shipment date is missing or invalid (expected YYYY-MM-DD).",
      severity: "error",
    });
  } else {
    if (invoiceDate && shipmentDate.getTime() < invoiceDate.getTime()) {
      push({
        check: "shipment_date",
        code: "UCP600_SHIPMENT_BEFORE_INVOICE",
        message: "Shipment date is earlier than invoice date.",
        severity: "error",
      });
    }
    if (!Number.isNaN(orderCreated.getTime())) {
      const dte = daysBetweenUtc(orderCreated, shipmentDate);
      if (dte < -30) {
        push({
          check: "shipment_date",
          code: "UCP600_SHIPMENT_BEFORE_ORDER",
          message: "Shipment date is significantly earlier than order creation date.",
          severity: "warning",
        });
      }
      if (dte > 120) {
        push({
          check: "shipment_date",
          code: "UCP600_SHIPMENT_TOO_LATE",
          message: "Shipment date is too far from order creation date and may breach LC latest shipment terms.",
          severity: "warning",
        });
      }
    }
  }

  if (!certificateText) {
    push({
      check: "certificate_wording",
      code: "UCP600_CERTIFICATE_TEXT_MISSING",
      message: "Certificate wording text is missing.",
      severity: "error",
    });
  } else {
    const text = normalize(certificateText);
    if (certificateText.length < 40) {
      push({
        check: "certificate_wording",
        code: "UCP600_CERTIFICATE_TOO_SHORT",
        message: "Certificate wording is too short and may be rejected for missing statements.",
        severity: "warning",
      });
    }
    if (!text.includes("certif") && !text.includes("we hereby") && !text.includes("certify")) {
      push({
        check: "certificate_wording",
        code: "UCP600_CERTIFICATE_MISSING_CERTIFY",
        message: "Certificate wording does not include a clear certification statement.",
        severity: "warning",
      });
    }
    if (!text.includes(normalize(order.id))) {
      push({
        check: "certificate_wording",
        code: "UCP600_CERTIFICATE_MISSING_ORDER_REF",
        message: "Certificate wording does not reference the order/LC reference.",
        severity: "warning",
      });
    }
    if (text.includes("draft")) {
      push({
        check: "certificate_wording",
        code: "UCP600_CERTIFICATE_DRAFT_WORDING",
        message: "Certificate wording contains 'draft' which can trigger bank discrepancies.",
        severity: "error",
      });
    }
  }

  const insuranceRequired = Boolean(order.insuranceEnabled);
  if (insuranceRequired) {
    if (insuranceCoveragePercent === undefined || Number.isNaN(insuranceCoveragePercent)) {
      push({
        check: "insurance_coverage",
        code: "UCP600_ART28_INSURANCE_MISSING",
        message: "Insurance coverage is required but missing.",
        severity: "error",
      });
    } else if (insuranceCoveragePercent < 110) {
      push({
        check: "insurance_coverage",
        code: "UCP600_ART28_COVERAGE_LOW",
        message: "Insurance coverage should be at least 110% of the insured value unless otherwise specified.",
        severity: "error",
      });
    }
  } else if (insuranceCoveragePercent !== undefined && insuranceCoveragePercent < 110) {
    push({
      check: "insurance_coverage",
      code: "UCP600_ART28_COVERAGE_LOW_WARN",
      message: "Insurance coverage is below 110% which commonly triggers bank queries.",
      severity: "warning",
    });
  }

  return { ruleSet: "UCP_600", passed: errors.length === 0, errors, warnings };
};

