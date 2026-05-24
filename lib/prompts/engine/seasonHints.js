/** 현재 시즌 힌트 (한국 로컬 마케팅) */
export function getSeasonHint(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) {
    return {
      key: "spring",
      label: "봄",
      tags: ["봄꽃", "봄시즌", "화사한", "새학기"],
      mood: "화사하고 가벼운",
    };
  }
  if (m >= 6 && m <= 8) {
    return {
      key: "summer",
      label: "여름",
      tags: ["여름시즌", "시원한", "휴가", "초록"],
      mood: "맑고 산뜻한",
    };
  }
  if (m >= 9 && m <= 11) {
    return {
      key: "autumn",
      label: "가을",
      tags: ["가을시즌", "감성", "선물", "추석"],
      mood: "따뜻하고 차분한",
    };
  }
  return {
    key: "winter",
    label: "겨울",
    tags: ["겨울시즌", "연말", "선물", "크리스마스"],
    mood: "포근하고 정돈된",
  };
}
