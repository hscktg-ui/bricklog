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

import { topicRaw } from "../lib/content/topicFacetEngine.js";
import { resolveChannelBrandName } from "../lib/content/channelBrandResolve.js";

assert.equal(topicRaw({ region: "여주", topic: "여주, 수영장 개장" }), "수영장 개장");
assert.equal(
  resolveChannelBrandName({ brandName: "새 브랜드", region: "여주", topic: "수영장 개장" }),
  "수영장"
);

const poolInput = {
  brandName: "여주 새 브랜드",
  region: "여주",
  topic: "수영장 개장",
  researchFacts: [{ fact: "실내·실외 수영장 이용 시간은 요일별로 다릅니다." }],
};
const spammy = humanizePlaceNoticePack(
  {
    title: "여주 수영장",
    shortNotice:
      "여주 새 브랜드, 수영장 개장 소식 전해드려요 자연스럽게 서비스·예약 일정은 매장·시기마다 달라질 수 있어요.",
    detailBody:
      "· 여주 새 브랜드, 수영장 개장 소식 전해드려요 자연스럽게 서비스·예약 일정은 매장·시기마다 달라질 수 있어요. · 방문·예약은 플레이스 공지와 전화 문의로 확인할 수 있으며, 주차·영업 시간도 같은 경로에서 함께 안내드리고 있어요. · 문의는 플레이스·전화로 편하게 남겨 주세요.\n· 수영장 개장 — 자세한 내용은 매장에 문의해 주세요\n· 새 브랜드 방문·예약은 플레이스·전화로 확인\n-",
  },
  poolInput
);
assert.ok(!/전해(?:드|요)|자연스럽|같은\s*경로/.test(spammy.detailBody || ""));
assert.ok(!/(?:^|\n)\s*-\s*(?:\n|$)/m.test(spammy.detailBody || ""));
assert.ok(/수영장\s*개장/.test(spammy.shortNotice || spammy.detailBody || ""));
assert.ok(
  (spammy.detailBody || "").split(/\n/).filter((l) => /플레이스|전화/.test(l)).length <= 1
);
const poolTone = assessPlaceNoticeHumanTone(
  `${spammy.shortNotice}\n${spammy.detailBody}`
);
assert.equal(poolTone.ok, true);

const commaTopicGrounded = buildResearchGroundedPlacePack({
  brandName: "새 브랜드",
  region: "여주",
  topic: "여주, 수영장 개장",
  researchFacts: [{ fact: "실내·실외 수영장을 함께 운영합니다." }],
});
assert.ok(!/새\s*브랜드/.test(commaTopicGrounded.title || ""));
assert.ok(/수영장\s*개장|수영/.test(`${commaTopicGrounded.title} ${commaTopicGrounded.shortNotice}`));
assert.ok(!/찾게\s*됐|🔎|매장\s*안내를\s*찾게/.test(commaTopicGrounded.detailBody || ""));

console.log("OK: place-notice-humanize");
