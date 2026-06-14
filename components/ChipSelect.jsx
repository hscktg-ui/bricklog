import {
  VISION_CHIP_ACTIVE,
  VISION_CHIP_IDLE,
} from "@/lib/landing/vision2030Styles";

export default function ChipSelect({
  label,
  options,
  value,
  onChange,
  columns = 2,
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-[var(--vision-muted)]">
        {label}
      </span>
      <div
        className={`grid gap-1.5 ${
          columns === 3
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-2"
        }`}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`briclog-pressable rounded-xl border px-2.5 py-2 text-left text-[12px] font-medium transition ${
                active ? VISION_CHIP_ACTIVE : VISION_CHIP_IDLE
              }`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
