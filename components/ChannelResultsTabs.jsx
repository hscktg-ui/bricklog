"use client";

const TABS = [
  { id: "blog", label: "블로그" },
  { id: "place", label: "스마트플레이스" },
  { id: "instagram", label: "인스타그램" },
  { id: "image", label: "이미지" },
];

export default function ChannelResultsTabs({
  activeTab,
  onTabChange,
  hasBlog,
  hasPlace,
  hasInsta,
  hasImage,
}) {
  const ready = {
    blog: hasBlog,
    place: hasPlace,
    instagram: hasInsta,
    image: hasImage,
  };

  if (!hasBlog) return null;

  return (
    <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto border-b border-[#E8EBED] pb-3 scrollbar-hide sm:flex-wrap sm:overflow-visible">
      {TABS.map((tab) => {
        const on = activeTab === tab.id;
        const ok = ready[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`tab-btn shrink-0 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition min-h-[44px] sm:min-h-0 sm:py-2 ${
              on
                ? "bg-[#03C75A] text-white"
                : ok
                  ? "bg-[#E8F9EF] text-[#03A94D] hover:bg-[#D4F5E4]"
                  : "bg-[#F7F8FA] text-[#B0B8C1]"
            }`}
          >
            <span className="inline-flex items-center">
              <span>{tab.label}</span>
              {!ok && tab.id !== "blog" && (
                <span className="ml-1 text-[10px] font-normal opacity-80">
                  대기
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
