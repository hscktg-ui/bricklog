/**
 * 상세페이지 출고물은 이미지다. HTML은 그 이미지를 그리는 원판.
 * PNG 헤더로 860 화면인지 본다. 1px 점·빈 칸은 이미지가 아니다.
 */
export const DETAIL_PAGE_PAGE_IMAGE_VERSION = "gollaboda-page-image-v1";

export const DETAIL_PAGE_PAGE_IMAGE_MIN = Object.freeze({
  width: 800,
  height: 600,
  bytes: 12_000,
});

function asBuffer(raw) {
  if (!raw) return null;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) {
    return typeof Buffer !== "undefined" ? Buffer.from(raw) : raw;
  }
  if (typeof raw === "string" && raw.startsWith("data:image")) {
    const part = raw.split(",")[1] || "";
    return typeof Buffer !== "undefined"
      ? Buffer.from(part, "base64")
      : Uint8Array.from(atob(part), (c) => c.charCodeAt(0));
  }
  return null;
}

function readUInt32BE(buf, offset) {
  if (typeof buf.readUInt32BE === "function") return buf.readUInt32BE(offset);
  return (
    (buf[offset] << 24) |
    (buf[offset + 1] << 16) |
    (buf[offset + 2] << 8) |
    buf[offset + 3]
  ) >>> 0;
}

export function inspectPngBuffer(raw) {
  const buf = asBuffer(raw);
  if (!buf || buf.length < 24) {
    return { ok: false, reason: "empty" };
  }
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    return { ok: false, reason: "not_png", bytes: buf.length };
  }
  const width = readUInt32BE(buf, 16);
  const height = readUInt32BE(buf, 20);
  const min = DETAIL_PAGE_PAGE_IMAGE_MIN;
  const ok = width >= min.width && height >= min.height && buf.length >= min.bytes;
  return {
    ok,
    width,
    height,
    bytes: buf.length,
    reason: ok ? "" : "too_small",
  };
}

/**
 * @param {{ hero?: unknown, mid?: unknown, full?: unknown }} [screenshots]
 */
export function inspectDetailPageScreenshots(screenshots = {}) {
  const hero = inspectPngBuffer(screenshots.hero);
  const mid = inspectPngBuffer(screenshots.mid);
  const full = inspectPngBuffer(screenshots.full);
  const ok = hero.ok || full.ok;
  return {
    version: DETAIL_PAGE_PAGE_IMAGE_VERSION,
    ok,
    lookedAtImage: ok,
    hero,
    mid,
    full,
  };
}
