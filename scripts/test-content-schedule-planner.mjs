/**
 * 콘텐츠 스케줄 예정일 — 만든 날·쓸 날 분리
 */
import {
  buildPlannedSchedule,
  buildRhythmPlannedItems,
  buildOperatingPlanPlannedItems,
  buildMonthScheduleSummary,
  indexPlannedByDay,
} from "../lib/product/contentSchedulePlanner.js";
import { analyzePublishRhythm } from "../lib/product/brandPublishRhythm.js";
import { buildContentOperatingPlan } from "../lib/product/briclogBrandContentOS.js";
import { toDateKey } from "../lib/product/contentScheduleCalendar.js";

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
const todayKey = toDateKey(now);

const history = [
  {
    channel: "blog",
    created_at: "2026-06-10T09:00:00.000Z",
  },
];
const rhythm = analyzePublishRhythm(history, now.getTime());
const rhythmPlanned = buildRhythmPlannedItems(rhythm, {
  now,
  viewYear: 2026,
  viewMonth: 6,
});
assert("rhythm planned in june", rhythmPlanned.some((p) => p.dateKey.startsWith("2026-06")));
assert(
  "rhythm planned not in past",
  rhythmPlanned.every((p) => p.dateKey >= todayKey)
);

const plan = buildContentOperatingPlan({
  brandName: "카레클린트",
  region: "분당",
  topic: "301 체어 전시",
  industry: "furniture",
});
const planPlanned = buildOperatingPlanPlannedItems(plan, {
  now,
  viewYear: 2026,
  viewMonth: 6,
});
assert("operating plan scheduled", planPlanned.length >= 2);
assert(
  "week item near future",
  planPlanned.some((p) => p.priority.includes("주") && p.dateKey >= todayKey)
);

const { planned, plannedByDay } = buildPlannedSchedule({
  rhythm,
  operatingPlan: plan,
  viewYear: 2026,
  viewMonth: 6,
  now,
});
assert("merged planned", planned.length >= 3);
assert("planned by day", Object.keys(plannedByDay).length >= 2);

const summary = buildMonthScheduleSummary(
  { "2026-06-10": [{ id: "1" }] },
  plannedByDay,
  2026,
  6
);
assert("summary counts", summary.createdCount === 1 && summary.plannedCount >= 2);
assert("next planned key", summary.nextPlannedKey >= todayKey);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: content schedule planner");
