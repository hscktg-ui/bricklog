/**
 * BRICLOG Writing Constitution V2 — 모든 채널 생성·검수 최상위 규칙
 */
import {
  evaluateWritingConstitution,
  stripAdPhrases,
  softenExplainPatterns,
  BANNED_SECTION_HEADINGS,
  AD_BANNED_PHRASES,
} from "@/lib/constitution/writingConstitution";
import { V4_AI_CLICHES } from "@/lib/quality/v4ContentAudit";
import { getBlogFullText } from "@/utils/qualityCheck";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import {
  CONSTITUTION_V2_TARGET_SCORE,
  CONSTITUTION_V2_SOFT_PASS,
} from "@/lib/constitution/constitutionThresholds";

export { CONSTITUTION_V2_TARGET_SCORE, CONSTITUTION_V2_SOFT_PASS };

/** @deprecated v1 호환 — 최종 재작성 기준은 90 */
export const CONSTITUTION_V2_REGEN_THRESHOLD = CONSTITUTION_V2_TARGET_SCORE;

export const CONSTITUTION_V2_AI_CLICHES = [
  ...V4_AI_CLICHES,
  "특별한 경험",
  "행복한 시간",
  "풍요롭게 만들다",
  "마음을 전하다",
  "가치를 전달하다",
];

export const CONSTITUTION_V2_SECTIONS = {
  priority:
    "이 헌법은 모든 블로그·스마트플레이스·인스타그램·콘텐츠 생성보다 항상 우선한다.",
  philosophy:
    "브릭로그는 AI 생성기가 아니라, 사람이 읽고 공감·이해·행동하게 만드는 콘텐츠 시스템이다. 좋은 글은 길이가 아니라 끝까지 읽히는 글이다.",
  readerFirst:
    "브랜드보다 독자를 먼저 이해한다. 왜 검색했는지, 무엇이 궁금·불안한지, 무엇을 결정하려는지에 답한다.",
  experience:
    "추상어(특별한 경험, 소중한 순간)보다 퇴근길·주말 아침·비 오는 날·집들이 전날 같은 구체 장면을 우선한다.",
  emotion: "감정은 말하지 말고 느끼게 한다. '감동을 선사합니다' 금지, 장면으로 전달.",
  info: "감성만으로는 실패. 이용 방법·선택 기준·차이·주의사항 등 독자가 궁금한 정보를 포함한다.",
  search: "검색 사용자의 질문에 답하지 못하면 실패. 좋은 문장보다 좋은 답변이 먼저다.",
  brand: "브랜드 특징·철학·서비스·지역·차별점이 자연스럽게 녹아야 한다. 브랜드 없는 글은 실패.",
  aiSmell: `AI 관용구 최소화: ${CONSTITUTION_V2_AI_CLICHES.slice(0, 8).join(", ")} 등`,
  repetition: "동일 문장·표현·패턴 반복 금지. 같은 의미는 다른 표현으로.",
  scenes: "시간·장소·상황·감정 중 최소 2개 이상이 드러나는 장면을 가진다.",
  finale: "설명하지 말고 보여줘라. 말하지 말고 느끼게 하라. 광고가 아니라 이야기를 써라.",
};

export const V2_PERSONA_OPTIONS = [
  { value: "plain_review", label: "담백한 후기형", persona: "visit_review", subtype: "review" },
  { value: "local_blogger", label: "동네 블로거형", persona: "local_guide", subtype: "local" },
  { value: "brand_intro", label: "브랜드 소개형", persona: "brand_story", subtype: "philosophy" },
  { value: "expert_info", label: "전문 정보형", persona: "info_intro", subtype: "guide" },
  { value: "real_use", label: "실사용 후기형", persona: "visit_review", subtype: "experience" },
  { value: "magazine", label: "매거진형", persona: "info_intro", subtype: "explain" },
  { value: "essay", label: "감성 에세이형", persona: "brand_story", subtype: "product" },
  { value: "interview", label: "인터뷰형", persona: "brand_story", subtype: "event" },
  { value: "column", label: "칼럼형", persona: "info_intro", subtype: "compare" },
];

export const V2_EMOTION_OPTIONS = [
  { value: "plain", label: "담백함" },
  { value: "warm", label: "따뜻함" },
  { value: "excited", label: "설렘" },
  { value: "calm", label: "차분함" },
  { value: "trust", label: "신뢰감" },
  { value: "pro", label: "전문성" },
  { value: "playful", label: "유쾌함" },
  { value: "premium", label: "고급스러움" },
  { value: "friendly", label: "친근함" },
];

export const SPEECH_STYLE_OPTIONS = [
  {
    value: "polite_explain",
    label: "정중한 설명형",
    endings: ["습니다", "입니다", "됩니다", "있습니다"],
    forbid: ["했어요", "더라고요", "같아요", "했는데요"],
    hint: "전 구간 ~습니다/~입니다 체. 해요체·구어 혼용 금지.",
  },
  {
    value: "friendly_blog",
    label: "친근한 블로그형",
    endings: ["했어요", "더라고요", "같아요", "이에요", "예요"],
    forbid: ["습니다", "입니다"],
    hint: "전 구간 ~했어요/~더라고요/~같아요. 습니다체 혼용 금지.",
  },
  {
    value: "experience_share",
    label: "경험 공유형",
    endings: ["했는데요", "보니까", "느꼈습니다", "했어요"],
    forbid: [],
    hint: "경험 서술 ~했는데요/~보니까. 말투 혼용 금지.",
  },
  {
    value: "magazine_tone",
    label: "매거진형",
    endings: ["다", "했다", "된다"],
    forbid: ["습니다", "했어요", "했는데요"],
    hint: "간결·담백 서술. 구어·설명체 혼용 최소.",
  },
  {
    value: "column_logic",
    label: "칼럼형",
    endings: ["다", "이다", "된다", "있다"],
    forbid: ["했어요", "더라고요"],
    hint: "논리·근거 중심. 감성 수식 최소.",
  },
  {
    value: "brand_official",
    label: "브랜드 공식형",
    endings: ["습니다", "드립니다", "안내드립니다"],
    forbid: ["했어요", "ㅋ", "ㅎ"],
    hint: "신뢰·공식 안내 톤. 유행어·구어 금지.",
  },
  {
    value: "review_real",
    label: "후기형",
    endings: ["했어요", "했습니다", "느꼈어요", "같았어요"],
    forbid: [],
    hint: "실제 이용 경험 1인칭. 과장·광고 문구 금지.",
  },
];

export const PROFICIENCY_OPTIONS = [
  {
    value: "beginner",
    label: "초보 블로거",
    hint: "짧은 문장, 쉬운 어휘. 다듬기는 최소.",
  },
  {
    value: "general",
    label: "일반 블로거",
    hint: "자연스러운 일상 톤. 불필요한 수식 일부 제거.",
  },
  {
    value: "marketer",
    label: "마케터",
    hint: "방문·저장 유도는 부드럽게. 광고 냄새 제거.",
  },
  {
    value: "editor_pro",
    label: "전문 에디터",
    hint: "불필요 문장·반복·광고 냄새 제거, 문맥 정리, 가독성·제목 강화.",
    default: true,
  },
  {
    value: "writer_pro",
    label: "전문 작가",
    hint: "리듬·장면·여운. 과한 설명·중복 금지.",
  },
];

export const DEFAULT_SPEECH_STYLE = "friendly_blog";
export const DEFAULT_PROFICIENCY = "editor_pro";

const CHANNEL_RULES = {
  blog: "장면 도입 → 감정·공감 → 정보·선택 이유 → 브랜드 자연 반영. 소제목 나열·SEO 나열 금지.",
  smartplace:
    "사장님 공지 톤 150~350자. 블로그에서 운영·입고·이벤트·방문 이유만 재해석(문장 복붙 금지). 이모지 0~1개(제목·CTA 포인트). 방문·문의 한 줄.",
  instagram:
    "Hook+짧은 줄바꿈 180~480자. 블로그 장면·감정선을 캡션 리듬으로 변환(요약·설명체 금지). 이모지 2~5개(Hook·마무리·한 줄 포인트). 저장·공감.",
};

export function resolveSpeechStyle(input = {}) {
  const key = input.speechStyle || DEFAULT_SPEECH_STYLE;
  return (
    SPEECH_STYLE_OPTIONS.find((o) => o.value === key) ||
    SPEECH_STYLE_OPTIONS.find((o) => o.value === DEFAULT_SPEECH_STYLE)
  );
}

export function resolveProficiency(input = {}) {
  const key = input.proficiency || DEFAULT_PROFICIENCY;
  return (
    PROFICIENCY_OPTIONS.find((o) => o.value === key) ||
    PROFICIENCY_OPTIONS.find((o) => o.value === DEFAULT_PROFICIENCY)
  );
}

export function applyV2PersonaToInput(input = {}) {
  const key = input.v4Speaker || "auto";
  if (key === "auto") return input;
  const opt = V2_PERSONA_OPTIONS.find((o) => o.value === key);
  if (!opt?.persona) return input;
  return {
    ...input,
    contentPersona: opt.persona,
    contentPersonaSubtype: opt.subtype || input.contentPersonaSubtype,
  };
}

export function getV2PersonaPromptLine(input = {}) {
  const key = input.v4Speaker || "auto";
  const opt = V2_PERSONA_OPTIONS.find((o) => o.value === key);
  if (!opt || key === "auto") {
    return "화자: 브랜드·주제 분석 후 1종 선택. 본문 처음부터 끝까지 동일 화자·관점 유지.";
  }
  return `화자: ${opt.label}. 처음부터 끝까지 동일 관점·말투.`;
}

export function getSpeechStylePromptLine(input = {}) {
  const s = resolveSpeechStyle(input);
  return `문체(말투): ${s.label}. ${s.hint} 제목·도입·본문·마무리 전 구간 일관.`;
}

export function getProficiencyPromptLine(input = {}) {
  const p = resolveProficiency(input);
  return `숙련도: ${p.label}. ${p.hint}`;
}

export function buildConstitutionSystemAddon(channel = "blog", ctx = {}) {
  const ch = channel === "place" ? "smartplace" : channel;
  const speech = resolveSpeechStyle(ctx.input || ctx);
  const prof = resolveProficiency(ctx.input || ctx);

  return `
BRICLOG WRITING CONSTITUTION V2 (최우선 — 아래 채널 규칙보다 항상 우선)
${CONSTITUTION_V2_SECTIONS.priority}
철학: ${CONSTITUTION_V2_SECTIONS.philosophy}
독자: ${CONSTITUTION_V2_SECTIONS.readerFirst}
경험: ${CONSTITUTION_V2_SECTIONS.experience}
감정: ${CONSTITUTION_V2_SECTIONS.emotion}
정보: ${CONSTITUTION_V2_SECTIONS.info}
검색: ${CONSTITUTION_V2_SECTIONS.search}
브랜드: ${CONSTITUTION_V2_SECTIONS.brand}
AI금지: ${CONSTITUTION_V2_SECTIONS.aiSmell}
반복: ${CONSTITUTION_V2_SECTIONS.repetition}
장면: ${CONSTITUTION_V2_SECTIONS.scenes}
채널: ${CHANNEL_RULES[ch] || CHANNEL_RULES.blog}
문체: ${speech.label} — ${speech.hint}
숙련도: ${prof.label} — ${prof.hint}
금지 소제목: ${BANNED_SECTION_HEADINGS.slice(0, 5).join(", ")} 등
금지 광고어: ${AD_BANNED_PHRASES.slice(0, 8).join(", ")}`;
}

export function buildConstitutionUserAddon(ctx = {}) {
  return `
【헌법 V2】 독자 질문에 먼저 답 → 장면 2요소+ → 브랜드 자연 반영 → ${getV2PersonaPromptLine(ctx.input || ctx)}
${getSpeechStylePromptLine(ctx.input || ctx)}
${getProficiencyPromptLine(ctx.input || ctx)}`;
}

export function buildConstitutionChannelBrief(channel, ctx = {}) {
  const speech = resolveSpeechStyle(ctx);
  return [
    "[헌법 V2 최우선]",
    CONSTITUTION_V2_SECTIONS.readerFirst,
    CHANNEL_RULES[channel === "place" ? "smartplace" : channel] || CHANNEL_RULES.blog,
    `문체: ${speech.label}`,
    `숙련: ${resolveProficiency(ctx).label}`,
  ].join("\n");
}

function channelFullText(pack, channel) {
  if (channel === "blog") return getBlogFullText(pack);
  return [
    pack?.title,
    pack?.shortNotice,
    pack?.detailBody,
    pack?.hook,
    pack?.body,
    pack?.lineBreakBody,
    pack?.ending,
  ]
    .filter(Boolean)
    .join("\n");
}

function countCliches(text) {
  let n = 0;
  for (const p of CONSTITUTION_V2_AI_CLICHES) {
    if (text.includes(p)) n += 1;
  }
  return n;
}

/** 문체 혼용 검사 */
export function detectSpeechStyleMixing(text, styleKey) {
  const style = SPEECH_STYLE_OPTIONS.find((o) => o.value === styleKey);
  if (!style?.endings?.length) return { ok: true, mixed: [] };

  const t = String(text || "");
  const endingHits = style.endings.filter((e) => t.includes(e)).length;
  const forbiddenHits = (style.forbid || []).filter((e) => t.includes(e));

  if (styleKey === "polite_explain" || styleKey === "brand_official") {
    if (forbiddenHits.length >= 4 && endingHits < 2) {
      return { ok: false, mixed: forbiddenHits };
    }
  }
  if (styleKey === "friendly_blog") {
    if (forbiddenHits.length >= 5 && endingHits < 2) {
      return { ok: false, mixed: forbiddenHits };
    }
  }
  if (forbiddenHits.length >= 6 && endingHits < 1) {
    return { ok: false, mixed: forbiddenHits };
  }
  return { ok: true, mixed: [] };
}

export function evaluateWritingConstitutionV2(pack, ctx = {}, channel = "blog") {
  const v1 = evaluateWritingConstitution(pack, ctx, channel);
  const full = channel === "blog" ? v1.fullText : channelFullText(pack, channel);
  const styleKey = ctx.speechStyle || ctx.input?.speechStyle || DEFAULT_SPEECH_STYLE;
  const speechMix = detectSpeechStyleMixing(full, styleKey);
  const clicheN = countCliches(full);
  const duplicate = hasDuplicateSentences(full, 12);

  const checks = {
    ...v1.checks,
    speechConsistent: speechMix.ok,
    lowCliche: clicheN <= 1,
    noDuplicate: !duplicate,
  };

  const failures = [...v1.failures];
  if (!checks.speechConsistent) failures.push("speech_mix");
  if (!checks.lowCliche) failures.push("ai_cliche");
  if (!checks.noDuplicate) failures.push("duplicate");

  const scorePenalty =
    (speechMix.ok ? 0 : 12) + Math.min(15, clicheN * 5) + (duplicate ? 10 : 0);
  const v2Score = Math.max(0, 100 - scorePenalty - failures.length * 4);

  return {
    ok: failures.length === 0,
    checks,
    failures: [...new Set(failures)],
    fullText: full,
    v1,
    v2Score,
    clicheN,
    speechMix,
  };
}

export function applyConstitutionV2ToBlogPack(pack, ctx = {}) {
  if (!pack) return pack;
  let next = { ...pack };
  if (next.sections) {
    next.sections = next.sections.map((s) => ({
      heading: softenExplainPatterns(stripAdPhrases(s.heading)),
      body: softenExplainPatterns(stripAdPhrases(s.body)),
    }));
  }
  if (next.conclusion) {
    next.conclusion = softenExplainPatterns(stripAdPhrases(next.conclusion));
  }
  next.title = stripAdPhrases(next.representativeTitle || next.title || "");
  next.representativeTitle = next.title;
  next._meta = {
    ...next._meta,
    writingConstitutionV2: true,
    speechStyle: resolveSpeechStyle(ctx.input || ctx).value,
    proficiency: resolveProficiency(ctx.input || ctx).value,
  };
  return next;
}

export function applyConstitutionV2ToChannelPack(pack, channel = "place") {
  if (!pack) return pack;
  const fields =
    channel === "instagram"
      ? ["hook", "body", "lineBreakBody", "ending", "title"]
      : ["title", "shortNotice", "detailBody", "cta"];
  const next = { ...pack };
  for (const f of fields) {
    if (next[f]) next[f] = softenExplainPatterns(stripAdPhrases(next[f]));
  }
  next._meta = { ...next._meta, writingConstitutionV2: true, channel };
  return next;
}

export function needsConstitutionRegen(qualityScore, v2Audit) {
  const total = qualityScore?.total ?? 0;
  if (total > 0 && total < CONSTITUTION_V2_TARGET_SCORE) return true;
  if (v2Audit && !v2Audit.ok && (v2Audit.failures?.length || 0) >= 2) return true;
  return false;
}
