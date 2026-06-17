"use client";

import { useMemo } from "react";
import BriclogNextPanel from "@/components/BriclogNextPanel";
import { buildBriclogNextSnapshot } from "@/lib/product/briclogNext";

const WORKSPACE_MENUS = new Set(["blog", "place", "insta", "image", "growth"]);

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
    <div className="border-b border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] px-4 py-3 sm:px-5 md:px-6">
      <div className="mx-auto max-w-5xl">
        <BriclogNextPanel
          blogInput={blogInput}
          meta={blogContent?._meta}
          compact
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
