import { polishBlogPack } from "@/lib/korean/writingTrends";
import { BLOG_CHANNEL } from "@/styles/channels/blogStyle";
import { filterBlogPack, buildForbiddenList } from "@/utils/filterForbiddenWords";
import { getBlogFullText } from "@/utils/qualityCheck";
import { enrichBlogPack } from "@/lib/prompts/engine/enrichOutput";
import {
  buildNaturalConclusion,
  isUnmannedFlower,
} from "./blogNatural";
import {
  scrubMechanicalSeoPhrases,
  weaveBlogPackKeywords,
} from "@/lib/keywords/naturalKeywordWeave";
import {
  sanitizeBlogPack,
  detectBlogSanitizeIssues,
} from "@/lib/integrity/blogSanitizer";
import { buildWithRepetitionGuard } from "@/utils/repetitionGuard";
import { scrubExampleBrandsFromPack } from "@/utils/exampleBrandGuard";
import { ensureBrandPresenceInPack } from "@/lib/persona/humanWritingFramework";
import { runFinalSelfReview } from "@/lib/persona/finalSelfReview";
import { applyConstitutionToBlogPack } from "@/lib/constitution/writingConstitution";
import { alignBodyToTitle } from "@/lib/quality/contentQualityRoot";
import { buildContextFirstTitles } from "@/lib/prompts/engine/intentTitles";
import { buildSceneBlogSections } from "@/lib/scene/sceneEngine";
import { prepareBlogPipelineV2 } from "@/lib/pipeline/v2/runBlogPipelineV2";
import { finalizePipelineMeta } from "@/lib/pipeline/v2/runBlogPipelineV2";
import { applyEmotionEngine } from "@/lib/ultimate/emotionEngine";
import { runInternalQualityLoop } from "@/lib/ultimate/internalQualityLoop";
import { runFinalAudit } from "@/lib/ultimate/finalAudit";
import { runFinalSelfReviewUltimate } from "@/lib/ultimate/finalSelfReviewUltimate";
import { detectNoCopyViolations } from "@/lib/ultimate/noCopyPolicy";
import { resolveBlogLengthTier } from "@/lib/constants";
import { isDevTemplateFallbackAllowed } from "@/lib/llm/llmProvider";
import { applyWhyEngineToSections } from "@/lib/pipeline/v2/whyEngine";
import { runHardValidation } from "@/lib/pipeline/v2/hardValidation";
import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import {
  countBlogBodyChars,
  countChars,
  countKeywordOccurrences,
  formatHashtag,
  toMobileParagraphs,
} from "./textUtils";

function bodyTargetsForCtx(ctx) {
  const tier =
    ctx?.input?.blogLengthTier || ctx?.blogLengthTier || "medium";
  return resolveBlogLengthTier(tier);
}
const MAIN_KW_MIN = 4;
const MAIN_KW_MAX = 7;
const SECTION_MIN = 200;
const SECTION_MAX = 420;

const PAD_EXTRAS = {
  flower: [
    "처음 방문이면 생화 상태와 향을 함께 보시면 선택이 수월해요.",
    "사진과 실제 분위기가 다를 수 있어, 짧게라도 들러 보시는 편이 좋아요.",
  ],
  agency: [
    "일정이 겹칠 때는 소통 채널을 먼저 확인해 두면 편합니다.",
    "브리프가 길수록, 현장에서 맞추는 시간이 줄어드는 편이에요.",
  ],
  default: [
    "처음 방문이시라면 이용 방식부터 보시면 부담이 덜해요.",
    "사진과 현장 느낌이 다를 수 있어, 짧게 확인해 보시는 걸 권해요.",
  ],
};

function padSectionBody(body, ctx, targetMin = SECTION_MIN) {
  let t = scrubMechanicalSeoPhrases(toMobileParagraphs(body));
  if (countChars(t) >= targetMin) return t;
  const key = ctx.pipeline?.industryLock || ctx.industryKey || "default";
  const extras = PAD_EXTRAS[key] || PAD_EXTRAS.default;
  const extra = extras[countChars(t) % extras.length];
  if (!t.includes(extra)) t = `${t}\n\n${extra}`;
  if (countChars(t) > SECTION_MAX) {
    const blocks = t.split(/\n\n/);
    let acc = "";
    for (const block of blocks) {
      if (countChars(acc + block) > SECTION_MAX) break;
      acc = acc ? `${acc}\n\n${block}` : block;
    }
    t = acc || t;
  }
  return t;
}

function buildSceneSectionsOnly(c, flavor) {
  const { sections } = buildSceneBlogSections(c, flavor);
  return sections.map((sec) => ({
    heading: sec.heading,
    body: padSectionBody(sec.body, c),
  }));
}

function expandSceneSections(sections, conclusion, ctx, flavor) {
  const { target: targetBodyChars } = bodyTargetsForCtx(ctx);
  let total = countBlogBodyChars({ sections, conclusion });
  let n = 0;
  while (total < targetBodyChars && n < 5 && sections.length < 8) {
    const extraSecs = buildSceneSectionsOnly(
      { ...ctx, _regenAttempt: (ctx._regenAttempt || 0) + n + 1 },
      flavor
    );
    const pick = extraSecs[n % extraSecs.length];
    if (pick && !sections.some((s) => s.heading === pick.heading)) {
      sections.push(pick);
    }
    total = countBlogBodyChars({ sections, conclusion });
    n++;
  }
  return sections;
}

function buildBlogHashtags(ctx, flavor) {
  const tags = [
    ctx.main,
    ...ctx.subList,
    ctx.region?.replace(/\s/g, ""),
    ctx.brandName?.replace(/\s/g, ""),
    flavor.label?.replace(/\s+/g, ""),
    "네이버블로그",
    "동네매장",
  ].filter((t) => t && t.length > 1 && !String(t).includes("undefined"));

  return [...new Set(tags.map((t) => formatHashtag(t).replace(/^#/, "")))].slice(
    0,
    18
  );
}

function buildBlogPackOnce(ctx, flavor, articleType, purpose, tone) {
  const prep = prepareBlogPipelineV2(ctx);
  if (!prep.ok) {
    return {
      titles: ["주제를 입력해 주세요"],
      representativeTitle: "주제를 입력해 주세요",
      title: "주제를 입력해 주세요",
      sections: [
        {
          heading: "입력이 필요해요",
          body: "브랜드·주제·지역 중 하나 이상을 입력하면, 브랜드 이야기로 번역해 드립니다.",
        },
      ],
      conclusion: "",
      hashtags: [],
      _meta: {
        pipelineV2: true,
        pipelineError: prep.reason,
        blocked: true,
      },
    };
  }

  const c = prep.ctx;
  const unmanned = isUnmannedFlower(c);
  const titleBundle = buildContextFirstTitles(c, flavor);

  let sections = buildSceneSectionsOnly(c, flavor);
  sections = applyWhyEngineToSections(sections, c);
  sections = applyEmotionEngine(sections, c);
  sections = sections.slice(0, 7);

  while (sections.length < 4) {
    const extra = buildSceneSectionsOnly(
      { ...c, _regenAttempt: sections.length },
      flavor
    );
    const pick = extra[sections.length % extra.length];
    if (pick) sections.push(pick);
  }

  let conclusion = buildNaturalConclusion(c, purpose, tone, unmanned);
  sections = expandSceneSections(sections, conclusion, c, flavor);

  sections = sections.map((sec) => ({
    ...sec,
    body: scrubMechanicalSeoPhrases(sec.body),
    heading: scrubMechanicalSeoPhrases(sec.heading),
  }));
  conclusion = scrubMechanicalSeoPhrases(conclusion);

  const { max: maxBodyChars } = bodyTargetsForCtx(c);
  while (
    countBlogBodyChars({ sections, conclusion }) > maxBodyChars &&
    sections.length > 4
  ) {
    sections.pop();
  }

  const titles = titleBundle.titles;
  const representativeTitle = scrubMechanicalSeoPhrases(
    titles[0] || c.contentThesis || c.writingSubject || "오늘의 이야기"
  );

  let pack = {
    titles: titles.length >= 5 ? titles : [...titles, ...titles].slice(0, 5),
    representativeTitle,
    title: representativeTitle,
    sections,
    conclusion,
    hashtags: buildBlogHashtags(c, flavor),
  };

  const forbidden = buildForbiddenList({ ...c, industryKey: flavor.industryKey });
  pack = filterBlogPack(pack, forbidden);
  pack = polishBlogPack(pack);
  pack = scrubExampleBrandsFromPack(pack, "blog", c.brandName);

  pack = sanitizeBlogPack(pack, {
    region: c.region,
    brandName: c.brandName,
    main: c.main,
    industryLabel: c.industryLabel,
  });

  if (c.main && c.main.length >= 2) {
    pack = weaveBlogPackKeywords(pack, c.main, c.region, MAIN_KW_MIN, MAIN_KW_MAX);
  }

  pack = ensureBrandPresenceInPack(pack, c);
  pack = applyConstitutionToBlogPack(pack, c);
  pack = alignBodyToTitle(pack, c);

  pack = sanitizeBlogPack(pack, {
    region: c.region,
    brandName: c.brandName,
    main: c.main,
  });

  pack = enrichBlogPack(pack, { ...c, main: c.main }, {
    includePhrases: c.includeList?.join(", "),
    includeList: c.includeList,
    storeFeatures: c.storeFeatures,
    benefit: c.benefit,
    brandDescription: c.brandDescription,
    excludePhrases: c.excludeList?.join(", "),
    industryKey: c.pipeline?.industryLock || flavor.industryKey,
  });

  const charCount = pack._meta?.charCount ?? countBlogBodyChars(pack);
  const fullText = getBlogFullText(pack);
  const mainUses = c.main ? countKeywordOccurrences(fullText, c.main) : 0;

  const hardValidation = runHardValidation(pack, c);
  const noCopy = detectNoCopyViolations(pack, c.brandResearch);
  const qualityScore = computeFinalQualityScore(pack, c);
  const qualityLoop = runInternalQualityLoop(pack, c, ctx);
  const ultimateReview = runFinalSelfReviewUltimate(pack, c);
  const finalAudit = runFinalAudit(pack, c, ctx);
  const selfReview = runFinalSelfReview(pack, {
    region: c.region,
    brandName: c.brandName,
    main: c.main,
    industryLabel: c.industryLabel,
    contentIntent: c.contentIntent,
    contentPersona: c.contentPersona,
    rawFragments: c.rawFragments,
    pipeline: c.pipeline,
  });

  const passOutput =
    finalAudit.uploadReady &&
    hardValidation.ok &&
    noCopy.ok &&
    ultimateReview.ok &&
    qualityScore.pass &&
    !pack._meta?.blocked;

  pack._meta = finalizePipelineMeta(pack, c, {
    charCount,
    mainKeywordUses: mainUses,
    qualityScore,
    hardValidation,
    noCopy,
    qualityLoop,
    finalAudit,
    ultimateReview,
    selfReview,
    passOutput,
    contentPersona: c.contentPersona,
    contentPersonaSubtype: c.contentPersonaSubtype,
    contentPersonaLabel: c.contentPersonaLabel,
    contentPersonaSource: c.contentPersonaSource,
    subKeywordUses: (c.subList || [])
      .slice(0, 3)
      .map((sub) => countKeywordOccurrences(fullText, sub)),
    target: "Pipeline V2 · 장면→왜→브랜드",
    channelStyle: BLOG_CHANNEL.id,
    naverStyle: flavor.naverStyle,
    brandResearchStatus: c.brandResearch?.sourceStatus,
    contentStructure: "pipeline-v2-scene-why-brand",
    includeSubheadings: ctx.includeSubheadings === true,
  });

  return pack;
}

/**
 * @deprecated LLM 미연결 시 사용자 본문용으로 호출 금지. BRICLOG_ALLOW_DEV_FALLBACK=true 개발 시만.
 */
export function buildBlogPack(ctx, flavor, articleType, purpose, tone) {
  if (!isDevTemplateFallbackAllowed()) {
    const err = new Error("TEMPLATE_FALLBACK_DISABLED");
    err.code = "TEMPLATE_FALLBACK_DISABLED";
    throw err;
  }
  const { pack, regenAttempts, regenReason } = buildWithRepetitionGuard(
    (seedCtx) => buildBlogPackOnce(seedCtx, flavor, articleType, purpose, tone),
    ctx,
    [flavor, articleType, purpose, tone],
    { channel: "blog", maxAttempts: 7 }
  );

  let finalPack = sanitizeBlogPack(pack, {
    region: ctx.region,
    brandName: ctx.brandName,
    main: ctx.main,
  });
  const check = detectBlogSanitizeIssues(finalPack, {
    region: ctx.region,
    brandName: ctx.brandName,
    main: ctx.main,
  });
  if (!check.ok) {
    finalPack = {
      ...finalPack,
      _meta: { ...finalPack._meta, sanitizeWarnings: check.issues },
    };
  }

  const passOutput = finalPack._meta?.passOutput !== false;
  if (!passOutput && finalPack._meta?.qualityScore) {
    finalPack._meta.outputWithheld = true;
    finalPack._meta.withholdReason =
      finalPack._meta.qualityScore.total < 90
        ? "quality_below_target"
        : finalPack._meta.hardValidation?.failures?.[0] || "validation_failed";
  }

  return {
    ...finalPack,
    _meta: {
      ...finalPack._meta,
      regenAttempts,
      regenReason,
    },
  };
}
