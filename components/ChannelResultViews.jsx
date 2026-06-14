"use client";

import CopyCard from "./CopyCard";
import Icon from "./Icon";
import FullCopyButton from "./FullCopyButton";
import VerificationStatus from "./VerificationStatus";

function TagList({ tags }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="rounded-full border border-[rgba(48,209,88,0.2)] bg-[rgba(48,209,88,0.1)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--vision-ink)]"
        >
          {tag.startsWith("#") ? tag : `#${tag}`}
        </span>
      ))}
    </div>
  );
}

export function PlaceResultView({ place, onCopy }) {
  if (!place) return null;
  const meta = place._meta;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[12px] text-[var(--vision-muted)]">
        사장님 공지 · 보고 방문
        {meta?.totalChars != null && (
          <span className="ml-2 font-medium text-[var(--vision-accent)]">
            {meta.totalChars}자 (공백 제외)
          </span>
        )}
        {meta?.channelVoice && (
          <span className="ml-1 text-[#8B95A1]"> · {meta.channelVoice}</span>
        )}
      </p>
        <FullCopyButton
          text={place.fullCopyText}
          onCopy={() => onCopy?.(place.fullCopyText)}
        />
      </div>
      <VerificationStatus
        verification={place.qualityReport?.verification}
        factCheck={place.qualityReport?.factCheck}
      />
      <CopyCard
        label="제목"
        value={place.title}
        hint="18~32자 · 메인키워드 자연 삽입"
      />
      <CopyCard
        label="요약 (모바일 1~2줄)"
        value={place.shortBody}
        variant="muted"
      />
      <CopyCard
        label="상세 본문"
        value={place.detailBody || place.body}
        hint="250~450자 · 방문 이유·시즌·혜택"
      />
      <CopyCard label="CTA" value={place.cta} variant="cta" />
      <CopyCard label="해시태그" hint="8~15개">
        <TagList tags={place.hashtags} />
      </CopyCard>
    </div>
  );
}

export function InstaResultView({ insta, onCopy }) {
  if (!insta) return null;
  const meta = insta._meta;
  const uploadText = insta.lineBreakBody || insta.body;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[12px] text-[var(--vision-muted)]">
        저장형 캡션 · 2025 로컬 감성
        {meta?.bodyChars != null && (
          <span className="ml-2 font-medium text-[var(--vision-accent)]">
            {meta.bodyChars}자
          </span>
        )}
        {meta?.instaTone && (
          <span className="ml-1"> · {meta.instaTone}</span>
        )}
      </p>
        <FullCopyButton
          text={insta.fullCopyText}
          onCopy={() => onCopy?.(insta.fullCopyText)}
        />
      </div>
      <VerificationStatus
        verification={insta.qualityReport?.verification}
        factCheck={insta.qualityReport?.factCheck}
      />
      <CopyCard label="훅 (첫 줄)" value={insta.hook} hint="시선·저장 유도" />
      <CopyCard
        label="본문"
        value={insta.body}
        hint="500~900자 · 블로그체 금지"
      />
      <CopyCard
        label="붙여넣기용 (줄바꿈)"
        value={uploadText}
        hint="인스타 앱에 그대로 복사"
        variant="muted"
      />
      <CopyCard label="마무리" value={insta.ending} />
      <CopyCard label="해시태그" hint="15~25개">
        <TagList tags={insta.hashtags} />
      </CopyCard>
    </div>
  );
}

const HASHTAG_GROUPS = [
  { key: "localTags", label: "지역", desc: "동네·상권·플레이스 검색" },
  { key: "brandTags", label: "브랜드", desc: "매장명·메인키워드" },
  { key: "seoTags", label: "SEO", desc: "네이버·블로그·검색형" },
  { key: "trendTags", label: "트렌드", desc: "저장·감성·핫플" },
  { key: "seasonalTags", label: "시즌", desc: "시기·이벤트·목적" },
];

export function HashtagResultView({ tags }) {
  if (!tags) return null;

  if (Array.isArray(tags)) {
    return (
      <CopyCard label="해시태그">
        <TagList tags={tags} />
      </CopyCard>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#8B95A1]">
        목적별 해시태그 세트 · 총 {tags.all?.length || 0}개
      </p>
      {tags.all?.length > 0 && (
        <CopyCard
          label="태그 복사하기"
          value={tags.all.join(" ")}
          variant="muted"
        />
      )}
      {HASHTAG_GROUPS.map(({ key, label, desc }) => {
        const list = tags[key];
        if (!list?.length) return null;
        return (
          <CopyCard
            key={key}
            label={label}
            value={list.join(" ")}
            hint={desc}
          />
        );
      })}
    </div>
  );
}

const IMAGE_ITEMS = [
  { key: "thumbnailPrompt", fallback: "thumbnail", label: "블로그 썸네일", ratio: "16:9" },
  { key: "placeImagePrompt", fallback: "placeImage", label: "플레이스 대표", ratio: "4:3" },
  { key: "instagramCardPrompt", fallback: "instagramCard", label: "인스타 카드", ratio: "4:5" },
  { key: "bannerPrompt", fallback: null, label: "배너·헤더", ratio: "21:9" },
];

export function ImageGenerativeView({ imagePrompt, onCopy }) {
  if (!imagePrompt) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[#4E5968]">
          <Icon name="image" className="mt-0.5 h-4 w-4 shrink-0 text-[#03C75A]" />
          브랜드 톤 비주얼 · 텍스트 여백
        </p>
        <FullCopyButton
          text={imagePrompt.fullCopyText}
          onCopy={() => onCopy?.(imagePrompt.fullCopyText)}
        />
      </div>
      {IMAGE_ITEMS.map(({ key, fallback, label, ratio }) => {
        const value = imagePrompt[key] || (fallback ? imagePrompt[fallback] : "");
        if (!value) return null;
        return (
          <div
            key={key}
            className="overflow-hidden rounded-2xl border border-[#E8EBED] bg-white"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#F7F8FA] to-[#E8F9EF] px-4 py-2">
              <span className="text-[12px] font-bold text-[#191F28]">{label}</span>
              <span className="text-[10px] font-semibold text-[#8B95A1]">{ratio}</span>
            </div>
            <div className="p-4">
              <CopyCard label="프롬프트 (영문)" value={value} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ImagePromptResultView(props) {
  return <ImageGenerativeView {...props} />;
}
