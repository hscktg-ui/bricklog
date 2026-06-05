/**
 * BRICLOG Editor Engine V95 — SSOT 검증
 */
import assert from "node:assert/strict";
import {
  detectForbiddenIntro,
  scoreIntroContextFirst,
  scoreEditorV95,
  applyEditorV95Pass,
} from "../lib/product/briclogEditorEngineV95.js";

const input = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
};

const badIntro = detectForbiddenIntro("오늘은 더건강하개를 소개해드리겠습니다.");
assert.equal(badIntro.ok, false);

const goodIntro = detectForbiddenIntro(
  "강아지 간식을 고를 때 생각보다 원재료를 먼저 보는 사람이 많다."
);
assert.equal(goodIntro.ok, true);

const goodPack = {
  title: "강아지 간식, 원재료부터 보게 된 이유",
  representativeTitle: "강아지 간식, 원재료부터 보게 된 이유",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "반려견을 키우다 보면 결국 가장 많이 고민하는 것이 먹는 것이다. 처음에는 몰랐어요. 생각보다 달랐는데, 왜 그런지 궁금해졌습니다.",
    },
    {
      heading: "매장에서 본 것",
      body: "직접 들러 다녀와 보니 진열이 깔끔했고, 직원이 알레르기 성분을 차분히 설명해 줬더라구요. 현장에서 확인한 행사 조건도 당일 안내로 정리됐습니다.",
    },
    {
      heading: "인상",
      body: "브랜드를 보기 전에 내 강아지 입장에서 봤다는 점이 인상적이었다. 비교할 때는 원재료·가격·보관 방법을 같이 보면 편했다.",
    },
    {
      heading: "선택 기준",
      body: "처음 키우는 분이나 성분을 따지는 분에게 맞는 편이다. 예산과 급여 일정만 정리해 두면 상담이 빨라진다.",
    },
  ],
  conclusion: "무리한 결정은 피하고 직접 확인한 뒤 선택하세요.",
};

const introScore = scoreIntroContextFirst(goodPack);
assert.ok(introScore.ok, "context-first intro", introScore);

const scored = scoreEditorV95(goodPack, input, input);
assert.ok(scored.editorPass, "editor v95 pass", scored);

const badPack = {
  ...goodPack,
  sections: [
    {
      heading: "소개",
      body: "안녕하세요. 오늘은 더건강하개 더건강하개 더건강하개 더건강하개 더건강하개 소개합니다.",
    },
  ],
};
const badScored = scoreEditorV95(badPack, input, input);
assert.equal(badScored.editorPass, false);

const fixed = applyEditorV95Pass(badPack, input, input);
assert.ok(!/^안녕하세요/m.test(fixed.sections[0].body));
assert.ok(fixed._meta?.editorV95Pass === false || fixed._meta?.editorEngineV95);

console.log("OK: editor engine v95 — intro, rhythm, pass, strip");
