import { buildDetailPagePublicSample } from "@/lib/product/detailPagePublicSample";

export const runtime = "nodejs";

/** 로그인 없이 붙일 860 HTML만. 사이트 크롬 없음. */
export function GET() {
  const sample = buildDetailPagePublicSample();
  return new Response(sample.documentHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
