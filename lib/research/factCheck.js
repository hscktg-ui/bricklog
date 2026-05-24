import { cleanOutputText, parsePhraseList } from "@/utils/sanitizeInput";

const RISKY_PATTERNS = [
  { re: /\d{1,3}(,\d{3})*\s*원/g, label: "가격" },
  { re: /24\s*시간|24시간/g, label: "24시간 운영", needsInput: /24|무인|시간/ },
  { re: /신규\s*오픈|그랜드\s*오픈/g, label: "신규오픈", needsInput: /오픈|신규/ },
  { re: /\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}/g, label: "운영시간" },
  { re: /(완치|100%|부작용\s*없|치료\s*보장|효과\s*보장)/g, label: "의료 과장" },
  { re: /(최고|1등|1위|무조건)/g, label: "과장 광고" },
];

const ADDRESS_HINT = /(로\s*\d|길\s*\d|번지|동\s*\d)/;

/**
 * Mock 사실 검증 — 향후 검색 API 연동 시 verifiedFacts 확장
 */
export function runFactCheck(text, input = {}) {
  const content = cleanOutputText(text);
  const includeBlob = [
    input.includePhrases,
    input.includeList?.join(" "),
    input.storeFeatures,
    input.benefit,
    input.brandDescription,
  ]
    .filter(Boolean)
    .join(" ");

  const verifiedFacts = parsePhraseList(includeBlob).map((f) => ({
    claim: f,
    status: "user_provided",
  }));

  const unverifiedClaims = [];
  const riskyClaims = [];
  const suggestedFixes = [];

  for (const { re, label, needsInput } of RISKY_PATTERNS) {
    const matches = content.match(re);
    if (!matches?.length) continue;

    for (const m of [...new Set(matches)]) {
      const allowed = needsInput ? needsInput.test(includeBlob) : false;
      if (allowed) {
        verifiedFacts.push({ claim: m, status: "input_confirmed" });
      } else {
        riskyClaims.push({ claim: m, type: label });
        suggestedFixes.push({
          original: m,
          suggestion: "삭제 또는 '문의 시 안내' 등 완화 표현",
        });
      }
    }
  }

  if (ADDRESS_HINT.test(content) && !/주소|위치|찾아오/.test(includeBlob)) {
    unverifiedClaims.push({
      claim: "주소·상세 위치 언급",
      type: "address",
    });
    suggestedFixes.push({
      original: "주소 단정",
      suggestion: "지역명만 유지하거나 '플레이스에서 위치 확인'으로 완화",
    });
  }

  return {
    verifiedFacts,
    unverifiedClaims,
    riskyClaims,
    suggestedFixes,
    pass: riskyClaims.length === 0 && unverifiedClaims.length === 0,
    mode: "mock",
  };
}

/** 위험 주장을 본문에서 완화 제거 */
export function applyFactCheckFixes(text, factCheck) {
  if (!text || !factCheck?.riskyClaims?.length) return text;
  let t = text;
  for (const r of factCheck.riskyClaims) {
    if (r.claim) t = t.replaceAll(r.claim, "");
  }
  return cleanOutputText(t.replace(/\n{3,}/g, "\n\n"));
}
