"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MerchantLayout } from "@/features/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  createMerchantTeamMember,
  listMerchantTeamMembers,
  removeMerchantTeamMember,
  requireRole,
  updateMerchantTeamMemberRole,
  type MerchantTeamRole,
} from "@/services/authStore";
import { Copy, Users } from "lucide-react";

const roleLabel = (role: MerchantTeamRole) => {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Viewer";
};

export default function MerchantTeamPage() {
  const router = useRouter();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<MerchantTeamRole>("admin");
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);

  const [draft, setDraft] = useState<{ name: string; email: string; role: MerchantTeamRole }>({
    name: "",
    email: "",
    role: "viewer",
  });
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    const gate = requireRole("MERCHANT");
    if (!gate.ok) router.replace("/merchant-login");
    else {
      setMerchantId(gate.session.user.merchantParentId ?? gate.session.user.id);
      setTeamRole((gate.session.user.merchantTeamRole ?? "admin") as MerchantTeamRole);
    }
  }, [router]);

  const canManage = useMemo(() => teamRole === "admin", [teamRole]);

  const members = merchantId ? listMerchantTeamMembers(merchantId) : [];

  const pushToast = (message: string) => {
    const id = `toast_${Math.random().toString(16).slice(2, 10)}`;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const Modal = ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <button className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => (busy ? null : setCreateOpen(false))} />
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
    <MerchantLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Team</h1>
          <p className="text-gray-500">Add team members and assign roles (admin, manager, viewer).</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!canManage || !merchantId} title={!canManage ? "Only admins can manage team members." : undefined}>
          Add member
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl border border-gray-200/60 bg-gray-50 flex items-center justify-center text-gray-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-gray-900">Team members</div>
              <div className="text-xs text-gray-500 mt-1">{members.length} total</div>
            </div>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Mock users</div>
        </div>
        <CardContent className="p-6">
          {members.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <div className="text-lg font-black text-gray-900">No team members</div>
              <div className="text-sm text-gray-500 mt-2">Add a team member to share access with your organization.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="rounded-2xl border border-gray-200/60 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-gray-900 truncate">{m.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.isOwner ? (
                      <span className="inline-flex items-center rounded-full border border-primary-200/70 bg-primary-50 px-3 py-1 text-xs font-black text-primary-800">
                        Owner Admin
                      </span>
                    ) : canManage ? (
                      <select
                        value={m.role}
                        onChange={(e) => {
                          if (!merchantId) return;
                          updateMerchantTeamMemberRole({ merchantId, memberId: m.id, role: e.target.value as MerchantTeamRole });
                          setRefreshKey((k) => k + 1);
                          pushToast("Role updated.");
                        }}
                        className="rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-gray-200/70 bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                        {roleLabel(m.role)}
                      </span>
                    )}

                    {!m.isOwner && canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!merchantId) return;
                          removeMerchantTeamMember({ merchantId, memberId: m.id });
                          setRefreshKey((k) => k + 1);
                          pushToast("Member removed.");
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={createOpen} title="Add team member">
        {created ? (
          <div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-4 py-3">
              <div className="text-sm font-black text-emerald-900">Team member created</div>
              <div className="text-xs text-emerald-800 mt-1">{created.email}</div>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200/60 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Temporary password</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm font-black text-gray-900 break-all">{created.tempPassword}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(created.tempPassword);
                      pushToast("Copied.");
                    } catch {
                      pushToast("Copy failed.");
                    }
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Use the merchant login screen with this email and password.</div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setCreated(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Full name</div>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="e.g., Operations Manager"
                disabled={busy}
              />
            </div>

            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Email</div>
              <input
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="name@company.com"
                disabled={busy}
              />
            </div>

            <div>
              <div className="text-sm font-black text-gray-900 mb-2">Role</div>
              <select
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as MerchantTeamRole }))}
                className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
                disabled={busy}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!merchantId) return;
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await createMerchantTeamMember({ merchantId, name: draft.name, email: draft.email, role: draft.role });
                    setCreated({ email: draft.email.trim().toLowerCase(), tempPassword: res.tempPassword });
                    setDraft({ name: "", email: "", role: "viewer" });
                    setRefreshKey((k) => k + 1);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to create team member.");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy || !draft.name.trim() || !draft.email.trim()}
              >
                Create member
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-[60] space-y-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="max-w-sm rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-gray-900/15"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </MerchantLayout>
  );
}
