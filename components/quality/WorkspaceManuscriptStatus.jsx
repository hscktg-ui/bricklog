"use client";

import { useMemo } from "react";
import BriclogDepthPanel from "@/components/quality/BriclogDepthPanel";
import {
  buildChannelWorkspaceContextScore,
  buildWorkspaceContextScore,
} from "@/lib/publicTest/briclogContextScore";

/**
 * 블로그·플레이스·인스타 공통 — 발행 등급·글값 카드
 */
export default function WorkspaceManuscriptStatus({
  pack,
  input = {},
  channel = "blog",
  hasPlace = false,
  hasInsta = false,
  compact = true,
}) {
  const contextScore = useMemo(() => {
    if (!pack) return null;
    if (channel === "blog" && pack.sections?.length) {
      return buildWorkspaceContextScore(pack, input, { hasPlace, hasInsta });
    }
    if (channel === "place" || channel === "instagram") {
      return buildChannelWorkspaceContextScore(pack, input, channel);
    }
    return null;
  }, [pack, input, channel, hasPlace, hasInsta]);

  if (!contextScore?.axes?.length) return null;

  return (
    <BriclogDepthPanel
      contextScore={contextScore}
      variant={compact ? "compact" : "full"}
      showDepthBadge={channel === "blog"}
      channelReady={{
        place: channel === "place" || hasPlace,
        insta: channel === "instagram" || hasInsta,
      }}
    />
  );
}
