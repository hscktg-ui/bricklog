"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { fetchGenerationsForSchedule } from "@/lib/generations";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { buildContentScheduleView } from "@/lib/product/contentScheduleCalendar";
import SimpleWeeklyPlan from "@/components/workspace/SimpleWeeklyPlan";
import {
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

function groupByPriority(items = []) {
  const week = [];
  for (const item of items) {
    if (String(item.priority || "").includes("주")) week.push(item);
    else if (week.length < 3) week.push(item);
  }
  return week.slice(0, 3);
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

  const openChannel = (opts = {}) => {
    const channel = opts.channel || "blog";
    const menu =
      channel === "place"
        ? "place"
        : channel === "instagram" || channel === "insta"
          ? "insta"
          : "blog";
    const topic = String(opts.topic || weekTopics[0]?.topic || "").trim();
    if (topic) {
      launchFromPlan?.({
        channel: menu,
        topic,
        dateKey: opts.dateKey || "",
      });
    }
    onNavigate?.(menu);
    onToast?.(
      topic ? `「${topic}」주제로 글쓰기를 열었어요.` : "글쓰기 화면으로 이동했어요.",
      "info"
    );
  };

  if (!input.brandName) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className={`max-w-md px-6 py-8 text-center ${VISION_PANEL}`}>
          <p className={VISION_EYEBROW}>운영 계획</p>
          <p className={`mt-3 ${VISION_SUB}`}>
            브랜드를 선택하면 이번 주에 쓸 글 일정이 잡힙니다.
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
          이번 주 글 일정
        </h1>
        <p className={`mt-2 ${VISION_SUB}`}>
          {input.brandName}
          {input.region ? ` · ${input.region}` : ""} — 날짜를 고르고 바로 글쓰기로
          이어가세요.
        </p>
      </header>

      <div className="mx-auto mt-6 w-full max-w-lg">
        <SimpleWeeklyPlan
          brandName={input.brandName}
          weekTopics={weekTopics}
          historyByDay={scheduleView.historyByDay}
          onWrite={openChannel}
          loading={historyLoading}
        />
      </div>
    </div>
  );
}
