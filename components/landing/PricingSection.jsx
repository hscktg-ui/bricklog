"use client";

import PlanComparison from "@/components/billing/PlanComparison";
import {
  LANDING_CTA_FOOTNOTE,
  LANDING_PRICING_INTRO,
  LANDING_PRICING_SUB,
} from "@/lib/landing/ctaCopy";
import {
  VISION_CTA_PRIMARY,
  VISION_EYEBROW,
  VISION_SECTION,
} from "@/lib/landing/vision2030Styles";

export default function PricingSection({ onStart }) {
  return (
    <section
      id="pricing"
      className={`${VISION_SECTION} px-5 py-16 md:px-8 md:py-24`}
    >
      <div className="mx-auto max-w-6xl">
        <p className={`${VISION_EYEBROW} text-center`}>Pricing</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
          {LANDING_PRICING_INTRO}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[16px] leading-relaxed text-[var(--vision-muted)]">
          {LANDING_PRICING_SUB}
        </p>

        <div className="mt-12">
          <PlanComparison variant="landing" onStart={onStart} paymentNote="" />
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onStart}
            className={`${VISION_CTA_PRIMARY} min-h-[48px] px-10`}
          >
            무료로 운영 시작
          </button>
          <p className="mt-4 text-[13px] text-[var(--vision-muted)]">
            {LANDING_CTA_FOOTNOTE}
          </p>
        </div>
      </div>
    </section>
  );
}
