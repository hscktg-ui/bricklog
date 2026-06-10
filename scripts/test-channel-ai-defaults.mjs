/**
 * 채널 AI 추천 기본값
 */
import assert from "node:assert/strict";
import {
  resolveChannelAiDefaults,
  applyChannelAiDefaults,
  INSTA_PURPOSE_QUESTIONS,
  PLACE_NOTICE_KIND_OPTIONS,
} from "../lib/product/channelAiDefaults.js";

const base = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름 꽃다발 예약 안내",
};

const insta = resolveChannelAiDefaults(base, "insta");
assert.equal(insta.purpose, "reserve");
assert.ok(insta.fields.instaCampaignGoal);
assert.ok(insta.card.hashtagPreview.length >= 2);
assert.equal(INSTA_PURPOSE_QUESTIONS.length, 5);

const place = resolveChannelAiDefaults(base, "place");
assert.equal(place.notice, "reserve");
assert.equal(PLACE_NOTICE_KIND_OPTIONS.length, 5);

const applied = applyChannelAiDefaults({ brandName: "카페", topic: "신메뉴" }, "insta");
assert.ok(applied.instaCampaignGoal);
assert.ok(applied.instaAudience);

console.log("OK: channel AI defaults");
