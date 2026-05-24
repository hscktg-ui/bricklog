/**
 * 수집된 실제 신호만 업종 분류 — 키워드 매칭
 */
export const INDUSTRY_BUCKETS = [
  { key: "flower", label: "꽃집", keywords: ["꽃", "플라워", "꽃다발", "어버이", "가정의달", "선물"] },
  { key: "cafe", label: "카페", keywords: ["카페", "커피", "디저트", "브런치", "베이커리"] },
  { key: "hospital", label: "병원", keywords: ["병원", "의원", "진료", "건강", "검진"] },
  { key: "furniture", label: "가구", keywords: ["가구", "침대", "매트리스", "인테리어", "리빙"] },
  { key: "realestate", label: "부동산", keywords: ["부동산", "아파트", "분양", "전세", "매매"] },
  { key: "beauty", label: "뷰티", keywords: ["뷰티", "피부", "헤어", "네일", "화장품"] },
  { key: "education", label: "교육", keywords: ["학원", "교육", "입시", "어린이", "영어"] },
  { key: "wedding", label: "웨딩", keywords: ["웨딩", "결혼", "스드메", "예식"] },
  { key: "pet", label: "반려동물", keywords: ["반려", "펫", "강아지", "고양이", "동물"] },
  { key: "automotive", label: "자동차", keywords: ["자동차", "전기차", "세차", "정비", "타이어"] },
  { key: "lifestyle", label: "생활서비스", keywords: ["세탁", "청소", "이사", "수리", "배달"] },
];

export function classifySignals(signals = []) {
  const buckets = {};
  for (const b of INDUSTRY_BUCKETS) {
    buckets[b.key] = { ...b, signals: [], themeCounts: {} };
  }

  for (const sig of signals) {
    const text = `${sig.title} ${sig.snippet || ""} ${sig.keyword || ""}`;
    let matched = false;
    for (const b of INDUSTRY_BUCKETS) {
      if (b.keywords.some((kw) => text.includes(kw))) {
        buckets[b.key].signals.push(sig);
        matched = true;
        for (const kw of b.keywords) {
          if (text.includes(kw)) {
            buckets[b.key].themeCounts[kw] =
              (buckets[b.key].themeCounts[kw] || 0) + 1;
          }
        }
      }
    }
    if (!matched) {
      if (!buckets.other) {
        buckets.other = {
          key: "other",
          label: "기타·종합",
          signals: [],
          themeCounts: {},
        };
      }
      buckets.other.signals.push(sig);
    }
  }

  return Object.values(buckets).filter((b) => b.signals.length > 0);
}
