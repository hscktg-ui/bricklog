"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { fetchGenerationsForSchedule } from "@/lib/generations";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { resolveIndustryWeek1Template } from "@/lib/product/brandContentOsCenters";
import { buildContentScheduleView } from "@/lib/product/contentScheduleCalendar";
import SimpleMonthlyPlan from "@/components/workspace/SimpleMonthlyPlan";
import { CONTENT_HISTORY_SAVED_EVENT } from "@/lib/history/contentHistoryEvents";
import {
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

function groupByPriority(items = []) {
  const week = [];
  for (const item of items) {
    if (String(item.priority || "").includes("주")) week.push(item);
    else if (week.length < 4) week.push(item);
  }
  return week.slice(0, 4);
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
  const [memoryItems, setMemoryItems] = useState([]);
  const [generationItems, setGenerationItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
  const week1 = useMemo(() => resolveIndustryWeek1Template(input), [input]);
  const weekTopics = useMemo(
    () => groupByPriority(plan.whatToWrite || []),
    [plan.whatToWrite]
  );

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
        viewYear: now.getFullYear(),
        viewMonth: now.getMonth() + 1,
        now,
      }),
    [
      memoryItems,
      generationItems,
      contentArchive,
      brandId,
      activeBrand?.id,
      input,
      now,
    ]
  );

  const loadHistory = useCallback(async () => {
    const id = brandId || activeBrand?.id;
    if (!id || !userId) {
      setMemoryItems([]);
      setGenerationItems([]);
      return;
    }
    setHistoryLoading(true);
    const since = new Date(now);
    since.setDate(since.getDate() - 60);
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

  useEffect(() => {
    const onSaved = (e) => {
      const id = brandId || activeBrand?.id;
      if (!id || e.detail?.brandId === id) loadHistory();
    };
    window.addEventListener(CONTENT_HISTORY_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CONTENT_HISTORY_SAVED_EVENT, onSaved);
  }, [loadHistory, brandId, activeBrand?.id]);

  const openChannel = (opts = {}) => {
    const channel = opts.channel || "blog";
    const menu =
      channel === "place"
        ? "place"
        : channel === "instagram" || channel === "insta"
          ? "insta"
          : "blog";
    const topic = String(
      opts.topic || weekTopics[0]?.topic || input.topic || ""
    ).trim();
    if (!topic) {
      onNavigate?.(menu);
      onToast?.(
        "주제가 아직 없어요. 아래 「이번 달 제안 주제」에서 고르거나 이야기 폼에 주제를 입력해 주세요.",
        "info"
      );
      return;
    }
    launchFromPlan?.({
      channel: menu,
      topic,
      dateKey: opts.dateKey || "",
      autoGenerate: true,
    });
    onNavigate?.(menu);
    onToast?.(`「${topic}」주제로 조사·글쓰기를 시작합니다.`, "info");
  };

  if (!input.brandName) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className={`max-w-md px-6 py-8 text-center ${VISION_PANEL}`}>
          <p className={VISION_EYEBROW}>운영 계획</p>
          <p className={`mt-3 ${VISION_SUB}`}>
            브랜드를 선택하면 이번 달 주차별 글 일정이 잡힙니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper)] p-4 sm:p-6">
      <header className="mx-auto w-full max-w-lg">
        <p className={VISION_EYEBROW}>{plan.month}</p>
        <h1 className="mt-2 text-[clamp(1.25rem,3vw,1.5rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          이번 달 운영
        </h1>
        <p className={`mt-2 ${VISION_SUB}`}>
          {input.brandName}
          {input.region ? ` · ${input.region}` : ""} — 주차별로 날짜를 고르고 글쓰기로
          이어가세요.
        </p>
      </header>

      <div className="mx-auto mt-6 w-full max-w-lg space-y-4">
        {week1?.days?.length ? (
          <section className={`${VISION_PANEL} px-4 py-4`} aria-label="1주차 온보딩">
            <p className={VISION_EYEBROW}>1주차 온보딩 · {week1.label}</p>
            <p className={`mt-1 ${VISION_SUB}`}>
              업종 템플릿으로 첫 주를 채우면 운영 리듬이 잡힙니다.
            </p>
            <ul className="mt-3 space-y-2">
              {week1.days.map((d) => (
                <li
                  key={`w1-${d.day}-${d.channel}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--vision-paper)] px-3 py-2 text-[12px]"
                >
                  <span className="text-[var(--vision-ink)]">
                    <span className="font-semibold text-[var(--vision-accent)]">
                      D{d.day} · {d.channel}
                    </span>
                    {" — "}
                    {d.topic}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-[var(--vision-accent,#03C75A)] px-2.5 py-1 text-[11px] font-semibold text-white"
                    onClick={() =>
                      openChannel({ channel: d.channel === "plan" ? "blog" : d.channel, topic: d.topic })
                    }
                  >
                    시작
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <SimpleMonthlyPlan
          brandName={input.brandName}
          monthLabel={scheduleView.calendar?.monthLabel || plan.month}
          calendar={scheduleView.calendar}
          weekTopics={weekTopics}
          historyByDay={scheduleView.historyByDay}
          gapTip={scheduleView.tips?.[0]?.body || scheduleView.tips?.[0]?.title || ""}
          onWrite={openChannel}
          loading={historyLoading}
        />
      </div>
    </div>
  );
}
