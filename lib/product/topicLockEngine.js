/**
 * TOPIC LOCK ENGINE — 생성 전 허용 엔티티 확정 · 허용 외 등장 = 오염
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { detectForeignIndustrySignals } from "@/lib/content/contextLockEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { isTopicLockEnforced } from "@/lib/product/missionFlags";

export const TOPIC_LOCK_VERSION = "v1";
export const MIN_ALLOWED_ENTITIES = 3;
export const MIN_ENTITY_RELEVANCE_RATE = 0.75;

function splitPhrases(blob = "") {
  return String(blob || "")
    .split(/[,，;；\n|/]+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 3);
}

function topicTokens(topic = "") {
  return String(topic || "")
    .replace(/[^\p{L}\p{N}\s%]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * 생성 전 — 브랜드·지역·주제·직접 관련 엔티티만 허용
 */
export function buildAllowedEntityList(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const industry = String(input.industry || input.industryLabel || "").trim();
  const industryKey = resolveBriclogIndustryKey(input);

  const entities = [];
  const tokenSet = new Set();

  const pushEntity = (id, text, type = "related") => {
    const t = String(text || "").trim();
    if (!t || t.length < 2) return;
    entities.push({ id, text: t, type });
    tokenSet.add(t.toLowerCase());
    for (const tok of topicTokens(t)) tokenSet.add(tok.toLowerCase());
  };

  if (brand) pushEntity("brand", brand, "core");
  if (region) pushEntity("region", region, "core");
  if (topic) pushEntity("topic", topic, "core");
  for (const tok of topicTokens(topic)) pushEntity(`topic_${tok}`, tok, "core");

  if (industry) pushEntity("industry", industry, "related");

  for (const phrase of splitPhrases(input.includePhrases)) {
    pushEntity("include", phrase, "related");
  }

  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  for (const [i, row] of facts.entries()) {
    const fact = String(row?.fact || row || "").trim();
    if (fact.length >= 6) pushEntity(`fact_${i}`, fact.slice(0, 48), "related");
  }

  const mapItems = input.topicMap?.requiredExplanationItems || [];
  for (const item of mapItems) {
    for (const kw of item.keywords || []) {
      if (kw) pushEntity(`map_${item.id}`, kw, "related");
    }
  }

  return {
    version: TOPIC_LOCK_VERSION,
    brand,
    region,
    topic,
    industry,
    industryKey,
    entities,
    tokens: [...tokenSet],
    entityCount: entities.length,
    ok: entities.length >= MIN_ALLOWED_ENTITIES && Boolean(brand && topic),
  };
}

export function buildTopicLock(input = {}) {
  const allowlist = buildAllowedEntityList(input);
  return {
    ...allowlist,
    lockedAt: new Date().toISOString(),
    principle:
      "허용 엔티티(브랜드·지역·주제·직접 관련) 외 등장 시 오염 — 삭제 또는 재작성",
  };
}

export function assertTopicLockPreWrite(input = {}) {
  if (!isTopicLockEnforced()) {
    return { ok: true, skipped: true };
  }
  const lock = input.topicLock || buildTopicLock(input);
  const reasons = [];
  if (!lock.brand) reasons.push("missing_brand");
  if (!lock.topic) reasons.push("missing_topic");
  if (lock.entityCount < MIN_ALLOWED_ENTITIES) {
    reasons.push("insufficient_allowed_entities");
  }
  return {
    ok: reasons.length === 0,
    stage: "topic_lock",
    lock,
    reasons,
    userMessage:
      reasons.length === 0
        ? null
        : "브랜드·주제·관련 정보를 확정한 뒤 글을 작성합니다.",
  };
}

function textReferencesAllowed(text = "", lock = {}) {
  const t = String(text || "");
  if (!t) return false;
  for (const ent of lock.entities || []) {
    if (ent.text && ent.text.length >= 2 && t.includes(ent.text)) return true;
  }
  for (const tok of lock.tokens || []) {
    if (tok.length >= 2 && t.toLowerCase().includes(tok.toLowerCase())) return true;
  }
  return false;
}

function splitSentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 12);
}

/**
 * 허용 엔티티 외 오염 탐지
 */
export function detectTopicLockContamination(pack, input = {}, lock = null) {
  const resolved = lock || input.topicLock || buildTopicLock(input);
  const full = getBlogFullText(pack);
  const foreign = detectForeignIndustrySignals(full, {
    industryKey: resolved.industryKey,
    brand: resolved.brand,
    topic: resolved.topic,
    region: resolved.region,
  });

  const contaminated = [];
  const sentences = splitSentences(full);

  for (const sentence of sentences) {
    const foreignHit = detectForeignIndustrySignals(sentence, {
      industryKey: resolved.industryKey,
    });
    if (!foreignHit.ok && !textReferencesAllowed(sentence, resolved)) {
      contaminated.push({
        type: "foreign_entity",
        text: sentence.slice(0, 120),
        hits: foreignHit.hits,
      });
    }
  }

  let relevant = 0;
  const paragraphs = (pack?.sections || []).map((s) => String(s.body || "").trim()).filter(Boolean);
  const paras = paragraphs.length ? paragraphs : full.split(/\n{2,}/);
  for (const para of paras) {
    if (textReferencesAllowed(para, resolved)) relevant += 1;
  }
  const rate = paras.length ? relevant / paras.length : 0;
  if (rate < MIN_ENTITY_RELEVANCE_RATE && paras.length >= 2) {
    contaminated.push({
      type: "low_entity_relevance",
      rate,
      minRequired: MIN_ENTITY_RELEVANCE_RATE,
    });
  }

  return {
    ok: contaminated.length === 0 && foreign.ok,
    lock: resolved,
    contaminated,
    foreignHits: foreign.hits || [],
    entityRelevanceRate: rate,
    needsRewrite: contaminated.length > 0 || !foreign.ok,
    reasons: [
      ...(!foreign.ok ? ["topic_lock_foreign_entity"] : []),
      ...(contaminated.some((c) => c.type === "low_entity_relevance")
        ? ["topic_lock_low_relevance"]
        : []),
      ...(contaminated.some((c) => c.type === "foreign_entity")
        ? ["topic_lock_contamination"]
        : []),
    ],
  };
}

/** 오염 문장 삭제(경량 정화) */
export function sanitizeTopicLockViolations(pack, input = {}, lock = null) {
  if (!pack) return pack;
  const resolved = lock || input.topicLock || buildTopicLock(input);
  const detection = detectTopicLockContamination(pack, input, resolved);
  if (detection.ok) return pack;

  const badStarts = new Set(
    detection.contaminated
      .filter((c) => c.type === "foreign_entity")
      .map((c) => c.text.slice(0, 24))
  );

  const scrubBody = (body) => {
    const sentences = splitSentences(body);
    const kept = sentences.filter((s) => {
      const foreignHit = detectForeignIndustrySignals(s, {
        industryKey: resolved.industryKey,
      });
      if (foreignHit.ok) return true;
      return textReferencesAllowed(s, resolved);
    });
    if (kept.length > 0) {
      return kept.join(" ");
    }
    return String(body || "");
  };

  return {
    ...pack,
    sections: (pack.sections || []).map((s) => ({
      ...s,
      body: scrubBody(s.body),
    })),
    _meta: {
      ...(pack._meta || {}),
      topicLockSanitized: true,
      topicLockReasons: detection.reasons,
    },
  };
}

export function assertTopicLockPostWrite(pack, input = {}) {
  if (!isTopicLockEnforced()) {
    return { ok: true, skipped: true };
  }
  const detection = detectTopicLockContamination(pack, input);
  return {
    ok: detection.ok,
    stage: "topic_lock_post",
    reasons: detection.reasons,
    detection,
    needsRegen: detection.needsRewrite,
    userMessage: detection.ok
      ? null
      : "주제와 무관한 표현이 섞여 다시 다듬는 중입니다.",
  };
}

export function formatTopicLockBrief(lock = {}) {
  if (!lock?.brand && !lock?.topic) return "";
  const core = (lock.entities || [])
    .filter((e) => e.type === "core")
    .map((e) => e.text)
    .slice(0, 8);
  const related = (lock.entities || [])
    .filter((e) => e.type === "related")
    .map((e) => e.text)
    .slice(0, 6);
  return [
    "【TOPIC LOCK — 허용 엔티티】",
    `브랜드·지역·주제·직접 관련만 허용 (${lock.entityCount ?? 0}건)`,
    core.length ? `핵심: ${core.join(" · ")}` : null,
    related.length ? `관련: ${related.join(" · ")}` : null,
    "허용 외 엔티티·타 업종 표현 등장 시 오염 — 삭제 또는 재작성",
  ]
    .filter(Boolean)
    .join("\n");
}
