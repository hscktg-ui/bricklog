import { containsOverused, OVERUSED_PHRASES } from "@/lib/prompts/situations";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";
import { needsHumanRegeneration } from "@/lib/content/humanTemperature";
import { stripSourceCitations } from "@/lib/research/reinterpret";
import {
  detectBlogSanitizeIssues,
  sanitizeBlogPack,
} from "@/lib/integrity/blogSanitizer";
import { runFinalSelfReview } from "@/lib/persona/finalSelfReview";
import { evaluateContentQualityRoot } from "@/lib/quality/contentQualityRoot";
import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import { runHardValidation } from "@/lib/pipeline/v2/hardValidation";
import { prepareBlogPipelineV2 } from "@/lib/pipeline/v2/runBlogPipelineV2";
import { runFinalAudit } from "@/lib/ultimate/finalAudit";
import { detectNoCopyViolations } from "@/lib/ultimate/noCopyPolicy";
import { ensureBrandPresenceInPack } from "@/lib/persona/humanWritingFramework";
import { applyConstitutionToBlogPack } from "@/lib/constitution/writingConstitution";

const STRUCTURE_BANS = [
  "참고1",
  "참고2",
  "참고 1",
  "참고 2",
  "정리하자면",
  "체크해보세요",
  "검색하시는 분",
  "알아보시다 보면",
  "저장해 두셔도",
  "필요할 때 다시",
  "도움이 되길",
];

export function hasDuplicateSentences(text, minLen = 12) {
  const sentences = String(text || "")
    .split(/[.!?]\s+|\n+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= minLen);
  const seen = new Set();
  for (const s of sentences) {
    if (seen.has(s)) return true;
    seen.add(s);
  }
  return false;
}

export function countOverusedHits(text) {
  const t = String(text || "");
  let n = 0;
  for (const p of OVERUSED_PHRASES) {
    if (t.includes(p)) n++;
  }
  for (const p of STRUCTURE_BANS) {
    if (t.includes(p)) n++;
  }
  return n;
}

function regionStem(region) {
  return (region || "").replace(/\s*(시|구|군|동|역).*/, "").trim();
}

export function needsContentRegeneration(text, channel = "blog", ctx = {}) {
  const t = stripSourceCitations(text);
  if (!t || t.length < 40) return { regen: true, reason: "too_short" };
  if (hasDuplicateSentences(t)) return { regen: true, reason: "duplicate_sentence" };
  if (containsOverused(t) && countOverusedHits(t) >= 2) {
    return { regen: true, reason: "overused_phrases" };
  }
  if (channel === "blog" && hasMechanicalKeywordPattern(t)) {
    return { regen: true, reason: "mechanical_seo" };
  }
  if (channel === "blog") {
    const stem = regionStem(ctx.region);
    if (stem && new RegExp(`${stem}\\d+`, "i").test(t)) {
      return { regen: true, reason: "region_digit" };
    }
    const parking = (t.match(/영업\s+시간과\s+주차/g) || []).length;
    if (parking >= 2) return { regen: true, reason: "repeat_parking_line" };
    const late = (t.match(/늦게까지/g) || []).length;
    if (late >= 2) return { regen: true, reason: "repeat_late_night_line" };
    const blocks = t.split(/\n\n+/).map((b) => b.trim().toLowerCase()).filter((b) => b.length > 30);
    const dupBlock = blocks.some((b, i) => blocks.indexOf(b) !== i);
    if (dupBlock) return { regen: true, reason: "duplicate_paragraph" };
  }
  if (channel === "instagram" && /저장|다시 보|체크리스트/.test(t)) {
    return { regen: true, reason: "insta_cta_spam" };
  }
  if (channel === "place" && /블로그|체류|검색창|키워드|많은\s*분들이/.test(t)) {
    return { regen: true, reason: "blog_tone_in_place" };
  }
  const human = needsHumanRegeneration(t, channel);
  if (human.regen) return { regen: true, reason: human.reason || "human_temperature" };
  return { regen: false, reason: null };
}

/** mock 재생성: 시드만 바꿔 builder 재호출 */
export function buildWithRepetitionGuard(builder, ctx, args, opts = {}) {
  const max = opts.maxAttempts ?? (opts.channel === "blog" ? 5 : 2);
  const channel = opts.channel || "blog";
  let last = null;

  for (let i = 0; i < max; i++) {
    const seedCtx = {
      ...ctx,
      _regenAttempt: i,
      region: i > 0 ? `${ctx.region}` : ctx.region,
      purposeType:
        i > 0 && ctx.purposeType === "season"
          ? "visitDrive"
          : ctx.purposeType,
    };
    const prep =
      opts.channel === "blog" ? prepareBlogPipelineV2(seedCtx) : { ok: true };
    const buildCtx = prep.ok && prep.ctx ? prep.ctx : seedCtx;
    last = builder(buildCtx, ...args.slice(1));
    if (channel === "blog" && last) {
      last = sanitizeBlogPack(last, {
        region: seedCtx.region,
        brandName: seedCtx.brandName,
        main: seedCtx.main,
      });
      last = ensureBrandPresenceInPack(last, {
        region: seedCtx.region,
        brandName: seedCtx.brandName,
        main: seedCtx.main,
        personaModifiers: seedCtx.personaModifiers,
      });
      last = applyConstitutionToBlogPack(last, {
        region: seedCtx.region,
        brandName: seedCtx.brandName,
        main: seedCtx.main,
        topic: seedCtx.topic,
      });
      const sanitizeCheck = detectBlogSanitizeIssues(last, {
        region: seedCtx.region,
        brandName: seedCtx.brandName,
        main: seedCtx.main,
      });
      if (!sanitizeCheck.ok) {
        continue;
      }
      const review = runFinalSelfReview(last, {
        region: buildCtx.region,
        brandName: buildCtx.brandName,
        main: buildCtx.main,
        industryLabel: buildCtx.industryLabel,
        contentIntent: buildCtx.contentIntent,
        contentPersona: buildCtx.contentPersona,
        topic: buildCtx.topic,
        rawFragments: buildCtx.rawFragments,
        pipeline: buildCtx.pipeline,
      });
      const root = evaluateContentQualityRoot(last, buildCtx, "blog");
      const hard = runHardValidation(last, buildCtx);
      const score = computeFinalQualityScore(last, buildCtx);
      const noCopy = detectNoCopyViolations(last, buildCtx.brandResearch);
      const audit = runFinalAudit(last, buildCtx, seedCtx);
      if (
        review.regen ||
        !root.ok ||
        !hard.ok ||
        !score.pass ||
        !noCopy.ok ||
        !audit.ok
      ) {
        continue;
      }
      if (last._meta?.blocked) continue;
    }
    const text =
      channel === "blog"
        ? [
            last?.representativeTitle,
            ...(last?.sections || []).map((s) => s.body),
            last?.conclusion,
          ].join("\n")
        : channel === "place"
          ? [last?.title, last?.shortBody, last?.detailBody].join("\n")
          : [last?.hook, last?.body, last?.ending].join("\n");

    const check = needsContentRegeneration(text, channel, seedCtx);
    if (!check.regen) {
      return { pack: last, regenAttempts: i + 1, regenReason: null };
    }
  }

  return {
    pack: last,
    regenAttempts: max,
    regenReason: needsContentRegeneration(
      channel === "blog"
        ? (last?.sections || []).map((s) => s.body).join("\n")
        : "",
      channel
    ).reason,
  };
}
