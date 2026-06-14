/**
 * 랜딩 전용 정적 샘플 — 저장·AI 호출 없음
 * 대표 장문 샘플 — 접속마다 순환 (품질 점수는 내부용)
 */

import { FEATURED_SAMPLE_SEEDS } from "@/lib/landing/featuredSampleSeeds";
import { FEATURED_SAMPLE_SEEDS_EXTRA } from "@/lib/landing/featuredSampleSeedsExtra";

const ALL_FEATURED_SAMPLE_SEEDS = [
  ...FEATURED_SAMPLE_SEEDS,
  ...FEATURED_SAMPLE_SEEDS_EXTRA,
];

const DEFAULT_QUALITY = 90;

function countChars(text) {
  return String(text || "").replace(/\s/g, "").length;
}

function blogBodyFromSeed(seed) {
  if (seed.blogSections?.length) {
    const parts = seed.blogSections.map(
      (s) => `${s.heading}\n\n${s.body}`.trim()
    );
    if (seed.blogConclusion) parts.push(seed.blogConclusion);
    return parts.join("\n\n");
  }
  return seed.blogBody || seed.blogExcerpt || "";
}

/**
 * @param {import('@/lib/landing/featuredSampleSeeds').FEATURED_SAMPLE_SEEDS[0]} seed
 */
function makeSample(seed) {
  const score = seed.qualityScore ?? DEFAULT_QUALITY;
  const blogBody = blogBodyFromSeed(seed);
  const blogChars = countChars(blogBody);
  const placeBody = [seed.placeShort, seed.placeDetail].filter(Boolean).join("\n\n");
  const instaBody = seed.instaBody || "";

  return {
    id: seed.id,
    brand: { name: seed.name, region: seed.region },
    topic: seed.topic,
    channelsLabel: "블로그 / 플레이스 / 인스타그램",
    qualityScore: score,
    blog: {
      title: seed.blogTitle,
      excerpt: seed.blogExcerpt,
      body: blogBody,
      sections: seed.blogSections || [],
      conclusion: seed.blogConclusion || "",
      charCount: blogChars,
      qualityScore: score,
      charHint: seed.charHint
        ? `${seed.charHint} · 본문 약 ${blogChars.toLocaleString()}자`
        : `본문 약 ${blogChars.toLocaleString()}자 · 발행 전 읽기 쉽게 정리된 장문`,
    },
    place: {
      title: seed.placeTitle,
      short: seed.placeShort,
      detail: seed.placeDetail,
      charCount: countChars(placeBody),
      qualityScore: score,
    },
    insta: {
      body: instaBody,
      charCount: countChars(instaBody),
      qualityScore: score,
    },
  };
}

export const LANDING_SAMPLE_SETS = ALL_FEATURED_SAMPLE_SEEDS.map(makeSample);

/** @alias LANDING_SAMPLE_SETS */
export const LANDING_SAMPLES = LANDING_SAMPLE_SETS;

export const LANDING_SAMPLE = LANDING_SAMPLE_SETS[0];

export function getLandingSampleByIndex(index) {
  const sets = LANDING_SAMPLE_SETS;
  const i = ((index % sets.length) + sets.length) % sets.length;
  return sets[i];
}

export const DEMO_FLOW_STEPS = [
  { title: "1. 브랜드 정하기", hint: "이름 · 지역 · 말투를 한 번만 저장해요" },
  { title: "2. 오늘의 주제", hint: "신메뉴 · 행사 · 계절 소식 한 줄이면 돼요" },
  { title: "3. 이야기 쓰기", hint: "긴 글을 먼저 맞춰 씁니다 · 읽기 쉽게 다듬어 드려요" },
  { title: "4. 플레이스 · 인스타", hint: "같은 주제로 짧은 문장까지 이어져요" },
  { title: "5. 복사해서 올리기", hint: "네이버 · 플레이스 · 인스타에 직접 붙여 넣어요" },
];

export const WORKFLOW_STEPS = [
  {
    n: "01",
    title: "브랜드 · 지역",
    desc: "가게 이름과 말투를 정해 두면, 다음 글도 같은 목소리로 이어집니다.",
  },
  {
    n: "02",
    title: "오늘의 주제",
    desc: "이번 주 소식 한 줄만 넣어도 글 방향이 잡혀요.",
  },
  {
    n: "03",
    title: "이야기 쓰기",
    desc: "네이버형 긴 글을 먼저 씁니다. 키워드와 장면도 함께 맞춰요.",
  },
  {
    n: "04",
    title: "플레이스 · 인스타",
    desc: "한 줄 공지와 캡션은 이야기를 바탕으로 짧게 정리돼요.",
  },
  {
    n: "05",
    title: "확인 · 복사",
    desc: "읽기 편한지 본 뒤, 각 앱에 붙여 넣으면 됩니다.",
  },
];

export const WHY_BRICLOG = [
  {
    title: "브랜드가 쌓여요",
    desc: "말투와 주제가 겹겹이 남아, 다음 글도 같은 결로 이어져요.",
  },
  {
    title: "한 주제, 세 채널",
    desc: "이야기 한 번이면 플레이스 · 인스타까지 이어집니다. 필요하면 썸네일 문구도 이어서 받을 수 있어요.",
  },
  {
    title: "발행 준비도가 보여요",
    desc: "브랜드·지역·주제·근거를 축별로 점검해, 복사해 올려도 되는지 숫자와 이유로 알려 드립니다.",
  },
  {
    title: "기록이 남는 운영",
    desc: "지난 글 기록과 작업실에서 주제를 보고 다시 쓸 수 있어요.",
  },
];

export const CHANNEL_CARDS = [
  {
    id: "blog",
    label: "이야기",
    desc: "블로그·네이버용 긴 글",
    accent: "bg-[#E8F9EF] text-[#03A94D]",
  },
  {
    id: "place",
    label: "플레이스",
    desc: "공지·한 줄 소식",
    accent: "bg-[#F0F7FF] text-[#3182F6]",
  },
  {
    id: "insta",
    label: "인스타 캡션",
    desc: "피드·해시태그",
    accent: "bg-[#FFF8F0] text-[#E67700]",
  },
  {
    id: "image",
    label: "프롬프트",
    desc: "썸네일·카드 문구",
    accent: "bg-[#F7F8FA] text-[#4E5968]",
  },
];

/**
 * @param {typeof LANDING_SAMPLE_SETS[0]} sample
 */
export function getChannelSnippetsFromSample(sample) {
  const instaLine =
    sample.insta.body.split("\n").find((l) => l.trim()) ?? sample.topic;
  const blogLead =
    sample.blog.excerpt ||
    sample.blog.body?.split("\n").find((l) => l.trim()) ||
    sample.blog.title;
  return {
    blog: `${blogLead}`.slice(0, 88),
    place: `${sample.place.short}`.slice(0, 88),
    insta: instaLine.slice(0, 88),
    image: `${sample.brand.name} · ${sample.topic}`,
  };
}
