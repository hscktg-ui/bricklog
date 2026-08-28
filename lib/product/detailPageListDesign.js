/**
 * 상세 특징 리스트 → 화면 모듈.
 * 문장으로 풀어 쓰지 않는다. 짧은 이름 · 한 줄 힌트만.
 */
export function countNoSpace(text) {
  return String(text || "").replace(/\s/g, "").length;
}

export function firstSentence(text) {
  const parts = String(text || "")
    .split(/(?<=다\.|요\.|니다\.|까\?)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] || String(text || "").trim();
}

export function splitDesignedListItem(text) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return null;
  const dash = raw.split(/\s+[—–]\s+/);
  if (dash.length >= 2 && dash[0].length <= 28) {
    return { label: dash[0].trim(), hint: dash.slice(1).join(" — ").trim() };
  }
  const colon = raw.indexOf(":");
  if (colon > 0 && colon <= 18) {
    return {
      label: raw.slice(0, colon).trim(),
      hint: raw.slice(colon + 1).trim(),
    };
  }
  if (countNoSpace(raw) <= 22 && !/[다요]$/.test(raw)) {
    return { label: raw, hint: "" };
  }
  return { label: "", hint: raw };
}

export function designedListItems(list, limit = 6) {
  return (list || [])
    .map(splitDesignedListItem)
    .filter(Boolean)
    .slice(0, limit);
}

export function isEssayBullet(text) {
  return countNoSpace(text) > 28 || /다\.|요\.|니다/.test(String(text || ""));
}

export function isEssayBulletList(list) {
  const items = (list || []).filter(Boolean);
  if (!items.length) return true;
  const essays = items.filter(isEssayBullet).length;
  return essays >= Math.ceil(items.length * 0.6);
}

/** 카드·순서칸에 올릴 짧은 이름만. 같은 말은 한 번. */
export function uniqueShortLabels(list, limit = 5) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const item = splitDesignedListItem(raw);
    const label =
      item?.label ||
      (item?.hint && countNoSpace(item.hint) <= 22 ? item.hint : "");
    if (!label) continue;
    const key = label.replace(/\s/g, "").slice(0, 16);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}
