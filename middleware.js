import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/api/auth";
import { createServerSupabase, getBearerToken } from "@/lib/supabase/server";

const APEX_HOST = "briclog.ai";

function normalizeHost(host = "") {
  return host.split(",")[0].trim().toLowerCase();
}

export async function middleware(request) {
  const host = normalizeHost(
    request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  );

  if (host === `www.${APEX_HOST}`) {
    const url = request.nextUrl.clone();
    url.host = APEX_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    const supabase = createServerSupabase(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email || !isAdminEmail(data.user.email)) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|og.png|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
