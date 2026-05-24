import { isMissingMemoryTable } from "@/lib/memory/server/memoryDb";

/**
 * 브랜드 자료·경쟁사 요약 (원문 복사 금지 — 맥락만)
 */
export async function loadBrandKnowledgeBrief(supabase, userId, brandId) {
  if (!brandId || !supabase) return "";

  const parts = [];

  try {
    const { data: assets } = await supabase
      .from("brand_assets")
      .select("file_name, summary, key_points")
      .eq("user_id", userId)
      .eq("brand_id", brandId)
      .order("uploaded_at", { ascending: false })
      .limit(6);

    for (const a of assets || []) {
      if (a.summary) {
        parts.push(`[자료:${a.file_name}] ${a.summary}`);
      }
      const kp = Array.isArray(a.key_points) ? a.key_points : [];
      if (kp.length) {
        parts.push(`핵심: ${kp.slice(0, 4).join(" · ")}`);
      }
    }

  } catch (err) {
    if (!isMissingMemoryTable(err)) throw err;
    return "";
  }

  if (!parts.length) return "";
  return `브랜드 지식(원문·문장 복사 금지, 이해·맥락만): ${parts.join(" | ")}`.slice(
    0,
    2400
  );
}
