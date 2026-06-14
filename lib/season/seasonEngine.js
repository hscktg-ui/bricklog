import { getSeasonHint } from "@/lib/prompts/engine/seasonHints";

const EVENT_CALENDAR = [
  { months: [1, 2], key: "newyear", label: "새해·설", tags: ["새해", "설날", "선물"] },
  { months: [2, 3], key: "graduation", label: "발렌타인·졸업·입학", tags: ["발렌타인", "화이트데이", "졸업", "입학"] },
  { months: [4, 5], key: "family", label: "어버이날·가정의달", tags: ["어버이날", "감사", "봄나들이"] },
  { months: [6, 7], key: "rainy", label: "장마·여름·휴가", tags: ["장마", "여름휴가", "피크님"] },
  { months: [8, 9], key: "chuseok", label: "추석·가을", tags: ["추석", "한가위", "가을선물"] },
  { months: [10, 11], key: "yearEnd", label: "빼빼로·연말 준비", tags: ["빼빼로", "수능", "연말"] },
  { months: [12], key: "christmas", label: "연말·크리스마스", tags: ["연말", "크리스마스", "송년"] },
];

export function getActiveSeasonContext(date = new Date()) {
  const base = getSeasonHint(date);
  const m = date.getMonth() + 1;
  const events = EVENT_CALENDAR.filter((e) => e.months.includes(m));
  const event = events[0];

  return {
    ...base,
    eventKey: event?.key || null,
    eventLabel: event?.label || null,
    eventTags: event?.tags || [],
    promptLine: [
      `계절: ${base.label} (${base.mood})`,
      event ? `시즌 이벤트: ${event.label}` : null,
      `태그 힌트: ${[...base.tags, ...(event?.tags || [])].slice(0, 6).join(", ")}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
