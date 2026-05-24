/**
 * 채널별 노란·초록 안내 문구 (실제 연계 동작과 일치)
 */

/**
 * @param {'place'|'insta'|'image'} channel
 * @param {{ hasFullBlog?: boolean, hasOtherDraft?: boolean }} ctx
 * @returns {string | null}
 */
export function channelStartLinkBanner(channel, ctx = {}) {
  const { hasFullBlog, hasOtherDraft } = ctx;
  if (hasFullBlog) {
    if (channel === "place") {
      return "완성된 이야기가 있습니다. 브리프를 채운 뒤 「이야기에서 이어 만들기」로 사실·톤을 맞추거나, 「바로 만들기」로 공지만 새로 씁니다.";
    }
    if (channel === "insta") {
      return "완성된 이야기가 있습니다. 「이야기에서 이어 만들기」로 장면·키워드를 캡션에 반영하거나, 「바로 만들기」로 캡션만 새로 씁니다.";
    }
    if (channel === "image") {
      return "완성된 이야기가 있습니다. 「이야기에서 이어 만들기」는 글의 톤·키워드를 프롬프트에 반영합니다. 주제만으로 쓰려면 「바로 만들기」를 누르세요.";
    }
  }
  if (hasOtherDraft) {
    return "플레이스·인스타·이야기·붙여넣기 검수 개선본 중 초안이 있습니다. 최신 초안의 톤·주제를 이어받거나, 아래 브리프만으로 새로 만들 수 있습니다.";
  }
  return null;
}

/**
 * @param {'place'|'insta'|'image'} channel
 */
export function channelStartReadyHint(channel) {
  if (channel === "place") {
    return "브랜드명과 공지 제목(또는 주제)을 입력해 주세요.";
  }
  if (channel === "insta") {
    return "브랜드명과 오늘의 소재(주제)를 입력해 주세요.";
  }
  if (channel === "image") {
    return "브랜드명과 주제를 입력해 주세요.";
  }
  return "";
}

/**
 * @param {'place'|'insta'|'image'} channel
 * @param {{ hasFullBlog?: boolean, hasOtherDraft?: boolean }} ctx
 */
export function channelDeriveButtonLabel(channel, ctx = {}) {
  if (ctx.hasFullBlog) {
    return "이야기에서 이어 만들기";
  }
  if (ctx.hasOtherDraft) {
    return "다른 채널·검수 초안에서 이어 만들기";
  }
  return "이어 만들기";
}
