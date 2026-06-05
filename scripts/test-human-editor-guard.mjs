/**
 * Human Editor Guard — 체크리스트형 블로그 후기 보정
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import {
  applyHumanEditorGuardPass,
  scoreHumanEditorGuard,
} from "@/lib/content/humanEditorGuardPass.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine.js";
import { scoreEditorV95 } from "@/lib/product/briclogEditorEngineV95.js";

process.env.BRICLOG_MISSION = "true";

const AI_SAMPLE = `용인 더건강하개 솔직 후기, 수제간식업체 소개
왜 수제간식업체 소개를 찾게 되는가
솔직히 말하면 용인 더건강하개 가보니까 괜찮았어요.
이 지역 방문 전 영업 시간·주차·예약 가능 여부를 확인하고 갔어요.
용인 더건강하개 수제간식업체 소개 — 이용 절차·대기·상담 흐름을 먼저 파악해 두었어요.
비교할 때 가격·조건·사후 지원을 표로 정리해 두니 재방문 상담이 빨라졌어요.
더건강하개 수제간식업체 소개 — 이 매장는 무첨가 원료로 만든 프리미엄 수제 간식을 제공한다.도 매장에서 들었어요.
주차·영업 시간·예약 가능 여부는 방문 전에 전화로 확인했어요.
매장에서 수제간식업체 소개 관련 안내를 직접 들었어요.`;

const input = {
  topic: "수제간식업체 소개",
  mainKeyword: "수제간식업체 소개",
  brandName: "더건강하개",
  region: "용인",
  industry: "pet",
  contentPersona: "owner",
  lengthTier: "medium",
  researchFacts: [
    "무첨가 원료로 만든 프리미엄 수제 간식",
    "펫푸드 1급 자격증 보유",
    "2023년 용인 기흥구 오픈",
  ],
};

const before = scoreHumanEditorGuard(AI_SAMPLE, input);
assert.ok(before.issues.length >= 2, "AI sample should fail guard", before);

const pack = buildMissionProseFallbackPack(input);
const ctx = { ...input, input };
const guarded = applyHumanEditorGuardPass(pack, ctx, input);
const guardOnly = getBlogFullText(guarded);
const afterGuard = scoreHumanEditorGuard(guardOnly, input);

let finished = applyHumanityFinishPass(guarded, ctx, "blog");
const full = getBlogFullText(finished);

const after = scoreHumanEditorGuard(full, input);
const checklist = scoreChecklistVoice(full, finished);
const editor = scoreEditorV95(finished, ctx, input);

assert.ok(!/도\s*매장에서\s*들었어요/.test(full), "awkward research tail");
assert.ok(countTopic(full, "수제간식업체 소개") <= 6, "topic spam capped");
assert.ok(checklist.templateHits <= 4, "checklist templates reduced", checklist);
assert.ok(/무첨가|펫푸드|간식|강아지/.test(full), "pet-specific field");
assert.ok(!/생겼었다|봤었다|돌아봤었다|했었다/.test(guardOnly), "mission guard keeps haeyo endings");
assert.ok(
  (afterGuard.checks?.esseoCount || 99) <= 20,
  "esseo endings not runaway after guard",
  afterGuard.checks
);
assert.ok(
  !/방문\s*전에.*방문\s*전에/.test(guardOnly) &&
    !/비교할\s*때\s*가격·조건·이용\s*절차/.test(guardOnly),
  "checklist clichés trimmed"
);

console.log("OK: human editor guard — pet snack mission prose");
console.log("  guard score:", before.score, "→", after.score);
console.log("  checklist templateHits:", checklist.templateHits);

function countTopic(text, topic) {
  if (!topic) return 0;
  const esc = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(esc, "g")) || []).length;
}
