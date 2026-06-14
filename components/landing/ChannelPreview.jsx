"use client";

import {
  CHANNEL_CARDS,
  getChannelSnippetsFromSample,
  LANDING_SAMPLE,
} from "@/lib/landing/sampleContent";
import {
  VISION_EYEBROW,
  VISION_GLASS_CARD,
  VISION_SECTION,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

export default function ChannelPreview({ sample }) {
  const s = sample ?? LANDING_SAMPLE;
  const snippets = getChannelSnippetsFromSample(s);

  return (
    <section className={`${VISION_SECTION} px-4 py-12 md:px-8 md:py-16`}>
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <p className={`text-center ${VISION_EYEBROW}`}>Channels</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          네 가지 채널
        </h2>
        <p className={`mt-3 text-center ${VISION_SUB}`}>
          각각 따로 쓰거나, 이야기부터 한 번에 이어갈 수 있어요
        </p>

        <ul className="mt-8 space-y-3">
          {CHANNEL_CARDS.map((c) => (
            <li key={c.id} className={`flex gap-3 p-4 ${VISION_GLASS_CARD}`}>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${c.accent}`}
              >
                {c.label.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-[var(--vision-ink)]">{c.label}</p>
                <p className="mt-0.5 text-[12px] text-[var(--vision-muted)]">{c.desc}</p>
                <p
                  className="mt-2 text-[13px] leading-snug text-[var(--vision-muted)] line-clamp-2"
                  suppressHydrationWarning
                >
                  {snippets[c.id]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
