/**
 * 랜딩 전용 정적 샘플 — 저장·AI 호출 없음
 * 대표 장문 샘플 — 접속마다 순환 (품질 점수는 내부용)
 */

import { FEATURED_SAMPLE_SEEDS } from "@/lib/landing/featuredSampleSeeds";
import { FEATURED_SAMPLE_SEEDS_EXTRA } from "@/lib/landing/featuredSampleSeedsExtra";
import {
  buildLandingChannelPacks,
  toLandingInstaUi,
  toLandingPlaceUi,
} from "@/lib/publicTest/buildPublicTestChannelPacks";

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
  const blogPack = {
    title: seed.blogTitle,
    sections: seed.blogSections || [],
    conclusion: seed.blogConclusion || "",
    hashtags: [],
  };
  const channels = buildLandingChannelPacks(seed, blogPack);
  const place = toLandingPlaceUi(channels.place, seed);
  const insta = toLandingInstaUi(channels.instagram, seed);

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
      title: place.title,
      short: place.short,
      detail: place.detail,
      charCount: place.charCount,
      qualityScore: place.qualityScore ?? score,
    },
    insta: {
      body: insta.body,
      charCount: insta.charCount,
      qualityScore: insta.qualityScore ?? score,
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
  { title: "1. 브랜드 · 지역", hint: "이름·말투·습관을 한 번만 저장해요" },
  { title: "2. 이번 달 플랜", hint: "월별 주제·채널 리듬이 자동으로 잡혀요" },
  { title: "3. 이번 주 주제", hint: "브랜드에 맞는 한 줄 주제를 고릅니다" },
  { title: "4. 조사 후 글 받기", hint: "이야기 · 플레이스 · 인스타 초안" },
  { title: "5. 다음 주 이어가기", hint: "운영 계획에서 바로 이어 씁니다" },
];

export const WORKFLOW_STEPS = [
  {
    n: "01",
    title: "브랜드 · 습관",
    desc: "가게 이름·발행 리듬을 정해 두면, 다음 달도 같은 목소리로 이어집니다.",
  },
  {
    n: "02",
    title: "월별 스케줄",
    desc: "이번 달에 쓸 주제·채널·조사 포인트가 한눈에 보입니다.",
  },
  {
    n: "03",
    title: "주별 주제",
    desc: "이번 주 블로그 한 줄만 고르면 조사·글쓰기로 바로 이어집니다.",
  },
  {
    n: "04",
    title: "세 채널 초안",
    desc: "같은 주제로 이야기 · 플레이스 · 인스타를 받습니다.",
  },
  {
    n: "05",
    title: "다음 주 계획",
    desc: "남은 채널·다음 주제는 운영 계획에서 이어갑니다.",
  },
];

export const WHY_BRICLOG = [
  {
    title: "브랜드가 쌓여요",
    desc: "말투와 주제가 겹겹이 남아, 다음 글도 같은 결로 이어져요.",
  },
  {
    title: "한 주제, 세 채널",
    desc: "이야기 한 번이면 플레이스 · 인스타까지 같은 주제로 받을 수 있어요.",
  },
  {
    title: "월·주 운영 계획",
    desc: "이번 달·이번 주에 쓸 주제와 채널 리듬이 브랜드에 맞게 잡힙니다.",
  },
  {
    title: "기록이 쌓이는 운영",
    desc: "지난 주제·글 기록을 보며 다음 달 계획까지 이어갑니다.",
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
    label: "인스타",
    desc: "피드·해시태그",
    accent: "bg-[#FFF8F0] text-[#E67700]",
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
