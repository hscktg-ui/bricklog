import { ABSTRACT_INSTA_SAMPLES } from "./industryAbstractExamples";

export const INSTA_STYLE_HINTS = [
  "지점 인스타: 오픈(📍·-·이모지) / 감성일상 / 제품(✔) / 클래스 / 프로모(📅)",
  "1~2문장마다 줄바꿈, 체험후기·「다녀왔어요」 연속 금지",
  "지역+업종 해시태그 (#일산꽃집 형태)",
  "이모지 2~5개 — 과하지 않게",
  "전문가 패널: 훅·줄바꿈·해시태그·저장형 마무리",
  "플레이스 공지체(안내드립니다·영업시간) 금지",
  "블로그·SEO 문장 차단",
];

const instaRhythm = ABSTRACT_INSTA_SAMPLES.flower.split("\n");
export const INSTA_RHYTHM_SAMPLE = {
  hook: instaRhythm[0] || "생각보다 꽃은",
  body: instaRhythm[1] || "기분을 빨리 바꾼다",
  ending: "",
};
