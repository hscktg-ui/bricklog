/**
 * 3 페르소나 × 서로 다른 시작점(이야기 / 붙여넣기 검수 / 인스타) 여정 시뮬레이션
 * Run: npm run test:persona-journey
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { CUSTOMER_JOURNEY_PERSONAS } from "../lib/persona/customerJourneyPersonas.js";
import { resolveDerivationSource, pickLatestSource } from "../lib/content/channelSource.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  buildFormBlogProxy,
  normalizePipelineInput,
  buildBaseContentLabel,
} from "../lib/contentPipeline.js";
import { runPlaceStandalone, runInstagramStandalone } from "../lib/content/channelSource.js";
import {
  applyChannelFeedbackPatch,
  feedbackRegenSeed,
} from "../lib/content/blogDerive.js";
import { scoreTrainingContent } from "../lib/quality/training/scorer.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { auditPastedDraft } from "../lib/review/auditPastedDraft.js";
import { buildPasteReviewText } from "../lib/review/pasteChannelConfig.js";
import { resolveSensitiveCompliance } from "../lib/compliance/sensitiveCategories.js";
import { USER_QUALITY_GOAL } from "../lib/quality/qualityTargets.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const TARGET = USER_QUALITY_GOAL;

function scorePack(channel, pack, ctx) {
  const training = scoreTrainingContent(pack, ctx, channel);
  const core = scoreCoreContent(pack, ctx, channel);
  return {
    training: training.total,
    trainingPass: training.pass,
    blockers: training.blockers,
    core: core.total,
    corePass: core.pass,
  };
}

function derivationMatrix(state) {
  const targets = ["place", "instagram", "image", "blog"];
  return targets.map((target) => {
    const src = resolveDerivationSource(target, state);
    return {
      target,
      ok: Boolean(src),
      source: src?.sourceChannel ?? null,
      hasProxy: Boolean(src?.blogLike),
      standalone: Boolean(src?.standalone),
      deriveBlog: Boolean(src?.deriveBlog),
    };
  });
}

function simulateFeedbackLoop(persona, input, channel, pack, ctx) {
  const notes = [];
  let patchedInput = input;
  let currentPack = pack;

  for (const fb of persona.feedback) {
    const ch =
      channel === "instagram" || /인스타|해시|캡션|이모지/.test(fb)
        ? "instagram"
        : /플레이스|공지|짧|담백/.test(fb)
          ? "place"
          : "blog";
    patchedInput = applyChannelFeedbackPatch(patchedInput, fb, ch);

    if (/키워드/.test(fb) && patchedInput.keywordRepeatGuard) {
      notes.push("keyword_repeat_guard:on");
    }
    if (persona.category.includes("의료") && patchedInput.sensitiveCategory) {
      notes.push(`sensitive:${patchedInput.sensitiveCategory}`);
    }

    const blogProxy =
      ch === "blog" && currentPack?.sections
        ? currentPack
        : buildFormBlogProxy(patchedInput);
    const label = buildBaseContentLabel(patchedInput, blogProxy);

    if (ch === "place") {
      currentPack = runPlacePipeline(patchedInput, blogProxy, label);
    } else if (ch === "instagram") {
      currentPack = runInstagramPipeline(
        patchedInput,
        blogProxy,
        patchedInput.tone || "emotional",
        label
      );
    }

    const after = scorePack(ch, currentPack, ctx);
    notes.push(
      `fb:${ch} training=${after.training} core=${after.core} seed=${feedbackRegenSeed(fb)}`
    );
  }

  return { patchedInput, pack: currentPack, notes };
}

function runJourney(persona) {
  const input = normalizePipelineInput({
    ...persona.input,
    v4Speaker: persona.v4Speaker,
  });
  const ctx = {
    brandName: input.brandName,
    region: input.region,
    main: input.mainKeyword,
    industry: input.industry,
    excludePhrases: input.excludePhrases,
  };

  const journey = {
    id: persona.id,
    label: persona.label,
    category: persona.category,
    entryPoint: persona.entryPoint,
    steps: [],
    linkage: [],
    feedbackApplied: [],
    issues: [],
    qualityWarnings: [],
    scores: {},
  };

  let blog = null;
  let place = null;
  let insta = null;
  const blogLabel = buildBaseContentLabel(input, buildFormBlogProxy(input));

  if (persona.entryPoint === "blog") {
    blog = buildFormBlogProxy(input);
    blog._meta = { generationMode: "template", generatedAt: new Date().toISOString() };
    place = runPlacePipeline(input, blog, blogLabel);
    insta = runInstagramPipeline(input, blog, input.tone || "emotional", blogLabel);
    journey.steps.push("blog_form → place+insta 파생");
    const fbResult = simulateFeedbackLoop(persona, input, "place", place, ctx);
    place = fbResult.pack;
    journey.feedbackApplied = fbResult.notes;
    insta = runInstagramPipeline(
      fbResult.patchedInput,
      blog,
      fbResult.patchedInput.tone || "emotional",
      blogLabel
    );
    journey.steps.push("blog → 피드백(place·insta 톤) → insta 재파생");
  } else if (persona.entryPoint === "paste_place") {
    const fields = persona.pasteDraft || {};
    const pasteText = buildPasteReviewText("place", fields);
    const auditBefore = auditPastedDraft(pasteText, ctx, "place");
    journey.steps.push(
      `paste_place audit=${auditBefore.score} pass=${auditBefore.pass}`
    );
    place = runPlaceStandalone({
      ...input,
      placeTitle: fields.placeTitle,
      topic: fields.placeShort?.slice(0, 40) || input.topic,
    });
    place._meta = {
      ...place._meta,
      generationMode: "paste_review_input",
      source: "paste_review",
    };
    journey.scores.pasteAuditBefore = auditBefore.score;
    if (!auditBefore.pass) {
      journey.qualityWarnings.push("paste_place:검수 전 과장·키워드 과다(의도된 실패 케이스)");
    }
    const fbResult = simulateFeedbackLoop(persona, input, "place", place, ctx);
    place = fbResult.pack;
    journey.feedbackApplied = fbResult.notes;
    insta = runInstagramPipeline(
      fbResult.patchedInput,
      packToProxyFromPlace(place),
      fbResult.patchedInput.tone || "informative",
      blogLabel
    );
    journey.steps.push("paste_place → 피드백 → insta 파생");
  } else if (persona.entryPoint === "instagram") {
    insta = runInstagramStandalone(input, input.tone || "emotional");
    insta._meta = {
      ...insta._meta,
      generationMode: "standalone",
      generatedAt: new Date().toISOString(),
    };
    const matrix = derivationMatrix({
      blogContent: null,
      placeContent: null,
      instagramContent: insta,
      blogInput: input,
      baseContentLabel: blogLabel,
    });
    const blogSrc = matrix.find((d) => d.target === "blog");
    if (blogSrc?.ok && blogSrc.hasProxy) {
      blog = buildFormBlogProxy({
        ...input,
        tone: applyChannelFeedbackPatch(input, persona.feedback[0], "blog").tone,
        topic: `${input.topic} — ${insta.hook || "캡션 기반"}`,
      });
      blog._meta = {
        generationMode: "channel_proxy",
        sourceChannel: "instagram",
      };
      journey.steps.push("insta 단독 → blog 프록시 연계");
    } else {
      journey.issues.push("insta→blog 연계 실패");
    }
    place = runPlacePipeline(input, blog || buildFormBlogProxy(input), blogLabel);
    journey.steps.push("insta 기준 → place 파생");
    const fbResult = simulateFeedbackLoop(persona, input, "instagram", insta, ctx);
    insta = fbResult.pack;
    journey.feedbackApplied = fbResult.notes;
  }

  const state = { blogContent: blog, placeContent: place, instagramContent: insta, blogInput: input, baseContentLabel: blogLabel };
  journey.linkage = derivationMatrix(state);
  journey.scores = {
    blog: blog ? scorePack("blog", blog, ctx) : null,
    place: place ? scorePack("place", place, ctx) : null,
    instagram: insta ? scorePack("instagram", insta, ctx) : null,
  };

  if (persona.category.includes("의료")) {
    const sens = resolveSensitiveCompliance({
      industry: input.industry,
      mainKeyword: input.mainKeyword,
      brandType: "professional",
    });
    if (!sens.isSensitive) journey.issues.push("medical:민감 업종 미감지");
    else journey.steps.push(`medical_guard:${sens.userBadge || "ok"}`);
  }

  const latest = pickLatestSource({
    blogContent: blog,
    placeContent: place,
    instagramContent: insta,
  });
  journey.latestChannel = latest?.channel ?? null;

  const linkedTargets = journey.linkage.filter((d) => d.ok && d.target !== "blog");
  const crossOk = linkedTargets.length >= 2;
  if (!crossOk) journey.issues.push("cross_channel:2개 미만 연계");

  if (persona.entryPoint === "instagram") {
    const blogLink = journey.linkage.find((d) => d.target === "blog");
    if (!blog && !blogLink?.hasProxy && !blogLink?.ok) {
      journey.issues.push("insta_start:blog 연계 없음");
    }
  }

  for (const ch of ["blog", "place", "instagram"]) {
    const s = journey.scores[ch];
    if (!s) continue;
    if (s.training < TARGET) {
      journey.qualityWarnings.push(`${ch}:training ${s.training}<${TARGET}`);
    }
  }

  if (place && persona.entryPoint === "paste_place") {
    const pasteText = buildPasteReviewText("place", persona.pasteDraft || {});
    const auditAfter = auditPastedDraft(
      [place.title, place.shortNotice, place.detailBody].filter(Boolean).join("\n\n"),
      ctx,
      "place"
    );
    journey.scores.pasteAuditAfter = auditAfter.score;
    journey.steps.push(`paste_place after_fb audit=${auditAfter.score}`);
    if (auditAfter.score < journey.scores.pasteAuditBefore) {
      journey.issues.push("paste_place:피드백 후 점수 하락");
    }
  }

  const feedbackOk =
    journey.feedbackApplied.length >= Math.min(1, persona.feedback.length);
  if (!feedbackOk) {
    journey.issues.push("feedback:피드백 패치 미적용");
  }

  journey.pass = journey.issues.length === 0 && crossOk && feedbackOk;
  return journey;
}

function packToProxyFromPlace(place) {
  const body = [place.shortNotice, place.detailBody].filter(Boolean).join("\n\n");
  return {
    title: place.title || "플레이스",
    sections: [{ heading: "공지", body }],
    conclusion: place.cta || "",
    hashtags: [],
    _meta: { sourceChannel: "place" },
  };
}

const results = CUSTOMER_JOURNEY_PERSONAS.map(runJourney);
const report = {
  generatedAt: new Date().toISOString(),
  targetScore: TARGET,
  personas: results.length,
  passed: results.filter((r) => r.pass).length,
  results,
  extractedFeedback: CUSTOMER_JOURNEY_PERSONAS.map((p) => ({
    id: p.id,
    feedback: p.feedback,
    entryPoint: p.entryPoint,
  })),
};

const outPath = join(root, "config", "persona-journey", "last-run-report.json");
try {
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
} catch {
  /* config dir may be missing */
}

console.log("=== BRICLOG 3인 페르소나 여정 시뮬레이션 ===\n");
console.log(`목표 ${TARGET}점+ · 통과 ${report.passed}/${report.personas}\n`);

for (const r of results) {
  console.log(`${r.pass ? "✓" : "✗"} ${r.label} (${r.category})`);
  console.log(`  시작: ${r.entryPoint} → ${r.steps.join(" | ")}`);
  if (r.scores.blog) {
    console.log(
      `  점수 blog T${r.scores.blog.training}/C${r.scores.blog.core} | place T${r.scores.place?.training ?? "—"}/C${r.scores.place?.core ?? "—"} | insta T${r.scores.instagram?.training ?? "—"}/C${r.scores.instagram?.core ?? "—"}`
    );
  } else if (r.scores.place) {
    console.log(
      `  점수 place T${r.scores.place.training}/C${r.scores.place.core} | insta T${r.scores.instagram?.training ?? "—"}/C${r.scores.instagram?.core ?? "—"}`
    );
  }
  console.log(
    `  연계: ${r.linkage.map((d) => `${d.target}←${d.source || "—"}`).join(", ")}`
  );
  if (r.feedbackApplied?.length) {
    console.log(`  피드백: ${r.feedbackApplied.join(" · ")}`);
  }
  if (r.issues.length) {
    console.log(`  이슈: ${r.issues.join("; ")}`);
  }
  if (r.qualityWarnings?.length) {
    console.log(`  품질(템플릿): ${r.qualityWarnings.join("; ")}`);
  }
  console.log("");
}

if (report.passed < report.personas) {
  console.log("연계·피드백 여정 실패 — lib/content/channelSource.js · blogDerive.js 확인");
  process.exit(1);
}

console.log("OK — 3인 여정·채널 연계·피드백 반영 통과 (템플릿 품질 점수는 경고만 표시)");
process.exit(0);
