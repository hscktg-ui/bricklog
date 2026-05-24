import { normalizeUserId } from "@/lib/user/workspaceStorage";

const key = (userId) => `briclog-feedback-${normalizeUserId(userId)}`;

export const FEEDBACK_NEGATIVE_REASONS = [
  { id: "gpt_tone", label: "GPT 느낌" },
  { id: "repeat", label: "반복 문장" },
  { id: "ad_like", label: "광고 같음" },
  { id: "low_emotion", label: "감성 부족" },
  { id: "low_info", label: "정보 부족" },
  { id: "brand_weak", label: "브랜드 느낌 부족" },
  { id: "place_weak", label: "플레이스 느낌 부족" },
  { id: "insta_weak", label: "인스타 느낌 부족" },
  { id: "seo_weak", label: "SEO 부족" },
];

export function loadFeedbackLog(userId) {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(userId)) || "[]");
  } catch {
    return [];
  }
}

export function saveFeedback(userId, entry) {
  const list = loadFeedbackLog(userId);
  list.unshift({
    ...entry,
    at: new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    localStorage.setItem(key(userId), JSON.stringify(list.slice(0, 200)));
  }
  return list[0];
}

export function saveRewriteFeedback(userId, entry) {
  return saveFeedback(userId, {
    ...entry,
    rating: "rewrite",
    type: "rewrite",
  });
}

export function getFeedbackStats(userId, brandId) {
  const list = loadFeedbackLog(userId).filter(
    (e) => !brandId || e.brandId === brandId
  );
  const negative = list.filter((e) => e.rating === "down");
  const reasonCounts = {};
  for (const n of negative) {
    for (const r of n.reasons || []) {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }
  }
  return { total: list.length, negative: negative.length, reasonCounts };
}
