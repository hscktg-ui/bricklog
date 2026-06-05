"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import ContentFeedbackPanel from "@/components/feedback/ContentFeedbackPanel";

const TAB_TO_CHANNEL = {
  blog: "blog",
  smartplace: "place",
  insta: "instagram",
};

/**
 * 기록 상세에서 content_items 연결 후 서버 피드백 패널
 */
export default function HistoryContentFeedback({
  activeTab,
  record,
  userId,
  demoMode = false,
}) {
  const [contentItemId, setContentItemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const channel = TAB_TO_CHANNEL[activeTab];

  useEffect(() => {
    if (!userId || demoMode || !channel || !record) {
      setContentItemId(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ channel });
    if (record.brand_id) params.set("brandId", record.brand_id);

    fetchWithAuth(`/api/feedback/content-item?${params}`)
      .then((data) => {
        if (!cancelled) setContentItemId(data.contentItemId || null);
      })
      .catch(() => {
        if (!cancelled) setContentItemId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, demoMode, channel, record?.id, record?.brand_id]);

  if (!userId || demoMode || !record || !channel) return null;

  if (loading) {
    return (
      <p className="text-[11px] text-[#8B95A1]">피드백 연결 확인 중…</p>
    );
  }

  return (
    <ContentFeedbackPanel
      contentItemId={contentItemId}
      brandId={record.brand_id || null}
      channel={channel}
      compact
    />
  );
}
