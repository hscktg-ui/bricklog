/**
 * BRICLOG NEXT — 이번 달 운영 리듬
 *
 * 「글을 받았다」→ 「이번 달에 무엇을·왜·어디에 쓸지」가 이어지는 다음 단계 SSOT.
 */
import {
  buildContentOperatingPlan,
  buildPostPublishOperatingSteps,
  BRICLOG_VISION,
} from "@/lib/product/briclogBrandContentOS";

export const BRICLOG_NEXT_VERSION = "briclog-next-v1";

const CHANNEL_MENU = {
  blog: "blog",
  place: "place",
  instagram: "insta",
  insta: "insta",
};

const CHANNEL_LABELS = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

/**
 * @param {object} input — brandName, region, topic, contentOperatingPlan
 * @param {{ blog?: boolean, place?: boolean, insta?: boolean, instagram?: boolean, blogTopic?: string }} channelState
 */
export function buildBriclogNextSnapshot(input = {}, channelState = {}) {
  const plan =
    input.contentOperatingPlan ||
    (input.brandName || input.topic ? buildContentOperatingPlan(input) : null);

  if (!plan?.whatToWrite?.length) {
    return {
      version: BRICLOG_NEXT_VERSION,
      ok: false,
      userValue: BRICLOG_VISION.userValue,
    };
  }

  const hasBlog = Boolean(channelState.blog);
  const hasPlace = Boolean(channelState.place);
  const hasInsta = Boolean(channelState.insta ?? channelState.instagram);
  const blogTopic =
    channelState.blogTopic || plan.primaryTopic || input.topic || "";

  const postSteps = buildPostPublishOperatingSteps(plan, {
    hasPlace,
    hasInsta,
    blogTopic,
  });

  const rhythm = [
    { channel: "blog", label: CHANNEL_LABELS.blog, done: hasBlog },
    { channel: "place", label: CHANNEL_LABELS.place, done: hasPlace },
    { channel: "instagram", label: CHANNEL_LABELS.instagram, done: hasInsta },
  ];

  const doneCount = rhythm.filter((r) => r.done).length;
  const progress = Math.round((doneCount / rhythm.length) * 100);

  const nextStep =
    postSteps.find((s) => s.status === "pending") ||
    postSteps.find((s) => s.status === "next") ||
    postSteps[0] ||
    null;

  const primaryAction = nextStep
    ? {
        channel: nextStep.channel,
        menuId: CHANNEL_MENU[nextStep.channel] || nextStep.channel,
        label: nextStep.actionLabel || "이어 만들기",
        topic: nextStep.topic,
        channelLabel: nextStep.channelLabel || CHANNEL_LABELS[nextStep.channel],
      }
    : null;

  return {
    version: BRICLOG_NEXT_VERSION,
    ok: true,
    userValue: BRICLOG_VISION.userValue,
    month: plan.month,
    headline: plan.operatingHeadline,
    plan,
    rhythm,
    progress,
    doneCount,
    totalChannels: rhythm.length,
    steps: postSteps,
    primaryAction,
    researchHint: plan.researchMustKnow?.slice(0, 3) || [],
  };
}

export function getBriclogNextPublicPitch() {
  return {
    eyebrow: "브릭로그 다음",
    headline: "글 하나가 아니라, 이번 달 운영이 이어집니다",
    sub: "이야기를 쓴 뒤 플레이스·인스타로 같은 주제를 이어가고, 다음 주제까지 미리 잡아 둡니다.",
    pillars: [
      {
        title: "무엇을 쓸지",
        desc: "이번 주 블로그, 이번 달 플레이스·인스타 주제가 한눈에 보입니다.",
      },
      {
        title: "왜 쓸지",
        desc: "검색 의도와 브랜드 신뢰 목적이 주제마다 붙어 나옵니다.",
      },
      {
        title: "다음에 뭘 할지",
        desc: "발행 후 남은 채널을 눌러 바로 이어 만들 수 있습니다.",
      },
    ],
  };
}
