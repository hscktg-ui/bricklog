"use client";

/**
 * BRICLOG 스케치 라인 — 로딩·생성 단계용 (#03C75A / #8B95A1)
 * @typedef {'search'|'write'|'check'|'place'|'insta'|'image'|'brand'|'sparkle'} SketchStepId
 */

const PATHS = {
  search:
    "M10.5 10.5a4 4 0 105.66 5.66l3.34 3.34M10.5 10.5v0",
  write:
    "M16.5 3.5l4 4M4 20l3.5-1 9.5-9.5a1.4 1.4 0 00-2-2L5.5 17 4 20z",
  check: "M5.5 12.5l4 4 9-9",
  place:
    "M12 4.5c-2.8 3.2-4.5 5.4-4.5 8a4.5 4.5 0 009 0c0-2.6-1.7-4.8-4.5-8z M12 13.2v0",
  insta:
    "M8.2 8.2h7.6v7.6H8.2V8.2z M15.8 6.4h.01M12 10.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z",
  image:
    "M4.5 6.5h15v11h-15v-11z M8.5 14l2.5-2.5 2 2 3-3.5 2.5 4",
  brand:
    "M7.5 6.5h9v11h-9v-11z M9.5 9h5M9.5 12h3.5",
  sparkle:
    "M12 3.5l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4z",
};

/**
 * @param {{ id: SketchStepId, active?: boolean, done?: boolean, className?: string }} props
 */
export default function SketchStepIcon({
  id,
  active = false,
  done = false,
  className = "h-5 w-5",
}) {
  const d = PATHS[id] || PATHS.sparkle;
  const stroke = done ? "#03A94D" : active ? "#03C75A" : "#8B95A1";
  const fill = active ? "#E8F9EF" : "none";

  return (
    <svg
      className={`pointer-events-none shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {id === "check" && done ? (
        <circle cx="12" cy="12" r="8.5" fill="#E8F9EF" stroke={stroke} strokeWidth="1.5" />
      ) : null}
      <path
        d={d}
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={id === "insta" ? fill : "none"}
      />
    </svg>
  );
}
