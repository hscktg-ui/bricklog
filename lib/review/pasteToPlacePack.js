/**
 * 붙여넣은 플레이스 초안 → 검수용 pack
 */

/**
 * @param {string} raw
 * @param {{ title?: string, short?: string, detail?: string }} [fields]
 */
export function pastedTextToPlacePack(raw, fields = {}) {
  const title = String(fields.title || "").trim();
  const short = String(fields.short || "").trim();
  const detail = String(fields.detail || "").trim();

  if (title || short || detail) {
    const shortNotice = short || detail.slice(0, 120);
    return {
      title: title || shortNotice.slice(0, 40) || "플레이스 소개",
      shortNotice,
      shortBody: shortNotice,
      detailBody: detail && detail !== short ? detail : "",
      cta: "지금 확인해 보세요.",
      hashtags: [],
    };
  }

  const text = String(raw || "").trim();
  if (!text) {
    return {
      title: "",
      shortNotice: "",
      shortBody: "",
      detailBody: "",
      cta: "",
      hashtags: [],
    };
  }

  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const first = blocks[0] || "";
  const second = blocks[1] || "";
  const rest = blocks.slice(2).join("\n\n");

  let placeTitle = first;
  let shortNotice = second || first;
  let detailBody = rest;

  if (blocks.length === 1) {
    const lines = first.split("\n").map((l) => l.trim()).filter(Boolean);
    placeTitle = lines[0]?.slice(0, 50) || "플레이스 소개";
    shortNotice = lines.slice(1).join(" ") || lines[0] || "";
    detailBody = "";
  } else if (blocks.length === 2 && second.length > first.length * 1.5) {
    placeTitle = first.slice(0, 50);
    shortNotice = second.slice(0, 200);
    detailBody = "";
  }

  return {
    title: placeTitle,
    shortNotice,
    shortBody: shortNotice,
    detailBody,
    cta: "지금 확인해 보세요.",
    hashtags: [],
  };
}
