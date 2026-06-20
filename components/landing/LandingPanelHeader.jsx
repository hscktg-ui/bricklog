/**
 * 랜딩·미리보기 카드 상단 — Vision 2030 minimal chrome (Jobs-style window bar)
 */
export default function LandingPanelHeader({ title, className = "" }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-[var(--vision-line)] bg-[var(--vision-paper)] px-4 py-3 sm:px-5 ${className}`}
    >
      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)] sm:text-[12px]">
        {title}
      </span>
      <span className="flex shrink-0 gap-1.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.35)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.35)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.35)]" />
      </span>
    </div>
  );
}
