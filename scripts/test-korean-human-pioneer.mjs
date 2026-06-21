/**
 * Korean Human Pioneer Engine — research-grounded · salon/academy/craft
 */
import assert from "node:assert/strict";
import {
  applyKoreanHumanPioneerPass,
  assessKoreanHumanPioneer,
  isKoreanHumanPioneerEnabled,
  KOREAN_HUMAN_PIONEER_VERSION,
} from "../lib/product/koreanHumanPioneerEngine.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_KOREAN_HUMAN_PIONEER = "true";

assert.equal(isKoreanHumanPioneerEnabled(), true);

const robotic = {
  title: "수학플러스 여름 특강",
  sections: [
    {
      heading: "안내",
      body: "많은 분들이 여름 특강에 관심을 가지고 있습니다. 종합적으로 보면 도움이 됩니다. 확인하세요.",
    },
    {
      heading: "특징",
      body: "다음과 같습니다. 소개해 드립니다. 등록은 문의하세요.",
    },
    {
      heading: "정리",
      body: "도움이 되시길 바랍니다.",
    },
  ],
};

const input = {
  brandName: "수학플러스",
  region: "대구 동성로",
  topic: "여름방학 특강",
  industry: "학원",
  v4Speaker: "expert_info",
  researchFacts: [
    { fact: "여름방학 특강은 중1·중2 4주 과정" },
    { fact: "등록은 6월 말 선착순 8명" },
    { fact: "내신 대비 문제풀이 포함" },
  ],
};

const beforeBelief = scoreHumanBelief(getBlogFullText(robotic), input, robotic);
const polished = applyKoreanHumanPioneerPass(robotic, input, { force: true });
const after = assessKoreanHumanPioneer(polished, input);
const afterBelief = scoreHumanBelief(getBlogFullText(polished), input, polished);

assert.ok(polished._meta?.koreanHumanPioneerPass, "pioneer meta stamped");
assert.ok(afterBelief.score >= beforeBelief.score, "belief should not regress");
assert.ok(
  !/많은\s*분들|도움이\s*되시길|소개해\s*드립/.test(getBlogFullText(polished)),
  "brochure cliche stripped"
);
assert.ok(
  /비교|기준|확인|느낌|직접|보면/.test(getBlogFullText(polished)),
  "persona or experience anchor woven"
);

console.log(
  JSON.stringify(
    {
      version: KOREAN_HUMAN_PIONEER_VERSION,
      beforeBelief: beforeBelief.score,
      afterBelief: afterBelief.score,
      pioneerScore: after.score,
      meta: polished._meta?.koreanHumanPioneerAfter,
    },
    null,
    2
  )
);
console.log("OK: korean human pioneer engine");
