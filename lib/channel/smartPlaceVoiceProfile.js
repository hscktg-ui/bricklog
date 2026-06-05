/**
 * 스마트플레이스 공지 톤 — 학습 프로필 SSOT
 */
import { CHANNEL_TRENDS } from "@/lib/korean/writingTrends";
import { buildSmartPlaceProfile } from "@/lib/channel/channelVoiceLearner";
import learnedSmartPlaceProfile from "@/artifacts/smartplace-voice-learning/profile-latest.json" with { type: "json" };

export const SMARTPLACE_VOICE_VERSION = "v1";
export const SMARTPLACE_VOICE_PASS = 65;

const OWNER_MARKERS = [
  /안내(?:드립|해)/,
  /(?:운영|영업|휴무|입고|예약)/,
  /(?:공지|소식|이벤트|프로모)/,
  /(?:매장|저희|준비|마련)/,
];

const BLOG_LEAK_MARKERS = [
  /솔직\s*후기/,
  /다녀(?:왔|온)/,
  /블로그/,
  /SEO|키워드/,
  /체크리스트/,
  /알아보시다\s*보면/,
];

let cachedProfile = null;

function defaultProfile() {
  const staticTrends = CHANNEL_TRENDS.place || {};
  return {
    ...buildSmartPlaceProfile([]),
    source: "static",
    structureHints: staticTrends.trends || [],
    avoidPhrases: staticTrends.avoid || [],
    promptBlock: [
      "【스마트플레이스 · 기본 톤】",
      "사장님 공지 — 짧고 명확, 방문·예약·운영 중심. 블로그 후기체 금지.",
      ...(staticTrends.trends || []).map((t) => `- ${t}`),
    ].join("\n"),
  };
}

export function loadSmartPlaceVoiceProfile(force = false) {
  if (cachedProfile && !force) return cachedProfile;
  if (learnedSmartPlaceProfile && learnedSmartPlaceProfile.sampleCount) {
    cachedProfile = {
      ...defaultProfile(),
      ...learnedSmartPlaceProfile,
      source: "learned",
    };
    return cachedProfile;
  }
  cachedProfile = defaultProfile();
  return cachedProfile;
}

export function scoreSmartPlaceVoice(fullText) {
  const text = String(fullText || "");
  let owner = 0;
  let leak = 0;
  for (const re of OWNER_MARKERS) {
    if (re.test(text)) owner += 1;
  }
  for (const re of BLOG_LEAK_MARKERS) {
    if (re.test(text)) leak += 1;
  }
  const score = Math.min(100, 50 + owner * 12 - leak * 10);
  return { ok: owner >= 2 && leak === 0, score, ownerHits: owner, blogLeakHits: leak };
}

export function buildSmartPlaceVoicePromptBlock() {
  const profile = loadSmartPlaceVoiceProfile();
  if (profile.promptBlock && profile.sampleCount >= 20) return profile.promptBlock;
  return defaultProfile().promptBlock;
}

export function getSmartPlaceAvoidPhrases() {
  const profile = loadSmartPlaceVoiceProfile();
  return [...new Set([...(profile.avoidPhrases || []), ...(CHANNEL_TRENDS.place?.avoid || [])])];
}
