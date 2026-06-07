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
  FIELD_REVIEW_SURFACE_RES,
} from "@/lib/persona/speakerSurfacePatterns";

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

function rewriteNonFieldOpeningBody(body, input = {}, archetype = "brand_editor") {
  const text = String(body || "").trim();
  if (!text) return buildNonFieldOpeningLead(input, archetype);
  const paras = text.split(/\n\n+/);
  let first = stripFieldReviewPhrases(paras[0] || text);
  const titleEcho = String(input._scrubTitle || "").trim();
  if (titleEcho && first.includes(titleEcho.slice(0, 24))) {
    first = first.replace(titleEcho, "").trim();
  }
  if (!first || first.replace(/\s/g, "").length < 40 || detectFieldReviewSurfaceLeak(first).leak) {
    first = buildNonFieldOpeningLead(input, archetype);
  }
  paras[0] = first;
  return paras.filter((p) => p.replace(/\s/g, "").length >= 8).join("\n\n").trim();
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
  const open = String(pack?.sections?.[0]?.body || "").slice(0, 480);
  const issues = [];
  if (detectFieldReviewSurfaceLeak(title).leak) {
    issues.push({ type: "speaker_title_visit_leak" });
  }
  if (detectFieldReviewSurfaceLeak(open).leak) {
    issues.push({ type: "speaker_opening_visit_leak" });
  }
  const score = issues.length ? Math.max(0, 100 - issues.length * 35) : 100;
  return { ok: issues.length === 0, score, issues };
}

/** brand_intro 등 — 제목·도입 후기 톤 scrub */
export function scrubSpeakerMismatchTitleOpening(pack, input = {}) {
  if (!pack?.sections?.length || isFieldReviewSpeaker(input)) return pack;
  const profile = resolvePersonaEngineProfile(input);
  const surface = scoreSpeakerSurfaceAlignment(pack, input);
  if (surface.ok) return pack;

  let title = String(pack.title || pack.representativeTitle || "").trim();
  let sections = [...(pack.sections || [])];
  let scrubbed = false;

  if (detectFieldReviewSurfaceLeak(title).leak) {
    title = buildSpeakerAlignedTitle(input, profile.archetype);
    scrubbed = true;
  }

  if (sections[0]?.body && detectFieldReviewSurfaceLeak(sections[0].body.slice(0, 480)).leak) {
    sections = [
      {
        ...sections[0],
        body: rewriteNonFieldOpeningBody(sections[0].body, {
          ...input,
          _scrubTitle: title,
        }, profile.archetype),
      },
      ...sections.slice(1),
    ];
    scrubbed = true;
  }

  if (!scrubbed) return pack;

  return {
    ...pack,
    title,
    representativeTitle: title,
    sections,
    _meta: {
      ...(pack._meta || {}),
      speakerSurfaceScrub: true,
      speakerSurfaceAlignment: scoreSpeakerSurfaceAlignment(
        { ...pack, title, sections },
        input
      ),
    },
  };
}
