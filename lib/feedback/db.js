export function isMissingFeedbackTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /content_events|content_feedback|brand_learning_profiles|user_writing_profiles|global_quality_insights|data_asset_registry|brand_data_assets/i.test(
      msg
    )
  );
}
