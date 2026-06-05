/**
 * Editor Humanization Engine — 금지 AI 문장·선언형 조언 제거
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import {
  applyEditorHumanizationPack,
  isEditorHumanizationForbiddenSentence,
  isEditorHumanizationDeclarativeAdvice,
  scoreEditorHumanization,
  stripEditorHumanizationSentences,
} from "@/lib/product/editorHumanizationEngine.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";

const FORBIDDEN_SAMPLES = [
  "에이스침대 — 본인 일정·예산에 맞춰 정리해 두었어요.",
  "전시 소식 — 입력·공개 맥락을 바탕으로 한 운영 포인트.",
  "주제 표기 — 검색·조사용 단서로 남겨 두었어요.",
  "방문·예약은 확인 가능한 범위에서만 정리했습니다.",
  "매장·공식 안내 기준으로 확인하세요.",
];

const DECLARATIVE = [
  "프레임 높이와 침실 동선을 확인하는 것이 중요합니다.",
  "현장 조명 기준으로 확인하는 것이 좋습니다.",
];

const EXPERIENCE_KEEP = [
  "처음 침대를 보러 갔을 때는 디자인만 보면 될 줄 알았어요.",
  "막상 누워보니 프레임 높이와 침실 동선이 더 먼저 보였어요.",
  "사진에서는 밝게 보였는데 실제로 보니 생각보다 차분했어요.",
];

for (const line of FORBIDDEN_SAMPLES) {
  assert.ok(isEditorHumanizationForbiddenSentence(line), `forbidden: ${line.slice(0, 24)}`);
}
for (const line of DECLARATIVE) {
  assert.ok(isEditorHumanizationDeclarativeAdvice(line), `declarative: ${line.slice(0, 24)}`);
}
for (const line of EXPERIENCE_KEEP) {
  assert.ok(!isEditorHumanizationForbiddenSentence(line), `keep: ${line.slice(0, 24)}`);
}

const stripped = stripEditorHumanizationSentences(
  `${FORBIDDEN_SAMPLES[0]} ${EXPERIENCE_KEEP[1]} ${DECLARATIVE[0]}`
);
assert.ok(!/본인\s*일정/.test(stripped), "forbidden stripped");
assert.ok(/막상\s*누워보니/.test(stripped), "experience kept");
assert.ok(!/중요합니다/.test(stripped), "declarative stripped");

const input = {
  topic: "전시 소식",
  mainKeyword: "전시 소식",
  brandName: "에이스침대",
  region: "파주",
  industry: "furniture",
  contentPersona: "owner",
  blogLengthTier: "medium",
  researchFacts: ["오피모 전시 구성", "쇼룸 동선 체험"],
};

const pack = buildMissionProseFallbackPack(input);
const humanized = applyEditorHumanizationPack(pack, input);
const finished = applyHumanityFinishPass(humanized, { input }, "blog");
const full = getBlogFullText(finished);
const score = scoreEditorHumanization(full);

assert.equal(score.forbiddenHits, 0, "no forbidden in mission output", score);
assert.ok(score.declarativeHits < 4, "declarative capped", score);
assert.ok(/다녀|누워|쇼룸|매장|직접/.test(full), "field experience present");
assert.ok(!/입력·공개\s*맥락/.test(full), "meta context line gone");
assert.ok(!/본인\s*일정·예산에\s*맞춰/.test(full), "budget pad gone");

console.log("OK: editor humanization engine");
console.log("  score:", score.score, "arc:", score.arcRoles.join(","));
