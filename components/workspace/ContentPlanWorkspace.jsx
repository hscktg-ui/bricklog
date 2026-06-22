"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { buildContentScheduleView } from "@/lib/product/contentScheduleCalendar";
import ContentScheduleCalendar from "@/components/workspace/ContentScheduleCalendar";
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
  const { activeBrand } = useBrandWorkspace();
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [memoryItems, setMemoryItems] = useState([]);
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
      return;
    }
    setHistoryLoading(true);
    try {
      const q = new URLSearchParams({ brandId: id });
      const data = await fetchWithAuth(`/api/memory/content?${q}`);
      setMemoryItems(data.items || []);
    } catch {
      setMemoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [brandId, activeBrand?.id, userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const openChannel = (channel) => {
    const menu =
      channel === "blog"
        ? "blog"
        : channel === "place"
          ? "place"
          : channel === "instagram" || channel === "insta"
            ? "insta"
            : "blog";
    onNavigate?.(menu);
    onToast?.("주제를 확인한 뒤 글쓰기로 이어가세요.", "info");
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
          {input.region ? ` · ${input.region}` : ""} — 지난 기록은 캘린더에, 앞으로 쓸 주제는
          아래 운영안에 담습니다.
        </p>
      </header>

      <div className="mx-auto mt-6 w-full max-w-5xl">
        <ContentScheduleCalendar
          calendar={scheduleView.calendar}
          historyByDay={scheduleView.historyByDay}
          tips={scheduleView.tips}
          selectedDateKey={selectedDateKey || scheduleView.selectedDefaultKey}
          onSelectDateKey={setSelectedDateKey}
          onMonthChange={handleMonthChange}
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
              week.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[var(--vision-ink)]">{item.topic}</p>
                    <p className="mt-1 text-[13px] text-[var(--vision-muted)]">
                      {CHANNEL_LABEL[item.channel] || item.channel} · {item.priority}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openChannel(item.channel)}
                    className={`${VISION_CTA_ACCENT} !min-h-[44px] !w-full sm:!w-auto !px-5 !text-[13px]`}
                  >
                    글쓰기
                  </button>
                </li>
              ))
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
            {month.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-paper)] px-4 py-3.5"
              >
                <p className="font-medium text-[var(--vision-ink)]">{item.topic}</p>
                <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
                  {CHANNEL_LABEL[item.channel] || item.channel} · {item.priority}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
