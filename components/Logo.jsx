import BrandIcon from "./BrandIcon";

/** 브랜드 워드마크 — 기본은 「브릭로그」 텍스트만 (아이콘 선택) */
export default function Logo({
  showWordmark = true,
  showIcon = false,
  wordmark = "브릭로그",
  iconSize = 32,
  className = "",
  onClick,
}) {
  const inner = (
    <>
      {showIcon ? <BrandIcon size={iconSize} /> : null}
      {showWordmark ? (
        <span className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--vision-ink,#191F28)]">
          {wordmark}
        </span>
      ) : null}
    </>
  );

  const layoutClass = showIcon
    ? "flex items-center gap-2.5"
    : "flex items-center";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="홈으로"
        className={`${layoutClass} rounded-lg text-left transition hover:opacity-85 active:brightness-[0.97] ${className}`}
      >
        {inner}
      </button>
    );
  }

  return <div className={`${layoutClass} ${className}`}>{inner}</div>;
}
