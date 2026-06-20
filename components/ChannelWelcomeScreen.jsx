"use client";

import Icon from "@/components/Icon";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import { PRIMARY_CHANNEL_OPTIONS } from "@/lib/user/userPreferences";
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_GLASS_CARD,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

const HERO_CHANNEL = "blog";
const ALT_CHANNELS = PRIMARY_CHANNEL_OPTIONS.filter((c) => c.id !== HERO_CHANNEL);

export default function ChannelWelcomeScreen({
  onSelectChannel,
  onSkip,
  brandName = "",
}) {
  const hero = CHANNEL_PRODUCTS[HERO_CHANNEL];
  const plan = CHANNEL_PRODUCTS.plan;
  const brandLine = brandName?.trim() ? `「${brandName}」` : "브랜드";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--vision-paper)]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10 md:max-w-xl md:px-10 md:py-14">
        <p className={`text-center ${VISION_EYEBROW}`}>BRICLOG</p>

        <h1 className="mt-6 text-center text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--vision-ink)]">
          오늘, 무엇을
          <br />
          남길까요?
        </h1>

        <p className={`mt-4 text-center ${VISION_SUB}`}>
          {brandLine}의 이야기부터 쓰는 게 가장 빠릅니다.
          <br className="hidden sm:inline" />
          운영 계획에서 이번 주·이번 달 주제도 먼저 잡을 수 있어요.
        </p>

        <button
          type="button"
          onClick={() => onSelectChannel(HERO_CHANNEL)}
          className={`group relative mt-10 w-full p-6 text-left transition hover:shadow-[var(--vision-shadow-panel)] active:scale-[0.995] ${VISION_PANEL}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--vision-accent)] text-white shadow-[0_8px_24px_rgba(3,199,90,0.28)]">
              <Icon name={hero.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vision-accent-deep,#03a94d)]">
                추천
              </p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--vision-ink)]">
                {hero.menuLabel}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-[var(--vision-muted)]">
                {hero.desc}
              </p>
            </div>
            <span
              className="shrink-0 text-[var(--vision-accent)] transition group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectChannel("plan")}
          className={`mt-3 w-full px-5 py-4 text-left transition hover:brightness-[1.02] ${VISION_GLASS_CARD}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--vision-accent-soft,rgba(3,199,90,0.12))]">
              <Icon name={plan.icon} className="h-5 w-5 text-[var(--vision-accent-deep,#03a94d)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--vision-ink)]">
                {plan.menuLabel} 먼저
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--vision-muted)]">
                이번 주·이번 달 주제와 채널 리듬
              </p>
            </div>
          </div>
        </button>

        <p className="mt-8 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-muted)]">
          다른 채널로 시작
        </p>

        <ul className="mt-3 space-y-2">
          {ALT_CHANNELS.map((ch) => {
            const meta = CHANNEL_PRODUCTS[ch.id];
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => onSelectChannel(ch.id)}
                  className="flex w-full min-h-[48px] items-center gap-3 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-4 py-3 text-left transition hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.25))] active:scale-[0.995]"
                >
                  <Icon
                    name={meta?.icon || ch.icon}
                    className="h-5 w-5 shrink-0 text-[var(--vision-muted)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[var(--vision-ink)]">
                      {ch.label}
                    </span>
                    <span className="block text-[12px] text-[var(--vision-muted)]">
                      {meta?.desc || ch.desc}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className={`mt-6 w-full min-h-[48px] py-2 ${VISION_CTA_ACCENT}`}
          >
            {hero.menuLabel}로 바로 시작
          </button>
        ) : null}
      </div>
    </div>
  );
}
