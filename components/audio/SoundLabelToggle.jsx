"use client";

/**
 * @param {{
 *   label: string;
 *   active: boolean;
 *   onClick: () => void;
 *   ariaLabel?: string;
 *   className?: string;
 *   fullWidth?: boolean;
 * }} props
 */
export default function SoundLabelToggle({
  label,
  active,
  onClick,
  ariaLabel,
  className = "",
  fullWidth = true,
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? `${label} 끄기` : `${label} 켜기`)}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition ${
        fullWidth ? "flex-1" : ""
      } ${
        active
          ? "border-[#03C75A]/45 bg-[#E8F9EF] text-[#03A94D]"
          : "border-[#E8EBED] bg-[#FAFBFC] text-[#8B95A1] hover:border-[#03C75A]/25 hover:text-[#4E5968]"
      } ${className}`}
    >
      <span>{label}</span>
    </button>
  );
}
