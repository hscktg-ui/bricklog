/**
 * /api/content/channel — e.test is not a function 재현
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
process.env.BRICLOG_MISSION = "true";
Object.assign(process.env, env);

const paths = [
  () => import("../lib/product/completionStandard.js"),
  () => import("../lib/product/humanWritingDeliveryGate.js"),
  () => import("../lib/content/betaTestGuardEngine.js"),
  () => import("../lib/content/humanityFinishPass.js"),
  () => import("../lib/llm/postProcessLlmChannel.js"),
  () => import("../lib/persona/personaEngineProfile.js"),
  () => import("../lib/product/deepLearningEngine.js"),
  () => import("../lib/content/columnMagazineArchetype.js"),
  () => import("../lib/content/v2PipelineGate.js"),
  () => import("../lib/product/channelQualityStack.js"),
];

const sampleBlogPack = {
  title: "파주 플레르퍼피 애견카페 방문 후기",
  sections: [
    { heading: "왜 갔는지", body: "반려견과 함께 갈 곳을 찾다가 직접 다녀왔어요." },
    { heading: "현장에서 본 것", body: "대형견·소형견 구역이 분리되어 있었어요." },
    { heading: "이용 팁", body: "주말에는 대기가 있을 수 있어요." },
  ],
  conclusion: "파주 플레르퍼피 — 반려견과 함께 가기 좋았어요.",
};

const samplePlacePack = {
  title: "파주 플레르퍼피",
  shortNotice: "반려견 동반 카페 · 구역 분리",
  detailBody: "직접 방문해 본 기준으로 정리했어요. 대형견·소형견 구역이 나뉘어 있어요.",
};

const input = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  v4Speaker: "plain_review",
  v2ResearchReady: true,
  researchFacts: [
    { fact: "실내 대형견·소형견 구역 분리" },
    { fact: "주차 10대 규모" },
  ],
};

for (const load of paths) {
  const mod = await load();
  const name = load.toString().slice(0, 80);
  try {
    if (mod.assessCompletionReadiness) {
      mod.assessCompletionReadiness(sampleBlogPack, input);
      console.log("OK assessCompletionReadiness");
    }
    if (mod.assessHumanWritingDelivery) {
      mod.assessHumanWritingDelivery(sampleBlogPack, input);
      console.log("OK assessHumanWritingDelivery");
    }
    if (mod.assertBetaTestGuardWithCorrection) {
      mod.assertBetaTestGuardWithCorrection(sampleBlogPack, input, "blog");
      console.log("OK assertBetaTestGuard blog");
      mod.assertBetaTestGuardWithCorrection(samplePlacePack, input, "place");
      console.log("OK assertBetaTestGuard place");
    }
    if (mod.applyHumanityFinishPass) {
      mod.applyHumanityFinishPass(sampleBlogPack, { input, ...input }, "blog");
      console.log("OK applyHumanityFinishPass blog");
      mod.applyHumanityFinishPass(samplePlacePack, { input, ...input }, "place");
      console.log("OK applyHumanityFinishPass place");
    }
    if (mod.postProcessLlmChannel) {
      mod.postProcessLlmChannel("place", samplePlacePack, input, input);
      console.log("OK postProcessLlmChannel place");
    }
    if (mod.scorePersonaEngineAlignment) {
      mod.scorePersonaEngineAlignment(sampleBlogPack, input);
      mod.scorePersonaEngineAlignment(samplePlacePack, input);
      console.log("OK scorePersonaEngineAlignment");
    }
    if (mod.scoreDeepLearning) {
      mod.scoreDeepLearning(sampleBlogPack, input);
      console.log("OK scoreDeepLearning");
    }
    if (mod.scoreMagazineColumnArc) {
      mod.scoreMagazineColumnArc(sampleBlogPack);
      mod.loadColumnMagazineProfile?.();
      console.log("OK scoreMagazineColumnArc");
    }
    if (mod.assertPostWriteDeliverable) {
      mod.assertPostWriteDeliverable(
        { ...input, contentChannel: "place" },
        samplePlacePack
      );
      mod.assertPostWriteDeliverable(
        { ...input, contentChannel: "blog" },
        sampleBlogPack
      );
      console.log("OK assertPostWriteDeliverable");
    }
    if (mod.applyChannelQualityStack) {
      mod.applyChannelQualityStack(samplePlacePack, "place", input);
      console.log("OK applyChannelQualityStack");
    }
  } catch (err) {
    console.error("FAIL in", name);
    console.error(err.stack || err.message);
    process.exit(1);
  }
}

console.log("ALL OK");
