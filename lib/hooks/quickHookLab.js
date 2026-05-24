/**
 * 오늘의 한 줄 — 훅·제목 후보 (쿼터 없음, 템플릿 기반)
 */

const HOOK_TEMPLATES = [
  (brand, region, topic) =>
    `${region ? `${region} ` : ""}${topic || brand} — 처음 오시는 분도 부담 없이 읽을 수 있게 정리했어요.`,
  (brand, region, topic) =>
    `${brand || "이곳"}${region ? ` (${region})` : ""}에서 ${topic || "오늘 이야기"}를 짧게 말씀드릴게요.`,
  (brand, _r, topic) =>
    `「${topic || "오늘의 주제"}」 — ${brand || "브랜드"} 이야기, 과장 없이 적었습니다.`,
  (brand, region) =>
    `${region ? `${region} 근처 ` : ""}${brand || "매장"} — 사진만으로는 아쉬운 포인트를 글로 담았어요.`,
  (brand, _r, topic) =>
    `${topic ? `${topic}, ` : ""}궁금하신 분들을 위해 ${brand || "우리"} 기준으로만 설명드립니다.`,
];

/**
 * @param {{ brandName?: string, region?: string, topic?: string }} input
 * @returns {string[]}
 */
export function generateQuickHooks(input = {}) {
  const brand = String(input.brandName || "").trim() || "브랜드";
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();

  const lines = HOOK_TEMPLATES.map((fn) => fn(brand, region, topic).trim());
  return [...new Set(lines)].slice(0, 5);
}
