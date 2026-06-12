/**
 * 브랜드 담당자 관점 화자 (v4Speaker: brand_intro) — 꽃 추천 pack 정렬 테스트
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "@/lib/product/contentQualityDelivery.js";
import {
  applySpeakerVoiceLockPack,
  scoreSpeakerSurfaceAlignment,
  resolveSpeakerDisplayLabel,
} from "@/lib/persona/speakerVoiceLock.js";
import {
  scorePersonaEngineAlignment,
  resolvePersonaEngineProfile,
} from "@/lib/persona/personaEngineProfile.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { personalizationBriefFromProfile } from "@/lib/auth/profilePersonalization.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_MISSION_ENFORCED = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 키오스크",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  accountBrief: personalizationBriefFromProfile({
    roleType: "brand_manager",
    brandCountBand: "1",
    mainIndustry: "꽃집",
  }),
  researchFacts: [
    { fact: "파주 운정 24시간 무인", source: "research" },
    { fact: "여름 수국·해바라기", source: "research" },
  ],
};

const profile = resolvePersonaEngineProfile(flowerInput);
assert.equal(resolveSpeakerDisplayLabel(flowerInput), "브랜드 소개형");
assert.equal(profile.id, "brand_editor_philosophy");
assert.equal(profile.archetype, "brand_editor");
assert.match(flowerInput.accountBrief, /브랜드 담당자/);

let pack = buildMissionProseFallbackPack(flowerInput);
pack = finalizeContentQualityForDelivery(pack, flowerInput, "blog");

const beforeLock = scorePersonaEngineAlignment(pack, flowerInput, profile);
const beforeSurface = scoreSpeakerSurfaceAlignment(pack, flowerInput);
const locked = applySpeakerVoiceLockPack(pack, flowerInput);
const afterLock = scorePersonaEngineAlignment(locked, flowerInput, profile);
const afterSurface = scoreSpeakerSurfaceAlignment(locked, flowerInput);
const full = getBlogFullText(locked);

const BRAND_VOICE_RES = [/저희|우리\s*매장|이곳|준비|지향|이야기/, /운영(?:하는|)|찾아\s*주(?:세요|시면)/];
const VISIT_LEAK_RES = [/들르게\s*됐|다녀(?:왔|온)|직접\s*확인(?:했|해)|쇼룸(?:에서|)/, /내돈내산|체험단|솔직\s*후기/];

const brandVoiceHit = BRAND_VOICE_RES.some((re) => re.test(full));
const visitLeak = VISIT_LEAK_RES.some((re) => re.test(full));

const report = {
  speaker: {
    v4Speaker: flowerInput.v4Speaker,
    label: resolveSpeakerDisplayLabel(flowerInput),
    profileId: profile.id,
    profileLabel: profile.label,
    archetype: profile.archetype,
    accountBrief: flowerInput.accountBrief,
  },
  delivery: {
    goldenScore: pack._meta?.goldenGate?.score,
    publishReady: pack._meta?.publishReady,
    humanVoiceMet: pack._meta?.humanVoiceMet,
  },
  beforeLock: {
    personaOk: beforeLock.ok,
    personaScore: beforeLock.score,
    issues: (beforeLock.issues || []).map((i) => i.type),
    surfaceOk: beforeSurface.ok,
    surfaceIssues: (beforeSurface.issues || []).map((i) => i.type),
  },
  afterLock: {
    personaOk: afterLock.ok,
    personaScore: afterLock.score,
    issues: (afterLock.issues || []).map((i) => i.type),
    surfaceOk: afterSurface.ok,
    surfaceIssues: (afterSurface.issues || []).map((i) => i.type),
    speakerVoiceLock: Boolean(locked._meta?.speakerVoiceLock),
    speakerSurfaceScrub: Boolean(locked._meta?.speakerSurfaceScrub),
  },
  voiceCheck: {
    brandEditorVoicePresent: brandVoiceHit,
    visitReviewLeakPresent: visitLeak,
  },
  sample: {
    title: locked.title,
    opening: String(locked.sections?.[0]?.body || "").slice(0, 320),
    headings: (locked.sections || []).map((s) => s.heading).filter(Boolean),
  },
};

console.log(JSON.stringify(report, null, 2));

assert.ok(afterSurface.ok, `surface alignment failed: ${JSON.stringify(afterSurface.issues)}`);
assert.equal(visitLeak, false, "brand_intro should not contain visit-review leak");
assert.ok(
  afterLock.score >= beforeLock.score || afterLock.ok,
  "speaker lock should improve or pass persona alignment"
);

console.log("OK: brand manager speaker (brand_intro) alignment test");
