export function isBrandFirstEngineEnabled() {
  if (process.env.BRICLOG_BRAND_FIRST_ENGINE === "0") return false;
  return (
    process.env.BRICLOG_BRAND_FIRST_ENGINE === "1" ||
    process.env.NODE_ENV === "production"
  );
}

export function isStrictBrandGuardEnabled() {
  return process.env.BRICLOG_STRICT_BRAND_GUARD === "1";
}

export function shouldApplyStrictBrandGuard(input = {}) {
  if (!isStrictBrandGuardEnabled()) return false;
  return Boolean(input?.brandId || input?.brandMemory);
}

export function isOfficialSourceFirstEnabled() {
  return process.env.BRICLOG_OFFICIAL_SOURCE_FIRST === "1";
}
