/**
 * 화자(Persona) × 엔진 정렬 SSOT
 * Editor V95 · Humanity · Content Quality — 화자별 특화 규칙
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { V4_SPEAKER_OPTIONS, applyV4SpeakerToInput } from "@/lib/persona/v4Speakers";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import { getChannelFullText } from "@/lib/content/channelPack";
import { asRegExp } from "@/lib/utils/safeRegex";
import {
  detectForbiddenIntro,
  INTRO_CONTEXT_MARKERS,
} from "@/lib/product/editorIntroRules";
import { HUMAN_EDITOR_NARRATIVE_STEPS } from "@/lib/product/humanityCommonSenseEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { detectFieldReviewSurfaceLeak } from "@/lib/persona/speakerSurfacePatterns";

export const PERSONA_ENGINE_VERSION = "v95";

/** @typedef {object} PersonaEngineProfile
 * @property {string} id
 * @property {string} label
 * @property {string} archetype field_review | brand_editor | expert_column | local_note | magazine | essay
 * @property {string} introStyle context_first | scene_first | question_first
 * @property {RegExp[]} requiredVoice
 * @property {RegExp[]} forbiddenVoice
 * @property {RegExp} [introMarkers]
 * @property {number} brandMentionMax
 * @property {number} regionMentionMax
 * @property {string[]} narrativeEmphasis step ids: why,saw,impression,audience,criteria
 * @property {string} promptBrief
 */

const DEFAULT_PROFILE = {
  id: "balanced_editor",
  label: "균형 에디터",
  archetype: "magazine",
  introStyle: "context_first",
  requiredVoice: [/왜|고민|찾|보니|느낌|기준/],
  forbiddenVoice: [/소개해\s*드리|안녕하세요|오늘은\s/],
  introMarkers: INTRO_CONTEXT_MARKERS,
  brandMentionMax: 5,
  regionMentionMax: 4,
  narrativeEmphasis: ["why", "saw", "impression", "criteria"],
  promptBrief:
    "맥락 먼저, 정보 나열 금지. 브랜드·지역은 필요한 곳만. 사람이 읽히는 칼럼 톤.",
};

/** persona:subtype */
const PERSONA_PROFILES = {
  "visit_review:experience": {
    id: "real_use_field",
    label: "실사용·체험 후기",
    archetype: "field_review",
    introStyle: "scene_first",
    requiredVoice: [/직접|체험|써\s*보|느꼈|솔직|다녀|들러|확인/],
    forbiddenVoice: [
      /저희는\s*지향/,
      /운영\s*방침은/,
      /많은\s*분들께\s*추천/,
      /제품은\s*이렇습니다/,
    ],
    introMarkers: /체험|써\s*보|직접|처음|느낌|왜/,
    brandMentionMax: 4,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "saw", "impression"],
    promptBrief:
      "실제 써 본·다녀 온 사람 톤. 생각·고민·판단·관찰 필수. 「소개합니다」「저희 브랜드」 금지. 스펙 나열 대신 선택 이유.",
  },
  "visit_review:review": {
    id: "plain_field_review",
    label: "담백한 방문 후기",
    archetype: "field_review",
    introStyle: "context_first",
    requiredVoice: [/다녀|방문|들러|보니|느낌|솔직|현장/],
    forbiddenVoice: [/저희는\s*지향/, /소개해\s*드리/, /최고의\s*선택/],
    introMarkers: INTRO_CONTEXT_MARKERS,
    brandMentionMax: 4,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "saw", "impression", "criteria"],
    promptBrief:
      "담백한 현장 후기. 과장·광고 CTA 금지. 왜 갔는지→무엇을 봤는지→인상→선택 기준.",
  },
  "visit_review:recommend": {
    id: "recommend_field",
    label: "추천·공유형 후기",
    archetype: "field_review",
    introStyle: "question_first",
    requiredVoice: [/추천|다시|찾|비슷한|상황|느꼈|보니/],
    forbiddenVoice: [/저희\s*매장은/, /지금\s*바로\s*문의/],
    introMarkers: /추천|왜|상황|비슷|궁금/,
    brandMentionMax: 4,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "impression", "audience"],
    promptBrief:
      "독자 상황에 맞춘 추천 톤. 「많은 분들께」 금지. 개인 경험→누구에게 맞는지.",
  },
  "brand_story:philosophy": {
    id: "brand_editor_philosophy",
    label: "브랜드 에디터·철학",
    archetype: "brand_editor",
    introStyle: "context_first",
    requiredVoice: [/저희|우리\s+매장|이곳|준비|지향|이야기/],
    forbiddenVoice: [
      /다녀왔는데/,
      /내돈내산/,
      /체험단/,
      /솔직\s*후기\s*—/,
    ],
    introMarkers: /왜|이야기|지향|준비|믿/,
    brandMentionMax: 5,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "impression", "audience"],
    promptBrief:
      "브랜드 전담 에디터 톤(과장 없음). 방문자 후기 말투 금지. 브랜드명은 필요할 때만, 나머지는 이 브랜드·이곳.",
  },
  "brand_story:product": {
    id: "brand_editor_product",
    label: "브랜드 에디터·상품",
    archetype: "brand_editor",
    introStyle: "context_first",
    requiredVoice: [/저희|우리|이\s*제품|구성|준비|보시/],
    forbiddenVoice: [/다녀와\s*보니/, /체험단/, /최고의/],
    introMarkers: INTRO_CONTEXT_MARKERS,
    brandMentionMax: 5,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "saw", "criteria"],
    promptBrief:
      "브랜드가 직접 설명하는 칼럼. 브로슈어 나열 금지. 맥락→구성→선택 기준.",
  },
  "brand_story:event": {
    id: "brand_editor_event",
    label: "브랜드·행사 에디터",
    archetype: "brand_editor",
    introStyle: "context_first",
    requiredVoice: [/이번|행사|기간|준비|문의|확인/],
    forbiddenVoice: [/다녀왔/, /내돈내산/],
    introMarkers: /왜|이번|기간|준비/,
    brandMentionMax: 5,
    regionMentionMax: 4,
    narrativeEmphasis: ["why", "saw", "criteria"],
    promptBrief: "행사·기간은 확인된 범위만. 과장·허구 할인 금지.",
  },
  "brand_story:new_open": {
    id: "brand_editor_open",
    label: "브랜드·오픈",
    archetype: "brand_editor",
    introStyle: "scene_first",
    requiredVoice: [/오픈|문\s*연|처음|준비|이곳|저희/],
    forbiddenVoice: [/다녀왔/, /체험단/],
    introMarkers: /오픈|처음|왜|기대/,
    brandMentionMax: 5,
    regionMentionMax: 4,
    narrativeEmphasis: ["why", "saw", "impression"],
    promptBrief: "오픈 맥락 먼저. 방문자 후기 톤과 혼용 금지.",
  },
  "info_intro:guide": {
    id: "expert_guide_column",
    label: "전문 가이드 칼럼",
    archetype: "expert_column",
    introStyle: "question_first",
    requiredVoice: [/기준|확인|비교|알아두|선택|체크/],
    forbiddenVoice: [/저희는\s*최고/, /많은\s*분들께/, /소개해\s*드리/],
    introMarkers: /왜|헷갈|궁금|알아보|고를\s*때/,
    brandMentionMax: 4,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "criteria", "audience"],
    promptBrief:
      "전문 에디터 가이드. FAQ·체크리스트 찍기 금지 — 칼럼 흐름에 녹일 것. 분석·비교형 문장 혼합.",
  },
  "info_intro:compare": {
    id: "compare_column",
    label: "비교 칼럼",
    archetype: "expert_column",
    introStyle: "context_first",
    requiredVoice: [/비교|차이|기준|선택|한쪽|반면/],
    forbiddenVoice: [/무조건/, /최고의\s*선택/],
    introMarkers: /비교|고를\s*때|차이|기준/,
    brandMentionMax: 4,
    regionMentionMax: 2,
    narrativeEmphasis: ["why", "criteria"],
    promptBrief: "비교·판단 기준 중심. 감정 과잉·광고 톤 금지.",
  },
  "info_intro:explain": {
    id: "magazine_explain",
    label: "매거진 설명 칼럼",
    archetype: "magazine",
    introStyle: "context_first",
    requiredVoice: [/정리|알아두|보면|이유|흐름/],
    forbiddenVoice: [/안녕하세요/, /오늘은\s/],
    introMarkers: INTRO_CONTEXT_MARKERS,
    brandMentionMax: 4,
    regionMentionMax: 3,
    narrativeEmphasis: ["why", "saw", "criteria"],
    promptBrief: "브랜드 매거진 칼럼. 설명 나열이 아니 맥락→전개→판단.",
  },
  "local_guide:area": {
    id: "local_area_note",
    label: "지역 생활권 노트",
    archetype: "local_note",
    introStyle: "scene_first",
    requiredVoice: [/동네|근처|이\s*동네|살면|지역|로컬/],
    forbiddenVoice: [/저희는\s*국내\s*최/, /전국\s*어디서나/],
    introMarkers: /동네|근처|살면|이\s*지역/,
    brandMentionMax: 4,
    regionMentionMax: 4,
    narrativeEmphasis: ["why", "saw", "audience"],
    promptBrief:
      "지역 주민·동네 블로거 톤. 지역명은 도입·중간·결에만. 브랜드는 생활 맥락 속에 자연스럽게.",
  },
  "local_guide:life": {
    id: "local_life_note",
    label: "생활 정보 노트",
    archetype: "local_note",
    introStyle: "context_first",
    requiredVoice: [/살면|일상|근처|생활|이웃/],
    forbiddenVoice: [/업종\s*일반/, /꽃집은\s*꽃을/],
    introMarkers: /살면|생활|왜|필요/,
    brandMentionMax: 3,
    regionMentionMax: 4,
    narrativeEmphasis: ["why", "audience", "criteria"],
    promptBrief: "생활 장면→선택 이유. 업종 일반론 금지.",
  },
  "local_guide:local": {
    id: "local_blogger",
    label: "동네 블로거",
    archetype: "local_note",
    introStyle: "scene_first",
    requiredVoice: [/동네|근처|들러|다녀|추천|로컬/],
    forbiddenVoice: [/저희\s*브랜드는\s*국내/],
    introMarkers: /동네|근처|왜|찾/,
    brandMentionMax: 4,
    regionMentionMax: 4,
    narrativeEmphasis: ["why", "saw", "impression"],
    promptBrief: "동네 블로거 후기. 과한 브랜드 홍보 문장 금지.",
  },
};

/** V4 UI 화자 → 엔진 프로필 id (persona 프로필과 병합) */
const V4_PROFILE_OVERRIDES = {
  plain_review: "plain_field_review",
  local_blogger: "local_blogger",
  brand_intro: "brand_editor_philosophy",
  expert_info: "expert_guide_column",
  essay: "essay_sensory",
  real_use: "real_use_field",
  magazine: "magazine_explain",
  interview: "brand_editor_interview",
  column: "compare_column",
};

// essay · interview — V4 전용 (persona 맵 외)
PERSONA_PROFILES._essay = {
  id: "essay_sensory",
  label: "감성 에세이",
  archetype: "essay",
  introStyle: "scene_first",
  requiredVoice: [/느낌|마음|그날|순간|생각|떠올/],
  forbiddenVoice: [/소개해\s*드리/, /핵심\s*포인트\s*:/, /FAQ/],
  introMarkers: /그날|순간|느낌|생각/,
  brandMentionMax: 3,
  regionMentionMax: 2,
  narrativeEmphasis: ["why", "impression"],
  promptBrief:
    "감성 에세이·에디터 노트. 스펙·주차장 나열 금지. 느낌·선택 이유. 브랜드명 최소.",
};

PERSONA_PROFILES._interview = {
  id: "brand_editor_interview",
  label: "인터뷰·대화형",
  archetype: "brand_editor",
  introStyle: "context_first",
  requiredVoice: [/묻|답|이야기|들었|말씀|운영/],
  forbiddenVoice: [/다녀왔는데\s*혼자/, /내돈내산/],
  introMarkers: /왜|궁금|이야기/,
  brandMentionMax: 5,
  regionMentionMax: 3,
  narrativeEmphasis: ["why", "saw", "impression"],
  promptBrief:
    "인터뷰·대화 리듬. 브로슈어 나열 금지. 확인된 말만 인용 형태로.",
};

const PROFILE_BY_ID = Object.fromEntries(
  [
    ...Object.values(PERSONA_PROFILES),
    DEFAULT_PROFILE,
  ].map((p) => [p.id, p])
);

function profileKey(persona, subtype) {
  return `${persona}:${subtype || "product"}`;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {PersonaEngineProfile & { persona: string, subtype: string, v4Speaker?: string, source: string }}
 */
export function resolvePersonaEngineProfile(input = {}) {
  const mapped = applyV4SpeakerToInput(input);
  const resolved = resolveContentPersona(mapped);
  const persona = resolved.persona || "brand_story";
  const subtype = resolved.subtype || "product";
  const v4 = mapped.v4Speaker || input.v4Speaker || "auto";

  let base =
    PERSONA_PROFILES[profileKey(persona, subtype)] ||
    PERSONA_PROFILES[profileKey(persona, "product")] ||
    DEFAULT_PROFILE;

  if (v4 === "essay") base = PERSONA_PROFILES._essay;
  if (v4 === "interview") base = PERSONA_PROFILES._interview;
  if (v4 !== "auto" && V4_PROFILE_OVERRIDES[v4]) {
    const override = PROFILE_BY_ID[V4_PROFILE_OVERRIDES[v4]];
    if (override) base = { ...base, ...override };
  }

  const v4Opt = V4_SPEAKER_OPTIONS.find((o) => o.value === v4);

  return {
    ...base,
    persona,
    subtype,
    v4Speaker: v4,
    v4Label: v4Opt?.label,
    personaLabel: resolved.label,
    source: v4 !== "auto" ? "v4_speaker" : resolved.source || "persona",
  };
}

export function buildPersonaEnginePromptBlock(input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  const arc = (profile.narrativeEmphasis || [])
    .map(
      (id) =>
        HUMAN_EDITOR_NARRATIVE_STEPS.find((s) => s.id === id)?.label || id
    )
    .join(" → ");

  return [
    "【PERSONA × ENGINE V95】",
    `화자: ${profile.v4Label || profile.personaLabel || profile.label} (${profile.id})`,
    `아키타입: ${profile.archetype} · 도입: ${profile.introStyle}`,
    profile.promptBrief,
    `서사 강조: ${arc}`,
    `브랜드명 최대 ${profile.brandMentionMax}회 · 지역명 최대 ${profile.regionMentionMax}회 (억지 반복 금지)`,
    "Editor V95·Humanity·Content Quality 규칙을 이 화자 톤에 맞게 유지.",
  ].join("\n");
}

function openingText(pack) {
  return String(pack?.sections?.[0]?.body || pack?.intro || "").trim().slice(0, 480);
}

/** requiredVoice 패턴(단일·복수) 출현 횟수 */
function countRequiredVoiceHits(fullText = "", patterns = []) {
  let n = 0;
  for (const raw of patterns) {
    const re = asRegExp(raw);
    if (!re) continue;
    const flags = re.flags?.includes("g") ? re.flags : `${re.flags || ""}g`;
    try {
      n += [...String(fullText || "").matchAll(new RegExp(re.source, flags))].length;
    } catch {
      if (re.test(fullText)) n += 1;
    }
  }
  return n;
}

function filterForbiddenVoiceHits(fullText = "", patterns = []) {
  return (patterns || []).map(asRegExp).filter(Boolean).filter((re) => re.test(fullText));
}

/**
 * @param {object} pack
 * @param {Record<string, unknown>} input
 * @param {PersonaEngineProfile} [profile]
 */
export function scorePersonaEngineAlignment(pack, input = {}, profile = null) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, issues: [], profile: null };
  }

  const prof = profile || resolvePersonaEngineProfile(input);
  const full = getBlogFullText(pack);
  const open = openingText(pack);
  const issues = [];

  const voiceHits = countRequiredVoiceHits(full, prof.requiredVoice || []);
  const minVoiceHits = full.replace(/\s/g, "").length < 180 ? 1 : 2;
  if (voiceHits < minVoiceHits) {
    issues.push({
      type: "persona_voice_weak",
      need: minVoiceHits,
      got: voiceHits,
      persona: prof.id,
    });
  }

  const forbiddenHits = filterForbiddenVoiceHits(full, prof.forbiddenVoice);
  if (forbiddenHits.length) {
    issues.push({
      type: "persona_voice_forbidden",
      count: forbiddenHits.length,
      persona: prof.id,
    });
  }

  if (prof.archetype !== "field_review") {
    const title = String(pack?.title || pack?.representativeTitle || "");
    if (detectFieldReviewSurfaceLeak(title).leak) {
      issues.push({ type: "speaker_title_visit_leak", persona: prof.id });
    }
    if (detectFieldReviewSurfaceLeak(open).leak) {
      issues.push({ type: "speaker_opening_visit_leak", persona: prof.id });
    }
  }

  const introForbidden = detectForbiddenIntro(open);
  if (!introForbidden.ok) {
    issues.push({ type: "persona_intro_cliche", hits: introForbidden.hits });
  }

  const introMarkers = asRegExp(prof.introMarkers);
  if (introMarkers && open.length > 30 && !introMarkers.test(open)) {
    issues.push({ type: "persona_intro_style", style: prof.introStyle });
  }

  const arcHit = (prof.narrativeEmphasis || []).map((id) => {
    const step = HUMAN_EDITOR_NARRATIVE_STEPS.find((s) => s.id === id);
    const markers = step ? asRegExp(step.markers) : null;
    return step ? { id, ok: markers ? markers.test(full) : false } : { id, ok: false };
  });
  const arcMet = arcHit.filter((h) => h.ok).length;
  if (arcMet < Math.min(2, (prof.narrativeEmphasis || []).length)) {
    issues.push({ type: "persona_narrative_arc", met: arcMet });
  }

  let score = 88;
  if (voiceHits < minVoiceHits) score -= 22;
  if (forbiddenHits.length) score -= 8 * forbiddenHits.length;
  if (issues.some((i) => i.type === "speaker_title_visit_leak")) score -= 28;
  if (issues.some((i) => i.type === "speaker_opening_visit_leak")) score -= 22;
  if (!introForbidden.ok) score -= 20;
  if (issues.some((i) => i.type === "persona_intro_style")) score -= 12;
  if (issues.some((i) => i.type === "persona_narrative_arc")) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const ok =
    score >= 70 &&
    forbiddenHits.length === 0 &&
    introForbidden.ok &&
    voiceHits >= minVoiceHits &&
    !issues.some((i) =>
      i.type === "speaker_title_visit_leak" || i.type === "speaker_opening_visit_leak"
    );

  return {
    ok,
    score,
    issues,
    profile: prof,
    arcHit,
  };
}

/**
 * place · instagram — 짧은 본문용 완화 검수
 */
export function scoreChannelPersonaAlignment(
  pack,
  input = {},
  channel = "place",
  profile = null
) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, issues: [], profile: null, channel };
  }
  const prof = profile || resolvePersonaEngineProfile(input);
  const full = getChannelFullText(pack, channel);
  if (!full.replace(/\s/g, "").length) {
    return { ok: true, score: 100, issues: [], profile: prof, channel, skipped: true };
  }

  const issues = [];
  const voiceHits = countRequiredVoiceHits(full, prof.requiredVoice || []);
  const minVoiceHits = full.replace(/\s/g, "").length < 120 ? 1 : 2;
  if (voiceHits < minVoiceHits) {
    issues.push({ type: "persona_voice_weak", need: minVoiceHits, got: voiceHits });
  }
  const forbiddenHits = filterForbiddenVoiceHits(full, prof.forbiddenVoice);
  if (forbiddenHits.length) {
    issues.push({ type: "persona_voice_forbidden", count: forbiddenHits.length });
  }

  let score = 86;
  if (voiceHits < minVoiceHits) score -= 18;
  if (forbiddenHits.length) score -= 10 * forbiddenHits.length;
  score = Math.max(0, Math.min(100, score));

  const ok = score >= 62 && forbiddenHits.length === 0 && voiceHits >= minVoiceHits;
  return { ok, score, issues, profile: prof, channel };
}

export function buildPersonaEngineRegenNote(pack, input = {}) {
  const alignment = scorePersonaEngineAlignment(pack, input);
  if (alignment.ok) return "";
  const prof = alignment.profile || resolvePersonaEngineProfile(input);
  const lines = [`화자 유지: ${prof.v4Label || prof.label} — ${prof.promptBrief}`];
  for (const issue of alignment.issues || []) {
    if (issue.type === "persona_voice_weak") {
      lines.push(
        "선택한 화자 말투(직접·체험·느낌·비교 등)를 본문 2곳 이상에 자연스럽게 넣어 주세요."
      );
    } else if (issue.type === "persona_voice_forbidden") {
      lines.push("광고·소개해 드립니다·브로슈어 톤을 제거하고 화자 톤만 유지하세요.");
    } else if (issue.type === "persona_intro_cliche") {
      lines.push("도입을 「안녕하세요」「오늘은」 없이 맥락·장면으로 시작하세요.");
    } else if (issue.type === "persona_intro_style") {
      lines.push(`도입 스타일: ${prof.introStyle} (맥락·장면·질문 중 하나로).`);
    } else if (issue.type === "persona_narrative_arc") {
      const arc = (prof.narrativeEmphasis || [])
        .map(
          (id) =>
            HUMAN_EDITOR_NARRATIVE_STEPS.find((s) => s.id === id)?.label || id
        )
        .join(" → ");
      lines.push(`서사 흐름 보강: ${arc}`);
    } else if (issue.type === "speaker_title_visit_leak") {
      lines.push("제목에서 「직접 다녀온 후기」「방문 후기」 등 후기형 표현을 빼고 선택 화자 톤으로 쓰세요.");
    } else if (issue.type === "speaker_opening_visit_leak") {
      lines.push("도입 첫 문단에서 방문·체험 후기 톤을 빼고 브랜드/정보 화자 시선으로 시작하세요.");
    }
  }
  return [...new Set(lines)].join(" ");
}

export function applyPersonaEngineMetaPass(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const profile = resolvePersonaEngineProfile(input);
  const alignment = scorePersonaEngineAlignment(pack, input, profile);
  const regenNote = alignment.ok ? "" : buildPersonaEngineRegenNote(pack, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      personaEngineProfile: {
        id: profile.id,
        label: profile.label,
        persona: profile.persona,
        subtype: profile.subtype,
        v4Speaker: profile.v4Speaker,
      },
      personaEngineAlignment: alignment,
      personaAligned: alignment.ok,
      personaRegenNote: regenNote || undefined,
    },
  };
}

export function applyChannelPersonaMetaPass(pack, input = {}, channel = "place") {
  if (!pack) return pack;
  const profile = resolvePersonaEngineProfile(input);
  const alignment = scoreChannelPersonaAlignment(pack, input, channel, profile);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      personaEngineProfile: {
        id: profile.id,
        label: profile.label,
        channel,
      },
      personaEngineAlignment: alignment,
      personaAligned: alignment.ok,
    },
  };
}

export function getPersonaBrandRegionLimits(input = {}) {
  const p = resolvePersonaEngineProfile(input);
  return {
    brandMentionMax: p.brandMentionMax,
    regionMentionMax: p.regionMentionMax,
    profileId: p.id,
  };
}
