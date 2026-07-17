/**
 * 콘텐츠 스케줄 — 월간 캘린더 · 이력 · 공백·시의성 팁 SSOT
 */
import { getContentCalendar } from "@/lib/calendar/contentCalendar";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { mergeScheduleHistorySources } from "@/lib/product/scheduleHistorySources";
import {
  analyzePublishRhythm,
  buildRhythmScheduleTips,
} from "@/lib/product/brandPublishRhythm";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import {
  buildMonthScheduleSummary,
  buildPlannedSchedule,
} from "@/lib/product/contentSchedulePlanner";

export const SCHEDULE_GAP_TIP_DAYS = 7;
export const SCHEDULE_GAP_WARN_DAYS = 14;

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** @param {string | Date | null | undefined} value */
export function toDateKey(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {import('@/lib/growth/mergeDraftHistoryItems').DraftHistoryItem} item */
export function normalizeScheduleHistoryItem(item) {
  const channel = String(item?.channel || "blog").toLowerCase();
  const title =
    String(item?.title || "").trim() ||
    String(item?.full_content || "")
      .split("\n")[0]
      ?.slice(0, 72) ||
    "초안";
  return {
    id: String(item?.id || `${channel}-${item?.created_at || ""}`),
    channel,
    channelLabel: CHANNEL_LABEL[channel] || channel,
    title,
    created_at: item?.created_at || null,
    dateKey: toDateKey(item?.created_at),
  };
}

/**
 * @param {unknown[]} memoryItems
 * @param {unknown[]} extraItems — legacy archive rows
 * @deprecated use mergeScheduleHistorySources
 */
export function buildScheduleHistory(memoryItems = [], extraItems = []) {
  return mergeScheduleHistorySources({
    memoryItems,
    generationItems: extraItems,
    contentArchive: null,
    brandId: null,
  }).map(normalizeScheduleHistoryItem);
}

/** @param {ReturnType<typeof normalizeScheduleHistoryItem>[]} items */
export function indexHistoryByDay(items = []) {
  /** @type {Record<string, ReturnType<typeof normalizeScheduleHistoryItem>[]>} */
  const map = {};
  for (const item of items) {
    if (!item.dateKey) continue;
    if (!map[item.dateKey]) map[item.dateKey] = [];
    map[item.dateKey].push(item);
  }
  for (const key of Object.keys(map)) {
    map[key].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  }
  return map;
}

/** @param {ReturnType<typeof normalizeScheduleHistoryItem>[]} items */
export function daysSinceLastHistory(items = [], nowMs = Date.now()) {
  if (!items.length) return null;
  let latest = 0;
  for (const item of items) {
    const t = new Date(item.created_at || 0).getTime();
    if (t > latest) latest = t;
  }
  if (!latest) return null;
  return Math.floor((nowMs - latest) / 86_400_000);
}

/**
 * @param {{
 *   brandName?: string;
 *   region?: string;
 *   topic?: string;
 *   industry?: string;
 *   gapDays?: number | null;
 *   historyCount?: number;
 *   rhythm?: ReturnType<typeof analyzePublishRhythm>;
 *   now?: Date;
 * }} input
 */
export function buildScheduleTips(input = {}) {
  const brand = String(input.brandName || "브랜드").trim() || "브랜드";
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const gapDays = input.gapDays ?? null;
  const historyCount = input.historyCount ?? 0;
  const now = input.now instanceof Date ? input.now : new Date();
  const industry = resolveBriclogIndustryKey(input);
  const cal = getContentCalendar(now.getMonth() + 1, industry);
  const season = getActiveSeasonContext(now);
  const seasonLabel = season.eventLabel || season.label || "";

  /** @type {{ id: string; kind: 'gap' | 'season' | 'rhythm' | 'freshness'; tone: 'info' | 'warn' | 'accent'; title: string; body: string }[]} */
  const tips = [];

  if (topic) {
    tips.push({
      id: "topic-deepen-refresh",
      kind: "freshness",
      tone: "accent",
      title: "같은 주제 깊게 · 시즌 새로고침",
      body: `「${topic}」을 같은 축으로 한 편 더 깊게 쓰거나, ${seasonLabel || "이번 시즌"} 관점으로 새로고침하면 검색·AI 인용 신뢰가 쌓입니다.`,
    });
  }

  if (historyCount === 0) {
    tips.push({
      id: "empty-history",
      kind: "rhythm",
      tone: "info",
      title: "운영 기록을 시작해 보세요",
      body: `${brand}${region ? ` · ${region}` : ""}의 첫 이야기를 쓰면 캘린더에 쌓입니다. 이번 주 주제부터 시작하면 리듬이 잡힙니다.`,
    });
  } else if (gapDays != null && gapDays >= SCHEDULE_GAP_TIP_DAYS) {
    const tone = gapDays >= SCHEDULE_GAP_WARN_DAYS ? "warn" : "info";
    tips.push({
      id: "gap-update",
      kind: "gap",
      tone,
      title:
        gapDays >= SCHEDULE_GAP_WARN_DAYS
          ? "소식 업데이트가 필요해 보여요"
          : "한동안 업데이트가 없어요",
      body: `마지막 기록이 ${gapDays}일 전입니다. ${brand}의 새 소식·시즌 안내·매장 변화를 한 편 올리면 검색·플레이스 신뢰에 도움이 됩니다.`,
    });
  }

  const seasonalCandidates = [
    ...(cal.industryTopics || []),
    ...(cal.generalTopics || []),
  ].filter(Boolean);

  const pick =
    seasonalCandidates.find((t) =>
      topic ? !String(topic).includes(t) : true
    ) || seasonalCandidates[0];

  if (pick) {
    tips.push({
      id: "season-topic",
      kind: "season",
      tone: "accent",
      title: seasonLabel ? `${seasonLabel} — 이런 주제는 어떨까요?` : "이번 달 시의성 주제",
      body: topic
        ? `「${pick}」 관련 내용을 ${topic}과 연결해 쓰면 자연스럽습니다.`
        : `「${pick}」 주제로 ${brand}만의 관점을 담아 보세요.`,
    });
  }

  if (historyCount > 0 && (gapDays == null || gapDays < SCHEDULE_GAP_TIP_DAYS)) {
    tips.push({
      id: "rhythm-ok",
      kind: "rhythm",
      tone: "accent",
      title: "리듬이 유지되고 있어요",
      body: "이번 주 이야기 → 플레이스·인스타로 이어가면 한 주제가 채널마다 쌓입니다.",
    });
  }

  const rhythmTips = buildRhythmScheduleTips(
    input.rhythm || [],
    brand
  );
  for (const tip of rhythmTips) {
    if (tips.some((t) => t.kind === tip.kind && t.title === tip.title)) continue;
    tips.push(tip);
  }

  return tips.slice(0, 4);
}

/**
 * @param {number} year
 * @param {number} month 1–12
 * @param {Date} [today]
 */
export function buildMonthCalendarGrid(year, month, today = new Date()) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toDateKey(today);

  /** Monday-first offset */
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells = [];

  for (let i = mondayOffset - 1; i >= 0; i -= 1) {
    const d = new Date(year, month - 1, -i);
    cells.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      isToday: toDateKey(d) === todayKey,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month - 1, day);
    const dateKey = toDateKey(d);
    cells.push({
      dateKey,
      day,
      inMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month, trailingDay);
    trailingDay += 1;
    cells.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      isToday: toDateKey(d) === todayKey,
    });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push({ days: cells.slice(i, i + 7) });
  }

  return {
    year,
    month,
    monthLabel: `${year}년 ${month}월`,
    weekdayLabels: WEEKDAY_LABELS,
    weeks,
    todayKey,
  };
}

/**
 * @param {{
 *   memoryItems?: unknown[];
 *   generationItems?: unknown[];
 *   contentArchive?: object | null;
 *   brandId?: string | null;
 *   brandName?: string;
 *   region?: string;
 *   topic?: string;
 *   mainKeyword?: string;
 *   industry?: string;
 *   viewYear?: number;
 *   viewMonth?: number;
 *   now?: Date;
 * }} input
 */
export function buildContentScheduleView(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date();
  const year = input.viewYear ?? now.getFullYear();
  const month = input.viewMonth ?? now.getMonth() + 1;
  const merged = mergeScheduleHistorySources({
    memoryItems: input.memoryItems || [],
    generationItems: input.generationItems || [],
    contentArchive: input.contentArchive,
    brandId: input.brandId,
  });
  const history = merged.map(normalizeScheduleHistoryItem);
  const historyByDay = indexHistoryByDay(history);
  const gapDays = daysSinceLastHistory(history, now.getTime());
  const rhythm = analyzePublishRhythm(history, now.getTime());
  const operatingPlan =
    input.operatingPlan || buildContentOperatingPlan(input);
  const { planned, plannedByDay } = buildPlannedSchedule({
    rhythm,
    operatingPlan,
    viewYear: year,
    viewMonth: month,
    now,
  });
  const monthSummary = buildMonthScheduleSummary(
    historyByDay,
    plannedByDay,
    year,
    month
  );
  const calendar = buildMonthCalendarGrid(year, month, now);
  const tips = buildScheduleTips({
    brandName: input.brandName,
    region: input.region,
    topic: input.topic || input.mainKeyword,
    mainKeyword: input.mainKeyword,
    industry: input.industry,
    gapDays,
    historyCount: history.length,
    rhythm,
    now,
  });

  return {
    calendar,
    history,
    historyByDay,
    planned,
    plannedByDay,
    monthSummary,
    operatingPlan,
    gapDays,
    rhythm,
    tips,
    selectedDefaultKey: calendar.todayKey,
  };
}
