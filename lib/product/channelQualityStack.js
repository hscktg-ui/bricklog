/**
 * place · instagram — 블로그와 동일 품질 축 (채널 형식에 맞게 완화)
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

function softenChannelRecallEndings(text = "") {
  const recallRe = /(?:더라구요|더라고요|거든요|었어요)/g;
  const alt = ["해요", "했습니다", "네요", "어요", "입니다", "해 주세요"];
  let recallSeen = 0;
  return String(text || "").replace(recallRe, (match) => {
    recallSeen += 1;
    if (recallSeen <= 2) return match;
    return alt[(recallSeen - 3) % alt.length];
  });
}

function applyChannelRecallSoftenPass(pack, channel = "instagram") {
  if (channel !== "instagram" || !pack) return pack;
  const recallRe = /(?:더라구요|더라고요|거든요|었어요)/g;
  const alt = ["해요", "했습니다", "네요", "어요", "입니다", "해 주세요"];
  let recallSeen = 0;
  const softenField = (text) =>
    String(text || "").replace(recallRe, (match) => {
      recallSeen += 1;
      if (recallSeen <= 2) return match;
      return alt[(recallSeen - 3) % alt.length];
    });

  const hook = softenField(pack.hook);
  const body = softenField(pack.body);
  const ending = softenField(pack.ending);
  const lineBreakBody = softenField(pack.lineBreakBody || pack.body);
  return {
    ...pack,
    hook,
    body,
    ending,
    lineBreakBody,
    legacyBody: lineBreakBody,
  };
}
import {
  detectForbiddenIntro,
  FORBIDDEN_INTRO_PATTERNS,
} from "@/lib/product/editorIntroRules";
import {
  ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
  ANTI_SEO_SPAM_PRONOUNS,
  resolveAntiSeoTopicPronouns,
  softenTokenRepeats,
  scoreAntiSeoSpam,
} from "@/lib/product/antiSeoSpamEngine";
import {
  detectIndustryCommonSenseViolations,
  detectRegionCommonSenseViolations,
  detectSentenceStructureOveruse,
  detectForcedEntityStacking,
  scoreSentenceLengthVariety,
} from "@/lib/product/humanityCommonSenseEngine";
import {
  detectSeoSentenceSmell,
  detectDuplicateContentViolations,
} from "@/lib/product/contentQualityEngine";
import {
  scoreHumanBelief,
  HUMAN_BELIEF_MIN_SCORE,
} from "@/lib/product/humanBeliefEngine";
import {
  scoreChannelPersonaAlignment,
  applyChannelPersonaMetaPass,
} from "@/lib/persona/personaEngineProfile";
import {
  applyChannelMarketerPack,
  detectChannelMarketerIssues,
} from "@/lib/content/channelMarketerEngine";
import {
  isMechanicalListingTitle,
  rewriteMechanicalTitle,
} from "@/lib/content/humanTitleEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { applyLocalEditorBeliefPassToText } from "@/lib/content/humanBeliefGate";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { applyChannelStoryGate } from "@/lib/content/channelStoryEngine";
import { scoreSmartPlaceVoice } from "@/lib/channel/smartPlaceVoiceProfile";
import { detectPlaceReviewLeak } from "@/lib/channel/smartPlaceNoticeGuard";

function dedupeInstaLineBreakBody(pack) {
  const field = pack?.lineBreakBody ? "lineBreakBody" : "body";
  const raw = String(pack[field] || "").trim();
  if (!raw) return pack;
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set();
  const kept = [];
  for (const line of lines) {
    const key = line.replace(/\s/g, "").slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }
  const next = kept.join("\n\n") || raw;
  return {
    ...pack,
    [field]: next,
    body: field === "lineBreakBody" ? next : pack.body,
    legacyBody: field === "lineBreakBody" ? next : pack.legacyBody,
  };
}

export const CHANNEL_QUALITY_VERSION = "v1";

const CHANNEL_BLOG_TONE_RE =
  /(이번\s*글|결론적으로|정리하면|소제목|서론|본론|마무리|알아보시다\s*보면)/;

function stripForbiddenIntroText(text = "") {
  let out = String(text || "").trim();
  if (!out) return out;
  const sentences = splitKoreanSentences(out);
  const filtered = sentences.filter((s) => detectForbiddenIntro(s).ok);
  if (filtered.length && filtered.length < sentences.length) {
    return filtered.join(" ").trim();
  }
  for (const re of FORBIDDEN_INTRO_PATTERNS) {
    out = out.replace(re, "").trim();
  }
  return out.replace(/^\s*[,，]\s*/, "").trim();
}

function softenEntityRepeatsInText(text = "", input = {}) {
  let out = String(text || "");
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (brand) {
    out = softenTokenRepeats(
      out,
      brand,
      ANTI_SEO_SPAM_PRONOUNS.brand,
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
    );
  }
  if (region) {
    out = softenTokenRepeats(
      out,
      region,
      ANTI_SEO_SPAM_PRONOUNS.region,
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
    );
  }
  if (topic) {
    out = softenTokenRepeats(
      out,
      topic,
      resolveAntiSeoTopicPronouns(input),
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT + 1
    );
  }
  return out;
}

function polishTextField(text, input = {}) {
  if (!text?.trim()) return text;
  return softenEntityRepeatsInText(stripForbiddenIntroText(text), input);
}

/**
 * 채널 필드 — 도입 클리셰·억지 반복 완화
 */
export function applyChannelEditorPolishPass(pack, channel = "place", input = {}) {
  if (!pack || !isBriclogMissionEnforced()) return pack;

  if (channel === "place") {
    let title = String(pack.title || "").trim();
    if (title && isMechanicalListingTitle(title, {}, input)) {
      title = rewriteMechanicalTitle(title, {}, input, input.contentPerspective || "brand");
    }
    return {
      ...pack,
      title: title || pack.title,
      shortNotice: pack.shortNotice
        ? polishTextField(pack.shortNotice, input)
        : pack.shortNotice,
      detailBody: pack.detailBody
        ? polishTextField(pack.detailBody, input)
        : pack.detailBody,
    };
  }

  if (channel === "instagram") {
    const bodyKey = pack.lineBreakBody ? "lineBreakBody" : "body";
    return {
      ...pack,
      hook: pack.hook ? polishTextField(pack.hook, input) : pack.hook,
      [bodyKey]: pack[bodyKey]
        ? polishTextField(pack[bodyKey], input)
        : pack[bodyKey],
      ending: pack.ending ? polishTextField(pack.ending, input) : pack.ending,
    };
  }

  return pack;
}

function scoreChannelLineVariety(fullText = "") {
  const lines = String(fullText || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.replace(/\s/g, "").length >= 12);
  if (lines.length < 3) {
    return { ok: false, score: 45, short: 0, medium: 0, long: 0, kinds: 1 };
  }
  let short = 0;
  let medium = 0;
  let long = 0;
  for (const line of lines) {
    const n = line.replace(/\s/g, "").length;
    if (n < 36) short += 1;
    else if (n <= 88) medium += 1;
    else long += 1;
  }
  const kinds = [short > 0, medium > 0, long > 0].filter(Boolean).length;
  const hasMediumLine = lines.some((l) => l.replace(/\s/g, "").length >= 28);
  const ok =
    kinds >= 2 ||
    (lines.length >= 4 && medium + long >= 1) ||
    (lines.length >= 5 && hasMediumLine);
  return { ok, score: ok ? 72 + kinds * 8 : 48, short, medium, long, kinds };
}

export function scoreChannelHumanityCommonSense(pack, channel = "place", input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, humanRead: true, issues: [], checks: {} };
  }
  const full = getChannelFullText(pack, channel);
  const structure = detectSentenceStructureOveruse(full);
  const variety =
    channel === "place" || channel === "instagram"
      ? scoreChannelLineVariety(full)
      : scoreSentenceLengthVariety(full);
  const industry = detectIndustryCommonSenseViolations(full, input);
  const region = detectRegionCommonSenseViolations(full, input);
  const stack = detectForcedEntityStacking(
    { title: pack.title || pack.hook, sections: [{ body: full }] },
    {},
    input
  );

  const issues = [
    ...structure.issues,
    ...industry.issues,
    ...region.issues,
    ...stack.issues,
  ];
  if (!variety.ok) issues.push({ type: "sentence_length_flat" });

  let score = 86;
  if (!structure.ok) score -= 14;
  if (!variety.ok) score -= 8;
  if (!industry.ok) score -= 24;
  if (!region.ok) score -= 16;
  if (!stack.ok) score -= 18;
  score = Math.max(0, Math.min(100, score));

  const structureOk =
    structure.ok ||
    ((channel === "place" || channel === "instagram") && variety.ok);
  const hardFail = !industry.ok || !region.ok || !stack.ok || !structureOk;
  const humanRead = score >= 65 && !hardFail;

  return {
    ok: humanRead,
    score,
    humanRead,
    issues,
    checks: { structure, variety, industry, region, stack },
    channel,
  };
}

export function scoreChannelEditorQuality(pack, channel = "place", input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, editorPass: true, issues: [] };
  }
  const full = getChannelFullText(pack, channel);
  const introForbidden = detectForbiddenIntro(
    channel === "instagram"
      ? String(pack.hook || "").slice(0, 200)
      : String(pack.shortNotice || pack.detailBody || "").slice(0, 200)
  );
  const structure = detectSentenceStructureOveruse(full);
  const seo = scoreAntiSeoSpam(full, input);
  const blogTone = CHANNEL_BLOG_TONE_RE.test(full);

  const issues = [];
  if (!introForbidden.ok) issues.push({ type: "channel_intro_cliche" });
  if (!structure.ok) issues.push({ type: "channel_structure_repeat" });
  if (!seo.ok) issues.push({ type: "channel_seo_smell" });
  if (blogTone) issues.push({ type: "channel_blog_tone_leak" });

  let score = 88;
  if (!introForbidden.ok) score -= 18;
  if (!structure.ok) score -= 12;
  if (!seo.ok) score -= 14;
  if (blogTone) score -= 16;
  score = Math.max(0, Math.min(100, score));

  const editorPass = score >= 62 && !blogTone && introForbidden.ok;

  return { ok: editorPass, score, editorPass, issues, channel };
}

export function scoreChannelSpecialQuality(pack, channel = "place", input = {}) {
  const reasons = [];
  if (channel === "place") {
    const title = String(pack?.title || "").trim();
    const shortNotice = String(pack?.shortNotice || "").trim();
    const detailBody = String(pack?.detailBody || "").trim();
    const detailLen = detailBody.replace(/\s/g, "").length;
    if (title.length < 6) reasons.push("place_title_too_short");
    if (shortNotice.length < 12) reasons.push("place_notice_too_short");
    if (detailLen < 80) reasons.push("place_detail_too_short");
    if (detailLen > 620) reasons.push("place_detail_too_long");
    if (CHANNEL_BLOG_TONE_RE.test(`${title}\n${shortNotice}\n${detailBody}`)) {
      reasons.push("place_blog_tone");
    }
    if (detectPlaceReviewLeak(`${title}\n${shortNotice}\n${detailBody}`)) {
      reasons.push("place_review_tone");
    }
    const voice = scoreSmartPlaceVoice(`${title}\n${shortNotice}\n${detailBody}`);
    if (!voice.ok) {
      if (voice.blogLeakHits > 0) reasons.push("place_review_leak");
      if (voice.ownerHits < 2) reasons.push("place_missing_owner_voice");
    }
  } else if (channel === "instagram") {
    const body = String(pack?.lineBreakBody || pack?.body || "").trim();
    const bodyLen = body.replace(/\s/g, "").length;
    const lineCount = body.split(/\n+/).filter((l) => l.trim()).length;
    const hashtagCount = Array.isArray(pack?.hashtags) ? pack.hashtags.length : 0;
    const minLen =
      String(input.instaBodyLength || "medium").toLowerCase() === "short"
        ? 50
        : String(input.instaBodyLength || "").toLowerCase() === "long"
          ? 260
          : 120;
    if (bodyLen < minLen) reasons.push("insta_body_too_short");
    if (lineCount < 2) reasons.push("insta_line_break_thin");
    if (hashtagCount < 3) reasons.push("insta_hashtag_low");
    if (hashtagCount > 14) reasons.push("insta_hashtag_over");
    if (CHANNEL_BLOG_TONE_RE.test(body)) reasons.push("insta_blog_tone");
  }
  return { ok: reasons.length === 0, reasons, channel };
}

export function scoreChannelContentQuality(pack, channel = "place", ctx = {}, input = {}) {
  if (!isBriclogMissionEnforced()) {
    return {
      ok: true,
      score: 100,
      humanEditorPass: true,
      issues: [],
      checks: {},
    };
  }

  const evalInput = input || ctx.input || ctx;
  const full = getChannelFullText(pack, channel);
  const humanity = scoreChannelHumanityCommonSense(pack, channel, evalInput);
  const editor = scoreChannelEditorQuality(pack, channel, evalInput);
  const persona = scoreChannelPersonaAlignment(pack, evalInput, channel);
  const marketer = detectChannelMarketerIssues(pack, channel, ctx, evalInput);
  const special = scoreChannelSpecialQuality(pack, channel, evalInput);
  const industry = detectIndustryCommonSenseViolations(full, evalInput);
  const region = detectRegionCommonSenseViolations(full, evalInput);
  const seo = detectSeoSentenceSmell(full);
  const dup = detectDuplicateContentViolations(full);
  const belief = scoreHumanBelief(full, evalInput, pack);

  const issues = [
    ...humanity.issues,
    ...editor.issues,
    ...industry.issues,
    ...region.issues,
    ...seo.issues,
    ...dup.issues,
    ...(marketer.ok ? [] : marketer.issues.slice(0, 4)),
    ...(persona.ok ? [] : persona.issues.slice(0, 3)),
    ...(special.ok ? [] : special.reasons.map((r) => ({ type: r }))),
    ...(belief.ok ? [] : [{ type: "human_belief" }]),
  ];

  let score = Math.round(
    humanity.score * 0.35 +
      editor.score * 0.2 +
      (belief.score || 0) * 0.25 +
      (persona.score || 0) * 0.2
  );
  if (!special.ok) score -= 8;
  if (!marketer.ok) score -= 6;
  score = Math.max(0, Math.min(100, score));

  const dupHard =
    channel === "place" || channel === "instagram"
      ? dup.issues?.some((i) => i.type === "exact_sentence_repeat")
      : !dup.ok;

  const hardFail =
    !industry.ok ||
    !region.ok ||
    !seo.ok ||
    dupHard ||
    CHANNEL_BLOG_TONE_RE.test(full);

  const beliefFloor =
    channel === "place" || channel === "instagram"
      ? HUMAN_BELIEF_MIN_SCORE - 18
      : HUMAN_BELIEF_MIN_SCORE - 14;

  const humanEditorPass =
    score >= 60 &&
    !hardFail &&
    humanity.humanRead &&
    editor.editorPass &&
    belief.score >= beliefFloor &&
    persona.score >= 52;

  return {
    ok: humanEditorPass,
    score,
    humanEditorPass,
    humanReadLikely: humanity.humanRead,
    issues,
    checks: { humanity, editor, persona, marketer, special, belief, seo, dup },
    channel,
  };
}

export function applyChannelContentQualityMetaPass(
  pack,
  channel = "place",
  ctx = {},
  input = {}
) {
  const scored = scoreChannelContentQuality(pack, channel, ctx, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contentQuality: scored,
      humanEditorPass: scored.humanEditorPass,
      channelEditor: scored.checks?.editor,
      editorV95Pass: scored.checks?.editor?.editorPass,
      humanityCommonSense: scored.checks?.humanity,
      channelQualityStack: CHANNEL_QUALITY_VERSION,
    },
  };
}

/**
 * @param {"place"|"instagram"} channel
 */
export function assessChannelFirstDeliveryQuality(pack, channel = "place", input = {}) {
  if (!pack) {
    return { ok: false, displayReady: false, reasons: ["empty_pack"], channel };
  }

  if (!isBriclogMissionEnforced()) {
    return { ok: true, displayReady: true, reasons: [], channel };
  }

  const cq =
    pack._meta?.contentQuality ||
    scoreChannelContentQuality(pack, channel, { input }, input);
  const persona =
    pack._meta?.personaEngineAlignment ||
    scoreChannelPersonaAlignment(pack, input, channel);
  const belief = pack._meta?.humanBelief || {
    score: pack._meta?.humanBeliefScore,
    ok: pack._meta?.humanBelief?.ok,
  };
  const editor = pack._meta?.channelEditor || scoreChannelEditorQuality(pack, channel, input);
  const special =
    pack._meta?.channelSpecialQuality || scoreChannelSpecialQuality(pack, channel, input);
  const marketer = pack._meta?.channelMarketerGate;

  const reasons = [];
  if (!cq?.humanEditorPass) reasons.push("first_delivery_channel_editor");
  if (!editor?.editorPass) reasons.push("first_delivery_channel_intro");
  const personaFloor = channel === "place" || channel === "instagram" ? 64 : 70;
  if (!persona?.ok && (persona?.score ?? 0) < personaFloor) {
    reasons.push("first_delivery_persona");
  }
  const beliefFloor =
    channel === "place" || channel === "instagram"
      ? HUMAN_BELIEF_MIN_SCORE - 18
      : HUMAN_BELIEF_MIN_SCORE - 10;
  if ((belief?.score ?? 0) < beliefFloor) {
    reasons.push("first_delivery_human_belief");
  }
  if (special?.ok === false) reasons.push("first_delivery_channel_format");
  if (marketer?.ok === false) reasons.push("first_delivery_channel_marketer");

  let displayReady = reasons.length === 0;
  const fromBlog =
    input.sourceChannel === "blog" ||
    pack._meta?.sourceChannel === "blog" ||
    pack._meta?.derivedFromBlog;
  if (
    !displayReady &&
    fromBlog &&
    cq?.humanEditorPass &&
    belief?.ok !== false &&
    !CHANNEL_BLOG_TONE_RE.test(getChannelFullText(pack, channel))
  ) {
    displayReady = !reasons.some((r) =>
      /industry|region|seo|human_belief/.test(r)
    );
  }

  return {
    ok: displayReady,
    displayReady,
    reasons,
    channel,
    scores: { contentQuality: cq?.score, persona: persona?.score, belief: belief?.score },
  };
}

export function resolveChannelPassOutputAfterFinish(
  pack,
  channel = "place",
  input = {},
  basePass = false
) {
  if (!isBriclogMissionEnforced()) return Boolean(basePass);
  const first = assessChannelFirstDeliveryQuality(pack, channel, input);
  return (
    Boolean(basePass) &&
    first.displayReady &&
    pack?._meta?.humanEditorPass !== false &&
    pack?._meta?.personaAligned !== false
  );
}

/**
 * 블로그 파생·LLM 채널 공통 — humanity finish 확장
 */
export function applyChannelQualityStack(pack, channel = "place", ctx = {}) {
  const input = ctx.input || ctx;
  if (!pack) return pack;

  let next = applyChannelEditorPolishPass(pack, channel, input);
  next = applyChannelHumanityCommonSenseMetaPass(next, channel, input);
  next = applyChannelMarketerPack(next, channel, ctx, input);
  next = applyChannelPersonaMetaPass(next, input, channel);
  next = applyChannelContentQualityMetaPass(next, channel, ctx, input);

  const full = getChannelFullText(next, channel);
  const belief = scoreHumanBelief(full, input, next);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanBeliefScore: belief.score,
      humanBelief: belief,
      channelQualityStack: CHANNEL_QUALITY_VERSION,
    },
  };
}

function applyChannelHumanityCommonSenseMetaPass(pack, channel, input) {
  const sense = scoreChannelHumanityCommonSense(pack, channel, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      humanityCommonSense: sense,
      humanReadLikely: sense.humanRead,
    },
  };
}

/**
 * 파생·로컬 파이프라인 출구
 */
export function finishChannelPack(channel, pack, ctx = {}) {
  if (!pack) return pack;
  if (pack._meta?.channelPackFinished) return pack;
  const input = ctx.input || ctx;
  const insights = ctx.insights || pack._meta?.blogInsights;
  const stackCtx = { input, ...ctx, insights: insights || ctx.insights };

  let next =
    channel === "instagram"
      ? dedupeInstaLineBreakBody(pack)
      : applyDuplicateKiller(pack, stackCtx, channel);
  next = applyChannelQualityStack(next, channel, stackCtx);
  if (isBriclogMissionEnforced()) {
    next = applyChannelStoryGate(next, channel, stackCtx);
  }
  next = applyChannelRecallSoftenPass(next, channel);
  next =
    channel === "instagram"
      ? dedupeInstaLineBreakBody(next)
      : applyDuplicateKiller(next, stackCtx, channel);

  if (channel === "place") {
    next = {
      ...next,
      shortNotice: next.shortNotice
        ? applyLocalEditorBeliefPassToText(next.shortNotice)
        : next.shortNotice,
      detailBody: next.detailBody
        ? applyLocalEditorBeliefPassToText(next.detailBody)
        : next.detailBody,
    };
  } else if (channel === "instagram") {
    const bodyKey = next.lineBreakBody ? "lineBreakBody" : "body";
    next = {
      ...next,
      hook: next.hook ? applyLocalEditorBeliefPassToText(next.hook) : next.hook,
      [bodyKey]: next[bodyKey]
        ? applyLocalEditorBeliefPassToText(next[bodyKey])
        : next[bodyKey],
      ending: next.ending
        ? applyLocalEditorBeliefPassToText(next.ending)
        : next.ending,
    };
  }

  const belief = scoreHumanBelief(getChannelFullText(next, channel), input, next);
  next = {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanBeliefScore: belief.score,
      humanBelief: belief,
      channelFirstDelivery: assessChannelFirstDeliveryQuality(next, channel, input),
      channelPackFinished: true,
      sourceChannel: ctx.sourceChannel || pack._meta?.sourceChannel || "blog",
      derivedFromBlog: Boolean(ctx.sourceChannel === "blog" || pack._meta?.derivedFrom),
    },
  };

  return next;
}
