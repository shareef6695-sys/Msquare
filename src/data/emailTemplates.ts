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

export const buildDocumentExpiryReminderEmail = (input: { accountName: string; documentType: string; expiryDate: string; days: number }) => {
  const accountName = input.accountName.trim() || "your account";
  const documentType = input.documentType.trim() || "a document";
  const subject = "MSquare Document Expiry Reminder";
  const text = `Hello ${accountName},\n\nThis is a reminder that your document is expiring soon.\n\nDocument: ${documentType}\nExpiry date: ${input.expiryDate}\nDays remaining: ${input.days}\n\nPlease upload a replacement to avoid any account restrictions.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Document Expiry Reminder</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0 0 12px;">This is a reminder that your document is expiring soon.</p>
  <div style="margin: 0 0 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
    <div><strong>Document:</strong> ${escapeHtml(documentType)}</div>
    <div><strong>Expiry date:</strong> ${escapeHtml(input.expiryDate)}</div>
    <div><strong>Days remaining:</strong> ${input.days}</div>
  </div>
  <p style="margin: 0;">Please upload a replacement to avoid any account restrictions.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildDocumentExpiredEmail = (input: { accountName: string; documentType: string; expiryDate: string }) => {
  const accountName = input.accountName.trim() || "your account";
  const documentType = input.documentType.trim() || "a document";
  const subject = "Action Required: Your document has expired";
  const text = `Hello ${accountName},\n\nYour document has expired and requires immediate action.\n\nDocument: ${documentType}\nExpiry date: ${input.expiryDate}\n\nPlease upload a replacement document to restore full access.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Action Required</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0 0 12px;">Your document has <strong>expired</strong> and requires immediate action.</p>
  <div style="margin: 0 0 12px; padding: 12px; border: 1px solid #fecaca; border-radius: 12px; background: #fef2f2;">
    <div><strong>Document:</strong> ${escapeHtml(documentType)}</div>
    <div><strong>Expiry date:</strong> ${escapeHtml(input.expiryDate)}</div>
  </div>
  <p style="margin: 0;">Please upload a replacement document to restore full access.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildAccountHoldPlacedEmail = (input: { accountName: string }) => {
  const accountName = input.accountName.trim() || "your account";
  const subject = "Action Required: Account on compliance hold";
  const text = `Hello ${accountName},\n\nYour account is on hold due to expired documents. Please update your documents to restore access.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Account on Hold</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0;">Your account is on hold due to expired documents. Please update your documents to restore access.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildAccountHoldReleasedEmail = (input: { accountName: string }) => {
  const accountName = input.accountName.trim() || "your account";
  const subject = "MSquare Compliance Update: Account hold released";
  const text = `Hello ${accountName},\n\nYour document update has been approved and your account hold has been released.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Hold Released</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0;">Your document update has been approved and your account hold has been released.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildDocumentRejectedEmail = (input: { accountName: string; reason: string }) => {
  const accountName = input.accountName.trim() || "your account";
  const reason = input.reason.trim() || "Rejected by admin.";
  const subject = "MSquare Compliance Update: Document rejected";
  const text = `Hello ${accountName},\n\nYour uploaded document was rejected.\n\nReason:\n- ${reason}\n\nPlease upload a replacement document for review.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Document Rejected</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0 0 12px;">Your uploaded document was rejected.</p>
  <div style="margin: 0 0 12px; padding: 12px; border: 1px solid #fecaca; border-radius: 12px; background: #fef2f2;">
    <div style="font-weight: 700; margin-bottom: 6px;">Reason</div>
    <div>${escapeHtml(reason)}</div>
  </div>
  <p style="margin: 0;">Please upload a replacement document for review.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildDocumentReplacementRequestedEmail = (input: { accountName: string; message: string }) => {
  const accountName = input.accountName.trim() || "your account";
  const message = input.message.trim() || "Please upload a replacement document.";
  const subject = "MSquare Compliance: Replacement requested";
  const text = `Hello ${accountName},\n\nA replacement document is required to continue compliance review.\n\nRequest:\n- ${message}\n\nPlease upload the replacement document for review.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Replacement Requested</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0 0 12px;">A replacement document is required to continue compliance review.</p>
  <div style="margin: 0 0 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
    ${escapeHtml(message)}
  </div>
  <p style="margin: 0;">Please upload the replacement document for review.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};

export const buildPayoutHoldEmail = (input: { accountName: string }) => {
  const accountName = input.accountName.trim() || "your account";
  const subject = "MSquare Compliance: Payouts temporarily on hold";
  const text = `Hello ${accountName},\n\nYour payouts are temporarily on hold due to compliance requirements.\n\nYou can continue processing orders, but payouts will resume after your documents are updated and approved.\n\nThank you,\nMSquare Compliance Team`;
  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.6;">
  <h2 style="margin: 0 0 12px;">Payouts On Hold</h2>
  <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(accountName)}</strong>,</p>
  <p style="margin: 0 0 12px;">Your payouts are temporarily on hold due to compliance requirements.</p>
  <p style="margin: 0;">You can continue processing orders, but payouts will resume after your documents are updated and approved.</p>
</div>`;
  return { subject, text, html } satisfies EmailTemplate;
};
