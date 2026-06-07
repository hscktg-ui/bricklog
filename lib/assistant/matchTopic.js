/**
 * 규칙 기반 빠른 답변 (LLM 없이도 동작) — 마크다운 없음
 */
import { IN_APP_HELP_HINT } from "./knowledge";
import { getDailyLimit } from "@/lib/api/usageQuota";
import { PLANS, PLAN_FEATURE_LINES } from "@/lib/billing/plans";
import {
  COLUMN_SPEAKER_LABELS,
  FORM_ADVANCED_SECTION,
  PLAN_UI_LABEL,
  RESEARCH_TYPE_LABELS,
  VISIT_REVIEW_SPEAKER_LABELS,
  formatAutoPipelineOrder,
  formatFreePlanChannelNote,
  formatMainChannelTabs,
  formatMonthlyLimits,
} from "./productGuide";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";

function includesAny(text, patterns) {
  return patterns.some((p) => text.includes(p));
}

export function matchQuickReply(message, ctx = {}) {
  const t = String(message || "").trim().toLowerCase();
  const limit = getDailyLimit();

  if (!t) return null;

  if (
    includesAny(t, [
      "briclog",
      "브릭로그",
      "뭐예요",
      "뭔가요",
      "무엇",
      "서비스",
      "소개",
    ]) &&
    !includesAny(t, ["요금", "가격", "플랜"])
  ) {
    return {
      reply:
        "BRICLOG은 브랜드 글을 차곡 쌓는 곳입니다.\n\n" +
        `· 한 주제 → ${formatAutoPipelineOrder()} (필요하면 프롬프트)\n` +
        "· 이야기 폼 「더 맞추기」에서 자료조사·화자·문체를 맞출 수 있어요\n" +
        "· 게시·업로드는 직접, 여기서는 글만 정리합니다\n\n" +
        formatFreePlanChannelNote() +
        "\n\n처음이시면 「처음 사용 순서」를 눌러 보세요.",
      topic: "서비스소개",
    };
  }

  if (
    includesAny(t, [
      "업로드",
      "발행",
      "올려",
      "포스팅",
      "직접",
      "어디까지",
      "범위",
      "한계",
      "안 해",
    ])
  ) {
    return {
      reply:
        "BRICLOG은 글을 쓰고 다듬는 곳입니다.\n\n" +
        "하는 일: 이야기·플레이스·인스타·프롬프트 문구, 톤·길이·민감 표현 점검\n" +
        "하지 않는 일: 네이버·인스타 등에 직접 업로드·예약 발행\n\n" +
        "완성된 글은 복사해 각 채널에 올려 주세요.",
      topic: "서비스소개",
    };
  }

  if (
    includesAny(t, [
      "이모지",
      "이모티콘",
      "밀도",
      "이모",
      "ㅋ",
      "톤만",
    ])
  ) {
    return {
      reply:
        `이모지·문체는 이야기 폼 「${FORM_ADVANCED_SECTION}」에서 맞춥니다.\n\n` +
        "1) 이야기 탭 → 폼 아래 「더 맞추기」 펼치기\n" +
        "2) 이모지·문체·글쓰기 톤 선택\n" +
        "3) 브랜드별 기본값은 「브랜드 작업실」에서도 바꿀 수 있어요\n\n" +
        "플레이스·인스타 캡션은 이모지를 더 적게, 이야기는 브랜드 말투에 맞게 나옵니다.",
      topic: "이모지",
    };
  }

  if (
    includesAny(t, [
      "습관",
      "기억",
      "브랜드별",
      "톤 누적",
      "학습",
      "프로필",
      "운영 설정",
      "브랜드 설정",
      "브랜드 셋",
    ])
  ) {
    return {
      reply:
        "브랜드마다 말투·금지어가 쌓입니다.\n\n" +
        `1) 사이드바 「${CHANNEL_PRODUCTS.growth.menuLabel}」에서 톤·이모지·금지어\n` +
        "2) 글 저장·피드백을 하면 다음 글에 반영\n" +
        "3) 작업실 자료는 맥락만 참고합니다\n\n" +
        "브랜드를 바꾸면 그 브랜드 설정만 적용됩니다.",
      topic: "브랜드기억",
    };
  }

  if (
    includesAny(t, [
      "3채널",
      "채널",
      "플레이스",
      "인스타",
      "스마트",
      "이미지",
      "프롬프트",
      "네이버",
      "카피",
    ])
  ) {
    return {
      reply:
        "채널은 사이드바 「콘텐츠 만들기」에서 따로 쓰거나, 이야기 쓰기로 이어갈 수 있습니다.\n\n" +
        `· ${CHANNEL_PRODUCTS.blog.menuLabel}: ${CHANNEL_PRODUCTS.blog.desc}\n` +
        `· ${CHANNEL_PRODUCTS.insta.menuLabel}: ${CHANNEL_PRODUCTS.insta.desc}\n` +
        `· ${CHANNEL_PRODUCTS.place.menuLabel}: ${CHANNEL_PRODUCTS.place.desc}\n` +
        `· ${CHANNEL_PRODUCTS.image.menuLabel}: ${CHANNEL_PRODUCTS.image.desc}\n\n` +
        `이야기 연동: ${formatAutoPipelineOrder()}. 썸네일 문구는 「썸네일 문구」 메뉴에서.\n` +
        formatFreePlanChannelNote() +
        "\n자료조사를 켠 경우 플레이스·인스타 캡션에도 팩트가 반영됩니다.",
      topic: "채널",
    };
  }

  if (
    includesAny(t, [
      "비주얼",
      "썸네일",
      "단독",
      "블로그 없이",
    ]) &&
    !includesAny(t, ["한도", "요금"])
  ) {
    return {
      reply:
        `사이드바 「${CHANNEL_PRODUCTS.image.menuLabel}」에서 썸네일 문구를 만듭니다.\n\n` +
        `1) 주제·브랜드 입력\n2) 「${CHANNEL_PRODUCTS.image.generateLabel}」\n\n` +
        "초안이 있으면 톤을 이어받습니다. 완성 이미지 파일 UI는 준비 중입니다.",
      topic: "채널",
    };
  }

  if (
    includesAny(t, [
      "모바일",
      "핸드폰",
      "태블릿",
      "하단",
      "더보기",
      "햄버거",
      "좌측 메뉴",
      "사이드",
    ])
  ) {
    return {
      reply:
        "모바일에서는 왼쪽 메뉴가 항상 보이지 않습니다.\n\n" +
        `· 하단 탭: ${formatMainChannelTabs()}\n` +
        `· 더보기: ${CHANNEL_PRODUCTS.image.menuLabel}, ${CHANNEL_PRODUCTS.review.menuLabel}, ${CHANNEL_PRODUCTS.growth.menuLabel}, ${CHANNEL_PRODUCTS.history.menuLabel}, 설정·${PLAN_UI_LABEL}\n` +
        "· 오른쪽 아래 ? : 도움말\n\n" +
        "PC에서는 왼쪽 메뉴가 고정됩니다.",
      topic: "시작하기",
    };
  }

  if (includesAny(t, ["회원가입", "가입 방법", "가입하"])) {
    return {
      reply:
        "1) 「회원가입」\n2) 이메일·비밀번호(6자 이상)\n3) 휴대폰 문자 인증\n4) 이용약관·개인정보 동의\n5) 가입 후 로그인 (인증 메일이 오면 스팸함도 확인)",
      topic: "회원가입",
    };
  }

  if (
    includesAny(t, [
      "로그인",
      "로그인 안",
      "로그인이 안",
      "들어가지",
      "접속 안",
    ])
  ) {
    return {
      reply:
        "1) 이메일 인증 완료 여부\n2) 이메일·비밀번호 확인\n3) 「인증 메일 다시 보내기」\n\n" +
        "계속 안 되면 「로그인·가입」 주제를 다시 눌러 보세요.",
      topic: "로그인",
    };
  }

  if (includesAny(t, ["인증", "인증메일", "메일", "스팸"])) {
    return {
      reply:
        "가입 메일의 인증 링크를 눌러야 합니다. 스팸함 확인 후 「인증 메일 다시 보내기」를 써 보세요.",
      topic: "로그인",
    };
  }

  if (includesAny(t, ["비밀번호", "비번", "재설정", "잊었"])) {
    return {
      reply:
        "로그인 화면 → 「비밀번호를 잊으셨나요?」 → 이메일 → 메일 링크로 새 비밀번호",
      topic: "로그인",
    };
  }

  if (includesAny(t, ["브랜드 추가", "브랜드 저장", "브랜드 만들", "새 브랜드"])) {
    return {
      reply:
        "1) 사이드바 「+ 브랜드 추가」\n2) 글쓰기 폼에 브랜드명 입력 시 저장\n3) 브랜드마다 톤·습관이 따로 쌓입니다\n\n" +
        `무료는 브랜드 1개. 더 필요하면 우측 상단·사이드바 「${PLAN_UI_LABEL}」을 보세요.`,
      topic: "브랜드기억",
    };
  }

  if (includesAny(t, ["브랜드 삭제", "브랜드 지우"])) {
    return {
      reply:
        "사이드바에서 브랜드를 삭제할 수 있습니다. 예전 초안 기록·작업실 글은 남을 수 있습니다.",
      topic: "브랜드기억",
    };
  }

  if (
    includesAny(t, [
      "자료조사",
      "조사",
      "정보조사",
      "팩트",
      "리서치",
      "research",
    ])
  ) {
    return {
      reply:
        "자료조사는 주제·브랜드·지역에서 확인한 내용을 글에 넣는 기능입니다.\n\n" +
        `1) 이야기 탭 → 「${FORM_ADVANCED_SECTION}」 펼치기\n` +
        "2) 「자료조사 사용」 켜기 → 조사 유형·연구 주제 선택\n" +
        `3) 조사 유형 예: ${RESEARCH_TYPE_LABELS}\n` +
        "4) 조사 후 「이야기 쓰기」 또는 플레이스·인스타 캡션 생성\n" +
        "5) 팩트가 충분하면 이야기·플레이스·인스타 캡션에 반영\n\n" +
        "팩트가 거의 없으면 「조사 결과 검증」 단계에서 멈출 수 있습니다. 주제·지역·브랜드를 구체적으로 적어 주세요.",
      topic: "자료조사",
    };
  }

  if (
    includesAny(t, [
      "화자",
      "후기",
      "방문",
      "다녀",
      "체험",
      "칼럼",
      "말투 선택",
      "speaker",
    ])
  ) {
    return {
      reply:
        `이야기 폼 「${FORM_ADVANCED_SECTION}」에서 화자를 고릅니다.\n\n` +
        `· 방문·체험 후기: ${VISIT_REVIEW_SPEAKER_LABELS.join(" · ")} + 자료조사 권장\n` +
        `· 칼럼·소개: ${COLUMN_SPEAKER_LABELS.join(" · ")}\n` +
        "· 자동추천: 주제·브랜드에 맞게 맞춤\n\n" +
        "방문 후기는 「성분·보관」「알아보게 된 이유」 같은 정보형 틀 대신, 직접 다녀온 톤으로 씁니다.",
      topic: "화자",
    };
  }

  if (
    includesAny(t, [
      "템플릿",
      "가이드",
      "어색",
      "기계",
      "뻔한",
      "딱딱",
      "나열",
      "사람이 쓴",
      "사람글",
    ])
  ) {
    return {
      reply:
        "가이드·템플릿 느낌이 나면 아래를 확인해 보세요.\n\n" +
        `1) 「${FORM_ADVANCED_SECTION}」에서 자료조사 켜고 팩트가 충분한지\n` +
        `2) 화자를 ${VISIT_REVIEW_SPEAKER_LABELS[0]}·${COLUMN_SPEAKER_LABELS[0]} 등에 맞게 선택했는지\n` +
        "3) 주제를 「다녀왔어요」「방문 후기」처럼 구체적으로\n4) 브랜드·지역·업종 입력 보강 후 「이야기 쓰기」 재시도\n\n" +
        "검수 메시지에 「조사·확인된 정보」가 나오면 팩트를 더 채운 뒤 다시 시도해 보세요.",
      topic: "콘텐츠코칭",
    };
  }

  if (
    includesAny(t, [
      "생성",
      "글 쓰",
      "이야기 쓰",
      "블로그 만",
      "콘텐츠",
      "만들",
      "초안",
    ]) &&
    !includesAny(t, ["한도", "제한", "횟수", "오류", "에러", "실패", "안 나와"])
  ) {
    return {
      reply:
        "1) 브랜드·주제·지역 입력\n" +
        `2) 필요하면 「${FORM_ADVANCED_SECTION}」에서 자료조사·화자 선택\n` +
        `3) 「${CHANNEL_PRODUCTS.blog.generateLabel}」 또는 채널 메뉴에서 생성\n` +
        `4) 연동: ${formatAutoPipelineOrder()}\n5) 복사해 게시\n\n` +
        formatFreePlanChannelNote() +
        "\n입력이 부족하면 버튼이 비활성일 수 있습니다.",
      topic: "콘텐츠생성",
    };
  }

  if (
    includesAny(t, [
      "검수",
      "붙여넣",
      "내 글",
      "다듬",
    ]) &&
    !includesAny(t, ["품질 점수", "90점"])
  ) {
    return {
      reply:
        `「${CHANNEL_PRODUCTS.review.menuLabel}」는 콘텐츠 만들기 메뉴 맨 아래에 있습니다. 이야기·플레이스·인스타 캡션 탭으로 나뉩니다.\n\n` +
        "· 채널별 점검: 무료\n" +
        "· 개선하기: 월 콘텐츠 한도와 같음\n\n" +
        "새 글은 이야기·플레이스·인스타 캡션 메뉴에서 만드세요.",
      topic: "검수",
    };
  }

  if (includesAny(t, ["검수", "품질", "민감", "사전", "90점"])) {
    return {
      reply:
        "올리기 전에 길이·톤·반복·민감 표현을 점검합니다. 이야기 폼 더 맞추기·브랜드 작업실 설정을 바꾼 뒤 다시 생성해 보세요.",
      topic: "검수",
    };
  }

  if (
    includesAny(t, [
      "한도",
      "제한",
      "횟수",
      "몇 번",
      "다 썼",
      "업그레이드",
      "플랜",
      "월 한도",
    ]) &&
    !includesAny(t, ["요금", "가격", "환불"])
  ) {
    return {
      reply:
        `월 한도: ${formatMonthlyLimits()}. 하루 약 ${limit}회까지일 수 있습니다.\n\n` +
        formatFreePlanChannelNote() +
        "\n\n다 썼다면:\n" +
        `1) 우측 상단·사이드바 「${PLAN_UI_LABEL}」에서 사용량 확인\n` +
        "2) 상위 플랜 업그레이드\n" +
        "3) 다음 달·내일 다시 시도\n\n" +
        IN_APP_HELP_HINT,
      topic: "한도",
    };
  }

  if (
    includesAny(t, [
      "요금",
      "플랜",
      "구독",
      "결제",
      "가격",
      "무료",
      "스튜디오",
      "플러스",
      "브랜드 플랜",
      "비교",
    ])
  ) {
    const lines = ["free", "brand", "studio"].map((id) => {
      const p = PLANS[id];
      const price = p.displayPrice || "무료";
      const feat = (PLAN_FEATURE_LINES[id] || [])[0];
      return `· ${p.label} ${price} — ${feat}`;
    });
    return {
      reply:
        "요금제:\n\n" +
        lines.join("\n") +
        `\n\n사이드바·우측 상단 「${PLAN_UI_LABEL}」에서 확인. 환불은 환불정책 페이지를 보세요.`,
      topic: "요금제",
    };
  }

  if (includesAny(t, ["환불", "취소", "해지", "청약", "자동결제", "갱신"])) {
    return {
      reply:
        "환불·해지 (일반 안내):\n\n" +
        "· 무료: 결제 없음\n" +
        "· 결제 후 7일·미이용: 환불정책 참고\n" +
        "· 유료 사용 후: 정책에 따른 부분 환불\n" +
        "· 해지: 구독 관리에서 갱신 전 해지\n" +
        "· 다운그레이드: 다음 결제일부터 예약\n" +
        "· 업그레이드: 결제 후 즉시 적용\n\n" +
        "세부 금액은 추측하지 않습니다. " +
        IN_APP_HELP_HINT,
      topic: "환불",
    };
  }

  if (includesAny(t, ["실패", "오류", "에러", "안 나와"]) && !includesAny(t, ["로그인"])) {
    return {
      reply:
        "1) 브랜드·주제·지역을 더 구체적으로 입력\n2) 자료조사 켠 경우 팩트가 충분한지 확인\n3) 잠시 후 「이야기 쓰기」 또는 채널 생성 재시도\n4) 한도·플랜은 사용량·업그레이드 확인\n\n" +
        IN_APP_HELP_HINT,
      topic: "검수",
    };
  }

  if (includesAny(t, ["사용법", "처음", "시작", "순서", "첫", "도움", "어떻게 써"])) {
    return {
      reply:
        "처음 순서:\n1) 가입·로그인(휴대폰 문자 인증)\n2) 브랜드·주제·지역 입력\n" +
        `3) 필요하면 이야기 폼 「${FORM_ADVANCED_SECTION}」에서 자료조사·화자\n` +
        `4) 「${CHANNEL_PRODUCTS.blog.generateLabel}」 또는 채널 메뉴에서 생성\n5) 복사·게시\n6) 초안 기록·${CHANNEL_PRODUCTS.growth.menuLabel}\n\n` +
        `모바일은 하단 ${formatMainChannelTabs()}·더보기. 아래 버튼으로 주제를 골라 보세요.`,
      topic: "시작하기",
    };
  }

  if (
    includesAny(t, [
      "어색",
      "감성",
      "seo",
      "제목",
      "톤",
      "다시 써",
      "수정",
      "짧게",
      "길게",
    ])
  ) {
    return {
      reply:
        "화면에서 수정·저장할 수 있습니다. 「다시 생성」 또는 톤·주제·습관을 바꾼 뒤 다시 써 보세요. 저장할수록 말투가 맞아집니다.",
      topic: "콘텐츠코칭",
    };
  }

  return null;
}

export function getWelcomeMessage(ctx = {}) {
  if (ctx.loggedIn) {
    return (
      `안녕하세요. 이야기 폼 「${FORM_ADVANCED_SECTION}」·채널·${PLAN_UI_LABEL}·한도 안내는 여기서 받을 수 있어요. 아래 추천 질문에서 골라 보세요.`
    );
  }
  return (
    "안녕하세요. BRICLOG — 브랜드 글을 차곡 쌓는 곳입니다.\n" +
    "처음 순서·자료조사·화자·채널 안내는 아래에서 골라 보세요."
  );
}
