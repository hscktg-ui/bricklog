/**
 * 채널별 음성 학습용 검색 쿼리 — 스마트플레이스·인스타그램
 */

export const SMARTPLACE_LEARN_QUERIES = [
  "스마트플레이스 소식 공지",
  "네이버 플레이스 이벤트 안내",
  "매장 입고 공지",
  "영업시간 변경 안내",
  "휴무일 안내 매장",
  "신메뉴 출시 공지",
  "예약 오픈 안내",
  "카페 신메뉴 플레이스",
  "꽃집 시즌 이벤트 공지",
  "미용실 예약 안내",
  "가구점 전시 행사 안내",
  "병원 진료시간 변경",
  "약국 영업 안내",
  "헬스장 등록 이벤트",
  "학원 특강 안내",
  "매장 프로모션 공지",
  "플레이스 쿠폰 이벤트",
  "네이버 예약 할인",
  "오픈 기념 이벤트 매장",
  "연휴 운영 안내",
  "재고 입고 안내",
  "매장 휴무 공지",
  "사전 예약 안내",
  "방문 예약 안내",
  "매장 운영 공지",
];

export const INSTAGRAM_LEARN_QUERIES = [
  "인스타그램 캡션 감성",
  "인스타 피드 글쓰기",
  "로컬브랜드 인스타 캡션",
  "인스타그램 hook 문장",
  "카페 인스타 캡션",
  "꽃집 인스타 감성",
  "미용실 인스타 feed",
  "가구 인스타 콘텐츠",
  "맛집 인스타 캡션",
  "브랜드 인스타 줄바꿈",
  "인스타 저장각 캡션",
  "인스타그램 짧은 글",
  "MZ 인스타 캡션",
  "인스타 감성 문장",
  "피드 캡션 예시",
  "릴스 캡션 짧게",
  "인스타 오픈 소식",
  "신메뉴 인스타",
  "매장 인스타 감성",
  "인스타그램 후킹 멘트",
  "로컬 카페 인스타",
  "인스타그램 브랜드 톤",
  "인스타 캡션 마무리",
  "인스타그램 공감 글",
  "인스타 피드 톤앤매너",
];

export function buildSmartPlaceLearnQueries(limit = 40) {
  return SMARTPLACE_LEARN_QUERIES.slice(0, Math.max(1, limit));
}

export function buildInstagramLearnQueries(limit = 40) {
  return INSTAGRAM_LEARN_QUERIES.slice(0, Math.max(1, limit));
}

export function queryChannelHint(query = "", channel = "smartplace") {
  const q = String(query || "");
  if (/카페|커피|디저트/.test(q)) return "카페";
  if (/꽃|플라워/.test(q)) return "꽃집";
  if (/미용|헤어|네일/.test(q)) return "미용실";
  if (/가구|침대|쇼룸|전시/.test(q)) return "가구점";
  if (/병원|치과|한의/.test(q)) return "병원";
  if (/약국/.test(q)) return "약국";
  if (/헬스|필라테스|PT/.test(q)) return "헬스장";
  if (/학원|교육|특강/.test(q)) return "학원";
  if (/맛집|음식|메뉴/.test(q)) return "음식점";
  if (channel === "instagram") return "인스타";
  return "기타";
}
