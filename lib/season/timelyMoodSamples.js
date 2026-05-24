/**
 * 오늘 날짜 기준 한국 시의성·정서 샘플 (캘린더 연동)
 */
import { getActiveSeasonContext } from "./seasonEngine";

const MONTH_PROFILES = {
  1: {
    monthLabel: "1월",
    mood: "새해·설 · 차분한 시작",
    samples: [
      "새해 첫 방문",
      "설 연휴 전후 혼잡",
      "따뜻한 실내 분위기",
      "연초 정리·교체 수요",
    ],
  },
  2: {
    monthLabel: "2월",
    mood: "설·졸업·입학 · 짧은 기념일",
    samples: [
      "졸업·입학 축하",
      "설 명절 선물",
      "짧은 휴일 일정",
      "첫 방문 예약",
    ],
  },
  3: {
    monthLabel: "3월",
    mood: "봄 시작 · 환기·전환",
    samples: [
      "봄 시즌 오픈",
      "환절기 실내 분위기",
      "산책 후 들르기",
      "새 메뉴·신상",
    ],
  },
  4: {
    monthLabel: "4월",
    mood: "봄 본격 · 야외·꽃",
    samples: [
      "봄꽃·야외 테이블",
      "피크닉·산책",
      "선선한 저녁",
      "봄맞이 이벤트",
    ],
  },
  5: {
    monthLabel: "5월",
    mood: "가정의 달 · 어버이날 · 초여름",
    samples: [
      "어버이날 선물",
      "스승의날 감사",
      "가정의달 프로모션",
      "초여름 시즌 메뉴",
      "주말 가족 방문",
    ],
  },
  6: {
    monthLabel: "6월",
    mood: "여름 시작 · 장마 전",
    samples: [
      "여름 시즌 오픈",
      "장마 전 예약",
      "시원한 메뉴",
      "휴가 전 준비",
    ],
  },
  7: {
    monthLabel: "7월",
    mood: "장마 · 휴가철",
    samples: [
      "비 오는 날 실내",
      "휴가철 혼잡",
      "시원·청량 톤",
      "여름 한정",
    ],
  },
  8: {
    monthLabel: "8월",
    mood: "휴가 · 무더위",
    samples: [
      "휴가철 피크",
      "늦은 시간 이용",
      "시원한 공간",
      "여름 마감 이벤트",
    ],
  },
  9: {
    monthLabel: "9월",
    mood: "추석 · 가을",
    samples: [
      "추석 연휴",
      "한가위 선물",
      "가을 시즌 전환",
      "연휴 전후 예약",
    ],
  },
  10: {
    monthLabel: "10월",
    mood: "가을 · 단풍 · 선선함",
    samples: [
      "가을 감성",
      "선선한 날씨",
      "실내 따뜻함",
      "가을 한정",
    ],
  },
  11: {
    monthLabel: "11월",
    mood: "연말 준비 · 쌀쌀함",
    samples: [
      "연말 예약",
      "쌀쌀한 날 실내",
      "선물·모임",
      "겨울 시즌 예고",
    ],
  },
  12: {
    monthLabel: "12월",
    mood: "연말 · 크리스마스",
    samples: [
      "크리스마스",
      "연말 모임",
      "선물 수요",
      "연말 운영 안내",
    ],
  },
};

const CHANNEL_HINTS = {
  blog: "시의성 + 브랜드 스토리로 읽히게",
  place: "한 줄 공지로 오늘의 소식",
  insta: "짧은 장면·공감 한 줄",
  image: "시즌 무드·비주얼 키워드",
};

function formatKoreanDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const w = weekdays[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${w})`;
}

export function getTimelyMoodPack(date = new Date(), channel = "blog") {
  const m = date.getMonth() + 1;
  const profile = MONTH_PROFILES[m] || MONTH_PROFILES[5];
  const season = getActiveSeasonContext(date);
  const eventLine = season.eventLabel
    ? `이번 달 이슈: ${season.eventLabel}`
    : null;

  const samples = [
    ...profile.samples,
    ...(season.eventTags || []).slice(0, 2),
  ].slice(0, 8);

  return {
    todayLabel: formatKoreanDate(date),
    monthLabel: profile.monthLabel,
    moodLine: profile.mood,
    seasonLine: `계절: ${season.label} · ${season.mood}`,
    eventLine,
    channelHint: CHANNEL_HINTS[channel] || CHANNEL_HINTS.blog,
    samples: [...new Set(samples)],
    isoDate: date.toISOString().slice(0, 10),
  };
}
