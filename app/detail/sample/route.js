export const runtime = "nodejs";

/** 상세 공개 샘플 비활성 — 홈으로 돌려보낸다. */
export function GET(request) {
  return Response.redirect(new URL("/", request.url), 307);
}
