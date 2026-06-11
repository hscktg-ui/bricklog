/**
 * GPT-5.5 전체 엔진 경로 감사 — Mission 패딩·카탈로그 결말이 LLM 원고에 주입되지 않는지
 */
import assert from "node:assert/strict";
import { applyHumanGradeFinishingPass } from "@/lib/content/editorQualityEngine.js";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess.js";
import { salvageBlogPackForDelivery } from "@/lib/generation/postVerifySalvage.js";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack.js";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate.js";
import { applyMissionProseGate } from "@/lib/content/missionProseGate.js";
import { deepenPackForSalvage } from "@/lib/content/blogLengthDeepen.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

const CATALOG_PHRASES = [
  /좌판·등받이·팔걸이를\s*함께\s*보면\s*선택이\s*수월/,
  /프랜차이즈\s*쇼룸\s*안내를\s*기준으로/,
];

const prevDominant = process.env.BRICLOG_GPT55_DOMINANT;
const prevKey = process.env.OPENAI_API_KEY;
process.env.BRICLOG_GPT55_DOMINANT = "true";
process.env.OPENAI_API_KEY = "sk-test-key-for-gpt55-engine-audit-0123456789";

const input = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스",
  industry: "가구",
  blogLengthTier: "medium",
};

function makeLlmPack() {
  return {
    title: "경기도 용인 에이스침대 스트레스리스 체험기",
    sections: [
      {
        heading: "쇼룸에 들어서며",
        body: "스트레스리스 체어를 보러 경기도 용인 에이스침대에 들렀어요. 전시 모델마다 좌판 깊이가 달라서, 식탁 높이에 맞춰 앉아 보는 순서로 비교했어요.",
      },
      {
        heading: "앉아 본 차이",
        body: "등받이 각도와 팔걸이 높이를 바꿔 보니, 오래 앉을 자리와 식사 자리에서 편한 지점이 달랐어요. 직원 안내로 당일 전시 구성을 메모해 두었어요.",
      },
      {
        heading: "정리",
        body: "사진만으로는 감이 안 오던 지지감을 직접 확인할 수 있었어요. 방문 전 예약·주차는 매장 안내를 기준으로 확인하면 됩니다.",
      },
    ],
    conclusion: "체험 후 본인 공간에 맞는 모델을 고르는 편이 좋았어요.",
    _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
  };
}

function assertNoCatalog(full, stage) {
  for (const re of CATALOG_PHRASES) {
    assert.ok(!re.test(full), `${stage}: catalog phrase leaked — ${re}`);
  }
}

function assertGpt55Meta(pack, stage) {
  const m = pack?._meta || {};
  assert.ok(
    m.gpt55Light ||
      m.gpt55LightDisplay ||
      m.gpt55SalvageLight ||
      m.gpt55V17Light ||
      m.gpt55PostWriteLight ||
      m.gpt55PrePublishChecks ||
      m.llmSalvageLight,
    `${stage}: expected gpt55 light meta`
  );
}

const ctx = { input, ...input };

let pack = makeLlmPack();

pack = applyMissionProseGate(pack, ctx);
assert.equal(pack._meta?.missionProseGate, undefined, "mission prose gate skipped for gpt55");

pack = ensureMissionProseTierLength(pack, ctx);
assert.equal(pack._meta?.missionProseTierRefill, undefined, "mission tier refill skipped");

pack = applyHumanGradeFinishingPass(pack, input, ctx);
assert.ok(pack._meta?.gpt55Light, "human grade finishing uses gpt55 light");
assertNoCatalog(getBlogFullText(pack), "humanGradeFinishingPass");

pack = applyV17PostWritePack(pack, ctx, "blog");
assert.ok(pack._meta?.gpt55V17Light, "v17 uses gpt55 light");
assertNoCatalog(getBlogFullText(pack), "v17PostWrite");

pack = salvageBlogPackForDelivery(pack, input);
assertGpt55Meta(pack, "salvage");
assertNoCatalog(getBlogFullText(pack), "salvage");

const deepened = deepenPackForSalvage(pack, 1800, ctx, input);
assert.equal(deepened._meta?.salvageDeepen, undefined, "salvage deepen skipped for gpt55");

pack = ensureBlogDisplayPack(pack, input);
assert.ok(pack._meta?.gpt55LightDisplay, "display pack uses gpt55 light");
assertNoCatalog(getBlogFullText(pack), "ensureBlogDisplayPack");
assert.ok(pack.fullCopyText, "display pack has fullCopyText");

if (prevDominant === undefined) delete process.env.BRICLOG_GPT55_DOMINANT;
else process.env.BRICLOG_GPT55_DOMINANT = prevDominant;
if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = prevKey;

console.log("OK: gpt55 engine audit — all delivery paths preserve LLM body without mission padding");
