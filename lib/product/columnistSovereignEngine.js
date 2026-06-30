/**
 * Columnist Sovereign — 모든 업종·주제: 조사만으로 GPT 칼럼니스트 신규 집필
 * Mission 템플릿·에디터 패딩·다시받기 조립 입력 금지
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import { formatResearchFactsForPrompt } from "@/lib/content/v2ResearchFacts";
import { formatSubstantiveResearchFactsForPrompt } from "@/lib/product/editorGradeResearchGate";
import {
  isVisitReviewTopicInput,
  resolveVisitReviewIntentInput,
} from "@/lib/content/topicFacetEngine";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import {
  assessUneditedPublishGrade,
  UNEDITED_PUBLISH_WITHHOLD_MESSAGE,
} from "@/lib/product/uneditedPublishGradeGate";
import {
  detectVisitReviewTemplateContamination,
  applyVisitReviewTopicPackGate,
} from "@/lib/content/visitReviewTopicGate";
import { buildVisitReviewUnifiedProsePromptBlock } from "@/lib/content/visitReviewUnifiedProseEngine";
import { buildColumnVisitNorthStarPromptBlock } from "@/lib/product/columnVisitNorthStar";
import { buildNorthStarReferencePromptBlock } from "@/lib/product/northStarReferenceExamples";
import { assessVisitReviewBenchmark, resolveVisitReviewPassMin } from "@/lib/product/visitReviewBenchmarkRubric";
import { assessPackRegionBrandMash } from "@/lib/content/regionBrandMashRepair";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { parseLlmBlogResponse } from "@/lib/llm/postProcessLlmBlog";
import { normalizeLlmVoiceForDelivery } from "@/lib/golden/llmDeliveryPolish";
import { createPromptContext } from "@/utils/promptBuilder";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { isLlmOriginatedPack } from "@/lib/product/contentQualityDelivery";
import { isMissionFallbackPack } from "@/lib/product/briclogWriterEngine";
import { applyGpt55PrePublishChecks } from "@/lib/product/gpt55LightDelivery";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";
import {
  isColumnistFastDeliveryEnabled,
  getColumnistFastMaxTokens,
  getColumnistMaxLlmRounds,
  isCustomerTwoMinuteSlaMode,
} from "@/lib/config/briclogFastPipeline";
import { resolveUneditedPublishMinChars } from "@/lib/product/uneditedPublishGradeGate";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  isVisitReviewSovereignEligible,
  needsVisitReviewSovereignUpgrade,
} from "@/lib/product/visitReviewSovereignEngine";
import {
  assertColumnistDeliveryLaw,
  buildColumnistWithholdMessage,
  isColumnistSovereignPack,
} from "@/lib/product/columnistDeliveryLaw";

export const COLUMNIST_SOVEREIGN_VERSION = "columnist-sovereign-v1";
export const COLUMNIST_SOVEREIGN_PASS_MIN = 85;

export function isColumnistSovereignEnabled() {
  if (process.env.BRICLOG_COLUMNIST_SOVEREIGN === "false") return false;
  return isOpenAIConfigured();
}

export function hasFilledBlogAxes(input = {}) {
  return Boolean(
    String(input.brandName || "").trim() &&
      String(input.region || "").trim() &&
      String(input.topic || "").trim()
  );
}

/** 조사 + 3축 — 모든 업종·주제 칼럼니스트 집필 대상 */
export function isColumnistSovereignEligible(input = {}, pack = null) {
  if (!isColumnistSovereignEnabled()) return false;
  if (!hasUsableResearchFacts(input)) return false;
  if (!hasFilledBlogAxes(input)) return false;
  if (isVisitReviewSovereignEligible(input, pack)) return true;
  return true;
}

export function needsColumnistSovereignUpgrade(pack, input = {}) {
  const intentInput = resolveVisitReviewIntentInput(input, pack);
  if (!isColumnistSovereignEligible(intentInput, pack)) return false;
  if (pack?._meta?.columnistSovereignLlm || pack?._meta?.visitReviewSovereignLlm) {
    return false;
  }
  if (input.forceColumnistSovereignFresh || input.regenDeliveryPolish) return true;
  if (!pack?.sections?.length) return true;
  if (needsVisitReviewSovereignUpgrade(pack, intentInput)) return true;
  if (isMissionFallbackPack(pack, intentInput)) return true;
  if (!isLlmOriginatedPack(pack, intentInput)) return true;
  if (hasEngineSpamInPack(pack)) return true;
  const mash = assessPackRegionBrandMash(pack, intentInput, "blog");
  if (!mash.ok) return true;
  const contam = detectVisitReviewTemplateContamination(pack, intentInput);
  if (!contam.ok) return true;
  return false;
}

function tierAccepts(pack, input = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  return (
    (pack.sections?.length || 0) >= Math.min(HUMAN_MIN_SECTIONS, 3) &&
    chars >= tier.min * 0.82
  );
}

/** 칼럼니스트 — 벤치마크 publishOk면 short tier 분량 이상이면 통과 */
function columnistTierAccepts(pack, input = {}, opts = {}) {
  const fast = Boolean(opts.fast);
  if ((pack?.sections?.length || 0) < Math.min(HUMAN_MIN_SECTIONS, 3)) return false;
  if (tierAccepts(pack, input)) return true;
  const chars = countBlogBodyCharsWithSpaces(pack);
  const bench = assessVisitReviewBenchmark(pack, input, {
    passMin: resolveVisitReviewPassMin({ passMin: COLUMNIST_SOVEREIGN_PASS_MIN }),
  });
  if (fast || isCustomerTwoMinuteSlaMode()) {
    const slaFloor = resolveUneditedPublishMinChars(input);
    return Boolean(
      bench.publishOk &&
      !bench.hardFails?.length &&
      chars >= slaFloor
    );
  }
  const shortFloor = Math.floor(resolveBlogLengthTier("short").min * 0.9);
  return Boolean(
    bench.publishOk &&
    !bench.hardFails?.length &&
    chars >= shortFloor
  );
}

export function isColumnistFinishBenchRelaxed(input = {}) {
  if (isVisitReviewTopicInput(input)) return false;
  const key = resolveBriclogIndustryKey(input);
  if (key === "furniture" || key === "interior") return true;
  const ind = String(input.industry || input.industryLabel || "");
  return /침대|매트리스|가구/.test(ind);
}

/** finish 파이프라인 — 실패 code 반환 (진단·가구 완화) */
export function tryFinishColumnistPack(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { ok: false, code: "parse_empty" };
  }
  const passMin = resolveVisitReviewPassMin({ passMin: COLUMNIST_SOVEREIGN_PASS_MIN });
  const preBench = assessVisitReviewBenchmark(pack, input, { passMin });

  let next = applyGpt55PrePublishChecks(pack, input);
  if (!next?.sections?.length) {
    return { ok: false, code: "pre_publish_empty", preScore: preBench.score };
  }
  next = applyVisitReviewTopicPackGate(next, input);
  next = stripGlobalExactDuplicateSentences(next);
  next = applyDisplayBodyGuardPack(next, input);
  if (hasEngineSpamInPack(next)) {
    return { ok: false, code: "engine_spam", preScore: preBench.score };
  }
  const mash = assessPackRegionBrandMash(next, input, "blog");
  if (!mash.ok) {
    return { ok: false, code: "region_brand_mash", reason: mash.reason, preScore: preBench.score };
  }
  const contam = detectVisitReviewTemplateContamination(next, input);
  if (!contam.ok) {
    return {
      ok: false,
      code: "template_contamination",
      reason: contam.reason,
      preScore: preBench.score,
    };
  }

  const benchmark = assessVisitReviewBenchmark(next, input, { passMin });
  if (benchmark.hardFails?.length) {
    return {
      ok: false,
      code: "finish_hard_fail",
      hardFails: benchmark.hardFails,
      score: benchmark.score,
      preScore: preBench.score,
    };
  }
  if (!benchmark.publishOk) {
    if (
      isColumnistFinishBenchRelaxed(input) &&
      preBench.publishOk &&
      !preBench.hardFails?.length &&
      !benchmark.hardFails?.length &&
      benchmark.score >= 76
    ) {
      return {
        ok: true,
        relaxed: true,
        pack: {
          ...next,
          _meta: {
            ...(next._meta || {}),
            columnistSovereignLlm: true,
            columnistSovereignVersion: COLUMNIST_SOVEREIGN_VERSION,
            visitReviewBenchmark: benchmark,
            visitReviewBenchmarkOk: true,
            columnistFinishBenchRelaxed: true,
            llmGenerated: true,
            generationMode: "columnist_sovereign",
            missionProseFallback: undefined,
            draftFallback: undefined,
            deliveryRescue: undefined,
            forcedMissionProseRoute: undefined,
          },
        },
      };
    }
    return {
      ok: false,
      code: "finish_publish_fail",
      score: benchmark.score,
      grade: benchmark.grade,
      preScore: preBench.score,
    };
  }

  return {
    ok: true,
    pack: {
      ...next,
      _meta: {
        ...(next._meta || {}),
        columnistSovereignLlm: true,
        columnistSovereignVersion: COLUMNIST_SOVEREIGN_VERSION,
        visitReviewBenchmark: benchmark,
        visitReviewBenchmarkOk: benchmark.publishOk,
        llmGenerated: true,
        generationMode: "columnist_sovereign",
        missionProseFallback: undefined,
        draftFallback: undefined,
        deliveryRescue: undefined,
        forcedMissionProseRoute: undefined,
      },
    },
  };
}

function finishColumnistPack(pack, input = {}) {
  const result = tryFinishColumnistPack(pack, input);
  return result.ok ? result.pack : null;
}

/** API·배치 — 마지막 columnist 실패 원인 (비용 캡 유지, 진단만) */
let _lastColumnistFailure = null;

export function takeColumnistLastFailure() {
  const f = _lastColumnistFailure;
  _lastColumnistFailure = null;
  return f;
}

function recordColumnistFailure(detail) {
  _lastColumnistFailure = detail ? { at: Date.now(), ...detail } : null;
}

/** @returns {{ code: string, [key: string]: unknown } | null} */
export function diagnoseColumnistPackFailure(pack, input = {}, opts = {}) {
  const fast = Boolean(opts.fast);
  const stage = opts.stage || "tier";
  if (!pack?.sections?.length) {
    return { code: "parse_empty", fast, stage };
  }
  const sections = pack.sections.length;
  const chars = countBlogBodyCharsWithSpaces(pack);
  const bench = assessVisitReviewBenchmark(pack, input, {
    passMin: resolveVisitReviewPassMin({ passMin: COLUMNIST_SOVEREIGN_PASS_MIN }),
  });
  const slaFloor = resolveUneditedPublishMinChars(input);

  if (stage === "tier") {
    if (sections < Math.min(HUMAN_MIN_SECTIONS, 3)) {
      return { code: "sections_low", sections, chars, fast, stage };
    }
    if (!bench.publishOk) {
      return {
        code: "bench_publish_fail",
        sections,
        chars,
        score: bench.score,
        grade: bench.grade,
        hardFails: bench.hardFails || [],
        fast,
        slaFloor,
        stage,
      };
    }
    if (bench.hardFails?.length) {
      return {
        code: "bench_hard_fail",
        sections,
        chars,
        score: bench.score,
        hardFails: bench.hardFails,
        fast,
        stage,
      };
    }
    if (fast && chars < slaFloor) {
      return { code: "chars_below_sla_floor", sections, chars, slaFloor, fast, stage };
    }
    if (!tierAccepts(pack, input) && !columnistTierAccepts(pack, input, { fast })) {
      return {
        code: "tier_reject",
        sections,
        chars,
        score: bench.score,
        publishOk: bench.publishOk,
        hardFails: bench.hardFails || [],
        fast,
        slaFloor,
        stage,
      };
    }
    return null;
  }

  if (hasEngineSpamInPack(pack)) {
    return { code: "engine_spam", sections, chars, score: bench.score, stage: "finish" };
  }
  const mash = assessPackRegionBrandMash(pack, input, "blog");
  if (!mash.ok) {
    return { code: "region_brand_mash", sections, chars, reason: mash.reason, stage: "finish" };
  }
  const contam = detectVisitReviewTemplateContamination(pack, input);
  if (!contam.ok) {
    return { code: "template_contamination", sections, chars, reason: contam.reason, stage: "finish" };
  }
  if (bench.hardFails?.length) {
    return {
      code: "finish_hard_fail",
      sections,
      chars,
      score: bench.score,
      hardFails: bench.hardFails,
      stage: "finish",
    };
  }
  if (!bench.publishOk) {
    return {
      code: "finish_publish_fail",
      sections,
      chars,
      score: bench.score,
      grade: bench.grade,
      stage: "finish",
    };
  }
  return null;
}

function resolveColumnArc(input = {}, pack = null) {
  const ctx = resolveVisitReviewIntentInput(input, pack);
  if (isVisitReviewTopicInput(ctx, pack)) return "visit";
  const topic = String(ctx.topic || "").toLowerCase();
  if (/메뉴|돈까스|돈가스|음식|식사|카페|브런치|맛집|국수/.test(topic)) return "menu";
  if (/소개|안내|체험|프로그램/.test(topic)) return "experience";
  return "general";
}

export function buildColumnistSovereignMessages(input = {}, ctx = {}, opts = {}) {
  const tierKey = input.blogLengthTier || ctx.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const research =
    formatSubstantiveResearchFactsForPrompt(input, 18) ||
    formatResearchFactsForPrompt(input.researchFacts || ctx.researchFacts, 18);
  const unified = buildVisitReviewUnifiedProsePromptBlock();
  const northStar = buildColumnVisitNorthStarPromptBlock();
  const reference = buildNorthStarReferencePromptBlock("blog");
  const arc = resolveColumnArc(input, opts.pack);
  const regenNote = input.forceColumnistSovereignFresh || input.regenDeliveryPolish
    ? "\n【다시 받기】이전 템플릿·동일 소제목·엔진 문구 절대 재사용 금지. 완전히 새 칼럼으로 작성."
    : "";
  const slaMode = isCustomerTwoMinuteSlaMode();
  const lengthBlock = slaMode
    ? `Length: about 2800–3800 Korean characters total (7 sections, 2+ paragraphs each). Complete A-grade column — not a stub.`
    : `Length tier: ${tierKey} (min ${tier.min})`;

  const arcBlock =
    arc === "menu"
      ? `Structure (menu·식사 칼럼):
1) 계절·상황 — 왜 지금 이 메뉴/장소를 찾게 됐는지 (2–3문장)
2) 도착·첫인상 — 공간·동선·누구와 가기 좋은지
3) 메뉴 체감 — 조사 팩트를 장면 속에 (맛·구성·분위기, 과장 금지)
4) 이 브랜드만의 차이 — 복합 공간·동선 등 조사에 있는 것만
5) 방문 전 참고 — 운영·예약·시간 (조사에 있을 때만)
6) 짧은 마무리`
      : arc === "visit"
        ? `Structure (방문 후기):
1) 소식·계절 훅 → 2) 도착 분위기 → 3) 체감·현장 → 4) 차별점 → 5) 방문 전 참고 → 6) 마무리`
        : `Structure (브랜드 칼럼):
1) 독자가 주제를 찾게 된 상황 → 2) 현장·브랜드 첫인상 → 3) 조사 팩트를 경험 문장으로 → 4) 이 브랜드 포인트 → 5) 참고 → 6) 마무리`;

  return [
    {
      role: "system",
      content: `You are a 30-year Korean brand columnist and chief editor (Naver power blogger + magazine editor level). Write ONE fresh column from SUBSTANTIVE research facts ONLY — never SEO template, never brochure, never abstract season filler without concrete facility·menu·program facts.

Return ONLY one JSON object:
{"blog":{"titles":["...×5"],"title":"...","representativeTitle":"...","sections":[{"heading":"...","body":"..."}],"conclusion":"...","hashtags":[]}}

${northStar}
${reference}
${arcBlock}

Rules:
- ${tier.min}–${tier.max} Korean chars WITH SPACES; at least ${HUMAN_MIN_SECTIONS} sections
- 2–4 connected paragraphs per section; natural ~습니다 prose
- Brand·region names 2–5 times total — NO keyword loops, NO "여주 여주목마 여주" glue
- Weave at least 3 concrete research facts (facility·menu·hours·program·price ONLY if in research) into body scenes — abstract mood-only paragraphs forbidden
- Use ONLY research facts; do not invent prices, hours, menus not in research
- FORBIDDEN (instant fail): 「비교 기준」「대표 서비스」「방문·상담」「덜 헷갈릴까요」「목적별로 나눠」「매장·상담에서 확인」「왜 지금 는지」「현장 쇼룸 근처」「이 지역 브랜드」「근처 쇼룸」「공식 안내 기준」「로컬 매장 운영」「기준이 조금씩 보였」「검색만 하다 보면 기준이 많아서」「시즌 오픈은 말만 붙이면」「마음이 먼저 움직」「손의 감각」「리듬이 느려」
- Section headings must be UNIQUE — no duplicate titles, no "— 이어서" suffix on headings
- No dev/agent meta text (엔진·에디터·분석·개선 instructions)
- No checklist endings, no FAQ tone
${regenNote}

${unified}`,
    },
    {
      role: "user",
      content: `Brand: ${input.brandName || ctx.brandName || "—"}
Region: ${input.region || ctx.region || "—"}
Topic: ${input.topicWritingSubject || input.writingSubject || input.topic || ctx.topic || "—"}
Raw user topic (do NOT copy verbatim into title/headings): ${input.topicDisplayRaw || input.topicInterpretation?.topicRaw || input.topic || "—"}
${input.topicBriefForLlm ? `\n${input.topicBriefForLlm}\n` : ""}
${(input.topicVerbatimForbidden || input.topicInterpretation?.topicVerbatimForbidden || []).length ? `Forbidden verbatim phrases: ${(input.topicVerbatimForbidden || input.topicInterpretation?.topicVerbatimForbidden).join(" | ")}` : ""}
Industry: ${input.industry || ctx.industryLabel || "—"}
${lengthBlock}

【조사 확정 — 본문에 반드시 반영. 없는 시설·가격·메뉴는 쓰지 말 것】
${research || "(브랜드·지역·주제 맥락만)"}`,
    },
  ];
}

export async function generateColumnistSovereignPack(input = {}, opts = {}) {
  if (!isColumnistSovereignEnabled() || !isColumnistSovereignEligible(input)) {
    recordColumnistFailure({ code: "ineligible" });
    return null;
  }
  const fast =
    !input.columnistForceSlow &&
    (Boolean(input.columnistFastDelivery) || isColumnistFastDeliveryEnabled());
  const maxTokens = fast ? getColumnistFastMaxTokens() : 6500;
  const maxLlmRounds = getColumnistMaxLlmRounds(input);
  const ctx = createPromptContext(input);
  try {
    const messages = buildColumnistSovereignMessages(input, ctx, opts);
    let llmRounds = 0;
    let raw = null;
    let parsed = null;
    while (llmRounds < maxLlmRounds) {
      llmRounds += 1;
      const attemptMessages =
        llmRounds === 1
          ? messages
          : (() => {
              const retry = buildColumnistSovereignMessages(input, ctx, opts);
              retry[1].content += `\n\n【재시도】분량 ${resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER).min}자 이상. 섹션마다 2문단 이상.`;
              return retry;
            })();
      raw = await callOpenAIChat(attemptMessages, {
        temperature:
          llmRounds > 1 ? 0.52 : input.regenDeliveryPolish ? 0.62 : 0.58,
        maxTokens: llmRounds > 1 && fast ? Math.min(maxTokens + 400, 3200) : maxTokens,
      });
      parsed = parseLlmBlogResponse(raw, ctx);
      if (columnistTierAccepts(parsed, input, { fast })) break;
    }
    if (!columnistTierAccepts(parsed, input, { fast })) {
      recordColumnistFailure(
        diagnoseColumnistPackFailure(parsed, input, { fast, stage: "tier" }) || {
          code: "tier_reject",
          fast,
          llmRounds,
        }
      );
      return null;
    }
    parsed = normalizeLlmVoiceForDelivery(parsed, input);
    let finishResult = tryFinishColumnistPack(parsed, input);
    let finished = finishResult.ok ? finishResult.pack : null;
    if (!finished && !fast) {
      const benchRetry = buildColumnistSovereignMessages(input, ctx, opts);
      benchRetry[0].content +=
        "\n\n【품질 재시도】엔진 스팸·지역붙임·브로슈어 절대 금지. 파워블로거 칼럼 톤.";
      raw = await callOpenAIChat(benchRetry, { temperature: 0.48, maxTokens: 6800 });
      parsed = parseLlmBlogResponse(raw, ctx);
      if (columnistTierAccepts(parsed, input, { fast })) {
        parsed = normalizeLlmVoiceForDelivery(parsed, input);
        finishResult = tryFinishColumnistPack(parsed, input);
        finished = finishResult.ok ? finishResult.pack : null;
      }
    }
    if (!finished) {
      recordColumnistFailure({
        ...(finishResult.ok ? {} : finishResult),
        fast,
        llmRounds,
        stage: "finish",
        code:
          (finishResult.ok ? null : finishResult.code) ||
          diagnoseColumnistPackFailure(parsed, input, { fast, stage: "finish" })?.code ||
          "finish_reject",
      });
      return null;
    }
    recordColumnistFailure(null);
    return finished;
  } catch (err) {
    const msg = err?.message || String(err);
    let code = "exception";
    if (/exceeded your current quota|insufficient_quota/i.test(msg)) {
      code = "openai_quota";
    } else if (/\b429\b|rate.?limit/i.test(msg)) {
      code = "openai_rate_limit";
    }
    recordColumnistFailure({
      code,
      message: msg.slice(0, 240),
      fast,
    });
    return null;
  }
}

export function mustReplaceWithColumnistSovereign(pack, input = {}) {
  if (!isColumnistSovereignEligible(input, pack)) return false;
  if (!pack?.sections?.length) return true;
  if (isColumnistSovereignPack(pack) && !hasEngineSpamInPack(pack)) return false;
  if (hasEngineSpamInPack(pack)) return true;
  if (isMissionFallbackPack(pack, input)) return true;
  if (!isLlmOriginatedPack(pack, input)) return true;
  const mash = assessPackRegionBrandMash(pack, input, "blog");
  if (!mash.ok) return true;
  const contam = detectVisitReviewTemplateContamination(pack, input);
  if (!contam.ok) return true;
  if (hasUsableResearchFacts(input) && !isColumnistSovereignPack(pack)) return true;
  return false;
}

export async function upgradePackViaColumnistSovereign(pack, input = {}) {
  if (!isColumnistSovereignEnabled()) return null;
  const intentInput = resolveVisitReviewIntentInput(input, pack);
  const force = Boolean(
    intentInput.forceColumnistSovereignFresh || intentInput.regenDeliveryPolish
  );
  if (!force && !needsColumnistSovereignUpgrade(pack, intentInput)) {
    return pack?._meta?.columnistSovereignLlm ? pack : null;
  }
  const fresh = await generateColumnistSovereignPack({
    ...intentInput,
    forceColumnistSovereignFresh: force || mustReplaceWithColumnistSovereign(pack, intentInput),
  });
  if (fresh?.sections?.length) return fresh;
  return null;
}

/**
 * API 송출 직전 — 조사 기반 비-sovereign·스팸 팩 전면 교체 또는 withhold
 */
export async function applyColumnistSovereignApiDelivery(result = {}, input = {}, opts = {}) {
  const finalizeForUi = opts.finalizeForUi || ((p) => p);
  const columnistInput = resolveVisitReviewIntentInput(input, result?.blogContent);

  if (!isColumnistSovereignEnabled() || !isColumnistSovereignEligible(columnistInput, result?.blogContent)) {
    return result;
  }

  if (
    isColumnistSovereignPack(result?.blogContent) &&
    !mustReplaceWithColumnistSovereign(result?.blogContent, columnistInput) &&
    assessUneditedPublishGrade(result?.blogContent, columnistInput).ok
  ) {
    return result;
  }

  let next = { ...result };
  const shouldReplace =
    mustReplaceWithColumnistSovereign(next.blogContent, columnistInput) ||
    !next.blogContent?.sections?.length ||
    next.withheld;

  if (shouldReplace) {
    const upgraded = await upgradePackViaColumnistSovereign(next.blogContent || { sections: [] }, {
      ...columnistInput,
      forceColumnistSovereignFresh: true,
    });
    if (upgraded?.sections?.length && !hasEngineSpamInPack(upgraded)) {
      next = {
        ...next,
        ok: true,
        withheld: false,
        softPass: false,
        userMessage: null,
        blogContent: finalizeForUi(upgraded, input),
        mode: upgraded._meta?.generationMode || "columnist_sovereign",
        meta: {
          ...(next.meta || {}),
          columnistSovereign: true,
          serverVerifiedSkipClientReverify: true,
          fastPipelineDelivery: true,
          generationMode: upgraded._meta?.generationMode || "columnist_sovereign",
          passOutput: true,
        },
      };
    }
  }

  const law = assertColumnistDeliveryLaw(next.blogContent, columnistInput);
  const spamLeak =
    next.blogContent?.sections?.length &&
    hasEngineSpamInPack(next.blogContent) &&
    hasUsableResearchFacts(columnistInput);

  if (law.shouldWithhold || spamLeak) {
    next = {
      ...next,
      ok: false,
      withheld: true,
      softPass: false,
      userMessage: buildColumnistWithholdMessage(columnistInput),
      blogContent: {
        sections: [],
        title: "",
        representativeTitle: "",
        _meta: {
          columnistDeliveryLawBlocked: true,
          withholdReason: law.reason || "engine_spam",
          outputWithheld: true,
        },
      },
      meta: {
        ...(next.meta || {}),
        columnistDeliveryLawBlocked: true,
        withholdReason: law.reason || "engine_spam",
        passOutput: false,
      },
    };
  }

  const unedited = assessUneditedPublishGrade(next.blogContent, columnistInput);
  if (!unedited.ok && next.blogContent?.sections?.length) {
    next = {
      ...next,
      ok: false,
      withheld: true,
      softPass: false,
      userMessage: unedited.userMessage || UNEDITED_PUBLISH_WITHHOLD_MESSAGE,
      blogContent: {
        sections: [],
        title: "",
        representativeTitle: "",
        _meta: {
          ...(next.blogContent?._meta || {}),
          uneditedPublishBlocked: true,
          uneditedPublishGrade: unedited,
          outputWithheld: true,
          withholdReason: unedited.reasons?.[0] || "unedited_publish_not_a",
        },
      },
      meta: {
        ...(next.meta || {}),
        uneditedPublishBlocked: true,
        uneditedPublishGrade: unedited,
        passOutput: false,
        withholdReason: unedited.reasons?.[0] || "unedited_publish_not_a",
      },
    };
  }

  return next;
}
