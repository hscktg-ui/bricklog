"use client";

import {
  CHANNEL_CARDS,
  getChannelSnippetsFromSample,
  LANDING_SAMPLE,
} from "@/lib/landing/sampleContent";

export default function ChannelPreview({ sample }) {
  const s = sample ?? LANDING_SAMPLE;
  const snippets = getChannelSnippetsFromSample(s);

  return (
    <section className="bg-[#F7F8FA] px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <h2 className="text-center text-[20px] font-bold text-[#191F28] md:text-[24px]">
          네 가지 채널
        </h2>
        <p className="mt-2 text-center text-[14px] text-[#8B95A1]">
          각각 따로 쓰거나, 이야기부터 한 번에 이어갈 수 있어요
        </p>

        <ul className="mt-6 space-y-3">
          {CHANNEL_CARDS.map((c) => (
            <li
              key={c.id}
              className="flex gap-3 rounded-2xl border border-[#E8EBED] bg-white p-4"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${c.accent}`}
              >
                {c.label.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#191F28]">{c.label}</p>
                <p className="mt-0.5 text-[12px] text-[#8B95A1]">{c.desc}</p>
                <p
                  className="mt-2 text-[13px] leading-snug text-[#4E5968] line-clamp-2"
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
