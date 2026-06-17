"use client";

import { getBriclogNextPublicPitch } from "@/lib/product/briclogNext";
import { BriclogNextPitchGrid } from "@/components/BriclogNextPanel";
import { VISION_EYEBROW, VISION_SECTION } from "@/lib/landing/vision2030Styles";

export default function BriclogNextSection() {
  const pitch = getBriclogNextPublicPitch();

  return (
    <section
      id="briclog-next"
      className={`${VISION_SECTION} scroll-mt-20 px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>{pitch.eyebrow}</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
          {pitch.headline}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[16px] leading-relaxed text-[var(--vision-muted)]">
          {pitch.sub}
        </p>
        <BriclogNextPitchGrid className="mt-12" />
      </div>
    </section>
  );
}
