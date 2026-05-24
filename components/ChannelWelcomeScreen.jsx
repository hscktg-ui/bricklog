"use client";

import Icon from "@/components/Icon";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import { PRIMARY_CHANNEL_OPTIONS } from "@/lib/user/userPreferences";

const HERO_CHANNEL = "blog";
const ALT_CHANNELS = PRIMARY_CHANNEL_OPTIONS.filter((c) => c.id !== HERO_CHANNEL);

export default function ChannelWelcomeScreen({
  onSelectChannel,
  onSkip,
  brandName = "",
}) {
  const hero = CHANNEL_PRODUCTS[HERO_CHANNEL];
  const brandLine = brandName?.trim()
    ? `「${brandName}」`
    : "브랜드";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#FAFBFC]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10 md:max-w-xl md:px-10 md:py-14">
        <p className="text-center text-[11px] font-medium tracking-[0.28em] text-[#8B95A1]">
          BRICLOG
        </p>

        <h1 className="mt-6 text-center text-[32px] font-bold leading-[1.15] tracking-tight text-[#191F28] md:text-[40px]">
          오늘, 무엇을
          <br />
          남길까요?
        </h1>

        <p className="mt-4 text-center text-[15px] leading-relaxed text-[#4E5968]">
          {brandLine}의 이야기부터 쓰는 게 가장 빠릅니다.
          <br className="hidden sm:inline" />
          다른 채널은 언제든 이어 붙일 수 있어요.
        </p>

        <button
          type="button"
          onClick={() => onSelectChannel(HERO_CHANNEL)}
          className="group relative mt-10 w-full rounded-2xl border border-[#E8EBED] bg-white p-6 text-left shadow-[0_8px_32px_rgba(25,31,40,0.06)] transition hover:border-[#03C75A]/50 hover:shadow-[0_12px_40px_rgba(3,199,90,0.12)] active:brightness-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#03C75A] text-white shadow-sm">
              <Icon name={hero.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#03A94D]">
                추천
              </p>
              <p className="mt-1 text-[20px] font-bold text-[#191F28]">
                {hero.menuLabel}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-[#6B7684]">
                {hero.desc}
              </p>
            </div>
            <span
              className="shrink-0 text-[#03C75A] transition group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </div>
        </button>

        <p className="mt-8 text-center text-[12px] font-medium text-[#8B95A1]">
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
                  className="flex w-full min-h-[48px] items-center gap-3 rounded-xl border border-transparent bg-white/80 px-4 py-3 text-left transition hover:border-[#E8EBED] hover:bg-white active:brightness-[0.99]"
                >
                  <Icon
                    name={meta?.icon || ch.icon}
                    className="h-5 w-5 shrink-0 text-[#8B95A1]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#191F28]">
                      {ch.label}
                    </span>
                    <span className="block text-[12px] text-[#8B95A1]">
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
            className="mt-6 w-full py-2 text-center text-[13px] font-medium text-[#8B95A1] underline-offset-2 hover:text-[#03A94D] hover:underline"
          >
            {hero.menuLabel}로 바로 시작 (선택 화면 건너뛰기)
          </button>
        ) : null}
      </div>
    </div>
  );
}
