/**
 * 네이버 블로그 채널 프로필 — 정적 트렌드 (클라이언트·서버 공용)
 */
import { CHANNEL_TRENDS } from "@/lib/korean/writingTrends";
import { NAVER_CATEGORY_BASELINES } from "@/lib/evolution-lab/naverTrendBaselines";
import { buildNaverBlogProfile } from "@/lib/channel/naverBlogLearner";
import {
  getNaverCategoryTargets,
  resolveNaverLearnCategory,
} from "@/lib/channel/naverBlogEngineRules";

let cachedProfile = null;

function fallbackProfile() {
  return buildNaverBlogProfile([]);
}

export function loadNaverBlogChannelProfile(force = false) {
  if (cachedProfile && !force) return cachedProfile;

  const blogTrend = CHANNEL_TRENDS.blog || {};

  cachedProfile = {
    ...fallbackProfile(),
    staticTrends: blogTrend.trends || [],
    staticAvoid: blogTrend.avoid || [],
    categoryBaselines: NAVER_CATEGORY_BASELINES,
    source: "static",
  };
  return cachedProfile;
}

export function buildNaverBlogChannelPromptBlock(ctx = {}) {
  const profile = loadNaverBlogChannelProfile();
  const industry = String(ctx.industry || ctx.industryLabel || "").trim();
  const cat = resolveNaverLearnCategory(industry);
  const targets = getNaverCategoryTargets(industry);
  const baseline =
    NAVER_CATEGORY_BASELINES[industry] ||
    NAVER_CATEGORY_BASELINES[
      Object.keys(NAVER_CATEGORY_BASELINES).find((k) => industry.includes(k)) || ""
    ] ||
    null;

  const lines = [
    profile.promptBlock || "",
    `업종(${cat}) 학습 목표: 구어체 ${Math.round(targets.voiceRate)}% · 체크리스트 ${targets.checklistRate}% 이하`,
    baseline
      ? `베이스라인: ${baseline.introStyle} · ${baseline.storytelling} · ${baseline.reviewStyle}`
      : "",
    profile.staticTrends?.length
      ? `문체: ${profile.staticTrends.slice(0, 4).join(" · ")}`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export function getNaverBlogAvoidPhrases() {
  const profile = loadNaverBlogChannelProfile();
  return [...new Set([...(profile.avoidPhrases || []), ...(profile.staticAvoid || [])])];
}

export function getNaverBlogOpenerSignals() {
  const profile = loadNaverBlogChannelProfile();
  const fromPhrases = (profile.voicePhrases || [])
    .map((p) => p.phrase)
    .filter(Boolean)
    .flatMap((p) => {
      const hits = [];
      if (/직접/.test(p)) hits.push("직접");
      if (/다녀/.test(p)) hits.push("다녀");
      if (/솔직/.test(p)) hits.push("솔직");
      if (/처음/.test(p)) hits.push("처음");
      if (/예약/.test(p)) hits.push("예약");
      if (/가봤/.test(p)) hits.push("가봤");
      return hits;
    });
  return [...new Set([...(profile.openerSignals || []), ...fromPhrases])];
}

export function resolveCategoryBaseline(industry = "") {
  const key = Object.keys(NAVER_CATEGORY_BASELINES).find((k) =>
    String(industry || "").includes(k)
  );
  return key ? NAVER_CATEGORY_BASELINES[key] : null;
}
