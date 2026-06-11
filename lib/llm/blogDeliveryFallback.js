/**
 * 블로그 생성 실패 시에도 사용자에게 볼 수 있는 본문을 반환
 */
import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import { buildBlogPack } from "@/lib/prompts/engine/blogEngine";
import { collectPublicSignals } from "@/lib/research/searchSources/mockCollector";
import { buildQualityUserHint } from "./qualityUserHints";
import { applyPipelineQualityDefaults } from "@/lib/quality/qualityDefaults";
import { applyWritingSkillToInput } from "@/lib/content/writingSkillLevel";
import { mergeBrandLogIntoInput } from "@/lib/memory/brandLogTopicEngine";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { applyEditorPreOutputCorrection } from "@/lib/content/editorPreOutputGate";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { stripMetaLayerTerms } from "@/lib/content/metaLayerSeparation";
import {
  buildBrandFocusedSectionHeadings,
  isPublishableBlogPack,
  rewriteOutlinePackToProse,
} from "@/lib/content/outlinePackGuard";
import {
  buildNaturalBrandTitles,
  rewriteMechanicalTitle,
} from "@/lib/content/brandContentEngine";
import { ensureV17MissionPolish } from "@/lib/content/v17PostProcess";
import { buildHumanClickTitles } from "@/lib/content/humanTitleEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine";
import {
  buildMissionProseFallbackPack,
  isCoverageSlotDumpPack,
  replaceCoverageDumpWithMissionProse,
} from "@/lib/llm/missionProseFallback";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";

export function enrichMinimalBlogInput(input = {}) {
  let next = input.brandMemory
    ? mergeBrandLogIntoInput(input, input.brandMemory)
    : { ...input };
  const brand = next.brandName?.trim();
  const region = next.region?.trim();
  const topic = next.topic?.trim();
  const main = next.mainKeyword?.trim() || next.main?.trim();

  if (!topic && main) {
    next.topic = main;
  }
  if (!next.mainKeyword && (next.topic || main)) {
    next.mainKeyword = (next.topic || main).split(/[,，]/)[0]?.trim();
  }
  if (!next.topic && !next.mainKeyword && brand && region) {
    const seed = [region, brand].filter(Boolean).join(" ");
    next.topic = seed;
    next.mainKeyword = seed;
  }
  if (!next.storeFeatures && !next.brandDescription && brand) {
    next.storeFeatures = `${brand} 소개`;
  }
  const regionNorm = String(next.region || "").trim();
  if (/^전국$|^전국\s*배송|^온라인\s*전국/i.test(regionNorm)) {
    next.regionStoryMode = "nationwide";
    if (!next.storeFeatures?.includes("배송")) {
      next.storeFeatures = [next.storeFeatures, "전국 배송·온라인 주문"]
        .filter(Boolean)
        .join(" · ");
    }
  }
  return applyWritingSkillToInput(applyPipelineQualityDefaults(next));
}

function hasBlogSections(pack) {
  return Boolean(pack?.sections?.length && pack.sections.some((s) => s.body?.trim()));
}

function markDraftPack(pack, source, failures = [], input = {}) {
  const polished = ensureV17MissionPolish(pack, input, "blog");
  const hint = buildQualityUserHint(failures);
  const lengthGate = assertBlogLengthTier(input, polished);
  const lengthOk = lengthGate.ok;
  return {
    ...polished,
    _meta: {
      ...polished._meta,
      draftFallback: true,
      draftFallbackSource: source,
      softPass: !lengthOk,
      passOutput: lengthOk,
      lengthTierMet: lengthOk,
      qualityHint: hint,
      generationMode: source,
      v17FallbackPolish: true,
    },
  };
}

function buildProseFallbackBodies(input) {
  const signals = collectPublicSignals({
    brandName: input.brandName,
    region: input.region,
    mainKeyword: input.mainKeyword || input.topic,
    topic: input.topic,
    includePhrases: input.includePhrases,
    purposeType: input.purposeType || input.purpose,
  });
  const trends = (signals.trendTopics || []).slice(0, 2);
  const region = input.region?.trim() || "";
  const brand = input.brandName?.trim() || "매장";
  const topicRaw = input.topic?.trim() || input.mainKeyword?.trim() || "이야기";
  const topic = topicRaw.split(/[,，]/)[0]?.trim() || topicRaw;
  const trendNote =
    trends[0] && trends[0].length >= 2
      ? `최근 ${region ? `${region} ` : ""}관심이 많은 ${trends[0]} 흐름도 함께 참고해 `
      : "";

  return [
    `${region ? `${region}에서 ` : ""}${topic}를 알아보는 분 ${brand} 매장에 직접 다녀와 비교해 봤어요. ${trendNote}이 글에서는 ${brand} 기준으로 ${topic} 선택 포인트를 현장에서 확인한 내용 위주로 정리해 봤어요.`,
    `${brand} ${topic} 라인업은 모델·구성·체험 방식에 따라 체감이 달라졌어요. 매장에서는 누워보기·동선·공간 배치를 함께 확인하고, 본인에게 맞는 쿠션감·지지감을 비교하는 순서가 수월했어요.`,
    `${region ? `${region} ${brand} ` : `${brand} `}매장에서는 행사·프로모션·할인 조건을 당일 안내 기준으로 확인했어요. ${topic} 관련 혜택이 있다면 대상 모델, 적용 기간, 카드·증정 조건을 방문 전에 메모해 두면 비교가 편했어요.`,
    `${region ? `${region} 생활권 기준 ` : ""}이동 동선과 영업 시간을 함께 보면서 ${brand} ${topic}를 검토했어요. 예산, 설치·배송 일정, 교환·A/S 범위까지 한 번에 짚어 보는 편이 좋았어요.`,
  ].map(stripMetaLayerTerms);
}

function expandBriefWithSearchSignals(brief, input) {
  const region = input.region?.trim() || "";
  const brand = input.brandName?.trim() || "매장";
  const topicRaw = input.topic?.trim() || input.mainKeyword?.trim() || "이야기";
  const topic = topicRaw.split(/[,，]/)[0]?.trim() || topicRaw;
  const trendHints = (
    collectPublicSignals({
      brandName: input.brandName,
      region: input.region,
      mainKeyword: input.mainKeyword || input.topic,
      topic: input.topic,
      includePhrases: input.includePhrases,
      purposeType: input.purposeType || input.purpose,
    }).trendTopics || []
  ).slice(0, 4);
  const sceneBodies = buildProseFallbackBodies(input);
  const headings = buildBrandFocusedSectionHeadings(input, sceneBodies.length);

  const title =
    buildHumanClickTitles({ brandName: brand, region, topic, industry: input.industry }, input)[0] ||
    rewriteMechanicalTitle(
      brief?.representativeTitle || brief?.title || "",
      { brandName: brand, region, topic },
      input
    ) ||
    buildNaturalBrandTitles({ brandName: brand, region, topic }, input)[0] ||
    (isInformationalTopicInput(input)
      ? `${region ? `${region} ` : ""}${brand} ${topic}`
      : `${region ? `${region} ` : ""}${brand} 솔직 후기, ${topic}`);

  const normalized = normalizeBlogLengthAndStructure(
    {
      ...brief,
      title,
      representativeTitle: title,
      sections: sceneBodies.map((body, i) => ({
        heading: headings[i] || `${brand} ${topic}`,
        body,
      })),
      conclusion: stripMetaLayerTerms(
        isInformationalTopicInput(input)
          ? `${brand}${region ? ` ${region}` : ""} ${topic} — 성분·보관·선물 목적을 함께 보면 선택이 수월합니다. 궁금한 점은 매장 문의로 확인하시면 됩니다.`
          : `${brand}${region ? ` ${region}` : ""}에서 ${topic}를 검토 중이라면, 매장 방문·체험·프로모션 조건을 직접 비교해 보세요. 상담·예약이 가능하다면 일정을 잡아 두면 대기 없이 체험하기 좋았어요.`
      ),
      hashtags: isInformationalTopicInput(input)
        ? []
        : brief.hashtags?.length
          ? brief.hashtags
          : [region, brand, topic].filter(Boolean).slice(0, 6).map((t) => `#${String(t).replace(/\s+/g, "")}`),
      fullCopyText: null,
      _meta: {
        ...brief._meta,
        isBriefOnly: false,
        searchEnriched: true,
        trendHints,
      },
    },
    {
      brandName: input.brandName,
      industryLabel: input.industry,
    },
    input
  );

  return markDraftPack(
    normalized.pack,
    "search_brief",
    ["search_intent_low"]
  );
}

/**
 * @returns {{ pack: object, source: string }}
 */
export function buildDeliverableBlogFallback({
  input = {},
  prep = null,
  bestPack = null,
  failures = [],
} = {}) {
  const enriched = enrichMinimalBlogInput(input);

  if (isBriclogMissionEnforced() && isGpt55WriterDominant()) {
    if (
      hasBlogSections(bestPack) &&
      (isPublishableBlogPack(bestPack) || countBlogBodyCharsWithSpaces(bestPack) >= 80)
    ) {
      return {
        pack: markDraftPack(bestPack, "llm_draft", failures, enriched),
        source: "llm_draft",
      };
    }
    return {
      pack: {
        sections: [],
        _meta: {
          gpt55FallbackBlocked: true,
          draftFallback: true,
          generationMode: "gpt55_template_blocked",
        },
      },
      source: "gpt55_template_blocked",
    };
  }

  if (isBriclogMissionEnforced()) {
    if (
      hasBlogSections(bestPack) &&
      isPublishableBlogPack(bestPack) &&
      !isCoverageSlotDumpPack(bestPack)
    ) {
      return {
        pack: markDraftPack(bestPack, "llm_draft", failures, enriched),
        source: "llm_draft",
      };
    }

    let missionPack = buildMissionProseFallbackPack(enriched);
    missionPack = replaceCoverageDumpWithMissionProse(missionPack, enriched);
    const tier = resolveBlogLengthTier(enriched.blogLengthTier || "medium");
    const fbCtx = {
      brandName: enriched.brandName,
      region: enriched.region,
      industryLabel: enriched.industry,
    };
    let normalized = normalizeBlogLengthAndStructure(missionPack, fbCtx, enriched);
    missionPack = normalized.pack;
    if (countBlogBodyCharsWithSpaces(missionPack) < tier.min) {
      missionPack = buildMissionProseFallbackPack({
        ...enriched,
        blogLengthTier: enriched.blogLengthTier || "medium",
      });
      normalized = normalizeBlogLengthAndStructure(missionPack, fbCtx, enriched);
      missionPack = normalized.pack;
    }
    return {
      pack: markDraftPack(missionPack, "mission_prose_fallback", failures, enriched),
      source: "mission_prose_fallback",
    };
  }

  if (hasBlogSections(bestPack) && isPublishableBlogPack(bestPack)) {
    return { pack: markDraftPack(bestPack, "llm_draft", failures), source: "llm_draft" };
  }

  const ctx = createPromptContext(enriched);
  const prepared =
    prep?.ok && prep.ctx
      ? prep
      : prepareUltimateBlogContext({ ...ctx, ...enriched });

  if (prepared?.ok && prepared.ctx) {
    try {
      const blog = buildBlogPack(
        prepared.ctx,
        ctx.flavor,
        ctx.articleType,
        ctx.purpose,
        ctx.tone
      );
      if (hasBlogSections(blog) && isPublishableBlogPack(blog)) {
        const normalized = normalizeBlogLengthAndStructure(
          blog,
          prepared.ctx,
          enriched
        );
        const corrected = applyEditorPreOutputCorrection(
          normalized.pack,
          prepared.ctx,
          enriched
        );
        return {
          pack: markDraftPack(corrected.pack, "template_engine", failures, enriched),
          source: "template_engine",
        };
      }
    } catch {
      /* prose_fallback 경로로 이어감 */
    }
  }

  let pack = expandBriefWithSearchSignals(
    {
      representativeTitle:
        buildNaturalBrandTitles(
          {
            brandName: enriched.brandName,
            region: enriched.region,
            topic: enriched.topic || enriched.mainKeyword,
          },
          enriched
        )[0] ||
        enriched.topic ||
        enriched.mainKeyword,
      hashtags: [],
    },
    enriched
  );

  if (!isPublishableBlogPack(pack)) {
    pack = rewriteOutlinePackToProse(pack, enriched);
    pack = normalizeBlogLengthAndStructure(pack, prepared?.ctx || ctx, enriched)
      .pack;
  }

  const corrected = applyEditorPreOutputCorrection(
    pack,
    prepared?.ctx || ctx,
    enriched
  );
  pack = corrected.pack;

  return {
    pack: markDraftPack(pack, "prose_fallback", failures, enriched),
    source: "prose_fallback",
  };
}
