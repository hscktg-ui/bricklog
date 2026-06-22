/**
 * Channel Visit North Star — 플레이스·인스타 GPT 목표 vs 로컬 엔진 스팸
 */
import { getChannelFullText } from "../lib/content/channelPack.js";
import {
  assessChannelEngineSpam,
  assessChannelVisitNorthStar,
  buildNorthStarInstagramPack,
  buildNorthStarPlacePack,
} from "../lib/product/channelVisitNorthStar.js";
import { buildResearchGroundedInstagramPack, buildResearchGroundedPlacePack } from "../lib/content/researchGroundedHumanPack.js";
import { applyChannelSovereignTrimPass } from "../lib/product/channelSovereignTrim.js";
import { finishChannelPackForDelivery } from "../lib/product/channelQualityStack.js";

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

const FACT_LINES = INPUT.researchFacts.map((f) => f.fact);

const CHANNEL_SPAM_PLACE = {
  title: "여주 현장목마 실내수영장",
  shortNotice: "안내",
  detailBody: [
    "여주 현장목마 운영 기준으로 안내드립니다.",
    "· 실내수영장 신규 오픈 — 현장목마 기준으로 보면 비교·예약 판단이 수월해요.",
    "· 식음·휴식 — 이 지역목마 기준으로 보면 비교·예약 판단이 수월해요.",
    "· 로컬 매장 운영·예약 맥락에서 확인해 주세요.",
  ].join("\n"),
};

const CHANNEL_SPAM_INSTA = {
  hook: "실내수영장 — 여주목마",
  body: [
    "여주 여주목마 관련해 이번 달 확인할 포인트를 정리했어요.",
    "실내수영장 신규 오픈 — 여주목마 기준으로 보면 비교·예약 판단이 수월해요.",
    "검색만 하다 보면 — 현장목마 기준으로 보면 비교·예약 판단이 수월해요.",
  ].join("\n\n"),
  lineBreakBody: "",
  hashtags: ["#여주목마"],
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

const spamPlace = assessChannelEngineSpam(getChannelFullText(CHANNEL_SPAM_PLACE, "place"));
assert("place spam detected", !spamPlace.ok);

const spamInsta = assessChannelEngineSpam(
  getChannelFullText({ ...CHANNEL_SPAM_INSTA, lineBreakBody: CHANNEL_SPAM_INSTA.body }, "instagram")
);
assert("insta spam detected", !spamInsta.ok);

const trimmedPlace = applyChannelSovereignTrimPass(CHANNEL_SPAM_PLACE, "place", INPUT);
const trimmedPlaceSpam = assessChannelEngineSpam(getChannelFullText(trimmedPlace, "place"));
assert("trimmed place still has spam tails", trimmedPlaceSpam.ok || trimmedPlaceSpam.violations.length < spamPlace.violations.length);

const northPlace = buildNorthStarPlacePack(INPUT, FACT_LINES);
const placeAssess = assessChannelVisitNorthStar(northPlace, "place", INPUT);
assert("north star place publish", placeAssess.publishOk);
assert("place has brand", northPlace.title.includes("여주목마"));
assert("place no bullet spam", !/^\s*·\s+/m.test(northPlace.detailBody || ""));
assert("place no suwol tail", !/수월/.test(northPlace.detailBody || ""));

const researchPlace = buildResearchGroundedPlacePack(INPUT);
assert("research place publish", assessChannelVisitNorthStar(researchPlace, "place", INPUT).publishOk);

const northInsta = buildNorthStarInstagramPack(INPUT, "emotional", FACT_LINES);
const instaAssess = assessChannelVisitNorthStar(northInsta, "instagram", INPUT);
assert("north star insta publish", instaAssess.publishOk);
assert("insta hook poetic", /물놀이|계절/.test(northInsta.hook || ""));
assert("insta no suwol tail", !/수월/.test(northInsta.lineBreakBody || ""));

const researchInsta = buildResearchGroundedInstagramPack(INPUT);
assert("research insta publish", assessChannelVisitNorthStar(researchInsta, "instagram", INPUT).publishOk);

const finishedPlace = finishChannelPackForDelivery("place", researchPlace, { input: INPUT });
const finishedInsta = finishChannelPackForDelivery("instagram", researchInsta, { input: INPUT });
assert("finished place clean", assessChannelVisitNorthStar(finishedPlace, "place", INPUT).spam.ok);
assert("finished insta clean", assessChannelVisitNorthStar(finishedInsta, "instagram", INPUT).spam.ok);

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nPASS: channel-visit-north-star");
console.log("  place title:", northPlace.title);
console.log("  insta hook:", northInsta.hook);
