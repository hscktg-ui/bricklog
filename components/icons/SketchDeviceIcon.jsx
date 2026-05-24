"use client";

/**
 * BRICLOG 스케치 라인 디바이스 — #03C75A / #8B95A1
 * @typedef {'mobile'|'tablet'|'desktop'} SketchDeviceId
 */

const SKETCH_INNER = {
  mobile: "M10.5 17.6h3",
  tablet: null,
  desktop: "M8.2 18.1h7.6 M12 18.1v2.3",
};

const LABEL_EN = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
};

/**
 * @param {{ device: SketchDeviceId, active?: boolean, className?: string, showLabel?: boolean }} props
 */
export default function SketchDeviceIcon({
  device,
  active = false,
  /** 초록 탭 배경 위 아이콘 */
  onGreenBg = false,
  className = "h-5 w-5",
  showLabel = false,
}) {
  const stroke =
    active && onGreenBg ? "#ffffff" : active ? "#03C75A" : "#8B95A1";
  const fill = active && onGreenBg ? "#03C75A" : active ? "#E8F9EF" : "none";
  const accent =
    active && onGreenBg ? "#E8F9EF" : active ? "#03A94D" : "#B0B8C1";

  let frame = null;
  if (device === "mobile") {
    frame = (
      <rect
        x="7.5"
        y="3.8"
        width="9"
        height="16.4"
        rx="2"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    );
  } else if (device === "tablet") {
    frame = (
      <rect
        x="3.8"
        y="6.2"
        width="16.4"
        height="11.6"
        rx="1.8"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    );
  } else {
    frame = (
      <rect
        x="2.8"
        y="5.2"
        width="18.4"
        height="12.2"
        rx="1.6"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    );
  }

  const inner = SKETCH_INNER[device];

  return (
    <span className="inline-flex items-center gap-1">
      <svg
        className={`pointer-events-none shrink-0 ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden={!showLabel}
        role={showLabel ? "img" : undefined}
        aria-label={showLabel ? LABEL_EN[device] : undefined}
      >
        {frame}
        {inner ? (
          <path
            d={inner}
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
      {showLabel ? (
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${
            active ? "text-[#03A94D]" : "text-[#8B95A1]"
          }`}
        >
          {LABEL_EN[device]}
        </span>
      ) : null}
    </span>
  );
}
