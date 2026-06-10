/**
 * BRICLOG EDITOR ENGINE V95 — SSOT
 * AI처럼 쓰지 않고 브랜드 전문 에디터처럼. SEO보다 끝까지 읽히는 글.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import {
  ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
  ANTI_SEO_SPAM_PRONOUNS,
  countTokenMentions,
  resolveAntiSeoTopicPronouns,
  scoreAntiSeoSpam,
  softenTokenRepeats,
} from "@/lib/product/antiSeoSpamEngine";
import {
  detectSentenceStructureOveruse,
  scoreSentenceLengthVariety,
} from "@/lib/product/humanityCommonSenseEngine";
import { scoreHumanBelief, AD_SMELL_RES } from "@/lib/product/humanBeliefEngine";
import { titleContext } from "@/lib/content/humanTitleEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_OVER_SEO_PRIORITY } from "@/lib/product/briclogUltimateV20";
import {
  detectForbiddenIntro,
  FORBIDDEN_INTRO_PATTERNS,
  INTRO_CONTEXT_MARKERS,
} from "@/lib/product/editorIntroRules";
import { scoreHumanEditorGuard } from "@/lib/content/humanEditorGuardPass";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";
import {
  applyHumanConversationalVoice,
  ensureHumanConversationalBookends,
} from "@/lib/content/humanConversationalVoice";

export const EDITOR_ENGINE_V95_VERSION = "v95";

export const EDITOR_ENGINE_V95_BRIEF = `브릭로그는 AI처럼 쓰지 않는다. 브랜드 전문 에디터처럼 쓴다. ${HUMAN_OVER_SEO_PRIORITY}
좋은 글은 정보를 많이 넣는 글이 아니라 읽히는 글이다. 설명보다 맥락을 먼저 쓴다.
도입 금지: 「안녕하세요」「이번에는」「오늘은」「소개해드리겠습니다」 — 왜 이 주제가 필요한지부터.
문장: 짧·중·긴 혼합. 질문·회상·관찰·비교·분석형 혼합. 같은 길이·같은 꼬리 3회+ 금지.
휴머니티: 생각·고민·판단·관찰. 스펙·주차장 나열이 아니 느낌·선택 이유.
브랜드·지역명 억지 반복 금지 — 필요한 곳만, 나머지는 이 브랜드·이 공간·이 제품 등.
최종: 블로그 글이 아니 브랜드 매거진·칼럼·현장 후기·에디터 노트처럼.
「AI가 잘 썼다」가 아니 「누가 직접 다녀와서 쓴 줄 알았다」.`;

export { FORBIDDEN_INTRO_PATTERNS, INTRO_CONTEXT_MARKERS, detectForbiddenIntro } from "@/lib/product/editorIntroRules";

const RHETORIC_MODES = [
  { id: "question", re: /[?？]|할까|일까|까요|인가요/ },
  { id: "recall", re: /더라구요|더라고요|거든요|기억|그때/ },
  { id: "observation", re: /보니|느껴|눈에|들어왔|달랐|관찰/ },
  { id: "compare", re: /비교|차이|반면|대신|한쪽/ },
  { id: "analysis", re: /이유|때문|기준|정리하면|결국|판단/ },
];

const HUMANITY_MARKER_GROUPS = [
  { id: "thought", re: /생각|고민|궁금|머릿속|처음에는/ },
  { id: "feeling", re: /느낌|편했|인상|마음|달랐/ },
  { id: "judgment", re: /판단|기준|선택|결정|보면/ },
  { id: "observation", re: /보니|확인|직접|들러|다녀/ },
];

const SPEC_DUMP_RES = [
  /주차장\s*(?:은|는|이|가)\s*\d/,
  /주차\s*(?:가능|공간)\s*\d+\s*대/,
  /스펙\s*(?:은|는)\s*다음/,
  /제품\s*구성\s*:\s*/,
];

const MAGAZINE_TONE_RES =
  /칼럼|에디터\s*노트|다녀온|현장|매거진|솔직\s*후기|직접\s*확인/;

/** 서술형 「~다」는 한국어 칼럼에서 자연스러움 — formal/해요/회상 꼬리만 검사 */
function detectEditorStructureOveruse(fullText = "") {
  const raw = detectSentenceStructureOveruse(fullText);
  const issues = (raw.issues || []).filter((i) => i.tail !== "da");
  return {
    ok: issues.length === 0,
    bucketCounts: raw.bucketCounts,
    issues,
  };
}

const BRAND_MAX_MENTIONS = ANTI_SEO_SPAM_MAX_TOKEN_REPEAT + 2;
const REGION_MAX_MENTIONS = ANTI_SEO_SPAM_MAX_TOKEN_REPEAT + 1;

function openingBlock(pack) {
  const first = pack?.sections?.[0]?.body || pack?.intro || "";
  return String(first).trim().slice(0, 420);
}

export function scoreIntroContextFirst(pack) {
  const open = openingBlock(pack);
  const forbidden = detectForbiddenIntro(open);
  const hasContext = INTRO_CONTEXT_MARKERS.test(open);
  let score = 80;
  if (!forbidden.ok) score -= 35;
  if (!hasContext && open.length > 40) score -= 18;
  if (hasContext) score += 12;
  score = Math.max(0, Math.min(100, score));
  return {
    ok: forbidden.ok && (hasContext || open.length < 30),
    score,
    forbidden,
    hasContext,
  };
}

export function scoreSentenceRhythmMix(fullText = "") {
  const variety = scoreSentenceLengthVariety(fullText);
  const structure = detectEditorStructureOveruse(fullText);
  const sentences = splitKoreanSentences(fullText).filter(
    (s) => s.replace(/\s/g, "").length >= 6
  );
  const lengths = sentences.map((s) => s.replace(/\s/g, "").length);
  let sameLenRun = 0;
  let maxSameLenRun = 0;
  for (let i = 1; i < lengths.length; i += 1) {
    const same =
      Math.abs(lengths[i] - lengths[i - 1]) <= 4 && lengths[i] >= 12;
    sameLenRun = same ? sameLenRun + 1 : 0;
    maxSameLenRun = Math.max(maxSameLenRun, sameLenRun);
  }
  const rhetoricHit = RHETORIC_MODES.filter((m) => m.re.test(fullText));
  const rhetoricOk = rhetoricHit.length >= 2;

  let score = variety.score;
  if (!structure.ok) score -= 20;
  if (maxSameLenRun >= 3) score -= 15;
  if (!rhetoricOk) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return {
    ok:
      variety.kinds >= 2 &&
      structure.ok &&
      maxSameLenRun < 3 &&
      rhetoricOk,
    score,
    variety,
    structure,
    maxSameLenRun,
    rhetoricModes: rhetoricHit.map((m) => m.id),
  };
}

export function scoreEditorHumanityMarkers(fullText = "") {
  const hit = HUMANITY_MARKER_GROUPS.filter((g) => g.re.test(fullText));
  const specDump = SPEC_DUMP_RES.filter((re) => re.test(fullText)).length;
  let score = 55 + hit.length * 12;
  if (specDump >= 2) score -= 22;
  if (hit.length < 2) score -= 18;
  score = Math.max(0, Math.min(100, score));
  return {
    ok: hit.length >= 2 && specDump < 2,
    score,
    groups: hit.map((g) => g.id),
    specDumpCount: specDump,
  };
}

export function detectBrandRegionEditorViolations(fullText = "", input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const prof = input.personaEngineProfile || {};
  const brandMax = prof.brandMentionMax ?? BRAND_MAX_MENTIONS;
  const regionMax = prof.regionMentionMax ?? REGION_MAX_MENTIONS;
  const issues = [];
  const anti = scoreAntiSeoSpam(fullText, input);

  if (brand) {
    const count = countTokenMentions(fullText, brand);
    if (count > brandMax) {
      issues.push({ type: "brand_over_repeat", count, max: brandMax, persona: prof.id });
    }
  }
  if (region && region !== "전국") {
    const count = countTokenMentions(fullText, region);
    if (count > regionMax) {
      issues.push({ type: "region_over_repeat", count, max: regionMax, persona: prof.id });
    }
  }
  for (const o of anti.overused || []) {
    issues.push({ type: "anti_seo_spam", ...o });
  }
  return { ok: issues.length === 0, issues, anti };
}

function stripForbiddenIntroLines(body) {
  let text = String(body || "").trim();
  if (!text) return text;
  const sentences = splitKoreanSentences(text);
  const filtered = sentences.filter((s) => detectForbiddenIntro(s).ok);
  if (filtered.length && filtered.length < sentences.length) {
    return filtered.join(" ").trim();
  }
  for (const re of FORBIDDEN_INTRO_PATTERNS) {
    text = text.replace(re, "").trim();
  }
  return text.replace(/^\s*[,，]\s*/, "").trim();
}

function softenEntityRepeatsInText(text, input = {}) {
  let out = String(text || "");
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (brand) {
    out = softenTokenRepeats(
      out,
      brand,
      ANTI_SEO_SPAM_PRONOUNS.brand,
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
    );
  }
  if (region) {
    out = softenTokenRepeats(
      out,
      region,
      ANTI_SEO_SPAM_PRONOUNS.region,
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
    );
  }
  if (topic && topic.length >= 2) {
    out = softenTokenRepeats(
      out,
      topic,
      resolveAntiSeoTopicPronouns(input),
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT + 1
    );
  }
  return out;
}

/**
 * 출력 직전 — 도입·브랜드/지역 반복 보정 (길이 패딩 없음)
 */
function editorV95PolishLines(input = {}) {
  const brand = String(input.brandName || "매장").trim();
  const facet = topicWritingFacet(input);
  return [
    `${facet} 볼 때 어떤 순서로 비교하면 덜 헷갈릴까요?`,
    `직접 확인해 보니 생각보다 선택 기준이 달라졌어요.`,
    `비교해 보니 가격보다 이용 동선이 먼저 정리됐어요.`,
    `${brand} 안내를 들으면서 느낀 점은 기준이 명확하다는 거예요.`,
  ];
}

/** editor v95 미달 시 — 리듬·휴머니티·구어 보강 (분량 유지) */
export function polishEditorV95Delivery(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  const evalInput = input || ctx.input || ctx;
  let next = applyEditorV95Pass(pack, ctx, evalInput);
  const lines = editorV95PolishLines(evalInput);

  for (let round = 0; round < 4; round += 1) {
    let scored = scoreEditorV95(next, ctx, evalInput);
    if (scored.editorPass) {
      return {
        ...next,
        _meta: {
          ...(next._meta || {}),
          editorEngineV95: scored,
          editorV95Pass: true,
          editorV95Polished: round > 0 || undefined,
        },
      };
    }

    next = applyHumanConversationalVoice(next, evalInput);
    if (round > 0) {
      next = ensureHumanConversationalBookends(next, evalInput);
    }

    const sections = [...(next.sections || [])];
    const idx = Math.min(1 + round, Math.max(0, sections.length - 1));
    const sec = sections[idx];
    const line = lines[round % lines.length];
    if (sec && line && !String(sec.body || "").includes(line.slice(0, 12))) {
      sections[idx] = {
        ...sec,
        body: `${String(sec.body || "").trim()}\n\n${line}`.trim(),
      };
      next = { ...next, sections };
    }

    next = applyEditorV95Pass(next, ctx, evalInput);
    scored = scoreEditorV95(next, ctx, evalInput);
    if (scored.editorPass) {
      return {
        ...next,
        _meta: {
          ...(next._meta || {}),
          editorEngineV95: scored,
          editorV95Pass: true,
          editorV95Polished: true,
        },
      };
    }
  }

  const finalScored = scoreEditorV95(next, ctx, evalInput);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorEngineV95: finalScored,
      editorV95Pass: finalScored.editorPass,
      editorV95Polished: true,
    },
  };
}

export function applyEditorV95Pass(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  const evalInput = input || ctx.input || ctx;
  const sections = pack.sections.map((sec, idx) => {
    let body = String(sec.body || "");
    if (idx === 0) body = stripForbiddenIntroLines(body);
    body = softenEntityRepeatsInText(body, evalInput);
    return { ...sec, body };
  });

  let next = {
    ...pack,
    sections,
    intro: pack.intro ? softenEntityRepeatsInText(pack.intro, evalInput) : pack.intro,
    conclusion: pack.conclusion
      ? softenEntityRepeatsInText(pack.conclusion, evalInput)
      : pack.conclusion,
  };

  const scored = scoreEditorV95(next, ctx, evalInput);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorEngineV95: scored,
      editorV95Pass: scored.editorPass,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} input
 */
export function scoreEditorV95(pack, ctx = {}, input = {}) {
  if (!isBriclogMissionEnforced()) {
    return {
      ok: true,
      score: 100,
      editorPass: true,
      issues: [],
      checks: {},
    };
  }

  const evalInput = input || ctx.input || ctx;
  const full = getBlogFullText(pack);
  const intro = scoreIntroContextFirst(pack);
  const rhythm = scoreSentenceRhythmMix(full);
  const humanity = scoreEditorHumanityMarkers(full);
  const entities = detectBrandRegionEditorViolations(full, evalInput);
  const structure = detectEditorStructureOveruse(full);
  const belief = scoreHumanBelief(full, evalInput, pack);
  const guard = scoreHumanEditorGuard(full, evalInput);
  const adHits = AD_SMELL_RES.filter((re) => re.test(full)).length;
  const magazineTone = MAGAZINE_TONE_RES.test(full);
  const duplicate = hasDuplicateSentences(full, 18);
  const beliefHard = (belief.issues || []).some((i) =>
    ["ad_smell_high", "brochure_voice", "checklist_voice", "coverage_slot_dump"].includes(
      i
    )
  );

  const issues = [
    ...(intro.forbidden?.ok === false
      ? [{ type: "forbidden_intro", hits: intro.forbidden.hits }]
      : []),
    ...(!intro.hasContext && openingBlock(pack).length > 50
      ? [{ type: "intro_no_context" }]
      : []),
    ...(!rhythm.ok ? [{ type: "sentence_rhythm_flat" }] : []),
    ...(!humanity.ok ? [{ type: "humanity_markers_low" }] : []),
    ...entities.issues,
    ...(!structure.ok ? structure.issues : []),
    ...(duplicate ? [{ type: "same_meaning_repeat" }] : []),
    ...(adHits >= 2 ? [{ type: "ad_smell" }] : []),
    ...(beliefHard
      ? belief.issues.map((i) => ({ type: "belief", code: i }))
      : []),
    ...(!guard.ok ? guard.issues.slice(0, 6) : []),
  ];

  let score = Math.round(
    (intro.score + rhythm.score + humanity.score + (belief.score || 70)) / 4
  );
  if (!entities.ok) score -= 14;
  if (!structure.ok) score -= 12;
  if (duplicate) score -= 10;
  if (adHits >= 2) score -= 10;
  if (!magazineTone) score -= 4;
  if (!guard.ok) score -= Math.min(18, guard.issues.length * 4);
  if (guard.hardFail) score -= 12;
  score = Math.max(0, Math.min(100, score));

  const hardFail =
    !intro.forbidden?.ok ||
    !entities.ok ||
    !structure.ok ||
    duplicate ||
    adHits >= 3 ||
    beliefHard ||
    guard.hardFail;

  const editorPass =
    score >= 68 &&
    !hardFail &&
    intro.ok &&
    rhythm.variety?.ok !== false &&
    humanity.ok &&
    belief.score >= 55 &&
    !beliefHard;

  return {
    ok: editorPass,
    score,
    editorPass,
    magazineTone,
    issues,
    checks: { intro, rhythm, humanity, entities, structure, belief, guard },
  };
}

export function assertEditorV95ForOutput(pack, ctx = {}, input = {}) {
  const scored = scoreEditorV95(pack, ctx, input);
  return {
    ok: scored.editorPass,
    passOutput: scored.editorPass,
    score: scored.score,
    issues: scored.issues,
    userMessage: scored.editorPass
      ? null
      : "에디터 톤을 다시 다듬는 중입니다. 잠시 후 다시 시도해 주세요.",
    editorV95: scored,
  };
}

export function buildEditorV95PromptBlock() {
  const modes = RHETORIC_MODES.map((m) => m.id).join(" · ");
  return [
    "【BRICLOG EDITOR ENGINE V95】",
    EDITOR_ENGINE_V95_BRIEF,
    `문체 혼합: ${modes}`,
    `도입 금지 패턴: 안녕하세요 · 이번에는 · 오늘은 · 소개해드리겠습니다`,
  ].join("\n");
}
