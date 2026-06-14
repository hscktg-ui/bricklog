/**
 * Korean orthography — NIKL particle · spelling pass
 */
import assert from "node:assert/strict";
import {
  applyKoreanOrthographyToText,
  applyKoreanOrthographyToBlogPack,
  detectKoreanOrthographyIssues,
  KOREAN_ORTHOGRAPHY_PASS_SCORE,
  pickObjectParticle,
  pickTopicParticle,
} from "../lib/korean/koreanOrthographyEngine.js";

assert.equal(pickObjectParticle("매장"), "을");
assert.equal(pickObjectParticle("카페"), "를");
assert.equal(pickTopicParticle("매장"), "은");
assert.equal(pickTopicParticle("카페"), "는");

const bad = "매장는 분위기가 좋았고 이용를 하기 편했어요. 되요 안되요 수있어요.";
const fixed = applyKoreanOrthographyToText(bad, { brandName: "꽃담" }, "blog");
assert.ok(fixed.includes("매장은"), fixed);
assert.ok(fixed.includes("이용을"), fixed);
assert.ok(fixed.includes("돼요"), fixed);
assert.ok(!fixed.includes("수있"), fixed);

const afterAudit = detectKoreanOrthographyIssues(fixed, { brandName: "꽃담" });
assert.ok(afterAudit.score >= KOREAN_ORTHOGRAPHY_PASS_SCORE, afterAudit);

const pack = applyKoreanOrthographyToBlogPack(
  {
    title: "해운대 꽃담 브랜드은 소개",
    sections: [
      { heading: "방문 계기", body: "어버이날 꽃다발를 고르다가 꽃담를 알게 됐어요." },
    ],
    conclusion: "일정만 정리해 주세요.",
  },
  { brandName: "꽃담", region: "부산 해운대", topic: "어버이날 꽃다발" }
);
assert.ok(pack._meta?.koreanOrthography?.pass === true, pack._meta?.koreanOrthography);
assert.ok(pack._meta.koreanOrthography.score >= KOREAN_ORTHOGRAPHY_PASS_SCORE);

const body = pack.sections[0].body;
assert.ok(body.includes("꽃다발을") || body.includes("꽃담을"), body);

console.log(
  "OK: korean orthography — score",
  pack._meta.koreanOrthography.score,
  "pass",
  pack._meta.koreanOrthography.pass
);
