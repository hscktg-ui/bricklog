/**
 * 회원 first-touch 유입 포맷 회귀
 */
import assert from "node:assert/strict";
import {
  formatUserAcquisitionBrief,
  normalizeAcquisitionPayload,
} from "../lib/analytics/userAcquisition.js";

const payload = normalizeAcquisitionPayload({
  path: "/",
  referrer: "https://search.naver.com/search.naver?query=브릭로그",
  utm_source: "naver",
  utm_medium: "cpc",
  utm_campaign: "launch",
});

assert.equal(payload.acquisition_source_channel, "naver_ads");
assert.equal(payload.acquisition_path, "/");

const brief = formatUserAcquisitionBrief({
  acquisition_source_channel: "naver_organic",
  acquisition_path: "/guides/blog",
  acquisition_referrer: "https://search.naver.com/",
  acquisition_utm_source: "newsletter",
  acquisition_utm_medium: "email",
  acquisition_utm_campaign: "march",
});

assert.ok(brief);
assert.equal(brief.channel, "네이버 검색");
assert.ok(brief.label.includes("/guides/blog"));
assert.ok(brief.utm.includes("newsletter"));

assert.equal(formatUserAcquisitionBrief({}), null);

console.log("OK: user-acquisition", brief.label);
