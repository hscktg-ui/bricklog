/**
 * 폴백 우회 경로 — 사람이 쓴 글 마감 SSOT 회귀
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { buildDeliverableChannelFallback } from "../lib/llm/channelDeliveryFallback.js";
import { buildMissionRescueApiDelivery } from "../lib/generation/missionRescueDelivery.js";
import { finishChannelFallbackHumanProse } from "../lib/content/humanProseFallbackFinish.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";

const input = {
  brandName: "여주목마",
  region: "여주",
  topic: "승마체험 안내",
  industry: "레저/체험",
  blogLengthTier: "short",
  v4Speaker: "plain_review",
  brandNameAxis: "여주목마",
  regionAxis: "여주",
  topicAxis: "승마체험",
  researchFacts: [
    { fact: "초보자용 말 안장 체험 프로그램 운영" },
    { fact: "목장 내 승마장과 포니 체험 구역 분리" },
    { fact: "주말 사전 예약 권장" },
  ],
};

const blog = buildMissionProseFallbackPack(input);
if (!blog?._meta?.humanProseFallbackFinish && !blog?._meta?.researchGroundedHumanPack) {
  console.error("FAIL: mission fallback missing human prose finish", blog?._meta);
  process.exit(1);
}
const blogFull = getBlogFullText(blog);
if (!/승마|목장|말 안장/.test(blogFull)) {
  console.error("FAIL: blog missing research anchors");
  process.exit(1);
}

const rescue = buildMissionRescueApiDelivery(
  { ...input, brandNameAxis: input.brandName, regionAxis: input.region, topicAxis: input.topic },
  { reasons: ["test_rescue"] }
);
if (!rescue?.blogContent?._meta?.humanProseFallbackFinish) {
  console.error("FAIL: mission rescue missing human prose finish");
  process.exit(1);
}

const { pack: placeRaw } = buildDeliverableChannelFallback("place", { input });
const place = finishChannelFallbackHumanProse(placeRaw, "place", input, {
  deliveryFinalize: true,
});
if (!place?._meta?.humanProseFallbackFinish) {
  console.error("FAIL: place channel missing human prose finish");
  process.exit(1);
}

console.log("OK human-prose-fallback-finish");
