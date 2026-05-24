"use client";

import Icon from "@/components/Icon";
import { getPlanDefinition } from "@/lib/billing/plans";

export default function StudioAdvancedAuditNote({ planId = "free" }) {
  const plan = getPlanDefinition(planId);
  if (!plan.advancedAudit) return null;

  return (
    <div
      className="mb-3 flex gap-2 rounded-xl border border-[#B8EBD0] bg-[#F0FFF5] px-3 py-2.5 text-[12px] leading-relaxed text-[#4E5968]"
      role="status"
    >
      <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-[#03A94D]" />
      <div>
        <p className="font-semibold text-[#191F28]">스튜디오 · 발행 전 꼼꼼 점검</p>
        <p className="mt-0.5">
          검수·품질 패널은 스튜디오 전용입니다. 발행 전 표현·구조를 한 번 더 확인해
          주세요.
        </p>
      </div>
    </div>
  );
}
