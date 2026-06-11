/**
 * V12 STEP 10 — Gemini 심층 분석 (선택, GEMINI_API_KEY 있을 때만)
 * 브랜드 메모리·네이버 실마리를 바탕으로 맥락 정리 (원문 복사 금지)
 */

import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { buildBriclogMissionPromptBlock } from "@/lib/product/briclogMission";
import {
  resolveGeminiModel,
  getGeminiResearchTimeoutMs,
  getGeminiMaxOutputTokens,
} from "@/lib/config/briclogMaxQuality";

function getModel() {
  return resolveGeminiModel();
}

/**
 * @param {{ brandName?: string, region?: string, topic?: string, memoryBrief?: string, naverBrief?: string }} ctx
 * @returns {Promise<{ ok: boolean, analysis: string }>}
 */
export async function runGeminiDeepAnalysis(ctx = {}) {
  if (ctx.skipGemini || ctx._geminiDone) {
    return { ok: false, analysis: "" };
  }
  if (!isGeminiConfigured()) {
    return { ok: false, analysis: "" };
  }

  const key = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  ).trim();

  const prompt = `${buildBriclogMissionPromptBlock()}

You are BRICLOG brand analyst (V12). Research ONLY — do NOT copy search snippets verbatim or write publishable paragraphs.
Brand memory overrides conflicting web hints.
Output Korean JSON only: {"brandContext":"","officialLeads":"","productEntities":[],"factCandidates":[],"inferenceCandidates":[],"unknowns":[],"strategyHint":""}

Brand: ${ctx.brandName || ""}
Region: ${ctx.region || ""}
Topic: ${ctx.topic || ""}

[Brand Memory]
${(ctx.memoryBrief || "").slice(0, 2000)}

[Naver research snippets — ingredients only]
${(ctx.naverBrief || "").slice(0, 2500)}

[Search expansion axes — research directions only]
${(ctx.expansionBrief || "").slice(0, 1200)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(getGeminiResearchTimeoutMs()),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: getGeminiMaxOutputTokens("analysis"),
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, analysis: "" };
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text.trim()) return { ok: false, analysis: "" };

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: true, analysis: text.slice(0, 1500) };
    }

    const lines = [];
    if (parsed.brandContext) lines.push(`브랜드 맥락: ${parsed.brandContext}`);
    if (parsed.officialLeads) lines.push(`공식 실마리: ${parsed.officialLeads}`);
    if (parsed.productEntities?.length) {
      lines.push(`엔티티: ${parsed.productEntities.join(", ")}`);
    }
    if (parsed.strategyHint) lines.push(`전략 힌트: ${parsed.strategyHint}`);

    return {
      ok: true,
      analysis: lines.join("\n").slice(0, 2000) || text.slice(0, 1500),
    };
  } catch {
    return { ok: false, analysis: "" };
  }
}
