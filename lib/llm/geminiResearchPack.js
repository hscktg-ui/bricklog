/**
 * 제미나이 — V2 조사 JSON + 6대 고객질문 + 작성 아웃라인 (GPT 조사 슬롯 대체)
 */
import { buildBriclogMissionPromptBlock } from "@/lib/product/briclogMission";
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";

function getModel() {
  return (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
}

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  ).trim();
}

/**
 * @param {{ system: string, user: string, brandContext?: Record<string, unknown> }} params
 * @returns {Promise<{ ok: boolean, parsed: object|null, writerOutline?: string, customerQuestions?: object[] }>}
 */
export async function runGeminiResearchPack({ system, user, brandContext = {} }) {
  if (!isGeminiConfigured()) {
    return { ok: false, parsed: null };
  }

  const key = getApiKey();
  const prompt = `${buildBriclogMissionPromptBlock()}

You are BRICLOG Research AI (Gemini). Research ONLY — do NOT write publishable blog paragraphs.
Research findings are ingredients for the Writer — never output them as brochure headings (FAQ, checklist, brand understanding, product lineup, report sections).

${system}

${user}

Return ONLY valid JSON matching the schema above.
Add keys:
- "customerQuestions": [{"id":"why_search|who_search|when_search|what_compare|top_questions|pre_purchase_mistakes","label":"...","answer":"..."}] (6 items, Korean)
- "writerOutline": ["section heading hint 1", "..."] (6~8 items, answer customer questions — no topic definition opener)
- "sectionPlan": "one paragraph how to map questions to blog sections"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(
        Number(process.env.BRICLOG_GEMINI_RESEARCH_TIMEOUT_MS) || 22_000
      ),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        ok: false,
        parsed: null,
        reason: `gemini_http_${res.status}`,
        detail: errBody.slice(0, 200),
      };
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text.trim()) {
      return { ok: false, parsed: null, reason: "gemini_empty_response" };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, parsed: null, reason: "gemini_json_parse_failed" };
    }

    if (brandContext && typeof brandContext === "object") {
      brandContext._geminiDone = true;
    }

    return {
      ok: true,
      parsed,
      writerOutline: Array.isArray(parsed.writerOutline)
        ? parsed.writerOutline.map(String).filter(Boolean)
        : [],
      customerQuestions: Array.isArray(parsed.customerQuestions)
        ? parsed.customerQuestions
        : [],
      sectionPlan: String(parsed.sectionPlan || "").trim(),
    };
  } catch (err) {
    return {
      ok: false,
      parsed: null,
      reason: "gemini_request_failed",
      detail: String(err?.message || err).slice(0, 120),
    };
  }
}

export function formatGeminiWriterOutlineBrief(outline = [], sectionPlan = "") {
  if (!outline.length && !sectionPlan) return "";
  const lines = ["【제미나이 작성 아웃라인 — 6대 고객질문 답변형】"];
  outline.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
  if (sectionPlan) lines.push("", sectionPlan);
  lines.push("첫 문장부터 주제 정의·「~란」 금지.");
  return lines.join("\n");
}
