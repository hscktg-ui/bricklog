/**
 * 랜딩·미리보기 카드 상단 — 브랜드 톴 라벨
 */
export default function LandingPanelHeader({ title, className = "" }) {
  return (
    <div
      className={`flex items-center gap-2.5 border-b border-[#E8EBED]/70 bg-[#FAFBFC] px-3 py-2.5 sm:px-4 ${className}`}
    >
      <span
        className="h-3.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#03C75A] to-[#02A94D]"
        aria-hidden
      />
      <span className="truncate text-[12px] font-semibold tracking-tight text-[#4E5968] sm:text-[13px]">
        {title}
      </span>
    </div>
  );
}
