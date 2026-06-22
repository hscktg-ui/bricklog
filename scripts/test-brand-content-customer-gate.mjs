/**
 * Brand Content Customer Gate — Mission 구제 차단·채널 위생·블로그 파생
 */
import { getChannelFullText } from "../lib/content/channelPack.js";
import {
  shouldAllowMissionUiRescue,
  applyCustomerChannelHygienePass,
  enforceCustomerChannelOutput,
  tryFastChannelFromVerifiedBlog,
} from "../lib/product/brandContentCustomerGate.js";
import { deriveChannelFromVerifiedBlog } from "../lib/product/deriveChannelFromVerifiedBlog.js";
import { buildNorthStarReferencePromptBlock } from "../lib/product/northStarReferenceExamples.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_FIRST = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";
process.env.BRICLOG_FAST_PIPELINE = "true";

const INPUT = {
  brandName: "여주목마",
  region: "여주",
  topic: "실내수영장 오픈",
  v2ResearchReady: true,
  researchFacts: [
    { fact: "실내수영장 신규 오픈으로 사계절 이용 가능" },
    { fact: "식음·휴식·야외 시설과 복합 문화공간 구성" },
  ],
};

const GOOD_BLOG = {
  title: "여주목마 실내수영장 오픈 소식, 직접 둘러보고 정리해 봤습니다",
  sections: [
    {
      heading: "처음 들어가서 느낀 분위기",
      body: "최근 여주목마에 실내수영장이 새롭게 오픈했다는 소식을 듣고 현장을 방문해 보았습니다.",
    },
    {
      heading: "둘러보며 확인한 부분",
      body: "실내수영장은 날씨 영향을 받지 않는다는 점이 가장 큰 장점으로 느껴졌습니다.",
    },
    {
      heading: "마무리",
      body: "여주목마는 식사와 카페, 휴식공간까지 함께 즐길 수 있는 복합 공간이었습니다.",
    },
  ],
  _meta: { llmGenerated: true, gpt55LlmPack: true },
};

const SPAM_CHANNEL = {
  title: "여주 현장목마",
  detailBody: "· 실내수영장 — 비교·예약 판단이 수월해요.\n· 로컬 매장 운영·예약 맥락",
  shortNotice: "안내",
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

assert("mission ui rescue blocked with research", !shouldAllowMissionUiRescue(INPUT));
assert("reference prompt has place example", buildNorthStarReferencePromptBlock("place").includes("여주목마"));

const place = tryFastChannelFromVerifiedBlog("place", GOOD_BLOG, INPUT);
assert("fast derive place", Boolean(place?.detailBody));
assert("derive place clean", !/수월/.test(place?.detailBody || ""));

const insta = deriveChannelFromVerifiedBlog("instagram", GOOD_BLOG, INPUT);
assert("derive insta", Boolean(insta?.lineBreakBody));
assert("derive insta hook", /물놀이|계절/.test(insta?.hook || ""));

const hygiene = applyCustomerChannelHygienePass(SPAM_CHANNEL, "place", INPUT);
const enforced = enforceCustomerChannelOutput(hygiene, "place", INPUT);
assert(
  "unsafe spam withheld or trimmed",
  enforced.withheld || !/수월/.test(getChannelFullText(enforced.pack || {}, "place"))
);

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nPASS: brand-content-customer-gate");
