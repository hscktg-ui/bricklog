/**
 * 블로그 생성 실패 시에도 사용자에게 볼 수 있는 본문을 반환
 */
import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import { buildContentBriefPack } from "./contentBrief";
import { buildBlogPack } from "@/lib/prompts/engine/blogEngine";
import { collectPublicSignals } from "@/lib/research/searchSources/mockCollector";
import { buildQualityUserHint } from "./qualityUserHints";

export function enrichMinimalBlogInput(input = {}) {
  const brand = input.brandName?.trim();
  const region = input.region?.trim();
  const topic = input.topic?.trim();
  const main = input.mainKeyword?.trim() || input.main?.trim();
  const next = { ...input };

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
  return next;
}

function hasBlogSections(pack) {
  return Boolean(pack?.sections?.length && pack.sections.some((s) => s.body?.trim()));
}

function markDraftPack(pack, source, failures = []) {
  const hint = buildQualityUserHint(failures);
  return {
    ...pack,
    _meta: {
      ...pack._meta,
      draftFallback: true,
      draftFallbackSource: source,
      softPass: true,
      passOutput: false,
      qualityHint: hint,
      generationMode: source,
    },
  };
}

function expandBriefWithSearchSignals(brief, input) {
  const signals = collectPublicSignals({
    brandName: input.brandName,
    region: input.region,
    mainKeyword: input.mainKeyword || input.topic,
    topic: input.topic,
    includePhrases: input.includePhrases,
    purposeType: input.purposeType || input.purpose,
  });
  const trends = (signals.trendTopics || []).slice(0, 4);
  const region = input.region?.trim() || "";
  const brand = input.brandName?.trim() || "매장";
  const topic = input.topic?.trim() || input.mainKeyword?.trim() || "이야기";

  const sceneBodies = [
    `${region ? `${region} 근처를 ` : ""}찾다 보면 ${topic}이(가) 떠오르는 순간이 있습니다. ${trends[0] ? `요즘은 ${trends[0]} 맥락으로도 검색이 늘고 있어, ` : ""}막연한 정보 대신 장면으로 정리해 보았습니다.`,
    `${brand}을(를) 처음 알게 되는 분들은 이용 방식부터 궁금해하시는 경우가 많습니다. ${trends[1] ? `${trends[1]} 흐름을 참고해 ` : ""}방문·이용 전에 볼 포인트를 짧게 모았습니다.`,
    `비슷한 선택지를 비교할 때는 분위기와 실제 이용 경험이 기준이 됩니다. ${trends[2] ? `특히 ${trends[2]} 관심이 있을 때 ` : ""}사진만 보지 말고 짧게라도 확인해 보시길 권합니다.`,
    `${region ? `${region}에서 ` : ""}${brand}을(를) 떠올릴 때 도움이 되는 마지막 정리입니다. ${trends[3] ? `${trends[3]} 키워드도 함께 참고해 주세요. ` : ""}마음에 드는 부분만 골라 수정해 쓰셔도 됩니다.`,
  ];

  const title =
    brief.representativeTitle ||
    brief.title ||
    [region, topic].filter(Boolean).join(" ") ||
    `${brand} 이야기`;

  return markDraftPack(
    {
      ...brief,
      title,
      representativeTitle: title,
      sections: sceneBodies.map((body, i) => ({
        heading: brief.outline?.[i]?.scene || `이야기 ${i + 1}`,
        body,
      })),
      conclusion: `${brand}${region ? ` · ${region}` : ""} — 아래 초안을 확인한 뒤 다시 생성하거나 직접 다듬어 주세요.`,
      hashtags: brief.hashtags?.length
        ? brief.hashtags
        : [region, brand, topic].filter(Boolean).slice(0, 6).map((t) => `#${String(t).replace(/\s+/g, "")}`),
      _meta: {
        ...brief._meta,
        searchEnriched: true,
        trendHints: trends,
      },
    },
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
  if (hasBlogSections(bestPack)) {
    return { pack: markDraftPack(bestPack, "llm_draft", failures), source: "llm_draft" };
  }

  const enriched = enrichMinimalBlogInput(input);
  const ctx = createPromptContext(enriched);
  const prepared =
    prep?.ok && prep.ctx
      ? prep
      : prepareUltimateBlogContext({ ...ctx, ...enriched });

  if (prepared?.ok && prepared.ctx) {
    const blog = buildBlogPack(
      prepared.ctx,
      ctx.flavor,
      ctx.articleType,
      ctx.purpose,
      ctx.tone
    );
    if (hasBlogSections(blog)) {
      return {
        pack: markDraftPack(blog, "template_search", failures),
        source: "template_search",
      };
    }
  }

  const brief = buildContentBriefPack(enriched, prepared?.ok ? prepared : null);
  if (hasBlogSections(brief) && brief.sections.some((s) => (s.body?.length || 0) > 200)) {
    return { pack: markDraftPack(brief, "brief_pack", failures), source: "brief_pack" };
  }

  return {
    pack: expandBriefWithSearchSignals(brief, enriched),
    source: "search_brief",
  };
}
