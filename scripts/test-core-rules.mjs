/**
 * BRICLOG 코어1·코어2 내부 룰 회귀
 */
import assert from "node:assert/strict";
import {
  assessCore1HumanWriting,
  assessCore2BrandMemoryApplied,
  stampCoreRulesOnInput,
  stampCoreRulesOnDelivery,
  assertCore1DeliveryStamped,
  BRICLOG_CORE_1,
  BRICLOG_CORE_2,
} from "../lib/product/briclogCoreRules.js";
import { stampContentQualityValue } from "../lib/product/contentQualityValue.js";
import { finishChannelPackForDelivery } from "../lib/product/channelQualityStack.js";
import { stampCoreEngineDeliveryMeta } from "../lib/product/briclogCoreEngine.js";

const prevMission = process.env.BRICLOG_MISSION;
process.env.BRICLOG_MISSION = "true";

assert.equal(BRICLOG_CORE_1.id, "human_written_quality");
assert.equal(BRICLOG_CORE_2.id, "brand_feedback_memory");

const input = {
  brandName: "꽃담",
  region: "부산",
  topic: "어버이날 꽃다발",
  industry: "꽃집",
  brandId: "brand-test-1",
  brandFeedbackBrief: "체크리스트 말투 줄이기 · 지역명 반복 완화",
  combinedPersonalizationAddon: "피드백: 따뜻한 매장 소개 톤 유지",
  feedbackHints: ["warm_tone"],
};

const stampedInput = stampCoreRulesOnInput(input);
assert.equal(stampedInput.briclogCoreRules, true);
assert.equal(stampedInput.core2Applied, true);

const core2Thin = assessCore2BrandMemoryApplied({ brandId: "x" });
assert.equal(core2Thin.applied, false);
assert.ok(core2Thin.reasons.includes("core2_brand_memory_thin"));

const blog = {
  title: "어버이날 꽃다발",
  sections: [
    {
      heading: "고르는 기준",
      body: "어버이날에는 수국과 해바라기가 자주 고릅니다. 부산 꽃담에서 만원대 다발을 픽업할 수 있어 바쁜 일정에도 부담이 적었어요.",
    },
    {
      heading: "픽업",
      body: "색감을 먼저 정해 두면 상담이 빨라집니다. 리본 색도 같이 맞춰 주셨어요.",
    },
    {
      heading: "마무리",
      body: "일정만 정리해 두면 당일 수령도 수월합니다.",
    },
  ],
};

let blogPack = stampContentQualityValue(blog, input);
blogPack = {
  ...blogPack,
  _meta: {
    ...(blogPack._meta || {}),
    sqv: {
      ...(blogPack._meta?.sqv || {}),
      score: Math.max(88, blogPack._meta?.sqv?.score ?? 0),
      grade: "A",
      version: "v3-editor",
    },
    contentQualityValue: Math.max(88, blogPack._meta?.contentQualityValue ?? 0),
    humanBelief: { score: 88, ok: true },
    humanVoiceMet: true,
  },
};
blogPack = stampCoreRulesOnDelivery(blogPack, input, "blog");
assert.equal(blogPack._meta?.briclogCoreRules?.core1Pass, true);
assertCore1DeliveryStamped(blogPack, "blog", "blog");

const blogMeta = stampCoreEngineDeliveryMeta(blogPack, input, "blog");
assert.ok(blogMeta._meta?.coreEngine?.core1Pass !== false);
assert.equal(typeof blogMeta._meta?.coreEngine?.coreRulesScore, "number");

const blogSample = {
  title: "t",
  sections: [{ heading: "h", body: "b".repeat(120) }],
};
const blogCore1 = assessCore1HumanWriting(
  stampContentQualityValue(blogSample, input),
  input,
  "blog"
);
assert.ok(typeof blogCore1.belief === "number");

const placeSeed = {
  title: "어버이날 꽃다발 안내",
  shortNotice: "부산 꽃담 — 만원대 꽃다발 픽업",
  detailBody:
    "어버이날을 앞두고 수국·해바라기 다발을 준비했습니다. 색감을 미리 정해 두면 픽업이 빠릅니다.",
};
const placeDelivered = finishChannelPackForDelivery("place", placeSeed, { input });
assert.ok(placeDelivered._meta?.briclogCoreRules?.core1);
assert.ok(typeof placeDelivered._meta?.sqv?.score === "number");
assertCore1DeliveryStamped(placeDelivered, "place", "place");

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;

console.log("OK: briclog core rules — core1 human writing + core2 brand memory");
