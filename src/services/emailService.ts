"use client";

import { type EmailTemplate } from "@/data/emailTemplates";

export type MockEmailPayload = EmailTemplate & {
  to: string;
  from: string;
  sentAt: string;
  meta?: Record<string, unknown>;
};

export type MockEmailResult = { id: string; sentAt: string };

export const sendMockEmail = async (input: { to: string; template: EmailTemplate; meta?: Record<string, unknown> }) => {
  const payload: MockEmailPayload = {
    to: input.to.trim().toLowerCase(),
    from: "no-reply@msquare.demo",
    subject: input.template.subject,
    text: input.template.text,
    html: input.template.html,
    sentAt: new Date().toISOString(),
    meta: input.meta,
  };

  console.log("[MSquare Mock Email]", payload);

  return { id: `email_${Math.random().toString(16).slice(2, 10)}`, sentAt: payload.sentAt } satisfies MockEmailResult;
};
