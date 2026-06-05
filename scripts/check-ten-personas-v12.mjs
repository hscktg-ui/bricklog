/**
 * 10 페르소나 × V12 체크 (단서·페르소나·네이버 조사·채널 품질·금지 문구)
 * Run: npm run test:ten-personas
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { TEN_USER_PERSONAS } from "../lib/qa/tenUserPersonas.js";
import { MASTER_ENGINE_V12_BANNED_USER_PHRASES } from "../lib/content/contentIntelligenceV12.js";
import { discoverClues } from "../lib/content/clueDiscoveryEngine.js";
import { resolveContentPersona } from "../lib/persona/contentPersona.js";
import { applyV4SpeakerToInput } from "../lib/persona/v4Speakers.js";
import { normalizePipelineInput } from "../lib/contentPipeline.js";
import { resolvePersonaBlogPack } from "../lib/qa/resolvePersonaBlogPack.js";
import { getQualityTarget } from "../lib/quality/qualityDefaults.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { scoreTrainingContent } from "../lib/quality/training/scorer.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { runResearch } from "../lib/research/runResearch.js";
import { isWebSearchConfigured } from "../lib/research/searchSources/webSearch.js";
import { isNaverSearchConfigured } from "../lib/research/searchSources/naverSearch.js";
import { auditPastedDraft } from "../lib/review/auditPastedDraft.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT = join(root, "config", "ten-persona-v12-report.json");
const TARGET = getQualityTarget();

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

function containsBannedPhrase(text) {
  const t = String(text || "");
  return MASTER_ENGINE_V12_BANNED_USER_PHRASES.filter((p) => t.includes(p));
}

async function checkPersona(persona) {
  const normalized = normalizePipelineInput({
    ...persona.input,
    v4Speaker: persona.v4Speaker,
    blogLengthTier: "medium",
  });
  const withSpeaker = applyV4SpeakerToInput(normalized);
  const resolved = resolveContentPersona(withSpeaker);
  const clues = discoverClues(withSpeaker);
  const { pack: blogProxy, mode: blogMode } = await resolvePersonaBlogPack(
    persona.input,
    persona
  );
  const tierKey = withSpeaker.blogLengthTier || "medium";
  const ctx = {
    brandName: withSpeaker.brandName,
    region: withSpeaker.region,
    main: withSpeaker.mainKeyword,
    industry: withSpeaker.industry,
    topic: withSpeaker.topic,
    blogLengthTier: tierKey,
    input: withSpeaker,
  };
  const blogText = getBlogFullText(blogProxy);
  const training = scoreTrainingContent(blogProxy, ctx, "blog");
  const core = scoreCoreContent(blogProxy, ctx, "blog");
  const qualityPass =
    training.total >= TARGET && core.total >= TARGET;
  const scores = {
    training: training.total,
    core: core.total,
    blockers: training.blockers,
    pass: qualityPass,
  };
  const paste = auditPastedDraft(blogText, ctx, "blog");
  const bannedInTemplate = containsBannedPhrase(blogText);

  let research = { ok: false, summaryLen: 0, webResults: 0, skipped: true };
  if (isWebSearchConfigured() && isNaverSearchConfigured()) {
    try {
      const q = `${withSpeaker.brandName} ${withSpeaker.topic || withSpeaker.mainKeyword}`;
      const r = await runResearch({
        query: q,
        types: ["web"],
        brandContext: {
          brandName: withSpeaker.brandName,
          region: withSpeaker.region,
          topic: withSpeaker.topic,
          mainKeyword: withSpeaker.mainKeyword,
          clueDiscovery: clues,
        },
        mode: "v2_axis",
      });
      research = {
        ok: Boolean(r?.summary?.trim()),
        summaryLen: (r?.summary || "").length,
        webResults: r?.sources?.length ?? 0,
        insufficient: r?.v2Axis?.insufficient === true,
        skipped: false,
      };
    } catch {
      research = { ok: false, summaryLen: 0, webResults: 0, skipped: false, error: true };
    }
  }

  const pipelineIssues = [];
  if (bannedInTemplate.length) {
    pipelineIssues.push(`금지문구:${bannedInTemplate.join(",")}`);
  }
  if (!clues.entityVariants?.length && !clues.searchQueries?.length) {
    pipelineIssues.push("단서 없음");
  }
  if (research.skipped === false && !research.ok) {
    pipelineIssues.push("조사 요약 없음");
  }

  const templateWarnings = [];
  if (!qualityPass) {
    templateWarnings.push(
      blogMode === "llm"
        ? `품질 T${scores.training}/C${scores.core} (목표 ${TARGET})`
        : `초안 T${scores.training}/C${scores.core} (LLM 미연결)`
    );
  }
  if (!paste.pass) {
    templateWarnings.push(
      `붙여넣기 검수 ${paste.score}${paste.charCount ? ` · ${paste.charCount}자` : ""}`
    );
  }

  return {
    id: persona.id,
    label: persona.label,
    v4Speaker: persona.v4Speaker,
    persona: resolved.persona,
    subtype: resolved.subtype,
    clueVariants: (clues.entityVariants || []).slice(0, 4),
    clueQueries: (clues.searchQueries || []).slice(0, 3),
    scores,
    paste: { pass: paste.pass, score: paste.score },
    research,
    blogMode,
    qualityPass,
    pipelineOk: pipelineIssues.length === 0 && qualityPass,
    pipelineIssues,
    templateWarnings,
    ok: pipelineIssues.length === 0,
    issues: [...pipelineIssues, ...templateWarnings],
  };
}

async function main() {
  loadEnvLocal();
  mkdirSync(join(root, "config"), { recursive: true });

  const rows = [];
  for (const p of TEN_USER_PERSONAS) {
    process.stdout.write(`체크: ${p.label}… `);
    const row = await checkPersona(p);
    rows.push(row);
    console.log(
      row.pipelineOk
        ? `파이프라인 OK${row.templateWarnings.length ? ` · ${row.templateWarnings[0]}` : ""}`
        : `FAIL (${row.pipelineIssues.join("; ")})`
    );
  }

  const qualityAtTarget = rows.filter((r) => r.qualityPass).length;
  const summary = {
    at: new Date().toISOString(),
    engine: "V12",
    personaCount: rows.length,
    allOk: rows.every((r) => r.pipelineOk),
    pipelinePassCount: rows.filter((r) => r.pipelineOk).length,
    qualityAtTarget,
    templateWarnCount: rows.filter((r) => r.templateWarnings?.length).length,
    naverConfigured: isNaverSearchConfigured(),
    webSearchConfigured: isWebSearchConfigured(),
    avgTraining: Math.round(
      rows.reduce((a, r) => a + r.scores.training, 0) / rows.length
    ),
    avgCore: Math.round(
      rows.reduce((a, r) => a + r.scores.core, 0) / rows.length
    ),
    researchOk: rows.filter((r) => r.research.ok).length,
  };

  writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 2), "utf8");

  console.log("\n=== 10 페르소나 V12 체크 ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n리포트: ${OUT}`);
  for (const r of rows) {
    console.log(
      `${r.pipelineOk ? "✓" : "✗"} ${r.label} | ${r.persona}/${r.subtype} | T${r.scores.training} C${r.scores.core} | 단서 ${r.clueVariants[0] || "-"} | 조사 ${r.research.skipped ? "skip" : r.research.ok ? "ok" : "weak"}`
    );
  }

  process.exit(
    summary.pipelinePassCount >= Math.ceil(rows.length * 0.9) &&
      qualityAtTarget >= Math.ceil(rows.length * 0.9)
      ? 0
      : 1
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
