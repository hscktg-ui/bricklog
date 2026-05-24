/**
 * 채널별 Persona 스타일 — 문체·도입·CTA·구조
 */
import { fixBrandJosa } from "@/lib/korean/josaFix";

export function getPersonaBlogModifiers(persona, subtype, ctx) {
  const brand = ctx.brandName || "이 매장";
  const region = ctx.region || "";
  const main = ctx.main || "";
  const inc = ctx.includeList?.[0];
  const uniq =
    ctx.brandResearch?.summary?.uniqueness ||
    ctx.brandResearch?.summary?.operationStyle ||
    inc ||
    ctx.storeFeatures;

  const base = {
    voice: "neutral",
    empathyPool: [
      "비슷한 상황을 겪어 본 분들은, 사진만으로 결정했다가 아쉬운 경우가 있다고 해요.",
      "막상 필요한 날이 오면, 영업 시간과 재고를 같이 보게 됩니다.",
    ],
    whyPool: [],
    brandBridgePool: [],
    brandHeading: "그날, 이 브랜드가 남은 인상",
    conclusionLines: [],
  };

  switch (persona) {
    case "brand_story":
      return {
        ...base,
        voice: "brand",
        empathyPool: [
          "비슷한 날, 저희도 문의가 몰리는 편이에요.",
          "처음 오시는 분들은 사진보다 생화·분위기를 함께 보시는 경우가 많습니다.",
        ],
        whyPool: [
          `다시 찾아 주시는 이유는, ${brand}만의 ${uniq ? uniq.slice(0, 40) : "구성 방식"} 때문이라는 말을 자주 듣습니다.`,
          `방문하시면 ‘왜 이곳인지’가 분위기로 먼저 전해지는 편입니다.`,
          inc
            ? `${inc} — 이 부분을 중요하게 보시는 분들께 맞춰 안내해 드립니다.`
            : `${region ? `${region} ` : ""}근처에서 ${main}을 찾으실 때, 부담 없이 들러 보셔도 좋아요.`,
        ],
        brandBridgePool: [
          uniq
            ? `${brand}는 ${uniq.replace(/^.+—\s*/, "").slice(0, 70)}`
            : `${brand}는 ${region}에서 오래 운영하며, 상황에 맞는 구성을 제안합니다.`,
          ctx.brandResearch?.summary?.operationStyle
            ? `운영 방식은 ${ctx.brandResearch.summary.operationStyle}`
            : null,
          `업종 설명보다, 이 매장만의 방식이 먼저 느껴지도록 준비해 두었습니다.`,
        ],
        brandHeading:
          subtype === "philosophy"
            ? "이 브랜드가 지향하는 것"
            : subtype === "new_open"
              ? "새로 문을 연 이유"
              : subtype === "event"
                ? "이번에 전하고 싶은 이야기"
                : "그날, 이 브랜드가 남은 인상",
        conclusionLines: [
          `${region ? `${region} 근처에서 ` : ""}한번 들러 보시면, 사진과 다른 느낌을 받으실 수도 있어요.`,
          `문의는 플레이스·전화로 편하게 남겨 주세요.`,
        ],
      };

    case "visit_review": {
      const subtypeCopy = {
        experience: {
          empathy: [
            "체험 단계에서 사진과 현장이 달랐던 적이 있어, 이번엔 분위기부터 봤어요.",
            "제공받고 쓰는 글이라도, 솔직한 인상만 남기려고 합니다.",
          ],
          heading: "체험하면서 느낀 점",
          why: [
            `체험 목적이 ${inc || "구성·응대"}였는데, ${brand}는 그 부분이 분명했어요.`,
            `다시 신청하고 싶은 이유는, 과장 없이 경험만 전달해 주는 느낌 때문이에요.`,
          ],
        },
        recommend: {
          empathy: [
            "팔로워분들께 부담 없이 추천하려면, 직접 본 분위기가 먼저예요.",
            "협업·방문 콘텐츠는 결국 ‘다시 가고 싶은지’로 판단하게 됩니다.",
          ],
          heading: "추천하게 된 이유",
          why: [
            `${brand}를 추천하는 이유는, ${inc || "사진과 다른 현장감"}이 있었기 때문이에요.`,
            `저장해 두었다가 필요할 때 다시 찾기 좋은 타입이었습니다.`,
          ],
        },
        review: {
          empathy: [
            "기자·블로거 입장에서는, 홍보 문장보다 방문 흐름이 먼저입니다.",
            "취재할 때는 사진보다 동선·응대·차별 포인트를 같이 봅니다.",
          ],
          heading: "방문 후기 — 남긴 인상",
          why: [
            `기사·포스팅에 실릴 이유는, ${brand}만의 ${uniq ? uniq.slice(0, 35) : "운영 방식"}이 분명했기 때문이에요.`,
            `재방문·재소개 포인트는 ${inc || "응대 톤과 구성"} 쪽에 가깝습니다.`,
          ],
        },
      };
      const sub = subtypeCopy[subtype] || subtypeCopy.review;
      return {
        ...base,
        voice: "visitor",
        empathyPool: sub.empathy,
        whyPool: sub.why,
        brandBridgePool: [
          `${brand}는 과한 말보다 경험이 먼저 전해지는 타입이었어요.`,
          uniq ? `특히 ${uniq.slice(0, 50)}` : null,
        ],
        brandHeading: sub.heading,
        conclusionLines: [
          `${region ? `${region} 근처 ` : ""}비슷한 상황이시면 한번 들러 보세요.`,
          `저는 ${brand} 쪽을 개인적으로 다시 찾을 것 같아요.`,
        ],
      };
    }

    case "info_intro":
      return {
        ...base,
        voice: "guide",
        empathyPool: [
          "처음 알아보실 때 헷갈리는 포인트가 비슷하더라고요.",
          "많은 분들이 사진과 실제를 나눠 보신 뒤에 결정하십니다.",
        ],
        whyPool: [
          `${main}을 고를 때 ‘방문 이유’를 먼저 정해 두면 선택이 빨라집니다.`,
          `${brand}를 보면 ${inc || "이용 방식"}이 기준이 되는 경우가 많아요.`,
          `재방문 포인트는 ${uniq ? uniq.slice(0, 45) : "구성·응대의 일관성"} 쪽에 가깝습니다.`,
        ],
        brandBridgePool: [
          `${brand}는 ${subtype === "compare" ? "비교할 때 기준이 되는" : "설명이 필요한"} 항목을 짧게 정리해 두었습니다.`,
          region ? `${region} 일대에서 찾을 때 참고하시면 됩니다.` : null,
        ],
        brandHeading:
          subtype === "compare"
            ? "비교할 때 보게 되는 점"
            : subtype === "explain"
              ? "알아두면 편한 점"
              : "방문 전에 보면 좋은 것",
        conclusionLines: [
          `정리해 보면, ${brand}${region ? ` · ${region}` : ""} 쪽이 부담 없이 확인하기 좋았습니다.`,
          `플레이스·전화로 운영 시간만 확인해 두시면 됩니다.`,
        ],
      };

    case "local_guide":
      return {
        ...base,
        voice: "neighbor",
        empathyPool: [
          `${region ? `${region} ` : "이 동네 "}살면, 이런 날이 생각보다 자주 옵니다.`,
          "동네에서 추천할 만한 곳을 찾을 때는 ‘언제 들를 수 있는지’가 먼저죠.",
        ],
        whyPool: [
          `이 동네에서 ${brand}를 추천하는 이유는, ${inc || "늦은 시간·당일 수령"} 같은 생활 리듬에 맞기 때문이에요.`,
          `손님 입장에서 ‘굳이 여기까지?’가 아니라 ‘근처에서 해결’되는 느낌이 중요합니다.`,
          `재방문은 ${uniq ? uniq.slice(0, 40) : "분위기와 구성이 매번 달라서"} 편합니다.`,
        ],
        brandBridgePool: [
          `${region} 근처라면 ${brand} 한곳만 기억해 두셔도 충분해요.`,
          `로컬 매장답게 과장 없이, 필요한 날에 맞춰 고를 수 있습니다.`,
        ],
        brandHeading: "이 동네에서 추천하는 이유",
        conclusionLines: [
          `${region ? `${region} ` : ""}근처 사시면 들러 보시기 좋아요.`,
          `${brand} — 동네에서 자주 찾는 분들이 많은 편입니다.`,
        ],
      };

    default:
      return base;
  }
}

export function getPlacePersonaStyle(persona, ctx) {
  const b = ctx.brandName;
  switch (persona) {
    case "visit_review":
      return {
        titlePrefix: "",
        coreTone: "notice-warm",
        cta: b ? `${b} · 후기 남겨 주셔서 감사합니다` : "이용해 주셔서 감사합니다",
        detailHint: "방문 후 궁금한 점은 플레이스·전화로 문의 주세요.",
      };
    case "info_intro":
      return {
        titlePrefix: "[안내]",
        coreTone: "factual",
        cta: b ? `${b} 플레이스에서 운영·문의 확인` : "플레이스에서 문의 주세요",
        detailHint: "운영 시간·주차는 플레이스에 최신 정보가 있습니다.",
      };
    case "local_guide":
      return {
        titlePrefix: "",
        coreTone: "neighbor",
        cta: b ? `${b} · ${ctx.region || "근처"} 소식` : "근처 소식",
        detailHint: `${ctx.region || "동네"} 근처에서 확인해 주세요.`,
      };
    case "brand_story":
    default:
      return {
        titlePrefix: "",
        coreTone: "owner",
        cta: b ? `${b} 플레이스에서 예약·문의 확인` : "플레이스·전화로 문의 주세요",
        detailHint: null,
      };
  }
}

export function getInstaPersonaStyle(persona, ctx) {
  const b = ctx.brandName;
  switch (persona) {
    case "visit_review":
      return {
        hookStyle: "visitor",
        bodyPrefix: "오늘 다녀왔는데 —",
        ending: b ? `${b} · 다시 올 것 같아요` : "",
        ctaSoft: true,
      };
    case "info_intro":
      return {
        hookStyle: "guide",
        bodyPrefix: "처음 가기 전에 —",
        ending: b ? `${b} · 플레이스에서 시간 확인` : "플레이스에서 시간 확인",
        ctaSoft: false,
      };
    case "local_guide":
      return {
        hookStyle: "neighbor",
        bodyPrefix: `${ctx.region || "근처"}에서 —`,
        ending: b ? `${b} · 동네 추천` : "",
        ctaSoft: true,
      };
    case "brand_story":
    default:
      return {
        hookStyle: "brand",
        bodyPrefix: "",
        ending: b ? fixBrandJosa(b, b) : "",
        ctaSoft: true,
      };
  }
}
