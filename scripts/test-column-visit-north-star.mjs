/**
 * Column Visit North Star — 엔진 스팸 초안 vs GPT Writer 목표 칼럼
 */
import { getBlogFullText } from "../utils/qualityCheck.js";
import {
  assessColumnVisitNorthStar,
  assessEngineSpamDraft,
  scoreColumnVisitReadability,
} from "../lib/product/columnVisitNorthStar.js";
import { applyWriterSovereignDeliveryPass } from "../lib/product/writerSovereignPipeline.js";
import { assessReadAloudHumanGate } from "../lib/quality/readAloudHumanGate.js";
import { shouldWithholdCustomerMissionPack } from "../lib/product/writerFirstDelivery.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_FIRST = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";

const INPUT = {
  brandName: "여주목마",
  region: "여주",
  topic: "실내수영장 오픈",
  industry: "레저/체험",
  v2ResearchReady: true,
  researchFacts: [
    { axis: "brand", fact: "실내수영장 신규 오픈으로 사계절 이용 가능" },
    { axis: "brand", fact: "식음·휴식·야외 시설과 복합 문화공간 구성" },
  ],
};

const ENGINE_SPAM_DRAFT = {
  title: "여주 현장목마 실내수영장 오픈 — 방문·상담 정리",
  sections: [
    {
      heading: "실내수영장 오픈, 찾게 된 계기",
      body: "여주 현장목마 — 근처 현장목마 — 근처 현장목마 — 현장 근처목마 — 이 지역 현장목마 — 정리하면 근처목마 안내는 직접 가 본 뒤 본인 기준으로 맞춰 보면 될 것 같아요. 실내수영장 오픈을 처음 정리할 때 — 이 지역목마에서 실제로 비교해 보면 실내수영장 오픈을 고를 때 기준이 달라집니다. 현장목마 실내수영장 오픈 관련해 근처목마 — 이 지역 로컬 매장 운영·예약 맥락.",
    },
    {
      heading: "현장 근처목마에 들어서서 본 첫인상",
      body: "이 지역 현장목마에 직접 들어가 실내수영장 오픈을 눈으로 확인했어요. 근처 이 지역목마 — 같은 흐름으로 이 지역 현장목마 — 현장 근처목마 기준으로 보면 이 지역목마 실내수영장 오픈 관련해 운영·예약이 납득돼요.",
    },
    {
      heading: "솔직 정리",
      body: "정리하면 실내수영장 오픈은 직접 가 본 뒤 본인 기준으로 맞춰 보면 될 것 같아요. 근처 이 지역목마 — 고를 때 기준이 조금씩 보였더라구요.",
    },
  ],
  _meta: { missionProseFallback: true },
};

const GPT_TARGET_DRAFT = {
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
    "실내수영장 오픈 이후 여주목마는 기존보다 활용도가 높아진 모습이었습니다. 직접 둘러본 기준으로는 단순한 수영장이 아니라 다양한 시설을 함께 즐길 수 있는 공간으로 보였습니다.",
  _meta: { llmGenerated: true, gpt55LlmPack: true },
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

const spamFull = getBlogFullText(ENGINE_SPAM_DRAFT);
const spamAssess = assessEngineSpamDraft(spamFull);
assert("engine spam draft detected", !spamAssess.ok);
assert("mission pack withheld with research", shouldWithholdCustomerMissionPack(ENGINE_SPAM_DRAFT, INPUT));

const trimmed = applyWriterSovereignDeliveryPass(
  { ...ENGINE_SPAM_DRAFT, _meta: { gpt55LlmPack: true, llmOriginated: true } },
  { ...INPUT, brandName: "현장목마" }
);
const gate = assessReadAloudHumanGate(trimmed, { ...INPUT, brandName: "현장목마" });
assert("trimmed spam still withheld", gate.shouldWithhold || gate.hardReasons.includes("engine_spam_draft"));

const targetNorth = assessColumnVisitNorthStar(GPT_TARGET_DRAFT, INPUT);
const targetRead = scoreColumnVisitReadability(getBlogFullText(GPT_TARGET_DRAFT), INPUT);
assert("GPT target passes spam check", targetNorth.spam.ok);
assert("GPT target visit readability", targetRead.ok);
assert("GPT target north star publish", targetNorth.publishOk);

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nPASS: column-visit-north-star");
console.log("  spam violations:", spamAssess.violations.length);
console.log("  target score:", targetRead.score);
