"use client";

import {
  VISION_CTA_ACCENT,
  VISION_GHOST_BTN,
  VISION_PANEL,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";

/**
 * 생성 직전 1비트 — 업종 맞춤 칩 + 한 줄 (3칸 약속 유지)
 */
export default function GenerationContextBeatPanel({
  config,
  value = "",
  onChange,
  onConfirm,
  onCancel,
  busy = false,
  className = "",
}) {
  if (!config) return null;

  const toggleChip = (chip) => {
    const parts = String(value || "")
      .split(/[,，·/\n|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const has = parts.some((p) => p === chip || p.includes(chip));
    if (has) {
      onChange?.(
        parts.filter((p) => p !== chip && !p.includes(chip)).join(" · ")
      );
      return;
    }
    onChange?.(parts.length ? `${parts.join(" · ")} · ${chip}` : chip);
  };

  const canConfirm = String(value || "").trim().length >= 6;

  return (
    <div
      className={`${VISION_STATUS_WARN} ${className}`}
      role="dialog"
      aria-labelledby="generation-context-beat-title"
    >
      <div className={`${VISION_PANEL} mt-2 px-4 py-4`}>
        <p
          id="generation-context-beat-title"
          className="text-[13px] font-semibold text-[var(--vision-ink)]"
        >
          {config.headline}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
          {config.hint} 브랜드·지역·주제는 그대로 두고,{" "}
          <strong className="font-semibold text-[var(--vision-ink)]">
            현장 포인트 한 줄
          </strong>
          만 더하면 1~2분 안에 편집본을 받을 수 있어요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {config.chips.map((chip) => {
            const active = String(value || "").includes(chip);
            return (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => toggleChip(chip)}
                className={`briclog-pressable min-h-[36px] rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                  active
                    ? "border-[var(--vision-accent,#03c75a)] bg-[rgba(3,199,90,0.08)] text-[var(--vision-ink)]"
                    : "border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] text-[var(--vision-muted)]"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={config.placeholder}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3 py-2.5 text-[14px] text-[var(--vision-ink)] placeholder:text-[var(--vision-muted)] outline-none focus:border-[var(--vision-accent,#03c75a)] focus:ring-2 focus:ring-[rgba(3,199,90,0.15)]"
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!canConfirm || busy}
            onClick={onConfirm}
            className={`${VISION_CTA_ACCENT} flex-1 disabled:opacity-50`}
          >
            {busy ? "받는 중…" : "이대로 글 받기"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={`${VISION_GHOST_BTN} flex-1`}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
