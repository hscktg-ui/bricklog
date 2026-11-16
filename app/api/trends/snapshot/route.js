import { NextResponse } from "next/server";
import { getTrendCatalog } from "@/lib/trends/catalog";
import { loadSnapshot, listSnapshotDates } from "@/lib/trends/storage";
import { kstDateString } from "@/lib/trends/collectors/base";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function catalogAsSnapshot(catalog) {
  if (!catalog?.items?.length) return null;
  return {
    source: "trend_catalog",
    mode: catalog.mode,
    dateKst: kstDateString(catalog.updatedAt || new Date()),
    updatedAt: catalog.updatedAt || null,
    live: catalog.live || null,
    note: catalog.note || null,
    items: (catalog.topItems || catalog.items).slice(0, 20).map((item) => ({
      slug: item.slug,
      name: item.name,
      category: item.category,
      trendScore: item.trendScore,
      currentRank: item.currentRank,
      hourlyChange: item.hourlyChange,
      status: item.status,
      updatedAt: item.updatedAt,
      isSample: Boolean(item.isSample),
      isLive: Boolean(item.isLive),
      freshnessLabel: item.freshnessLabel || null,
    })),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || kstDateString();
    let snapshot = loadSnapshot(date);
    if (!snapshot) snapshot = loadSnapshot();

    if (snapshot) {
      return NextResponse.json({
        snapshot,
        availableDates: listSnapshotDates(),
        source: "file",
      });
    }

    const catalog = await getTrendCatalog();
    const derived = catalogAsSnapshot(catalog);
    if (derived) {
      return NextResponse.json({
        snapshot: derived,
        availableDates: listSnapshotDates(),
        source: "catalog",
        message: "file_snapshot_missing_using_catalog",
      });
    }

    return NextResponse.json({
      snapshot: null,
      availableDates: listSnapshotDates(),
      message: "no_snapshot_run_collect_first",
    });
  } catch (err) {
    return NextResponse.json(
      {
        snapshot: null,
        availableDates: [],
        message: "snapshot_unavailable",
        error:
          process.env.NODE_ENV === "development"
            ? String(err?.message || err)
            : undefined,
      },
      { status: 200 }
    );
  }
}
