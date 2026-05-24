import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/api/auth";
import { createServerSupabase, getBearerToken } from "@/lib/supabase/server";

export async function middleware(request) {
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
  matcher: ["/api/admin/:path*", "/admin", "/admin/:path*"],
};
