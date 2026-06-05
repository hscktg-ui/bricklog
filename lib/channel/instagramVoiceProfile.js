/**
 * 인스타그램 캡션 톤 — 학습 프로필 SSOT
 */
import { CHANNEL_TRENDS } from "@/lib/korean/writingTrends";
import { buildInstagramProfile } from "@/lib/channel/channelVoiceLearner";
import learnedInstagramProfile from "@/artifacts/instagram-voice-learning/profile-latest.json" with { type: "json" };

export const INSTAGRAM_VOICE_VERSION = "v1";
export const INSTAGRAM_VOICE_PASS = 65;

const CAPTION_MARKERS = [
  /(?:더라고요|더라구요|같아요|해요|했어요)/,
  /(?:감성|분위기|무드|장면|순간)/,
  /(?:~인\s*날|~한\s*날)/,
  /(?:근데|그래서|솔직히)/,
  /\n/,
];

const CHANNEL_LEAK_MARKERS = [
  /안내(?:드립|해)\s*니다/,
  /영업\s*시간\s*:/,
  /휴무\s*일/,
  /블로그/,
  /체크리스트/,
  /확인하세요/,
  /솔직\s*후기/,
  /다녀(?:왔|온)\s*후기/,
];

let cachedProfile = null;

function defaultProfile() {
  const staticTrends = CHANNEL_TRENDS.instagram || {};
  return {
    ...buildInstagramProfile([]),
    source: "static",
    structureHints: staticTrends.trends || [],
    avoidPhrases: staticTrends.avoid || [],
    promptBlock: [
      "【인스타그램 · 기본 톤】",
      "Hook+짧은 줄바꿈 캡션 — 공지·블로그체 금지, 저장·공감형 여운.",
      ...(staticTrends.trends || []).map((t) => `- ${t}`),
    ].join("\n"),
  };
}

export function loadInstagramVoiceProfile(force = false) {
  if (cachedProfile && !force) return cachedProfile;
  if (learnedInstagramProfile && learnedInstagramProfile.sampleCount) {
    cachedProfile = {
      ...defaultProfile(),
      ...learnedInstagramProfile,
      source: "learned",
    };
    return cachedProfile;
  }
  cachedProfile = defaultProfile();
  return cachedProfile;
}

export function scoreInstagramVoice(fullText) {
  const text = String(fullText || "");
  let voice = 0;
  let leak = 0;
  for (const re of CAPTION_MARKERS) {
    if (re.test(text)) voice += 1;
  }
  for (const re of CHANNEL_LEAK_MARKERS) {
    if (re.test(text)) leak += 1;
  }
  const shortLines = String(text || "").split(/\n+/).filter((l) => l.trim().length >= 4 && l.trim().length <= 52).length;
  const score = Math.min(100, 44 + voice * 10 + Math.min(14, shortLines * 3) - leak * 9);
  return { ok: voice >= 2 && leak <= 1, score, voiceHits: voice, leakHits: leak, shortLines };
}

export function buildInstagramVoicePromptBlock() {
  const profile = loadInstagramVoiceProfile();
  if (profile.promptBlock && profile.sampleCount >= 20) return profile.promptBlock;
  return defaultProfile().promptBlock;
}

export function getInstagramAvoidPhrases() {
  const profile = loadInstagramVoiceProfile();
  return [...new Set([...(profile.avoidPhrases || []), ...(CHANNEL_TRENDS.instagram?.avoid || [])])];
}
