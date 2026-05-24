import { cleanOutputText } from "./sanitizeInput";

export const GPT_TONE_PATTERNS = [
  { pattern: /소개해\s*드릴게요/gi, replace: "" },
  { pattern: /추천\s*드립니다/gi, replace: "" },
  { pattern: /정리하자면/gi, replace: "마지막으로" },
  { pattern: /체크해\s*보세요/gi, replace: "한번 보시면 좋아요" },
  { pattern: /검색하시는\s*분들/gi, replace: "찾으시는 분" },
  { pattern: /도움이\s*되길\s*바라요/gi, replace: "" },
  { pattern: /참고가\s*되시길/gi, replace: "" },
  { pattern: /알아보시다\s*보면/gi, replace: "살펴보시면" },
  { pattern: /체크리스트/gi, replace: "확인 포인트" },
  { pattern: /~을\(를\)/g, replace: "" },
];

export function detectGptTone(text) {
  const t = String(text || "");
  const hits = GPT_TONE_PATTERNS.filter(({ pattern }) => pattern.test(t)).map(
    (p) => p.pattern.source
  );
  return { hasGptTone: hits.length > 0, hits };
}

export function scrubGptTone(text) {
  if (!text) return "";
  let t = String(text);
  for (const { pattern, replace } of GPT_TONE_PATTERNS) {
    t = t.replace(pattern, replace);
  }
  return cleanOutputText(t.replace(/\s{2,}/g, " "));
}

export function scrubGptToneDeep(text) {
  const once = scrubGptTone(text);
  const twice = scrubGptTone(once);
  return twice;
}
