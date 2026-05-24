"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { itemsFromBrandArchive } from "@/lib/growth/brandArchiveHistory";
import { mergeDraftHistoryItems } from "@/lib/growth/mergeDraftHistoryItems";
import { REVIEW_DRAFT_SAVED_EVENT } from "@/lib/review/persistReviewDraft";

const CHANNEL_LABEL = {
  blog: "블로그",
  place: "플레이스",
  instagram: "인스타",
};

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * 브랜드 작업실 「저장한 글」과 동일 소스 — 검수·개선본이 쌓였는지 확인
 */
export default function BrandDraftHistoryStrip({
  brandId,
  brandName = "",
  contentArchive = null,
  refreshKey = 0,
  onOpenBrandWorkspace,
  filterChannel = "",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!brandId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ brandId });
      if (filterChannel) q.set("channel", filterChannel);
      const data = await fetchWithAuth(`/api/memory/content?${q}`);
      const memoryList = data.items || [];
      const archiveList = itemsFromBrandArchive(contentArchive, {
        brandId,
        channelFilter: filterChannel,
      });
      const list = mergeDraftHistoryItems(memoryList, archiveList);
      setItems(list.slice(0, 8));
    } catch {
      const fallback = itemsFromBrandArchive(contentArchive, {
        brandId,
        channelFilter: filterChannel,
      });
      setItems(fallback.slice(0, 8));
    } finally {
      setLoading(false);
    }
  }, [brandId, contentArchive, filterChannel]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const onSaved = (e) => {
      if (!brandId || e.detail?.brandId === brandId) load();
    };
    window.addEventListener(REVIEW_DRAFT_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(REVIEW_DRAFT_SAVED_EVENT, onSaved);
  }, [brandId, load]);

  if (!brandId) {
    return (
      <p className="text-[12px] text-[#8B95A1]">
        사이드바에서 브랜드를 선택하면 초안이 이 브랜드 작업실에 쌓입니다.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-bold text-[#191F28]">브랜드 초안 기록</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#8B95A1]">
            {brandName ? `${brandName} · ` : ""}
            검수·개선·보완한 글이 브랜드 작업실 「저장한 글」에 함께 남습니다.
          </p>
        </div>
        {onOpenBrandWorkspace && (
          <button
            type="button"
            onClick={onOpenBrandWorkspace}
            className="shrink-0 rounded-lg border border-[#03C75A]/40 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#03A94D] hover:bg-[#F0FFF5]"
          >
            작업실에서 보기
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-[12px] text-[#8B95A1]">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-[12px] text-[#8B95A1]">
          아직 기록이 없습니다. 「개선하기」를 실행하면 여기와 작업실에 저장됩니다.
        </p>
      ) : (
        <ul className="mt-3 max-h-[200px] space-y-2 overflow-y-auto">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#191F28] line-clamp-1">
                  {it.title || "초안"}
                </span>
                <span className="shrink-0 text-[10px] text-[#03A94D]">
                  {CHANNEL_LABEL[it.channel] || it.channel}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-[#8B95A1]">
                {formatWhen(it.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
