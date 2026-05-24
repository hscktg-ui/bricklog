import { fetchWithAuth } from "@/lib/api/clientAuth";

/**
 * 클라이언트 콘텐츠 이벤트 (실패해도 UX 무시)
 */
export async function trackContentEvent({
  eventType,
  brandId = null,
  contentItemId = null,
  channel = "",
  meta = {},
}) {
  if (!eventType || typeof window === "undefined") return null;
  try {
    return await fetchWithAuth("/api/feedback/events", {
      method: "POST",
      body: JSON.stringify({
        eventType,
        brandId,
        contentItemId,
        channel,
        meta,
      }),
    });
  } catch {
    return null;
  }
}
