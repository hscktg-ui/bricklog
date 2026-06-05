/**
 * 네이버 블로그 채널 프로필 — 학습 artifact 병합 (Node·API 전용)
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { CHANNEL_TRENDS } from "@/lib/korean/writingTrends";
import { NAVER_CATEGORY_BASELINES } from "@/lib/evolution-lab/naverTrendBaselines";
import { buildNaverBlogProfile } from "@/lib/channel/naverBlogLearner";
import {
  buildNaverBlogChannelPromptBlock as buildStaticPromptBlock,
  getNaverBlogAvoidPhrases as getStaticAvoidPhrases,
  getNaverBlogOpenerSignals as getStaticOpenerSignals,
  resolveCategoryBaseline,
} from "@/lib/channel/naverBlogChannelProfile.static";

const ARTIFACT_PATH = join(
  process.cwd(),
  "artifacts",
  "naver-blog-learning",
  "profile-latest.json"
);

let cachedProfile = null;

function readLearnedArtifact() {
  try {
    if (!existsSync(ARTIFACT_PATH)) return null;
    return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
  } catch {
    return null;
  }
}

function fallbackProfile() {
  return buildNaverBlogProfile([]);
}

export function loadNaverBlogChannelProfile(force = false) {
  if (cachedProfile && !force) return cachedProfile;

  const learned = readLearnedArtifact();
  const blogTrend = CHANNEL_TRENDS.blog || {};

  cachedProfile = {
    ...(learned || fallbackProfile()),
    staticTrends: blogTrend.trends || [],
    staticAvoid: blogTrend.avoid || [],
    categoryBaselines: NAVER_CATEGORY_BASELINES,
    source: learned ? "learned+static" : "static",
  };
  return cachedProfile;
}

export function buildNaverBlogChannelPromptBlock(ctx = {}) {
  const profile = loadNaverBlogChannelProfile();
  const staticBlock = buildStaticPromptBlock(ctx);
  if (!profile.promptBlock || profile.source === "static") return staticBlock;
  return [profile.promptBlock, staticBlock].filter(Boolean).join("\n");
}

export function getNaverBlogAvoidPhrases() {
  const profile = loadNaverBlogChannelProfile();
  return [
    ...new Set([
      ...getStaticAvoidPhrases(),
      ...(profile.avoidPhrases || []),
      ...(profile.staticAvoid || []),
    ]),
  ];
}

export function getNaverBlogOpenerSignals() {
  const profile = loadNaverBlogChannelProfile();
  const learned = (profile.openerSignals || []).filter(Boolean);
  if (!learned.length) return getStaticOpenerSignals();
  return [...new Set([...learned, ...getStaticOpenerSignals()])];
}

export { resolveCategoryBaseline };
