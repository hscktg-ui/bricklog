/**
 * Brand Content OS Centers — LEVER 접합 회귀
 */
import assert from "node:assert/strict";
import {
  BRAND_CONTENT_OS_CENTERS,
  estimateDeliveryTimeSavings,
  buildDeliveryActionInsights,
  buildContentDnaLabels,
  searchBrandContentReferences,
  resolveIndustryWeek1Template,
  buildBrandContentOsCenterSnapshot,
} from "../lib/product/brandContentOsCenters.js";
import { BRAND_CONTENT_OS_PHASES } from "../lib/product/briclogBrandContentOS.js";
import { buildDeliveryValueExposure } from "../lib/product/deliveryValueExposure.js";
import { buildBriclogNextSnapshot } from "../lib/product/briclogNext.js";

assert.equal(BRAND_CONTENT_OS_CENTERS.length, 5);
assert.ok(BRAND_CONTENT_OS_PHASES.some((p) => p.id === "ops"));

const input = {
  brandName: "모닝브런치",
  region: "서울 강남",
  topic: "주말 브런치 메뉴",
  industry: "cafe",
  brandLearningProfile: {
    preferredWritingTone: ["따뜻함"],
    preferredPersona: ["현장후기"],
    avoidPhrases: ["너무 광고"],
    topNegativeTags: ["too_ad"],
  },
};

const time = estimateDeliveryTimeSavings({
  timing: { totalSec: 18 * 60, researchSec: 8 * 60, blogSec: 10 * 60 },
});
assert.equal(time.ok, true);
assert.ok(time.savedPct >= 50);

const actions = buildDeliveryActionInsights(input);
assert.ok(actions.nextTopics.length >= 1);
assert.ok(actions.channelMix.length >= 1);

const dna = buildContentDnaLabels(input);
assert.ok(dna.labels.length >= 2);

const week1 = resolveIndustryWeek1Template(input);
assert.equal(week1.label, "카페 1주차");
assert.ok(week1.days.length >= 4);

const search = searchBrandContentReferences(
  [
    {
      id: "1",
      channel: "blog",
      title: "강남 주말 브런치 후기",
      full_content: "테라스 좌석과 라떼가 좋았어요",
    },
    {
      id: "2",
      channel: "place",
      title: "주차 안내",
      full_content: "주차는 건물 지하",
    },
  ],
  "브런치 테라스"
);
assert.ok(search.results[0].id === "1");

const snap = buildBrandContentOsCenterSnapshot(input, {
  meta: { timing: { totalSec: 1200 } },
});
assert.equal(snap.centers.length, 5);
assert.ok(snap.timeSavings.ok);

const exposure = buildDeliveryValueExposure(input, null, {
  title: "테스트",
  sections: [
    {
      heading: "메뉴",
      body: "모닝브런치는 서울 강남에서 브런치와 원두를 즐길 수 있습니다. 직접 보면 테라스 분위기가 눈에 들어옵니다.",
    },
  ],
  _meta: { timing: { totalSec: 900 } },
});
assert.ok(exposure.centers?.length === 5);
assert.ok(exposure.actions?.nextTopics?.length);
assert.ok(exposure.dna?.labels?.length);

const next = buildBriclogNextSnapshot(input, { blog: true, blogTopic: input.topic });
assert.ok(next.actions?.headline);

console.log(
  JSON.stringify(
    {
      centers: snap.centers.map((c) => c.id),
      time: time.label,
      week1: week1.label,
      searchTop: search.results[0].title,
      exposureVersion: exposure.version,
    },
    null,
    2
  )
);
console.log("OK: brand content OS centers (LEVER inspired)");
