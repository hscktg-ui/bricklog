"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { auditPastedDraft } from "@/lib/review/auditPastedDraft";
import {
  PASTE_REVIEW_CHANNELS,
  buildPasteReviewText,
  getPasteReviewChannel,
} from "@/lib/review/pasteChannelConfig";
import { generateQuickHooks } from "@/lib/hooks/quickHookLab";
import { resolveBlogLengthTier } from "@/lib/constants";
import FullCopyButton from "@/components/FullCopyButton";
import { persistReviewDraft } from "@/lib/review/persistReviewDraft";
import BrandDraftHistoryStrip from "@/components/review/BrandDraftHistoryStrip";
import PasteReviewGuide from "@/components/review/PasteReviewGuide";
import { useSimpleWorkspaceMode } from "@/hooks/useSimpleWorkspaceMode";

const EMPTY_FIELDS = {
  draftTitle: "",
  draftBody: "",
  placeTitle: "",
  placeShort: "",
  placeDetail: "",
  instaCaption: "",
  instaTags: "",
};

export default function DraftReviewStudio({
  onCopy,
  onToast,
  userId,
  brandId: brandIdProp,
  onUpgradeClick,
  onOpenBrandWorkspace,
  demoMode = false,
}) {
  const { activeBrand, activeBrandId, saveChannelContent } = useBrandWorkspace();
  const brandId = brandIdProp || activeBrandId;
  const { simpleMode } = useSimpleWorkspaceMode(userId);

  const [reviewChannel, setReviewChannel] = useState("blog");
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [audit, setAudit] = useState(null);
  const [improved, setImproved] = useState("");
  const [improving, setImproving] = useState(false);
  const [refineMemo, setRefineMemo] = useState("");
  const [refining, setRefining] = useState(false);
  const [usage, setUsage] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const channelConfig = getPasteReviewChannel(reviewChannel);

  const ctx = useMemo(
    () => ({
      brandName: activeBrand?.brandName || "",
      region: activeBrand?.region || "",
      mainKeyword: activeBrand?.mainKeyword || "",
      excludePhrases: activeBrand?.excludePhrases || "",
      speechStyle: activeBrand?.speechStyle,
      placeTitle: fields.placeTitle,
      placeShort: fields.placeShort,
      placeDetail: fields.placeDetail,
    }),
    [activeBrand, fields.placeTitle, fields.placeShort, fields.placeDetail]
  );

  const combinedText = useMemo(
    () => buildPasteReviewText(reviewChannel, fields),
    [reviewChannel, fields]
  );

  const lengthHint = useMemo(
    () => resolveBlogLengthTier("medium").target,
    []
  );

  const hooks = useMemo(
    () =>
      generateQuickHooks({
        brandName: ctx.brandName,
        region: ctx.region,
        topic: activeBrand?.preferredKeywords?.split(",")?.[0],
      }),
    [ctx, activeBrand]
  );

  const canAudit = combinedText.trim().length >= channelConfig.auditMinChars;
  const canImprove = combinedText.trim().length >= channelConfig.improveMinChars;

  useEffect(() => {
    if (!userId) return;
    fetchWithAuth("/api/billing/usage")
      .then((r) => setUsage(r?.usage))
      .catch(() => {});
  }, [userId]);

  const patchFields = useCallback((patch) => {
    setFields((f) => ({ ...f, ...patch }));
  }, []);

  const runLocalAudit = useCallback(() => {
    if (!canAudit) {
      setAudit(null);
      return;
    }
    setAudit(auditPastedDraft(combinedText, ctx, reviewChannel));
  }, [combinedText, ctx, reviewChannel, canAudit]);

  useEffect(() => {
    const t = setTimeout(runLocalAudit, 400);
    return () => clearTimeout(t);
  }, [runLocalAudit]);

  const buildApiBody = useCallback(
    (extra = {}) => ({
      channel: reviewChannel,
      brandId: brandId || undefined,
      ...ctx,
      title: fields.draftTitle.trim(),
      text: fields.draftBody.trim(),
      placeTitle: fields.placeTitle.trim(),
      placeShort: fields.placeShort.trim(),
      placeDetail: fields.placeDetail.trim(),
      instaCaption: fields.instaCaption.trim(),
      instaTags: fields.instaTags.trim(),
      ...extra,
    }),
    [reviewChannel, ctx, fields, brandId]
  );

  const persistDraft = useCallback(
    async (text, { versionSource, purposeSuffix, auditSnapshot }) => {
      return persistReviewDraft({
        userId,
        brandId,
        channelId: reviewChannel,
        text,
        fields,
        ctx,
        audit: auditSnapshot ?? audit,
        versionSource,
        purposeSuffix,
        saveChannelContent,
        demoMode,
      });
    },
    [
      userId,
      brandId,
      reviewChannel,
      fields,
      ctx,
      audit,
      saveChannelContent,
      demoMode,
    ]
  );

  const bumpHistory = () => setHistoryRefresh((k) => k + 1);

  const handleImprove = async () => {
    if (!canImprove) {
      onToast?.(
        `${channelConfig.label} 글을 ${channelConfig.improveMinChars}자 이상 입력해 주세요.`,
        "error"
      );
      return;
    }
    if (!brandId) {
      onToast?.("사이드바에서 브랜드를 선택해 주세요.", "error");
      return;
    }
    setImproving(true);
    setImproved("");
    try {
      const res = await fetchWithAuth("/api/content/review", {
        method: "POST",
        body: JSON.stringify(buildApiBody({ improve: true })),
      });
      if (res.usage) setUsage(res.usage);
      if (!res.ok) {
        onToast?.(res.userMessage || "개선에 실패했습니다.", "error");
        if (res.usageWarning) {
          onToast?.("이번 달 생성 한도에 가까워졌습니다.", "info");
        }
        return;
      }
      const nextImproved = res.improvedText || "";
      const auditAfter = res.auditAfter || audit;
      setImproved(nextImproved);
      if (auditAfter) setAudit(auditAfter);

      await persistDraft(combinedText, {
        versionSource: "paste_review_input",
        purposeSuffix: "원문",
        auditSnapshot: audit,
      });
      const saved = await persistDraft(nextImproved, {
        versionSource: "paste_review_improve",
        purposeSuffix: "개선본",
        auditSnapshot: auditAfter,
      });

      bumpHistory();
      onToast?.(
        saved.ok && saved.label
          ? `개선본이 준비됐습니다. 「${saved.label}」로 브랜드 초안 기록에 저장했습니다.`
          : `${channelConfig.label} 개선본이 준비됐습니다.`,
        "success"
      );
    } catch (err) {
      if (err.status === 429) {
        onToast?.(err.message, "error");
        onUpgradeClick?.();
      } else {
        onToast?.(err.message || "개선 요청 실패", "error");
      }
    } finally {
      setImproving(false);
    }
  };

  const clearAll = () => {
    setFields(EMPTY_FIELDS);
    setAudit(null);
    setImproved("");
    setRefineMemo("");
  };

  const switchChannel = (id) => {
    if (id === reviewChannel) return;
    setReviewChannel(id);
    setAudit(null);
    setImproved("");
    setRefineMemo("");
  };

  const remaining = usage?.content?.remaining;
  const limit = usage?.content?.limit;

  const memoryChannel =
    reviewChannel === "instagram" ? "instagram" : reviewChannel;

  const inputSection = () => {
    if (reviewChannel === "place") {
      return (
        <>
          <label className="text-[13px] font-semibold text-[#191F28]">
            상호·제목
          </label>
          <input
            type="text"
            value={fields.placeTitle}
            onChange={(e) => patchFields({ placeTitle: e.target.value })}
            placeholder="예: OO카페 강남점"
            className="mt-1.5 w-full rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] text-[#191F28] focus:border-[#03C75A] focus:outline-none"
          />
          <label className="mt-3 block text-[13px] font-semibold text-[#191F28]">
            한 줄 공지 *
          </label>
          <p className="mt-0.5 text-[11px] text-[#8B95A1]">
            모바일에 바로 보이는 짧은 소식 · 권장 150~350자(전체)
          </p>
          <textarea
            value={fields.placeShort}
            onChange={(e) => patchFields({ placeShort: e.target.value })}
            placeholder="예: 5월 연장 영업 안내…"
            className="mt-2 min-h-[120px] w-full resize-y rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] leading-relaxed focus:border-[#03C75A] focus:outline-none"
          />
          <label className="mt-3 block text-[13px] font-semibold text-[#191F28]">
            상세 안내 (선택)
          </label>
          <textarea
            value={fields.placeDetail}
            onChange={(e) => patchFields({ placeDetail: e.target.value })}
            placeholder="운영 시간·주차·이벤트 상세…"
            className="mt-2 min-h-[100px] w-full resize-y rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] leading-relaxed focus:border-[#03C75A] focus:outline-none"
          />
        </>
      );
    }
    if (reviewChannel === "instagram") {
      return (
        <>
          <label className="text-[13px] font-semibold text-[#191F28]">
            캡션 *
          </label>
          <p className="mt-0.5 text-[11px] text-[#8B95A1]">
            줄바꿈·이모지 그대로 붙여 넣으세요 · 권장 180~480자
          </p>
          <textarea
            value={fields.instaCaption}
            onChange={(e) => patchFields({ instaCaption: e.target.value })}
            placeholder="첫 줄 Hook&#10;본문…&#10;마무리"
            className="mt-2 min-h-[min(42vh,280px)] flex-1 resize-y rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] leading-relaxed focus:border-[#03C75A] focus:outline-none"
          />
          <label className="mt-3 block text-[13px] font-semibold text-[#191F28]">
            해시태그 (선택)
          </label>
          <input
            type="text"
            value={fields.instaTags}
            onChange={(e) => patchFields({ instaTags: e.target.value })}
            placeholder="#강남카페 #브런치"
            className="mt-1.5 w-full rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] focus:border-[#03C75A] focus:outline-none"
          />
        </>
      );
    }
    return (
      <>
        <label className="text-[13px] font-semibold text-[#191F28]">제목</label>
        <input
          type="text"
          value={fields.draftTitle}
          onChange={(e) => patchFields({ draftTitle: e.target.value })}
          placeholder="블로그 제목"
          className="mt-1.5 w-full rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] text-[#191F28] focus:border-[#03C75A] focus:outline-none"
        />
        <label className="mt-3 block text-[13px] font-semibold text-[#191F28]">
          내용
        </label>
        <p className="mt-0.5 text-[11px] text-[#8B95A1]">
          본문만 붙여 넣어도 됩니다 · 중간 글 기준 권장 약{" "}
          {lengthHint.toLocaleString()}자
        </p>
        <textarea
          value={fields.draftBody}
          onChange={(e) => patchFields({ draftBody: e.target.value })}
          placeholder="본문을 붙여 넣으세요…"
          className="mt-2 min-h-[min(42vh,300px)] flex-1 resize-y rounded-lg border border-[#E8EBED] px-3 py-2.5 text-[14px] leading-relaxed text-[#191F28] focus:border-[#03C75A] focus:outline-none"
        />
      </>
    );
  };

  return (
    <div className="workspace-shell flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#F7F8FA] p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-[20px] font-bold text-[#191F28]">붙여넣기 검수</h1>
        {simpleMode ? (
          <p className="mt-1 text-[13px] text-[#6B7684]">
            외부에서 쓴 글을 붙여 넣어 표현만 점검하세요. 새 글 쓰기는 「이야기」
            메뉴에서 합니다.
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-[#6B7684]">
            ① 붙여 넣으면 <strong className="text-[#191F28]">무료 검수</strong>, ②
            검수 후 <strong className="text-[#191F28]">글 개선</strong>으로
            다듬습니다. 개선·보완은 새 글 쓰기와 같은 월간 횟수를 쓰며, 결과는
            초안 기록에 남습니다.
          </p>
        )}
        {limit != null && (
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            이번 달 콘텐츠 {usage?.content?.used ?? 0}/{limit}회
            {remaining != null ? ` · 남은 ${remaining}회` : ""}
          </p>
        )}
      </header>

      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="검수 채널"
      >
        {PASTE_REVIEW_CHANNELS.map((ch) => {
          const active = reviewChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchChannel(ch.id)}
              className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
                active
                  ? "border-[#03C75A] bg-[#E8F9EF] shadow-sm"
                  : "border-[#E8EBED] bg-white hover:bg-[#F7F8FA]"
              }`}
            >
              <span
                className={`block text-[13px] font-semibold ${
                  active ? "text-[#03A94D]" : "text-[#191F28]"
                }`}
              >
                {ch.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#8B95A1]">
                {ch.desc}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-[#E8EBED] bg-white p-4 shadow-sm">
          <p className="mb-1 text-[12px] font-bold text-[#03A94D]">1. 붙여 넣기</p>
          <p className="mb-3 text-[11px] text-[#8B95A1]">
            {channelConfig.label} 글을 붙이면 오른쪽에서 자동 검수합니다.
          </p>
          {inputSection()}
          <div className="mt-3">
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-[#E8EBED] px-4 py-2.5 text-[13px] text-[#4E5968] hover:bg-[#F7F8FA]"
            >
              비우기
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-[#E8EBED] bg-white p-4 shadow-sm">
            <h2 className="text-[14px] font-bold text-[#191F28]">
              2. 검수 결과 <span className="font-normal text-[#8B95A1]">(무료)</span>
            </h2>
            {!audit ? (
              <div className="mt-2 space-y-3">
                <p className="text-[13px] text-[#8B95A1]">
                  {canAudit
                    ? "점검 중…"
                    : `글을 ${channelConfig.auditMinChars}자 이상 붙이면 자동으로 점검합니다.`}
                </p>
                {!canAudit ? <PasteReviewGuide /> : null}
              </div>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      audit.pass
                        ? "bg-[#E8F9EF] text-[#03A94D]"
                        : "bg-[#FFF4E6] text-[#E67700]"
                    }`}
                  >
                    {audit.pass ? "발행 검토 OK" : "보완 권장"}
                  </span>
                  <span className="text-[12px] text-[#8B95A1]">
                    {audit.charCount.toLocaleString()}자
                  </span>
                </div>
                <ul className="mt-3 max-h-[180px] space-y-2 overflow-y-auto">
                  {audit.issues.length === 0 ? (
                    <li className="text-[13px] text-[#03A94D]">
                      큰 문제는 보이지 않습니다.
                    </li>
                  ) : (
                    audit.issues.map((item) => (
                      <li
                        key={`${item.id}-${item.message}`}
                        className={`rounded-lg px-3 py-2 text-[12px] ${
                          item.severity === "fail"
                            ? "bg-[#FFF5F5] text-[#C91F2E]"
                            : "bg-[#F7F8FA] text-[#4E5968]"
                        }`}
                      >
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-[#8B95A1]"> — {item.message}</span>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-xl border-2 border-[#03C75A]/30 bg-[#F6FDF9] p-4 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#191F28]">3. 글 개선</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
              검수 결과를 반영해 AI가 같은 채널 톤으로 다듬습니다. 실행할 때마다
              브랜드 작업실 「저장한 글」과 아래 목록에 기록됩니다.
            </p>
            {!canImprove && (
              <p className="mt-2 text-[12px] text-[#E67700]">
                개선하려면 {channelConfig.improveMinChars}자 이상 입력해 주세요.
              </p>
            )}
            {!brandId && (
              <p className="mt-2 text-[12px] text-[#E67700]">
                브랜드를 선택해야 초안 기록에 남을 수 있습니다.
              </p>
            )}
            <button
              type="button"
              disabled={improving || !canImprove || !brandId || !userId || demoMode}
              onClick={handleImprove}
              className="mt-3 w-full rounded-xl bg-[#03C75A] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
            >
              {improving ? "개선 중…" : `${channelConfig.label} 개선하기`}
            </button>

            {improved ? (
              <div className="mt-4 space-y-4 border-t border-[#03C75A]/20 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] font-bold text-[#191F28]">개선본</h3>
                  <FullCopyButton
                    text={improved}
                    onCopy={() =>
                      onCopy?.(improved, "개선본이 복사되었습니다.")
                    }
                  />
                </div>
                <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 font-sans text-[13px] leading-relaxed text-[#4E5968]">
                  {improved}
                </pre>

                <div className="rounded-lg border border-[#E8EBED] bg-white p-3">
                  <h3 className="text-[13px] font-bold text-[#191F28]">
                    방향 보완 (선택)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-[#8B95A1]">
                    마음에 들지 않는 부분을 적으면 개선본을 다시 다듬고 기록에
                    추가합니다.
                  </p>
                  <textarea
                    value={refineMemo}
                    onChange={(e) => setRefineMemo(e.target.value)}
                    placeholder="예: 도입만 짧게, 키워드 반복 줄이기…"
                    className="mt-2 min-h-[64px] w-full resize-y rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px] focus:border-[#03C75A] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={
                      refining ||
                      refineMemo.trim().length < 4 ||
                      !userId ||
                      demoMode ||
                      !brandId
                    }
                    onClick={async () => {
                      setRefining(true);
                      try {
                        const res = await fetchWithAuth("/api/content/review", {
                          method: "POST",
                          body: JSON.stringify(
                            buildApiBody({
                              improve: true,
                              feedback: refineMemo.trim(),
                              text: improved,
                            })
                          ),
                        });
                        if (!res.ok) {
                          onToast?.(
                            res.userMessage || "보완에 실패했습니다.",
                            "error"
                          );
                          return;
                        }
                        const next = res.improvedText || improved;
                        setImproved(next);
                        if (res.auditAfter) setAudit(res.auditAfter);
                        const saved = await persistDraft(next, {
                          versionSource: "paste_review_refine",
                          purposeSuffix: refineMemo.trim().slice(0, 40),
                          auditSnapshot: res.auditAfter,
                        });
                        setRefineMemo("");
                        bumpHistory();
                        onToast?.(
                          saved.ok && saved.label
                            ? `「${saved.label}」로 초안 기록에 저장했습니다.`
                            : "보완이 반영됐습니다.",
                          "success"
                        );
                      } catch (err) {
                        onToast?.(err.message || "보완 요청 실패", "error");
                      } finally {
                        setRefining(false);
                      }
                    }}
                    className="mt-2 w-full rounded-xl border border-[#03C75A]/50 bg-[#F0FFF5] py-2.5 text-[13px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF] disabled:opacity-50"
                  >
                    {refining ? "보완 반영 중…" : "보완 반영 · 기록 저장"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {reviewChannel === "blog" || reviewChannel === "instagram" ? (
            <section className="rounded-xl border border-dashed border-[#03C75A]/30 bg-white p-4">
              <h2 className="text-[14px] font-bold text-[#191F28]">
                오늘의 한 줄 (무료)
              </h2>
              <p className="mt-0.5 text-[11px] text-[#6B7684]">
                브랜드·지역 기준 훅 5개
              </p>
              <ul className="mt-2 space-y-2">
                {hooks.map((line) => (
                  <li
                    key={line}
                    className="flex items-start justify-between gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2 text-[12px] leading-snug text-[#4E5968]"
                  >
                    <span className="flex-1">{line}</span>
                    <button
                      type="button"
                      onClick={() => onCopy?.(line, "한 줄이 복사되었습니다.")}
                      className="shrink-0 text-[11px] font-semibold text-[#03A94D]"
                    >
                      복사
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <BrandDraftHistoryStrip
          brandId={brandId}
          brandName={activeBrand?.brandName}
          contentArchive={activeBrand?.contentArchive}
          refreshKey={historyRefresh}
          filterChannel={memoryChannel}
          onOpenBrandWorkspace={onOpenBrandWorkspace}
        />
      </div>
    </div>
  );
}
