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
  /다녀(?:왔|온|가|갔)/,
  /방문\s*후기/,
  /(?:봤|느껴|느꼈)(?:어요|는)/,
  /블로그/,
  /SEO|키워드/,
  /체크리스트/,
  /알아보시다\s*보면/,
  /선택\s*팁/,
  /(?:만족|추천)(?:해|했)(?:요|드)/,
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
      "네이버 마켓 공지판 — 업체(사장) 1인칭 저희·매장·안내드립니다. 운영·입고·이벤트·예약 중심.",
      "고객 후기·방문기·「다녀왔/솔직 후기」·체험담 금지. 블로그 요약·SEO체 금지.",
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
