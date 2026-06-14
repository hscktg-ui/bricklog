"use client";

import { MOBILE_STORY } from "@/lib/product/craft";
import MobileChannelChrome from "@/components/workspace/MobileChannelChrome";

/** @deprecated use MobileChannelChrome — blog 래퍼 */
export default function MobileStoryChrome({
  pane = "form",
  onPaneChange,
  storyReady = false,
  isGenerating = false,
  storyTitle = null,
}) {
  return (
    <MobileChannelChrome
      channel="blog"
      pane={pane === "story" ? "result" : "form"}
      onPaneChange={(next) => onPaneChange?.(next === "form" ? "form" : "story")}
      resultReady={storyReady}
      isGenerating={isGenerating}
      resultTitle={storyTitle}
    />
  );
}
