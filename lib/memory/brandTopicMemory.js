/**
 * 브랜드별 주제 해석·학습 — 입력 topic을 그대로 쓰지 않고 글감 brief로 변환
 */
import {
  isVisitReviewTopicInput,
  topicRaw,
  topicWritingFacet,
  stripVisitReviewTopicSuffix,
} from "@/lib/content/topicFacetEngine";
import { AGENT_META_LEAK_RES } from "@/lib/content/displayBodyGuards";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";

export const BRAND_TOPIC_MEMORY_VERSION = "brand-topic-memory-v1";
const MAX_ENTRIES = 24;

function normalizeTopicPattern(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function stripAgentMetaFromTopic(text = "") {
  let t = String(text || "").trim();
  for (const re of AGENT_META_LEAK_RES) {
    t = t.replace(re, " ").trim();
  }
  return t.replace(/\s+/g, " ").trim();
}

function isSentenceLikeTopic(text = "") {
  const t = String(text || "").trim();
  return t.length >= 28 && /[,.，]|다\.|요\.|습니다|정리|둘러보|후기|소식/.test(t);
}

function resolveTopicIntent(input = {}) {
  if (isVisitReviewTopicInput(input)) return "visit_review";
  const blob = `${input.topic || ""} ${input.mainKeyword || ""}`.toLowerCase();
  if (/메뉴|돈까스|음식|맛집|브런치/.test(blob)) return "menu_feature";
  if (/오픈|시즌|여름|겨울|개장|리뉴얼/.test(blob)) return "season_open";
  if (/소개|안내|체험|프로그램/.test(blob)) return "experience_intro";
  return "brand_story";
}

function matchLearnedEntry(input = {}, entries = []) {
  const pattern = normalizeTopicPattern(topicRaw(input) || input.topic);
  if (!pattern || !entries.length) return null;
  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    const ep = normalizeTopicPattern(entry.pattern || entry.topicPattern);
    if (!ep) continue;
    if (pattern === ep) return entry;
    if (pattern.includes(ep) || ep.includes(pattern)) {
      const score = Math.min(pattern.length, ep.length);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
  }
  return bestScore >= 8 ? best : null;
}

function buildTopicBrief(input = {}, intent, writingSubject, learned = null) {
  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const regionBit = region ? `${region} ` : "";

  if (learned?.brief) {
    return learned.brief.slice(0, 480);
  }

  const lines = [
    `【글감】${regionBit}${brand} — ${writingSubject}`,
    `【의도】${intent === "visit_review" ? "방문·체험 칼럼 (입력 문장을 제목·소제목에 그대로 복사 금지)" : "브랜드 칼럼"}`,
  ];
  if (hasUsableResearchFacts(input)) {
    lines.push("【조사】본문에는 조사 팩트(시설·메뉴·운영·체험)만 구체적으로 반영");
  }
  if (intent === "season_open") {
    lines.push("【주의】‘시즌·오픈·소식’ 추상 반복 금지 — 조사에 있는 시설·프로그램명으로 장면 작성");
  }
  return lines.join("\n");
}

/**
 * @param {object} input
 * @returns {import('./brandTopicMemory.types').TopicInterpretation}
 */
export function interpretBrandTopic(input = {}) {
  const rawInput = stripAgentMetaFromTopic(input.topic || input.mainKeyword || "");
  const raw = stripVisitReviewTopicSuffix(rawInput) || rawInput;
  const learnedPool = [
    ...(Array.isArray(input.topicMemoryLearned) ? input.topicMemoryLearned : []),
    ...(Array.isArray(input.brandMemory?.topicMemory)
      ? input.brandMemory.topicMemory
      : []),
  ];
  const learned = matchLearnedEntry({ ...input, topic: raw }, learnedPool);
  const writingSubject =
    learned?.writingSubject || topicWritingFacet({ ...input, topic: raw }) || "이용 안내";
  const intent = learned?.intent || resolveTopicIntent({ ...input, topic: raw });
  const sentenceLike = isSentenceLikeTopic(raw);
  const verbatimForbidden = sentenceLike && raw.length >= 20 ? [raw] : [];

  return {
    version: BRAND_TOPIC_MEMORY_VERSION,
    topicRaw: raw,
    topicWritingSubject: writingSubject,
    topicIntent: intent,
    topicBriefForLlm: buildTopicBrief(
      { ...input, topic: raw },
      intent,
      writingSubject,
      learned
    ),
    topicVerbatimForbidden: verbatimForbidden,
    learnedMatch: Boolean(learned),
    sentenceLikeTopic: sentenceLike,
  };
}

export function applyBrandTopicInterpretation(input = {}) {
  if (!input?.topic && !input?.mainKeyword) return input;
  const interpretation = interpretBrandTopic(input);
  const nextTopic =
    interpretation.sentenceLikeTopic && interpretation.topicWritingSubject
      ? interpretation.topicWritingSubject
      : interpretation.topicRaw || input.topic;

  return {
    ...input,
    topicInterpretation: interpretation,
    topicBriefForLlm: interpretation.topicBriefForLlm,
    topicVerbatimForbidden: interpretation.topicVerbatimForbidden,
    writingSubject: input.writingSubject || interpretation.topicWritingSubject,
    mainKeyword: input.mainKeyword || interpretation.topicWritingSubject,
    topicDisplayRaw: interpretation.topicRaw,
    topic: nextTopic,
  };
}

export function buildTopicMemoryEntry(input = {}, outcome = "success") {
  const interp = input.topicInterpretation || interpretBrandTopic(input);
  const raw = interp.topicRaw || topicRaw(input);
  if (!raw) return null;
  return {
    pattern: normalizeTopicPattern(raw),
    brief: interp.topicBriefForLlm,
    intent: interp.topicIntent,
    writingSubject: interp.topicWritingSubject,
    outcome,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeTopicMemoryEntries(existing = [], incoming = null) {
  if (!incoming?.pattern) return existing.slice(0, MAX_ENTRIES);
  const list = Array.isArray(existing) ? [...existing] : [];
  const idx = list.findIndex(
    (e) => normalizeTopicPattern(e.pattern) === normalizeTopicPattern(incoming.pattern)
  );
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      ...incoming,
      successCount:
        (prev.successCount || 0) + (incoming.outcome === "success" ? 1 : 0),
      failCount: (prev.failCount || 0) + (incoming.outcome === "withhold" ? 1 : 0),
    };
  } else {
    list.unshift({
      ...incoming,
      successCount: incoming.outcome === "success" ? 1 : 0,
      failCount: incoming.outcome === "withhold" ? 1 : 0,
    });
  }
  return list.slice(0, MAX_ENTRIES);
}

/** API — brand_learning_profiles.profile.topicMemory 갱신 */
export async function persistBrandTopicMemory(supabase, userId, brandId, entry) {
  if (!supabase || !userId || !brandId || !entry?.pattern) return null;
  try {
    const { data: row } = await supabase
      .from("brand_learning_profiles")
      .select("profile")
      .eq("brand_id", brandId)
      .eq("user_id", userId)
      .maybeSingle();
    const profile = row?.profile && typeof row.profile === "object" ? row.profile : {};
    const topicMemory = mergeTopicMemoryEntries(profile.topicMemory, entry);
    const { data, error } = await supabase
      .from("brand_learning_profiles")
      .upsert(
        {
          user_id: userId,
          brand_id: brandId,
          profile: { ...profile, topicMemory },
        },
        { onConflict: "brand_id" }
      )
      .select("profile")
      .single();
    if (error) return null;
    return data?.profile?.topicMemory || topicMemory;
  } catch {
    return null;
  }
}

export async function loadBrandTopicMemory(supabase, userId, brandId) {
  if (!supabase || !userId || !brandId) return [];
  try {
    const { data } = await supabase
      .from("brand_learning_profiles")
      .select("profile")
      .eq("brand_id", brandId)
      .eq("user_id", userId)
      .maybeSingle();
    return Array.isArray(data?.profile?.topicMemory) ? data.profile.topicMemory : [];
  } catch {
    return [];
  }
}
