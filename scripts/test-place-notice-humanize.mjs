import assert from "node:assert/strict";
import {
  stripPlaceBridgeSpam,
  humanizePlaceNoticePack,
  assessPlaceNoticeHumanTone,
} from "../lib/content/placeNoticeHumanize.js";
import { applyPlaceUnifiedProsePass } from "../lib/content/channelUnifiedProseEngine.js";
import { detectPlaceReviewLeak } from "../lib/channel/smartPlaceNoticeGuard.js";
import { buildResearchGroundedPlacePack } from "../lib/content/researchGroundedHumanPack.js";

process.env.BRICLOG_MISSION = "true";

assert.equal(
  stripPlaceBridgeSpam("이어서 이어서 입고 소식입니다."),
  "입고 소식입니다."
);
assert.equal(stripPlaceBridgeSpam("이어서 입고 소식입니다."), "입고 소식입니다.");

const reviewLeak = humanizePlaceNoticePack({
  title: "파주 카페 방문 후기",
  shortNotice: "다녀왔는데 분위기가 좋았어요.",
  detailBody: "솔직 후기로 정리했습니다.\n직접 가보세요.",
});
assert.ok(!detectPlaceReviewLeak(reviewLeak.shortNotice || ""));
assert.ok(!detectPlaceReviewLeak(reviewLeak.detailBody || ""));
assert.equal(reviewLeak._meta.placeNoticeHumanized, true);
assert.ok(/안내|운영|예약|매장/.test(reviewLeak.shortNotice || ""));

const assessed = assessPlaceNoticeHumanTone(
  `${reviewLeak.shortNotice}\n${reviewLeak.detailBody}`
);
assert.equal(assessed.ok, true);
assert.equal(assessed.reviewLeak, false);

const input = { brandName: "모카", topic: "봄 원두", region: "성수" };
const pack = applyPlaceUnifiedProsePass(
  {
    title: "성수 모카 봄 원두",
    shortNotice: "신제품 입고 안내드립니다.",
    detailBody: "원두가 다양합니다.\n\n매장에서 확인할 수 있습니다.",
  },
  input
);
assert.equal(pack._meta.placeNoticeHumanized, true);
assert.ok(!detectPlaceReviewLeak(pack.detailBody || ""));

const petCafeInput = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  v4Speaker: "plain_review",
  researchFacts: [
    { axis: "brand", fact: "실내 대형견·소형견 구역이 분리되어 있음" },
    { axis: "topic", fact: "예약 없이 당일 입장 가능하나 혼잡 시 대기" },
  ],
};
const grounded = buildResearchGroundedPlacePack(petCafeInput);
assert.ok(!/방문\s*후기|다녀(?:왔|온)/.test(grounded.title || ""));
assert.ok(!detectPlaceReviewLeak(grounded.detailBody || ""));
assert.ok(/안내|운영|예약|플레이스/.test(grounded.detailBody || ""));

console.log("OK: place-notice-humanize");
