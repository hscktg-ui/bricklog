/**
 * 생성 후 개선·기준 실패 잡기. GPT 재호출은 한 줄 지시가 있을 때만.
 */
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import {
  buildDetailPageFallbackPack,
  injectDetailPageMustCopy,
  normalizeDetailPageInput,
  parseDetailPageLlmPack,
  stampDetailPagePack,
} from "@/lib/product/detailPageEngine";
import {
  DETAIL_PAGE_STANDARD_RULES,
  applyEditedDetailPageSections,
  scrubDetailPagePack,
} from "@/lib/product/detailPageStandard";
import { fillDetailPageToGrade } from "@/lib/product/detailPageGrade";

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function listDetailPageFixTargets(pack) {
  const rules = pack?._meta?.standard?.rules;
  if (!rules) return [];
  return DETAIL_PAGE_STANDARD_RULES.filter((rule) => rules[rule.id] === false);
}

export function catchDetailPageFixes(pack, rawInput = {}) {
  if (!pack?.sections?.length) return pack;
  const input = normalizeDetailPageInput(rawInput);
  const scrubbed = scrubDetailPagePack(pack);
  const fallback = buildDetailPageFallbackPack(input);
  const filled = fillDetailPageToGrade(scrubbed, fallback);
  const injected = injectDetailPageMustCopy(filled, input);
  const stamped = stampDetailPagePack(
    injected,
    input,
    pack._meta?.mode === "llm" || pack._meta?.mode === "llm-edited"
      ? "llm-edited"
      : "edited"
  );
  return {
    ...stamped,
    _meta: {
      ...(stamped._meta || {}),
      edited: true,
      catchFixes: true,
    },
  };
}

function slimPackForRevise(pack) {
  return {
    productName: pack?.productName || "",
    headline: pack?.headline || "",
    subhead: pack?.subhead || "",
    sections: (pack?.sections || []).slice(0, 12).map((s) => ({
      type: s.type,
      kicker: String(s.kicker || "").slice(0, 40),
      title: String(s.title || s.heading || "").slice(0, 80),
      body: String(s.body || "").slice(0, 900),
      bullets: (s.bullets || []).slice(0, 6).map((b) => String(b).slice(0, 120)),
      rows: (s.rows || []).slice(0, 8),
    })),
  };
}

export async function improveDetailPagePack(pack, rawInput = {}, note = "") {
  const instruction = cleanLine(note).slice(0, 240);
  if (!instruction) {
    return { ok: false, userMessage: "고칠 방향을 한 줄 적어 주세요." };
  }
  if (!pack?.sections?.length) {
    return { ok: false, userMessage: "먼저 상세페이지를 만들어 주세요." };
  }
  const input = normalizeDetailPageInput(rawInput);
  if (!isOpenAIConfigured()) {
    const local = catchDetailPageFixes(pack, input);
    return { ok: true, pack: local, mode: "catch" };
  }

  try {
    const raw = await callOpenAIChat(
      [
        {
          role: "system",
          content: [
            "상품 상세 수정. 블로그 운영글이 아니다. 기존 섹션 type 순서를 유지한다.",
            "지시만 반영. 없는 가격·후기·인증을 만들지 않는다.",
            "지금 바로 구매 금지. JSON만.",
            'JSON: {"headline","subhead","sections":[{"type","kicker","title","body","bullets","rows"}]}',
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction,
            highlights: input.highlights,
            mustInclude: input.mustInclude,
            pack: slimPackForRevise(pack),
          }),
        },
      ],
      { maxTokens: 2200, emptyRetries: 1 }
    );
    const parsed = parseDetailPageLlmPack(raw, input);
    if (!parsed?.sections?.length) {
      return { ok: false, userMessage: "수정본을 읽지 못했습니다. 문장을 직접 고치거나 다시 시도해 주세요." };
    }
    const filled = stampDetailPagePack(
      injectDetailPageMustCopy(
        fillDetailPageToGrade(parsed, buildDetailPageFallbackPack(input)),
        input
      ),
      input,
      "llm-edited"
    );
    return {
      ok: true,
      pack: {
        ...filled,
        _meta: { ...(filled._meta || {}), edited: true, improveNote: instruction },
      },
      mode: "llm-edited",
    };
  } catch {
    return { ok: false, userMessage: "지금은 자동 개선이 안 됩니다. 아래에서 문장을 직접 고쳐 주세요." };
  }
}

export function applyHeadlineSubhead(pack, headline, subhead, input = {}) {
  if (!pack) return pack;
  const next = applyEditedDetailPageSections(
    {
      ...pack,
      headline: headline != null ? String(headline) : pack.headline,
      subhead: subhead != null ? String(subhead) : pack.subhead,
    },
    pack.sections,
    input
  );
  return {
    ...next,
    headline: headline != null ? String(headline).trim() : next.headline,
    subhead: subhead != null ? String(subhead).trim() : next.subhead,
  };
}
