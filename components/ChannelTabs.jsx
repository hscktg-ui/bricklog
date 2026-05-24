import {
  BLOG_MIN_BODY_CHARS,
  RESULT_TABS,
  resolveBlogLengthTier,
} from "@/lib/constants";
import Icon from "./Icon";

export default function ChannelTabs({
  activeTab,
  onTabChange,
  disabled = false,
  charCount,
  channelReady = {},
}) {
  return (
    <div className="shrink-0 border-b border-[#E8EBED] bg-white px-3 py-2 md:px-5">
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
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${
                active
                  ? "bg-[#03C75A] text-white shadow-sm"
                  : "text-[#4E5968] hover:bg-[#F2F4F6]"
              }`}
            >
              <Icon
                name={tab.icon}
                className={`h-4 w-4 ${active ? "text-white" : "text-[#8B95A1]"}`}
              />
              {tab.label}
              {ready && !active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#03C75A]" />
              )}
            </button>
          );
        })}
        {activeTab === "blog" && charCount != null && (
          <span
            className={`ml-auto hidden shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold sm:inline ${
              charCount >= BLOG_MIN_BODY_CHARS
                ? "bg-[#E8F9EF] text-[#03A94D]"
                : "bg-[#FFF4E6] text-[#E67700]"
            }`}
          >
            {charCount.toLocaleString()}자
            {charCount < BLOG_MIN_BODY_CHARS &&
              ` · 목표 ${resolveBlogLengthTier("medium").target.toLocaleString()}자+`}
          </span>
        )}
      </div>
    </div>
  );
}
