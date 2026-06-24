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
import { tryWriterFirstOrchestratorDelivery } from "../lib/product/gpt55LightDelivery.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_FIRST = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";
process.env.BRICLOG_FAST_PIPELINE = "true";
process.env.BRICLOG_LAUNCH_PUBLISH_FIRST = "false";

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

const orchestratorInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "실내수영장 오픈",
  industry: "레저/체험",
  v2ResearchReady: true,
  v2PreWriteVerified: true,
  researchFacts: [
    { axis: "brand", fact: "실내수영장 신규 오픈으로 사계절 이용 가능" },
    { axis: "brand", fact: "식음·휴식·야외 시설과 복합 문화공간 구성" },
  ],
};
const columnistPack = {
  title: "여주목마 실내수영장 오픈 소식, 직접 둘러보고 정리해 봤습니다",
  sections: [
    {
      heading: "처음 들어가서 느낀 분위기",
      body: "최근 여주목마에 실내수영장이 새롭게 오픈했다는 소식을 듣고 현장을 방문해 보았습니다. 도착해 가장 먼저 느낀 것은 생각보다 넓고 쾌적하다는 점이었어요. 식음시설과 휴식공간, 야외 놀이시설까지 함께 갖춘 복합 공간이라 가족 단위 방문에도 부담이 적어 보였습니다.",
    },
    {
      heading: "실내수영장을 둘러보며 확인한 부분",
      body: "실내수영장은 날씨 영향을 받지 않는다는 점이 가장 큰 장점으로 느껴졌습니다. 시설 관리 상태가 깔끔했고, 동선도 비교적 잘 정리되어 있었어요. 어린 자녀와 함께 온다면 실내 비중을 직접 확인해 보는 편이 좋습니다.",
    },
    {
      heading: "여주목마만의 장점",
      body: "수영 후 식사와 카페 이용이 가능하고, 야외 공간과 연계해 하루 코스를 짜기 쉬웠습니다. 글라스룸과 방갈로 등 별도 공간도 함께 운영되고 있어 모임 장소로도 활용할 수 있어 보였어요.",
    },
    {
      heading: "방문 전 참고하면 좋은 점",
      body: "운영 시간·이용 요금·예약 가능 여부는 시즌에 따라 달라질 수 있어 방문 전 공식 안내를 확인하는 것이 좋습니다. 주말에는 이용객이 많을 수 있어 사전 문의 후 방문하면 편합니다.",
    },
  ],
  conclusion:
    "실내수영장 오픈 이후 여주목마는 기존보다 활용도가 높아진 모습이었습니다.",
  _meta: { llmGenerated: true, gpt55LlmPack: true },
};
const orchestratorPass = tryWriterFirstOrchestratorDelivery(
  columnistPack,
  orchestratorInput
);
assert(
  "orchestrator writer-first escape passes columnist pack",
  orchestratorPass?._meta?.publishReady === true
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
