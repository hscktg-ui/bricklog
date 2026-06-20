"use client";

import { useMemo } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

function groupByPriority(items = []) {
  const week = [];
  const month = [];
  for (const item of items) {
    if (String(item.priority || "").includes("주")) week.push(item);
    else month.push(item);
  }
  return { week, month };
}

export default function ContentPlanWorkspace({ onNavigate, onToast }) {
  const { activeBrand } = useBrandWorkspace();

  const input = useMemo(
    () => ({
      brandName: activeBrand?.brandName || "",
      region: activeBrand?.region || "",
      topic: activeBrand?.lastTopic || activeBrand?.topic || "",
      mainKeyword: activeBrand?.mainKeyword || "",
      industry: activeBrand?.industry || "",
    }),
    [activeBrand]
  );

  const plan = useMemo(() => buildContentOperatingPlan(input), [input]);
  const { week, month } = groupByPriority(plan.whatToWrite || []);

  const openChannel = (channel) => {
    const menu =
      channel === "blog"
        ? "blog"
        : channel === "place"
          ? "place"
          : channel === "instagram" || channel === "insta"
            ? "insta"
            : "blog";
    onNavigate?.(menu);
    onToast?.("주제를 확인한 뒤 글쓰기로 이어가세요.", "info");
  };

  if (!input.brandName) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className={`max-w-md px-6 py-8 text-center ${VISION_PANEL}`}>
          <p className={VISION_EYEBROW}>운영 계획</p>
          <p className={`mt-3 ${VISION_SUB}`}>
            브랜드를 선택하면 이번 달·이번 주 운영 계획이 잡힙니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper)] p-4 sm:p-6">
      <header className="mx-auto w-full max-w-3xl">
        <p className={VISION_EYEBROW}>{plan.month}</p>
        <h1 className="mt-2 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink)]">
          콘텐츠 스케줄
        </h1>
        <p className={`mt-3 ${VISION_SUB}`}>
          {input.brandName}
          {input.region ? ` · ${input.region}` : ""} — 브랜드와 습관에 맞춰 주제·채널 리듬을
          잡습니다.
        </p>
      </header>

      <div className="mx-auto mt-8 grid w-full max-w-3xl gap-5">
        <section className={`${VISION_PANEL} p-5 sm:p-6`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-accent-deep,#03a94d)]">
            이번 주
          </p>
          <ul className="mt-4 space-y-3">
            {week.length ? (
              week.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[var(--vision-ink)]">{item.topic}</p>
                    <p className="mt-1 text-[13px] text-[var(--vision-muted)]">
                      {CHANNEL_LABEL[item.channel] || item.channel} · {item.priority}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openChannel(item.channel)}
                    className={`${VISION_CTA_ACCENT} !min-h-[44px] !w-full sm:!w-auto !px-5 !text-[13px]`}
                  >
                    글쓰기
                  </button>
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-dashed border-[var(--vision-line)] p-4 text-[14px] text-[var(--vision-muted)]">
                주제 한 줄을 입력하면 이번 주 블로그 주제가 여기에 잡힙니다.
              </li>
            )}
          </ul>
        </section>

        <section className={`${VISION_PANEL} p-5 sm:p-6`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
            이번 달
          </p>
          <ul className="mt-4 space-y-3">
            {month.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-paper)] px-4 py-3.5"
              >
                <p className="font-medium text-[var(--vision-ink)]">{item.topic}</p>
                <p className="mt-1 text-[12px] text-[var(--vision-muted)]">
                  {CHANNEL_LABEL[item.channel] || item.channel} · {item.priority}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {plan.researchMustKnow?.length ? (
          <section className={`${VISION_PANEL} p-5 sm:p-6`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
              조사 체크
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {plan.researchMustKnow.slice(0, 6).map((line) => (
                <li
                  key={line}
                  className="rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3 py-1.5 text-[12px] font-medium text-[var(--vision-ink)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {plan.whyWrite?.length ? (
          <section className="rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] p-5">
            <p className="text-[13px] font-semibold text-[var(--vision-ink)]">왜 쓰는지</p>
            <ul className="mt-3 space-y-2">
              {plan.whyWrite.slice(0, 2).map((w) => (
                <li key={w.topic} className="text-[14px] leading-relaxed text-[var(--vision-muted)]">
                  <span className="font-medium text-[var(--vision-ink)]">{w.topic}</span>
                  {" — "}
                  {w.reason}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
