"use client";

import { useState } from "react";
import { formatTabForCopy } from "@/lib/contentFormat";
import BlogResultView from "./BlogResultView";
import {
  InstaResultView,
  PlaceResultView,
} from "./ChannelResultViews";
import ImageWorkspace from "./workspaces/ImageWorkspace";
import Icon from "./Icon";
import HistoryFeedbackRefinePanel from "@/components/history/HistoryFeedbackRefinePanel";
import HistoryContentFeedback from "@/components/history/HistoryContentFeedback";

const HISTORY_TABS = [
  { id: "blog", label: "블로그" },
  { id: "smartplace", label: "플레이스" },
  { id: "insta", label: "인스타" },
  { id: "image", label: "이미지" },
];

export default function HistoryDetail({
  record,
  results,
  onCopy,
  userId = null,
  demoMode = false,
  onResultsChange,
  onHistoryRefresh,
  onToast,
  narrow = false,
  detailLoading = false,
}) {
  const [activeTab, setActiveTab] = useState("blog");

  if (detailLoading) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-[#E8EBED] bg-white p-6 text-center text-[13px] text-[#8B95A1]">
        <span className="briclog-spinner mr-2 h-4 w-4 border-[#E8EBED] border-t-[#03C75A]" />
        기록을 불러오는 중…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-[#E8EBED] bg-white p-6 text-center text-[13px] leading-relaxed text-[#8B95A1]">
        {narrow ? (
          <>
            목록에서 기록을 선택하면
            <br />
            생성 결과를 다시 볼 수 있어요.
          </>
        ) : (
          <>
            왼쪽 목록에서 기록을 선택하면
            <br />
            생성 결과를 다시 볼 수 있습니다.
          </>
        )}
      </div>
    );
  }

  const copyText =
    activeTab === "blog" && record.full_copy_text
      ? record.full_copy_text
      : formatTabForCopy(
          activeTab === "image" ? "image" : activeTab,
          results
        );

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-4 lg:min-h-0">
      <div className="rounded-xl border border-[#E8EBED] bg-white px-4 py-3 text-[12px] text-[#4E5968]">
        <p>
          <span className="font-semibold text-[#191F28]">목적</span>{" "}
          {record.purpose}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-[#191F28]">톤</span> {record.tone}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#E8EBED] bg-white">
        <div className="flex items-center justify-between border-b border-[#E8EBED] px-4 py-2">
          <div className="flex gap-1">
            {HISTORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                  activeTab === t.id
                    ? "bg-[#E8F9EF] text-[#03A94D]"
                    : "text-[#8B95A1] hover:bg-[#F7F8FA]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!copyText}
            onClick={() => onCopy(copyText)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-[#4E5968] hover:bg-[#F7F8FA] disabled:opacity-40"
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
            복사하기
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "blog" && (
            <BlogResultView blog={results.blog} mobileView={narrow} />
          )}
          {activeTab === "smartplace" && (
            <PlaceResultView place={results.smartplace} />
          )}
          {activeTab === "insta" && <InstaResultView insta={results.insta} />}
          {activeTab === "image" && results.imagePrompt && (
            <HistoryImageView pack={results.imagePrompt} />
          )}
          {activeTab === "image" && !results.imagePrompt && (
            <p className="text-[13px] text-[#8B95A1]">이미지 프롬프트 없음</p>
          )}
        </div>
      </div>

      <HistoryContentFeedback
        activeTab={activeTab}
        record={record}
        userId={userId}
        demoMode={demoMode}
      />

      <HistoryFeedbackRefinePanel
        activeTab={activeTab}
        record={record}
        results={results}
        userId={userId}
        demoMode={demoMode}
        onResultsChange={onResultsChange}
        onSaved={onHistoryRefresh}
        onToast={onToast}
      />
    </div>
  );
}

function HistoryImageView({ pack }) {
  const prompt =
    pack.thumbnailPrompt ||
    pack.placeImagePrompt ||
    pack.instagramCardPrompt ||
    "";
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#8B95A1]">저장된 이미지 프롬프트</p>
      <pre className="whitespace-pre-wrap rounded-lg bg-[#F7F8FA] p-4 text-[13px] text-[#191F28]">
        {prompt}
      </pre>
    </div>
  );
}
