export const TREND_CATEGORY_ORDER = [
  "all",
  "models",
  "tools",
  "video",
  "image",
  "coding",
  "agents",
  "research",
];

export const TREND_CATEGORY_LABELS = {
  all: "ALL",
  models: "MODELS",
  tools: "TOOLS",
  video: "VIDEO",
  image: "IMAGE",
  coding: "CODING",
  agents: "AGENTS",
  research: "RESEARCH",
};

export const TREND_STATUS_LABELS = {
  hot: "HOT",
  rising: "RISING",
  stable: "STABLE",
  falling: "FALLING",
  new: "NEW",
};

export const TREND_SAMPLE_NOTE =
  "실데이터 자동수집 전 샘플 구조입니다. 외부 API 연동 전까지 점수와 변화율은 SAMPLE DATA로 표시됩니다.";

const SAMPLE_UPDATED_AT = "2026-09-17T10:40:00.000Z";

export const TREND_SEED_ITEMS = [
  {
    id: "seed-chatgpt",
    slug: "chatgpt",
    name: "ChatGPT",
    category: "models",
    description:
      "OpenAI의 범용 AI assistant. 글쓰기, 리서치, 요약, 이미지, 음성까지 빠르게 연결하는 대표 진입점입니다.",
    officialUrl: "https://chatgpt.com",
    trendScore: 98,
    change24h: 4,
    change7d: 12,
    status: "hot",
    whyTrending: [
      "업무용 기본 인터페이스로 다시 묶이면서 사용량 회복세가 강합니다.",
      "모델 업데이트보다 실제 활용 흐름과 연동성이 더 자주 언급됩니다.",
      "검색, 글쓰기, 코드, 팀 협업까지 한 화면에서 처리하려는 수요가 큽니다.",
    ],
    whyItMatters:
      "브릭로그 관점에서는 '무엇을 쓸까'보다 '어떤 흐름을 운영 콘텐츠로 바꿀까'를 찾는 출발점이 됩니다. ChatGPT 자체를 소개하는 글보다, 매장과 브랜드가 이 변화를 어떻게 쓰는지가 콘텐츠 기회입니다.",
    briclogView:
      "브릭로그는 모델 스펙을 소개하는 데서 멈추지 않고, 이 도구가 고객 질문과 검색 흐름을 어떻게 바꾸는지까지 번역해야 합니다.",
    sourceSignals: [
      { source: "news", metric: "coverage", value: 42, change: 7, timestamp: SAMPLE_UPDATED_AT },
      { source: "community", metric: "mentions", value: 88, change: 12, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["GPT", "OpenAI ChatGPT"],
    keywords: ["ai assistant", "생성형 ai", "업무 자동화"],
    relatedSlugs: ["claude", "gemini", "perplexity"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-gemini",
    slug: "gemini",
    name: "Gemini",
    category: "models",
    description:
      "Google의 AI 모델과 assistant 제품군. 검색, Workspace, 동영상·멀티모달 문맥과 함께 자주 거론됩니다.",
    officialUrl: "https://gemini.google.com",
    trendScore: 94,
    change24h: 9,
    change7d: 31,
    status: "rising",
    whyTrending: [
      "Google 생태계와 묶인 실사용 접점이 계속 늘어나고 있습니다.",
      "검색과 AI의 연결 방식이 바뀌면서 비교 대상으로 자주 등장합니다.",
      "기업용 문서·메일·리서치 워크플로우 연동이 다시 주목받고 있습니다.",
    ],
    whyItMatters:
      "브릭로그에서는 검색 의도와 정보 탐색 흐름이 어떻게 바뀌는지 읽는 데 중요합니다. 검색 결과 페이지가 달라지면 브랜드 콘텐츠의 제목, 정보 구조, FAQ 설계도 함께 달라져야 합니다.",
    briclogView:
      "검색 인터페이스가 바뀌는 순간, 브릭로그는 글 생산기가 아니라 검색 시대용 설명 구조 설계 도구로 보여야 합니다.",
    sourceSignals: [
      { source: "search", metric: "momentum", value: 84, change: 11, timestamp: SAMPLE_UPDATED_AT },
      { source: "news", metric: "coverage", value: 37, change: 9, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Google Gemini"],
    keywords: ["google ai", "workspace ai", "search ai"],
    relatedSlugs: ["chatgpt", "claude", "notebooklm"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-claude",
    slug: "claude",
    name: "Claude",
    category: "models",
    description:
      "Anthropic의 AI assistant. 긴 문맥 처리, 글 다듬기, 문서 작업, 코드 보조 문맥에서 자주 비교됩니다.",
    officialUrl: "https://claude.ai",
    trendScore: 89,
    change24h: 5,
    change7d: 18,
    status: "rising",
    whyTrending: [
      "긴 문서와 정리형 작업에서 선호층이 명확합니다.",
      "코드와 글을 함께 다루는 사용자군에서 비교 빈도가 높습니다.",
      "업무 품질과 톤 안정성을 기준으로 회자됩니다.",
    ],
    whyItMatters:
      "브릭로그는 글을 대신 써주는 툴이 아니라 운영 판단을 돕는 엔진이어야 하므로, '문장 품질 경쟁'보다 '어떤 설명 구조가 신뢰를 만든다'는 관점으로 읽어야 합니다. Claude는 그 비교 기준을 보여주는 신호입니다.",
    briclogView:
      "브릭로그는 더 잘 쓰는 AI와 경쟁하기보다, 어떤 맥락을 골라 어떤 채널로 실행할지 결정하는 레이어를 가져가야 합니다.",
    sourceSignals: [
      { source: "community", metric: "mentions", value: 74, change: 8, timestamp: SAMPLE_UPDATED_AT },
      { source: "developer", metric: "workflow", value: 61, change: 5, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Anthropic Claude"],
    keywords: ["long context", "writing ai", "document ai"],
    relatedSlugs: ["chatgpt", "cursor", "gemini"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-veo",
    slug: "veo",
    name: "Veo",
    category: "video",
    description:
      "Google 계열의 영상 생성 모델. 짧은 데모보다 실제 제작 워크플로우 연결 가능성으로 많이 언급됩니다.",
    officialUrl: "https://deepmind.google/models/veo/",
    trendScore: 86,
    change24h: 14,
    change7d: 47,
    status: "new",
    whyTrending: [
      "영상 생성 품질 경쟁이 다시 눈에 띄게 커졌습니다.",
      "브랜드 마케팅에서 영상 샘플 제작 속도에 대한 기대가 큽니다.",
      "텍스트만이 아니라 컷 구성과 스토리보드 흐름까지 화제가 됩니다.",
    ],
    whyItMatters:
      "콘텐츠 운영이 이미지와 영상까지 확장될 때, 브랜드는 '무엇을 찍을지'를 먼저 설계해야 합니다. 브릭로그는 결국 설명과 기획을 먼저 잡고 제작물을 붙이는 흐름으로 차별화해야 합니다.",
    briclogView:
      "브릭로그는 영상 도구 이름을 나열하는 대신, 이 흐름이 내 브랜드의 촬영 기획과 전환 메시지를 어떻게 바꾸는지까지 붙여줘야 합니다.",
    sourceSignals: [
      { source: "news", metric: "coverage", value: 29, change: 12, timestamp: SAMPLE_UPDATED_AT },
      { source: "community", metric: "shares", value: 67, change: 15, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Google Veo"],
    keywords: ["video generation", "text to video", "ai film"],
    relatedSlugs: ["sora", "runway", "midjourney"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-cursor",
    slug: "cursor",
    name: "Cursor",
    category: "coding",
    description:
      "코드 편집기 안에서 AI와 함께 구현·리뷰·자동화를 처리하는 개발 도구입니다.",
    officialUrl: "https://cursor.com",
    trendScore: 81,
    change24h: 3,
    change7d: 9,
    status: "hot",
    whyTrending: [
      "개발자 생산성 툴로서 실제 팀 도입 사례가 늘고 있습니다.",
      "에이전트 기반 개발 방식이 구체적인 운영 패턴으로 바뀌고 있습니다.",
      "코드 작성보다 리팩터링, QA, 워크플로우 연결 얘기가 많습니다.",
    ],
    whyItMatters:
      "브릭로그도 결국 '한 번 생성'이 아니라 반복 운영 시스템이어야 합니다. Cursor가 주목받는 이유는 AI가 기능 하나를 뽑는 게 아니라 작업 루프를 바꾸기 때문이고, BRICLOG 홈도 그 관점으로 보여야 합니다.",
    briclogView:
      "브릭로그가 가져갈 포지션도 같습니다. 결과물 한 장보다 오늘 무엇을 발견하고 어떻게 운영 루프로 쌓을지 보여줘야 합니다.",
    sourceSignals: [
      { source: "developer", metric: "workflow", value: 79, change: 9, timestamp: SAMPLE_UPDATED_AT },
      { source: "community", metric: "mentions", value: 45, change: 6, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Cursor AI", "Cursor Editor"],
    keywords: ["ai coding", "agent workflow", "developer tools"],
    relatedSlugs: ["claude", "langchain", "chatgpt"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-sora",
    slug: "sora",
    name: "Sora",
    category: "video",
    description:
      "OpenAI의 텍스트 기반 영상 생성 모델. 대중적 인지도가 높고 데모 파급력이 큽니다.",
    officialUrl: "https://openai.com/sora",
    trendScore: 79,
    change24h: 2,
    change7d: 14,
    status: "stable",
    whyTrending: [
      "대중 인지도와 상징성이 여전히 강합니다.",
      "브랜드·광고 업계에서 영상 자동화 상상력을 자극합니다.",
      "경쟁 모델이 등장할 때마다 비교 기준으로 다시 불립니다.",
    ],
    whyItMatters:
      "브릭로그 사용자에게 중요한 건 '영상 생성 모델 이름'보다 고객 커뮤니케이션 소재가 어디로 이동하는지입니다. 짧은 영상이 강해질수록 설명형 블로그와 전환형 캡션의 역할 분담이 더 중요해집니다.",
    briclogView:
      "브릭로그는 유행하는 모델명을 쫓기보다, 채널별 역할 분담과 콘텐츠 포맷 전환 시점을 읽는 쪽에서 가치를 만들어야 합니다.",
    sourceSignals: [
      { source: "news", metric: "coverage", value: 26, change: 4, timestamp: SAMPLE_UPDATED_AT },
      { source: "community", metric: "shares", value: 63, change: 7, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["OpenAI Sora"],
    keywords: ["text to video", "video ai", "creative ai"],
    relatedSlugs: ["veo", "runway", "midjourney"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-midjourney",
    slug: "midjourney",
    name: "Midjourney",
    category: "image",
    description:
      "고품질 이미지 생성으로 널리 알려진 크리에이티브 도구입니다. 브랜드 무드보드와 비주얼 탐색에 자주 쓰입니다.",
    officialUrl: "https://www.midjourney.com",
    trendScore: 76,
    change24h: 1,
    change7d: 8,
    status: "stable",
    whyTrending: [
      "시각 퀄리티의 기준점으로 계속 비교됩니다.",
      "디자인 초기 탐색 속도를 높이는 도구로 자리 잡았습니다.",
      "광고·브랜딩 업계에서 레퍼런스 제작용으로 자주 활용됩니다.",
    ],
    whyItMatters:
      "브릭로그의 차별점은 화려한 이미지를 나열하는 데 있지 않습니다. 이미지가 강해질수록 텍스트는 더 짧고 선명해져야 하고, 어떤 컷을 왜 쓰는지 설명 구조가 필요합니다.",
    briclogView:
      "시각 퀄리티 경쟁이 치열할수록 브릭로그는 브랜드 언어와 정보 위계를 정리하는 역할로 더 선명해져야 합니다.",
    sourceSignals: [
      { source: "community", metric: "mentions", value: 58, change: 4, timestamp: SAMPLE_UPDATED_AT },
      { source: "search", metric: "momentum", value: 44, change: 3, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["MJ", "Midjourney AI"],
    keywords: ["image generation", "brand visual", "creative tools"],
    relatedSlugs: ["veo", "sora", "runway"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-perplexity",
    slug: "perplexity",
    name: "Perplexity",
    category: "research",
    description:
      "검색과 답변을 결합한 AI research 도구. 출처 기반 탐색 방식 때문에 비교 대상으로 자주 등장합니다.",
    officialUrl: "https://www.perplexity.ai",
    trendScore: 74,
    change24h: 6,
    change7d: 17,
    status: "rising",
    whyTrending: [
      "검색 요약과 출처 확인을 한 흐름으로 처리하려는 수요가 큽니다.",
      "AI 검색 대안 제품군 비교에서 빠지지 않습니다.",
      "리서치 워크플로우를 줄이는 도구로 언급량이 높습니다.",
    ],
    whyItMatters:
      "브릭로그는 '조사 없는 글쓰기'를 경계해야 합니다. Perplexity가 뜨는 이유는 빠른 답보다 확인 가능한 근거를 원하는 사용자가 늘기 때문이고, 이건 브릭로그의 research-first 포지션과 연결됩니다.",
    briclogView:
      "브릭로그의 상세와 글도 같은 원칙을 따라야 합니다. 조사와 출처를 먼저 묶고, 그다음 브랜드용 설명으로 번역해야 신뢰가 쌓입니다.",
    sourceSignals: [
      { source: "search", metric: "momentum", value: 52, change: 7, timestamp: SAMPLE_UPDATED_AT },
      { source: "news", metric: "coverage", value: 21, change: 5, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Perplexity AI"],
    keywords: ["ai search", "research assistant", "source grounded"],
    relatedSlugs: ["gemini", "chatgpt", "notebooklm"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-runway",
    slug: "runway",
    name: "Runway",
    category: "video",
    description:
      "영상 생성과 편집을 함께 다루는 크리에이티브 툴. 제작 워크플로우 관점에서 많이 언급됩니다.",
    officialUrl: "https://runwayml.com",
    trendScore: 71,
    change24h: 4,
    change7d: 11,
    status: "rising",
    whyTrending: [
      "생성 이후 편집까지 이어지는 흐름이 실무에서 중요해졌습니다.",
      "광고, 숏폼, 프로토타입 영상 제작 수요가 지속됩니다.",
      "단순 데모보다 제작 도구로서 평가받는 흐름이 커졌습니다.",
    ],
    whyItMatters:
      "브릭로그는 한 번에 완성본을 약속하는 대신, 운영자가 바로 붙일 수 있는 초안을 만드는 쪽이 맞습니다. Runway가 주목받는 이유도 결과물보다 편집 가능한 흐름에 있습니다.",
    briclogView:
      "브릭로그 역시 자동완성보다 편집 가능한 판단 재료를 주는 제품으로 읽혀야 하고, 이번 홈 개편도 그 방향을 설명해야 합니다.",
    sourceSignals: [
      { source: "community", metric: "shares", value: 41, change: 8, timestamp: SAMPLE_UPDATED_AT },
      { source: "developer", metric: "workflow", value: 25, change: 3, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["RunwayML"],
    keywords: ["video editing", "creative workflow", "shortform"],
    relatedSlugs: ["veo", "sora", "midjourney"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-notebooklm",
    slug: "notebooklm",
    name: "NotebookLM",
    category: "research",
    description:
      "자료 묶음 기반으로 정리와 이해를 돕는 Google 계열 research 도구입니다.",
    officialUrl: "https://notebooklm.google",
    trendScore: 69,
    change24h: 7,
    change7d: 22,
    status: "new",
    whyTrending: [
      "자료 기반 이해를 돕는 용도로 입소문이 큽니다.",
      "문서 요약보다 '내 자료를 읽는 AI' 수요가 증가하고 있습니다.",
      "콘텐츠 기획 전 정리 도구로 쓰려는 시도가 많습니다.",
    ],
    whyItMatters:
      "브릭로그가 진짜 가져가야 할 포지션은 글쓰기보다 이해와 정리입니다. NotebookLM의 인기 포인트는 바로 그 지점이고, 홈페이지도 검색 이후 이해 단계가 있다는 것을 보여줘야 합니다.",
    briclogView:
      "검색 다음에 이해 단계가 있어야 한다는 메시지를 가장 잘 보여주는 사례라서, 브릭로그의 BRIEF 레이어 설계 기준점이 됩니다.",
    sourceSignals: [
      { source: "search", metric: "momentum", value: 48, change: 8, timestamp: SAMPLE_UPDATED_AT },
      { source: "community", metric: "mentions", value: 37, change: 10, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Google NotebookLM"],
    keywords: ["research notes", "document grounding", "ai study"],
    relatedSlugs: ["gemini", "perplexity", "claude"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-hugging-face",
    slug: "hugging-face",
    name: "Hugging Face",
    category: "tools",
    description:
      "모델과 데모, 오픈소스 생태계를 연결하는 AI 플랫폼입니다. 출시와 커뮤니티 움직임의 허브 역할을 합니다.",
    officialUrl: "https://huggingface.co",
    trendScore: 67,
    change24h: 2,
    change7d: 10,
    status: "stable",
    whyTrending: [
      "오픈 모델 배포와 실험 흐름의 중심축입니다.",
      "새 모델이 공개될 때 가장 먼저 확인하는 공간 중 하나입니다.",
      "개발자와 연구자 커뮤니티 신호가 모입니다.",
    ],
    whyItMatters:
      "2차 자동수집 단계에서 Hugging Face는 실제 무료 신호원 후보입니다. 다만 1차에서는 UI와 데이터 구조만 설계하고, ToS와 무료 API 한도를 따져 안전하게 연결하는 것이 맞습니다.",
    briclogView:
      "브릭로그는 최신성을 과장하지 말고, 어떤 신호를 어떤 기준으로 점수화했는지 투명하게 밝히는 쪽이 더 오래갑니다.",
    sourceSignals: [
      { source: "developer", metric: "activity", value: 54, change: 6, timestamp: SAMPLE_UPDATED_AT },
      { source: "community", metric: "mentions", value: 31, change: 4, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["HF", "HuggingFace"],
    keywords: ["model hub", "open source ai", "ml community"],
    relatedSlugs: ["langchain", "cursor", "claude"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
  {
    id: "seed-langchain",
    slug: "langchain",
    name: "LangChain",
    category: "agents",
    description:
      "LLM 앱과 agent workflow를 조합할 때 자주 쓰이는 프레임워크/생태계입니다.",
    officialUrl: "https://www.langchain.com",
    trendScore: 64,
    change24h: 3,
    change7d: 13,
    status: "rising",
    whyTrending: [
      "단일 프롬프트보다 워크플로우 구성으로 관심이 옮겨가고 있습니다.",
      "agent, eval, memory 구조를 만들 때 계속 언급됩니다.",
      "실험 단계에서 제품 단계로 넘어가는 팀이 많아졌습니다.",
    ],
    whyItMatters:
      "BRICLOG도 단일 생성기가 아니라 DISCOVER → UNDERSTAND → CREATE 흐름을 가진 시스템으로 보여야 합니다. LangChain이 뜨는 이유는 '여러 단계를 연결하는 제품 사고'가 중요해졌기 때문입니다.",
    briclogView:
      "이 트렌드는 브릭로그가 단일 작성 버튼이 아니라 의도와 실행을 묶는 워크플랫폼으로 설명되어야 한다는 근거가 됩니다.",
    sourceSignals: [
      { source: "developer", metric: "activity", value: 49, change: 7, timestamp: SAMPLE_UPDATED_AT },
      { source: "news", metric: "coverage", value: 12, change: 2, timestamp: SAMPLE_UPDATED_AT },
    ],
    aliases: ["Lang Chain"],
    keywords: ["agents", "llm framework", "workflow orchestration"],
    relatedSlugs: ["cursor", "hugging-face", "claude"],
    updatedAt: SAMPLE_UPDATED_AT,
  },
];
