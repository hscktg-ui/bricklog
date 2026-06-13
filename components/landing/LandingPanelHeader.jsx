/**
 * 랜딩·미리보기 카드 상단 — 브랜드 톴 라벨
 */
export default function LandingPanelHeader({ title, className = "" }) {
  return (
    <div
      className={`flex items-center gap-2.5 border-b border-[#E8EBED]/80 bg-[#F7F8FA] px-3 py-2.5 sm:px-4 ${className}`}
    >
      <span
        className="h-4 w-1 shrink-0 rounded-full bg-[#03C75A]"
        aria-hidden
      />
      <span className="truncate text-[12px] font-semibold text-[#4E5968] sm:text-[13px]">
        {title}
      </span>
    </div>
  );
}
