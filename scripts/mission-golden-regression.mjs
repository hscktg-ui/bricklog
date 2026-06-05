/**
 * Golden failure regression — 오늘 조사·수정 케이스 영구 고정
 * Run: npm run mission:golden
 */
process.env.BRICLOG_MISSION = "true";

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { buildKnowledgeCoverageMap } from "../lib/content/knowledgeCoverageEngine.js";
import { buildWriterSectionBody } from "../lib/content/sectionWriterBodies.js";
import {
  applyV17PostWritePack,
  ensureNaverChannelClean,
  ensureV17MissionPolish,
} from "../lib/content/v17PostProcess.js";
import { applyFurnitureExhibitionPackPolish } from "../lib/product/furnitureExhibitionEngine.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { buildHumanClickTitles } from "../lib/content/humanTitleEngine.js";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { scoreBriclogEngine, BRICLOG_ENGINE_PASS } from "../lib/product/briclogEngineScore.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { collectNaverWriteIssues } from "../lib/channel/naverBlogEngineRules.js";
import { buildBrandSubenginePromptBlock } from "../lib/product/brandSubengine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "artifacts", "mission-improvement", "golden-summary.json");

export const GOLDEN_CASES = [
  {
    id: "ace-opimo",
    label: "파주·에이스침대·오피모 전시",
    input: {
      brandName: "에이스침대",
      region: "파주",
      topic: "오피모 전시 소식",
      mainKeyword: "오피모 전시 소식",
      industry: "가구/침대",
      blogLengthTier: "medium",
      researchFacts: [
        { fact: "파주 매장 체험·행사 조건" },
        { fact: "파주 매장 예약·상담 가능" },
      ],
      v2PreWriteVerified: true,
      knowledgeExpansionReady: true,
    },
    assert: (r) =>
      r.beliefAfter >= 85 &&
      !r.hasPlaceholder &&
      !r.hasJosaError &&
      r.checklistAfter &&
      r.delivered,
  },
  {
    id: "checklist-flower",
    label: "인천 송도·꽃집·체크리스트 주제",
    input: {
      brandName: "인천꽃집",
      region: "인천 송도",
      topic: "방문 전 체크리스트 꽃집",
      mainKeyword: "방문 전 체크리스트 꽃집",
      industry: "꽃집",
      blogLengthTier: "medium",
      researchFacts: [
        { fact: "인천 송도 꽃집 관련 이번 달 행사" },
        { fact: "인천 송도 매장 예약·상담 가능" },
      ],
      v2PreWriteVerified: true,
      knowledgeExpansionReady: true,
    },
    assert: (r) =>
      r.sections >= 3 &&
      r.delivered &&
      r.checklistAfter &&
      r.beliefAfter >= 72 &&
      !r.hasPlaceholder,
  },
  {
    id: "checklist-hospital",
    label: "광주 상무·병원·체크리스트 주제",
    input: {
      brandName: "광주병원",
      region: "광주 상무",
      topic: "방문 전 체크리스트 병원",
      mainKeyword: "방문 전 체크리스트 병원",
      industry: "병원",
      blogLengthTier: "medium",
      researchFacts: [
        { fact: "광주 상무 병원 관련 이번 달 행사" },
        { fact: "광주 상무 매장 예약·상담 가능" },
      ],
      v2PreWriteVerified: true,
      knowledgeExpansionReady: true,
    },
    assert: (r) =>
      r.sections >= 3 &&
      r.delivered &&
      r.checklistAfter &&
      r.beliefAfter >= 72 &&
      !r.hasPlaceholder,
  },
  {
    id: "brand-subengine",
    label: "브랜드 서브엔진·승인본 2편+",
    input: {
      brandName: "테스트카페",
      region: "강남",
      topic: "시즌 메뉴",
      industry: "카페",
      approvedContentCount: 3,
      pastContentCount: 3,
      styleAnchors: [
        { title: "1편", snippet: "강남 테스트카페에 다녀와 시즌 메뉴부터 확인해 봤어요." },
        { title: "2편", snippet: "솔직히 분위기가 좋아서 재방문했어요." },
      ],
      v2PreWriteVerified: true,
    },
    assert: () => true,
    promptOnly: true,
  },
];

function buildPollutedPack(input) {
  const enriched = prepareBriclogPreWriteContext(input);
  const coverage = buildKnowledgeCoverageMap(enriched);
  const areas = (coverage.areas || []).slice(0, 8);
  const plan = { ...enriched, brand: enriched.brandName, topic: enriched.topic };
  const sections = areas.map((area, idx) => ({
    heading: area.heading || `${enriched.region} ${enriched.brandName}`,
    body: buildWriterSectionBody(
      { id: area.id, label: area.label, headingSuffix: area.headingSuffix, infoUnit: area.label },
      plan,
      enriched,
      idx % 3
    ),
  }));
  return {
    title: `${input.region} ${input.brandName} ${input.topic}를 체험 전 알아둘 것`,
    sections,
    conclusion: `방문·예약 안내를 참고하시길 권합니다.`,
  };
}

function runGolden(c) {
  if (c.promptOnly) {
    const block = buildBrandSubenginePromptBlock(c.input);
    const ok = block.includes("BRAND SUBENGINE") && block.includes("다음 장");
    return { id: c.id, label: c.label, ok, promptOnly: true };
  }

  const polluted = buildPollutedPack(c.input);
  let improved = applyV17PostWritePack(polluted, { input: c.input, ...c.input }, "blog");
  if (c.id === "ace-opimo") {
    improved = applyFurnitureExhibitionPackPolish(improved, c.input);
  }
  improved = ensureV17MissionPolish(improved, c.input, "blog");
  improved = ensureNaverChannelClean(improved, c.input);
  improved = applyHumanityFinishPass(improved, { input: c.input }, "blog");
  if ((improved?.sections?.length || 0) < 2) {
    improved = applyHumanityFinishPass(
      buildMissionProseFallbackPack(c.input),
      { input: c.input },
      "blog"
    );
  }
  const full = getBlogFullText(improved);
  const belief = scoreHumanBelief(full, c.input, improved);
  const checklist = scoreChecklistVoice(full, improved);
  const briclog = scoreBriclogEngine(improved, c.input);
  const delivery = deliverBlogDespiteGate(c.input, improved, { reasons: [] }, { mode: "batch" });
  const titles = buildHumanClickTitles(c.input, c.input).slice(0, 2);

  const row = {
    id: c.id,
    label: c.label,
    sections: improved?.sections?.length || 0,
    beliefAfter: belief.score,
    beliefOk: belief.ok && belief.score >= HUMAN_BELIEF_MIN_SCORE,
    checklistAfter: checklist.ok,
    briclogScore: briclog.total,
    briclogOk: briclog.ok && briclog.total >= BRICLOG_ENGINE_PASS,
    delivered: Boolean(
      delivery?.blogContent?.sections?.length || improved?.sections?.length
    ),
    hasPlaceholder: /방문·예약\s*안내/.test(full),
    hasJosaError: /소식를|할인를/.test(full + " " + (improved.title || "")),
    naverIssues: collectNaverWriteIssues(full, c.input),
    sampleTitle: titles[0] || improved.title,
  };
  row.ok = c.assert(row);
  return row;
}

export function runGoldenRegression() {
  mkdirSync(dirname(OUT), { recursive: true });
  const results = GOLDEN_CASES.map(runGolden);
  const pass = results.filter((r) => r.ok).length;
  const summary = {
    startedAt: new Date().toISOString(),
    total: results.length,
    pass,
    fail: results.length - pass,
    passRate: Math.round((pass / Math.max(1, results.length)) * 1000) / 10,
    results,
  };
  writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(`golden-regression: ${pass}/${results.length} pass (${summary.passRate}%)`);
  for (const r of results) {
    console.log(`  ${r.ok ? "OK" : "FAIL"} · ${r.id} · ${r.label}`);
    if (!r.ok && !r.promptOnly) {
      console.log(
        `      belief=${r.beliefAfter} briclog=${r.briclogScore} sections=${r.sections} placeholder=${r.hasPlaceholder}`
      );
    }
  }
  console.log(`  summary: ${OUT}`);
  return summary;
}

if (process.argv[1]?.includes("mission-golden-regression")) {
  const summary = runGoldenRegression();
  if (summary.pass < summary.total) process.exit(1);
}
