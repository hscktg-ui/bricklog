"use client";

import { memo, useEffect, useMemo, useState } from "react";
import TodayInspiration from "@/components/TodayInspiration";
import WritingContextTips from "@/components/WritingContextTips";
import { getWritingContextHints } from "@/lib/inspiration/topicScopedInspiration";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  fetchTodaySnapshot,
  getIndustryInsight,
} from "@/lib/trends/clientSnapshot";
import { GENERATION_ACTIVE_EVENT } from "@/lib/generation/generationSession";

const EXPAND_STORAGE_KEY = "briclog-timeliness-expanded";

const COLLAPSED_HINT =
  "막히면 「보기」를 눌러 주제·장면 힌트를 펼칠 수 있어요.";

/**
 * 작성 맥락 힌트 — 접힘 시 가벼움, 펼침·생성 중에만 무거운 계산·API
 */
/** @typedef {'blog' | 'insta' | 'place' | 'image'} WritingChannel */

function DailyTimelinessPanel({
  blogInput,
  onChange,
  brandName = "",
  brandMemory = null,
  recentTopics = [],
  generationCount = 0,
  onPickTopic,
  onPickScene,
  onQuickWrite,
  canQuickWrite = false,
  channel = "blog",
  compact = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [generationActive, setGenerationActive] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (compact) return;
    try {
      if (localStorage.getItem(EXPAND_STORAGE_KEY) === "1") setExpanded(true);
    } catch {
      /* ignore */
    }
  }, [compact]);

  useEffect(() => {
    const onGen = (e) => setGenerationActive(Boolean(e.detail?.active));
    window.addEventListener(GENERATION_ACTIVE_EVENT, onGen);
    return () => window.removeEventListener(GENERATION_ACTIVE_EVENT, onGen);
  }, []);

  const hintsActive =
    !generationActive && (expanded || (compact && detailsOpen));

  const debouncedTopic = useDebouncedValue(
    hintsActive ? blogInput.topic || "" : "",
    280
  );
  const debouncedKeyword = useDebouncedValue(
    hintsActive ? blogInput.mainKeyword || "" : "",
    280
  );
  const debouncedSubKeyword = useDebouncedValue(
    hintsActive ? blogInput.subKeyword || "" : "",
    280
  );
  const debouncedInclude = useDebouncedValue(
    hintsActive ? blogInput.includePhrases || "" : "",
    280
  );
  const debouncedIndustry = useDebouncedValue(
    hintsActive ? blogInput.industry || "" : "",
    400
  );
  const debouncedRegion = useDebouncedValue(
    hintsActive ? blogInput.region || "" : "",
    280
  );

  const toggleExpanded = () => {
    setExpanded((o) => {
      const next = !o;
      if (!compact) {
        try {
          localStorage.setItem(EXPAND_STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  const [selected, setSelected] = useState(() => new Set());
  const [trendLine, setTrendLine] = useState(null);

  useEffect(() => {
    if (!hintsActive) return undefined;
    let cancelled = false;
    (async () => {
      const snap = await fetchTodaySnapshot();
      if (cancelled || !snap?.hasVerifiedData) return;
      const ind = getIndustryInsight(snap, debouncedIndustry);
      const theme = ind?.risingThemes?.[0];
      if (theme) setTrendLine(theme);
    })();
    return () => {
      cancelled = true;
    };
  }, [hintsActive, debouncedIndustry]);

  const seasonLine = useMemo(() => {
    if (hintsActive) return null;
    try {
      return getActiveSeasonContext(blogInput.contentDate)?.label || null;
    } catch {
      return null;
    }
  }, [hintsActive, blogInput.contentDate]);

  const pack = useMemo(() => {
    if (!hintsActive) {
      return {
        tips: [],
        suggestionChips: recentTopics.slice(0, 4),
        previewLine: seasonLine || COLLAPSED_HINT,
        stories: [],
        scenes: [],
        seasonLabel: seasonLine || "",
      };
    }
    return getWritingContextHints({
      channel,
      date: blogInput.contentDate,
      industryKey: debouncedIndustry,
      industryLabel: debouncedIndustry,
      region: debouncedRegion,
      brandName,
      storeFeatures: blogInput.storeFeatures || brandMemory?.brandDescription,
      brandDescription: blogInput.brandDescription || brandMemory?.brandDescription,
      includePhrases: debouncedInclude || brandMemory?.includePhrases,
      preferredKeywords: brandMemory?.preferredKeywords || brandMemory?.mainKeyword,
      brandTone:
        brandMemory?.differentiator ||
        brandMemory?.brandPhilosophy ||
        blogInput.brandDescription,
      differentiator: brandMemory?.differentiator,
      brandPhilosophy: brandMemory?.brandPhilosophy,
      services: brandMemory?.services,
      targetCustomer: brandMemory?.targetCustomer,
      topic: debouncedTopic,
      mainKeyword: debouncedKeyword,
      subKeyword: debouncedSubKeyword,
      includePhrases: debouncedInclude,
      recentTopics,
      generationCount,
      trendLine,
    });
  }, [
    hintsActive,
    channel,
    blogInput.contentDate,
    blogInput.brandDescription,
    debouncedIndustry,
    debouncedRegion,
    brandName,
    brandMemory,
    debouncedTopic,
    debouncedKeyword,
    debouncedSubKeyword,
    debouncedInclude,
    recentTopics,
    generationCount,
    trendLine,
    seasonLine,
  ]);

  const suggestionChips = pack.suggestionChips || [];
  const hasTopic = Boolean(blogInput.topic?.trim());

  const oneLiner =
    pack.previewLine ||
    (pack.stories[0]?.title
      ? pack.stories
          .slice(0, 2)
          .map((s) => s.title)
          .join(" · ")
      : pack.seasonLabel);

  const toggleStory = (index) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const applySelectedTimeliness = () => {
    const parts = [];
    pack.stories.forEach((s, i) => {
      if (selected.has(i)) parts.push(s.title);
    });
    pack.scenes.slice(0, 2).forEach((scene) => {
      if (selected.has(`scene-${scene}`)) parts.push(scene);
    });
    if (!parts.length) return;
    const cur = blogInput.includePhrases?.trim();
    const merged = cur ? `${cur}, ${parts.join(", ")}` : parts.join(", ");
    onChange({ ...blogInput, includePhrases: merged });
    setSelected(new Set());
  };

  const hasSelection = selected.size > 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] leading-snug text-[#8B95A1] line-clamp-2">
          {hintsActive
            ? pack.tips?.[0]?.text?.replace(/^TIP ·\s*/, "") || oneLiner
            : seasonLine || COLLAPSED_HINT}
        </p>
        <details
          className="rounded-lg border border-[#E8EBED] bg-[#FAFBFC]"
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
        >
          <summary className="flex min-h-[40px] cursor-pointer list-none items-center px-3 py-2 text-[12px] font-semibold text-[#4E5968] marker:content-none [&::-webkit-details-marker]:hidden">
            주제·장면 더 보기
          </summary>
          <div className="space-y-2 border-t border-[#E8EBED] px-3 pb-3 pt-2">
            {hintsActive ? (
              <>
                <WritingContextTips tips={(pack.tips || []).slice(0, 2)} />
                {onPickTopic && suggestionChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => onPickTopic(chip)}
                        className="rounded-full border border-[#E8EBED] bg-white px-2 py-0.5 text-[11px] text-[#4E5968] hover:border-[#03C75A]"
                      >
                        {chip.length > 28 ? `${chip.slice(0, 26)}…` : chip}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-[#8B95A1]">{COLLAPSED_HINT}</p>
            )}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-[#E8EBED] pt-5">
      <button
        type="button"
        onClick={toggleExpanded}
        disabled={generationActive}
        className="flex w-full items-start gap-2 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2.5 text-left hover:border-[#03C75A]/40 disabled:opacity-60"
      >
        <span className="shrink-0 rounded-md bg-[#E8F9EF] px-1.5 py-0.5 text-[10px] font-bold text-[#03A94D]">
          TIP
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-[#03A94D]">
            작성 맥락 힌트
          </span>
          {!expanded && (
            <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-[#8B95A1]">
              {generationActive
                ? "생성이 끝나면 다시 힌트를 볼 수 있어요."
                : hintsActive
                  ? pack.tips?.[0]?.text?.replace(/^TIP ·\s*/, "") || oneLiner
                  : seasonLine || COLLAPSED_HINT}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-[#4E5968]">
          {expanded ? "접기" : "보기"}
        </span>
      </button>

      {!expanded && !generationActive && suggestionChips.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-[10px] font-semibold text-[#8B95A1]">
            {recentTopics.length > 0 && !hintsActive
              ? "최근 주제"
              : hasTopic
                ? "입력에 맞춘 추천"
                : "추천 주제"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onPickTopic?.(chip)}
                className="rounded-full border border-[#E8EBED] bg-white px-2.5 py-1 text-[11px] text-[#4E5968] transition hover:border-[#03C75A] hover:bg-[#E8F9EF] hover:text-[#03A94D]"
              >
                {chip.length > 32 ? `${chip.slice(0, 30)}…` : chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {!expanded && (
        <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">
          {generationActive
            ? "지금은 글 생성에 집중하고 있어요."
            : hasTopic
              ? "펼치면 오늘 흐름·장면 예시를 더 볼 수 있어요."
              : COLLAPSED_HINT}
        </p>
      )}

      {expanded && hintsActive && (
        <div className="mt-3 space-y-3">
          <WritingContextTips tips={pack.tips} />

          <p className="text-[11px] leading-relaxed text-[#8B95A1]">
            아래는 주제·장면 예시입니다. 체크하거나 「이걸 주제로」를 눌러 「포함할
            내용」에 넣을 수 있어요.
          </p>

          <TodayInspiration
            embedded
            selectable
            selected={selected}
            onToggleStory={toggleStory}
            channel={channel}
            industryKey={debouncedIndustry}
            brandName={brandName}
            contentDate={blogInput.contentDate}
            topic={blogInput.topic || ""}
            mainKeyword={blogInput.mainKeyword || ""}
            subKeyword={blogInput.subKeyword || ""}
            includePhrases={blogInput.includePhrases || ""}
            onPickTopic={onPickTopic}
            onPickScene={onPickScene}
            onQuickWrite={onQuickWrite}
            canQuickWrite={canQuickWrite}
          />

          {hasSelection && (
            <button
              type="button"
              onClick={applySelectedTimeliness}
              className="w-full rounded-lg border border-[#03C75A]/30 bg-[#E8F9EF] py-2.5 text-[12px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF]/80"
            >
              선택한 힌트를 「포함할 내용」에 반영
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DailyTimelinessPanel);
