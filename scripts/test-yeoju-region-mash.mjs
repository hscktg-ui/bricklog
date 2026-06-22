/**
 * 여주 현장목마 — region+brand mash 회귀
 */
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { applyRegionColumnNaturalizePass } from "../lib/content/regionColumnNaturalizeEngine.js";
import { applyWriterSovereignDeliveryPass } from "../lib/product/writerSovereignPipeline.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { finishChannelPack } from "../lib/product/channelQualityStack.js";
import { buildDeliverableChannelFallback } from "../lib/llm/channelDeliveryFallback.js";
import { assessReadAloudHumanGate } from "../lib/quality/readAloudHumanGate.js";
import { scoreRegionBrandMash } from "../lib/content/regionBrandMashRepair.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";

const INPUT = {
  brandName: "현장목마",
  region: "여주",
  topic: "실내 수영장 오픈",
  industry: "레저/체험",
  blogLengthTier: "short",
  v4Speaker: "plain_review",
  researchFacts: [
    { axis: "brand", fact: "목장 내 실내 수영장이 새로 오픈해 사계절 이용이 가능함" },
    { axis: "brand", fact: "승마 체험과 수영·휴식을 하루 코스로 묶어 안내함" },
    { axis: "region", fact: "여주 신륵사·세종대왕릉 인근 당일 방문 코스와 연계하기 좋음" },
  ],
};

const SPAM_PACK = {
  title: "여주 현장목마 실내 수영장 오픈",
  sections: [
    {
      heading: "a",
      body: "근처목마 — 이 지역목마 — 현장 근처목마 — 이 지역 현장목마 — 기준이 달라집니다.",
    },
    { heading: "b", body: "여주 현장목마에 방문했어요. 수영장 라인이 눈에 들어왔어요." },
    { heading: "c", body: "오픈 초기 요금은 매장 공지로 확인하는 편이 안전해요." },
  ],
  _meta: { gpt55LlmPack: true, llmOriginated: true },
};

let failed = 0;
function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const repaired = applyWriterSovereignDeliveryPass(SPAM_PACK, INPUT);
const repairedFull = getBlogFullText(repaired);
const mash = scoreRegionBrandMash(repairedFull, INPUT);
assert("sovereign clears glued mokma", !/근처목마|이 지역목마/.test(repairedFull));
assert("region mash score ok", mash.ok);
assert("pre-spam withhold", assessReadAloudHumanGate(SPAM_PACK, INPUT).shouldWithhold);

let blog = buildMissionProseFallbackPack(INPUT);
blog = finalizeContentQualityForDelivery(blog, INPUT, "blog", { forceRedelivery: true });
const blogFull = getBlogFullText(blog);
assert("fresh blog no glued mokma", !/근처목마|이 지역목마/.test(blogFull));
assert("fresh blog no furniture leak", !/쿠션·좌판/.test(blogFull));
assert("fresh blog has pool fact", /수영|승마/.test(blogFull));

const placeRaw = buildDeliverableChannelFallback("place", {
  input: INPUT,
  bestPack: {
    title: "여주 현장목마",
    shortNotice: "소식",
    detailBody:
      "· 근처목마 — 로컬 매장 운영·예약 맥락.\n· > · 방문·예약은 플레이스 공지로 확인.\n· 검색만 하다 보면 기준이 많아 막히는 순간",
  },
});
const place = finishChannelPack("place", placeRaw.pack, { input: INPUT });
const placeFull = getChannelFullText(place, "place");
assert("place no glued mokma", !/근처목마/.test(placeFull));
assert("place no search cliche", !/검색만 하다 보면/.test(placeFull));
assert("place no markdown leak", !/>\s*·/.test(placeFull));

const instaRaw = buildDeliverableChannelFallback("instagram", {
  input: INPUT,
  bestPack: {
    caption:
      "📌 근처목마 안내\n\n✔ 검색만 하다 보면 기준이 많아\n\n— 현장목마 기준으로 보면 비교·예약 판단이 수월해요.\n\n— 현장목마 기준으로 보면 비교·예약 판단이 수월해요.",
    body: "caption",
  },
});
const insta = finishChannelPack("instagram", instaRaw.pack, { input: INPUT });
const instaFull = getChannelFullText(insta, "instagram");
assert("insta no search cliche", !/검색만 하다 보면/.test(instaFull));
assert(
  "insta 수월 tail capped",
  (instaFull.match(/비교·예약\s*판단이\s*수월/g) || []).length <= 1
);

const naturalized = applyRegionColumnNaturalizePass(
  {
    ...SPAM_PACK,
    sections: SPAM_PACK.sections.map((s) => ({
      ...s,
      body: `여주 현장목마 ${s.body} 여주목마 여주 현장목마`,
    })),
  },
  { ...INPUT, brandName: "여주목마" }
);
const natFull = getBlogFullText(naturalized);
assert("여주목마 brand protected from region cap", !/근처목마/.test(natFull));

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nPASS: yeoju region-brand mash");
