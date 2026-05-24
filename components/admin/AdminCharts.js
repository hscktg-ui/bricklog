"use client";

const ACCENT = "#03C75A";
const MUTED = "#E8EBED";
const TEXT = "#4E5968";

function maxCount(points) {
  return Math.max(1, ...points.map((p) => p.count ?? 0));
}

export function BarChart({ title, points, height = 120, valueKey = "count" }) {
  const max = maxCount(
    points.map((p) => ({ count: p[valueKey] ?? p.count ?? 0 }))
  );
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      {title && (
        <h3 className="text-[13px] font-semibold text-[#191F28]">{title}</h3>
      )}
      <div
        className="mt-3 flex items-end gap-1"
        style={{ height }}
        role="img"
        aria-label={title}
      >
        {points.map((p) => {
          const v = p[valueKey] ?? p.count ?? 0;
          const pct = Math.round((v / max) * 100);
          return (
            <div
              key={p.date || p.id || p.label}
              className="group flex flex-1 flex-col items-center justify-end"
              title={`${p.date || p.label}: ${v}`}
            >
              <div
                className="w-full min-w-[4px] max-w-[20px] rounded-t transition-colors group-hover:bg-[#02B350]"
                style={{
                  height: `${Math.max(pct, v ? 4 : 0)}%`,
                  backgroundColor: v ? ACCENT : MUTED,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#8B95A1]">
        <span>{points[0]?.date?.slice(5) || ""}</span>
        <span>{points[points.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

export function LineChart({ title, points, height = 100 }) {
  const vals = points.map((p) => (p.avg != null ? p.avg : null));
  const numeric = vals.filter((v) => v != null);
  const min = numeric.length ? Math.min(...numeric) : 0;
  const max = numeric.length ? Math.max(...numeric) : 100;
  const span = Math.max(max - min, 1);
  const w = 280;
  const h = height - 20;
  const step = points.length > 1 ? w / (points.length - 1) : w;

  const coords = points.map((p, i) => {
    if (p.avg == null) return null;
    const x = i * step;
    const y = h - ((p.avg - min) / span) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const linePath = coords.filter(Boolean).join(" ");

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      {title && (
        <h3 className="text-[13px] font-semibold text-[#191F28]">{title}</h3>
      )}
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="mt-2 w-full max-w-full"
        role="img"
        aria-label={title}
      >
        <line x1="0" y1={h} x2={w} y2={h} stroke={MUTED} strokeWidth="1" />
        {linePath && (
          <polyline
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinejoin="round"
            points={linePath}
          />
        )}
        {points.map((p, i) => {
          if (p.avg == null) return null;
          const x = i * step;
          const y = h - ((p.avg - min) / span) * (h - 8) - 4;
          return (
            <circle key={p.date} cx={x} cy={y} r="3" fill={ACCENT} />
          );
        })}
      </svg>
      <p className="mt-1 text-[10px] text-[#8B95A1]">
        {min}–{max}점 (일별 평균)
      </p>
    </div>
  );
}

export function HorizontalBars({ title, items, labelKey = "label" }) {
  const max = Math.max(1, ...items.map((i) => i.count ?? 0));
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      {title && (
        <h3 className="text-[13px] font-semibold text-[#191F28]">{title}</h3>
      )}
      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-[12px] text-[#8B95A1]">데이터 없음</li>
        )}
        {items.map((item) => {
          const label =
            item[labelKey] || item.reason || item.key || item.id || "—";
          const pct = Math.round(((item.count ?? 0) / max) * 100);
          return (
            <li key={label}>
              <div className="flex justify-between text-[11px] text-[#4E5968]">
                <span className="truncate pr-2">{label}</span>
                <span className="shrink-0 font-medium">{item.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F0F2F5]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: ACCENT }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const FEEDBACK_COLORS = {
  good: "#03C75A",
  neutral: "#8B95A1",
  bad: "#E42939",
};

export function FeedbackPie({ title, items }) {
  const total = items.reduce((s, i) => s + (i.count ?? 0), 0) || 1;
  let offset = 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      {title && (
        <h3 className="text-[13px] font-semibold text-[#191F28]">{title}</h3>
      )}
      <div className="mt-3 flex items-center gap-4">
        <svg width="88" height="88" viewBox="0 0 88 88" role="img">
          <g transform="rotate(-90 44 44)">
            {items.map((item) => {
              const frac = (item.count ?? 0) / total;
              const dash = frac * circumference;
              const gap = circumference - dash;
              const el = (
                <circle
                  key={item.id}
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke={FEEDBACK_COLORS[item.id] || TEXT}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return el;
            })}
          </g>
        </svg>
        <ul className="space-y-1 text-[11px] text-[#4E5968]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: FEEDBACK_COLORS[item.id] || TEXT,
                }}
              />
              {item.label} {item.count} (
              {Math.round(((item.count ?? 0) / total) * 100)}%)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, small = false }) {
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      <p className="text-[12px] text-[#8B95A1]">{label}</p>
      <p
        className={`mt-1 font-bold text-[#191F28] ${small ? "text-[20px]" : "text-[24px]"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-[#8B95A1]">{hint}</p>}
    </div>
  );
}
