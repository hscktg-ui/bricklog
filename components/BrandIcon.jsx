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
      <rect x="4" y="4" width="40" height="40" rx="11" fill="#F7F8FA" />
      <rect
        x="10"
        y="10"
        width="13"
        height="13"
        rx="3.2"
        fill="#F7F8FA"
        stroke="#111111"
        strokeWidth="2.2"
      />
      <rect x="25" y="10" width="13" height="13" rx="3.2" fill="#111111" />
      <rect x="17.5" y="25" width="13" height="13" rx="3.2" fill="#03C75A" />
    </svg>
  );
}
