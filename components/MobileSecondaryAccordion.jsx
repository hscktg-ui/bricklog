"use client";

/**
 * Collapses secondary panels on small screens in concise layout mode.
 */
export default function MobileSecondaryAccordion({
  title,
  children,
  collapsed = false,
  className = "",
}) {
  if (!collapsed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <details
      className={`group rounded-xl border border-[#E8EBED] bg-white ${className}`}
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[13px] font-semibold text-[#4E5968] marker:content-none [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-[11px] font-normal text-[#8B95A1] group-open:hidden">
          펼치기
        </span>
        <span className="hidden text-[11px] font-normal text-[#8B95A1] group-open:inline">
          접기
        </span>
      </summary>
      <div className="space-y-3 border-t border-[#E8EBED] px-4 pb-4 pt-3">
        {children}
      </div>
    </details>
  );
}
