import { EMPTY_STATE } from "@/lib/constants";
import { EMPTY_STORY } from "@/lib/product/craft";
import BlogResultView from "./BlogResultView";
import ChannelTabs from "./ChannelTabs";
import {
  HashtagResultView,
  ImageGenerativeView,
  InstaResultView,
  PlaceResultView,
} from "./ChannelResultViews";
import Icon from "./Icon";
import SkeletonPreview from "./SkeletonPreview";

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F9EF]">
        <Icon name="document" className="h-7 w-7 text-[#03C75A]" />
      </div>
      <p className="text-[15px] font-semibold text-[#191F28]">
        {EMPTY_STATE.title}
      </p>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#8B95A1]">
        {EMPTY_STATE.description || EMPTY_STORY.body}
      </p>
    </div>
  );
}

function TabContent({ activeTab, results }) {
  switch (activeTab) {
    case "blog":
      return <BlogResultView blog={results.blog} />;
    case "smartplace":
      return <PlaceResultView place={results.smartplace} />;
    case "insta":
      return <InstaResultView insta={results.insta} />;
    case "hashtag":
      return <HashtagResultView tags={results.hashtag} />;
    case "image":
    case "imagePrompt":
      return <ImageGenerativeView imagePrompt={results.imagePrompt} />;
    default:
      return null;
  }
}

export default function ResultTabs({
  activeTab,
  onTabChange,
  results,
  hasGenerated,
  isGenerating,
  onCopy,
  copyDisabled,
}) {
  const blogChars = results.blog?._meta?.charCount ?? null;

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-[#E8EBED] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:min-h-[420px] lg:min-h-0">
      <ChannelTabs
        activeTab={activeTab === "imagePrompt" ? "image" : activeTab}
        onTabChange={onTabChange}
        disabled={isGenerating}
        charCount={hasGenerated ? blogChars : null}
        blogLengthTier={
          results.blog?._meta?.blogLengthTier || "medium"
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div
          key={`${activeTab}-${hasGenerated}-${isGenerating}`}
          className="tab-panel min-h-[300px] rounded-xl bg-[#FAFBFC] p-3 ring-1 ring-[#E8EBED] md:min-h-[320px] md:p-4"
        >
          {isGenerating ? (
            <SkeletonPreview />
          ) : !hasGenerated ? (
            <EmptyState />
          ) : (
            <TabContent
              activeTab={activeTab === "imagePrompt" ? "image" : activeTab}
              results={results}
            />
          )}
        </div>
      </div>

      <div className="border-t border-[#E8EBED] p-4">
        <button
          type="button"
          onClick={onCopy}
          disabled={copyDisabled}
          className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#E8EBED] py-2.5 text-[13px] font-semibold text-[#4E5968] transition hover:bg-[#F2F4F6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="copy" className="h-4 w-4" />
          복사하기
        </button>
      </div>
    </div>
  );
}
