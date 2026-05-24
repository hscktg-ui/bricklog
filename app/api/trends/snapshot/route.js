import { NextResponse } from "next/server";
import { loadSnapshot, listSnapshotDates } from "@/lib/trends/storage";
import { kstDateString } from "@/lib/trends/collectors/base";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || kstDateString();
  let snapshot = loadSnapshot(date);
  if (!snapshot) snapshot = loadSnapshot();

  if (!snapshot) {
    return NextResponse.json({
      snapshot: null,
      availableDates: listSnapshotDates(),
      message: "no_snapshot_run_collect_first",
    });
  }

  return NextResponse.json({
    snapshot,
    availableDates: listSnapshotDates(),
  });
}
