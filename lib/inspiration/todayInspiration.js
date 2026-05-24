import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { getContentCalendar } from "@/lib/calendar/contentCalendar";
import { resolveBrandIndustryContext } from "@/lib/brand/brandContext";

/** 한국 기념일·계절 — 영감용 (검색량·점수 없음) */
const CALENDAR_NOTES = {
  "5-8": { title: "어버이날이 다가옵니다", body: "고객에게 감사했던 순간을 떠올려보세요." },
  "5-14": { title: "오늘은 부부의날입니다", body: "함께한 시간, 작은 선물 이야기가 잘 읽힙니다." },
  "5-15": { title: "스승의날이 지났습니다", body: "감사의 말을 전했던 장면을 가볍게 담아보세요." },
  "5-21": { title: "초여름이 시작되었습니다", body: "계절이 바뀌면 고객의 관심도 바뀝니다." },
  "6-1": { title: "장마 전, 여름이 다가옵니다", body: "실내에서 쉬어가기 좋은 분위기를 그려보세요." },
};

const SEASON_MOODS = [
  { test: (m) => m >= 5 && m <= 6, text: "초여름이 시작되었습니다.", sub: "계절이 바뀌면 고객의 관심도 바뀝니다." },
  { test: (m) => m >= 7 && m <= 8, text: "무더운 날, 잠깐 쉬어가고 싶은 마음이 많아집니다.", sub: "시원하거나 편안한 장면이 잘 맞습니다." },
  { test: (m) => m >= 9 && m <= 10, text: "선선한 바람이 불기 시작합니다.", sub: "첫 방문, 다시 찾는 이유를 담아보세요." },
  { test: (m) => m >= 11 || m <= 2, text: "쌀쌀한 계절, 따뜻한 공간 이야기가 잘 읽힙니다.", sub: "실내 분위기·조명을 떠올려보세요." },
];

const RAIN_MOOD = {
  title: "비 오는 날입니다",
  body: "사람들은 따뜻한 공간을 찾고 있습니다.",
};

const BY_INDUSTRY = {
  flower: [
    "오늘 누군가에게 꽃을 선물할 이유",
    "비 오는 날, 꽃 한 송이의 위로",
    "집 분위기를 바꾸는 작은 변화",
    "감사를 전하는 순간",
  ],
  cafe: [
    "비 오는 날 창가 자리",
    "작업하기 좋은 오후",
    "여름 음료 이야기",
    "혼자 들르는 손님의 하루",
  ],
  furniture: [
    "하루의 끝, 편안한 공간",
    "이사·이직 전후의 짐",
    "주말, 쇼룸에서 머무는 시간",
  ],
  hospital: [
    "첫 방문 전 마음",
    "대기실에서의 작은 배려",
    "가족과 함께하는 내원",
  ],
  default: [
    "오늘 찾아온 손님의 하루",
    "동네에서 오래 기억되는 순간",
    "작은 변화, 큰 만족",
  ],
};

function calendarKey(date) {
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function pickSeasonCard(date) {
  const m = date.getMonth() + 1;
  return SEASON_MOODS.find((s) => s.test(m)) || SEASON_MOODS[0];
}

export function getTodayInspiration(options = {}) {
  const date = options.date
    ? new Date(`${options.date}T12:00:00`)
    : new Date();
  const resolved = resolveBrandIndustryContext({
    brandType: options.brandType,
    industry: options.industryKey || options.industry || "",
  });
  const industryKey = resolved.industryKey;
  const brandName = options.brandName?.trim() || "";
  const indLabel = resolved.industryLabel;

  const cal = CALENDAR_NOTES[calendarKey(date)];
  const season = pickSeasonCard(date);
  const seasonCtx = getActiveSeasonContext(date);
  const monthCal = getContentCalendar(date.getMonth() + 1, industryKey);

  const stories = [];
  if (cal) {
    stories.push({ type: "calendar", title: cal.title, body: cal.body });
  } else {
    stories.push({
      type: "season",
      title: season.text,
      body: season.sub,
    });
  }

  if (date.getMonth() + 1 >= 5 && date.getMonth() + 1 <= 7) {
    stories.push({ type: "mood", ...RAIN_MOOD });
  }

  if (seasonCtx.eventLabel) {
    stories.push({
      type: "event",
      title: seasonCtx.eventLabel,
      body: "오늘의 글에 가볍게 녹여보세요.",
    });
  }

  const industryIdeas =
    BY_INDUSTRY[industryKey] || BY_INDUSTRY.default;

  const scenes = [
    ...monthCal.all.slice(0, 4),
    ...industryIdeas.slice(0, 4),
  ];

  return {
    dateLabel: `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`,
    seasonLabel: seasonCtx.label,
    brandLine: brandName
      ? `${brandName} — ${indLabel} 이야기`
      : `오늘의 ${indLabel} 이야기`,
    stories: stories.slice(0, 3),
    scenes: [...new Set(scenes)].slice(0, 6),
    emotions: ["감사", "편안함", "기대", "작은 설렘"].slice(0, 4),
  };
}
