/**
 * 휴대폰 중복 정책 · 발행 리듬 · 스케줄 이력 회귀
 */
import assert from "node:assert/strict";
import {
  profileRowBlocksPhoneSignup,
  PHONE_DUPLICATE_BLOCK_MESSAGE,
} from "../lib/auth/phoneDuplicatePolicy.js";
import {
  analyzePublishRhythm,
  buildRhythmScheduleTips,
  CHANNEL_CADENCE_DAYS,
} from "../lib/product/brandPublishRhythm.js";
import {
  generationsToScheduleItems,
} from "../lib/product/scheduleHistorySources.js";
import { buildContentScheduleView } from "../lib/product/contentScheduleCalendar.js";

assert.equal(profileRowBlocksPhoneSignup({ phone_verified_at: null }, true), true);
assert.equal(profileRowBlocksPhoneSignup({ phone_verified_at: null }, false), false);
assert.equal(profileRowBlocksPhoneSignup({ phone_verified_at: "2026-01-01" }, false), true);
assert.match(PHONE_DUPLICATE_BLOCK_MESSAGE, /로그인/);

const rhythm = analyzePublishRhythm(
  [
    { channel: "blog", created_at: "2026-06-10T09:00:00.000Z" },
    { channel: "place", created_at: "2026-05-01T09:00:00.000Z" },
  ],
  Date.parse("2026-06-13T12:00:00.000Z")
);
assert.equal(rhythm.find((r) => r.channel === "blog")?.status, "ok");
assert.equal(rhythm.find((r) => r.channel === "place")?.status, "overdue");
assert.ok(CHANNEL_CADENCE_DAYS.blog === 7);

const rhythmTips = buildRhythmScheduleTips(rhythm, "테스트샵");
assert.ok(rhythmTips.some((t) => /플레이스/.test(t.title)));

const genItems = generationsToScheduleItems(
  [
    {
      id: "g1",
      brand_id: "b1",
      main_keyword: "여름 메뉴",
      blog: JSON.stringify({ title: "여름 한정", sections: [] }),
      place: "",
      instagram: "",
      created_at: "2026-06-11T10:00:00.000Z",
    },
  ],
  "b1"
);
assert.equal(genItems.length, 1);
assert.equal(genItems[0].channel, "blog");

const view = buildContentScheduleView({
  brandName: "테스트",
  memoryItems: [
    { id: "m1", channel: "blog", title: "A", created_at: "2026-06-12T09:00:00.000Z" },
  ],
  generationItems: [
    {
      id: "g1",
      brand_id: "b1",
      main_keyword: "여름 메뉴",
      blog: JSON.stringify({ title: "여름 한정", sections: [] }),
      place: "",
      instagram: "",
      created_at: "2026-06-11T10:00:00.000Z",
    },
  ],
  brandId: "b1",
  viewYear: 2026,
  viewMonth: 6,
  now: new Date("2026-06-13T12:00:00.000Z"),
});
assert.ok(view.history.length >= 2, `history length ${view.history.length}`);
assert.ok(view.rhythm?.length === 3);
assert.ok(view.tips.length >= 2);

console.log("OK: phone rhythm schedule policy");
