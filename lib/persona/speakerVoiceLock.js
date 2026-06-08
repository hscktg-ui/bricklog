/**
 * Speaker Voice Lock — v4Speaker × personaEngineProfile SSOT
 * 생성·후처리·humanBelief·프롬프트가 같은 화자 register를 따른다.
 */
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import {
  resolvePersonaEngineProfile,
} from "@/lib/persona/personaEngineProfile";
import { HUMAN_EDITOR_NARRATIVE_STEPS } from "@/lib/product/humanityCommonSenseEngine";
import {
  detectFieldReviewSurfaceLeak,
  detectOpeningContamination,
  isOpeningSentenceContaminated,
  OPENING_STRIP_RES,
} from "@/lib/persona/speakerSurfacePatterns";
import {
  stripSearchSnippetLeakFromText,
  textContainsUnverifiedSearchLeak,
  detectSearchSnippetLeak,
  stripSearchSnippetLeakFromPack,
} from "@/lib/product/brandJournalistDirective";
import {
  ensureVerbatimTopicCompliance,
  detectVerbatimTopicUsage,
} from "@/lib/content/informationUnitEngine";

/** UI v4Speaker → doctrine·프롬프트용 표시 라벨 */
export function resolveSpeakerDisplayLabel(input = {}) {
  const v4 = String(input.v4Speaker || "").trim();
  if (v4 && v4 !== "auto") {
    const opt = V4_SPEAKER_OPTIONS.find((o) => o.value === v4);
    if (opt?.label) return opt.label;
  }
  const persona = resolveContentPersona(input);
  return (
    input.contentPersonaLabel ||
    persona.label ||
    "균형 에디터"
  );
}

export function resolveSpeakerEngineProfile(input = {}) {
  return resolvePersonaEngineProfile(input);
}

/** 방문·체험 후기 register — experience voice·field smell 적용 대상 */
export function isFieldReviewSpeaker(input = {}) {
  return resolvePersonaEngineProfile(input).archetype === "field_review";
}

/** 후기형 구어 주입(experience voice lines) — field_review만 */
export function shouldApplyExperienceVoiceEnhancement(input = {}) {
  return isFieldReviewSpeaker(input);
}

/** Human Story problem-opening 강제 — scene-first 화자 */
export function shouldApplyHumanStoryOpeningRewrite(input = {}) {
  const archetype = resolvePersonaEngineProfile(input).archetype;
  return archetype === "field_review" || archetype === "local_note";
}

const NARRATIVE_BY_ARCHETYPE = {
  field_review:
    "기(왜 찾게 됐는지) → 승(직접 방문·체험) → 전(비교·기준) → 결(본인 정리)",
  brand_editor:
    "맥락(브랜드·이야기) → 준비·지향 → 독자에게 맞는 설명 → 정리 (방문자 후기 톤 금지)",
  expert_column:
    "질문·헷갈림 → 기준·비교 → 확인 가능한 정보 → 선택 정리 (FAQ·체크리스트 금지)",
  local_note:
    "동네 맥락 → 생활 장면 → 브랜드·장소 연결 → 정리",
  magazine:
    "맥락 → 흐름 설명 → 핵심 정리 → 마무리",
  essay: "느낌·상황 → 선택 이유 → 인상 → 정리",
};

/** LLM user prompt — 화자별 서사 (방문 후기 고정 금지) */
export function buildPersonaNarrativeFlowBrief(input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  const fixed = NARRATIVE_BY_ARCHETYPE[profile.archetype];
  if (fixed) return fixed;
  const arc = (profile.narrativeEmphasis || [])
    .map(
      (id) =>
        HUMAN_EDITOR_NARRATIVE_STEPS.find((s) => s.id === id)?.label || id
    )
    .join(" → ");
  return arc || "맥락 → 정보 → 비교·기준 → 정리";
}

function topicFacet(input = {}) {
  return String(input.topic || input.mainKeyword || "").trim();
}

/** 비-field 화자용 중립 제목 */
export function buildSpeakerAlignedTitle(input = {}, archetype = "brand_editor") {
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  const topic = topicFacet(input).replace(/전시소식/g, "전시").replace(/소식$/g, "안내");
  const base = [region, brand].filter(Boolean).join(" ");
  if (archetype === "expert_column" || archetype === "magazine") {
    return topic ? `${base}, ${topic} 정리` : `${base} 안내`;
  }
  if (archetype === "local_note") {
    return topic ? `${region} ${topic}, ${brand} 이야기` : `${base} 이야기`;
  }
  return topic ? `${base}, ${topic}` : `${base} 소개`;
}

function stripFieldReviewPhrases(text = "") {
  let t = String(text || "");
  for (const re of OPENING_STRIP_RES) {
    t = t.replace(re, " ");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function topicEchoVariants(input = {}) {
  const topic = topicFacet(input);
  if (topic.length < 4) return [];
  const core = topic.replace(/전시소식/g, "전시").replace(/소식$/g, "").trim();
  const variants = new Set([
    topic,
    core,
    `${core} 안내`,
    `${core} 전시소식`,
    `${core} 전시`,
    `${topic} 안내`,
  ]);
  return [...variants].filter((v) => v.replace(/\s/g, "").length >= 4);
}

function countTopicEcho(text = "", input = {}) {
  let max = 0;
  for (const variant of topicEchoVariants(input)) {
    max = Math.max(max, countSubstring(text, variant));
  }
  return max;
}

function collapseDuplicatePhrases(text = "") {
  let t = String(text || "");
  t = t.replace(/(\S+(?:\s+\S+){0,4})\s+\1/g, "$1");
  t = t.replace(/기준으로\s+기준으로/g, "기준으로");
  t = t.replace(/안내\s+안내/g, "안내");
  t = t.replace(/안내\s*기준으로\s*안내\s*기준으로/g, "안내 기준으로");
  return t.replace(/\s{2,}/g, " ").trim();
}

function buildNonFieldOpeningLead(input = {}, archetype = "brand_editor") {
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  const topic = topicFacet(input);
  if (archetype === "expert_column" || archetype === "magazine") {
    return [
      topic ? `${topic}을(를) 알아볼 때 헷갈리는 포인트` : "선택 전에 헷갈리는 포인트",
      region && brand ? `${region} ${brand} 기준으로 확인할 수 있는 내용을 정리했습니다.` : "",
    ]
      .filter(Boolean)
      .join(" — ");
  }
  return [
    region && brand ? `${region} ${brand}` : brand || region,
    topic ? `${topic} 관련 전시·구성` : "전시·구성",
    "을 미리 정리해 두면 방문 전 비교가 수월합니다.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildNonFieldSectionBridge(input = {}, sectionIndex = 1) {
  const brand = String(input.brandName || "매장").trim();
  const region = String(input.region || "").trim();
  const topic = topicFacet(input).replace(/전시소식/g, "전시");
  const lines = [
    `${region} ${brand} ${topic} 일정·구성은 공식 안내를 확인하면 됩니다.`,
    `전시 대상 모델과 옵션은 매장마다 다를 수 있어 방문 전 목록을 확인하는 편이 좋습니다.`,
    `배송·조립·A/S 조건은 계약 시점과 프로모션에 따라 달라질 수 있습니다.`,
    `${brand} 안내 기준으로 확인 가능한 범위만 정리했습니다.`,
  ].filter((l) => l.replace(/\s/g, "").length >= 12);
  return lines[sectionIndex % lines.length] || lines[0];
}

function splitSentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 6);
}

function countSubstring(text, needle) {
  const n = String(needle || "").trim();
  if (!n || n.length < 6) return 0;
  return String(text || "").split(n).length - 1;
}

function stripTitleEcho(text = "", title = "", input = {}, { aggressive = false } = {}) {
  let t = String(text || "").trim();
  const titleStr = String(title || "").trim();
  if (titleStr.length >= 6) {
    const esc = titleStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(esc, "gi"), " ");
  }
  const topic = topicFacet(input);
  const echoThreshold = aggressive ? 1 : 2;
  if (topic.length >= 4) {
    const escTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (countSubstring(t, topic) >= echoThreshold) {
      t = t.replace(new RegExp(escTopic, "g"), " ");
    }
    for (const variant of topicEchoVariants(input)) {
      if (variant === topic) continue;
      if (countSubstring(t, variant) >= echoThreshold) {
        const esc = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        t = t.replace(new RegExp(esc, "g"), " ");
      }
    }
  }
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const prefix = [region, brand].filter(Boolean).join(" ");
  if (prefix.length >= 4 && countSubstring(t, prefix) >= echoThreshold) {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(esc, "g"), " ", aggressive ? 0 : 1);
  }
  return collapseDuplicatePhrases(t.replace(/\s{2,}/g, " ").trim());
}

function filterContaminatedSentences(text = "", input = {}) {
  const sentences = splitSentences(text);
  const kept = [];
  for (const sentence of sentences) {
    if (isOpeningSentenceContaminated(sentence)) continue;
    if (textContainsUnverifiedSearchLeak(sentence, input)) continue;
    kept.push(sentence);
  }
  return kept.join(" ").trim();
}

function packBodySample(pack = {}, maxLen = 4800) {
  return (pack?.sections || [])
    .map((s) => `${String(s.heading || "")} ${String(s.body || "")}`)
    .concat(pack?.conclusion ? [String(pack.conclusion)] : [])
    .join("\n")
    .slice(0, maxLen);
}

function openingStillContaminated(cleaned = "", title = "", input = {}) {
  const open = String(cleaned || "").slice(0, 720);
  if (!open.replace(/\s/g, "").length) return true;
  if (detectOpeningContamination(open).leak) return true;
  if (countTopicEcho(open, input) >= 2) return true;
  if (title) {
    const head = open.replace(/\s+/g, " ").slice(0, 48);
    const titleHead = String(title).replace(/\s+/g, " ").slice(0, 24);
    if (titleHead.length >= 8 && head.includes(titleHead)) return true;
  }
  const pseudo = { sections: [{ body: open }], title };
  if (!detectSearchSnippetLeak(pseudo, input).ok) return true;
  return false;
}

function bodyStillContaminated(cleaned = "", input = {}) {
  const sample = String(cleaned || "").slice(0, 2400);
  if (!sample.replace(/\s/g, "").length) return true;
  if (detectOpeningContamination(sample).leak) return true;
  if (textContainsUnverifiedSearchLeak(sample, input)) return true;
  return false;
}

function openingNeedsScrub(body = "", title = "", input = {}) {
  const open = String(body || "").slice(0, 720);
  if (!open.replace(/\s/g, "").length) return false;
  return openingStillContaminated(open, title, input) || countTopicEcho(open, input) >= 3;
}

function sectionNeedsScrub(body = "", input = {}) {
  const text = String(body || "").slice(0, 2400);
  if (!text.replace(/\s/g, "").length) return false;
  return bodyStillContaminated(text, input);
}

function sanitizeNonFieldHeading(heading = "", input = {}) {
  const h = String(heading || "").trim();
  if (!h) return h;
  if (
    detectFieldReviewSurfaceLeak(h).leak ||
    detectOpeningContamination(h).leak
  ) {
    const topic = topicFacet(input).replace(/전시소식/g, "안내").replace(/소식$/g, "") || "안내";
    return topic;
  }
  const cleaned = collapseDuplicatePhrases(stripFieldReviewPhrases(h));
  return cleaned || h;
}

function sanitizeNonFieldSectionBody(
  body,
  input = {},
  archetype = "brand_editor",
  title = "",
  { isOpening = false, sectionIndex = 0 } = {}
) {
  const text = String(body || "").trim();
  if (!text) {
    return isOpening
      ? buildNonFieldOpeningLead(input, archetype)
      : buildNonFieldSectionBridge(input, sectionIndex);
  }

  let cleaned = stripSearchSnippetLeakFromText(text, input);
  cleaned = stripTitleEcho(cleaned, title, input, { aggressive: !isOpening });
  cleaned = filterContaminatedSentences(cleaned, input);
  cleaned = stripFieldReviewPhrases(cleaned);
  cleaned = collapseDuplicatePhrases(cleaned);

  if (isOpening) {
    const paras = text.split(/\n\n+/);
    const rest = paras.slice(1).join("\n\n").trim();
    if (
      !cleaned ||
      cleaned.replace(/\s/g, "").length < 40 ||
      openingStillContaminated(cleaned, title, input)
    ) {
      cleaned = buildNonFieldOpeningLead(input, archetype);
    }
    return rest ? `${cleaned}\n\n${rest}`.trim() : cleaned;
  }

  if (
    !cleaned ||
    cleaned.replace(/\s/g, "").length < 40 ||
    bodyStillContaminated(cleaned, input)
  ) {
    cleaned = buildNonFieldSectionBridge(input, sectionIndex);
  }
  return cleaned;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function scoreSpeakerSurfaceAlignment(pack, input = {}) {
  if (isFieldReviewSpeaker(input)) {
    return { ok: true, score: 100, issues: [] };
  }
  const title = String(pack?.title || pack?.representativeTitle || "");
  const open = String(pack?.sections?.[0]?.body || "").slice(0, 720);
  const body = packBodySample(pack);
  const issues = [];
  if (detectFieldReviewSurfaceLeak(title).leak) {
    issues.push({ type: "speaker_title_visit_leak" });
  }
  if (detectOpeningContamination(open).leak) {
    issues.push({ type: "speaker_opening_visit_leak" });
  }
  const openPseudo = { sections: [{ body: open }], title };
  if (!detectSearchSnippetLeak(openPseudo, input).ok) {
    issues.push({ type: "speaker_opening_snippet_leak" });
  }
  if (detectOpeningContamination(body).leak) {
    issues.push({ type: "speaker_body_visit_leak" });
  }
  const bodyPseudo = { sections: pack?.sections || [], title };
  if (!detectSearchSnippetLeak(bodyPseudo, input).ok) {
    issues.push({ type: "speaker_body_snippet_leak" });
  }
  const verbatim = detectVerbatimTopicUsage(pack, input);
  if (!verbatim.ok) {
    issues.push({
      type: "speaker_verbatim_topic",
      count: verbatim.count,
      maxAllowed: verbatim.maxAllowed,
    });
  }
  const score = issues.length ? Math.max(0, 100 - issues.length * 22) : 100;
  return { ok: issues.length === 0, score, issues };
}

/**
 * brand_intro 등 — pack 전역 화자 lock (제목·본문·주제 반복·스니펫)
 */
export function applySpeakerVoiceLockPack(pack, input = {}) {
  if (!pack?.sections?.length || isFieldReviewSpeaker(input)) return pack;
  const profile = resolvePersonaEngineProfile(input);

  let title = String(pack.title || pack.representativeTitle || "").trim();
  let sections = [...(pack.sections || [])];
  let scrubbed = false;

  if (detectFieldReviewSurfaceLeak(title).leak) {
    title = buildSpeakerAlignedTitle(input, profile.archetype);
    scrubbed = true;
  }

  sections = sections.map((sec, idx) => {
    const prevBody = String(sec.body || "");
    const prevHeading = String(sec.heading || "");
    let nextBody = prevBody;
    let nextHeading = prevHeading;

    if (idx === 0 ? openingNeedsScrub(prevBody, title, input) : sectionNeedsScrub(prevBody, input)) {
      nextBody = sanitizeNonFieldSectionBody(
        prevBody,
        input,
        profile.archetype,
        title,
        { isOpening: idx === 0, sectionIndex: idx }
      );
      if (idx === 0 && openingStillContaminated(nextBody, title, input)) {
        nextBody = buildNonFieldOpeningLead(input, profile.archetype);
      }
      if (nextBody !== prevBody) scrubbed = true;
    }

    const cleanedHeading = sanitizeNonFieldHeading(prevHeading, input);
    if (cleanedHeading !== prevHeading) {
      nextHeading = cleanedHeading;
      scrubbed = true;
    }

    if (!String(nextBody || "").replace(/\s/g, "").length) {
      nextBody =
        idx === 0
          ? buildNonFieldOpeningLead(input, profile.archetype)
          : buildNonFieldSectionBridge(input, idx);
      scrubbed = true;
    }

    return { ...sec, heading: nextHeading, body: nextBody };
  });

  sections = sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 8);
  if (!sections.length) return pack;

  if (!title.replace(/\s/g, "").length) {
    title = buildSpeakerAlignedTitle(input, profile.archetype);
  }

  let next = {
    ...pack,
    title,
    representativeTitle: title,
    sections,
  };

  if (pack.conclusion && sectionNeedsScrub(pack.conclusion, input)) {
    next.conclusion = sanitizeNonFieldSectionBody(
      pack.conclusion,
      input,
      profile.archetype,
      title,
      { isOpening: false, sectionIndex: sections.length }
    );
    scrubbed = true;
  }

  if (!scrubbed) {
    const alignment = scoreSpeakerSurfaceAlignment(next, input);
    if (alignment.ok) return next;
  }

  next = stripSearchSnippetLeakFromPack(next, input);
  next = ensureVerbatimTopicCompliance(next, input, "blog");

  const alignment = scoreSpeakerSurfaceAlignment(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      speakerVoiceLock: true,
      speakerSurfaceScrub: scrubbed || !alignment.ok,
      speakerSurfaceAlignment: alignment,
      verbatimTopicAfterLock: detectVerbatimTopicUsage(next, input),
      personaAligned: alignment.ok && pack._meta?.personaAligned !== false,
    },
  };
}

/** @deprecated alias — applySpeakerVoiceLockPack 사용 */
export function scrubSpeakerMismatchTitleOpening(pack, input = {}) {
  return applySpeakerVoiceLockPack(pack, input);
}
