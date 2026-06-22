/**
 * 콘텐츠 스케줄 캘린더 — 이력·공백·시의성 팁 회귀
 */
import {
  buildContentScheduleView,
  buildMonthCalendarGrid,
  daysSinceLastHistory,
  indexHistoryByDay,
  normalizeScheduleHistoryItem,
  SCHEDULE_GAP_TIP_DAYS,
  toDateKey,
} from "../lib/product/contentScheduleCalendar.js";

let failed = 0;

function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const now = new Date("2026-06-13T12:00:00.000Z");
assert("toDateKey", toDateKey(now) === "2026-06-13");

const grid = buildMonthCalendarGrid(2026, 6, now);
assert("june grid has weeks", grid.weeks.length >= 4);
assert("today flagged", grid.todayKey === "2026-06-13");
assert("weekday mon-first", grid.weekdayLabels[0] === "월");

const item = normalizeScheduleHistoryItem({
  id: "1",
  channel: "blog",
  title: "여름 관리 팁",
  created_at: "2026-06-10T09:00:00.000Z",
});
assert("normalize channel label", item.channelLabel === "이야기");

const byDay = indexHistoryByDay([item]);
assert("history indexed", byDay["2026-06-10"]?.length === 1);

const gap = daysSinceLastHistory([item], now.getTime());
assert("gap days computed", gap === 3);

const view = buildContentScheduleView({
  brandName: "레이어드살롱",
  region: "홍대",
  topic: "염색",
  industry: "hair",
  memoryItems: [
    {
      id: "old",
      channel: "blog",
      title: "봄 컬러",
      created_at: "2026-05-01T09:00:00.000Z",
    },
  ],
  viewYear: 2026,
  viewMonth: 6,
  now,
});
assert("gap tip when stale", view.gapDays >= SCHEDULE_GAP_TIP_DAYS);
assert(
  "gap tip surfaced",
  view.tips.some((t) => t.kind === "gap")
);
assert(
  "season tip surfaced",
  view.tips.some((t) => t.kind === "season")
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: content schedule calendar");
