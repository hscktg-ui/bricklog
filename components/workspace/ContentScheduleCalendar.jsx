"use client";

import {
  VISION_CHIP_IDLE,
  VISION_EYEBROW,
  VISION_GHOST_BTN,
  VISION_PANEL,
  VISION_STATUS_OK,
  VISION_STATUS_WARN,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const CHANNEL_DOT = {
  blog: "bg-[var(--vision-accent,#03c75a)]",
  place: "bg-[#4B9EFF]",
  instagram: "bg-[#E84D8A]",
  insta: "bg-[#E84D8A]",
};

const TIP_SURFACE = {
  info: "rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-4 py-3.5",
  warn: VISION_STATUS_WARN,
  accent: VISION_STATUS_OK,
};

function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * @param {{
 *   calendar: import('@/lib/product/contentScheduleCalendar').buildMonthCalendarGrid extends (...args: any[]) => infer R ? R : never;
 *   historyByDay: Record<string, { id: string; channel: string; channelLabel: string; title: string; created_at?: string | null }[]>;
 *   tips: { id: string; kind: string; tone: 'info' | 'warn' | 'accent'; title: string; body: string }[];
 *   selectedDateKey: string;
 *   onSelectDateKey: (key: string) => void;
 *   onMonthChange: (year: number, month: number) => void;
 *   gapDays?: number | null;
 *   loading?: boolean;
 * }} props
 */
export default function ContentScheduleCalendar({
  calendar,
  historyByDay,
  tips = [],
  selectedDateKey,
  onSelectDateKey,
  onMonthChange,
  gapDays = null,
  loading = false,
  rhythm = [],
}) {
  const selectedItems = historyByDay[selectedDateKey] || [];
  const prev = shiftMonth(calendar.year, calendar.month, -1);
  const next = shiftMonth(calendar.year, calendar.month, 1);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <section className={`${VISION_PANEL} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--vision-line)] px-4 py-3.5 sm:px-5">
          <button
            type="button"
            className={VISION_GHOST_BTN}
            aria-label="이전 달"
            onClick={() => onMonthChange(prev.year, prev.month)}
          >
            ←
          </button>
          <div className="min-w-0 text-center">
            <p className={VISION_EYEBROW}>Schedule</p>
            <p className="text-[15px] font-semibold tracking-tight text-[var(--vision-ink)] sm:text-[16px]">
              {calendar.monthLabel}
            </p>
          </div>
          <button
            type="button"
            className={VISION_GHOST_BTN}
            aria-label="다음 달"
            onClick={() => onMonthChange(next.year, next.month)}
          >
            →
          </button>
        </div>

        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendar.weekdayLabels.map((label) => (
              <div
                key={label}
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--vision-muted)] sm:text-[11px]"
              >
                {label}
              </div>
            ))}
            {calendar.weeks.flatMap((week) =>
              week.days.map((cell) => {
                const entries = historyByDay[cell.dateKey] || [];
                const selected = cell.dateKey === selectedDateKey;
                const channels = [
                  ...new Set(entries.map((e) => e.channel)),
                ].slice(0, 3);
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => onSelectDateKey(cell.dateKey)}
                    className={`relative flex min-h-[44px] flex-col items-center justify-start rounded-xl border px-0.5 py-1.5 transition sm:min-h-[52px] sm:py-2 ${
                      selected
                        ? "border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.1))] ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.2))]"
                        : cell.isToday
                          ? "border-[var(--vision-line-strong,rgba(15,26,20,0.14))] bg-[var(--vision-paper,#f7faf8)]"
                          : "border-transparent hover:border-[var(--vision-line)] hover:bg-[var(--vision-paper,#f7faf8)]"
                    } ${cell.inMonth ? "" : "opacity-40"}`}
                    aria-label={`${cell.day}일${entries.length ? ` · 기록 ${entries.length}건` : ""}`}
                  >
                    <span
                      className={`text-[12px] font-semibold tabular-nums sm:text-[13px] ${
                        cell.isToday
                          ? "text-[var(--vision-accent-deep,#03a94d)]"
                          : "text-[var(--vision-ink)]"
                      }`}
                    >
                      {cell.day}
                    </span>
                    <span className="mt-1 flex min-h-[6px] items-center gap-0.5">
                      {channels.map((ch) => (
                        <span
                          key={`${cell.dateKey}-${ch}`}
                          className={`h-1.5 w-1.5 rounded-full ${CHANNEL_DOT[ch] || CHANNEL_DOT.blog}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-[var(--vision-line)] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-[var(--vision-ink)]">
              {selectedDateKey.replace(/-/g, ".")} 기록
            </p>
            {gapDays != null && gapDays >= 7 ? (
              <span className="rounded-full bg-[#FFF8E6] px-2.5 py-1 text-[10px] font-semibold text-[#8B5A00]">
                마지막 업데이트 {gapDays}일 전
              </span>
            ) : null}
          </div>
          {loading ? (
            <p className={`mt-3 ${VISION_SUB}`}>기록 불러오는 중…</p>
          ) : selectedItems.length ? (
            <ul className="mt-3 space-y-2">
              {selectedItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3.5 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${CHANNEL_DOT[item.channel] || CHANNEL_DOT.blog}`}
                    />
                    <span className="text-[11px] font-semibold text-[var(--vision-muted)]">
                      {item.channelLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--vision-ink)]">
                    {item.title}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-3 ${VISION_SUB}`}>
              이 날짜에 저장된 글이 없습니다. 운영 계획대로 새 글을 쓰면 여기에 쌓입니다.
            </p>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {rhythm?.length ? (
          <section className={`${VISION_PANEL} p-4 sm:p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
              채널 발행 주기
            </p>
            <ul className="mt-4 space-y-2.5">
              {rhythm.map((row) => (
                <li
                  key={row.channel}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${CHANNEL_DOT[row.channel] || CHANNEL_DOT.blog}`}
                    />
                    <span className="text-[13px] font-semibold text-[var(--vision-ink)]">
                      {row.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-[var(--vision-muted)]">
                      {row.daysSinceLast == null
                        ? "기록 없음"
                        : `${row.daysSinceLast}일 전 · ${row.cadenceDays}일 주기`}
                    </p>
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        row.status === "overdue"
                          ? "text-[#E42939]"
                          : row.status === "due"
                            ? "text-[#8B5A00]"
                            : row.status === "ok"
                              ? "text-[var(--vision-accent-deep,#03a94d)]"
                              : "text-[var(--vision-muted)]"
                      }`}
                    >
                      {row.status === "overdue"
                        ? "업데이트 지연"
                        : row.status === "due"
                          ? "업데이트 권장"
                          : row.status === "ok"
                            ? "리듬 양호"
                            : "시작 필요"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${VISION_PANEL} p-4 sm:p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-accent-deep,#03a94d)]">
            브랜드 매니저 팁
          </p>
          <ul className="mt-4 space-y-3">
            {tips.map((tip) => (
              <li key={tip.id} className={TIP_SURFACE[tip.tone] || TIP_SURFACE.info}>
                <p className="text-[13px] font-semibold text-[var(--vision-ink)]">
                  {tip.title}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--vision-muted)]">
                  {tip.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-paper,#f7faf8)] px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--vision-muted)]">
            채널 범례
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["blog", "이야기"],
              ["place", "플레이스"],
              ["instagram", "인스타"],
            ].map(([ch, label]) => (
              <span
                key={ch}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${VISION_CHIP_IDLE}`}
              >
                <span className={`h-2 w-2 rounded-full ${CHANNEL_DOT[ch]}`} />
                {label}
              </span>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
