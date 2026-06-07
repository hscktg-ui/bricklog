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
  FIELD_REVIEW_SURFACE_RES,
} from "@/lib/persona/speakerSurfacePatterns";
import {
  stripSearchSnippetLeakFromText,
  textContainsUnverifiedSearchLeak,
  detectSearchSnippetLeak,
} from "@/lib/product/brandJournalistDirective";

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
  for (const re of FIELD_REVIEW_SURFACE_RES) {
    t = t.replace(re, " ");
  }
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

function stripTitleEcho(text = "", title = "", input = {}) {
  let t = String(text || "").trim();
  const titleStr = String(title || "").trim();
  if (titleStr.length >= 6) {
    const esc = titleStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(esc, "gi"), " ");
  }
  const topic = topicFacet(input);
  if (topic.length >= 4) {
    const escTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (countSubstring(t, topic) >= 2) {
      t = t.replace(new RegExp(escTopic, "g"), " ");
    }
  }
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const prefix = [region, brand].filter(Boolean).join(" ");
  if (prefix.length >= 4 && countSubstring(t, prefix) >= 2) {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(esc, "g"), " ", 1);
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function filterOpeningSentences(text = "", input = {}) {
  const sentences = splitSentences(text);
  const kept = [];
  for (const sentence of sentences) {
    if (isOpeningSentenceContaminated(sentence)) continue;
    if (textContainsUnverifiedSearchLeak(sentence, input)) continue;
    kept.push(sentence);
  }
  return kept.join(" ").trim();
}

function openingNeedsScrub(body = "", title = "", input = {}) {
  const open = String(body || "").slice(0, 720);
  if (!open.replace(/\s/g, "").length) return false;
  if (detectOpeningContamination(open).leak) return true;
  if (title && countSubstring(open, title.slice(0, Math.min(24, title.length))) >= 1 && title.length >= 10) {
    if (open.replace(/\s/g, "").length < 120 || countSubstring(open, title.slice(0, 16)) >= 2) {
      return true;
    }
  }
  const pseudo = { sections: [{ body: open }], title };
  if (!detectSearchSnippetLeak(pseudo, input).ok) return true;
  return false;
}

function sanitizeNonFieldOpeningParagraph(body, input = {}, archetype = "brand_editor", title = "") {
  const text = String(body || "").trim();
  if (!text) return buildNonFieldOpeningLead(input, archetype);

  let cleaned = stripSearchSnippetLeakFromText(text, input);
  cleaned = stripTitleEcho(cleaned, title, input);
  cleaned = filterOpeningSentences(cleaned, input);
  cleaned = stripFieldReviewPhrases(cleaned);

  const paras = text.split(/\n\n+/);
  const rest = paras.slice(1).join("\n\n").trim();

  if (
    !cleaned ||
    cleaned.replace(/\s/g, "").length < 40 ||
    detectOpeningContamination(cleaned).leak
  ) {
    cleaned = buildNonFieldOpeningLead(input, archetype);
  }

  return rest ? `${cleaned}\n\n${rest}`.trim() : cleaned;
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
  const issues = [];
  if (detectFieldReviewSurfaceLeak(title).leak) {
    issues.push({ type: "speaker_title_visit_leak" });
  }
  if (detectOpeningContamination(open).leak) {
    issues.push({ type: "speaker_opening_visit_leak" });
  }
  const pseudo = { sections: [{ body: open }], title };
  if (!detectSearchSnippetLeak(pseudo, input).ok) {
    issues.push({ type: "speaker_opening_snippet_leak" });
  }
  const score = issues.length ? Math.max(0, 100 - issues.length * 35) : 100;
  return { ok: issues.length === 0, score, issues };
}

/** brand_intro 등 — 제목·도입 후기 톤·스니펫 scrub */
export function scrubSpeakerMismatchTitleOpening(pack, input = {}) {
  if (!pack?.sections?.length || isFieldReviewSpeaker(input)) return pack;
  const profile = resolvePersonaEngineProfile(input);

  let title = String(pack.title || pack.representativeTitle || "").trim();
  let sections = [...(pack.sections || [])];
  let scrubbed = false;

  if (detectFieldReviewSurfaceLeak(title).leak) {
    title = buildSpeakerAlignedTitle(input, profile.archetype);
    scrubbed = true;
  }

  const firstBody = String(sections[0]?.body || "");
  if (openingNeedsScrub(firstBody, title, input)) {
    const sanitized = sanitizeNonFieldOpeningParagraph(
      firstBody,
      input,
      profile.archetype,
      title
    );
    if (sanitized && sanitized !== firstBody) {
      sections = [{ ...sections[0], body: sanitized }, ...sections.slice(1)];
      scrubbed = true;
    }
  }

  if (!scrubbed) return pack;

  const alignment = scoreSpeakerSurfaceAlignment(
    { ...pack, title, sections },
    input
  );

  return {
    ...pack,
    title,
    representativeTitle: title,
    sections,
    _meta: {
      ...(pack._meta || {}),
      speakerSurfaceScrub: true,
      speakerSurfaceAlignment: alignment,
      personaAligned: alignment.ok && pack._meta?.personaAligned !== false,
    },
  };
}
