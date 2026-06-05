/**
 * 100명 페르소나 — 생성·품질·피드백 집계 (지인 베타 사전 점검)
 * Run: npm run run:hundred-feedback
 * Env: BASE_URL (기본 https://briclog.ai), BRICLOG_PERSONA_CONCURRENCY=12
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { HUNDRED_USER_PERSONAS } from "../lib/qa/hundredUserPersonas.js";
import { normalizePipelineInput } from "../lib/contentPipeline.js";
import { resolvePersonaBlogPack } from "../lib/qa/resolvePersonaBlogPack.js";
import { scoreTrainingContent } from "../lib/quality/training/scorer.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { getQualityTarget } from "../lib/quality/qualityDefaults.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { isOpenAIConfigured, getLLMMode } from "../lib/llm/llmProvider.js";
import { MASTER_ENGINE_V12_BANNED_USER_PHRASES } from "../lib/content/contentIntelligenceV12.js";
import { isCoverageSlotDumpPack } from "../lib/llm/missionProseFallback.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT = join(root, "config", "hundred-persona-feedback-report.json");
const BASE = process.env.BASE_URL || "https://briclog.ai";
const CONCURRENCY = Math.max(1, Number(process.env.BRICLOG_PERSONA_CONCURRENCY) || 12);
const TARGET = getQualityTarget();

const INDUSTRY_INPUT = {
  cafe: { industry: "카페", purpose: "visitDrive", tone: "emotional" },
  flower: { industry: "꽃집", purpose: "season", tone: "emotional" },
  medical: {
    industry: "병원",
    purpose: "info",
    tone: "trust",
    sensitiveCategory: "medical",
    excludePhrases: "완치, 100%, 최고, 무조건",
  },
  beauty: { industry: "미용실", purpose: "visitDrive", tone: "trust" },
  academy: { industry: "학원", purpose: "info", tone: "informative" },
  restaurant: { industry: "음식점", purpose: "visitDrive", tone: "emotional" },
  retail: { industry: "패션", purpose: "visitDrive", tone: "emotional" },
  fitness: { industry: "피트니스", purpose: "info", tone: "trust" },
  professional: { industry: "마케팅", purpose: "info", tone: "trust" },
  lodging: { industry: "숙박", purpose: "visitDrive", tone: "emotional" },
};

const JOURNEY_FEEDBACK_HINTS = {
  guest_mobile: ["모바일 첫 화면에서 샘플 결과를 더 빨리 볼 수 있으면 좋겠어요", "CTA 버튼이 한눈에 들어와요"],
  guest_desktop: ["랜딩에서 실제 글 예시가 더 길게 보이면 신뢰가 올라갈 것 같아요"],
  signup_mobile: ["가입 직후 첫 글쓰기까지 단계가 짧으면 좋겠어요"],
  signup_desktop: ["브랜드 입력 폼 라벨이 더 친절하면 좋겠어요"],
  email_unverified: ["이메일 인증 전에도 맛보기 결과를 저장할 수 있으면 좋겠어요"],
  blog_writer: ["생성 중 진행 표시가 더 명확하면 좋겠어요", "결과 화면에서 바로 복사가 잘 보여요"],
  channel_pack: ["이야기만 쓰기 토글이 더 눈에 띄면 좋겠어요"],
  channel_standalone: ["플레이스/인스타 단독 시작점이 더 분명하면 좋겠어요"],
  paste_review: ["붙여넣기 검수에서 위험 문구 하이라이트가 더 눈에 띄면 좋겠어요"],
  history_power: ["기록에서 이전 글 피드백을 다시 보기 쉬우면 좋겠어요"],
};

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* optional */
  }
}

function personaToInput(persona) {
  const brand = persona.brand || {};
  const ind = INDUSTRY_INPUT[persona.industry] || INDUSTRY_INPUT.cafe;
  return normalizePipelineInput({
    brandName: brand.brandName || "테스트매장",
    region: brand.region || "서울",
    topic: brand.topic || "매장 소개",
    mainKeyword: brand.mainKeyword || brand.topic || "로컬 매장",
    blogLengthTier: persona.device === "mobile" ? "short" : "medium",
    ...ind,
  });
}

function scoreReadability(text) {
  const len = text.replace(/\s/g, "").length;
  const paras = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const avgPara = paras.length ? len / paras.length : len;
  const repeatLine =
    (text.match(/에\s*직접\s*가서\s+.+?\s+관련\s+안내를\s+들었어요/g) || []).length;
  if (repeatLine >= 2 || /응대을|이용를|쇼룸를/.test(text)) return "poor";
  if (len < 1200 || avgPara > 520 || paras.length < 3) return "ok";
  return "good";
}

function synthesizeFeedback(persona, { training, core, blogText, pack, mode }) {
  const errors = [];
  const improvements = [...(JOURNEY_FEEDBACK_HINTS[persona.journeyType] || [])];
  const tags = [];
  let reaction = "ok";

  if (/응대을|이용를|쇼룸를|매장를/.test(blogText)) {
    errors.push("조사·문법 오류가 보여요");
    tags.push("grammar_error");
    reaction = "bad";
  }
  const visitSpam = (blogText.match(/에\s*직접\s*가서\s+.+?\s+관련\s+안내를\s+들었어요/g) || [])
    .length;
  if (visitSpam >= 2) {
    errors.push("같은 방문 안내 문장이 반복돼요");
    tags.push("too_ai", "low_info");
    reaction = "bad";
  }
  if (isCoverageSlotDumpPack(pack)) {
    errors.push("체크리스트·패딩 문장이 많아요");
    tags.push("too_ai", "low_info");
    reaction = "bad";
  }

  const banned = MASTER_ENGINE_V12_BANNED_USER_PHRASES.filter((p) => blogText.includes(p));
  if (banned.length) {
    errors.push(`금지 표현: ${banned.slice(0, 2).join(", ")}`);
    tags.push("too_ad");
    reaction = "bad";
  }

  if (persona.sensitiveIndustry && /완치|100%|최고의|무조건/.test(blogText)) {
    errors.push("의료 광고 톤이 강해요");
    tags.push("too_ad");
    reaction = "bad";
  }

  for (const b of training.blockers || []) {
    if (b === "length") improvements.push("글 길이가 목표보다 짧거나 길어요");
    if (b === "placeholder") errors.push("미완성·플레이스홀더 문구가 있어요");
    if (b === "place_quality" || b === "insta_quality") {
      improvements.push("채널 연계 품질을 맞춰 주세요");
    }
  }

  const pass = training.total >= TARGET && core.total >= TARGET;
  if (!pass && reaction !== "bad") reaction = "ok";
  if (pass && reaction === "ok") reaction = "good";

  if (mode !== "llm") {
    improvements.push("LLM 본문보다 초안 톤이 느껴져요 — 현장 디테일을 더 넣어 주세요");
  }

  const readability = scoreReadability(blogText);

  return {
    reaction,
    readability,
    errors,
    improvements: [...new Set(improvements)].slice(0, 5),
    tags: [...new Set(tags)],
    comment: [
      errors.length ? errors.join(" ") : null,
      improvements[0] || null,
      `품질 T${training.total}/C${core.total} (목표 ${TARGET})`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

async function runPersona(persona) {
  const input = personaToInput(persona);
  const ctx = {
    brandName: input.brandName,
    region: input.region,
    main: input.mainKeyword,
    industry: input.industry,
    topic: input.topic,
    blogLengthTier: input.blogLengthTier,
    input,
  };

  const { pack, mode, qualityScore } = await resolvePersonaBlogPack(input, {
    v4Speaker: persona.journeyType.includes("guest") ? "brand_intro" : "real_use",
  });
  const blogText = getBlogFullText(pack);
  const training = scoreTrainingContent(pack, ctx, "blog");
  const core = scoreCoreContent(pack, ctx, "blog");
  const feedback = synthesizeFeedback(persona, {
    training,
    core,
    blogText,
    pack,
    mode,
  });

  return {
    id: persona.id,
    label: persona.label,
    industry: persona.industry,
    journeyType: persona.journeyType,
    device: persona.device,
    brand: input.brandName,
    mode,
    qualityScore,
    scores: {
      training: training.total,
      core: core.total,
      pass: training.total >= TARGET && core.total >= TARGET,
      blockers: training.blockers,
    },
    chars: blogText.replace(/\s/g, "").length,
    feedback,
  };
}

async function poolMap(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function aggregate(runs) {
  const readability = { good: 0, ok: 0, poor: 0 };
  const reactions = { good: 0, ok: 0, bad: 0 };
  const improvementCounts = new Map();
  const errorCounts = new Map();
  const blockerCounts = new Map();
  const byJourney = {};
  const byIndustry = {};

  for (const r of runs) {
    readability[r.feedback.readability] = (readability[r.feedback.readability] || 0) + 1;
    reactions[r.feedback.reaction] = (reactions[r.feedback.reaction] || 0) + 1;
    for (const imp of r.feedback.improvements) {
      improvementCounts.set(imp, (improvementCounts.get(imp) || 0) + 1);
    }
    for (const err of r.feedback.errors) {
      errorCounts.set(err, (errorCounts.get(err) || 0) + 1);
    }
    for (const b of r.scores.blockers || []) {
      blockerCounts.set(b, (blockerCounts.get(b) || 0) + 1);
    }
    byJourney[r.journeyType] = byJourney[r.journeyType] || { n: 0, pass: 0 };
    byJourney[r.journeyType].n += 1;
    if (r.scores.pass) byJourney[r.journeyType].pass += 1;
    byIndustry[r.industry] = byIndustry[r.industry] || { n: 0, pass: 0 };
    byIndustry[r.industry].n += 1;
    if (r.scores.pass) byIndustry[r.industry].pass += 1;
  }

  const topImprovements = [...improvementCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([text, count]) => ({ text, count }));
  const topErrors = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, count]) => ({ text, count }));

  return {
    passRate: Math.round((runs.filter((r) => r.scores.pass).length / runs.length) * 1000) / 10,
    avgTraining: Math.round(runs.reduce((a, r) => a + r.scores.training, 0) / runs.length),
    avgCore: Math.round(runs.reduce((a, r) => a + r.scores.core, 0) / runs.length),
    readability,
    reactions,
    topImprovements,
    topErrors,
    topBlockers: [...blockerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ blocker: k, count: v })),
    byJourney,
    byIndustry,
    grammarIssues: runs.filter((r) => r.feedback.tags.includes("grammar_error")).length,
    templateSpam: runs.filter((r) => r.feedback.tags.includes("too_ai")).length,
  };
}

async function checkProdHealth() {
  try {
    const [statusRes, engineRes] = await Promise.all([
      fetch(`${BASE}/api/content/status`, { signal: AbortSignal.timeout(20_000) }),
      fetch(`${BASE}/api/public/engine-status`, { signal: AbortSignal.timeout(20_000) }),
    ]);
    const status = await statusRes.json().catch(() => ({}));
    const engine = await engineRes.json().catch(() => ({}));
    return {
      ok: statusRes.ok && engineRes.ok,
      llmAvailable: status.llmAvailable !== false,
      engineOk: engine.ok === true,
      friendBetaLearning: engine.engine?.friendBetaLearning === true,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  loadEnvLocal();
  process.env.BRICLOG_MISSION = process.env.BRICLOG_MISSION || "true";

  if (HUNDRED_USER_PERSONAS.length !== 100) {
    console.error("Expected 100 personas, got", HUNDRED_USER_PERSONAS.length);
    process.exit(1);
  }

  const health = await checkProdHealth();
  console.log(`\n=== 100 PERSONA FEEDBACK RUN ===`);
  console.log(`BASE: ${BASE}`);
  console.log(`Health:`, health);
  console.log(`LLM local: ${isOpenAIConfigured() ? getLLMMode() : "off (template path)"}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  const started = Date.now();
  let done = 0;
  const runs = await poolMap(HUNDRED_USER_PERSONAS, CONCURRENCY, async (persona) => {
    const row = await runPersona(persona);
    done += 1;
    if (done % 10 === 0 || done === 100) {
      process.stdout.write(`\r생성·피드백: ${done}/100`);
    }
    return row;
  });
  console.log(`\n완료 ${((Date.now() - started) / 1000).toFixed(1)}s\n`);

  const summary = aggregate(runs);
  const report = {
    base: BASE,
    at: new Date().toISOString(),
    elapsedSec: Math.round((Date.now() - started) / 1000),
    personaCount: runs.length,
    target: TARGET,
    prodHealth: health,
    llmMode: isOpenAIConfigured() ? getLLMMode() : "template",
    summary,
    runs,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("Report:", OUT);
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n--- 상위 개선 요청 ---");
  for (const row of summary.topImprovements.slice(0, 8)) {
    console.log(`  [${row.count}] ${row.text}`);
  }
  if (summary.topErrors.length) {
    console.log("\n--- 상위 오류 체감 ---");
    for (const row of summary.topErrors.slice(0, 6)) {
      console.log(`  [${row.count}] ${row.text}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
