"use client";

import { useMemo } from "react";
import BriclogNextPanel from "@/components/BriclogNextPanel";
import { buildBriclogNextSnapshot, getBriclogNextPublicPitch } from "@/lib/product/briclogNext";
import { VISION_EYEBROW } from "@/lib/landing/vision2030Styles";

const WORKSPACE_MENUS = new Set(["blog", "place", "insta", "detailPage", "image", "growth"]);

/**
 * 대시보드 홈 — 이번 달 운영 리듬 (채널 메뉴 공통)
 */
export default function BriclogNextHomeStrip({
  activeMenu = "blog",
  blogInput = null,
  blogContent = null,
  hasPlace = false,
  hasInsta = false,
  onNavigate = null,
  generationBusy = false,
}) {
  const snapshot = useMemo(
    () =>
      buildBriclogNextSnapshot(blogInput || {}, {
        blog: Boolean(blogContent),
        place: hasPlace,
        insta: hasInsta,
        blogTopic:
          blogContent?.title ||
          blogContent?.representativeTitle ||
          blogInput?.topic ||
          "",
      }),
    [blogInput, blogContent, hasPlace, hasInsta]
  );

  const show = useMemo(() => {
    if (!WORKSPACE_MENUS.has(activeMenu)) return false;
    if (generationBusy) return false;
    if (!snapshot.ok) return false;
    const hasForm =
      Boolean(blogInput?.brandName?.trim()) ||
      Boolean(blogInput?.topic?.trim());
    if (!hasForm && !blogContent) return false;
    if (snapshot.progress >= 100 && hasPlace && hasInsta) return false;
    return true;
  }, [
    activeMenu,
    generationBusy,
    snapshot.ok,
    snapshot.progress,
    blogInput,
    blogContent,
    hasPlace,
    hasInsta,
  ]);

  const heroMode =
    activeMenu === "blog" &&
    !blogContent &&
    (Boolean(blogInput?.brandName?.trim()) || Boolean(blogInput?.topic?.trim()));

  const pitch = useMemo(() => getBriclogNextPublicPitch(), []);

  if (!show) return null;

  const onChannelAction =
    typeof onNavigate === "function"
      ? (channel) => {
          if (channel === "place") onNavigate("place");
          else if (channel === "instagram" || channel === "insta")
            onNavigate("insta");
          else if (channel === "blog") onNavigate("blog");
        }
      : undefined;

  return (
    <div
      className={`border-b border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] ${
        heroMode ? "px-4 py-4 sm:px-6 sm:py-5" : "px-4 py-3 sm:px-5 md:px-6"
      }`}
    >
      <div className="mx-auto max-w-5xl">
        {heroMode ? (
          <div className="mb-4 text-center md:text-left">
            <p className={VISION_EYEBROW}>{pitch.eyebrow}</p>
            <h2 className="mt-1 text-[clamp(1.125rem,2.5vw,1.375rem)] font-semibold tracking-tight text-[var(--vision-ink)]">
              {pitch.headline}
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--vision-muted)] md:text-[14px]">
              {pitch.sub}
            </p>
          </div>
        ) : null}
        <BriclogNextPanel
          blogInput={blogInput}
          meta={blogContent?._meta}
          compact={!heroMode}
          hero={heroMode}
          hasPlace={hasPlace}
          hasInsta={hasInsta}
          blogTopic={
            blogContent?.title ||
            blogContent?.representativeTitle ||
            blogInput?.topic ||
            ""
          }
          onChannelAction={onChannelAction}
          showProgress={Boolean(blogContent)}
        />
      </div>
    </div>
  );
}
