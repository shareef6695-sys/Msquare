import type { MockMerchant } from "@/data/mockMerchants";
import type { MockCustomer } from "@/services/adminService";
import type { Order } from "@/types";

export const buildMockAdminStats = (input: {
  merchants: MockMerchant[];
  customers: MockCustomer[];
  orders: Order[];
  pendingDisputes: number;
  lcRequestsUnderReview: number;
}) => {
  const totalMerchants = input.merchants.length;
  const pendingMerchants = input.merchants.filter((m) => m.status === "pending_verification").length;
  const activeMerchants = input.merchants.filter((m) => m.status === "approved").length;
  const rejectedMerchants = input.merchants.filter((m) => m.status === "rejected").length;
  const totalCustomers = input.customers.length;
  const suspendedCustomers = input.customers.filter((c) => c.status === "suspended").length;
  const totalOrders = input.orders.length;
  const totalGmv = input.orders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  const escrowUnderReview = input.orders.filter((o) => o.escrowStatus === "HELD").length;
  const insuranceClaims = input.orders.filter((o) => o.insuranceClaimStatus && o.insuranceClaimStatus !== "NONE").length;

  return {
    totalMerchants,
    pendingMerchants,
    activeMerchants,
    rejectedMerchants,
    totalCustomers,
    suspendedCustomers,
    totalOrders,
    totalGmv,
    pendingDisputes: input.pendingDisputes,
    lcRequestsUnderReview: input.lcRequestsUnderReview,
    escrowUnderReview,
    insuranceClaims,
  };
};
