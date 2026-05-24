import BrandIcon from "./BrandIcon";

/** 아이콘 + 영문 BRICLOG (한글 워드마크 없음) */
export default function Logo({
  showWordmark = true,
  iconSize = 32,
  className = "",
  onClick,
}) {
  const inner = (
    <>
      <BrandIcon size={iconSize} />
      {showWordmark && (
        <span className="text-[15px] font-bold tracking-[0.12em] text-[#5BC77A]">
          BRICLOG
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="홈으로"
        className={`flex items-center gap-2.5 rounded-lg text-left transition hover:opacity-85 active:brightness-[0.97] ${className}`}
      >
        <span className="inline-flex items-center gap-2.5">{inner}</span>
      </button>
    );
  }

  return <div className={`flex items-center gap-2.5 ${className}`}>{inner}</div>;
}
