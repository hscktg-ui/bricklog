const MECHANICAL_STORE_HOOK_RE =
  /(?:^|[^\n]){0,48}매장[^\n]{2,56}—|[^\n]{4,40}볼\s*때[^\n]{0,40}—/;

function isMechanicalStoreHook(sentence, input = {}) {
  const s = String(sentence || "").trim();
  if (!MECHANICAL_STORE_HOOK_RE.test(s)) return false;
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  if (region && s.includes(region)) return true;
  if (brand && s.includes(brand)) return true;
  return /매장/.test(s) && /—/.test(s);
}

/** region·매장 — 템플릿 훅 문장은 팩당 1회만 유지 */
export function collapseMechanicalHookFlood(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  let storeHookKept = 0;
  const processText = (text) => {
    const parts = String(text || "")
      .split(/(?<=[.!?。])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.replace(/\s/g, "").length >= 8);
    const out = [];
    for (const s of parts) {
      if (!isMechanicalStoreHook(s, input)) {
        out.push(s);
        continue;
      }
      if (storeHookKept >= 1) continue;
      storeHookKept += 1;
      out.push(s);
    }
    return out.length ? out.join("\n\n").trim() : String(text || "").trim();
  };
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      body: processText(sec.body),
    })),
  };
}
