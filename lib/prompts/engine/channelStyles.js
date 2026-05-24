/** 업종 × 채널별 실무 톤·시각·금지 가이드 */
export const CHANNEL_STYLES = {
  flower: {
    place: {
      angle: "시즌 꽃·선물·기념일",
      visitHook: "지금 꽃 상태가 좋아 방문 문의가 늘었어요",
      avoid: "과한 할인·최저가 표현",
    },
    insta: {
      angle: "감성·선물·일상 스냅",
      hookStyle: "저장",
      emojiMax: 1,
    },
    image: {
      palette: "white background, fresh flowers, soft natural light",
      mood: "premium local florist, emotional gift",
      avoid: "hospital, dark mood, watermark",
    },
  },
  hospital: {
    place: {
      angle: "접수·상담·검진 안내",
      visitHook: "방문 전 확인하시면 대기·상담이 수월해요",
      avoid: "완치·100%·최고·치료 보장",
    },
    insta: {
      angle: "정보·신뢰·내원 전 체크",
      hookStyle: "info",
      emojiMax: 0,
    },
    image: {
      palette: "clean white and soft blue, bright daylight",
      mood: "trustworthy clinic interior, calm reception",
      avoid: "before-after, dramatic medical ads, smiling patient guarantee",
    },
  },
  furniture: {
    place: {
      angle: "쇼룸 체험·공간감·상담",
      visitHook: "직접 앉아 보고 재질·동선을 확인해 보세요",
      avoid: "즉시 최저가·무조건 할인",
    },
    insta: {
      angle: "공간·프리미엄·라이프스타일",
      hookStyle: "premium",
      emojiMax: 1,
    },
    image: {
      palette: "hotel-like showroom, warm ambient lighting, wide space",
      mood: "premium furniture display, depth and texture",
      avoid: "clutter, cheap flash sale banner",
    },
  },
  cafe: {
    place: {
      angle: "분위기·시그니처·좌석",
      visitHook: "요즘 메뉴·좌석 분위기 궁금하시면 들러보세요",
      avoid: "맛집 1위·무조건 대기",
    },
    insta: {
      angle: "공간·브런치·동네 카페",
      hookStyle: "lifestyle",
      emojiMax: 2,
    },
    image: {
      palette: "bright cafe interior, natural window light, white cup",
      mood: "cozy Korean neighborhood cafe, lifestyle",
      avoid: "fast food, neon club",
    },
  },
  default: {
    place: {
      angle: "방문·상담·지역 신뢰",
      visitHook: "근처에서 찾으시는 분들께 편하게 안내드려요",
      avoid: "과장 광고",
    },
    insta: {
      angle: "동네·추천·일상",
      hookStyle: "lifestyle",
      emojiMax: 1,
    },
    image: {
      palette: "bright natural light, white tone, Korean local shop",
      mood: "trustworthy neighborhood business",
      avoid: "watermark, stock photo feel",
    },
  },
};

export function getChannelStyle(industryKey, channel) {
  const base = CHANNEL_STYLES[industryKey] || CHANNEL_STYLES.default;
  return base[channel] || CHANNEL_STYLES.default[channel];
}
