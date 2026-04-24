import React from "react";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Banknote, ClipboardList, FileText, ShieldCheck } from "lucide-react";

const tradeFinanceItems = [
  {
    title: "LC Requests",
    description: "Capture buyer requests and initiate LC workflows per order.",
    icon: <ClipboardList className="w-5 h-5" />,
    accent: "bg-primary-50 text-primary-700 border-primary-200/60",
  },
  {
    title: "LC Documents",
    description: "Manage invoices, packing lists, and bank-required documents.",
    icon: <FileText className="w-5 h-5" />,
    accent: "bg-blue-50 text-blue-700 border-blue-200/60",
  },
  {
    title: "LC Status",
    description: "Monitor bank review, acceptance, and settlement milestones.",
    icon: <ShieldCheck className="w-5 h-5" />,
    accent: "bg-amber-50 text-amber-800 border-amber-200/60",
  },
  {
    title: "Bank Details",
    description: "Maintain beneficiary details, SWIFT codes, and settlement accounts.",
    icon: <Banknote className="w-5 h-5" />,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  },
];

export default function MerchantTradeFinancePage() {
  return (
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Trade Finance</h1>
          <p className="text-gray-500">
            Centralize LC orders, documents, and approvals for enterprise buyers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-900/5">
          <span className="h-2 w-2 rounded-full bg-primary-500" />
          LC-ready workflow
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tradeFinanceItems.map((item) => (
          <Card key={item.title} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${item.accent}`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-black text-gray-900">{item.title}</div>
                  <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Coming Soon</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="text-lg font-black text-gray-900">LC Requests</div>
            <div className="text-sm text-gray-500 mt-1">Buyer-initiated LC requests tied to orders.</div>
            <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No LC requests yet.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-lg font-black text-gray-900">Approval Panel</div>
            <div className="text-sm text-gray-500 mt-1">Review terms, approve documents, and submit to bank.</div>
            <div className="mt-5 space-y-3">
              {["Review LC draft", "Approve document pack", "Submit to bank", "Track settlement"].map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800"
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Coming Soon</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="text-lg font-black text-gray-900">LC Documents</div>
            <div className="text-sm text-gray-500 mt-1">Upload proforma invoice and shipment documents.</div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["Proforma Invoice", "Commercial Invoice", "Packing List", "Bill of Lading"].map((doc) => (
                <div key={doc} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">{doc}</div>
                  <div className="text-xs text-gray-500 mt-1">Upload required document</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">Coming Soon</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-lg font-black text-gray-900">LC Status</div>
            <div className="text-sm text-gray-500 mt-1">Bank review and milestone tracking.</div>
            <div className="mt-5 space-y-3">
              {["Draft", "Under review", "Approved", "Settled"].map((s) => (
                <div key={s} className="flex items-center justify-between rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">{s}</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pending</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
