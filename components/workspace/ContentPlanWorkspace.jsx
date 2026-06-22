"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { fetchGenerationsForSchedule } from "@/lib/generations";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { buildContentScheduleView } from "@/lib/product/contentScheduleCalendar";
import ContentScheduleCalendar from "@/components/workspace/ContentScheduleCalendar";
import WeeklyOperatingStrip from "@/components/workspace/WeeklyOperatingStrip";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

function formatPlanDate(dateKey = "") {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function findPlannedDateForItem(planned = [], channel, topic = "") {
  const ch = channel === "insta" ? "instagram" : channel;
  const hit = planned.find(
    (p) =>
      p.channel === ch &&
      (p.kind === "plan" || String(p.title || "").includes(topic.slice(0, 12)))
  );
  return hit?.dateKey || "";
}

function groupByPriority(items = []) {
  const week = [];
  const month = [];
  for (const item of items) {
    if (String(item.priority || "").includes("주")) week.push(item);
    else month.push(item);
  }
  return { week, month };
}

export default function ContentPlanWorkspace({
  userId,
  brandId,
  contentArchive = null,
  onNavigate,
  onToast,
}) {
  const { activeBrand, scheduleRefreshTick, launchFromPlan } = useBrandWorkspace();
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [memoryItems, setMemoryItems] = useState([]);
  const [generationItems, setGenerationItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState("");

  const input = useMemo(
    () => ({
      brandName: activeBrand?.brandName || "",
      region: activeBrand?.region || "",
      topic: activeBrand?.lastTopic || activeBrand?.topic || "",
      mainKeyword: activeBrand?.mainKeyword || "",
      industry: activeBrand?.industry || "",
    }),
    [activeBrand]
  );

  const plan = useMemo(() => buildContentOperatingPlan(input), [input]);
  const { week, month } = groupByPriority(plan.whatToWrite || []);

  const scheduleView = useMemo(
    () =>
      buildContentScheduleView({
        memoryItems,
        generationItems,
        contentArchive,
        brandId: brandId || activeBrand?.id,
        brandName: input.brandName,
        region: input.region,
        topic: input.topic,
        mainKeyword: input.mainKeyword,
        industry: input.industry,
        viewYear,
        viewMonth,
        now,
      }),
    [
      memoryItems,
      generationItems,
      contentArchive,
      brandId,
      activeBrand?.id,
      input,
      viewYear,
      viewMonth,
      now,
    ]
  );

  useEffect(() => {
    if (!selectedDateKey && scheduleView.selectedDefaultKey) {
      setSelectedDateKey(scheduleView.selectedDefaultKey);
    }
  }, [scheduleView.selectedDefaultKey, selectedDateKey]);

  const loadHistory = useCallback(async () => {
    const id = brandId || activeBrand?.id;
    if (!id || !userId) {
      setMemoryItems([]);
      setGenerationItems([]);
      return;
    }
    setHistoryLoading(true);
    const since = new Date(now);
    since.setDate(since.getDate() - 120);
    const sinceIso = since.toISOString();
    try {
      const q = new URLSearchParams({ brandId: id });
      const [memRes, gens] = await Promise.all([
        fetchWithAuth(`/api/memory/content?${q}`),
        fetchGenerationsForSchedule(userId, { sinceIso, brandId: id }),
      ]);
      setMemoryItems(memRes.items || []);
      setGenerationItems(gens || []);
    } catch {
      setMemoryItems([]);
      setGenerationItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [brandId, activeBrand?.id, userId, now]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, scheduleRefreshTick]);

  const openChannel = (channel, opts = {}) => {
    const menu =
      channel === "blog"
        ? "blog"
        : channel === "place"
          ? "place"
          : channel === "instagram" || channel === "insta"
            ? "insta"
            : "blog";
    const topic = String(opts.topic || "").trim();
    if (topic) {
      launchFromPlan?.({
        channel: menu,
        topic,
        dateKey: opts.dateKey || selectedDateKey || scheduleView.selectedDefaultKey,
      });
    }
    onNavigate?.(menu);
    onToast?.(
      topic ? `「${topic}」주제로 글쓰기를 열었어요.` : "주제를 확인한 뒤 글쓰기로 이어가세요.",
      "info"
    );
  };

  const handleMonthChange = (year, month) => {
    setViewYear(year);
    setViewMonth(month);
  };

  if (!input.brandName) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className={`max-w-md px-6 py-8 text-center ${VISION_PANEL}`}>
          <p className={VISION_EYEBROW}>운영 계획</p>
          <p className={`mt-3 ${VISION_SUB}`}>
            브랜드를 선택하면 캘린더에 운영 이력과 이번 주·달 계획이 잡힙니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper)] p-4 sm:p-6">
      <header className="mx-auto w-full max-w-5xl">
        <p className={VISION_EYEBROW}>{plan.month}</p>
        <h1 className="mt-2 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          콘텐츠 스케줄
        </h1>
        <p className={`mt-3 max-w-2xl ${VISION_SUB}`}>
          {input.brandName}
          {input.region ? ` · ${input.region}` : ""} —{" "}
          <span className="text-[var(--vision-ink)]">만든 날</span>은 채워진 점,
          <span className="text-[var(--vision-ink)]"> 쓸 날</span>은 테두리 점으로
          보입니다. 날짜를 누르면 기록과 예정을 나눠 확인할 수 있어요.
        </p>
      </header>

      <div className="mx-auto mt-4 w-full max-w-5xl">
        <WeeklyOperatingStrip scheduleView={scheduleView} input={input} />
      </div>

      <div className="mx-auto mt-6 w-full max-w-5xl">
        <ContentScheduleCalendar
          calendar={scheduleView.calendar}
          historyByDay={scheduleView.historyByDay}
          plannedByDay={scheduleView.plannedByDay}
          monthSummary={scheduleView.monthSummary}
          tips={scheduleView.tips}
          rhythm={scheduleView.rhythm}
          selectedDateKey={selectedDateKey || scheduleView.selectedDefaultKey}
          onSelectDateKey={setSelectedDateKey}
          onMonthChange={handleMonthChange}
          onWriteChannel={openChannel}
          gapDays={scheduleView.gapDays}
          loading={historyLoading}
        />
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-5xl gap-5 lg:grid-cols-2">
        <section className={`${VISION_PANEL} p-5 sm:p-6`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-accent-deep,#03a94d)]">
            이번 주
          </p>
          <ul className="mt-4 space-y-3">
            {week.length ? (
              week.map((item) => {
                const planDate = findPlannedDateForItem(
                  scheduleView.planned,
                  item.channel,
                  item.topic
                );
                return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[var(--vision-ink)]">{item.topic}</p>
                    <p className="mt-1 text-[13px] text-[var(--vision-muted)]">
                      {CHANNEL_LABEL[item.channel] || item.channel} · {item.priority}
                      {planDate ? ` · 예정 ${formatPlanDate(planDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {planDate ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDateKey(planDate)}
                        className="min-h-[40px] rounded-full border border-[var(--vision-line)] px-4 text-[12px] font-semibold text-[var(--vision-muted)] hover:border-[var(--vision-accent-ring)] hover:text-[var(--vision-ink)]"
                      >
                        캘린더에서 보기
                      </button>
                    ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      openChannel(item.channel, {
                        topic: item.topic,
                        dateKey: planDate,
                      })
                    }
                    className={`${VISION_CTA_ACCENT} !min-h-[44px] !w-full sm:!w-auto !px-5 !text-[13px]`}
                  >
                    글쓰기
                  </button>
                  </div>
                </li>
              );
              })
            ) : (
              <li className="rounded-2xl border border-dashed border-[var(--vision-line)] p-4 text-[14px] text-[var(--vision-muted)]">
                주제 한 줄을 입력하면 이번 주 블로그 주제가 여기에 잡힙니다.
              </li>
            )}
          </ul>
        </section>

        <section className={`${VISION_PANEL} p-5 sm:p-6`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
            이번 달
          </p>
          <ul className="mt-4 space-y-3">
            {month.map((item) => {
              const planDate = findPlannedDateForItem(
                scheduleView.planned,
                item.channel,
                item.topic
              );
              return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-paper)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--vision-ink)]">{item.topic}</p>
                  <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
                    {CHANNEL_LABEL[item.channel] || item.channel} · {item.priority}
                    {planDate ? ` · 예정 ${formatPlanDate(planDate)}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {planDate ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(planDate)}
                      className="self-start rounded-full border border-dashed border-[var(--vision-line)] px-3 py-1.5 text-[11px] font-semibold text-[var(--vision-muted)] hover:border-[var(--vision-accent-ring)]"
                    >
                      예정일 보기
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      openChannel(item.channel, {
                        topic: item.topic,
                        dateKey: planDate,
                      })
                    }
                    className={`${VISION_CTA_ACCENT} !min-h-[40px] !w-full sm:!w-auto !px-4 !text-[12px]`}
                  >
                    글쓰기
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
