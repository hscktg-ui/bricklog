/**
 * 10 페르소나 × 채널 연계·품질 (목표 95 · OpenAI 기본)
 * Run: npm run test:persona
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { resolveDerivationSource, pickLatestSource } from "../lib/content/channelSource.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  normalizePipelineInput,
  buildBaseContentLabel,
} from "../lib/contentPipeline.js";
import { scoreTrainingContent } from "../lib/quality/training/scorer.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { scoreContent } from "../lib/editorAI/scoreContent.js";
import { auditPastedDraft } from "../lib/review/auditPastedDraft.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { CORE_TARGET_SCORE } from "../lib/quality/coreQualityEngine.js";
import { getQualityTarget } from "../lib/quality/qualityDefaults.js";
import { isOpenAIConfigured, getOpenAIModel, getLLMMode } from "../lib/llm/llmProvider.js";
import { TEN_USER_PERSONAS } from "../lib/qa/tenUserPersonas.js";
import { resolvePersonaBlogPack } from "../lib/qa/resolvePersonaBlogPack.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

loadEnvLocal();

const TARGET = getQualityTarget();
const limit = Number(process.env.BRICLOG_PERSONA_LIMIT) || 0;
const PERSONAS =
  limit > 0 ? TEN_USER_PERSONAS.slice(0, limit) : TEN_USER_PERSONAS;

function scorePack(channel, pack, ctx) {
  const training = scoreTrainingContent(pack, ctx, channel);
  const core = scoreCoreContent(pack, ctx, channel);
  const editor = scoreContent(channel, pack, ctx);
  return {
    training: training.total,
    trainingPass: training.pass,
    blockers: training.blockers,
    core: core.total,
    corePass: core.pass,
    editor: editor.overall,
  };
}

function testDerivationMatrix(blog, place, insta, input) {
  const state = {
    blogContent: blog,
    placeContent: place,
    instagramContent: insta,
    blogInput: input,
    baseContentLabel: "테스트",
    sourceChannel: null,
  };
  const rows = [];
  for (const target of ["place", "instagram", "image", "blog"]) {
    const src = resolveDerivationSource(target, state);
    rows.push({
      target,
      ok: Boolean(src),
      source: src?.sourceChannel,
      standalone: src?.standalone,
      hasProxy: Boolean(src?.blogLike),
    });
  }
  return rows;
}

const results = [];
const blockers = [];
const warnings = [];

for (const persona of PERSONAS) {
  process.stdout.write(`생성·검수: ${persona.label}… `);
  const input = normalizePipelineInput({
    ...persona.input,
    v4Speaker: persona.v4Speaker,
  });
  const ctx = {
    brandName: input.brandName,
    region: input.region,
    main: input.mainKeyword,
    industry: input.industry,
    topic: input.topic,
  };

  let blogProxy;
  let blogMode = "form_proxy";
  try {
    const resolved = await resolvePersonaBlogPack(persona.input, persona);
    blogProxy = resolved.pack;
    blogMode = resolved.mode;
  } catch (e) {
    blockers.push({ persona: persona.id, error: e.message });
    console.log("FAIL");
    continue;
  }

  const blogLabel = buildBaseContentLabel(input, blogProxy);
  let place;
  let insta;
  let image;
  try {
    place = runPlacePipeline(input, blogProxy, blogLabel);
    insta = runInstagramPipeline(input, blogProxy, "emotional", blogLabel);
    image = runImagePipeline(
      input,
      blogProxy,
      { purpose: "thumbnail", ratio: "16:9", tone: "white" },
      blogLabel
    );
  } catch (e) {
    blockers.push({ persona: persona.id, error: e.message });
    console.log("FAIL");
    continue;
  }

  const blogText = getBlogFullText(blogProxy);
  const pasteAudit = {
    blog: auditPastedDraft(blogText, ctx, "blog"),
    place: auditPastedDraft(
      [place.title, place.shortNotice, place.detailBody].filter(Boolean).join("\n\n"),
      ctx,
      "place"
    ),
    insta: auditPastedDraft(
      insta.lineBreakBody || insta.body,
      ctx,
      "instagram"
    ),
  };

  const blogScores = scorePack("blog", blogProxy, ctx);
  const channelCtx = {
    ...ctx,
    blogCoreScore: blogScores.core,
    blogTrainingScore: blogScores.training,
  };
  const scores = {
    blog: blogScores,
    place: scorePack("place", place, channelCtx),
    instagram: scorePack("instagram", insta, channelCtx),
  };

  const deriveFromBlog = testDerivationMatrix(blogProxy, null, null, input);
  const deriveFromPlace = testDerivationMatrix(null, place, null, input);
  const deriveFromInsta = testDerivationMatrix(null, null, insta, input);

  const latest = pickLatestSource({
    blogContent: blogProxy,
    placeContent: place,
    instagramContent: insta,
  });

  const row = {
    id: persona.id,
    label: persona.label,
    blogMode,
    scores,
    pastePass: {
      blog: pasteAudit.blog.pass,
      place: pasteAudit.place.pass,
      insta: pasteAudit.insta.pass,
    },
    pasteScore: {
      blog: pasteAudit.blog.score,
      place: pasteAudit.place.score,
      insta: pasteAudit.insta.score,
    },
    deriveFromBlog,
    deriveFromPlace,
    deriveFromInsta,
    imageOk: Boolean(image?.thumbnailPrompt),
    latestChannel: latest?.channel,
  };

  const blogOk =
    scores.blog.training >= TARGET && scores.blog.core >= TARGET;
  console.log(blogOk ? "OK" : `T${scores.blog.training}/C${scores.blog.core}`);

  for (const ch of ["blog", "place", "instagram"]) {
    const s = scores[ch];
    if (s.training < TARGET) {
      warnings.push(
        `${persona.id} ${ch}: training=${s.training} (<${TARGET}) blockers=${s.blockers.join(",")}`
      );
    }
    if (s.core < TARGET) {
      warnings.push(`${persona.id} ${ch}: core=${s.core}`);
    }
  }

  results.push(row);
}

function avg(arr) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

const blogTrainingAvg = avg(results.map((r) => r.scores.blog.training));
const blogCoreAvg = avg(results.map((r) => r.scores.blog.core));
const compositeAvg = Math.round(
  results.reduce(
    (a, r) =>
      a + Math.max(r.scores.blog.training, Math.round((r.scores.blog.training + r.scores.blog.core) / 2)),
    0
  ) / Math.max(1, results.length)
);
const allChannelAvg = Math.round(
  results.reduce(
    (a, r) =>
      a +
      (r.scores.blog.training +
        r.scores.place.training +
        r.scores.instagram.training) /
        3,
    0
  ) / Math.max(1, results.length)
);

const summary = {
  target: TARGET,
  coreTargetCode: CORE_TARGET_SCORE,
  llmMode: getLLMMode(),
  openai: isOpenAIConfigured(),
  openaiModel: isOpenAIConfigured() ? getOpenAIModel() : null,
  personas: results.length,
  compositeBlogAvg: compositeAvg,
  allChannelTrainingAvg: allChannelAvg,
  avgTraining: {
    blog: blogTrainingAvg,
    place: avg(results.map((r) => r.scores.place.training)),
    insta: avg(results.map((r) => r.scores.instagram.training)),
  },
  avgCore: {
    blog: blogCoreAvg,
    place: avg(results.map((r) => r.scores.place.core)),
    insta: avg(results.map((r) => r.scores.instagram.core)),
  },
  blogAtTarget: results.filter(
    (r) =>
      r.scores.blog.training >= TARGET && r.scores.blog.core >= TARGET
  ).length,
  underTarget: warnings.length,
  deriveBlogToPlace: results.filter((r) =>
    r.deriveFromBlog.find((d) => d.target === "place" && d.ok)
  ).length,
};

console.log("\n=== BRICLOG 10 페르소나 · 목표 95 ===\n");
console.log(JSON.stringify(summary, null, 2));
console.log("\n--- 페르소나별 ---");
for (const r of results) {
  console.log(
    `${r.label} [${r.blogMode}]: blog T${r.scores.blog.training}/C${r.scores.blog.core} | place T${r.scores.place.training}/C${r.scores.place.core} | insta T${r.scores.instagram.training}/C${r.scores.instagram.core}`
  );
}
if (warnings.length) {
  console.log(`\n--- ${TARGET}점 미만 (${warnings.length}건, 상위 15) ---`);
  warnings.slice(0, 15).forEach((w) => console.log(w));
}

const exitFail =
  blockers.length > 0 ||
  compositeAvg < TARGET ||
  allChannelAvg < TARGET - 5 ||
  summary.blogAtTarget < Math.ceil(PERSONAS.length * 0.7);
process.exit(exitFail ? 1 : 0);
