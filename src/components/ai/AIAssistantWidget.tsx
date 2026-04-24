"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getMerchantAssistantReply } from "@/services/aiService";
import { mockAiCopy } from "@/data/mockAIResponses";
import { Bot, Send } from "lucide-react";

type Message = { id: string; role: "assistant" | "user"; text: string; at: string };

export function AIAssistantWidget() {
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: "m0", role: "assistant", text: mockAiCopy.merchantAssistant.greeting, at: new Date().toISOString() },
  ]);

  const quickPrompts = useMemo(
    () => ["How do I add products?", "How can I improve my listing?", "How does LC payment work?", "How does Trade Assurance work?"],
    [],
  );

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    const userMsg: Message = { id: `u_${Math.random().toString(16).slice(2, 10)}`, role: "user", text: trimmed, at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const r = await getMerchantAssistantReply({ message: trimmed });
      const botMsg: Message = { id: `a_${Math.random().toString(16).slice(2, 10)}`, role: "assistant", text: r.answer, at: r.meta.generatedAt };
      setMessages((m) => [...m, botMsg]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-100/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-200/60 flex items-center justify-center text-primary-700">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-gray-900">Merchant Assistant</div>
            <div className="text-xs text-gray-500 mt-0.5">Mock AI • Suggestions only • Always editable</div>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {quickPrompts.map((p) => (
            <button
              key={p}
              className="rounded-full border border-gray-200/60 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              onClick={() => void send(p)}
              disabled={busy}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200/60 bg-gray-50 p-4 h-[320px] overflow-auto space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user" ? "bg-primary-700 text-white" : "bg-white border border-gray-200/60 text-gray-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className={`mt-2 text-[10px] ${m.role === "user" ? "text-primary-100" : "text-gray-400"}`}>
                  {new Date(m.at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-200/60 text-gray-800">
                AI is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send(input);
              }
            }}
            className="flex-1 rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Ask about listings, LC, or Trade Assurance…"
            disabled={busy}
          />
          <Button disabled={busy || !input.trim()} onClick={() => void send(input)} className="whitespace-nowrap">
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

