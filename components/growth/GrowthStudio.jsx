"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { trackContentEvent } from "@/lib/feedback/trackEvent";
import { itemsFromBrandArchive } from "@/lib/growth/brandArchiveHistory";
import { mergeDraftHistoryItems } from "@/lib/growth/mergeDraftHistoryItems";
import { REVIEW_DRAFT_SAVED_EVENT } from "@/lib/review/persistReviewDraft";
import { normalizePlanId } from "@/lib/billing/plans";
import BrandMemoryPanel from "@/components/BrandMemoryPanel";

const TABS = [
  { id: "history", label: "저장한 글" },
  { id: "habits", label: "톤·습관" },
  { id: "topics", label: "추천 주제" },
];

const CHANNELS = [
  { id: "", label: "전체" },
  { id: "blog", label: "블로그" },
  { id: "place", label: "플레이스" },
  { id: "instagram", label: "인스타" },
];

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[13px] text-[#191F28] focus:border-[#03C75A] focus:outline-none";

export default function GrowthStudio({
  userId,
  brandId,
  brandName = "",
  contentArchive = null,
  billingPlanId = "free",
  onCopy,
  onToast,
  onUpgradeClick,
  onOpenInWorkspace,
}) {
  const [tab, setTab] = useState("history");
  const [channelFilter, setChannelFilter] = useState("");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [memoryReady, setMemoryReady] = useState(true);
  const [usingArchiveFallback, setUsingArchiveFallback] = useState(false);

  const [perfForm, setPerfForm] = useState({
    views: 0,
    clicks: 0,
    inquiries: 0,
    saves: 0,
    comments: 0,
    phone: 0,
    reservations: 0,
    reaction: "good",
    memo: "",
  });
  const [perfSaved, setPerfSaved] = useState(null);

  const [topics, setTopics] = useState(null);
  const [topicsLockedMessage, setTopicsLockedMessage] = useState(null);
  const [brandLearning, setBrandLearning] = useState(null);
  const [learningLoading, setLearningLoading] = useState(false);

  const notify = useCallback(
    (msg, type = "info") => onToast?.(msg, type),
    [onToast]
  );

  const visibleTabs = TABS.filter(
    (t) => t.id !== "topics" || normalizePlanId(billingPlanId) === "studio"
  );

  useEffect(() => {
    if (tab === "topics" && !visibleTabs.some((t) => t.id === "topics")) {
      setTab("history");
    }
  }, [tab, visibleTabs]);

  const loadItems = useCallback(async () => {
    if (!brandId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ brandId });
      if (channelFilter) q.set("channel", channelFilter);
      const data = await fetchWithAuth(`/api/memory/content?${q}`);
      const list = data.items || [];
      const archiveFallback = itemsFromBrandArchive(contentArchive, {
        brandId,
        channelFilter,
      });
      const merged = mergeDraftHistoryItems(list, archiveFallback);
      setItems(merged);
      setMemoryReady(data.memoryReady !== false && list.length > 0);
      setUsingArchiveFallback(
        merged.length > 0 && list.length === 0 && archiveFallback.length > 0
      );
    } catch {
      setMemoryReady(false);
      const fallback = itemsFromBrandArchive(contentArchive, {
        brandId,
        channelFilter,
      });
      setItems(fallback);
      setUsingArchiveFallback(fallback.length > 0);
    } finally {
      setLoading(false);
    }
  }, [brandId, channelFilter, contentArchive, notify]);

  const loadDetail = useCallback(
    async (id) => {
      if (!id) {
        setDetail(null);
        setVersions([]);
        return;
      }
      const archived = items.find((i) => i.id === id);
      if (archived?._fromBrandArchive) {
        setDetail(archived);
        setVersions([]);
        setSelectedId(id);
        setPerfSaved(null);
        return;
      }
      try {
        const data = await fetchWithAuth(`/api/memory/content/${id}`);
        setDetail(data.item);
        setVersions(data.versions || []);
        setSelectedId(id);
        const perf = await fetchWithAuth(
          `/api/memory/performance?contentItemId=${id}`
        );
        setPerfSaved(perf.performance);
        if (perf.performance) {
          setPerfForm({
            views: perf.performance.views || 0,
            clicks: perf.performance.clicks || 0,
            inquiries: perf.performance.inquiries || 0,
            saves: perf.performance.saves || 0,
            comments: perf.performance.comments || 0,
            phone: perf.performance.phone || 0,
            reservations: perf.performance.reservations || 0,
            reaction: perf.performance.reaction || "good",
            memo: perf.performance.memo || "",
          });
        }
      } catch (err) {
        notify(err.message, "error");
      }
    },
    [items, notify]
  );

  const loadTopics = useCallback(async () => {
    if (!brandId) return;
    setTopicsLockedMessage(null);
    try {
      const data = await fetchWithAuth(
        `/api/memory/topics?brandId=${encodeURIComponent(brandId)}`
      );
      const payload = data.topics;
      const hasTopics =
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        (payload.week?.length > 0 || payload.month?.length > 0);
      if (!hasTopics && data.userMessage) {
        setTopics(null);
        setTopicsLockedMessage(data.userMessage);
        return;
      }
      setTopics(hasTopics ? payload : null);
      if (!hasTopics) {
        setTopicsLockedMessage(
          data.userMessage ||
            "주제 추천은 하이엔드(스튜디오) 플랜에서 이용할 수 있습니다."
        );
      }
    } catch (err) {
      setTopics(null);
      setTopicsLockedMessage(err.message);
      notify(err.message, "error");
    }
  }, [brandId, notify]);

  const loadBrandLearning = useCallback(async () => {
    if (!brandId) {
      setBrandLearning(null);
      return;
    }
    setLearningLoading(true);
    try {
      const data = await fetchWithAuth(
        `/api/memory/brand-learning?brandId=${encodeURIComponent(brandId)}`
      );
      setBrandLearning(data);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setLearningLoading(false);
    }
  }, [brandId, notify]);

  useEffect(() => {
    if (tab === "history") loadItems();
    if (tab === "topics") loadTopics();
    if (tab === "habits") loadBrandLearning();
  }, [tab, loadItems, loadTopics, loadBrandLearning]);

  useEffect(() => {
    if (tab === "history") loadItems();
  }, [channelFilter, tab, loadItems]);

  useEffect(() => {
    const onReviewSaved = () => {
      if (tab === "history") loadItems();
    };
    window.addEventListener(REVIEW_DRAFT_SAVED_EVENT, onReviewSaved);
    return () => window.removeEventListener(REVIEW_DRAFT_SAVED_EVENT, onReviewSaved);
  }, [tab, loadItems]);

  const handleDeleteItem = async (id) => {
    if (String(id).startsWith("archive-")) {
      notify("브랜드에 쌓인 초안은 여기서 삭제할 수 없습니다.", "info");
      return;
    }
    if (!window.confirm("이 저장 글을 삭제할까요?")) return;
    try {
      await fetchWithAuth(`/api/memory/content/${id}`, { method: "DELETE" });
      trackContentEvent({
        eventType: "delete",
        brandId,
        contentItemId: id,
        channel: detail?.channel || channelFilter || "",
      });
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
      loadItems();
      notify("삭제되었습니다.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const handleRestore = async (versionId) => {
    if (!selectedId) return;
    try {
      const data = await fetchWithAuth(
        `/api/memory/content/${selectedId}/restore`,
        {
          method: "POST",
          body: JSON.stringify({ versionId }),
        }
      );
      setDetail(data.item);
      loadDetail(selectedId);
      notify("이전 버전으로 복원했습니다.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const savePerformance = async () => {
    if (!selectedId) {
      notify("저장한 글 탭에서 항목을 선택해 주세요.", "info");
      return;
    }
    try {
      const data = await fetchWithAuth("/api/memory/performance", {
        method: "POST",
        body: JSON.stringify({ contentItemId: selectedId, ...perfForm }),
      });
      setPerfSaved(data.performance);
      notify("성과 피드백이 저장되었습니다.", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  };

  if (!userId) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-[18px] font-bold text-[#191F28]">브랜드 작업실</h2>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          {brandName
            ? `${brandName} — 톤·습관 학습용입니다. 지난 초안은 사이드바 「초안 기록」에서도 볼 수 있어요.`
            : "사이드바에서 브랜드를 선택해 주세요."}
        </p>
        {usingArchiveFallback && (
          <p className="mt-2 rounded-lg bg-[#F7F8FA] px-3 py-2 text-[12px] text-[#4E5968]">
            이 브랜드에 쌓인 최근 초안만 보여 드립니다. 서버에 상세 기록이 연결되면
            버전·검색까지 이어집니다.
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#E8EBED] pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium ${
              tab === t.id
                ? "bg-[#03C75A] text-white"
                : "text-[#4E5968] hover:bg-[#F0F2F5]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {tab === "history" && (
          <div className="flex min-h-0 flex-col gap-4 md:flex-row">
            <section className="md:w-[280px] shrink-0 space-y-3">
              <select
                className={fieldClass}
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                {CHANNELS.map((c) => (
                  <option key={c.id || "all"} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              {loading && (
                <p className="text-[12px] text-[#8B95A1]">불러오는 중...</p>
              )}
              <ul className="space-y-2">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => loadDetail(it.id)}
                      className={`w-full rounded-lg border p-3 text-left text-[12px] ${
                        selectedId === it.id
                          ? "border-[#03C75A] bg-[#F0FFF5]"
                          : "border-[#E8EBED] bg-white"
                      }`}
                    >
                      <span className="font-semibold text-[#191F28]">
                        {it.title || "(제목 없음)"}
                      </span>
                      <p className="mt-1 text-[#8B95A1]">
                        {it.channel} ·{" "}
                        {new Date(it.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </button>
                  </li>
                ))}
                {!loading && items.length === 0 && (
                  <p className="text-[12px] text-[#8B95A1]">
                    저장된 콘텐츠가 없습니다. 블로그·플레이스·인스타를 생성하면
                    자동으로 기록됩니다.
                  </p>
                )}
              </ul>
            </section>
            <section className="min-w-0 flex-1 rounded-xl border border-[#E8EBED] bg-white p-4">
              {!detail ? (
                <p className="text-[13px] text-[#8B95A1]">
                  왼쪽에서 항목을 선택하세요.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[15px] font-bold">{detail.title}</h3>
                    <div className="flex gap-2">
                      {onOpenInWorkspace && detail.channel !== "image" ? (
                        <button
                          type="button"
                          className="rounded-lg border border-[#03C75A]/40 bg-[#F0FFF5] px-3 py-1 text-[12px] font-semibold text-[#03A94D]"
                          onClick={() => {
                            if (onOpenInWorkspace(detail)) {
                              notify("작업실에 불러왔어요", "success");
                            }
                          }}
                        >
                          작업실에서 열기
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg border border-[#E8EBED] px-3 py-1 text-[12px]"
                        onClick={() => {
                          onCopy?.(detail.full_content);
                          trackContentEvent({
                            eventType: "copy_all",
                            brandId,
                            contentItemId: detail.id,
                            channel: detail.channel,
                          });
                        }}
                      >
                        복사하기
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-3 py-1 text-[12px] text-red-600"
                        onClick={() => handleDeleteItem(detail.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <pre className="mt-3 max-h-[320px] overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-[#4E5968]">
                    {detail.full_content}
                  </pre>
                  {versions.length > 0 && (
                    <div className="mt-4 border-t border-[#E8EBED] pt-3">
                      <p className="text-[12px] font-semibold text-[#4E5968]">
                        버전 기록
                      </p>
                      <ul className="mt-2 space-y-1">
                        {versions.map((v) => (
                          <li
                            key={v.id}
                            className="flex items-center justify-between text-[11px] text-[#8B95A1]"
                          >
                            <span>
                              v{v.version_number} · {v.source} ·{" "}
                              {new Date(v.created_at).toLocaleString("ko-KR")}
                            </span>
                            <button
                              type="button"
                              className="text-[#03C75A] hover:underline"
                              onClick={() => handleRestore(v.id)}
                            >
                              복원
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {tab === "habits" && (
          <div className="max-w-xl space-y-4">
            <p className="text-[12px] text-[#8B95A1]">
              이 브랜드(프로젝트)에만 적용되는 피드백·생성 흔적입니다. 다른
              브랜드와 섞이지 않습니다.
            </p>
            {learningLoading && (
              <p className="text-[12px] text-[#8B95A1]">불러오는 중…</p>
            )}
            {brandLearning?.brief ? (
              <div className="rounded-xl border border-[#E8EBED] bg-white p-4 text-[13px] text-[#4E5968]">
                <p className="font-bold text-[#191F28]">생성에 반영 중</p>
                <p className="mt-2">{brandLearning.brief}</p>
              </div>
            ) : (
              !learningLoading && (
                <p className="text-[12px] text-[#8B95A1]">
                  아직 학습 데이터가 없습니다. 글 생성 후 피드백을 남기면
                  표시됩니다.
                </p>
              )
            )}
            {brandLearning?.profile?.recentContentSummaries?.length > 0 && (
              <div>
                <p className="text-[13px] font-bold text-[#191F28]">
                  최근 글 톤 (동결로 준비)
                </p>
                <ul className="mt-2 space-y-2">
                  {brandLearning.profile.recentContentSummaries.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px]"
                    >
                      <span className="font-semibold text-[#03A94D]">
                        {s.channel}
                      </span>{" "}
                      {s.title || "(제목 없음)"}
                      <p className="mt-1 text-[#8B95A1]">{s.excerpt}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {brandLearning?.profile?.styleFingerprint && (
              <p className="text-[12px] text-[#4E5968]">
                문장: {brandLearning.profile.styleFingerprint.sentenceLengthBand}{" "}
                · 이모지: {brandLearning.profile.styleFingerprint.emojiDensity}
              </p>
            )}
            <BrandMemoryPanel embedded defaultOpen />
          </div>
        )}

        {tab === "topics" && (
          <div className="space-y-4">
            {topicsLockedMessage ? (
              <div className="rounded-xl border border-[#E8EBED] bg-[#F7F8FA] px-4 py-4 text-[12px] leading-relaxed text-[#4E5968]">
                <p className="font-semibold text-[#191F28]">추천 주제 · 스튜디오 전용</p>
                <p className="mt-2">{topicsLockedMessage}</p>
                {billingPlanId !== "studio" && onUpgradeClick ? (
                  <button
                    type="button"
                    onClick={onUpgradeClick}
                    className="mt-3 text-[12px] font-semibold text-[#03A94D] hover:underline"
                  >
                    스튜디오(하이엔드) 플랜 보기
                  </button>
                ) : null}
              </div>
            ) : !topics ? (
              <p className="text-[12px] text-[#8B95A1]">주제를 불러오는 중...</p>
            ) : (
              <>
                <p className="text-[12px] text-[#8B95A1]">
                  {topics.season} 시즌 기준 추천
                </p>
                <div>
                  <h4 className="text-[13px] font-bold">이번 주</h4>
                  <ul className="mt-2 space-y-1">
                    {topics.week?.map((w, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-white px-3 py-2 text-[12px] border border-[#E8EBED]"
                      >
                        {w.topic}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold">이번 달</h4>
                  <ul className="mt-2 space-y-1">
                    {topics.month?.slice(0, 8).map((w, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-white px-3 py-2 text-[12px] border border-[#E8EBED]"
                      >
                        {w.topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
