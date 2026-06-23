/**
 * Writer-First Delivery — 조사→Writer→trim-only 계약 회귀
 */
import {
  isWriterFirstDeliveryEnabled,
  isWriterFirstDeliveryPack,
  shouldWithholdCustomerMissionPack,
  finalizeWriterFirstBlogDelivery,
  isWriterFirstRescueBlocked,
  buildWriterFirstWithholdMessage,
} from "../lib/product/writerFirstDelivery.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { hasUsableResearchFacts } from "../lib/content/researchGroundedHumanPack.js";
import { researchGateBlockedResult } from "../lib/content/v2PipelineGate.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_FIRST = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";
process.env.BRICLOG_FAST_PIPELINE = "true";

const INPUT = {
  brandName: "티카페",
  region: "강남",
  topic: "시즌 디저트 추천",
  industry: "카페",
  v2ResearchReady: true,
  v2PreWriteVerified: true,
  researchFacts: [
    { axis: "brand", fact: "당일 구운 휘낭시에가 인기 메뉴로 자주 언급됨" },
    { axis: "topic", fact: "봄 시즌 한정 딸기 디저트 라인이 진열대 앞쪽에 배치됨" },
  ],
};

let failed = 0;
function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

assert("writer-first enabled", isWriterFirstDeliveryEnabled());
assert("rescue blocked with research", isWriterFirstRescueBlocked(INPUT));

const llmPack = {
  title: "강남 티카페, 봄 디저트 후기",
  sections: [
    {
      heading: "들어가며",
      body: "강남 티카페에 들어서자 진열대에 딸기 디저트가 먼저 보였어요. 당일 구운 휘낭시에도 옆에 있었고, 시즌 메뉴는 사진보다 색감이 부드러웠어요.",
    },
    {
      heading: "맛본 뒤",
      body: "딸기 크림은 과하지 않아서 오후에 앉기 좋았어요. 휘낭시에는 겉이 바삭하고 속이 가벼웠습니다.",
    },
    {
      heading: "정리",
      body: "평일 오전이 한산해서 메뉴를 천천히 볼 수 있었어요. 주차와 영업 시간은 매장 안내를 확인하면 됩니다.",
    },
  ],
  conclusion: "강남 티카페 봄 디저트는 취향에 맞게 골라 보시면 좋아요.",
  _meta: { llmGenerated: true, gpt55LlmPack: true },
};

assert("llm pack is writer-first", isWriterFirstDeliveryPack(llmPack, INPUT));

const delivered = finalizeWriterFirstBlogDelivery(llmPack, INPUT);
const deliveredFull = getBlogFullText(delivered);
assert("writer-first keeps prose", /딸기|휘낭시에/.test(deliveredFull));
assert("no human column furniture leak", !/쿠션·좌판/.test(deliveredFull));
assert("writer-first meta", delivered._meta?.writerFirstDelivery === true);

const mission = buildMissionProseFallbackPack(INPUT);
assert(
  "mission withheld when research",
  shouldWithholdCustomerMissionPack(mission, INPUT)
);
assert(
  "withhold message",
  /다시 받기/.test(buildWriterFirstWithholdMessage(INPUT))
);

const gateBlocked = researchGateBlockedResult(
  INPUT,
  { reasons: ["golden_gate_fail"], userMessage: null },
  mission
);
assert(
  "research gate blocks mission rescue",
  gateBlocked.withheld === true &&
    gateBlocked.mode === "writer_first_withheld" &&
    !gateBlocked.blogContent?.sections?.length
);

const heavy = finalizeContentQualityForDelivery(llmPack, INPUT, "blog", {
  forceRedelivery: true,
  skipWriterFirstFastPath: true,
});
assert(
  "heavy path slower meta differs",
  !heavy._meta?.writerFirstDelivery || heavy._meta?.writerFirstDelivery !== true
);

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nPASS: writer-first delivery");
