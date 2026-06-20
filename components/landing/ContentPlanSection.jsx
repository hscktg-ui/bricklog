"use client";

import { CONTENT_PLAN_DEMO } from "@/lib/landing/contentPlanDemo";
import {
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SECTION,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";

export default function ContentPlanSection() {
  const demo = CONTENT_PLAN_DEMO;

  return (
    <section className={`${VISION_SECTION} px-5 py-16 md:px-8 md:py-24`}>
      <div className="mx-auto max-w-5xl">
        <p className={`${VISION_EYEBROW} text-center`}>운영 계획</p>
        <h2 className="mt-3 text-center text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          이번 달·이번 주,
          <span className="block text-[var(--vision-muted)]">무엇을 쓸지 먼저 잡습니다</span>
        </h2>
        <p className={`mx-auto mt-4 max-w-2xl text-center ${VISION_SUB}`}>
          브랜드·지역·습관에 맞춰 주제와 채널 리듬을 정리합니다. 글 하나가 아니라 운영이
          쌓입니다.
        </p>

        <div className={`mt-12 overflow-hidden ${VISION_PANEL}`}>
          <LandingPanelHeader title={`${demo.month} · ${demo.brand}`} />

          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-[var(--vision-line)] p-6 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-accent-deep,#03a94d)]">
                주별 플랜
              </p>
              <ul className="mt-5 space-y-3">
                {demo.weeks.map((w) => (
                  <li
                    key={w.id}
                    className={`rounded-2xl border px-4 py-3.5 transition ${
                      w.status === "current"
                        ? "border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))]"
                        : "border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-bold tabular-nums text-[var(--vision-muted)]">
                        {w.label}
                      </span>
                      {w.status === "current" ? (
                        <span className="rounded-full bg-[var(--vision-accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                          이번 주
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-semibold tracking-tight text-[var(--vision-ink)]">
                      {w.focus}
                    </p>
                    <p className="mt-2 text-[12px] text-[var(--vision-muted)]">
                      {w.channels.join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--vision-paper)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-muted)]">
                브랜드 리듬
              </p>
              <p className="mt-4 text-[17px] font-semibold leading-snug text-[var(--vision-ink)]">
                {demo.headline}
              </p>
              <ul className="mt-6 space-y-2.5">
                {demo.habits.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2 text-[14px] text-[var(--vision-muted)]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--vision-accent)]" />
                    {h}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[13px] leading-relaxed text-[var(--vision-muted)]">
                가입 후 작업실에서 브랜드·지역·업종에 맞는 월·주 계획이 자동으로 갱신됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
