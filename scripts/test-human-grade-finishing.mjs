/**
 * human 등급 마감 패스 — mission fallback 로컬 회귀
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { runBriclogWriterEngine } from "../lib/product/briclogWriterEngine.js";
import { ensureBlogDisplayPack } from "../lib/generation/ensureBlogDisplayPack.js";
import {
  assessDeliveryGrade,
  DELIVERY_GRADE,
} from "../lib/product/deliveryGrade.js";
import { assessHumanColumnContract } from "../lib/product/humanColumnContract.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

process.env.BRICLOG_MISSION = "true";

const scenarios = [
  {
    id: "salon",
    input: {
      brandName: "레이어드살롱",
      region: "홍대",
      topic: "시즌 컬러 이벤트",
      industry: "미용실",
      blogLengthTier: "short",
      v4Speaker: "real_use",
    },
  },
  {
    id: "craft",
    input: {
      brandName: "도자기온",
      region: "이천",
      topic: "원데이 클래스 오픈",
      industry: "공방",
      blogLengthTier: "short",
      v4Speaker: "essay",
    },
  },
];

for (const scenario of scenarios) {
  let pack = buildMissionProseFallbackPack(scenario.input);
  pack._meta = {
    ...pack._meta,
    missionProseFallback: true,
    deliveryRescue: true,
  };
  const inbound = countBlogBodyCharsWithSpaces(pack);
  const engine = await runBriclogWriterEngine(pack, { input: scenario.input }, scenario.input);
  pack = ensureBlogDisplayPack(engine.pack, scenario.input);
  const grade = assessDeliveryGrade(pack, scenario.input);
  const contract = assessHumanColumnContract(pack, scenario.input);
  const full = (pack.sections || []).map((s) => s.body).join(" ");

  if (scenario.id === "salon") {
    assert.ok(pack.sections?.length >= 3, `${scenario.id}: sections`);
  }
  assert.ok(countBlogBodyCharsWithSpaces(pack) >= inbound * 0.85, `${scenario.id}: shrink`);
  assert.ok(!/전시·구성/.test(full) || scenario.input.industry === "가구", `${scenario.id}: furniture leak`);

  console.log(`OK: ${scenario.id}`, {
    grade: grade.grade,
    tierMet: grade.tierMet,
    humanVoiceMet: grade.humanVoiceMet,
    chars: grade.chars,
    failReasons: (pack._meta?.failReasons || []).slice(0, 4),
    contractReasons: (contract.reasons || []).slice(0, 4),
  });

  if (scenario.id === "salon" && grade.grade === DELIVERY_GRADE.HUMAN) {
    assert.ok(grade.tierMet && grade.humanVoiceMet, `${scenario.id}: human requires tier+voice`);
  }
  if (scenario.id === "salon") {
    assert.ok(
      !(pack._meta?.failReasons || []).includes("duplicate_content"),
      "salon: duplicate_content cleared"
    );
    assert.ok(
      !(pack._meta?.failReasons || []).includes("topic_dominance_low"),
      "salon: topic dominance cleared"
    );
  }
}

console.log("OK: human-grade-finishing");
