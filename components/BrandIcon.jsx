/** 브릭 아이콘만 (한글 워드마크 없음) */
export default function BrandIcon({ size = 36, className = "" }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="4" y="22" width="16" height="14" rx="3" fill="#5BC77A" />
      <rect x="22" y="22" width="16" height="14" rx="3" fill="#2D6B45" />
      <rect
        x="13"
        y="6"
        width="18"
        height="16"
        rx="3"
        fill="none"
        stroke="#2D6B45"
        strokeWidth="2.5"
      />
      <path
        d="M17 12h8M17 16h6"
        stroke="#5BC77A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M27 8l3 3-3 3" fill="#fff" stroke="#2D6B45" strokeWidth="1.5" />
    </svg>
  );
}
