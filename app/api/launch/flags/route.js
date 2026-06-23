import { NextResponse } from "next/server";
import {
  getPublicResetLaunchFlags,
} from "@/lib/config/resetLaunchFlags";
import {
  BRICLOG_DEFAULTS_VERSION,
  BRICLOG_PRODUCT,
  BRICLOG_PIPELINE_DEFAULTS,
  isDefaultAsyncBlogGeneration,
} from "@/lib/config/briclogDefaults";
import { isLaunchPublishFirstMode } from "@/lib/config/launchPublishFlags";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    defaultsVersion: BRICLOG_DEFAULTS_VERSION,
    product: BRICLOG_PRODUCT,
    pipeline: {
      ...BRICLOG_PIPELINE_DEFAULTS,
      launchPublishFirst: isLaunchPublishFirstMode(),
      asyncBlog: isDefaultAsyncBlogGeneration(),
    },
    reset: getPublicResetLaunchFlags(),
  });
}
