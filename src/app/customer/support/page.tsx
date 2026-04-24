"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/features/customer/CustomerLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loadSession } from "@/services/authStore";
import { seedOrdersIfEmpty } from "@/services/orderStore";
import { type Order } from "@/types";
import { AlertTriangle, Gavel, LifeBuoy, MessageSquareText } from "lucide-react";

type DisputeState = Record<string, { status: string; reason: string; description: string }>;
type ClaimState = Record<string, { status: string; amount: string; description: string }>;

type SupportTicket = {
  id: string;
  createdAt: string;
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export default function CustomerSupportPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [disputes, setDisputes] = useState<DisputeState>({});
  const [claims, setClaims] = useState<ClaimState>({});

  const [subject, setSubject] = useState("Order support");
  const [message, setMessage] = useState("");

  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("Delivery issue");
  const [disputeDescription, setDisputeDescription] = useState("");

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== "CUSTOMER") return;
    setCustomerId(session.user.id);
    setOrders(seedOrdersIfEmpty().filter((o) => o.customerId === session.user.id));
    if (typeof window !== "undefined") {
      setDisputes(safeJsonParse<DisputeState>(window.localStorage.getItem("msquare.disputes.v1"), {}));
      setClaims(safeJsonParse<ClaimState>(window.localStorage.getItem("msquare.insuranceClaims.v1"), {}));
      setTickets(safeJsonParse<SupportTicket[]>(window.localStorage.getItem(`msquare.supportTickets.customer.${session.user.id}.v1`), []));
    }
  }, []);

  useEffect(() => {
    if (!customerId || typeof window === "undefined") return;
    window.localStorage.setItem(`msquare.supportTickets.customer.${customerId}.v1`, JSON.stringify(tickets));
  }, [customerId, tickets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("msquare.disputes.v1", JSON.stringify(disputes));
  }, [disputes]);

  const openDisputes = useMemo(() => Object.values(disputes).filter((d) => String(d.status).toUpperCase() !== "RESOLVED").length, [disputes]);
  const openClaims = useMemo(() => Object.values(claims).filter((c) => String(c.status).toUpperCase() !== "APPROVED").length, [claims]);

  const submitTicket = () => {
    if (!customerId) return;
    const s = subject.trim();
    const m = message.trim();
    if (!s || !m) return;
    const t: SupportTicket = {
      id: `t_${Math.random().toString(16).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      subject: s,
      message: m,
      status: "OPEN",
    };
    setTickets((items) => [t, ...items]);
    setMessage("");
  };

  const submitDispute = () => {
    if (!disputeFor) return;
    setDisputes((d) => ({
      ...d,
      [disputeFor]: {
        status: "OPEN",
        reason: disputeReason.trim() || "Issue",
        description: disputeDescription.trim() || "Customer opened a dispute.",
      },
    }));
    setDisputeFor(null);
    setDisputeDescription("");
    setDisputeReason("Delivery issue");
  };

  const Modal = ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDisputeFor(null)} />
        <div className="relative w-full max-w-lg rounded-3xl border border-gray-200/60 bg-white shadow-xl shadow-gray-900/20">
          <div className="p-6 border-b border-gray-100/60">
            <div className="text-lg font-black text-gray-900">{title}</div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <CustomerLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Support & disputes</h1>
          <p className="text-gray-500">Open support tickets, track disputes and claims (mock).</p>
        </div>
        <Link href="/customer/orders">
          <Button variant="outline">Open orders</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Tickets</div>
              <div className="text-xl font-black text-gray-900 mt-1">{tickets.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
              <Gavel className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Open disputes</div>
              <div className="text-xl font-black text-gray-900 mt-1">{openDisputes}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Claims</div>
              <div className="text-xl font-black text-gray-900 mt-1">{openClaims}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-100/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">Create support ticket</div>
              <div className="text-xs text-gray-500 mt-1">Tickets are mock and stored locally.</div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Subject</div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Subject"
                  disabled={!customerId}
                />
              </div>
              <div>
                <div className="text-sm font-black text-gray-900 mb-2">Related order (optional)</div>
                <select
                  className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    setSubject(`Order support: ${id}`);
                  }}
                  disabled={!customerId}
                  defaultValue=""
                >
                  <option value="">Select order</option>
                  {orders.slice(0, 20).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Message</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Describe your issue…"
                disabled={!customerId}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button onClick={submitTicket} disabled={!customerId || !subject.trim() || !message.trim()}>
                Submit ticket
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Open dispute</div>
              <div className="text-sm text-gray-500 mt-1">Admins still make final decisions.</div>
            </div>
            <CardContent className="p-6 space-y-3">
              <div className="text-sm text-gray-700">Choose an order to open a dispute.</div>
              <select
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                onChange={(e) => setDisputeFor(e.target.value || null)}
                disabled={!customerId}
                value={disputeFor ?? ""}
              >
                <option value="">Select order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id}
                  </option>
                ))}
              </select>
              <Button className="w-full" onClick={() => setDisputeFor(disputeFor)} disabled={!customerId || !disputeFor}>
                Continue
              </Button>
              <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Disputes are stored in local storage under <span className="font-semibold text-gray-700">msquare.disputes.v1</span>.
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="p-6 border-b border-gray-100/60">
              <div className="text-lg font-black text-gray-900">Tickets</div>
              <div className="text-sm text-gray-500 mt-1">Recent support conversations (mock).</div>
            </div>
            <CardContent className="p-6 space-y-3">
              {tickets.length === 0 ? (
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">No tickets yet.</div>
              ) : (
                tickets.slice(0, 6).map((t) => (
                  <div key={t.id} className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
                    <div className="text-sm font-black text-gray-900">{t.subject}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(t.createdAt).toLocaleString()} • <span className="font-semibold text-gray-700">{t.status}</span>
                    </div>
                    <div className="text-sm text-gray-700 mt-2 line-clamp-3">{t.message}</div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setTickets((items) => items.map((x) => (x.id === t.id ? { ...x, status: "IN_PROGRESS" } : x)))}>
                        Mark in progress
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setTickets((items) => items.map((x) => (x.id === t.id ? { ...x, status: "RESOLVED" } : x)))}>
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={Boolean(disputeFor)} title={`Open dispute${disputeFor ? ` • ${disputeFor}` : ""}`}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Reason</div>
            <select
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option>Delivery issue</option>
              <option>Damaged goods</option>
              <option>Wrong items</option>
              <option>Quality issue</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <div className="text-sm font-black text-gray-900 mb-2">Description</div>
            <textarea
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Explain the issue…"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setDisputeFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitDispute} disabled={!disputeFor}>
              Submit dispute
            </Button>
          </div>
        </div>
      </Modal>
    </CustomerLayout>
  );
}

