/**
 * 채널별 Humanity 검사 — 온라인 표본(네이버 API 학습) 평균 대비
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { evaluateHumanTemperature } from "@/lib/content/humanTemperature";
import { loadExperienceVoiceProfile, scoreExperienceVoice } from "@/lib/content/experienceVoiceProfile";
import { scoreSmartPlaceVoice, loadSmartPlaceVoiceProfile } from "@/lib/channel/smartPlaceVoiceProfile";
import { scoreInstagramVoice, loadInstagramVoiceProfile } from "@/lib/channel/instagramVoiceProfile";
import { scoreHumanity, HUMANITY_MIN } from "@/lib/quality/v4ContentAudit";
import { countCliches } from "@/lib/quality/channelHumanityHelpers.js";

export const CHANNEL_HUMANITY_VERSION = "v1";
export const CHANNEL_HUMANITY_PASS = 70;
export const CHANNEL_HUMANITY_TARGET = 95;

const NAVER_PROFILE = join(process.cwd(), "artifacts", "naver-blog-learning", "profile-latest.json");

const BLOG_FIELD_RES = [
  /직접\s*(?:가|방문|다녀|체험|누워|확인)/,
  /다녀(?:왔|온)/,
  /(?:느꼈|체감|먹어\s*보|누워\s*보)/,
  /매장|쇼룸|현장/,
];

const BLOG_VOICE_RES = [
  /(?:했|였|봤|갔)어요/,
  /(?:더|같)아요/,
  /거든요/,
  /(?:근데|그래서|솔직히|사실)/,
  /더라(?:구|고)요/,
  /그렇더라(?:구|고)요/,
  /(?:솔직히\s*말하면|개인적으로|해보니까?|가보니까?)/,
  /(?:생각보다|의외로|인\s*듯)/,
];

const BLOG_CHECKLIST_RES = [
  /확인하세요/,
  /권합니다/,
  /체크리스트/,
  /알아두(?:세요|면)/,
  /소개해\s*드/,
];

const PLACE_OWNER_RES = [
  /안내(?:드립|해)/,
  /(?:운영|영업|휴무|입고|예약|방문|준비|마련)/,
  /(?:매장|저희)/,
];

const PLACE_BLOG_LEAK_RES = [
  /솔직\s*후기/,
  /다녀(?:왔|온)/,
  /블로그/,
  /SEO|키워드/,
  /체크리스트/,
];

const INSTA_CAPTION_RES = [
  /(?:더라고요|더라구요|같아요|해요|했어요|어요)/,
  /(?:감성|분위기|무드|장면|순간|문득|그날)/,
  /(?:~인\s*날|~한\s*날)/,
];

const INSTA_LEAK_RES = [
  /안내(?:드립|해)\s*니다/,
  /영업\s*시간/,
  /솔직\s*후기/,
  /다녀(?:왔|온)\s*후기/,
  /체크리스트/,
  /결론(?:적|부터)/,
];

function loadNaverMetrics() {
  try {
    if (existsSync(NAVER_PROFILE)) {
      return JSON.parse(readFileSync(NAVER_PROFILE, "utf8"));
    }
  } catch {
    /* */
  }
  return null;
}

function markerRate(text, resList) {
  if (!resList.length) return 0;
  let hits = 0;
  for (const re of resList) {
    if (re.test(text)) hits += 1;
  }
  return Math.round((hits / resList.length) * 1000) / 10;
}

function haeyoPer1k(text) {
  const len = Math.max(1, String(text || "").replace(/\s/g, "").length);
  const n = (String(text || "").match(/(?:해요|했어요|더라(?:구|고)요|거든요|네요)/g) || []).length;
  return Math.round((n / len) * 1000 * 10) / 10;
}

function shortLineRate(text) {
  const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return 0;
  const short = lines.filter((l) => l.length <= 52).length;
  return Math.round((short / lines.length) * 1000) / 10;
}

function resolveIndustryCategory(input = {}) {
  const ind = String(input.industry || input.industryText || "");
  if (/가구|침대|매트리스|쇼룸|소파/.test(ind)) return "가구점";
  if (/카페/.test(ind)) return "카페";
  if (/꽃/.test(ind)) return "꽃집";
  if (/음식|맛집|식당/.test(ind)) return "음식점";
  return null;
}

/** 온라인 채널 평균(학습 프로필) */
export function loadChannelHumanityBaseline(channel = "blog", input = {}) {
  const naver = loadNaverMetrics();
  const cat = resolveIndustryCategory(input);
  const catMetrics = cat && naver?.categoryBreakdown?.[cat] ? naver.categoryBreakdown[cat] : null;

  if (channel === "blog") {
    const exp = loadExperienceVoiceProfile();
    return {
      channel: "blog",
      source: "experience-voice + naver-blog-learning",
      sampleCount: exp.sampleCount || naver?.sampleCount || 0,
      online: {
        experienceRate: exp.rates?.experienceRate ?? 85,
        fieldRate: catMetrics?.fieldRate ?? naver?.metrics?.fieldRate ?? 20,
        voiceRate: catMetrics?.voiceRate ?? naver?.metrics?.voiceRate ?? 45,
        checklistRateMax: catMetrics?.checklistRate ?? naver?.metrics?.checklistRate ?? 5,
        haeyoPer1kMin: 1.2,
        experienceMarkerMin: 3,
      },
    };
  }

  if (channel === "place" || channel === "smartplace") {
    const sp = loadSmartPlaceVoiceProfile();
    return {
      channel: "smartplace",
      source: "smartplace-voice-learning",
      sampleCount: sp.sampleCount || 0,
      online: {
        ownerVoiceRate: sp.rates?.ownerVoiceRate ?? 45,
        blogLeakRateMax: sp.rates?.blogLeakRate ?? 5,
        shortLineRateMin: 55,
        detailCharsMin: 120,
        detailCharsMax: 400,
      },
    };
  }

  const ig = loadInstagramVoiceProfile();
  return {
    channel: "instagram",
    source: "instagram-voice-learning",
    sampleCount: ig.sampleCount || 0,
    online: {
      voiceRate: ig.rates?.voiceRate ?? 45,
      placeLeakRateMax: ig.rates?.placeLeakRate ?? 15,
      blogLeakRateMax: ig.rates?.blogLeakRate ?? 5,
      shortLineRateMin: 60,
      hookCharsMax: 56,
    },
  };
}

function compareToBaseline(actual, baseline, higherIsBetter = true) {
  const delta = Math.round((actual - baseline) * 10) / 10;
  const ok = higherIsBetter ? actual >= baseline * 0.85 : actual <= baseline * 1.15;
  return { actual, baseline, delta, ok };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {'blog'|'place'|'smartplace'|'instagram'} channel
 */
export function scoreChannelHumanity(pack, ctx = {}, channel = "blog") {
  const ch = channel === "smartplace" ? "place" : channel;
  const input = ctx.input || ctx;
  const baseline = loadChannelHumanityBaseline(ch, input);
  const full =
    ch === "blog"
      ? getBlogFullText(pack)
      : getChannelFullText(pack, ch === "place" ? "place" : "instagram");

  const temp = evaluateHumanTemperature(full, ch === "blog" ? "blog" : ch);
  const comparisons = [];
  const issues = [];
  let score = 50;

  if (ch === "blog") {
    const exp = scoreExperienceVoice(full);
    const fieldR = markerRate(full, BLOG_FIELD_RES);
    const voiceR = markerRate(full, BLOG_VOICE_RES);
    const checklistR = markerRate(full, BLOG_CHECKLIST_RES);
    const haeyo = haeyoPer1k(full);
    const v4 = scoreHumanity(pack, ctx);
    const clicheN = countCliches(full);

    comparisons.push({
      id: "experience_markers",
      ...compareToBaseline(exp.hits, baseline.online.experienceMarkerMin),
    });
    comparisons.push({
      id: "field_rate",
      ...compareToBaseline(fieldR, baseline.online.fieldRate * 0.6),
    });
    comparisons.push({
      id: "voice_rate",
      ...compareToBaseline(voiceR, baseline.online.voiceRate * 0.45),
    });
    comparisons.push({
      id: "checklist_leak",
      ...compareToBaseline(checklistR, baseline.online.checklistRateMax, false),
    });
    comparisons.push({
      id: "haeyo_density",
      ...compareToBaseline(haeyo, baseline.online.haeyoPer1kMin),
    });

    score =
      exp.score * 0.28 +
      Math.min(100, fieldR * 1.4) * 0.18 +
      Math.min(100, voiceR * 1.6) * 0.18 +
      v4.score * 0.22 +
      (temp.ok ? 88 : Math.max(40, 88 - temp.issues.length * 12)) * 0.14;

    if (!exp.ok) issues.push("experience_below_online");
    if (checklistR > baseline.online.checklistRateMax * 2) issues.push("checklist_above_online");
    if (clicheN > 0) issues.push("ai_cliche");
    if (v4.score < HUMANITY_MIN) issues.push("v4_humanity_low");
    if (!temp.ok) issues.push(...temp.issues);
  } else if (ch === "place") {
    const sp = scoreSmartPlaceVoice(full);
    const ownerR = markerRate(full, PLACE_OWNER_RES);
    const blogLeakR = markerRate(full, PLACE_BLOG_LEAK_RES);
    const detailLen = String(pack.detailBody || "").replace(/\s/g, "").length;

    comparisons.push({
      id: "owner_voice",
      ...compareToBaseline(ownerR, baseline.online.ownerVoiceRate * 0.35),
    });
    comparisons.push({
      id: "blog_leak",
      ...compareToBaseline(blogLeakR, baseline.online.blogLeakRateMax, false),
    });
    comparisons.push({
      id: "detail_length",
      ...compareToBaseline(
        detailLen,
        baseline.online.detailCharsMin
      ),
    });

    score = sp.score * 0.45 + Math.min(100, ownerR * 2.2) * 0.35 + (temp.ok ? 85 : 60) * 0.2;
    if (!sp.ok) issues.push("place_voice_below_online");
    if (blogLeakR > 0) issues.push("blog_leak_on_place");
    if (detailLen < baseline.online.detailCharsMin) issues.push("place_too_short");
    if (!temp.checks?.ownerVoice) issues.push("not_owner_voice");
  } else {
    const ig = scoreInstagramVoice(full);
    const capR = markerRate(full, INSTA_CAPTION_RES);
    const leakR = markerRate(full, INSTA_LEAK_RES);
    const lineR = shortLineRate(full);
    const hookLen = String(pack.hook || "").replace(/\s/g, "").length;

    comparisons.push({
      id: "caption_voice",
      ...compareToBaseline(capR, baseline.online.voiceRate * 0.35),
    });
    comparisons.push({
      id: "channel_leak",
      ...compareToBaseline(leakR, baseline.online.placeLeakRateMax * 0.4, false),
    });
    comparisons.push({
      id: "short_lines",
      ...compareToBaseline(lineR, baseline.online.shortLineRateMin),
    });
    comparisons.push({
      id: "hook_length",
      actual: hookLen,
      baseline: baseline.online.hookCharsMax,
      delta: hookLen - baseline.online.hookCharsMax,
      ok: hookLen >= 8 && hookLen <= baseline.online.hookCharsMax,
    });

    score = ig.score * 0.4 + Math.min(100, lineR * 1.1) * 0.25 + Math.min(100, capR * 2) * 0.2 + (temp.ok ? 82 : 55) * 0.15;
    if (!ig.ok) issues.push("insta_voice_below_online");
    if (leakR > 0) issues.push("place_or_blog_leak_on_insta");
    if (lineR < baseline.online.shortLineRateMin * 0.7) issues.push("insta_not_linebroken");
    if (hookLen > baseline.online.hookCharsMax) issues.push("hook_too_long");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const passCount = comparisons.filter((c) => c.ok).length;
  const ok =
    score >= CHANNEL_HUMANITY_PASS &&
    passCount >= Math.ceil(comparisons.length * 0.6) &&
    !issues.includes("checklist_above_online") &&
    !issues.includes("blog_leak_on_place");

  return {
    version: CHANNEL_HUMANITY_VERSION,
    channel: ch,
    ok,
    score,
    baseline,
    comparisons,
    issues: [...new Set(issues)],
    temperature: temp,
    passCount,
    comparisonTotal: comparisons.length,
    vsOnline:
      ok && score >= CHANNEL_HUMANITY_PASS
        ? "online_avg_or_above"
        : score >= CHANNEL_HUMANITY_PASS - 8
          ? "near_online_avg"
          : "below_online_avg",
  };
}

export function formatChannelHumanityReport(result) {
  const lines = [
    `【${result.channel} humanity】 ${result.ok ? "PASS" : "FAIL"} score=${result.score} (${result.vsOnline})`,
    `  baseline: ${result.baseline.source} n=${result.baseline.sampleCount}`,
  ];
  for (const c of result.comparisons) {
    lines.push(
      `  · ${c.id}: ${c.actual} vs online~${c.baseline} (${c.ok ? "ok" : "low"})`
    );
  }
  if (result.issues.length) lines.push(`  issues: ${result.issues.join(", ")}`);
  return lines.join("\n");
}
