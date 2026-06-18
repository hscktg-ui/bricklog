/**
 * 조사 우선 라우팅 회귀 — 블로그(여주목마) + 채널 bestPack 승격
 */
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { buildDeliverableChannelFallback } from "../lib/llm/channelDeliveryFallback.js";

process.env.BRICLOG_MISSION = "true";

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "여주목마 승마체험 안내",
  industry: "레저/체험",
  blogLengthTier: "short",
  v4Speaker: "plain_review",
  researchFacts: [
    { axis: "brand", fact: "초보자용 말 안장 체험 프로그램이 따로 운영됨" },
    { axis: "brand", fact: "목장 내 승마장·포니 체험 구역이 분리되어 있음" },
    { axis: "region", fact: "여주 신륵사·세종대왕릉 인근 당일 코스와 연계 방문이 많음" },
    { axis: "topic", fact: "주말·공휴일 사전 예약 없이는 대기 시간이 길어질 수 있음" },
  ],
};

const blog = buildMissionProseFallbackPack(yeojuInput);
const blogFull = getBlogFullText(blog);
if (!/승마|말 안장|목장|포니/.test(blogFull)) {
  console.error("FAIL: blog should reflect research facts", blogFull.slice(0, 400));
  process.exit(1);
}
if (!blog._meta?.researchFactsWoven && !blog._meta?.researchGroundedHumanPack) {
  const hasResearchMeta =
    blog._meta?.missionProseFallback && /승마|목장/.test(blogFull);
  if (!hasResearchMeta) {
    console.error("FAIL: blog missing research grounding");
    process.exit(1);
  }
}
if ((blogFull.match(/비교가 수월/g) || []).length >= 3) {
  console.error("FAIL: template spam without research weave");
  process.exit(1);
}

const petCafeInput = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  v4Speaker: "plain_review",
  researchFacts: [
    { axis: "brand", fact: "실내 대형견·소형견 구역이 분리되어 있음" },
    { axis: "brand", fact: "견주 음료와 반려견 간식 메뉴가 따로 있음" },
    { axis: "region", fact: "파주 운정·교하 일대 주말 방문객이 많음" },
  ],
};

// Generic publishable bestPack must upgrade with research (not raw llm_draft)
const genericPlace = {
  title: "플레르퍼피 안내",
  shortNotice: "파주 플레르퍼피 매장 소식입니다.",
  detailBody:
    "파주 플레르퍼피에서 애견카페 관련 안내드립니다. 방문 전 영업 시간·주차·예약 방법을 함께 확인해 주세요. 매장에서 체험·상담 후 비교하시면 선택이 수월합니다.",
  shortBody: "파주 플레르퍼피 매장 소식입니다.",
  body: "파주 플레르퍼피 매장 소식입니다.",
};
const fromBest = buildDeliverableChannelFallback("place", {
  input: petCafeInput,
  bestPack: genericPlace,
});
if (fromBest.source === "llm_draft") {
  console.error("FAIL: generic bestPack should upgrade with research", fromBest.source);
  process.exit(1);
}
const placeFull = getChannelFullText(fromBest.pack, "place");
if (!/대형견|소형견|견주 음료|반려견/.test(placeFull)) {
  console.error("FAIL: place bestPack upgrade missing research anchors", placeFull.slice(0, 300));
  process.exit(1);
}

console.log("OK research-routing-regression");
console.log("  blog research anchors:", /승마|목장/.test(blogFull));
console.log("  place upgrade source:", fromBest.source);
