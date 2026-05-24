/**
 * 민감 업종 사후 검증 — 정규식·휴리스틱 (법령 DB 아님)
 */
import { cleanOutputText } from "@/utils/sanitizeInput";

const BANNED_BY_TYPE = {
  medical: [
    { re: /완치|치료\s*보장|부작용\s*없|100\s*%|백퍼|효과\s*보장|즉각\s*호전|재발\s*없/g, id: "medical_guarantee" },
    { re: /수술\s*후\s*\d+\s*일\s*만에|비교\s*우월.*치료/g, id: "medical_outcome" },
  ],
  pharmacy: [
    { re: /처방\s*없이|이\s*약(을|은)?\s*(드시|복용|구매)|특정\s*의약품/g, id: "rx_push" },
    { re: /완치|치료\s*효과\s*보장/g, id: "pharmacy_cure" },
  ],
  legal: [
    { re: /무조건\s*승소|100\s*%.*승소|반드시\s*이김|형량\s*감형\s*보장/g, id: "legal_outcome" },
    { re: /법률\s*자문|판결\s*예측|이\s*사건은\s*반드시/g, id: "legal_advice" },
  ],
  real_estate: [
    { re: /반드시\s*오른|가격\s*상승\s*보장|수익\s*보장|확정\s*매칭|무조건\s*계약/g, id: "re_yield" },
    { re: /허위\s*매물\s*없|100\s*%.*실매물/g, id: "re_absolute" },
  ],
  financial: [
    { re: /원금\s*보장|수익\s*보장|무조건\s*수익|최고\s*수익률|확정\s*수익/g, id: "fin_guarantee" },
  ],
  tax: [
    { re: /무조건\s*환급|절세\s*보장|세금\s*안\s*냄|100\s*%.*환급/g, id: "tax_guarantee" },
  ],
};

const GLOBAL_SENSITIVE = [
  { re: /(무조건|반드시\s*된다|100\s*%|완벽\s*해결)/g, id: "absolute_claim" },
];

const PLACEHOLDER_JUNK =
  /\b(undefined|null|placeholder|lorem|TODO)\b|좋은내용|브랜드명|지역명|\[브랜드\]/i;

/**
 * @param {string} text
 * @param {ReturnType<import('./sensitiveCategories.js').resolveSensitiveCompliance>} compliance
 */
export function runSensitiveComplianceScan(text, compliance) {
  if (!compliance?.isSensitive) {
    return {
      pass: true,
      warnings: [],
      violations: [],
      isJunk: false,
      needsRegen: false,
    };
  }

  const content = cleanOutputText(text || "");
  const violations = [];
  const types = compliance.types || [];

  for (const t of types) {
    for (const { re, id } of BANNED_BY_TYPE[t] || []) {
      re.lastIndex = 0;
      const m = content.match(re);
      if (m?.length) {
        violations.push({
          type: t,
          id,
          samples: [...new Set(m)].slice(0, 3),
        });
      }
    }
  }

  for (const { re, id } of GLOBAL_SENSITIVE) {
    re.lastIndex = 0;
    const m = content.match(re);
    if (m?.length) {
      violations.push({ type: "global", id, samples: [...new Set(m)].slice(0, 3) });
    }
  }

  const isJunk = PLACEHOLDER_JUNK.test(content) || content.length < 200;

  const warnings = violations.map((v) => {
    const label =
      v.type === "medical"
        ? "의료 과장·보장 표현"
        : v.type === "pharmacy"
          ? "약국·의약 권유 표현"
          : v.type === "legal"
            ? "법률 결과 단정"
            : v.type === "real_estate"
              ? "부동산 수익·가격 단정"
              : v.type === "financial"
                ? "금융 수익 보장"
                : v.type === "tax"
                  ? "세무·환급 보장"
                  : "단정·과장 표현";
    return `${label}: "${(v.samples || [])[0] || ""}" 등 — 전문가 확인·완화 권장`;
  });

  return {
    pass: violations.length === 0,
    warnings,
    violations,
    isJunk,
    needsRegen: violations.length > 0 && !isJunk,
    userBanner:
      violations.length > 0
        ? "법·의료·부동산 등 민감 정보가 포함될 수 있습니다. 게시 전 반드시 해당 분야 전문가에게 확인해 주세요."
        : compliance.userBadge,
  };
}
