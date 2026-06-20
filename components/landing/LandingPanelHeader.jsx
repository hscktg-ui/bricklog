/**
 * 랜딩·미리보기 카드 상단 — Vision 2030 minimal chrome (브랜드 라인, macOS 창 UI 없음)
 */
export default function LandingPanelHeader({ title, className = "" }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-[var(--vision-line)] bg-[var(--vision-paper)] px-4 py-3 sm:px-5 ${className}`}
    >
      <span className="truncate text-[12px] font-semibold tracking-[0.06em] text-[var(--vision-ink)]">
        {title}
      </span>
      <span
        className="h-[3px] w-10 shrink-0 rounded-full bg-gradient-to-r from-[var(--vision-accent-deep,#03a94d)] via-[var(--vision-accent)] to-[var(--vision-accent-deep,#03a94d)] opacity-80"
        aria-hidden
      />
    </div>
  );
}
