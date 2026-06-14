/**
 * LLM 원고 — 검수 실패·Mission 모드에서도 UI 배달 보존
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

process.env.BRICLOG_MISSION = "true";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = join(root, "artifacts", "probe-tea-cafe", "llm-parsed.json");

const { resolveBlogUiDelivery } = await import(
  "../lib/generation/postVerifySalvage.js"
);
const { deliverWithOptionalPostVerify } = await import(
  "../lib/generation/ensureBlogDelivery.js"
);
const { requiresV2ResearchGate } = await import("../lib/content/v2PipelineGate.js");
const {
  finalizeContentQualityForDelivery,
  isLlmOriginatedPack,
} = await import("../lib/product/contentQualityDelivery.js");

const pipelineInput = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴",
  industry: "티카페",
  blogLengthTier: "medium",
  v2PreWriteVerified: true,
  v2ResearchReady: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
};

let pack;
try {
  pack = JSON.parse(readFileSync(samplePath, "utf8"));
  pack._meta = {
    ...(pack._meta || {}),
    llmGenerated: true,
    generationMode: "llm_openai",
  };
} catch {
  pack = {
    representativeTitle: "경주 다온티하우스 가을 티 메뉴",
    sections: [
      { heading: "가을 시즌 티", body: "경주 다온티하우스에서 가을 시즌 티 메뉴를 맛볼 수 있어요. " + "다실 분위기에서 차를 즐기기 좋습니다. ".repeat(40) },
      { heading: "방문 안내", body: "예약과 주차는 매장 안내를 확인하세요. " + "경주 한옥 거리 산책 후 들르기 좋아요. ".repeat(35) },
      { heading: "메뉴 구성", body: "시그니처 티와 디저트 세트를 비교해 보세요. " + "가을 한정 블렌드도 준비되어 있습니다. ".repeat(30) },
    ],
    _meta: { llmGenerated: true, generationMode: "llm_openai" },
  };
}

assert.ok(isLlmOriginatedPack(pack), "fixture is LLM pack");

const polished = finalizeContentQualityForDelivery(pack, pipelineInput, "blog");
assert.ok(polished?.sections?.length >= 2, "polish keeps sections");

const ui = resolveBlogUiDelivery(polished, pipelineInput, {
  mode: "llm",
  withheld: false,
  meta: { generationMode: "llm_openai" },
});
assert.ok(ui.ok && ui.pack?.sections?.length >= 2, "resolveBlogUiDelivery delivers LLM");

const partial = {
  ok: true,
  mode: "llm",
  llmAvailable: true,
  blogContent: polished,
  meta: { generationMode: "llm_openai", passOutput: false },
};
const delivered = deliverWithOptionalPostVerify(
  pipelineInput,
  partial,
  requiresV2ResearchGate(pipelineInput),
  {}
);
assert.ok(
  delivered?.blogContent?.sections?.length >= 2,
  `client deliver must keep body (ok=${delivered?.ok} withheld=${delivered?.withheld})`
);
assert.equal(delivered?.blogContent?._meta?.publishReady, true, "LLM client deliver publishReady");

console.log("OK: llm-ui-delivery-preserve", {
  sections: delivered.blogContent.sections.length,
  publishReady: delivered.blogContent._meta?.publishReady,
});
