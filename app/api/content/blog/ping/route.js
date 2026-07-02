import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** prod blogApiHandler 로드 진단 — import 실패 시 JSON으로 원인 반환 */
export async function GET() {
  try {
    const mod = await import("@/lib/generation/blogApiHandler");
    return NextResponse.json({
      ok: true,
      hasRun: typeof mod.runBlogApiGeneration === "function",
    });
  } catch (err) {
    console.error("[blog-ping]", err);
    return NextResponse.json(
      {
        ok: false,
        code: "blog_handler_import_failed",
        message: err?.message || String(err),
        stack: err?.stack?.split("\n").slice(0, 12) || [],
      },
      { status: 500 }
    );
  }
}
