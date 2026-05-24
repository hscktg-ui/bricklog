import { normalizeRatio } from "@/lib/images/imageTypes";

/** 용도별 고정 비율 — 이벤트 배너만 사용자 선택 */
export const IMAGE_PURPOSE_DEFAULT_RATIO = {
  thumbnail: "1:1",
  place: "1:1",
  insta: "4:5",
  banner: null,
};

export const IMAGE_PURPOSE_RATIO_LABEL = {
  thumbnail: "1:1 (정사각)",
  place: "1:1 (정사각)",
  insta: "4:5",
  banner: "직접 선택",
};

/** 파생 소스 채널 → 이미지 용도 */
export const SOURCE_CHANNEL_IMAGE_PURPOSE = {
  blog: "thumbnail",
  place: "place",
  instagram: "insta",
  insta: "insta",
};

/**
 * @param {string} purpose
 * @param {string} [userRatio]
 */
export function resolveImageRatioForPurpose(purpose, userRatio = "auto") {
  const fixed = IMAGE_PURPOSE_DEFAULT_RATIO[purpose];
  if (fixed) return fixed;
  const r = normalizeRatio(userRatio);
  return r === "auto" ? "16:9" : r;
}

/**
 * @param {string} sourceChannel
 */
export function resolveImagePurposeFromSource(sourceChannel) {
  return SOURCE_CHANNEL_IMAGE_PURPOSE[sourceChannel] || "thumbnail";
}

/**
 * 이야기·플레이스·인스타 초안에서 헤드카피 추출
 * @param {string} sourceChannel
 * @param {{ blogContent?: object, placeContent?: object, instagramContent?: object, blogInput?: object }} state
 */
export function extractImageHeadCopy(sourceChannel, state = {}) {
  const { blogContent, placeContent, instagramContent, blogInput } = state;

  if (sourceChannel === "place" && placeContent) {
    return (
      placeContent.title?.trim() ||
      placeContent.shortNotice?.trim() ||
      placeContent.shortBody?.trim() ||
      blogInput?.placeHeadline?.trim() ||
      blogInput?.topic?.trim() ||
      ""
    );
  }

  if (
    (sourceChannel === "instagram" || sourceChannel === "insta") &&
    instagramContent
  ) {
    return (
      instagramContent.hook?.trim() ||
      instagramContent.title?.trim() ||
      blogInput?.topic?.trim() ||
      ""
    );
  }

  if (sourceChannel === "blog" && blogContent) {
    return (
      blogContent.representativeTitle?.trim() ||
      blogContent.title?.trim() ||
      blogInput?.topic?.trim() ||
      blogInput?.mainKeyword?.trim() ||
      ""
    );
  }

  return (
    blogInput?.topic?.trim() ||
    blogInput?.placeHeadline?.trim() ||
    blogInput?.mainKeyword?.trim() ||
    ""
  );
}

/**
 * @param {object} imageOptions
 * @param {{ sourceChannel?: string, standalone?: boolean }} derivation
 */
export function mergeImageOptionsForDerivation(imageOptions, derivation = {}) {
  const { sourceChannel, standalone } = derivation;
  let purpose = imageOptions?.purpose || "thumbnail";

  if (!standalone && sourceChannel && sourceChannel !== "form") {
    purpose = resolveImagePurposeFromSource(sourceChannel);
  }

  const ratio = resolveImageRatioForPurpose(purpose, imageOptions?.ratio);

  return {
    ...imageOptions,
    purpose,
    ratio,
  };
}

/**
 * @param {object} source resolveDerivationSource 결과
 * @param {object} state
 */
export function buildImageGenerationContext(source, state) {
  const derivation = {
    sourceChannel: source?.sourceChannel || "form",
    standalone: Boolean(source?.standalone),
  };
  const options = mergeImageOptionsForDerivation(state.imageOptions || {}, derivation);
  const headCopy = extractImageHeadCopy(derivation.sourceChannel, {
    blogContent: state.blogContent,
    placeContent: state.placeContent,
    instagramContent: state.instagramContent,
    blogInput: state.blogInput,
  });

  return {
    options: { ...options, headCopy },
    headCopy,
    derivation,
  };
}
