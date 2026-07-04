/**
 * Keynote demo — blog · place · insta one magical path (Claude·Jobs·Musk synthesis)
 * Run: npm run test:keynote-demo-pack
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finishLocalBlogPackForBatch, finishLocalChannelPackForBatch } from "../lib/product/localBatchFinish.js";
import {
  deriveInstagramFromVerifiedBlog,
  derivePlaceFromVerifiedBlog,
  stampBatchBlogAsChannelSource,
} from "../lib/product/deriveChannelFromVerifiedBlog.js";
import { assessChannelFirstDeliveryQuality } from "../lib/product/channelQualityStack.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolvePersonaEngineProfile } from "../lib/persona/personaEngineProfile.js";
import { hasEngineSpamInPack } from "../lib/product/columnistEngineSpam.js";
import { batchBlogPassProxy } from "../lib/product/localBatchFinish.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { scoreInformationYield } from "../lib/content/informationEngine.js";
import { resolveLocalBatchBlogMinChars } from "../lib/content/missionProseGate.js";
import { resolveBlogLengthTier } from "../lib/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "artifacts", "keynote-demo");
const OUT_JSON = join(OUT_DIR, "latest-output.json");

export const KEYNOTE_DEMO_INPUT = {
  brandName: "홍대카페",
  region: "홍대",
  topic: "신규 오픈 카페",
  mainKeyword: "신규 오픈 카페",
  industry: "카페",
  storeFeatures: "홍대카페 시즌 음료·브런치·예약 좌석",
  blogLengthTier: "medium",
  v4Speaker: "plain_review",
  contentPersona: "visit_review",
  researchFacts: [],
  v2PreWriteVerified: true,
  knowledgeExpansionReady: true,
};

function buildSubstantiveResearchFacts(region, industry, topic, brandName) {
  const topicShort = String(topic || "").split(/[,.]/)[0].slice(0, 28).trim();
  return [
    {
      fact: `${region} ${brandName} ${topicShort} — 평일 11시~21시 운영·주말 예약 권장`,
      source: "research",
    },
    {
      fact: `${brandName} 대표 프로그램·메뉴 체험 동선, 가족 단위 방문 시설 안내`,
      source: "research",
    },
    {
      fact: `${region} 일대 ${industry} 방문 시 주차·예약·시즌 이벤트 운영 시간 확인`,
      source: "research",
    },
    {
      fact: `${brandName} 시즌 음료·브런치 메뉴, 좌석 예약 안내`,
      source: "research",
    },
  ];
}

function enrichKeynoteInput(input = KEYNOTE_DEMO_INPUT) {
  const researchFacts = buildSubstantiveResearchFacts(
    input.region,
    input.industry,
    input.topic,
    input.brandName
  );
  return {
    ...input,
    researchFacts,
    personaEngineProfile: resolvePersonaEngineProfile({ input, ...input, researchFacts }),
  };
}

function formatBlog(pack) {
  const full = getBlogFullText(pack);
  return {
    title: pack.title || pack.representativeTitle,
    sections: (pack.sections || []).map((s) => ({
      heading: s.heading,
      body: s.body,
    })),
    conclusion: pack.conclusion || "",
    fullText: full,
    chars: countBlogBodyCharsWithSpaces(pack),
  };
}

function formatPlace(pack) {
  return {
    title: pack.title,
    shortNotice: pack.shortNotice,
    detailBody: pack.detailBody,
    cta: pack.cta,
    fullText: getChannelFullText(pack, "place"),
  };
}

function formatInstagram(pack) {
  return {
    hook: pack.hook,
    lineBreakBody: pack.lineBreakBody || pack.body,
    hashtags: pack.hashtags || [],
    fullText: getChannelFullText(pack, "instagram"),
  };
}

export function runKeynoteDemoPack(input = KEYNOTE_DEMO_INPUT) {
  const baseInput = enrichKeynoteInput(input);

  const baseInputWithBatch = { ...baseInput, batchLocalFinish: true };

  let blog = buildMissionProseFallbackPack(baseInputWithBatch);
  blog = finishLocalBlogPackForBatch(blog, baseInputWithBatch);
  blog = stampBatchBlogAsChannelSource(blog, baseInputWithBatch);

  const tier = resolveBlogLengthTier(baseInputWithBatch.blogLengthTier);
  const batchMin = resolveLocalBatchBlogMinChars(baseInputWithBatch.blogLengthTier, tier);
  const full = getBlogFullText(blog);
  const blogScored = {
    belief: scoreHumanBelief(full, baseInputWithBatch, blog).score,
    info: scoreInformationYield(full, { input: baseInputWithBatch }, "blog"),
    chars: countBlogBodyCharsWithSpaces(blog),
  };
  const blogOk =
    (blog.sections?.length || 0) >= 3 &&
    !hasEngineSpamInPack(blog) &&
    (batchBlogPassProxy(blogScored, batchMin) ||
      (blogScored.belief >= 56 && blogScored.info.score >= 55));

  const deriveInput = { ...baseInputWithBatch, sourceChannel: "blog" };
  let place = derivePlaceFromVerifiedBlog(blog, deriveInput);
  place = finishLocalChannelPackForBatch(place, "place", baseInputWithBatch);

  let instagram = deriveInstagramFromVerifiedBlog(blog, deriveInput, "informative");
  instagram = finishLocalChannelPackForBatch(instagram, "instagram", baseInputWithBatch);

  const placeDelivery = assessChannelFirstDeliveryQuality(place, "place", baseInputWithBatch);
  const instaDelivery = assessChannelFirstDeliveryQuality(instagram, "instagram", baseInputWithBatch);

  const ok =
    blogOk &&
    (placeDelivery.displayReady || placeDelivery.northStarFastPass) &&
    (instaDelivery.displayReady || instaDelivery.northStarFastPass);

  return {
    ok,
    input: {
      brandName: input.brandName,
      region: input.region,
      topic: input.topic,
    },
    blog: { ...formatBlog(blog), pass: blogOk, belief: blogScored.belief },
    place: formatPlace(place),
    instagram: formatInstagram(instagram),
    delivery: {
      place: {
        displayReady: placeDelivery.displayReady,
        northStarFastPass: placeDelivery.northStarFastPass,
      },
      instagram: {
        displayReady: instaDelivery.displayReady,
        northStarFastPass: instaDelivery.northStarFastPass,
      },
    },
    generatedAt: new Date().toISOString(),
  };
}

const isMain = process.argv[1]?.includes("run-keynote-demo-pack");
if (isMain) {
  const result = runKeynoteDemoPack();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf8");
  console.log(`keynote-demo-pack: ${result.ok ? "OK" : "FAIL"}`);
  console.log(`  blog: ${result.blog.chars} chars · ${result.blog.sections.length} sections`);
  console.log(`  place: ${result.place.fullText.replace(/\s/g, "").length} chars`);
  console.log(`  instagram: ${result.instagram.fullText.replace(/\s/g, "").length} chars`);
  console.log(`  output: ${OUT_JSON}`);
  if (!result.ok) process.exit(1);
}
