/**
 * JSON·학습 프로필에서 온 패턴을 RegExp로 안전 변환
 */
export function asRegExp(pattern) {
  if (pattern instanceof RegExp) return pattern;
  if (typeof pattern !== "string" || !pattern.trim()) return null;
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

export function normalizeRegexList(list = []) {
  if (!Array.isArray(list)) return [];
  return list.map(asRegExp).filter(Boolean);
}

export function regexTest(pattern, text = "") {
  const re = asRegExp(pattern);
  if (!re) return false;
  return re.test(String(text || ""));
}

export function mergeRegexProfile(defaults = {}, learned = {}) {
  const next = { ...defaults, ...learned };
  if (learned.arcMarkers && defaults.arcMarkers) {
    next.arcMarkers = {
      gi: normalizeRegexList(learned.arcMarkers.gi ?? defaults.arcMarkers.gi),
      seung: normalizeRegexList(learned.arcMarkers.seung ?? defaults.arcMarkers.seung),
      jeon: normalizeRegexList(learned.arcMarkers.jeon ?? defaults.arcMarkers.jeon),
      gyeol: normalizeRegexList(learned.arcMarkers.gyeol ?? defaults.arcMarkers.gyeol),
    };
  } else if (defaults.arcMarkers) {
    next.arcMarkers = {
      gi: normalizeRegexList(defaults.arcMarkers.gi),
      seung: normalizeRegexList(defaults.arcMarkers.seung),
      jeon: normalizeRegexList(defaults.arcMarkers.jeon),
      gyeol: normalizeRegexList(defaults.arcMarkers.gyeol),
    };
  }
  if (defaults.voiceEndings || learned.voiceEndings) {
    const ve = { ...defaults.voiceEndings, ...learned.voiceEndings };
    next.voiceEndings = {
      haeyo: asRegExp(ve.haeyo) || defaults.voiceEndings?.haeyo,
      hamnida: asRegExp(ve.hamnida) || defaults.voiceEndings?.hamnida,
      banmal: asRegExp(ve.banmal) || defaults.voiceEndings?.banmal,
    };
  }
  if (defaults.openerClosersBad || learned.openerClosersBad) {
    next.openerClosersBad = normalizeRegexList(
      learned.openerClosersBad ?? defaults.openerClosersBad
    );
  }
  return next;
}
