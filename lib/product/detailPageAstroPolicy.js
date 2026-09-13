function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDetailPageAstroSource(value) {
  const source = cleanLine(value).toLowerCase();
  if (!source || source === "form") return "";
  return source;
}

export function sanitizeDetailPageAstroInput(body = {}, action = "generate") {
  const sourceChannel = normalizeDetailPageAstroSource(
    body.sourceChannel || body.pack?._meta?.astro?.sourceChannel
  );
  const continuityCopy = cleanLine(
    body.continuityCopy || body.pack?._meta?.astro?.continuity
  ).slice(0, 120);
  const astroAllowed =
    action === "generate" &&
    ["blog", "place", "instagram"].includes(sourceChannel) &&
    continuityCopy.length >= 8;

  return {
    ...body,
    detailPageAstro: undefined,
    sourceChannel: astroAllowed ? sourceChannel : "",
    continuityCopy: astroAllowed ? continuityCopy : "",
  };
}
