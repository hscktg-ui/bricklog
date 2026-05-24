"use client";

import PlanComparison from "@/components/billing/PlanComparison";
import { BRICLOG_CTA_PILL } from "@/lib/ui/actionButtonStyles";
import {
  LANDING_CTA_FOOTNOTE,
  LANDING_PRICING_INTRO,
  LANDING_PRICING_SUB,
} from "@/lib/landing/ctaCopy";

export default function PricingSection({ onStart }) {
  return (
    <section
      id="pricing"
      className="border-t border-[#E8EBED] bg-white px-4 py-16 md:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[11px] font-bold uppercase tracking-wider text-[#03A94D]">
          요금제
        </p>
        <h2 className="mt-2 text-center text-[22px] font-bold text-[#191F28] md:text-[26px]">
          {LANDING_PRICING_INTRO}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[14px] leading-relaxed text-[#4E5968]">
          {LANDING_PRICING_SUB}
        </p>

        <div className="mt-10">
          <PlanComparison variant="landing" onStart={onStart} paymentNote="" />
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={onStart}
            className={`${BRICLOG_CTA_PILL} min-h-[44px] px-10 text-[15px]`}
          >
            무료로 운영 시작
          </button>
          <p className="mt-4 text-[12px] text-[#8B95A1]">{LANDING_CTA_FOOTNOTE}</p>
        </div>
      </div>
    </section>
  );
}
