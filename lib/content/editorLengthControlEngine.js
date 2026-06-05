/**
 * BRICLOG Editor & Length Control — 글자수 강제 + 전문 에디터 품질
 */
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces, countCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import {
  sanitizeEditorLeakPack,
  stripEditorAuditSentences,
} from "@/lib/content/editorQualityEngine";
import { FILLER_PADDING_PATTERNS } from "@/lib/content/humanDeliveryRules";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { sanitizeBlogPackPlannerLeak } from "@/lib/content/sectionPlannerSanitize";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { isLengthPaddingForbidden } from "@/lib/product/briclogMission";

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 8);
}

function sentenceScore(sentence) {
  let score = 10;
  for (const re of FILLER_PADDING_PATTERNS) {
    if (re.test(sentence)) score -= 3;
  }
  if (/^(요약|정리|결론|마무리)/.test(sentence)) score -= 1;
  if (sentence.length < 20) score -= 2;
  if (sentence.length > 180) score -= 1;
  return score;
}

/** 반복·필러·약한 문장 제거 후 길이 압축 */
export function smartCompressBlogPack(pack, maxChars, ctx = {}, input = {}) {
  if (!pack?.sections?.length) return pack;

  let next = applyDuplicateKiller(
    sanitizeEditorLeakPack({ ...pack, sections: [...pack.sections] }),
    { ...ctx, input },
    "blog"
  );

  next = {
    ...next,
    sections: next.sections.map((sec) => {
      const sentences = splitSentences(sec.body);
      const kept = [];
      const seen = new Set();
      for (const sent of sentences) {
        const key = sent.replace(/\s/g, "").slice(0, 48);
        if (seen.has(key)) continue;
        if (stripEditorAuditSentences(sent) !== sent.trim()) continue;
        if (sentenceScore(sent) < 4) continue;
        seen.add(key);
        kept.push(sent);
      }
      return { ...sec, body: kept.join("\n\n").trim() };
    }),
    conclusion: splitSentences(next.conclusion)
      .filter((s) => sentenceScore(s) >= 4)
      .join(" ")
      .trim(),
  };

  let guard = 0;
  while (countBlogBodyCharsWithSpaces(next) > maxChars && guard < 80) {
    let trimmed = false;
    const sections = [...next.sections];
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const body = String(sections[i]?.body || "");
      const sents = splitSentences(body);
      if (sents.length > 2) {
        sents.pop();
        sections[i] = { ...sections[i], body: sents.join("\n\n").trim() };
        trimmed = true;
        break;
      }
    }
    if (!trimmed && sections.length > 4) {
      sections.pop();
      trimmed = true;
    }
    if (!trimmed) {
      const last = sections[sections.length - 1];
      if (last && countCharsWithSpaces(last.body) > 140) {
        last.body = last.body.slice(0, Math.max(120, last.body.length - 100)).trim();
        trimmed = true;
      }
    }
    if (!trimmed) break;
    next = { ...next, sections };
    guard += 1;
  }

  return sanitizeBlogPackPlannerLeak(next);
}

/**
 * 글분량 tier 강제 — 범위 충족할 때까지 확장/압축 루프
 * @returns {{ ok: boolean, pack: object, chars: number, min: number, max: number, attempts: number }}
 */
export function enforceStrictBlogLength(pack, ctx = {}, input = {}, opts = {}) {
  const tierKey = input.blogLengthTier || ctx.blogLengthTier || "medium";
  const tier = resolveBlogLengthTier(tierKey);
  const maxAttempts = opts.maxAttempts ?? 20;
  const noLengthPad = isLengthPaddingForbidden();

  if (!pack?.sections?.length) {
    return { ok: false, pack, chars: 0, min: tier.min, max: tier.max, attempts: 0 };
  }

  if (noLengthPad) {
    let next = sanitizeEditorLeakPack(pack);
    const normalized = normalizeBlogLengthAndStructure(next, ctx, input);
    next = sanitizeEditorLeakPack(normalized.pack);
    let chars = countBlogBodyCharsWithSpaces(next);
    if (chars > tier.max) {
      next = smartCompressBlogPack(next, tier.max, ctx, input);
      chars = countBlogBodyCharsWithSpaces(next);
    }
    if (chars < tier.min) {
      next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
      next = sanitizeEditorLeakPack(next);
      chars = countBlogBodyCharsWithSpaces(next);
      if (chars > tier.max) {
        next = smartCompressBlogPack(next, tier.max, ctx, input);
        chars = countBlogBodyCharsWithSpaces(next);
      }
    }
    const ok = chars > 0 && chars <= tier.max;
    return {
      ok,
      pack: {
        ...next,
        _meta: {
          ...(next._meta || {}),
          lengthStrict: ok,
          lengthTierMet: ok,
          charCount: chars,
          missionSoftLength: true,
        },
      },
      chars,
      min: tier.min,
      max: tier.max,
      attempts: 0,
    };
  }

  let next = sanitizeEditorLeakPack(pack);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const normalized = normalizeBlogLengthAndStructure(next, ctx, input);
    next = sanitizeEditorLeakPack(normalized.pack);
    const chars = countBlogBodyCharsWithSpaces(next);

    if (chars >= tier.min && chars <= tier.max) {
      return {
        ok: true,
        pack: {
          ...next,
          _meta: {
            ...(next._meta || {}),
            lengthStrict: true,
            lengthTierMet: true,
            charCount: chars,
          },
        },
        chars,
        min: tier.min,
        max: tier.max,
        attempts,
      };
    }

    if (chars < tier.min) {
      next = expandPackByInformation(next, ctx, input, {
        minChars: tier.min,
        channel: "blog",
      });
      next = deepenPackBodiesToMin(next, tier.min, ctx, input);
    } else {
      next = smartCompressBlogPack(next, tier.max, ctx, input);
    }
    attempts += 1;
  }

  const chars = countBlogBodyCharsWithSpaces(next);
  if (chars < tier.min) {
    next = normalizeBlogLengthAndStructure(next, ctx, input).pack;
  }

  const finalChars = countBlogBodyCharsWithSpaces(next);
  return {
    ok: finalChars >= tier.min && finalChars <= tier.max,
    pack: {
      ...next,
      _meta: {
        ...(next._meta || {}),
        lengthStrict: finalChars >= tier.min && finalChars <= tier.max,
        lengthTierMet: finalChars >= tier.min && finalChars <= tier.max,
        charCount: finalChars,
      },
    },
    chars: finalChars,
    min: tier.min,
    max: tier.max,
    attempts,
  };
}

export function isStrictLengthMet(pack, input = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const chars = countBlogBodyCharsWithSpaces(pack);
  return chars >= tier.min && chars <= tier.max;
}
