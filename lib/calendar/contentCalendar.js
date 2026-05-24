/**
 * 월별 추천 콘텐츠 소재 (캘린더 기반, 시의성 가이드)
 */
const MONTH_TOPICS = {
  1: ["새해", "설", "연초 정리", "겨울 실내"],
  2: ["설", "졸업", "입학", "발렌타인"],
  3: ["봄 시즌", "환절기", "새 학기"],
  4: ["봄 나들이", "야외", "피크닉"],
  5: ["어버이날", "스승의날", "부부의날", "가정의달", "초여름"],
  6: ["장마", "여름 준비", "휴가 계획", "여름 메뉴"],
  7: ["휴가철", "장마", "무더위"],
  8: ["휴가", "여름 마감", "개학 전"],
  9: ["추석", "가을", "한가위"],
  10: ["가을", "단풍", "연말 준비"],
  11: ["연말", "쌀쌀함", "겨울 시즌"],
  12: ["크리스마스", "연말", "선물"],
};

const BY_INDUSTRY = {
  flower: {
    5: ["어버이날 꽃다발", "감사 꽃", "가정의달"],
    6: ["장마 배송", "여름 꽃"],
  },
  cafe: {
    5: ["브런치", "시즌 음료"],
    6: ["아이스 음료", "장마 실내"],
  },
};

export function getContentCalendar(month, industryKey) {
  const m = month || new Date().getMonth() + 1;
  const general = MONTH_TOPICS[m] || [];
  const industry = BY_INDUSTRY[industryKey]?.[m] || [];
  return {
    month: m,
    generalTopics: general,
    industryTopics: industry,
    all: [...new Set([...industry, ...general])],
  };
}
