"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { generateProductDescription, suggestCategory, type CategoryChoice } from "@/services/aiService";
import { Wand2 } from "lucide-react";

type Props = {
  productName: string;
  description: string;
  categoryId: string;
  categories: CategoryChoice[];
  disabled?: boolean;
  onApply: (next: { name?: string; description?: string }) => void;
  onApplyCategory: (categoryId: string) => void;
};

const parseCommaList = (s: string) => {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
};

export function AIProductGenerator({ productName, description, categoryId, categories, disabled, onApply, onApplyCategory }: Props) {
  const categoryName = useMemo(() => categories.find((c) => c.id === categoryId)?.name ?? "", [categories, categoryId]);

  const [featuresRaw, setFeaturesRaw] = useState("");
  const [targetBuyer, setTargetBuyer] = useState("");

  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [gen, setGen] = useState<null | { title: string; description: string; bulletPoints: string; seoKeywords: string; generatedAt: string }>(null);

  const [catBusy, setCatBusy] = useState(false);
  const [cat, setCat] = useState<null | { suggestedCategoryId: string; suggestedCategoryName: string; confidence: number; rationales: string[]; generatedAt: string }>(
    null,
  );

  useEffect(() => {
    const name = productName.trim();
    const desc = description.trim();
    if (!name && desc.length < 12) return;

    let alive = true;
    setCatBusy(true);
    setCat(null);

    const t = window.setTimeout(() => {
      void suggestCategory({ productName: name, description: desc, categories })
        .then((r) => {
          if (!alive) return;
          setCat({
            suggestedCategoryId: r.suggestedCategoryId,
            suggestedCategoryName: r.suggestedCategoryName,
            confidence: r.confidence,
            rationales: r.rationales,
            generatedAt: r.meta.generatedAt,
          });
        })
        .finally(() => {
          if (!alive) return;
          setCatBusy(false);
        });
    }, 450);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [categories, description, productName]);

  const generate = async () => {
    setGenBusy(true);
    setGenError(null);
    try {
      const r = await generateProductDescription({
        productName: productName.trim(),
        categoryName: categoryName || undefined,
        features: parseCommaList(featuresRaw),
        targetBuyer: targetBuyer.trim() || undefined,
      });
      setGen({
        title: r.title,
        description: r.description,
        bulletPoints: r.bulletPoints.join("\n"),
        seoKeywords: r.seoKeywords.join(", "),
        generatedAt: r.meta.generatedAt,
      });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "AI generation failed.");
    } finally {
      setGenBusy(false);
    }
  };

  return (
    <Card className="border-dashed">
      <div className="p-6 border-b border-gray-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-lg font-black text-gray-900">AI tools</div>
          <div className="text-sm text-gray-500 mt-1">Generate a draft and keep it fully editable.</div>
        </div>
        <Button
          variant="outline"
          disabled={disabled || genBusy || !productName.trim()}
          onClick={() => {
            void generate();
          }}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </div>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Features</div>
            <input
              value={featuresRaw}
              onChange={(e) => setFeaturesRaw(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g., corrosion resistant, ASTM A106, galvanized finish"
              disabled={disabled || genBusy}
            />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Target buyer</div>
            <input
              value={targetBuyer}
              onChange={(e) => setTargetBuyer(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="e.g., construction contractors, distributors, procurement teams"
              disabled={disabled || genBusy}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm font-black text-gray-900">AI category suggestion</div>
            <div className="text-xs font-semibold text-gray-500">{catBusy ? "AI is thinking..." : cat ? `Confidence: ${Math.round(cat.confidence * 100)}%` : ""}</div>
          </div>
          {cat ? (
            <div className="mt-2">
              <div className="text-sm font-semibold text-gray-800">
                Suggested: <span className="font-black">{cat.suggestedCategoryName}</span>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {cat.rationales.slice(0, 2).map((r) => (
                  <div key={r}>• {r}</div>
                ))}
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  disabled={disabled || cat.suggestedCategoryId === categoryId}
                  onClick={() => onApplyCategory(cat.suggestedCategoryId)}
                >
                  Accept suggestion
                </Button>
                <div className="text-[11px] text-gray-500 self-center">Generated: {new Date(cat.generatedAt).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-600">Enter a product name/details to get a suggested category.</div>
          )}
        </div>

        {genError && <div className="rounded-2xl border border-red-200/70 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{genError}</div>}

        {genBusy ? (
          <div className="rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-700">AI is thinking...</div>
        ) : gen ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Generated title</div>
              <input
                value={gen.title}
                onChange={(e) => setGen((g) => (g ? { ...g, title: e.target.value } : g))}
                className="mt-2 w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">SEO keywords</div>
              <textarea
                rows={3}
                value={gen.seoKeywords}
                onChange={(e) => setGen((g) => (g ? { ...g, seoKeywords: e.target.value } : g))}
                className="mt-2 w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="rounded-2xl border border-gray-200/60 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Bullet points</div>
              <textarea
                rows={7}
                value={gen.bulletPoints}
                onChange={(e) => setGen((g) => (g ? { ...g, bulletPoints: e.target.value } : g))}
                className="mt-2 w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-gray-200/60 bg-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Generated description</div>
                <div className="text-[11px] text-gray-500">Generated: {new Date(gen.generatedAt).toLocaleString()}</div>
              </div>
              <textarea
                rows={6}
                value={gen.description}
                onChange={(e) => setGen((g) => (g ? { ...g, description: e.target.value } : g))}
                className="mt-2 w-full rounded-2xl border border-gray-200/60 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    onApply({ name: gen.title, description: gen.description });
                  }}
                >
                  Accept draft
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void generate();
                  }}
                >
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const bullets = gen.bulletPoints
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean)
                      .slice(0, 10)
                      .map((x) => (x.startsWith("•") ? x : `• ${x}`))
                      .join("\n");
                    const next = [description.trim(), "", bullets].filter(Boolean).join("\n");
                    onApply({ description: next });
                  }}
                >
                  Add bullets to description
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200/60 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Click “Generate with AI” to create an editable draft (title, description, bullets, SEO keywords).
          </div>
        )}
      </CardContent>
    </Card>
  );
}

