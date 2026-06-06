/**
 * Director Context Engine — 전체 맥락 통합 브리프
 */
import assert from "node:assert/strict";
import {
  buildDirectorMasterBrief,
  collectDirectorFeedbackSources,
  assessDirectorFinalJudgment,
} from "../lib/product/directorContextEngine.js";

const brief = buildDirectorMasterBrief({
  brandName: "해신기획",
  topic: "블로그 마케팅",
  industry: "마케팅",
  userWritingBrief: "문장은 짧게, 정보 우선",
  brandFeedbackBrief: "광고 톤 줄이기",
  humanCorrectionBrief: "【사용자 수정 학습】\n- 광고·과장 문장 삭제",
  priorityBrief: "품질 5대 축",
  contextLockBrief: "업종: 마케팅",
});

assert.match(brief, /30년차 편집장/);
assert.match(brief, /Cursor 한 줄만이 아니다/);
assert.match(brief, /누적 맥락 반영/);
assert.match(brief, /사용자 수정 학습/);
assert.match(brief, /10초 안에/);

const sources = collectDirectorFeedbackSources({
  userWritingBrief: "x",
  brandFeedbackBrief: "y",
  humanCorrectionBrief: "z",
});
assert.ok(sources.length >= 4);
assert.ok(sources.some((s) => s.id === "humanCorrection"));
assert.ok(sources.some((s) => s.id === "mission"));

const pack = {
  title: "해신기획 마케팅",
  sections: [{ heading: "소개", body: "해신기획은 블로그 마케팅 대행입니다." }],
};
const judgment = assessDirectorFinalJudgment(pack, { brandName: "해신기획" }, { publishReady: true });
assert.ok(judgment.ok);

console.log("OK: director context engine —", sources.length, "sources");
