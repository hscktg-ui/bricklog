"use client";

import Icon from "@/components/Icon";
import HistoryList from "@/components/HistoryList";
import HistoryDetail from "@/components/HistoryDetail";
import { useNarrowWorkspace } from "@/hooks/useNarrowWorkspace";

/**
 * 초안 기록 — 모바일: 목록 ↔ 상세 전환, PC·태블릿: 2열
 */
export default function HistoryWorkspace({
  records,
  loading,
  selectedId,
  onSelectId,
  selectedRecord,
  results,
  onCopy,
  userId,
  demoMode,
  onResultsChange,
  onHistoryRefresh,
  onToast,
}) {
  const { narrow } = useNarrowWorkspace();
  const mobileDetail = narrow && selectedId;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:flex-row md:gap-5 md:p-6">
      {(!narrow || !mobileDetail) && (
        <section className="flex min-h-0 w-full shrink-0 flex-col md:w-[300px]">
          <div className="mb-4 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F6B66]">
              Library
            </p>
            <h2 className="mt-1.5 text-[clamp(1.2rem,2.5vw,1.5rem)] font-semibold tracking-[-0.03em] text-[#111111]">
              재사용할 초안 자산
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#5F6B66]">
              {narrow && !selectedId
                ? "항목을 누르면 전체 결과를 볼 수 있어요."
                : "파일 캐비닛이 아니라, 다시 쓰고 다듬을 수 있는 자산 목록입니다."}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto md:max-h-none">
            <HistoryList
              records={records}
              loading={loading}
              selectedId={selectedId}
              onSelect={onSelectId}
              demoMode={demoMode}
            />
          </div>
        </section>
      )}

      {(!narrow || mobileDetail) && (
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {mobileDetail && (
            <button
              type="button"
              onClick={() => onSelectId(null)}
              className="mb-3 flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-[#E7ECE8] bg-white px-4 py-2 text-[13px] font-semibold text-[#4F5A56] hover:bg-[#F7F8F7] md:hidden"
            >
              <Icon name="chevron-left" className="h-4 w-4 shrink-0" />
              목록으로
            </button>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <HistoryDetail
              record={selectedRecord}
              results={results}
              onCopy={onCopy}
              userId={userId}
              demoMode={demoMode}
              onResultsChange={onResultsChange}
              onHistoryRefresh={onHistoryRefresh}
              onToast={onToast}
              narrow={narrow}
              detailLoading={Boolean(selectedId && !selectedRecord)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
