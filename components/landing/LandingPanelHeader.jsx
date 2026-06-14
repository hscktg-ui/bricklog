/**
 * 랜딩·미리보기 카드 상단 — Vision 2030 minimal chrome
 */
export default function LandingPanelHeader({ title, className = "" }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-[var(--vision-line)] bg-[var(--vision-paper)] px-4 py-3 sm:px-5 ${className}`}
    >
      <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--vision-muted)]">
        {title}
      </span>
      <span
        className="flex gap-1.5"
        aria-hidden
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </span>
    </div>
  );
}
