export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const escapeHtml = (input: string) =>
  input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export const buildMerchantApprovedEmail = (input: { businessName: string }) => {
  const businessName = input.businessName.trim() || "your business";
  const subject = `MSquare Verification Approved — ${businessName}`;
  const text = `Hello ${businessName},\n\nYour merchant account has been approved. You can now access your dashboard and start selling on MSquare.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Verification Approved</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
  <p style="margin: 0 0 12px;">Your merchant account has been approved. You can now access your dashboard and start selling on MSquare.</p>
  <p style="margin: 0;">Thank you,<br/>MSquare Compliance Team</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildMerchantRejectedEmail = (input: { businessName: string; reason: string }) => {
  const businessName = input.businessName.trim() || "your business";
  const reason = input.reason.trim() || "Rejected by admin.";
  const subject = `MSquare Verification Update — ${businessName}`;
  const text = `Hello ${businessName},\n\nYour merchant verification was rejected.\n\nReason:\n- ${reason}\n\nYou may update your profile and resubmit documents for review.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Verification Rejected</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
  <p style="margin: 0 0 12px;">Your merchant verification was rejected.</p>
  <div style="margin: 0 0 12px; padding: 12px; border: 1px solid #fecaca; border-radius: 12px; background: #fef2f2;">
    <div style="font-weight: 700; margin-bottom: 6px;">Reason</div>
    <div>${escapeHtml(reason)}</div>
  </div>
  <p style="margin: 0 0 12px;">You may update your profile and resubmit documents for review.</p>
  <p style="margin: 0;">Thank you,<br/>MSquare Compliance Team</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildMerchantDocumentsRequestedEmail = (input: { businessName: string; documents: string[] }) => {
  const businessName = input.businessName.trim() || "your business";
  const documents = input.documents.map((d) => d.trim()).filter(Boolean);
  const subject = `MSquare Document Request — ${businessName}`;
  const list = documents.length > 0 ? documents : ["Additional documents required"];
  const text = `Hello ${businessName},\n\nTo continue verification, please provide the following documents:\n${list.map((d) => `- ${d}`).join("\n")}\n\nOnce submitted, our compliance team will review and update your status.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Documents Required</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
  <p style="margin: 0 0 12px;">To continue verification, please provide the following documents:</p>
  <ul style="margin: 0 0 12px; padding-left: 18px;">
    ${list.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
  </ul>
  <p style="margin: 0 0 12px;">Once submitted, our compliance team will review and update your status.</p>
  <p style="margin: 0;">Thank you,<br/>MSquare Compliance Team</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};
