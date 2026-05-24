import { isMissingFeedbackTable } from "@/lib/feedback/db";

export function isMissingDataAssetTable(err) {
  const msg = String(err?.message || err?.code || "");
  if (isMissingFeedbackTable(err)) return true;
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /data_asset_registry|brand_data_assets/i.test(msg)
  );
}
