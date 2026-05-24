/** @typedef {'blog' | 'insta' | 'place' | 'image'} WritingChannel */

const CHANNEL_LABELS = {
  blog: "이야기",
  insta: "인스타 캡션",
  place: "플레이스",
  image: "이미지 프롬프트",
};

function stripTipPrefix(text) {
  return String(text || "").replace(/^TIP ·\s*/, "");
}

function adaptTipText(text, channel) {
  const body = stripTipPrefix(text);
  if (channel === "blog") return `TIP · ${body}`;

  if (channel === "insta") {
    if (/네이버|소제목|제목과 첫 문단|키워드 나열/.test(body)) {
      return "TIP · Hook 한 줄 → 짧은 줄바꿈 2~3번. 저장·공감 포인트를 마지막에.";
    }
    if (/장면 칩|포함할 내용/.test(body)) {
      return "TIP · 아래 칩을 누르면 캡션 주제·분위기에 바로 반영할 수 있어요.";
    }
    return `TIP · ${body.replace(/본문|글은/g, "캡션").replace(/제목/g, "첫 줄")}`;
  }

  if (channel === "place") {
    if (/네이버|소제목|키워드/.test(body)) {
      return "TIP · 영업시간·위치·예약·혜택 중 하나만 한 줄 공지 톤으로.";
    }
    if (/장면|이야기|감정/.test(body)) {
      return `TIP · ${body.replace(/장면/g, "안내 한 줄").replace(/이야기/g, "공지")}`;
    }
    return `TIP · ${body.replace(/본문/g, "한 줄 소개").slice(0, 72)}`;
  }

  if (channel === "image") {
    if (/네이버|소제목|키워드|포함할/.test(body)) {
      return "TIP · 피사체·분위기·색감·구도를 한 문장 프롬프트로 (문단·SEO 표현 금지).";
    }
    return `TIP · ${body.replace(/본문|글/g, "프롬프트").replace(/제목/g, "메인 피사체")}`;
  }

  return `TIP · ${body}`;
}

function adaptStory(story, channel) {
  if (!story || channel === "blog") return story;
  const title = String(story.title || "");
  const body = String(story.body || "");

  if (channel === "insta") {
    return {
      ...story,
      title: title.replace(/—.*/, "").trim() || title,
      body:
        body.length > 56
          ? "캡션 Hook·한 줄 감정. 블로그 설명체는 줄이고 장면만 남기세요."
          : `${body} (짧은 캡션 톤)`,
    };
  }

  if (channel === "place") {
    return {
      ...story,
      title: title.split("—")[0].trim() || title,
      body: "한 줄 공지·운영 안내 톤으로 압축해 보세요.",
    };
  }

  if (channel === "image") {
    return {
      ...story,
      title: `비주얼: ${title.split("—")[0].trim() || title}`,
      body: "피사체·조명·색감·구도를 영어·한글 키워드로 (장문 설명 금지).",
    };
  }

  return story;
}

function adaptScene(scene, channel, focus = "") {
  const s = String(scene || "").trim();
  if (!s || channel === "blog") return s;

  if (channel === "insta") {
    const core = focus || s.replace(/첫 방문|단골|후기/g, "").trim();
    return core.length > 28 ? `${core.slice(0, 26)}… 캡션` : `${s} · 캡션`;
  }

  if (channel === "place") {
    if (/방문|단골|후기/.test(s)) {
      return focus
        ? `${focus.slice(0, 20)} 안내`
        : s.replace(/이야기|장면/g, "안내");
    }
    return s.length > 24 ? `${s.slice(0, 22)}…` : s;
  }

  if (channel === "image") {
    const base = focus || s;
    return `장면: ${base.slice(0, 32)}`;
  }

  return s;
}

/**
 * @param {object} pack
 * @param {WritingChannel} [channel]
 */
export function adaptWritingContextPack(pack, channel = "blog") {
  if (!pack || channel === "blog") return pack;

  const focus = pack.topicLabel || "";
  const adapted = {
    ...pack,
    channelLabel: CHANNEL_LABELS[channel] || CHANNEL_LABELS.blog,
    tips: (pack.tips || []).map((t) => ({
      ...t,
      text: adaptTipText(t.text, channel),
    })),
    stories: (pack.stories || []).map((s) => adaptStory(s, channel)),
    scenes: (pack.scenes || []).map((s) => adaptScene(s, channel, focus)),
    previewLine: pack.previewLine
      ? adaptTipText(`TIP · ${pack.previewLine}`, channel).replace(/^TIP ·\s*/, "")
      : pack.previewLine,
    suggestionChips: (pack.suggestionChips || []).map((chip) =>
      adaptScene(chip, channel, focus)
    ),
  };
  return adapted;
}
