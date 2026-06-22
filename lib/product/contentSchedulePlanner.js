/**
 * 콘텐츠 스케줄 예정일 — 발행 리듬 + 운영 계획 SSOT
 * 「만든 날」과 「쓸 날」을 캘린더에 분리 표시
 */
import { toDateKey } from "@/lib/product/contentScheduleCalendar";

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

/** @param {Date} date @param {number} days */
export function addScheduleDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isDateInMonth(dateKey, year, month) {
  const [y, m] = dateKey.split("-").map(Number);
  return y === year && m === month;
}

function normalizeChannel(channel = "blog") {
  const ch = String(channel || "blog").toLowerCase();
  return ch === "insta" ? "instagram" : ch;
}

/**
 * 채널별 권장 주기로 이번 달 예정 슬롯 생성
 * @param {ReturnType<import('@/lib/product/brandPublishRhythm').analyzePublishRhythm>} rhythm
 */
export function buildRhythmPlannedItems(rhythm = [], opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const viewYear = opts.viewYear ?? now.getFullYear();
  const viewMonth = opts.viewMonth ?? now.getMonth() + 1;
  const todayKey = toDateKey(now);
  const monthEnd = new Date(viewYear, viewMonth, 0, 23, 59, 59);
  const items = [];

  for (const row of rhythm) {
    const channel = normalizeChannel(row.channel);
    const cadence = Number(row.cadenceDays) || 7;
    let cursor;

    if (row.lastAt) {
      cursor = addScheduleDays(new Date(row.lastAt), cadence);
    } else if (channel === "instagram") {
      cursor = addScheduleDays(now, 0);
    } else if (channel === "blog") {
      cursor = addScheduleDays(now, 1);
    } else {
      cursor = addScheduleDays(now, 3);
    }

    while (toDateKey(cursor) < todayKey) {
      cursor = addScheduleDays(cursor, cadence);
    }

    let emitted = 0;
    while (cursor <= monthEnd && emitted < 5) {
      const dateKey = toDateKey(cursor);
      if (isDateInMonth(dateKey, viewYear, viewMonth)) {
        items.push({
          id: `rhythm-${channel}-${dateKey}-${emitted}`,
          kind: "rhythm",
          channel,
          channelLabel: row.label || CHANNEL_LABEL[channel] || channel,
          title: `${row.label || CHANNEL_LABEL[channel]} 업데이트`,
          dateKey,
          cadenceDays: cadence,
          rhythmStatus: row.status,
        });
        emitted += 1;
      }
      cursor = addScheduleDays(cursor, cadence);
    }
  }

  return items;
}

/**
 * 운영 계획(이번 주·이번 달) → 제안 날짜
 * @param {ReturnType<import('@/lib/product/briclogBrandContentOS').buildContentOperatingPlan>} plan
 */
export function buildOperatingPlanPlannedItems(plan = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const viewYear = opts.viewYear ?? now.getFullYear();
  const viewMonth = opts.viewMonth ?? now.getMonth() + 1;
  const todayKey = toDateKey(now);
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const whatToWrite = plan.whatToWrite || [];
  const items = [];

  const weekOffsets = [1, 2, 4];
  let weekIdx = 0;
  let monthCursor = Math.min(now.getDate() + 5, daysInMonth);

  for (const entry of whatToWrite) {
    const channel = normalizeChannel(entry.channel);
    const isWeek = String(entry.priority || "").includes("주");
    let target;

    if (isWeek) {
      target = addScheduleDays(now, weekOffsets[weekIdx % weekOffsets.length]);
      weekIdx += 1;
    } else {
      target = new Date(viewYear, viewMonth - 1, monthCursor);
      monthCursor = Math.min(monthCursor + 6, daysInMonth);
    }

    let dateKey = toDateKey(target);
    if (dateKey < todayKey) dateKey = todayKey;
    if (!isDateInMonth(dateKey, viewYear, viewMonth)) continue;

    items.push({
      id: `plan-${entry.id}-${dateKey}`,
      kind: "plan",
      channel,
      channelLabel: CHANNEL_LABEL[channel] || channel,
      title: String(entry.topic || "").trim() || "주제 미정",
      dateKey,
      priority: entry.priority || "",
    });
  }

  return items;
}

/** @param {object[]} rhythmItems @param {object[]} planItems */
export function mergePlannedScheduleItems(rhythmItems = [], planItems = []) {
  const bySlot = new Map();

  for (const item of rhythmItems) {
    const key = `${item.dateKey}::${item.channel}`;
    bySlot.set(key, item);
  }
  for (const item of planItems) {
    const key = `${item.dateKey}::${item.channel}`;
    bySlot.set(key, { ...bySlot.get(key), ...item, kind: "plan" });
  }

  return [...bySlot.values()].sort((a, b) => {
    const d = String(a.dateKey).localeCompare(String(b.dateKey));
    if (d !== 0) return d;
    return String(a.channel).localeCompare(String(b.channel));
  });
}

/** @param {object[]} items */
export function indexPlannedByDay(items = []) {
  /** @type {Record<string, object[]>} */
  const map = {};
  for (const item of items) {
    if (!item.dateKey) continue;
    if (!map[item.dateKey]) map[item.dateKey] = [];
    map[item.dateKey].push(item);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => String(a.channel).localeCompare(String(b.channel)));
  }
  return map;
}

/**
 * @param {Record<string, unknown[]>} historyByDay
 * @param {Record<string, unknown[]>} plannedByDay
 */
export function buildMonthScheduleSummary(historyByDay = {}, plannedByDay = {}, year, month) {
  let createdCount = 0;
  let plannedCount = 0;
  let nextPlannedKey = "";
  const todayKey = toDateKey(new Date());

  for (const [key, rows] of Object.entries(historyByDay)) {
    if (isDateInMonth(key, year, month)) createdCount += rows.length;
  }

  const futureKeys = [];
  for (const [key, rows] of Object.entries(plannedByDay)) {
    if (!isDateInMonth(key, year, month)) continue;
    plannedCount += rows.length;
    if (key >= todayKey) futureKeys.push(key);
  }
  futureKeys.sort();
  nextPlannedKey = futureKeys[0] || "";

  return { createdCount, plannedCount, nextPlannedKey };
}

/**
 * @param {{
 *   rhythm?: object[];
 *   operatingPlan?: object;
 *   viewYear?: number;
 *   viewMonth?: number;
 *   now?: Date;
 * }} input
 */
export function buildPlannedSchedule(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date();
  const viewYear = input.viewYear ?? now.getFullYear();
  const viewMonth = input.viewMonth ?? now.getMonth() + 1;
  const rhythmItems = buildRhythmPlannedItems(input.rhythm || [], {
    now,
    viewYear,
    viewMonth,
  });
  const planItems = buildOperatingPlanPlannedItems(input.operatingPlan || {}, {
    now,
    viewYear,
    viewMonth,
  });
  const planned = mergePlannedScheduleItems(rhythmItems, planItems);
  const plannedByDay = indexPlannedByDay(planned);
  return { planned, plannedByDay };
}
