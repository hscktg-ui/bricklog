/**
 * 업종 기반 추상 예시 — 실제 브랜드명 없음
 * 스타일·리듬 참고용만 (출력 복사 금지)
 */

export const ABSTRACT_BLOG_SAMPLES = {
  flower: {
    label: "꽃집 브랜드",
    opening: "갑자기 기념일이 다가와서, 집 근처 꽃집을 찾게 된 날이 있었어요.",
    section: "생화 상태와 포장을 같이 보니, 사진만으로 고르기 어렵다는 게 느껴졌습니다.",
    close: "궁금한 점은 플레이스나 전화로 편하게 문의해 주세요.",
  },
  furniture: {
    label: "프리미엄 가구 브랜드",
    opening: "이사 날짜가 잡히면, 침대부터 사진으로만 고르기 시작하게 됩니다.",
    section: "쇼룸에서 재질·크기를 직접 보면 결정이 훨씬 빨라집니다.",
    close: "상담 예약 가능 여부는 방문 전에 확인해 두시면 편합니다.",
  },
  unmanned: {
    label: "무인매장 브랜드",
    opening: "늦은 시간에 들를 수 있는지가 먼저 보이는 타입이에요.",
    section: "상담 없이 고르는 방식이라, 처음에는 낯설 수도 있습니다.",
    close: "이용 방식은 매장 안내를 한 번 확인해 주세요.",
  },
  hospital: {
    label: "병원·클리닉",
    opening: "처음 내원 전에는 접수·주차·대기 시간을 같이 챙기게 됩니다.",
    section: "과장된 표현보다 상담 톤이 더 중요하게 느껴집니다.",
    close: "예약·문의는 전화로 확인해 주세요.",
  },
  cafe: {
    label: "동네 카페",
    opening: "혼자 작업하기 좋은 자리인지가 먼저 보이는 날이 있습니다.",
    section: "메뉴 사진보다 좌석 간격과 소음이 더 크게 느껴집니다.",
    close: "한산한 시간대는 평일 오전·늦은 오후 쪽입니다.",
  },
  default: {
    label: "로컬 매장",
    opening: "필요할 때마다 검색하기보다, 한번 가 보고 기억해 두는 편이 편합니다.",
    section: "사진과 현장 느낌이 다를 수 있어, 직접 확인해 보시는 게 낫습니다.",
    close: "문의는 플레이스 채널로 남겨 주세요.",
  },
};

export const ABSTRACT_PLACE_SAMPLES = {
  flower: "주말 꽃다발 추가 제작 완료",
  cafe: "시즌 메뉴 입고 — 평일 오전 한산",
  hospital: "접수·예약 문의는 전화로 편하게",
  default: "이번 주 운영 안내",
};

export const ABSTRACT_INSTA_SAMPLES = {
  flower: "생각보다 꽃은\n기분을 빨리 바꾼다",
  cafe: "커피 한 잔이\n하루 속도를 바꿀 때",
  default: "말 길게 안 할게요\n사진만 봐도 전해질 거예요",
};

export function getAbstractBlogSample(industryKey) {
  return (
    ABSTRACT_BLOG_SAMPLES[industryKey] ||
    ABSTRACT_BLOG_SAMPLES.default
  );
}
