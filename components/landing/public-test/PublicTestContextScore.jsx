"use client";

import BriclogDepthPanel from "@/components/quality/BriclogDepthPanel";

export default function PublicTestContextScore({ contextScore, channelReady = {} }) {
  return (
    <div className="border-t border-[var(--vision-line)] px-5 py-4">
      <BriclogDepthPanel
        contextScore={contextScore}
        variant="compact"
        channelReady={channelReady}
      />
      {contextScore?.improvementHint ? (
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--vision-muted)]">
          {contextScore.improvementHint}
        </p>
      ) : null}
    </div>
  );
}
