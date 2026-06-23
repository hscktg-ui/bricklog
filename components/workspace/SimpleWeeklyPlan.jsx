"use client";

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

const WEEKDAY_SHORT = ["월", "화", "수", "목", "금", "토", "일"];

function toDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 이번 주 월~일 dateKey */
function buildWeekDays(anchor = new Date()) {
  const d = new Date(anchor);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    rows.push({
      dateKey: toDateKey(cur),
      weekday: WEEKDAY_SHORT[i],
      isToday: toDateKey(cur) === toDateKey(anchor),
    });
  }
  return rows;
}

/**
 * 수비적 주간 플랜 — 이번 주 7칸 + 만든 날 체크만
 */
export default function SimpleWeeklyPlan({
  brandName = "",
  weekTopics = [],
  historyByDay = {},
  onWrite,
  loading = false,
}) {
  const weekDays = buildWeekDays();
  const primaryTopic = weekTopics[0]?.topic || "";

  return (
    <div className="space-y-4">
      <div className={`${VISION_PANEL} p-4 sm:p-5`}>
        <p className={VISION_EYEBROW}>이번 주</p>
        <p className={`mt-2 ${VISION_SUB}`}>
          {brandName ? `${brandName} — ` : ""}
          쓸 날짜를 고르고 주제로 글쓰기만 이어가면 됩니다.
        </p>
        <ul className="mt-4 space-y-2">
          {weekDays.map((row) => {
            const done = (historyByDay[row.dateKey] || []).length > 0;
            const label = (historyByDay[row.dateKey] || [])[0]?.title;
            return (
              <li
                key={row.dateKey}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 ${
                  row.isToday
                    ? "border-[var(--vision-accent-ring)] bg-[var(--vision-accent-soft,#e8f9ef)]"
                    : "border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      done
                        ? "bg-[var(--vision-accent,#03c75a)] text-white"
                        : "bg-[var(--vision-line)] text-[var(--vision-muted)]"
                    }`}
                    aria-hidden
                  >
                    {done ? "✓" : row.weekday}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--vision-ink)]">
                      {row.isToday ? "오늘" : row.weekday}
                      <span className="ml-1.5 font-normal text-[var(--vision-muted)]">
                        {row.dateKey.slice(5).replace("-", "/")}
                      </span>
                    </p>
                    {done && label ? (
                      <p className="truncate text-[11px] text-[var(--vision-muted)]">{label}</p>
                    ) : (
                      <p className="text-[11px] text-[var(--vision-muted)]">비어 있음</p>
                    )}
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
                  className={`${VISION_CTA_ACCENT} !min-h-[36px] shrink-0 !px-3 !py-1.5 !text-[12px]`}
                >
                  글쓰기
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {weekTopics.length > 1 ? (
        <div className={`${VISION_PANEL} p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--vision-muted)]">
            제안 주제
          </p>
          <ul className="mt-3 space-y-2">
            {weekTopics.slice(0, 3).map((item) => (
              <li
                key={item.id || item.topic}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--vision-line)] px-3 py-2"
              >
                <span className="truncate text-[13px] text-[var(--vision-ink)]">
                  {item.topic}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--vision-muted)]">
                  {CHANNEL_LABEL[item.channel] || "이야기"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
