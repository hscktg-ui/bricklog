/**
 * 인간 온도 검사 — 생성 전·후 품질 게이트
 */
import { containsOverused } from "@/lib/prompts/situations";
import { stripSourceCitations } from "@/lib/research/reinterpret";

const AD_SPAM = [
  /많은\s*분들이\s*문의/,
  /최근\s*문의가\s*늘/,
  /소개해\s*드릴/,
  /추천\s*드립/,
  /도움이\s*되/,
  /저장해\s*두/,
  /확인해\s*보세요/,
  /방문해\s*보세요/,
  /최고/,
  /최상/,
  /압도적/,
  /국내\s*유일/,
  /강력\s*추천/,
  /품격\s*있는/,
];

const NOT_HUMAN = [
  /해당\s*브랜드/,
  /브랜드가\s*지향/,
  /상권\s*분석/,
  /체류\s*시간/,
  /키워드\s*밀도/,
];

export function evaluateHumanTemperature(text, channel = "blog") {
  const t = stripSourceCitations(String(text || ""));
  const issues = [];

  if (containsOverused(t, channel)) issues.push("overused_phrase");
  for (const re of AD_SPAM) {
    if (re.test(t)) issues.push("ad_tone");
  }
  for (const re of NOT_HUMAN) {
    if (re.test(t)) issues.push("corporate_tone");
  }

  if (channel === "place" && /감성|분위기가\s*좋|마음이\s*편/.test(t)) {
    issues.push("too_emotional_for_place");
  }
  if (channel === "instagram" && t.length > 400 && !/\n/.test(t)) {
    issues.push("insta_too_long_block");
  }
  if (channel === "blog" && /많은\s*분들이/.test(t)) {
    issues.push("generic_blog_opening");
  }

  const ok = issues.length === 0;
  return {
    ok,
    issues,
    checks: {
      wouldSayThis: ok,
      ownerVoice: channel === "place" ? !issues.includes("too_emotional_for_place") : ok,
      experienceNotAd: !issues.includes("ad_tone"),
      noFiller: !issues.includes("corporate_tone"),
    },
  };
}

export function needsHumanRegeneration(text, channel) {
  const ev = evaluateHumanTemperature(text, channel);
  return { regen: !ev.ok, reason: ev.issues[0] || null, evaluation: ev };
}
