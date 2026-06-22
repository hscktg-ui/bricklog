"use client";

import {
  VISION_CHIP_IDLE,
  VISION_CTA_ACCENT,
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

const CHANNEL_RING = {
  blog: "ring-[var(--vision-accent,#03c75a)]",
  place: "ring-[#4B9EFF]",
  instagram: "ring-[#E84D8A]",
  insta: "ring-[#E84D8A]",
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

function formatDateLabel(dateKey = "") {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

function dayContextLabel(dateKey, todayKey) {
  if (!dateKey) return "날짜";
  if (dateKey === todayKey) return "오늘";
  if (dateKey < todayKey) return formatDateLabel(dateKey);
  return formatDateLabel(dateKey);
}

/**
 * @param {{
 *   calendar: import('@/lib/product/contentScheduleCalendar').buildMonthCalendarGrid extends (...args: any[]) => infer R ? R : never;
 *   historyByDay: Record<string, { id: string; channel: string; channelLabel: string; title: string; created_at?: string | null }[]>;
 *   plannedByDay?: Record<string, { id: string; channel: string; channelLabel: string; title: string; kind?: string; priority?: string }[]>;
 *   monthSummary?: { createdCount: number; plannedCount: number; nextPlannedKey?: string };
 *   tips: { id: string; kind: string; tone: 'info' | 'warn' | 'accent'; title: string; body: string }[];
 *   selectedDateKey: string;
 *   onSelectDateKey: (key: string) => void;
 *   onMonthChange: (year: number, month: number) => void;
 *   onWriteChannel?: (channel: string, opts?: { topic?: string; dateKey?: string }) => void;
 *   gapDays?: number | null;
 *   loading?: boolean;
 *   rhythm?: object[];
 * }} props
 */
export default function ContentScheduleCalendar({
  calendar,
  historyByDay,
  plannedByDay = {},
  monthSummary = { createdCount: 0, plannedCount: 0 },
  tips = [],
  selectedDateKey,
  onSelectDateKey,
  onMonthChange,
  onWriteChannel,
  gapDays = null,
  loading = false,
  rhythm = [],
}) {
  const todayKey = calendar.todayKey;
  const selectedCreated = historyByDay[selectedDateKey] || [];
  const selectedPlanned = plannedByDay[selectedDateKey] || [];
  const isPastDay = selectedDateKey && selectedDateKey < todayKey;
  const isFutureDay = selectedDateKey && selectedDateKey > todayKey;
  const prev = shiftMonth(calendar.year, calendar.month, -1);
  const next = shiftMonth(calendar.year, calendar.month, 1);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <section className={`${VISION_PANEL} overflow-hidden`}>
        <div className="border-b border-[var(--vision-line)] px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={VISION_GHOST_BTN}
              aria-label="이전 달"
              onClick={() => onMonthChange(prev.year, prev.month)}
            >
              ←
            </button>
            <div className="min-w-0 text-center">
              <p className={VISION_EYEBROW}>운영 캘린더</p>
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
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[var(--vision-muted)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vision-line)] bg-[var(--vision-paper)] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full bg-[var(--vision-accent)]" />
              만든 글 {monthSummary.createdCount}건
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vision-line)] bg-[var(--vision-paper)] px-2.5 py-1">
              <span className="h-2 w-2 rounded-full ring-2 ring-[var(--vision-accent)] ring-offset-1" />
              쓸 예정 {monthSummary.plannedCount}건
            </span>
            {monthSummary.nextPlannedKey ? (
              <button
                type="button"
                onClick={() => onSelectDateKey(monthSummary.nextPlannedKey)}
                className="rounded-full border border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] px-2.5 py-1 text-[var(--vision-accent-deep,#03a94d)] hover:brightness-105"
              >
                다음 예정 {formatDateLabel(monthSummary.nextPlannedKey)}
              </button>
            ) : null}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendar.weekdayLabels.map((label) => (
              <div
                key={label}
                className="pb-1 text-center text-[10px] font-semibold tracking-[0.06em] text-[var(--vision-muted)] sm:text-[11px]"
              >
                {label}
              </div>
            ))}
            {calendar.weeks.flatMap((week) =>
              week.days.map((cell) => {
                const created = historyByDay[cell.dateKey] || [];
                const planned = plannedByDay[cell.dateKey] || [];
                const selected = cell.dateKey === selectedDateKey;
                const createdChannels = [
                  ...new Set(created.map((e) => e.channel)),
                ].slice(0, 3);
                const plannedChannels = [
                  ...new Set(planned.map((e) => e.channel)),
                ].slice(0, 3);
                const cellIsPast = cell.dateKey < todayKey;
                const cellIsFuture = cell.dateKey > todayKey;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => onSelectDateKey(cell.dateKey)}
                    className={`relative flex min-h-[48px] flex-col items-center justify-start rounded-xl border px-0.5 py-1.5 transition sm:min-h-[56px] sm:py-2 ${
                      selected
                        ? "border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.1))] ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.2))]"
                        : cell.isToday
                          ? "border-[var(--vision-line-strong,rgba(15,26,20,0.14))] bg-[var(--vision-paper,#f7faf8)]"
                          : planned.length && cellIsFuture
                            ? "border-dashed border-[var(--vision-line)] hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.25))] hover:bg-[var(--vision-paper,#f7faf8)]"
                            : "border-transparent hover:border-[var(--vision-line)] hover:bg-[var(--vision-paper,#f7faf8)]"
                    } ${cell.inMonth ? "" : "opacity-35"}`}
                    aria-label={`${cell.day}일${created.length ? ` · 작성 ${created.length}건` : ""}${planned.length ? ` · 예정 ${planned.length}건` : ""}`}
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
                    <span className="mt-1 flex min-h-[10px] flex-wrap items-center justify-center gap-0.5">
                      {createdChannels.map((ch) => (
                        <span
                          key={`c-${cell.dateKey}-${ch}`}
                          className={`h-1.5 w-1.5 rounded-full ${CHANNEL_DOT[ch] || CHANNEL_DOT.blog}`}
                          title="만든 글"
                        />
                      ))}
                      {plannedChannels.map((ch) => (
                        <span
                          key={`p-${cell.dateKey}-${ch}`}
                          className={`h-1.5 w-1.5 rounded-full bg-[var(--vision-panel-bg,#fff)] ring-2 ${CHANNEL_RING[ch] || CHANNEL_RING.blog}`}
                          title="쓸 예정"
                        />
                      ))}
                    </span>
                    {cell.isToday && (created.length || planned.length) ? (
                      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-[var(--vision-accent-deep)]">
                        오늘
                      </span>
                    ) : null}
                    {cellIsPast && created.length === 0 && planned.length > 0 ? (
                      <span className="mt-0.5 text-[8px] text-[var(--vision-muted)]">예정</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-[var(--vision-line)] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold text-[var(--vision-ink)]">
                {dayContextLabel(selectedDateKey, todayKey)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--vision-muted)]">
                {selectedCreated.length
                  ? `만든 글 ${selectedCreated.length}건`
                  : "만든 글 없음"}
                {" · "}
                {selectedPlanned.length
                  ? `쓸 예정 ${selectedPlanned.length}건`
                  : "예정 없음"}
              </p>
            </div>
            {gapDays != null && gapDays >= 7 && selectedDateKey === todayKey ? (
              <span className="rounded-full bg-[#FFF8E6] px-2.5 py-1 text-[10px] font-semibold text-[#8B5A00]">
                마지막 작성 {gapDays}일 전
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className={`mt-3 ${VISION_SUB}`}>기록 불러오는 중…</p>
          ) : (
            <div className="mt-4 space-y-4">
              {selectedCreated.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--vision-muted)]">
                    만든 글
                  </p>
                  <ul className="mt-2 space-y-2">
                    {selectedCreated.map((item) => (
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
                          {item.created_at ? (
                            <span className="ml-auto text-[10px] tabular-nums text-[var(--vision-muted)]">
                              {new Date(item.created_at).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--vision-ink)]">
                          {item.title}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : isPastDay ? (
                <p className={`${VISION_SUB}`}>
                  이 날에는 저장된 글이 없어요. 앞으로 쓴 글은 날짜별로 쌓입니다.
                </p>
              ) : null}

              {selectedPlanned.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--vision-accent-deep,#03a94d)]">
                    {isFutureDay ? "이 날 쓸 예정" : "쓸 예정"}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {selectedPlanned.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--vision-accent-ring,rgba(3,199,90,0.28))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.05))] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ring-2 ring-offset-1 ${CHANNEL_RING[item.channel] || CHANNEL_RING.blog} bg-white`}
                            />
                            <span className="text-[11px] font-semibold text-[var(--vision-muted)]">
                              {item.channelLabel}
                            </span>
                            {item.priority ? (
                              <span className="rounded-full bg-[var(--vision-paper)] px-2 py-0.5 text-[10px] text-[var(--vision-muted)]">
                                {item.priority}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--vision-ink)]">
                            {item.title}
                          </p>
                        </div>
                        {!isPastDay && onWriteChannel ? (
                          <button
                            type="button"
                            onClick={() =>
                              onWriteChannel(item.channel, {
                                topic: item.title,
                                dateKey: selectedDateKey,
                              })
                            }
                            className={`${VISION_CTA_ACCENT} !min-h-[40px] !w-full shrink-0 !px-4 !text-[12px] sm:!w-auto`}
                          >
                            글쓰기
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : !selectedCreated.length && !isPastDay ? (
                <p className={`${VISION_SUB}`}>
                  이 날짜에 예정된 글이 없어요. 아래 운영안에서 주제를 고르거나 다른 날짜를
                  눌러 보세요.
                </p>
              ) : null}

              {!selectedCreated.length && !selectedPlanned.length && isPastDay ? null : null}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {rhythm?.length ? (
          <section className={`${VISION_PANEL} p-4 sm:p-5`}>
            <p className="text-[12px] font-semibold text-[var(--vision-ink)]">
              채널 발행 리듬
            </p>
            <p className="mt-1 text-[11px] text-[var(--vision-muted)]">
              만든 날 기준으로 다음 쓸 날이 캘린더에 잡힙니다.
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
                        ? "아직 기록 없음"
                        : `${row.daysSinceLast}일 전 · ${row.cadenceDays}일마다`}
                    </p>
                    <p
                      className={`text-[10px] font-semibold ${
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
                          ? "이번 주 권장"
                          : row.status === "ok"
                            ? "리듬 양호"
                            : "시작해 보세요"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${VISION_PANEL} p-4 sm:p-5`}>
          <p className="text-[12px] font-semibold text-[var(--vision-accent-deep,#03a94d)]">
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
          <p className="text-[12px] font-semibold text-[var(--vision-ink)]">범례</p>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {[
                ["blog", "이야기"],
                ["place", "플레이스"],
                ["instagram", "인스타"],
              ].map(([ch, label]) => (
                <span
                  key={`solid-${ch}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${VISION_CHIP_IDLE}`}
                >
                  <span className={`h-2 w-2 rounded-full ${CHANNEL_DOT[ch]}`} />
                  {label} · 작성
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["blog", "이야기"],
                ["place", "플레이스"],
                ["instagram", "인스타"],
              ].map(([ch, label]) => (
                <span
                  key={`ring-${ch}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-medium text-[var(--vision-muted)]`}
                >
                  <span
                    className={`h-2 w-2 rounded-full bg-white ring-2 ${CHANNEL_RING[ch]}`}
                  />
                  {label} · 예정
                </span>
              ))}
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
