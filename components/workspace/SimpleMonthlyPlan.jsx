"use client";

import { useEffect, useMemo, useState } from "react";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const WEEKDAY_SHORT = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 이번 달 4주 운영 — 주차별 접기, 날짜별 글쓰기
 */
export default function SimpleMonthlyPlan({
  brandName = "",
  monthLabel = "",
  calendar = null,
  weekTopics = [],
  historyByDay = {},
  gapTip = "",
  onWrite,
  loading = false,
}) {
  const primaryTopic = weekTopics[0]?.topic || "";
  const weeks = calendar?.weeks || [];
  const todayKey = calendar?.todayKey || "";

  const weekStats = useMemo(() => {
    return weeks.map((week, idx) => {
      const inMonthDays = (week.days || []).filter((d) => d.inMonth);
      const done = inMonthDays.filter(
        (d) => (historyByDay[d.dateKey] || []).length > 0
      ).length;
      const hasToday = inMonthDays.some((d) => d.dateKey === todayKey);
      return {
        index: idx,
        inMonthDays,
        done,
        total: inMonthDays.length,
        hasToday,
      };
    });
  }, [weeks, historyByDay, todayKey]);

  const currentWeekIndex = useMemo(() => {
    const i = weekStats.findIndex((w) => w.hasToday);
    return i >= 0 ? i : 0;
  }, [weekStats]);

  const [openWeek, setOpenWeek] = useState(currentWeekIndex);

  useEffect(() => {
    setOpenWeek(currentWeekIndex);
  }, [currentWeekIndex]);

  const visibleWeeks = weekStats.filter((w) => w.total > 0);

  return (
    <div className="space-y-4">
      <div className={`${VISION_PANEL} p-4 sm:p-5`}>
        <p className={VISION_EYEBROW}>{monthLabel || "이번 달"}</p>
        <p className={`mt-2 ${VISION_SUB}`}>
          {brandName ? `${brandName} — ` : ""}
          주차를 펼쳐 날짜를 고르고 글쓰기로 이어가세요.
        </p>
        {gapTip ? (
          <p className="mt-2 rounded-xl bg-[var(--vision-accent-soft,#e8f9ef)] px-3 py-2 text-[12px] leading-relaxed text-[var(--vision-ink)]">
            {gapTip}
          </p>
        ) : null}

        <ul className="mt-4 space-y-2">
          {visibleWeeks.map((week, visIdx) => {
            const isOpen = openWeek === week.index;
            const weekNum = visIdx + 1;
            return (
              <li
                key={week.index}
                className="overflow-hidden rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)]"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                  onClick={() => setOpenWeek(isOpen ? -1 : week.index)}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--vision-ink)]">
                      {weekNum}주차
                      {week.hasToday ? (
                        <span className="ml-2 text-[11px] font-medium text-[var(--vision-accent,#03c75a)]">
                          이번 주
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-[var(--vision-muted)]">
                      {week.done}/{week.total}일 작성
                    </p>
                  </div>
                  <span className="text-[12px] text-[var(--vision-muted)]">
                    {isOpen ? "접기" : "펼치기"}
                  </span>
                </button>

                {isOpen ? (
                  <ul className="space-y-1.5 border-t border-[var(--vision-line)] px-2 pb-2 pt-1">
                    {week.inMonthDays.map((row) => {
                      const done = (historyByDay[row.dateKey] || []).length > 0;
                      const label = (historyByDay[row.dateKey] || [])[0]?.title;
                      const weekday =
                        WEEKDAY_SHORT[
                          new Date(row.dateKey).getDay() === 0
                            ? 6
                            : new Date(row.dateKey).getDay() - 1
                        ];
                      return (
                        <li
                          key={row.dateKey}
                          className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2 ${
                            row.isToday
                              ? "bg-[var(--vision-accent-soft,#e8f9ef)]"
                              : ""
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                done
                                  ? "bg-[var(--vision-accent,#03c75a)] text-white"
                                  : "bg-[var(--vision-line)] text-[var(--vision-muted)]"
                              }`}
                            >
                              {done ? "✓" : row.day}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-[var(--vision-ink)]">
                                {row.isToday ? "오늘" : weekday}{" "}
                                <span className="font-normal text-[var(--vision-muted)]">
                                  {row.dateKey.slice(5).replace("-", "/")}
                                </span>
                              </p>
                              {done && label ? (
                                <p className="truncate text-[10px] text-[var(--vision-muted)]">
                                  {label}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              onWrite?.({
                                channel: "blog",
                                topic: primaryTopic,
                                dateKey: row.dateKey,
                              })
                            }
                            className={`${VISION_CTA_ACCENT} !min-h-[32px] shrink-0 !px-2.5 !py-1 !text-[11px]`}
                          >
                            글쓰기
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {weekTopics.length > 0 ? (
        <div className={`${VISION_PANEL} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--vision-muted)]">
            이번 달 제안 주제
          </p>
          <ul className="mt-3 space-y-2">
            {weekTopics.slice(0, 4).map((item) => (
              <li
                key={item.id || item.topic}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--vision-line)] px-3 py-2"
              >
                <span className="truncate text-[13px] text-[var(--vision-ink)]">
                  {item.topic}
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    onWrite?.({ channel: item.channel || "blog", topic: item.topic })
                  }
                  className="shrink-0 text-[11px] font-semibold text-[var(--vision-accent,#03c75a)]"
                >
                  쓰기
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
