/**
 * Human Column Prose — 카탈로그 스팸 → 사람 칼럼 서사 (파주 그랩앤고플라워 회귀)
 */
import assert from "node:assert/strict";
import {
  applyHumanColumnProsePass,
  scoreHumanColumnProseContamination,
} from "@/lib/product/humanColumnProseEngine.js";
import { buildFlowerExplainParagraphs } from "@/lib/product/briclogExplainEngine.js";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine.js";
import { splitPackSectionsForStructure } from "@/lib/content/blogLengthControl.js";
import { buildNaturalConcernHeading } from "@/lib/product/signatureWritingEngine.js";

const prevMission = process.env.BRICLOG_MISSION_ENFORCED;
process.env.BRICLOG_MISSION_ENFORCED = "true";
process.env.BRICLOG_MISSION = "true";

const input = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  mainKeyword: "여름철 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 키오스크, 만원대 꽃다발",
  blogLengthTier: "medium",
};

const badPack = {
  title: "파주 그랩앤고플라워, 여름철 꽃 추천 정리",
  sections: [
    {
      heading: "파주 그랩앤고플라워 — 여름철 꽃 추천 보러 갔을 때",
      body: "꽃을 처음 구매할 때 거베라는 관리 부담이 비교적 적어 부담 없이 고르기 좋았어요.\n\n파주 그랩앤고플라워에서 그랩앤고플라워 안내를 볼 때 조사해 둔 내용을 기준으로 비교해 보았어요.",
    },
    {
      heading: "파주 그랩앤고플라워 — 여름철 꽃 추천 보러 갔을 때 — 확인 포인트",
      body: "실제로 한 다발만으로도 풍성해 보이는 느낌이 있어, 선물용 만족도가 높은 편입니다.\n\n밝은 톤 덕분에 사진·인증샷에서도 잘 보이는 편이라, 생각보다 선물 만족도가 높어요.",
    },
    {
      heading: "파주 그랩앤고플라워 — 여름철 꽃 추천 보러 갔을 때 — 확인 포인트",
      body: "만원대 꽃다발 라인에서 거베라 조합을 바로 맞출 수 있어, 생각보다 부담 없이 고르는 편입니다.\n\n키오스크 주문 후 픽업함 수령이라 대기 없이 마무리할 수 있어, 짧은 일정에도 실제로 맞추기 편한 편입니다.",
    },
  ],
  conclusion:
    "파주 그랩앤고플라워 여름철 꽃 추천 — 그랩앤고플라워에서 궁금한 점은 전화·방문으로 확인하시면 일정에 맞춰 안내드릴 수 있어요.",
};

const beforeScore = scoreHumanColumnProseContamination(badPack, input);
assert.equal(beforeScore.ok, false, "bad pack should fail contamination score");

const cleaned = applyHumanColumnProsePass(badPack, input, { force: true });
const full = [
  cleaned.title,
  ...(cleaned.sections || []).map((s) => `${s.heading}\n${s.body}`),
  cleaned.conclusion,
]
  .filter(Boolean)
  .join("\n");

assert.ok(!/확인\s*포인트|보러\s*갔을\s*때|조사해\s*둔|생각보다.*만족도|키오스크\s*주문\s*후\s*픽업함/.test(full));
assert.ok(/여름|수국|해바라기|거베라|라넌큘러스/.test(full) || cleaned.sections.length >= 2);

const headings = (cleaned.sections || []).map((s) => s.heading);
assert.ok(headings.some((h) => /어떤 꽃|거베라|라넌큘러스|보관|마무리/.test(h)));

const p = deriveTopicWritingContext(input);
const narrative = buildFlowerExplainParagraphs(p, input).join("\n");
assert.ok(!/만족도|확인\s*포인트|조사해\s*둔/.test(narrative));
assert.ok(/여름|수국|해바라기|거베라|라넌큘러스/.test(narrative));

const concern = buildNaturalConcernHeading(input);
assert.ok(!/보러\s*갔을\s*때/.test(concern));

const fat = {
  sections: [
    {
      heading: concern,
      body: narrative.split("\n\n").concat(narrative.split("\n\n")).join("\n\n"),
    },
    { heading: "이용 안내", body: "추가 문단입니다. ".repeat(40) },
  ],
};
const split = splitPackSectionsForStructure(fat, 3, input);
assert.ok(split.sections.length >= 3);
assert.ok(!split.sections.some((s) => /확인\s*포인트/.test(s.heading || "")));

if (prevMission === undefined) delete process.env.BRICLOG_MISSION_ENFORCED;
else process.env.BRICLOG_MISSION_ENFORCED = prevMission;

console.log("OK: human column prose engine");
