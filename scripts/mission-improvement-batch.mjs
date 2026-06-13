/**
 * Mission 품질 배치 — 120건+ 로컬 파이프라인 (LLM/API 없음)
 * Run: npm run mission:batch
 */
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { buildKnowledgeCoverageMap } from "../lib/content/knowledgeCoverageEngine.js";
import { buildWriterSectionBody } from "../lib/content/sectionWriterBodies.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { ensureMinBlogSections } from "../lib/content/blogLengthControl.js";
import {
  GENERAL_CATEGORIES,
  SENSITIVE_CATEGORIES,
  REGIONS,
} from "../lib/quality/training/constants.js";
import { TEN_USER_PERSONAS } from "../lib/qa/tenUserPersonas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "artifacts", "mission-improvement");
const REPORT_JSONL = join(OUT_DIR, "batch-report.jsonl");
const SUMMARY_JSON = join(OUT_DIR, "latest-summary.json");

const META_LEAK_RES = [
  /지역명은\s*자연스럽게/,
  /고유\s*입력\s*기반/,
  /방문·체험·비교를\s*전제로/,
  /공식·매장\s*안내\s*기준/,
  /브랜드\s*시선에서\s*정리/,
  /흐름이\s*분명해/,
];

const TOPIC_SEEDS = [
  "시즌 프로모션",
  "신규 오픈 안내",
  "예약·상담 이벤트",
  "대표 메뉴·서비스",
  "방문 전 체크리스트",
];

function buildScenarios() {
  const out = [];
  const categories = [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES];

  for (let i = 0; i < categories.length; i++) {
    const industry = categories[i];
    for (let r = 0; r < 5; r++) {
      const region = REGIONS[(i + r) % REGIONS.length];
      const topic = `${TOPIC_SEEDS[(i + r) % TOPIC_SEEDS.length]} ${industry}`;
      out.push({
        id: `cat_${i}_${r}`,
        label: `${industry} · ${region}`,
        input: {
          brandName: `${region.split(" ")[0] || region}${industry.replace(/\s/g, "")}`,
          region,
          topic,
          mainKeyword: topic,
          industry,
          blogLengthTier: "medium",
          researchFacts: [
            { fact: `${region} ${industry} 관련 이번 달 행사` },
            { fact: `${region} 매장 예약·상담 가능` },
          ],
          v2PreWriteVerified: true,
          knowledgeExpansionReady: true,
        },
      });
    }
  }

  for (const p of TEN_USER_PERSONAS) {
    out.push({
      id: p.id,
      label: p.label,
      input: {
        ...p.input,
        blogLengthTier: "medium",
        researchFacts: [
          { fact: `${p.input.region} ${p.input.topic} 관련 안내` },
          { fact: `${p.input.brandName} 예약·문의` },
        ],
        v2PreWriteVerified: true,
        knowledgeExpansionReady: true,
      },
    });
  }

  return out;
}

function buildChecklistPollutedPack(input) {
  const enriched = prepareBriclogPreWriteContext(input);
  const coverage = buildKnowledgeCoverageMap(enriched);
  const areas = (coverage.areas || []).slice(0, 8);
  const plan = { ...enriched, brand: enriched.brandName, topic: enriched.topic };

  const sections = areas.map((area, idx) => ({
    heading: area.heading || `${enriched.region} ${enriched.brandName}, ${area.headingSuffix || area.label}`,
    body: buildWriterSectionBody(
      {
        id: area.id,
        label: area.label,
        headingSuffix: area.headingSuffix,
        infoUnit: area.label,
      },
      plan,
      enriched,
      idx % 3
    ),
  }));

  return {
    title: `${enriched.region || ""} ${enriched.topic || enriched.brandName}`.trim(),
    sections,
    conclusion: `${enriched.region || ""} ${enriched.brandName} — 방문·상담 일정만 잡아도 비교가 수월합니다.`,
  };
}

function hasMetaLeak(text) {
  return META_LEAK_RES.some((re) => re.test(String(text || "")));
}

function runOne(scenario) {
  const input = scenario.input;
  const polluted = buildChecklistPollutedPack(input);
  const beforeFull = getBlogFullText(polluted);
  const beforeBelief = scoreHumanBelief(beforeFull, input, polluted);
  const beforeChecklist = scoreChecklistVoice(beforeFull, polluted);

  let improved;
  try {
    improved = applyV17PostWritePack(polluted, { input, ...input }, "blog");
    if ((improved.sections?.length || 0) < 3) {
      improved = ensureMinBlogSections(improved, { input }, input, 3);
    }
  } catch (err) {
    return {
      id: scenario.id,
      label: scenario.label,
      ok: false,
      error: String(err?.message || err),
    };
  }

  const afterFull = getBlogFullText(improved);
  const afterBelief = scoreHumanBelief(afterFull, input, improved);
  const afterChecklist = scoreChecklistVoice(afterFull, improved);
  const delivery = deliverBlogDespiteGate(input, improved, { reasons: [] }, { mode: "batch" });
  const metaLeak = hasMetaLeak(afterFull);
  const sectionCount = improved?.sections?.length || 0;

  const pass =
    sectionCount >= 3 &&
    !metaLeak &&
    afterBelief.score >= HUMAN_BELIEF_MIN_SCORE &&
    afterBelief.ok &&
    afterChecklist.ok &&
    Boolean(delivery?.blogContent?.sections?.length);

  return {
    id: scenario.id,
    label: scenario.label,
    industry: input.industry,
    region: input.region,
    ok: pass,
    sections: sectionCount,
    beliefBefore: beforeBelief.score,
    beliefAfter: afterBelief.score,
    beliefOk: afterBelief.ok,
    checklistBefore: beforeChecklist.ok,
    checklistAfter: afterChecklist.ok,
    metaLeak,
    narrativeApplied: Boolean(
      improved?._meta?.narrativeBeliefPass?.applied ||
        improved?._meta?.humanBelief?.narrativeBeliefPass
    ),
    delivered: Boolean(delivery?.blogContent?.sections?.length),
    issues: afterBelief.issues || [],
  };
}

export function runMissionImprovementBatch(options = {}) {
  const append = options.append !== false;
  mkdirSync(OUT_DIR, { recursive: true });

  const scenarios = buildScenarios();
  const results = [];
  const startedAt = new Date().toISOString();

  for (const scenario of scenarios) {
    const row = runOne(scenario);
    results.push(row);
    if (append) {
      appendFileSync(REPORT_JSONL, `${JSON.stringify({ ...row, ts: startedAt })}\n`, "utf8");
    }
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok && !r.error).length;
  const errors = results.filter((r) => r.error).length;
  const beliefAvg =
    results.reduce((a, r) => a + (r.beliefAfter || 0), 0) / Math.max(1, results.length);

  const failReasons = {};
  for (const r of results.filter((x) => !x.ok)) {
    if (r.error) {
      failReasons.error = (failReasons.error || 0) + 1;
      continue;
    }
    if (r.metaLeak) failReasons.meta_leak = (failReasons.meta_leak || 0) + 1;
    if (!r.beliefOk) failReasons.human_belief_low = (failReasons.human_belief_low || 0) + 1;
    if (!r.checklistAfter) failReasons.checklist_voice = (failReasons.checklist_voice || 0) + 1;
    if ((r.sections || 0) < 3) failReasons.sections_thin = (failReasons.sections_thin || 0) + 1;
    if (!r.delivered) failReasons.delivery_blocked = (failReasons.delivery_blocked || 0) + 1;
  }

  const summary = {
    startedAt,
    total: results.length,
    pass,
    fail,
    errors,
    passRate: Math.round((pass / Math.max(1, results.length)) * 1000) / 10,
    beliefAvg: Math.round(beliefAvg * 10) / 10,
    failReasons,
    failedSamples: results
      .filter((r) => !r.ok)
      .slice(0, 15)
      .map((r) => ({ id: r.id, label: r.label, beliefAfter: r.beliefAfter, issues: r.issues })),
  };

  writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2), "utf8");

  console.log(
    `mission-batch: ${pass}/${results.length} pass (${summary.passRate}%) beliefAvg=${summary.beliefAvg}`
  );
  console.log(`  report: ${REPORT_JSONL}`);
  console.log(`  summary: ${SUMMARY_JSON}`);

  return summary;
}

const isMain = process.argv[1]?.includes("mission-improvement-batch");
if (isMain) {
  const clear = process.argv.includes("--clear");
  if (clear) {
    try {
      writeFileSync(REPORT_JSONL, "", "utf8");
    } catch {
      /* fresh */
    }
  }
  const summary = runMissionImprovementBatch({ append: !clear });
  if (summary.pass < summary.total * 0.85) process.exit(1);
}
