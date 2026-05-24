"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IMAGE_PURPOSE_OPTIONS, IMAGE_RATIO_OPTIONS } from "@/lib/constants";
import { OptionGrid } from "@/components/channels/channelFormUi";
import {
  IMAGE_PURPOSE_RATIO_LABEL,
  resolveImageRatioForPurpose,
  resolveImagePurposeFromSource,
  extractImageHeadCopy,
} from "@/lib/images/imagePurposeConfig";
import { resolveDerivationSource } from "@/lib/content/channelSource";

const BANNER_RATIO_OPTIONS = IMAGE_RATIO_OPTIONS.filter((o) => o.value !== "auto");

/**
 * 프롬프트(이미지) 브리프 — 단독 입력 vs 타 채널 파생
 */
export default function ImageBriefFields({
  blogInput,
  setBlogInput,
  onDraftChange,
  formApiRef,
  imageOptions,
  setImageOptions,
  blogContent = null,
  placeContent = null,
  instagramContent = null,
  sourceChannel = null,
  baseContentLabel = null,
  compact = false,
  deferUntilCommit = false,
}) {
  const [topicLocal, setTopicLocal] = useState(blogInput?.topic || "");

  useEffect(() => {
    setTopicLocal(blogInput?.topic || "");
  }, [blogInput?.brandId]);

  const patchTopic = useCallback(
    (topic) => {
      const mainKeyword =
        blogInput?.mainKeyword?.trim() ||
        topic.split(/[,，]/)[0]?.trim() ||
        topic;
      const partial = { topic, mainKeyword };
      if (deferUntilCommit && formApiRef?.current?.patchImmediate) {
        formApiRef.current.patchImmediate(partial);
        onDraftChange?.({
          ...blogInput,
          ...partial,
        });
      } else if (setBlogInput) {
        setBlogInput((prev) => ({
          ...prev,
          topic,
          mainKeyword:
            prev.mainKeyword?.trim() || topic.split(/[,，]/)[0]?.trim() || topic,
        }));
      }
    },
    [blogInput, deferUntilCommit, formApiRef, onDraftChange, setBlogInput]
  );

  const derivation = useMemo(() => {
    const source = resolveDerivationSource("image", {
      blogContent,
      placeContent,
      instagramContent,
      blogInput,
      baseContentLabel,
      sourceChannel,
    });
    if (!source?.blogLike) return { mode: "standalone", source: null };
    const fromDraft =
      Boolean(blogContent || placeContent || instagramContent) &&
      source.sourceChannel !== "form";
    return {
      mode: fromDraft ? "derive" : "standalone",
      source,
    };
  }, [
    blogContent,
    placeContent,
    instagramContent,
    blogInput,
    baseContentLabel,
    sourceChannel,
  ]);

  const derivedPurpose = derivation.source
    ? resolveImagePurposeFromSource(derivation.source.sourceChannel)
    : imageOptions?.purpose || "thumbnail";

  const derivedRatio = resolveImageRatioForPurpose(
    derivedPurpose,
    imageOptions?.ratio
  );

  useEffect(() => {
    if (deferUntilCommit) return;
    if (derivation.mode !== "derive" || !derivation.source) return;
    const purpose = resolveImagePurposeFromSource(
      derivation.source.sourceChannel
    );
    const ratio = resolveImageRatioForPurpose(purpose, imageOptions?.ratio);
    setImageOptions((prev) => {
      if (prev?.purpose === purpose && prev?.ratio === ratio) return prev;
      return { ...prev, purpose, ratio };
    });
  }, [
    deferUntilCommit,
    derivation.mode,
    derivation.source,
    imageOptions?.ratio,
    setImageOptions,
  ]);

  const headCopy = useMemo(
    () =>
      derivation.mode === "derive" && derivation.source
        ? extractImageHeadCopy(derivation.source.sourceChannel, {
            blogContent,
            placeContent,
            instagramContent,
            blogInput,
          })
        : "",
    [
      derivation.mode,
      derivation.source,
      blogContent,
      placeContent,
      instagramContent,
      blogInput,
    ]
  );

  const setPurpose = (purpose) => {
    setImageOptions((prev) => ({
      ...prev,
      purpose,
      ratio: resolveImageRatioForPurpose(purpose, prev?.ratio),
    }));
  };

  const setRatio = (ratio) => {
    setImageOptions((prev) => ({ ...prev, ratio }));
  };

  if (derivation.mode === "derive") {
    const chLabel =
      derivation.source.sourceChannel === "blog"
        ? "이야기"
        : derivation.source.sourceChannel === "place"
          ? "플레이스"
          : "인스타";
    const purposeLabel =
      IMAGE_PURPOSE_OPTIONS.find((o) => o.value === derivedPurpose)?.label ||
      derivedPurpose;

    return (
      <div
        className={`rounded-xl border border-[#03C75A]/25 bg-[#F8FDF9] ${
          compact ? "p-3" : "p-4"
        }`}
      >
        <p className="text-[12px] font-semibold text-[#03A94D]">
          {chLabel} 초안 연동
        </p>
        <p className="mt-1 text-[11px] text-[#4E5968]">
          용도 <strong>{purposeLabel}</strong> · 비율{" "}
          <strong>{IMAGE_PURPOSE_RATIO_LABEL[derivedPurpose]}</strong>
        </p>
        {headCopy ? (
          <div className="mt-3">
            <p className="text-[11px] font-medium text-[#4E5968]">헤드카피</p>
            <p className="mt-1 rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[13px] text-[#191F28]">
              {headCopy}
            </p>
          </div>
        ) : null}
        {derivedPurpose === "banner" && (
          <div className="mt-3">
            <p className="text-[12px] font-medium text-[#4E5968]">배너 비율</p>
            <div className="mt-1.5">
              <OptionGrid
                options={BANNER_RATIO_OPTIONS}
                value={imageOptions?.ratio || "16:9"}
                onChange={setRatio}
                cols={3}
                compact
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-white ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-[13px] font-bold text-[#191F28]">프롬프트 브리프</p>
      {!compact && (
        <p className="mt-1 text-[11px] leading-relaxed text-[#8B95A1]">
          주제를 직접 입력하고 용도를 고릅니다. 이야기·플레이스·인스타 초안이
          있으면 「이어 만들기」로 헤드카피와 용도가 맞춰집니다.
        </p>
      )}
      <label className="mt-3 block text-[12px] font-medium text-[#4E5968]">
        주제 (직접 입력)
      </label>
      <input
        type="text"
        value={topicLocal}
        onChange={(e) => {
          const next = e.target.value;
          setTopicLocal(next);
          if (!deferUntilCommit) {
            patchTopic(next);
          }
        }}
        onBlur={() => {
          if (deferUntilCommit) patchTopic(topicLocal);
        }}
        className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[14px] focus:border-[#03C75A] focus:outline-none"
        placeholder="예: 봄 시즌 썸네일 · 신메뉴 홍보"
      />
      <p className="mt-3 text-[12px] font-medium text-[#4E5968]">용도</p>
      <div className="mt-1.5">
        <OptionGrid
          options={IMAGE_PURPOSE_OPTIONS}
          value={imageOptions?.purpose || "thumbnail"}
          onChange={setPurpose}
          cols={2}
          compact
        />
      </div>
      <p className="mt-2 text-[11px] text-[#8B95A1]">
        비율:{" "}
        <span className="font-medium text-[#4E5968]">
          {IMAGE_PURPOSE_RATIO_LABEL[imageOptions?.purpose || "thumbnail"]}
        </span>
        {(imageOptions?.purpose || "thumbnail") !== "banner"
          ? " (용도별 고정)"
          : ""}
      </p>
      {(imageOptions?.purpose || "thumbnail") === "banner" && (
        <div className="mt-3">
          <p className="text-[12px] font-medium text-[#4E5968]">배너 사이즈</p>
          <div className="mt-1.5">
            <OptionGrid
              options={BANNER_RATIO_OPTIONS}
              value={imageOptions?.ratio || "16:9"}
              onChange={setRatio}
              cols={3}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}
