"use client";

import Icon from "./Icon";
import { useContentPipelineState } from "@/context/ContentContext";
import { canUsePipelineChannel } from "@/lib/billing/checkEntitlement";
import { BRICLOG_MULTICHANNEL_TEASER } from "@/lib/product/briclogPerspectiveCopy";

const ACTIONS = [
  { id: "place", label: "플레이스 소식", icon: "map", key: "place" },
  { id: "insta", label: "인스타그램 바디", icon: "camera", key: "instagram" },
  { id: "image", label: "이미지 프롬프트", icon: "image", key: "image" },
];

export default function PipelineQuickActions({
  onNavigate,
  simpleMode = false,
  billingPlanId = "free",
  onUpgradeClick,
}) {
  const {
    pipelineReady,
    generating,
    generatePlace,
    generateInstagram,
    generateImage,
    placeContent,
    instagramContent,
    imagePrompts,
  } = useContentPipelineState();

  const actions = simpleMode
    ? ACTIONS.filter((a) => a.id !== "image")
    : ACTIONS;

  if (simpleMode && placeContent && instagramContent) {
    return null;
  }

  const canPlace = canUsePipelineChannel(billingPlanId, "place");
  const canInsta = canUsePipelineChannel(billingPlanId, "instagram");

  if (!canPlace && !canInsta) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-[#03C75A]/30 bg-[#F6FDF9] p-4">
        <p className="text-[12px] font-semibold text-[#03A94D]">멀티채널 맛보기</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#4E5968]">
          {BRICLOG_MULTICHANNEL_TEASER}
        </p>
        <div className="mt-3 space-y-2 opacity-80">
          {ACTIONS.filter((a) => a.id !== "image").map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[13px] text-[#8B95A1]"
            >
              <span className="flex items-center gap-2">
                <Icon name={action.icon} className="h-4 w-4" />
                {action.label}
              </span>
              <span className="text-[10px]">플러스</span>
            </div>
          ))}
        </div>
        {onUpgradeClick ? (
          <button
            type="button"
            onClick={() => onUpgradeClick()}
            className="briclog-btn-secondary mt-3 w-full text-[12px]"
          >
            플랜 보기
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-4">
      <p className="text-[12px] font-semibold text-[#4E5968]">
        {simpleMode ? "다른 채널" : "파생 콘텐츠 생성"}
      </p>
      {!simpleMode && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#8B95A1]">
          이야기 작성 직후 플레이스·인스타는 자동 생성됐을 수 있습니다. 비어 있으면
          아래에서 다시 만드세요. 프롬프트는 「프롬프트」 메뉴에서 따로 만듭니다.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {actions.map((action) => {
          const channelAllowed =
            action.key === "place"
              ? canPlace
              : action.key === "instagram"
                ? canInsta
                : canUsePipelineChannel(billingPlanId, "image");
          if (!channelAllowed) return null;
          const ready = pipelineReady[action.key];
          const done =
            action.key === "place"
              ? !!placeContent
              : action.key === "instagram"
                ? !!instagramContent
                : !!imagePrompts;
          const busy = generating[action.key];

          return (
            <button
              key={action.id}
              type="button"
              disabled={!ready || busy}
              onClick={() => {
                if (action.key === "place") generatePlace();
                else if (action.key === "instagram") generateInstagram();
                else generateImage();
                onNavigate?.(action.id);
              }}
              className="briclog-pressable flex w-full items-center justify-between rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-left transition hover:border-[#03C75A]/40 disabled:opacity-50"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-[#191F28]">
                <Icon name={action.icon} className="h-4 w-4 text-[#03C75A]" />
                <span>{action.label}</span>
              </span>
              <span className="text-[11px] text-[#8B95A1]">
                {busy ? "생성 중…" : done ? "완료" : "생성"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
