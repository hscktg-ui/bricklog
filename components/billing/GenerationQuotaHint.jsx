"use client";

import { formatGenerationQuotaLine } from "@/lib/billing/planUx";

export default function GenerationQuotaHint({ usage, phase }) {
  if (phase === "loading") {
    return (
      <p className="mt-2 text-center text-[11px] text-[#B0B8C1]" aria-live="polite">
        이용 한도 확인 중…
      </p>
    );
  }
  if (phase === "unknown" || !usage) return null;

  const line = formatGenerationQuotaLine(usage);
  if (!line) return null;

  return (
    <p className="mt-2 text-center text-[11px] font-medium text-[#4E5968]">
      {line}
    </p>
  );
}
