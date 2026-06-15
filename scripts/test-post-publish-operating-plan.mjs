/**
 * Post-publish operating plan — 결과 화면 다음 단계
 */
import assert from "node:assert/strict";
import {
  buildContentOperatingPlan,
  buildPostPublishOperatingSteps,
} from "../lib/product/briclogBrandContentOS.js";

const plan = buildContentOperatingPlan({
  brandName: "모닝브루",
  region: "서울 강남",
  topic: "봄 브런치 오픈",
  industry: "카페",
});

const steps = buildPostPublishOperatingSteps(plan, {
  hasPlace: false,
  hasInsta: true,
  blogTopic: "봄 브런치 오픈",
});

assert.ok(steps.length >= 2);
assert.ok(steps.some((s) => s.channel === "place"));
assert.ok(!steps.some((s) => s.channel === "instagram"));
assert.ok(steps.some((s) => s.actionLabel?.includes("다음 블로그")));

const allDone = buildPostPublishOperatingSteps(plan, {
  hasPlace: true,
  hasInsta: true,
  blogTopic: plan.primaryTopic,
});
assert.equal(
  allDone.filter((s) => s.channel !== "blog").length,
  0,
  "place+insta done → only next blog"
);

console.log("OK: post-publish operating steps");
