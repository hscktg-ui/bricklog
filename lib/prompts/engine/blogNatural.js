/**
 * 장면 → 경험 → 브랜드 연결 블로그 mock
 */
import { compactSentences, cleanOutputText } from "@/utils/sanitizeInput";
import { toMobileParagraphs } from "./textUtils";
import { buildSceneBlogSections } from "@/lib/scene/sceneEngine";
import { scrubMechanicalSeoPhrases } from "@/lib/keywords/naturalKeywordWeave";

function brandLabel(ctx) {
  return ctx.brandName || null;
}

function isUnmannedFlower(ctx) {
  const inc = (ctx.includeList || []).join(" ");
  return (
    /무인|24시간|셀프/.test(inc) ||
    /무인/.test(ctx.industryLabel || "") ||
    ctx.purposeType === "newOpen"
  );
}

function joinParagraphs(lines) {
  return toMobileParagraphs(compactSentences(lines).join(" "));
}

function pick(arr, seed = 0) {
  return arr[Math.abs(seed) % arr.length];
}

function buildTitles(ctx, flavor, unmanned) {
  const { region, main, brand } = ctx;
  const b = brand || region;
  if (unmanned && flavor.industryKey === "flower") {
    return compactSentences([
      `${region} ${main}, 늦은 시간에도 들를 수 있는 무인 꽃집`,
      `${b} 오픈 — ${region}에서 꽃다발 고르는 새로운 방식`,
      `${main} 찾다가 알게 된 24시간 생화 매장 이야기`,
      `${region} 퇴근길에 들르는 ${main} 후기`,
      `${main} · 기념일에도 부담 없이 고르는 꽃 선물`,
    ]);
  }
  if (flavor.legacyKey === "hospital" || ctx.industryKey === "hospital") {
    return compactSentences([
      `${region} ${main}, 처음 내원 전에 읽어보면 좋은 글`,
      `${b} — ${region}에서 진료 받기 전 체크 포인트`,
      `${region}에서 ${main} 알아볼 때, 접수·주차부터 보게 되더라고요`,
      `${region} ${main} 방문, 과장 없이 적어봤어요`,
      `${main} · ${region} 근처에서 찾는 분들께`,
    ]);
  }
  const vars = { region, main, brand: b, sub: ctx.subList[0] || main };
  return (flavor.titlePatterns || [])
    .slice(0, 5)
    .map((p) =>
      cleanOutputText(
        p
          .replace(/\{region\}/g, vars.region)
          .replace(/\{main\}/g, vars.main)
          .replace(/\{brand\}/g, vars.brand)
          .replace(/\{sub\}/g, vars.sub)
      )
    )
    .filter(Boolean);
}

function flowerSections(ctx, unmanned) {
  const { region, main, brand, subList, includeList } = ctx;
  const b = brand || `${region} 꽃집`;
  const inc = includeList.join(" · ");

  if (unmanned) {
    return [
      {
        heading: `${region}에서 꽃이 필요한 순간`,
        body: joinParagraphs([
          `${region}에 살면 꽃이 필요한 날이 생각보다 자주 옵니다.`,
          `갑자기 잡힌 기념일, 퇴근 후 늦은 시간, 주말에야 시간이 나는 경우도 있죠.`,
          `${main}을 찾다 보면 영업 시간과 주차, 생화 상태를 함께 보게 됩니다.`,
          inc.includes("24시간")
            ? `24시간 운영이라 늦은 시간에도 들를 수 있다는 점이 눈에 띕니다.`
            : `늦은 시간에도 이용할 수 있는 구조라 부담이 덜합니다.`,
        ]),
      },
      {
        heading: `${b}는 어떤 곳인지`,
        body: joinParagraphs([
          `${b}는 무인으로 운영되는 생화 매장입니다.`,
          `직원 상담 없이 원하는 꽃다발을 고르는 방식이라, 처음에는 낯설 수도 있어요.`,
          `대신 가격과 구성을 천천히 비교할 수 있어 부담 없이 선택하기 좋습니다.`,
          inc.includes("생화")
            ? `생화 꽃다발을 중심으로 준비되어 있어 선물용으로도 무난합니다.`
            : null,
        ]),
      },
      {
        heading: "무인 꽃집 이용 흐름",
        body: joinParagraphs([
          `입장 후 안내에 따라 꽃을 고르고 결제하면 됩니다.`,
          `처음 방문이면 구성·리본·메시지 카드 옵션을 미리 확인해 두면 편합니다.`,
          `${region}에서 ${main}을 검색해 오시는 분들은 주로 ‘늦은 시간 이용’과 ‘가격 비교’를 함께 보시는 것 같아요.`,
          subList[0]
            ? `${subList[0]} 키워드로도 찾으시는데, 실제로는 영업 시간과 주차가 더 중요한 경우가 많습니다.`
            : null,
        ]),
      },
      {
        heading: "이런 분께 잘 맞아요",
        body: joinParagraphs([
          `퇴근 후 들러 꽃을 사야 하는 분, 상담 없이 빠르게 고르고 싶은 분에게 잘 맞습니다.`,
          `기념일이 갑자기 다가왔을 때도 도움이 됩니다.`,
          inc.includes("부담")
            ? `부담 없는 가격대로 고르고 싶다는 분들도 만족도가 높은 편입니다.`
            : `가격을 비교하며 천천히 고르고 싶은 분들도 만족도가 높은 편입니다.`,
          `${region} 근처에서 ${main}을 알아보신다면, 사진보다 실제 생화 상태를 확인해 보시는 걸 권합니다.`,
        ]),
      },
      {
        heading: `${region}에서 꽃집 고를 때`,
        body: joinParagraphs([
          `${region} 일대에는 비슷한 검색어의 매장이 여럿 있습니다.`,
          `${main}으로 비교할 때는 위치, 주차, 늦은 시간 이용 가능 여부를 나눠 보시면 후회가 적어요.`,
          `무인 매장은 응대가 없는 대신 선택의 자유가 큰 편입니다.`,
          subList[1]
            ? `${subList[1]}로 검색하실 때도 같은 기준을 쓰시면 편합니다.`
            : null,
        ]),
      },
      {
        heading: "방문 전에 참고할 점",
        body: joinParagraphs([
          `첫 방문이면 결제·포장 방식을 매장 안내에서 한 번 확인해 주세요.`,
          `인기 구성은 소진이 빠를 수 있어, 늦은 시간보다는 여유 있는 시간대가 나을 때도 있습니다.`,
          `${b} 쪽은 ${region}에서 새로 오픈한 매장이라, 주변에 소개가 필요한 분들께 공유해 두기 좋습니다.`,
        ]),
      },
    ];
  }

  return [
    {
      heading: `${region}, 꽃 선물이 필요할 때`,
      body: joinParagraphs([
        `${region}에서 꽃을 찾을 때는 분위기와 생화 상태를 함께 보게 됩니다.`,
        `${main}으로 검색하시는 분들은 대부분 기념일·방문 선물 목적이 많아요.`,
        brand
          ? `${brand}는 ${region}에서 오래 운영하며, 상황에 맞는 구성을 제안해 주는 편입니다.`
          : `이 매장은 ${region}에서 오래 운영하며, 상황에 맞는 구성을 제안해 주는 편입니다.`,
      ]),
    },
    {
      heading: "공간과 상담 분위기",
      body: joinParagraphs([
        `매장 안은 과한 연출 없이 꽃이 먼저 보이는 구조입니다.`,
        `상담은 부담 없는 톤이라, 처음 방문하셔도 질문하기 편합니다.`,
        inc ? `${inc} 같은 포인트를 중요하게 보신다면 미리 말씀해 주시면 좋아요.` : null,
      ]),
    },
    {
      heading: "꽃다발·구성 선택",
      body: joinParagraphs([
        `시즌마다 강조하는 꽃이 조금씩 달라집니다.`,
        `예산과 분위기를 알려 주시면 그에 맞는 구성을 잡아 주는 방식이에요.`,
        subList[0]
          ? `${subList[0]}로 찾으시는 분들도 결국은 ‘누구에게 어떤 분위기로’가 기준이 됩니다.`
          : null,
      ]),
    },
    {
      heading: `${region}에서 비교할 때`,
      body: joinParagraphs([
        `${main} 키워드로 여러 곳을 비교하실 때, 사진과 실제 꽃 상태 차이를 함께 보시면 좋습니다.`,
        `가격만 보고 결정했다가 아쉬운 경우가 있어, 구성·리본·카드까지 묶어서 보는 편이 낫습니다.`,
      ]),
    },
    {
      heading: "방문 타이밍",
      body: joinParagraphs([
        `주말·저녁 시간대는 대기가 있을 수 있어, 여유 있게 방문하시는 걸 추천합니다.`,
        `${region}에서 ${main}을 알아보신다면, 영업 시간과 주차부터 확인해 보세요.`,
      ]),
    },
  ];
}

function hospitalSections(ctx) {
  const { region, main, brand, subList } = ctx;
  const b = brand || "의원";
  return [
    {
      heading: `${region}에서 ${main} 알아보기`,
      body: joinParagraphs([
        `${region}에서 ${main}을 검색하실 때, 위치와 진료 과목, 예약 방식부터 보시는 분이 많습니다.`,
        `과장된 표현보다 실제 방문 흐름이 어떤지가 더 중요해요.`,
      ]),
    },
    {
      heading: "처음 내원 전에",
      body: joinParagraphs([
        `증상과 이전 진료 이력을 간단히 정리해 가시면 상담이 수월합니다.`,
        `주차·대기 시간·접수 방식은 방문 전에 확인해 두면 마음이 편합니다.`,
        subList[0] ? `${subList[0]} 관련 문의도 미리 전화로 확인 가능한지 보세요.` : null,
      ]),
    },
    {
      heading: `${b} 분위기`,
      body: joinParagraphs([
        `${b}는 불필요한 긴 설명보다 필요한 안내에 집중하는 편입니다.`,
        `대기 공간과 동선이 정돈되어 있어 첫 방문에도 긴장이 덜한 편이에요.`,
      ]),
    },
    {
      heading: "진료·상담 흐름",
      body: joinParagraphs([
        `접수 후 기본 문진 → 상담 순으로 진행됩니다.`,
        `궁금한 점은 그 자리에서 짧게라도 확인하는 것이 좋습니다.`,
        `${region}에서 ${main}을 비교하실 때는 ‘응대 톤’도 함께 보시면 도움이 됩니다.`,
      ]),
    },
    {
      heading: "재방문·관리",
      body: joinParagraphs([
        `일회성 방문보다 이후 관리 안내가 명확한지가 만족도에 크게 작용합니다.`,
        `일정에 맞춘 후속 안내가 있다면 일정 잡기가 수월해집니다.`,
      ]),
    },
  ];
}

function cafeSections(ctx) {
  const { region, main, brand, includeList } = ctx;
  const b = brand || "카페";
  const inc = includeList[0];
  return [
    {
      heading: `${region}에서 잠깐 쉬고 싶을 때`,
      body: joinParagraphs([
        `${region}을 지나다 ${main}이 눈에 들어오는 경우가 많습니다.`,
        `혼자 작업하기, 잠깐 대화하기, 산책 후 들르기 등 목적이 다양해요.`,
      ]),
    },
    {
      heading: `${b} 공간 느낌`,
      body: joinParagraphs([
        `조도와 소음, 좌석 간격이 편한 편입니다.`,
        inc ? `${inc} 포인트가 실제로 체감되는지는 방문해 보시는 게 가장 확실합니다.` : null,
        `사진보다 현장 분위기가 더 차분한 느낌인 날도 있어요.`,
      ]),
    },
    {
      heading: "메뉴·시즌",
      body: joinParagraphs([
        `시즌 메뉴는 과하지 않게 바뀌는 편이라 재방문할 때도 새로움이 있습니다.`,
        `${main}으로 찾으시는 분들은 메뉴 사진과 가격대를 함께 보시는 경우가 많아요.`,
      ]),
    },
    {
      heading: `${region} 근처에서 고를 때`,
      body: joinParagraphs([
        `비슷한 카페가 가까이 있어도, 좌석·와이파이·주차 조건이 다릅니다.`,
        `${region}에서 ${main}을 비교하실 때는 ‘머무는 시간’ 기준으로 보시면 선택이 쉬워집니다.`,
      ]),
    },
    {
      heading: "방문 팁",
      body: joinParagraphs([
        `주말 오후는 혼잡할 수 있어, 평일 오전이나 늦은 오후가 한산한 편입니다.`,
        subListPhrase(ctx),
      ]),
    },
  ];
}

function subListPhrase(ctx) {
  const sub = ctx.subList?.[0];
  return sub
    ? `${sub}로 검색해 오신 분들도 결국은 ‘오래 머물기 좋은지’를 본다고 하더라고요.`
    : null;
}

function furnitureSections(ctx) {
  const { region, main, brand, includeList } = ctx;
  const b = brand || "매장";
  return [
    {
      heading: `${region}에서 가구·인테리어 볼 때`,
      body: joinParagraphs([
        `${main}을 찾으시는 분들은 사진으로 보고 방문하는 경우가 많습니다.`,
        `실제 색감·재질·크기는 현장에서 확인하는 게 맞습니다.`,
      ]),
    },
    {
      heading: `${b} 쇼룸`,
      body: joinParagraphs([
        `동선이 넓어 제품을 가까이에서 볼 수 있습니다.`,
        includeList[0]
          ? `${includeList[0]} 같은 요구가 있으시면 상담 때 바로 말씀해 주세요.`
          : null,
      ]),
    },
    {
      heading: "상담·배송",
      body: joinParagraphs([
        `공간 사진과 평수를 알려 주시면 구성 제안이 빨라집니다.`,
        `배송·조립 일정은 계약 전에 확인해 두시면 일정 조율이 수월합니다.`,
      ]),
    },
    {
      heading: `${region}에서 비교할 때`,
      body: joinParagraphs([
        `${main} 키워드로 여러 곳을 보실 때, AS와 배송 범위를 함께 비교해 보세요.`,
        `가격만으로 결정하기보다 소재와 마감을 직접 보는 편이 후회가 적습니다.`,
      ]),
    },
    {
      heading: "방문 전 준비",
      body: joinParagraphs([
        `원하는 스타일 사진을 몇 장 준비해 가시면 상담이 훨씬 빠릅니다.`,
        `${region}에서 ${main}을 알아보신다면 주차와 상담 예약 가능 여부부터 확인해 보세요.`,
      ]),
    },
  ];
}

function defaultSections(ctx, flavor) {
  const { region, main, brand } = ctx;
  const b = brand || "매장";
  return [
    {
      heading: `${region}에서 ${main}`,
      body: joinParagraphs([
        `${region}에서 ${main}을 찾을 때는 위치와 이용 방식부터 보게 됩니다.`,
        `사진과 후기만으로 결정하기보다, 한 번 직접 확인해 보시는 편이 낫습니다.`,
      ]),
    },
    {
      heading: `${b} 이용 분위기`,
      body: joinParagraphs([
        `${b}는 과한 홍보보다 실제 이용 경험에 가까운 안내를 하는 편입니다.`,
        `${flavor.visitReason} 목적으로 방문하시는 분들이 많습니다.`,
      ]),
    },
    {
      heading: "서비스·구성",
      body: joinParagraphs([
        `대표 메뉴·상품은 ${ctx.products || flavor.productWord} 쪽을 중심으로 보시면 됩니다.`,
        ctx.benefit ? `${ctx.benefit} 관련 문의는 방문 전에 확인해 두시면 편합니다.` : null,
      ]),
    },
    {
      heading: `${region} 근처에서 고를 때`,
      body: joinParagraphs([
        `비슷한 검색어의 매장이 많아도, 응대·가격·분위기는 매장마다 다릅니다.`,
        `${main}으로 비교하실 때는 ‘내가 중요하게 보는 한 가지’를 기준으로 삼아 보세요.`,
      ]),
    },
    {
      heading: "방문 팁",
      body: joinParagraphs([
        `혼잡한 시간대를 피하면 체험이 훨씬 편합니다.`,
        subListPhrase(ctx),
      ]),
    },
  ];
}

export function buildNaturalSections(ctx, flavor) {
  const { sections } = buildSceneBlogSections(ctx, flavor);
  const unmanned = isUnmannedFlower(ctx);

  if (unmanned && (flavor.legacyKey === "flower" || ctx.industryKey === "flower")) {
    sections.splice(1, 0, {
      heading: "늦은 시간에 들르는 이유",
      body: joinParagraphs([
        "상담 없이 고르는 방식이라 처음엔 낯설 수 있어요.",
        "대신 가격·구성을 천천히 비교할 수 있어 부담이 덜합니다.",
      ]),
    });
  }

  return sections.map((sec) => ({
    heading: scrubMechanicalSeoPhrases(sec.heading),
    body: scrubMechanicalSeoPhrases(
      toMobileParagraphs(sec.body)
    ),
  }));
}

export function buildNaturalConclusion(ctx, purpose, tone, unmanned) {
  const { region, brand } = ctx;
  const b = brand || ctx.brandName;
  const mods = ctx.personaModifiers;
  const fromPersona = mods?.conclusionLines?.filter(Boolean) || [];
  const lines = compactSentences([
    ...fromPersona,
    b && !fromPersona.length
      ? `${region ? `${region} 근처에서 ` : ""}한번 들러 보시면, 사진과 다른 느낌을 받으실 수도 있어요.`
      : !fromPersona.length
        ? `${region ? `${region} 근처 ` : ""}직접 확인해 보시는 편이 가장 확실합니다.`
        : null,
    unmanned
      ? "늦은 시간 이용이 필요하시면, 영업 시간부터 확인해 주세요."
      : purpose?.cta?.replace(/[!！]+$/, "") || null,
    tone?.ending && !/저장|체크|검색/.test(tone.ending) ? tone.ending : null,
    fromPersona.length ? null : "문의는 플레이스·전화로 편하게 남겨 주세요.",
  ]);
  return joinParagraphs(lines);
}

export function buildNaturalTitles(ctx, flavor) {
  const unmanned =
    (flavor.legacyKey === "flower" || ctx.industryKey === "flower") &&
    isUnmannedFlower(ctx);
  const titles = buildTitles(ctx, flavor, unmanned);
  return titles.length >= 5 ? titles.slice(0, 5) : titles;
}

export { isUnmannedFlower, joinParagraphs };
