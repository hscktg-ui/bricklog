/**
 * Placeholder contamination gate regression
 */
import assert from "node:assert/strict";
import {
  detectPlaceholderContamination,
  detectEmptyInputVars,
  PLACEHOLDER_CONTAMINATION_FAIL_COUNT,
} from "../lib/content/placeholderContaminationEngine.js";
import { capTopicMentionsOnPack } from "../lib/content/humanEditorGuardPass.js";

const INPUT = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴 오픈",
  mainKeyword: "브런치",
  industry: "카페",
};

assert.ok(detectEmptyInputVars(INPUT).ok);
assert.ok(!detectEmptyInputVars({ brandName: "a" }).ok);

const dirty =
  "이용 볼 때 이용 관련해서 를 보면 전시 소식 이 구성 에 직접 가서 확인.";
const check = detectPlaceholderContamination(dirty, INPUT);
assert.ok(check.counts.total >= PLACEHOLDER_CONTAMINATION_FAIL_COUNT);
assert.ok(check.reasons.includes("placeholder_contamination"));

const pack = {
  sections: [{ heading: "a", body: dirty }],
  conclusion: "",
};
const capped = capTopicMentionsOnPack(
  {
    sections: [
      {
        heading: "브런치",
        body: `${INPUT.topic} ${INPUT.topic} ${INPUT.topic} ${INPUT.topic} ${INPUT.topic}`,
      },
    ],
  },
  INPUT,
  2
);
assert.ok(!String(capped.sections[0].body).includes("이용"), "cafe cap should not inject bare 이용");

console.log("OK: placeholder-contamination", {
  dirtyHits: check.counts.total,
  cappedBody: capped.sections[0].body.slice(0, 80),
});
