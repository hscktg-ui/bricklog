import { getSeasonHint } from "@/lib/prompts/engine/seasonHints";

const EVENT_CALENDAR = [
  { months: [1, 2], key: "newyear", label: "새해·설", tags: ["새해", "설날"] },
  { months: [2, 3], key: "graduation", label: "졸업·입학", tags: ["졸업", "입학", "축하"] },
  { months: [4, 5], key: "family", label: "어버이날·스승의날", tags: ["어버이날", "감사"] },
  { months: [6, 7], key: "rainy", label: "장마·여름", tags: ["장마", "비오는날"] },
  { months: [7, 8], key: "vacation", label: "휴가철", tags: ["휴가", "여름휴가"] },
  { months: [9, 10], key: "chuseok", label: "추석·가을", tags: ["추석", "한가위"] },
  { months: [11, 12], key: "yearEnd", label: "연말·크리스마스", tags: ["연말", "크리스마스", "선물"] },
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
