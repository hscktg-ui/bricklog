import { sanitizeText, parsePhraseList } from "@/utils/sanitizeInput";

/**
 * 위치 정보 — 확인된 데이터만. 추측·임의 생성 금지.
 */

export function buildLocationIntel(input = {}, collected = null) {
  const user = {
    address: sanitizeText(input.address || input.region),
    phone: sanitizeText(input.phone),
    hours: sanitizeText(input.hours || input.operatingHours),
    parking: sanitizeText(input.parking),
    building: sanitizeText(input.building),
    branchName: sanitizeText(input.branchName || input.brandName),
  };

  const fromCollect = collected || {};
  const fields = {
    address: mergeField(user.address, fromCollect.address, 0.95),
    phone: mergeField(user.phone, fromCollect.phone, 0.92),
    hours: mergeField(user.hours, fromCollect.hours, 0.6),
    parking: mergeField(user.parking, fromCollect.parking, 0.7),
    region: mergeField(user.address, fromCollect.region, 0.85),
    building: mergeField(user.building, fromCollect.building, 0.75),
  };

  const confirmed = Object.entries(fields)
    .filter(([, v]) => v.confirmed)
    .map(([k, v]) => ({ key: k, value: v.value, confidence: v.confidence }));

  const areaSeo = extractAreaTokens(fields.address?.value || user.address);

  return {
    fields,
    confirmed,
    areaSeo,
    hasAddress: Boolean(fields.address?.confirmed),
    hasPhone: Boolean(fields.phone?.confirmed),
    disclaimer: "미확인 항목은 본문에 삽입하지 않음",
  };
}

function mergeField(userVal, collectedVal, collectedConfidence) {
  if (userVal) {
    return { value: userVal, confidence: 1, source: "user", confirmed: true };
  }
  if (collectedVal && collectedConfidence >= 0.7) {
    return {
      value: collectedVal,
      confidence: collectedConfidence,
      source: "collected",
      confirmed: true,
    };
  }
  if (collectedVal) {
    return {
      value: collectedVal,
      confidence: collectedConfidence,
      source: "collected_low",
      confirmed: false,
    };
  }
  return { value: null, confidence: 0, source: null, confirmed: false };
}

function extractAreaTokens(address) {
  if (!address) return [];
  const tokens = [];
  const gu = address.match(/(\S+[구군시])/g);
  if (gu) tokens.push(...gu);
  const dong = address.match(/(\S+동)/g);
  if (dong) tokens.push(...dong);
  return [...new Set(tokens)].slice(0, 5);
}

export function formatLocationBlock(intel, options = {}) {
  const lines = [];
  const opts = options;
  if (opts.address && intel.fields.address?.confirmed) {
    lines.push(`■ 위치\n${intel.fields.address.value}`);
  }
  if (opts.phone && intel.fields.phone?.confirmed) {
    lines.push(`■ 문의\n${intel.fields.phone.value}`);
  }
  if (opts.hours && intel.fields.hours?.confirmed) {
    lines.push(`■ 운영시간\n${intel.fields.hours.value}`);
  }
  if (opts.parking && intel.fields.parking?.confirmed) {
    lines.push(`■ 주차\n${intel.fields.parking.value}`);
  }
  return lines.join("\n\n");
}

export function naturalLocationLine(intel) {
  if (!intel.fields.address?.confirmed) return null;
  const addr = intel.fields.address.value;
  if (/역/.test(addr)) {
    return `${addr.split(" ")[0]} 인근에 위치해 퇴근 후에도 방문하기 편합니다.`;
  }
  if (intel.areaSeo?.length) {
    return `${intel.areaSeo[0]} 일대에 계시다면 들르기 편한 위치입니다.`;
  }
  return `${addr} 근처에서 방문하시기 편합니다.`;
}

export async function collectPublicLocation(brandName, region) {
  /** API 연동 전 — 빈 수집만 반환 (추측 금지) */
  return {
    ok: false,
    source: "naver_place_pending",
    address: null,
    phone: null,
    hours: null,
    parking: null,
    region: region || null,
    building: null,
    error: "NAVER_PLACE_API_NOT_CONFIGURED",
  };
}
