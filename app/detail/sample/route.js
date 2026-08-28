import { buildDetailPagePublicSample } from "@/lib/product/detailPagePublicSample";

export const runtime = "nodejs";

/** 로그인 없이 보는 HTML 상세. 사이트 크롬 없음. ?id=open-rice|open-beans */
export function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  const sample = buildDetailPagePublicSample(id);
  return new Response(sample.documentHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": process.env.NODE_ENV === "production"
        ? "public, max-age=300, stale-while-revalidate=3600"
        : "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
