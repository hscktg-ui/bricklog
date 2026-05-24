"use client";

export const channelFieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

export function ChannelField({ label, hint, children, required, compact = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#4E5968]">
        {label}
        {required && <span className="text-[#03C75A]">*</span>}
      </span>
      {children}
      {hint && !compact ? (
        <p className="mt-1 text-[11px] leading-snug text-[#8B95A1]">{hint}</p>
      ) : null}
    </label>
  );
}

export function ChannelFormSection({
  title,
  desc,
  children,
  defaultOpen = true,
  compact = false,
}) {
  if (compact) {
    return (
      <details
        open={defaultOpen}
        className="group rounded-xl border border-[#E8EBED] bg-[#FAFBFC]"
      >
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-[13px] font-bold text-[#191F28]">{title}</span>
          <span className="shrink-0 text-[11px] font-medium text-[#8B95A1] group-open:hidden">
            펼치기
          </span>
          <span className="hidden shrink-0 text-[11px] font-medium text-[#8B95A1] group-open:inline">
            접기
          </span>
        </summary>
        <div className="space-y-3 border-t border-[#E8EBED] px-3.5 pb-3.5 pt-3">
          {children}
        </div>
      </details>
    );
  }

  return (
    <section className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3.5">
      <div className="mb-3">
        <h3 className="text-[13px] font-bold text-[#191F28]">{title}</h3>
        {desc ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#8B95A1]">
            {desc}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function OptionGrid({ options, value, onChange, cols = 2, compact }) {
  return (
    <div
      className={`grid gap-1.5 ${
        cols === 3 ? "grid-cols-3" : cols === 1 ? "grid-cols-1" : "grid-cols-2"
      }`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg border px-2 py-2 text-left transition ${
            value === o.value
              ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
              : "border-[#E8EBED] bg-white text-[#4E5968] hover:border-[#03C75A]/30"
          } ${compact ? "text-[11px]" : "text-[12px] font-medium"}`}
        >
          <span className="block font-semibold">{o.label}</span>
          {o.hint && !compact ? (
            <span className="mt-0.5 block text-[10px] font-normal text-[#8B95A1]">
              {o.hint}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
