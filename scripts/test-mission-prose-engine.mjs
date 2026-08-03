/**
 * Mission Prose Engine — 업종 공통 (특정 브랜드 하드코딩 없음)
 */
process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine.js";
import {
  buildMissionExperienceCatalog,
  filterMissionExperienceParagraphs,
  isMissionChecklistPad,
  isMissionBrochurePad,
  polishMissionProsePack,
} from "@/lib/product/missionProseEngine.js";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine.js";
import { buildHumanStoryProblemOpeningLead } from "@/lib/product/humanStoryEngine.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { resolveBlogLengthTier } from "@/lib/constants.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate.js";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess.js";

const cases = [
  {
    id: "salon",
    input: {
      brandName: "테스트살롱",
      region: "서울 강남",
      industry: "미용실",
      topic: "두피 염색",
      blogLengthTier: "short",
      batchLocalFinish: true,
      researchFacts: [
        { fact: "서울 강남 테스트살롱 두피·모발 상담 후 염색 진행" },
        { fact: "시술 전 톤·손상 정도를 상담에서 확인" },
        { fact: "시술 후 관리 방법을 당일 안내" },
      ],
    },
    forbidden: /파주|운정미용/,
    lead: /염색|두피|걱정/,
  },
  {
    id: "flower",
    input: {
      brandName: "테스트꽃집",
      region: "부산 해운대",
      industry: "꽃집",
      topic: "꽃다발",
      blogLengthTier: "short",
      batchLocalFinish: true,
      researchFacts: [
        { fact: "부산 해운대 테스트꽃집 생화 진열·포장 안내" },
        { fact: "시즌 톤 꽃과 리본 옵션 확인" },
        { fact: "당일 픽업·배송 시간대 안내" },
      ],
    },
    forbidden: /모션베드|수제간식/,
    lead: /꽃을\s*사야|막히|고르면|정리해\s*두면/,
  },
  {
    id: "flower_grab",
    industryKey: "flower",
    input: {
      brandName: "그랩앤고플라워",
      region: "파주",
      industry: "꽃집",
      topic: "오늘의꽃",
      mainKeyword: "파주 꽃집",
      blogLengthTier: "short",
      batchLocalFinish: true,
      researchFacts: [
        { fact: "파주 그랩앤고플라워 무인·픽업 안내" },
        { fact: "오늘의꽃 시즌 구성 확인" },
        { fact: "포장·리본 옵션 안내" },
      ],
    },
    forbidden:
      /시즌\s*꽃재|확인된\s*범위|자주\s*문의|짚을\s*점|조금씩\s*달라집니다|여름철에는\s*시원한\s*톤|어디에\s*놓을지\s*먼저\s*생각/,
    lead: /꽃|막히|직접|가보|헷갈|고르면|정리/,
  },
  {
    id: "cafe",
    input: {
      brandName: "테스트카페",
      region: "서울 마포",
      industry: "카페",
      topic: "브런치",
      blogLengthTier: "short",
      batchLocalFinish: true,
      researchFacts: [
        { fact: "서울 마포 테스트카페 브런치 메뉴 운영" },
        { fact: "시즌 메뉴와 기본 메뉴 구분 안내" },
        { fact: "좌석·콘센트 안내" },
      ],
    },
    forbidden: /파주|두피\s*진단/,
    lead: /브런치|카공|검색|정리|고르/,
  },
  {
    id: "marketing",
    input: {
      brandName: "해신기획",
      region: "파주",
      industry: "마케팅",
      topic: "블로그 마케팅",
      blogLengthTier: "short",
      batchLocalFinish: true,
      researchFacts: [
        { fact: "파주 해신기획 블로그 마케팅 상담" },
        { fact: "채널별 초안·검수 흐름 안내" },
        { fact: "운영 계획·발행 준비도 점검" },
      ],
    },
    forbidden: /쇼룸|누워보|프레임·침실|응대을|이용를|쇼룸를/,
    lead: /블로그|마케팅|막히|정리|시작/,
    maxVisitGuidePads: 1,
  },
];

assert.ok(isMissionChecklistPad("비교할 때 가격·조건·이용 절차를 표로 정리"));
assert.ok(!isMissionChecklistPad("매장에서 브런치 메뉴 안내를 직접 들었어요."));
assert.ok(isMissionBrochurePad("시즌 꽃재에 따라 색감·가격대가 달라질 수 있어요."));
assert.ok(
  isMissionBrochurePad("그랩앤고플라워에서 자주 문의되는 조건을 확인된 범위에서 정리했어요.")
);
assert.ok(!isMissionBrochurePad("진열대에서 여름 톤 꽃을 하나씩 비교해 봤어요."));

const grabInput = {
  brandName: "그랩앤고플라워",
  region: "파주",
  industry: "꽃집",
  topic: "오늘의꽃",
};
assert.equal(isInformationalTopicInput(grabInput), false, "flower retail uses visit tone");

for (const c of cases) {
  const expectedKey = c.industryKey || c.id;
  assert.equal(resolveBriclogIndustryKey(c.input), expectedKey);
  const p = deriveTopicWritingContext(c.input);
  const catalog = buildMissionExperienceCatalog(p, c.input, []);
  assert.ok(catalog.length >= 2, `${c.id} catalog ${catalog.length}`);
  const lead = buildHumanStoryProblemOpeningLead(c.input);
  assert.ok(c.lead.test(lead), `${c.id} lead: ${lead}`);

  let pack = buildMissionProseFallbackPack(c.input);
  pack = applyHumanityFinishPass(pack, { input: c.input }, "blog");
  pack = ensureMissionProseTierLength(pack, c.input);
  const full = getBlogFullText(pack);
  const tier = resolveBlogLengthTier(c.input.blogLengthTier || "medium");
  const chars = countBlogBodyCharsWithSpaces(pack);
  assert.ok(chars >= 600, `${c.id} min body chars, got ${chars}`);
  assert.ok(pack.sections?.length >= 2, `${c.id} sections`);
  assert.ok(!c.forbidden.test(full), `${c.id} cross leak`);
  assert.ok(!/이용\s*절차·대기·상담\s*흐름을\s*먼저\s*파악/.test(full), `${c.id} checklist pad`);
  assert.ok(c.lead.test(full.slice(0, 400)), `${c.id} opening in pack`);
  if (c.maxVisitGuidePads != null) {
    const visitPads = (full.match(/에\s*직접\s*가서\s+.+?\s+관련\s+안내를\s+들었어요/g) || []).length;
    assert.ok(visitPads <= c.maxVisitGuidePads, `${c.id} visit guide spam: ${visitPads}`);
  }
}

const polished = polishMissionProsePack(
  {
    sections: [
      {
        heading: "test",
        body: "파주미용실추천 받고 다녀왔어요.\n\n비교할 때 표로 정리했어요.\n\n염색은 하고 싶은데 두피가 먼저 걱정되는 날이 있다. 매장에서 상담을 들었어요.",
      },
    ],
  },
  { region: "서울 강남", industry: "미용실", topic: "두피 염색" }
);
const body = polished.sections?.[0]?.body || "";
assert.ok(!/파주/.test(body));
assert.ok(!/표로\s*정리/.test(body));
assert.ok(/염색|두피/.test(body));

const salonInput = cases[0].input;
const skinnyLlm = {
  title: "테스트살롱 솔직 후기",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "염색은 하고 싶은데 두피가 먼저 걱정되는 날이 있다.",
    },
    { heading: "직접 가 본 뒤", body: "매장에서 상담을 들었어요." },
    { heading: "비교할 때", body: "톤 차이를 짧게 봤어요." },
  ],
  conclusion: "본인 기준으로 정리해 봤어요.",
  _meta: { llmGenerated: true },
};
let llmPack = applyV17PostWritePack(skinnyLlm, { input: salonInput }, "blog");
llmPack = ensureMissionProseTierLength(llmPack, { input: salonInput });
const llmChars = countBlogBodyCharsWithSpaces(llmPack);
assert.ok(llmChars >= 1200, `llm path expanded, got ${llmChars}`);
assert.ok(
  llmPack._meta?.missionProseTierRefill ||
    llmPack._meta?.missionProseTierOk ||
    llmChars >= 1200
);
assert.ok(/염색|두피/.test(getBlogFullText(llmPack).slice(0, 200)));

console.log("OK: mission prose engine — multi-industry, checklist filter, region lock, llm tier");
