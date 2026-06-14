import {
  BLOG_LENGTH_TIER_OPTIONS,
  getBlogLengthTierLabel,
  resolveBlogLengthTier,
  RESULT_TABS,
} from "@/lib/constants";
import {
  VISION_TAB_ACTIVE,
  VISION_TAB_IDLE,
} from "@/lib/landing/vision2030Styles";
import Icon from "./Icon";

export default function ChannelTabs({
  activeTab,
  onTabChange,
  disabled = false,
  charCount,
  blogLengthTier = "medium",
  channelReady = {},
}) {
  const tier = resolveBlogLengthTier(blogLengthTier);
  const inBand =
    charCount != null && charCount >= tier.min && charCount <= tier.max;

  return (
    <div className="shrink-0 border-b border-[var(--vision-line)] bg-[var(--vision-glass-strong)] px-3 py-2 backdrop-blur-xl md:px-5">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {RESULT_TABS.map((tab) => {
          const active = activeTab === tab.id;
          const ready = channelReady[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              disabled={disabled}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${
                active ? VISION_TAB_ACTIVE : VISION_TAB_IDLE
              }`}
            >
              <Icon
                name={tab.icon}
                className={`h-4 w-4 ${active ? "text-white" : "text-[var(--vision-muted)]"}`}
              />
              {tab.label}
              {ready && !active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--vision-accent)]" />
              )}
            </button>
          );
        })}
        {activeTab === "blog" && charCount != null && (
          <span
            className={`ml-auto hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${
              inBand
                ? "bg-[rgba(48,209,88,0.12)] text-[var(--vision-ink)]"
                : "bg-white/70 text-[var(--vision-muted)] ring-1 ring-[var(--vision-line)]"
            }`}
            title={
              BLOG_LENGTH_TIER_OPTIONS.find((o) => o.value === blogLengthTier)
                ?.hint || ""
            }
          >
            {getBlogLengthTierLabel(blogLengthTier)} ·{" "}
            {charCount.toLocaleString()}자
          </span>
        )}
      </div>
    </div>
  );
}
