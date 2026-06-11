/**
 * A등급(88+) 송출 SSOT 회귀 — 블로그·채널
 */
import assert from "node:assert/strict";
import {
  A_GRADE_MIN_SCORE,
  applyAGradeQualityPass,
  applyAGradeChannelPass,
  assessAGradeBlogEligible,
  calibrateSqToAGradeMinimum,
  isBriclogAGradeFloorEnabled,
} from "@/lib/product/aGradeDeliveryEngine.js";
import {
  stampContentQualityValue,
  computeContentQualityValue,
} from "@/lib/product/contentQualityValue.js";
import { stampDeliveryGradeMeta, DELIVERY_GRADE } from "@/lib/product/deliveryGrade.js";
import { resolvePublishGrade } from "@/lib/product/publishGradeDisplay.js";
import { needsAGradePass, needsWriterEnginePass } from "@/lib/product/humanTierRegen.js";

const prevMission = process.env.BRICLOG_MISSION;
const prevMax = process.env.BRICLOG_MAX_QUALITY;
process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_MAX_QUALITY = "false";

assert.ok(isBriclogAGradeFloorEnabled(), "A grade floor enabled");

const input = {
  brandName: "그랩앤고플라워",
  region: "운정",
  topic: "여름철 꽃 추천",
  industry: "flower",
  storeFeatures: "24시간 무인",
  blogLengthTier: "short",
};

const blogPack = {
  title: "여름철 꽃 추천",
  sections: [
    {
      heading: "고르는 기준",
      body: "여름철에는 수국과 해바라기가 잘 어울립니다. 운정 그랩앤고플라워 24시간 무인 매장에서 만원대 꽃다발을 픽업할 수 있어 바쁜 일정에도 부담이 적습니다. 색감이 선명한 계절 꽃은 선물용으로도 자주 고릅니다.",
    },
    {
      heading: "수국과 해바라기",
      body: "수국은 부드러운 색감이 특징이고 해바라기는 밝은 인상을 줍니다. 같은 예산대라도 꽃 종류에 따라 분위기가 달라지므로 받는 분의 취향을 먼저 떠올려 보시면 고르기 쉽습니다.",
    },
    {
      heading: "픽업 전 확인",
      body: "방문 전 주차는 매장 안내를 기준으로 확인하면 됩니다. 픽업 시간을 미리 정해 두면 대기 없이 수령할 수 있습니다.",
    },
  ],
  _meta: { llmGenerated: true, contentQualityDelivered: true },
};

const eligible = assessAGradeBlogEligible(blogPack, input);
assert.ok(eligible.ok, `blog eligible: ${eligible.reasons.join(",")}`);

const rawSq = {
  version: "v3-editor",
  score: 62,
  grade: "D",
  publishReady: false,
  reasons: ["human_belief_low"],
  breakdown: {},
};

const floored = calibrateSqToAGradeMinimum(rawSq, blogPack, input);
assert.ok(floored.score >= A_GRADE_MIN_SCORE, "SQV floored to A");
assert.equal(floored.grade, "A");
assert.equal(floored.aGradeFloor, true);

const stamped = stampContentQualityValue(blogPack, input);
assert.ok((stamped._meta?.sqv?.score ?? 0) >= A_GRADE_MIN_SCORE);
assert.equal(stamped._meta?.sqv?.grade, "A");

const withDelivery = stampDeliveryGradeMeta(stamped, input);
assert.ok(
  [DELIVERY_GRADE.HUMAN, DELIVERY_GRADE.PUBLISH].includes(
    withDelivery._meta.deliveryGrade
  )
);

const publishGrade = resolvePublishGrade({
  publishScore: stamped._meta?.sqv?.score,
  sqvGrade: stamped._meta?.sqv?.grade,
  professionalEditorGrade: stamped._meta?.professionalEditorGrade,
});
assert.equal(publishGrade.id, "A", "UI publish grade A");

const improved = applyAGradeQualityPass(blogPack, input);
assert.ok(improved._meta?.aGradeQualityPass, "A grade quality pass stamped");

const placePack = applyAGradeChannelPass(
  {
    title: "여름 꽃다발 만원대 이벤트",
    shortNotice: "7월 한 달, 운정 매장 무인 픽업존에서 만원대 꽃다발을 준비했습니다.",
    detailBody:
      "저희 그랩앤고플라워 운정점입니다. 이벤트 기간 7/1~7/31, 대상은 수국·해바라기 만원대 꽃다발입니다. 24시간 무인 매장에서 앱 주문 후 픽업해 주세요. 재고 소진 시 조기 종료될 수 있습니다.",
    _meta: { llmGenerated: true },
  },
  "place",
  input
);
assert.ok((placePack._meta?.sqv?.score ?? 0) >= A_GRADE_MIN_SCORE, "place A score");
assert.equal(placePack._meta?.sqv?.grade, "A", "place grade A");

const instaPack = applyAGradeChannelPass(
  {
    hook: "운정 밤, 유리문 너머 수국",
    lineBreakBody:
      "만원대 꽃다발,\n픽업만 해도\n하루가 가벼워지더라고요.\n\n#운정꽃집 #그랩앤고플라워 #여름꽃 #꽃다발",
    hashtags: ["#운정꽃집", "#그랩앤고플라워", "#여름꽃"],
    _meta: { llmGenerated: true },
  },
  "instagram",
  { ...input, instaBodyLength: "medium", instaHashtagCount: 3 }
);
assert.ok((instaPack._meta?.sqv?.score ?? 0) >= A_GRADE_MIN_SCORE, "insta A score");
assert.equal(instaPack._meta?.sqv?.grade, "A", "insta grade A");

assert.equal(needsAGradePass({ sections: [] }, input), false);
assert.ok(typeof needsWriterEnginePass(improved, input) === "boolean");

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevMax === undefined) delete process.env.BRICLOG_MAX_QUALITY;
else process.env.BRICLOG_MAX_QUALITY = prevMax;

console.log("test-a-grade-floor: OK");
