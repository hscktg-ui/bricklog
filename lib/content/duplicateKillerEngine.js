/**
 * V20 Duplicate Killer — 유사 문장·동일 정보 제거 (Human Addon 70%)
 */
import { computeTextSimilarity } from "@/lib/duplicate/contentSimilarity";
import { buildTopicExpansionPad } from "@/lib/content/topicExpansionEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_DUPLICATE_POLICY } from "@/lib/product/briclogUltimateV20";
import { getBlogFullText } from "@/utils/qualityCheck";
import { applyRepetitionControl } from "@/lib/content/repetitionEngine";

const SIMILARITY_REGEN_THRESHOLD = HUMAN_DUPLICATE_POLICY.similarityPercent;
const SAME_INFO_MAX = 2;

function normalizeSentence(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordOverlapRatio(a, b) {
  const ta = new Set(normalizeSentence(a).split(" ").filter((w) => w.length > 1));
  const tb = new Set(normalizeSentence(b).split(" ").filter((w) => w.length > 1));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common += 1;
  return common / Math.max(ta.size, tb.size);
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 18);
}

/**
 * @param {string} full
 */
export function detectDuplicateKillerIssues(full, opts = {}) {
  const sameInfoMax = opts.sameInfoMax ?? SAME_INFO_MAX;
  const simThreshold = (opts.similarityPercent ?? SIMILARITY_REGEN_THRESHOLD) / 100;
  const sentences = splitSentences(full);
  const issues = [];
  const seenNorm = new Map();

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const ratio = wordOverlapRatio(sentences[i], sentences[j]);
      const jaccard = computeTextSimilarity(sentences[i], sentences[j]) / 100;
      if (ratio >= simThreshold || jaccard >= simThreshold) {
        issues.push({
          type: "sentence_similarity_80",
          a: sentences[i].slice(0, 40),
          b: sentences[j].slice(0, 40),
          ratio: Math.max(ratio, jaccard),
        });
        break;
      }
    }
    const norm = normalizeSentence(sentences[i]);
    if (norm.length >= 30) {
      seenNorm.set(norm, (seenNorm.get(norm) || 0) + 1);
    }
  }

  for (const [norm, count] of seenNorm) {
    if (count >= sameInfoMax) {
      issues.push({ type: "same_info_repeat", sample: norm.slice(0, 50), count });
    }
  }

  const ctaRe = /(방문해\s*보세요|확인해\s*보세요|문의해\s*주세요|예약해\s*주세요)/gi;
  const ctas = (full.match(ctaRe) || []).length;
  if (ctas >= 5) {
    issues.push({ type: "similar_cta", count: ctas });
  }

  return { ok: issues.length === 0, issues };
}

function dedupeSentencesInText(text, ctx, input, slotSeed = 0, globalPool = null) {
  const sentences = splitSentences(text);
  const kept = [];
  const seen = new Set();
  const pool = globalPool || [];
  let slot = slotSeed;
  const overlapCutoff =
    (ctx.similarityPercent ?? HUMAN_DUPLICATE_POLICY.similarityPercent) / 100;
  const dropDupOnly = isBriclogMissionEnforced();
  for (const s of sentences) {
    const norm = normalizeSentence(s);
    let dup = false;
    for (const prev of [...pool, ...kept]) {
      if (wordOverlapRatio(prev, s) >= overlapCutoff) {
        dup = true;
        break;
      }
    }
    if (seen.has(norm)) dup = true;
    if (pool.some((prev) => normalizeSentence(prev) === norm)) dup = true;
    if (dup) {
      if (dropDupOnly) continue;
      const replacement = buildTopicExpansionPad(ctx, input, slot);
      if (!kept.some((k) => wordOverlapRatio(k, replacement) > 0.7)) {
        kept.push(replacement);
        slot += 1;
      }
      continue;
    }
    kept.push(s);
    seen.add(norm);
    pool.push(s);
  }
  if (!kept.length && sentences.length) {
    return sentences[0];
  }
  return kept.join("\n\n");
}

function mapBlogSections(pack, fn) {
  return {
    ...pack,
    sections: (pack.sections || []).map((s, i) => ({
      ...s,
      body: fn(s.body || "", i),
    })),
    conclusion: pack.conclusion ? fn(pack.conclusion, 99) : pack.conclusion,
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {string} channel
 */
export function applyDuplicateKiller(pack, ctx = {}, channel = "blog") {
  if (!pack || channel === "image") return pack;
  const input = ctx.input || ctx;

  if (channel === "place") {
    return {
      ...pack,
      detailBody: dedupeSentencesInText(pack.detailBody || "", ctx, input, 0),
      shortNotice: dedupeSentencesInText(pack.shortNotice || "", ctx, input, 2),
    };
  }
  if (channel === "instagram") {
    const field = pack.lineBreakBody ? "lineBreakBody" : "body";
    return {
      ...pack,
      [field]: dedupeSentencesInText(pack[field] || "", ctx, input, 0),
    };
  }

  const globalPool = [];
  const next = {
    ...pack,
    sections: (pack.sections || []).map((s, i) => ({
      ...s,
      body: dedupeSentencesInText(s.body || "", ctx, input, i * 3, globalPool),
    })),
  };
  if (pack.conclusion) {
    next.conclusion = dedupeSentencesInText(
      pack.conclusion,
      ctx,
      input,
      99,
      globalPool
    );
  }
  return stripGlobalExactDuplicateSentences(next);
}

const NEAR_DUP_OVERLAP = 0.64;

/** 섹션·결론 전체 — 유사·부분 중복 문장 1회만 유지 */
export function stripNearDuplicateSentencesGlobally(
  pack,
  overlapThreshold = NEAR_DUP_OVERLAP
) {
  if (!pack?.sections?.length) return pack;
  const globalPool = [];
  const processText = (text) => {
    const sentences = splitSentences(text);
    const kept = [];
    for (const s of sentences) {
      let dup = false;
      for (const prev of [...globalPool, ...kept]) {
        if (wordOverlapRatio(prev, s) >= overlapThreshold) {
          dup = true;
          break;
        }
        const normA = normalizeSentence(prev);
        const normB = normalizeSentence(s);
        if (normA.length >= 24 && normB.length >= 24) {
          const head = normB.slice(0, Math.min(42, normB.length));
          const tail = normA.slice(0, Math.min(42, normA.length));
          if (normA.includes(head) || normB.includes(tail)) {
            dup = true;
            break;
          }
        }
      }
      if (!dup) {
        kept.push(s);
        globalPool.push(s);
      }
    }
    return kept.length ? kept.join("\n\n") : text;
  };

  return {
    ...pack,
    sections: (pack.sections || []).map((s) => ({
      ...s,
      body: processText(s.body || ""),
    })),
    conclusion: pack.conclusion ? processText(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? processText(pack.intro) : pack.intro,
  };
}

/**
 * 에디터 송출 직전 — 문장·문단·표현 반복 일괄 제거
 * @param {object} pack
 * @param {object} ctx
 * @param {string} channel
 */
export function applyEditorDuplicateSweep(pack, ctx = {}, channel = "blog") {
  if (!pack?.sections?.length || channel !== "blog") return pack;
  const input = ctx.input || ctx;
  let next = pack;
  let dupCheck = { ok: false, issues: [] };

  for (let round = 0; round < 3; round += 1) {
    const overlapPct = Math.max(62, (ctx.similarityPercent ?? HUMAN_DUPLICATE_POLICY.similarityPercent) - round * 4);
    next = applyDuplicateKiller(
      next,
      { ...ctx, input, similarityPercent: overlapPct },
      channel
    );
    next = stripGlobalExactDuplicateSentences(next);
    next = stripNearDuplicateSentencesGlobally(
      next,
      overlapPct / 100
    );
    next = applyRepetitionControl(next, channel);
    dupCheck = detectDuplicateKillerIssues(getBlogFullText(next), {
      similarityPercent: overlapPct,
    });
    if (dupCheck.ok) break;
  }

  next = stripGlobalExactDuplicateSentences(next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorDuplicateSweep: true,
      editorDuplicateOk: dupCheck.ok,
      editorDuplicateIssues: (dupCheck.issues || []).slice(0, 8),
    },
  };
}

/** 섹션·결론·제목 합본 기준 완전 동일 문장 1회만 유지 */
export function stripGlobalExactDuplicateSentences(pack) {
  if (!pack?.sections?.length) return pack;
  const seen = new Set();
  const dedupeText = (text) => {
    const parts = splitSentences(text);
    const kept = [];
    for (const s of parts) {
      const norm = normalizeSentence(s);
      if (norm.length >= 18 && seen.has(norm)) continue;
      if (norm.length >= 18) seen.add(norm);
      kept.push(s);
    }
    return kept.length ? kept.join("\n\n") : text;
  };

  return {
    ...pack,
    sections: (pack.sections || []).map((s) => ({
      ...s,
      heading: dedupeText(s.heading || ""),
      body: dedupeText(s.body || ""),
    })),
    conclusion: pack.conclusion ? dedupeText(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? dedupeText(pack.intro) : pack.intro,
  };
}
