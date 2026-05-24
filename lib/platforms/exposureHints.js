/** 플랫폼별 노출·구조 힌트 */
export const PLATFORM_EXPOSURE = {
  blog: {
    id: "naver_blog",
    label: "네이버 블로그",
    hints: [
      "첫 3줄에 방문·공감 이유 — 스크롤 전환",
      "대표 이미지·제목 클릭을 고려한 도입",
      "모바일 문단 3~4문장 줄바꿈",
      "체류시간 — 중간 질문·상황 삽입",
    ],
  },
  place: {
    id: "smartplace",
    label: "스마트플레이스",
    hints: [
      "첫 문장에 운영·입고·예약 핵심",
      "한눈에 보는 공지형",
      "블로그 요약문 금지",
    ],
  },
  instagram: {
    id: "instagram",
    label: "인스타그램",
    hints: [
      "첫 2줄 Hook — 저장 전환",
      "줄바꿈 리듬 유지",
      "검색 키워드 나열 금지",
    ],
  },
};

export function getExposureBrief(channel) {
  const p = PLATFORM_EXPOSURE[channel];
  if (!p) return "";
  return `[${p.label}] ${p.hints.join(" · ")}`;
}
