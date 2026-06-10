import { NextResponse } from "next/server";
import {
  getPublicResetLaunchFlags,
} from "@/lib/config/resetLaunchFlags";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    reset: getPublicResetLaunchFlags(),
  });
}
