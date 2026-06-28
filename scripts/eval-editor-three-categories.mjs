/**
 * 미진행 업종 3건 — prod 생성 + 30년차 편집장 평가
 * Run: PROBE_IDS=pension,interior,restaurant node --import ./scripts/register-alias.mjs scripts/eval-editor-three-categories.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import {
  assessVisitReviewBenchmark,
  formatVisitReviewBenchmarkReport,
} from "../lib/product/visitReviewBenchmarkRubric.js";
import { assessProfessionalEditorDelivery } from "../lib/product/professionalEditorGradeEngine.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import {
  collectSubstantiveResearchFacts,
  countConcreteFactsWovenInBody,
} from "../lib/product/editorGradeResearchGate.js";
import { detectVisitReviewTemplateContamination } from "../lib/content/visitReviewTopicGate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT_DIR = join(root, "artifacts", "editor-category-eval");

const SCENARIOS = [
  {
    id: "pension",
    label: "펜션 · 비수기 할인",
    raw: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인, 직접 다녀왔어요",
      mainKeyword: "제주 펜션",
      industry: "펜션",
      storeFeatures: "오션뷰 객실·바비큐장·주차 무료·비수기 7박 할인·조식 포함",
      includePhrases: "장박 할인, 바다 전망, 가족 여행, 바비큐 저녁",
      blogLengthTier: "short",
      v4Speaker: "local_blogger",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "interior",
    label: "인테리어 · 리모델링",
    raw: {
      brandName: "우드앤라이트",
      region: "판교",
      topic: "거실 리모델링 상담, 직접 다녀왔어요",
      mainKeyword: "판교 인테리어",
      industry: "인테리어/리모델링",
      storeFeatures: "거실 리모델링·주방 일체형·맞춤 상담·3D 설계·조명·수납",
      includePhrases: "판교 아파트 거실, 리모델링 상담, 동선·조명 변경",
      blogLengthTier: "short",
      v4Speaker: "real_use",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "restaurant",
    label: "음식점 · 점심 특선",
    raw: {
      brandName: "한상차림",
      region: "강남",
      topic: "점심 특선 리뉴얼, 직접 다녀왔어요",
      mainKeyword: "강남 한식",
      industry: "음식점",
      storeFeatures: "점심 특선 9800원·한정식·단체석 12인·예약·계절 반찬",
      includePhrases: "강남 점심 특선, 한정식, 단체석, 리뉴얼 메뉴",
      blogLengthTier: "short",
      v4Speaker: "plain_review",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
];

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);
process.env.BRICLOG_RESET_QUALITY = "true";

function topicSignals(topic = "") {
  const t = String(topic || "");
  const keys = [];
  if (/할인|비수기|장박/.test(t)) keys.push("할인·비수기");
  if (/리모델|거실|인테리어/.test(t)) keys.push("리모델링·거실");
  if (/점심|특선|리뉴얼|한식/.test(t)) keys.push("점심·특선");
  if (/직접|다녀/.test(t)) keys.push("방문 후기");
  return keys;
}

function scoreTopicRetention(full, input) {
  const topic = String(input.topic || "").replace(/,?\s*직접\s*다녀왔.*$/i, "").trim();
  const brand = String(input.brandName || "").trim();
  const tokens = [
    ...topic.split(/[\s,·]+/).filter((w) => w.length >= 2),
    brand,
  ].filter(Boolean);
  const hits = tokens.filter((tok) => full.includes(tok));
  const ratio = tokens.length ? hits.length / tokens.length : 0;
  const headingText = (input._pack?.sections || [])
    .map((s) => `${s.heading || ""} ${(s.body || "").slice(0, 120)}`)
    .join(" ");
  const topicInLead = topic.length >= 4 && (full.slice(0, 400).includes(topic.slice(0, 8)) || full.slice(0, 600).includes(topic.split(/[\s,·]/)[0]));
  return {
    tokenHits: hits.length,
    tokenTotal: tokens.length,
    ratio: Math.round(ratio * 100),
    topicInOpening: topicInLead,
    headingEcho: topic.split(/[\s,·]+/).some((w) => w.length >= 3 && headingText.includes(w)),
  };
}

function scoreHumanity(bench, human, full) {
  const prose = bench.dimensions?.prose?.score ?? 0;
  const field = bench.dimensions?.field?.score ?? 0;
  const spam = bench.dimensions?.spam?.score ?? 0;
  const firstPerson = /(?:저는|제가|들어서|앉아|맛을|느꼈|보였|느껴)/.test(full);
  const sensory = /(?:향|소리|빛|온도|질감|바다|뷰|테이블|동선|한상|메뉴)/.test(full);
  const template = detectVisitReviewTemplateContamination({ sections: [{ body: full }] }, {});
  return {
    proseScore: prose,
    fieldScore: field,
    spamScore: spam,
    humanReady: human.humanReady,
    firstPersonScene: firstPerson,
    sensoryDetail: sensory,
    templateContam: !template.ok,
    templateReasons: template.reasons || [],
  };
}

function packToMarkdown(pack, input) {
  const lines = [];
  if (pack?.title) lines.push(`# ${pack.title}`, "");
  for (const s of pack?.sections || []) {
    if (s.heading) lines.push(`## ${s.heading}`, "");
    if (s.body) lines.push(s.body, "");
  }
  if (pack?.conclusion) lines.push("---", "", pack.conclusion);
  lines.push("", `<!-- ${input.industry} · ${input.topic} -->`);
  return lines.join("\n");
}

async function generateResearchAsync(fv, token) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.topic}`,
      researchTypes: ["web", "brand"],
      researchMode: "v2_axis",
      brandName: fv.brandName,
      region: fv.region,
      industry: fv.industry,
      mainKeyword: fv.mainKeyword,
      topic: fv.topic,
    }),
    signal: AbortSignal.timeout(55_000),
  });
  return res.json();
}

function letter(score) {
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 76) return "B";
  if (score >= 64) return "C";
  return "D";
}

const filterIds = (process.env.PROBE_IDS || "pension,interior,restaurant")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const active = SCENARIOS.filter((s) => filterIds.includes(s.id));

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const report = { at: new Date().toISOString(), base: BASE, categories: [] };

console.log(`\n=== 30년차 편집장 · 미진행 업종 ${active.length}건 (prod) ===\n`);

for (const scenario of active) {
  const input = mergeWorkspaceBrandIntoInput({ ...scenario.raw });
  const row = { id: scenario.id, label: scenario.label, industry: scenario.raw.industry };
  const t0 = Date.now();

  try {
    const axis = await applyV2AxisResearch({
      pipelineInput: input,
      generateResearchAsync: (fv) => generateResearchAsync(fv, auth.token),
      onStep: (s) => process.stdout.write(`  [${scenario.id}] ${s}\n`),
    });
    if (!axis.ok) throw new Error(axis.userMessage || "research_failed");
    Object.assign(input, axis.input);

    const res = await fetch(`${BASE}/api/content/blog`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(slimBlogApiPayload(input)),
      signal: AbortSignal.timeout(125_000),
    });
    const body = await res.json();
    row.ms = Date.now() - t0;
    row.apiStatus = res.status;
    row.withheld = body.withheld;
    row.mode = body.mode;

    if (res.status !== 200 || body.ok === false || body.withheld) {
      row.error = body.userMessage || `http_${res.status}`;
      report.categories.push(row);
      console.log(`✗ ${scenario.label}: ${row.error}\n`);
      continue;
    }

    const pack = body.blogContent || {};
    input._pack = pack;
    const full = getBlogFullText(pack);
    row.chars = countBlogBodyCharsWithSpaces(pack);
    row.sections = pack.sections?.length || 0;
    row.title = pack.title || pack.representativeTitle;

    const bench = assessVisitReviewBenchmark(pack, input);
    const editor = assessProfessionalEditorDelivery(pack, input);
    const human = assessHumanWritingDelivery(pack, input);
    const woven = countConcreteFactsWovenInBody(full, input);
    const substantive = collectSubstantiveResearchFacts(input);
    const topic = scoreTopicRetention(full, input);
    const humanity = scoreHumanity(bench, human, full);

    row.benchmark = { score: bench.score, grade: bench.grade, publishOk: bench.publishOk, hardFails: bench.hardFails };
    row.editor = { score: editor.score, ok: editor.ok, label: editor.labelKo };
    row.topic = topic;
    row.humanity = humanity;
    row.woven = woven;
    row.substantiveFacts = substantive.length;
    row.topicSignals = topicSignals(scenario.raw.topic);

    const topicGrade =
      topic.ratio >= 75 && topic.topicInOpening && topic.headingEcho
        ? "A"
        : topic.ratio >= 50 && topic.topicInOpening
          ? "B"
          : topic.ratio >= 40
            ? "C"
            : "D";
    const humanityGrade =
      bench.score >= 85 && humanity.fieldScore >= 14 && humanity.proseScore >= 12 && !humanity.templateContam
        ? "A"
        : bench.score >= 76 && humanity.firstPersonScene
          ? "B"
          : bench.score >= 64
            ? "C"
            : "D";

    row.editorial = {
      topicGrade,
      humanityGrade,
      topicNote:
        topicGrade === "A"
          ? "주제·브랜드 축이 서두~본문 전 구간에 유지됨"
          : topicGrade === "B"
            ? "주제는 살아 있으나 한두 구간에서 홍보·일반론으로 새"
            : "주제 이탈 — 독자가 왜 이 글을 읽는지 흐려짐",
      humanityNote:
        humanityGrade === "A"
          ? "현장 관찰·1인칭 장면이 있어 기계 번역·브로슈어 톤이 아님"
          : humanityGrade === "B"
            ? "문장은 매끄우나 체감 디테일·화자가 더 필요"
            : "정보 나열·템플릿 냄새 — 사람이 쓴 글감 부족",
    };

    writeFileSync(join(OUT_DIR, `${scenario.id}.md`), packToMarkdown(pack, input), "utf8");
    report.categories.push(row);

    console.log(`\n【${scenario.label}】 ${row.chars}자 · ${row.sections}섹션 · ${Math.round(row.ms / 1000)}s`);
    console.log(`  벤치마크 ${bench.score}(${bench.grade}) · 편집장 ${editor.score} · 주제 ${topicGrade} · 휴머니티 ${humanityGrade}`);
    console.log(`  주제: ${row.editorial.topicNote}`);
    console.log(`  휴머니티: ${row.editorial.humanityNote}`);
    if (pack.title) console.log(`  제목: ${pack.title.slice(0, 60)}`);
    console.log(formatVisitReviewBenchmarkReport(bench, scenario.raw.brandName));
    console.log("");
  } catch (e) {
    row.error = e?.message || String(e);
    row.ms = Date.now() - t0;
    report.categories.push(row);
    console.log(`✗ ${scenario.label}: ${row.error}\n`);
  }
}

writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`Report: artifacts/editor-category-eval/latest.json`);
