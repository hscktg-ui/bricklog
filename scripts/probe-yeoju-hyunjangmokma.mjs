/**
 * 여주 현장목마 실내 수영장 오픈 — 패치 전 스팸 vs 패치 후 송출 비교
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { buildDeliverableChannelFallback } from "../lib/llm/channelDeliveryFallback.js";
import { finishChannelPack } from "../lib/product/channelQualityStack.js";
import { applyWriterSovereignDeliveryPass } from "../lib/product/writerSovereignPipeline.js";
import { applyRegionColumnNaturalizePass } from "../lib/content/regionColumnNaturalizeEngine.js";
import { stripTemplateBoilerplateFromPack } from "../lib/content/templateBoilerplateEngine.js";
import { assessReadAloudHumanGate } from "../lib/quality/readAloudHumanGate.js";
import { assessTemplateBoilerplateSpam } from "../lib/content/templateBoilerplateEngine.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_WRITER_SOVEREIGN = "true";

const INPUT = {
  brandName: "현장목마",
  region: "여주",
  topic: "실내 수영장 오픈",
  mainKeyword: "실내 수영장 오픈",
  industry: "레저/체험",
  purposeType: "visit",
  blogLengthTier: "short",
  v4Speaker: "plain_review",
  researchFacts: [
    { axis: "brand", fact: "목장 내 실내 수영장이 새로 오픈해 사계절 이용이 가능함" },
    { axis: "brand", fact: "승마 체험과 수영·휴식을 하루 코스로 묶어 안내함" },
    { axis: "region", fact: "여주 신륵사·세종대왕릉 인근 당일 방문 코스와 연계하기 좋음" },
    { axis: "topic", fact: "오픈 초기 운영 시간·이용 요금은 매장 공지·전화 상담으로 확인하는 편이 안전함" },
  ],
};

const PRE_PATCH_BLOG = {
  title: "여주 현장목마 실내 수영장 오픈 — 방문·상담 정리",
  sections: [
    {
      heading: "실내 수영장 오픈, 찾게 된 계기",
      body: "여주 현장목마 — 근처 현장목마 — 근처 현장목마 — 근처 현장목마 — 현장 근처목마 — 이 지역 현장목마 — 그다음 이 지역 현장목마 — 정리하면 근처목마 안내는 직접 가 본 뒤 본인 기준으로 맞춰 보면 될 것 같아요. 그다음 처음 현장목마 실내 수영장 오픈 관련해 근처목마 — 이 지역 로컬 매장 운영·예약 맥락. 현장 근처목마 — 현장 근처목마 기준으로 보면 설명이 이어집니다. 실내 수영장 오픈 볼 때 어떤 순서로 비교하면 덜 헷갈릴까요. 실내 수영장 오픈을 처음 정리할 때 — 이 지역목마에서 실제로 비교해 보면 실내 수영장 오픈을 고를 때 기준이 달라집니다. 현장목마 실내 수영장 오픈 관련해 실내 수영장 오픈 — 운영·예약 조건은 공식 안내 기준. 이 지역 현장목마 — 확인해 보면 현장목마 — 근처 로컬 매장 운영·예약 맥락 — 이 지역목마 이 현장과 맞어요.",
    },
    {
      heading: "현장 근처목마에 들어서서 본 첫인상",
      body: "이 지역 현장목마에 직접 들어가 실내 수영장 오픈을 눈으로 확인했어요. 근처 이 지역목마 — 근처 이 지역목마 — 같은 흐름으로 이 지역 현장목마 — 이 지역 현장목마 — 이 지역 현장목마 — 한 번 더 다른 매장과 비교해 보면 현장목마만의 기준이 분명했어요. 현장 근처목마 — 현장 근처목마 — 근처목마 — 이 지역 로컬 매장 운영·예약 맥락 — 현장목마 안내 기준으로 정리했어요. 이 지역 현장목마 기준으로 보면 근처목마 실내 수영장 오픈 관련해 실내 수영장 오픈 — 운영·예약이 납득돼요. 이 지역 현장목마에서는 실내 수영장 오픈·실내 수영장 오픈 문의 구성을 함께 살보면 기준이 잡혀요.",
    },
    {
      heading: "실내 수영장 오픈 고를 때 달라진 기준",
      body: "이 지역 현장목마 — 근처 이 지역목마 — 마지막으로 남은 인상은 매장 분위기와 대표 서비스 체감이었어요. 근처 이 지역목마 — 현장 근처목마 — 그다음 근처 이 지역목마 — 근처 이 지역목마 — 근처 이 지역목마 — 근처 이 지역목마 — 같은 기준으로 현장 근처목마 — 이 지역 현장목마 — 근처 이 지역목마 — 이 지역 현장목마 — 그다음 이 지역 현장목마 — 이 지역목마 안내를 비교해 보니 고를 때 기준이 조금씩 보였더라구요.",
    },
    {
      heading: "두 가지 안을 놓고 본 차이",
      body: "실내 수영장 오픈을 비교해 보니 고를 때 기준이 조금씩 보였어요. 현장 근처목마 — 이 지역 현장목마 — 그 흐름 그대로 현장에서 직접 만져보고 앉아보며 차이를 느꼈어요. 이 지역 현장목마 — 근처 이 지역목마 — 현장 근처목마 — 현장 근처목마 — 현장 근처목마 — 현장 근처목마 — 그다음 근처 이 지역목마 — 이 지역 현장목마 — 행사 전후 가격 차이가 있는지도 함께 비교해 보세요.",
    },
    {
      heading: "실내 수영장 오픈 — 아쉬웠던 부분도 짧게",
      body: "근처 이 지역목마 — 현장 근처목마 — 같은 기준으로 비슷해 보이는 구성도 써 보면 체감이 달랐어요. 현장 근처목마 — 이 지역 현장목마 — 이 지역 현장목마 — 근처 이 지역목마에서는 이 지역목마 안내·현장목마 소개 이용 구성을 함께 살보면 기준이 잡혀요. 근처 이 지역목마 실내 수영장 오픈 — 일정·비용은 상담 기준으로 확인하시면 돼요.",
    },
    {
      heading: "솔직 정리, 근처목마 실내 수영장 오픈",
      body: "정리하면 실내 수영장 오픈은 직접 가 본 뒤 본인 기준으로 맞춰 보면 될 것 같아요. 이 지역 현장목마 — 이 지역 현장목마 — 그다음 이 지역 현장목마 — 근처 이 지역목마 — 이 지역 현장목마 — 이 지역 현장목마 — 현장 근처목마 — 왜 근처목마 안내를 찾게 됐는지 — 방문·상담 때문에 상담 전에 기준부터 정리해 봤어요.",
    },
  ],
  conclusion:
    "근처 이 지역목마 실내 수영장 오픈 — 매장에서 직접 확인한 뒤 본인 기준으로 정리해 봤어요. 방문·상담에 맞는지는 당일 안내를 기준으로 다시 보면 돼요.",
  _meta: { gpt55LlmPack: true, llmOriginated: true },
};

const PRE_PATCH_PLACE = {
  title: "여주 현장목마 실내 수영장 오픈",
  shortNotice: "여주 현장목마 실내 수영장 오픈 소식",
  detailBody:
    "· 그다음 처음 현장목마 실내 수영장 오픈 관련해 근처목마 — 이 지역 로컬 매장 운영·예약 맥락.\n· 여주 여주목마, 실내 수영장 오픈 소식 전해드려요 자연스럽게 서비스·예약 일정은 매장·시기마다 달라질 수 있어요.\n· > · 방문·예약은 플레이스 공지와 전화 문의로 확인할 수 있으며, 주차·영업 시간도 같은 경로에서 함께 안내드리고 있어요.\n· 현장목마 실내 수영장 오픈 관련해 실내 수영장 오픈 — 운영·예약 조건은 공식 안내 기준.",
  shortBody: "여주 현장목마 실내 수영장 오픈",
  body: "여주 현장목마 실내 수영장 오픈",
};

const PRE_PATCH_INSTA = {
  title: "여주 현장목마",
  caption:
    "📌 처음 현장목마 실내 수영장 오픈 관련해 근처목마 — 이 지역 로컬 매장 운영·예약 맥락.\n\n🔎 여주목마를 찾아주시는 분들께 여주 에서도 편하게 만나 뵙겠어요.\n\n언제나 어디서나 여주목마는 오늘도 열려 있어요.\n\n🌼 — 여주목마 · 프로필·플레이스에서 위치 확인.\n\n생각보다 저장해 두고 싶어지는 순간이었어요.\n\n✔ 검색만 하다 보면 기준이 많아 막히는 순간",
  body: "여주 현장목마 실내 수영장 오픈",
};

function countSpam(text = "") {
  const t = String(text || "");
  const patterns = [
    ["근처목마", /근처목마/g],
    ["이 지역목마", /이 지역목마/g],
    ["현장 근처목마", /현장 근처목마/g],
    ["이 지역 현장목마", /이 지역 현장목마/g],
    ["기준이 달라집니다", /기준이 달라집니다/g],
    ["안내 기준으로 정리", /안내\s*기준으로\s*정리/g],
    ["에서 실제로 비교해 보면", /에서\s*실제로\s*비교해\s*보면/g],
    ["검색만 하다 보면", /검색만 하다 보면/g],
  ];
  return Object.fromEntries(
    patterns.map(([k, re]) => [k, (t.match(re) || []).length])
  );
}

function printSpam(label, text) {
  const c = countSpam(text);
  console.log(`\n--- ${label} spam counts ---`);
  for (const [k, v] of Object.entries(c)) {
    if (v > 0) console.log(`  ${k}: ${v}`);
  }
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  console.log(`  TOTAL: ${total}`);
  return { c, total };
}

function trimPreview(text, max = 900) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

// 1) 패치 전 원문 스팸 카운트
const preBlogFull = getBlogFullText(PRE_PATCH_BLOG);
printSpam("PRE-PATCH blog", preBlogFull);

// 2) 패치 파이프라인만 (sovereign + region + template)
let trimmed = applyWriterSovereignDeliveryPass(PRE_PATCH_BLOG, INPUT);
trimmed = applyRegionColumnNaturalizePass(trimmed, INPUT);
trimmed = stripTemplateBoilerplateFromPack(trimmed, INPUT);
const trimFull = getBlogFullText(trimmed);
const trimSpam = printSpam("POST-PATCH trim-only on pre-spam", trimFull);
const trimGate = assessReadAloudHumanGate(trimmed, INPUT);
const trimTpl = assessTemplateBoilerplateSpam(trimmed);
console.log("\nread-aloud gate (trim pre-spam):", {
  ok: trimGate.ok,
  shouldWithhold: trimGate.shouldWithhold,
  hardReasons: trimGate.hardReasons?.slice(0, 5),
});
console.log("template boilerplate:", trimTpl.ok, trimTpl.issues?.slice(0, 3));

// 3) 신규 생성 — mission fallback + full delivery
let fresh = buildMissionProseFallbackPack(INPUT);
fresh = finalizeContentQualityForDelivery(fresh, INPUT, "blog", { forceRedelivery: true });
const freshFull = getBlogFullText(fresh);
const freshSpam = printSpam("POST-PATCH fresh mission+delivery", freshFull);
const freshGate = assessReadAloudHumanGate(fresh, INPUT);
console.log("\nread-aloud gate (fresh):", {
  ok: freshGate.ok,
  shouldWithhold: freshGate.shouldWithhold,
  hardReasons: freshGate.hardReasons?.slice(0, 5),
});
console.log("delivery meta:", {
  writerSovereign: fresh._meta?.writerSovereignPass,
  regionNaturalize: fresh._meta?.regionColumnNaturalize,
  contentQualityDelivered: fresh._meta?.contentQualityDelivered,
  goldenVerdict: fresh._meta?.contentEvaluation?.verdict || fresh._meta?.goldenGate?.verdict,
});

// 4) 채널
const place = finishChannelPack(
  "place",
  buildDeliverableChannelFallback("place", {
    input: INPUT,
    bestPack: PRE_PATCH_PLACE,
  }).pack,
  { input: INPUT }
);
const placeFull = getChannelFullText(place, "place");
printSpam("POST-PATCH place fallback", placeFull);

const insta = finishChannelPack(
  "instagram",
  buildDeliverableChannelFallback("instagram", {
    input: INPUT,
    bestPack: PRE_PATCH_INSTA,
  }).pack,
  { input: INPUT }
);
const instaFull = getChannelFullText(insta, "instagram");
printSpam("POST-PATCH insta fallback", instaFull);

// 5) optional LLM if keys present
let llmNote = "skipped (no OPENAI_API_KEY)";
if (process.env.OPENAI_API_KEY) {
  try {
    const { ensureBlogDelivery } = await import("../lib/generation/ensureBlogDelivery.js");
    const r = await ensureBlogDelivery(
      {
        ...INPUT,
        researchEnabled: true,
        researchMode: "v2_axis",
        v2AxisRequired: true,
        researchFacts: INPUT.researchFacts,
      },
      { setPipelineStep: () => {} }
    );
    const llmPack = finalizeContentQualityForDelivery(r.blogContent || {}, INPUT, "blog", {
      forceRedelivery: true,
    });
    const llmFull = getBlogFullText(llmPack);
    printSpam("POST-PATCH LLM ensureBlogDelivery", llmFull);
    llmNote = `ok withheld=${r.withheld} mode=${r.mode} chars=${llmFull.replace(/\s/g, "").length}`;
  } catch (e) {
    llmNote = `failed: ${e.message}`;
  }
}
console.log("\nLLM path:", llmNote);

console.log("\n========== PRE-PATCH blog excerpt ==========");
console.log(trimPreview(preBlogFull, 600));
console.log("\n========== POST-PATCH fresh blog full ==========");
console.log(freshFull);
console.log("\n========== POST-PATCH place ==========");
console.log(placeFull);
console.log("\n========== POST-PATCH insta ==========");
console.log(instaFull);

console.log("\nSUMMARY", {
  preSpamTotal: Object.values(countSpam(preBlogFull)).reduce((a, b) => a + b, 0),
  trimSpamTotal: trimSpam.total,
  freshSpamTotal: freshSpam.total,
});
