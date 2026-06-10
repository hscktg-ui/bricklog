"use client";

import { useMemo } from "react";
import ManuscriptStatusCard from "@/components/quality/ManuscriptStatusCard";
import ChannelRoadmapStrip from "@/components/product/ChannelRoadmapStrip";
import { resolvePublishGrade } from "@/lib/product/publishGradeDisplay";

/**
 * 브릭로그 맥락·발행 준비도 — 등급·상태 우선, 숫자는 접기
 * @param {"compact"|"full"} variant
 */
export default function BriclogDepthPanel({
  contextScore,
  variant = "full",
  showDepthBadge = false,
  channelReady = {},
}) {
  const data = useMemo(() => contextScore, [contextScore]);
  if (!data?.axes?.length) return null;

  const compact = variant === "compact";
  const grade = resolvePublishGrade(data);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <ManuscriptStatusCard
        contextScore={data}
        compact={compact}
        showScoreDetails={!compact}
      />
      {!compact ? (
        <ChannelRoadmapStrip
          ready={{
            blog: true,
            place: channelReady.place,
            insta: channelReady.insta,
          }}
        />
      ) : null}
      {showDepthBadge && data.depth?.levelLabel ? (
        <p className="text-[10px] font-medium text-[#8B95A1]">
          등급 {grade.id} · {data.depth.levelLabel}
        </p>
      ) : null}
    </div>
  );
}
